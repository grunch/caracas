"""Puerta de salida de la fase 6 de 1772: cubiertas (specs/08, T33j.6a).

Mide los techos como los dibuja el visor, sobre los triángulos que saca tools/cubiertas.mjs de los datos generados
(la geometría de src/ciudad.js con los pisos y el relieve de 1772, el método de T33j.1l):

- sin triángulos degenerados: ninguno sin área o sin altura;
- sin techos cruzados: ninguna superficie de una casa atraviesa la de otra (corte estricto, T33j.1l);
- cumbreras coherentes con el frente: la cumbrera más cercana a la calle de cada frente de la casa (los frentes de la
  puerta de la fase 5) corre con esa calle;
- aleros sin bloquear calles: ningún techo entra en el núcleo de la calzada de las calles de 1772 (fase 3);
- mismo trazado y ocupación que en la fase 5: las puertas 3, 4 y 5 cierran sobre la misma ciudad.

Cuenta lo medido; no certifica fidelidad. Uso:
  .venv/bin/python tools/geo/cierre_fase6.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json \\
      --datos <release o commit>
"""
import argparse
import hashlib
import json
import subprocess
from collections import OrderedDict
from pathlib import Path

import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree

from cierre_fase3 import METRO, casas_de_epoca, corredores
from cierre_fase4 import visibles
from cierre_fase5 import _estaciones, _primero, plantas_en_pie
from fachadas import ALCANCE_M, ESTACIONES_MINIMAS, GIRO_MAXIMO_GRADOS, de_su_manzana, manzanas_de

AREA_MINIMA_M2 = 1e-4          # un triángulo con menos área es degenerado (1 cm²; el umbral de T33j.1l)
ALTURA_MINIMA_M = 1e-3         # o con menos altura sobre su lado mayor: una aguja
CRUCE_AREA_M2 = 1e-4           # proyección común mínima de dos triángulos para medir su cruce (T33j.1l)
CONTACTO_M = 1e-3             # una superficie común más angosta que esto es un contacto, no un cruce (la altura mínima)
CRUCE_ALTO_M = 1e-3            # se cortan si uno pasa más que esto por encima y por debajo del otro (T33j.1l)
CUMBRE_MISMO_ALTO_M = 0.01     # los dos extremos de una arista de cumbrera, a la misma altura
CUMBRE_MINIMA_M = 0.5          # una arista de cumbrera más corta no da dirección
EMPATE_CUMBRERA_M = 0.5      # dos cumbreras a menos de esto del eje empatan: gana la más paralela (la tolerancia de fachada)
ALERO_EN_CALLE_M2 = 0.01       # lo que un techo puede pisar del núcleo de la calzada (el umbral de solapes de la fase 5)


def _puntos_m(t, metro):
    """Los tres vértices en metros: x e y del plano por el metro, el alto como viene."""
    a = np.array(t['puntos'], float)
    return np.column_stack([a[:, 0] * metro, a[:, 1] * metro, a[:, 2]])


def triangulos_degenerados(triangulos, metro=METRO):
    """Los triángulos sin área (menos de AREA_MINIMA_M2) o sin altura sobre su lado mayor (menos de ALTURA_MINIMA_M)."""
    salida = []
    for t in triangulos:
        a, b, c = _puntos_m(t, metro)
        area = float(np.linalg.norm(np.cross(b - a, c - a))) / 2
        lado = max(np.linalg.norm(b - a), np.linalg.norm(c - b), np.linalg.norm(a - c))
        if area < AREA_MINIMA_M2 or lado == 0 or 2 * area / lado < ALTURA_MINIMA_M:
            salida.append({'techo': t['techo'], 'area_m2': round(area, 6)})
    return salida


def _plano(t, metro):
    """(polígono proyectado en m, plano alto = a·x + b·z + c), o None si el triángulo no tiene proyección."""
    p = _puntos_m(t, metro)
    poligono = Polygon(p[:, :2])
    if poligono.area < 1e-7:
        return None
    return poligono, np.linalg.solve(np.column_stack([p[:, 0], p[:, 1], np.ones(3)]), p[:, 2])


def techos_cruzados(triangulos, metro=METRO):
    """Los pares de casas con superficies que se atraviesan (T33j.1l): dos triángulos de casas distintas con proyección
    común y un plano que pasa por encima y por debajo del otro dentro de ella. Los contactos de borde (una superficie
    común de menos de CONTACTO_M de ancho) y los solapes coplanares no son cruces."""
    planos = [(t['techo'], _plano(t, metro)) for t in triangulos]
    planos = [(techo, p) for techo, p in planos if p is not None]
    if not planos:
        return []
    arbol = STRtree([p[0] for _, p in planos])
    pares = {}
    for i, (ti, (pi, ci)) in enumerate(planos):
        for j in arbol.query(pi, predicate='intersects'):
            tj, (pj, cj) = planos[j]
            if j <= i or ti == tj:
                continue
            comun = pi.intersection(pj)
            # un contacto de borde no es un cruce (T33j.1l); con la precisión del visor (Float32 a cientos de metros del
            # origen) la medianera compartida aparece como una tira de décimas de milímetro: menos de CONTACTO_M de ancho
            if comun.area <= CRUCE_AREA_M2 or comun.buffer(-CONTACTO_M / 2).is_empty:
                continue
            puntos = np.array([c for g in getattr(comun, 'geoms', [comun]) if g.geom_type == 'Polygon'
                               for c in g.exterior.coords])
            if not len(puntos):
                continue
            alto = np.column_stack([puntos, np.ones(len(puntos))]) @ (ci - cj)
            if alto.min() < -CRUCE_ALTO_M and alto.max() > CRUCE_ALTO_M:
                par = pares.setdefault(tuple(sorted((ti, tj))), {'triangulos': 0, 'areas': []})
                par['triangulos'] += 1
                par['areas'].append(comun)
    return sorted(({'techos': list(k), 'pares_de_triangulos': v['triangulos'],
                    'area_proyectada_m2': round(float(unary_union(v['areas']).area), 4)} for k, v in pares.items()),
                  key=lambda x: -x['area_proyectada_m2'])


def _cumbreras(triangulos, metro):
    """{techo: [((extremo, extremo), dirección unitaria)]} de las aristas de cumbrera de teja: los dos extremos en la
    cumbrera, a la misma altura y de al menos CUMBRE_MINIMA_M."""
    salida = {}
    for t in triangulos:
        if t['tipo'] % 8 != 1:
            continue
        p = _puntos_m(t, metro)
        for i, j in ((0, 1), (1, 2), (2, 0)):
            if not (t['cumbre'][i] and t['cumbre'][j]) or abs(p[i, 2] - p[j, 2]) > CUMBRE_MISMO_ALTO_M:
                continue
            d = p[j, :2] - p[i, :2]
            largo = float(np.hypot(*d))
            if largo >= CUMBRE_MINIMA_M:
                salida.setdefault(t['techo'], []).append(((p[i, :2], p[j, :2]), d / largo))
    return salida


def _distancia_al_eje(extremos, origen, normal):
    """Distancia del segmento de cumbrera a la recta del eje: 0 si la cruza, si no la del extremo más cercano."""
    a, b = (float((e - origen) @ normal) for e in extremos)
    return 0.0 if a * b <= 0 else min(abs(a), abs(b))


def casas_con_cumbrera_medible(triangulos, frentes, metro=METRO, fuera_de_recta=frozenset()):
    """Las casas que cumbreras_desviadas mide de verdad: con cumbrera de teja y algún frente que no se excluye."""
    return {techo for techo in _cumbreras(triangulos, metro)
            if any((techo, *f[2:]) not in fuera_de_recta for f in frentes.get(techo, []))}


def cumbreras_desviadas(triangulos, frentes, metro=METRO, giro_maximo=GIRO_MAXIMO_GRADOS, fuera_de_recta=frozenset()):
    """Las casas cuya cumbrera de frente no corre con su calle. `frentes`: {techo: [(dirección del eje, punto del eje,
    tramo, lado, segmento)]}, en px. Por cada frente, la cumbrera más cercana a ese eje; si hay varias a menos de
    EMPATE_CUMBRERA_M de ella (un ala que nace en la cumbrera del frente, en T), la más paralela. La casa está bien si
    en alguno de sus frentes esa cumbrera se aparta menos de `giro_maximo` grados. No se mide una casa en un frente
    donde la fase 5 la ve fuera de la recta (`fuera_de_recta`: {(techo, tramo, lado, segmento)}): no es su fachada. Las
    casas sin cumbrera de teja (azotea, zinc) no se miden."""
    salida = []
    for techo, aristas in sorted(_cumbreras(triangulos, metro).items()):
        suyos = [f for f in frentes.get(techo, []) if (techo, *f[2:]) not in fuera_de_recta]
        if not suyos:
            continue
        giros = []
        for d, origen, *_frente in suyos:
            d = np.asarray(d, float) / np.hypot(*d)
            o = np.asarray(origen, float) * metro
            normal = np.array([-d[1], d[0]])
            distancias = [_distancia_al_eje(x[0], o, normal) for x in aristas]
            cerca = min(distancias)
            giros.append(min(float(np.degrees(np.arccos(min(1.0, abs(float(x[1] @ d))))))
                             for x, dist in zip(aristas, distancias) if dist <= cerca + EMPATE_CUMBRERA_M))
        if min(giros) > giro_maximo:
            salida.append({'techo': techo, 'giro_grados': round(min(giros), 1)})
    return salida


def aleros_en_la_calle(triangulos, calzada, metro=METRO, umbral_m2=ALERO_EN_CALLE_M2, huellas=None):
    """Las casas con techo sobre el núcleo de la calzada (`calzada`: polígonos en px) en más de `umbral_m2`. Con
    `huellas` ({techo: Polygon}), solo cuenta lo que sale de la huella de la casa: el techo sobre su propia huella no
    es un alero, y si la huella pisa la calzada lo mide la fase 3."""
    if not calzada:
        return []
    zona = unary_union(calzada)
    por_casa = {}
    for t in triangulos:
        p = Polygon(np.array(t['puntos'], float)[:, :2])
        if p.area > 0 and p.intersects(zona):
            por_casa.setdefault(t['techo'], []).append(p.intersection(zona))
    salida = []
    for techo, partes in sorted(por_casa.items()):
        sobre = unary_union(partes)
        if huellas is not None and techo in huellas:
            sobre = sobre.difference(huellas[techo])
        area = sobre.area * metro ** 2
        if area > umbral_m2:
            salida.append({'techo': techo, 'area_m2': round(area, 3)})
    return salida


PROCEDENCIA = (('pak_sha256', 'el ciudad.pak'), ('relieve_sha256', 'el relieve.bin'),
               ('huellas_sha256', 'las huellas de la ciudad'))


def huellas_sha256(ciudad):
    """sha256 de los vértices (float32) y de [primer vértice, cuántos] de cada techo (uint32), como el ciudad.pak:
    lo mismo que tools/cubiertas-lib.mjs (huellasSha256) registra en las cubiertas."""
    vertices = np.array(ciudad['vertices'], '<f4').tobytes()
    techos = np.array([t[:2] for t in ciudad['techos']], '<u4').tobytes()
    return hashlib.sha256(vertices + techos).hexdigest()


def cubiertas_de_estos_datos(cubiertas, datos):
    """None si las cubiertas salieron de estos datos ({clave: sha256} de PROCEDENCIA: el pak, el relieve y las huellas
    de la ciudad medida); si no, el motivo: unas cubiertas de otros datos medirían techos viejos bajo el sha de la
    ciudad nueva."""
    for clave, que in PROCEDENCIA:
        if cubiertas.get(clave) != datos[clave]:
            return f'las cubiertas no salieron de {que} que se mide ({clave} distinto o ausente)'
    return None


def mismo_trazado(fases, sha256):
    """Las puertas 3, 4 y 5 ({fase: informe}) cierran y midieron esta misma ciudad (su sha256)."""
    estado = {k: {'misma_ciudad': f['ciudad']['sha256'] == sha256,
                  'cerrable': bool(f['puerta_de_salida'].get(f'fase_{k}_cerrable'))} for k, f in sorted(fases.items())}
    return {'cumplido': all(e['misma_ciudad'] and e['cerrable'] for e in estado.values()), 'fases': estado}


def frentes_de_casas(calles, casas, metro=METRO, obstaculos=()):
    """{techo: [(dirección del eje, punto del eje, tramo, lado, segmento)]} de los frentes medibles en que la casa es fachada, como en la puerta
    de la fase 5 (frentes_desalineados): los rayos de cada lado, la manzana que arma el frente."""
    figuras = [c for _, c in casas] + list(obstaculos)
    son_obstaculo = [False] * len(casas) + [True] * len(obstaculos)
    if not figuras:
        return {}
    arbol = STRtree(figuras)
    manzana = manzanas_de([c for _, c in casas], metro) + [-1] * len(obstaculos)
    alcance = ALCANCE_M / metro
    salida = {}
    for eje in calles:
        if not eje['medible']:
            continue
        for segmento, (a, b) in enumerate(zip(eje['puntos'], eje['puntos'][1:])):
            d, estaciones = _estaciones(a, b, metro)
            if d is None:
                continue
            for lado in (1, -1):
                n = np.array([-d[1], d[0]]) * lado
                golpes = [_primero(LineString([p, p + n * alcance]), Point(p), arbol, figuras, son_obstaculo)
                          for p in estaciones]
                golpes = de_su_manzana([g for g in golpes if g is not None], manzana)
                techos = {casas[j][0] for j, _ in golpes}
                if len(golpes) < ESTACIONES_MINIMAS or len(techos) < 2:
                    continue
                for techo in techos:
                    salida.setdefault(techo, []).append((tuple(d), tuple(a), eje['tramo'], lado, segmento))
    return salida


CENTRO_M = 1.0    # el centro de la huella de una casa registrada como límite, a menos de esto: es la misma casa


def con_limites_fase6(desviadas, cruces, huellas, limites, metro=METRO):
    """(desviadas, cruces) con la clase del límite documentado que los cubre (limites-fase6.json, decisión del
    responsable del 23-11-2026). Los índices de techo cambian al regenerar: cada casa se reconoce por el centro de su
    huella (a menos de CENTRO_M). Un cruce registrado cuenta como límite solo si no pasa su área máxima."""
    centros = {t: np.asarray(g.centroid.coords[0]) for t, g in huellas.items()}

    def es(t, centro):
        return t in centros and float(np.hypot(*(centros[t] - np.asarray(centro, float)))) * metro < CENTRO_M

    salida_d = []
    for x in desviadas:
        reg = next((r for r in limites.get('cumbreras', []) if es(x['techo'], r['centro'])), None)
        salida_d.append({**x, 'limite': reg['clase']} if reg else dict(x))
    salida_c = []
    for x in cruces:
        a, b = x['techos']
        reg = next((r for r in limites.get('cruces', [])
                    if x['area_proyectada_m2'] <= r['area_maxima_m2']
                    and ((es(a, r['centros'][0]) and es(b, r['centros'][1])) or (es(a, r['centros'][1]) and es(b, r['centros'][0])))),
                   None)
        salida_c.append({**x, 'limite': reg['clase']} if reg else dict(x))
    return salida_d, salida_c


def puerta_fase6(cubiertas, ciudad, calles, red, hitos, fases, sha256, metro=METRO, limites=None):
    """Criterios de la fase 6 sobre los techos de las casas visibles de 1772; `fase_6_cerrable` exige todos."""
    casas = visibles(casas_de_epoca(ciudad), hitos)
    a_la_vista = {k for k, _ in casas}
    triangulos = [t for t in cubiertas['triangulos'] if t['techo'] in a_la_vista]
    degenerados = triangulos_degenerados(triangulos, metro)
    cruces = techos_cruzados(triangulos, metro)
    frentes = frentes_de_casas(calles, casas, metro, plantas_en_pie(hitos))
    # las casas que la fase 5 ve fuera de la recta de un frente (vistas por una abertura): no son su fachada
    fuera = {(c['techo'], f['tramo'], f['lado'], f.get('segmento', 0))
             for f in fases[5]['puerta_de_salida']['frentes_alineados']['desalineados'] for c in f['casas']}
    desviadas = cumbreras_desviadas(triangulos, frentes, metro, fuera_de_recta=fuera)
    con_cumbrera = casas_con_cumbrera_medible(triangulos, frentes, metro, fuera_de_recta=fuera)
    aleros = aleros_en_la_calle(triangulos, [c['poligono'] for c in corredores(red, metro=metro)], metro, huellas=dict(casas))
    desviadas, cruces = con_limites_fase6(desviadas, cruces, dict(casas), limites or {}, metro)
    fuera_d = [x for x in desviadas if 'limite' not in x]
    fuera_c = [x for x in cruces if 'limite' not in x]
    criterios = OrderedDict([
        ('triangulos_sin_degenerar', {'cumplido': not degenerados, 'triangulos': len(triangulos),
                                      'degenerados': len(degenerados),
                                      'casas': sorted({d['techo'] for d in degenerados})}),
        ('techos_sin_cruces', {'cumplido': not fuera_c, 'pares': len(cruces), 'pares_en_limite': len(cruces) - len(fuera_c),
                               'pares_fuera_de_limite': len(fuera_c), 'mayores': cruces[:40]}),
        ('cumbreras_con_el_frente', {'cumplido': not fuera_d, 'giro_maximo_grados': GIRO_MAXIMO_GRADOS,
                                     'casas_medidas': len(con_cumbrera), 'desviadas': len(desviadas),
                                     'desviadas_en_limite': len(desviadas) - len(fuera_d),
                                     'desviadas_fuera_de_limite': len(fuera_d), 'casas': desviadas}),
        ('aleros_fuera_de_la_calle', {'cumplido': not aleros, 'umbral_m2': ALERO_EN_CALLE_M2, 'casas': aleros}),
        ('mismo_trazado_que_la_fase_5', mismo_trazado(fases, sha256)),
    ])
    return {**criterios,
            'umbrales_inferidos': {'area_minima_m2': AREA_MINIMA_M2, 'altura_minima_m': ALTURA_MINIMA_M,
                                   'cruce_area_m2': CRUCE_AREA_M2, 'cruce_alto_m': CRUCE_ALTO_M, 'contacto_m': CONTACTO_M,
                                   'giro_maximo_grados': GIRO_MAXIMO_GRADOS, 'alero_en_calle_m2': ALERO_EN_CALLE_M2},
            'casas_1772': len(casas), 'casas_con_techo': len({t['techo'] for t in triangulos}),
            'fase_6_cerrable': all(c['cumplido'] for c in criterios.values())}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def main():
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('ciudad', type=Path, help='fuentes/derivados/epocas/ciudad-epocas.json (salida del generador)')
    ap.add_argument('--cubiertas', type=Path, default=None,
                    help='salida de tools/cubiertas.mjs sobre los mismos datos (por omisión se saca de nuevo)')
    ap.add_argument('--datos', default=None, help='release datos-* o commit del que sale la ciudad medida')
    args = ap.parse_args()
    if args.cubiertas is None:
        # se sacan en cada medición: unas guardadas pueden ser de otros datos o de otro código de techos
        args.cubiertas = raiz / 'fuentes/derivados/epocas/cubiertas-1772.json'
        subprocess.run(['node', str(raiz / 'tools' / 'cubiertas.mjs'), str(args.cubiertas)], check=True, cwd=raiz)
    referencias = Path(__file__).parent / 'referencias'
    red, calles = _leer(referencias / '1772-red.json'), _leer(referencias / '1772-calles-1936.json')['tramos']
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    sha256 = hashlib.sha256(args.ciudad.read_bytes()).hexdigest()
    cubiertas, ciudad = _leer(args.cubiertas), _leer(args.ciudad)
    sha = lambda ruta: hashlib.sha256(ruta.read_bytes()).hexdigest()  # noqa: E731
    motivo = cubiertas_de_estos_datos(cubiertas, {'pak_sha256': sha(raiz / 'public/datos/ciudad.pak'),
                                                  'relieve_sha256': sha(raiz / 'public/datos/relieve.bin'),
                                                  'huellas_sha256': huellas_sha256(ciudad)})
    if motivo:
        raise SystemExit(f'cierre_fase6: {motivo}; hay que sacarlas de nuevo (node tools/cubiertas.mjs)')
    fases = {k: _leer(args.carpeta / f'cierre-fase{k}.json') for k in (3, 4, 5)}
    registro = args.carpeta / 'limites-fase6.json'
    puerta = puerta_fase6(cubiertas, ciudad, calles, red, hitos, fases, sha256, limites=_leer(registro) if registro.exists() else None)
    informe = OrderedDict([
        ('alcance', 'Puerta de salida de la fase 6 de 1772 (specs/08), medida sobre los techos del visor reproducidos en '
                    'CPU (tools/cubiertas.mjs). Cuenta lo medido; no certifica fidelidad.'),
        ('ciudad', {'archivo': 'fuentes/' + args.ciudad.resolve().as_posix().split('/fuentes/', 1)[-1],
                    'sha256': sha256, 'datos': args.datos}),
        ('puerta_de_salida', puerta),
    ])
    (args.carpeta / 'cierre-fase6.json').write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"fase 6 cerrable: {puerta['fase_6_cerrable']}; casas de 1772: {puerta['casas_1772']}; "
          + '; '.join(f"{k}: {v['cumplido']}" for k, v in puerta.items() if isinstance(v, dict) and 'cumplido' in v))


if __name__ == '__main__':
    main()
