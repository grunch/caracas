import math

import cv2
import numpy as np
import pytest
from shapely.geometry import LineString, Polygon, box

from tools.geo.lotes import (
    cortes, fundir_chicos, lados_cortos, lotes_de_manzana, lotes_por_semillas, orientacion, sin_pelos,
)
from tools.geo.vectorizar import CLASE, vectorizar

METRO = 0.5  # m/px


def poligonos(res):
    v = np.asarray(res['vertices'], float).reshape(-1, 2)
    return [Polygon(v[i:i + n]) for i, n, *_ in res['techos']]


def manzana_girada(lado_m=100, grados=0.0, lienzo=360):
    """Una manzana cuadrada toda edificada, girada `grados`, con calle alrededor. → (clases, esquinas)."""
    c = np.full((lienzo, lienzo), CLASE['calle'], np.uint8)
    r = lado_m / METRO / 2
    a = math.radians(grados)
    esquinas = np.array([[lienzo / 2 + x * math.cos(a) - y * math.sin(a), lienzo / 2 + x * math.sin(a) + y * math.cos(a)]
                         for x, y in ((-r, -r), (r, -r), (r, r), (-r, r))])
    cv2.fillPoly(c, [np.round(esquinas).astype(np.int32)], CLASE['edificado'])
    return c, esquinas


def lados_de(esquinas):
    return [LineString([esquinas[i], esquinas[(i + 1) % len(esquinas)]]) for i in range(len(esquinas))]


def angulo_minimo(poli):
    """El ángulo interior más cerrado del polígono, en grados (sin los vértices casi alineados)."""
    p = np.asarray(poli.simplify(1.0).exterior.coords)[:-1]
    minimo = 180.0
    for i in range(len(p)):
        a, b = p[i - 1] - p[i], p[(i + 1) % len(p)] - p[i]
        coseno = np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
        minimo = min(minimo, math.degrees(math.acos(np.clip(coseno, -1, 1))))
    return minimo


def relleno(poli):
    """Cuánto llena el polígono su rectángulo mínimo: 1 = rectángulo."""
    return poli.area / poli.minimum_rotated_rectangle.area


def eje_largo(poli):
    """(dirección unitaria del lado largo del rectángulo mínimo, largo / ancho)."""
    r = np.asarray(poli.minimum_rotated_rectangle.exterior.coords)
    a, b = r[1] - r[0], r[2] - r[1]
    la, lb = np.linalg.norm(a), np.linalg.norm(b)
    return (a / la, la / lb) if la >= lb else (b / lb, lb / la)


def frentes(poli, lados, cerca=3.0):
    return [lado for lado in lados if poli.distance(lado) < cerca]


@pytest.mark.parametrize('grados', [0.0, 10.0, -27.0])
def test_una_manzana_maciza_se_parte_en_lotes_rectos(grados):
    clases, esquinas = manzana_girada(100, grados)
    polis = poligonos(vectorizar(clases, METRO, plaza=(180, 180)))
    lados = lados_de(esquinas)
    assert 400 / 16 <= len(polis) <= 400 / 8
    assert all(p.is_valid for p in polis)
    assert min(angulo_minimo(p) for p in polis) >= 25, 'hay cuñas'
    assert min(relleno(p) for p in polis) >= 0.8, 'hay lotes que no son rectángulos'
    assert sum(p.area for p in polis) == pytest.approx(200 * 200, rel=0.03)
    for p in polis:
        mios = frentes(p, lados)
        assert mios, 'todo lote da a la calle'
        direccion, proporcion = eje_largo(p)
        if len(mios) == 1 and proporcion >= 1.3:  # los de esquina dan a dos calles
            (x0, y0), (x1, y1) = mios[0].coords
            lado = np.array([x1 - x0, y1 - y0]) / mios[0].length
            assert abs(np.dot(direccion, lado)) < 0.2, 'el fondo del lote es perpendicular a su calle'


def test_ningun_lote_llega_en_punta_al_centro_de_la_manzana():
    clases, _ = manzana_girada(100, 0)
    polis = poligonos(vectorizar(clases, METRO, plaza=(180, 180)))
    centro = box(178, 178, 182, 182)
    assert sum(p.intersects(centro) for p in polis) <= 4


def test_una_manzana_con_patio_tiene_casas_rectas_en_la_corona():
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    c[70:190, 70:190] = CLASE['patio']
    polis = poligonos(vectorizar(c, METRO, plaza=(130, 130)))
    lados = lados_de(np.array([[30, 30], [230, 30], [230, 230], [30, 230]], float))
    de_un_frente = [p for p in polis if len(frentes(p, lados)) == 1]
    assert len(de_un_frente) >= 16
    assert min(relleno(p) for p in de_un_frente) >= 0.8
    assert min(angulo_minimo(p) for p in polis) >= 25


def test_un_lado_largo_apenas_torcido_no_deja_tiras_finas_contra_la_calle():
    """Un trapecio: el lado de arriba baja 4° respecto del de abajo. Ningún techo tiene pelos."""
    c = np.full((260, 400), CLASE['calle'], np.uint8)
    esquinas = np.array([[40, 60], [360, 82], [360, 200], [40, 200]])
    cv2.fillPoly(c, [esquinas.astype(np.int32)], CLASE['edificado'])
    polis = poligonos(vectorizar(c, METRO, plaza=(0, 0)))
    assert sum(p.area for p in polis) == pytest.approx(int((c == CLASE['edificado']).sum()), rel=0.03)
    for p in polis:
        sin_pelos = p.buffer(-3).buffer(3)
        assert sin_pelos.area >= 0.95 * p.area
    assert min(relleno(p) for p in polis) >= 0.7
    assert min(angulo_minimo(p) for p in polis) >= 25


def test_un_callejon_no_hace_de_cabecera():
    """Una manzana con un callejón de 3 m que entra 30 m por el lado corto: ningún techo sale en tira."""
    c = np.full((260, 400), CLASE['calle'], np.uint8)
    c[40:220, 40:360] = CLASE['edificado']   # 160 × 90 m
    c[127:133, 40:100] = CLASE['calle']
    polis = poligonos(vectorizar(c, METRO, plaza=(0, 0)))
    for p in polis:
        assert p.buffer(-4).buffer(4).area >= 0.8 * p.area, 'un techo de menos de 4 m de ancho'
    assert min(angulo_minimo(p) for p in polis) >= 25


def test_lados_cortos_solo_cuenta_las_cabeceras_largas():
    # un rectángulo de 100 × 40 con una muesca de 6 de ancho y 10 de fondo en el lado de arriba
    puntos = np.array([[0, 0], [40, 0], [40, 10], [46, 10], [46, 0], [100, 0], [100, 40], [0, 40]])
    assert lados_cortos(puntos, 18).tolist() == [False, False, False, False, False, True, False, True]
    assert lados_cortos(puntos, 50).tolist() == [False] * 8
    # una esquina en dos tramos (ochava empinada): los dos suman
    ochava = np.array([[0, 0], [100, 0], [100, 30], [96, 40], [0, 40]])
    assert lados_cortos(ochava, 35).tolist() == [False, True, True, False, True]
    cuadrado = np.array([[0, 0], [0, 30], [1, 60], [0, 90]])   # todos a lo ancho
    assert lados_cortos(cuadrado, 18).all()


def manzana_en_ele():
    """Una L de 120×120 m con brazos de 50 m, toda edificada."""
    c = np.full((300, 300), CLASE['calle'], np.uint8)
    c[30:270, 30:130] = CLASE['edificado']
    c[170:270, 30:270] = CLASE['edificado']
    return c


def test_una_manzana_en_ele_tambien_da_lotes_rectos():
    c = manzana_en_ele()
    polis = poligonos(vectorizar(c, METRO, plaza=(150, 150)))
    edificado_px = int((c == CLASE['edificado']).sum())
    assert all(p.is_valid for p in polis)
    assert sum(p.area for p in polis) == pytest.approx(edificado_px, rel=0.03)
    assert min(angulo_minimo(p) for p in polis) >= 25
    rectos = sum(relleno(p) >= 0.8 for p in polis)
    assert rectos >= 0.9 * len(polis)
    assert 30 <= len(polis) <= 70


def test_una_casa_suelta_es_un_solo_techo():
    c = np.full((80, 80), CLASE['calle'], np.uint8)
    c[30:46, 30:50] = CLASE['edificado']  # 8 × 10 m
    res = vectorizar(c, METRO, plaza=(0, 0))
    assert len(res['techos']) == 1
    assert poligonos(res)[0].area == pytest.approx(16 * 20, rel=0.05)


def test_una_hilera_de_casas_se_corta_solo_a_lo_ancho():
    c = np.full((80, 260), CLASE['calle'], np.uint8)
    c[30:50, 30:230] = CLASE['edificado']  # 10 m de fondo × 100 m de frente
    polis = poligonos(vectorizar(c, METRO, plaza=(0, 0)))
    assert 7 <= len(polis) <= 11
    assert all(p.bounds[3] - p.bounds[1] == pytest.approx(20, abs=2) for p in polis)
    assert min(relleno(p) for p in polis) >= 0.9


def manzana_curva():
    """Una hilera angosta (12 m) que sigue una calle en arco: sin dirección dominante."""
    c = np.full((400, 400), CLASE['calle'], np.uint8)
    cv2.ellipse(c, (200, 380), (300, 300), 0, 200, 340, int(CLASE['edificado']), 24)
    return c


def test_una_manzana_curva_y_angosta_cae_al_metodo_de_las_semillas():
    c = manzana_curva()
    manzana = c == CLASE['edificado']
    lotes = lotes_de_manzana(manzana, METRO, semilla=7)
    assert np.array_equal(lotes, lotes_por_semillas(manzana, 12.0 / METRO))
    polis = poligonos(vectorizar(c, METRO, plaza=(0, 0)))
    assert all(p.is_valid for p in polis)
    assert sum(p.area for p in polis) == pytest.approx(int(manzana.sum()), rel=0.05)
    assert len(polis) >= 20


def test_los_lotes_cubren_toda_la_manzana_y_nada_mas():
    clases, _ = manzana_girada(100, 10)
    manzana = clases == CLASE['edificado']
    lotes = lotes_de_manzana(manzana, METRO, semilla=3)
    assert lotes.shape == manzana.shape
    assert np.array_equal(lotes > 0, manzana)


def test_los_lotes_dependen_de_la_semilla_pero_son_deterministas():
    clases, _ = manzana_girada(100, 10)
    manzana = clases == CLASE['edificado']
    a, b, otro = (lotes_de_manzana(manzana, METRO, semilla=s) for s in (3, 3, 4))
    assert np.array_equal(a, b)
    assert not np.array_equal(a, otro)


def test_orientacion_de_un_cuadrado_girado():
    for grados in (0, 10, 40, -27):
        _, esquinas = manzana_girada(100, grados)
        angulo, alineacion = orientacion([esquinas])
        diferencia = (math.degrees(angulo) - grados) % 90
        assert min(diferencia, 90 - diferencia) < 0.5
        assert alineacion > 0.99


def test_orientacion_de_un_circulo_no_tiene_direccion():
    t = np.linspace(0, 2 * math.pi, 48, endpoint=False)
    _, alineacion = orientacion([np.c_[100 * np.cos(t), 100 * np.sin(t)]])
    assert alineacion < 0.05


def test_cortes_reparte_frentes_entre_el_minimo_y_el_maximo():
    rng = np.random.default_rng(1)
    c = cortes(100.0, 300.0, rng, minimo=18.0, maximo=28.0, margen=150.0)
    dentro = c[(c >= 100.0) & (c <= 300.0)]
    assert dentro[0] == pytest.approx(100.0) and dentro[-1] == pytest.approx(300.0)
    anchos = np.diff(dentro)
    assert anchos.min() >= 18.0 * 0.85 and anchos.max() <= 28.0 * 1.15
    assert c[0] < 0 and c[-1] > 400, 'los cortes siguen más allá del tramo'
    assert np.all(np.diff(c) > 0)


def test_cortes_de_un_tramo_corto_es_un_solo_lote():
    c = cortes(10.0, 22.0, np.random.default_rng(1), minimo=18.0, maximo=28.0)
    assert ((c > 10.5) & (c < 21.5)).sum() == 0


def test_fundir_chicos_une_el_pedazo_al_vecino_con_mas_contacto():
    casas = np.zeros((20, 30), np.int32)
    casas[:, :14] = 1
    casas[:, 14:] = 2
    casas[0:2, 10:16] = 3      # un pedacito a caballo de los dos, con más borde contra el 1
    fundidas = fundir_chicos(casas, area_minima_px=20)
    assert set(np.unique(fundidas)) == {1, 2}
    assert fundidas[0, 10] == 1 and fundidas[0, 15] == 1
    assert fundidas[10, 20] == 2


def test_fundir_chicos_deja_en_paz_a_la_casa_chica_aislada():
    casas = np.zeros((20, 30), np.int32)
    casas[2:5, 2:5] = 1
    casas[10:20, 10:30] = 2
    assert np.array_equal(fundir_chicos(casas, area_minima_px=20), casas)


def test_sin_pelos_le_da_la_tira_fina_a_la_casa_de_al_lado():
    casas = np.zeros((40, 60), np.int32)
    casas[10:30, 5:25] = 1
    casas[10:30, 25:55] = 2
    casas[10:12, 25:50] = 1      # un pelo de 1 m de la casa 1 sobre el borde de la 2
    limpias = sin_pelos(casas, radio_px=3)
    assert np.array_equal(limpias > 0, casas > 0), 'no se pierde ni se gana edificado'
    assert (limpias[10:12, 30:50] == 2).all()
    assert (limpias[10:30, 5:22] == 1).all() and (limpias[14:30, 25:55] == 2).all()


def test_sin_pelos_no_toca_una_casa_angosta_y_sola():
    casas = np.zeros((40, 60), np.int32)
    casas[5:9, 5:40] = 1         # 2 m de ancho, sin vecinas
    casas[20:38, 5:40] = 2
    assert np.array_equal(sin_pelos(casas, radio_px=3), casas)


# --- esquinas de la manzana y casas de esquina ---

def test_esquinas_de_una_manzana_rectangular():
    from tools.geo.lotes import esquinas_de_manzana
    m = np.zeros((120, 220), bool)
    m[10:110, 10:210] = True
    esquinas = esquinas_de_manzana(m, 0.5)
    assert len(esquinas) == 4
    assert sorted((round(x, -1), round(y, -1)) for x, y in esquinas) == [(10, 10), (10, 110), (210, 10), (210, 110)]


def test_una_muesca_chica_no_hace_esquinas_y_un_rincon_tampoco():
    from tools.geo.lotes import esquinas_de_manzana
    m = np.zeros((240, 240), bool)
    m[20:220, 20:220] = True
    m[20:30, 100:112] = False      # muesca de 6 × 5 m en el lado norte: lados cortos
    assert len(esquinas_de_manzana(m, 0.5)) == 4
    ele = np.zeros((240, 240), bool)
    ele[20:220, 20:120] = True
    ele[120:220, 20:220] = True    # una L: 5 esquinas salientes y un rincón entrante que no cuenta
    assert len(esquinas_de_manzana(ele, 0.5)) == 5


def test_una_manzana_redonda_no_tiene_esquinas():
    from tools.geo.lotes import esquinas_de_manzana
    yy, xx = np.mgrid[:200, :200]
    assert esquinas_de_manzana((xx - 100) ** 2 + (yy - 100) ** 2 < 80 ** 2, 0.5) == []


def test_casas_de_esquina_toma_la_casa_mas_cercana_a_cada_esquina():
    from tools.geo.lotes import casas_de_esquina
    casas = np.zeros((100, 100), int)
    casas[0:30, 0:20] = 1          # en la esquina (0, 0)
    casas[0:30, 22:60] = 2         # la vecina, a 11 m: no llega
    casas[80:100, 90:100] = 3      # lejos de toda esquina dada
    assert casas_de_esquina(casas, [(0, 0)], radio_px=12) == {1}
    assert casas_de_esquina(casas, [(0, 0), (70, 99)], radio_px=12) == {1}
    assert casas_de_esquina(casas, [(21, 0)], radio_px=12) in ({1}, {2})  # una sola por esquina
    assert casas_de_esquina(casas, [], radio_px=12) == set()
