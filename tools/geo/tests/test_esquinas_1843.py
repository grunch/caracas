"""Anclas por identidad de 1843: esquina numerada del plano de Jesurún ⇄ esquina con nombre de 1936."""
import copy
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from esquinas_1843 import desvios_m, emparejar, normalizar, resumen_por_sector  # noqa: E402

DIC_1936 = [
    {'nombre': 'La Torre', 'px': [9088.0, 6754.0]},
    {'nombre': 'Principal', 'px': [8883.0, 6709.0]},
    {'nombre': 'San Jacinto', 'px': [9300.0, 6950.0]},
    {'nombre': 'Santa Capilla', 'px': [8700.0, 6500.0]},
    {'nombre': 'Gradillas', 'px': [9100.0, 6900.0]},
    {'nombre': 'Gradillas', 'px': [9500.0, 7300.0]},
]


def _esq(numero, x, y, lectura='segura'):
    return {'numero': numero, 'cruce_px': [x, y], 'lectura': lectura}


def _nom(texto, lectura='segura'):
    return {'nombre': texto, 'lectura': lectura}


def test_normalizar_quita_articulos_tildes_y_desarrolla_abreviaturas():
    assert normalizar('de la Torre') == normalizar('La Torre') == 'torre'
    assert normalizar('del Principal') == 'principal'
    assert normalizar('de Sn. Jacinto') == normalizar('San Jacinto') == 'san jacinto'
    assert normalizar('de Sta Capilla') == 'santa capilla'
    assert normalizar('de las Gradillas') == 'gradillas'


def test_empareja_por_nombre_unico_con_el_cruce_del_original():
    esquinas = [_esq(34, 3204, 2639), _esq(35, 3322, 2639)]
    nombres = {34: _nom('del Principal'), 35: _nom('de la Torre')}

    anclas, omitidas = emparejar(esquinas, nombres, DIC_1936)

    assert omitidas == []
    assert [(a['id'], a['px'], a['py'], a['x36'], a['y36']) for a in anclas] == [
        ('E1843-034', 3204, 2639, 8883.0, 6709.0), ('E1843-035', 3322, 2639, 9088.0, 6754.0)]
    assert anclas[0]['nombre_1936'] == 'Principal'


def test_omite_con_motivo_lo_dudoso_lo_ambiguo_y_lo_que_no_esta_en_1936():
    esquinas = [_esq(1, 10, 10, lectura='dudosa'), _esq(2, 20, 20), _esq(3, 30, 30), _esq(4, 40, 40), _esq(5, 50, 50)]
    nombres = {1: _nom('de la Torre'), 2: _nom('de las Gradillas'), 3: _nom('del Pedrito'),
               4: _nom('San Jacinto', lectura='dudosa')}

    anclas, omitidas = emparejar(esquinas, nombres, DIC_1936)

    assert anclas == []
    assert {o['numero']: o['motivo'] for o in omitidas} == {
        1: 'cruce_dudoso', 2: 'ambigua_en_1936', 3: 'sin_pareja_1936', 4: 'nombre_dudoso', 5: 'sin_nombre'}


def test_un_numero_leido_dos_veces_en_lugares_distintos_no_ancla():
    esquinas = [_esq(34, 3204, 2639), _esq(34, 3900, 2000)]
    anclas, omitidas = emparejar(esquinas, {34: _nom('del Principal')}, DIC_1936)
    assert anclas == []
    assert [o['motivo'] for o in omitidas] == ['numero_repetido']


def test_la_misma_lectura_en_el_solape_de_dos_cuadrantes_cuenta_una_vez():
    esquinas = [_esq(34, 3204, 2639), _esq(34, 3206, 2641)]
    anclas, omitidas = emparejar(esquinas, {34: _nom('del Principal')}, DIC_1936)
    assert [a['id'] for a in anclas] == ['E1843-034'] and omitidas == []


def test_no_muta_las_entradas():
    esquinas, nombres = [_esq(34, 3204, 2639)], {34: _nom('del Principal')}
    copias = copy.deepcopy((esquinas, nombres, DIC_1936))
    emparejar(esquinas, nombres, DIC_1936)
    assert (esquinas, nombres, DIC_1936) == copias


def test_desvio_del_calce_en_metros():
    anclas = [{'px': 0, 'py': 0, 'x36': 10.0, 'y36': 0.0}, {'px': 5, 'py': 5, 'x36': 5.0, 'y36': 9.0}]

    def proyectar(x, y):
        return np.asarray(x, float), np.asarray(y, float)

    assert desvios_m(anclas, proyectar, metro=0.5) == pytest.approx([5.0, 2.0])


def test_resumen_por_sector_con_la_regla_de_dos_anclas():
    anclas = [{'sector': 'S1843-A'}, {'sector': 'S1843-A'}, {'sector': 'S1843-B'}]
    filas = resumen_por_sector(anclas, loo_m=[10.0, 14.0, 3.0], desvio_m=[1.0, 2.0, 50.0])
    a, b = filas
    assert (a['sector'], a['anclas'], a['mediana_loo_m'], a['controlado']) == ('S1843-A', 2, 12.0, True)
    assert a['bajo_umbral'] is True
    assert (b['anclas'], b['controlado'], b['mediana_desvio_m']) == (1, False, 50.0)
