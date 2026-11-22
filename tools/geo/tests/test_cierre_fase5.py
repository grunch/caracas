import sys
from pathlib import Path

from shapely.geometry import box

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from cierre_fase5 import casas_sin_acceso, frentes_desalineados, puerta_fase5, solapes  # noqa: E402

METRO = 0.5


def ciudad(*casas, vidas=None):
    vertices, techos = [], []
    for x0, y0, x1, y1 in casas:
        techos.append([len(vertices) // 2, 4, 2, 0, 0])
        vertices += [x0, y0, x1, y0, x1, y1, x0, y1]
    return {'vertices': vertices, 'techos': techos, 'vida': vidas or [[0, 0]] * len(casas)}


def eje(*puntos, tramo='L1:A-B', medible=True):
    return {'tramo': tramo, 'sector': 'S1', 'puntos': [list(p) for p in puntos], 'banda_m': 6.0, 'medible': medible}


def hilera(y0, n=6, ancho=20, fondo=30, salto=None):
    """Una hilera de casas pegadas al norte de un eje horizontal en y = 0, con la fachada en y0 (px)."""
    salto = salto or {}
    return [(10 + k * ancho, y0 + salto.get(k, 0), 10 + (k + 1) * ancho, y0 + salto.get(k, 0) + fondo) for k in range(n)]


def test_una_hilera_con_la_fachada_recta_esta_alineada():
    casas = [(k, box(*c)) for k, c in enumerate(hilera(12))]
    r = frentes_desalineados([eje((0, 0), (140, 0))], casas, metro=METRO)
    assert r['desalineados'] == []
    assert r['frentes_medidos'] == 1 and r['casas_medidas'] == 6


def test_una_casa_retirada_de_la_linea_de_fachada_esta_desalineada():
    casas = [(k, box(*c)) for k, c in enumerate(hilera(12, salto={3: 4}))]   # 4 px = 2 m de retiro
    r = frentes_desalineados([eje((0, 0), (140, 0))], casas, metro=METRO)
    assert [c['techo'] for f in r['desalineados'] for c in f['casas']] == [3]
    assert r['desalineados'][0]['casas'][0]['desvio_m'] == 2.0


def test_un_frente_oblicuo_al_eje_sigue_alineado_si_es_recto():
    # la fachada de 1936 no es paralela al eje de la referencia: lo que cuenta es que sea una recta
    from shapely import affinity
    casas = [(k, affinity.skew(box(*c), ys=3, origin=(0, 0))) for k, c in enumerate(hilera(12))]
    r = frentes_desalineados([eje((0, 0), (140, 0))], casas, metro=METRO)
    assert r['desalineados'] == []


def test_los_tramos_no_medibles_no_se_miden():
    casas = [(k, box(*c)) for k, c in enumerate(hilera(12, salto={3: 4}))]
    r = frentes_desalineados([eje((0, 0), (140, 0), medible=False)], casas, metro=METRO)
    assert r['frentes_medidos'] == 0 and r['desalineados'] == []


def test_un_hito_corta_el_rayo_y_lo_de_atras_no_cuenta_como_fachada():
    casas = [(k, box(*c)) for k, c in enumerate(hilera(12)) if k not in (2, 3)] + [(9, box(60, 40, 80, 50))]
    r = frentes_desalineados([eje((0, 0), (140, 0))], casas, metro=METRO, obstaculos=[box(50, 10, 90, 38)])
    assert r['desalineados'] == []


def test_dos_casas_que_se_pisan_son_un_solape_y_las_que_comparten_medianera_no():
    casas = [(0, box(0, 0, 10, 10)), (1, box(10, 0, 20, 10)), (2, box(19, 0, 30, 10))]
    r = solapes(casas, metro=METRO)
    assert r['pares'] == 1 and r['mayor_m2'] == 2.5
    assert r['mayores'] == [{'techos': [1, 2], 'area_m2': 2.5}]


def test_una_huella_invalida_se_reporta():
    from shapely.geometry import Polygon
    corbata = Polygon([(0, 0), (10, 10), (10, 0), (0, 10)])
    assert solapes([(0, corbata)], metro=METRO)['invalidas'] == [0]


def test_una_casa_encerrada_por_las_demas_no_tiene_acceso():
    # un anillo de casas alrededor de un patio, con una casa que solo da al patio
    anillo = [(0, 0, 60, 20), (0, 20, 20, 60), (40, 20, 60, 60), (0, 60, 60, 80)]
    casas = [(k, box(*c)) for k, c in enumerate(anillo)] + [(9, box(25, 25, 35, 35))]
    assert casas_sin_acceso(casas, metro=METRO)['sin_acceso'] == [9]


def test_una_casa_de_esquina_y_una_de_fondo_con_salida_tienen_acceso():
    casas = [(0, box(0, 0, 20, 20)), (1, box(20, 0, 40, 20)), (2, box(0, 20, 20, 60))]
    assert casas_sin_acceso(casas, metro=METRO)['sin_acceso'] == []


def test_la_puerta_exige_los_cuatro_criterios():
    c = ciudad(*hilera(12))
    p = puerta_fase5(c, [eje((0, 0), (140, 0))], hitos=[], fase3={'fase_3_cerrable': True}, metro=METRO)
    assert p['fase_5_cerrable'] is True
    assert set(k for k, v in p.items() if isinstance(v, dict) and 'cumplido' in v) == {
        'frentes_alineados', 'lotes_sin_solapes', 'casas_con_acceso', 'calle_aprobada'}
    p = puerta_fase5(c, [eje((0, 0), (140, 0))], hitos=[], fase3={'fase_3_cerrable': False}, metro=METRO)
    assert p['fase_5_cerrable'] is False and p['calle_aprobada']['cumplido'] is False


def test_la_puerta_mide_solo_las_casas_visibles_de_1772():
    # la casa 6 pisa a la 5, pero nace después de 1772
    casas = hilera(12) + [(110, 12, 140, 42)]
    vidas = [[0, 0]] * 6 + [[3, 0]]
    p = puerta_fase5(ciudad(*casas, vidas=vidas), [eje((0, 0), (140, 0))], hitos=[], fase3={'fase_3_cerrable': True},
                     metro=METRO)
    assert p['lotes_sin_solapes']['pares'] == 0 and p['casas_1772'] == 6


def test_con_dos_casas_corridas_la_recta_es_la_de_la_mayoria():
    casas = [(k, box(*c)) for k, c in enumerate(hilera(12, salto={2: 4, 3: 4}))]
    r = frentes_desalineados([eje((0, 0), (140, 0))], casas, metro=METRO)
    assert sorted(c['techo'] for f in r['desalineados'] for c in f['casas']) == [2, 3]


def test_una_casa_cuenta_una_vez_aunque_quede_desalineada_en_dos_frentes():
    # la casa 1 es una cuña: sale de la recta del frente norte y del sur de la misma calle
    casas = [(0, box(10, 12, 50, 42)), (1, box(50, 16, 70, 42)), (2, box(70, 12, 130, 42)),
             (3, box(10, -42, 50, -12)), (4, box(50, -42, 70, -16)), (5, box(70, -42, 130, -12))]
    p = puerta_fase5(ciudad(*[c.bounds for _, c in casas]), [eje((0, 0), (140, 0))], hitos=[],
                     fase3={'fase_3_cerrable': True}, metro=METRO)
    f = p['frentes_alineados']
    assert f['casas_desalineadas'] == 2 and sum(len(x['casas']) for x in f['desalineados']) == 2
    unica = puerta_fase5(ciudad((10, 12, 50, 42), (50, 16, 70, 42), (70, 12, 130, 42)),
                         [eje((0, 0), (140, 0)), eje((0, 1), (140, 1), tramo='L2:A-B')], hitos=[],
                         fase3={'fase_3_cerrable': True}, metro=METRO)['frentes_alineados']
    assert unica['casas_desalineadas'] == 1 and sum(len(x['casas']) for x in unica['desalineados']) == 2


def test_las_medianeras_laterales_no_cuentan_como_acceso():
    # la casa del medio tiene 1,5 m de frente: no le alcanza aunque la banda roce sus medianeras
    casas = [(0, box(0, 0, 20, 20)), (1, box(20, 0, 23, 20)), (2, box(23, 0, 43, 20)), (3, box(0, 20, 43, 40))]
    assert casas_sin_acceso(casas, metro=METRO)['sin_acceso'] == [1]
