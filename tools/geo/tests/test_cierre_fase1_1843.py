"""Puerta de salida de la fase 1 de 1843 (1D), calculada desde los JSON de specs/auditoria-1843."""
import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cierre_fase1_1843 import puerta  # noqa: E402


def _docs():
    sectores = {'sectores': [{'id': 'S1843-11'}, {'id': 'S1843-12'}, {'id': 'S1843-13'}]}
    censo = {'lecturas': [{'sector': s['id']} for s in sectores['sectores']], 'problemas': [],
             'unidades': [{'id': 'U1', 'sector': 'S1843-11', 'ocupacion': 'rayada', 'lectura': 'segura'},
                          {'id': 'U2', 'sector': 'S1843-12', 'ocupacion': 'rayada', 'lectura': 'dudosa'},
                          {'id': 'U3', 'sector': 'S1843-13', 'ocupacion': 'huerta', 'lectura': 'segura'}]}
    contraste = {'unidades': [{'id': 'U1', 'estado': 'con_casas'}, {'id': 'U2', 'estado': 'sin_casas'},
                              {'id': 'U3', 'estado': 'sin_casas'}]}
    calce = {'sectores': [{'sector': 'S1843-11', 'controlado': True, 'bajo_umbral': True}]}
    limites = {'limites': [], 'sin_anclas': {'sectores': ['S1843-12', 'S1843-13']}}
    incidencias = {'incidencias': [{'id': 'I1843-001', 'resolucion': 'T81.2a: …'}]}
    return sectores, censo, contraste, calce, limites, incidencias


def test_todo_cumplido_da_cerrable_y_muestra_las_dudosas():
    r = puerta(*_docs())
    assert r['fase_1_cerrable'] is True
    assert all(c['cumplido'] for c in r['criterios'].values())
    assert r['criterios']['unidades_clasificadas']['dudosas'] == ['U2']


def test_cada_criterio_falla_por_su_causa():
    sectores, censo, contraste, calce, limites, incidencias = _docs()
    censo2 = {**censo, 'lecturas': censo['lecturas'][:2]}
    assert puerta(sectores, censo2, contraste, calce, limites, incidencias)['criterios']['area_recorrida']['cumplido'] is False
    contraste2 = {'unidades': contraste['unidades'][:2]}
    assert puerta(sectores, censo, contraste2, calce, limites, incidencias)['criterios']['correspondencia_por_unidad']['faltan'] == ['U3']
    limites2 = {'limites': [], 'sin_anclas': {'sectores': ['S1843-13']}}
    r = puerta(sectores, censo, contraste, calce, limites2, incidencias)
    assert r['criterios']['controles_de_calce']['sin_control'] == ['S1843-12'] and r['fase_1_cerrable'] is False
    inc2 = {'incidencias': [{'id': 'I1843-009', 'resolucion': 'pendiente'}]}
    assert puerta(sectores, censo, contraste, calce, limites, inc2)['criterios']['incidencias_con_subtarea']['sin_subtarea'] == ['I1843-009']
    censo3 = {**censo, 'problemas': [{'tipo': 'duplicada'}]}
    assert puerta(sectores, censo3, contraste, calce, limites, incidencias)['criterios']['censo_sin_problemas']['cumplido'] is False


def test_un_sector_sin_unidades_no_pide_control_y_no_muta():
    docs = _docs()
    copia = copy.deepcopy(docs)
    sectores, censo, contraste, calce, limites, incidencias = docs
    censo2 = {**censo, 'unidades': censo['unidades'][:1]}
    contraste2 = {'unidades': contraste['unidades'][:1]}
    r = puerta(sectores, censo2, contraste2, calce, {'limites': [], 'sin_anclas': {'sectores': []}}, incidencias)
    assert r['criterios']['controles_de_calce']['cumplido'] is True
    assert docs == copia
