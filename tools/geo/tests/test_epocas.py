"""Tests de las épocas: máscaras de lo edificado, nace/muere de cada casa, crece.json y crece.png."""
import numpy as np
import pytest

import epocas as ep


def cuadrado(x, y, lado):
    return [[x, y], [x + lado, y], [x + lado, y + lado], [x, y + lado]]


def ciudad_de(poligonos):
    vertices, techos = [], []
    for p in poligonos:
        techos.append([len(vertices) // 2, len(p), 1, 0, 7])
        for x, y in p:
            vertices.extend((float(x), float(y)))
    return {"vertices": vertices, "techos": techos, "manzanas": 1}


# --- codificación ------------------------------------------------------------------------------

def test_desde_cuando_codifica_la_etapa_en_un_canal():
    etapas = np.array([[0, 1], [5, ep.NUNCA]])
    r = ep.desde_cuando(etapas, cuantas=6)
    assert r.dtype == np.uint8
    assert r.tolist() == [[255, 212], [42, 0]]


def test_etapas_por_punto_y_reduccion_por_mayoria():
    a = np.zeros((4, 4), bool)
    b = np.zeros((4, 4), bool)
    a[:2, :2] = True               # edificado en la época 0 y también en la 1
    b[:2, :] = True
    b[2, 0] = True
    etapa = ep.etapas_por_punto([a, b])
    assert etapa[0, 0] == 0 and etapa[0, 3] == 1 and etapa[3, 3] == ep.NUNCA
    r = ep.reducir_etapas(etapa, 2)
    assert r.tolist() == [[0, 1], [ep.NUNCA, ep.NUNCA]]


def test_vida_empaca_nace_y_muere():
    assert ep.vida_empacada(2, 0) == 2
    assert ep.vida_empacada(0, 1) == 8
    with pytest.raises(ValueError):
        ep.vida_empacada(1, 1)


# --- máscaras ----------------------------------------------------------------------------------

def test_edificado_por_color_limpia_manchas_chicas_y_respeta_el_alfa():
    # Arrange: manzana roja de 40×40 px con un rótulo blanco adentro y una mancha roja de 2×2
    rgba = np.zeros((100, 100, 4), np.uint8)
    rgba[..., :3] = 240
    rgba[..., 3] = 255
    rgba[10:50, 10:50, :3] = (220, 60, 60)
    rgba[28:31, 20:40, :3] = 240
    rgba[80:82, 80:82, :3] = (220, 60, 60)
    rgba[:, 90:, 3] = 0
    rgba[60:70, 92:98, :3] = (220, 60, 60)
    perfil = {"canal": "a", "umbral": 150, "sentido": "mayor"}

    # Act
    m = ep.edificado(rgba, perfil, cierre_px=3, area_minima_px=20)

    # Assert
    assert m[29, 30] and m[12, 12]
    assert not m[81, 81]
    assert not m[65, 95]
    assert m.sum() == pytest.approx(40 * 40, rel=0.05)


def test_edificado_con_apertura_borra_lineas_finas_y_deja_las_manzanas():
    rgba = np.full((100, 100, 4), 240, np.uint8)
    rgba[..., 3] = 255
    rgba[10:50, 10:50, :3] = (220, 60, 60)
    rgba[70:72, :, :3] = (220, 60, 60)  # una vía férrea de 2 px
    perfil = {"canal": "a", "umbral": 150, "sentido": "mayor"}
    m = ep.edificado(rgba, perfil, cierre_px=2, area_minima_px=20, apertura_px=3)
    assert m[30, 30] and not m[71, 50]


def test_edificado_descarta_componentes_angostas_como_un_marco():
    rgba = np.full((200, 200, 4), 240, np.uint8)
    rgba[..., 3] = 255
    rgba[20:80, 20:80, :3] = (220, 60, 60)
    rgba[0:200, 150:158, :3] = (220, 60, 60)  # marco de 8 px de ancho y 200 de largo
    perfil = {"canal": "a", "umbral": 150, "sentido": "mayor"}
    m = ep.edificado(rgba, perfil, cierre_px=1, area_minima_px=20, ancho_minimo_px=12)
    assert m[50, 50] and not m[100, 154]


def test_mascara_en_el_marco_completo_pone_el_recorte_en_su_lugar():
    parcial = np.ones((2, 3), bool)
    m = ep.en_marco(parcial, recorte=(4, 1, 7, 3), forma=(5, 10))
    assert m.shape == (5, 10) and m.sum() == 6 and m[1, 4] and m[2, 6] and not m[0, 4]


def test_rasterizar_solares_construidos():
    solares = [{"estado": "casa", "poligono": cuadrado(0, 0, 10)},
               {"estado": "vacio", "poligono": cuadrado(10, 0, 10)},
               {"estado": "iglesia", "poligono": cuadrado(0, 10, 10)}]
    m = ep.mascara_de_solares(solares, forma=(20, 20), escala=1.0)
    assert m[5, 5] and not m[5, 15] and m[15, 5]


# --- nace y muere -------------------------------------------------------------------------------

def test_fracciones_por_techo():
    ciudad = ciudad_de([cuadrado(0, 0, 10), cuadrado(20, 0, 10)])
    mascara = np.zeros((40, 40), bool)
    mascara[0:10, 0:10] = True
    mascara[0:10, 20:25] = True
    etiquetas = ep.etiquetar_techos(ciudad, forma=(40, 40), escala=1.0)
    f = ep.fracciones(etiquetas, [mascara], cuantos=2)
    assert f[:, 0] == pytest.approx([1.0, 0.5], abs=0.05)


def test_nace_es_la_primera_epoca_desde_la_que_existe_siempre():
    # columnas: épocas 1..4 (1772, 1843, 1889, 1919); 1936 siempre existe
    fr = np.array([[1.0, 1.0, 1.0, 1.0],    # desde 1772
                   [0.0, 0.9, 0.8, 1.0],    # desde 1843
                   [1.0, 0.0, 1.0, 1.0],    # en 1772 sí, en 1843 no → desde 1889
                   [0.0, 0.0, 0.0, 0.2]])   # recién en 1936
    assert ep.nace(fr, primera=1, umbral=0.5).tolist() == [1, 2, 3, 5]


def test_muere_de_las_casas_que_no_llegan_a_1936():
    # casa nacida en 1772 (época 1): fracciones en 1843, 1889, 1919
    fr = np.array([[1.0, 1.0, 1.0], [1.0, 0.1, 1.0], [0.0, 1.0, 1.0]])
    assert ep.muere(fr, nace=1, umbral=0.5).tolist() == [5, 3, 2]


def test_vida_de_las_casas_de_1578_pasa_la_posta_a_la_de_1936_que_la_pisa():
    # Arrange: dos casas de 1578; la primera la pisa una casa de 1936 que nace en 1772
    c78 = ciudad_de([cuadrado(0, 0, 10), cuadrado(50, 50, 10)])
    c36 = ciudad_de([cuadrado(2, 2, 10)])
    etiquetas36 = ep.etiquetar_techos(c36, forma=(80, 80), escala=1.0)
    construido = [np.zeros((80, 80), bool) for _ in range(4)]
    construido[0][45:65, 45:65] = True  # la segunda sigue en pie en 1772 y se pierde en 1843

    # Act
    vida = ep.vida_de_1578(c78, etiquetas36, nace36=np.array([1]), construido=construido, escala=1.0)

    # Assert
    assert vida == [[0, 1], [0, 2]]


def test_la_posta_es_solo_de_las_casas_de_1936_que_por_si_solas_pisan_lo_suficiente():
    # Arrange: una casa de 1578 de 10×10; la de 1772 apenas la roza (1 columna = 10 %),
    # la de 1936 la cubre en un 60 %
    c78 = ciudad_de([cuadrado(10, 10, 10)])
    c36 = ciudad_de([cuadrado(9, 10, 2), cuadrado(14, 10, 6)])
    etiquetas36 = ep.etiquetar_techos(c36, forma=(40, 40), escala=1.0)
    construido = [np.ones((40, 40), bool) for _ in range(4)]

    # Act
    vida = ep.vida_de_1578(c78, etiquetas36, nace36=np.array([1, 5]), construido=construido, escala=1.0)

    # Assert
    assert vida == [[0, 5]]


def test_conteo_de_casas_por_epoca():
    vida = [[0, 0], [1, 0], [0, 1], [3, 5], [5, 0]]
    assert ep.casas_por_epoca(vida, cuantas=6) == [2, 2, 2, 3, 3, 3]


# --- metadatos ---------------------------------------------------------------------------------

def test_metadatos_de_epoca_desde_la_ficha():
    ficha = {"titulo": "Plano X", "autor": "Mestre", "institucion": "BnF", "url_fuente": "https://x",
             "licencia": "Dominio público", "año": 1889}
    e = ep.metadatos({"año": 1889, "plano": "1889-bnf-mestre", "corto": "plano de Mestre (1889)",
                      "obras": "Llega el tren."}, ficha, casas=12)
    assert e == {"año": 1889, "plano": "1889-bnf-mestre", "titulo": "Plano X", "autor": "Mestre",
                 "fuente": "BnF · https://x", "licencia": "Dominio público",
                 "corto": "plano de Mestre (1889)", "obras": "Llega el tren.", "casas": 12}
    sin_obras = ep.metadatos({"año": 1889, "plano": "p", "corto": "c"}, ficha, casas=1)
    assert "obras" not in sin_obras


def test_unir_ciudades_agrega_techos_y_corre_los_indices():
    a = ciudad_de([cuadrado(0, 0, 1)])
    b = ciudad_de([cuadrado(5, 5, 1), cuadrado(9, 9, 1)])
    u = ep.unir(a, [[1, 0]], b, [[0, 1], [1, 3]])
    assert len(u["techos"]) == 3 and u["techos"][1][0] == 4 and u["techos"][2][0] == 8
    assert len(u["vertices"]) == 24
    assert u["vida"] == [[1, 0], [0, 1], [1, 3]]
