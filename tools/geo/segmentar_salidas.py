"""Salidas de la segmentación: suelo.png (R agua · G patio · B edificado), debug.jpg, JSON."""
from __future__ import annotations

import json
import os
from pathlib import Path

import cv2
import numpy as np

from segmentar_clases import (
    AGUA, COLORES_DEBUG, EDIFICADO, EDIFICIO_PUBLICO, N_CLASES, NOMBRES, PATIO, VERDE,
)

# Las imágenes del mosaico superan el tope por omisión de OpenCV (2^30 píxeles).
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

LADO_DEBUG_MAX = 6000


def suelo_desde_clases(clases: np.ndarray) -> np.ndarray:
    """Máscara RGB del proyecto: R agua · G patio (y verde) · B edificado (y público)."""
    suelo = np.zeros(clases.shape + (3,), np.uint8)
    suelo[..., 0] = np.where(clases == AGUA, 255, 0)
    suelo[..., 1] = np.where(np.isin(clases, (PATIO, VERDE)), 255, 0)
    suelo[..., 2] = np.where(np.isin(clases, (EDIFICADO, EDIFICIO_PUBLICO)), 255, 0)
    return suelo


def colorear(clases: np.ndarray) -> np.ndarray:
    tabla = np.zeros((256, 3), np.uint8)
    for c, rgb in COLORES_DEBUG.items():
        tabla[c] = rgb
    return tabla[clases]


def vista_debug(rgb: np.ndarray, clases: np.ndarray, arboles: list[dict]) -> np.ndarray:
    """Original | clases coloreadas (con círculos en los árboles), reducido si es muy grande."""
    color = colorear(clases)
    for a in arboles:
        cv2.circle(color, (int(round(a["x"])), int(round(a["y"]))), max(1, int(round(a["r"]))), (0, 90, 0), 1)
    lado = np.hstack([rgb, color])
    f = min(1.0, LADO_DEBUG_MAX / max(lado.shape[:2]))
    if f < 1.0:
        lado = cv2.resize(lado, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    return lado


def _escribir_imagen(ruta: Path, img: np.ndarray, params: list[int] | None = None) -> None:
    datos = img if img.ndim == 2 else cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
    if not cv2.imwrite(str(ruta), datos, params or []):
        raise OSError(f"no se pudo escribir {ruta}")


def resumen(clases: np.ndarray) -> dict:
    cuenta = np.bincount(clases.ravel(), minlength=N_CLASES)
    total = max(1, clases.size)
    return {NOMBRES[c]: round(float(cuenta[c]) / total, 4) for c in range(N_CLASES)}


def escribir_salidas(dir_salida: Path, rgb: np.ndarray, clases: np.ndarray, arboles: list[dict],
                     meta: dict) -> None:
    dir_salida.mkdir(parents=True, exist_ok=True)
    _escribir_imagen(dir_salida / "clases.png", clases)
    _escribir_imagen(dir_salida / "suelo.png", suelo_desde_clases(clases))
    (dir_salida / "arboles.json").write_text(json.dumps(arboles, ensure_ascii=False), encoding="utf-8")
    _escribir_imagen(dir_salida / "debug.jpg", vista_debug(rgb, clases, arboles), [cv2.IMWRITE_JPEG_QUALITY, 85])
    meta_completo = {**meta, "fracciones": resumen(clases), "arboles": len(arboles),
                     "codigos": {str(k): v for k, v in NOMBRES.items()}}
    (dir_salida / "meta.json").write_text(json.dumps(meta_completo, ensure_ascii=False, indent=2), encoding="utf-8")
