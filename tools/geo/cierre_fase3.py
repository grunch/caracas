"""Puerta de salida de la fase 3 de 1772 (specs/08: calles y límites de manzana), medida sobre la salida del generador.

Listo cuando: red conectada como el original; ningún frente ocupa una calle; San Jacinto y todos los casos
inventariados tienen separación correcta; no se crean calles en plazas o patios. Aquí se mide, contra la referencia
histórica de la fase 2 (`tools/geo/referencias/1772-*.json`), sobre las casas que viven en 1772 en
`fuentes/derivados/epocas/ciudad-epocas.json`:

- calles libres: ninguna casa ocupa el núcleo de calzada de un tramo recto entre dos cruces identificados;
- calles históricas verificadas libres (`calles-historicas.json`, San Jacinto–Traposos entre ellas);
- plazas aprobadas sin casas;
- ninguna calle abierta dentro de una unidad aprobada continua (una franja vacía de lado a lado con casas a ambos lados).

El ancho del núcleo de calzada es **inferido**, no medido: el original no da anchos. Cuenta lo medido; no certifica
fidelidad.

    .venv/bin/python tools/geo/cierre_fase3.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json
"""
import argparse
import hashlib
import json
from collections import OrderedDict
from pathlib import Path

from shapely.geometry import LineString, Polygon
from shapely.ops import split
from shapely.strtree import STRtree

EPOCA_1772 = 1           # índice de la época en `vida` (0 = 1578 … 5 = 1936)
METRO = 0.5              # m/px del mosaico de 1936
ANCHO_INFERIDO_M = 4     # núcleo de calzada: lo que ninguna calle de 1772 deja de tener (inferido; el original no da anchos)
AREA_MINIMA_M2 = 1       # por debajo, el roce es ruido de vectorización y no una casa sobre la calle
CUBIERTA_MINIMA = 0.1    # fracción de una mediana con casas por debajo de la cual hay una franja libre de lado a lado
OCUPACION_CONTINUA = {'continua'}


def casas_de_epoca(ciudad, epoca=EPOCA_1772):
    """[(índice del techo, polígono)] de las casas que viven en `epoca` (`vida` = [nace, muere], 0 = siempre/nunca)."""
    v, casas = ciudad['vertices'], []
    for k, (inicio, n, *_resto) in enumerate(ciudad['techos']):
        nace, muere = ciudad['vida'][k]
        if nace <= epoca and (muere == 0 or muere > epoca):
            casas.append((k, Polygon([(v[2 * i], v[2 * i + 1]) for i in range(inicio, inicio + n)])))
    return casas


def corredores(red, ancho_m=ANCHO_INFERIDO_M, metro=METRO):
    """El núcleo de calzada de cada tramo recto entre dos cruces identificados de la referencia."""
    por_id = {n['id']: n for n in red['nodos']}
    resultado = []
    for c in red['calles']:
        if c['tipo'] != 'calle_recta':
            continue
        for a, b in zip(c['nodos'], c['nodos'][1:]):
            if por_id[a]['mosaico'] and por_id[b]['mosaico']:
                eje = LineString([por_id[a]['mosaico'], por_id[b]['mosaico']])
                resultado.append({'tramo': f"{c['id']}:{a}-{b}",
                                  'poligono': eje.buffer(ancho_m / 2 / metro, cap_style='flat')})
    return resultado


def _ocupantes(figura, arbol, casas, metro, area_minima_m2):
    return sorted(casas[j][0] for j in arbol.query(figura, predicate='intersects')
                  if casas[j][1].intersection(figura).area * metro ** 2 >= area_minima_m2)


def calles_ocupadas(corredores_, casas, metro=METRO, area_minima_m2=AREA_MINIMA_M2):
    """Tramos cuyo núcleo de calzada pisa alguna casa, con las casas."""
    arbol = STRtree([p for _, p in casas])
    ocupadas = []
    for c in corredores_:
        quienes = _ocupantes(c['poligono'], arbol, casas, metro, area_minima_m2)
        if quienes:
            ocupadas.append({'tramo': c['tramo'], 'casas': quienes})
    return ocupadas


def _interior(unidad, por_id, metro, retiro_m):
    return Polygon([por_id[x]['mosaico'] for x in unidad['nodos']]).buffer(-retiro_m / metro)


def plazas_ocupadas(unidades, por_id, casas, metro=METRO, retiro_m=ANCHO_INFERIDO_M / 2):
    """Plazas aprobadas con alguna casa dentro (sin contar su calle perimetral)."""
    arbol = STRtree([p for _, p in casas])
    resultado = []
    for u in unidades:
        if u['estado'] == 'aprobada' and u['ocupacion'] == 'plaza' and u['nodos']:
            quienes = _ocupantes(_interior(u, por_id, metro, retiro_m), arbol, casas, metro, AREA_MINIMA_M2)
            if quienes:
                resultado.append({'unidad': u['id'], 'casas': quienes})
    return resultado


def _medianas(anillo):
    """Las dos rectas que unen los puntos medios de lados opuestos de un cuadrilátero, con el par de lados."""
    medios = [((anillo[k][0] + anillo[(k + 1) % 4][0]) / 2, (anillo[k][1] + anillo[(k + 1) % 4][1]) / 2) for k in range(4)]
    return [('0-2', LineString([medios[0], medios[2]])), ('1-3', LineString([medios[1], medios[3]]))]


def calles_abiertas_dentro(unidades, por_id, casas, metro=METRO, retiro_m=ANCHO_INFERIDO_M / 2):
    """Unidades aprobadas continuas atravesadas por una franja sin casas de lado a lado, con casas a ambos lados:
    el generador abrió una calle (o un patio pasante) donde el original dibuja una manzana continua."""
    arbol = STRtree([p for _, p in casas])
    resultado = []
    for u in unidades:
        if u['estado'] != 'aprobada' or u['ocupacion'] not in OCUPACION_CONTINUA or len(u['nodos'] or []) != 4:
            continue
        interior = _interior(u, por_id, metro, retiro_m)
        dentro = [casas[j][1] for j in arbol.query(interior, predicate='intersects')]
        for nombre, mediana in _medianas([por_id[x]['mosaico'] for x in u['nodos']]):
            tramo = mediana.intersection(interior)
            if tramo.is_empty or tramo.length == 0:
                continue
            cubierto = sum(c.intersection(tramo).length for c in dentro) / tramo.length
            if cubierto >= CUBIERTA_MINIMA:
                continue
            partes = split(interior, mediana.parallel_offset(0)).geoms if dentro else []
            if sum(any(p.intersection(c).area > 0 for c in dentro) for p in partes) >= 2:
                resultado.append({'unidad': u['id'], 'mediana': nombre})
    return resultado


TOLERANCIA_ORIGINAL_PX = 6   # un extremo de calle histórica a menos de esto de un nodo de la red, en px del original


def historicas_en_referencia(verificadas, red, tol=TOLERANCIA_ORIGINAL_PX):
    """Cada calle histórica verificada con el eje que se mide en 1936. Su evidencia son sus coordenadas en el original
    de 1772: si sus dos extremos caen sobre nodos de la red y todos los cruces de la calle entre ellos tienen pareja
    por identidad, el eje pasa por esos cruces (`fuente: referencia`); si no, por sus anclajes, que se ajustaron a la
    red de OSM (`fuente: anclajes`)."""
    nodos = [n for n in red['nodos'] if n.get('original')]
    por_id = {n['id']: n for n in red['nodos']}

    def cerca(punto):
        n = min(nodos, key=lambda n: (n['original'][0] - punto[0]) ** 2 + (n['original'][1] - punto[1]) ** 2, default=None)
        lejos = n is None or (n['original'][0] - punto[0]) ** 2 + (n['original'][1] - punto[1]) ** 2 > tol ** 2
        return None if lejos else n['id']

    def camino(a, b):
        """Los nodos de una calle de la referencia de `a` a `b`, con los intermedios; None si ninguna los une."""
        for c in red.get('calles', []):
            if a in c['nodos'] and b in c['nodos']:
                i, j = c['nodos'].index(a), c['nodos'].index(b)
                return c['nodos'][i:j + 1] if i <= j else c['nodos'][j:i + 1][::-1]
        return [a, b]

    resultado = []
    for v in verificadas:
        original = v.get('original') or []
        a, b = (cerca(original[0]), cerca(original[-1])) if len(original) >= 2 else (None, None)
        tramo = camino(a, b) if a and b and a != b else None
        if tramo and all(por_id[x]['mosaico'] for x in tramo):
            resultado.append({'id': v['id'], 'anclajes': [list(por_id[x]['mosaico']) for x in tramo], 'fuente': 'referencia'})
        else:
            resultado.append({'id': v['id'], 'anclajes': v['anclajes'], 'fuente': 'anclajes'})
    return resultado


def puerta_fase3(ciudad, red, unidades, verificadas, metro=METRO, ancho_m=ANCHO_INFERIDO_M):
    """Criterios de la fase 3 con su cumplimiento sobre las casas de 1772; `fase_3_cerrable` exige todos."""
    casas = casas_de_epoca(ciudad)
    por_id = {n['id']: n for n in red['nodos']}
    cs = corredores(red, ancho_m, metro)
    ocupadas = calles_ocupadas(cs, casas, metro)
    medidas = historicas_en_referencia(verificadas, red)
    historicas = [{'tramo': v['id'], 'poligono': LineString(v['anclajes']).buffer(ancho_m / 2 / metro, cap_style='flat')}
                  for v in medidas]
    historicas_ocupadas = [o['tramo'] for o in calles_ocupadas(historicas, casas, metro)]
    plazas = plazas_ocupadas(unidades, por_id, casas, metro, ancho_m / 2)
    dentro = calles_abiertas_dentro(unidades, por_id, casas, metro, ancho_m / 2)
    criterios = OrderedDict([
        ('calles_libres', {'cumplido': not ocupadas, 'tramos_medidos': len(cs), 'ancho_inferido_m': ancho_m,
                           'tramos_ocupados': len(ocupadas), 'ocupadas': ocupadas}),
        ('calles_historicas_libres', {'cumplido': not historicas_ocupadas, 'medidas': len(historicas),
                                      'sobre_la_referencia': sum(v['fuente'] == 'referencia' for v in medidas),
                                      'ocupadas': historicas_ocupadas}),
        ('plazas_sin_casas', {'cumplido': not plazas, 'ocupadas': plazas}),
        ('sin_calles_dentro_de_unidades', {'cumplido': not dentro, 'unidades': dentro}),
    ])
    return {**criterios, 'casas_1772': len(casas), 'fase_3_cerrable': all(c['cumplido'] for c in criterios.values())}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('ciudad', type=Path, help='fuentes/derivados/epocas/ciudad-epocas.json (salida del generador)')
    ap.add_argument('--referencias', type=Path, default=Path(__file__).parent / 'referencias')
    ap.add_argument('--salida', type=Path, default=None)
    ap.add_argument('--datos', default=None, help='release datos-* del que sale la ciudad medida, si se publicó')
    args = ap.parse_args()
    red = _leer(args.referencias / '1772-red.json')
    unidades = _leer(args.referencias / '1772-unidades.json')['unidades']
    verificadas = _leer(Path(__file__).parent / 'calles-historicas.json')['tramos']
    puerta = puerta_fase3(_leer(args.ciudad), red, unidades, verificadas)
    informe = OrderedDict([
        ('alcance', 'Puerta de salida de la fase 3 de 1772 (specs/08), medida sobre la salida del generador contra la '
                    'referencia histórica. Cuenta lo medido; no certifica fidelidad.'),
        ('ciudad', {'archivo': 'fuentes/' + args.ciudad.resolve().as_posix().split('/fuentes/', 1)[-1],
                    'sha256': hashlib.sha256(args.ciudad.read_bytes()).hexdigest(), 'datos': args.datos}),
        ('puerta_de_salida', puerta),
    ])
    salida = args.salida or args.carpeta / 'cierre-fase3.json'
    salida.write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"fase 3 cerrable: {puerta['fase_3_cerrable']}; casas de 1772: {puerta['casas_1772']}; "
          + '; '.join(f"{k}: {v['cumplido']}" for k, v in puerta.items() if isinstance(v, dict)))


if __name__ == '__main__':
    main()
