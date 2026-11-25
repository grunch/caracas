"""Casas propias de 1843 (T81.4c): una crujía por frente en las manzanas rayadas sin casas a la vista."""
import copy
import sys
from pathlib import Path

from shapely.geometry import Polygon

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from epocas_1843 import agregar_casas, casas_de_manzana, sin_casas  # noqa: E402


def _cuadrado(x, y, lado):
    return [[x, y], [x + lado, y], [x + lado, y + lado], [x, y + lado]]


def test_casas_de_manzana_cubre_los_frentes_sin_solaparse_y_deja_el_patio():
    manzana = Polygon(_cuadrado(0, 0, 200))          # 100 m de lado a 0,5 m/px
    casas = casas_de_manzana(_cuadrado(0, 0, 200), metro=0.5, crujia_m=8, frente_m=10, retiro_m=0)
    union = casas[0]
    for c in casas[1:]:
        assert union.intersection(c).area < 1e-6
        union = union.union(c)
    assert len(casas) >= 36                           # unas diez por lado
    assert union.within(manzana.buffer(1e-6))
    assert not union.contains(manzana.centroid)       # el patio, libre
    assert abs(union.area - (200 ** 2 - 168 ** 2)) / (200 ** 2 - 168 ** 2) < 0.02   # la crujía de 8 m (16 px) todo alrededor


def test_una_manzana_demasiado_chica_es_una_sola_casa():
    casas = casas_de_manzana(_cuadrado(0, 0, 30), metro=0.5, crujia_m=8, frente_m=10, retiro_m=0)
    assert len(casas) == 1 and abs(casas[0].area - 900) < 1


def _ciudad(casas, vidas):
    vertices, techos = [], []
    for c in casas:
        techos.append([len(vertices) // 2, len(c), 1, 0, 7])
        vertices += [v for p in c for v in p]
    return {'vertices': vertices, 'techos': techos, 'esquinas': [0] * len(casas), 'vida': vidas,
            'vuelos': [255] * len(casas), 'cuadras': [-1] * len(casas)}


def test_sin_casas_cuenta_las_casas_vivas_en_la_epoca():
    unidades = [{'id': 'A', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _cuadrado(0, 0, 100)},
                {'id': 'B', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _cuadrado(200, 0, 100)},
                {'id': 'C', 'ocupacion': 'rayada', 'estado': 'pendiente', 'poligono': _cuadrado(400, 0, 100)},
                {'id': 'D', 'ocupacion': 'huerta', 'estado': 'aprobada', 'poligono': _cuadrado(600, 0, 100)}]
    ciudad = _ciudad([_cuadrado(10, 10, 10), _cuadrado(210, 10, 10)], [[2, 0], [3, 0]])
    assert [u['id'] for u in sin_casas(unidades, ciudad, epoca=2)] == ['B']


def test_agregar_casas_viven_desde_la_epoca_hasta_que_llega_una_de_1936_y_no_mutan():
    unidades = [{'id': 'B', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _cuadrado(200, 0, 100)},
                {'id': 'E', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _cuadrado(400, 0, 100)}]
    ciudad = _ciudad([_cuadrado(210, 10, 10)], [[4, 0]])     # en B llega una casa en 1911
    copia = copy.deepcopy(ciudad)

    nueva, informe = agregar_casas(ciudad, unidades, metro=0.5, epoca=2)

    n = len(nueva['techos'])
    assert ciudad == copia
    assert len(nueva['vida']) == len(nueva['esquinas']) == len(nueva['vuelos']) == n > 1
    propias = nueva['vida'][1:]
    assert {tuple(v) for v in propias} == {(2, 4), (2, 0)}
    assert informe == {'manzanas': 2, 'casas': n - 1}


def test_las_casas_propias_no_pisan_los_lotes_especiales_de_su_manzana():
    unidades = [{'id': 'B', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _cuadrado(0, 0, 200)},
                {'id': 'L', 'ocupacion': 'lote_especial', 'estado': 'aprobada', 'poligono': _cuadrado(0, 0, 60)}]
    nueva, _ = agregar_casas(_ciudad([], []), unidades, metro=0.5, epoca=2)
    v = nueva['vertices']
    lote = Polygon(_cuadrado(0, 0, 60))
    for t in nueva['techos']:
        casa = Polygon([(v[2 * i], v[2 * i + 1]) for i in range(t[0], t[0] + t[1])])
        assert casa.intersection(lote).area < 1e-6


def test_las_casas_nacidas_en_1843_fuera_de_toda_manzana_pasan_a_la_epoca_siguiente():
    from epocas_1843 import fuera_de_la_referencia
    unidades = [{'id': 'A', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _cuadrado(0, 0, 100)}]
    casas = [_cuadrado(10, 10, 10), _cuadrado(102, 40, 4), _cuadrado(300, 0, 10), _cuadrado(300, 50, 10), _cuadrado(300, 100, 10)]
    ciudad = _ciudad(casas, [[2, 0], [2, 0], [2, 0], [2, 3], [1, 0]])
    copia = copy.deepcopy(ciudad)

    nueva, movidas = fuera_de_la_referencia(ciudad, unidades, metro=0.5, epoca=2, tolerancia_m=3)

    # dentro, a media calle, fuera (nace después), fuera y moría en la siguiente (se quita: no vive en ninguna), de 1772
    assert nueva['vida'] == [[2, 0], [2, 0], [3, 0], [1, 0]]
    assert len(nueva['techos']) == len(nueva['esquinas']) == len(nueva['vuelos']) == 4
    assert nueva['vertices'][2 * nueva['techos'][3][0]] == 300   # la de 1772 conserva su huella
    assert movidas == 2 and ciudad == copia


def test_las_casas_nacidas_en_1843_dentro_de_un_lote_o_plaza_pasan_a_la_epoca_siguiente():
    from epocas_1843 import en_lotes_libres
    unidades = [{'id': 'A', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _cuadrado(0, 0, 200)},
                {'id': 'L', 'ocupacion': 'lote_especial', 'estado': 'aprobada', 'poligono': _cuadrado(0, 0, 80)},
                {'id': 'R', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _cuadrado(10, 10, 20)},
                {'id': 'P', 'ocupacion': 'plaza', 'estado': 'aprobada', 'poligono': _cuadrado(300, 0, 50)}]
    casas = [_cuadrado(40, 40, 10), _cuadrado(15, 15, 5), _cuadrado(150, 150, 10), _cuadrado(310, 10, 10), _cuadrado(50, 50, 5)]
    ciudad = _ciudad(casas, [[2, 0], [2, 0], [2, 0], [2, 4], [1, 0]])

    nueva, movidas = en_lotes_libres(ciudad, unidades, epoca=2)

    assert nueva['vida'] == [[3, 0], [2, 0], [2, 0], [3, 4], [1, 0]]   # lote, manzana dentro del lote, manzana, plaza, de 1772
    sin_vida, _ = en_lotes_libres(_ciudad([_cuadrado(40, 40, 10)], [[2, 3]]), unidades, epoca=2)
    assert sin_vida['techos'] == [] and sin_vida['vida'] == []
    assert movidas == 2
