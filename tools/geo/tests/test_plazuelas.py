"""Las plazuelas de 1772 que la referencia no registraba (censo final, T33j.8c): sin casas en 1772."""
from shapely.geometry import box

from plazuelas import FRACCION_DENTRO, cargar_plazuelas, en_plazuela


def test_las_plazuelas_se_llevan_del_original_a_1936_por_el_calce():
    registro = {'plazuelas': [{'id': 'P1', 'contorno_original': [[10, 10], [20, 10], [20, 30], [10, 30]]}]}
    (p,) = cargar_plazuelas(registro, lambda xs, ys: ([x * 10 for x in xs], [y * 10 + 5 for y in ys]))
    assert p['id'] == 'P1' and p['poligono'].bounds == (100, 105, 200, 305)


def test_una_casa_esta_en_la_plazuela_si_tiene_dentro_al_menos_la_fraccion():
    plazuela = [box(0, 0, 100, 100)]
    assert FRACCION_DENTRO == 0.5
    assert en_plazuela(box(40, 40, 60, 60), plazuela)                  # entera
    assert en_plazuela(box(90, 0, 110, 20), plazuela)                  # la mitad
    assert not en_plazuela(box(95, 0, 115, 20), plazuela)              # un cuarto: el calce la corre, no es de la plazuela
    assert not en_plazuela(box(200, 200, 210, 210), plazuela)
