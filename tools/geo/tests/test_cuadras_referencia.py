"""Las cuadras de 1772 desde la referencia histórica aprobada (T33j.3a: la cara aprobada determina el contorno)."""
import numpy as np
from shapely.geometry import LineString, Polygon, box

from tools.geo.caras import Red
from tools.geo.cuadras_historicas import cargar_referencia
from tools.geo.epocas import apertura_de_juntas
from tools.geo.tests.test_vectorizar import METRO, marco_de_calles, red_de
from tools.geo.vectorizar import CLASE, _cuadras_de_antes, _cuadras_de_referencia, vectorizar

ANILLO = Polygon([(20, 20), (240, 20), (240, 240), (20, 240)])   # ejes de calle de la unidad, en px del mosaico


def plano_con_pasaje():
    """Una manzana de 1936 con un pasaje moderno que le entra por el norte; las calles van por x, y = 20 y 240."""
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    c[30:100, 110:150] = CLASE['calle']
    return c, np.where(c == CLASE['edificado'], 1, 0)


def test_la_referencia_entrega_solo_las_unidades_aprobadas_edificadas_con_su_anillo_en_1936():
    # Arrange
    red = {'nodos': [{'id': n, 'mosaico': p} for n, p in
                     (('A', [0, 0]), ('B', [100, 0]), ('C', [100, 100]), ('D', [0, 100]))]}
    unidades = [{'id': 'U1', 'estado': 'aprobada', 'ocupacion': 'continua', 'nodos': ['A', 'B', 'C', 'D']},
                {'id': 'U2', 'estado': 'aprobada', 'ocupacion': 'parcial', 'nodos': ['A', 'B', 'C', 'D']},
                {'id': 'U3', 'estado': 'aprobada', 'ocupacion': 'terreno_libre', 'nodos': ['A', 'B', 'C', 'D']},
                {'id': 'U4', 'estado': 'pendiente', 'ocupacion': 'continua', 'nodos': None}]

    # Act
    ref = cargar_referencia(red, unidades)

    # Assert
    assert [(r['id'], r['rellenar']) for r in ref] == [('U1', True), ('U2', False)]
    assert ref[0]['poligono'].equals(box(0, 0, 100, 100))


def test_una_cuadra_continua_de_la_referencia_cierra_el_pasaje_moderno_y_se_aparta_del_eje():
    # Arrange
    c, cuadras = plano_con_pasaje()

    # Act
    grupos = _cuadras_de_referencia([{'id': 'U1', 'poligono': ANILLO, 'rellenar': True}], c, cuadras,
                                    {1: int((cuadras == 1).sum())}, METRO)

    # Assert
    assert len(grupos) == 1
    g = grupos[0]; x, y = g['origen']
    assert g['cuadra'][50 - y, 125 - x]                       # el pasaje de 1936 queda edificado en 1772
    assert g['miembros'] == {1} and g['minimo'] == 2 and g['hasta'] == 2 and g['referencia'] == 'U1'
    contorno = Polygon(np.asarray(g['poligono']) + (x, y))
    assert ANILLO.buffer(-3 / METRO + 0.5).contains(contorno)  # a 3 m o más de los ejes: la calle queda libre


def test_una_cuadra_parcial_de_la_referencia_no_rellena_lo_abierto():
    c, cuadras = plano_con_pasaje()
    grupos = _cuadras_de_referencia([{'id': 'U2', 'poligono': ANILLO, 'rellenar': False}], c, cuadras,
                                    {1: int((cuadras == 1).sum())}, METRO)
    g = grupos[0]; x, y = g['origen']
    assert not g['cuadra'][50 - y, 125 - x]


def test_una_manzana_de_1936_que_cubre_dos_unidades_es_de_una_sola_y_la_otra_igual_cubre_su_parte():
    # Arrange: en 1936 las dos cuadras de 1772 están fundidas en una manzana (sin la calle x=130)
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    cuadras = np.where(c == CLASE['edificado'], 1, 0)
    oeste = Polygon([(20, 20), (130, 20), (130, 240), (20, 240)])
    este = Polygon([(130, 20), (240, 20), (240, 240), (130, 240)])
    ref = [{'id': 'O', 'poligono': oeste, 'rellenar': True}, {'id': 'E', 'poligono': este, 'rellenar': True}]

    # Act
    grupos = _cuadras_de_referencia(ref, c, cuadras, {1: int((cuadras == 1).sum())}, METRO)

    # Assert
    assert sorted(len(g['miembros']) for g in grupos) == [0, 1]
    e = next(g for g in grupos if g['referencia'] == 'E'); x, y = e['origen']
    assert e['cuadra'][130 - y, 200 - x]


def test_una_cara_de_osm_sobre_una_unidad_de_la_referencia_no_arma_otra_cuadra_de_antes():
    c, cuadras = plano_con_pasaje()
    red = Red(red_de(marco_de_calles(20, 20, 240, 240), c)['tramos'])
    args = (red, c == CLASE['edificado'], c, cuadras, {1: int((cuadras == 1).sum())}, METRO)
    assert len(_cuadras_de_antes(*args, completas=[ANILLO])) == 1
    assert _cuadras_de_antes(*args, completas=[ANILLO], ocupado=[ANILLO]) == []


def test_un_grupo_de_la_referencia_cede_a_1936_a_mas_tardar_en_su_epoca_tope():
    vacio = np.zeros((30, 30), bool)
    poligonos = [[[2, 2, 20, 2, 20, 20, 2, 20]]]
    assert apertura_de_juntas(poligonos, [vacio, ~vacio, ~vacio], 1, minimos=[2]) == [5]
    assert apertura_de_juntas(poligonos, [vacio, ~vacio, ~vacio], 1, minimos=[2], hastas=[2]) == [2]
    assert apertura_de_juntas(poligonos, [vacio, ~vacio, ~vacio], 1, minimos=[2], hastas=[0]) == [5]


def test_con_la_referencia_las_casas_de_1772_dejan_libre_el_nucleo_de_las_calles():
    # Arrange
    c, _ = plano_con_pasaje()
    red = red_de(marco_de_calles(20, 20, 240, 240), c, edificado72=c == CLASE['edificado'])
    red['referencia72'] = [{'id': 'U1', 'poligono': ANILLO, 'rellenar': True}]

    # Act
    res = vectorizar(c, METRO, plaza=(130, 130), red=red)

    # Assert
    v = res['vertices']
    casas = [Polygon([(v[2 * i], v[2 * i + 1]) for i in range(t[0], t[0] + t[1])])
             for t, a in zip(res['techos'], res['antes']) if a == 1]
    assert casas and res['juntas_hasta'] == [2]
    ejes = [LineString(l) for l in marco_de_calles(20, 20, 240, 240)]
    assert all(casa.intersection(e.buffer(2 / METRO)).area == 0 for casa in casas for e in ejes)
    assert any(casa.intersects(box(115, 40, 145, 90)) for casa in casas)   # el pasaje edificado en 1772


def test_los_ejes_de_calzada_son_los_tramos_rectos_entre_cruces_identificados():
    from tools.geo.cuadras_historicas import ejes_de_calzada
    red = {'nodos': [{'id': 'A', 'mosaico': [0, 0]}, {'id': 'B', 'mosaico': [100, 0]}, {'id': 'C', 'mosaico': None}],
           'calles': [{'id': 'L1', 'tipo': 'calle_recta', 'nodos': ['A', 'B', 'C']},
                      {'id': 'L2', 'tipo': 'camino', 'nodos': ['A', 'B']}]}
    assert [list(e.coords) for e in ejes_de_calzada(red)] == [[(0.0, 0.0), (100.0, 0.0)]]


def test_se_marcan_las_casas_que_pisan_el_nucleo_de_calzada_de_la_referencia():
    from tools.geo.vectorizar import marcar_calzada
    salida = {'vertices': [0, -6, 20, -6, 20, 10, 0, 10, 0, 20, 20, 20, 20, 40, 0, 40], 'techos': [[0, 4], [4, 4]]}
    assert marcar_calzada(salida, [LineString([(-50, 0), (50, 0)])], METRO) == [1, 0]


def test_una_casa_sobre_la_calzada_de_1772_no_vive_en_1772():
    from tools.geo.epocas import vida_de_1936
    ciudad = {'techos': [[0, 4, 1, 0, 1], [4, 4, 1, 0, 2], [8, 4, 1, 0, 3]], 'cuadras': [-1, -1, -1],
              'junta': [-1, 0, -1], 'antes': [0, 1, 0], 'juntas_minimo': [1], 'calzada72': [1, 1, 0]}
    vidas, quitar = vida_de_1936(np.array([1, 1, 1]), ciudad, apertura=[3])
    assert vidas[0][0] == 2          # la de 1936 nace recién en 1843
    assert 1 in quitar               # la de antes, que solo vivía en 1772, sobra
    assert vidas[2] == [1, 0]        # la que no pisa la calle sigue igual


def test_quitar_techos_conserva_la_marca_de_calzada():
    from tools.geo.epocas import sin_techos
    ciudad = {'vertices': [0, 0, 1, 0, 1, 1, 2, 2, 3, 2, 3, 3], 'techos': [[0, 3, 1, 0, 0], [3, 3, 1, 0, 0]],
              'calzada72': [1, 0]}
    salida, _ = sin_techos(ciudad, [[1, 0], [1, 0]], {0})
    assert salida['calzada72'] == [0]


def test_si_la_unidad_duena_de_una_manzana_no_pasa_la_validacion_la_manzana_es_de_otra_aceptada():
    # Arrange: la manzana 1 cae sobre O (oeste) y E (este); O cubre más pero es casi toda edificio público
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    c[30:230, 30:150] = CLASE['publico']
    cuadras = np.where(np.isin(c, (CLASE['edificado'], CLASE['publico'])), 1, 0)
    oeste = Polygon([(20, 20), (160, 20), (160, 240), (20, 240)])
    este = Polygon([(160, 20), (240, 20), (240, 240), (160, 240)])
    ref = [{'id': 'O', 'poligono': oeste, 'rellenar': True}, {'id': 'E', 'poligono': este, 'rellenar': True}]

    # Act
    grupos = _cuadras_de_referencia(ref, c, cuadras, {1: int((cuadras == 1).sum())}, METRO)

    # Assert
    assert [g['referencia'] for g in grupos] == ['E']
    assert grupos[0]['miembros'] == {1}


def test_una_cara_de_osm_que_pisa_poco_la_referencia_igual_le_deja_esa_parte():
    # Arrange: una cara de 220 × 220 px y una unidad de la referencia en su esquina (menos del 30 % de la cara)
    c, cuadras = plano_con_pasaje()
    red = Red(red_de(marco_de_calles(20, 20, 240, 240), c)['tramos'])
    esquina = Polygon([(20, 20), (100, 20), (100, 100), (20, 100)])

    # Act
    grupos = _cuadras_de_antes(red, c == CLASE['edificado'], c, cuadras, {1: int((cuadras == 1).sum())}, METRO,
                               completas=[ANILLO], ocupado=[esquina])

    # Assert
    assert len(grupos) == 1
    g = grupos[0]; x, y = g['origen']
    assert not g['cuadra'][60 - y, 60 - x]       # la esquina la reconstruye la referencia
    assert g['cuadra'][200 - y, 200 - x]          # el resto sigue siendo de la cara de OSM
