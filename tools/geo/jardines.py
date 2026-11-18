"""Árboles de los jardines urbanos del plano de 1936: plazas y patios con canteros.

El plano dibuja los árboles sueltos con un símbolo (los detecta segmentar_arboles.py), pero los
canteros de las plazas (la Plaza Bolívar) y de los patios grandes van como manchas verdes lisas,
sin símbolo. Acá se los planta: manchas verdes (verde o cultivo) chicas y rodeadas de ciudad
(calle, patio, edificado; el contorno, que la segmentación lee como "cerro", no cuenta), con
puntos en una grilla con sacudida reproducible, adentro del cantero y lejos de los árboles ya
detectados. Los campos grandes y lo que queda en el cerro no son jardín.

Uso (desde la raíz del repo):
  python tools/geo/jardines.py <clases-costura.png> <arboles.json> <salida.json> [--metro 0.5]
Salida: [{x, y, r}] en píxeles del mosaico, como arboles.json.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

import cv2  # noqa: E402
import numpy as np  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

from segmentar_clases import (  # noqa: E402
    CALLE, CERRO, CULTIVO, DESCONOCIDO, EDIFICADO, EDIFICIO_PUBLICO, MARGEN, PATIO, VERDE,
)

AREA_M2 = (30.0, 3000.0)  # un cantero; más grande ya es un campo
ANILLO_M = 3.5  # cuánto se mira alrededor de la mancha
URBANO_MIN = 0.6  # parte del anillo (sin contar lo neutro) que tiene que ser ciudad
URBANO_ABS_MIN = 0.2  # y del anillo entero
PASO_M = 13.0  # separación media entre árboles plantados
MARGEN_M = 2.5  # distancia mínima al borde del cantero
LEJOS_DE_DETECTADO_M = 6.0
RADIO_M = (2.8, 4.0)
URBANAS = (CALLE, PATIO, EDIFICADO, EDIFICIO_PUBLICO)
NEUTRAS = (CERRO, MARGEN, DESCONOCIDO)


def _es_jardin(clases: np.ndarray, sub: np.ndarray, anillo_px: int) -> bool:
    lado = 2 * anillo_px + 1
    anillo = cv2.dilate(sub.astype(np.uint8), np.ones((lado, lado), np.uint8)).astype(bool) & ~sub
    alrededor = clases[anillo]
    urbano = np.isin(alrededor, URBANAS).sum()
    neutro = np.isin(alrededor, NEUTRAS).sum()
    return bool(urbano >= URBANO_ABS_MIN * alrededor.size and urbano >= URBANO_MIN * max(1, alrededor.size - neutro))


def mascara_jardines(clases: np.ndarray, metro: float) -> np.ndarray:
    """Los píxeles de las manchas verdes que son jardín de la ciudad."""
    verde = np.isin(clases, (VERDE, CULTIVO)).astype(np.uint8)
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(verde, connectivity=4)
    area_m2 = stats[:, cv2.CC_STAT_AREA] * metro * metro
    anillo_px = max(1, int(round(ANILLO_M / metro)))
    margen = anillo_px + 1
    alto, ancho = clases.shape
    es = np.zeros(n, bool)
    for k in range(1, n):
        if not AREA_M2[0] <= area_m2[k] <= AREA_M2[1]:
            continue
        x, y, w, h = stats[k, :4]
        x0, y0, x1, y1 = max(0, x - margen), max(0, y - margen), min(ancho, x + w + margen), min(alto, y + h + margen)
        es[k] = _es_jardin(clases[y0:y1, x0:x1], etiquetas[y0:y1, x0:x1] == k, anillo_px)
    return es[etiquetas] & verde.astype(bool)


def arboles_en(mascara: np.ndarray, metro: float, detectados: list[dict], semilla: int = 1936) -> list[dict]:
    """Un árbol por celda de una grilla de PASO_M, sacudido al azar, si cae bien adentro del cantero."""
    adentro = cv2.distanceTransform(mascara.astype(np.uint8), cv2.DIST_L2, 5) >= MARGEN_M / metro
    ocupado = np.zeros(mascara.shape, np.uint8)
    for a in detectados:
        cv2.circle(ocupado, (int(round(a["x"])), int(round(a["y"]))), int(np.ceil(LEJOS_DE_DETECTADO_M / metro)), 1, -1)
    rng = np.random.default_rng(semilla)
    paso = PASO_M / metro
    alto, ancho = mascara.shape
    filas, columnas = int(np.ceil(alto / paso)), int(np.ceil(ancho / paso))
    sacudida = rng.uniform(0, paso, (filas, columnas, 2))
    radios = rng.uniform(RADIO_M[0] / metro, RADIO_M[1] / metro, (filas, columnas))
    puntos = []
    for i, j in np.ndindex(filas, columnas):
        x, y = j * paso + sacudida[i, j, 0], i * paso + sacudida[i, j, 1]
        xi, yi = int(x), int(y)
        if xi < ancho and yi < alto and adentro[yi, xi] and not ocupado[yi, xi]:
            puntos.append({"x": round(float(x), 1), "y": round(float(y), 1), "r": round(float(radios[i, j]), 1)})
    return puntos


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("clases", type=Path)
    ap.add_argument("arboles", type=Path)
    ap.add_argument("salida", type=Path)
    ap.add_argument("--metro", type=float, default=0.5, help="metros por píxel del mosaico")
    a = ap.parse_args()
    clases = cv2.imread(str(a.clases), cv2.IMREAD_UNCHANGED)
    if clases is None:
        raise SystemExit(f"no se pudo leer {a.clases}")
    detectados = json.loads(a.arboles.read_text(encoding="utf-8"))
    puntos = arboles_en(mascara_jardines(clases, a.metro), a.metro, detectados)
    a.salida.write_text(json.dumps(puntos), encoding="utf-8")
    print(f"{len(puntos)} árboles de jardín → {a.salida}")


if __name__ == "__main__":
    main()
