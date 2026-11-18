"""Separación calle / patio / terreno libre por topología de las zonas claras."""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np
from scipy import ndimage

from segmentar_clases import CALLE, CERRO, DESCONOCIDO, N_CLASES, PATIO
from segmentar_morfologia import abrir, dilatar, erosionar, rellenar_desde_vecinos
from segmentar_parametros import Parametros


@dataclass(frozen=True)
class Cortes:
    """Lados de la tesela que son un corte artificial (no el borde real de la imagen)."""
    arriba: bool = False
    abajo: bool = False
    izquierda: bool = False
    derecha: bool = False


def _toca_corte(stats: np.ndarray, forma: tuple[int, int], cortes: Cortes) -> np.ndarray:
    alto, ancho = forma
    x, y = stats[:, cv2.CC_STAT_LEFT], stats[:, cv2.CC_STAT_TOP]
    x1 = x + stats[:, cv2.CC_STAT_WIDTH]
    y1 = y + stats[:, cv2.CC_STAT_HEIGHT]
    return ((cortes.arriba & (y == 0)) | (cortes.abajo & (y1 == alto))
            | (cortes.izquierda & (x == 0)) | (cortes.derecha & (x1 == ancho)))


def _es_calle(etiquetas: np.ndarray, stats: np.ndarray, dist: np.ndarray, cortes: Cortes,
              p: Parametros) -> np.ndarray:
    """Por componente: ¿es parte de la red de calles?"""
    n = stats.shape[0]
    area_m2 = stats[:, cv2.CC_STAT_AREA] * p.escala ** 2
    r_max = np.zeros(n, np.float64)
    if n > 1:
        r_max[1:] = ndimage.maximum(dist, etiquetas, index=np.arange(1, n))
    compacidad = area_m2 / (np.pi * np.maximum(r_max * p.escala, p.escala) ** 2)
    alargada = (compacidad >= p.compacidad_calle_min) & (area_m2 >= p.area_calle_min_m2)
    # una calle cortada por el borde real de la imagen queda aislada: basta que sea algo alargada
    todo = Cortes(True, True, True, True)
    al_borde = _toca_corte(stats, etiquetas.shape, todo) & (compacidad >= p.compacidad_calle_borde_min)
    calle = (area_m2 >= p.area_red_calles_m2) | alargada | al_borde | _toca_corte(stats, etiquetas.shape, cortes)
    calle[0] = False
    return calle


def separar_claros(claro: np.ndarray, p: Parametros, cortes: Cortes = Cortes()) -> np.ndarray:
    """Etiqueta lo claro: CALLE (red conexa o alargada), PATIO (encerrado) o CERRO (terreno libre ancho)."""
    salida = np.zeros(claro.shape, np.uint8)
    if not claro.any():
        return salida
    abierto = abrir(claro, p.radio_px(p.radio_zaguan_m))
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(abierto.astype(np.uint8), connectivity=4)
    dist = cv2.distanceTransform(abierto.astype(np.uint8), cv2.DIST_L2, 5)
    calle = _es_calle(etiquetas, stats, dist, cortes, p)
    salida[abierto] = np.where(calle[etiquetas[abierto]], CALLE, PATIO)
    r_libre = p.radio_px(p.radio_terreno_libre_m)
    ancho = dilatar(dist > r_libre, r_libre) & abierto & (salida == CALLE)
    salida[ancho] = CERRO
    resto = claro & ~abierto
    if resto.any() and abierto.any():
        relleno = rellenar_desde_vecinos(salida, ~abierto)
        salida = np.where(resto, relleno, salida).astype(np.uint8)
    elif resto.any():
        salida[resto] = PATIO
    return salida


def quitar_manchas(clases: np.ndarray, area_min_px: float, proteger: np.ndarray | None = None) -> np.ndarray:
    """Las manchas de cualquier clase menores que `area_min_px` toman la clase vecina."""
    desconocido = clases == DESCONOCIDO
    for c in range(1, N_CLASES):
        m = (clases == c).astype(np.uint8)
        if not m.any():
            continue
        n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=4)
        chicas = stats[:, cv2.CC_STAT_AREA] < area_min_px
        chicas[0] = False
        desconocido |= chicas[etiquetas]
    if proteger is not None:
        desconocido &= ~proteger
    return rellenar_desde_vecinos(clases, desconocido)


def nucleo_de_rayado(rayado: np.ndarray, p: Parametros) -> np.ndarray:
    """Interior seguro del rayado detectado.

    La ventana de densidad y el cierre corren el borde del rayado unos metros hacia
    afuera (sobre todo si hay texto al lado); esa franja se deja a la topología, que
    la devuelve a la calle si está unida a la red.
    """
    return erosionar(rayado, p.radio_px(p.ventana_rayado_m / 2 + p.cierre_rayado_m))


def patios_sin_edificar_alrededor(clases: np.ndarray, edificado: np.ndarray, p: Parametros) -> np.ndarray:
    """Máscara de los 'patios' que no tocan lo edificado: claros de cerro o campo (terreno libre)."""
    patio = (clases == PATIO).astype(np.uint8)
    if not patio.any():
        return np.zeros(clases.shape, bool)
    n, etiquetas = cv2.connectedComponents(patio, connectivity=4)
    cerca = dilatar(edificado, p.radio_px(p.vecindad_patio_m)) & patio.astype(bool)
    con_casas = np.zeros(n, bool)
    con_casas[np.unique(etiquetas[cerca])] = True
    con_casas[0] = True
    return ~con_casas[etiquetas]
