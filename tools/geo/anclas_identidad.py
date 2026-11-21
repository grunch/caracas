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
    if str(n['esquina_1936']).startswith('topología'):
        return {'px': float(n['original'][0]), 'py': float(n['original'][1]),
                'x36': float(n['mosaico_identidad'][0]), 'y36': float(n['mosaico_identidad'][1]), 'id': n['id'],
                'sector': n['sector'], 'nota': f"identidad de damero [{i}, {j}] desde Las Monjas: corte de su fila y su "
                                               f"columna en 1936, revisado a ojo (anclas-topologia.json)"}
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


RADIO_TOPOLOGIA = 3  # cruces vecinos (en calles) que sirven para trazar la fila, la columna y el paso local


def _paso_local(conocidos, i, j, eje, radio=RADIO_TOPOLOGIA):
    """Dirección local de las filas (eje 0, i → i+1) o columnas (eje 1, j → j+1) de 1936 cerca de (i, j)."""
    pasos = [conocidos[(a + 1, b) if eje == 0 else (a, b + 1)] - p for (a, b), p in conocidos.items()
             if abs(a - i) <= radio and abs(b - j) <= radio and ((a + 1, b) if eje == 0 else (a, b + 1)) in conocidos]
    if len(pasos) < 2:
        return None
    d = np.median(pasos, axis=0)
    return d / np.linalg.norm(d)


def _recta(conocidos, i, j, eje, radio=RADIO_TOPOLOGIA):
    """La fila j (eje 0) o la columna i (eje 1) de 1936: su cruce conocido más cercano y la dirección local."""
    en_linea = [(abs(a - i), p) for (a, b), p in conocidos.items() if eje == 0 and b == j and 0 < abs(a - i) <= radio]
    en_linea += [(abs(b - j), p) for (a, b), p in conocidos.items() if eje == 1 and a == i and 0 < abs(b - j) <= radio]
    d = _paso_local(conocidos, i, j, eje, radio)
    if not en_linea or d is None:
        return None
    return min(en_linea, key=lambda t: t[0])[1], d


def cruce_por_topologia(conocidos, indice):
    """Pareja en 1936 de un cruce de 1772 sin esquina con nombre, solo con la topología del damero de 1936: el corte
    de su fila (los cruces conocidos con el mismo j) con su columna (los del mismo i). `conocidos`: {(i, j): punto
    en px del mosaico} de cruces ya identificados. No usa el calce. None si falta la fila o la columna."""
    i, j = indice
    conocidos = {k: np.asarray(v, float) for k, v in conocidos.items()}
    fila, columna = _recta(conocidos, i, j, 0), _recta(conocidos, i, j, 1)
    if fila is None or columna is None:
        return None
    (p, u), (q, v) = fila, columna
    t = np.linalg.solve(np.array([u, -v]).T, q - p)
    return p + t[0] * u


def nodos_por_topologia(aceptados, cruces, conocidos):
    """Nodos de identidad de los cruces de 1772 `aceptados` (sus id, revisados a ojo en anclas-topologia.json), con
    la pareja de cruce_por_topologia. `cruces`: los de damero.cruces_1772. Un aceptado sin pareja es un error."""
    por_id = {c['id']: c for c in cruces}
    nodos = []
    for ident in aceptados:
        c = por_id[ident]
        punto = cruce_por_topologia(conocidos, tuple(c['indice']))
        if punto is None:
            raise ValueError(f'{ident}: sin fila o columna conocida en 1936')
        i, j = c['indice']
        nodos.append({'id': ident, 'sector': c['sector'], 'original': [float(v) for v in c['original']],
                      'indice': [i, j], 'esquina_1936': f'topología [{i}, {j}]', 'esquina_1936_nombre': None,
                      'mosaico_identidad': [round(float(v), 2) for v in punto]})
    return nodos


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


def _cruces_1772():
    from controles_damero import AUD
    from damero import cruces_1772
    trazado = json.loads((AUD / 'trazado-calles-original.json').read_text(encoding='utf-8'))
    return cruces_1772(trazado['lineas'], json.loads((AUD / 'sectores.json').read_text(encoding='utf-8'))['sectores'])


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
    ap.add_argument('--topologia', type=Path, default=RAIZ / 'specs/auditoria-1772/anclas-topologia.json')
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
    topologia = json.loads(a.topologia.read_text(encoding='utf-8')) if a.topologia.exists() else {'aceptados': []}
    nuevos = nodos_por_topologia([x['id'] for x in topologia['aceptados']], _cruces_1772(),
                                 {tuple(n['indice']): np.array(n['mosaico_identidad'], float) for n in nodos})
    errores = validar_nodos(nodos + nuevos)
    if errores:
        raise SystemExit('parejas por topología inválidas:\n  ' + '\n  '.join(errores))
    nodos = nodos + nuevos
    anclas, omitidos = anclas_de_identidad(nodos, hitos, [(s['px'], s['py']) for s in config['semillas']])
    config = {**config, 'etapas': [], 'anclas': [{k: a[k] for k in ('px', 'py', 'x36', 'y36', 'id', 'nota')} for a in anclas]}
    metro = controles['parametros']['metro']
    gcps = manuales_de(config, json.loads((GCP_DIR / 'plaza-1936.json').read_text()))
    calce = Calce.ajustar(gcps, metro, config.get('suavizado', 0.0))
    # los hitos sin unidad (la Plaza Mayor) no son anclas propias: los cubren las semillas de la plaza
    en_semillas = [h['id'] for h in controles['controles_por_hito'] if not h.get('unidad')]
    datos = informe(controles, config, anclas, omitidos, calce, metro, en_semillas, excluidos)
    datos['anclas_por_topologia'] = [{k: n[k] for k in ('id', 'sector', 'indice', 'original', 'mosaico_identidad')} for n in nuevos]
    a.gcp.write_text(json_legible(config), encoding='utf-8')
    a.informe.write_text(json.dumps(datos, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{len(anclas)} anclas ({len(omitidos)} nodos omitidos por semilla, {len(excluidos)} por rótulo); LOO {datos['residuos_loo_m']}; "
          f"plegadas {datos['celdas_plegadas']}")
    for s in datos['por_sector']:
        print(f"  {s['sector']}: {s['anclas']} anclas, mediana LOO {s['mediana_loo_m']} m, máx {s['max_loo_m']} m")


if __name__ == '__main__':
    main()
