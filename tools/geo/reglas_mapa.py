#!/usr/bin/env python3
"""Puertas de las reglas de construcción del mapa (specs/13, T82 F1), sobre las casas a la vista de cualquier época.

Sirve para todas las épocas porque no necesita la referencia de ninguna: la manzana edificada es lo que forman las
casas a la vista pegadas entre sí (a menos de 2·CIERRE_M), y la calle, el hueco entre dos manzanas. Mide:

- R1 · una fila por frente: las casas que no tocan el borde de su manzana (a más de FRENTE_M) están en segunda fila;
- R3 · casas alineadas: el giro de cada casa del frente respecto del tramo de borde que tiene delante;
- R4 · calles con su ancho: la distancia, a lo largo de la normal de cada tramo de borde, hasta la manzana de enfrente;
- R6 · casas por manzana: cuántas, cuántas en el frente y el frente medio por casa; y las manzanas más grandes que
  una cuadra del damero, que son varias unidas por casas que cruzan la calle (indicio de R2: calle tapada). En ellas
  las casas sobre la calle tapada cuentan como segunda fila.

R2, R5 y R7 a R12 todavía no tienen puerta aquí (`pendientes`). Los umbrales que dependen de la época (ancho mínimo de
calle, casas por manzana) salen de la investigación (specs/13 § 3): mientras no la hay, la puerta mide y no cierra.
Cuenta lo medido; no certifica fidelidad.

Uso: .venv/bin/python tools/geo/reglas_mapa.py --epoca 1843   (o --todas) → specs/reglas/medicion-<año>.json
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree

sys.path.insert(0, str(Path(__file__).resolve().parent))

METRO = 0.5               # m/px del mosaico de 1936
AÑOS = [1578, 1772, 1843, 1889, 1911, 1936]
CIERRE_M = 1.0            # dos casas a menos de 2·CIERRE_M son de la misma manzana edificada (como cierre_fase5)
FRENTE_M = 1.0            # una casa a más de esto del borde de su manzana no da a la calle (dos píxeles del mosaico)
GIRO_MAXIMO_GRADOS = 5.0  # provisional (specs/13 R3): una casa del frente más girada que esto respecto de su borde
SIMPLIFICAR_M = 1.0       # el borde de la manzana, simplificado a esto para tener tramos rectos
TRAMO_MINIMO_M = 4.0      # un tramo de borde más corto no se muestrea para el ancho de calle
TRAMO_DIRECCION_M = 25.0  # la dirección de la calle la dan los tramos de borde más largos que esto (más que una casa:
#                           el borde que arma una sola casa girada sigue a esa casa y no la delataría)
PASO_M = 2.0              # una muestra del ancho de calle cada esto a lo largo del borde
CALLE_MAXIMA_M = 30.0     # más allá no hay manzana de enfrente: es campo, plaza o el borde de la ciudad
LISTA_MAXIMA = 300        # de las listas largas (giradas, manzanas) el JSON guarda las primeras, y dice cuántas son
CUADRA_HA = (0.6, 1.6)    # una cuadra del damero (~100 m de lado, menos las calles); más grande, son varias unidas
CLASES_DE_ANCHO = [(0, 2), (2, 4), (4, 6), (6, 8), (8, 10), (10, 15), (15, 30)]


def casas_de_epoca(ciudad, epoca):
    """[{techo, poligono}] de las casas que viven en `epoca` (`vida` = [nace, muere], 0 = nunca muere)."""
    v, casas = ciudad['vertices'], []
    for k, (inicio, n, *_resto) in enumerate(ciudad['techos']):
        nace, muere = ciudad['vida'][k]
        if nace <= epoca and (muere == 0 or epoca < muere):
            casas.append({'techo': k, 'poligono': [[v[2 * i], v[2 * i + 1]] for i in range(inicio, inicio + n)]})
    return casas


def _figura(c):
    f = Polygon(np.asarray(c['poligono'], float))
    return f if f.is_valid else f.buffer(0)


def manzanas_edificadas(casas, metro=METRO):
    """[{figura, casas: [(casa, figura)]}]: las manzanas que forman las casas pegadas, sin sus patios (solo el
    contorno de afuera manda)."""
    figuras = [(c, _figura(c)) for c in casas]
    figuras = [(c, f) for c, f in figuras if not f.is_empty and f.area > 0]
    if not figuras:
        return []
    r = CIERRE_M / metro
    union = unary_union([f.buffer(r, join_style='mitre') for _, f in figuras]).buffer(-r, join_style='mitre')
    partes = [Polygon(p.exterior) for p in getattr(union, 'geoms', [union]) if not p.is_empty]
    arbol = STRtree(partes)
    manzanas = [{'figura': p, 'casas': []} for p in partes]
    for c, f in figuras:
        punto = f.representative_point()
        dentro = list(arbol.query(punto, predicate='intersects'))
        k = dentro[0] if dentro else int(arbol.nearest(punto))
        manzanas[k]['casas'].append((c, f))
    return [m for m in manzanas if m['casas']]


def _de_frente(m, f, metro):
    return f.distance(m['figura'].exterior) * metro <= FRENTE_M


def fila_por_frente(manzanas, metro=METRO):
    """R1: las casas de cada manzana que no tocan su borde."""
    segunda = sorted(c['techo'] for m in manzanas for c, f in m['casas'] if not _de_frente(m, f, metro))
    total = sum(len(m['casas']) for m in manzanas)
    return {'casas': total, 'segunda_fila': segunda,
            'parte_en_segunda_fila': round(len(segunda) / total, 4) if total else None}


def _tramos(m, metro, minimo_m=TRAMO_MINIMO_M):
    """[(a, b)] tramos rectos del borde de la manzana, más largos que TRAMO_MINIMO_M, con la manzana a la izquierda
    de a→b (el anillo en sentido antihorario)."""
    borde = m['figura'].simplify(SIMPLIFICAR_M / metro)
    if borde.is_empty or not hasattr(borde, 'exterior'):
        return []
    anillo = borde.exterior if borde.exterior.is_ccw else LineString(list(borde.exterior.coords)[::-1])
    pts = np.asarray(anillo.coords, float)
    return [(a, b) for a, b in zip(pts[:-1], pts[1:]) if np.hypot(*(b - a)) * metro >= minimo_m]


def _giro(f, direccion):
    """Ángulo (0–45°) entre los lados del rectángulo mínimo de la casa y la dirección del tramo."""
    rect = np.asarray(f.minimum_rotated_rectangle.exterior.coords, float)
    lado = rect[1] - rect[0]
    a = np.degrees(np.arctan2(lado[1], lado[0]) - np.arctan2(direccion[1], direccion[0])) % 90
    return min(a, 90 - a)


def alineacion(manzanas, metro=METRO, giro_maximo=GIRO_MAXIMO_GRADOS):
    """R3: el giro de cada casa del frente respecto del tramo largo de borde más cercano (o, si la manzana no tiene
    ninguno, de los lados de su rectángulo mínimo)."""
    giradas, medidas = [], 0
    for m in manzanas:
        tramos = _tramos(m, metro, TRAMO_DIRECCION_M)
        if not tramos:
            rect = np.asarray(m['figura'].minimum_rotated_rectangle.exterior.coords, float)
            tramos = [(rect[0], rect[1])]
        lineas = [LineString([a, b]) for a, b in tramos]
        for c, f in m['casas']:
            if not _de_frente(m, f, metro):
                continue
            k = min(range(len(lineas)), key=lambda i: lineas[i].distance(f))
            a, b = tramos[k]
            giro = _giro(f, b - a)
            medidas += 1
            if giro > giro_maximo:
                giradas.append({'techo': c['techo'], 'giro': round(float(giro), 1)})
    return {'giro_maximo': giro_maximo, 'medidas': medidas, 'n_giradas': len(giradas),
            'giradas': sorted(giradas, key=lambda g: -g['giro'])[:LISTA_MAXIMA]}


def anchos_de_calle(manzanas, metro=METRO):
    """R4: cada PASO_M de borde, la distancia por la normal hacia afuera hasta otra manzana (si la hay antes de
    CALLE_MAXIMA_M). Devuelve los metros de borde por clase de ancho y la mediana."""
    figuras = [m['figura'] for m in manzanas]
    arbol = STRtree(figuras)
    alcance = CALLE_MAXIMA_M / metro
    anchos = []
    for i, m in enumerate(manzanas):
        for a, b in _tramos(m, metro):
            largo = np.hypot(*(b - a))
            d = (b - a) / largo
            afuera = np.array([d[1], -d[0]])          # la manzana queda a la izquierda: afuera es la derecha
            for s in np.arange(PASO_M / metro / 2, largo, PASO_M / metro):
                p = a + d * s
                rayo = LineString([p + afuera * 1e-3, p + afuera * alcance])
                cortes = [Point(p).distance(rayo.intersection(figuras[k])) for k in arbol.query(rayo)
                          if k != i and rayo.intersects(figuras[k])]
                if cortes:
                    anchos.append(min(cortes) * metro)
    por_clase = {f'{lo}-{hi}': round(sum(PASO_M for w in anchos if lo <= w < hi), 1) for lo, hi in CLASES_DE_ANCHO}
    return {'muestras': len(anchos), 'paso_m': PASO_M, 'metros_por_ancho': por_clase,
            'mediana_m': round(float(np.median(anchos)), 2) if anchos else None,
            'p10_m': round(float(np.percentile(anchos, 10)), 2) if anchos else None}


def casas_por_manzana(manzanas, metro=METRO):
    """R6: por manzana, sus casas, las del frente, el borde y el frente medio por casa del frente."""
    filas = []
    for m in manzanas:
        de_frente = sum(1 for _, f in m['casas'] if _de_frente(m, f, metro))
        borde = m['figura'].exterior.length * metro
        filas.append({'casas': len(m['casas']), 'de_frente': de_frente, 'borde_m': round(borde, 1),
                      'area_ha': round(m['figura'].area * metro ** 2 / 1e4, 3),
                      'frente_medio_m': round(borde / de_frente, 2) if de_frente else None,
                      'centro': [round(x, 1) for x in m['figura'].representative_point().coords[0]]})
    cuadras = [f for f in filas if CUADRA_HA[0] <= f['area_ha'] <= CUADRA_HA[1]]   # del tamaño de una cuadra del damero
    unidas = [f for f in filas if f['area_ha'] > CUADRA_HA[1]]   # más que una cuadra: casas que cruzan una calle (R2)
    frentes = [f['frente_medio_m'] for f in cuadras if f['frente_medio_m']]
    return {'total': sum(f['casas'] for f in filas), 'n_manzanas': len(filas),
            'cuadras_del_damero': {'n': len(cuadras),
                                   'mediana_casas': float(np.median([f['casas'] for f in cuadras])) if cuadras else None,
                                   'mediana_frente_m': float(np.median(frentes)) if frentes else None},
            'mayores_que_una_cuadra': {'n': len(unidas), 'casas': sum(f['casas'] for f in unidas),
                                       'centros': [f['centro'] for f in sorted(unidas, key=lambda f: -f['area_ha'])]},
            'manzanas_listadas': f'las {LISTA_MAXIMA} con más casas' if len(filas) > LISTA_MAXIMA else 'todas',
            'manzanas': sorted(filas, key=lambda f: -f['casas'])[:LISTA_MAXIMA]}


def medir(casas, metro=METRO, epoca=None, año=None):
    """Todas las puertas de este módulo sobre las casas a la vista de una época."""
    manzanas = manzanas_edificadas(casas, metro)
    r1 = fila_por_frente(manzanas, metro)
    r3 = alineacion(manzanas, metro)
    return {'epoca': epoca, 'año': año, 'casas': len(casas),
            'R1': r1, 'R3': r3, 'R4': anchos_de_calle(manzanas, metro), 'R6': casas_por_manzana(manzanas, metro),
            'resumen': {'segunda_fila': len(r1['segunda_fila']), 'giradas': r3['n_giradas']},
            'pendientes': ['R2', 'R5', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12'],
            'umbrales_pendientes': 'ancho mínimo de calle y casas por manzana de la época: specs/13 § 3 (F0)'}


def main():  # pragma: no cover - E/S
    import subprocess
    from contraste_1843 import visibles_en
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--epoca', type=int, choices=AÑOS)
    g.add_argument('--todas', action='store_true')
    a = ap.parse_args()
    raiz = Path(__file__).resolve().parents[2]
    ruta = raiz / 'fuentes/derivados/epocas/ciudad-epocas.json'
    ciudad = json.loads(ruta.read_text())
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    procedencia = {'ciudad_sha256': hashlib.sha256(ruta.read_bytes()).hexdigest(),
                   'pak_sha256': hashlib.sha256((raiz / 'public/datos/ciudad.pak').read_bytes()).hexdigest()}
    salida = raiz / 'specs/reglas'
    salida.mkdir(exist_ok=True)
    for año in (AÑOS if a.todas else [a.epoca]):
        e = AÑOS.index(año)
        casas = visibles_en(casas_de_epoca(ciudad, e), hitos, epoca=e)
        doc = {'alcance': __doc__.split('\n\n')[1].replace('\n', ' '), **procedencia, **medir(casas, METRO, e, año)}
        (salida / f'medicion-{año}.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
        r6 = doc['R6']['cuadras_del_damero']
        print(f"{año}: {doc['casas']} casas, {doc['R6']['n_manzanas']} manzanas; segunda fila {doc['resumen']['segunda_fila']}"
              f" ({doc['R1']['parte_en_segunda_fila']}); giradas {doc['resumen']['giradas']}; calle mediana {doc['R4']['mediana_m']} m"
              f" (p10 {doc['R4']['p10_m']}); unidas {doc['R6']['mayores_que_una_cuadra']['n']}; cuadras del damero: {r6['n']}, mediana {r6['mediana_casas']} casas, frente {r6['mediana_frente_m']} m")


if __name__ == '__main__':
    main()
