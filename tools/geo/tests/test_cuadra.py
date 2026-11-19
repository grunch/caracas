import numpy as np
import pytest
from shapely.geometry import box
from shapely.ops import unary_union

from tools.geo.alas import (
    CALLE_DER, CALLE_FONDO, CALLE_IZQ, CRUZADA, ESQUINA_DER, ESQUINA_IZQ, FONDO, FRENTE, LATERAL_DER, LATERAL_IZQ,
    PATIO, SOLAR,
)
from tools.geo.cuadra import CRUJIA_M, SOLAR_MINIMO_M, alas_modelo, es_de_solo_casas
from tools.geo.vectorizar import CLASE

TECHADAS = (FRENTE, CRUZADA, LATERAL_IZQ, LATERAL_DER, ESQUINA_IZQ, ESQUINA_DER, FONDO)


def de_tipo(alas, *tipos):
    return [a for a in alas if a[0] in tipos]


def area(alas, tipos=None):
    return unary_union([box(u0, v0, u1, v1) for t, u0, v0, u1, v1 in alas if tipos is None or t in tipos]).area


# --- alas_modelo: el lote de la cuadra modelo (fuentes/imagenes: la cuadra estándar vista desde arriba) ---

@pytest.mark.parametrize('semilla', range(30))
def test_el_lote_queda_cubierto_sin_encimarse(semilla):
    alas = alas_modelo(12, 40, semilla, crujia=8.5)
    suma = sum((u1 - u0) * (v1 - v0) for _, u0, v0, u1, v1 in alas)
    assert area(alas) == pytest.approx(12 * 40, abs=0.05)
    assert suma == pytest.approx(12 * 40, abs=0.05)


def test_la_crujia_corre_a_lo_ancho_del_frente_con_el_fondo_de_la_cuadra():
    for semilla in range(20):
        frente = de_tipo(alas_modelo(12, 40, semilla, crujia=9.0), FRENTE)
        assert [a[1:] for a in frente] == [[0, 0, 12, 9.0]]


def test_el_fondo_del_lote_es_solar_abierto_en_el_centro_de_la_cuadra():
    for semilla in range(30):
        alas = alas_modelo(12, 40, semilla, crujia=8.5)
        solar = de_tipo(alas, SOLAR)
        assert len(solar) == 1 and solar[0][4] == 40
        hondo = max(a[4] for a in de_tipo(alas, *TECHADAS))
        assert hondo <= 40 - SOLAR_MINIMO_M


def test_detras_de_la_crujia_hay_alas_y_patios_con_variaciones():
    formas = set()
    for semilla in range(60):
        alas = alas_modelo(13, 40, semilla, crujia=8.5)
        formas.add((bool(de_tipo(alas, LATERAL_IZQ, LATERAL_DER)), bool(de_tipo(alas, CRUZADA)), bool(de_tipo(alas, PATIO))))
    assert (False, False, False) in formas      # solo la crujía
    assert (True, False, True) in formas        # en L: un ala hacia el fondo junto al patio
    assert (True, True, True) in formas         # patio cerrado por un ala cruzada


def test_las_alas_de_atras_no_pasan_de_la_mitad_del_lote_hondo():
    for semilla in range(30):
        alas = alas_modelo(12, 48, semilla, crujia=8.5)
        assert max(a[4] for a in de_tipo(alas, *TECHADAS)) <= 8.5 + 16.0 + 1e-6


def test_un_lote_poco_hondo_es_solo_crujia():
    assert alas_modelo(12, 10, 3, crujia=8.5) == [[FRENTE, 0, 0, 12, 10]]
    alas = alas_modelo(12, 14, 3, crujia=8.5)
    assert de_tipo(alas, FRENTE)[0][1:] == [0, 0, 12, 8.5]
    assert de_tipo(alas, SOLAR)[0][1:] == [0, 8.5, 12, 14]


def test_la_esquina_lleva_la_crujia_de_la_otra_calle_por_todo_el_costado():
    alas = alas_modelo(14, 22, 5, calles=CALLE_IZQ, crujia=8.0)
    assert de_tipo(alas, ESQUINA_IZQ)[0][1:] == [0, 8.0, 8.0, 22]
    alas = alas_modelo(14, 22, 5, calles=CALLE_DER, crujia=8.0)
    assert de_tipo(alas, ESQUINA_DER)[0][1:] == [6.0, 8.0, 14, 22]
    assert area(alas) == pytest.approx(14 * 22, abs=0.05)


def test_un_lote_que_cruza_la_cuadra_tiene_crujia_tambien_en_la_calle_de_atras():
    alas = alas_modelo(12, 30, 2, calles=CALLE_FONDO, crujia=8.0)
    atras = de_tipo(alas, CRUZADA, FONDO)
    assert any(a[4] == 30 and a[2] == pytest.approx(22) for a in atras)
    assert area(alas) == pytest.approx(12 * 30, abs=0.05)


def test_un_lote_angosto_no_tiene_alas_detras():
    alas = alas_modelo(6, 40, 1, crujia=8.5)
    assert {a[0] for a in alas} == {FRENTE, SOLAR}


def test_es_determinista_y_la_crujia_cae_en_su_rango():
    assert alas_modelo(12, 40, 9) == alas_modelo(12, 40, 9)
    for semilla in range(20):
        c = de_tipo(alas_modelo(12, 40, semilla), FRENTE)[0][4]
        assert CRUJIA_M[0] <= c <= CRUJIA_M[1]


# --- es_de_solo_casas: qué manzanas se rehacen con la cuadra modelo ---

def bloque(relleno=CLASE['edificado']):
    c = np.full((120, 120), CLASE['calle'], np.uint8)
    c[10:110, 10:110] = relleno
    return c


def test_una_manzana_maciza_de_casas_va_con_la_cuadra_modelo():
    c = bloque()
    assert es_de_solo_casas(c, c != CLASE['calle'], 0.5)


def test_una_manzana_con_una_iglesia_tambien_y_cuenta_lo_edificado_sin_ella():
    c = bloque(CLASE['verde'])
    c[10:110, 10:60] = CLASE['publico']    # la mitad es la iglesia
    c[10:110, 60:95] = CLASE['edificado']  # y de lo demás, el 70 % son casas
    assert es_de_solo_casas(c, c != CLASE['calle'], 0.5)


def test_una_manzana_que_es_casi_toda_un_convento_no():
    c = bloque()
    c[10:80, 10:110] = CLASE['publico']
    assert not es_de_solo_casas(c, c != CLASE['calle'], 0.5)


def test_una_manzana_casi_vacia_tampoco():
    c = bloque(CLASE['verde'])
    c[10:30, 10:110] = CLASE['edificado']
    assert not es_de_solo_casas(c, c != CLASE['calle'], 0.5)


def test_una_casa_suelta_no_es_una_cuadra():
    c = np.full((60, 60), CLASE['calle'], np.uint8)
    c[10:40, 10:40] = CLASE['edificado']   # 15 × 15 m
    assert not es_de_solo_casas(c, c != CLASE['calle'], 0.5)


@pytest.mark.parametrize('ancho,calles', [(8.5, CALLE_IZQ), (8.6, CALLE_DER), (12.0, CALLE_IZQ | CALLE_DER), (16.5, CALLE_IZQ | CALLE_DER)])
def test_una_esquina_angosta_no_deja_alas_sin_area_ni_encimadas(ancho, calles):
    alas = alas_modelo(ancho, 40, 4, calles=calles, crujia=8.495)
    assert all(u1 - u0 >= 1.0 and v1 - v0 >= 1.0 for _, u0, v0, u1, v1 in alas)
    suma = sum((u1 - u0) * (v1 - v0) for _, u0, v0, u1, v1 in alas)
    assert area(alas) == pytest.approx(ancho * 40, abs=0.05)
    assert suma == pytest.approx(ancho * 40, abs=0.05)
