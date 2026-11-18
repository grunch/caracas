"""Parámetros de la segmentación, en METROS sobre el terreno.

Se convierten a píxeles con la escala (m/px) para que el mismo juego sirva para el
escaneo original (~0,32 m/px) y para el mosaico rectificado (0,5 m/px).
"""
from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class Parametros:
    escala: float  # metros por píxel

    # color
    sigma_suavizado_m: float = 0.35  # suavizado antes de clasificar los fondos
    l_tinta_max: float = 58.0  # todo píxel más oscuro es tinta negra
    dilatar_tinta_m: float = 0.35  # halo antialiasado alrededor de la tinta

    # rayado de edificios públicos
    ventana_rayado_m: float = 5.0
    paso_rayado_m: float = 4.4  # separación máxima entre líneas del rayado
    grosor_linea_max_m: float = 1.3  # una línea aislada más fina que 2·esto no es rayado
    densidad_rayado_min: float = 0.13
    coherencia_rayado_min: float = 0.30
    integracion_rayado_m: float = 4.5  # sigma del tensor de estructura (texto encima no lo anula)
    cierre_rayado_m: float = 1.6
    area_rayado_min_m2: float = 120.0
    ancho_rayado_min_m: float = 4.5  # un edificio rayado es más ancho que esto
    hueco_rayado_max_m2: float = 150.0

    # árboles (símbolo redondo verde)
    radio_arbol_min_m: float = 2.4
    radio_arbol_max_m: float = 4.6
    radios_arbol_n: int = 4
    contraste_arbol_min: float = 0.30  # verde en el anillo − verde en la corona exterior
    verde_alrededor_arbol_max: float = 0.12  # más verde alrededor = campo de cultivo
    sombra_arbol_min: float = 0.04  # fracción de sombra (remolino) dentro del disco
    ventana_arbolado_m: float = 14.0  # patio o terreno libre con árboles densos = jardín
    densidad_arbolado_min: float = 0.12
    densidad_arbolado_calle_min: float = 0.22  # más alta: no tragarse las calles con hileras de árboles

    # verde y cultivo
    grosor_verde_solido_m: float = 1.0  # trazos verdes más finos que 2·esto no son relleno
    area_verde_solido_min_m2: float = 20.0  # los símbolos de cultivo son manchas más chicas
    ventana_cultivo_m: float = 6.0
    densidad_cultivo_min: float = 0.045
    cierre_cultivo_m: float = 2.5
    area_cultivo_min_m2: float = 400.0

    # agua
    ventana_agua_m: float = 3.0
    densidad_agua_min: float = 0.14
    cierre_agua_m: float = 1.2
    area_agua_min_m2: float = 2.0

    # cerro (punteado gris + curvas rojas)
    ventana_cerro_m: float = 10.0
    densidad_gris_min: float = 0.12
    densidad_curvas_min: float = 0.08
    densidad_gris_con_curvas_min: float = 0.02
    densidad_naranja_max: float = 0.25
    densidad_curvas_ladera_min: float = 0.035
    densidad_naranja_ladera_max: float = 0.12
    area_cerro_min_m2: float = 400.0
    grosor_casa_min_m: float = 1.0  # en cerros, el naranja más fino que 2·esto no es casa

    # calle / patio
    radio_zaguan_m: float = 1.4  # pasos más angostos que 2·r no unen un patio con la calle
    area_red_calles_m2: float = 3500.0
    compacidad_calle_min: float = 9.0  # área / (π·r_max²) de una calle alargada
    area_calle_min_m2: float = 250.0
    compacidad_calle_borde_min: float = 4.0  # ídem para componentes que tocan el borde de la imagen
    radio_terreno_libre_m: float = 22.0  # claro más ancho que 2·r = terreno libre
    vecindad_patio_m: float = 1.5  # un patio debe tocar lo edificado a esta distancia

    # limpieza y marco
    area_mancha_min_m2: float = 2.5
    banda_marco_m: float = 160.0
    hueco_marco_m: float = 60.0
    cobertura_marco_min: float = 0.85
    lineas_marco_min: int = 3

    # teselado
    halo_m: float = 80.0

    def __post_init__(self):
        if not (isinstance(self.escala, (int, float)) and math.isfinite(self.escala) and self.escala > 0):
            raise ValueError(f"escala inválida: {self.escala!r} (m/px, > 0)")

    def px(self, metros: float) -> float:
        """Longitud en píxeles."""
        return metros / self.escala

    def px2(self, metros2: float) -> float:
        """Área en píxeles."""
        return metros2 / (self.escala * self.escala)

    def radio_px(self, metros: float, minimo: int = 1) -> int:
        return max(minimo, int(round(self.px(metros))))

    def lado_ventana(self, metros: float) -> int:
        """Lado impar (≥ 3) de una ventana cuadrada de `metros`."""
        lado = max(3, int(round(self.px(metros))))
        return lado if lado % 2 else lado + 1
