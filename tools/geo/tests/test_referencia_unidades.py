"""Unidades de la referencia histórica de 1772: geometría sobre la red, o motivo explícito para quedar pendiente."""
from copy import deepcopy

import pytest

from referencia_unidades import celdas_de_red, unidades_de_referencia, validar_unidades


def nodo(ident, i, j, identificado=True):
    return {'id': ident, 'tipo': 'cruce', 'indice': [i, j], 'original': [10.0 * i, 10.0 * j], 'lineas': [],
            'estado': 'identidad_verificada' if identificado else 'sin_pareja_segura',
            'mosaico': [100.0 + 20 * i, 200.0 + 20 * j] if identificado else None,
            'motivo': None if identificado else 'sin pareja', 'procedencia': 'test'}


def red(sin_pareja=(), sin_calle=()):
    """Retícula de 3×2 cruces (dos celdas); `sin_calle`: tramos (a, b) que no existen."""
    nodos = [nodo(f'X{i}{j}', i, j, f'X{i}{j}' not in sin_pareja) for j in range(2) for i in range(3)]
    filas = [[f'X{i}{j}' for i in range(3)] for j in range(2)]
    columnas = [[f'X{i}{j}' for j in range(2)] for i in range(3)]
    calles = []
    for k, seq in enumerate(filas + columnas):
        partes, actual = [], [seq[0]]
        for a, b in zip(seq, seq[1:]):
            if (a, b) in sin_calle:
                partes.append(actual); actual = [b]
            else:
                actual.append(b)
        partes.append(actual)
        calles += [{'id': f'L{k}{n}', 'tipo': 'calle_recta', 'estado': 'eje', 'nodos': p}
                   for n, p in enumerate(partes) if len(p) > 1]
    return {'fuente': 'original.jpg', 'fuente_sha256': 'a' * 64, 'nodos': nodos, 'calles': calles, 'huella_calce': 'h' * 64}


def unidad(ident, bbox, ocupacion='continua', sector='S1'):
    return {'id_fuente': ident, 'sector': sector, 'bbox_original': bbox, 'revision_original': {'ocupacion': ocupacion}}


def entradas(**cambios):
    base = {
        'unidades': [unidad('U1', [1, 1, 9, 9]), unidad('U2', [11, 1, 19, 9], 'terreno_libre'), unidad('U3', [2, 30, 40, 60])],
        'lecturas': {'U1': 'bordes', 'U2': 'restantes', 'U3': 'sin_cara'},
        'caras': {},
        'correspondencias': {'U1': {'clase': 'uno_a_uno', 'cuadras': [{'cuadra': 7}]},
                             'U2': {'clase': 'vacio_coincide', 'cuadras': []},
                             'U3': {'clase': 'ausente', 'cuadras': []}},
        'limites': set(), 'excepciones': {},
    }
    return {**base, **cambios}


def construir(r=None, **cambios):
    r = r or red()
    return unidades_de_referencia(red=r, **entradas(**cambios))


def por_id(unidades):
    return {u['id']: u for u in unidades}


def test_las_celdas_del_damero_salen_de_la_red_con_sus_lados_de_calle():
    celdas = celdas_de_red(red(sin_calle={('X10', 'X20')}))
    assert celdas[(0, 0)] == {'nodos': ['X00', 'X10', 'X11', 'X01'], 'lados_de_calle': True}
    assert celdas[(1, 0)]['lados_de_calle'] is False


def test_una_unidad_entera_en_una_celda_con_cuatro_esquinas_identificadas_queda_aprobada_sobre_sus_nodos():
    # Act
    u = por_id(construir())

    # Assert
    assert u['U1']['estado'] == 'aprobada' and u['U1']['nodos'] == ['X00', 'X10', 'X11', 'X01']
    assert u['U1']['motivos'] == [] and u['U1']['correspondencia'] == {'clase': 'uno_a_uno', 'cuadras_1936': [7]}
    assert u['U1']['lectura'] == 'bordes' and 'lectura bordes' in u['U1']['procedencia']
    assert u['U2']['estado'] == 'aprobada' and u['U2']['ocupacion'] == 'terreno_libre'


def test_una_unidad_fuera_de_las_celdas_queda_pendiente_sin_geometria_y_con_su_motivo():
    u = por_id(construir())['U3']
    assert u['estado'] == 'pendiente' and u['nodos'] is None
    assert u['motivos'] == ['sin_celda_del_damero']


@pytest.mark.parametrize('r, cambios, motivo', [
    (red(sin_pareja={'X11'}), {}, 'esquina_sin_pareja_en_1936'),
    (red(sin_calle={('X00', 'X10')}), {}, 'lado_sin_calle'),
    (None, {'limites': {'S1'}}, 'sector_limite_del_calce'),
    (None, {'correspondencias': {'U1': {'clase': 'incierta', 'cuadras': []},
                                 'U2': {'clase': 'vacio_coincide', 'cuadras': []},
                                 'U3': {'clase': 'ausente', 'cuadras': []}}}, 'correspondencia_incierta'),
    (None, {'unidades': [unidad('U1', [1, 1, 9, 9], 'parte_de_otra_unidad')]}, 'ocupacion_sin_unidad_propia'),
    (None, {'excepciones': {'U1': ['sin calle intermedia']}}, 'excepcion_registrada'),
])
def test_cada_condicion_que_falta_deja_la_unidad_pendiente_con_su_motivo(r, cambios, motivo):
    if 'unidades' in cambios:
        cambios = {**cambios, 'lecturas': {'U1': 'bordes'}, 'correspondencias': {'U1': {'clase': 'uno_a_uno', 'cuadras': []}}}
    u = por_id(construir(r, **cambios))['U1']
    assert u['estado'] == 'pendiente' and motivo in u['motivos']


def test_una_celda_con_un_lado_sin_calle_no_da_geometria():
    u = por_id(construir(red(sin_calle={('X00', 'X10')})))['U1']
    assert u['nodos'] is None and u['celda'] == [0, 0]


def test_dos_unidades_en_la_misma_celda_quedan_pendientes_sin_geometria_para_no_solaparse():
    unidades = [unidad('U1', [1, 1, 4, 9]), unidad('U2', [5, 1, 9, 9])]
    u = por_id(construir(unidades=unidades, lecturas={'U1': 'bordes', 'U2': 'bordes'}))
    assert [u[x]['estado'] for x in ('U1', 'U2')] == ['pendiente', 'pendiente']
    assert all(u[x]['nodos'] is None and 'celda_compartida' in u[x]['motivos'] for x in ('U1', 'U2'))


def test_la_cara_candidata_decide_la_celda_y_queda_citada_sin_aprobarse():
    # la caja de U3 cae fuera, pero su cara candidata está entera en la celda (1, 0)
    caras = {'U3': {'id': 'C9', 'original': [[11, 1], [19, 1], [19, 9], [11, 9]]}}
    u = por_id(construir(unidades=[unidad('U3', [2, 30, 40, 60])], lecturas={'U3': 'sin_cara'}, caras=caras))['U3']
    assert u['celda'] == [1, 0] and u['contorno_candidato'] == 'C9'


def test_la_referencia_construida_valida_y_no_muta_sus_entradas():
    r = red(); e = entradas(); antes = deepcopy((r, e))
    unidades = unidades_de_referencia(red=r, **e)
    resumen = validar_unidades({'unidades': unidades}, r, {'U1', 'U2', 'U3'})
    assert resumen['aprobadas'] == 2 and resumen['pendientes'] == 1
    assert resumen['motivos'] == {'sin_celda_del_damero': 1}
    assert (r, e) == antes


def test_el_validador_exige_toda_unidad_del_censo_una_sola_vez():
    r = red(); unidades = construir(r)
    with pytest.raises(ValueError, match='censo'):
        validar_unidades({'unidades': unidades[:2]}, r, {'U1', 'U2', 'U3'})
    with pytest.raises(ValueError, match='duplicado'):
        validar_unidades({'unidades': unidades + unidades[:1]}, r, {'U1', 'U2', 'U3'})


@pytest.mark.parametrize('cambio, mensaje', [
    ({'motivos': ['correspondencia_incierta']}, 'motivos'),
    ({'nodos': None}, 'geometría'),
    ({'nodos': ['X00', 'X10', 'X11', 'X01', 'X20']}, 'calle'),
    ({'correspondencia': None}, 'correspondencia'),
])
def test_una_aprobada_sin_geometria_sobre_calles_o_con_motivos_se_rechaza(cambio, mensaje):
    r = red(); unidades = construir(r)
    por_id(unidades)['U1'].update(cambio)
    with pytest.raises(ValueError, match=mensaje):
        validar_unidades({'unidades': unidades}, r, {'U1', 'U2', 'U3'})


def test_una_pendiente_sin_motivo_o_con_motivo_desconocido_se_rechaza():
    r = red(); unidades = construir(r)
    por_id(unidades)['U3']['motivos'] = []
    with pytest.raises(ValueError, match='motivo'):
        validar_unidades({'unidades': unidades}, r, {'U1', 'U2', 'U3'})
    por_id(unidades)['U3']['motivos'] = ['me_parece']
    with pytest.raises(ValueError, match='motivo'):
        validar_unidades({'unidades': unidades}, r, {'U1', 'U2', 'U3'})


def test_dos_unidades_con_la_misma_geometria_se_solapan():
    r = red(); unidades = construir(r)
    por_id(unidades)['U2']['nodos'] = list(por_id(unidades)['U1']['nodos'])
    with pytest.raises(ValueError, match='solape'):
        validar_unidades({'unidades': unidades}, r, {'U1', 'U2', 'U3'})
