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


def _rejilla(n=4, paso=100.0, desplazar=0.0):
    return [{'id': f'E1843-{i * n + j:03d}', 'px': j * paso, 'py': i * paso,
             'x36': j * paso + desplazar, 'y36': i * paso} for i in range(n) for j in range(n)]


SECTORES = [{'id': 'S1843-11', 'caja_px': [-50, -50, 150, 400]}, {'id': 'S1843-12', 'caja_px': [150, -50, 400, 400]}]


def test_sector_de_por_la_caja_y_fuera_de_todas():
    from esquinas_1843 import sector_de
    assert sector_de(0, 0, SECTORES) == 'S1843-11'
    assert sector_de(300, 10, SECTORES) == 'S1843-12'
    assert sector_de(900, 900, SECTORES) is None


def test_medir_un_calce_vigente_corrido_contra_anclas_exactas():
    from esquinas_1843 import medir
    anclas = _rejilla()
    vigente = [{'px': a['px'], 'py': a['py'], 'x36': a['x36'] + 30.0, 'y36': a['y36']} for a in anclas]

    informe = medir(anclas, vigente, SECTORES, metro=0.5)

    assert informe['anclas'] == 16
    assert {f['sector'] for f in informe['sectores']} == {'S1843-11', 'S1843-12'}
    assert all(f['mediana_desvio_m'] == pytest.approx(15.0) for f in informe['sectores'])
    assert all(f['mediana_loo_m'] < 1e-6 for f in informe['sectores'])
    assert informe['calce_medido']['mediana_desvio_m'] == pytest.approx(15.0)
    assert [a['sector'] for a in informe['detalle']][:2] == ['S1843-11', 'S1843-11']


def test_config_por_identidad_sin_correlacion_ni_anclas_sobre_las_semillas():
    from esquinas_1843 import config_por_identidad
    config = {'carpeta': 'x', 'semillas': [{'px': 100, 'py': 100, 'i': 0, 'j': 0, 'nota': 'plaza'}],
              'etapas': [{'paso': 1}], 'gcps': [{'px': 1}], 'anclas': [{'px': 9}]}
    anclas = [{'id': 'E1843-034', 'px': 103, 'py': 101, 'x36': 1.0, 'y36': 2.0, 'nombre_1843': 'del Principal', 'nombre_1936': 'Principal'},
              {'id': 'E1843-035', 'px': 300, 'py': 100, 'x36': 3.0, 'y36': 4.0, 'nombre_1843': 'de la Torre', 'nombre_1936': 'La Torre'}]

    nuevo, junto_a_semilla = config_por_identidad(config, anclas)

    assert nuevo['etapas'] == [] and nuevo['semillas'] == config['semillas']
    assert [a['id'] for a in nuevo['anclas']] == ['E1843-035']
    assert nuevo['anclas'][0] == {'px': 300, 'py': 100, 'x36': 3.0, 'y36': 4.0, 'id': 'E1843-035',
                                  'nota': 'esquina 35 «de la Torre» del plano de 1843 = «La Torre» de 1936'}
    assert junto_a_semilla == ['E1843-034']
    assert config['etapas'] == [{'paso': 1}] and config['anclas'] == [{'px': 9}]


def test_las_esquinas_de_1936_sin_nombre_no_cuentan():
    dic = DIC_1936 + [{'nombre': None, 'px': [1.0, 1.0]}]
    anclas, _ = emparejar([_esq(34, 3204, 2639)], {34: _nom('del Principal')}, dic)
    assert [a['id'] for a in anclas] == ['E1843-034']


def test_depurar_quita_una_por_una_las_anclas_que_contradicen_a_sus_vecinas():
    from esquinas_1843 import depurar_por_consistencia
    anclas = _rejilla(n=5)
    anclas[7] = {**anclas[7], 'x36': anclas[7]['x36'] + 2000.0}   # un homónimo de 1936 en otro barrio
    anclas[18] = {**anclas[18], 'y36': anclas[18]['y36'] - 600.0}

    quedan, fuera = depurar_por_consistencia(anclas, metro=0.5, umbral_m=55)

    assert sorted(f['id'] for f in fuera) == sorted([anclas[7]['id'], anclas[18]['id']])
    assert all(f['loo_m'] > 55 and f['motivo'] == 'contradice_a_sus_vecinas' for f in fuera)
    assert len(quedan) == 23 and anclas[7]['x36'] == 2200.0   # sin mutar la entrada (200 + 2000)


def test_medir_sin_anclas_no_falla_y_lo_dice():
    from esquinas_1843 import medir
    informe = medir([], [{'px': 0, 'py': 0, 'x36': 0, 'y36': 0}], SECTORES, metro=0.5)
    assert informe['anclas'] == 0 and informe['sin_medicion']


def test_el_loo_es_el_del_calce_desplegado_cuando_las_anclas_son_sus_gcp():
    from esquinas_1843 import medir
    anclas = _rejilla(n=4)
    semilla = {'px': 50.0, 'py': 50.0, 'x36': 50.0, 'y36': 50.0}
    desplegado = [{'px': a['px'], 'py': a['py'], 'x36': a['x36'], 'y36': a['y36'], 'id': a['id']} for a in anclas] + [semilla]
    assert medir(anclas, desplegado, SECTORES, metro=0.5)['metodo_loo'] == 'calce_desplegado'
    corrido = [{**g, 'x36': g['x36'] + 30.0} for g in desplegado]
    corrido = [{**{k: v for k, v in g.items() if k != 'id'}, 'px': g['px'] + 1000.0} for g in corrido]   # otras GCP: las anclas no son parte de él
    assert medir(anclas, corrido, SECTORES, metro=0.5)['metodo_loo'] == 'solo_anclas'


def test_el_loo_de_un_ancla_sobre_una_semilla_usa_su_propio_destino_sin_la_semilla():
    from esquinas_1843 import medir
    anclas = [{**a, 'id': f'E1843-{k:03d}'} for k, a in enumerate(_rejilla(n=4))]
    gcps = [{'px': a['px'], 'py': a['py'], 'x36': a['x36'], 'y36': a['y36'], 'id': a['id']} for a in anclas[1:]]
    gcps.append({'px': anclas[0]['px'] + 2, 'py': anclas[0]['py'], 'x36': anclas[0]['x36'] + 20.0, 'y36': anclas[0]['y36'], 'manual': True})  # semilla corrida
    informe = medir(anclas, gcps, SECTORES, metro=0.5)
    assert informe['metodo_loo'] == 'calce_desplegado'
    primera = [d for d in informe['detalle'] if d['id'] == 'E1843-000'][0]
    assert primera['loo_m'] < 1.0   # sin la semilla, la rejilla predice bien su destino; con la semilla serían ~10 m


def test_una_gcp_cercana_con_otro_destino_no_pasa_por_el_ancla():
    from esquinas_1843 import medir
    anclas = [{**a, 'id': f'E1843-{k:03d}'} for k, a in enumerate(_rejilla(n=4))]
    gcps = [{'px': a['px'] + 1, 'py': a['py'], 'x36': a['x36'] + 500.0, 'y36': a['y36']} for a in anclas]   # sin id
    assert medir(anclas, gcps, SECTORES, metro=0.5)['metodo_loo'] == 'solo_anclas'


def test_con_menos_de_cuatro_anclas_no_hay_loo_y_no_sale_nan():
    from esquinas_1843 import medir
    anclas = [{'id': 'E1843-001', 'px': 0.0, 'py': 0.0, 'x36': 0.0, 'y36': 0.0}]
    gcps = [{'px': x, 'py': y, 'x36': x + 1, 'y36': y} for x, y in ((0, 500), (500, 0), (500, 500), (250, 250))]
    informe = medir(anclas, gcps, SECTORES, metro=0.5)
    assert informe['metodo_loo'] is None and informe['calce_identidad'] is None
    assert informe['detalle'][0]['loo_m'] is None and informe['sectores'] == []
