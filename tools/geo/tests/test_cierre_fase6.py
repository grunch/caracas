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


def test_dos_techos_que_solo_se_tocan_en_la_medianera_con_ruido_de_float32_no_se_cruzan():
    # 4 m de medianera; la vecina la pisa 0,1 mm (Float32 a 300 m del origen) con alturas que se cruzan sobre ella
    a = tri(1, (0, 0, 8.5), (0, 8, 10.5), (-10, 4, 9.0))
    b = tri(2, (-0.0002, 0, 10.0), (-0.0002, 8, 8.4), (10, 4, 9.0))
    assert techos_cruzados([a, b], METRO) == []
    # 5 mm de solape ya no es un contacto: es un cruce
    c = tri(2, (-0.01, 0, 10.0), (-0.01, 8, 8.4), (10, 4, 9.0))
    assert [p['techos'] for p in techos_cruzados([a, c], METRO)] == [[1, 2]]


def test_el_techo_sobre_la_propia_huella_no_es_un_alero_aunque_pise_la_calzada():
    # la huella misma entra 1 px en la calzada (lo mide la fase 3): su techo no es un alero; lo que vuela más allá, sí
    casa = [tri(1, (0, -1, 5), (20, -1, 5), (0, 20, 5))]
    huellas = {1: box(-5, -1, 25, 30)}
    calzada = [box(-100, -20, 100, 0)]
    assert aleros_en_la_calle(casa, calzada, METRO, huellas=huellas) == []
    vuela = [tri(1, (0, -3, 5), (20, -3, 5), (0, 20, 5))]
    assert [x['techo'] for x in aleros_en_la_calle(vuela, calzada, METRO, huellas=huellas)] == [1]


def test_las_casas_medidas_son_las_que_tienen_algun_frente_que_se_mide():
    from cierre_fase6 import casas_con_cumbrera_medible
    girada = [{**t, 'puntos': [[p[1], p[0], p[2]] for p in t['puntos']]} for t in dos_aguas(2, 10, 40, 40, 60)]
    frentes = {2: [((1.0, 0.0), (0.0, 0.0), 'L1:A-B', 1, 0)]}
    assert casas_con_cumbrera_medible(girada, frentes, METRO) == {2}
    assert casas_con_cumbrera_medible(girada, frentes, METRO, fuera_de_recta={(2, 'L1:A-B', 1, 0)}) == set()


def test_los_limites_de_la_fase_6_se_reconocen_por_el_centro_de_la_huella():
    from cierre_fase6 import con_limites_fase6
    huellas = {7: box(0, 0, 10, 10), 8: box(10, 0, 20, 10), 9: box(30, 0, 40, 10)}
    desviadas = [{'techo': 7, 'giro_grados': 85.0}, {'techo': 9, 'giro_grados': 60.0}]
    cruces = [{'techos': [7, 8], 'pares_de_triangulos': 2, 'area_proyectada_m2': 0.05}]
    limites = {'cumbreras': [{'centro': [5.4, 5.0], 'clase': 'esquina'}],
               'cruces': [{'centros': [[5, 5], [15, 5]], 'clase': 'contacto_de_esquina', 'area_maxima_m2': 0.06}]}
    d, c = con_limites_fase6(desviadas, cruces, huellas, limites)
    assert [x.get('limite') for x in d] == ['esquina', None]
    assert c[0]['limite'] == 'contacto_de_esquina'
    # un cruce que creció más que lo registrado vuelve a contar
    mayor = [{**cruces[0], 'area_proyectada_m2': 0.5}]
    assert con_limites_fase6([], mayor, huellas, limites)[1][0].get('limite') is None


def test_la_tolerancia_del_centro_de_los_limites_es_un_metro_con_cualquier_metro():
    # revisión de #150: con metro = 1, centros a 1,5 px (1,5 m) no son la misma casa
    from cierre_fase6 import con_limites_fase6
    huellas = {7: box(0, 0, 10, 10)}
    limites = {'cumbreras': [{'centro': [6.5, 5.0], 'clase': 'esquina'}]}
    d, _ = con_limites_fase6([{'techo': 7, 'giro_grados': 85.0}], [], huellas, limites, metro=1.0)
    assert d[0].get('limite') is None
    d, _ = con_limites_fase6([{'techo': 7, 'giro_grados': 85.0}], [], huellas, limites, metro=0.5)
    assert d[0]['limite'] == 'esquina'
