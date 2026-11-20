"""Identidad de cruces por posición en el damero: controles independientes del TPS y correspondencias."""
import math

import pytest
from shapely.geometry import box

from damero import (
    clasificar_correspondencias, controles, cruces_1772, indice_1772, reticula_1936,
)

ORIGEN, PASO = (100.0, 200.0), 50.0


def lineas_1772():
    # retícula 3×3 de calles rectas, más una quebrada (se ignora) y una recta fuera de paso (sin índice)
    h = [{'id': f'H{k}', 'tipo': 'calle_recta', 'puntos': [[80, 200 + 50 * k], [260, 200 + 50 * k]]} for k in range(3)]
    v = [{'id': f'V{k}', 'tipo': 'calle_recta', 'puntos': [[100 + 50 * k, 180], [100 + 50 * k, 320]]} for k in range(3)]
    return h + v + [{'id': 'Q', 'tipo': 'calle_quebrada', 'puntos': [[80, 230], [260, 240]]},
                    {'id': 'X', 'tipo': 'calle_recta', 'puntos': [[130, 180], [130, 320]]}]


def test_indice_1772_redondea_al_paso_y_rechaza_lo_que_no_cae_en_la_reticula():
    assert indice_1772(150.0, 300.0, ORIGEN, PASO) == (1, 2)
    assert indice_1772(147.0, 303.0, ORIGEN, PASO) == (1, 2)      # 3 px de tolerancia a 50 px de paso
    assert indice_1772(130.0, 200.0, ORIGEN, PASO) is None        # a medio paso


def test_cruces_1772_solo_calles_rectas_con_indice_y_sector():
    sectores = [{'id': 'A', 'bbox_original': [0, 0, 175, 400]}, {'id': 'B', 'bbox_original': [175, 0, 400, 400]}]
    cruces = cruces_1772(lineas_1772(), sectores, ORIGEN, PASO)
    assert len(cruces) == 9
    assert cruces[0] == {'id': 'X1772-0001', 'lineas': ['H0', 'V0'], 'original': [100.0, 200.0], 'indice': [0, 0], 'sector': 'A'}
    assert {tuple(c['indice']) for c in cruces} == {(i, j) for i in range(3) for j in range(3)}
    assert sum(1 for c in cruces if c['sector'] == 'B') == 3
    assert all('Q' not in c['lineas'] and 'X' not in c['lineas'] for c in cruces)


def girar(u, v, grados=10.0, centro=(1000.0, 1000.0), paso=220.0):
    a = math.radians(grados)
    return [centro[0] + paso * (u * math.cos(a) - v * math.sin(a)), centro[1] + paso * (u * math.sin(a) + v * math.cos(a))]


def esquinas_1936():
    # retícula girada 10°, con paso irregular hacia el norte y una esquina extraviada entre dos cruces
    puntos = [girar(u, v * (1.15 if v < 0 else 1.0)) for u in range(-2, 3) for v in range(-2, 3)]
    return puntos + [girar(0.5, 0.0)]


def test_reticula_1936_indexa_por_recorrido_y_excluye_ambiguedades():
    puntos = esquinas_1936()
    origen = puntos.index(girar(0, 0))
    ret = reticula_1936(puntos, origen, angulo_grados=10.0)
    assert ret[(0, 0)] == origen
    assert ret[(2, 2)] == puntos.index(girar(2, -2 * 1.15))   # +2 este, +2 norte (norte = v negativo en el mosaico)
    assert ret[(-1, -1)] == puntos.index(girar(-1, 1))
    assert len(puntos) - 1 not in ret.values()               # la extraviada no recibe índice
    assert len(ret) == 25


def test_controles_comparan_identidad_con_calce_en_metros_sin_mutar():
    puntos = esquinas_1936(); origen = puntos.index(girar(0, 0))
    ret = reticula_1936(puntos, origen, angulo_grados=10.0)
    cruces = cruces_1772(lineas_1772(), [{'id': 'A', 'bbox_original': [0, 0, 400, 400]}], ORIGEN, PASO)
    antes = [dict(c) for c in cruces]

    def proyectar(x, y):  # un calce que acierta la identidad salvo 10 px (5 m) hacia el este
        kx, ky = indice_1772(x, y, ORIGEN, PASO)
        px = girar(ky, -kx * (1.15 if kx > 0 else 1.0))
        return px[0] + 10, px[1]
    nodos = controles(cruces, ret, puntos, proyectar, metro=0.5)
    assert len(nodos) == 9 and cruces == antes
    n = next(n for n in nodos if n['indice'] == [1, 2])
    assert n['mosaico_identidad'] == [round(v, 2) for v in girar(2, -1.15)]
    assert n['desvio_m'] == 5.0 and n['delta_m'] == [5.0, 0.0]
    assert n['esquina_1936'] == puntos.index(girar(2, -1.15))


def test_controles_omiten_cruces_sin_esquina_1936():
    puntos = esquinas_1936(); origen = puntos.index(girar(0, 0))
    ret = reticula_1936(puntos, origen, angulo_grados=10.0)
    lejos = [{'id': 'X', 'lineas': [], 'original': [0, 0], 'indice': [7, 7], 'sector': 'A'}]
    assert controles(lejos, ret, puntos, lambda x, y: (x, y), metro=0.5) == []


def test_clasificar_correspondencias_cubre_las_cinco_clases_y_los_vacios():
    unidades = [
        {'id': 'U1', 'ocupacion': 'continua', 'poligono': box(0, 0, 10, 10)},       # una cuadra dentro → uno a uno
        {'id': 'U2', 'ocupacion': 'parcial', 'poligono': box(20, 0, 30, 10)},       # nada → ausente
        {'id': 'U3', 'ocupacion': 'continua', 'poligono': box(40, 0, 50, 10)},      # dos cuadras dentro → dividida
        {'id': 'U4', 'ocupacion': 'continua', 'poligono': box(60, 0, 70, 10)},      # comparten una cuadra → fusionada
        {'id': 'U5', 'ocupacion': 'continua', 'poligono': box(70, 0, 80, 10)},
        {'id': 'U6', 'ocupacion': 'terreno_libre', 'poligono': box(90, 0, 100, 10)},  # vacío con casas → adicional
        {'id': 'U7', 'ocupacion': 'terreno_libre', 'poligono': box(110, 0, 120, 10)},  # vacío sin casas
        {'id': 'U8', 'ocupacion': 'continua', 'poligono': box(130, 0, 140, 10)},    # cuadra a medias → desplazada
    ]
    cuadras = [
        {'id': 1, 'poligono': box(1, 1, 9, 9)}, {'id': 2, 'poligono': box(41, 1, 44, 9)}, {'id': 3, 'poligono': box(46, 1, 49, 9)},
        {'id': 4, 'poligono': box(65, 1, 75, 9)}, {'id': 5, 'poligono': box(91, 1, 99, 9)}, {'id': 6, 'poligono': box(136, 1, 146, 9)},
        {'id': 7, 'poligono': box(200, 0, 210, 10)},
    ]
    filas, sobrantes = clasificar_correspondencias(unidades, cuadras)
    clases = {f['unidad']: f['clase'] for f in filas}
    assert clases == {'U1': 'uno_a_uno', 'U2': 'ausente', 'U3': 'dividida', 'U4': 'fusionada', 'U5': 'fusionada',
                      'U6': 'adicional_sobre_vacio', 'U7': 'vacio_coincide', 'U8': 'desplazada_o_parcial'}
    assert next(f for f in filas if f['unidad'] == 'U1')['cuadras'] == [{'cuadra': 1, 'fraccion_cuadra': 1.0, 'fraccion_unidad': 0.64}]
    assert sobrantes == [7]


def test_clasificar_rechaza_ocupacion_desconocida():
    with pytest.raises(ValueError, match='ocupación'):
        clasificar_correspondencias([{'id': 'U', 'ocupacion': 'rara', 'poligono': box(0, 0, 1, 1)}], [])
