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


def test_una_celda_plegada_solo_en_su_esquina_inferior_derecha_cuenta():
    # el triángulo de arriba a la izquierda conserva el giro; el de abajo a la derecha lo invierte
    def proyectar(x, y):
        return x * (1 - 0.2 * y), y
    assert ai.celdas_plegadas(proyectar, (0, 0, 10, 10), paso=10) == 1


def test_una_celda_plegada_en_la_esquina_superior_derecha_cuenta_aunque_la_otra_diagonal_conserve_el_giro():
    # sup_izq, sup_der, inf_izq, inf_der → (0,0), (2,5), (0,10), (10,10): giro +20 y +50 en una diagonal, −30 en sup_der
    esquinas = {(0.0, 0.0): (0, 0), (10.0, 0.0): (2, 5), (0.0, 10.0): (0, 10), (10.0, 10.0): (10, 10)}

    def proyectar(x, y):
        destino = np.array([esquinas[(float(a), float(b))] for a, b in zip(x, y)], float)
        return destino[:, 0], destino[:, 1]
    assert ai.celdas_plegadas(proyectar, (0, 0, 10, 10), paso=10) == 1


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


def test_un_borde_espejado_que_solo_forma_triangulo_con_los_otros_dos_vecinos_es_un_error():
    # Arrange: (0,0), (1,0), (1,1) no forman ninguno de los triángulos (i+1,j)(i,j+1) ni (i-1,j)(i,j-1)
    nodos = [nodo('A', (0, 0), (0, 0), (0, 0), 0), nodo('B', (1, 0), (10, 0), (10, 0), 1),
             nodo('C', (1, 1), (10, 10), (10, -10), 2)]

    # Act
    errores = ai.validar_nodos(nodos)

    # Assert
    assert any('orden' in e and 'A' in e and 'B' in e and 'C' in e for e in errores)


def test_reticula_coherente_sigue_sin_errores_con_los_cuatro_triangulos_por_nodo():
    assert ai.validar_nodos(reticula(4, paso_o=7.0, paso_m=31.0)) == []


# --- esquinas de 1936 que son rótulos, no cruces -----------------------------------------------

def calles_en_cruz(n=81, ancho=7):
    """Máscara de calles: una calle horizontal y una vertical que se cruzan en el centro (40, 40)."""
    m = np.zeros((n, n), np.uint8)
    c = n // 2
    m[c - ancho // 2:c + ancho // 2 + 1, :] = 1
    m[:, c - ancho // 2:c + ancho // 2 + 1] = 1
    return m


def test_la_distancia_al_nudo_es_cero_en_el_cruce_y_crece_a_lo_largo_de_la_calle():
    # Arrange
    m = calles_en_cruz()

    # Act
    en_cruce = ai.distancia_a_nudo_px(m, (40, 40))
    sobre_la_calle = ai.distancia_a_nudo_px(m, (40, 70))

    # Assert
    assert en_cruce <= 2
    assert 27 <= sobre_la_calle <= 32


def test_sin_calles_alrededor_no_hay_nudo():
    assert ai.distancia_a_nudo_px(np.zeros((40, 40), np.uint8), (20, 20)) is None


def test_una_esquina_sin_cota_lejos_de_todo_nudo_se_excluye_y_una_con_cota_se_conserva():
    # Arrange: X00 con cota lejos de un nudo, X01 sin cota en un cruce, X10 sin cota lejos (un rótulo)
    nodos = reticula(2)
    esquinas = {0: {'nombre': 'A', 'cota_m': 900.1}, 1: {'nombre': 'B', 'cota_m': None},
                2: {'nombre': 'C', 'cota_m': None}, 3: {'nombre': 'D', 'cota_m': 901.0}}
    distancia_m = {'X00': 20.0, 'X01': 1.0, 'X10': 15.0, 'X11': None}

    # Act
    conservados, excluidos = ai.excluir_rotulos(nodos, esquinas, distancia_m, umbral_m=4)

    # Assert
    assert [n['id'] for n in conservados] == ['X00', 'X01', 'X11']
    assert excluidos == [{'id': 'X10', 'esquina_1936': 2, 'nombre': 'C', 'distancia_nudo_m': 15.0}]


def test_una_esquina_sin_cota_sin_ningun_nudo_cerca_tambien_se_excluye():
    nodos = reticula(2)[:1]
    _, excluidos = ai.excluir_rotulos(nodos, {0: {'nombre': 'A', 'cota_m': None}}, {'X00': None}, umbral_m=4)
    assert excluidos == [{'id': 'X00', 'esquina_1936': 0, 'nombre': 'A', 'distancia_nudo_m': None}]
