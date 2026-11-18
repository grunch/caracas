"""Operaciones morfológicas sobre máscaras booleanas (todas devuelven arrays nuevos)."""
from __future__ import annotations

import cv2
import numpy as np


def disco(radio_px: int) -> np.ndarray:
    r = max(1, int(radio_px))
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def _u8(m: np.ndarray) -> np.ndarray:
    return m.astype(np.uint8)


def dilatar(m: np.ndarray, radio_px: int) -> np.ndarray:
    if radio_px <= 0:
        return m.copy()
    return cv2.dilate(_u8(m), disco(radio_px)).astype(bool)


def erosionar(m: np.ndarray, radio_px: int) -> np.ndarray:
    if radio_px <= 0:
        return m.copy()
    return cv2.erode(_u8(m), disco(radio_px), borderType=cv2.BORDER_REPLICATE).astype(bool)


def abrir(m: np.ndarray, radio_px: int) -> np.ndarray:
    if radio_px <= 0:
        return m.copy()
    return cv2.morphologyEx(_u8(m), cv2.MORPH_OPEN, disco(radio_px), borderType=cv2.BORDER_REPLICATE).astype(bool)


def cerrar(m: np.ndarray, radio_px: int) -> np.ndarray:
    if radio_px <= 0:
        return m.copy()
    return cv2.morphologyEx(_u8(m), cv2.MORPH_CLOSE, disco(radio_px), borderType=cv2.BORDER_REPLICATE).astype(bool)


def densidad(m: np.ndarray, lado: int) -> np.ndarray:
    """Fracción de píxeles verdaderos en una ventana cuadrada de `lado` px."""
    return cv2.boxFilter(m.astype(np.float32), -1, (lado, lado), borderType=cv2.BORDER_REFLECT)


def quitar_chicos(m: np.ndarray, area_min_px: float, conectividad: int = 8) -> np.ndarray:
    """Quita las componentes de menos de `area_min_px` píxeles."""
    if area_min_px <= 1 or not m.any():
        return m.copy()
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(_u8(m), connectivity=conectividad)
    grandes = stats[:, cv2.CC_STAT_AREA] >= area_min_px
    grandes[0] = False
    return grandes[etiquetas]


def rellenar_huecos_chicos(m: np.ndarray, area_max_px: float) -> np.ndarray:
    """Rellena los huecos (componentes del complemento sin salida al borde) de hasta `area_max_px`."""
    huecos = ~m
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(_u8(huecos), connectivity=4)
    if n <= 1:
        return m.copy()
    alto, ancho = m.shape
    x, y = stats[:, cv2.CC_STAT_LEFT], stats[:, cv2.CC_STAT_TOP]
    w, h = stats[:, cv2.CC_STAT_WIDTH], stats[:, cv2.CC_STAT_HEIGHT]
    toca_borde = (x == 0) | (y == 0) | (x + w == ancho) | (y + h == alto)
    rellenar = (stats[:, cv2.CC_STAT_AREA] <= area_max_px) & ~toca_borde
    rellenar[0] = False
    return m | rellenar[etiquetas]


def rellenar_desde_vecinos(etiquetas: np.ndarray, desconocido: np.ndarray) -> np.ndarray:
    """Asigna a cada píxel desconocido la etiqueta del píxel conocido más cercano."""
    if not desconocido.any():
        return etiquetas.copy()
    if desconocido.all():
        return etiquetas.copy()
    conocido = ~desconocido
    _, vecino = cv2.distanceTransformWithLabels(
        desconocido.astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    tabla = np.zeros(int(vecino.max()) + 1, etiquetas.dtype)
    tabla[vecino[conocido]] = etiquetas[conocido]
    return tabla[vecino]
