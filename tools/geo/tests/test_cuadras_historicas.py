import numpy as np
from shapely.geometry import Polygon
from tools.geo.vectorizar import _cuadras_de_antes, CLASE
from tools.geo.tests.test_vectorizar import red_de, marco_de_calles
from tools.geo.caras import Red


def test_cuadra_cerrada_documentada_no_hereda_el_pasaje_de_1936():
    c = np.full((260,260), CLASE['calle'], np.uint8)
    c[30:230,30:230] = CLASE['edificado']
    c[30:100,110:150] = CLASE['calle']
    cuadras = np.where(c == CLASE['edificado'], 1, 0)
    red = Red(red_de(marco_de_calles(20,20,240,240),c)['tramos'])
    # El raster calzado no reconoce la ocupación en el pasaje, pero el original sí.
    edificado = c == CLASE['edificado']
    prueba = [Polygon([(20,20),(240,20),(240,240),(20,240)])]
    grupos = _cuadras_de_antes(red, edificado, c, cuadras, {1:int((cuadras==1).sum())}, .5, completas=prueba)
    assert len(grupos) == 1
    g = grupos[0]; x,y = g['origen']
    assert g['cuadra'][50-y,125-x]


def test_la_evidencia_de_una_cuadra_no_cierra_dos_cuadras_fundidas():
    from tools.geo.cuadras_historicas import es_completa
    fuente = Polygon([(0,0),(100,0),(100,100),(0,100)])
    assert es_completa(fuente, [fuente])
    assert not es_completa(Polygon([(0,0),(200,0),(200,100),(0,100)]), [fuente])


def test_cuadra_documentada_en_1772_no_se_abre_por_un_error_del_raster():
    from tools.geo.epocas import apertura_de_juntas
    vacio = np.zeros((30,30),bool)
    poligonos = [[[2,2,20,2,20,20,2,20]]]
    assert apertura_de_juntas(poligonos, [vacio, vacio], 1, minimos=[2]) == [2]
    assert apertura_de_juntas(poligonos, [vacio, ~vacio], 1, minimos=[2]) == [5]


def test_las_correspondencias_curadas_no_se_enciman_ni_ocupan_la_plaza_mayor():
    from tools.geo.cuadras_historicas import cargar
    from shapely.geometry import Point
    cuadras = cargar()
    assert len(cuadras) == 10
    for i, cuadra in enumerate(cuadras):
        assert cuadra.is_valid and cuadra.area > 10000
        assert not cuadra.contains(Point(8968.2, 6839))
        assert all(cuadra.intersection(otra).area < 1e-6 for otra in cuadras[i+1:])


def test_la_cuadra_verificada_ya_existe_en_1772_aunque_el_calce_diga_otra_cosa():
    from tools.geo.epocas import vida_de_1936
    ciudad = {'techos':[[0,4,1,0,1],[4,4,1,0,2]], 'cuadras':[0,1],
              'junta':[0,0], 'antes':[1,0], 'juntas_minimo':[2]}
    vidas, quitar = vida_de_1936(np.array([3,3]),ciudad,apertura=[2])
    assert vidas[0] == [1,2]
    assert 0 not in quitar
    assert vidas[1][0] >= 2


def test_no_se_fuerza_el_cierre_de_la_cuadra_de_la_plaza_de_san_jacinto():
    from tools.geo.cuadras_historicas import cargar
    from shapely.geometry import Point
    # Ubicación documentada en marcas-datos.js: el nombre no implica cuadra cerrada.
    plaza = Point(9265,7040)
    assert not any(c.covers(plaza) for c in cargar())
