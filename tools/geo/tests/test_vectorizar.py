import numpy as np
import pytest
from shapely.geometry import Point, Polygon, box

from tools.geo.vectorizar import CLASE, vectorizar

METRO = 0.5  # m/px


def manzana_con_patio():
    """Una manzana de 100×100 m: corona edificada de 20 m de fondo, patio al medio, calles alrededor."""
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    c[70:190, 70:190] = CLASE['patio']
    return c


def poligonos(res):
    v = np.asarray(res['vertices'], float).reshape(-1, 2)
    return [Polygon(v[i:i + n]) for i, n, *_ in res['techos']]


def test_divide_la_corona_en_lotes_de_frente_razonable():
    res = vectorizar(manzana_con_patio(), METRO, plaza=(130, 130))
    perimetro_m = 4 * 100
    assert perimetro_m / 16 <= len(res['techos']) <= perimetro_m / 8


def test_las_huellas_no_invaden_el_patio_ni_la_calle():
    polis = poligonos(vectorizar(manzana_con_patio(), METRO, plaza=(130, 130)))
    patio = box(72, 72, 188, 188)
    afuera = box(0, 0, 260, 260).difference(box(28, 28, 232, 232))
    assert all(p.is_valid and p.area > 0 for p in polis)
    assert sum(p.intersection(patio).area for p in polis) < 1
    assert sum(p.intersection(afuera).area for p in polis) < 1


def test_las_huellas_cubren_casi_todo_lo_edificado():
    polis = poligonos(vectorizar(manzana_con_patio(), METRO, plaza=(130, 130)))
    edificado_px = 200 * 200 - 120 * 120
    assert sum(p.area for p in polis) == pytest.approx(edificado_px, rel=0.05)


def test_un_edificio_publico_es_un_solo_techo_con_su_estilo():
    c = np.full((200, 200), CLASE['calle'], np.uint8)
    c[40:160, 40:160] = CLASE['publico']
    res = vectorizar(c, METRO, plaza=(0, 0))
    assert len(res['techos']) == 1
    _, _, pisos, estilo, _ = res['techos'][0]
    assert estilo == 9 and pisos >= 2


def test_es_determinista():
    a = vectorizar(manzana_con_patio(), METRO, plaza=(130, 130))
    b = vectorizar(manzana_con_patio(), METRO, plaza=(130, 130))
    assert a == b


def test_ignora_manchas_menores_al_area_minima():
    c = np.full((100, 100), CLASE['calle'], np.uint8)
    c[10:13, 10:13] = CLASE['edificado']  # 1,5 × 1,5 m
    assert vectorizar(c, METRO, plaza=(0, 0))['techos'] == []


def test_marca_las_casas_de_esquina_una_por_esquina():
    res = vectorizar(manzana_con_patio(), METRO, plaza=(130, 130))
    assert len(res['esquinas']) == len(res['techos']) and set(res['esquinas']) <= {0, 1}
    de_esquina = [p for p, e in zip(poligonos(res), res['esquinas']) if e]
    assert len(de_esquina) == 4
    for x, y in ((30, 30), (230, 30), (230, 230), (30, 230)):  # cada esquina de la manzana toca una sola
        assert sum(p.distance(Point(x, y)) < 3 for p in de_esquina) == 1


def test_un_edificio_publico_no_es_casa_de_esquina():
    c = np.full((200, 200), CLASE['calle'], np.uint8)
    c[40:160, 40:160] = CLASE['publico']
    assert vectorizar(c, METRO, plaza=(0, 0))['esquinas'] == [0]


def test_una_casa_suelta_no_hace_esquina():
    c = np.full((200, 200), CLASE['calle'], np.uint8)
    c[40:100, 40:90] = CLASE['edificado']  # 30 × 25 m: dos o tres lotes, no una manzana
    res = vectorizar(c, METRO, plaza=(0, 0))
    assert res['techos'] and not any(res['esquinas'])
