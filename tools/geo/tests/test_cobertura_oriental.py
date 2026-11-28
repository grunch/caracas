"""Cobertura oriental de la hoja (#279): la posición de cada lugar del catálogo sale de su latitud y longitud."""
import json
from pathlib import Path

import pytest

from tools.geo import geo1936

RAIZ = Path(__file__).resolve().parents[3]
CATALOGO = json.loads((RAIZ / "docs/evidencias/expansion-oriental-1946.json").read_text(encoding="utf-8"))
MOSAICO = json.loads((RAIZ / "tools/geo/mosaico-1936.json").read_text(encoding="utf-8"))
PUNTOS = CATALOGO["cobertura"]["puntos"]


@pytest.mark.parametrize("punto", PUNTOS, ids=[p["nombre"] for p in PUNTOS])
def test_la_posicion_en_la_cuadricula_sale_de_la_latitud_y_la_longitud(punto):
    # Arrange
    t = geo1936.cargar()

    # Act
    x, y = geo1936.wgs84_a_grid(punto["lat"], punto["lon"], t)

    # Assert: el catálogo guarda metros enteros
    assert abs(float(x) - punto["x_m"]) <= 0.5
    assert abs(float(y) - punto["y_m"]) <= 0.5


def test_la_plaza_bolivar_cae_donde_dice_el_mosaico():
    # el control de que la transformación usada es la de la hoja: la plaza, a menos de 3 m de su posición en el mosaico
    t = geo1936.cargar()
    x, y = geo1936.wgs84_a_grid(10.5059993, -66.9146252, t)
    assert abs(float(x) - MOSAICO["plaza_m"][0]) < 3
    assert abs(float(y) - MOSAICO["plaza_m"][1]) < 3


def test_el_interior_del_plano_de_1946_termina_poco_despues_del_marco():
    # Arrange: ajuste lineal de los cruces de la cuadrícula impresa (px del escaneo -> metros)
    import numpy as np
    puntos = json.loads((RAIZ / "tools/geo/gcp/1946-cuadricula.json").read_text(encoding="utf-8"))["puntos"]
    a = np.array([[p["px"], p["py"], 1.0] for p in puntos])
    coef = np.linalg.lstsq(a, np.array([p["x_m"] for p in puntos]), rcond=None)[0]

    # Act: el borde este del interior cartográfico que usa mapa_1946.py (px < 14600), a media altura
    x_borde = float(coef @ [14600, 5000, 1.0])

    # Assert
    assert abs(x_borde - CATALOGO["cobertura"]["interior_del_plano_1946_x_m"]) < 10
    assert x_borde > MOSAICO["extension_m"][2]
    assert all(p["x_m"] > x_borde for p in PUNTOS if p["fuera_del_marco_m"] > 0)
