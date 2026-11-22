"""Lo edificado revisado del original de 1772 en el generador (T33j.4a): la periferia edificada y las parciales sin
rellenar sus huertas."""
import numpy as np
from shapely.geometry import Polygon, box

from tools.geo.cuadras_historicas import cargar_edificado
from tools.geo.tests.test_vectorizar import METRO
from tools.geo.vectorizar import CLASE, _cuadras_de_edificado, _cuadras_de_referencia


def red():
    """Una unidad con anillo: en el original es el cuadrado 0..10; en 1936, 100..200 (escala 10, corre 100)."""
    nodos = [{'id': n, 'original': o, 'mosaico': m} for n, o, m in
             (('A', [0, 0], [100, 100]), ('B', [10, 0], [200, 100]), ('C', [10, 10], [200, 200]), ('D', [0, 10], [100, 200]))]
    return {'nodos': nodos}


def a_1936(xs, ys):
    """El calce de prueba, algo distinto de la transformación del anillo: corre 3 px más."""
    return np.asarray(xs) * 10 + 103, np.asarray(ys) * 10 + 103


def unidades():
    return [{'id': 'U1', 'estado': 'aprobada', 'ocupacion': 'parcial', 'nodos': ['A', 'B', 'C', 'D'], 'sector': 'S1'},
            {'id': 'U2', 'estado': 'pendiente', 'ocupacion': 'continua', 'nodos': None, 'sector': 'S1'},
            {'id': 'U3', 'estado': 'pendiente', 'ocupacion': 'continua', 'nodos': None, 'sector': 'S9'}]


def test_lo_edificado_de_una_unidad_con_anillo_va_a_1936_por_sus_esquinas_y_el_de_una_pendiente_por_el_calce():
    # Arrange
    aprobado = {'U1': [[[0, 0], [10, 0], [10, 3], [0, 3]]], 'U2': [[[20, 0], [24, 0], [24, 4], [20, 4]]],
                'U3': [[[40, 0], [44, 0], [44, 4], [40, 4]]]}

    # Act
    edificado = {e['id']: e for e in cargar_edificado(red(), unidades(), aprobado, a_1936, limites={'S9'})}

    # Assert
    assert edificado['U1']['por_anillo'] is True and edificado['U1']['poligonos'][0].equals(box(100, 100, 200, 130))
    assert edificado['U2']['por_anillo'] is False and edificado['U2']['poligonos'][0].equals(box(303, 103, 343, 143))
    assert 'U3' not in edificado          # sector límite del calce: no entra


def test_una_parcial_de_la_referencia_con_edificado_solo_edifica_lo_rojo():
    # Arrange: una manzana de 1936 entera edificada; el original pinta rojo solo su franja norte
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    cuadras = np.where(c == CLASE['edificado'], 1, 0)
    anillo = Polygon([(20, 20), (240, 20), (240, 240), (20, 240)])
    franja = [Polygon([(20, 20), (240, 20), (240, 90), (20, 90)])]

    # Act
    grupos = _cuadras_de_referencia([{'id': 'U1', 'poligono': anillo, 'rellenar': False, 'edificado': franja}],
                                    c, cuadras, {1: int((cuadras == 1).sum())}, METRO)

    # Assert: el anillo reemplaza la manzana de 1936 sin casas propias; las casas salen solo de la franja roja
    dueno = next(g for g in grupos if not g['cuadra'].any())
    casas = next(g for g in grupos if g['cuadra'].any())
    assert dueno['miembros'] == {1} and casas['miembros'] == set()
    x, y = casas['origen']
    assert casas['cuadra'][60 - y, 130 - x]          # la franja roja
    assert casas['cuadra'].shape[0] + y < 180        # la huerta del original queda fuera


def test_cada_mancha_de_una_pendiente_arma_su_cuadra_de_1772_entera_edificada():
    # Arrange: dos manchas rojas de la periferia sobre una manzana de 1936
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    c[30:230, 120:140] = CLASE['calle']
    cuadras = np.where(c == CLASE['edificado'], 1, 0)
    edificado = [{'id': 'U2', 'poligonos': [box(30, 30, 230, 230)], 'por_anillo': False}]

    # Act
    grupos = _cuadras_de_edificado(edificado, c, cuadras, {1: int((cuadras == 1).sum())}, METRO)

    # Assert
    assert len(grupos) == 1
    g = grupos[0]; x, y = g['origen']
    assert g['minimo'] == 2 and g['hasta'] == 2 and g['referencia'] == 'U2'
    assert g['miembros'] == set()                # una mancha no decide qué manzanas reemplaza (eso lo hace tapada72)
    assert g['cuadra'][100 - y, 130 - x]         # lo rojo es edificado aunque 1936 abra una calle ahí


def test_una_casa_de_1936_debajo_de_una_de_la_reconstruccion_se_marca_tapada():
    from tools.geo.vectorizar import marcar_tapadas
    salida = {'vertices': [0, 0, 20, 0, 20, 20, 0, 20, 10, 10, 30, 10, 30, 30, 10, 30, 100, 100, 120, 100, 120, 120, 100, 120],
              'techos': [[0, 4], [4, 4], [8, 4]], 'antes': [1, 0, 0], 'junta': [0, -1, -1], 'juntas_hasta': [2]}
    assert marcar_tapadas(salida, METRO) == [0, 1, 0]


def test_una_casa_tapada_no_vive_en_1772():
    from tools.geo.epocas import vida_de_1936
    ciudad = {'techos': [[0, 4, 1, 0, 1], [4, 4, 1, 0, 2]], 'cuadras': [-1, -1], 'junta': [-1, -1], 'antes': [0, 0],
              'tapada72': [1, 0]}
    vidas, _ = vida_de_1936(np.array([1, 1]), ciudad)
    assert vidas[0][0] == 2 and vidas[1] == [1, 0]


def test_un_edificio_chico_y_una_mancha_en_l_tambien_arman_casas():
    # Arrange: un edificio suelto de 10 × 10 m y una L de muchos lados, sobre manzana de 1936
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    cuadras = np.where(c == CLASE['edificado'], 1, 0)
    chico = box(40, 40, 60, 60)
    ele = Polygon([(80, 40), (220, 40), (220, 220), (190, 220), (190, 70), (170, 70), (170, 100), (80, 100)])
    edificado = [{'id': 'U2', 'poligonos': [chico, ele], 'por_anillo': False}]

    # Act
    grupos = _cuadras_de_edificado(edificado, c, cuadras, {1: int((cuadras == 1).sum())}, METRO)

    # Assert
    assert len(grupos) == 2 and all(g['cuadra'].any() for g in grupos)


def test_un_dueno_sin_ninguna_mancha_con_casas_no_reemplaza_su_manzana():
    # una parcial cuyo único rojo es una mota (menos de 20 m²): no sale ninguna cuadra de casas
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    cuadras = np.where(c == CLASE['edificado'], 1, 0)
    anillo = Polygon([(20, 20), (240, 20), (240, 240), (20, 240)])
    mota = [box(100, 100, 104, 104)]
    grupos = _cuadras_de_referencia([{'id': 'U1', 'poligono': anillo, 'rellenar': False, 'edificado': mota}],
                                    c, cuadras, {1: int((cuadras == 1).sum())}, METRO)
    assert grupos == []


def test_vectorizar_levanta_casas_en_una_mancha_chica_de_la_periferia():
    from shapely.geometry import Polygon as P
    from tools.geo.tests.test_vectorizar import marco_de_calles, red_de
    from tools.geo.vectorizar import vectorizar
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['terreno'] if 'terreno' in CLASE else CLASE['calle']
    red = red_de(marco_de_calles(20, 20, 240, 240), c, edificado72=np.zeros(c.shape, bool))
    red['referencia72'] = []
    red['edificado_revisado'] = [{'id': 'U2', 'poligonos': [box(60, 60, 90, 90)], 'por_anillo': False}]
    res = vectorizar(c, METRO, plaza=(130, 130), red=red)
    v = res['vertices']
    casas = [P([(v[2 * i], v[2 * i + 1]) for i in range(t[0], t[0] + t[1])]) for t, a in zip(res['techos'], res['antes']) if a]
    assert casas and all(box(58, 58, 92, 92).contains(casa) for casa in casas)


def test_una_mancha_roja_sobre_un_parque_o_un_edificio_publico_de_1936_igual_es_edificado_de_1772():
    # Arrange: en 1936 hay un parque (vegetación) y un edificio público donde 1772 pinta casas
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    otra = next(v for k, v in CLASE.items() if k not in ('calle', 'edificado', 'publico'))
    c[30:230, 30:130] = otra
    c[30:230, 130:230] = CLASE['publico']
    cuadras = np.zeros_like(c, dtype=int)
    edificado = [{'id': 'U2', 'poligonos': [box(40, 40, 220, 220)], 'por_anillo': False}]

    # Act
    grupos = _cuadras_de_edificado(edificado, c, cuadras, {}, METRO)

    # Assert
    g = grupos[0]; x, y = g['origen']
    assert g['cuadra'][100 - y, 80 - x] and g['cuadra'][100 - y, 180 - x]
    assert (g['clases'][g['cuadra']] == CLASE['edificado']).all()


def test_una_continua_de_la_referencia_sobre_un_edificio_publico_de_1936_igual_arma_su_cuadra_de_1772():
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['publico']
    c[30:230, 30:80] = CLASE['edificado']
    cuadras = np.where(np.isin(c, (CLASE['edificado'], CLASE['publico'])), 1, 0)
    anillo = Polygon([(20, 20), (240, 20), (240, 240), (20, 240)])
    grupos = _cuadras_de_referencia([{'id': 'U1', 'poligono': anillo, 'rellenar': True}], c, cuadras,
                                    {1: int((cuadras == 1).sum())}, METRO)
    assert len(grupos) == 1
    g = grupos[0]
    assert not (g['clases'][g['cuadra']] == CLASE['publico']).any()
