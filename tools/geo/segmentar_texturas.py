"""Zonas definidas por textura: rayado de edificios públicos, cultivos, agua y cerros."""
from __future__ import annotations

import cv2
import numpy as np

from segmentar_morfologia import (
    abrir, cerrar, densidad, quitar_chicos, rellenar_huecos_chicos,
)
from segmentar_parametros import Parametros


def coherencia(m: np.ndarray, sigma_derivada: float, sigma_integracion: float) -> np.ndarray:
    """Coherencia del tensor de estructura (0 = isótropo, 1 = una sola orientación)."""
    f = cv2.GaussianBlur(m.astype(np.float32), (0, 0), max(0.5, sigma_derivada))
    gx = cv2.Sobel(f, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(f, cv2.CV_32F, 0, 1, ksize=3)
    jxx = cv2.GaussianBlur(gx * gx, (0, 0), sigma_integracion)
    jyy = cv2.GaussianBlur(gy * gy, (0, 0), sigma_integracion)
    jxy = cv2.GaussianBlur(gx * gy, (0, 0), sigma_integracion)
    traza = jxx + jyy
    return np.sqrt((jxx - jyy) ** 2 + 4 * jxy ** 2) / (traza + 1e-6)


def detectar_rayado(negro: np.ndarray, p: Parametros) -> np.ndarray:
    """Rayado paralelo denso (edificios públicos).

    Un cierre con radio ~ medio paso del rayado vuelve sólido el rayado pero deja fina
    una línea aislada (borde de manzana), que la apertura posterior borra; la coherencia
    de orientación descarta los bloques de texto (trazos en todas direcciones).
    """
    lado = p.lado_ventana(p.ventana_rayado_m)
    dens = densidad(negro, lado)
    coh = coherencia(negro, p.px(0.3), p.px(p.integracion_rayado_m))
    solido = abrir(cerrar(negro, p.radio_px(p.paso_rayado_m / 2)), p.radio_px(p.grosor_linea_max_m))
    candidato = solido & (dens >= p.densidad_rayado_min) & (coh >= p.coherencia_rayado_min)
    candidato = cerrar(candidato, p.radio_px(p.cierre_rayado_m))
    candidato = abrir(candidato, p.radio_px(p.ancho_rayado_min_m / 2))  # vías férreas, bordes dobles
    candidato = quitar_chicos(candidato, p.px2(p.area_rayado_min_m2))
    return rellenar_huecos_chicos(candidato, p.px2(p.hueco_rayado_max_m2))


def detectar_verde_solido(verde: np.ndarray, p: Parametros) -> np.ndarray:
    """Relleno verde continuo (jardines, plazas): sobrevive a una apertura que borra los trazos."""
    solido = abrir(cerrar(verde, 1), p.radio_px(p.grosor_verde_solido_m))
    solido = cerrar(solido, p.radio_px(p.grosor_verde_solido_m))
    return quitar_chicos(solido, p.px2(p.area_verde_solido_min_m2))


def detectar_cultivo(verde: np.ndarray, p: Parametros) -> np.ndarray:
    """Campos: trazos verdes repetidos (líneas, puntos, 'v', cruces) sobre el papel."""
    dens = densidad(verde, p.lado_ventana(p.ventana_cultivo_m))
    campo = cerrar(dens >= p.densidad_cultivo_min, p.radio_px(p.cierre_cultivo_m))
    campo = abrir(campo, p.radio_px(p.cierre_cultivo_m))
    campo = quitar_chicos(campo, p.px2(p.area_cultivo_min_m2))
    return rellenar_huecos_chicos(campo, p.px2(p.area_cultivo_min_m2))


def detectar_agua(azul: np.ndarray, p: Parametros) -> np.ndarray:
    """Cauces rayados en azul (densidad) y líneas azules finas de quebradas."""
    dens = densidad(azul, p.lado_ventana(p.ventana_agua_m))
    cauce = cerrar(dens >= p.densidad_agua_min, p.radio_px(p.cierre_agua_m))
    linea = cerrar(azul, p.radio_px(0.5))
    agua = quitar_chicos(cauce | linea, p.px2(p.area_agua_min_m2))
    return rellenar_huecos_chicos(agua, p.px2(4.0))


def detectar_cerro(gris: np.ndarray, rojo: np.ndarray, naranja: np.ndarray, p: Parametros) -> np.ndarray:
    """Sombreado punteado gris y/o curvas de nivel rojas, lejos de lo edificado."""
    lado = p.lado_ventana(p.ventana_cerro_m)
    d_gris = densidad(gris, lado)
    d_rojo = densidad(rojo, lado)
    d_nar = densidad(naranja, 2 * lado + 1)
    con_curvas = (d_rojo >= p.densidad_curvas_min) & (d_gris >= p.densidad_gris_con_curvas_min)
    # laderas suaves: solo curvas, más espaciadas; se miran en una ventana doble y lejos de casas
    d_rojo_ancho = densidad(rojo, 2 * lado + 1)
    ladera = (d_rojo_ancho >= p.densidad_curvas_ladera_min) & (d_nar <= p.densidad_naranja_ladera_max)
    cerro = ((d_gris >= p.densidad_gris_min) | con_curvas) & (d_nar <= p.densidad_naranja_max)
    cerro = cerro | ladera
    cerro = cerrar(cerro, p.radio_px(2.0))
    cerro = quitar_chicos(cerro, p.px2(p.area_cerro_min_m2))
    return rellenar_huecos_chicos(cerro, p.px2(p.area_cerro_min_m2))
