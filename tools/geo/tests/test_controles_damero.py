"""Auxiliares de la CLI de controles de damero: medidas puras sobre datos sintéticos."""
import math

from shapely.geometry import MultiPoint, box

from controles_damero import (
    HITOS, angulo_damero, comparar_con_nucleo, controles_por_hito, cuadras_visibles, poligonos_unidades,
    resumen_por_sector,
)
from damero_recortes import caja


def girar(u, v, grados=12.0, paso=220.0):
    a = math.radians(grados)
    return [1000 + paso * (u * math.cos(a) - v * math.sin(a)), 1000 + paso * (u * math.sin(a) + v * math.cos(a))]


def test_angulo_damero_recupera_el_giro_de_una_reticula():
    puntos = [girar(u, v) for u in range(-3, 4) for v in range(-3, 4)]
    assert abs(angulo_damero(puntos) - 12.0) < 0.05


def test_resumen_por_sector_con_y_sin_controles():
    nodos = [{'sector': 'A', 'desvio_m': 3.0}, {'sector': 'A', 'desvio_m': 4.0}, {'sector': 'B', 'desvio_m': 10.0}]
    r = resumen_por_sector(nodos, [{'id': 'A'}, {'id': 'B'}, {'id': 'C'}])
    assert r[0] == {'sector': 'A', 'controles': 2, 'rms_m': 3.54, 'mediana_m': 3.5, 'max_m': 4.0}
    assert r[2] == {'sector': 'C', 'controles': 0, 'rms_m': None, 'mediana_m': None, 'max_m': None}


def test_comparar_con_nucleo_empareja_por_pixel_del_original():
    nodos = [{'id': 'X1', 'original': [1104.0, 793.0], 'desvio_m': 11.7, 'mosaico_identidad': [8950.0, 6450.0]}]
    nucleo = [{'id': 'N1', 'original': [1104, 793], 'desvio_m': 11.0, 'mosaico_referencia': [8945.6, 6448.8]},
              {'id': 'N2', 'original': [1300, 793], 'desvio_m': 5.0, 'mosaico_referencia': [0, 0]}]
    filas = comparar_con_nucleo(nodos, nucleo)
    assert filas[0] == {'nodo_curado': 'N1', 'desvio_curado_m': 11.0, 'nodo_damero': 'X1', 'desvio_damero_m': 11.7,
                        'distancia_esquina_vs_curado_m': 2.28}
    assert filas[1]['nodo_damero'] is None and filas[1]['distancia_esquina_vs_curado_m'] is None


def test_cuadras_visibles_agrupa_huellas_vivas_por_cuadra_y_omite_las_demas():
    ciudad = {
        'vertices': [0, 0, 10, 0, 10, 10, 0, 10,  20, 0, 30, 0, 30, 10, 20, 10,  50, 50, 60, 50, 60, 60, 50, 60,  0, 0, 1, 0, 1, 1],
        'techos': [[0, 4], [4, 4], [8, 4], [12, 3]],
        'vida': [[0, 0], [1, 0], [2, 0], [0, 0]],      # la tercera nace después de 1772; la cuarta no tiene cuadra
        'cuadras': [7, 7, 9],
    }
    cuadras = cuadras_visibles(ciudad, epoca=1)
    assert [c['id'] for c in cuadras] == [7] and cuadras[0]['huellas'] == 2
    assert cuadras[0]['poligono'].covers(box(0.5, 0.5, 9.5, 9.5)) and cuadras[0]['poligono'].covers(box(20.5, 0.5, 29.5, 9.5))


def test_poligonos_unidades_proyecta_las_cuatro_esquinas_y_marca_extrapoladas():
    unidades = [{'id_fuente': 'U1', 'sector': 'S', 'bbox_original': [0, 0, 10, 10], 'revision_original': {'ocupacion': 'continua'}},
                {'id_fuente': 'U2', 'sector': 'S', 'bbox_original': [100, 100, 110, 110], 'revision_original': {'ocupacion': 'plaza'}}]
    casco = MultiPoint([(0, 0), (50, 0), (50, 50), (0, 50)]).convex_hull
    filas = poligonos_unidades(unidades, lambda x, y: (2 * x, 2 * y), casco)
    assert filas[0]['poligono'].equals(box(0, 0, 20, 20)) and filas[0]['extrapolada'] is False
    assert filas[0]['centro_original'] == (5.0, 5.0)
    assert filas[1]['extrapolada'] is True and filas[1]['ocupacion'] == 'plaza'


def test_controles_por_hito_miden_los_dos_calces_contra_el_hito_de_1936():
    hitos = [{'id': 'prueba', 'unidad': 'U1', 'nombre_1936': 'x', 'mosaico_1936': [100.0, 100.0], 'fuente': 'test'}]
    unidades = {'U1': {'bbox_original': [0, 0, 10, 10], 'sector': 'S'}}
    filas = controles_por_hito(hitos, unidades, proyectar_calce=lambda x, y: (x + 110, y + 100), proyectar_control=lambda x, y: (x + 95, y + 95), metro=0.5)
    assert filas == [{'id': 'prueba', 'unidad': 'U1', 'sector': 'S', 'centro_original': [5.0, 5.0], 'mosaico_1936': [100.0, 100.0],
                      'nombre_1936': 'x', 'fuente': 'test', 'desvio_tps_m': 7.91, 'desvio_control_m': 0.0}]
    assert {h['unidad'] for h in HITOS} >= {'U1772-0214', 'U1772-0267'}


def test_caja_recorta_al_borde_de_la_imagen():
    assert caja((10, 10), 20, (100, 200)) == [0, 0, 30, 30]
    assert caja((190, 95), 20, (100, 200)) == [170, 75, 200, 100]
