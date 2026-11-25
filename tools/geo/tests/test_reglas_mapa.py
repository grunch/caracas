"""Tests de las puertas de las reglas de construcción (specs/13, T82 F1)."""
import math

from reglas_mapa import (manzanas_edificadas, fila_por_frente, alineacion, anchos_de_calle, casas_por_manzana,
                         casas_de_epoca, medir)

METRO = 0.5


def _rect(x0, y0, x1, y1):
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]


def _girado(cx, cy, w, h, grados):
    a = math.radians(grados)
    pts = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    return [[cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)] for x, y in pts]


def _cuadra(x0=0, y0=0):
    """Una manzana de 40 × 40 m (80 px) con un anillo de 8 casas de 20 × 10 m (dos por lado) y el corazón libre."""
    L, F = 80, 20   # px: lado de la manzana y fondo de la casa (10 m)
    casas = [_rect(x0, y0, x0 + 40, y0 + F), _rect(x0 + 40, y0, x0 + L, y0 + F),
             _rect(x0, y0 + L - F, x0 + 40, y0 + L), _rect(x0 + 40, y0 + L - F, x0 + L, y0 + L),
             _rect(x0, y0 + F, x0 + F, y0 + 40), _rect(x0, y0 + 40, x0 + F, y0 + L - F),
             _rect(x0 + L - F, y0 + F, x0 + L, y0 + 40), _rect(x0 + L - F, y0 + 40, x0 + L, y0 + L - F)]
    return [{'techo': i, 'poligono': p} for i, p in enumerate(casas)]


def test_las_casas_pegadas_forman_una_manzana_y_la_calle_las_separa():
    casas = _cuadra() + [{'techo': 100 + c['techo'], 'poligono': [[x + 100, y] for x, y in c['poligono']]} for c in _cuadra()]
    manzanas = manzanas_edificadas(casas, METRO)
    assert len(manzanas) == 2
    assert sorted(len(m['casas']) for m in manzanas) == [8, 8]


def test_una_casa_en_el_corazon_de_la_manzana_es_segunda_fila():
    casas = _cuadra() + [{'techo': 50, 'poligono': _rect(32, 32, 48, 48)}]
    r = fila_por_frente(manzanas_edificadas(casas, METRO), METRO)
    assert r['segunda_fila'] == [50]
    assert r['casas'] == 9


def test_una_casa_girada_en_el_frente_se_cuenta_y_las_paralelas_no():
    casas = _cuadra()
    casas[0] = {'techo': 0, 'poligono': _girado(20, 10, 38, 18, 12)}
    r = alineacion(manzanas_edificadas(casas, METRO), METRO, giro_maximo=5)
    assert [g['techo'] for g in r['giradas']] == [0]
    assert 11 < r['giradas'][0]['giro'] < 13


def test_el_ancho_de_calle_es_la_distancia_entre_las_fachadas_enfrentadas():
    casas = _cuadra() + [{'techo': 100 + c['techo'], 'poligono': [[x + 88, y] for x, y in c['poligono']]} for c in _cuadra()]
    r = anchos_de_calle(manzanas_edificadas(casas, METRO), METRO)
    assert abs(r['mediana_m'] - 4.0) < 0.2    # 8 px = 4 m entre las dos manzanas
    assert r['metros_por_ancho']['2-4'] + r['metros_por_ancho']['4-6'] > 30


def test_casas_por_manzana_y_frente_medio():
    r = casas_por_manzana(manzanas_edificadas(_cuadra(), METRO), METRO)
    assert r['manzanas'][0]['casas'] == 8
    assert abs(r['manzanas'][0]['frente_medio_m'] - 20.0) < 0.5   # 160 m de borde / 8 casas
    assert r['total'] == 8


def test_casas_de_epoca_toma_solo_las_vivas():
    ciudad = {'vertices': [0, 0, 10, 0, 10, 10, 0, 10] * 2, 'techos': [[0, 4, 0, 0], [4, 4, 0, 0]], 'vida': [[1, 0], [3, 0]]}
    assert [c['techo'] for c in casas_de_epoca(ciudad, 2)] == [0]


def test_medir_junta_las_reglas_y_dice_lo_que_falta():
    doc = medir(_cuadra(), METRO, epoca=2, año=1843)
    assert doc['R1']['segunda_fila'] == [] and doc['R6']['total'] == 8
    assert {'R2', 'R5', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12'} <= set(doc['pendientes'])


def test_dos_cuadras_unidas_por_una_casa_que_tapa_la_calle_se_cuentan():
    lejos = [{'techo': 100 + c['techo'], 'poligono': [[x + 230, y] for x, y in c['poligono']]} for c in _cuadra()]
    grande = [{'techo': 200 + i, 'poligono': _rect(0 + 40 * i, 300, 40 + 40 * i, 320)} for i in range(6)]   # 120 m de frente
    tapon = [{'techo': 300, 'poligono': _rect(0, 320, 240, 600)}]    # con la fila de arriba, 120 × 150 m: más que una cuadra
    r = casas_por_manzana(manzanas_edificadas(_cuadra() + lejos + grande + tapon, METRO), METRO)
    assert r['mayores_que_una_cuadra']['n'] == 1
