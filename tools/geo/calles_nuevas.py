"""Las calles nuevas: qué tramos de la red de calles estaban en 1936 y cuáles se abrieron después de 1772.

En 1936 algunas cuadras del centro están partidas por calles, pasajes o plazas que se abrieron después de
1772. Si la cuadra modelo (tools/geo/cuadra.py) se arma con las manzanas de 1936, en 1772 se ven cuadras
partidas, con casas que miran a una calle que todavía no existe.

Este paso clasifica la red de calles de hoy (OpenStreetMap), partida en tramos de esquina a esquina, contra
los dos planos (tools/geo/caras.py): un tramo estaba en 1936 si su eje cae sobre calle de ese plano, y es
nuevo desde 1772 si además cae sobre lo que 1772 edifica, lejos de todas sus calles. El calce del plano de
1772 (tools/geo/calce.py) deja todavía un resto de hasta 20 o 30 m en algunas zonas: antes de comparar se
mide ese resto donde se lo puede medir (`corrimiento_local`: en una malla, el corrimiento que mejor lleva
las calles de 1772 a las de 1936, con tools/geo/calce_correlacion.py) y se corrige el plano viejo (`llevar`).

Salidas: los tramos clasificados (JSON) y lo edificado de 1772 ya corregido (PNG, en píxeles del mosaico).
Con ellos tools/geo/vectorizar.py arma las cuadras de cada época por las caras de la red.

Uso: calles_nuevas.py <clases.png> <tramos.json> --osm <osm.json> --edificado <edificado-1772.png> --escala <m/px>
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))

from calce_correlacion import corrimiento  # noqa: E402

PASO_M, VENTANA_M, BUSQUEDA_M = 60.0, 70.0, 28.0   # la malla del corrimiento local (la búsqueda, menos de media cuadra)
CALIDAD_MINIMA = 0.3      # correlación mínima para creer un corrimiento
SUAVIZADO_PX = 1.5
CALLE = 1                 # tools/geo/vectorizar.py: CLASE['calle']
# las calles del plano de 1772: claras y sin color (entre el rojo de lo edificado y el amarillo de los solares)
CLARO_MINIMO, COLOR_MAXIMO = 200, 14


def corrimiento_local(calles36, calles_viejas, zona, metro):
    """(cx, cy): en cada píxel, cuánto hay que correr el plano viejo para que sus calles caigan sobre las de
    1936. Se mide en una malla cada PASO_M dentro de `zona`; donde no se puede, vale el punto vecino."""
    base = cv2.GaussianBlur(np.asarray(calles36, np.float32), (0, 0), SUAVIZADO_PX)
    movil = cv2.GaussianBlur(np.asarray(calles_viejas, np.float32), (0, 0), SUAVIZADO_PX)
    paso, ventana, busqueda = (int(round(m / metro)) for m in (PASO_M, VENTANA_M, BUSQUEDA_M))
    ys, xs = np.mgrid[paso // 2:base.shape[0]:paso, paso // 2:base.shape[1]:paso]
    dx, dy = np.full(xs.shape, np.nan), np.full(xs.shape, np.nan)
    for i, j in zip(*np.nonzero(np.asarray(zona, bool)[ys, xs])):
        d, calidad = corrimiento(base, movil, (xs[i, j], ys[i, j]), ventana, busqueda)
        if d is not None and calidad >= CALIDAD_MINIMA:
            dx[i, j], dy[i, j] = d
    medidos = np.isfinite(dx)
    if not medidos.any():
        return np.zeros(base.shape, np.float32), np.zeros(base.shape, np.float32)
    _, (iy, ix) = ndimage.distance_transform_edt(~medidos, return_indices=True)
    dx, dy = ndimage.median_filter(dx[iy, ix], 3), ndimage.median_filter(dy[iy, ix], 3)
    alto, ancho = base.shape
    return tuple(cv2.resize(d.astype(np.float32), (ancho, alto), interpolation=cv2.INTER_LINEAR) for d in (dx, dy))


def llevar(mascara, cx, cy):
    """La máscara del plano viejo corrida por (cx, cy): el contenido en p va a p + (cx, cy)."""
    alto, ancho = np.asarray(mascara).shape
    gx, gy = np.meshgrid(np.arange(ancho, dtype=np.float32), np.arange(alto, dtype=np.float32))
    return cv2.remap(np.asarray(mascara).astype(np.uint8), gx - cx, gy - cy, cv2.INTER_NEAREST) > 0


def plano_de_1772(raiz, forma, escala, metro):
    """(edificado, calles) del plano de 1772 calzado, en la grilla reducida (`escala` píxeles del mosaico por
    celda). Lo edificado, sin la holgura de la línea de tiempo (tools/geo/epocas.py); las calles, lo claro y
    sin color dentro de la hoja."""
    import tifffile
    import epocas as ep
    config = json.loads((ep.AQUI / "epocas" / "epocas.json").read_text())
    epoca = {**next(e for e in config["epocas"] if e["año"] == 1772), "holgura_m": 0}
    edificado = ep.construido_de_epoca(raiz, epoca, forma, escala, metro)
    carpeta = raiz / "fuentes/derivados/1772"
    meta = json.loads((carpeta / "calzado.json").read_text())
    x0, y0 = (int(c) for c in meta["recorte"][:2])
    rgba, (cx0, cy0) = ep.reducir_recorte(tifffile.imread(carpeta / "calzado.tif"), x0, y0, escala)
    lab = cv2.cvtColor(np.ascontiguousarray(rgba[..., :3]), cv2.COLOR_RGB2LAB).astype(np.int16)
    claras = ((lab[..., 0] >= CLARO_MINIMO) & (np.abs(lab[..., 1] - 128) <= COLOR_MAXIMO)
              & (np.abs(lab[..., 2] - 128) <= COLOR_MAXIMO) & (rgba[..., 3] >= 128))
    calles = ep.en_marco(claras, (cx0, cy0, cx0 + claras.shape[1], cy0 + claras.shape[0]), forma)
    return edificado, calles & ~edificado


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('clases')
    ap.add_argument('salida', help='JSON de los tramos clasificados')
    ap.add_argument('--osm', required=True, help='la respuesta de Overpass guardada (tools/geo/hoy_osm.py)')
    ap.add_argument('--edificado', required=True, help='PNG donde dejar lo edificado de 1772 ya corregido')
    ap.add_argument('--escala', type=float, required=True, help='metros por píxel del mosaico')
    ap.add_argument('--raiz', type=Path, default=Path.cwd())
    a = ap.parse_args()
    clases = cv2.imread(a.clases, cv2.IMREAD_UNCHANGED)
    if clases is None or clases.ndim != 2:
        raise SystemExit(f'{a.clases}: se esperaba una imagen de clases de un canal')
    import epocas as ep
    import geo1936
    import hoy_osm
    from caras import clasificar, tramos_de
    elementos = hoy_osm.elementos(json.loads(Path(a.osm).read_text(encoding='utf-8')), geo1936.cargar())
    tramos = tramos_de([linea for el in elementos if el['capa'] == 'calle' and not el['area'] for linea in el['lineas']])
    escala = json.loads((ep.AQUI / "epocas" / "epocas.json").read_text())["escala"]
    forma = (-(-clases.shape[0] // escala), -(-clases.shape[1] // escala))
    metro = a.escala * escala
    calles36 = cv2.resize((clases == CALLE).astype(np.uint8), (forma[1], forma[0]), interpolation=cv2.INTER_NEAREST) > 0
    edificado, calles = plano_de_1772(a.raiz.resolve(), forma, escala, a.escala)
    zona = cv2.dilate(edificado.astype(np.uint8), np.ones((81, 81), np.uint8)) > 0
    cx, cy = corrimiento_local(calles36, calles, zona, metro)
    edificado, calles = llevar(edificado, cx, cy), llevar(calles, cx, cy)
    lejos = cv2.distanceTransform((~calles).astype(np.uint8), cv2.DIST_L2, 5) * metro
    clasificados = clasificar(tramos, calles36, metro, edificado72=edificado, lejos72_m=lejos, escala=escala)
    Path(a.salida).write_text(json.dumps({'tramos': clasificados}))
    grande = cv2.resize(edificado.astype(np.uint8), (forma[1] * escala, forma[0] * escala), interpolation=cv2.INTER_NEAREST)
    if not cv2.imwrite(a.edificado, grande[:clases.shape[0], :clases.shape[1]] * 255):
        raise SystemExit(f'no se pudo escribir {a.edificado}')
    de_1936 = [t for t in clasificados if t['en1936']]
    print(f"{len(clasificados)} tramos: {len(de_1936)} estaban en 1936, {sum(t['nueva'] for t in de_1936)} nuevos desde 1772 → {a.salida}")


if __name__ == '__main__':
    main()
