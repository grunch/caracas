"""Identidad de cruces por posición en el damero: controles independientes del TPS y correspondencias."""
import math

import numpy as np
import pytest

import damero
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


def test_reticula_1936_no_propaga_indices_desde_una_esquina_ambigua():
    # O da a A el índice (1, 0); C, al sur de A, le devuelve otro: A queda ambigua. B, al este de A, heredaba
    # de ella (2, 0) aunque ninguna ruta sin ambigüedad lo sostiene; ahora queda sin índice
    puntos = [(0.0, 0.0), (150.0, 50.0), (250.0, 50.0), (200.0, 200.0)]   # O, A, B, C
    ret = reticula_1936(puntos, 0, angulo_grados=0.0, rango_px=(90, 160))
    assert 2 not in ret.values()
    assert ret == {(0, 0): 0, (1, 0): 1}


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


def test_clasificar_compara_el_umbral_antes_de_redondear():
    # 49,6 % de la cuadra dentro de la unidad redondea a 0,50 pero no llega al umbral; el 50 % justo sí
    casi = [{'id': 'U1', 'ocupacion': 'continua', 'poligono': box(0, 0, 10, 10)}]
    filas, _ = clasificar_correspondencias(casi, [{'id': 1, 'poligono': box(0, 0, 10, 100 / 4.96)}])
    assert filas[0]['clase'] == 'desplazada_o_parcial'
    assert filas[0]['cuadras'][0]['fraccion_cuadra'] == 0.5          # el informe sigue redondeado
    justo, _ = clasificar_correspondencias(casi, [{'id': 1, 'poligono': box(0, 0, 10, 20)}])
    assert justo[0]['clase'] == 'uno_a_uno'


def test_clasificar_rechaza_ocupacion_desconocida():
    with pytest.raises(ValueError, match='ocupación'):
        clasificar_correspondencias([{'id': 'U', 'ocupacion': 'rara', 'poligono': box(0, 0, 1, 1)}], [])


# --- identidad por pareja: la misma celda del damero en el original y en 1936 -------------------

def _esquinas(n=3, paso=10.0, giro=0.0):
    c, s = np.cos(giro), np.sin(giro)
    return {(i, j): np.array([c * i * paso - s * j * paso, s * i * paso + c * j * paso]) for i in range(n) for j in range(n)}


def test_la_celda_que_contiene_un_punto_es_la_de_su_esquina_de_menor_indice():
    # Arrange
    esquinas = _esquinas()

    # Act / Assert: el punto (15, 5) está entre las calles 1 y 2 (i) y 0 y 1 (j)
    assert damero.celda_que_contiene((15.0, 5.0), esquinas) == (1, 0)
    assert damero.celda_que_contiene((5.0, 15.0), esquinas) == (0, 1)


def test_la_celda_sigue_un_damero_girado():
    esquinas = _esquinas(giro=np.radians(40))
    c, s = np.cos(np.radians(40)), np.sin(np.radians(40))
    punto = (c * 15 - s * 5, s * 15 + c * 5)
    assert damero.celda_que_contiene(punto, esquinas) == (1, 0)


def test_fuera_de_toda_celda_completa_no_hay_celda():
    esquinas = {k: v for k, v in _esquinas().items() if k != (2, 1)}
    assert damero.celda_que_contiene((15.0, 5.0), esquinas) is None   # le falta una esquina
    assert damero.celda_que_contiene((50.0, 50.0), _esquinas()) is None


def test_una_uno_a_uno_se_conserva_solo_si_unidad_y_cuadra_caen_en_la_misma_celda():
    # Arrange: original a paso 10; 1936 a paso 40 desplazado. U1 y su cuadra C1 en la celda (0, 0);
    # U2 en (1, 0) pero su cuadra C2 cae en (0, 1) de 1936; U3 no es uno a uno
    original = _esquinas(paso=10.0)
    mosaico = {k: v * 4 + 1000 for k, v in original.items()}
    unidades = [{'id': 'U1', 'centro_original': (5, 5)}, {'id': 'U2', 'centro_original': (15, 5)},
                {'id': 'U3', 'centro_original': (5, 15)}]
    cuadras = [{'id': 'C1', 'poligono': box(1010, 1010, 1030, 1030)}, {'id': 'C2', 'poligono': box(1010, 1050, 1030, 1070)}]
    filas = [{'unidad': 'U1', 'clase': 'uno_a_uno', 'cuadras': [{'cuadra': 'C1', 'fraccion_cuadra': 0.9}]},
             {'unidad': 'U2', 'clase': 'uno_a_uno', 'cuadras': [{'cuadra': 'C2', 'fraccion_cuadra': 0.8}]},
             {'unidad': 'U3', 'clase': 'ausente', 'cuadras': []}]

    # Act
    salida = damero.confirmar_uno_a_uno(filas, unidades, cuadras, original, mosaico)

    # Assert
    assert salida[0] == {**filas[0], 'identidad_pareja': {'celda_original': [0, 0], 'celda_1936': [0, 0]}}
    assert salida[1]['clase'] == 'incierta'
    assert salida[1]['identidad_pareja'] == {'celda_original': [1, 0], 'celda_1936': [0, 1]}
    assert 'otra celda' in salida[1]['motivo']
    assert salida[2] == filas[2]
    assert filas[1]['clase'] == 'uno_a_uno'  # no muta la entrada


def test_una_uno_a_uno_sin_celda_completa_en_1936_queda_incierta():
    original = _esquinas(paso=10.0)
    mosaico = {k: v * 4 + 1000 for k, v in original.items() if k != (1, 1)}
    filas = [{'unidad': 'U1', 'clase': 'uno_a_uno', 'cuadras': [{'cuadra': 'C1', 'fraccion_cuadra': 0.9}]}]
    salida = damero.confirmar_uno_a_uno(filas, [{'id': 'U1', 'centro_original': (5, 5)}],
                                        [{'id': 'C1', 'poligono': box(1010, 1010, 1030, 1030)}], original, mosaico)
    assert salida[0]['clase'] == 'incierta'
    assert salida[0]['identidad_pareja'] == {'celda_original': [0, 0], 'celda_1936': None}


def test_dos_unidades_enteras_dentro_de_una_cuadra_que_se_reparten_son_fusionadas():
    # Arrange: la cuadra C1 (20 × 10) contiene enteras a U1 y U2, cada una con menos de la mitad de la cuadra;
    # U3 está entera en C2 pero sola, con menos de la mitad de C2
    unidades = [{'id': 'U1', 'ocupacion': 'continua', 'poligono': box(0, 0, 9.5, 10)},
                {'id': 'U2', 'ocupacion': 'conjunto_especial', 'poligono': box(10.5, 0, 20, 10)},
                {'id': 'U3', 'ocupacion': 'continua', 'poligono': box(100, 0, 109, 10)}]
    cuadras = [{'id': 'C1', 'poligono': box(0, 0, 20, 10)}, {'id': 'C2', 'poligono': box(100, 0, 120, 10)}]

    # Act
    filas, _ = clasificar_correspondencias(unidades, cuadras)

    # Assert
    assert {f['unidad']: f['clase'] for f in filas} == {'U1': 'fusionada', 'U2': 'fusionada', 'U3': 'desplazada_o_parcial'}


def test_en_una_cuadra_repartida_las_dos_unidades_son_fusionadas_aunque_una_pase_el_umbral():
    # Arrange: U1 cubre el 60 % de C1 y U2 el 35 %, las dos enteras dentro de ella
    unidades = [{'id': 'U1', 'ocupacion': 'continua', 'poligono': box(0, 0, 12, 10)},
                {'id': 'U2', 'ocupacion': 'continua', 'poligono': box(13, 0, 20, 10)}]
    cuadras = [{'id': 'C1', 'poligono': box(0, 0, 20, 10)}]

    # Act
    filas, _ = clasificar_correspondencias(unidades, cuadras)

    # Assert
    assert {f['unidad']: f['clase'] for f in filas} == {'U1': 'fusionada', 'U2': 'fusionada'}
