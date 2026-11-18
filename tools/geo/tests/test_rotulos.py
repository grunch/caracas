"""Tests de la máscara de rótulos (tools/geo/rotulos.py) con tintas sintéticas a 0,5 m/px."""
import cv2
import numpy as np
import pytest

import rotulos as ro

P = ro.ParametrosRotulos(escala=0.5)
LADO = 600


def _lienzo():
    return np.zeros((LADO, LADO), np.uint8)


def _texto(img, texto, origen, escala=0.6, grosor=2):
    cv2.putText(img, texto, origen, cv2.FONT_HERSHEY_SIMPLEX, escala, 1, grosor)
    return img


def _parte(rotulo, tinta):
    """Qué parte de `tinta` quedó marcada como rótulo."""
    return float(rotulo[tinta].mean())


def _vacia():
    return np.zeros((LADO, LADO), bool)


# --- forma de las componentes ---------------------------------------------------------

def test_componentes_mide_la_caja_y_los_ejes_de_una_barra():
    # Arrange: una barra de 20 × 3 px
    m = _lienzo()
    m[100:103, 50:70] = 1
    # Act
    c = ro.componentes(m.astype(bool))
    # Assert: la componente 1 (la 0 es el fondo)
    assert c.lado[1] == 20
    assert c.area[1] == 60
    assert c.densidad[1] == pytest.approx(1.0)
    assert c.ancho[1] == pytest.approx(3.0, abs=0.01)
    assert c.esbeltez[1] == pytest.approx(20 / 3, abs=0.01)


def test_componentes_de_una_mascara_vacia():
    c = ro.componentes(_vacia())
    assert len(c.lado) == 1  # solo el fondo


# --- letras sueltas y líneas ----------------------------------------------------------

def test_las_letras_sueltas_son_rotulo():
    tinta = _texto(_lienzo(), "PALACIO FEDERAL", (40, 300)).astype(bool)
    assert _parte(ro.rotulos_de_tinta(tinta, P), tinta) > 0.95


def test_el_borde_de_una_manzana_no_es_rotulo():
    m = _lienzo()
    cv2.rectangle(m, (100, 100), (420, 330), 1, 2)
    cv2.line(m, (20, 500), (580, 430), 1, 2)
    tinta = m.astype(bool)
    assert not ro.rotulos_de_tinta(tinta, P, negra=True).any()


def test_los_trazos_de_una_linea_cortada_se_quedan():
    # un sendero: trazos de 10 × 2 px cada 16 px, en diagonal suave
    m = _lienzo()
    for i in range(30):
        x, y = 40 + i * 16, 200 + i * 4
        cv2.line(m, (x, y), (x + 9, y + 2), 1, 2)
    tinta = m.astype(bool)
    assert not ro.rotulos_de_tinta(tinta, P).any()


def test_el_punteado_del_tranvia_es_rotulo():
    m = _lienzo()
    for i in range(40):
        m[300:303, 40 + i * 9:43 + i * 9] = 1
    tinta = m.astype(bool)
    assert ro.rotulos_de_tinta(tinta, P)[tinta].all()


def test_en_una_linea_de_raya_y_punto_se_van_los_puntos_y_quedan_las_rayas():
    m = _lienzo()
    rayas, puntos = _lienzo(), _lienzo()
    for i in range(20):
        x = 40 + i * 24
        rayas[300:302, x:x + 12] = 1
        puntos[299:302, x + 16:x + 19] = 1
    tinta = (rayas | puntos).astype(bool)
    r = ro.rotulos_de_tinta(tinta, P)
    assert r[puntos.astype(bool)].all()
    assert not r[rayas.astype(bool)].any()


def test_una_curva_de_nivel_no_es_rotulo():
    m = _lienzo()
    xs = np.arange(20, 580)
    pts = np.stack([xs, 300 + 60 * np.sin(xs / 70.0)], axis=1).astype(np.int32)
    cv2.polylines(m, [pts], False, 1, 2)
    tinta = m.astype(bool)
    assert not ro.rotulos_de_tinta(tinta, P).any()


def test_una_barra_sola_es_un_trazo_pero_al_lado_de_una_letra_es_una_i():
    sola, palabra = _lienzo(), _lienzo()
    sola[290:308, 100:103] = 1
    _texto(palabra, "H", (300, 308))
    palabra[290:308, 314:317] = 1  # la "I" de "HI"
    assert not ro.rotulos_de_tinta(sola.astype(bool), P).any()
    r = ro.rotulos_de_tinta(palabra.astype(bool), P)
    assert r[290:308, 314:317].all()


def test_varias_cifras_pegadas_siguen_siendo_rotulo():
    # una componente más ancha que un glifo, pero densa y alta: una palabra
    m = _texto(_lienzo(), "888", (100, 300), escala=0.9, grosor=3)
    m[290:293, 104:150] = 1  # un trazo que las une
    tinta = m.astype(bool)
    c = ro.componentes(tinta)
    assert c.lado.max() >= P.px(P.glifo_max_m)  # es más grande que una letra
    assert _parte(ro.rotulos_de_tinta(tinta, P), tinta) > 0.95


# --- la tinta negra: rótulos que tocan una línea --------------------------------------

def test_una_letra_gruesa_atravesada_en_la_calle_es_rotulo_y_la_calle_no():
    lineas, letra = _lienzo(), _lienzo()
    cv2.line(lineas, (20, 280), (580, 280), 1, 2)
    cv2.line(lineas, (20, 302), (580, 302), 1, 2)
    _texto(letra, "E", (290, 302), escala=0.75, grosor=3)  # toca los dos bordes de la calle
    tinta = (lineas | letra).astype(bool)
    assert ro.componentes(tinta).lado.max() > 500  # todo es una sola componente con las líneas
    r = ro.rotulos_de_tinta(tinta, P, negra=True)
    solo_letra = letra.astype(bool) & ~lineas.astype(bool)
    assert _parte(r, solo_letra) > 0.8
    lejos = lineas.astype(bool)
    lejos[:, 250:350] = False
    assert not r[lejos].any()


def test_sin_la_regla_de_la_tinta_negra_la_letra_pegada_a_la_linea_no_se_reconoce():
    m = _lienzo()
    cv2.line(m, (20, 280), (580, 280), 1, 2)
    cv2.line(m, (20, 302), (580, 302), 1, 2)
    _texto(m, "E", (290, 302), escala=0.75, grosor=3)
    assert not ro.rotulos_de_tinta(m.astype(bool), P).any()


def test_una_cota_apoyada_en_el_borde_de_la_manzana_es_rotulo():
    linea, cota = _lienzo(), _lienzo()
    cv2.line(linea, (20, 300), (580, 300), 1, 2)
    cv2.fillPoly(cota, [np.array([[100, 300], [108, 300], [104, 293]], np.int32)], 1)  # el triángulo
    _texto(cota, "919.674", (112, 301), escala=0.4, grosor=1)  # las cifras pisan la línea
    tinta = (linea | cota).astype(bool)
    r = ro.rotulos_de_tinta(tinta, P, negra=True)
    solo_cota = cota.astype(bool) & ~cv2.dilate(linea, np.ones((5, 5), np.uint8)).astype(bool)
    assert _parte(r, solo_cota) > 0.8
    lejos = linea.astype(bool)
    lejos[:, 60:240] = False
    assert not r[lejos].any()


def test_una_letra_fina_que_pisa_una_linea_se_va_con_el_resto_de_su_palabra():
    # "GLESIA" en trazo fino: la G pisa el borde del patio y queda en la misma componente que la línea
    linea, palabra = _lienzo(), _lienzo()
    cv2.line(linea, (200, 20), (200, 580), 1, 2)
    _texto(palabra, "GLESIA", (196, 300), escala=0.8, grosor=2)
    tinta = (linea | palabra).astype(bool)
    g = np.zeros_like(tinta)
    g[270:310, 206:214] = True  # la parte de la G que queda lejos de la línea
    g &= palabra.astype(bool)
    assert g.sum() > 20
    assert not ro.rotulos_de_tinta(tinta, P)[g].any()  # sin la regla de la tinta negra, se queda
    r = ro.rotulos_de_tinta(tinta, P, negra=True)
    assert _parte(r, g) > 0.8
    lejos = linea.astype(bool)
    lejos[240:340] = False
    assert not r[lejos].any()


def test_un_pedazo_de_linea_fina_cortada_no_es_rotulo():
    # la esquina del contorno de un cantero, de un píxel de grosor y cortada: compacta, pero sin tinta
    m = _lienzo()
    m[300, 300:313] = 1
    m[300:313, 300] = 1
    tinta = m.astype(bool)
    c = ro.componentes(tinta)
    assert c.esbeltez[1] < P.esbeltez_glifo_max  # compacta como una letra
    assert not ro.rotulos_de_tinta(tinta, P, negra=True).any()


def test_la_cruz_de_una_iglesia_es_rotulo_entera():
    # un símbolo mediano (más grande que una letra) de trazo grueso
    m = _lienzo()
    m[298:303, 270:330] = 1
    m[280:320, 298:303] = 1
    tinta = m.astype(bool)
    assert ro.componentes(tinta).lado[1] >= P.px(P.glifo_max_m)
    assert not ro.rotulos_de_tinta(tinta, P).any()  # en otra tinta sería una curva maestra gruesa
    assert ro.rotulos_de_tinta(tinta, P, negra=True)[tinta].all()


def test_lineas_rectas_reconoce_una_linea_fina_en_cualquier_direccion():
    for angulo in (0, 7, 33, 45, 81, 90, 128):
        m = _lienzo()
        a = np.deg2rad(angulo)
        dx, dy = 200 * np.cos(a), 200 * np.sin(a)
        cv2.line(m, (int(300 - dx), int(300 - dy)), (int(300 + dx), int(300 + dy)), 1, 1)
        tinta = m.astype(bool)
        assert ro.lineas_rectas(tinta, P)[tinta].mean() > 0.9, angulo


def test_lineas_rectas_no_se_lleva_las_letras():
    tinta = _texto(_lienzo(), "CALLE", (200, 300), escala=0.75, grosor=3).astype(bool)
    assert not ro.lineas_rectas(tinta, P).any()


# --- las letras de parroquia ----------------------------------------------------------

def _letra_rayada():
    """Una "I" de 40 × 120 px: contorno rojo y rayado casi negro por dentro."""
    rojo, negro = _lienzo(), _lienzo()
    cv2.rectangle(rojo, (280, 200), (320, 320), 1, 2)
    for y in range(204, 318, 4):
        (negro if (y // 4) % 2 else rojo)[y:y + 2, 282:319] = 1
    return negro.astype(bool), rojo.astype(bool)


def test_una_letra_de_parroquia_grande_y_rayada_es_rotulo():
    negro, rojo = _letra_rayada()
    r = ro.rotulos(negro, rojo, _vacia(), P)
    assert _parte(r, negro | rojo) > 0.95


def test_un_cuerpo_grueso_sin_rojo_no_es_letra_de_parroquia():
    negro, rojo = _letra_rayada()
    todo_negro = negro | rojo
    assert not ro.letras_de_parroquia(todo_negro, _vacia(), P).any()


# --- las tres tintas y la imagen ------------------------------------------------------

def test_rotulos_junta_las_tres_tintas():
    negro = _texto(_lienzo(), "IGLESIA", (40, 100)).astype(bool)
    rojo = _texto(_lienzo(), "La Torre", (40, 300)).astype(bool)
    azul = _texto(_lienzo(), "Qbda", (40, 500), escala=0.45, grosor=1).astype(bool)
    r = ro.rotulos(negro, rojo, azul, P)
    for tinta in (negro, rojo, azul):
        assert _parte(r, tinta) > 0.9
    assert not r[~(negro | rojo | azul)].any()  # solo marca tinta


def test_rotulos_no_modifica_sus_entradas():
    negro = _texto(_lienzo(), "PLAZA", (40, 100)).astype(bool)
    copia = negro.copy()
    ro.rotulos(negro, _vacia(), _vacia(), P)
    assert np.array_equal(negro, copia)


def test_rotulos_rechaza_mascaras_que_no_son_booleanas_o_no_coinciden():
    with pytest.raises(ValueError, match="rojo"):
        ro.rotulos(_vacia(), np.zeros((LADO, LADO), np.uint8), _vacia(), P)
    with pytest.raises(ValueError, match="azul"):
        ro.rotulos(_vacia(), _vacia(), np.zeros((10, 10), bool), P)


PAPEL = (252, 250, 232)
NEGRO = (60, 50, 45)


def _plano_con_texto():
    rgb = np.full((300, 600, 3), PAPEL, np.uint8)
    cv2.rectangle(rgb, (30, 30), (570, 270), NEGRO, 2)
    cv2.putText(rgb, "PLAZA", (200, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.7, NEGRO, 2)
    return rgb


def test_rotulos_de_plano_marca_el_texto_y_no_el_marco():
    rgb = _plano_con_texto()
    r = ro.rotulos_de_plano(rgb, 0.5)
    assert r.dtype == bool and r.shape == rgb.shape[:2]
    assert r[135:165, 200:280].sum() > 150  # las letras
    borde = np.zeros(r.shape, bool)
    borde[28:34, 30:570] = True
    assert not r[borde].any()


def test_rotulos_de_plano_por_franjas_da_lo_mismo_que_de_una_vez():
    rgb = _plano_con_texto()
    from segmentar_color import cargar_paleta
    enteras = ro.tintas_por_franjas(rgb, cargar_paleta(), 58.0, franja=10_000)
    partidas = ro.tintas_por_franjas(rgb, cargar_paleta(), 58.0, franja=37)
    for a, b in zip(enteras, partidas):
        assert np.array_equal(a, b)


@pytest.mark.parametrize("imagen, escala", [
    (np.zeros((10, 10), np.uint8), 0.5),
    (np.zeros((10, 10, 3), np.float32), 0.5),
    ("no es una imagen", 0.5),
    (np.zeros((10, 10, 3), np.uint8), 0.0),
    (np.zeros((10, 10, 3), np.uint8), float("nan")),
])
def test_rotulos_de_plano_rechaza_entradas_invalidas(imagen, escala):
    with pytest.raises(ValueError):
        ro.rotulos_de_plano(imagen, escala)


def test_cli_escribe_un_png_de_un_canal_del_tamano_de_la_entrada(tmp_path, capsys):
    entrada, salida = tmp_path / "plano.png", tmp_path / "sub" / "rotulos.png"
    cv2.imwrite(str(entrada), cv2.cvtColor(_plano_con_texto(), cv2.COLOR_RGB2BGR))
    assert ro.main([str(entrada), str(salida), "--escala", "0.5"]) == 0
    png = cv2.imread(str(salida), cv2.IMREAD_UNCHANGED)
    assert png.shape == (300, 600) and png.dtype == np.uint8
    assert set(np.unique(png)) == {0, 255}
    assert "listo" in capsys.readouterr().out


def test_cli_informa_el_error_si_falta_la_entrada(tmp_path, capsys):
    assert ro.main([str(tmp_path / "no-hay.tif"), str(tmp_path / "rotulos.png")]) == 1
    assert "error" in capsys.readouterr().err
