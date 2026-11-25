"""Referencia de 1843 (T81.2b): el censo revisado, proyectado al mosaico de 1936, con validadores."""
import copy
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from referencia_1843 import construir, mascara, validar  # noqa: E402


def _u(i, caja, ocupacion='rayada', lectura='segura'):
    x0, y0, x1, y1 = caja
    return {'id': i, 'sector': 'S1843-11', 'ocupacion': ocupacion, 'lectura': lectura, 'caja_px': caja,
            'poligono_px': [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]}


def _doble(x, y):
    return np.asarray(x, float) * 2, np.asarray(y, float) * 2


def test_construir_aprueba_lo_seguro_y_lo_revisado_y_deja_pendiente_lo_demas():
    censo = {'unidades': [_u('U1', [0, 0, 10, 10]), _u('U2', [20, 0, 30, 10], lectura='dudosa'),
                          _u('U3', [40, 0, 50, 10], lectura='dudosa'), _u('U4', [60, 0, 70, 10], lectura='dudosa')]}
    revisiones = [{'unidad': 'U2', 'decision': 'corregida', 'ocupacion': 'huerta', 'seguridad': 'segura', 'motivo': 'm'},
                  {'unidad': 'U3', 'decision': 'aprobada', 'seguridad': 'sigue_dudosa', 'motivo': 'n'},
                  {'unidad': 'U4', 'decision': 'rechazada', 'seguridad': 'segura', 'motivo': 'rótulo'}]

    ref = construir(censo, revisiones, _doble)

    por_id = {u['id']: u for u in ref['unidades']}
    assert por_id['U1']['estado'] == 'aprobada' and por_id['U1']['poligono'][2] == [20.0, 20.0]
    assert (por_id['U2']['estado'], por_id['U2']['ocupacion'], por_id['U2']['procedencia']) == ('aprobada', 'huerta', 'revision')
    assert por_id['U3']['estado'] == 'pendiente' and 'U4' not in por_id
    assert ref['rechazadas'] == ['U4']


def test_validar_detecta_geometria_invalida_y_manzanas_que_se_pisan():
    unidades = [{'id': 'A', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': [[0, 0], [10, 0], [10, 10], [0, 10]]},
                {'id': 'B', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': [[2, 2], [9, 2], [9, 9], [2, 9]]},
                {'id': 'C', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': [[0, 0], [1, 0]]},
                {'id': 'D', 'ocupacion': 'lote_especial', 'estado': 'aprobada', 'poligono': [[3, 3], [6, 3], [6, 6], [3, 6]]}]
    tipos = sorted((p['tipo'], p['unidad']) for p in validar(unidades))
    assert tipos == [('geometria_invalida', 'C'), ('manzanas_se_pisan', 'A')]


def test_mascara_rellena_lo_edificable_y_vacia_lotes_plazas_y_huertas_sin_mutar():
    unidades = [{'id': 'A', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': [[0, 0], [40, 0], [40, 40], [0, 40]]},
                {'id': 'D', 'ocupacion': 'lote_especial', 'estado': 'aprobada', 'poligono': [[10, 10], [20, 10], [20, 20], [10, 20]]},
                {'id': 'P', 'ocupacion': 'rayada', 'estado': 'pendiente', 'poligono': [[60, 0], [80, 0], [80, 20], [60, 20]]}]
    copia = copy.deepcopy(unidades)
    m = mascara(unidades, forma=(30, 50), escala=2)
    assert m.shape == (30, 50) and m.dtype == bool
    assert m[2, 2] and not m[7, 7] and not m[5, 35]   # manzana sí, lote no, pendiente no
    assert unidades == copia


def test_una_revision_puede_agregar_una_unidad_nueva_aprobada():
    censo = {'unidades': [_u('U1', [0, 0, 10, 10])]}
    revisiones = [{'unidad': None, 'decision': 'nueva', 'ocupacion': 'parte_de_otra_unidad', 'de': 'U1',
                   'poligono_px': [[0, 10], [10, 10], [10, 12], [0, 12]], 'seguridad': 'segura', 'motivo': 'franja'}]
    ref = construir(censo, revisiones, _doble)
    nueva = [u for u in ref['unidades'] if u['id'] == 'U1843-N001'][0]
    assert (nueva['estado'], nueva['procedencia'], nueva['de']) == ('aprobada', 'revision', 'U1')


def test_puerta_fase2_pide_cada_unidad_con_referencia_validadores_limpios_y_pendientes_a_la_vista():
    from referencia_1843 import puerta_fase2
    censo = {'unidades': [{'id': 'U1'}, {'id': 'U2'}, {'id': 'U3'}]}
    ref = {'unidades': [{'id': 'U1', 'estado': 'aprobada'}, {'id': 'U2', 'estado': 'pendiente', 'motivo': 'x'}],
           'rechazadas': ['U3']}
    r = puerta_fase2(censo, ref, problemas=[])
    assert r['fase_2_cerrable'] is True and r['criterios']['pendientes_explicitos']['pendientes'] == ['U2']
    r2 = puerta_fase2({'unidades': censo['unidades'] + [{'id': 'U4'}]}, ref, problemas=[{'tipo': 'geometria_invalida'}])
    assert r2['fase_2_cerrable'] is False
    assert r2['criterios']['unidades_con_referencia']['faltan'] == ['U4']
    assert r2['criterios']['validadores_limpios']['cumplido'] is False


def test_un_edificio_dentro_de_una_huerta_queda_edificado():
    unidades = [{'id': 'H', 'ocupacion': 'huerta', 'estado': 'aprobada', 'poligono': [[0, 0], [60, 0], [60, 60], [0, 60]]},
                {'id': 'R', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': [[20, 20], [40, 20], [40, 40], [20, 40]]}]
    m = mascara(unidades, forma=(30, 30), escala=2)
    assert m[15, 15] and not m[2, 2]


def test_las_letras_de_la_revision_mandan_aunque_las_quite():
    censo = {'unidades': [{**_u('U1', [0, 0, 10, 10], lectura='dudosa'), 'letras': ['c']}]}
    revisiones = [{'unidad': 'U1', 'decision': 'corregida', 'letras': [], 'seguridad': 'segura', 'motivo': 'la c es un puente'}]
    u = construir(censo, revisiones, _doble)['unidades'][0]
    assert u['letras'] == []


def test_un_poligono_que_se_cruza_es_invalido_aunque_se_pueda_reparar():
    moño = [{'id': 'X', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': [[0, 0], [10, 10], [0, 10], [10, 0]]}]
    assert [p['tipo'] for p in validar(moño)] == ['geometria_invalida']
