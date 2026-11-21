"""Red de calles de la referencia histórica de 1772: nodos con identidad y calles como secuencias de nodos."""
from copy import deepcopy

import pytest

import json

from referencia_red import calles_de_red, identidad_de_auditoria, nodos_de_red, validar_red


def lineas():
    """Dos calles horizontales, dos verticales y un camino diagonal que corta una horizontal fuera del damero."""
    return [
        {'id': 'L1', 'tipo': 'calle_recta', 'estado': 'eje', 'puntos': [[0, 0], [100, 0]]},
        {'id': 'L2', 'tipo': 'calle_recta', 'estado': 'eje', 'puntos': [[0, 50], [100, 50]]},
        {'id': 'L3', 'tipo': 'calle_recta', 'estado': 'eje', 'puntos': [[10, -10], [10, 60]]},
        {'id': 'L4', 'tipo': 'calle_recta', 'estado': 'eje', 'puntos': [[60, -10], [60, 60]]},
        {'id': 'L5', 'tipo': 'camino', 'estado': 'eje', 'puntos': [[80, 30], [90, 70]]},
    ]


def cruces():
    return [
        {'id': 'X1', 'lineas': ['L1', 'L3'], 'original': [10.0, 0.0], 'indice': [0, 0], 'sector': 'S1'},
        {'id': 'X2', 'lineas': ['L1', 'L4'], 'original': [60.0, 0.0], 'indice': [1, 0], 'sector': 'S1'},
        {'id': 'X3', 'lineas': ['L2', 'L3'], 'original': [10.0, 50.0], 'indice': [0, 1], 'sector': 'S1'},
        {'id': 'X4', 'lineas': ['L2', 'L4'], 'original': [60.0, 50.0], 'indice': [1, 1], 'sector': 'S2'},
    ]


def identidad():
    """X1 y X2 anclas del calce; X3 por semilla; X4 con esquina de 1936 que es un rótulo."""
    return {
        'anclas': [{'id': 'X1', 'px': 10.0, 'py': 0.0, 'x36': 1000.0, 'y36': 2000.0, 'nota': 'esquina 1936 A'},
                   {'id': 'X2', 'px': 60.0, 'py': 0.0, 'x36': 1500.0, 'y36': 2000.0, 'nota': 'esquina 1936 B'}],
        'por_semilla': {'X3': [1000.0, 2500.0]},
        'rotulos': {'X4'},
    }


def red():
    nodos = nodos_de_red(lineas(), cruces(), identidad())
    return {'nodos': nodos, 'calles': calles_de_red(lineas(), nodos)}


def nodo(r, ident):
    return next(n for n in r['nodos'] if n['id'] == ident)


def test_los_cruces_del_damero_conservan_su_id_y_toman_la_pareja_de_1936_solo_por_identidad():
    # Act
    nodos = {n['id']: n for n in nodos_de_red(lineas(), cruces(), identidad())}

    # Assert
    assert nodos['X1']['estado'] == 'identidad_verificada' and nodos['X1']['mosaico'] == [1000.0, 2000.0]
    assert nodos['X3']['estado'] == 'identidad_verificada' and nodos['X3']['mosaico'] == [1000.0, 2500.0]
    assert nodos['X4']['estado'] == 'sin_pareja_segura' and nodos['X4']['mosaico'] is None
    assert 'rótulo' in nodos['X4']['motivo']
    assert all(n['procedencia'] for n in nodos.values())


def test_un_encuentro_fuera_del_damero_y_los_extremos_sueltos_tambien_son_nodos():
    # Arrange: L5 corta L2 en (85, 50); los extremos que no caen en un cruce quedan como terminales
    nodos = nodos_de_red(lineas(), cruces(), identidad())

    # Act
    encuentros = [n for n in nodos if n['tipo'] == 'encuentro']
    terminales = [n for n in nodos if n['tipo'] == 'terminal']

    # Assert
    assert [n['original'] for n in encuentros] == [[85.0, 50.0]]
    assert encuentros[0]['lineas'] == ['L2', 'L5'] and encuentros[0]['estado'] == 'sin_pareja_segura'
    assert len(terminales) == 10   # 2 por línea, ninguno sobre un cruce
    assert len({n['id'] for n in nodos}) == len(nodos)


def test_cada_calle_es_la_secuencia_de_sus_nodos_en_el_orden_del_trazado():
    calles = {c['id']: c for c in red()['calles']}
    assert calles['L1']['nodos'][1:3] == ['X1', 'X2']
    assert calles['L2']['nodos'][1:3] == ['X3', 'X4'] and len(calles['L2']['nodos']) == 5
    assert calles['L5']['tipo'] == 'camino' and len(calles['L5']['nodos']) == 3


def test_la_red_construida_valida_y_no_se_muta():
    r = red(); antes = deepcopy(r)
    resumen = validar_red(r)
    assert resumen['nodos'] == len(r['nodos'])
    assert resumen['tramos'] == sum(len(c['nodos']) - 1 for c in r['calles'])
    assert resumen['identidad_verificada'] == 3
    assert r == antes


def test_dos_ids_para_el_mismo_cruce_se_rechazan():
    r = red()
    r['nodos'].append({**r['nodos'][0], 'id': 'X9'})
    with pytest.raises(ValueError, match='coordenada duplicada'):
        validar_red(r)


def test_dos_tramos_que_se_cortan_sin_nodo_compartido_son_un_cruce_imposible():
    # Arrange: una calle nueva de un terminal de L1 a uno de L2 que corta L3 y L4 sin nodo
    r = red()
    a = next(n['id'] for n in r['nodos'] if n['tipo'] == 'terminal' and n['original'] == [0.0, 0.0])
    b = next(n['id'] for n in r['nodos'] if n['tipo'] == 'terminal' and n['original'] == [100.0, 50.0])
    r['calles'].append({'id': 'L9', 'tipo': 'camino', 'estado': 'eje', 'nodos': [a, b]})

    # Act / Assert
    with pytest.raises(ValueError, match='cruce imposible'):
        validar_red(r)


def test_un_tramo_repetido_en_dos_calles_se_rechaza():
    r = red()
    r['calles'].append({'id': 'L9', 'tipo': 'calle_recta', 'estado': 'eje', 'nodos': ['X2', 'X1']})
    with pytest.raises(ValueError, match='tramo duplicado'):
        validar_red(r)


def test_el_orden_de_los_cruces_en_1936_tiene_que_ser_el_del_original():
    r = red()
    nodo(r, 'X1')['mosaico'] = [1700.0, 2000.0]   # X1 queda del otro lado de X2 en 1936
    with pytest.raises(ValueError, match='orden'):
        validar_red(r)


@pytest.mark.parametrize('cambio, mensaje', [
    ({'estado': 'aprobado'}, 'estado'),
    ({'procedencia': ''}, 'procedencia'),
    ({'mosaico': None}, 'mosaico'),
])
def test_un_nodo_identificado_necesita_estado_procedencia_y_pareja(cambio, mensaje):
    r = red()
    nodo(r, 'X1').update(cambio)
    with pytest.raises(ValueError, match=mensaje):
        validar_red(r)


def test_un_nodo_sin_pareja_necesita_motivo_y_no_lleva_mosaico():
    r = red()
    nodo(r, 'X4')['motivo'] = ''
    with pytest.raises(ValueError, match='motivo'):
        validar_red(r)
    nodo(r, 'X4').update(motivo='rótulo', mosaico=[1, 2])
    with pytest.raises(ValueError, match='mosaico'):
        validar_red(r)


def test_un_nodo_que_no_usa_ninguna_calle_o_una_calle_con_nodo_inexistente_se_rechaza():
    r = red()
    r['nodos'].append({'id': 'T99', 'tipo': 'terminal', 'lineas': [], 'original': [500.0, 500.0], 'mosaico': None,
                       'estado': 'sin_pareja_segura', 'motivo': 'suelto', 'procedencia': 'test'})
    with pytest.raises(ValueError, match='ninguna calle'):
        validar_red(r)
    r = red()
    r['calles'][0]['nodos'].append('NADA')
    with pytest.raises(ValueError, match='inexistente'):
        validar_red(r)


def test_los_encuentros_y_terminales_toman_su_sector():
    nodos = nodos_de_red(lineas(), cruces(), identidad(), sector_de=lambda x, y: 'S1' if x < 50 else 'S2')
    assert {n['sector'] for n in nodos if n['tipo'] == 'encuentro'} == {'S2'}
    assert all(n['sector'] for n in nodos)


def test_la_identidad_sale_de_las_anclas_las_semillas_los_rotulos_y_la_topologia_rechazada(tmp_path):
    # Arrange
    (tmp_path / 'calce-identidad.json').write_text(json.dumps(
        {'nodos_omitidos_por_semilla': ['X3'], 'excluidos_por_rotulo': [{'id': 'X4'}]}))
    (tmp_path / 'controles-calce-sectores.json').write_text(json.dumps(
        {'nodos': [{'id': 'X3', 'mosaico_identidad': [1000.0, 2500.0]}]}))
    (tmp_path / 'anclas-topologia.json').write_text(json.dumps(
        {'rechazados': [{'id': 'X7', 'motivo': 'el corte cae dentro de una cuadra'}]}))
    config = {'anclas': identidad()['anclas']}

    # Act
    ident = identidad_de_auditoria(tmp_path, config)

    # Assert
    assert ident['por_semilla'] == {'X3': [1000.0, 2500.0]} and ident['rotulos'] == {'X4'}
    assert 'dentro de una cuadra' in ident['sin_pareja']['X7']
    assert [a['id'] for a in ident['anclas']] == ['X1', 'X2']
