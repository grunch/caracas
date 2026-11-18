"""Tests de la detección de la cuadrícula métrica sobre hojas sintéticas."""
import json

import numpy as np
import pytest

import cuadricula as cu


def _semillas_con_error(deformacion, puntos, error_px=15.0):
    semillas = []
    for i, (x, y) in enumerate(puntos):
        px, py = deformacion(x, y)
        signo = 1 if i % 2 else -1
        semillas.append({"x_m": x, "y_m": y, "px": float(px) + signo * error_px,
                         "py": float(py) - signo * error_px})
    return semillas


def test_afin_desde_semillas_reproduce_una_afin_exacta():
    # Arrange
    puntos = [(0, 0), (1000, 0), (0, 1000), (1000, 1000)]
    semillas = [{"x_m": x, "y_m": y, "px": 10 + 2 * x + 0.1 * y, "py": 5 - 0.05 * x - 2 * y}
                for x, y in puntos]

    # Act
    modelo = cu.ModeloPolinomico.ajustar(semillas, grado=1)
    px, py = modelo(np.array([500.0]), np.array([250.0]))

    # Assert
    assert px[0] == pytest.approx(10 + 1000 + 25)
    assert py[0] == pytest.approx(5 - 25 - 500)


def test_afin_desde_semillas_exige_tres_puntos():
    with pytest.raises(ValueError, match="al menos"):
        cu.ModeloPolinomico.ajustar([{"x_m": 0, "y_m": 0, "px": 0, "py": 0}], grado=1)


def test_respuesta_lineas_resalta_linea_fina_oscura_y_no_la_roja():
    # Arrange: papel claro con una línea gris vertical y una roja vertical
    img = np.full((50, 60, 3), 240, np.uint8)
    img[:, 20:22] = 70
    img[:, 40:42] = (225, 90, 60)

    # Act
    r = cu.respuesta_lineas(img, ancho_kernel=9)

    # Assert
    perfil = r.mean(axis=0)
    assert perfil[20:22].min() > 100
    assert perfil[40:42].max() < 30


def test_trazar_camino_sigue_la_cresta_suave_y_salta_estorbos():
    # Arrange: cresta en offset 10 que deriva despacio; un estorbo fuerte aislado
    perfiles = np.zeros((40, 41))
    centro = 10 + np.round(np.linspace(0, 6, 40)).astype(int)
    perfiles[np.arange(40), centro + 20 - 10] = 3.0
    perfiles[20, 2] = 50.0

    # Act
    camino = cu.trazar_camino(perfiles, paso_max=2, penalizacion=0.2, tope=5.0)

    # Assert
    assert np.array_equal(camino, centro + 10)


def test_interseccion_de_dos_rectas():
    # vertical: x = 100 + 0.01 * y ; horizontal: y = 50 - 0.02 * x
    x, y = cu.interseccion_rectas((100.0, 0.01), (50.0, -0.02))
    assert x == pytest.approx(100 + 0.01 * y)
    assert y == pytest.approx(50 - 0.02 * x)


def test_detecta_todas_las_intersecciones_con_error_subpixel(hoja_sintetica):
    # Arrange
    img, deformacion, xs_m, ys_m = hoja_sintetica
    esquinas = [(xs_m[0], ys_m[0]), (xs_m[-1], ys_m[0]), (xs_m[0], ys_m[-1]), (xs_m[-1], ys_m[-1])]
    semillas = _semillas_con_error(deformacion, esquinas)
    hoja = cu.HojaEnMemoria(img)

    # Act
    gcps = cu.detectar_cuadricula(hoja, semillas, xs_m, ys_m, radio=50, bloque=24, ventana=160)

    # Assert
    assert len(gcps) == len(xs_m) * len(ys_m)
    errores = []
    for g in gcps:
        px, py = deformacion(g["x_m"], g["y_m"])
        errores.append(np.hypot(g["px"] - px, g["py"] - py))
    assert max(errores) < 1.0
    assert np.sqrt(np.mean(np.square(errores))) < 0.4


def test_descarta_interseccion_sin_lineas_visibles(hoja_sintetica):
    # Arrange: tapar una intersección interior con un recuadro de papel (como un cajetín)
    img, deformacion, xs_m, ys_m = hoja_sintetica
    img = img.copy()
    px, py = deformacion(xs_m[2], ys_m[3])
    img[int(py) - 150:int(py) + 150, int(px) - 150:int(px) + 150] = (241, 230, 205)
    esquinas = [(xs_m[0], ys_m[0]), (xs_m[-1], ys_m[0]), (xs_m[0], ys_m[-1]), (xs_m[-1], ys_m[-1])]
    semillas = _semillas_con_error(deformacion, esquinas)

    # Act
    gcps = cu.detectar_cuadricula(cu.HojaEnMemoria(img), semillas, xs_m, ys_m,
                                  radio=50, bloque=24, ventana=160)

    # Assert
    claves = {(g["x_m"], g["y_m"]) for g in gcps}
    assert (xs_m[2], ys_m[3]) not in claves
    assert len(gcps) == len(xs_m) * len(ys_m) - 1


def test_residuos_dejando_uno_fuera_marcan_el_atipico(hoja_sintetica):
    # Arrange
    _, deformacion, xs_m, ys_m = hoja_sintetica
    gcps = []
    for x in xs_m:
        for y in ys_m:
            px, py = deformacion(x, y)
            gcps.append({"x_m": x, "y_m": y, "px": float(px), "py": float(py)})
    gcps[7] = {**gcps[7], "px": gcps[7]["px"] + 30.0}

    # Act
    limpios, descartados = cu.descartar_atipicos(gcps, umbral_px=8.0)

    # Assert
    assert [(d["x_m"], d["y_m"]) for d in descartados] == [(gcps[7]["x_m"], gcps[7]["y_m"])]
    assert len(limpios) == len(gcps) - 1


def test_guardar_gcps_escribe_json_ordenado(tmp_path):
    gcps = [{"x_m": 500.0, "y_m": 0.0, "px": 2.0, "py": 3.0},
            {"x_m": 0.0, "y_m": 500.0, "px": 1.0, "py": 1.0}]
    ruta = tmp_path / "g.json"
    cu.guardar_gcps(ruta, gcps)
    leido = json.loads(ruta.read_text())
    assert [(g["x_m"], g["y_m"]) for g in leido] == [(0.0, 500.0), (500.0, 0.0)]
