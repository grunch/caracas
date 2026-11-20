import numpy as np
import pytest

from tools.geo.calles_nuevas import corrimiento_local, llevar

METRO = 1.0   # la grilla reducida de las épocas: 1 m por píxel


def damero(ancho=400, alto=400, cuadra=100, calle=10, corrida=(0, 0)):
    """Una red de calles (True) en damero, corrida `corrida` píxeles."""
    m = np.zeros((alto, ancho), bool)
    for c in range(corrida[0] % cuadra, ancho, cuadra):
        m[:, c:c + calle] = True
    for f in range(corrida[1] % cuadra, alto, cuadra):
        m[f:f + calle, :] = True
    return m


def test_el_corrimiento_local_lleva_las_calles_viejas_a_las_de_1936():
    calles36 = damero(800, 800)
    viejas = damero(800, 800, corrida=(17, -12))   # todo el plano viejo corrido (17, −12) m
    cx, cy = corrimiento_local(calles36, viejas, np.ones(calles36.shape, bool), METRO)
    adentro = (slice(200, 600), slice(200, 600))
    assert np.median(cx[adentro]) == pytest.approx(-17, abs=1.5)
    assert np.median(cy[adentro]) == pytest.approx(12, abs=1.5)
    corregidas = llevar(viejas, cx, cy)
    assert (corregidas[adentro] == calles36[adentro]).mean() > 0.97
