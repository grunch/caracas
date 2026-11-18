"""Tests de los árboles de los jardines urbanos (tools/geo/jardines.py) con mapas de clases sintéticos."""
import numpy as np

import jardines as ja
from segmentar_clases import CALLE, CERRO, CULTIVO, EDIFICADO

METRO = 0.5


def _mapa(fondo=CALLE, alto=400, ancho=400):
    return np.full((alto, ancho), fondo, np.uint8)


def test_un_cantero_en_la_ciudad_es_jardin():
    # Arrange: un cantero de 20 × 20 m entre calles
    c = _mapa()
    c[100:140, 100:140] = CULTIVO
    # Act
    m = ja.mascara_jardines(c, METRO)
    # Assert
    assert m[120, 120]
    assert not m[10, 10]


def test_un_campo_grande_no_es_jardin():
    c = _mapa()
    c[0:300, 0:300] = CULTIVO  # 150 × 150 m: un cultivo, no un cantero
    assert not ja.mascara_jardines(c, METRO).any()


def test_un_cantero_rodeado_de_cerro_no_es_jardin():
    c = _mapa(CERRO)
    c[100:140, 100:140] = CULTIVO
    assert not ja.mascara_jardines(c, METRO).any()


def test_el_borde_de_cerro_cuenta_como_neutro():
    # en el plano, los canteros de las plazas quedan rodeados por la línea de su contorno (sale "cerro")
    c = _mapa(EDIFICADO)
    c[96:144, 96:144] = CERRO
    c[100:140, 100:140] = CULTIVO
    assert ja.mascara_jardines(c, METRO)[120, 120]


def test_los_puntos_caen_adentro_separados_y_lejos_de_los_arboles_del_plano():
    # Arrange
    m = np.zeros((400, 400), bool)
    m[100:200, 100:200] = True
    detectados = [{"x": 150.0, "y": 150.0, "r": 8.0}]
    # Act
    puntos = ja.arboles_en(m, METRO, detectados, semilla=1)
    # Assert
    assert len(puntos) > 3
    xy = np.array([[p["x"], p["y"]] for p in puntos])
    assert (xy >= 100).all() and (xy < 200).all()
    assert (np.hypot(xy[:, 0] - 150, xy[:, 1] - 150) >= ja.LEJOS_DE_DETECTADO_M / METRO).all()
    assert all(ja.RADIO_M[0] / METRO <= p["r"] <= ja.RADIO_M[1] / METRO for p in puntos)
    assert ja.arboles_en(m, METRO, detectados, semilla=1) == puntos  # reproducible
