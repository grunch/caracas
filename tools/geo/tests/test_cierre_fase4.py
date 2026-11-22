"""Puerta de la fase 4 de 1772: la ocupación generada concuerda con la clasificación del censo, y los hitos sin dobles."""
from copy import deepcopy

from shapely.geometry import box

from cierre_fase4 import cobertura, dobles_de_hitos, figura_de_unidad, puerta_fase4

METRO = 0.5


def ciudad(*casas, vidas=None):
    vertices, techos = [], []
    for x0, y0, x1, y1 in casas:
        techos.append([len(vertices) // 2, 4, 2, 0, 0])
        vertices += [x0, y0, x1, y0, x1, y1, x0, y1]
    return {'vertices': vertices, 'techos': techos, 'vida': vidas or [[0, 0]] * len(casas)}


def red():
    return {'nodos': [{'id': n, 'mosaico': p} for n, p in
                      (('A', [0, 0]), ('B', [100, 0]), ('C', [100, 100]), ('D', [0, 100]),
                       ('E', [200, 0]), ('F', [200, 100]))]}


def unidades():
    return [{'id': 'U1', 'estado': 'aprobada', 'ocupacion': 'continua', 'nodos': ['A', 'B', 'C', 'D']},
            {'id': 'U2', 'estado': 'aprobada', 'ocupacion': 'terreno_libre', 'nodos': ['B', 'E', 'F', 'C']},
            {'id': 'U3', 'estado': 'pendiente', 'ocupacion': 'parcial', 'nodos': None}]


def cajas():
    """La caja de cada pendiente llevada a 1936 (aquí, ya en px del mosaico)."""
    return {'U3': box(300, 0, 400, 100)}


def test_la_figura_de_una_aprobada_es_su_anillo_y_la_de_una_pendiente_su_caja_aproximada():
    por_id = {n['id']: n for n in red()['nodos']}
    f1, medida1 = figura_de_unidad(unidades()[0], por_id, cajas(), retiro_m=2, metro=METRO)
    f3, medida3 = figura_de_unidad(unidades()[2], por_id, cajas(), retiro_m=2, metro=METRO)
    assert medida1 == 'anillo' and f1.equals(box(4, 4, 96, 96))
    assert medida3 == 'aproximada' and f3.equals(box(304, 4, 396, 96))


def test_la_cobertura_es_la_fraccion_de_la_figura_bajo_casas():
    casas = [box(0, 0, 50, 100), box(25, 0, 60, 100)]   # se solapan: no se cuenta dos veces
    assert cobertura(box(0, 0, 100, 100), casas) == 0.6


def test_un_hito_en_pie_con_una_casa_visible_sobre_su_planta_es_un_doble_edificio():
    hitos = [{'id': 'catedral', 'nace': 1, 'muere': 0, 'planta': [[[10, 10], [50, 10], [50, 50], [10, 50]]],
              'suprime': [[[8, 8], [52, 8], [52, 52], [8, 52]]]},
             {'id': 'capitolio', 'nace': 3, 'muere': 0, 'planta': [[[100, 100], [150, 100], [150, 150], [100, 150]]],
              'suprime': [[[100, 100], [150, 100], [150, 150], [100, 150]]]}]
    # la casa 0 pisa la Catedral pero cae en su supresión (no se ve); la 1 pisa el Capitolio, que en 1772 no existe
    casas = [(0, box(20, 20, 30, 30)), (1, box(110, 110, 120, 120))]
    assert dobles_de_hitos(hitos, casas, epoca=1) == []
    sin_suprimir = [{**hitos[0], 'suprime': [[[0, 0], [1, 0], [1, 1], [0, 1]]]}]
    assert dobles_de_hitos(sin_suprimir, casas, epoca=1) == [{'hito': 'catedral', 'casas': [0]}]


def test_la_puerta_separa_edificadas_sin_casas_libres_con_casas_y_parciales_rellenas():
    # Arrange: U1 continua llena, U2 libre vacía, U3 pendiente parcial sin casas
    entradas = dict(red=red(), unidades=unidades(), cajas=cajas(), hitos=[], metro=METRO)

    # Act
    p = puerta_fase4(ciudad=ciudad((0, 0, 100, 100)), **entradas)

    # Assert
    assert p['edificadas_con_casas']['sin_casas'] == [{'unidad': 'U3', 'medida': 'aproximada'}]
    assert p['libres_sin_casas']['cumplido'] is True
    assert p['fase_4_cerrable'] is False
    con_u3 = puerta_fase4(ciudad=ciudad((0, 0, 100, 100), (300, 0, 340, 100)), **entradas)
    assert con_u3['edificadas_con_casas']['cumplido'] is True
    assert con_u3['parciales_sin_rellenar']['cumplido'] is True


def test_una_libre_con_casas_y_una_parcial_rellena_no_concuerdan_con_su_clasificacion():
    u = unidades()
    u[2] = {'id': 'U3', 'estado': 'aprobada', 'ocupacion': 'parcial', 'nodos': ['B', 'E', 'F', 'C']}
    u[1] = {**u[1], 'nodos': None, 'estado': 'pendiente'}
    p = puerta_fase4(ciudad=ciudad((0, 0, 100, 100), (100, 0, 200, 100), (300, 0, 400, 100)), red=red(), unidades=u,
                     cajas={'U2': box(300, 0, 400, 100)}, hitos=[], metro=METRO)
    assert p['libres_sin_casas']['con_casas'] == [{'unidad': 'U2', 'medida': 'aproximada'}]
    assert p['parciales_sin_rellenar']['rellenas'] == ['U3']


def test_la_puerta_no_muta_sus_entradas():
    r, u, c = red(), unidades(), ciudad((0, 0, 100, 100))
    antes = deepcopy((r, u, c))
    puerta_fase4(ciudad=c, red=r, unidades=u, cajas=cajas(), hitos=[], metro=METRO)
    assert (r, u, c) == antes


def test_una_unidad_de_un_sector_limite_del_calce_no_se_mide_y_queda_listada():
    u = unidades()
    u[2] = {**u[2], 'sector': 'S9'}
    p = puerta_fase4(ciudad=ciudad((0, 0, 100, 100)), red=red(), unidades=u, cajas=cajas(), hitos=[], metro=METRO,
                     limites={'S9'})
    assert p['edificadas_con_casas']['cumplido'] is True
    assert p['sin_medir_por_limite_del_calce'] == ['U3']


def test_los_patios_y_solares_de_una_casa_no_cuentan_como_cubiertos():
    from cierre_fase4 import abiertos_de_casas
    # una casa de 100 × 100 px con un patio de 40 × 40 en el medio (marco con origen (0, 0) y ejes x, y)
    c = ciudad((0, 0, 100, 100))
    c['marcos'] = [[0, 0.0, 0.0, 1.0, 0.0, 100.0, 100.0, 0, 0, 0, 1]]
    c['alas'] = [[0, 30.0, 30.0, 70.0, 70.0]]   # tipo 0 = PATIO
    abiertos = abiertos_de_casas(c)
    assert abiertos.area == 1600


def test_la_puerta_no_se_cierra_con_una_unidad_sin_ubicar():
    u = unidades() + [{'id': 'U9', 'estado': 'pendiente', 'ocupacion': 'continua', 'nodos': None}]
    p = puerta_fase4(ciudad=ciudad((0, 0, 100, 100), (300, 0, 340, 100)), red=red(), unidades=u, cajas=cajas(),
                     hitos=[], metro=METRO)
    assert p['sin_ubicar'] == ['U9'] and p['fase_4_cerrable'] is False


def test_una_casa_suprimida_por_un_hito_no_cuenta_como_casa_de_la_unidad():
    hito = {'id': 'h', 'nace': 1, 'muere': 0, 'planta': [[[0, 0], [100, 0], [100, 100], [0, 100]]],
            'suprime': [[[0, 0], [100, 0], [100, 100], [0, 100]]]}
    p = puerta_fase4(ciudad=ciudad((0, 0, 100, 100), (300, 0, 340, 100)), red=red(), unidades=unidades(), cajas=cajas(),
                     hitos=[hito], metro=METRO)
    assert {'unidad': 'U1', 'medida': 'anillo'} in p['edificadas_con_casas']['sin_casas']
