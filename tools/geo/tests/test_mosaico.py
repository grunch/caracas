"""Tests del rectificado y mosaico métrico sobre hojas sintéticas."""
import numpy as np
import pytest

import cuadricula as cu
import mosaico as mo
import qa


def _gcps_verdaderos(deformacion, xs_m, ys_m):
    gcps = []
    for x in xs_m:
        for y in ys_m:
            px, py = deformacion(x, y)
            gcps.append({"x_m": x, "y_m": y, "px": float(px), "py": float(py)})
    return gcps


def _picos(perfil, umbral):
    """Centros (subpíxel) de los tramos del perfil por encima del umbral."""
    sobre = perfil > umbral
    picos, i = [], 0
    while i < len(perfil):
        if sobre[i]:
            j = i
            while j < len(perfil) and sobre[j]:
                j += 1
            w = perfil[i:j]
            picos.append(float(np.sum(np.arange(i, j) * w) / np.sum(w)))
            i = j
        else:
            i += 1
    return picos


def test_rejilla_metrica_convierte_pixel_a_metros():
    rejilla = mo.Rejilla(origen_m=(-100.0, 200.0), metro=0.5, ancho=400, alto=600)
    x, y = rejilla.metros(np.array([0.0, 399.0]), np.array([0.0, 599.0]))
    assert x.tolist() == pytest.approx([-99.75, 99.75])
    assert y.tolist() == pytest.approx([199.75, -99.75])
    px, py = rejilla.pixeles(np.array([0.0]), np.array([0.0]))
    assert (px[0], py[0]) == pytest.approx((199.5, 399.5))


def test_modelo_tps_pasa_por_los_gcps_y_da_residuos_loo(hoja_sintetica):
    # Arrange
    _, deformacion, xs_m, ys_m = hoja_sintetica
    gcps = _gcps_verdaderos(deformacion, xs_m, ys_m)

    # Act
    modelo = mo.ModeloHoja.ajustar(gcps)
    px, py = modelo.a_pixeles(np.array([xs_m[1]]), np.array([ys_m[2]]))
    residuos = modelo.residuos_loo()

    # Assert
    real = deformacion(xs_m[1], ys_m[2])
    assert px[0] == pytest.approx(real[0], abs=0.05)
    assert py[0] == pytest.approx(real[1], abs=0.05)
    assert len(residuos) == len(gcps)
    assert np.all(np.isfinite(residuos))


def test_rectificado_devuelve_las_lineas_de_cuadricula_a_su_sitio(hoja_sintetica):
    # Arrange
    img, deformacion, xs_m, ys_m = hoja_sintetica
    modelo = mo.ModeloHoja.ajustar(_gcps_verdaderos(deformacion, xs_m, ys_m))
    metro = 2.0
    rejilla = mo.Rejilla(origen_m=(xs_m[0] - 100, ys_m[0] + 100), metro=metro,
                         ancho=int((xs_m[-1] - xs_m[0] + 200) / metro),
                         alto=int((ys_m[0] - ys_m[-1] + 200) / metro))

    # Act
    salida = mo.rectificar(cu.HojaEnMemoria(img), modelo, rejilla, tesela=256, paso_malla=8)

    # Assert: en una fila central, los picos oscuros deben caer en las x de la cuadrícula
    gris = 255.0 - salida.max(axis=2).astype(float)
    fila = rejilla.alto // 2 + 37
    perfil = gris[fila - 2:fila + 3].mean(axis=0)
    picos = _picos(perfil, 120)
    esperados = rejilla.pixeles(np.array(xs_m), np.full(len(xs_m), ys_m[0]))[0]
    for e in esperados:
        assert min(abs(p - e) for p in picos) < 1.0


def test_mosaico_corta_en_la_costura_y_rellena_con_papel():
    # Arrange: dos hojas uniformes de colores distintos, mismo modelo afín
    gcps = [{"x_m": x, "y_m": y, "px": x + 50.0, "py": 50.0 - y}
            for x in (0.0, 100.0, 200.0) for y in (0.0, -100.0, -200.0)]
    hoja_a = cu.HojaEnMemoria(np.full((300, 300, 3), (255, 0, 0), np.uint8))
    hoja_b = cu.HojaEnMemoria(np.full((300, 300, 3), (0, 0, 255), np.uint8))
    modelo = mo.ModeloHoja.ajustar(gcps)
    rejilla = mo.Rejilla(origen_m=(-100.0, 100.0), metro=1.0, ancho=500, alto=400)

    # Act
    salida = mo.componer(rejilla, [(hoja_a, modelo, -1e9, 120.0), (hoja_b, modelo, 120.0, 1e9)],
                         tesela=128, paso_malla=8)

    # Assert
    assert tuple(salida[150, 150]) == (255, 0, 0)    # x = 50.5 m → hoja A
    assert tuple(salida[150, 230]) == (0, 0, 255)    # x = 130.5 m → hoja B
    assert tuple(salida[5, 5]) == mo.PAPEL           # fuera de ambas hojas


def test_mosaico_rellena_con_la_otra_hoja_donde_la_suya_no_llega():
    # Arrange: la hoja A solo cubre x < 100 m; la costura está en 150 m
    gcps = [{"x_m": x, "y_m": y, "px": x + 50.0, "py": 50.0 - y}
            for x in (0.0, 100.0, 200.0) for y in (0.0, -100.0, -200.0)]
    modelo = mo.ModeloHoja.ajustar(gcps)
    hoja_a = cu.HojaEnMemoria(np.full((300, 150, 3), (255, 0, 0), np.uint8))
    hoja_b = cu.HojaEnMemoria(np.full((300, 300, 3), (0, 0, 255), np.uint8))
    rejilla = mo.Rejilla(origen_m=(-100.0, 100.0), metro=1.0, ancho=500, alto=400)

    # Act
    salida = mo.componer(rejilla, [(hoja_a, modelo, -1e9, 150.0), (hoja_b, modelo, 150.0, 1e9)],
                         tesela=128, paso_malla=8)

    # Assert
    assert tuple(salida[150, 150]) == (255, 0, 0)    # x = 50.5 m: A
    assert tuple(salida[150, 230]) == (0, 0, 255)    # x = 130.5 m: A no llega → B


def test_verificar_cuadricula_mide_cero_en_un_raster_perfecto():
    # Arrange: ráster métrico con la cuadrícula en centros de píxel exactos
    rejilla = mo.Rejilla(origen_m=(-300.5, 300.5), metro=1.0, ancho=1200, alto=1100)
    img = np.full((rejilla.alto, rejilla.ancho, 3), mo.PAPEL, np.uint8)
    xs, ys = [-250.0, 0.0, 250.0, 500.0, 750.0], [250.0, 0.0, -250.0, -500.0, -750.0]
    for x in xs:
        c = int(round(float(rejilla.pixeles(x, 0)[0])))
        img[:, c] = 60
    for y in ys:
        f = int(round(float(rejilla.pixeles(0, y)[1])))
        img[f, :] = 60

    # Act
    informe = qa.verificar_cuadricula(img, rejilla, xs, ys, espaciado_m=250.0)

    # Assert
    assert informe["n"] == len(xs) * len(ys)
    assert informe["rms_m"] < 0.2
    assert informe["desvio_lineas_max_m"] < 0.3


def test_fondo_blanco_del_escaner_en_el_borde_no_cuenta_como_hoja():
    # Arrange: la hoja B tiene 40 px de blanco puro (cama del escáner) en su borde izquierdo
    gcps = [{"x_m": x, "y_m": y, "px": x + 50.0, "py": 50.0 - y}
            for x in (0.0, 100.0, 200.0) for y in (0.0, -100.0, -200.0)]
    modelo = mo.ModeloHoja.ajustar(gcps)
    pixeles = np.full((300, 300, 3), (0, 0, 255), np.uint8)
    pixeles[:, :40] = 255
    hoja_b = cu.HojaEnMemoria(pixeles, borde_fondo_px=60)
    rejilla = mo.Rejilla(origen_m=(-100.0, 100.0), metro=1.0, ancho=500, alto=400)

    # Act
    salida = mo.componer(rejilla, [(hoja_b, modelo, -1e9, 1e9)], tesela=128, paso_malla=8)

    # Assert
    assert tuple(salida[150, 70]) == mo.PAPEL        # x = -29.5 m → px 20: blanco de escáner
    assert tuple(salida[150, 200]) == (0, 0, 255)
