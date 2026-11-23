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


def test_una_mancha_roja_con_las_esquinas_achaflanadas_arma_su_cuadra_con_esquinas_vivas():
    # T33j.5c: el dibujo y el calce redondean las esquinas de lo rojo; un chaflán de pocos metros es un lado más del
    # reparto y sus casas quedan en cuña, mirando en diagonal
    from tools.geo.vectorizar import _sin_chaflanes
    chaflanada = Polygon([(48, 40), (192, 40), (200, 48), (200, 192), (192, 200), (48, 200), (40, 192), (40, 48)])
    viva = _sin_chaflanes(chaflanada, 0.5)
    assert len(viva.exterior.coords) - 1 == 4
    assert viva.equals_exact(box(40, 40, 200, 200), 1e-6) or abs(viva.area - 160 * 160) < 1e-6
    # una L de verdad no pierde su entrante, y un lado corto entre lados cortos tampoco se toca
    ele = Polygon([(40, 40), (200, 40), (200, 200), (120, 200), (120, 120), (40, 120)])
    assert _sin_chaflanes(ele, 0.5).equals(ele)


def test_las_casas_de_una_mancha_achaflanada_no_quedan_en_cuna():
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    chaflanada = Polygon([(48, 40), (192, 40), (200, 48), (200, 192), (192, 200), (48, 200), (40, 192), (40, 48)])
    g = _cuadras_de_edificado([{'id': 'U2', 'poligonos': [chaflanada], 'por_anillo': False}], c,
                              np.zeros_like(c, dtype=int), {}, METRO)[0]
    assert len(g['poligono']) == 4
    x, y = g['origen']
    assert g['cuadra'][41 - y, 41 - x] and g['cuadra'][198 - y, 198 - x]   # las esquinas, de la cuadra


def test_dos_manchas_rojas_que_el_calce_encima_no_se_pisan():
    # dos unidades cuyas manchas, llevadas a 1936 por el calce, caen en parte una sobre otra: la segunda cede lo común
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    edificado = [{'id': 'U2', 'poligonos': [box(40, 40, 140, 140)], 'por_anillo': False},
                 {'id': 'U3', 'poligonos': [box(110, 40, 220, 140)], 'por_anillo': False}]
    grupos = _cuadras_de_edificado(edificado, c, np.zeros_like(c, dtype=int), {}, METRO)
    total = np.zeros(c.shape, int)
    for g in grupos:
        x, y = g['origen']
        alto, ancho = g['cuadra'].shape
        total[y:y + alto, x:x + ancho] += g['cuadra']
    assert total.max() == 1 and total[60, 125] == 1


def test_una_casa_de_1936_que_apenas_pisa_una_de_la_reconstruccion_no_vive_en_1772():
    from tools.geo.vectorizar import marcar_tapadas
    # 0,5 m² en común: antes se toleraba hasta 1 m²; la puerta de la fase 5 cuenta desde 0,01 m²
    salida = {'vertices': [0, 0, 20, 0, 20, 20, 0, 20, 19.9, 0, 40, 0, 40, 20, 19.9, 20], 'techos': [[0, 4, 1, 0, 0], [4, 4, 1, 0, 0]],
              'antes': [1, 0], 'junta': [0, -1], 'juntas_hasta': [2]}
    assert marcar_tapadas(salida, METRO) == [0, 1]


def test_una_casa_de_1578_que_pisa_una_de_1772_muere_en_1772():
    from tools.geo.epocas import ceder_a_1772
    # la 0 vive en 1772 (reconstrucción); la 1 es de 1578, vive hasta 1843 y pisa a la 0; la 2, de 1578, no pisa nada
    ciudad = {'vertices': [0, 0, 20, 0, 20, 20, 0, 20, 18, 0, 40, 0, 40, 20, 18, 20, 100, 100, 120, 100, 120, 120, 100, 120],
              'techos': [[0, 4, 1, 0, 0], [4, 4, 1, 0, 0], [8, 4, 1, 0, 0]]}
    vida = [[1, 2], [0, 2], [0, 2]]
    assert ceder_a_1772(ciudad, vida, desde=1, metro=METRO) == [[1, 2], [0, 1], [0, 2]]
    assert vida == [[1, 2], [0, 2], [0, 2]]   # no muta la entrada


def test_un_entrante_no_pierde_su_esquina_interior():
    # la esquina interior de un entrante (40,10)-(42,12) m: su esquina viva quitaría área de la cuadra; solo se cambia
    # un chaflán exterior, cuya esquina viva suma
    from tools.geo.vectorizar import _sin_chaflanes
    m = [(0, 0), (40, 0), (40, 10), (42, 12), (50, 12), (50, 0), (100, 0), (100, 100), (0, 100)]
    entrante = Polygon([(x / METRO, y / METRO) for x, y in m])
    assert _sin_chaflanes(entrante, METRO).equals(entrante)


def _casas_de_grupos(grupos, c):
    from tools.geo.vectorizar import techos_de_manzana
    salida = {'vertices': [], 'techos': [], 'esquinas': [], 'cuadras': [], 'cede': [], 'junta': [], 'antes': [],
              'marcos': [], 'alas': [], 'publicos': [], 'n_cuadras': 0, '_antes': 1}
    for j, g in enumerate(grupos):
        salida['_junta'] = j
        techos_de_manzana(g['clases'], g['cuadra'], g['origen'], salida, 4, 1, lambda f: 0.0, METRO, True, g['poligono'])
    v = salida['vertices']
    return [(salida['junta'][k], Polygon([(v[2 * (a + i)], v[2 * (a + i) + 1]) for i in range(n)]))
            for k, (a, n, *_resto) in enumerate(salida['techos'])]


def test_las_casas_de_dos_manchas_que_el_calce_encima_no_se_pisan():
    # la segunda mancha cede lo común en su máscara y también en su polígono: el reparto exacto por lados tolera 2 m
    # de diferencia en el borde y, con el polígono entero, devolvería la franja común (1,5 m) a sus casas
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    edificado = [{'id': 'U2', 'poligonos': [box(40, 40, 140, 140)], 'por_anillo': False},
                 {'id': 'U3', 'poligonos': [box(137, 40, 220, 140)], 'por_anillo': False}]
    casas = _casas_de_grupos(_cuadras_de_edificado(edificado, c, np.zeros_like(c, dtype=int), {}, METRO), c)
    assert {j for j, _ in casas} == {0, 1}
    for i, (ji, a) in enumerate(casas):
        for jj, b in casas[i + 1:]:
            assert ji == jj or a.intersection(b).area * METRO ** 2 <= 0.01


def test_una_mancha_que_cede_y_se_reparte_por_su_mascara_tampoco_pisa_a_la_anterior():
    # dos manchas anteriores muerden 1,5 m del frente de la última: lo que le queda pasa de LADOS_MAXIMOS
    # (_ceder_poligono → None) y el reparto exacto, que infiere el polígono de la máscara con su tolerancia de 2 m, no
    # debe devolverle las mordidas
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    edificado = [{'id': f'U{k}', 'poligonos': [box(x, 23, x + 12, 43)], 'por_anillo': False}
                 for k, x in enumerate((80, 160))] + [{'id': 'U9', 'poligonos': [box(40, 40, 220, 140)], 'por_anillo': False}]
    grupos = _cuadras_de_edificado(edificado, c, np.zeros_like(c, dtype=int), {}, METRO)
    assert grupos[-1]['poligono'] is None
    casas = _casas_de_grupos(grupos, c)
    assert len({j for j, _ in casas}) == 3
    for i, (ji, a) in enumerate(casas):
        for jj, b in casas[i + 1:]:
            assert ji == jj or a.intersection(b).area * METRO ** 2 <= 0.01


def test_una_mancha_que_cede_una_caja_adentro_no_la_vuelve_a_techar():
    # la primera mancha cae entera dentro de la segunda: el polígono de la segunda queda con un hueco (_ceder_poligono →
    # None) y el reparto por su máscara no debe devolverle la caja al quedarse con el contorno exterior de una huella
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    edificado = [{'id': 'U2', 'poligonos': [box(52, 70, 64, 82)], 'por_anillo': False},
                 {'id': 'U9', 'poligonos': [box(40, 40, 220, 140)], 'por_anillo': False}]
    grupos = _cuadras_de_edificado(edificado, c, np.zeros_like(c, dtype=int), {}, METRO)
    assert grupos[-1]['poligono'] is None
    casas = _casas_de_grupos(grupos, c)
    caja = box(53, 71, 63, 81)
    assert not any(casa.intersection(caja).area * METRO ** 2 > 0.01 for j, casa in casas if j == len(grupos) - 1)


def test_con_huellas_cambia_solo_las_casas_dadas_y_no_muta_la_ciudad():
    from tools.geo.epocas import con_huellas
    ciudad = {'vertices': [0, 0, 10, 0, 10, 10, 0, 10, 20, 0, 30, 0, 30, 10],
              'techos': [[0, 4, 1, 0, 0], [4, 3, 2, 0, 0]], 'vida': [[1, 2], [0, 0]]}
    nueva = con_huellas(ciudad, {0: box(0, -2, 10, 10)})
    assert nueva['techos'][1] == [nueva['techos'][1][0], 3, 2, 0, 0]
    v = nueva['vertices']
    a, n = nueva['techos'][0][:2]
    assert Polygon([(v[2 * (a + i)], v[2 * (a + i) + 1]) for i in range(n)]).equals(box(0, -2, 10, 10))
    a, n = nueva['techos'][1][:2]
    assert [v[2 * (a + i)] for i in range(n)] == [20, 30, 30]
    assert ciudad['vertices'][:2] == [0, 0] and len(ciudad['vertices']) == 14


def test_dar_acceso_1772_une_el_lote_encerrado_a_su_vecina_y_le_quita_el_marco():
    from tools.geo.epocas import dar_acceso_1772
    figuras = [box(0, 0, 40, 20), box(40, 0, 60, 20), box(10, 20, 50, 40), box(0, 20, 10, 40), box(50, 20, 60, 40),
               box(0, 40, 60, 60)]
    vertices, techos = [], []
    for f in figuras:
        puntos = list(f.exterior.coords)[:-1]
        techos.append([len(vertices) // 2, len(puntos), 1, 0, 0])
        vertices.extend(c for p in puntos for c in p)
    ciudad = {'vertices': vertices, 'techos': techos, 'vida': [[1, 2]] * 6, 'antes': [1] * 6,
              'junta': [7, 9, 7, 9, 9, 9], 'cede': [-1] * 6, 'esquinas': [0] * 6,
              'marcos': [[0, 0, 0, 1, 0, 20, 20, 0, 3, 0, 1], [2, 0, 0, 1, 0, 20, 20, 0, 3, 1, 1],
                         [5, 0, 0, 1, 0, 20, 20, 0, 3, 2, 1]],
              'alas': [[0, 0, 0, 1, 1]] * 3}
    nueva = dar_acceso_1772(ciudad, [], METRO)
    assert len(nueva['techos']) == 5 and len(nueva['vida']) == 5 and len(nueva['junta']) == 5
    v = nueva['vertices']
    a, n = nueva['techos'][0][:2]
    assert abs(Polygon([(v[2 * (a + i)], v[2 * (a + i) + 1]) for i in range(n)]).area - 1600) < 1e-6
    # la casa que absorbe el lote pierde su marco (el visor la techa por su huella); la del lote se va con el suyo
    assert [m[0] for m in nueva['marcos']] == [4]
    assert len(ciudad['techos']) == 6 and len(ciudad['marcos']) == 3


def test_dar_acceso_1772_no_une_si_la_huella_unida_quedaria_escondida_por_un_hito():
    from tools.geo.epocas import dar_acceso_1772
    figuras = [box(0, 0, 40, 20), box(40, 0, 60, 20), box(10, 20, 50, 40), box(0, 20, 10, 40), box(50, 20, 60, 40),
               box(0, 40, 60, 60)]
    vertices, techos = [], []
    for f in figuras:
        puntos = list(f.exterior.coords)[:-1]
        techos.append([len(vertices) // 2, len(puntos), 1, 0, 0])
        vertices.extend(c for p in puntos for c in p)
    ciudad = {'vertices': vertices, 'techos': techos, 'vida': [[1, 2]] * 6, 'antes': [1] * 6,
              'junta': [7, 9, 7, 9, 9, 9], 'cede': [-1] * 6, 'esquinas': [0] * 6, 'marcos': [], 'alas': []}
    # una franja de 2 px que viene de la calle: pisa 40 px² de la casa 0 y 20 del lote 2, menos del 25 % de sus
    # 180 px² cada una, y 60 de las dos juntas, que el visor ya escondería
    hito = {'nace': 0, 'muere': 0, 'suprime': [[(20, -60), (22, -60), (22, 30), (20, 30)]], 'planta': []}
    nueva = dar_acceso_1772(ciudad, [hito], METRO)
    assert len(nueva['techos']) == 6


def test_ceder_frentes_a_1772_mata_en_1772_la_casa_de_1578_parada_delante_del_frente():
    from tools.geo.epocas import ceder_frentes_a_1772
    figuras = [box(10 + k * 20, 20, 30 + k * 20, 60) for k in range(8)] + [box(40, 8, 120, 14)]
    vertices, techos = [], []
    for f in figuras:
        puntos = list(f.exterior.coords)[:-1]
        techos.append([len(vertices) // 2, len(puntos), 1, 0, 0])
        vertices.extend(c for p in puntos for c in p)
    ciudad = {'vertices': vertices, 'techos': techos, 'vida': [[1, 2]] * 8 + [[0, 3]], 'antes': [1] * 8,
              'junta': [7] * 8}
    tramos = [{'tramo': 'L1:A-B', 'sector': 'S1', 'puntos': [[0, 0], [180, 0]], 'banda_m': 6.0, 'medible': True}]
    vida = ceder_frentes_a_1772(ciudad, tramos, [], METRO, desde=8)
    assert vida[8] == [0, 1] and vida[:8] == ciudad['vida'][:8]
    assert ciudad['vida'][8] == [0, 3]


def test_alinear_1772_da_una_segunda_pasada_sobre_las_huellas_de_la_primera(monkeypatch):
    # una saliente que se ajusta corre la recta de sus vecinas: la segunda pasada mide con las huellas ya ajustadas
    import fachadas
    from tools.geo.epocas import alinear_1772
    vistas = []

    def falsa(casas, *a, **k):
        vistas.append(dict(casas)[0].bounds)
        return {0: box(0, -2, 10, 10)} if len(vistas) == 1 else {}
    monkeypatch.setattr(fachadas, 'alinear_casas', falsa)
    ciudad = {'vertices': [0, 0, 10, 0, 10, 10, 0, 10], 'techos': [[0, 4, 1, 0, 0]], 'vida': [[1, 2]], 'antes': [1],
              'junta': [3]}
    red = {'nodos': [], 'calles': []}
    nueva = alinear_1772(ciudad, [], [], red, [], METRO)
    assert vistas == [(0, 0, 10, 10), (0, -2, 10, 10)]
    v = nueva['vertices']
    assert min(v[1::2]) == -2


def test_vuelos_1772_topa_el_alero_de_la_casa_que_queda_cerca_del_nucleo_de_la_calzada():
    # T33j.6f: el núcleo de 4 m (8 px) de una calle horizontal en y = 0 va de y = -4 a 4 px; una casa a 0,3 m de él
    # (y desde 4,6 px) vuela como mucho 30 cm; una a 10 m, sin tope (255)
    from tools.geo.epocas import vuelos_1772
    figuras = [box(0, 4.6, 20, 30), box(30, 24, 50, 50)]
    vertices, techos = [], []
    for f in figuras:
        puntos = list(f.exterior.coords)[:-1]
        techos.append([len(vertices) // 2, len(puntos), 1, 0, 0])
        vertices.extend(c for p in puntos for c in p)
    ciudad = {'vertices': vertices, 'techos': techos, 'vida': [[1, 2]] * 2, 'antes': [1, 1], 'junta': [7, 7]}
    red = {'nodos': [{'id': 'A', 'mosaico': [-100, 0]}, {'id': 'B', 'mosaico': [200, 0]}],
           'calles': [{'id': 'L1', 'tipo': 'calle_recta', 'nodos': ['A', 'B']}]}
    nueva = vuelos_1772(ciudad, [], red, METRO)
    assert nueva['vuelos'] == [30, 255]
    assert 'vuelos' not in ciudad


def test_sin_solapes_residuales_resta_el_solape_a_la_casa_mas_grande():
    # T33j.6j: dos casas de 1772 vecinas se pisan 0,2 × 10 px (menos que el umbral de la fase 5): el solape se le
    # resta a la más grande; una casa de 1936 (antes = 0) no se toca
    from tools.geo.epocas import sin_solapes_residuales
    figuras = [box(0, 0, 20.2, 10), box(20, 0, 30, 10), box(40, 0, 50.2, 10), box(50, 0, 70, 10)]
    vertices, techos = [], []
    for f in figuras:
        puntos = list(f.exterior.coords)[:-1]
        techos.append([len(vertices) // 2, len(puntos), 1, 0, 0])
        vertices.extend(c for p in puntos for c in p)
    ciudad = {'vertices': vertices, 'techos': techos, 'vida': [[1, 2]] * 4, 'antes': [1, 1, 1, 0], 'junta': [7, 7, 7, -1]}
    nueva = sin_solapes_residuales(ciudad, [], METRO)
    v = nueva['vertices']

    def huella(k):
        a, n = nueva['techos'][k][:2]
        return Polygon([(v[2 * (a + i)], v[2 * (a + i) + 1]) for i in range(n)])
    assert huella(0).intersection(huella(1)).area < 1e-9 and abs(huella(0).area - 200) < 1e-6   # la grande cede
    assert huella(1).equals(figuras[1])
    assert huella(2).intersection(huella(3)).area < 1e-9 and huella(3).equals(figuras[3])     # la de 1936 queda
    assert len(ciudad['vertices']) == len(vertices)


def test_sin_solapes_residuales_no_parte_una_casa_en_dos():
    # revisión de #150: un solape fino que cruza la casa entera la partiría; ese corte no se hace
    from tools.geo.epocas import sin_solapes_residuales
    figuras = [box(0, 0, 30, 10), box(20, -1, 20.001, 11)]
    vertices, techos = [], []
    for f in figuras:
        puntos = list(f.exterior.coords)[:-1]
        techos.append([len(vertices) // 2, len(puntos), 1, 0, 0])
        vertices.extend(c for p in puntos for c in p)
    ciudad = {'vertices': vertices, 'techos': techos, 'vida': [[1, 2]] * 2, 'antes': [1, 1], 'junta': [7, 7]}
    nueva = sin_solapes_residuales(ciudad, [], METRO)
    a, n = nueva['techos'][0][:2]
    v = nueva['vertices']
    assert abs(Polygon([(v[2 * (a + i)], v[2 * (a + i) + 1]) for i in range(n)]).area - 300) < 1e-6


def test_cerrar_aberturas_1772_deja_el_marco_sin_alas_a_la_casa_que_crece():
    # T33j.7c: la casa que cierra el hueco crece a lo largo de la fachada: conserva la dirección de su marco (sin
    # él, el visor la techaba con la cumbrera girada) y pierde las alas, que eran de la casa sin el hueco
    import tools.geo.epocas as ep
    from shapely.geometry import box as caja
    figuras = [caja(10 + k * 20, 12, 10 + (k + 1) * 20, 42) for k in range(8) if k != 3]
    vertices, techos = [], []
    for f in figuras:
        puntos = list(f.exterior.coords)[:-1]
        techos.append([len(vertices) // 2, len(puntos), 1, 0, 0])
        vertices.extend(c for p in puntos for c in p)
    n = len(figuras)
    ciudad = {'vertices': vertices, 'techos': techos, 'vida': [[1, 2]] * n, 'antes': [1] * n, 'junta': [7] * n,
              'marcos': [[k, 0, 0, 1, 0, 20, 30, 0, 14, 0, 2] for k in range(n)], 'alas': []}
    tramos = [{'tramo': 'L1:A-B', 'sector': 'S1', 'puntos': [[0, 0], [180, 0]], 'banda_m': 6.0, 'medible': True}]
    red = {'nodos': [], 'calles': []}
    nueva = ep.cerrar_aberturas_1772(ciudad, tramos, [], red, [], [caja(60, 10, 100, 45)], METRO)
    crecidas = [k for k in range(n) if nueva['techos'][k] != ciudad['techos'][k] or nueva['vertices'] != ciudad['vertices']]
    assert crecidas
    assert [m[0] for m in nueva['marcos']] == [m[0] for m in ciudad['marcos']]
    sin_alas = [m for m in nueva['marcos'] if m[10] == 0]
    assert sin_alas and all(m[1:10] == ciudad['marcos'][m[0]][1:10] for m in sin_alas)
