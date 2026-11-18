"""Control de «lo de hoy»: recorte del centro del plano de 1936 con OSM en rojo y desfase medido.

El desfase se mide por correlación de fase entre las calles de OSM (canal R, rasterizado a 1:1) y las
calles de la segmentación de 1936 (clase CALLE) en una ventana alrededor de la Plaza Bolívar: la
cuadrícula colonial no cambió, así que tienen que calzar.
"""
import json
from pathlib import Path

import cv2
import numpy as np
import tifffile

import hoy
from segmentar_clases import CALLE

ROJO = np.array([220, 30, 30], np.float32)
VENTANA_QA_PX = (1800, 2400)  # alto, ancho a 0,5 m/px: 900 m × 1200 m
VENTANA_DESFASE_PX = (3000, 4000)
DESFASE_MAX_PX = 60  # 30 m


def _subpixel(r, i, j):
    """Vértice de la parábola por tres puntos alrededor del máximo, en cada eje."""
    def ajuste(m, c, p):
        d = m - 2 * c + p
        return 0.0 if d == 0 else 0.5 * (m - p) / d
    fy = ajuste(r[i - 1, j], r[i, j], r[i + 1, j]) if 0 < i < r.shape[0] - 1 else 0.0
    fx = ajuste(r[i, j - 1], r[i, j], r[i, j + 1]) if 0 < j < r.shape[1] - 1 else 0.0
    return fx, fy


def desfase(a, b, maximo_px=DESFASE_MAX_PX):
    """(dx, dy) en px tal que `b` ≈ `a` corrida (dx, dy), buscando solo hasta ±maximo_px; None sin señal.

    Correlación normalizada en una ventana chica: la cuadrícula es casi periódica (una cuadra ≈ 200 px)
    y una búsqueda global puede saltar a la cuadra de al lado.
    """
    m = maximo_px
    a = np.asarray(a, np.float32)
    b = np.asarray(b, np.float32)
    plantilla = np.ascontiguousarray(a[m:-m, m:-m])
    if np.ptp(plantilla) == 0 or np.ptp(b) == 0:
        return None  # una máscara vacía o pareja no dice nada del desfase
    r = cv2.matchTemplate(b, plantilla, cv2.TM_CCOEFF_NORMED)
    if not np.isfinite(r).all() or np.ptp(r) < 1e-6:
        return None
    i, j = np.unravel_index(int(np.argmax(r)), r.shape)
    fx, fy = _subpixel(r, i, j)
    return float(j - m + fx), float(i - m + fy)


def superponer(rgb, cobertura, opacidad=0.6):
    """Tiñe de rojo el fondo según la cobertura (0–255)."""
    k = (np.asarray(cobertura, np.float32) / 255.0 * opacidad)[..., None]
    return np.round(rgb.astype(np.float32) * (1 - k) + ROJO * k).astype(np.uint8)


def _ventana(centro, forma):
    alto, ancho = forma
    x0, y0 = int(round(centro[0] - ancho / 2)), int(round(centro[1] - alto / 2))
    return x0, y0, x0 + ancho, y0 + alto


def _escribir_jpg(ruta, rgb):
    if not cv2.imwrite(str(ruta), rgb[..., ::-1], [cv2.IMWRITE_JPEG_QUALITY, 88]):
        raise OSError(f"no se pudo escribir {ruta}")


def generar(elems, meta, ruta_tif, ruta_clases, salida):
    """Escribe la imagen de control y un JSON con el desfase (None si no hay calles para medirlo)."""
    plaza = meta["plaza"]
    x0, y0, x1, y1 = _ventana(plaza, VENTANA_DESFASE_PX)
    osm = hoy.rasterizar(elems, VENTANA_DESFASE_PX, VENTANA_DESFASE_PX, origen=(x0, y0))[..., 0]
    clases = cv2.imread(str(ruta_clases), cv2.IMREAD_UNCHANGED)
    calles_1936 = (clases[y0:y1, x0:x1] == CALLE).astype(np.float32)
    d = desfase(osm.astype(np.float32) / 255.0, calles_1936)
    metro = meta["metro"]
    informe = {"ventana_px": [x0, y0, x1, y1],
               "desfase_px": None if d is None else [round(d[0], 2), round(d[1], 2)],
               "desfase_m": None if d is None else [round(d[0] * metro, 2), round(d[1] * metro, 2)],
               "nota": "corrimiento de las calles de 1936 respecto de OSM (x al este, y al sur)"}
    qx0, qy0, qx1, qy1 = _ventana(plaza, VENTANA_QA_PX)
    plano = tifffile.imread(ruta_tif)[qy0:qy1, qx0:qx1]
    rojo = hoy.rasterizar(elems, VENTANA_QA_PX, VENTANA_QA_PX, origen=(qx0, qy0))
    cobertura = np.maximum.reduce([rojo[..., 0], rojo[..., 1], rojo[..., 2]])
    Path(salida).parent.mkdir(parents=True, exist_ok=True)
    gris = np.repeat(cv2.cvtColor(plano, cv2.COLOR_RGB2GRAY)[..., None], 3, axis=2)  # el rojo se distingue
    _escribir_jpg(salida, superponer(gris, cobertura, 0.5))
    Path(salida).with_suffix(".json").write_text(json.dumps(informe, indent=1) + "\n", encoding="utf-8")
    return informe
