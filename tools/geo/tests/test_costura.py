"""Tests del relleno de la costura entre hojas (tools/geo/costura.py) con planos sintéticos.

Plano sintético: una cuadrícula de manzanas (calles E–O algo oblicuas y calles N–S), partida
por una franja vertical sin datos de ancho variable, como la que dejan las dos hojas de 1936.
"""
import json

import cv2
import numpy as np
import pytest
import tifffile

import costura as co
from segmentar_clases import CALLE, CERRO, EDIFICADO, EDIFICIO_PUBLICO, PATIO

PAPEL = (241, 230, 205)
ALTO, ANCHO = 420, 400
SEAM = 200
PENDIENTE = 0.10  # calles E–O que bajan hacia el este (como en el centro de Caracas)
PERIODO_EO, ANCHO_EO = 70, 12
COLUMNAS_NS = (60, 340)  # calles N–S lejos de la franja
ANCHO_NS = 12
COLOR_MANZANA = (225, 170, 115)
COLOR_CALLE = (245, 240, 228)


def _cuadricula():
    """Clases verdaderas: manzanas edificadas entre calles."""
    f, c = np.mgrid[0:ALTO, 0:ANCHO]
    eje = (f - PENDIENTE * (c - SEAM)) % PERIODO_EO
    calle = eje < ANCHO_EO
    for x in COLUMNAS_NS:
        calle |= np.abs(c - x) < ANCHO_NS // 2
    return np.where(calle, CALLE, EDIFICADO).astype(np.uint8)


def _franja(alto=ALTO):
    """Hueco [ini, fin) por fila: 4 px al norte, ~40 px al sur."""
    f = np.arange(alto)
    ini = (SEAM - 2 - 0.03 * f).round().astype(int)
    fin = (SEAM + 2 + 0.06 * f).round().astype(int)
    return ini, fin


def _mascara(ini, fin, forma=(ALTO, ANCHO)):
    c = np.arange(forma[1])[None, :]
    return (c >= ini[:, None]) & (c < fin[:, None])


def _plano_cortado():
    verdad = _cuadricula()
    ini, fin = _franja()
    hueco = _mascara(ini, fin)
    rng = np.random.default_rng(1)
    imagen = np.where((verdad == CALLE)[..., None], COLOR_CALLE, COLOR_MANZANA).astype(np.int16)
    imagen = np.clip(imagen + rng.normal(0, 3, imagen.shape), 0, 250).astype(np.uint8)
    imagen[hueco] = PAPEL
    clases = verdad.copy()
    clases[hueco] = CALLE  # la segmentación ve papel liso: calle
    return verdad, imagen, clases, hueco


# ------------------------------------------------------------------ hueco

def test_detecta_la_franja_de_papel_exacta_fila_por_fila():
    _, imagen, _, hueco = _plano_cortado()
    tramos = co.hueco_de_imagen(imagen, columna=SEAM, banda=80)
    assert np.array_equal(tramos.mascara((ALTO, ANCHO)), hueco)


def test_ignora_pixeles_sueltos_color_papel_lejos_de_la_franja():
    _, imagen, _, hueco = _plano_cortado()
    imagen[100, 150] = PAPEL
    imagen[300:303, 250:253] = PAPEL
    tramos = co.hueco_de_imagen(imagen, columna=SEAM, banda=80)
    assert np.array_equal(tramos.mascara((ALTO, ANCHO)), hueco)


def test_sin_franja_no_hay_hueco():
    imagen = np.full((50, 60, 3), 200, np.uint8)
    tramos = co.hueco_de_imagen(imagen, columna=30, banda=20)
    assert not tramos.mascara((50, 60)).any()
    assert tramos.filas() == 0


def test_ensanchar_respeta_los_bordes_de_la_imagen():
    tramos = co.Tramos(np.array([0, 5, 3]), np.array([2, 5, 9]))
    ancho = tramos.ensanchar(3, ancho=10)
    assert ancho.ini.tolist() == [0, 5, 0]
    assert ancho.fin.tolist() == [5, 5, 10]  # la fila vacía sigue vacía


# ------------------------------------------------------------------ clases

def test_continua_las_calles_que_cruzan_la_franja():
    verdad, _, clases, hueco = _plano_cortado()
    ini, fin = _franja()
    nuevas = co.rellenar_clases(clases, co.Tramos(ini, fin))
    cruces = 0
    for f0 in range(0, ALTO, PERIODO_EO):
        cols = np.arange(int(ini.min()), int(fin.max()))
        filas = np.round(f0 + ANCHO_EO / 2 + PENDIENTE * (cols - SEAM)).astype(int)
        dentro = (filas >= 0) & (filas < ALTO)
        filas, cols = filas[dentro], cols[dentro]
        en_hueco = hueco[filas, cols]
        if en_hueco.sum() < 3:
            continue
        cruces += 1
        # el eje de cada calle E–O sigue siendo calle al cruzar la franja
        assert np.all(nuevas[filas[en_hueco], cols[en_hueco]] == CALLE)
    assert cruces >= 5
    acierto = np.mean(nuevas[hueco] == verdad[hueco])
    assert acierto > 0.9


def test_cierra_las_manzanas_sin_avenida_falsa():
    verdad, _, clases, hueco = _plano_cortado()
    ini, fin = _franja()
    nuevas = co.rellenar_clases(clases, co.Tramos(ini, fin))
    # ninguna columna de la franja queda calle de punta a punta a lo largo de una manzana
    for f0 in range(ANCHO_EO + 4, ALTO - PERIODO_EO, PERIODO_EO):
        f1 = f0 + PERIODO_EO - ANCHO_EO - 14
        for c in range(int(ini[f1]), int(fin[f0])):
            assert not np.all(nuevas[f0:f1, c] == CALLE)
    # y las mitades de cada manzana quedan unidas
    manzanas = (nuevas == EDIFICADO).astype(np.uint8)
    _, etiquetas = cv2.connectedComponents(manzanas, connectivity=4)
    fila = 3 * PERIODO_EO + ANCHO_EO + 25
    izq = etiquetas[fila, int(ini[fila]) - 10]
    der = etiquetas[int(round(fila + PENDIENTE * 50)), int(fin[fila]) + 40]
    assert izq != 0 and izq == der


def test_no_toca_nada_fuera_del_hueco():
    _, _, clases, hueco = _plano_cortado()
    ini, fin = _franja()
    nuevas = co.rellenar_clases(clases, co.Tramos(ini, fin))
    assert np.array_equal(nuevas[~hueco], clases[~hueco])
    assert nuevas is not clases


def test_no_muta_la_entrada():
    _, _, clases, _ = _plano_cortado()
    copia = clases.copy()
    ini, fin = _franja()
    co.rellenar_clases(clases, co.Tramos(ini, fin))
    assert np.array_equal(clases, copia)


def test_una_franja_vacia_devuelve_las_clases_iguales():
    clases = _cuadricula()
    vacio = co.Tramos(np.zeros(ALTO, int), np.zeros(ALTO, int))
    assert np.array_equal(co.rellenar_clases(clases, vacio), clases)


def test_desplazamiento_sigue_las_calles_oblicuas():
    izq = np.zeros(300, np.uint8)
    der = np.zeros(300, np.uint8)
    for f0 in range(10, 280, 50):
        izq[f0:f0 + 10] = 1
        der[f0 + 7:f0 + 17] = 1  # la misma calle aparece 7 filas más abajo del otro lado
    s = co.desplazamientos(izq, der, s_max=np.full(300, 12), ventana=61)
    assert np.median(s[40:260]) == 7


def test_extiende_el_tramo_sobre_el_cerro_falso_pegado_a_la_franja():
    verdad, _, clases, hueco = _plano_cortado()
    ini, fin = _franja()
    sucio = clases.copy()
    cv2.circle(sucio, (int(fin[300]) + 5, 300), 14, int(CERRO), -1)  # mancha de la segmentación
    tramos = co.extender_contaminacion(sucio, co.Tramos(ini, fin), clase=CERRO, radio=30)
    assert tramos.fin[300] >= fin[300] + 19
    assert tramos.fin[100] == fin[100]  # donde no hay mancha, igual
    nuevas = co.rellenar_clases(sucio, tramos)
    assert not np.any(nuevas == CERRO)


def test_no_extiende_sobre_cerro_que_no_toca_la_franja():
    _, _, clases, _ = _plano_cortado()
    ini, fin = _franja()
    sucio = clases.copy()
    sucio[300:310, int(fin[300]) + 6:int(fin[300]) + 20] = CERRO
    tramos = co.extender_contaminacion(sucio, co.Tramos(ini, fin), clase=CERRO, radio=30)
    assert tramos.fin[305] == fin[305]


# ------------------------------------------------------------------ imagen

def test_rellena_la_imagen_con_el_color_de_cada_clase():
    verdad, imagen, clases, hueco = _plano_cortado()
    ini, fin = _franja()
    tramos = co.Tramos(ini, fin)
    nuevas = co.rellenar_clases(clases, tramos)
    salida = co.rellenar_imagen(imagen, nuevas, tramos, muestras=clases)
    assert np.array_equal(salida[~hueco], imagen[~hueco])
    assert not np.any(np.all(salida[hueco] == PAPEL, axis=1))
    interior = cv2.erode(hueco.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    calle = interior & (nuevas == CALLE) & (cv2.erode((nuevas == CALLE).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0)
    manzana = interior & (cv2.erode((nuevas == EDIFICADO).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0)
    assert np.abs(np.median(salida[calle], axis=0) - COLOR_CALLE).max() < 8
    assert np.abs(np.median(salida[manzana], axis=0) - COLOR_MANZANA).max() < 8


def test_dibuja_el_borde_de_las_manzanas_y_es_determinista():
    _, imagen, clases, _ = _plano_cortado()
    tramos = co.Tramos(*_franja())
    nuevas = co.rellenar_clases(clases, tramos)
    a = co.rellenar_imagen(imagen, nuevas, tramos, muestras=clases, semilla=3)
    b = co.rellenar_imagen(imagen, nuevas, tramos, muestras=clases, semilla=3)
    assert np.array_equal(a, b)
    hueco = tramos.mascara(clases.shape)
    assert (a[hueco].min(axis=1) < 110).any()  # trazo de tinta entre calle y manzana


# ------------------------------------------------------------------ todo junto

def test_coser_rellena_imagen_y_clases_y_marca_lo_reconstruido():
    verdad, imagen, clases, hueco = _plano_cortado()
    clases[hueco & (np.arange(ANCHO)[None, :] < SEAM)] = PATIO
    res = co.coser(imagen, clases, columna=SEAM, banda=80, margen_imagen=0, margen_clases=0)
    assert np.array_equal(res.mascara > 0, hueco)
    assert np.array_equal(res.clases[~hueco], clases[~hueco])
    assert np.array_equal(res.imagen[~hueco], imagen[~hueco])
    assert np.mean(res.clases[hueco] == verdad[hueco]) > 0.9
    assert res.meta["filas"] == ALTO
    assert res.meta["ancho_max_m"] == pytest.approx(co.Tramos(*_franja()).anchos().max() * 0.5)


def test_coser_con_margen_marca_aparte_lo_que_solo_cambia_en_clases():
    _, imagen, clases, hueco = _plano_cortado()
    res = co.coser(imagen, clases, columna=SEAM, banda=80, margen_imagen=1, margen_clases=3)
    solo_clases = res.mascara == co.MARCA_CLASES
    assert solo_clases.any()
    assert np.array_equal(res.imagen[res.mascara == 0], imagen[res.mascara == 0])
    assert np.array_equal(res.imagen[solo_clases], imagen[solo_clases])
    assert set(np.unique(res.mascara)) <= {0, co.MARCA_CLASES, co.MARCA_IMAGEN}


def test_los_edificios_publicos_se_continuan_rayados():
    clases = np.full((120, 120), EDIFICIO_PUBLICO, np.uint8)
    clases[:, :10] = CALLE
    imagen = np.full((120, 120, 3), 200, np.uint8)
    imagen[:, 55:65] = PAPEL
    clases[:, 55:65] = CALLE
    res = co.coser(imagen, clases, columna=60, banda=30, margen_imagen=0, margen_clases=0)
    assert np.all(res.clases[:, 55:65] == EDIFICIO_PUBLICO)
    tinta = res.imagen[:, 56:64].min(axis=2) < 120
    assert 0.05 < tinta.mean() < 0.5


def test_las_casas_sueltas_no_se_estiran_a_lo_ancho_de_la_franja():
    clases = np.full((300, 200), CALLE, np.uint8)
    rng = np.random.default_rng(4)
    for _ in range(40):  # casas sueltas de 8 a 14 px sobre terreno abierto
        f, c = rng.integers(0, 290), rng.integers(0, 190)
        clases[f:f + 8, c:c + 10] = EDIFICADO
    ini, fin = np.full(300, 70), np.full(300, 130)  # 30 m de franja
    clases[:, 70:130] = CALLE
    nuevas = co.rellenar_clases(clases, co.Tramos(ini, fin))
    medio = nuevas[:, 70 + co.EXTRUSION_PX + 3:130 - co.EXTRUSION_PX - 3]
    assert np.mean(medio == CALLE) > 0.95


def test_casas_que_casan_por_azar_no_forman_barras_en_terreno_abierto():
    clases = np.full((300, 200), CALLE, np.uint8)
    clases[100:108, 55:70] = EDIFICADO   # una casa a cada lado, a la misma altura
    clases[100:108, 130:145] = EDIFICADO
    ini, fin = np.full(300, 70), np.full(300, 130)
    nuevas = co.rellenar_clases(clases, co.Tramos(ini, fin))
    assert np.all(nuevas[95:113, 70 + co.EXTRUSION_PX + 3:130 - co.EXTRUSION_PX - 3] == CALLE)


def test_coser_deja_intacto_lo_que_queda_fuera_del_marco():
    _, imagen, clases, hueco = _plano_cortado()
    res = co.coser(imagen, clases, columna=SEAM, banda=80, margen_imagen=0, margen_clases=0,
                   filas=(100, 300))
    dentro = np.zeros(ALTO, bool)
    dentro[100:300] = True
    assert np.array_equal(res.mascara > 0, hueco & dentro[:, None])
    assert np.array_equal(res.imagen[~dentro], imagen[~dentro])
    assert np.array_equal(res.clases[~dentro], clases[~dentro])


def test_coser_rechaza_formas_distintas():
    with pytest.raises(ValueError):
        co.coser(np.zeros((10, 10, 3), np.uint8), np.zeros((10, 11), np.uint8), columna=5)


# ------------------------------------------------------------------ CLI

def _meta_json(ruta, columna, ancho, alto):
    meta = {"metro": 0.5, "origen_m": [-100.0, 0.0], "costura_m": -100.0 + columna * 0.5,
            "marco": [0, 0, ancho, alto]}
    ruta.write_text(json.dumps(meta))


def test_cli_escribe_imagen_clases_mascara_y_meta(tmp_path):
    _, imagen, clases, hueco = _plano_cortado()
    tifffile.imwrite(str(tmp_path / "mosaico.tif"), imagen, photometric="rgb")
    seg = tmp_path / "seg"
    seg.mkdir()
    cv2.imwrite(str(seg / "clases.png"), clases)
    _meta_json(tmp_path / "mosaico.json", SEAM, ANCHO, ALTO)
    codigo = co.main(["--mosaico", str(tmp_path / "mosaico.tif"), "--meta", str(tmp_path / "mosaico.json"),
                      "--clases", str(seg / "clases.png"), "--banda", "80"])
    assert codigo == 0
    salida = tifffile.imread(str(tmp_path / "mosaico-costura.tif"))
    assert not np.any(np.all(salida[hueco] == PAPEL, axis=1))
    assert cv2.imread(str(seg / "clases-costura.png"), cv2.IMREAD_UNCHANGED).shape == clases.shape
    mascara = cv2.imread(str(tmp_path / "costura-mascara.png"), cv2.IMREAD_UNCHANGED)
    assert np.all(mascara[hueco] == co.MARCA_IMAGEN)
    info = json.loads((tmp_path / "costura.json").read_text())
    assert info["columna_costura"] == SEAM and info["filas"] > 0
    assert (tmp_path / "qa-costura.jpg").exists()
    assert np.array_equal(tifffile.imread(str(tmp_path / "mosaico.tif")), imagen)  # el original queda


def test_cli_falla_si_las_clases_no_son_de_un_canal(tmp_path):
    tifffile.imwrite(str(tmp_path / "m.tif"), np.zeros((20, 20, 3), np.uint8), photometric="rgb")
    cv2.imwrite(str(tmp_path / "c.png"), np.zeros((20, 20, 3), np.uint8))
    _meta_json(tmp_path / "m.json", 10, 20, 20)
    assert co.main(["--mosaico", str(tmp_path / "m.tif"), "--meta", str(tmp_path / "m.json"),
                    "--clases", str(tmp_path / "c.png")]) == 1
