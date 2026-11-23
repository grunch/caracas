"""Tests del diccionario de esquinas (tools/geo/esquinas.py) con planos sintéticos.

Plano sintético: manzanas naranjas entre calles claras, con nombres de esquina en rojo terracota
escritos en diagonal en el ángulo de la manzana, letras rojas grandes (no son esquinas), una
línea roja punteada (tranvía) y texto negro.
"""
import json

import cv2
import numpy as np
import pytest
import tifffile

import esquinas as es
from segmentar_clases import CALLE, EDIFICADO

PAPEL_CALLE = (250, 244, 228)
MANZANA = (240, 202, 153)
ROJO = (176, 104, 82)      # tinta de los nombres de esquina
NEGRO = (60, 55, 50)
ALTO, ANCHO = 600, 700
CALLES_X = (150, 450)      # ejes de las calles N–S
CALLES_Y = (150, 420)      # ejes de las calles E–O
ANCHO_CALLE = 24


def _clases():
    f, c = np.mgrid[0:ALTO, 0:ANCHO]
    calle = np.zeros((ALTO, ANCHO), bool)
    for x in CALLES_X:
        calle |= np.abs(c - x) < ANCHO_CALLE // 2
    for y in CALLES_Y:
        calle |= np.abs(f - y) < ANCHO_CALLE // 2
    clases = np.where(calle, CALLE, EDIFICADO).astype(np.uint8)
    # bordes dentados (rayado de edificio público): astillas finas de calle hacia la manzana
    for x in range(170, 300, 6):
        clases[150 + ANCHO_CALLE // 2: 150 + ANCHO_CALLE // 2 + 9, x:x + 2] = CALLE
    return clases


def _texto(img, texto, centro, angulo, escala=0.6, grosor=2, color=ROJO, lineas=1):
    """Escribe `texto` rotado `angulo` grados (antihorario, como cv2) con centro en `centro`."""
    renglones = texto.split("\n") if lineas > 1 else [texto]
    tam = [cv2.getTextSize(r, cv2.FONT_HERSHEY_SIMPLEX, escala, grosor)[0] for r in renglones]
    w = max(t[0] for t in tam) + 20
    h_renglon = max(t[1] for t in tam) + 8
    h = h_renglon * len(renglones) + 20
    lienzo = np.zeros((h, w), np.uint8)
    for i, r in enumerate(renglones):
        cv2.putText(lienzo, r, (10, 10 + h_renglon * (i + 1) - 4), cv2.FONT_HERSHEY_SIMPLEX,
                    escala, 255, grosor, cv2.LINE_AA)
    lado = int(np.hypot(w, h)) + 4
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angulo, 1.0)
    m[:, 2] += (lado / 2 - w / 2, lado / 2 - h / 2)
    rot = cv2.warpAffine(lienzo, m, (lado, lado))
    x0, y0 = int(centro[0] - lado / 2), int(centro[1] - lado / 2)
    zona = img[y0:y0 + lado, x0:x0 + lado]
    alfa = (rot[:zona.shape[0], :zona.shape[1]] / 255.0)[..., None]
    zona[:] = (zona * (1 - alfa) + np.array(color) * alfa).astype(np.uint8)


def _plano():
    clases = _clases()
    img = np.where((clases == CALLE)[..., None], PAPEL_CALLE, MANZANA).astype(np.uint8)
    # nombres de esquina, en el ángulo de la manzana junto al cruce
    _texto(img, "La Torre", (225, 110), 30)          # NE del cruce (150, 150)
    _texto(img, "Las\nGradillas", (520, 470), 25, lineas=2)  # SE del cruce (450, 420)
    _texto(img, "Pineda", (85, 205), -40)            # SO del cruce (150, 150)
    # estorbos: letra roja grande, línea punteada roja, texto negro
    cv2.putText(img, "A", (300, 330), cv2.FONT_HERSHEY_SIMPLEX, 3.0, ROJO, 9, cv2.LINE_AA)
    for x in range(180, 430, 9):
        cv2.circle(img, (x, 140), 1, ROJO, -1)
    cv2.putText(img, "PALACIO", (200, 260), cv2.FONT_HERSHEY_SIMPLEX, 0.7, NEGRO, 2, cv2.LINE_AA)
    rng = np.random.default_rng(3)
    img = np.clip(img.astype(np.int16) + rng.normal(0, 3, img.shape), 0, 255).astype(np.uint8)
    return img, clases


@pytest.fixture(scope="module")
def plano():
    return _plano()


# ------------------------------------------------------------------ color

def test_mascara_roja_separa_la_tinta_roja_de_manzana_calle_y_negro():
    img = np.zeros((4, 10, 3), np.uint8)
    img[0] = ROJO
    img[1] = MANZANA
    img[2] = PAPEL_CALLE
    img[3] = NEGRO
    m = es.mascara_roja(img)
    assert m[0].all()
    assert not m[1:].any()


# ------------------------------------------------------------------ cruces

def test_cruces_encuentra_las_intersecciones_de_los_ejes_de_calle(plano):
    _, clases = plano
    pts = es.cruces(clases == CALLE)
    esperados = np.array([(x, y) for x in CALLES_X for y in CALLES_Y], float)
    assert len(pts) == len(esperados)
    for e in esperados:
        assert np.min(np.hypot(*(pts - e).T)) < 4


def test_cruces_en_t_y_sin_calles():
    calle = np.zeros((300, 300), bool)
    calle[140:160, :] = True
    calle[:150, 140:160] = True  # T: la N–S termina en la E–O
    pts = es.cruces(calle)
    assert len(pts) == 1
    assert np.hypot(*(pts[0] - (150, 150))) < 6
    assert len(es.cruces(np.zeros((50, 50), bool))) == 0


def test_cruces_ignora_entrantes_cortos_de_la_calle():
    calle = np.zeros((300, 400), bool)
    calle[140:160, :] = True
    calle[160:190, 200:210] = True  # entrante de 15 m: patio o borde roto, no una calle
    calle[100:140, 300:312] = True
    assert len(es.cruces(calle)) == 0


# ------------------------------------------------------------------ etiquetas

def test_etiquetas_agrupa_letras_en_nombres_y_descarta_estorbos(plano):
    img, _ = plano
    ets = es.etiquetas(es.mascara_roja(img))
    centros = np.array([e.centro for e in ets])
    assert len(ets) == 3
    for c in ((225, 110), (520, 470), (85, 205)):
        assert np.min(np.hypot(*(centros - c).T)) < 12


def test_etiquetas_mide_la_orientacion_del_texto(plano):
    img, _ = plano
    ets = es.etiquetas(es.mascara_roja(img))
    por_centro = {tuple(np.round(e.centro, -1)): e for e in ets}
    angulos = sorted(e.angulo for e in ets)
    # cv2 rota antihorario con y hacia abajo: +30° sube hacia la derecha → ángulo de imagen -30°
    assert angulos[0] == pytest.approx(-30, abs=6)
    assert angulos[1] == pytest.approx(-25, abs=8)
    assert angulos[2] == pytest.approx(40, abs=6)
    assert len(por_centro) == 3


# ------------------------------------------------------------------ asociación

def test_asociar_lleva_cada_nombre_al_cruce_de_su_esquina(plano):
    img, clases = plano
    ets = es.etiquetas(es.mascara_roja(img))
    pts = es.cruces(clases == CALLE)
    asoc = es.asociar(ets, pts, dist_max=120)
    for e, (i, d) in zip(ets, asoc):
        esperado = (150, 150) if e.centro[1] < 300 else (450, 420)
        assert i is not None
        assert np.hypot(*(pts[i] - esperado)) < 6
        assert d < 120


def test_asociar_deja_sin_cruce_lo_que_queda_lejos(plano):
    img, _ = plano
    ets = es.etiquetas(es.mascara_roja(img))
    asoc = es.asociar(ets, np.array([[5.0, 590.0]]), dist_max=40)
    assert all(i is None for i, _ in asoc)
    assert es.asociar(ets, np.zeros((0, 2)), dist_max=40) == [(None, float("inf"))] * len(ets)


# ------------------------------------------------------------------ recortes

def test_recorte_derecho_deja_el_texto_horizontal(plano):
    img, _ = plano
    ets = es.etiquetas(es.mascara_roja(img))
    for e in ets:
        rec = es.recorte_derecho(img, e, margen=10)
        sub = es.etiquetas(es.mascara_roja(rec))
        assert len(sub) == 1
        assert abs(sub[0].angulo) < 6
        assert rec.shape[1] > rec.shape[0]


def test_hoja_de_contactos_compone_las_fichas_en_columnas():
    fichas = [np.full((40 + 10 * i, 60, 3), 30 * i, np.uint8) for i in range(5)]
    hoja = es.hoja_de_contactos(fichas, ["a", "b", "c", "d", "e"], columnas=2, lado=100)
    assert hoja.shape[1] == 200
    assert hoja.shape[0] == 3 * (100 + es.ALTO_TITULO)


# ------------------------------------------------------------------ componer

def _candidatos():
    return [
        {"id": 0, "cruce_px": [100.0, 200.0], "centro_px": [120.0, 180.0], "dist_px": 20.0},
        {"id": 1, "cruce_px": None, "centro_px": [500.0, 600.0], "dist_px": None},
        {"id": 2, "cruce_px": [300.0, 300.0], "centro_px": [320.0, 280.0], "dist_px": 25.0},
        {"id": 3, "cruce_px": [700.0, 300.0], "centro_px": [720.0, 280.0], "dist_px": 25.0},
    ]


def test_componer_une_lecturas_y_cruces_y_respeta_correcciones():
    lecturas = {
        "0": {"nombre": "La Torre", "cota_m": 919.549},
        "1": {"nombre": "Pineda", "px": [510, 590], "verificado": False, "notas": "sin cruce"},
        "2": {"descartar": "no es una esquina"},
    }
    out = es.componer(_candidatos(), lecturas)
    # el 2 se descarta y el 3 no se revisó: no entra
    assert [e["nombre"] for e in out] == ["La Torre", "Pineda"]
    torre = out[0]
    assert torre == {"nombre": "La Torre", "px": [100.0, 200.0], "fuente": "plano DCN 1936",
                     "verificado": True, "cota_m": 919.549, "notas": ""}
    assert out[1]["px"] == [510.0, 590.0] and out[1]["verificado"] is False


def test_componer_sin_cruce_usa_el_centro_del_rotulo_y_no_verifica():
    out = es.componer(_candidatos(), {"1": {"nombre": "Pineda"}})
    assert out[0]["px"] == [500.0, 600.0]
    assert out[0]["verificado"] is False and "sin cruce" in out[0]["notas"]


def test_componer_agrega_esquinas_manuales_y_exige_px():
    out = es.componer(_candidatos(), {"manual-000": {"nombre": "La Soledad", "px": [1, 2]}})
    assert out == [{"nombre": "La Soledad", "px": [1.0, 2.0], "fuente": "plano DCN 1936",
                    "verificado": True, "cota_m": None, "notas": ""}]
    with pytest.raises(ValueError, match="px"):
        es.componer(_candidatos(), {"manual-001": {"nombre": "X"}})


def test_componer_sin_nombre_nunca_queda_verificado():
    out = es.componer(_candidatos()[:1], {"0": {"nombre": None, "verificado": True}})
    assert out[0]["verificado"] is False


def test_componer_rechaza_lecturas_de_candidatos_inexistentes():
    with pytest.raises(ValueError, match="99"):
        es.componer(_candidatos(), {"99": {"nombre": "X"}})


def test_a_json_escribe_una_esquina_por_linea():
    esq = es.componer(_candidatos(), {"0": {"nombre": "La Torre"}, "2": {"nombre": "Ñaña"}})
    texto = es.a_json(esq)
    assert json.loads(texto) == esq
    assert texto.count("\n") == len(esq) + 2
    assert "Ñaña" in texto


# ------------------------------------------------------------------ QA y CLI

def test_lamina_qa_marca_cada_esquina(plano):
    img, _ = plano
    esq = [{"nombre": "La Torre", "px": [150.0, 150.0], "verificado": True},
           {"nombre": None, "px": [450.0, 420.0], "verificado": False}]
    lam = es.lamina_qa(img, esq, ventana=(0, 0, ANCHO, ALTO), escala=1.0)
    assert lam.shape == img.shape
    assert not np.array_equal(lam[150, 150], img[150, 150])


def test_cli_detectar_componer_y_qa(plano, tmp_path):
    img, clases = plano
    tifffile.imwrite(tmp_path / "m.tif", img)
    cv2.imwrite(str(tmp_path / "c.png"), clases)
    sal = tmp_path / "sal"
    assert es.main(["detectar", "--mosaico", str(tmp_path / "m.tif"), "--clases",
                    str(tmp_path / "c.png"), "--centro", "350,300", "--radio", "400",
                    "--salida", str(sal)]) == 0
    cand = json.loads((sal / "candidatos.json").read_text())
    assert len(cand["etiquetas"]) == 3
    assert all((sal / "crops" / f"{c['id']:04d}.png").exists() for c in cand["etiquetas"])
    assert list(sal.glob("hoja-*.jpg"))
    lect = tmp_path / "lecturas.json"
    lect.write_text(json.dumps({str(c["id"]): {"nombre": f"N{c['id']}"} for c in cand["etiquetas"]}))
    destino = tmp_path / "esquinas.json"
    assert es.main(["componer", "--candidatos", str(sal / "candidatos.json"), "--lecturas",
                    str(lect), "--salida", str(destino)]) == 0
    esq = json.loads(destino.read_text())
    assert len(esq) == 3 and all(e["verificado"] for e in esq)
    qa = tmp_path / "qa.jpg"
    assert es.main(["qa", "--mosaico", str(tmp_path / "m.tif"), "--esquinas", str(destino),
                    "--centro", "350,300", "--radio", "300", "--salida", str(qa)]) == 0
    assert cv2.imread(str(qa)) is not None


def test_pajaritos_esta_en_el_cruce_de_sur_y_este_no_sobre_el_pliegue():
    """La esquina 185 (Pajaritos) es el cruce de Sur (San Francisco–La Palma) con Este (Mercaderes–Camejo). Estaba 27 m al
    norte, sobre el pliegue de la hoja de 1936: el ancla X1772-0058 que sale de ella torcía el calce de 1772 (T33j.8d)."""
    from pathlib import Path
    datos = json.loads((Path(__file__).resolve().parents[1] / 'esquinas' / '1936-esquinas.json').read_text(encoding='utf-8'))
    px = {e['nombre']: np.asarray(e['px'], float) for e in datos}
    a, b, c, d = px['San Francisco'], px['La Palma'], px['Mercaderes'], px['Camejo']
    t = np.linalg.solve(np.array([b - a, c - d]).T, c - a)[0]
    cruce = a + t * (b - a)
    assert np.hypot(*(px['Pajaritos'] - cruce)) * 0.5 < 2.0  # menos de 2 m del cruce de los ejes
