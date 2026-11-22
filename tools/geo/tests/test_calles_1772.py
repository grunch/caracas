"""Las calles de 1772 llevadas a 1936 y su continuidad en la ciudad generada (T33j.3b: red conectada como el original)."""
import numpy as np
import pytest
from shapely.geometry import box

from calles_1772 import BANDA_MAXIMA_M, BANDA_MINIMA_M, bloqueado, ejes_de_red

METRO = 0.5


def red():
    nodos = [{'id': 'A', 'original': [0, 0], 'mosaico': [100, 100], 'sector': 'S1'},
             {'id': 'B', 'original': [10, 0], 'mosaico': None, 'sector': 'S1'},
             {'id': 'C', 'original': [10, 10], 'mosaico': None, 'sector': 'S9'}]
    calles = [{'id': 'L1', 'tipo': 'calle_recta', 'nodos': ['A', 'B'], 'puntos': [[0, 0], [10, 0]]},
              {'id': 'L2', 'tipo': 'calle_quebrada', 'nodos': ['B', 'C'], 'puntos': [[10, 0], [12, 5], [10, 10]]}]
    return {'nodos': nodos, 'calles': calles}


def a_1936(xs, ys):
    """Calce de prueba: escala 10 y corre 100 px."""
    return np.asarray(xs) * 10 + 100, np.asarray(ys) * 10 + 100


def test_cada_tramo_va_a_1936_por_identidad_en_sus_cruces_y_por_el_calce_en_lo_demas():
    # Act
    ejes = {e['tramo']: e for e in ejes_de_red(red(), a_1936, {'S1': 8.0, 'S9': 200.0}, limites={'S9'})}

    # Assert
    l1, l2 = ejes['L1:A-B'], ejes['L2:B-C']
    assert l1['puntos'] == [[100.0, 100.0], [200.0, 100.0]] and l1['identificado'] == ['A']
    assert l1['banda_m'] == 8.0 and l1['medible'] is True
    assert l2['puntos'] == [[200.0, 100.0], [220.0, 150.0], [200.0, 200.0]]   # la quebrada conserva su quiebre
    assert l2['identificado'] == [] and l2['medible'] is True and l2['sector'] == 'S1'


def test_la_banda_se_acota_y_un_tramo_de_un_sector_limite_no_se_mide():
    r = red()
    r['nodos'][0]['sector'] = r['nodos'][1]['sector'] = 'S9'
    ejes = {e['tramo']: e for e in ejes_de_red(r, a_1936, {'S1': 1.0, 'S9': 200.0}, limites={'S9'})}
    assert ejes['L1:A-B']['banda_m'] == BANDA_MAXIMA_M and ejes['L1:A-B']['medible'] is False
    assert ejes_de_red(red(), a_1936, {'S1': 1.0}, limites=set())[0]['banda_m'] == BANDA_MINIMA_M


def test_un_tramo_esta_bloqueado_si_las_casas_cierran_el_paso_de_un_extremo_al_otro():
    eje = {'puntos': [[0, 50], [200, 50]], 'banda_m': 10}
    libre = [box(20, 0, 60, 40), box(80, 60, 120, 100)]           # casas a los lados
    muro = libre + [box(90, 0, 110, 100)]                         # una casa de lado a lado de la banda
    assert bloqueado(eje, libre, METRO) is False
    assert bloqueado(eje, muro, METRO) is True


def test_un_extremo_dentro_de_una_casa_bloquea_el_tramo():
    assert bloqueado({'puntos': [[0, 50], [200, 50]], 'banda_m': 10}, [box(-10, 40, 10, 60)], METRO) is True


def test_epocas_abre_en_1772_un_tramo_bloqueado_quitando_las_casas_de_su_nucleo_de_calzada():
    from epocas import abrir_calles_de_1772
    # Arrange: la casa 0 cruza la calle de lado a lado; la 1 está al costado; la 2 es «de antes» y también la cruza
    ciudad = {'vertices': [90, 0, 110, 0, 110, 100, 90, 100, 20, 0, 60, 0, 60, 40, 20, 40, 150, 0, 170, 0, 170, 100, 150, 100],
              'techos': [[0, 4, 1, 0, 0], [4, 4, 1, 0, 0], [8, 4, 1, 0, 0]], 'antes': [0, 0, 1]}
    vida = [[0, 0], [1, 0], [1, 3]]
    calles = [{'tramo': 'L1:A-B', 'puntos': [[0, 50], [200, 50]], 'banda_m': 10, 'medible': True}]

    # Act
    vida2, quitar, sin_abrir = abrir_calles_de_1772(ciudad, vida, set(), calles, METRO)

    # Assert
    assert vida2[0] == [2, 0] and vida2[1] == [1, 0]
    assert 2 in quitar and sin_abrir == []
    assert vida == [[0, 0], [1, 0], [1, 3]]


def test_epocas_no_toca_un_tramo_libre_ni_uno_que_no_se_mide():
    from epocas import abrir_calles_de_1772
    ciudad = {'vertices': [90, 0, 110, 0, 110, 100, 90, 100], 'techos': [[0, 4, 1, 0, 0]], 'antes': [0]}
    no_medible = [{'tramo': 'L9', 'puntos': [[0, 50], [200, 50]], 'banda_m': 10, 'medible': False}]
    assert abrir_calles_de_1772(ciudad, [[0, 0]], set(), no_medible, METRO) == ([[0, 0]], set(), [])


def test_un_extremo_sin_sector_no_hace_medible_un_tramo_de_un_sector_limite():
    r = red()
    r['nodos'][1]['sector'] = None            # B sin sector
    r['nodos'][2]['sector'] = 'S9'            # C en un sector límite
    ejes = {e['tramo']: e for e in ejes_de_red(r, a_1936, {'S1': 8.0}, limites={'S9'})}
    assert ejes['L2:B-C']['medible'] is False
    assert ejes['L1:A-B']['medible'] is True   # A sigue en un sector conocido fuera de los límites


def test_dos_tramos_seguidos_no_pasan_por_lados_distintos_de_una_casa_en_su_cruce():
    # el ejemplo de la revisión: una casa angosta justo sobre el cruce B parte las dos bandas en dos
    casa = [box(98, -100, 102, 100)]
    assert bloqueado({'puntos': [[0, 0], [100, 0]], 'banda_m': 6}, casa, METRO) is True
    assert bloqueado({'puntos': [[100, 0], [200, 0]], 'banda_m': 6}, casa, METRO) is True


def test_epocas_quita_1772_a_una_casa_de_1578_que_bloquea_una_calle_en_la_ciudad_final():
    from epocas import abrir_calles_de_1772
    # la casa 1 es de 1578 (más allá de la lista "antes", que es de 1936) y cruza la calle
    ciudad = {'vertices': [20, 0, 40, 0, 40, 40, 20, 40, 90, 0, 110, 0, 110, 100, 90, 100],
              'techos': [[0, 4, 1, 0, 0], [4, 4, 1, 0, 0]], 'antes': [0]}
    calles = [{'tramo': 'L1', 'puntos': [[0, 50], [200, 50]], 'banda_m': 10, 'medible': True}]
    vida, quitar, sin_abrir = abrir_calles_de_1772(ciudad, [[1, 0], [0, 3]], set(), calles, METRO)
    assert vida[1] == [0, 1] and vida[0] == [1, 0] and sin_abrir == []


def test_quitar_una_casa_de_1578_no_desalinea_las_listas_de_1936():
    from epocas import sin_techos
    # dos casas de 1936 (con "antes") y una de 1578 al final, sin entrada en "antes"
    ciudad = {'vertices': [0, 0, 1, 0, 1, 1, 2, 2, 3, 2, 3, 3, 5, 5, 6, 5, 6, 6], 'techos': [[0, 3], [3, 3], [6, 3]],
              'antes': [0, 1]}
    salida, vida = sin_techos(ciudad, [[1, 0], [1, 2], [0, 1]], {2})
    assert salida['antes'] == [0, 1] and len(salida['techos']) == 2 and vida == [[1, 0], [1, 2]]


def test_quitar_una_casa_de_1936_con_casas_de_1578_detras_conserva_las_listas_de_1936():
    from epocas import sin_techos
    ciudad = {'vertices': [0, 0, 1, 0, 1, 1, 2, 2, 3, 2, 3, 3, 5, 5, 6, 5, 6, 6], 'techos': [[0, 3], [3, 3], [6, 3]],
              'antes': [0, 1]}
    salida, vida = sin_techos(ciudad, [[1, 0], [1, 2], [0, 1]], {0})
    assert salida['antes'] == [1] and len(salida['techos']) == 2 and vida == [[1, 2], [0, 1]]
