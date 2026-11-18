"""Tests de la segmentación del plano DCN 1936 con imágenes SINTÉTICAS.

Se dibuja un plano de juguete con los colores del plano real (manzanas naranja con
borde negro, patios crema, cuadrícula de calles, texto negro y rojo, un edificio
público rayado, árboles verdes, un río azul rayado, un campo de cultivo y un marco)
y se verifica la clase asignada a cada zona.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

RAIZ = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(RAIZ / "tools" / "geo"))

import segmentar as sg  # noqa: E402
from segmentar_clases import (  # noqa: E402
    AGUA, CALLE, CERRO, CULTIVO, EDIFICADO, EDIFICIO_PUBLICO, MARGEN, PATIO, VERDE,
)
from segmentar_salidas import suelo_desde_clases  # noqa: E402

ESCALA = 0.32  # m/px, como el escaneo original a 400 ppi

CREMA = (253, 252, 225)
NARANJA = (245, 210, 164)
NEGRO = (70, 55, 55)
MARRON = (115, 100, 88)
ROJO = (215, 90, 75)
VERDE_ARBOL = (150, 205, 105)
VERDE_CULTIVO = (165, 225, 120)
AZUL = (120, 170, 215)
GRIS_CERRO = (205, 195, 175)
ROJO_CURVA = (230, 120, 90)

CALLE_ANCHO = 32
PASO = 300  # manzana + calle


def _ruido(img: np.ndarray, semilla: int = 0, sigma: float = 2.0) -> np.ndarray:
    rng = np.random.default_rng(semilla)
    sucio = img.astype(np.float32) + rng.normal(0, sigma, img.shape)
    return np.clip(sucio, 0, 255).astype(np.uint8)


def _manzana(img, gt, x0, y0, x1, y1):
    cv2.rectangle(img, (x0, y0), (x1, y1), NARANJA, -1)
    cv2.rectangle(img, (x0, y0), (x1, y1), NEGRO, 2)
    gt[y0:y1 + 1, x0:x1 + 1] = EDIFICADO


def _patio(img, gt, x0, y0, x1, y1):
    cv2.rectangle(img, (x0, y0), (x1, y1), CREMA, -1)
    cv2.rectangle(img, (x0, y0), (x1, y1), NEGRO, 2)
    gt[y0:y1 + 1, x0:x1 + 1] = PATIO


def _rayado(img, gt, x0, y0, x1, y1, paso=12):
    cv2.rectangle(img, (x0, y0), (x1, y1), NARANJA, -1)
    sub = img[y0:y1 + 1, x0:x1 + 1].copy()
    h, w = sub.shape[:2]
    for k in range(-h, w + h, paso):
        cv2.line(sub, (k, 0), (k + h, h), MARRON, 2, cv2.LINE_AA)
    img[y0:y1 + 1, x0:x1 + 1] = sub
    cv2.rectangle(img, (x0, y0), (x1, y1), NEGRO, 2)
    gt[y0:y1 + 1, x0:x1 + 1] = EDIFICIO_PUBLICO


def _arbol(img, gt, cx, cy, r=10):
    cv2.circle(img, (cx, cy), r, VERDE_ARBOL, -1, cv2.LINE_AA)
    cv2.ellipse(img, (cx, cy), (r - 3, r - 3), 0, 200, 340, NEGRO, 2, cv2.LINE_AA)
    cv2.circle(img, (cx, cy), r, (90, 120, 70), 1, cv2.LINE_AA)
    cv2.circle(gt, (cx, cy), r, VERDE, -1)


def plano_sintetico():
    """Devuelve (rgb, verdad, centros_arboles). 4x3 manzanas sobre calles crema."""
    alto, ancho = 2 * PASO + CALLE_ANCHO, 3 * PASO + CALLE_ANCHO
    img = np.full((alto, ancho, 3), CREMA, np.uint8)
    gt = np.full((alto, ancho), CALLE, np.uint8)
    arboles = []
    for fila in range(2):
        for col in range(3):
            x0 = col * PASO + CALLE_ANCHO
            y0 = fila * PASO + CALLE_ANCHO
            x1, y1 = x0 + PASO - CALLE_ANCHO - 1, y0 + PASO - CALLE_ANCHO - 1
            n = fila * 3 + col
            if n == 1:
                _rayado(img, gt, x0, y0, x1, y1)
                continue
            _manzana(img, gt, x0, y0, x1, y1)
            if n in (0, 2, 3):
                _patio(img, gt, x0 + 80, y0 + 90, x0 + 170, y0 + 170)
            if n == 4:
                # patio con forma de L y árboles dentro
                _patio(img, gt, x0 + 60, y0 + 60, x0 + 200, y0 + 200)
                for dx, dy in ((40, 40), (100, 40), (40, 100), (100, 100)):
                    cx, cy = x0 + 60 + dx, y0 + 60 + dy
                    _arbol(img, gt, cx, cy)
                    arboles.append((cx, cy))
    # texto negro grande sobre la calle horizontal del medio (espaciado como en el plano)
    yc = PASO + CALLE_ANCHO // 2 + 9
    for i, letra in enumerate("OESTE"):
        cv2.putText(img, letra, (120 + i * 110, yc), cv2.FONT_HERSHEY_SIMPLEX, 0.85, NEGRO, 3, cv2.LINE_AA)
    # texto negro sobre la calle vertical izquierda
    cv2.putText(img, "N", (8, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.8, NEGRO, 3, cv2.LINE_AA)
    # texto rojo (nombre de esquina) sobre una manzana
    cv2.putText(img, "Pineda", (60, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.9, ROJO, 2, cv2.LINE_AA)
    # línea roja punteada (tranvía) a lo largo de la calle horizontal
    for x in range(0, ancho, 9):
        cv2.circle(img, (x, PASO + CALLE_ANCHO // 2 - 6), 1, ROJO, -1)
    return _ruido(img), gt, arboles


def _interior(gt, clase, radio=3):
    m = (gt == clase).astype(np.uint8)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radio + 1, 2 * radio + 1))
    return cv2.erode(m, k).astype(bool)


def _exactitud(pred, gt, clase, radio=3):
    zona = _interior(gt, clase, radio)
    assert zona.any(), f"la verdad no tiene clase {clase}"
    return float((pred[zona] == clase).mean())


@pytest.fixture(scope="module")
def resultado_plano():
    rgb, gt, arboles = plano_sintetico()
    return rgb, gt, arboles, sg.segmentar(rgb, ESCALA)


def test_no_muta_la_entrada():
    rgb, _, _ = plano_sintetico()
    copia = rgb.copy()
    sg.segmentar(rgb, ESCALA)
    assert np.array_equal(rgb, copia)


def test_salida_tiene_tamano_y_tipo_de_la_entrada(resultado_plano):
    rgb, _, _, res = resultado_plano
    assert res.clases.shape == rgb.shape[:2]
    assert res.clases.dtype == np.uint8


@pytest.mark.parametrize("clase", [CALLE, PATIO, EDIFICADO, EDIFICIO_PUBLICO])
def test_exactitud_por_clase_al_menos_95(resultado_plano, clase):
    _, gt, _, res = resultado_plano
    assert _exactitud(res.clases, gt, clase) >= 0.95


def test_huecos_en_manzanas_son_patio(resultado_plano):
    _, gt, _, res = resultado_plano
    # centro del patio de la manzana 0
    y, x = CALLE_ANCHO + 130, CALLE_ANCHO + 125
    assert gt[y, x] == PATIO
    assert res.clases[y, x] == PATIO


def test_texto_no_corta_la_calle(resultado_plano):
    """La calle horizontal con 'OESTE' encima es una sola componente de calle."""
    _, gt, _, res = resultado_plano
    y0, y1 = PASO, PASO + CALLE_ANCHO
    banda = res.clases[y0 + 4:y1 - 4, :]
    assert (banda == CALLE).mean() >= 0.97
    calle = (res.clases == CALLE).astype(np.uint8)
    n, etiquetas = cv2.connectedComponents(calle, connectivity=4)
    ids = np.unique(etiquetas[y0 + 4:y1 - 4, :])
    ids = ids[ids > 0]
    assert len(ids) == 1


def test_texto_rojo_no_corta_la_manzana(resultado_plano):
    _, gt, _, res = resultado_plano
    zona = res.clases[95:118, 60:170]
    assert (zona == EDIFICADO).mean() >= 0.95


def test_arboles_detectados_a_menos_de_2_px(resultado_plano):
    _, _, arboles, res = resultado_plano
    assert len(res.arboles) == len(arboles)
    for cx, cy in arboles:
        d = min(np.hypot(a["x"] - cx, a["y"] - cy) for a in res.arboles)
        assert d <= 2.0
    for a in res.arboles:
        assert 6 <= a["r"] <= 14


def test_arboles_se_pintan_como_verde(resultado_plano):
    _, _, arboles, res = resultado_plano
    for cx, cy in arboles:
        assert res.clases[cy, cx] == VERDE


# --- agua, cultivo, cerro, margen ------------------------------------------------

def _lienzo(alto=500, ancho=500):
    return np.full((alto, ancho, 3), CREMA, np.uint8)


def test_rio_rayado_es_agua():
    img = _lienzo()
    for y in range(200, 280, 6):  # rayas azules paralelas del cauce
        cv2.line(img, (0, y), (499, y + 10), AZUL, 2, cv2.LINE_AA)
    res = sg.segmentar(_ruido(img), ESCALA)
    assert (res.clases[215:270, 20:480] == AGUA).mean() >= 0.95
    assert (res.clases[20:150, 20:480] == AGUA).mean() <= 0.01


def test_campo_de_cultivo():
    img = _lienzo()
    sub = img[100:400, 100:400]
    for k in range(-300, 600, 14):
        cv2.line(sub, (k, 0), (k + 150, 300), VERDE_CULTIVO, 2, cv2.LINE_AA)
    for yy in range(5, 300, 14):
        for xx in range(5, 300, 14):
            cv2.circle(sub, (xx, yy), 1, VERDE_CULTIVO, -1)
    cv2.rectangle(img, (100, 100), (399, 399), NEGRO, 1)
    res = sg.segmentar(_ruido(img), ESCALA)
    assert (res.clases[115:385, 115:385] == CULTIVO).mean() >= 0.95
    assert (res.clases[0:80, :] == CULTIVO).mean() <= 0.01
    assert len(res.arboles) == 0


def test_cerro_con_curvas_y_punteado():
    img = _lienzo(600, 600)
    gt = np.full(img.shape[:2], CALLE, np.uint8)
    for y0 in (20, 220, 420):  # barrio a la izquierda: manzanas y calles
        _manzana(img, gt, 20, y0, 190, y0 + 160)
    rng = np.random.default_rng(3)
    zona = img[:, 250:]
    puntos = rng.random(zona.shape[:2]) < 0.35
    zona[puntos] = GRIS_CERRO
    for k in range(0, 700, 18):
        cv2.ellipse(zona, (500, 300), (k, int(k * 0.7)), 0, 0, 360, ROJO_CURVA, 2, cv2.LINE_AA)
    res = sg.segmentar(_ruido(img), ESCALA)
    assert (res.clases[50:550, 330:580] == CERRO).mean() >= 0.95
    assert _exactitud(res.clases, gt, EDIFICADO) >= 0.95
    assert (res.clases[:, 0:200] == CERRO).mean() <= 0.02


def test_sin_datos_es_margen():
    img = _lienzo()
    img[:, :120] = 0
    res = sg.segmentar(img, ESCALA)
    assert (res.clases[:, :120] == MARGEN).all()
    assert (res.clases[:, 160:] == MARGEN).mean() <= 0.01


def test_marco_de_la_hoja_es_margen():
    img = _lienzo(800, 800)
    img[:, :150] = (238, 232, 218)  # papel del margen
    for x0, w in ((60, 12), (100, 6), (125, 3)):
        img[:, x0:x0 + w] = (40, 30, 30)
    img[:, 175:177] = (40, 30, 30)  # línea interior del marco (neatline)
    res = sg.segmentar(_ruido(img), ESCALA)
    assert (res.clases[:, :170] == MARGEN).mean() >= 0.98
    assert (res.clases[:, 200:] == MARGEN).mean() <= 0.01


def test_parametros_en_metros_funcionan_a_otra_escala():
    """El mismo plano reescalado a 0,5 m/px sigue dando calle/patio/edificado."""
    rgb, gt, _ = plano_sintetico()
    f = ESCALA / 0.5
    chico = cv2.resize(rgb, None, fx=f, fy=f, interpolation=cv2.INTER_AREA)
    gt_chico = cv2.resize(gt, (chico.shape[1], chico.shape[0]), interpolation=cv2.INTER_NEAREST)
    res = sg.segmentar(chico, 0.5)
    for clase in (CALLE, PATIO, EDIFICADO, EDIFICIO_PUBLICO):
        assert _exactitud(res.clases, gt_chico, clase, radio=2) >= 0.93


def test_teselado_da_lo_mismo_que_de_una_vez():
    rgb, _, _ = plano_sintetico()
    entero = sg.segmentar(rgb, ESCALA)
    teselado = sg.segmentar(rgb, ESCALA, tesela=400)
    assert (entero.clases == teselado.clases).mean() >= 0.99
    assert len(teselado.arboles) == len(entero.arboles)


def test_tesela_de_borde_angosta_no_rompe():
    """Imagen de tesela + 1 px: el resto se suma a la tesela anterior."""
    rgb, _, _ = plano_sintetico()
    res = sg.segmentar(rgb[:401, :], ESCALA, tesela=400)
    assert res.clases.shape == (401, rgb.shape[1])


# --- salidas -----------------------------------------------------------------------

def test_suelo_sigue_la_convencion_rgb():
    clases = np.array([[AGUA, PATIO, EDIFICADO, EDIFICIO_PUBLICO, CALLE, VERDE]], np.uint8)
    suelo = suelo_desde_clases(clases)
    assert suelo.shape == (1, 6, 3)
    assert tuple(suelo[0, 0]) == (255, 0, 0)
    assert tuple(suelo[0, 1]) == (0, 255, 0)
    assert tuple(suelo[0, 2]) == (0, 0, 255)
    assert tuple(suelo[0, 3]) == (0, 0, 255)
    assert tuple(suelo[0, 4]) == (0, 0, 0)
    assert suelo[0, 5, 1] == 255


def test_escala_invalida_da_error():
    with pytest.raises(ValueError):
        sg.segmentar(_lienzo(), 0)


def test_entrada_no_rgb_da_error():
    with pytest.raises(ValueError):
        sg.segmentar(np.zeros((10, 10), np.uint8), ESCALA)


def test_cli_escribe_las_salidas(tmp_path):
    rgb, _, _ = plano_sintetico()
    entrada = tmp_path / "plano.png"
    cv2.imwrite(str(entrada), cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR))
    salida = tmp_path / "out"
    r = subprocess.run(
        [sys.executable, str(RAIZ / "tools" / "geo" / "segmentar.py"), str(entrada), str(salida),
         "--recorte", "0,0,632,332", "--escala", str(ESCALA)],
        capture_output=True, text=True,
    )
    assert r.returncode == 0, r.stderr
    clases = cv2.imread(str(salida / "clases.png"), cv2.IMREAD_UNCHANGED)
    assert clases.shape == (332, 632)
    suelo = cv2.imread(str(salida / "suelo.png"))
    assert suelo.shape == (332, 632, 3)
    arboles = json.loads((salida / "arboles.json").read_text())
    assert isinstance(arboles, list)
    assert (salida / "debug.jpg").exists()


def test_cli_recorte_fuera_de_la_imagen_falla(tmp_path):
    entrada = tmp_path / "p.png"
    cv2.imwrite(str(entrada), _lienzo(50, 50))
    r = subprocess.run(
        [sys.executable, str(RAIZ / "tools" / "geo" / "segmentar.py"), str(entrada), str(tmp_path / "o"),
         "--recorte", "40,40,30,30"],
        capture_output=True, text=True,
    )
    assert r.returncode != 0
    assert "recorte" in r.stderr.lower()
