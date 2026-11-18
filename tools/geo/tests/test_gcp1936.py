"""Tests del ajuste de los puntos de control del plano 1936 contra OSM."""
import json

import numpy as np
import pytest

import gcp1936
import geo1936 as geo


def _puntos(n=9, desvio_px=0.0):
    """Puntos de control sintéticos con una similitud conocida (rotación 0,4°, escala 1,001)."""
    rng = np.random.default_rng(3)
    verdad = geo.ajustar([[0, 0], [1000, 0], [0, 1000]],
                         [[726648.0, 1161835.0], [727648.8, 1161842.0], [726641.0, 1162835.8]], "afin")
    puntos = []
    for k in range(n):
        px, py = rng.uniform(1000, 17000), rng.uniform(1000, 13000)
        x, y = geo.px_a_grid(px, py)
        lat, lon = geo.grid_a_wgs84(x, y, verdad)
        puntos.append({"nombre": f"p{k}", "lat": float(lat), "lon": float(lon),
                       "px": px + rng.normal(0, desvio_px), "py": py + rng.normal(0, desvio_px)})
    return puntos, verdad


def test_calcular_recupera_la_transformacion_sin_ruido():
    puntos, verdad = _puntos()
    r = gcp1936.calcular(puntos, modelo="afin")
    assert r["residuos"]["rms_m"] < 1e-3
    e, n = geo.grid_a_utm(1584.1, 280.5, r["transformacion"])
    e2, n2 = geo.grid_a_utm(1584.1, 280.5, verdad)
    assert e == pytest.approx(e2, abs=1e-3) and n == pytest.approx(n2, abs=1e-3)


def test_calcular_informa_residuos_por_punto_y_dejando_uno_fuera():
    puntos, _ = _puntos(desvio_px=4.0)
    r = gcp1936.calcular(puntos, modelo="similitud")
    assert len(r["residuos"]["por_punto"]) == len(puntos)
    assert r["residuos"]["por_punto"][0]["nombre"] == "p0"
    assert r["dejando_uno_fuera"]["rms_m"] >= r["residuos"]["rms_m"]


def test_calcular_omite_los_puntos_descartados():
    puntos, _ = _puntos()
    puntos[0] = {**puntos[0], "px": puntos[0]["px"] + 400, "descartado": "no coincide"}
    r = gcp1936.calcular(puntos, modelo="afin")
    assert r["residuos"]["n"] == len(puntos) - 1
    assert r["residuos"]["rms_m"] < 1e-3


def test_escribir_conserva_los_puntos_y_agrega_la_transformacion(tmp_path):
    puntos, _ = _puntos()
    ruta = tmp_path / "gcp.json"
    ruta.write_text(json.dumps({"fuente": "OSM", "puntos": puntos}))
    gcp1936.main([str(ruta), "--modelo", "similitud"])
    d = json.loads(ruta.read_text())
    assert d["fuente"] == "OSM" and len(d["puntos"]) == len(puntos)
    assert d["transformacion"]["modelo"] == "similitud"
    t = geo.cargar(ruta)
    assert "matriz" in t
