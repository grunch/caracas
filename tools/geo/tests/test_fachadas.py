"""Una línea de fachada por frente recto en la reconstrucción de 1772 (T33j.5d, specs/08 fase 5)."""
import sys
from pathlib import Path

import numpy as np
from shapely.geometry import Polygon, box

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fachadas import alinear_fachadas, calles_delante, estaciones, recta_de_la_mayoria  # noqa: E402

METRO = 0.5
EDIFICADO, CALLE = 1, 0


def eje(*puntos, medible=True):
    return {'tramo': 'L1:A-B', 'sector': 'S1', 'puntos': [list(p) for p in puntos], 'banda_m': 6.0, 'medible': medible}


def grupo(mascara_global, poligono=None):
    """Un grupo de vectorizar recortado a la caja de su máscara (en px del mosaico)."""
    filas, columnas = np.nonzero(mascara_global)
    y0, y1, x0, x1 = filas.min(), filas.max() + 1, columnas.min(), columnas.max() + 1
    cuadra = mascara_global[y0:y1, x0:x1]
    return {'origen': (int(x0), int(y0)), 'cuadra': cuadra.copy(),
            'clases': np.where(cuadra, EDIFICADO, CALLE).astype(np.uint8), 'abierto': np.zeros_like(cuadra),
            'poligono': None if poligono is None else np.asarray(poligono, float) - (x0, y0), 'miembros': set(), 'minimo': 2}


def global_de(g, forma, clave='cuadra'):
    m = np.zeros(forma, g[clave].dtype)
    x0, y0 = g['origen']
    alto, ancho = g[clave].shape
    m[y0:y0 + alto, x0:x0 + ancho] = g[clave]
    return m


def plano(forma=(140, 260)):
    return np.full(forma, CALLE, np.uint8)


def con_retiro(alto=140, retiro_px=6):
    """Una cuadra con la fachada en y = 20, salvo un tramo en x 130..200 retirado `retiro_px`, frente a un eje en y = 0."""
    m = np.zeros((alto, 260), bool)
    m[20:alto - 20, 10:250] = True
    m[20:20 + retiro_px, 130:200] = False
    return m


def test_las_estaciones_y_la_recta_de_la_mayoria_son_las_de_la_puerta():
    d, est = estaciones((0, 0), (100, 0), METRO)
    assert np.allclose(d, (1, 0)) and len(est) == 35 and np.allclose(est[0], (16, 0))
    puntos = np.array([[x, 20.0] for x in range(0, 60, 2)] + [[x, 26.0] for x in range(60, 80, 2)])
    centro, normal = recta_de_la_mayoria(puntos, 1.0, [(0, 1)])
    assert abs(abs(normal[1]) - 1) < 1e-9 and abs(centro[1] - 20) < 1e-9


def test_un_tramo_retirado_de_la_fachada_llega_hasta_la_recta_de_su_frente():
    # Arrange: el tramo retirado 3 m (6 px)
    g = grupo(con_retiro())

    # Act
    [nuevo] = alinear_fachadas([g], [eje((0, 0), (260, 0))], plano(), METRO, edificado=EDIFICADO)

    # Assert
    hecho = global_de(nuevo, (140, 260))
    assert hecho[20:26, 140:190].all()                                    # el retiro llega a la fachada
    assert not hecho[:19, :].any()                                        # nada sale a la calle
    assert (global_de(nuevo, (140, 260), 'clases')[20:26, 140:190] == EDIFICADO).all()
    assert not global_de(g, (140, 260))[20:26, 140:190].any()             # no muta la entrada


def test_lo_que_sale_de_la_fachada_hacia_la_calle_se_corta():
    m = con_retiro(retiro_px=0)
    m[14:20, 130:200] = True        # 3 m hacia la calle
    [nuevo] = alinear_fachadas([grupo(m)], [eje((0, 0), (260, 0))], plano(), METRO, edificado=EDIFICADO)
    hecho = global_de(nuevo, (140, 260))
    assert not hecho[14:19, 140:190].any() and hecho[21:30, 140:190].all()


def test_un_retiro_mayor_que_el_tope_no_se_toca():
    # 12 m: no es el calce corrido, es otra cosa (un patio abierto a la calle, una plazuela)
    [nuevo] = alinear_fachadas([grupo(con_retiro(160, 24))], [eje((0, 0), (260, 0))], plano((160, 260)), METRO,
                               edificado=EDIFICADO)
    assert not global_de(nuevo, (160, 260))[20:44, 140:190].any()


def test_el_relleno_no_entra_a_lo_vedado_ni_a_otro_grupo():
    otro = np.zeros((140, 260), bool)
    otro[20:26, 180:184] = True     # un pedazo de otra mancha en el retiro
    nuevos = alinear_fachadas([grupo(con_retiro()), grupo(otro)], [eje((0, 0), (260, 0))], plano(), METRO,
                              vedado=[box(140, 18, 150, 30)], edificado=EDIFICADO)
    hecho = global_de(nuevos[0], (140, 260))
    assert not hecho[20:26, 141:149].any() and not hecho[20:26, 180:184].any()
    assert hecho[20:26, 155:175].all()


def test_el_poligono_del_grupo_sigue_a_su_mascara():
    p = [(10, 20), (130, 20), (130, 26), (200, 26), (200, 20), (250, 20), (250, 120), (10, 120)]
    [nuevo] = alinear_fachadas([grupo(con_retiro(), poligono=p)], [eje((0, 0), (260, 0))], plano(), METRO,
                               edificado=EDIFICADO)
    figura = Polygon(nuevo['poligono'] + nuevo['origen'])
    assert len(figura.exterior.coords) - 1 <= 6
    assert figura.covers(box(140, 20.5, 190, 26)) and figura.bounds[1] >= 19.5


def test_un_tramo_no_medible_no_alinea():
    [nuevo] = alinear_fachadas([grupo(con_retiro())], [eje((0, 0), (260, 0), medible=False)], plano(), METRO,
                               edificado=EDIFICADO)
    assert not global_de(nuevo, (140, 260))[20:26, 140:190].any()


def test_vectorizar_alinea_las_fachadas_de_lo_rojo_sobre_su_frente():
    # dos manchas rojas de un mismo frente; la segunda, más corta, llega a 1936 corrida 3 m hacia adentro por el calce
    from shapely.geometry import Point
    from tools.geo.tests.test_vectorizar import marco_de_calles, red_de
    from tools.geo.vectorizar import CLASE, vectorizar
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    red = red_de(marco_de_calles(20, 20, 240, 240), c, edificado72=np.zeros(c.shape, bool))
    red['referencia72'] = []
    red['edificado_revisado'] = [{'id': 'U2', 'poligonos': [box(40, 40, 160, 140)], 'por_anillo': False},
                                 {'id': 'U3', 'poligonos': [box(160, 46, 220, 140)], 'por_anillo': False}]
    red['frentes72'] = [eje((20, 24), (240, 24))]
    res = vectorizar(c, METRO, plaza=(130, 130), red=red)
    v = res['vertices']
    casas = [Polygon([(v[2 * i], v[2 * i + 1]) for i in range(t[0], t[0] + t[1])])
             for t, a in zip(res['techos'], res['antes']) if a]
    assert any(casa.contains(Point(190, 43)) for casa in casas)
    assert not any(casa.intersects(box(20, 20, 240, 38)) for casa in casas)


def test_lo_que_queda_entre_el_eje_y_la_fachada_es_calle_de_1772():
    # la cuadra alineada en y = 20: delante de su fachada, hasta el eje, es calle; la fachada misma no
    m = con_retiro(retiro_px=0)
    franjas = calles_delante([grupo(m)], [eje((0, 0), (260, 0))], METRO)
    assert franjas.contains(Polygon([(100, 2), (110, 2), (110, 18), (100, 18)]))
    assert not franjas.intersects(box(100, 19.2, 110, 30))
    assert not franjas.intersects(box(0, 0, 8, 18))          # fuera de lo que mide el frente (la esquina)


def test_una_casa_de_1936_delante_de_la_fachada_de_1772_no_vive_en_1772():
    from tools.geo.vectorizar import marcar_tapadas
    # la 0 es de la reconstrucción; la 1, de 1936, se para en la calle de 1772; la 2, de 1936, detrás de la fachada
    salida = {'vertices': [0, 20, 40, 20, 40, 60, 0, 60, 50, 6, 70, 6, 70, 16, 50, 16, 50, 22, 70, 22, 70, 40, 50, 40],
              'techos': [[0, 4, 1, 0, 0], [4, 4, 1, 0, 0], [8, 4, 1, 0, 0]], 'antes': [1, 0, 0], 'junta': [0, -1, -1],
              'juntas_hasta': [2]}
    assert marcar_tapadas(salida, METRO, delante=[box(0, 0, 100, 19.5)]) == [0, 1, 0]


def test_una_fachada_en_rampa_queda_recta_y_el_grupo_conserva_su_poligono_de_pocos_lados():
    # la fachada se retira de a poco (de y = 20 a 26) y sigue retirada: con solo las estaciones fuera de la tolerancia
    # corregidas, quedaban escalones de un píxel y el polígono pasaba de LADOS_MAXIMOS (el grupo perdía su reparto por lados)
    import cv2
    p = [(10, 20), (100, 20), (180, 26), (250, 26), (250, 120), (10, 120)]
    m = np.zeros((140, 260), np.uint8)
    cv2.fillPoly(m, [np.array(p, np.int32)], 1)
    [nuevo] = alinear_fachadas([grupo(m.astype(bool), poligono=p)], [eje((0, 0), (260, 0))], plano(), METRO,
                               edificado=EDIFICADO)
    assert nuevo['poligono'] is not None and len(nuevo['poligono']) <= 10   # LADOS_MAXIMOS
    assert Polygon(nuevo['poligono'] + nuevo['origen']).covers(Polygon([(40, 21), (220, 27), (220, 30), (40, 30)]))   # detrás de la recta


def test_las_migas_sueltas_de_las_franjas_no_le_quitan_el_poligono_al_grupo():
    # una franja que toca un pico suelto de la cuadra deja una miga aparte del polígono: no lo vuelve dos
    from fachadas import _poligono_nuevo
    p = [(10, 20), (250, 20), (250, 120), (10, 120)]
    g = grupo(con_retiro(retiro_px=0), poligono=p)
    miga = box(100, 10, 101, 11)
    nuevo = _poligono_nuevo(g, miga, None, np.zeros((140, 260), bool), (0, 0, 260, 140), 10)
    assert nuevo is not None and len(nuevo) == 4


def test_dos_grupos_vecinos_retirados_no_se_reparten_el_mismo_relleno():
    # las franjas de las estaciones vecinas a la medianera se enciman: lo que ya sumó un grupo no lo suma el otro
    m = con_retiro(retiro_px=0)
    izq, der = m.copy(), m.copy()
    izq[:, 101:] = False
    der[:, :101] = False
    izq[20:26, 60:101] = False      # los dos retirados 3 m a cada lado de la medianera en x = 101
    der[20:26, 101:150] = False
    nuevos = alinear_fachadas([grupo(izq), grupo(der)], [eje((0, 0), (260, 0))], plano(), METRO, edificado=EDIFICADO)
    a, b = global_de(nuevos[0], (140, 260)), global_de(nuevos[1], (140, 260))
    assert not (a & b).any()
    assert (a | b)[20:26, 70:140].all()


def test_la_recta_de_la_mayoria_se_encuentra_aunque_vaya_girada_y_haya_casas_del_fondo():
    # L1772-0085 lado −1 (ciudad de 2b31cda): profundidad de la fachada en cada estación (px, cada 2 px). 90 puntos
    # siguen una fachada girada 4° respecto del eje; al final, otra fachada 10 m más adentro. El ajuste de todos los
    # puntos se tuerce y la dirección del eje no sigue la fachada: la puerta tomaba una recta con 20 puntos
    fachada = [13.6 - 0.1495 * k for k in range(90)]
    fondo = [9.3, 24.3, 23.9, 23.4, 23.0, 22.5, 22.0, 21.6, 21.1, 21.1]
    puntos = np.array([[26 + 2 * k, y] for k, y in enumerate(fachada + fondo)])
    centro, normal = recta_de_la_mayoria(puntos, 1.0, [(0, 1)])
    assert (np.abs((puntos - centro) @ normal) <= 1.0).sum() >= 90


def test_la_banda_que_quita_alcanza_la_saliente_aunque_la_recta_vaya_oblicua_al_rayo():
    # el caso de la revisión de #130: rayo n = (0, 1), recta de normal (−0,8; 0,6) por (100, 30), tope 16 px; la fachada
    # tocada en (100, 5) está a 15 px de la recta, dentro del tope, y la banda tiene que llegar hasta ella
    from shapely.geometry import Point
    from fachadas import _franjas_de_un_lado
    n, normal = np.array([0.0, 1.0]), np.array([-0.8, 0.6])
    recta = (np.array([100.0, 30.0]), normal, float(n @ normal))
    golpes = [(0, np.array([100.0 + k, 5.0]), np.array([100.0 + k, 0.0])) for k in (0, 2, 4)]
    quita = [f for j, suma, f in _franjas_de_un_lado(golpes, n, recta, np.array([2.0, 0.0]), 16) if not suma]
    assert any(f.buffer(1e-6).contains(Point(100, 5)) for f in quita)


def hilera_de_casas(y0=20, saltos=None, n=8, ancho=20, fondo=40):
    saltos = saltos or {}
    return [(k, box(10 + k * ancho, y0 + saltos.get(k, 0), 10 + (k + 1) * ancho, y0 + fondo)) for k in range(n)]


def test_alinear_casas_lleva_la_fachada_de_las_movibles_a_la_recta_de_su_frente():
    from fachadas import alinear_casas
    # la 2 retirada 2 m, la 5 sale 1,5 m a la calle, la 6 retirada pero no es movible (de 1936)
    casas = hilera_de_casas(saltos={2: 4, 5: -3, 6: 4})
    nuevas = alinear_casas(casas, [eje((0, 0), (180, 0))], METRO, movibles={0, 1, 2, 3, 4, 5, 7})
    assert set(nuevas) == {2, 5}
    assert abs(nuevas[2].bounds[1] - 20) < 0.3 and abs(nuevas[5].bounds[1] - 20) < 0.3
    # sin pisar a las vecinas
    todas = dict(casas) | nuevas
    for a in todas:
        for b in todas:
            assert a >= b or todas[a].intersection(todas[b]).area < 1e-6


def test_alinear_casas_no_rellena_lo_vedado():
    from fachadas import alinear_casas
    casas = hilera_de_casas(saltos={2: 4})
    nuevas = alinear_casas(casas, [eje((0, 0), (180, 0))], METRO, movibles=set(range(8)), vedado=[box(50, 0, 70, 23)])
    assert 2 not in nuevas or nuevas[2].bounds[1] >= 23 - 1e-6


def test_alinear_casas_entrega_huellas_validas_en_la_grilla_de_las_coordenadas():
    # la ciudad guarda milésimas de píxel: una huella que se vuelve inválida al redondear rompía las puertas
    from fachadas import alinear_casas
    from shapely import affinity
    casas = [(k, affinity.rotate(c, 7, origin=(0, 0))) for k, c in hilera_de_casas(saltos={2: 3.3337, 5: -2.7771})]
    nuevas = alinear_casas(casas, [eje((0, 0), (178.6, 21.9))], METRO, movibles=set(range(8)))
    assert nuevas
    for f in nuevas.values():
        assert f.is_valid and all(abs(c * 1000 - round(c * 1000)) < 1e-6 for xy in f.exterior.coords for c in xy)


def test_alinear_casas_no_rellena_la_planta_de_un_hito_que_los_rayos_no_tocan():
    # el caso de la revisión de #131: la planta cae entre dos rayos (x = 52 y 54) y el relleno hasta y = 20 la cubría
    from fachadas import alinear_casas
    planta = box(52.25, 20.25, 53.75, 23.75)
    casas = hilera_de_casas(saltos={2: 4})
    nuevas = alinear_casas(casas, [eje((0, 0), (180, 0))], METRO, movibles=set(range(8)), obstaculos=[planta])
    assert 2 not in nuevas or nuevas[2].intersection(planta).area < 1e-6


def test_alinear_casas_no_deja_huellas_que_se_pisen():
    # muchas casas movibles con retiros distintos, una al lado de la otra: ninguna huella final pisa a otra
    from fachadas import alinear_casas
    casas = hilera_de_casas(saltos={k: (k * 7) % 9 - 4 for k in range(8)})
    nuevas = alinear_casas(casas, [eje((0, 0), (180, 0))], METRO, movibles=set(range(8)))
    todas = dict(casas) | nuevas
    for a in todas:
        for b in todas:
            assert a >= b or todas[a].intersection(todas[b]).area < 1e-4


def test_alinear_casas_mueve_la_fachada_alrededor_de_la_planta_de_un_hito_sin_pisarla():
    # la planta muerde el borde del relleno (no lo agujerea): la casa se mueve igual hasta la recta y le deja la planta
    from shapely.geometry import Point
    from fachadas import alinear_casas
    planta = box(49, 18, 53.5, 23.5)
    casas = hilera_de_casas(saltos={2: 4})
    nuevas = alinear_casas(casas, [eje((0, 0), (180, 0))], METRO, movibles=set(range(8)), obstaculos=[planta])
    assert 2 in nuevas and nuevas[2].contains(Point(64, 21))
    assert nuevas[2].intersection(planta).area < 1e-6


def test_un_hueco_que_no_toca_nada_se_rellena():
    from fachadas import sin_huecos_libres
    from shapely.geometry import Polygon as P
    con_hueco = P([(0, 0), (20, 0), (20, 20), (0, 20)], [[(5, 5), (6, 5), (6, 15), (5, 15)]])
    lleno = sin_huecos_libres(con_hueco, ocupado=None)
    assert not lleno.interiors and abs(lleno.area - 400) < 1e-9


def test_un_hueco_con_otra_casa_o_lo_vedado_adentro_queda():
    from fachadas import sin_huecos_libres
    from shapely.geometry import Polygon as P
    con_hueco = P([(0, 0), (20, 0), (20, 20), (0, 20)], [[(5, 5), (15, 5), (15, 15), (5, 15)]])
    queda = sin_huecos_libres(con_hueco, ocupado=box(8, 8, 12, 12))
    assert len(queda.interiors) == 1 and abs(queda.area - 300) < 1e-9
    # lo que solo roza el borde del hueco no lo ocupa
    assert not sin_huecos_libres(con_hueco, ocupado=box(15, 5, 18, 8)).interiors


def test_alinear_casas_no_rellena_un_hueco_con_otra_casa_adentro_lejos_del_borde():
    # revisión de #135: la casa del patio está a más de 1 px del borde del hueco y no entraba en lo ocupado
    from fachadas import alinear_casas
    casas = hilera_de_casas()
    patio = Polygon(box(50, 24, 70, 60).exterior.coords, [box(54, 30, 66, 54).exterior.coords])
    adentro = box(57, 36, 63, 48)
    casas = [(k, patio if k == 2 else c) for k, c in casas] + [(8, adentro)]
    nuevas = alinear_casas(casas, [eje((0, 0), (180, 0))], METRO, movibles=set(range(8)))
    assert 2 not in nuevas or nuevas[2].intersection(adentro).area < 1e-6


def test_alinear_casas_rellena_la_cuna_de_una_casa_que_ya_esta_sobre_la_recta_aunque_pase_el_tope():
    # la casa 2 llega a la recta en x 50..58 y desde ahí su frente se va en diagonal hasta 10 m atrás (más que el tope)
    from fachadas import alinear_casas
    cuna = Polygon([(50, 20), (58, 20), (70, 40), (70, 60), (50, 60)])
    casas = [(k, cuna if k == 2 else c) for k, c in hilera_de_casas(fondo=40)]
    nuevas = alinear_casas(casas, [eje((0, 0), (180, 0))], METRO, movibles=set(range(8)))
    assert 2 in nuevas
    assert nuevas[2].contains(box(51, 20.5, 68.5, 37))     # la cuña llena hasta la recta, hasta la última estación
    todas = dict(casas) | nuevas
    assert all(todas[a].intersection(todas[b]).area < 1e-6 for a in todas for b in todas if a < b)


def test_alinear_casas_no_rellena_mas_alla_del_tope_una_casa_que_no_toca_la_recta():
    # retirada 10 m entera: no es una cuña, es una manzana retirada, y queda como está
    from fachadas import alinear_casas
    casas = hilera_de_casas(saltos={2: 20})
    nuevas = alinear_casas(casas, [eje((0, 0), (180, 0))], METRO, movibles=set(range(8)))
    assert 2 not in nuevas


def test_delante_de_la_recta_encuentra_la_casa_parada_en_la_calle_frente_a_la_reconstruccion():
    from fachadas import delante_de_la_recta
    casas = hilera_de_casas() + [(8, box(40, 8, 120, 14))]      # una tira a 3 m de la calle, delante de las casas
    assert delante_de_la_recta(casas, [eje((0, 0), (180, 0))], METRO, de_1772=set(range(8))) == {8}


def test_delante_de_la_recta_no_marca_una_casa_sobre_la_recta_ni_detras():
    from fachadas import delante_de_la_recta
    casas = hilera_de_casas(n=6) + [(8, box(130, 20, 150, 60)), (9, box(150, 30, 170, 60))]   # al lado y retirada
    assert delante_de_la_recta(casas, [eje((0, 0), (180, 0))], METRO, de_1772=set(range(6))) == set()


def test_a_la_grilla_rellena_el_hueco_libre_que_deja_el_redondeo():
    # una entrada de 0,4 milésimas se cierra al llevar la huella a la grilla y deja la cámara de adentro como hueco
    from fachadas import a_la_grilla
    entrada = Polygon([(0, 0), (10, 0), (10, 10), (5.0002, 10), (5.0002, 5), (6, 5), (6, 2), (4, 2), (4, 5),
                       (4.9998, 5), (4.9998, 10), (0, 10)])
    g = a_la_grilla(entrada, ocupado=None)
    assert g.geom_type == 'Polygon' and g.is_valid and not g.interiors
    assert a_la_grilla(entrada, ocupado=box(4.5, 3, 5.5, 4)).interiors     # con algo adentro, el hueco queda


def test_delante_de_la_recta_no_marca_una_casa_mas_alla_de_la_manzana_del_frente():
    # revisión de #137: el tramo sigue más allá de la reconstrucción; una casa suelta allá no tiene nada detrás
    from fachadas import delante_de_la_recta
    casas = hilera_de_casas() + [(8, box(200, 8, 220, 14))]
    assert delante_de_la_recta(casas, [eje((0, 0), (260, 0))], METRO, de_1772=set(range(8))) == set()
