"""Detección de los símbolos de árbol del plano: anillos/discos verdes de ~6-8 m.

El símbolo es un anillo verde (a veces abierto) con un remolino negro adentro; en
jardines los anillos se tocan. Se usa un filtro de contraste anular: verde medio en
el anillo del árbol menos verde medio en una corona exterior. Un campo de cultivo
(verde parejo) da contraste ~0; un árbol aislado o en hilera, contraste alto.
"""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np
from scipy import ndimage

from segmentar_parametros import Parametros


@dataclass(frozen=True)
class Arbol:
    x: float
    y: float
    r: float

    def como_dict(self, dx: float = 0.0, dy: float = 0.0) -> dict:
        return {"x": round(self.x + dx, 1), "y": round(self.y + dy, 1), "r": round(self.r, 1)}


def _corona(r_in: float, r_out: float) -> np.ndarray:
    """Núcleo normalizado (suma 1) con forma de corona r_in ≤ d ≤ r_out (px)."""
    lado = int(np.ceil(r_out))
    yy, xx = np.mgrid[-lado:lado + 1, -lado:lado + 1]
    d = np.hypot(xx, yy)
    k = ((d >= r_in) & (d <= r_out)).astype(np.float32)
    return k / max(k.sum(), 1.0)


def _contraste(verde: np.ndarray, radio_px: float, afuera_max: float) -> np.ndarray:
    """Verde del anillo menos verde de la corona exterior; −1 donde el entorno es muy verde (campo)."""
    v = verde.astype(np.float32)
    anillo = cv2.filter2D(v, -1, _corona(0.55 * radio_px, 1.1 * radio_px), borderType=cv2.BORDER_REFLECT)
    afuera = cv2.filter2D(v, -1, _corona(1.2 * radio_px, 1.6 * radio_px), borderType=cv2.BORDER_REFLECT)
    return np.where(afuera <= afuera_max, anillo - afuera, -1.0)


def _radios(p: Parametros) -> list[float]:
    r0, r1 = p.px(p.radio_arbol_min_m), p.px(p.radio_arbol_max_m)
    return [float(r) for r in np.geomspace(r0, r1, p.radios_arbol_n)]


def _picos(puntaje: np.ndarray, umbral: float, separacion_px: float) -> list[tuple[float, float]]:
    lado = max(3, int(round(separacion_px)) | 1)
    maximo = ndimage.maximum_filter(puntaje, size=lado, mode="nearest")
    picos = (puntaje >= umbral) & (puntaje >= maximo - 1e-6)
    n, etiquetas = cv2.connectedComponents(picos.astype(np.uint8), connectivity=8)
    if n <= 1:
        return []
    centros = ndimage.center_of_mass(picos, etiquetas, np.arange(1, n))
    return [(float(c[1]), float(c[0])) for c in centros]


def _fraccion_en_disco(m: np.ndarray, x: float, y: float, r: float) -> float:
    alto, ancho = m.shape
    rr = int(np.ceil(r))
    x0, x1 = max(0, int(x) - rr), min(ancho, int(x) + rr + 1)
    y0, y1 = max(0, int(y) - rr), min(alto, int(y) + rr + 1)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    disco = np.hypot(xx - x, yy - y) <= r
    return float(m[y0:y1, x0:x1][disco].mean()) if disco.any() else 0.0


def _centroide_en_disco(m: np.ndarray, x: float, y: float, r: float) -> tuple[float, float]:
    """Centroide de `m` dentro del disco (x, y, r); el mismo punto si está casi vacío."""
    alto, ancho = m.shape
    rr = int(np.ceil(r))
    x0, x1 = max(0, int(x) - rr), min(ancho, int(x) + rr + 1)
    y0, y1 = max(0, int(y) - rr), min(alto, int(y) + rr + 1)
    yy, xx = np.mgrid[y0:y1, x0:x1]
    dentro = m[y0:y1, x0:x1] & (np.hypot(xx - x, yy - y) <= r)
    if dentro.sum() < 5:
        return x, y
    return float(xx[dentro].mean()), float(yy[dentro].mean())


def detectar_arboles(verde: np.ndarray, sombra: np.ndarray, p: Parametros) -> tuple[list[Arbol], np.ndarray]:
    """Lista de árboles y máscara de sus discos.

    Se exige sombreado (negro o verde oscuro) dentro del disco: los símbolos de
    cultivo no lo tienen.
    """
    radios = _radios(p)
    pilas = np.stack([_contraste(verde, r, p.verde_alrededor_arbol_max) for r in radios])
    puntaje = pilas.max(axis=0)
    mejor = pilas.argmax(axis=0)
    simbolo = verde | sombra
    arboles: list[Arbol] = []
    for x, y in _picos(puntaje, p.contraste_arbol_min, 1.6 * radios[0]):
        r = radios[int(mejor[int(round(y)), int(round(x))])]
        if _fraccion_en_disco(sombra, x, y, r) < p.sombra_arbol_min:
            continue
        cx, cy = x, y
        for _ in range(2):
            cx, cy = _centroide_en_disco(simbolo, cx, cy, 1.3 * r)
        arboles.append(Arbol(cx, cy, r))
    arboles = _sin_duplicados(arboles, radios[0])
    return arboles, mascara_de(arboles, verde.shape)


def _sin_duplicados(arboles: list[Arbol], distancia_min: float) -> list[Arbol]:
    """Descarta los árboles a menos de `distancia_min` de uno ya aceptado (el más grande gana)."""
    aceptados: list[Arbol] = []
    for a in sorted(arboles, key=lambda a: -a.r):
        if all(np.hypot(a.x - b.x, a.y - b.y) >= distancia_min for b in aceptados):
            aceptados.append(a)
    return sorted(aceptados, key=lambda a: (a.y, a.x))


def mascara_de(arboles: list[Arbol], forma: tuple[int, ...]) -> np.ndarray:
    mascara = np.zeros(forma[:2], np.uint8)
    for a in arboles:
        cv2.circle(mascara, (int(round(a.x)), int(round(a.y))), int(round(a.r)), 1, -1)
    return mascara.astype(bool)


def fuera_de(arboles: list[Arbol], zona: np.ndarray) -> list[Arbol]:
    """Los árboles cuyo centro no cae en `zona` (p. ej. un campo de cultivo)."""
    alto, ancho = zona.shape
    return [a for a in arboles
            if not zona[min(alto - 1, int(round(a.y))), min(ancho - 1, int(round(a.x)))]]
