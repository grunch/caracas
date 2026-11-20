"""Contrato de la referencia histórica; los candidatos nunca habilitan construcción."""
from copy import deepcopy

import pytest

from referencia_historica import validar_referencia, unidades_aprobadas


def referencia():
    puntos = [(0, 0), (10, 0), (10, 10), (0, 10), (20, 0), (20, 10)]
    return {
        'fuente': 'original.jpg',
        'fuente_sha256': 'a' * 64,
        'nodos': [{'id': f'N{i}', 'original': [x, y], 'mosaico': [100 + y, 200 - x]}
                  for i, (x, y) in enumerate(puntos)],
        'unidades': [
            {'id': 'U1', 'nodos': ['N0', 'N1', 'N2', 'N3'], 'estado': 'aprobada',
             'procedencia': 'lectura de los dos planos', 'ocupacion': 'continua'},
            {'id': 'U2', 'nodos': ['N1', 'N4', 'N5', 'N2'], 'estado': 'pendiente',
             'procedencia': 'candidato por proximidad', 'ocupacion': 'parcial'},
        ],
    }


def test_cruces_compartidos_y_seleccion_sin_mutar_la_referencia():
    r = referencia(); antes = deepcopy(r)
    validar_referencia(r)
    assert [u['id'] for u in unidades_aprobadas(r)] == ['U1']
    assert r == antes


def test_pendiente_nunca_se_convierte_en_aprobada_por_tener_poligono_valido():
    r = referencia()
    for u in r['unidades']:
        u['estado'] = 'pendiente'
    assert unidades_aprobadas(r) == []


@pytest.mark.parametrize('campo', ['original', 'mosaico'])
def test_un_cruce_no_puede_tener_dos_ids(campo):
    r = referencia(); r['nodos'][4][campo] = list(r['nodos'][0][campo])
    with pytest.raises(ValueError, match='coordenada duplicada'):
        validar_referencia(r)


def test_rechaza_nodo_ausente_en_lugar_de_inventar_una_esquina():
    r = referencia(); r['unidades'][0]['nodos'][0] = 'desconocido'
    with pytest.raises(ValueError, match='nodo inexistente'):
        validar_referencia(r)


def test_rechaza_nodos_repetidos_y_anillos_autointersectados():
    r = referencia(); r['unidades'][0]['nodos'] = ['N0', 'N2', 'N1', 'N3']
    with pytest.raises(ValueError, match='polígono inválido'):
        validar_referencia(r)


def test_rechaza_unidades_superpuestas_aunque_las_dos_sean_validas():
    r = referencia(); r['unidades'][1]['nodos'] = ['N0', 'N4', 'N5', 'N3']
    with pytest.raises(ValueError, match='solape'):
        validar_referencia(r)


def test_rechaza_inversion_local_del_calce():
    r = referencia()
    r['nodos'][0]['mosaico'], r['nodos'][2]['mosaico'] = r['nodos'][2]['mosaico'], r['nodos'][0]['mosaico']
    with pytest.raises(ValueError, match='orientación|polígono inválido'):
        validar_referencia(r)


@pytest.mark.parametrize('campo,valor', [('estado', 'inferida'), ('procedencia', ''), ('ocupacion', 'desconocida')])
def test_no_acepta_aprobaciones_o_clases_ambiguas(campo, valor):
    r = referencia(); r['unidades'][0][campo] = valor
    with pytest.raises(ValueError):
        validar_referencia(r)


def test_rechaza_coordenadas_no_finitas_y_fuente_sin_hash():
    r = referencia(); r['nodos'][0]['original'][0] = float('nan')
    with pytest.raises(ValueError, match='coordenadas'):
        validar_referencia(r)
    r = referencia(); r['fuente_sha256'] = ''
    with pytest.raises(ValueError, match='fuente'):
        validar_referencia(r)


def test_referencia_del_nucleo_no_habilita_candidatos_para_generacion():
    import json
    from pathlib import Path
    ruta = Path(__file__).resolve().parents[1] / 'referencias' / '1772-nucleo.json'
    r = json.loads(ruta.read_text(encoding='utf-8'))
    validar_referencia(r)
    assert unidades_aprobadas(r) == []


def test_la_seleccion_no_permite_mutar_los_nodos_del_registro():
    r = referencia(); antes = deepcopy(r)
    elegidas = unidades_aprobadas(r)
    elegidas[0]['nodos'][0] = 'otro'
    assert r == antes


def test_una_unidad_pendiente_puede_declarar_geometria_no_resuelta():
    r = referencia(); r['unidades'][1]['nodos'] = None
    validar_referencia(r)
    assert [u['id'] for u in unidades_aprobadas(r)] == ['U1']


def test_no_se_aprueba_una_unidad_sin_geometria():
    r = referencia(); r['unidades'][0]['nodos'] = None
    with pytest.raises(ValueError, match='sin geometría'):
        validar_referencia(r)
