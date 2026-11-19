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


def test_la_reduccion_conserva_la_celda_parcial_del_borde():
    # Arrange: 5×3 px con factor 2 → 3×2 celdas; la última columna y la última fila son parciales
    etapa = np.full((3, 5), ep.NUNCA, np.uint8)
    etapa[:, 4] = 2                 # la columna parcial del borde este, edificada desde la época 2
    etapa[2, 0:2] = 1               # la fila parcial del borde sur, a medias por celda

    # Act
    r = ep.reducir_etapas(etapa, 2)

    # Assert
    assert r.shape == (2, 3)
    assert r.tolist() == [[ep.NUNCA, ep.NUNCA, 2], [1, ep.NUNCA, 2]]


def test_reducir_rellena_hasta_la_grilla_sin_perder_el_borde():
    img = np.full((5, 7), 200, np.uint8)
    assert ep._reducir(img, 2).shape == (3, 4)
    assert ep._reducir(img, 2)[2, 3] == 200


def test_recorte_calzado_se_alinea_a_la_grilla_global_antes_de_reducir():
    # Arrange: recorte de 5×3 px con origen impar (101, 51) y escala 2; un punto rojo en el
    # píxel global (102, 52), que es la celda global (51, 26)
    rgba = np.zeros((3, 5, 4), np.uint8)
    rgba[..., 3] = 255
    rgba[1, 1, :3] = (255, 0, 0)

    # Act
    reducido, (cx, cy) = ep.reducir_recorte(rgba, 101, 51, 2)

    # Assert: celdas [100, 106) × [50, 54) → 3×2 desde (50, 25)
    assert (cx, cy) == (50, 25) and reducido.shape == (2, 3, 4)
    assert reducido[1, 1, 0] > 0 and reducido[..., 0].sum() == reducido[1, 1, 0]
    assert reducido[0, 0, 3] < 128 <= reducido[1, 1, 3]   # la columna rellenada queda medio afuera


def test_escribir_imagen_falla_nombrando_la_ruta(tmp_path, monkeypatch):
    ruta = tmp_path / "x.png"
    ep.escribir_imagen(ruta, np.zeros((2, 2), np.uint8))
    assert ruta.exists()
    monkeypatch.setattr(ep.cv2, "imwrite", lambda *a, **k: False)
    with pytest.raises(OSError, match="x.png"):
        ep.escribir_imagen(ruta, np.zeros((2, 2), np.uint8))


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


def test_edificado_descarta_un_marco_cerrado_contando_el_borde_de_adentro():
    # Arrange: un marco de 8 px alrededor de un cuadrado de 100×100 y una manzana maciza
    rgba = np.full((200, 200, 4), 240, np.uint8)
    rgba[..., 3] = 255
    rgba[10:126, 10:126, :3] = (220, 60, 60)
    rgba[18:118, 18:118, :3] = 240            # el hueco: queda un borde de 8 px
    rgba[140:190, 140:190, :3] = (220, 60, 60)
    perfil = {"canal": "a", "umbral": 150, "sentido": "mayor"}

    # Act
    m = ep.edificado(rgba, perfil, cierre_px=1, area_minima_px=20, ancho_minimo_px=12)

    # Assert: con el borde de adentro el marco mide ~8 px de ancho (no ~15) y se va
    assert not m[12, 60] and m[165, 165]


def test_ancho_medio_de_un_marco_cuenta_los_dos_bordes():
    marco = np.zeros((120, 120), np.int32)
    marco[10:110, 10:110] = 1
    marco[18:102, 18:102] = 0
    n, etiquetas, stats, _ = __import__("cv2").connectedComponentsWithStats(marco.astype(np.uint8))
    assert ep._ancho_medio(etiquetas, stats[1], 1) == pytest.approx(8, abs=1)


def test_mascara_en_el_marco_recorta_lo_que_sale_de_la_forma():
    parcial = np.ones((3, 4), bool)
    m = ep.en_marco(parcial, recorte=(8, 3, 12, 6), forma=(5, 10))
    assert m.shape == (5, 10) and m.sum() == 4 and m[4, 9] and m[3, 8]


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
    huellas = ep.huellas(ciudad, forma=(40, 40), escala=1.0)
    f = ep.fracciones(huellas, [mascara])
    assert f[:, 0] == pytest.approx([1.0, 0.5], abs=0.05)


def test_fracciones_miden_cada_techo_en_su_huella_entera_aunque_otro_lo_pise():
    # Arrange: un techo de 20×20 con otro de 10×10 adentro (pintado después); lo edificado de la
    # época es justo el cuadrado de adentro
    ciudad = ciudad_de([cuadrado(0, 0, 20), cuadrado(5, 5, 10)])
    mascara = np.zeros((30, 30), bool)
    mascara[5:15, 5:15] = True

    # Act
    f = ep.fracciones(ep.huellas(ciudad, forma=(30, 30), escala=1.0), [mascara])

    # Assert: el de afuera tiene un 25 % edificado (no 0 %), el de adentro el 100 %
    assert f[:, 0] == pytest.approx([0.25, 1.0], abs=0.01)


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
    huellas36 = ep.huellas(c36, forma=(80, 80), escala=1.0)
    construido = [np.zeros((80, 80), bool) for _ in range(4)]
    construido[0][45:65, 45:65] = True  # la segunda sigue en pie en 1772 y se pierde en 1843

    # Act
    vida = ep.vida_de_1578(c78, huellas36, nace36=np.array([1]), construido=construido, escala=1.0)

    # Assert
    assert vida == [[0, 1], [0, 2]]


def test_la_posta_es_solo_de_las_casas_de_1936_que_por_si_solas_pisan_lo_suficiente():
    # Arrange: una casa de 1578 de 10×10; la de 1772 apenas la roza (1 columna = 10 %),
    # la de 1936 la cubre en un 60 %
    c78 = ciudad_de([cuadrado(10, 10, 10)])
    c36 = ciudad_de([cuadrado(9, 10, 2), cuadrado(14, 10, 6)])
    huellas36 = ep.huellas(c36, forma=(40, 40), escala=1.0)
    construido = [np.ones((40, 40), bool) for _ in range(4)]

    # Act
    vida = ep.vida_de_1578(c78, huellas36, nace36=np.array([1, 5]), construido=construido, escala=1.0)

    # Assert
    assert vida == [[0, 5]]


def test_la_posta_mide_cada_casa_de_1936_en_su_huella_aunque_se_encimen():
    # Arrange: la casa de 1578 queda bajo una de 1936 grande (nace en 1889) y bajo otra chica
    # que se pinta después encima de las dos (nace en 1936)
    c78 = ciudad_de([cuadrado(10, 10, 10)])
    c36 = ciudad_de([cuadrado(0, 0, 40), cuadrado(10, 10, 10)])
    huellas36 = ep.huellas(c36, forma=(40, 40), escala=1.0)
    construido = [np.ones((40, 40), bool) for _ in range(4)]

    # Act
    vida = ep.vida_de_1578(c78, huellas36, nace36=np.array([3, 5]), construido=construido, escala=1.0)

    # Assert: las dos la pisan enteras; gana la que nace primero
    assert vida == [[0, 3]]


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
    assert "esquinas" not in u


def test_unir_lleva_las_esquinas_de_las_dos_ciudades():
    a = {**ciudad_de([cuadrado(0, 0, 1)]), "esquinas": [1]}
    b = ciudad_de([cuadrado(5, 5, 1), cuadrado(9, 9, 1)])
    assert ep.unir(a, [[1, 0]], b, [[0, 1], [1, 3]])["esquinas"] == [1, 0, 0]
    assert ep.unir(b, [[0, 1], [1, 3]], a, [[1, 0]])["esquinas"] == [0, 0, 1]


# --- las cuadras cerradas y los edificios públicos de 1936 (tools/geo/vectorizar.py: cuadras, cede) ---

def test_una_cuadra_nace_entera_cuando_esta_la_mitad_de_sus_casas():
    nace = np.array([1, 1, 3, 4, 2, 5, 5, 2])
    cuadras = [0, 0, 0, 0, 1, 1, 1, -1]
    assert ep.cerrar_cuadras(nace, cuadras).tolist() == [1, 1, 1, 1, 5, 5, 5, 2]


def test_cerrar_cuadras_no_toca_el_original():
    nace = np.array([1, 4])
    ep.cerrar_cuadras(nace, [0, 0])
    assert nace.tolist() == [1, 4]


def test_los_edificios_publicos_nacen_recien_en_1889_y_las_casas_que_los_pisan_les_ceden_el_lugar():
    # Arrange: techo 0 un edificio público (estilo 9); 1 y 2 casas de la misma cuadra sobre él; 3 una casa
    # de una cuadra que nace cuando ya está el edificio
    ciudad = ciudad_de([cuadrado(0, 0, 10)] * 5)
    ciudad["techos"][0][3] = 9
    ciudad["cuadras"] = [-1, 0, 0, 1, -1]
    ciudad["cede"] = [-1, 0, -1, 0, -1]
    nace = np.array([1, 1, 2, 4, 2])

    # Act
    vida, quitar = ep.vida_de_1936(nace, ciudad)

    # Assert
    assert vida[0] == [ep.PUBLICOS_DESDE, 0]
    assert vida[1] == [1, ep.PUBLICOS_DESDE]      # la casa vive hasta que llega el edificio
    assert vida[2] == [1, 0]                      # su cuadra nace entera
    assert vida[4] == [2, 0]
    assert quitar == {3}                          # el edificio ya estaba cuando nace su cuadra


def test_la_posta_de_1578_sale_de_la_vida_final_de_1936():
    # Arrange: casa 0 de 1578 bajo un edificio público de 1936 (crudo: 1772) y bajo una casa que le cede
    # y se quita (su cuadra nace en 1911, con el edificio ya en pie); casa 1 de 1578 solo bajo esa casa quitada
    c78 = ciudad_de([cuadrado(0, 0, 10), cuadrado(30, 0, 10)])
    c36 = ciudad_de([cuadrado(0, 0, 10), cuadrado(0, 0, 10), cuadrado(30, 0, 10)])
    c36["techos"][0][3] = ep.ESTILO_PUBLICO
    c36["cuadras"], c36["cede"] = [-1, 0, 0], [-1, 0, 0]
    vida36, quitar = ep.vida_de_1936(np.array([1, 4, 4]), c36)
    construido = [np.ones((40, 40), bool) for _ in range(4)]
    construido[1][:, 25:] = False   # el lugar de la casa 1 deja de estar edificado en 1843

    # Act
    huellas36, nace36 = ep.relevos(ep.huellas(c36, forma=(40, 40), escala=1.0), vida36, quitar)
    vida = ep.vida_de_1578(c78, huellas36, nace36, construido=construido, escala=1.0)

    # Assert: la casa vieja dura hasta que llega el edificio, no hasta su nacimiento crudo; la otra
    # no la reemplaza un techo quitado
    assert quitar == {1, 2}
    assert vida == [[0, ep.PUBLICOS_DESDE], [0, 2]]


def test_sin_cuadras_ni_cede_la_vida_es_la_de_siempre():
    ciudad = ciudad_de([cuadrado(0, 0, 10)] * 2)
    vida, quitar = ep.vida_de_1936(np.array([1, 3]), ciudad)
    assert vida == [[1, 0], [3, 0]] and quitar == set()


def test_sin_techos_quita_los_techos_y_corre_los_marcos():
    ciudad = ciudad_de([cuadrado(0, 0, 10), cuadrado(20, 0, 10), cuadrado(40, 0, 10)])
    ciudad["esquinas"] = [0, 1, 0]
    ciudad["cuadras"], ciudad["cede"] = [0, 0, 0], [-1, -1, -1]
    ciudad["marcos"] = [[0, 0, 0, 1, 0, 10, 10, 0, 8, 0, 1], [2, 40, 0, 1, 0, 10, 10, 0, 8, 1, 1]]
    ciudad["alas"] = [[2, 0, 0, 10, 10], [2, 0, 0, 10, 10]]
    nueva, vida = ep.sin_techos(ciudad, [[1, 0], [2, 0], [3, 0]], {1})
    assert len(nueva["techos"]) == 2 and vida == [[1, 0], [3, 0]]
    assert nueva["esquinas"] == [0, 0]
    assert [m[0] for m in nueva["marcos"]] == [0, 1]
    v = np.asarray(nueva["vertices"]).reshape(-1, 2)
    i, n = nueva["techos"][1][:2]
    assert v[i:i + n].min(axis=0).tolist() == [40, 0]
    assert len(ciudad["techos"]) == 3   # el original queda como estaba


# --- las calles nuevas: la cuadra de antes vive hasta que se abre la calle; las de después, desde entonces ---

def test_una_calle_nueva_se_abre_en_la_primera_epoca_que_no_la_tiene_edificada():
    juntas = [[[10, 10, 20, 10, 20, 30, 10, 30]], [[40, 0, 44, 0, 44, 8, 40, 8]]]
    edificado = []
    for cubre in ([True, True], [True, True], [False, True], [False, True]):   # 1772, 1843, 1889, 1919
        m = np.zeros((40, 50), bool)
        if cubre[0]:
            m[5:35, 5:25] = True
        if cubre[1]:
            m[0:10, 38:48] = True
        edificado.append(m)
    assert ep.apertura_de_juntas(juntas, edificado, escala=1.0) == [3, ep.ULTIMA]


def test_la_cuadra_de_antes_vive_hasta_que_se_abre_la_calle_y_las_de_despues_nacen_entonces():
    # techos: 0 y 1 la cuadra de antes; 2 y 3 las dos de después; 4 una cuadra de antes que nace tarde
    ciudad = ciudad_de([cuadrado(0, 0, 10)] * 5)
    ciudad["cuadras"] = [0, 0, 1, 2, 3]
    ciudad["junta"] = [0, 0, 0, 0, 1]
    ciudad["antes"] = [1, 1, 0, 0, 1]
    nace = np.array([1, 2, 1, 1, 4])
    vida, quitar = ep.vida_de_1936(nace, ciudad, apertura=[3, 2])
    assert vida[0] == [1, 3] and vida[1] == [1, 3]   # la cuadra entera, cerrada, hasta 1889
    assert vida[2] == [3, 0] and vida[3] == [3, 0]   # las partidas, desde 1889
    assert quitar == {4}                             # su calle ya estaba abierta cuando nace


def test_sin_techos_tambien_corre_junta_y_antes():
    ciudad = ciudad_de([cuadrado(0, 0, 10)] * 3)
    ciudad["junta"], ciudad["antes"] = [0, -1, 0], [1, 0, 0]
    nueva, _ = ep.sin_techos(ciudad, [[1, 0], [1, 0], [1, 0]], {0})
    assert nueva["junta"] == [-1, 0] and nueva["antes"] == [0, 0]


def test_una_casa_de_despues_que_cede_a_un_edificio_publico_muere_cuando_el_nace():
    # Arrange: techo 0 un edificio público (nace en 1889); 1 y 2 casas de después de una calle nueva que le
    # ceden el lugar: la 1 de una calle que se abre en 1843, la 2 de una que se abre en 1911
    ciudad = ciudad_de([cuadrado(0, 0, 10)] * 3)
    ciudad["techos"][0][3] = ep.ESTILO_PUBLICO
    ciudad["cede"], ciudad["junta"], ciudad["antes"] = [-1, 0, 0], [-1, 0, 1], [0, 0, 0]
    ciudad["cuadras"] = [-1, 0, 1]

    # Act
    vida, quitar = ep.vida_de_1936(np.array([1, 1, 1]), ciudad, apertura=[2, 4])

    # Assert
    assert vida[1] == [2, ep.PUBLICOS_DESDE]   # nace con su calle y vive hasta que llega el edificio
    assert quitar == {2}                       # su calle se abre cuando el edificio ya está: no llega a vivir
