"""Censo 1B de 1843: los archivos por sector se juntan con IDs estables y validaciones."""
import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from censo_1843 import juntar, problemas  # noqa: E402

SECTORES = [{'id': 'S1843-11', 'caja_px': [0, 0, 100, 100]}, {'id': 'S1843-12', 'caja_px': [100, 0, 200, 100]}]


def _u(local, caja, ocupacion='rayada', **extra):
    x0, y0, x1, y1 = caja
    return {'local': local, 'caja_px': caja, 'poligono_px': [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
            'ocupacion': ocupacion, 'lectura': 'segura', **extra}


def test_juntar_da_ids_estables_por_sector_y_posicion():
    lecturas = [{'sector': 'S1843-12', 'unidades': [_u('a', [110, 10, 150, 50])]},
                {'sector': 'S1843-11', 'unidades': [_u('b', [10, 60, 40, 90]), _u('a', [10, 10, 40, 40], 'plaza')]}]

    censo = juntar(lecturas, SECTORES)

    assert [(u['id'], u['sector'], u['local']) for u in censo['unidades']] == [
        ('U1843-0001', 'S1843-11', 'a'), ('U1843-0002', 'S1843-11', 'b'), ('U1843-0003', 'S1843-12', 'a')]
    assert censo['por_ocupacion'] == {'plaza': 1, 'rayada': 2}
    assert censo['por_sector'] == {'S1843-11': 2, 'S1843-12': 1}


def test_problemas_detecta_ocupacion_invalida_centro_fuera_y_duplicado_entre_sectores():
    lecturas = [{'sector': 'S1843-11', 'unidades': [_u('a', [10, 10, 40, 40], 'casas'), _u('b', [150, 10, 190, 40])]},
                {'sector': 'S1843-12', 'unidades': [_u('a', [150, 12, 190, 41])]}]

    censo = juntar(lecturas, SECTORES)
    tipos = sorted((p['tipo'], p['unidad']) for p in problemas(censo, SECTORES))

    assert ('ocupacion_invalida', 'U1843-0001') in tipos
    assert ('centro_fuera_del_sector', 'U1843-0002') in tipos
    assert any(t == 'duplicada' for t, _ in tipos)


def test_un_censo_limpio_no_tiene_problemas_y_no_muta_las_lecturas():
    lecturas = [{'sector': 'S1843-11', 'unidades': [_u('a', [10, 10, 40, 40])]}]
    copia = copy.deepcopy(lecturas)
    censo = juntar(lecturas, SECTORES)
    assert problemas(censo, SECTORES) == [] and lecturas == copia


def test_lo_anidado_no_es_duplicado_salvo_manzana_dentro_de_manzana():
    lecturas = [{'sector': 'S1843-12', 'unidades': [_u('a', [60, 10, 190, 90])]},
                {'sector': 'S1843-11', 'unidades': [_u('a', [62, 20, 90, 60]),                     # otra lectura de la manzana
                                                    _u('b', [65, 65, 90, 85], 'lote_especial'),    # su lote con letra
                                                    _u('c', [5, 5, 40, 95], 'huerta')]}]
    tipos = sorted(p['tipo'] for p in problemas(juntar(lecturas, SECTORES), SECTORES))
    assert tipos == ['manzana_dentro_de_manzana']


def test_una_manzana_curva_no_choca_con_las_vecinas_que_caben_en_su_caja():
    curva = {**_u('a', [0, 0, 99, 99]), 'poligono_px': [[0, 0], [99, 0], [99, 10], [10, 10], [10, 99], [0, 99]]}
    lecturas = [{'sector': 'S1843-11', 'unidades': [curva]},
                {'sector': 'S1843-12', 'unidades': [_u('a', [60, 40, 98, 90])]}]
    sectores = [{'id': 'S1843-11', 'caja_px': [0, 0, 70, 100]}, {'id': 'S1843-12', 'caja_px': [70, 0, 200, 100]}]
    assert problemas(juntar(lecturas, sectores), sectores) == []


def test_correcciones_quitan_mueven_y_reclasifican_por_sector_y_local():
    from censo_1843 import corregir
    lecturas = [{'sector': 'S1843-11', 'unidades': [_u('a', [10, 10, 40, 40]), _u('b', [50, 50, 60, 60])]},
                {'sector': 'S1843-12', 'unidades': [_u('a', [101, 10, 140, 40])]}]
    correcciones = [{'sector': 'S1843-11', 'local': 'b', 'accion': 'quitar', 'motivo': 'duplicada'},
                    {'sector': 'S1843-12', 'local': 'a', 'accion': 'mover', 'a': 'S1843-11', 'motivo': 'centro'},
                    {'sector': 'S1843-11', 'local': 'a', 'accion': 'ocupacion', 'valor': 'plaza', 'motivo': 'x'}]

    nuevas = corregir(lecturas, correcciones)

    unidades = {(lect['sector'], u['local']): u for lect in nuevas for u in lect['unidades']}
    assert set(unidades) == {('S1843-11', 'a'), ('S1843-11', 'a@S1843-12')}
    assert unidades[('S1843-11', 'a')]['ocupacion'] == 'plaza'
    assert unidades[('S1843-11', 'a')]['correccion'] == 'x'
    assert len(lecturas[0]['unidades']) == 2   # sin mutar


def test_una_correccion_que_no_encuentra_su_unidad_falla():
    import pytest
    from censo_1843 import corregir
    with pytest.raises(KeyError):
        corregir([{'sector': 'S1843-11', 'unidades': []}], [{'sector': 'S1843-11', 'local': 'z', 'accion': 'quitar', 'motivo': ''}])
