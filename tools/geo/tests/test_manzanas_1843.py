"""Borrador de manzanas de 1843: rayado sin las calles blancas, en componentes con caja y área."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from manzanas_1843 import candidatas, mascara_calles, mascara_rayado  # noqa: E402


def _plano(n=3, cuadra=60, calle=8, borde=20):
    """n×n manzanas rayadas (líneas horizontales oscuras cada 2 px, como el rayado fino del original) separadas por calles blancas."""
    lado = borde * 2 + n * cuadra + (n - 1) * calle
    img = np.full((lado, lado), 235, np.uint8)
    for i in range(n):
        for j in range(n):
            y0, x0 = borde + i * (cuadra + calle), borde + j * (cuadra + calle)
            img[y0:y0 + cuadra:2, x0:x0 + cuadra] = 60
    return img


def test_el_rayado_cubre_las_manzanas_y_no_el_papel():
    img = _plano()
    ray = mascara_rayado(img)
    assert ray[50, 50] and not ray[5, 5]


def test_las_calles_entre_manzanas_salen_como_trazos_claros_largos():
    calles = mascara_calles(_plano(), largo=60)
    assert calles[50, 84] and calles[84, 50]   # la calle vertical y la horizontal entre la primera y la segunda
    assert not calles[50, 50]


def test_candidatas_separa_cada_manzana_con_su_caja():
    cands = candidatas(_plano(), area_minima=1500, largo=60)
    assert len(cands) == 9
    # el borrador derrama hasta media ventana de rayado hacia el papel del borde: no es el contorno censado
    assert all(3000 < c['area_px'] <= 4700 for c in cands)
    x0, y0, x1, y1 = cands[4]['caja_px']   # la del centro, rodeada de calles
    assert abs((x1 - x0) - 60) <= 4 and abs((y1 - y0) - 60) <= 4
