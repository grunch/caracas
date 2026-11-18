"""Tests del relieve: DEM (lon/lat) → grilla del mosaico, limpieza de edificios, cotas y relieve.bin."""
import numpy as np
import pytest

import geo1936 as geo
import relieve as rl

# similitud plausible para el plano (rotación ≈ convergencia de meridianos, escala ~1)
TRANSF = geo.ajustar([[0, 0], [1000, 0], [0, 1000]],
                     [[726648.0, 1161835.0], [727648.6, 1161840.0], [726643.0, 1162834.6]], "similitud")
GEOREF = {"lon0": -67.0, "lat0": 11.0, "dlon": 1 / 3600, "dlat": 1 / 3600}  # centro del píxel (0, 0)


def _dem_plano(a=4000.0, b=-6000.0, c=0.0):
    """DEM sintético de la hoja N10 W067 con z = a·(lon+67) + b·(lat−11) + c (en metros)."""
    filas, cols = np.mgrid[0:3600:1, 0:3600:1]
    lon = GEOREF["lon0"] + cols * GEOREF["dlon"]
    lat = GEOREF["lat0"] - filas * GEOREF["dlat"]
    return (a * (lon + 67.0) + b * (lat - 11.0) + c).astype(np.float32)


def test_centros_de_celda_cubren_el_mosaico():
    px, py = rl.centros_px((74, 93))
    assert px.shape == (74, 93)
    assert px[0, 0] == pytest.approx(100.0) and py[0, 0] == pytest.approx(100.0)
    assert px[0, -1] == pytest.approx(rl.ANCHO_PX - 100.0) and py[-1, 0] == pytest.approx(rl.ALTO_PX - 100.0)


def test_dem_en_grilla_muestrea_un_plano_exacto():
    dem = _dem_plano()
    z = rl.dem_en_grilla(dem, GEOREF, TRANSF, (20, 25))
    px, py = rl.centros_px((20, 25))
    lat, lon = geo.grid_a_wgs84(*geo.px_a_grid(px, py), TRANSF)
    esperado = 4000.0 * (lon + 67.0) - 6000.0 * (lat - 11.0)
    assert np.allclose(z, esperado, atol=0.05)


def test_quitar_edificios_borra_torres_y_conserva_lomas():
    paso = 10.0
    yy, xx = np.mgrid[0:120, 0:120] * paso
    loma = 100.0 * np.exp(-((xx - 600) ** 2 + (yy - 600) ** 2) / (2 * 250.0**2))
    z = 900.0 + loma
    z_torres = z.copy()
    z_torres[30:33, 30:33] += 120.0  # torre de 30 m de lado
    z_torres[80:85, 90:94] += 60.0
    limpio = rl.quitar_edificios(z_torres, paso, radio_m=60.0, sigma_m=0.0)
    assert np.abs(limpio[30:33, 30:33] - z[30:33, 30:33]).max() < 3.0
    assert np.abs(limpio[80:85, 90:94] - z[80:85, 90:94]).max() < 3.0
    assert limpio[60, 60] == pytest.approx(z[60, 60], abs=4.0)  # la cima de la loma sigue ahí


def test_cotas_en_dem_y_sesgo():
    z = np.full((74, 93), 925.0)
    cotas = [{"valor": 920.0, "px": 5000.0, "py": 5000.0}, {"valor": 921.0, "px": 9000.0, "py": 7000.0},
             {"valor": 919.0, "px": 12000.0, "py": 3000.0}]
    r = rl.comparar_cotas(z, cotas)
    assert r["sesgo_m"] == pytest.approx(5.0)
    assert [c["dem_m"] for c in r["cotas"]] == pytest.approx([925.0] * 3)


def test_muestreo_bilineal_entre_celdas():
    z = np.array([[0.0, 10.0], [20.0, 30.0]])
    # centro de la grilla de 2×2 = mitad de la hoja: promedio de las cuatro
    assert rl.altura_en(z, rl.ANCHO_PX / 2, rl.ALTO_PX / 2) == pytest.approx(15.0)
    assert rl.altura_en(z, rl.ANCHO_PX / 4, rl.ALTO_PX / 4) == pytest.approx(0.0)


def test_corregir_quita_el_sesgo_y_tiende_a_las_cotas_cerca():
    z = np.full((370, 465), 925.0)  # celdas de 20 m
    cotas = [{"valor": 918.0, "px": 9000.0, "py": 7000.0}, {"valor": 922.0, "px": 9300.0, "py": 7000.0}]
    c = rl.corregir(z, cotas, radio_m=150.0)
    # lejos: solo el sesgo (mediana de −7 y −3 = −5)
    assert c[2, 2] == pytest.approx(920.0, abs=0.01)
    assert rl.altura_en(c, 9000.0, 7000.0) == pytest.approx(918.0, abs=1.0)
    assert rl.altura_en(c, 9300.0, 7000.0) == pytest.approx(922.0, abs=1.0)


def test_codificar_y_decodificar_relieve_bin():
    z = np.array([[900.04, 901.26, 2750.0], [0.0, 10.0, 20.0]])
    datos = rl.codificar(z)
    assert len(datos) == 2 * (2 + 6)
    u = np.frombuffer(datos, dtype="<u2")
    assert list(u[:2]) == [3, 2]
    assert list(u[2:5]) == [9000, 9013, 27500]
    assert np.allclose(rl.decodificar(datos), np.round(z * 10) / 10)


def test_codificar_rechaza_alturas_fuera_de_rango():
    with pytest.raises(ValueError):
        rl.codificar(np.array([[-5.0]]))
    with pytest.raises(ValueError):
        rl.codificar(np.array([[7000.0]]))
