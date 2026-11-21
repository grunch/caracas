"""Puerta de salida de la fase 2 de 1772: referencia completa, validadores que detectan, incertidumbres explícitas."""
from copy import deepcopy

import pytest

from cierre_fase2 import detecta_fallos, excepciones_1772, puerta_fase2, validar_excepciones, validar_procedencias
from referencia_unidades import unidades_de_referencia
from .test_referencia_unidades import entradas, red as red_unidades


def trazado():
    return {'lineas': [{'id': f'L{k}'} for k in range(5)],
            'revision': {'excepciones': [{'unidad': 'U3', 'criterio': 'sin calle intermedia'}]},
            'pasos_agua_observados': [{'id': 'A1', 'original_aproximado': [5, 5], 'nota': 'puente'}],
            'trazos_descartados_como_calles': [{'clave': 'V9', 'nota': 'cauce, no calle'}]}


def referencia():
    r = red_unidades()
    e = entradas(excepciones={'U3': ['sin calle intermedia']})
    e['unidades'][1]['revision_original']['ocupacion'] = 'plaza'
    return r, unidades_de_referencia(red=r, **e)


def limites():
    return {'sectores': [{'sector': 'S9', 'motivo': 'una sola ancla', 'incidencia': 'I9'}]}


def procedencias():
    return {'clases': {'historica_curada': True, 'heuristica_1936': False},
            'pasos': {'vectorizar': [{'entrada': 'cuadras.json', 'clase': 'historica_curada', 'nota': '10 cuadras'},
                                     {'entrada': 'clases.png', 'clase': 'heuristica_1936', 'nota': 'segmentación'}]},
            'referencia': [{'entrada': 'specs/auditoria-1772/unidades-original.json', 'clase': 'historica_curada',
                            'nota': 'censo'}]}


def test_las_excepciones_reunen_trazado_plazas_pasos_de_agua_trazos_descartados_y_limites():
    # Arrange
    r, unidades = referencia()

    # Act
    excepciones = excepciones_1772(trazado(), unidades, limites())

    # Assert
    tipos = {e['tipo']: e for e in excepciones}
    assert tipos['trazado']['unidades'] == ['U3'] and tipos['trazado']['criterio'] == 'sin calle intermedia'
    assert tipos['plaza']['unidades'] == ['U2']
    assert tipos['paso_de_agua']['criterio'] == 'puente'
    assert tipos['trazo_descartado']['criterio'] == 'cauce, no calle'
    assert tipos['limite_del_calce']['sectores'] == ['S9'] and tipos['limite_del_calce']['incidencia'] == 'I9'
    assert len({e['id'] for e in excepciones}) == len(excepciones)


def test_una_excepcion_de_una_unidad_que_no_esta_en_la_referencia_o_sin_criterio_se_rechaza():
    r, unidades = referencia()
    excepciones = excepciones_1772(trazado(), unidades, limites())
    validar_excepciones(excepciones, {u['id'] for u in unidades})
    with pytest.raises(ValueError, match='no está en la referencia'):
        validar_excepciones(excepciones + [{'id': 'EX9', 'tipo': 'trazado', 'unidades': ['U99'], 'criterio': 'x'}],
                            {u['id'] for u in unidades})
    with pytest.raises(ValueError, match='criterio'):
        validar_excepciones([{**excepciones[0], 'criterio': ''}], {u['id'] for u in unidades})


def test_los_validadores_detectan_duplicados_cruces_imposibles_y_geometria_invalida_sin_mutar_la_referencia():
    r, unidades = referencia(); antes = deepcopy((r, unidades))
    detectados = detecta_fallos(r, unidades, {'U1', 'U2', 'U3'})
    assert detectados == {'nodo_duplicado': True, 'tramo_duplicado': True, 'cruce_imposible': True,
                          'unidad_duplicada': True, 'anillo_invalido': True, 'solape': True}
    assert (r, unidades) == antes


def test_las_procedencias_separan_historico_de_heuristico_y_la_referencia_no_lee_heuristicas():
    resumen = validar_procedencias(procedencias())
    assert resumen == {'historicas': ['vectorizar: cuadras.json'], 'heuristicas': ['vectorizar: clases.png']}
    p = procedencias()
    p['referencia'].append({'entrada': 'clases.png', 'clase': 'heuristica_1936', 'nota': 'x'})
    with pytest.raises(ValueError, match='heurística'):
        validar_procedencias(p)
    p = procedencias()
    p['pasos']['vectorizar'][0]['clase'] = 'me_parece'
    with pytest.raises(ValueError, match='clase'):
        validar_procedencias(p)


def test_la_puerta_se_cumple_con_la_referencia_completa_y_queda_pendiente_si_falta_una_unidad_o_una_linea():
    # Arrange
    r, unidades = referencia()
    excepciones = excepciones_1772(trazado(), unidades, limites())
    args = dict(censo={'U1', 'U2', 'U3'}, lineas={'L00', 'L10'}, cruces={'X00', 'X11'},
                excepciones=excepciones, procedencias=procedencias())

    # Act
    puerta = puerta_fase2(r, unidades, **args)

    # Assert
    assert puerta['fase_2_cerrable'] is True
    assert puerta['entidades_con_referencia']['unidades'] == 3
    assert puerta['incertidumbres_explicitas']['pendientes_con_motivo'] == 1
    assert puerta['excepciones_registradas']['por_tipo']['trazado'] == 1
    assert puerta_fase2(r, unidades, **{**args, 'censo': {'U1', 'U2', 'U3', 'U4'}})['fase_2_cerrable'] is False
    assert puerta_fase2(r, unidades, **{**args, 'lineas': {'L00', 'L77'}})['entidades_con_referencia']['cumplido'] is False


def test_la_prueba_de_solape_falla_por_el_solape_y_no_por_otra_regla():
    # la unidad copiada lleva el anillo y la celda de la otra: lo único que queda mal es que se superponen
    from cierre_fase2 import _rechaza
    from referencia_unidades import validar_unidades
    r, unidades = referencia()
    copia = deepcopy(unidades)
    aprobadas = [u for u in copia if u['nodos']]
    aprobadas[1].update(nodos=list(aprobadas[0]['nodos']), celda=aprobadas[0]['celda'])
    with pytest.raises(ValueError, match='solape'):
        validar_unidades({'unidades': copia}, r, {'U1', 'U2', 'U3'})
    assert _rechaza(validar_unidades, {'unidades': copia}, r, {'U1', 'U2', 'U3'})


def test_el_generador_puede_leer_la_referencia_solo_por_el_filtro_de_aprobadas():
    r, unidades = referencia()
    excepciones = excepciones_1772(trazado(), unidades, limites())
    args = dict(censo={'U1', 'U2', 'U3'}, lineas={'L00'}, cruces={'X00'}, excepciones=excepciones)
    p = procedencias()
    p['clases']['referencia_aprobada'] = True
    p['pasos']['vectorizar'].append({'entrada': 'tools/geo/referencias/1772-unidades.json',
                                     'clase': 'referencia_aprobada', 'nota': 'solo aprobadas'})
    assert puerta_fase2(r, unidades, procedencias=p, **args)['ninguna_pendiente_en_el_generador']['cumplido'] is True
    p['pasos']['vectorizar'][-1]['clase'] = 'historica_curada'
    criterio = puerta_fase2(r, unidades, procedencias=p, **args)['ninguna_pendiente_en_el_generador']
    assert criterio['cumplido'] is False and criterio['lee_la_referencia_sin_filtro'] == ['tools/geo/referencias/1772-unidades.json']
