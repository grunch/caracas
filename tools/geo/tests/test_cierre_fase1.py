"""Cierre de la fase 1: totales derivados de los JSON del inventario, nunca inventados."""
from copy import deepcopy

import pytest

from cierre_fase1 import (
    SUBTAREAS, cobertura_unidades, enlazar_subtareas, indice_evidencias, puerta_de_salida,
    residuos_por_sector, resumen_por_sector,
)


def sectores():
    return [{'id': 'S1', 'bbox_original': [0, 0, 100, 100]}, {'id': 'S2', 'bbox_original': [100, 0, 200, 100]}]


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
    assert puerta['area_recorrida'] == {'cumplido': True, 'sectores': 2}
    assert puerta['unidades_clasificadas_y_leidas'] == {'cumplido': True, 'unidades': 3}
    assert puerta['correspondencia_aprobada_por_unidad'] == {'cumplido': False, 'aprobadas': 0, 'provisionales': 3,
                                                             'trasladado_a': 'T33j.2a'}
    assert puerta['controles_de_calce_por_sector'] == {'cumplido': False, 'sectores_sin_control_independiente': ['S2'],
                                                       'trasladado_a': 'T33j.2a'}
    assert puerta['hallazgos_confirmados_con_subtarea'] == {'cumplido': True, 'sin_subtarea': []}
    assert puerta['fase_1_cerrable'] is False
