"""Puerta de la fase 3 de 1772: calles y límites de manzana medidos sobre la salida del generador."""
from copy import deepcopy

import pytest
from shapely.geometry import box

from cierre_fase3 import (calles_abiertas_dentro, calles_ocupadas, casas_de_epoca, corredores, plazas_ocupadas,
                          puerta_fase3)

METRO = 0.5


def nodo(ident, x, y, identificado=True):
    return {'id': ident, 'mosaico': [x, y] if identificado else None,
            'estado': 'identidad_verificada' if identificado else 'sin_pareja_segura'}


def red():
    """Dos calles horizontales (y=0 e y=100) y dos verticales (x=0 y x=100), en px del mosaico."""
    nodos = [nodo('A', 0, 0), nodo('B', 100, 0), nodo('C', 100, 100), nodo('D', 0, 100), nodo('E', 200, 0, False)]
    calles = [{'id': 'L1', 'tipo': 'calle_recta', 'nodos': ['A', 'B', 'E']},
              {'id': 'L2', 'tipo': 'calle_recta', 'nodos': ['D', 'C']},
              {'id': 'L3', 'tipo': 'calle_recta', 'nodos': ['A', 'D']},
              {'id': 'L4', 'tipo': 'calle_recta', 'nodos': ['B', 'C']},
              {'id': 'L5', 'tipo': 'camino', 'nodos': ['A', 'C']}]
    return {'nodos': nodos, 'calles': calles}


def ciudad(*casas, vidas=None):
    """Salida mínima del generador: cada casa un rectángulo (x0, y0, x1, y1); `vidas` por casa (por omisión, siempre)."""
    vertices, techos = [], []
    for x0, y0, x1, y1 in casas:
        techos.append([len(vertices) // 2, 4, 2, 0, 0])
        vertices += [x0, y0, x1, y0, x1, y1, x0, y1]
    return {'vertices': vertices, 'techos': techos, 'vida': vidas or [[0, 0]] * len(casas)}


def unidades():
    return [{'id': 'U1', 'estado': 'aprobada', 'ocupacion': 'continua', 'nodos': ['A', 'B', 'C', 'D']},
            {'id': 'U2', 'estado': 'pendiente', 'ocupacion': 'continua', 'nodos': None}]


def test_las_casas_de_una_epoca_son_las_que_viven_en_ella():
    c = ciudad((10, 10, 20, 20), (30, 30, 40, 40), (50, 50, 60, 60), vidas=[[0, 0], [2, 0], [0, 1]])
    assert [k for k, _ in casas_de_epoca(c, 1)] == [0]


def test_los_corredores_son_los_tramos_rectos_entre_dos_cruces_identificados_con_ancho_inferido():
    cs = corredores(red(), ancho_m=4, metro=METRO)
    assert sorted(c['tramo'] for c in cs) == ['L1:A-B', 'L2:D-C', 'L3:A-D', 'L4:B-C']
    assert cs[0]['poligono'].area == pytest.approx(100 * 8, rel=0.05)   # 100 px de largo × 4 m (8 px) de ancho


def test_una_casa_sobre_el_nucleo_de_una_calle_la_ocupa_y_una_en_la_cuadra_no():
    cs = corredores(red(), ancho_m=4, metro=METRO)
    casas = casas_de_epoca(ciudad((40, -6, 60, 10), (20, 20, 80, 80)), 1)
    ocupadas = calles_ocupadas(cs, casas, METRO, area_minima_m2=1)
    assert [o['tramo'] for o in ocupadas] == ['L1:A-B'] and ocupadas[0]['casas'] == [0]


def test_una_plaza_con_casas_queda_ocupada():
    plaza = [{'id': 'P', 'estado': 'aprobada', 'ocupacion': 'plaza', 'nodos': ['A', 'B', 'C', 'D']}]
    por_id = {n['id']: n for n in red()['nodos']}
    assert plazas_ocupadas(plaza, por_id, casas_de_epoca(ciudad((150, 150, 160, 160)), 1), METRO, retiro_m=2) == []
    ocupadas = plazas_ocupadas(plaza, por_id, casas_de_epoca(ciudad((40, 40, 60, 60)), 1), METRO, retiro_m=2)
    assert ocupadas == [{'unidad': 'P', 'casas': [0]}]


def test_una_franja_vacia_que_cruza_una_unidad_edificada_es_una_calle_abierta_dentro():
    por_id = {n['id']: n for n in red()['nodos']}
    llena = casas_de_epoca(ciudad((5, 5, 95, 95)), 1)
    partida = casas_de_epoca(ciudad((5, 5, 95, 40), (5, 60, 95, 95)), 1)   # hueco horizontal de lado a lado
    assert calles_abiertas_dentro(unidades(), por_id, llena, METRO, retiro_m=2) == []
    assert calles_abiertas_dentro(unidades(), por_id, partida, METRO, retiro_m=2) == [{'unidad': 'U1', 'mediana': '1-3'}]


def test_la_puerta_se_cumple_sin_calles_ocupadas_ni_plazas_con_casas_ni_calles_dentro():
    # Arrange
    entradas = dict(red=red(), unidades=unidades(), verificadas=[], metro=METRO, calles=[])
    limpia = ciudad((10, 10, 90, 90))
    sucia = ciudad((10, 10, 90, 90), (90, 40, 110, 60))   # una casa sobre la calle x=100

    # Act
    buena, mala = puerta_fase3(ciudad=limpia, **entradas), puerta_fase3(ciudad=sucia, **entradas)

    # Assert
    assert buena['fase_3_cerrable'] is True
    assert buena['calles_libres']['tramos_medidos'] == 4
    assert mala['fase_3_cerrable'] is False
    assert mala['calles_libres']['ocupadas'][0]['tramo'] == 'L4:B-C'


def test_una_calle_historica_verificada_ocupada_deja_la_puerta_pendiente():
    verificadas = [{'id': 'san-jacinto', 'anclajes': [[100, 0], [100, 100]]}]
    p = puerta_fase3(ciudad=ciudad((95, 40, 105, 60)), red=red(), unidades=unidades(), verificadas=verificadas, metro=METRO)
    assert p['calles_historicas_libres']['ocupadas'] == ['san-jacinto']
    assert p['fase_3_cerrable'] is False


def test_la_puerta_no_muta_sus_entradas():
    r, u, c = red(), unidades(), ciudad((10, 10, 90, 90))
    antes = deepcopy((r, u, c))
    puerta_fase3(ciudad=c, red=r, unidades=u, verificadas=[], metro=METRO)
    assert (r, u, c) == antes


def test_una_calle_historica_se_mide_sobre_los_cruces_de_la_referencia_si_sus_extremos_estan_identificados():
    from cierre_fase3 import historicas_en_referencia
    r = red()
    for n, o in zip(r['nodos'], ([0, 0], [10, 0], [10, 10], [0, 10], [20, 0])):
        n['original'] = o
    verificadas = [{'id': 'h1', 'original': [[10, 0], [10, 10]], 'anclajes': [[108, 0], [108, 100]]},
                   {'id': 'h2', 'original': [[20, 0], [10, 0]], 'anclajes': [[200, 0], [100, 0]]}]
    medidas = {m['id']: m for m in historicas_en_referencia(verificadas, r)}
    assert medidas['h1']['anclajes'] == [[100, 0], [100, 100]] and medidas['h1']['fuente'] == 'referencia'
    assert medidas['h2']['anclajes'] == [[200, 0], [100, 0]] and medidas['h2']['fuente'] == 'anclajes'


def test_una_calle_historica_de_dos_cuadras_sigue_los_cruces_intermedios_de_la_referencia():
    from cierre_fase3 import historicas_en_referencia
    r = {'nodos': [{'id': 'A', 'original': [0, 0], 'mosaico': [0, 0]},
                   {'id': 'M', 'original': [0, 10], 'mosaico': [8, 100]},      # en 1936 la calle quiebra aquí
                   {'id': 'B', 'original': [0, 20], 'mosaico': [0, 200]},
                   {'id': 'Z', 'original': [5, 10], 'mosaico': None}],
         'calles': [{'id': 'L1', 'tipo': 'calle_recta', 'nodos': ['A', 'M', 'B']},
                    {'id': 'L2', 'tipo': 'calle_recta', 'nodos': ['M', 'Z']}]}
    medida = historicas_en_referencia([{'id': 'h', 'original': [[0, 0], [0, 20]], 'anclajes': [[0, 0], [0, 200]]}], r)[0]
    assert medida == {'id': 'h', 'anclajes': [[0, 0], [8, 100], [0, 200]], 'fuente': 'referencia'}


def test_una_calle_historica_cuyos_extremos_estan_en_calles_distintas_conserva_sus_anclajes():
    from cierre_fase3 import historicas_en_referencia
    r = {'nodos': [{'id': 'A', 'original': [0, 0], 'mosaico': [0, 0]}, {'id': 'C', 'original': [10, 10], 'mosaico': [100, 100]}],
         'calles': [{'id': 'L1', 'tipo': 'calle_recta', 'nodos': ['A']}, {'id': 'L2', 'tipo': 'calle_recta', 'nodos': ['C']}]}
    v = [{'id': 'h', 'original': [[0, 0], [10, 10]], 'anclajes': [[0, 0], [0, 100], [100, 100]]}]
    assert historicas_en_referencia(v, r)[0] == {'id': 'h', 'anclajes': [[0, 0], [0, 100], [100, 100]], 'fuente': 'anclajes'}


def test_la_red_conectada_cuenta_por_sector_los_tramos_bloqueados_y_los_que_no_se_miden():
    calles = [{'tramo': 'L1:A-B', 'sector': 'S1', 'puntos': [[0, 50], [200, 50]], 'banda_m': 10, 'medible': True},
              {'tramo': 'L2:B-C', 'sector': 'S2', 'puntos': [[0, 150], [200, 150]], 'banda_m': 10, 'medible': True},
              {'tramo': 'L3:C-D', 'sector': 'S9', 'puntos': [[0, 250], [200, 250]], 'banda_m': 10, 'medible': False}]
    c = ciudad((90, 120, 110, 180))   # una casa que cierra L2 de lado a lado
    p = puerta_fase3(ciudad=c, red=red(), unidades=unidades(), verificadas=[], metro=METRO, calles=calles)
    conexa = p['red_conectada']
    assert conexa['cumplido'] is False and conexa['bloqueados'] == ['L2:B-C']
    assert conexa['por_sector'] == {'S1': {'medidos': 1, 'bloqueados': 0}, 'S2': {'medidos': 1, 'bloqueados': 1}}
    assert conexa['sin_medir_por_limite_del_calce'] == {'S9': 1}


def test_sin_las_calles_la_red_conectada_queda_incompleta_y_la_puerta_no_se_cierra():
    p = puerta_fase3(ciudad=ciudad((10, 10, 90, 90)), red=red(), unidades=unidades(), verificadas=[], metro=METRO)
    assert p['red_conectada'] == {'cumplido': False, 'sin_entrada': True}
    assert p['fase_3_cerrable'] is False


def test_una_plazuela_del_censo_final_con_una_casa_dentro_no_deja_cerrar_la_fase_3():
    # T33j.8c: las plazuelas de 1772-plazuelas.json cuentan como plazas: ninguna casa con la mitad o más dentro
    from shapely.geometry import box as caja
    from cierre_fase3 import plazuelas_ocupadas
    casas = [(7, caja(0, 0, 10, 10)), (8, caja(97.5, 0, 107.5, 10))]   # la 8, un cuarto dentro
    plazuelas = [{'id': 'P1772-001', 'poligono': caja(-5, -5, 100, 20)}]
    assert plazuelas_ocupadas(casas, plazuelas) == [{'plazuela': 'P1772-001', 'casas': [7]}]
    assert plazuelas_ocupadas(casas, [{'id': 'P2', 'poligono': caja(300, 300, 310, 310)}]) == []


def test_la_puerta_de_la_fase_3_lee_las_plazuelas_del_registro_si_no_se_las_pasan(monkeypatch):
    # revisión de #158: cierre_fase5 llama a puerta_fase3 sin plazuelas; la puerta las lee del registro por su cuenta
    import plazuelas
    from shapely.geometry import box as caja
    monkeypatch.setattr(plazuelas, 'plazuelas_en_1936', lambda: [{'id': 'P1772-009', 'poligono': caja(0, 0, 200, 200)}])
    p = puerta_fase3(ciudad=ciudad((10, 10, 90, 90)), red=red(), unidades=unidades(), verificadas=[], metro=METRO)
    assert {'plazuela': 'P1772-009', 'casas': [0]} in p['plazas_sin_casas']['ocupadas']


def test_la_planta_de_un_hito_que_ocupa_la_manzana_no_es_una_calle_abierta_dentro():
    # #160: el Capitolio ocupa casi toda U1772-0203; entre sus casas y su planta no hay calle. La puerta cuenta la
    # planta de los hitos en pie como ocupación
    por_id = {n['id']: n for n in red()['nodos']}
    partida = casas_de_epoca(ciudad((5, 5, 95, 40), (5, 60, 95, 95)), 1)
    plantas = [box(5, 35, 95, 65)]
    assert calles_abiertas_dentro(unidades(), por_id, partida, METRO, retiro_m=2, plantas=plantas) == []
    p = puerta_fase3(ciudad=ciudad((5, 5, 95, 40), (5, 60, 95, 95)), red=red(), unidades=unidades(), verificadas=[],
                     metro=METRO, calles=[], plazuelas=[], plantas=plantas)
    assert p['sin_calles_dentro_de_unidades']['cumplido'] is True
