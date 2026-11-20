"""Las huellas comparten medianeras exactas, incluso con la cuadra girada."""
import numpy as np
import pytest
from shapely.geometry import Polygon
from shapely.ops import unary_union
from tools.geo.huellas import repartir_huellas


@pytest.mark.parametrize('angulo', [0, 17, 33])
def test_reparto_cierra_la_cuadra_sin_solapes_ni_dientes(angulo):
    t = np.deg2rad(angulo)
    giro = np.array([[np.cos(t), -np.sin(t)], [np.sin(t), np.cos(t)]])
    puntos = np.array([[0, 0], [200, 0], [200, 160], [0, 160]]) @ giro.T + 100
    cuadra = Polygon(puntos)
    casas = repartir_huellas(puntos, metro=.5, semilla=3)
    union = unary_union([c['figura'] for c in casas])
    assert union.symmetric_difference(cuadra).area < 1e-6
    assert sum(c['figura'].area for c in casas) == pytest.approx(union.area)
    for c in casas:
        eu = np.array(c['eu']); ev = np.array([-eu[1], eu[0]])
        local = (np.asarray(c['figura'].exterior.coords) - c['origen']) @ np.array([eu, ev]).T
        assert local[:, 0].min() >= -1e-7
        assert local[:, 0].max() <= c['ancho'] / .5 + 1e-7
        assert local[:, 1].min() == pytest.approx(0, abs=1e-7)
        assert len(c['figura'].exterior.coords) <= 6


def test_no_inventa_una_cuadra_convexa_a_partir_de_una_concava():
    assert repartir_huellas([[0,0],[200,0],[200,200],[100,100],[0,200]], .5, 1) is None


def test_vectorizador_conserva_las_medianeras_exactas_en_una_cuadra_girada():
    from tools.geo.tests.test_lados import rectangulo
    from tools.geo.vectorizar import vectorizar, CLASE
    m = rectangulo(angulo_grados=17)
    clases = np.where(m, CLASE['edificado'], CLASE['calle']).astype(np.uint8)
    datos = vectorizar(clases, .5, (160, 160))
    vertices = np.array(datos['vertices']).reshape(-1, 2)
    casas = [Polygon(vertices[i:i+n]) for i,n,*_ in datos['techos']]
    assert max(len(c.exterior.coords) for c in casas) <= 6
    # El formato redondea a centésimas de píxel: menos de 1/10000 del área.
    assert sum(c.area for c in casas) - unary_union(casas).area < sum(c.length for c in casas) * .01


def test_un_pedazo_de_manzana_no_se_expande_a_toda_la_cara():
    from tools.geo.huellas import huellas_de_manzana
    m = np.ones((80,200), bool)
    assert huellas_de_manzana(m, np.array([[0,0],[200,0],[200,200],[0,200]]), .5, 1) is None


@pytest.mark.parametrize('interior', [True,False])
def test_conserva_los_huecos_y_las_plazoletas_reales(interior):
    from tools.geo.huellas import huellas_de_manzana
    m = np.ones((200,200), bool)
    if interior:
        m[99:101,99:101] = False
    else:
        m[:80,70:130] = False
    assert huellas_de_manzana(m, np.array([[0,0],[200,0],[200,200],[0,200]]), .5, 1) is None
