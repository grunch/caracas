import numpy as np
import pytest

from tools.geo.calles_nuevas import calles_nuevas, corrimiento_local, grupos_de_manzanas, llevar

METRO = 1.0   # la grilla reducida de las épocas: 1 m por píxel


def damero(ancho=400, alto=400, cuadra=100, calle=10, corrida=(0, 0)):
    """Una red de calles (True) en damero, corrida `corrida` píxeles."""
    m = np.zeros((alto, ancho), bool)
    for c in range(corrida[0] % cuadra, ancho, cuadra):
        m[:, c:c + calle] = True
    for f in range(corrida[1] % cuadra, alto, cuadra):
        m[f:f + calle, :] = True
    return m


def test_una_calle_de_1936_que_el_plano_viejo_tiene_edificada_y_lejos_de_sus_calles_es_nueva():
    calles36 = damero()
    calles36[100:200, 150:158] = True            # en 1936, un pasaje que parte la cuadra
    viejas = damero()
    nuevas = calles_nuevas(calles36, ~viejas, viejas, METRO)
    assert nuevas[125:175, 150:158].all()
    assert not nuevas[viejas].any()


def test_una_calle_que_el_plano_viejo_dibuja_cerca_no_es_nueva():
    calles36 = damero()
    viejas = damero(corrida=(8, 0))               # el calce la corrió 8 m
    assert not calles_nuevas(calles36, ~viejas, viejas, METRO).any()


def test_fuera_de_lo_edificado_del_plano_viejo_nada_es_nuevo():
    calles36 = damero()
    calles36[100:200, 150:158] = True
    nada = np.zeros(calles36.shape, bool)
    assert not calles_nuevas(calles36, nada, damero(), METRO).any()


def test_el_corrimiento_local_lleva_las_calles_viejas_a_las_de_1936():
    calles36 = damero(800, 800)
    viejas = damero(800, 800, corrida=(17, -12))   # todo el plano viejo corrido (17, −12) m
    cx, cy = corrimiento_local(calles36, viejas, np.ones(calles36.shape, bool), METRO)
    adentro = (slice(200, 600), slice(200, 600))
    assert np.median(cx[adentro]) == pytest.approx(-17, abs=1.5)
    assert np.median(cy[adentro]) == pytest.approx(12, abs=1.5)
    corregidas = llevar(viejas, cx, cy)
    assert (corregidas[adentro] == calles36[adentro]).mean() > 0.97


def test_las_cuadras_que_une_una_calle_nueva_van_juntas():
    cuadras = np.zeros((300, 300), np.int32)
    cuadras[20:280, 20:140] = 1
    cuadras[20:280, 156:280] = 2
    nuevas = np.zeros(cuadras.shape, bool)
    nuevas[20:280, 140:156] = True
    grupos = grupos_de_manzanas(cuadras, nuevas)
    assert len(grupos) == 1 and grupos[0]['manzanas'] == {1, 2}
    assert grupos[0]['calles'].sum() == nuevas.sum()


def test_sin_calles_nuevas_no_hay_grupos():
    cuadras = np.zeros((50, 50), np.int32)
    cuadras[5:20, 5:20] = 1
    assert grupos_de_manzanas(cuadras, np.zeros((50, 50), bool)) == []
