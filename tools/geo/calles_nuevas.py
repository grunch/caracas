"""Las calles nuevas: lo abierto en el plano de 1936 (calles, pasajes, plazas) que el plano de 1772 no tiene.

En 1936 algunas cuadras del centro están partidas por calles, pasajes o plazas que se abrieron después de
1772. Si la cuadra modelo (tools/geo/cuadra.py) se arma con las manzanas de 1936, en 1772 se ven cuadras
partidas, con casas que miran a una calle que todavía no existe. Aquí se marcan esas calles.

El calce del plano de 1772 (tools/geo/calce.py) deja todavía un resto de hasta 20 o 30 m en algunas zonas.
Primero se mide ese resto donde se lo puede medir (`corrimiento_local`: en una malla, el corrimiento que
mejor lleva las calles de 1772 a las de 1936, con tools/geo/calce_correlacion.py) y se corrige el plano
viejo. Después, un píxel de lo abierto en 1936 es nuevo si cae sobre lo que 1772 edifica y a más de
DISTANCIA_M de toda calle de 1772: una calle corrida queda cerca de la suya; una abierta a través de una
manzana, lejos de todas.

`grupos_de_manzanas` junta las cuadras que une una calle nueva: antes de que se abra, son una sola
(tools/geo/vectorizar.py arma las dos versiones; tools/geo/epocas.py decide cuándo se abre).

Uso: calles_nuevas.py <clases.png> <salida.png> --escala <m/px>   (lee el plano de 1772 calzado)
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

DISTANCIA_M = 12.0        # el plano viejo no dibuja ninguna calle a menos de esto (ya corregido el calce)
AREA_MINIMA_M2 = 80.0     # menos que esto es un pedazo suelto
PASO_M, VENTANA_M, BUSQUEDA_M = 60.0, 70.0, 28.0   # la malla del corrimiento local (la búsqueda, menos de media cuadra)
CALIDAD_MINIMA = 0.3      # correlación mínima para creer un corrimiento
SUAVIZADO_PX = 1.5
CALLE = 1                 # tools/geo/vectorizar.py: CLASE['calle']
# las calles del plano de 1772: claras y sin color (entre el rojo de lo edificado y el amarillo de los solares)
CLARO_MINIMO, COLOR_MAXIMO = 200, 14


def calles_nuevas(calles36, edificado_viejo, calles_viejas, metro):
    """Máscara de lo abierto en 1936 (`calles36`) que el plano viejo no tiene: cae sobre lo que él edifica y
    a más de DISTANCIA_M de todas sus calles. Las tres máscaras, ya en el mismo marco."""
    calles36 = np.asarray(calles36, bool)
    calles_viejas = np.asarray(calles_viejas, bool)
    if not calles36.any() or not calles_viejas.any():
        return np.zeros(calles36.shape, bool)
    lejos = cv2.distanceTransform((~calles_viejas).astype(np.uint8), cv2.DIST_L2, 5) * metro
    nuevas = calles36 & np.asarray(edificado_viejo, bool) & (lejos >= DISTANCIA_M)
    etiquetas, n = ndimage.label(nuevas)
    if not n:
        return nuevas
    grandes = np.bincount(etiquetas.ravel()) * metro ** 2 >= AREA_MINIMA_M2
    grandes[0] = False
    return grandes[etiquetas]


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


def grupos_de_manzanas(manzanas, nuevas):
    """Las cuadras (etiquetas > 0) que unen las calles nuevas: [{manzanas: {etiquetas}, caja: (y0, y1, x0, x1),
    calles: máscara de sus calles nuevas dentro de la caja}]. Un grupo puede tener una sola cuadra: un pasaje
    o una plaza abiertos dentro de ella."""
    etiquetas, n = ndimage.label(nuevas)
    if not n:
        return []
    padre = {}

    def raiz(a):
        while padre.setdefault(a, a) != a:
            a = padre[a]
        return a

    tramos = []
    for k, zona in enumerate(ndimage.find_objects(etiquetas), start=1):
        y0, y1 = max(0, zona[0].start - 3), zona[0].stop + 3
        x0, x1 = max(0, zona[1].start - 3), zona[1].stop + 3
        suyo = ndimage.binary_dilation(etiquetas[y0:y1, x0:x1] == k, iterations=2)
        vecinas = sorted(int(v) for v in set(np.unique(manzanas[y0:y1, x0:x1][suyo])) - {0})
        if not vecinas:
            continue
        for otra in vecinas[1:]:
            padre[raiz(otra)] = raiz(vecinas[0])
        raiz(vecinas[0])
        tramos.append((vecinas[0], k, zona))
    juntas = {}
    for primera, k, zona in tramos:
        juntas.setdefault(raiz(primera), []).append((k, zona))
    grupos = []
    for r, del_grupo in juntas.items():
        y0, y1 = min(z[0].start for _, z in del_grupo), max(z[0].stop for _, z in del_grupo)
        x0, x1 = min(z[1].start for _, z in del_grupo), max(z[1].stop for _, z in del_grupo)
        calles = np.isin(etiquetas[y0:y1, x0:x1], [k for k, _ in del_grupo])
        grupos.append({'manzanas': {m for m in padre if raiz(m) == r}, 'caja': (y0, y1, x0, x1), 'calles': calles})
    return grupos


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
    ap.add_argument('salida')
    ap.add_argument('--escala', type=float, required=True, help='metros por píxel del mosaico')
    ap.add_argument('--raiz', type=Path, default=Path.cwd())
    a = ap.parse_args()
    clases = cv2.imread(a.clases, cv2.IMREAD_UNCHANGED)
    if clases is None or clases.ndim != 2:
        raise SystemExit(f'{a.clases}: se esperaba una imagen de clases de un canal')
    import epocas as ep
    escala = json.loads((ep.AQUI / "epocas" / "epocas.json").read_text())["escala"]
    forma = (-(-clases.shape[0] // escala), -(-clases.shape[1] // escala))
    metro = a.escala * escala
    calles36 = cv2.resize((clases == CALLE).astype(np.uint8), (forma[1], forma[0]), interpolation=cv2.INTER_NEAREST) > 0
    edificado, calles = plano_de_1772(a.raiz.resolve(), forma, escala, a.escala)
    zona = cv2.dilate(edificado.astype(np.uint8), np.ones((81, 81), np.uint8)) > 0
    cx, cy = corrimiento_local(calles36, calles, zona, metro)
    nuevas = calles_nuevas(calles36, llevar(edificado, cx, cy), llevar(calles, cx, cy), metro)
    grande = cv2.resize(nuevas.astype(np.uint8), (forma[1] * escala, forma[0] * escala), interpolation=cv2.INTER_NEAREST)
    grande = grande[:clases.shape[0], :clases.shape[1]] & (clases == CALLE)
    if not cv2.imwrite(a.salida, grande * 255):
        raise SystemExit(f'no se pudo escribir {a.salida}')
    print(f'calles nuevas: {grande.sum() * a.escala ** 2:.0f} m² → {a.salida}')


if __name__ == '__main__':
    main()
