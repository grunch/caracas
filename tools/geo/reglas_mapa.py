#!/usr/bin/env python3
"""Puertas de las reglas de construcción del mapa (specs/13, T82 F1), sobre las casas a la vista de cualquier época.

Sirve para todas las épocas porque no necesita la referencia de ninguna: la manzana edificada es lo que forman las
casas a la vista (las que se empaquetan, con la vida que les deja el visor bajo los hitos: tools/vidas-visibles.mjs)
pegadas entre sí (a menos de 2·CIERRE_M), y la calle, el hueco entre dos manzanas. Mide:

- R1 · una fila por frente: las casas que no tocan el borde de su manzana (a más de FRENTE_M) están en segunda fila;
- R3 · casas alineadas: el giro de cada casa del frente respecto del tramo largo de borde que tiene delante (la
  orientación de la casa es la del `eu` de su marco, o la dominante de sus lados: no la del rectángulo mínimo);
- R4 · calles con su ancho: la distancia, a lo largo de la normal de cada tramo de borde, hasta la manzana de enfrente;
- R6 · casas por manzana: cuántas, cuántas en el frente y el frente medio por casa; y las manzanas más grandes que
  una cuadra del damero, que son varias unidas por casas que cruzan la calle (indicio de R2: calle tapada). En ellas
  las casas sobre la calle tapada cuentan como segunda fila.

- R7 · lo edificado sigue al plano (con la referencia de la época en px del mosaico, si la tiene);
- R8 · suelo coherente: suelo urbano a más de media cuadra de toda casa y manchas sueltas (halos);
- R9 · cada nombre en su lugar: las marcas de edificio sobre su hito y las de plaza sin casas
  (specs/reglas/clases-marcas.json dice qué es cada marca).

R2, R5, R10, R11 y R12 todavía no tienen puerta aquí (`pendientes`). Los umbrales que dependen de la época (ancho mínimo de
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
MANZANA_MINIMA_CASAS = 3  # R3 se mide en manzanas de al menos tantas casas: una suelta (o dos) no tiene calle propia
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
    # una casa suelta en el patio de un anillo es su propia mancha, pero su manzana es la que la rodea: las manchas
    # que caen dentro del contorno lleno de otra no son manzanas (como cierre_fase5.casas_sin_acceso)
    arbol_p = STRtree(partes)
    partes = [p for i, p in enumerate(partes)
              if not any(j != i and partes[j].area > p.area and partes[j].contains(p) for j in arbol_p.query(p))]
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


def _orientacion(f, eu=None):
    """Orientación de la casa en grados (0–180): la del `eu` de su marco si lo tiene (el frente con que el visor arma su
    techo); si no, la dominante de sus lados, cada uno pesado por su largo (en una casa en L, en escalera o casi
    cuadrada, el rectángulo mínimo sale diagonal y daba 45°; un chaflán corto no la mueve)."""
    if eu is not None:
        return float(np.degrees(np.arctan2(eu[1], eu[0])) % 180)
    pts = np.asarray(f.exterior.coords, float)
    lados = np.diff(pts, axis=0)
    largos = np.hypot(lados[:, 0], lados[:, 1])
    angulos = np.degrees(np.arctan2(lados[:, 1], lados[:, 0])) % 90
    peso = np.bincount(np.round(angulos).astype(int) % 90, weights=largos, minlength=90)
    suave = sum(np.roll(peso, k) for k in (-1, 0, 1))          # cada grado con sus vecinos (0 y 89 son vecinos)
    pico = int(np.argmax(suave))
    cerca = np.minimum(np.abs(angulos - pico), 90 - np.abs(angulos - pico)) <= 1.5
    if not cerca.any():
        return float(pico)
    desvio = ((angulos[cerca] - pico + 45) % 90) - 45                # afinado: el promedio pesado de los lados del pico
    return float((pico + np.average(desvio, weights=largos[cerca])) % 90)


def _giro(f, direccion, eu=None):
    """Ángulo (0–45°) entre la orientación de la casa y la dirección del tramo."""
    a = (_orientacion(f, eu) - np.degrees(np.arctan2(direccion[1], direccion[0]))) % 90
    return min(a, 90 - a)


def alineacion(manzanas, metro=METRO, giro_maximo=GIRO_MAXIMO_GRADOS):
    """R3: el giro de cada casa del frente respecto del tramo largo de borde más cercano (o, si la manzana no tiene
    ninguno, de los lados de su rectángulo mínimo)."""
    giradas, medidas = [], 0
    for m in manzanas:
        if len(m['casas']) < MANZANA_MINIMA_CASAS:
            continue
        tramos = _tramos(m, metro, TRAMO_DIRECCION_M)
        if not tramos:
            rect = np.asarray(m['figura'].minimum_rotated_rectangle.exterior.coords, float)
            tramos = [(rect[0], rect[1])]
        lineas = [LineString([a, b]) for a, b in tramos]
        for c, f in m['casas']:
            if not _de_frente(m, f, metro):
                continue
            delante = Point(c['frente']) if c.get('frente') is not None else f   # el medio del frente de su marco
            k = min(range(len(lineas)), key=lambda i: lineas[i].distance(delante))
            a, b = tramos[k]
            giro = _giro(f, b - a, c.get('eu'))
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
                # si antes vuelve a entrar en su propia manzana (el hueco de una U), lo que cruza no es una calle
                propia = rayo.intersection(figuras[i])
                if cortes and (propia.is_empty or Point(p).distance(propia) > min(cortes)):
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


# --- R7, R8 y R9 (T82.2a) ---

FRENTE_EDIFICADO_MINIMO = 0.8   # R7: parte del borde de una manzana edificada del plano con casa o hito a HUECO_M
#                                 (propuesto por el diagnóstico; decisión de Claude por delegación, 25-11-2026)
HUECO_M = 2.0
MANZANA_VACIA = 0.05            # R7: por debajo de esto del borde con casas, la manzana del plano está vacía
FUERA_M = 3.0                   # R7: una casa a más de esto (media calle angosta) de toda unidad del plano está fuera
EDIFICADAS = {'rayada', 'parte_de_otra_unidad'}
LIBRES = {'lote_especial', 'plaza', 'terreno_libre', 'huerta'}
MEDIA_CUADRA_M = 50.0           # R8: suelo urbano a más de esto de toda casa de la época no tiene manzana
MANCHA_MAXIMA_CASAS = 2         # R8: una mancha de suelo urbano con tan pocas casas es un halo, no un barrio
ESTILO_PUBLICO = 9              # src/techos.js: un edificio público del plano (R9: representa al edificio de la marca)
HITO_TOLERANCIA_M = 2.0         # R9: el punto de una marca a menos de esto de la planta de su hito cae sobre él


def _vive(x, epoca):
    return x['nace'] <= epoca and (x.get('muere', 0) == 0 or epoca < x['muere'])


def _clase(clases, id_, epoca):
    c = clases.get(id_)
    if isinstance(c, list):
        vigente = [k for desde, k in c if desde <= epoca]
        return vigente[-1] if vigente else None
    return c


def nombres_en_su_lugar(marcas, clases, epoca, casas, hitos, metro=METRO):
    """R9: cada marca de edificio viva cae sobre la planta de un hito en pie o sobre un edificio público del plano
    (`estilo` de la casa en la época); si no, sobre casas genéricas
    (`sobre_casas`) o sobre nada (`sin_edificio`). Una marca de plaza no cae sobre casas (`plaza_con_casas`)."""
    plantas = [Polygon(z).buffer(HITO_TOLERANCIA_M / metro) for h in hitos if _vive(h, epoca) for z in h['planta']]
    figuras = [_figura(c) for c in casas]
    arbol_p, arbol_c = STRtree(plantas) if plantas else None, STRtree(figuras) if figuras else None

    def en(arbol, geoms, punto):
        return arbol is not None and any(geoms[k].contains(punto) for k in arbol.query(punto))

    def bajo(punto):   # las casas bajo el punto
        return [casas[k] for k in arbol_c.query(punto) if figuras[k].contains(punto)] if arbol_c is not None else []

    fuera, medidas = [], 0
    for m in marcas:
        clase = _clase(clases, m['id'], epoca)
        if not _vive(m, epoca) or clase not in ('edificio', 'plaza'):
            continue
        medidas += 1
        punto = Point(m['px'], m['py'])
        debajo = bajo(punto)
        if clase == 'plaza':
            if debajo:
                fuera.append({'id': m['id'], 'clase': clase, 'donde': 'plaza_con_casas'})
        elif not en(arbol_p, plantas, punto) and not any(c.get('estilo') == ESTILO_PUBLICO for c in debajo):
            fuera.append({'id': m['id'], 'clase': clase, 'donde': 'sobre_casas' if debajo else 'sin_edificio'})
    return {'medidas': medidas, 'fuera': fuera}


def edificado_sigue_al_plano(unidades, casas, hitos_plantas, metro=METRO):
    """R7 contra la referencia de la época (unidades aprobadas en px del mosaico): manzanas edificadas vacías o con
    menos de FRENTE_EDIFICADO_MINIMO del borde con casa o hito, casas en lugares libres (manda la unidad más chica que
    contiene su punto) y casas a más de FUERA_M de toda unidad."""
    todas = [(u, Polygon(u['poligono']).buffer(0)) for u in unidades if u['estado'] == 'aprobada' and len(u['poligono']) >= 3]
    figuras = [(c, _figura(c)) for c in casas]
    ocupantes = [f for _, f in figuras] + [Polygon(z).buffer(0) for z in hitos_plantas]
    arbol_o = STRtree(ocupantes) if ocupantes else None
    vacias, frente_bajo = [], []
    for u, m in todas:
        if u['ocupacion'] not in EDIFICADAS:
            continue
        cerca = [ocupantes[k] for k in arbol_o.query(m.buffer(HUECO_M / metro))] if arbol_o is not None else []
        parte = (m.exterior.intersection(unary_union(cerca).buffer(HUECO_M / metro)).length / m.exterior.length) if cerca else 0.0
        if parte < MANZANA_VACIA:
            vacias.append(u['id'])
        elif parte < FRENTE_EDIFICADO_MINIMO:
            frente_bajo.append({'id': u['id'], 'frente': round(parte, 3)})
    arbol_u = STRtree([f for _, f in todas]) if todas else None
    en_libres, fuera = [], []
    for c, f in figuras:
        punto = f.representative_point()
        contienen = [todas[k] for k in arbol_u.query(punto, predicate='within')] if arbol_u is not None else []
        if contienen:
            if min(contienen, key=lambda uf: uf[1].area)[0]['ocupacion'] in LIBRES:
                en_libres.append(c['techo'])
        elif arbol_u is None or not len(arbol_u.query(punto.buffer(FUERA_M / metro))):
            fuera.append(c['techo'])
    return {'frente_minimo': FRENTE_EDIFICADO_MINIMO, 'vacias': vacias, 'frente_bajo': frente_bajo,
            'casas_en_libres': sorted(en_libres), 'casas_fuera': sorted(fuera)}


def suelo_coherente(urbanizado, celda_px, casas, metro=METRO):
    """R8: el suelo urbano de la época (celdas de `urbanizado`, de `celda_px` px del mosaico) a más de MEDIA_CUADRA_M de
    toda casa, en hectáreas, y las manchas de suelo urbano (8-conexas) con MANCHA_MAXIMA_CASAS casas o menos."""
    import cv2
    figuras = [_figura(c) for c in casas]
    cerca = np.zeros(urbanizado.shape, np.uint8)
    for k, f in enumerate(figuras):
        x0, y0, x1, y1 = f.bounds
        cv2.rectangle(cerca, (int(x0 // celda_px), int(y0 // celda_px)), (int(x1 // celda_px), int(y1 // celda_px)), 1, -1)
    radio = int(np.ceil(MEDIA_CUADRA_M / metro / celda_px))
    cerca = cv2.dilate(cerca, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radio + 1, 2 * radio + 1)))
    sin_manzana = urbanizado & (cerca == 0)
    celda_ha = (celda_px * metro) ** 2 / 1e4
    n, etiquetas = cv2.connectedComponents(urbanizado.astype(np.uint8), connectivity=8)
    casas_por_mancha = np.zeros(n, int)
    for f in figuras:
        x, y = f.representative_point().coords[0]
        i, j = int(y // celda_px), int(x // celda_px)
        if 0 <= i < etiquetas.shape[0] and 0 <= j < etiquetas.shape[1]:
            casas_por_mancha[etiquetas[i, j]] += 1
    sueltas = int(sum(1 for k in range(1, n) if 0 < casas_por_mancha[k] <= MANCHA_MAXIMA_CASAS))
    return {'suelo_sin_manzana_ha': round(float(sin_manzana.sum() * celda_ha), 2), 'media_cuadra_m': MEDIA_CUADRA_M,
            'manchas_sueltas': sueltas, 'manchas_sin_casas': int(sum(1 for k in range(1, n) if casas_por_mancha[k] == 0))}


def medir(casas, metro=METRO, epoca=None, año=None, contexto=None):
    """Todas las puertas de este módulo sobre las casas a la vista de una época. `contexto` (opcional): marcas, clases,
    hitos (plantas con su vida), unidades de la referencia de la época y lo urbanizado (máscara y celda en px)."""
    contexto = contexto or {}
    manzanas = manzanas_edificadas(casas, metro)
    r1 = fila_por_frente(manzanas, metro)
    r3 = alineacion(manzanas, metro)
    doc = {'epoca': epoca, 'año': año, 'casas': len(casas),
           'R1': r1, 'R3': r3, 'R4': anchos_de_calle(manzanas, metro), 'R6': casas_por_manzana(manzanas, metro),
           'resumen': {'segunda_fila': len(r1['segunda_fila']), 'giradas': r3['n_giradas']},
           'pendientes': ['R2', 'R5', 'R10', 'R11', 'R12'],
           'umbrales_pendientes': 'casas por manzana de 1889 y 1911 y ancho de las calles nuevas: specs/13 § 3 (T82.6)'}
    hitos = contexto.get('hitos', [])
    if 'marcas' in contexto:
        doc['R9'] = nombres_en_su_lugar(contexto['marcas'], contexto['clases'], epoca, casas, hitos, metro)
        doc['resumen']['marcas_fuera'] = len(doc['R9']['fuera'])
    if contexto.get('unidades') is not None:
        plantas = [z for h in hitos if _vive(h, epoca) for z in h['planta']]
        doc['R7'] = edificado_sigue_al_plano(contexto['unidades'], casas, plantas, metro)
        doc['resumen'].update({'manzanas_vacias': len(doc['R7']['vacias']), 'frente_bajo': len(doc['R7']['frente_bajo']),
                               'casas_en_libres': len(doc['R7']['casas_en_libres']), 'casas_fuera': len(doc['R7']['casas_fuera'])})
    else:
        doc['R7'] = {'sin_referencia': 'la época no tiene referencia en px del mosaico (tools/geo/referencias/<año>-manzanas.json): '
                                       '1772 la mide la fase 4 de specs/08; 1889 y 1911, T82.11 y T82.12'}
    if contexto.get('urbanizado') is not None:
        doc['R8'] = suelo_coherente(contexto['urbanizado'], contexto['celda_px'], casas, metro)
        doc['R8']['patios_sin_casa'] = 'pendiente (T82.20): los pisos de patio y solar fuera de las casas de la época'
        doc['resumen'].update({'suelo_sin_manzana_ha': doc['R8']['suelo_sin_manzana_ha'], 'manchas_sueltas': doc['R8']['manchas_sueltas']})
    return doc


def urbanizado_de(crece_png, epoca, cuantas=6):
    """La máscara de lo urbanizado en `epoca` (canal G de crece.png, «desde cuándo»: specs/02)."""
    import cv2
    g = cv2.imread(str(crece_png), cv2.IMREAD_COLOR)[:, :, 1].astype(float) / 255   # BGR: G es el 1
    desde = np.where(g > 0, np.round(cuantas * (1 - g)), np.inf)
    return desde <= epoca


def main():  # pragma: no cover - E/S
    import subprocess
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--epoca', type=int, choices=AÑOS)
    g.add_argument('--todas', action='store_true')
    a = ap.parse_args()
    raiz = Path(__file__).resolve().parents[2]
    # la ciudad que se empaqueta (después del paso de estilos, que corre la vida de algunos galpones) y la vida que le
    # deja el visor con los hitos puestos (tools/vidas-visibles.mjs, sobre public/datos/ciudad.pak)
    ruta = raiz / 'fuentes/derivados/epocas/ciudad-estilos.json'
    ciudad = json.loads(ruta.read_text())
    vista = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'vidas-visibles.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    if vista['techos'] != len(ciudad['techos']):
        raise SystemExit(f"reglas_mapa: el pak tiene {vista['techos']} techos y {ruta.name} {len(ciudad['techos'])}: "
                         'no son los mismos datos (npm run datos)')
    ciudad = {**ciudad, 'vida': vista['vida']}
    # el frente de cada casa que da a la calle: su dirección (eu) y el medio de su fachada (origen + eu · ancho / 2)
    eu = {int(m[0]): {'eu': (m[3], m[4]), 'frente': (m[1] + m[3] * m[5] / 2, m[2] + m[4] * m[5] / 2)}
          for m in ciudad.get('marcos', [])}
    procedencia = {'ciudad_sha256': hashlib.sha256(ruta.read_bytes()).hexdigest(), 'pak_sha256': vista['pak_sha256']}
    salida = raiz / 'specs/reglas'
    salida.mkdir(exist_ok=True)
    def node(script):
        return json.loads(subprocess.run(['node', str(raiz / 'tools' / script)], check=True, capture_output=True,
                                         text=True, cwd=raiz).stdout)
    marcas, hitos = node('marcas-json.mjs'), node('hitos-planta.mjs')
    clases = json.loads((raiz / 'specs/reglas/clases-marcas.json').read_text())['clases']
    celda_px = json.loads((raiz / 'public/datos/crece.json').read_text())['celda_m'] / METRO
    for año in (AÑOS if a.todas else [a.epoca]):
        e = AÑOS.index(año)
        casas = [{**c, **eu.get(c['techo'], {}), 'estilo': ciudad['historia'][c['techo']][e] % 16}
                 for c in casas_de_epoca(ciudad, e)]
        ref = raiz / f'tools/geo/referencias/{año}-manzanas.json'
        contexto = {'marcas': marcas, 'clases': clases, 'hitos': hitos, 'celda_px': celda_px,
                    'unidades': json.loads(ref.read_text())['unidades'] if ref.exists() else None,
                    'urbanizado': urbanizado_de(raiz / 'public/plano/crece.png', e)}
        doc = {'alcance': __doc__.split('\n\n')[1].replace('\n', ' '), **procedencia, **medir(casas, METRO, e, año, contexto)}
        (salida / f'medicion-{año}.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
        r6 = doc['R6']['cuadras_del_damero']
        print(f"{año}: {doc['casas']} casas, {doc['R6']['n_manzanas']} manzanas; segunda fila {doc['resumen']['segunda_fila']}"
              f" ({doc['R1']['parte_en_segunda_fila']}); giradas {doc['resumen']['giradas']}; calle mediana {doc['R4']['mediana_m']} m"
              f" (p10 {doc['R4']['p10_m']}); unidas {doc['R6']['mayores_que_una_cuadra']['n']}; cuadras del damero: {r6['n']},"
              f" mediana {r6['mediana_casas']} casas, frente {r6['mediana_frente_m']} m; R7/R8/R9 {doc['resumen']}")


if __name__ == '__main__':
    main()
