"""Margen / fuera del plano: píxeles sin datos y la franja exterior al marco de la hoja.

El marco de la hoja DCN es un haz de líneas negras rectas casi paralelas a los bordes
(barras gruesas + la línea interior). Se busca por bandas (para tolerar una leve
rotación del escaneo): columnas (o filas) casi enteramente oscuras, agrupadas en haces
de al menos `lineas_marco_min` líneas separadas menos de `hueco_marco_m`. Todo lo que
queda hacia afuera de la línea más interior del haz es margen.
"""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np

from segmentar_parametros import Parametros


@dataclass(frozen=True)
class Ubicacion:
    """Posición de la tesela dentro de la imagen completa."""
    x0: int
    y0: int
    ancho_total: int
    alto_total: int


def _lineas(perfil: np.ndarray, umbral: float) -> list[tuple[int, int]]:
    """Tramos [ini, fin) donde el perfil supera el umbral."""
    sobre = np.concatenate([[False], perfil >= umbral, [False]])
    cambios = np.flatnonzero(np.diff(sobre.astype(np.int8)))
    return list(zip(cambios[0::2], cambios[1::2]))


def _haces(lineas: list[tuple[int, int]], hueco_px: float) -> list[list[tuple[int, int]]]:
    haces: list[list[tuple[int, int]]] = []
    for ln in lineas:
        if haces and ln[0] - haces[-1][-1][1] <= hueco_px:
            haces[-1] = haces[-1] + [ln]
        else:
            haces.append([ln])
    return haces


def _limite_margen(perfil: np.ndarray, origen: int, total: int, p: Parametros) -> tuple[int, int] | None:
    """Intervalo [ini, fin) local que es margen según un perfil 1D, o None."""
    for haz in _haces(_lineas(perfil, p.cobertura_marco_min), p.px(p.hueco_marco_m)):
        if len(haz) < p.lineas_marco_min:
            continue
        centro_global = origen + (haz[0][0] + haz[-1][1]) / 2
        if centro_global < total / 2:
            return 0, int(haz[-1][1])
        return int(haz[0][0]), len(perfil)
    return None


def _marco_en_eje(oscuro: np.ndarray, origen: int, total: int, p: Parametros) -> np.ndarray:
    """Margen por líneas verticales (perfil de columnas) en bandas horizontales."""
    alto, ancho = oscuro.shape
    margen = np.zeros(oscuro.shape, bool)
    banda = max(32, int(p.px(p.banda_marco_m)))
    engorde = cv2.dilate(oscuro.astype(np.uint8), np.ones((1, 5), np.uint8))
    for y in range(0, alto, banda):
        y1 = min(alto, y + banda)
        if y1 - y < banda // 2 and y > 0:
            y = max(0, y1 - banda)
        perfil = engorde[y:y1].mean(axis=0)
        lim = _limite_margen(perfil, origen, total, p)
        if lim:
            margen[y:y1, lim[0]:lim[1]] = True
    return margen


def detectar_margen(oscuro: np.ndarray, sin_datos: np.ndarray, ubic: Ubicacion, p: Parametros) -> np.ndarray:
    vertical = _marco_en_eje(oscuro, ubic.x0, ubic.ancho_total, p)
    horizontal = _marco_en_eje(oscuro.T, ubic.y0, ubic.alto_total, p).T
    return sin_datos | vertical | horizontal
