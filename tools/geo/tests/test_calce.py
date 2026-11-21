"""Tests del calce de planos viejos sobre el mosaico de 1936 (damero sintético)."""
import cv2
import numpy as np
import pytest

import calce as ca


def damero(forma=(600, 700), paso=50.0, ancho=6, origen=(80.0, 60.0), angulo_grados=0.0):
    """Imagen de callejidad: 1 en las calles de un damero rotado, 0 en las manzanas."""
    alto, ancho_img = forma
    yy, xx = np.mgrid[0:alto, 0:ancho_img].astype(float)
    a = np.deg2rad(angulo_grados)
    u = (xx - origen[0]) * np.cos(a) + (yy - origen[1]) * np.sin(a)
    v = -(xx - origen[0]) * np.sin(a) + (yy - origen[1]) * np.cos(a)
    du = np.abs((u / paso) - np.round(u / paso)) * paso
    dv = np.abs((v / paso) - np.round(v / paso)) * paso
    return ((du <= ancho / 2) | (dv <= ancho / 2)).astype(np.float32)


# --- callejidad -------------------------------------------------------------------------

def test_callejidad_marca_claro_como_calle_segun_el_perfil():
    # Arrange: mitad papel claro (calle), mitad manzana oscura
    img = np.zeros((20, 40, 3), np.uint8)
    img[:, :20] = (240, 235, 220)
    img[:, 20:] = (120, 110, 100)
    perfil = {"canal": "L", "umbral": 180, "sentido": "mayor", "suavizado_px": 0}

    # Act
    c = ca.callejidad(img, perfil)

    # Assert
    assert c.dtype == np.float32
    assert c[:, :15].mean() > 0.9
    assert c[:, 25:].mean() < 0.1


def test_callejidad_por_canal_b_menor():
    img = np.zeros((10, 20, 3), np.uint8)
    img[:, :10] = (234, 220, 188)   # calle crema (b* bajo)
    img[:, 10:] = (236, 212, 168)   # manzana durazno (b* alto)
    c = ca.callejidad(img, {"canal": "b", "umbral": 148, "sentido": "menor", "suavizado_px": 0})
    assert c[:, :8].mean() > 0.8
    assert c[:, 12:].mean() < 0.2


def test_callejidad_alguna_toma_el_maximo_y_condiciones_el_producto():
    img = np.zeros((4, 30, 3), np.uint8)
    img[:, :10] = (240, 235, 220)   # claro y gris
    img[:, 10:20] = (200, 40, 40)   # rojo saturado
    img[:, 20:] = (120, 115, 110)   # manzana
    claro = {"canal": "L", "umbral": 180, "sentido": "mayor"}
    saturado = {"canal": "s", "umbral": 120, "sentido": "mayor"}
    alguna = ca.callejidad(img, {"alguna": [claro, saturado]})
    todas = ca.callejidad(img, {"condiciones": [claro, saturado]})
    assert alguna[:, :20].min() > 0.9 and alguna[:, 20:].max() < 0.1
    assert todas.max() < 0.1


def test_callejidad_rechaza_canal_desconocido():
    with pytest.raises(ValueError):
        ca.callejidad(np.zeros((4, 4, 3), np.uint8), {"canal": "zz", "umbral": 1, "sentido": "mayor"})


# --- correlación ----------------------------------------------------------------------------

def test_malla_respeta_radio_y_margen():
    puntos = ca.malla((100, 200), paso=10, centro=(100, 50), radio=30, margen=25)
    assert len(puntos) > 0
    assert np.all(np.hypot(puntos[:, 0] - 100, puntos[:, 1] - 50) <= 30)
    assert puntos[:, 1].min() >= 25 and puntos[:, 1].max() < 75


def test_corrimiento_recupera_el_desplazamiento_entre_dameros():
    # Arrange: el "móvil" es el damero corrido (+7, −4) px
    base = damero(angulo_grados=12)
    movil = damero(angulo_grados=12, origen=(87.0, 56.0))

    # Act
    d, calidad = ca.corrimiento(base, movil, (300, 300), ventana=40, busqueda=15)

    # Assert: el contenido del móvil en p está en la base en p + d
    assert d == pytest.approx((-7.0, 4.0), abs=0.5)
    assert calidad > 0.9


def test_corrimiento_descarta_ventanas_sin_calles():
    vacio = np.zeros((200, 200), np.float32)
    d, calidad = ca.corrimiento(vacio, vacio, (100, 100), ventana=30, busqueda=10)
    assert d is None and calidad == 0.0


def test_enlaces_devuelve_pares_movil_base():
    base = damero()
    movil = damero(origen=(84.0, 63.0))
    pares = ca.enlaces(base, movil, [(250.0, 250.0), (5.0, 5.0)], ventana=40, busqueda=12, calidad_minima=0.5)
    assert len(pares) == 1
    (mx, my), (bx, by), calidad = pares[0]
    assert (bx - mx, by - my) == pytest.approx((-4.0, -3.0), abs=0.5)


def test_calzar_recupera_una_deformacion_conocida():
    # Arrange: "1936" = damero; el plano viejo es el mismo damero girado 5°, a escala 0,8 y
    # con una ondulación suave; los manuales son cuatro esquinas leídas con error de 2 px.
    base = damero(forma=(900, 900), paso=50.0, origen=(25.0, 25.0))

    def a_base(px, py):  # viejo → base (la verdad)
        a = np.deg2rad(5)
        x = (np.cos(a) * px - np.sin(a) * py) / 0.8 + 60 + 4 * np.sin(py / 90)
        y = (np.sin(a) * px + np.cos(a) * py) / 0.8 + 20
        return x, y

    yy, xx = np.mgrid[0:760, 0:760].astype(np.float32)
    bx, by = a_base(xx, yy)
    viejo = cv2.remap(base, bx.astype(np.float32), by.astype(np.float32), cv2.INTER_LINEAR)
    rng = np.random.default_rng(3)
    manuales = []
    for px, py in ((300, 300), (360, 300), (300, 360), (360, 360)):
        x, y = a_base(px, py)
        manuales.append({"px": px + rng.uniform(-2, 2), "py": py + rng.uniform(-2, 2),
                         "x36": float(x), "y36": float(y), "manual": True, "nota": "prueba"})
    contexto = {"factor_base": 1, "factor_viejo": 1, "metro": 1.0, "plaza": (450.0, 400.0),
                "umbral_residuo_m": 6.0, "suavizado": 0.0}
    etapas = ({"radio_m": 200, "paso_m": 40, "ventana_m": 30, "busqueda_m": 15, "calidad": 0.5},
              {"radio_m": 500, "paso_m": 35, "ventana_m": 30, "busqueda_m": 8, "calidad": 0.5})

    # Act
    calce, gcps, _ = ca.calzar(base, viejo, manuales, contexto, etapas)

    # Assert
    assert len(gcps) > 40
    px, py = np.array([200.0, 500.0, 380.0]), np.array([250.0, 450.0, 600.0])
    x, y = calce.a_1936(px, py)
    rx, ry = a_base(px, py)
    assert np.max(np.hypot(x - rx, y - ry)) < 2.5


def test_enlaces_no_usan_ventanas_que_tocan_lo_que_queda_fuera_del_area_util():
    # Arrange: el viejo es el mismo damero; su mitad izquierda (x < 300) es "leyenda"
    base = damero(forma=(600, 600), paso=50.0, origen=(25.0, 25.0))
    viejo = base.copy()
    util = np.ones(viejo.shape, bool)
    util[:, :300] = False
    manuales = [{"px": float(x), "py": float(y), "x36": float(x), "y36": float(y), "manual": True}
                for x in (100.0, 500.0) for y in (100.0, 500.0)]
    calce = ca.Calce.ajustar(manuales, metro=1.0)
    etapa = {"radio_m": 400, "paso_m": 20, "ventana_m": 30, "busqueda_m": 10, "calidad": 0.5}
    contexto = {"factor_base": 1, "factor_viejo": 1, "metro": 1.0, "plaza": (300.0, 300.0)}

    # Act
    sin_mascara = ca._enlaces_de_etapa(base, viejo, calce, etapa, contexto)
    con_mascara = ca._enlaces_de_etapa(base, viejo, calce, etapa, {**contexto, "util": util})

    # Assert: sin máscara hay enlaces en la leyenda; con máscara, ninguna ventana la toca
    assert any(g["px"] < 300 for g in sin_mascara)
    assert con_mascara and min(g["px"] for g in con_mascara) >= 300 + 30


def _gcps_afines(n=6, ruido=0.0, semilla=0):
    rng = np.random.default_rng(semilla)
    gcps = []
    for i in range(n):
        for j in range(n):
            px, py = 100 + 60.0 * i, 80 + 60.0 * j
            x36 = 2 * px + 0.3 * py + 500 + rng.normal(0, ruido)
            y36 = -0.3 * px + 2 * py + 900 + rng.normal(0, ruido)
            gcps.append({"i": i, "j": j, "px": px, "py": py, "x36": x36, "y36": y36})
    return gcps


def test_ajustar_calce_ida_y_vuelta():
    # Arrange
    gcps = _gcps_afines()

    # Act
    calce = ca.Calce.ajustar(gcps, metro=0.5)
    x36, y36 = calce.a_1936(np.array([190.0]), np.array([170.0]))
    px, py = calce.al_viejo(x36, y36)

    # Assert
    assert x36[0] == pytest.approx(2 * 190 + 0.3 * 170 + 500, abs=0.01)
    assert (px[0], py[0]) == pytest.approx((190.0, 170.0), abs=0.05)


def test_residuos_en_metros_con_puntos_exactos_son_casi_cero():
    calce = ca.Calce.ajustar(_gcps_afines(), metro=0.5)
    r = calce.residuos_m()
    assert r["n"] == 36
    assert r["rms"] < 0.01 and r["max"] < 0.01


def test_depurar_quita_el_punto_mal_emparejado():
    # Arrange: un GCP corrido una manzana entera
    gcps = _gcps_afines(n=7, ruido=0.5)
    gcps[20] = {**gcps[20], "x36": gcps[20]["x36"] + 120}

    # Act
    limpios, quitados = ca.depurar(gcps, metro=0.5, umbral_m=15.0)

    # Assert
    assert [(g["i"], g["j"]) for g in quitados] == [(gcps[20]["i"], gcps[20]["j"])]
    assert len(limpios) == len(gcps) - 1


def test_depurar_respeta_los_manuales():
    gcps = _gcps_afines(n=5)
    gcps[3] = {**gcps[3], "x36": gcps[3]["x36"] + 80, "manual": True}
    limpios, quitados = ca.depurar(gcps, metro=0.5, umbral_m=10.0)
    assert quitados == [] or all(not g.get("manual") for g in quitados)
    assert any(g.get("manual") for g in limpios)


# --- deformación --------------------------------------------------------------------------

def test_cobertura_y_deformacion_llevan_el_plano_al_mosaico():
    # Arrange: plano viejo 200×200 con un cuadro rojo; el 1936 es el viejo ×2 corrido (100, 50)
    viejo = np.full((200, 200, 3), 255, np.uint8)
    viejo[50:70, 80:100] = (255, 0, 0)
    gcps = [{"px": float(x), "py": float(y), "x36": 2.0 * x + 100, "y36": 2.0 * y + 50}
            for x in (0, 100, 199) for y in (0, 100, 199)]
    calce = ca.Calce.ajustar(gcps, metro=0.5)

    # Act
    recorte = ca.cobertura(calce, forma_viejo=viejo.shape[:2], forma_1936=(1000, 1000), margen_px=0)
    rgba = ca.deformar(viejo, calce, recorte, paso=8)

    # Assert
    x0, y0, x1, y1 = recorte
    assert (x0, y0) == pytest.approx((100, 50), abs=3)
    assert (x1, y1) == pytest.approx((500, 450), abs=3)
    assert rgba.shape == (y1 - y0, x1 - x0, 4)
    cx, cy = int(2 * 90 + 100 - x0), int(2 * 60 + 50 - y0)
    assert tuple(rgba[cy, cx]) == (255, 0, 0, 255)


def test_deformar_deja_transparente_lo_que_cae_fuera_del_plano():
    viejo = np.full((100, 100, 3), 200, np.uint8)
    gcps = [{"px": float(x), "py": float(y), "x36": x + 50.0, "y36": y + 50.0}
            for x in (0, 50, 99) for y in (0, 50, 99)]
    calce = ca.Calce.ajustar(gcps, metro=0.5)
    rgba = ca.deformar(viejo, calce, (0, 0, 200, 200), paso=4)
    assert rgba[10, 10, 3] == 0
    assert rgba[100, 100, 3] == 255


def test_superponer_mezcla_el_plano_viejo_sobre_1936():
    base = np.zeros((10, 10, 3), np.uint8)
    rgba = np.zeros((10, 10, 4), np.uint8)
    rgba[:5, :, :3] = 200
    rgba[:5, :, 3] = 255
    out = ca.superponer(base, rgba, opacidad=0.5)
    assert out[0, 0, 0] == 100
    assert out[9, 9, 0] == 0


def test_residuos_loo_rapidos_igualan_a_reajustar_sin_cada_punto():
    # Arrange
    from tps import ModeloTPS
    gcps = _gcps_afines(n=5, ruido=3.0, semilla=4)
    origen = np.array([[g["px"], g["py"]] for g in gcps])
    destino = np.array([[g["x36"], g["y36"]] for g in gcps])

    # Act
    rapidos = ca.residuos_loo_rapidos(origen, destino)
    lentos = ModeloTPS.ajustar([{"x_m": a, "y_m": b, "px": c, "py": d}
                                for (a, b), (c, d) in zip(origen, destino)]).residuos_loo()

    # Assert
    assert rapidos == pytest.approx(lentos, rel=1e-4, abs=1e-6)


def test_mascara_marco_recorta_y_excluye_leyendas():
    m = ca.mascara_marco((100, 200), marco=[10, 20, 190, 90], excluir=[[150, 20, 190, 50]])
    assert m.dtype == bool
    assert not m[5, 100] and m[60, 100]
    assert not m[30, 160] and m[60, 160]
    assert ca.mascara_marco((3, 4)).all()


def test_deformar_con_mascara_deja_transparente_la_leyenda():
    viejo = np.full((100, 100, 3), 200, np.uint8)
    gcps = [{"px": float(x), "py": float(y), "x36": x + 0.0, "y36": y + 0.0}
            for x in (0, 50, 99) for y in (0, 50, 99)]
    calce = ca.Calce.ajustar(gcps, metro=0.5)
    mascara = ca.mascara_marco((100, 100), excluir=[[0, 0, 50, 100]])
    rgba = ca.deformar(viejo, calce, (0, 0, 100, 100), paso=4, mascara=mascara)
    assert rgba[50, 20, 3] == 0 and rgba[50, 80, 3] == 255


def test_json_legible_escribe_un_gcp_por_linea_y_se_vuelve_a_leer():
    import json
    config = {"año": 1889, "gcps": [{"px": 1.0, "py": 2.0}, {"px": 3.0, "py": 4.0}]}
    texto = ca.json_legible(config)
    assert json.loads(texto) == config
    assert texto.count("\n") == 7
    assert json.loads(ca.json_legible({"año": 1})) == {"año": 1}


def test_json_legible_escribe_las_anclas_una_por_linea_como_los_gcp():
    import json
    config = {"año": 1772, "anclas": [{"px": 1.0, "id": "X1"}, {"px": 2.0, "id": "X2"}, {"px": 3.0, "id": "X3"}],
              "gcps": [{"px": 1.0, "py": 2.0}]}
    texto = ca.json_legible(config)
    assert json.loads(texto) == config
    assert '  {"px": 2.0, "id": "X2"},' in texto.splitlines()
    assert list(json.loads(texto)) == ["año", "anclas", "gcps"]


def test_calzar_sin_etapas_ajusta_solo_las_anclas_con_el_suavizado_de_la_config():
    # Arrange: anclas con ruido; sin etapas no hay correlación, pero el suavizado se respeta
    rng = np.random.default_rng(3)
    gcps = [{**g, "px": g["px"] + rng.normal(0, 2), "manual": True} for g in _gcps_afines()]
    contexto = {"metro": 0.5, "suavizado": 1.0, "umbral_residuo_m": 25}

    # Act
    calce, usados, quitados = ca.calzar(None, None, gcps, contexto, etapas=())

    # Assert
    assert usados == gcps and quitados == []
    assert calce.suavizado == 1.0
    assert calce.residuos_m()["n"] == len(gcps)


def test_leer_plano_aplica_la_paleta_de_un_tiff_indexado(tmp_path):
    import tifffile
    indices = np.array([[0, 1], [1, 0]], np.uint8)
    paleta = np.zeros((3, 256), np.uint16)
    paleta[:, 1] = (65535, 0, 32896)
    tifffile.imwrite(tmp_path / "p.tif", indices, photometric="palette", colormap=paleta)
    rgb = ca.leer_plano(tmp_path / "p.tif")
    assert rgb.shape == (2, 2, 3)
    assert tuple(rgb[0, 1]) == (255, 0, 128)
    cv2.imwrite(str(tmp_path / "p.png"), np.full((4, 4, 3), (10, 20, 30), np.uint8))
    assert tuple(ca.leer_plano(tmp_path / "p.png")[0, 0]) == (30, 20, 10)


def test_manuales_de_toma_la_esquina_de_1936_por_indice():
    config = {"semillas": [{"i": 1, "j": 0, "px": 5.0, "py": 6.0, "nota": "Torre"}],
              "anclas": [{"px": 1.0, "py": 2.0, "x36": 3.0, "y36": 4.0, "nota": "puente"}]}
    config_1936 = {"semillas": [{"i": 1, "j": 0, "px": 900.0, "py": 700.0}]}
    manuales = ca.manuales_de(config, config_1936)
    assert manuales[0] == {"px": 5.0, "py": 6.0, "x36": 900.0, "y36": 700.0, "manual": True, "nota": "Torre"}
    assert manuales[1]["manual"] is True and manuales[1]["x36"] == 3.0
