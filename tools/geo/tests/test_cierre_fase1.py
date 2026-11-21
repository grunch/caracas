"""Cierre de la fase 1: totales derivados de los JSON del inventario, nunca inventados."""
from copy import deepcopy

import pytest

from cierre_fase1 import (
    controles_fuera_del_calce, fuera_del_ajuste,
    SUBTAREAS, cobertura_unidades, enlazar_subtareas, indice_evidencias, leer_verificacion, puerta_de_salida,
    residuos_por_sector, resumen_por_sector,
)


def sector(ident, bbox, unidades, barrido='realizado_2026-11-20'):
    return {'id': ident, 'bbox_original': bbox, 'barrido_general': barrido, 'clasificacion_original': {'unidades': unidades}}


def sectores():
    return [sector('S1', [0, 0, 100, 100], 2), sector('S2', [100, 0, 200, 100], 1)]


SHA_CIUDAD = 'a' * 64
SHA_X1, SHA_U1 = 'c' * 64, 'd' * 64


def damero_vigente():
    return {'por_sector': [], 'controles_por_hito': [], 'evidencias': [{'archivo_local': 'controles/S1-X1.png', 'sha256': SHA_X1}]}


def accesos(estados):
    """F1 y F3 con candidato de entrada profunda, F2 sin candidatos; `estados`: {frente: estado del recorrido de calle}."""
    return {'frentes': [{'frente': 'F1', 'candidatos_entrada_profunda': [{'avance_normal_m': 20}]},
                        {'frente': 'F2', 'candidatos_entrada_profunda': []},
                        {'frente': 'F3', 'candidatos_entrada_profunda': [{'avance_normal_m': 30}]}],
            'recorridos_calle': [{'frente': f, 'estado': e, 'nota': 'test'} for f, e in estados.items()]}


def correspondencias_verificadas():
    return {'entrada_sha256': SHA_CIUDAD, 'resumen': {'clases': {'uno_a_uno': 1, 'ausente': 1, 'vacio_coincide': 1}},
            'unidades': [{'unidad': 'U0001', 'clase': 'uno_a_uno'}, {'unidad': 'U0002', 'clase': 'vacio_coincide'},
                         {'unidad': 'U0003', 'clase': 'ausente'}],
            'evidencias': [{'archivo_local': 'correspondencias/uno_a_uno-U0001.png', 'sha256': SHA_U1, 'unidad': 'U0001'}],
            'verificacion_visual': [
                {'grupo': 'controles', 'archivo': 'S1-X1.png', 'sha256': SHA_X1, 'objeto': 'X1', 'juicio': 'compatible'},
                {'grupo': 'correspondencias', 'archivo': 'uno_a_uno-U0001.png', 'sha256': SHA_U1, 'objeto': 'U0001',
                 'clase': 'uno_a_uno', 'entrada_sha256': SHA_CIUDAD, 'juicio': 'coincide'},
            ]}


def unidades():
    return [
        {'id_fuente': 'U0001', 'sector': 'S1', 'revision_original': {'ocupacion': 'continua'}},
        {'id_fuente': 'U0002', 'sector': 'S1', 'revision_original': {'ocupacion': 'terreno_libre'}},
        {'id_fuente': 'U0003', 'sector': 'S2', 'revision_original': {'ocupacion': 'parcial'}},
    ]


def lecturas():
    return {
        'bordes': [{'unidad': 'U0001', 'frentes': [{'id': 'F1', 'lectura': 'rojo_continuo_en_borde'}]}],
        'sin_cara': [{'unidad': 'U0003', 'decision': 'requiere_referencia'}],
        'restantes': [{'unidad': 'U0002', 'decision': 'conservar'}],
    }


def contraste():
    return [
        {'unidad': 'U0001', 'techos_intersectan_caja': [1, 2]},
        {'unidad': 'U0002', 'techos_intersectan_caja': []},
        {'unidad': 'U0003', 'techos_intersectan_caja': []},
    ]


def test_cobertura_cruza_lecturas_y_candidatos_sin_mutar_entradas():
    u, l, c = unidades(), lecturas(), contraste()
    antes = deepcopy((u, l, c))
    filas = cobertura_unidades(u, l, c)
    assert [f['unidad'] for f in filas] == ['U0001', 'U0002', 'U0003']
    assert filas[0] == {'unidad': 'U0001', 'sector': 'S1', 'ocupacion': 'continua', 'lectura': 'bordes',
                        'correspondencia': 'candidato_bajo_TPS_no_aprobado'}
    assert filas[1]['correspondencia'] == 'sin_edificacion_esperada'
    assert filas[2]['correspondencia'] == 'sin_candidato_bajo_TPS'
    assert (u, l, c) == antes


def test_cobertura_rechaza_unidad_sin_leer_o_leida_dos_veces():
    l = lecturas(); l['restantes'] = []
    with pytest.raises(ValueError, match='U0002 sin lectura'):
        cobertura_unidades(unidades(), l, contraste())
    l = lecturas(); l['restantes'].append({'unidad': 'U0001', 'decision': 'x'})
    with pytest.raises(ValueError, match='U0001 leída dos veces'):
        cobertura_unidades(unidades(), l, contraste())


def test_resumen_por_sector_cuenta_ocupacion_lectura_y_candidatos():
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    resumen = resumen_por_sector(filas, sectores())
    assert [r['sector'] for r in resumen] == ['S1', 'S2']
    assert resumen[0] == {'sector': 'S1', 'unidades': 2, 'leidas': 2,
                          'ocupacion': {'continua': 1, 'terreno_libre': 1},
                          'correspondencia': {'candidato_bajo_TPS_no_aprobado': 1, 'sin_edificacion_esperada': 1}}
    assert resumen[1]['unidades'] == 1


def test_resumen_por_sector_rechaza_sector_desconocido():
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    filas[0] = {**filas[0], 'sector': 'S9'}
    with pytest.raises(ValueError, match='S9'):
        resumen_por_sector(filas, sectores())


def test_residuos_por_sector_separan_gcp_del_ajuste_de_controles_independientes():
    gcps = [{'px': 10, 'py': 10, 'manual': True, 'loo_m': 3.0}, {'px': 20, 'py': 20, 'loo_m': 4.0},
            {'px': 150, 'py': 50, 'loo_m': 12.0}, {'px': 500, 'py': 500, 'loo_m': 1.0}]
    nodos = [{'id': 'N1', 'original': [30, 30], 'desvio_m': 9.0}]
    filas = residuos_por_sector(gcps, nodos, sectores())
    assert filas[0] == {'sector': 'S1', 'gcp_ajuste': 2, 'gcp_manuales': 1, 'loo_rms_m': 3.536, 'loo_max_m': 4.0,
                        'controles_independientes': 1, 'desvio_independiente_max_m': 9.0}
    assert filas[1]['controles_independientes'] == 0 and filas[1]['desvio_independiente_max_m'] is None
    assert filas[1]['loo_rms_m'] == 12.0


def test_subtareas_cubren_toda_incidencia_confirmada_y_conservan_las_inciertas():
    incidencias = [{'id': 'I1772-001', 'estado': 'confirmado_visual'},
                   {'id': 'I1772-004', 'estado': 'incierto'},
                   {'id': 'I1772-099', 'estado': 'confirmado'}]
    enlazadas = enlazar_subtareas(incidencias)
    assert enlazadas[0]['subtareas'] == ['T33j.3a', 'T33j.5a', 'T33j.7a']
    assert enlazadas[1]['subtareas'] == ['T33j.4b']
    assert enlazadas[2]['subtareas'] == [] and enlazadas[2]['sin_subtarea'] is True
    assert incidencias[0] == {'id': 'I1772-001', 'estado': 'confirmado_visual'}
    assert all(i.startswith('I1772-') for ids in SUBTAREAS.values() for i in ids)


def test_indice_evidencias_reune_capturas_con_hash_y_rechaza_hashes_invalidos():
    docs = {'a.json': {'capturas': [{'archivo': 'x.png', 'sha256': 'a' * 64}],
                       'evidencias': [{'sector': 'S1', 'archivo_local': 'y.png', 'sha256': 'b' * 64}],
                       'sectores': [{'id': 'S1', 'captura': 'S1.png', 'sha256_captura': 'c' * 64}]},
            'b.json': {'capturas': {'x.png': 'a' * 64}, 'vista': {'archivo_local': 'v.png', 'sha256': 'd' * 64}},
            'c.json': {'unidades': [{'sha256_recorte_ampliado': 'e' * 64}]}}  # recorte del original, no captura
    indice = indice_evidencias(docs)
    assert indice == [{'archivo': 'x.png', 'sha256': 'a' * 64, 'documentos': ['a.json', 'b.json']},
                      {'archivo': 'y.png', 'sha256': 'b' * 64, 'documentos': ['a.json']},
                      {'archivo': 'S1.png', 'sha256': 'c' * 64, 'documentos': ['a.json']},
                      {'archivo': 'v.png', 'sha256': 'd' * 64, 'documentos': ['b.json']}]
    with pytest.raises(ValueError, match='z.png'):
        indice_evidencias({'c.json': {'capturas': [{'archivo': 'z.png', 'sha256': 'corto'}]}})


def test_puerta_de_salida_no_declara_cumplido_lo_que_sigue_pendiente():
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    residuos = residuos_por_sector([], [{'id': 'N1', 'original': [30, 30], 'desvio_m': 9.0}], sectores())
    enlazadas = enlazar_subtareas([{'id': 'I1772-001', 'estado': 'confirmado_visual'}])
    puerta = puerta_de_salida(filas, sectores(), residuos, enlazadas)
    assert puerta['area_recorrida'] == {'cumplido': True, 'sectores': 2, 'sectores_pendientes': []}
    assert puerta['unidades_clasificadas_y_leidas'] == {'cumplido': True, 'unidades': 3}
    assert puerta['correspondencia_clasificada_por_unidad'] == {'cumplido': False, 'clasificadas': 0, 'provisionales': 3,
                                                                'trasladado_a': 'T33j.2a'}
    assert puerta['controles_de_calce_por_sector'] == {'cumplido': False, 'sectores_sin_control_independiente': ['S2'],
                                                       'sectores_sin_loo_bajo_umbral': ['S1', 'S2'],
                                                       'sectores_sin_unidades': [], 'trasladado_a': 'T33j.2a'}
    assert puerta['hallazgos_confirmados_con_subtarea'] == {'cumplido': True, 'sin_subtarea': []}
    assert puerta['accesos_recorridos_a_pie'] == {'cumplido': False, 'sin_registro_de_accesos': True}
    assert puerta['fase_1_cerrable'] is False


def test_puerta_de_salida_se_cumple_con_controles_de_damero_y_correspondencias_verificadas():
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    tres = sectores() + [sector('S3', [0, 100, 100, 200], 0)]
    residuos = residuos_por_sector([], [], tres)
    enlazadas = enlazar_subtareas([{'id': 'I1772-001', 'estado': 'confirmado_visual'}])
    damero = {**damero_vigente(), 'por_sector': [{'sector': 'S1', 'controles': 4, 'mediana_m': 12.0}, {'sector': 'S2', 'controles': 0, 'mediana_m': None}],
              'controles_por_hito': [{'sector': 'S2'}]}
    correspondencias = correspondencias_verificadas()
    recorridos = accesos({'F1': 'recorrido', 'F3': 'recorrido'})
    loo = [{'sector': 'S1', 'anclas': 3, 'bajo_umbral': True}, {'sector': 'S2', 'anclas': 2, 'bajo_umbral': True}]
    puerta = puerta_de_salida(filas, tres, residuos, enlazadas, damero, correspondencias, recorridos, loo)
    assert puerta['area_recorrida'] == {'cumplido': True, 'sectores': 3, 'sectores_pendientes': []}
    assert puerta['controles_de_calce_por_sector'] == {'cumplido': True, 'sectores_sin_control_independiente': [],
                                                       'sectores_sin_loo_bajo_umbral': [], 'sectores_sin_unidades': ['S3']}
    assert puerta['correspondencia_clasificada_por_unidad'] == {
        'cumplido': True, 'clasificadas': 3, 'muestra_visual': 1, 'muestra_desfasada': 0, 'contradicciones': 0,
        'clases': {'uno_a_uno': 1, 'ausente': 1, 'vacio_coincide': 1}}
    assert puerta['accesos_recorridos_a_pie'] == {'cumplido': True, 'frentes_con_candidatos': 2, 'recorridos': 2, 'pendientes': []}
    assert puerta['fase_1_cerrable'] is True
    correspondencias['verificacion_visual'][0] = {**correspondencias['verificacion_visual'][0], 'juicio': 'contradice'}
    assert puerta_de_salida(filas, tres, residuos, enlazadas, damero, correspondencias, recorridos, loo)['fase_1_cerrable'] is False


def _criterio(correspondencias):
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    puerta = puerta_de_salida(filas, sectores(), residuos_por_sector([], [], sectores()), [], damero_vigente(), correspondencias)
    return puerta['correspondencia_clasificada_por_unidad']


def test_correspondencia_exige_juicios_de_correspondencia_no_solo_de_controles():
    c = correspondencias_verificadas()
    c['verificacion_visual'] = [r for r in c['verificacion_visual'] if r['grupo'] == 'controles']
    criterio = _criterio(c)
    assert criterio['cumplido'] is False and criterio['muestra_visual'] == 0


@pytest.mark.parametrize('cambio', [
    {'clase': 'ausente'},                 # la unidad se reclasificó después del juicio
    {'entrada_sha256': 'b' * 64},         # el juicio es de otra ciudad
    {'objeto': 'U9999'},                  # la unidad ya no está
])
def test_correspondencia_no_cuenta_juicios_de_otra_clasificacion(cambio):
    c = correspondencias_verificadas()
    c['verificacion_visual'][1] = {**c['verificacion_visual'][1], **cambio}
    criterio = _criterio(c)
    assert criterio['cumplido'] is False
    assert criterio['muestra_visual'] == 0 and criterio['muestra_desfasada'] == 1


def test_correspondencia_rechaza_juicios_fuera_del_metodo():
    c = correspondencias_verificadas()
    c['verificacion_visual'][1]['juicio'] = 'coincide_con_clase_conservadora'
    with pytest.raises(ValueError, match='coincide_con_clase_conservadora'):
        _criterio(c)


@pytest.mark.parametrize('ajuste, pendiente', [
    (lambda s: s[0].update(barrido_general=None), 'S1'),                       # sin barrido registrado
    (lambda s: s[1]['clasificacion_original'].update(unidades=4), 'S2'),       # faltan unidades por leer
])
def test_area_recorrida_sale_de_la_cobertura_de_cada_sector(ajuste, pendiente):
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    s = sectores()
    ajuste(s)
    puerta = puerta_de_salida(filas, s, residuos_por_sector([], [], s), [])
    assert puerta['area_recorrida'] == {'cumplido': False, 'sectores': 2, 'sectores_pendientes': [pendiente]}


def test_resumen_de_la_verificacion_sale_de_las_filas():
    filas = [{'juicio': 'coincide'}, {'juicio': 'compatible'}, {'juicio': 'contradice'}]
    bien = {'recortes': filas, 'resumen': {'revisados': 3, 'coincide': 1, 'compatible': 1, 'contradice': 1}}
    assert leer_verificacion(bien) == filas
    with pytest.raises(ValueError, match='resumen'):
        leer_verificacion({'recortes': filas, 'resumen': {'revisados': 3, 'coincide': 2, 'compatible': 1, 'contradice': 0}})


@pytest.mark.parametrize('indice, cambio', [
    (1, {'sha256': 'e' * 64}),     # el recorte de la unidad se regeneró con otra geometría
    (0, {'sha256': 'e' * 64}),     # el recorte del control cambió: tampoco vale su juicio viejo
    (1, {'archivo': 'otro.png'}),  # el recorte juzgado ya no está entre las evidencias
])
def test_juicios_de_un_recorte_que_cambio_quedan_desfasados_y_la_correspondencia_no_se_cumple(indice, cambio):
    c = correspondencias_verificadas()
    c['verificacion_visual'][indice] = {**c['verificacion_visual'][indice], **cambio}
    criterio = _criterio(c)
    assert criterio['cumplido'] is False and criterio['muestra_desfasada'] == 1


def test_contradiccion_de_un_recorte_obsoleto_no_cuenta_pero_exige_rejuzgar():
    c = correspondencias_verificadas()
    c['verificacion_visual'][0] = {**c['verificacion_visual'][0], 'juicio': 'contradice', 'sha256': 'e' * 64}
    criterio = _criterio(c)
    assert criterio['contradicciones'] == 0 and criterio['muestra_desfasada'] == 1 and criterio['cumplido'] is False


@pytest.mark.parametrize('estados, pendientes', [
    ({'F1': 'recorrido'}, ['F3']),                          # F3 sin recorrido de calle
    ({'F1': 'recorrido', 'F3': 'pendiente'}, ['F3']),       # recorrido sin conclusión (p. ej. pared y colisión discordantes)
    ({'F1': 'pendiente', 'F3': 'pendiente'}, ['F1', 'F3']),
])
def test_accesos_quedan_pendientes_hasta_recorrer_cada_candidato_a_nivel_de_calle(estados, pendientes):
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    puerta = puerta_de_salida(filas, sectores(), residuos_por_sector([], [], sectores()), [], damero_vigente(),
                              correspondencias_verificadas(), accesos(estados))
    assert puerta['accesos_recorridos_a_pie'] == {'cumplido': False, 'frentes_con_candidatos': 2,
                                                  'recorridos': 2 - len(pendientes), 'pendientes': pendientes}
    assert puerta['fase_1_cerrable'] is False


def test_accesos_rechaza_estados_fuera_del_registro():
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    with pytest.raises(ValueError, match='casi'):
        puerta_de_salida(filas, sectores(), [], [], None, None, accesos({'F1': 'casi'}))


def test_correspondencia_no_acepta_juicios_sin_hash_de_entrada():
    # sin entrada_sha256 en la clasificación ni en el juicio, None == None no debe hacerlo vigente
    c = correspondencias_verificadas()
    del c['entrada_sha256']
    del c['verificacion_visual'][1]['entrada_sha256']
    criterio = _criterio(c)
    assert criterio['cumplido'] is False and criterio['muestra_visual'] == 0


def test_correspondencia_exige_que_el_recorte_sea_de_la_unidad_juzgada():
    # mismo archivo y SHA, pero el juicio apunta a otra unidad: el recorte no es de ella
    c = correspondencias_verificadas()
    c['unidades'].append({'unidad': 'U0004', 'clase': 'uno_a_uno'})
    c['verificacion_visual'][1] = {**c['verificacion_visual'][1], 'objeto': 'U0004'}
    assert _criterio(c)['muestra_visual'] == 0
    sin_unidad = correspondencias_verificadas()
    sin_unidad['evidencias'] = [{k: v for k, v in e.items() if k != 'unidad'} for e in sin_unidad['evidencias']]
    assert _criterio(sin_unidad)['muestra_visual'] == 0


def damero_con_nodos():
    return {**damero_vigente(),
            'nodos': [{'id': 'X1', 'sector': 'S1', 'desvio_m': 10.0}, {'id': 'X2', 'sector': 'S1', 'desvio_m': 30.0},
                      {'id': 'X3', 'sector': 'S1', 'desvio_m': 50.0}, {'id': 'X4', 'sector': 'S2', 'desvio_m': 7.0}],
            'por_sector': [{'sector': 'S1', 'controles': 3, 'mediana_m': 30.0}, {'sector': 'S2', 'controles': 1, 'mediana_m': 7.0}],
            'controles_por_hito': [{'id': 'H-plaza', 'sector': 'S1'}, {'id': 'H-pastora', 'sector': 'S2'}]}


def test_un_cruce_de_damero_que_es_ancla_del_calce_vigente_deja_de_contar_como_control():
    # Arrange
    damero = damero_con_nodos()
    original = deepcopy(damero)

    # Act
    filtrado = controles_fuera_del_calce(damero, anclas={'X1', 'X4', 'H-pastora'})

    # Assert
    assert filtrado['por_sector'] == [{'sector': 'S1', 'controles': 2, 'mediana_m': 40.0, 'anclas': 1, 'descartados': 0},
                                      {'sector': 'S2', 'controles': 0, 'mediana_m': None, 'anclas': 1, 'descartados': 0}]
    assert filtrado['controles_por_hito'] == [{'id': 'H-plaza', 'sector': 'S1'}]
    assert filtrado['evidencias'] == damero['evidencias']
    assert damero == original


def test_con_todos_los_cruces_como_anclas_el_criterio_de_controles_por_sector_queda_pendiente():
    # Arrange
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    residuos = residuos_por_sector([], [], sectores())
    todas = {'X1', 'X2', 'X3', 'X4', 'H-plaza', 'H-pastora'}

    # Act
    puerta = puerta_de_salida(filas, sectores(), residuos, [], controles_fuera_del_calce(damero_con_nodos(), todas))

    # Assert
    assert puerta['controles_de_calce_por_sector']['sectores_sin_control_independiente'] == ['S1', 'S2']
    assert puerta['controles_de_calce_por_sector']['cumplido'] is False


def test_sin_anclas_los_controles_de_damero_se_conservan():
    filtrado = controles_fuera_del_calce(damero_con_nodos(), anclas=set())
    assert [(s['sector'], s['controles'], s['mediana_m'], s['anclas']) for s in filtrado['por_sector']] == [('S1', 3, 30.0, 0), ('S2', 1, 7.0, 0)]
    assert len(filtrado['controles_por_hito']) == 2


def test_un_control_a_menos_de_6_px_de_un_punto_del_ajuste_no_es_independiente():
    # Arrange: N1 cae sobre un GCP (a 3 px), N2 lejos de todos
    nodos = [{'id': 'N1', 'original': [103, 100]}, {'id': 'N2', 'original': [200, 300]}]

    # Act
    libres = fuera_del_ajuste(nodos, [(100, 100), (500, 500)])

    # Assert
    assert [n['id'] for n in libres] == ['N2']


def test_los_cruces_de_damero_sobre_una_semilla_se_quitan_por_coordenadas_sin_el_informe_de_identidad():
    damero = {**damero_con_nodos(), 'nodos': [{**n, 'original': [10.0 * i, 0.0]} for i, n in enumerate(damero_con_nodos()['nodos'])]}
    filtrado = controles_fuera_del_calce(damero, anclas=set(), ajuste_px=[(20.0, 2.0)])  # X3 está a 2 px de una semilla
    assert [(s['sector'], s['controles'], s['anclas']) for s in filtrado['por_sector']] == [('S1', 2, 1), ('S2', 1, 0)]


def test_un_nodo_curado_con_desvio_de_otro_calce_no_cuenta_como_control():
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    residuos = [{**r, 'desvio_independiente_vigente': False if r['controles_independientes'] else None}
                for r in residuos_por_sector([], [{'id': 'N1', 'original': [30, 30], 'desvio_m': 9.0}], sectores())]
    loo = [{'sector': 'S1', 'bajo_umbral': True}, {'sector': 'S2', 'bajo_umbral': True}]
    puerta = puerta_de_salida(filas, sectores(), residuos, [], None, None, None, loo)
    assert puerta['controles_de_calce_por_sector']['sectores_sin_control_independiente'] == ['S1', 'S2']


def test_un_sector_con_loo_sobre_el_umbral_deja_el_criterio_pendiente_aunque_tenga_controles():
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    residuos = residuos_por_sector([], [{'id': 'N1', 'original': [30, 30], 'desvio_m': 9.0},
                                        {'id': 'N2', 'original': [130, 30], 'desvio_m': 9.0}], sectores())
    loo = [{'sector': 'S1', 'anclas': 3, 'bajo_umbral': True}, {'sector': 'S2', 'anclas': 3, 'bajo_umbral': False}]
    criterio = puerta_de_salida(filas, sectores(), residuos, [], None, None, None, loo)['controles_de_calce_por_sector']
    assert criterio['sectores_sin_control_independiente'] == []
    assert criterio['sectores_sin_loo_bajo_umbral'] == ['S2']
    assert criterio['cumplido'] is False


def test_un_cruce_descartado_por_rotulo_no_es_control_ni_cuenta_como_ancla():
    # Arrange
    damero = damero_con_nodos()

    # Act
    filtrado = controles_fuera_del_calce(damero, anclas={'X1'}, descartados={'X2'})

    # Assert
    assert filtrado['por_sector'][0] == {'sector': 'S1', 'controles': 1, 'mediana_m': 50.0, 'anclas': 1, 'descartados': 1}
    assert filtrado['por_sector'][1] == {'sector': 'S2', 'controles': 1, 'mediana_m': 7.0, 'anclas': 0, 'descartados': 0}


def test_el_loo_de_un_sector_con_dos_anclas_o_mas_cuenta_como_control_independiente():
    # decisión del responsable (21-11-2026): cada ancla medida con un calce que no la usa es un control
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    loo = [{'sector': 'S1', 'anclas': 2, 'bajo_umbral': True}, {'sector': 'S2', 'anclas': 5, 'bajo_umbral': True}]
    criterio = puerta_de_salida(filas, sectores(), residuos_por_sector([], [], sectores()), [], None, None, None, loo)[
        'controles_de_calce_por_sector']
    assert criterio == {'cumplido': True, 'sectores_sin_control_independiente': [], 'sectores_sin_loo_bajo_umbral': [],
                        'sectores_sin_unidades': []}


def test_un_sector_con_una_sola_ancla_no_tiene_loo_que_lo_controle():
    filas = cobertura_unidades(unidades(), lecturas(), contraste())
    loo = [{'sector': 'S1', 'anclas': 2, 'bajo_umbral': True}, {'sector': 'S2', 'anclas': 1, 'bajo_umbral': True}]
    criterio = puerta_de_salida(filas, sectores(), residuos_por_sector([], [], sectores()), [], None, None, None, loo)[
        'controles_de_calce_por_sector']
    assert criterio['sectores_sin_control_independiente'] == ['S2']
    assert criterio['sectores_sin_loo_bajo_umbral'] == ['S2']
    assert criterio['cumplido'] is False
