"""Reservas de ocupación de los hitos de 1772 (T33j.4b): ninguna casa de 1772 cruza la planta de un hito en pie."""
import numpy as np
from shapely.geometry import Polygon, box

from tools.geo.tests.test_vectorizar import METRO
from tools.geo.vectorizar import CLASE, _cuadras_de_referencia, marcar_tapadas, plantas_de_1772


def hitos():
    return [{'id': 'catedral', 'nace': 1, 'muere': 0, 'planta': [[[100, 100], [160, 100], [160, 140], [100, 140]]]},
            {'id': 'capitolio', 'nace': 3, 'muere': 0, 'planta': [[[0, 0], [10, 0], [10, 10], [0, 10]]]}]


def test_las_plantas_de_1772_son_las_de_los_hitos_en_pie_en_1772():
    plantas = plantas_de_1772(hitos())
    assert len(plantas) == 1 and plantas[0].equals(box(100, 100, 160, 140))


def test_una_cuadra_de_la_referencia_deja_libre_la_planta_del_hito():
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    cuadras = np.where(c == CLASE['edificado'], 1, 0)
    anillo = Polygon([(20, 20), (240, 20), (240, 240), (20, 240)])
    grupos = _cuadras_de_referencia([{'id': 'U1', 'poligono': anillo, 'rellenar': True}], c, cuadras,
                                    {1: int((cuadras == 1).sum())}, METRO, reservas=[box(100, 100, 160, 140)])
    g = grupos[0]; x, y = g['origen']
    assert not g['cuadra'][120 - y, 130 - x] and g['cuadra'][60 - y, 60 - x]


def test_una_casa_de_1936_que_pisa_la_planta_de_un_hito_de_1772_se_marca_tapada():
    salida = {'vertices': [95, 95, 120, 95, 120, 120, 95, 120, 10, 10, 30, 10, 30, 30, 10, 30],
              'techos': [[0, 4], [4, 4]], 'antes': [0, 0], 'junta': [-1, -1], 'juntas_hasta': []}
    assert marcar_tapadas(salida, METRO, plantas=[box(100, 100, 160, 140)]) == [1, 0]


def test_vectorizar_reserva_el_nucleo_de_calzada_y_las_casas_de_una_mancha_quedan_al_borde_de_la_calle():
    from shapely.geometry import LineString
    from tools.geo.tests.test_vectorizar import marco_de_calles, red_de
    from tools.geo.vectorizar import NUCLEO_DE_CALZADA_M, vectorizar
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    red = red_de(marco_de_calles(20, 20, 240, 240), c, edificado72=np.zeros(c.shape, bool))
    eje = LineString([(20, 0), (20, 260)])
    red.update(referencia72=[], calzada72=[eje],
               edificado_revisado=[{'id': 'U2', 'poligonos': [box(10, 40, 70, 200)], 'por_anillo': False}])
    res = vectorizar(c, METRO, plaza=(130, 130), red=red)
    v = res['vertices']
    casas = [Polygon([(v[2 * i], v[2 * i + 1]) for i in range(t[0], t[0] + t[1])]) for t, a in zip(res['techos'], res['antes']) if a]
    nucleo = eje.buffer(NUCLEO_DE_CALZADA_M / 2 / METRO)
    assert casas and all(casa.intersection(nucleo).area == 0 for casa in casas)
    assert sum(casa.area for casa in casas) > 0.5 * box(10, 40, 70, 200).difference(nucleo).area
