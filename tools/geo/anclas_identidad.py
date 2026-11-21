#!/usr/bin/env python3
"""Anclas por identidad del calce de 1772 (T33j.2a, I010): cruces de damero e hitos, sin correlación.

Cada cruce de damero de controles_damero.py (specs/auditoria-1772/controles-calce-sectores.json) es
una pareja original ⇄ 1936 por identidad: el mismo índice de calles contado desde Las Monjas. Los
hitos agregan la Candelaria y La Pastora, donde el damero no llega. Este programa valida esas
parejas (cruces compartidos únicos, orden de calles igual al original), las escribe como `anclas`
del calce con `etapas: []` (sin enlaces automáticos por correlación), ajusta el TPS resultante y
registra su error dejando uno fuera por sector, los hitos y los pliegues.

Uso:
    .venv/bin/python tools/geo/anclas_identidad.py \\
        --controles specs/auditoria-1772/controles-calce-sectores.json \\
        --gcp tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json \\
        --informe specs/auditoria-1772/calce-identidad.json
Después, `calce.py 1772-pares-agi-exato-mapa` regenera los GCP, los residuos y calzado.tif.
"""
import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))

from calce import GCP_DIR, Calce, json_legible, manuales_de  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]

TOLERANCIA_SEMILLA_PX = 6   # un nodo a menos de esto de una semilla manual es el mismo cruce
UMBRAL_SECTOR_M = 15        # specs/08, T33j.2a: desvío mediano por sector bajo 15 m
PASO_PLIEGUES_PX = 10
UMBRAL_NUDO_M = 4           # una esquina sin cota a más de esto de un nudo de calle es un rótulo, no un cruce
VENTANA_NUDO_PX = 60


def _ancla_de_nodo(n):
    i, j = n['indice']
    nombre = f" ({n['esquina_1936_nombre']})" if n.get('esquina_1936_nombre') else ''
    return {'px': float(n['original'][0]), 'py': float(n['original'][1]),
            'x36': float(n['mosaico_identidad'][0]), 'y36': float(n['mosaico_identidad'][1]),
            'id': n['id'], 'sector': n['sector'],
            'nota': f"identidad de damero [{i}, {j}] desde Las Monjas: esquina 1936 {n['esquina_1936']}{nombre}"}


def _ancla_de_hito(h):
    return {'px': float(h['centro_original'][0]), 'py': float(h['centro_original'][1]),
            'x36': float(h['mosaico_1936'][0]), 'y36': float(h['mosaico_1936'][1]),
            'id': h['id'], 'sector': h['sector'],
            'nota': f"hito {h['nombre_1936']}: centro de su unidad en el original ⇄ 1936 ({h['fuente']})"}


def anclas_de_identidad(nodos, hitos, semillas_px):
    """Anclas de los nodos de damero y de los hitos. Un nodo que coincide con una semilla manual
    (la misma esquina de la plaza) se omite para no ajustar dos veces el mismo cruce.
    Devuelve (anclas, ids omitidos)."""
    semillas = np.array(semillas_px, float).reshape(-1, 2)
    anclas, omitidos = [], []
    for n in nodos:
        if len(semillas) and np.min(np.hypot(*(semillas - n['original']).T)) < TOLERANCIA_SEMILLA_PX:
            omitidos.append(n['id'])
        else:
            anclas.append(_ancla_de_nodo(n))
    return anclas + [_ancla_de_hito(h) for h in hitos], omitidos


def _repetidos(nodos, clave, etiqueta):
    grupos = defaultdict(list)
    for n in nodos:
        grupos[clave(n)].append(n['id'])
    return [f"{etiqueta} {k}: {', '.join(ids)}" for k, ids in grupos.items() if len(ids) > 1]


def _giro(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def validar_nodos(nodos):
    """Errores de las parejas por identidad: una esquina de 1936 o un índice usados dos veces, y
    triángulos de cruces vecinos cuyo giro cambia entre el original y 1936 (orden de calles distinto).
    Los dos son imágenes con y hacia abajo y el plano viejo está girado, no espejado: el giro de cada
    triángulo debe tener el mismo signo en los dos."""
    errores = _repetidos(nodos, lambda n: n['esquina_1936'], 'esquina 1936')
    errores += _repetidos(nodos, lambda n: repr(list(n['indice'])), 'índice')
    por_indice = {tuple(n['indice']): n for n in nodos}
    for (i, j), n in sorted(por_indice.items()):
        # los cuatro pares de vecinos perpendiculares: en el borde puede faltar cualquiera
        for otros in (((i + 1, j), (i, j + 1)), ((i, j + 1), (i - 1, j)),
                      ((i - 1, j), (i, j - 1)), ((i, j - 1), (i + 1, j))):
            if not all(k in por_indice for k in otros):
                continue
            tri = [n] + [por_indice[k] for k in otros]
            giro_o = _giro(*[t['original'] for t in tri])
            giro_m = _giro(*[t['mosaico_identidad'] for t in tri])
            if giro_o * giro_m <= 0:
                errores.append(f"orden de calles distinto en {', '.join(t['id'] for t in tri)}")
    return errores


def celdas_plegadas(proyectar, marco, paso=PASO_PLIEGUES_PX):
    """Celdas de una grilla sobre el marco del original [x0, y0, x1, y1] donde la proyección pierde
    el giro (jacobiano ≤ 0) en alguna de sus cuatro esquinas: ahí el calce dobla el plano sobre sí mismo.
    Los triángulos de las cuatro esquinas cubren las dos diagonales; en una celda bilineal, si los cuatro
    conservan el giro, el jacobiano es positivo en toda la celda."""
    x0, y0, x1, y1 = marco
    xx, yy = np.meshgrid(np.arange(x0, x1 + paso, paso, dtype=float), np.arange(y0, y1 + paso, paso, dtype=float))
    p = np.stack([np.asarray(v, float).reshape(xx.shape) for v in proyectar(xx.ravel(), yy.ravel())], axis=-1)
    sup_izq, sup_der, inf_izq, inf_der = p[:-1, :-1], p[:-1, 1:], p[1:, :-1], p[1:, 1:]

    def giro(a, b, c):
        return (b[..., 0] - a[..., 0]) * (c[..., 1] - a[..., 1]) - (b[..., 1] - a[..., 1]) * (c[..., 0] - a[..., 0])
    # el triángulo de cada esquina con sus dos vecinas, con el mismo sentido que en una proyección afín directa
    plegada = ((giro(sup_izq, sup_der, inf_izq) <= 0) | (giro(sup_der, inf_der, sup_izq) <= 0) |
               (giro(inf_der, inf_izq, sup_der) <= 0) | (giro(inf_izq, sup_izq, inf_der) <= 0))
    return int(np.count_nonzero(plegada))


def distancia_a_nudo_px(mascara, punto):
    """Distancia en px de `punto` (x, y en la máscara) al nudo de calles más cercano: un píxel del esqueleto de
    la máscara con tres o más vecinos, donde se juntan calles. None si en la máscara no hay ningún nudo."""
    import cv2
    from skimage.morphology import skeletonize
    cerrada = cv2.morphologyEx((np.asarray(mascara) > 0).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    esqueleto = skeletonize(cerrada > 0)
    vecinos = cv2.filter2D(esqueleto.astype(np.uint8), -1, np.ones((3, 3), np.uint8)) - esqueleto.astype(np.uint8)
    ys, xs = np.nonzero(esqueleto & (vecinos >= 3))
    if not len(xs):
        return None
    return float(np.min(np.hypot(xs - punto[0], ys - punto[1])))


def excluir_rotulos(nodos, esquinas, distancia_m, umbral_m=UMBRAL_NUDO_M):
    """Separa los nodos cuya esquina de 1936 no tiene cota y no cae sobre un nudo de calle (`distancia_m`: por id,
    None si no hay nudo cerca): ese punto marca el rótulo con el nombre de la esquina, no el cruce, y no sirve de
    ancla. Una esquina con cota se leyó en la cota impresa del cruce y se conserva.
    Devuelve (conservados, excluidos con la esquina, su nombre y la distancia al nudo)."""
    conservados, excluidos = [], []
    for n in nodos:
        esquina = esquinas[n['esquina_1936']]
        d = distancia_m.get(n['id'])
        if esquina.get('cota_m') is None and (d is None or d > umbral_m):
            excluidos.append({'id': n['id'], 'esquina_1936': n['esquina_1936'], 'nombre': esquina.get('nombre'),
                              'distancia_nudo_m': d})
        else:
            conservados.append(n)
    return conservados, excluidos


def resumen_por_sector(anclas, loo_m, residuo_m, umbral_m=UMBRAL_SECTOR_M):
    """Por sector: anclas, mediana y máximo del error dejando uno fuera y mediana del residuo."""
    grupos = defaultdict(lambda: ([], []))
    for a, e, r in zip(anclas, loo_m, residuo_m):
        grupos[a['sector']][0].append(e)
        grupos[a['sector']][1].append(r)
    filas = []
    for sector, (loo, res) in sorted(grupos.items()):
        mediana = round(float(np.median(loo)), 2)
        filas.append({'sector': sector, 'anclas': len(loo), 'mediana_loo_m': mediana,
                      'max_loo_m': round(float(np.max(loo)), 2),
                      'mediana_residuo_m': round(float(np.median(res)), 2), 'bajo_umbral': mediana < umbral_m})
    return filas


# --- programa -------------------------------------------------------------------------------

def _escalar(calce):
    def proyectar(x, y):
        return calce.a_1936(np.atleast_1d(np.asarray(x, float)), np.atleast_1d(np.asarray(y, float)))
    return proyectar


def informe(controles, config, anclas, omitidos, calce, metro, hitos_en_semillas=(), excluidos=()):
    n_semillas = len(config['semillas'])
    loo = calce.errores_loo_m()
    px = np.array([[a['px'], a['py']] for a in anclas])
    x36, y36 = calce.a_1936(px[:, 0], px[:, 1])
    residuo = np.hypot(x36 - [a['x36'] for a in anclas], y36 - [a['y36'] for a in anclas]) * metro
    loo_anclas = loo[n_semillas:]
    desvio_tps = {n['id']: n['desvio_m'] for n in controles['nodos']}
    desvio_tps.update({h['id']: h['desvio_tps_m'] for h in controles['controles_por_hito']})
    return {
        'alcance': 'Calce de 1772 por identidad (T33j.2a). El error dejando uno fuera mide cuánto se aparta cada '
                   'ancla del TPS ajustado sin ella; no certifica exactitud geográfica.',
        'suavizado': config.get('suavizado', 0.0), 'semillas': n_semillas, 'anclas': len(anclas),
        'nodos_omitidos_por_semilla': omitidos,
        'hitos_cubiertos_por_semillas': list(hitos_en_semillas),
        'excluidos_por_rotulo': list(excluidos),
        'residuos_loo_m': calce.residuos_m(),
        'por_sector': resumen_por_sector(anclas, loo_anclas, residuo),
        'celdas_plegadas': celdas_plegadas(_escalar(calce), config['marco']),
        'anclas_detalle': [{'id': a['id'], 'sector': a['sector'], 'loo_m': round(float(e), 2),
                            'residuo_m': round(float(r), 2), 'desvio_tps_anterior_m': desvio_tps.get(a['id'])}
                           for a, e, r in zip(anclas, loo_anclas, residuo)],
    }


def _distancias_a_nudo(nodos, esquinas, ruta_clases, clases_calle, metro, ventana=VENTANA_NUDO_PX):
    """Distancia en metros al nudo de calles más cercano, solo para los nodos cuya esquina no tiene cota."""
    import cv2
    clases = cv2.imread(str(ruta_clases), cv2.IMREAD_UNCHANGED)
    if clases is None:
        raise SystemExit(f'{ruta_clases}: no se pudo leer la segmentación de 1936 (¿--datos?)')
    distancias = {}
    for n in nodos:
        if esquinas[n['esquina_1936']].get('cota_m') is not None:
            continue
        x, y = (int(round(v)) for v in n['mosaico_identidad'])
        x0, y0 = max(0, x - ventana), max(0, y - ventana)
        recorte = np.isin(clases[y0:y + ventana, x0:x + ventana], clases_calle)
        d = distancia_a_nudo_px(recorte, (n['mosaico_identidad'][0] - x0, n['mosaico_identidad'][1] - y0))
        distancias[n['id']] = None if d is None else round(d * metro, 2)
    return distancias


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--controles', type=Path, required=True)
    ap.add_argument('--gcp', type=Path, required=True)
    ap.add_argument('--informe', type=Path, required=True)
    ap.add_argument('--esquinas', type=Path, default=RAIZ / 'tools/geo/esquinas/1936-esquinas.json')
    ap.add_argument('--datos', type=Path, default=RAIZ, help='checkout con fuentes/derivados (la segmentación de 1936)')
    a = ap.parse_args()
    controles = json.loads(a.controles.read_text(encoding='utf-8'))
    errores = validar_nodos(controles['nodos'])
    if errores:
        raise SystemExit('parejas por identidad inválidas:\n  ' + '\n  '.join(errores))
    config = json.loads(a.gcp.read_text(encoding='utf-8'))
    hitos = [h for h in controles['controles_por_hito'] if h.get('unidad')]
    esquinas = dict(enumerate(json.loads(a.esquinas.read_text(encoding='utf-8'))))
    config_1936 = json.loads((GCP_DIR / 'plaza-1936.json').read_text())
    nodos, excluidos = excluir_rotulos(controles['nodos'], esquinas,
                                       _distancias_a_nudo(controles['nodos'], esquinas, a.datos / config_1936['clases'],
                                                          config_1936['clases_calle'], controles['parametros']['metro']))
    anclas, omitidos = anclas_de_identidad(nodos, hitos, [(s['px'], s['py']) for s in config['semillas']])
    config = {**config, 'etapas': [], 'anclas': [{k: a[k] for k in ('px', 'py', 'x36', 'y36', 'id', 'nota')} for a in anclas]}
    metro = controles['parametros']['metro']
    gcps = manuales_de(config, json.loads((GCP_DIR / 'plaza-1936.json').read_text()))
    calce = Calce.ajustar(gcps, metro, config.get('suavizado', 0.0))
    # los hitos sin unidad (la Plaza Mayor) no son anclas propias: los cubren las semillas de la plaza
    en_semillas = [h['id'] for h in controles['controles_por_hito'] if not h.get('unidad')]
    datos = informe(controles, config, anclas, omitidos, calce, metro, en_semillas, excluidos)
    a.gcp.write_text(json_legible(config), encoding='utf-8')
    a.informe.write_text(json.dumps(datos, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{len(anclas)} anclas ({len(omitidos)} nodos omitidos por semilla, {len(excluidos)} por rótulo); LOO {datos['residuos_loo_m']}; "
          f"plegadas {datos['celdas_plegadas']}")
    for s in datos['por_sector']:
        print(f"  {s['sector']}: {s['anclas']} anclas, mediana LOO {s['mediana_loo_m']} m, máx {s['max_loo_m']} m")


if __name__ == '__main__':
    main()
