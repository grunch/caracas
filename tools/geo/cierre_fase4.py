"""Puerta de salida de la fase 4 de 1772 (specs/08: ocupación de 1772 y conjuntos especiales), medida sobre el generador.

Listo cuando: cada frente edificado, parcial o vacío concuerda con su clasificación; plazas, huertas y excepciones
conservadas; hitos sin dobles edificios ni vacíos artificiales. Se mide, sobre las casas que viven en 1772:

- edificadas con casas: toda unidad que el censo lee edificada (continua, parcial, aislada, conjunto especial) tiene
  casas de 1772 en su interior;
- libres sin casas: terreno libre, plaza y lo descartado como edificación, sin casas;
- parciales sin rellenar: una parcial aprobada no queda cubierta casi entera (las huertas y solares se conservan);
- hitos sin dobles: ninguna casa visible (fuera de la supresión del hito, src/hitos/suprimir.js) pisa la planta de un
  hito en pie en 1772.

La figura de una unidad aprobada es su anillo de la referencia; la de una pendiente, su caja del original llevada a
1936 por el calce por identidad: una medida **aproximada** (el error del calce en su sector). Los umbrales son
inferidos y van declarados. Cuenta lo medido; no certifica fidelidad.

    .venv/bin/python tools/geo/cierre_fase4.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json
"""
import argparse
import hashlib
import json
import subprocess
from collections import OrderedDict
from pathlib import Path

from shapely.geometry import Polygon, box
from shapely.ops import unary_union
from shapely.strtree import STRtree

from cierre_fase3 import EPOCA_1772, METRO, casas_de_epoca

EDIFICADAS = {'continua', 'parcial', 'aislada', 'conjunto_especial'}
LIBRES = {'terreno_libre', 'plaza', 'descartada_no_edificacion'}
RETIRO_M = 3.0              # la figura se encoge esto: la calle y el error del dibujo no cuentan como interior
COBERTURA_MINIMA = 0.05     # por debajo, la unidad no tiene casas (inferido)
COBERTURA_PARCIAL_MAXIMA = 0.85  # una parcial cubierta más que esto está rellena (inferido)


def figura_de_unidad(unidad, por_id, cajas, retiro_m=RETIRO_M, metro=METRO):
    """(polígono interior en px del mosaico, 'anillo' | 'aproximada'), o (None, None) si no hay cómo ubicarla."""
    if unidad['nodos']:
        figura, medida = Polygon([por_id[x]['mosaico'] for x in unidad['nodos']]), 'anillo'
    elif unidad['id'] in cajas:
        figura, medida = cajas[unidad['id']], 'aproximada'
    else:
        return None, None
    interior = figura.buffer(-retiro_m / metro, join_style='mitre')
    return (interior, medida) if not interior.is_empty else (None, None)


def cobertura(figura, casas):
    """Fracción de la figura bajo casas (sin contar dos veces lo que se solapa)."""
    if figura.area == 0:
        return 0.0
    return round(unary_union([c.intersection(figura) for c in casas if c.intersects(figura)]).area / figura.area, 4)


def dobles_de_hitos(hitos, casas, epoca=EPOCA_1772):
    """Hitos en pie en `epoca` con casas visibles sobre su planta: una casa que pisa la supresión del hito no se ve."""
    resultado = []
    for h in hitos:
        if not (h['nace'] <= epoca and (h['muere'] == 0 or h['muere'] > epoca)):
            continue
        planta = unary_union([Polygon(p) for p in h['planta']])
        suprime = unary_union([Polygon(p) for p in h.get('suprime', [])])
        quienes = sorted(k for k, c in casas if c.intersects(planta) and not c.intersects(suprime)
                         and c.intersection(planta).area > 0)
        if quienes:
            resultado.append({'hito': h['id'], 'casas': quienes})
    return resultado


def puerta_fase4(ciudad, red, unidades, cajas, hitos, metro=METRO):
    """Criterios de la fase 4 con su cumplimiento sobre las casas de 1772; `fase_4_cerrable` exige todos."""
    casas = casas_de_epoca(ciudad)
    figuras = [c for _, c in casas]
    arbol = STRtree(figuras) if figuras else None
    por_id = {n['id']: n for n in red['nodos']}
    sin_casas, con_casas, rellenas, sin_ubicar, medidas = [], [], [], [], []
    for u in unidades:
        figura, medida = figura_de_unidad(u, por_id, cajas, metro=metro)
        if figura is None:
            sin_ubicar.append(u['id'])
            continue
        cerca = [] if arbol is None else [figuras[j] for j in arbol.query(figura, predicate='intersects')]
        cubierta = cobertura(figura, cerca)
        medidas.append({'unidad': u['id'], 'ocupacion': u['ocupacion'], 'medida': medida, 'cobertura': cubierta})
        if u['ocupacion'] in EDIFICADAS and cubierta < COBERTURA_MINIMA:
            sin_casas.append({'unidad': u['id'], 'medida': medida})
        if u['ocupacion'] in LIBRES and cubierta >= COBERTURA_MINIMA:
            con_casas.append({'unidad': u['id'], 'medida': medida})
        if u['ocupacion'] == 'parcial' and medida == 'anillo' and cubierta > COBERTURA_PARCIAL_MAXIMA:
            rellenas.append(u['id'])
    dobles = dobles_de_hitos(hitos, casas)
    criterios = OrderedDict([
        ('edificadas_con_casas', {'cumplido': not sin_casas, 'sin_casas': sin_casas}),
        ('libres_sin_casas', {'cumplido': not con_casas, 'con_casas': con_casas}),
        ('parciales_sin_rellenar', {'cumplido': not rellenas, 'umbral': COBERTURA_PARCIAL_MAXIMA, 'rellenas': rellenas}),
        ('hitos_sin_dobles', {'cumplido': not dobles, 'dobles': dobles}),
    ])
    return {**criterios, 'umbrales_inferidos': {'cobertura_minima': COBERTURA_MINIMA, 'retiro_m': RETIRO_M},
            'sin_ubicar': sin_ubicar, 'casas_1772': len(casas), 'medidas': medidas,
            'fase_4_cerrable': all(c['cumplido'] for c in criterios.values())}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def cajas_por_calce(unidades, censo, a_1936):
    """La caja del original de cada pendiente llevada a 1936 por el calce (sus cuatro esquinas)."""
    import numpy as np
    resultado = {}
    for u in unidades:
        if u['nodos'] or u['id'] not in censo:
            continue
        x0, y0, x1, y1 = censo[u['id']]['bbox_original']
        xs, ys = a_1936(np.array([x0, x1, x1, x0], float), np.array([y0, y0, y1, y1], float))
        resultado[u['id']] = Polygon(zip(xs.tolist(), ys.tolist()))
    return resultado


def main():
    from calce import Calce
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('ciudad', type=Path, help='fuentes/derivados/epocas/ciudad-epocas.json (salida del generador)')
    ap.add_argument('--datos', default=None, help='release datos-* o commit del que sale la ciudad medida')
    args = ap.parse_args()
    referencias = Path(__file__).parent / 'referencias'
    red, unidades = _leer(referencias / '1772-red.json'), _leer(referencias / '1772-unidades.json')['unidades']
    config = _leer(Path(__file__).parent / 'gcp' / 'calce-1772-pares-agi-exato-mapa.json')
    calce = Calce.ajustar(config['gcps'], METRO, config.get('suavizado', 0.0))
    censo = {u['id_fuente']: u for u in _leer(args.carpeta / 'unidades-original.json')['unidades']}
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    puerta = puerta_fase4(_leer(args.ciudad), red, unidades, cajas_por_calce(unidades, censo, calce.a_1936), hitos)
    informe = OrderedDict([
        ('alcance', 'Puerta de salida de la fase 4 de 1772 (specs/08), medida sobre la salida del generador. Las '
                    'unidades pendientes se miden por su caja llevada por el calce (aproximada). Cuenta lo medido; no '
                    'certifica fidelidad.'),
        ('ciudad', {'archivo': 'fuentes/' + args.ciudad.resolve().as_posix().split('/fuentes/', 1)[-1],
                    'sha256': hashlib.sha256(args.ciudad.read_bytes()).hexdigest(), 'datos': args.datos}),
        ('puerta_de_salida', puerta),
    ])
    (args.carpeta / 'cierre-fase4.json').write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"fase 4 cerrable: {puerta['fase_4_cerrable']}; casas de 1772: {puerta['casas_1772']}; "
          + '; '.join(f"{k}: {v['cumplido']}" for k, v in puerta.items() if isinstance(v, dict) and 'cumplido' in v))


if __name__ == '__main__':
    main()
