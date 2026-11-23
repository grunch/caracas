"""La puerta de la fase 7 de 1772: cierres y accesos (specs/08, T33j.7a)."""
import sys
from pathlib import Path

from shapely.geometry import box

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from cierre_fase7 import aberturas_de_frentes, de_fases, hitos_atravesables  # noqa: E402

METRO = 0.5


def eje(*puntos, tramo='L1:A-B', medible=True):
    return {'tramo': tramo, 'sector': 'S1', 'puntos': [list(p) for p in puntos], 'banda_m': 6.0, 'medible': medible}


def hilera(y0=12, n=8, ancho=20, fondo=30, sin=()):
    return [(k, box(10 + k * ancho, y0, 10 + (k + 1) * ancho, y0 + fondo)) for k in range(n) if k not in sin]


def test_un_frente_seguido_no_tiene_aberturas():
    assert aberturas_de_frentes([eje((0, 0), (180, 0))], hilera(), METRO) == []


def test_un_hueco_de_una_casa_en_el_frente_es_una_abertura_con_su_ancho_y_su_punto():
    # sin la casa 3 (x 70..90): un hueco de 10 m; detrás, una casa al fondo que el rayo ve
    casas = hilera(sin=(3,)) + [(9, box(70, 60, 90, 80))]
    a = aberturas_de_frentes([eje((0, 0), (180, 0))], casas, METRO)
    assert len(a) == 1 and a[0]['tramo'] == 'L1:A-B' and a[0]['lado'] == 1
    assert 9 <= a[0]['ancho_m'] <= 11
    x, y = a[0]['punto']
    assert 70 < x < 90 and 12 < y < 20                 # en el hueco, un metro detrás de la línea de fachada


def test_una_abertura_es_indebida_si_el_original_pinta_edificado_ahi():
    casas = hilera(sin=(3,)) + [(9, box(70, 60, 90, 80))]
    rojo = [box(60, 10, 100, 45)]
    a = aberturas_de_frentes([eje((0, 0), (180, 0))], casas, METRO, edificado=rojo)
    assert a[0]['indebida'] is True
    libre = aberturas_de_frentes([eje((0, 0), (180, 0))], casas, METRO, edificado=[box(200, 200, 210, 210)])
    assert libre[0]['indebida'] is False


def test_una_rendija_menor_que_una_puerta_no_es_abertura():
    casas = [(k, box(10 + k * 20 + (1 if k == 4 else 0), 12, 10 + (k + 1) * 20, 42)) for k in range(8)]
    assert aberturas_de_frentes([eje((0, 0), (180, 0))], casas, METRO) == []


def test_los_criterios_que_vienen_de_otras_fases_tienen_que_ser_de_la_misma_ciudad():
    fases = {3: {'ciudad': {'sha256': 'a'}, 'puerta_de_salida': {'calles_libres': {'cumplido': True}}},
             4: {'ciudad': {'sha256': 'a'}, 'puerta_de_salida': {'libres_sin_casas': {'cumplido': True}}},
             5: {'ciudad': {'sha256': 'a'}, 'puerta_de_salida': {'casas_con_acceso': {'cumplido': False}}}}
    r = de_fases(fases, 'a')
    assert r['pasajes_publicos_abiertos']['cumplido'] is True and r['terreno_libre_sin_casas']['cumplido'] is True
    assert r['casas_con_acceso']['cumplido'] is False
    assert de_fases(fases, 'b')['pasajes_publicos_abiertos']['cumplido'] is False


def test_un_hito_es_atravesable_si_un_punto_de_su_planta_no_choca():
    hitos = [{'id': 'catedral', 'nace': 0, 'muere': 0, 'planta': [[[0, 0], [20, 0], [20, 20], [0, 20]]]}]
    assert hitos_atravesables(hitos, lambda x, y: False) == ['catedral']
    assert hitos_atravesables(hitos, lambda x, y: True) == []


def test_la_planta_de_un_hito_transitable_no_se_cuenta_como_pared():
    # la Plaza Bolívar: su planta es la plaza entera, que se camina (chocan sus piezas, no la planta)
    hitos = [{'id': 'plaza-bolivar', 'nace': 0, 'muere': 0, 'transitable': True, 'planta': [[[0, 0], [9, 0], [9, 9], [0, 9]]]},
             {'id': 'catedral', 'nace': 0, 'muere': 0, 'planta': [[[20, 0], [30, 0], [30, 9], [20, 9]]]}]
    assert hitos_atravesables(hitos, lambda x, y: False) == ['catedral']


def test_un_hito_que_ocupa_parte_del_frente_no_es_una_abertura():
    # revisión de #151: la planta de un hito tapa el hueco de la casa 3; el rayo pega en ella, no en el fondo
    casas = hilera(sin=(3,)) + [(9, box(70, 60, 90, 80))]
    rojo = [box(60, 10, 100, 45)]
    planta = [box(70, 12, 90, 42)]
    assert aberturas_de_frentes([eje((0, 0), (180, 0))], casas, METRO, obstaculos=planta, edificado=rojo) == []
def test_el_punto_de_prueba_de_un_hito_esta_junto_al_borde_de_su_planta():
    # revisión de #152: la planta grande choca en su crujía, no en el patio: el punto se prueba 2 m adentro del borde
    from cierre_fase7 import puntos_de_hitos
    hitos = [{'id': 'capitolio', 'nace': 1, 'muere': 0, 'planta': [[[0, 0], [184, 0], [184, 216], [0, 216]]]}]
    (i, (x, y)), *_ = puntos_de_hitos(hitos)
    assert min(x, y, 184 - x, 216 - y) <= 4 + 1e-6


def test_una_abertura_registrada_como_limite_no_impide_cerrar_y_una_mas_ancha_si():
    # límites de la fase 7 (decisión del 23-11-2026): la abertura se reconoce por su tramo, su lado y su punto (a menos
    # de PUNTO_M); cuenta como límite solo si no pasa su ancho máximo
    from cierre_fase7 import con_limites_fase7
    aberturas = [
        {'tramo': 'L1:A-B', 'lado': 1, 'segmento': 0, 'ancho_m': 14.0, 'punto': [100.0, 50.0], 'indebida': True},
        {'tramo': 'L1:A-B', 'lado': -1, 'segmento': 0, 'ancho_m': 3.0, 'punto': [100.0, 50.0], 'indebida': True},
        {'tramo': 'L2:C-D', 'lado': 1, 'segmento': 0, 'ancho_m': 9.0, 'punto': [300.0, 50.0], 'indebida': True},
        {'tramo': 'L2:C-D', 'lado': 1, 'segmento': 0, 'ancho_m': 30.0, 'punto': [400.0, 50.0], 'indebida': False},
    ]
    limites = {'aberturas': [
        {'tramo': 'L1:A-B', 'lado': 1, 'punto': [101.0, 50.5], 'ancho_maximo_m': 14.0, 'clase': 'cierre_rompe_otra_fase'},
        {'tramo': 'L2:C-D', 'lado': 1, 'punto': [300.0, 50.0], 'ancho_maximo_m': 6.0, 'clase': 'edificado_sin_casas'},
    ]}
    salida = con_limites_fase7(aberturas, limites, metro=0.5)
    assert [a.get('limite') for a in salida] == ['cierre_rompe_otra_fase', None, None, None]
    assert [a for a in salida if a['indebida'] and not a.get('limite')] == [salida[1], salida[2]]


def test_la_puerta_de_la_fase_7_cierra_con_las_indebidas_en_limite():
    from cierre_fase7 import puerta_fase7
    from shapely.geometry import box as caja
    casas = [caja(10 + k * 20, 12, 10 + (k + 1) * 20, 42) for k in range(8) if k != 3]
    vertices, techos = [], []
    for f in casas:
        puntos = list(f.exterior.coords)[:-1]
        techos.append([len(vertices) // 2, len(puntos), 1, 0, 0])
        vertices.extend(c for p in puntos for c in p)
    ciudad = {'vertices': vertices, 'techos': techos, 'vida': [[1, 0]] * len(casas)}
    eje = [{'tramo': 'L1:A-B', 'sector': 'S1', 'puntos': [[0, 0], [180, 0]], 'banda_m': 6.0, 'medible': True}]
    rojo = [caja(60, 10, 100, 45)]
    fases = {k: {'ciudad': {'sha256': 'x'}, 'puerta_de_salida': {
        'calles_libres': {'cumplido': True}, 'libres_sin_casas': {'cumplido': True},
        'casas_con_acceso': {'cumplido': True}}} for k in (3, 4, 5)}
    sin = puerta_fase7(ciudad, eje, [], fases, 'x', rojo, lambda x, y: True)
    assert not sin['fase_7_cerrable']
    (a,) = [a for a in sin['sin_aberturas_indebidas']['lista'] if a['indebida']]
    limites = {'aberturas': [{'tramo': a['tramo'], 'lado': a['lado'], 'punto': a['punto'], 'ancho_maximo_m': a['ancho_m'],
                              'clase': 'edificado_sin_casas'}]}
    con = puerta_fase7(ciudad, eje, [], fases, 'x', rojo, lambda x, y: True, limites=limites)
    assert con['sin_aberturas_indebidas']['indebidas_en_limite'] == 1
    assert con['fase_7_cerrable']
