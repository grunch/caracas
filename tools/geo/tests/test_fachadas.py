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
