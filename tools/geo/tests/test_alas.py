import math

import cv2
import numpy as np
import pytest
from shapely.geometry import box
from shapely.ops import unary_union

from tools.geo.alas import (
    ANCHO_MINIMO_M, CALLE_DER, CALLE_FONDO, CALLE_IZQ, CRUZADA, ESQUINA_DER, ESQUINA_IZQ, FONDO, FRENTE,
    LATERAL_DER, LATERAL_IZQ, PATIO, SOLAR, alas_de_casa, marco_de_casa, patios_segun_distancia, repartir,
)

METRO = 0.5
TECHADAS = (FRENTE, CRUZADA, LATERAL_IZQ, LATERAL_DER, ESQUINA_IZQ, ESQUINA_DER, FONDO)


def cajas(alas, tipos=None):
    return [box(u0, v0, u1, v1) for tipo, u0, v0, u1, v1 in alas if tipos is None or tipo in tipos]


def de_tipo(alas, *tipos):
    return [a for a in alas if a[0] in tipos]


# --- repartir: el lote (ancho × fondo, en metros) en alas, patios y solar ---

def test_un_lote_macizo_y_profundo_da_crujia_al_frente_patios_y_alas_cruzadas():
    alas = repartir(12, 55, semilla=7, patios_max=3)
    frente = de_tipo(alas, FRENTE)
    assert len(frente) == 1
    _, u0, v0, u1, v1 = frente[0]
    assert (u0, v0, u1) == (0, 0, 12) and 7 <= v1 <= 8.5
    assert len(de_tipo(alas, PATIO)) == 3
    assert len(de_tipo(alas, CRUZADA, FONDO)) >= 3
    assert len(de_tipo(alas, LATERAL_IZQ, LATERAL_DER)) >= 3


def test_el_primer_patio_arranca_detras_de_la_crujia_y_es_mas_o_menos_cuadrado():
    for semilla in range(40):
        alas = repartir(12, 55, semilla=semilla, patios_max=3)
        crujia = de_tipo(alas, FRENTE)[0]
        patios = sorted(de_tipo(alas, PATIO), key=lambda a: a[2])
        assert patios[0][2] == pytest.approx(crujia[4])
        for _, u0, v0, u1, v1 in patios:
            assert 4 <= v1 - v0 <= 9
            assert 3 <= u1 - u0 <= 12


def test_las_alas_cubren_el_lote_entero_sin_encimarse():
    for ancho, fondo, calles in ((12, 55, 0), (9, 30, 0), (14, 24, CALLE_IZQ), (13, 40, CALLE_DER), (11, 45, CALLE_FONDO),
                                 (24, 38, CALLE_IZQ | CALLE_DER)):
        for semilla in range(25):
            alas = repartir(ancho, fondo, semilla=semilla, patios_max=3, calles=calles)
            assert alas, (ancho, fondo, calles, semilla)
            piezas = cajas(alas)
            assert sum(p.area for p in piezas) == pytest.approx(ancho * fondo, abs=0.05)
            assert unary_union(piezas).area == pytest.approx(ancho * fondo, abs=0.05)
            for _, u0, v0, u1, v1 in alas:
                assert -1e-6 <= u0 < u1 <= ancho + 1e-6 and -1e-6 <= v0 < v1 <= fondo + 1e-6


def test_las_alas_cruzadas_y_el_frente_van_de_lado_a_lado_y_son_angostas():
    for semilla in range(30):
        alas = repartir(12, 55, semilla=semilla, patios_max=3)
        for _, u0, v0, u1, v1 in de_tipo(alas, FRENTE, CRUZADA, FONDO):
            assert (u0, u1) == (0, 12)
            assert 3 <= v1 - v0 <= 9.5
        for _, u0, v0, u1, v1 in de_tipo(alas, LATERAL_IZQ, LATERAL_DER):
            assert 3 <= u1 - u0 <= 5


def test_las_alas_laterales_se_apoyan_en_su_medianera_y_dan_a_un_patio():
    for semilla in range(30):
        alas = repartir(14, 50, semilla=semilla, patios_max=3)
        patios = cajas(alas, (PATIO,))
        for tipo, u0, v0, u1, v1 in de_tipo(alas, LATERAL_IZQ, LATERAL_DER):
            assert (u0 == 0) if tipo == LATERAL_IZQ else (u1 == 14)
            assert any(p.bounds[1] == pytest.approx(v0) and p.bounds[3] == pytest.approx(v1) for p in patios)


def test_un_lote_chico_o_angosto_queda_simple():
    assert repartir(12, 11, semilla=3, patios_max=3) == []
    assert repartir(ANCHO_MINIMO_M - 0.5, 50, semilla=3, patios_max=3) == []


def test_en_las_orillas_un_patio_y_el_solar_al_fondo():
    for semilla in range(20):
        alas = repartir(12, 50, semilla=semilla, patios_max=1)
        assert len(de_tipo(alas, PATIO)) == 1
        solar = de_tipo(alas, SOLAR)
        assert len(solar) == 1 and solar[0][4] == 50 and solar[0][4] - solar[0][2] >= 4


def test_el_solar_queda_al_fondo_y_nunca_hay_dos():
    for semilla in range(40):
        alas = repartir(12, 60, semilla=semilla, patios_max=3)
        solares = de_tipo(alas, SOLAR)
        assert len(solares) <= 1
        if solares:
            assert solares[0][4] == 60
            assert all(a[4] <= solares[0][2] + 1e-6 for a in de_tipo(alas, PATIO, CRUZADA, FONDO))


def test_en_una_esquina_el_ala_de_la_otra_calle_tiene_el_fondo_de_la_crujia():
    alas = repartir(14, 30, semilla=5, patios_max=3, calles=CALLE_IZQ)
    crujia = de_tipo(alas, FRENTE)[0]
    (esquina,) = de_tipo(alas, ESQUINA_IZQ)
    c = crujia[4]
    assert esquina[1:] == pytest.approx([0, c, c, 30])   # el inglete pide el mismo ancho
    assert not de_tipo(alas, LATERAL_IZQ)
    assert all(a[1] >= c - 1e-6 for a in alas if a[0] not in (FRENTE, ESQUINA_IZQ))
    alas = repartir(14, 30, semilla=5, patios_max=3, calles=CALLE_DER)
    (esquina,) = de_tipo(alas, ESQUINA_DER)
    assert esquina[1] == pytest.approx(14 - c) and esquina[3] == 14


def test_si_el_fondo_da_a_otra_calle_se_cierra_con_un_ala_y_no_con_solar():
    for semilla in range(20):
        alas = repartir(12, 46, semilla=semilla, patios_max=1, calles=CALLE_FONDO)
        assert not de_tipo(alas, SOLAR)
        ultima = max(alas, key=lambda a: a[4])
        assert ultima[0] == CRUZADA and ultima[4] == 46 and (ultima[1], ultima[3]) == (0, 12)
        # sin solar donde terminar, el tope de patios no rige: patios y alas hasta la otra calle, ninguna de más de 9 m
        assert len(de_tipo(alas, PATIO)) >= 2
        assert all(a[4] - a[2] <= 9 + 1e-6 for a in de_tipo(alas, CRUZADA))


def test_un_patio_del_plano_se_conserva_donde_esta():
    hueco = (4.0, 20.0, 9.0, 27.0)
    for semilla in range(30):
        alas = repartir(12, 50, semilla=semilla, patios_max=3, huecos=[hueco])
        patios = cajas(alas, (PATIO,))
        assert any(p.equals_exact(box(*hueco), 0.011) for p in patios)
        # nada techado lo tapa, y lo que queda a sus costados son alas laterales
        assert sum(t.intersection(box(*hueco)).area for t in cajas(alas, TECHADAS)) < 0.05
        assert any(a[0] == LATERAL_IZQ and a[3] == pytest.approx(4) and a[2] == pytest.approx(20) for a in alas)
        assert any(a[0] == LATERAL_DER and a[1] == pytest.approx(9) and a[2] == pytest.approx(20) for a in alas)


def test_es_determinista_y_cambia_con_la_semilla():
    assert repartir(12, 55, semilla=11, patios_max=3) == repartir(12, 55, semilla=11, patios_max=3)
    assert len({str(repartir(12, 55, semilla=s, patios_max=3)) for s in range(10)}) > 5


def test_patios_segun_distancia_baja_hacia_las_orillas():
    assert patios_segun_distancia(100) == 3 and patios_segun_distancia(100, azar=0.1) == 4
    assert patios_segun_distancia(1000) == 2 and patios_segun_distancia(1000, azar=0.1) == 3
    assert patios_segun_distancia(2500) == 1 and patios_segun_distancia(2500, azar=0.1) == 2


# --- el marco del lote, a partir de la casa dibujada en el plano ---

def manzana_de_lotes(grados=0.0, lienzo=400, ancho_m=100, fondo_m=110):
    """Una manzana maciza girada, con calle alrededor. → (manzana bool, girar(u_m, v_m) → px)."""
    a = math.radians(grados)
    c, s = math.cos(a), math.sin(a)

    def a_px(u, v):
        x, y = (u - ancho_m / 2) / METRO, (v - fondo_m / 2) / METRO
        return lienzo / 2 + x * c - y * s, lienzo / 2 + x * s + y * c

    manzana = np.zeros((lienzo, lienzo), np.uint8)
    cv2.fillPoly(manzana, [np.round([a_px(0, 0), a_px(ancho_m, 0), a_px(ancho_m, fondo_m), a_px(0, fondo_m)]).astype(np.int32)], 1)
    return manzana.astype(bool), a_px, a


def lote(manzana, a_px, u0, v0, u1, v1):
    m = np.zeros(manzana.shape, np.uint8)
    cv2.fillPoly(m, [np.round([a_px(u0, v0), a_px(u1, v0), a_px(u1, v1), a_px(u0, v1)]).astype(np.int32)], 1)
    return m.astype(bool) & manzana


@pytest.mark.parametrize('grados', [0.0, 8.0, -20.0])
def test_el_marco_pone_el_frente_en_la_calle_y_el_fondo_hacia_adentro(grados):
    manzana, a_px, angulo = manzana_de_lotes(grados)
    casa = lote(manzana, a_px, 30, 0, 42, 55)   # da a la calle de arriba (v = 0)
    marco = marco_de_casa(casa, manzana, angulo, METRO)
    assert marco['ancho'] == pytest.approx(12, abs=1.5) and marco['fondo'] == pytest.approx(55, abs=1.5)
    assert marco['calles'] == 0
    ox, oy = marco['origen']
    eu, ev = np.array(marco['eu']), np.array(marco['ev'])
    assert abs(float(eu @ ev)) < 1e-9 and ev == pytest.approx([-eu[1], eu[0]])
    # el origen está en la calle y `ev` entra en la manzana
    medio = np.array([ox, oy]) + eu * 6 / METRO
    adentro = medio + ev * 10 / METRO
    afuera = medio - ev * 3 / METRO
    assert manzana[int(adentro[1]), int(adentro[0])] and not manzana[int(afuera[1]), int(afuera[0])]
    assert marco['lleno'] > 0.9 and marco['huecos'] == []


def test_el_marco_de_una_casa_de_esquina_dice_que_costado_da_a_la_otra_calle():
    manzana, a_px, angulo = manzana_de_lotes(0)
    marco = marco_de_casa(lote(manzana, a_px, 0, 0, 12, 24), manzana, angulo, METRO)
    # el frente es el lado corto; el otro lado libre queda a un costado
    assert marco['ancho'] == pytest.approx(12, abs=1) and marco['fondo'] == pytest.approx(24, abs=1)
    assert marco['calles'] in (CALLE_IZQ, CALLE_DER)
    costado = np.array(marco['origen']) + np.array(marco['ev']) * 12 / METRO
    hacia = np.array(marco['eu']) * (-3 / METRO if marco['calles'] == CALLE_IZQ else (marco['ancho'] + 3) / METRO)
    x, y = costado + hacia
    assert not manzana[int(y), int(x)]


def test_una_casa_sin_calle_no_tiene_marco():
    manzana, a_px, angulo = manzana_de_lotes(0)
    assert marco_de_casa(lote(manzana, a_px, 40, 40, 60, 70), manzana, angulo, METRO) is None


def test_el_marco_encuentra_el_patio_que_dibuja_el_plano():
    manzana, a_px, angulo = manzana_de_lotes(0)
    casa = lote(manzana, a_px, 30, 0, 42, 50) & ~lote(manzana, a_px, 33, 20, 39, 27)
    marco = marco_de_casa(casa, manzana, angulo, METRO)
    assert len(marco['huecos']) == 1
    assert marco['huecos'][0] == pytest.approx([3, 20, 9, 27], abs=0.8)


# --- la casa entera: marco + alas, en píxeles del plano ---

def en_px(marco, ala):
    """Las cuatro esquinas del ala en píxeles del plano."""
    _, u0, v0, u1, v1 = ala
    o, eu, ev = np.array(marco['origen']), np.array(marco['eu']), np.array(marco['ev'])
    return [o + eu * u + ev * v for u, v in ((u0, v0), (u1, v0), (u1, v1), (u0, v1))]


@pytest.mark.parametrize('grados', [0.0, 12.0])
def test_las_alas_de_una_casa_quedan_dentro_de_su_lote_y_de_lo_edificado(grados):
    manzana, a_px, angulo = manzana_de_lotes(grados)
    casa = lote(manzana, a_px, 30, 0, 42, 55)
    resultado = alas_de_casa(casa, manzana, angulo, METRO, semilla=9, distancia_m=100)
    assert resultado is not None
    marco, alas = resultado
    assert len(de_tipo(alas, PATIO)) >= 2
    holgada = cv2.dilate(casa.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0   # un píxel de holgura por el trazado
    for ala in alas:   # en píxeles del marco
        for x, y in en_px(marco, ala):
            assert holgada[int(y), int(x)], ala
        dibujo = np.zeros(casa.shape, np.uint8)
        cv2.fillPoly(dibujo, [np.round(en_px(marco, ala)).astype(np.int32)], 1)
        assert (dibujo.astype(bool) & holgada).sum() / max(1, dibujo.sum()) > 0.97, ala
        assert ala[1] >= -0.01 and ala[3] <= marco['ancho'] / METRO + 0.01
        assert ala[2] >= -0.01 and ala[4] <= marco['fondo'] / METRO + 0.01


def test_una_casa_chica_o_irregular_no_lleva_alas():
    manzana, a_px, angulo = manzana_de_lotes(0)
    marco, alas = alas_de_casa(lote(manzana, a_px, 30, 0, 40, 9), manzana, angulo, METRO, semilla=1, distancia_m=100)
    assert alas == [] and marco['ancho'] == pytest.approx(10, abs=1) and 7 <= marco["crujia"] <= 8.5
    ele = lote(manzana, a_px, 30, 0, 42, 40) & ~lote(manzana, a_px, 36, 0, 42, 28)   # una L: llena poco su rectángulo
    assert alas_de_casa(ele, manzana, angulo, METRO, semilla=1, distancia_m=100)[1] == []
    # y la que no da a ninguna calle no tiene ni marco
    assert alas_de_casa(lote(manzana, a_px, 40, 40, 60, 70), manzana, angulo, METRO, semilla=1, distancia_m=100) is None


def test_alas_de_casa_respeta_el_patio_del_plano():
    manzana, a_px, angulo = manzana_de_lotes(0)
    hueco = lote(manzana, a_px, 33, 20, 39, 27)
    casa = lote(manzana, a_px, 30, 0, 42, 50) & ~hueco
    marco, alas = alas_de_casa(casa, manzana, angulo, METRO, semilla=4, distancia_m=100)
    for ala in alas:
        if ala[0] in TECHADAS:
            dibujo = np.zeros(casa.shape, np.uint8)
            cv2.fillPoly(dibujo, [np.round(en_px(marco, ala)).astype(np.int32)], 1)
            assert (dibujo.astype(bool) & hueco).sum() <= 0.12 * hueco.sum()
    patios = np.zeros(casa.shape, np.uint8)
    for ala in de_tipo(alas, PATIO):
        cv2.fillPoly(patios, [np.round(en_px(marco, ala)).astype(np.int32)], 1)
    assert (patios.astype(bool) & hueco).sum() >= 0.85 * hueco.sum()


def test_alas_de_casa_es_determinista():
    manzana, a_px, angulo = manzana_de_lotes(5)
    casa = lote(manzana, a_px, 30, 0, 42, 55)
    assert alas_de_casa(casa, manzana, angulo, METRO, 9, 100) == alas_de_casa(casa, manzana, angulo, METRO, 9, 100)


# --- la línea de fachada de la cuadra ---

@pytest.mark.parametrize('grados', [0.0, 7.0])
def test_las_casas_de_una_cuadra_comparten_la_linea_de_su_frente(grados):
    from tools.geo.alas import frentes_de_manzana
    from tools.geo.lotes import direccion_de_manzana
    manzana, a_px, _ = manzana_de_lotes(grados)
    poligonos, angulo = direccion_de_manzana(manzana, METRO)
    frentes = frentes_de_manzana(manzana, poligonos[0], METRO)
    assert len(frentes) == 4
    # el marco de la manzana va un par de grados torcido respecto de la calle: los frentes siguen la calle igual
    marcos = [marco_de_casa(lote(manzana, a_px, u, 0, u + 12, 50), manzana, angulo + math.radians(2), METRO, frentes)
              for u in (20, 32, 44)]
    for m in marcos[1:]:
        assert m['eu'] == pytest.approx(marcos[0]['eu'], abs=1e-9)
        delante = (np.array(m['origen']) - np.array(marcos[0]['origen'])) @ np.array(m['ev'])
        assert abs(delante) < 1e-6   # el mismo v = 0: la misma línea de fachada


def test_con_la_crujia_de_la_manzana_todas_las_casas_tienen_el_mismo_fondo_de_crujia():
    for semilla in range(10):
        alas = repartir(12, 50, semilla=semilla, patios_max=3, crujia=6.8)
        assert de_tipo(alas, FRENTE)[0][4] == 6.8
