"""Contraste 1C de 1843: cada unidad del censo, proyectada con el calce, contra las casas que viven en 1843."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from contraste_1843 import clasificar, vive  # noqa: E402


def _cuadrado(x, y, lado):
    return [[x, y], [x + lado, y], [x + lado, y + lado], [x, y + lado]]


def test_vive_en_la_epoca_segun_nace_y_muere():
    assert vive([2, 0], 2) and vive([0, 0], 2) and vive([1, 3], 2)
    assert not vive([3, 0], 2) and not vive([1, 2], 2)


def test_clasificar_manzanas_lotes_y_casas_sobrantes():
    unidades = [
        {'id': 'U1', 'ocupacion': 'rayada', 'poligono': _cuadrado(0, 0, 100)},
        {'id': 'U2', 'ocupacion': 'rayada', 'poligono': _cuadrado(200, 0, 100)},
        {'id': 'U3', 'ocupacion': 'lote_especial', 'poligono': _cuadrado(20, 20, 30), 'letras': ['A']},
        {'id': 'U4', 'ocupacion': 'plaza', 'poligono': _cuadrado(400, 0, 100)},
    ]
    casas = [
        {'techo': 1, 'poligono': _cuadrado(5, 5, 10)},      # en U1
        {'techo': 2, 'poligono': _cuadrado(70, 70, 10)},    # en U1
        {'techo': 3, 'poligono': _cuadrado(25, 25, 10)},    # en el lote A dentro de U1: indebida
        {'techo': 4, 'poligono': _cuadrado(420, 20, 10)},   # en la plaza: indebida
        {'techo': 5, 'poligono': _cuadrado(150, 150, 10)},  # fuera de todo: sobrante
    ]

    r = clasificar(unidades, casas, metro=0.5, tolerancia_m=0)

    fila = {f['id']: f for f in r['unidades']}
    assert (fila['U1']['casas'], fila['U1']['estado']) == (2, 'con_casas')
    assert fila['U2']['estado'] == 'sin_casas'
    assert (fila['U3']['casas'], fila['U3']['estado']) == (1, 'con_casas_indebidas')
    assert fila['U4']['estado'] == 'con_casas_indebidas'
    assert r['sobrantes'] == [5]
    assert r['resumen'] == {'rayada': {'con_casas': 1, 'sin_casas': 1}, 'lote_especial': {'con_casas_indebidas': 1},
                            'plaza': {'con_casas_indebidas': 1}}


def test_la_tolerancia_recoge_las_casas_de_la_media_calle():
    unidades = [{'id': 'U1', 'ocupacion': 'rayada', 'poligono': _cuadrado(0, 0, 100)}]
    casas = [{'techo': 1, 'poligono': _cuadrado(101, 40, 6)}]   # centro a 4 px = 2 m del borde
    assert clasificar(unidades, casas, metro=0.5, tolerancia_m=3)['sobrantes'] == []
    assert clasificar(unidades, casas, metro=0.5, tolerancia_m=1)['sobrantes'] == [1]


def test_una_manzana_censada_dentro_de_una_huerta_conserva_sus_casas():
    unidades = [{'id': 'H', 'ocupacion': 'huerta', 'poligono': _cuadrado(0, 0, 200)},
                {'id': 'R', 'ocupacion': 'rayada', 'poligono': _cuadrado(50, 50, 40)}]
    casas = [{'techo': 1, 'poligono': _cuadrado(60, 60, 10)}, {'techo': 2, 'poligono': _cuadrado(150, 150, 10)}]
    fila = {f['id']: f for f in clasificar(unidades, casas, metro=0.5, tolerancia_m=0)['unidades']}
    assert (fila['R']['casas'], fila['R']['estado']) == (1, 'con_casas')
    assert (fila['H']['casas'], fila['H']['estado']) == (1, 'con_casas_indebidas')


def test_las_casas_que_esconde_un_hito_en_pie_no_cuentan():
    from contraste_1843 import visibles_en
    hitos = [{'nace': 1, 'muere': 0, 'suprime': [_cuadrado(0, 0, 50)]}, {'nace': 3, 'muere': 0, 'suprime': [_cuadrado(100, 0, 50)]}]
    casas = [{'techo': 1, 'poligono': _cuadrado(10, 10, 10)}, {'techo': 2, 'poligono': _cuadrado(110, 10, 10)}]
    assert [c['techo'] for c in visibles_en(casas, hitos, epoca=2)] == [2]
