"""Tests del modelo denso que usa también los tramos de línea trazados (no solo los cruces)."""
import numpy as np
import pytest

import cuadricula as cu
import lineas as li
from .conftest import Deformacion, dibujar_hoja
from tps import ModeloTPS


@pytest.fixture
def hoja_con_pliegue():
    # pliegue horizontal a media altura entre y=500 m e y=0 m con salto lateral de 5 px
    deformacion = Deformacion(pliegue_py=None)
    _, py_pliegue = deformacion(0.0, 250.0)
    deformacion = Deformacion(pliegue_py=float(py_pliegue), salto_px=5.0)
    xs_m = [-1000.0 + 500.0 * i for i in range(5)]
    ys_m = [1500.0 - 500.0 * i for i in range(6)]
    return dibujar_hoja(deformacion, xs_m, ys_m), deformacion, xs_m, ys_m


def _semillas(deformacion, xs_m, ys_m):
    return [{"x_m": x, "y_m": y, "px": float(deformacion(x, y)[0]), "py": float(deformacion(x, y)[1])}
            for x in (xs_m[0], xs_m[-1]) for y in (ys_m[0], ys_m[-1])]


def _detectar(img, deformacion, xs_m, ys_m):
    return cu.detectar_cuadricula(cu.HojaEnMemoria(img), _semillas(deformacion, xs_m, ys_m),
                                  xs_m, ys_m, radio=50, bloque=24, ventana=160,
                                  devolver_muestras=True)


def test_muestras_de_linea_caen_sobre_la_linea(hoja_con_pliegue):
    # Arrange
    img, deformacion, xs_m, ys_m = hoja_con_pliegue

    # Act
    _, muestras = _detectar(img, deformacion, xs_m, ys_m)

    # Assert: cada muestra de una vertical x=X está sobre la curva dibujada de esa línea
    verticales = [m for m in muestras if m["eje"] == "v"]
    assert len(verticales) > 100
    errores = []
    for m in verticales:
        yy = np.linspace(ys_m[-1], ys_m[0], 20001)
        px, py = deformacion(np.full_like(yy, m["x_m"]), yy)
        i = int(np.argmin(np.abs(py - m["py"])))
        errores.append(abs(px[i] - m["px"]))
    assert np.percentile(errores, 95) < 0.6


def test_modelo_de_lineas_sigue_el_pliegue_mejor_que_el_tps_de_cruces(hoja_con_pliegue):
    # Arrange
    img, deformacion, xs_m, ys_m = hoja_con_pliegue
    gcps, muestras = _detectar(img, deformacion, xs_m, ys_m)
    forma = img.shape[:2]

    # Act
    denso = li.ModeloLineas.ajustar(gcps, muestras, forma, paso_px=16)
    solo_cruces = ModeloTPS.ajustar(gcps)

    # Assert: puntos de las verticales a 30 m encima y debajo del pliegue
    x = np.array(xs_m[1:-1] * 2)
    y = np.array([280.0] * 3 + [220.0] * 3)
    real_px, real_py = deformacion(x, y)
    px_d, py_d = denso(x, y)
    px_t, _ = solo_cruces(x, y)
    assert np.max(np.abs(px_d - real_px)) < 1.0
    assert np.max(np.abs(px_t - real_px)) > 1.5


def test_inversa_densa_es_coherente(hoja_con_pliegue):
    # Arrange
    img, deformacion, xs_m, ys_m = hoja_con_pliegue
    gcps, muestras = _detectar(img, deformacion, xs_m, ys_m)
    denso = li.ModeloLineas.ajustar(gcps, muestras, img.shape[:2], paso_px=16)
    x = np.array([-800.0, 120.0, 900.0])
    y = np.array([1300.0, -20.0, -900.0])

    # Act
    px, py = denso(x, y)
    xm, ym = denso.a_metros(px, py)

    # Assert
    assert np.allclose(xm, x, atol=0.02) and np.allclose(ym, y, atol=0.02)
