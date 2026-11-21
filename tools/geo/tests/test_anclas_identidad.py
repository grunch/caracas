"""Tests de las anclas por identidad del calce de 1772 (T33j.2a): cruces de damero e hitos."""
import numpy as np

import anclas_identidad as ai


def nodo(id_, indice, original, identidad, esquina, sector='S1', nombre=None):
    return {'id': id_, 'sector': sector, 'original': list(original), 'indice': list(indice),
            'esquina_1936': esquina, 'mosaico_identidad': list(identidad), 'esquina_1936_nombre': nombre}


def reticula(n=3, paso_o=10.0, paso_m=40.0, giro_m=False):
    """Damero n × n: original a paso_o px y 1936 a paso_m px; giro_m espeja el eje j en 1936."""
    salida = []
    for i in range(n):
        for j in range(n):
            jm = -j if giro_m else j
            salida.append(nodo(f'X{i}{j}', (i, j), (100 + i * paso_o, 200 + j * paso_o),
                               (5000 + i * paso_m, 6000 + jm * paso_m), esquina=i * n + j))
    return salida


HITO = {'id': 'H1772-candelaria', 'sector': 'S9', 'centro_original': [150.0, 260.0],
        'mosaico_1936': [7000.0, 7100.0], 'nombre_1936': 'La Candelaria', 'fuente': 'ciudad.json'}


# --- anclas ------------------------------------------------------------------------------

def test_anclas_toman_el_original_y_la_esquina_de_1936_de_cada_nodo_y_cada_hito():
    # Arrange
    nodos = reticula(2)

    # Act
    anclas, omitidos = ai.anclas_de_identidad(nodos, [HITO], semillas_px=[])

    # Assert
    assert omitidos == []
    assert len(anclas) == 5
    primera = anclas[0]
    assert (primera['px'], primera['py'], primera['x36'], primera['y36']) == (100.0, 200.0, 5000.0, 6000.0)
    assert primera['id'] == 'X00' and primera['sector'] == 'S1'
    hito = anclas[-1]
    assert (hito['px'], hito['py'], hito['x36'], hito['y36']) == (150.0, 260.0, 7000.0, 7100.0)
    assert hito['id'] == 'H1772-candelaria' and 'La Candelaria' in hito['nota']


def test_un_nodo_que_coincide_con_una_semilla_no_se_repite_como_ancla():
    # Arrange: la semilla de la plaza está a 3 px del nodo X00
    nodos = reticula(2)

    # Act
    anclas, omitidos = ai.anclas_de_identidad(nodos, [], semillas_px=[(102.0, 202.0)])

    # Assert
    assert [a['id'] for a in anclas] == ['X01', 'X10', 'X11']
    assert omitidos == ['X00']


# --- validación --------------------------------------------------------------------------

def test_reticula_coherente_no_tiene_errores():
    assert ai.validar_nodos(reticula(3)) == []


def test_una_esquina_de_1936_usada_por_dos_cruces_es_un_error():
    # Arrange
    nodos = reticula(2)
    nodos[1] = {**nodos[1], 'esquina_1936': nodos[0]['esquina_1936']}

    # Act
    errores = ai.validar_nodos(nodos)

    # Assert
    assert any('esquina 1936 0' in e and 'X00' in e and 'X01' in e for e in errores)


def test_un_indice_repetido_es_un_error():
    nodos = reticula(2)
    nodos[1] = {**nodos[1], 'indice': nodos[0]['indice']}
    assert any('índice [0, 0]' in e for e in ai.validar_nodos(nodos))


def test_un_cruce_corrido_de_calle_invierte_el_orden_y_es_un_error():
    # Arrange: X11 asignado a una esquina de 1936 más allá de X21 (orden de calles distinto)
    nodos = reticula(3)
    k = next(i for i, n in enumerate(nodos) if n['id'] == 'X11')
    nodos[k] = {**nodos[k], 'mosaico_identidad': [5000 + 2.6 * 40, 6000 + 40]}

    # Act
    errores = ai.validar_nodos(nodos)

    # Assert
    assert any('orden' in e and 'X11' in e for e in errores)


def test_un_espejo_entre_original_y_1936_se_detecta_aunque_cada_lado_sea_coherente():
    errores = ai.validar_nodos(reticula(2, giro_m=True))
    assert any('orden' in e for e in errores)


# --- pliegues ----------------------------------------------------------------------------

def test_sin_pliegues_cuando_la_proyeccion_es_afin():
    def proyectar(x, y):
        return 2 * x + 0.1 * y, 0.2 * x + 3 * y
    assert ai.celdas_plegadas(proyectar, (0, 0, 100, 100), paso=10) == 0


def test_cuenta_las_celdas_donde_la_proyeccion_se_pliega():
    def proyectar(x, y):
        # se pliega para x > 50: la imagen vuelve hacia atrás
        return np.where(x <= 50, x, 100 - x), y
    plegadas = ai.celdas_plegadas(proyectar, (0, 0, 100, 100), paso=10)
    assert plegadas > 0


# --- resumen -----------------------------------------------------------------------------

def test_resumen_por_sector_da_mediana_y_maximo_del_error_dejando_uno_fuera():
    anclas = [{'id': 'a', 'sector': 'S1'}, {'id': 'b', 'sector': 'S1'}, {'id': 'c', 'sector': 'S1'},
              {'id': 'd', 'sector': 'S2'}]
    filas = ai.resumen_por_sector(anclas, loo_m=[1.0, 3.0, 20.0, 7.5], residuo_m=[0.1, 0.2, 0.3, 0.4], umbral_m=15)
    assert filas == [
        {'sector': 'S1', 'anclas': 3, 'mediana_loo_m': 3.0, 'max_loo_m': 20.0, 'mediana_residuo_m': 0.2,
         'bajo_umbral': True},
        {'sector': 'S2', 'anclas': 1, 'mediana_loo_m': 7.5, 'max_loo_m': 7.5, 'mediana_residuo_m': 0.4,
         'bajo_umbral': True},
    ]
