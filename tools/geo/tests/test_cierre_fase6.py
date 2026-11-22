"""La puerta de la fase 6 de 1772: cubiertas (specs/08, T33j.6a)."""
import sys
from pathlib import Path

from shapely.geometry import box

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from cierre_fase6 import (aleros_en_la_calle, cumbreras_desviadas, mismo_trazado, techos_cruzados,  # noqa: E402
                          triangulos_degenerados)

METRO = 0.5


def tri(techo, *puntos, tipo=1, cumbre=(False, False, False)):
    return {'techo': techo, 'tipo': tipo, 'cumbre': list(cumbre), 'puntos': [list(p) for p in puntos]}


def dos_aguas(techo, x0, x1, y0, y1, alto=5.0, cumbrera=2.0):
    """Un tejado a dos aguas sobre el rectángulo (px), con la cumbrera a lo largo de x, a media altura de y."""
    ym = (y0 + y1) / 2
    c = (True, True, False)
    return [tri(techo, (x0, ym, alto + cumbrera), (x1, ym, alto + cumbrera), (x0, y0, alto), cumbre=c),
            tri(techo, (x1, ym, alto + cumbrera), (x1, y0, alto), (x0, y0, alto), cumbre=(True, False, False)),
            tri(techo, (x0, ym, alto + cumbrera), (x1, ym, alto + cumbrera), (x0, y1, alto), cumbre=c),
            tri(techo, (x1, ym, alto + cumbrera), (x1, y1, alto), (x0, y1, alto), cumbre=(True, False, False))]


def test_un_triangulo_sin_area_o_de_altura_nula_es_degenerado():
    bueno = tri(1, (0, 0, 5), (10, 0, 5), (0, 10, 6))
    plano = tri(2, (0, 0, 5), (10, 0, 5), (20, 0, 5))                 # tres puntos en línea
    aguja = tri(3, (0, 0, 5), (40, 0, 5), (20, 0.0005, 5))            # altura de 0,25 mm
    assert [t['techo'] for t in triangulos_degenerados([bueno, plano, aguja], METRO)] == [2, 3]


def test_dos_tejados_que_se_atraviesan_se_cruzan_y_dos_contiguos_no():
    a = dos_aguas(1, 0, 20, 0, 20)
    b = dos_aguas(2, 20, 40, 0, 20)                                    # contiguo: comparten el borde
    c = dos_aguas(3, 10, 30, 5, 25, alto=5.5)                          # encima de los dos, cortándolos
    pares = techos_cruzados(a + b, METRO)
    assert pares == []
    assert {tuple(p['techos']) for p in techos_cruzados(a + b + c, METRO)} == {(1, 3), (2, 3)}


def test_la_cumbrera_tiene_que_ir_con_la_calle_de_su_frente():
    # la calle corre a lo largo de x en y = 0; dos casas al norte: una con la cumbrera a lo largo de x, otra a lo largo de y
    con = dos_aguas(1, 10, 30, 10, 40)
    girada = [{**t, 'puntos': [[p[1], p[0], p[2]] for p in t['puntos']]} for t in dos_aguas(2, 10, 40, 40, 60)]
    frentes = {1: [((1.0, 0.0), (0.0, 0.0), 'L1:A-B', 1, 0)], 2: [((1.0, 0.0), (0.0, 0.0), 'L1:A-B', 1, 0)]}
    desviadas = cumbreras_desviadas(con + girada, frentes, METRO)
    assert [d['techo'] for d in desviadas] == [2] and abs(desviadas[0]['giro_grados'] - 90) < 1


def test_un_alero_que_entra_en_la_calzada_bloquea_la_calle():
    casa = [tri(1, (0, 10, 5), (20, 10, 5), (0, 30, 5))]
    sobre = [tri(2, (0, -3, 5), (20, -3, 5), (0, 20, 5))]             # entra 3 px en la calzada (y < 0)
    calzada = [box(-100, -20, 100, 0)]
    assert [x['techo'] for x in aleros_en_la_calle(casa + sobre, calzada, METRO)] == [2]


def test_el_trazado_es_el_de_la_fase_5_si_las_tres_puertas_cierran_sobre_la_misma_ciudad():
    fases = {k: {'ciudad': {'sha256': 'abc'}, 'puerta_de_salida': {f'fase_{k}_cerrable': True}} for k in (3, 4, 5)}
    assert mismo_trazado(fases, 'abc')['cumplido'] is True
    assert mismo_trazado(fases, 'otra')['cumplido'] is False
    fases[4]['puerta_de_salida']['fase_4_cerrable'] = False
    assert mismo_trazado(fases, 'abc')['cumplido'] is False


def test_se_elige_la_cumbrera_mas_cercana_al_eje_por_su_segmento_no_por_su_punto_medio():
    # revisión de #138: la perpendicular va de y = 2 a 42 px (cerca del eje), la paralela está en y = 16; sus puntos
    # medios quedan al revés (22 y 16)
    c = (True, True, False)
    perpendicular = tri(1, (0, 2, 7), (0, 42, 7), (4, 2, 5), cumbre=c)
    paralela = tri(1, (2, 16, 7), (10, 16, 7), (2, 20, 5), cumbre=c)
    frentes = {1: [((1.0, 0.0), (0.0, 0.0), 'L1:A-B', 1, 0)]}
    desviadas = cumbreras_desviadas([perpendicular, paralela], frentes, METRO)
    assert [d['techo'] for d in desviadas] == [1]
    assert cumbreras_desviadas([paralela], frentes, METRO) == []


def test_las_cubiertas_tienen_que_ser_de_los_datos_que_se_miden():
    # revisión de #138: el pak, el relieve y las huellas de la ciudad medida; con todo igual, se reutilizan
    from cierre_fase6 import cubiertas_de_estos_datos
    datos = {'pak_sha256': 'p', 'relieve_sha256': 'r', 'huellas_sha256': 'h'}
    cubiertas = {**datos, 'triangulos': []}
    assert cubiertas_de_estos_datos(cubiertas, datos) is None
    assert 'pak' in cubiertas_de_estos_datos(cubiertas, {**datos, 'pak_sha256': 'otro'})
    assert 'relieve' in cubiertas_de_estos_datos(cubiertas, {**datos, 'relieve_sha256': 'otro'})
    assert 'huellas' in cubiertas_de_estos_datos(cubiertas, {**datos, 'huellas_sha256': 'otro'})
    assert cubiertas_de_estos_datos({'triangulos': []}, datos) is not None     # sin procedencia no se acepta


def test_la_huella_de_la_ciudad_es_la_de_sus_vertices_y_techos_en_float32_como_en_el_pak():
    import hashlib
    import numpy as np
    from cierre_fase6 import huellas_sha256
    ciudad = {'vertices': [0, 0, 10, 0, 10.1, 10], 'techos': [[0, 3, 2, 0, 9]]}
    esperado = hashlib.sha256(np.array([0, 0, 10, 0, 10.1, 10], '<f4').tobytes()
                              + np.array([0, 3], '<u4').tobytes()).hexdigest()
    assert huellas_sha256(ciudad) == esperado
    assert huellas_sha256({**ciudad, 'vertices': [0, 0, 10, 0, 10.2, 10]}) != esperado


def test_en_una_union_en_t_la_cumbrera_del_frente_gana_el_empate():
    # el ala lateral nace en la cumbrera del frente: las dos quedan a la misma distancia del eje
    c = (True, True, False)
    frente = tri(1, (0, 16, 7), (40, 16, 7), (0, 20, 5), cumbre=c)
    ala = tri(1, (20, 16, 7), (20, 50, 7), (24, 16, 5), cumbre=c)
    frentes = {1: [((1.0, 0.0), (0.0, 0.0), 'L1:A-B', 1, 0)]}
    assert cumbreras_desviadas([ala, frente], frentes, METRO) == []


def test_una_casa_fuera_de_la_recta_de_un_frente_no_se_mide_en_ese_frente():
    # la fase 5 la ve por una abertura de ese frente: no es su fachada
    girada = [{**t, 'puntos': [[p[1], p[0], p[2]] for p in t['puntos']]} for t in dos_aguas(2, 10, 40, 40, 60)]
    frentes = {2: [((1.0, 0.0), (0.0, 0.0), 'L1:A-B', 1, 0)]}
    assert [d['techo'] for d in cumbreras_desviadas(girada, frentes, METRO)] == [2]
    assert cumbreras_desviadas(girada, frentes, METRO, fuera_de_recta={(2, 'L1:A-B', 1, 0)}) == []
