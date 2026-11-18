"""Tests de «lo de hoy»: OSM (Overpass) → píxeles del mosaico 1936 → máscaras y nombres de calles."""
import io
import json
import struct

import numpy as np
import pytest

import geo1936 as geo
import hoy
import hoy_osm as osm

# similitud plausible para el plano (como en test_relieve)
TRANSF = geo.ajustar([[0, 0], [1000, 0], [0, 1000]],
                     [[726648.0, 1161835.0], [727648.6, 1161840.0], [726643.0, 1162834.6]], "similitud")


def _latlon(px, py):
    lat, lon = geo.grid_a_wgs84(*geo.px_a_grid(np.asarray(px, float), np.asarray(py, float)), TRANSF)
    return lat, lon


def _way(tags, pxs, pys, id_=1):
    lat, lon = _latlon(pxs, pys)
    return {"type": "way", "id": id_, "tags": tags,
            "geometry": [{"lat": float(a), "lon": float(o)} for a, o in zip(lat, lon)]}


# --- descarga --------------------------------------------------------------------------------
def test_bbox_cubre_el_mosaico_con_margen():
    s, w, n, e = osm.bbox_wgs84(18600, 14800, TRANSF, margen_m=200.0)
    lat, lon = _latlon([0, 18600, 0, 18600], [0, 0, 14800, 14800])
    assert s < lat.min() and n > lat.max() and w < lon.min() and e > lon.max()
    # el margen es de unos 200 m (≈ 0,0018° de latitud), no más de 300 m
    assert lat.min() - s == pytest.approx(200 / 111000, rel=0.5)


def test_consulta_pide_calles_vias_y_agua_con_geometria():
    q = osm.consulta((10.4, -67.0, 10.6, -66.8))
    assert q.startswith("[out:json]")
    assert "[bbox:10.4,-67.0,10.6,-66.8]" in q
    for clave in ('"highway"', '"railway"', '"waterway"', '"natural"'):
        assert clave in q
    assert q.rstrip().endswith("out geom;")


class _Respuesta(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_descargar_usa_la_cache_si_existe(tmp_path):
    destino = tmp_path / "osm.json"
    destino.write_text('{"elements": []}')
    llamadas = []
    assert osm.descargar(destino, (0, 0, 1, 1), abrir=lambda *a, **k: llamadas.append(a)) is False
    assert llamadas == []


def test_descargar_baja_con_user_agent_generico_y_guarda(tmp_path):
    destino = tmp_path / "sub" / "osm.json"
    pedidos = []

    def abrir(pedido, timeout):
        pedidos.append(pedido)
        return _Respuesta(b'{"elements": [{"type": "way"}]}')

    assert osm.descargar(destino, (10.4, -67.0, 10.6, -66.8), abrir=abrir) is True
    assert json.loads(destino.read_text())["elements"] == [{"type": "way"}]
    assert pedidos[0].get_header("User-agent") == "caracas-historica/0.1"
    assert b"bbox" in pedidos[0].data
    # forzar vuelve a bajar
    assert osm.descargar(destino, (10.4, -67.0, 10.6, -66.8), forzar=True, abrir=abrir) is True
    assert len(pedidos) == 2


def test_descargar_rechaza_una_respuesta_que_no_es_overpass(tmp_path):
    destino = tmp_path / "osm.json"
    with pytest.raises(ValueError):
        osm.descargar(destino, (0, 0, 1, 1), abrir=lambda p, timeout: _Respuesta(b'<html>error</html>'))
    assert not destino.exists()


# --- clasificación ---------------------------------------------------------------------------
@pytest.mark.parametrize("tags,capa,mayor,lejos", [
    ({"highway": "primary"}, "calle", True, True),
    ({"highway": "trunk_link"}, "calle", True, True),
    ({"highway": "residential"}, "calle", False, False),
    ({"highway": "pedestrian"}, "calle", False, False),
    ({"railway": "rail"}, "via", False, True),
    ({"railway": "subway"}, "via", False, True),
    ({"waterway": "river"}, "agua", False, True),
    ({"waterway": "stream"}, "agua", False, False),
    ({"natural": "water"}, "agua", False, True),
])
def test_clasificar(tags, capa, mayor, lejos):
    c = osm.clasificar(tags)
    assert (c["capa"], c["mayor"], c["lejos"]) == (capa, mayor, lejos)
    assert c["ancho_m"] > 0


@pytest.mark.parametrize("tags", [
    {"highway": "footway"}, {"highway": "service"}, {"highway": "primary", "tunnel": "yes"},
    {"railway": "subway", "tunnel": "yes"}, {"waterway": "stream", "tunnel": "culvert"},
    {"railway": "abandoned"}, {"building": "yes"}, {},
    {"railway": "subway", "layer": "-2"}, {"railway": "subway", "location": "underground"},
    {"highway": "residential", "name": "Túnel San Francisco a Miracielos"},
])
def test_clasificar_descarta(tags):
    assert osm.clasificar(tags) is None


def test_clasificar_deja_los_pasajes_bajo_edificios():
    assert osm.clasificar({"highway": "residential", "tunnel": "building_passage"})["capa"] == "calle"


def test_clasificar_deja_las_calles_en_trinchera_y_el_metro_elevado():
    assert osm.clasificar({"highway": "primary", "layer": "-1"})["capa"] == "calle"
    assert osm.clasificar({"railway": "subway", "layer": "1", "location": "overhead"})["capa"] == "via"
    assert osm.clasificar({"railway": "subway", "layer": "x"})["capa"] == "via"


def test_agua_cerrada_es_area_y_un_rio_es_linea():
    assert osm.clasificar({"natural": "water"})["area"] is True
    assert osm.clasificar({"waterway": "river"})["area"] is False


# --- elementos -------------------------------------------------------------------------------
def test_elementos_lleva_las_coordenadas_al_pixel_del_mosaico():
    pxs, pys = [100.0, 900.0, 900.0], [200.0, 200.0, 700.0]
    datos = {"elements": [_way({"highway": "residential", "name": "Calle Real"}, pxs, pys),
                          _way({"highway": "footway"}, pxs, pys, id_=2)]}
    els = osm.elementos(datos, TRANSF)
    assert len(els) == 1
    e = els[0]
    assert e["nombre"] == "Calle Real" and e["capa"] == "calle"
    assert len(e["lineas"]) == 1
    assert np.allclose(e["lineas"][0], np.c_[pxs, pys], atol=1e-4)


def test_elementos_arma_los_anillos_de_un_multipoligono_de_agua():
    # un cuadrado partido en dos ways (uno al revés) + un hueco
    a = _way({}, [0, 100, 100], [0, 0, 100])
    b = _way({}, [0, 0, 100], [0, 100, 100])
    hueco = _way({}, [40, 60, 60, 40, 40], [40, 40, 60, 60, 40])
    rel = {"type": "relation", "id": 9, "tags": {"type": "multipolygon", "natural": "water"},
           "members": [{"type": "way", "role": "outer", "geometry": a["geometry"]},
                       {"type": "way", "role": "outer", "geometry": b["geometry"]},
                       {"type": "way", "role": "inner", "geometry": hueco["geometry"]}]}
    els = osm.elementos({"elements": [rel]}, TRANSF)
    assert len(els) == 1 and els[0]["area"] is True
    anillos = els[0]["lineas"]
    assert len(anillos) == 2
    assert sorted(len(r) for r in anillos) == [5, 5]
    for r in anillos:
        assert np.allclose(r[0], r[-1], atol=1e-6)


def test_unir_anillos_descarta_lo_que_no_cierra():
    abierto = [np.array([[0.0, 0.0], [1.0, 0.0], [1.0, 1.0]])]
    assert osm.unir_anillos(abierto) == []


# --- rasterizado -----------------------------------------------------------------------------
def _elem(capa, puntos, ancho_m=8.0, lejos=True, area=False, nombre=None):
    return {"capa": capa, "mayor": lejos, "lejos": lejos, "ancho_m": ancho_m, "area": area, "nombre": nombre,
            "lineas": [np.asarray(puntos, float)]}


def test_rasterizar_pone_cada_capa_en_su_canal():
    els = [_elem("calle", [[10, 50], [190, 50]]),
           _elem("via", [[100, 10], [100, 190]]),
           _elem("agua", [[20, 120], [80, 120], [80, 180], [20, 180], [20, 120]], area=True)]
    img = hoy.rasterizar(els, (200, 200), (200, 200), tesela=64)
    assert img.shape == (200, 200, 3) and img.dtype == np.uint8
    assert img[50, 40, 0] == 255 and img[50, 40, 1] == 0
    assert img[150, 100, 1] == 255 and img[150, 100, 0] == 0
    assert img[150, 50, 2] == 255  # el área se rellena
    assert img[5, 5].max() == 0


def test_rasterizar_ancho_en_metros_y_bordes_suaves():
    # 8 m = 16 px del mosaico a 0,5 m/px; a escala 1 la calle ocupa ~16 filas
    img = hoy.rasterizar([_elem("calle", [[0, 100], [200, 100]], ancho_m=8.0)], (200, 200), (200, 200))
    col = img[:, 100, 0].astype(int)
    assert 15 <= (col > 127).sum() <= 17
    assert ((col > 0) & (col < 255)).any()  # antialias


def test_rasterizar_escala_y_ancho_minimo_de_un_pixel():
    # mosaico de 2000×1000 px en 200×100: 1 px = 10 px del mosaico (5 m); un riel de 2 m sigue viéndose
    img = hoy.rasterizar([_elem("via", [[0, 500], [2000, 500]], ancho_m=2.0)], (1000, 2000), (100, 200))
    assert img.shape == (100, 200, 3)
    assert img[:, 100, 1].sum() >= 200


def test_rasterizar_lejos_solo_dibuja_lo_mayor():
    els = [_elem("calle", [[0, 50], [200, 50]], lejos=True), _elem("calle", [[0, 150], [200, 150]], lejos=False)]
    img = hoy.rasterizar(els, (200, 200), (200, 200), cerca=False)
    assert img[50, 100, 0] == 255 and img[150, 100, 0] == 0


def test_rasterizar_por_teselas_da_lo_mismo_que_de_una():
    els = [_elem("calle", [[3, 7], [190, 170]], ancho_m=5.0), _elem("agua", [[150, 10], [20, 190]], ancho_m=3.0)]
    una = hoy.rasterizar(els, (200, 200), (200, 200), tesela=4096)
    teselas = hoy.rasterizar(els, (200, 200), (200, 200), tesela=48)
    # cv2 recorta cada línea al lienzo antes de engrosarla: el borde puede correrse un subpíxel (1/4 px)
    assert np.abs(una.astype(int) - teselas.astype(int)).max() <= 255 // hoy.SOBREMUESTREO + 1
    assert int(teselas.sum()) == pytest.approx(int(una.sum()), rel=0.02)


def test_rasterizar_con_ventana_desplaza_el_origen():
    els = [_elem("calle", [[1000, 1050], [1200, 1050]], ancho_m=4.0)]
    img = hoy.rasterizar(els, (100, 100), (100, 100), origen=(1000, 1000))
    assert img[50, 50, 0] == 255 and img[10, 50, 0] == 0


# --- nombres de calles -----------------------------------------------------------------------
def test_tramos_parte_una_recta_larga_en_tramos_de_hasta_el_maximo():
    # 1000 px = 500 m en línea recta, con un vértice cada 10 m
    pts = np.c_[np.linspace(0, 1000, 51), np.full(51, 300.0)]
    t = hoy.tramos(pts, largo_max_m=200.0)
    assert len(t) == 3
    assert sum(x[4] for x in t) == pytest.approx(500.0)
    for mx, my, dx, dy, largo in t:
        assert my == pytest.approx(300.0) and (dx, dy) == pytest.approx((1.0, 0.0))


def test_tramos_corta_en_los_quiebres_y_orienta_para_leer():
    # L: 100 m hacia el oeste y 100 m hacia el sur
    pts = np.array([[400.0, 0.0], [200.0, 0.0], [200.0, 200.0]])
    t = hoy.tramos(pts, largo_max_m=500.0)
    assert len(t) == 2
    assert t[0][:4] == pytest.approx((300.0, 0.0, 1.0, 0.0))  # leído de izquierda a derecha
    assert t[1][:4] == pytest.approx((200.0, 100.0, 0.0, -1.0))  # vertical: de abajo hacia arriba
    assert [x[4] for x in t] == pytest.approx([100.0, 100.0])


def test_calles_codifica_registros_de_seis_uint16():
    els = [_elem("calle", [[0, 100], [400, 100]], nombre="Avenida Urdaneta"),
           _elem("calle", [[100, 0], [100, 120]], nombre="Calle Norte"),
           _elem("calle", [[0, 300], [400, 300]], nombre=None),
           _elem("agua", [[0, 500], [400, 500]], nombre="Río Guaire")]
    nombres, reg = hoy.calles(els, ancho_px=1000, alto_px=1000)
    assert nombres == ["Avenida Urdaneta", "Calle Norte"]
    assert reg.dtype == np.uint16 and reg.shape == (2, 6)
    # ordenados por largo: primero la avenida (200 m)
    x, y, dx, dy, i, largo = reg[0]
    assert (x, y, i, largo) == (200, 100, 0, 200)
    assert (int(dx) - 32768) / 32767 == pytest.approx(1.0) and (int(dy) - 32768) / 32767 == pytest.approx(0.0)
    assert (reg[1][4], reg[1][5]) == (1, 60)
    assert (int(reg[1][3]) - 32768) / 32767 == pytest.approx(-1.0)


def test_calles_deja_afuera_los_tramos_fuera_del_mosaico_y_los_muy_cortos():
    els = [_elem("calle", [[-500, 100], [-100, 100]], nombre="Afuera"),
           _elem("calle", [[10, 10], [20, 10]], nombre="Cortita")]
    nombres, reg = hoy.calles(els, ancho_px=1000, alto_px=1000)
    assert nombres == [] and reg.shape == (0, 6)


def test_calles_bin_es_little_endian():
    reg = np.array([[1, 2, 3, 4, 5, 258]], dtype=np.uint16)
    assert hoy.codificar_calles(reg) == struct.pack("<6H", 1, 2, 3, 4, 5, 258)


# --- salida ----------------------------------------------------------------------------------
def test_webp_sin_perdida_conserva_los_canales(tmp_path):
    img = np.zeros((40, 60, 3), np.uint8)
    img[5, 7] = (255, 0, 0)
    img[9, 11] = (0, 128, 0)
    img[20, 30] = (0, 0, 33)
    ruta = tmp_path / "x.webp"
    hoy.escribir_webp(ruta, img)
    assert np.array_equal(hoy.leer_webp(ruta), img)


def test_forma_salida_respeta_el_lado_mayor():
    assert hoy.forma_salida(18600, 14800, 2048) == (1630, 2048)
    assert hoy.forma_salida(18600, 14800, 8192) == (6518, 8192)


# --- control de calidad ----------------------------------------------------------------------
def test_desfase_recupera_un_corrimiento_conocido():
    import hoy_qa
    rng = np.random.default_rng(1)
    base = np.zeros((400, 400), np.float32)
    for _ in range(40):  # cuadrícula irregular de calles
        x, y = rng.integers(20, 380, 2)
        base[y - 2:y + 2, 20:380] = 1 if rng.random() < 0.5 else 0
        base[20:380, x - 2:x + 2] = 1
    movida = np.roll(base, (6, -4), axis=(0, 1))  # 6 px al sur, 4 px al oeste
    dx, dy = hoy_qa.desfase(base, movida)
    assert (dx, dy) == pytest.approx((-4.0, 6.0), abs=0.3)


def test_superponer_tine_de_rojo_lo_cubierto():
    import hoy_qa
    fondo = np.full((4, 4, 3), 200, np.uint8)
    cobertura = np.zeros((4, 4), np.uint8)
    cobertura[1, 1] = 255
    out = hoy_qa.superponer(fondo, cobertura, opacidad=1.0)
    assert tuple(out[1, 1]) == (220, 30, 30) and tuple(out[0, 0]) == (200, 200, 200)


def test_descargar_rechaza_un_error_de_overpass_y_conserva_la_cache(tmp_path):
    destino = tmp_path / "osm.json"
    destino.write_text('{"elements": [{"type": "way"}]}')
    malo = b'{"elements": [], "remark": "runtime error: Query timed out in \\"query\\" at line 3 after 301 seconds."}'
    with pytest.raises(ValueError, match="runtime error"):
        osm.descargar(destino, (0, 0, 1, 1), forzar=True, abrir=lambda p, timeout: _Respuesta(malo))
    assert json.loads(destino.read_text())["elements"] == [{"type": "way"}]


def test_descargar_reintenta_con_pausa_si_overpass_esta_ocupado(tmp_path):
    import urllib.error
    respuestas = [urllib.error.HTTPError("u", 502, "Bad Gateway", {}, None), _Respuesta(b'{"elements": []}')]
    pausas = []

    def abrir(pedido, timeout):
        r = respuestas.pop(0)
        if isinstance(r, Exception):
            raise r
        return r

    assert osm.descargar(tmp_path / "osm.json", (0, 0, 1, 1), abrir=abrir, dormir=pausas.append) is True
    assert pausas == [osm.REINTENTOS_S[0]]


def test_descargar_no_reintenta_un_error_de_la_consulta(tmp_path):
    import urllib.error

    def abrir(pedido, timeout):
        raise urllib.error.HTTPError("u", 400, "Bad Request", {}, None)

    with pytest.raises(urllib.error.HTTPError):
        osm.descargar(tmp_path / "osm.json", (0, 0, 1, 1), abrir=abrir, dormir=lambda s: None)


def test_generar_escribe_las_cuatro_salidas(tmp_path):
    datos = {"elements": [_way({"highway": "primary", "name": "Avenida Baralt"}, [100, 1900], [500, 500]),
                          _way({"highway": "residential"}, [1000, 1000], [0, 1500], id_=2),
                          _way({"waterway": "river"}, [0, 2000], [1200, 1300], id_=3)]}
    ruta = tmp_path / "osm.json"
    ruta.write_text(json.dumps(datos))
    hoy.generar(ruta, {"ancho": 2000, "alto": 1500}, tmp_path, tmp_path, TRANSF)
    cerca = hoy.leer_webp(tmp_path / "hoy-cerca.webp")
    lejos = hoy.leer_webp(tmp_path / "hoy-lejos.webp")
    assert cerca.shape == (6144, 8192, 3) and lejos.shape == (1536, 2048, 3)
    assert cerca[2048, 2000, 0] == 255 and lejos[512, 500, 0] == 255  # la avenida, en las dos
    assert cerca[3000, 4096, 0] == 255 and lejos[750, 1024, 0] == 0  # la calle residencial, solo de cerca
    assert lejos[..., 2].max() == 255  # el río
    assert json.loads((tmp_path / "calles.json").read_text()) == ["Avenida Baralt"]
    assert len((tmp_path / "calles.bin").read_bytes()) == 12 * 5  # 900 m en 5 tramos de 180 m


def test_qa_mide_el_desfase_contra_las_calles_de_1936(tmp_path, monkeypatch):
    import cv2
    import tifffile

    import hoy_qa
    from segmentar_clases import CALLE
    monkeypatch.setattr(hoy_qa, "VENTANA_DESFASE_PX", (400, 400))
    monkeypatch.setattr(hoy_qa, "VENTANA_QA_PX", (200, 300))
    monkeypatch.setattr(hoy_qa, "DESFASE_MAX_PX", 20)
    # cuadrícula de calles de OSM; las de "1936" están 6 px al este y 4 px al norte
    els = [_elem("calle", [[x, 0], [x, 600]], ancho_m=6.0) for x in (130, 210, 330, 420)] + \
          [_elem("calle", [[0, y], [600, y]], ancho_m=6.0) for y in (140, 260, 350, 470)]
    clases = np.zeros((600, 600), np.uint8)
    clases[hoy.rasterizar(els, (600, 600), (600, 600))[..., 0] > 127] = CALLE
    clases = np.roll(clases, (-4, 6), axis=(0, 1))
    cv2.imwrite(str(tmp_path / "clases.png"), clases)
    tifffile.imwrite(tmp_path / "mosaico.tif", np.full((600, 600, 3), 230, np.uint8))
    informe = hoy_qa.generar(els, {"plaza": [300, 300], "metro": 0.5}, tmp_path / "mosaico.tif",
                             tmp_path / "clases.png", tmp_path / "qa" / "qa.jpg")
    assert informe["desfase_px"] == pytest.approx([6.0, -4.0], abs=0.5)
    assert informe["desfase_m"] == pytest.approx([3.0, -2.0], abs=0.25)
    assert cv2.imread(str(tmp_path / "qa" / "qa.jpg")).shape == (200, 300, 3)
    assert json.loads((tmp_path / "qa" / "qa.json").read_text())["desfase_px"] == informe["desfase_px"]
