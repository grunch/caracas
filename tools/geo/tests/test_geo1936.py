"""Tests de geo1936: UTM 19N propio (sin pyproj), píxel ⇄ cuadrícula y ajuste cuadrícula ⇄ UTM."""
import json

import numpy as np
import pytest

import geo1936 as geo

# referencias calculadas con pyproj (EPSG:4326 → EPSG:32619), fuera del repo
REFERENCIAS_UTM = [
    # lon, lat, E, N
    (-66.914625, 10.505999, 728232.6543758567, 1162115.9685514204),
    (-66.9, 10.5, 729838.3868870579, 1161462.9276914431),
    (-69.0, 10.5, 500000.0, 1160695.0941260615),
    (-66.0, 11.0, 827871.3928108109, 1217618.384382686),
]


@pytest.mark.parametrize("lon,lat,e,n", REFERENCIAS_UTM)
def test_wgs84_a_utm_coincide_con_pyproj_al_milimetro(lon, lat, e, n):
    e2, n2 = geo.wgs84_a_utm(lat, lon)
    assert abs(e2 - e) < 1e-3 and abs(n2 - n) < 1e-3


@pytest.mark.parametrize("lon,lat,e,n", REFERENCIAS_UTM)
def test_utm_a_wgs84_es_la_inversa(lon, lat, e, n):
    lat2, lon2 = geo.utm_a_wgs84(e, n)
    assert abs(lat2 - lat) < 1e-9 and abs(lon2 - lon) < 1e-9


def test_utm_acepta_arrays():
    lat = np.array([10.5, 10.51])
    lon = np.array([-66.9, -66.91])
    e, n = geo.wgs84_a_utm(lat, lon)
    assert e.shape == (2,) and n.shape == (2,)


def test_pixel_y_cuadricula_del_mosaico():
    # la Plaza Bolívar documentada en mosaico.json
    x, y = geo.px_a_grid(8968.2, 6839.0)
    assert x == pytest.approx(1584.1) and y == pytest.approx(280.5)
    px, py = geo.grid_a_px(x, y)
    assert px == pytest.approx(8968.2) and py == pytest.approx(6839.0)


def _puntos_sinteticos(ruido=0.0, semilla=0):
    rng = np.random.default_rng(semilla)
    grid = rng.uniform(-2500, 6000, size=(10, 2))
    ang = np.deg2rad(1.3)
    k = 1.0004
    rot = k * np.array([[np.cos(ang), -np.sin(ang)], [np.sin(ang), np.cos(ang)]])
    utm = grid @ rot.T + np.array([726650.0, 1161830.0])
    return grid, utm + rng.normal(0, ruido, utm.shape) if ruido else utm


def test_ajuste_de_similitud_recupera_la_transformacion_exacta():
    grid, utm = _puntos_sinteticos()
    t = geo.ajustar(grid, utm, modelo="similitud")
    e, n = geo.grid_a_utm(grid[:, 0], grid[:, 1], t)
    assert np.allclose(np.c_[e, n], utm, atol=1e-6)
    assert t["escala"] == pytest.approx(1.0004, abs=1e-8)
    assert t["rotacion_grados"] == pytest.approx(1.3, abs=1e-6)


def test_ajuste_afin_y_su_inversa():
    grid, utm = _puntos_sinteticos()
    t = geo.ajustar(grid, utm, modelo="afin")
    e, n = geo.grid_a_utm(grid[:, 0], grid[:, 1], t)
    x, y = geo.utm_a_grid(e, n, t)
    assert np.allclose(np.c_[x, y], grid, atol=1e-6)


def test_residuos_y_dejando_uno_fuera_con_ruido():
    grid, utm = _puntos_sinteticos(ruido=2.0)
    t = geo.ajustar(grid, utm, modelo="similitud")
    r = geo.residuos(grid, utm, t)
    assert r["n"] == 10
    assert 0.5 < r["rms_m"] < 5.0
    assert len(r["por_punto_m"]) == 10
    loo = geo.dejando_uno_fuera(grid, utm, modelo="similitud")
    assert loo["rms_m"] >= r["rms_m"]


def test_ajuste_exige_puntos_suficientes():
    with pytest.raises(ValueError):
        geo.ajustar(np.zeros((1, 2)), np.zeros((1, 2)), modelo="similitud")
    with pytest.raises(ValueError):
        geo.ajustar(np.zeros((2, 2)), np.zeros((2, 2)), modelo="afin")
    with pytest.raises(ValueError):
        geo.ajustar(np.zeros((4, 2)), np.zeros((4, 2)), modelo="tps")


def test_grid_a_wgs84_y_vuelta(tmp_path):
    grid, utm = _puntos_sinteticos()
    t = geo.ajustar(grid, utm, modelo="similitud")
    ruta = tmp_path / "t.json"
    ruta.write_text(json.dumps({"transformacion": t}))
    t2 = geo.cargar(ruta)
    lat, lon = geo.grid_a_wgs84(1584.1, 280.5, t2)
    x, y = geo.wgs84_a_grid(lat, lon, t2)
    assert x == pytest.approx(1584.1, abs=1e-4) and y == pytest.approx(280.5, abs=1e-4)
