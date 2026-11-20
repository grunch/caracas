import numpy as np
import pytest
from shapely.geometry import Polygon

from tools.geo.caras import ajustar_cara, caras_de, clasificar, fraccion_sobre, tramos_de

METRO = 0.5


def damero(n=3, paso=200, x0=20, y0=20):
    """Las calles de un damero de n × n cuadras: líneas enteras, de borde a borde (sin partir en las esquinas)."""
    fin = n * paso
    return ([np.array([[x0 + k * paso, y0], [x0 + k * paso, y0 + fin]], float) for k in range(n + 1)]
            + [np.array([[x0, y0 + k * paso], [x0 + fin, y0 + k * paso]], float) for k in range(n + 1)])


def test_los_tramos_van_de_esquina_a_esquina():
    tramos = tramos_de(damero(2))
    # 2 × 2 cuadras: 12 cuadras de calle; las dos de cada esquina de afuera (un nudo sin cruce) son un solo tramo
    assert len(tramos) == 8
    assert sum(len(t) == 2 for t in tramos) == 4   # las cuatro del medio, rectas de cruce a cruce


def test_una_calle_partida_en_varias_vias_es_un_solo_tramo_entre_esquinas():
    lineas = damero(1) + [np.array([[20, 120], [120, 120]], float), np.array([[120, 120], [220, 120]], float)]
    tramos = tramos_de(lineas)
    assert len(tramos) == 3   # la del medio, entera, y las dos mitades del contorno que parte
    del_medio = [t for t in tramos if np.allclose(t[:, 1], 120)]
    assert len(del_medio) == 1 and np.hypot(*(del_medio[0][-1] - del_medio[0][0])) == pytest.approx(200)


def test_la_fraccion_de_un_tramo_sobre_una_mascara():
    m = np.zeros((100, 300), bool)
    m[40:60, 0:130] = True
    linea = np.array([[10, 50], [290, 50]], float)
    assert fraccion_sobre(linea, m, paso_px=4) == pytest.approx(120 / 280, abs=0.03)
    assert fraccion_sobre(linea, m, paso_px=4, recorte_px=60) == pytest.approx(60 / 160, abs=0.03)   # de x = 70 a 230
    assert fraccion_sobre(np.array([[-500, 50], [-10, 50]], float), m, paso_px=4) is None   # fuera de la hoja


def test_una_calle_sola_es_un_tramo():
    # (la unión de una sola calle es una LineString suelta, que linemerge no acepta)
    tramos = tramos_de([np.array([[20, 100], [420, 100]])])

    assert len(tramos) == 1
    assert np.allclose(tramos[0][[0, -1]], [[20, 100], [420, 100]])


def test_sin_calles_no_hay_tramos():
    assert tramos_de([]) == []


def test_clasificar_dice_que_tramos_estaban_en_1936_y_cuales_son_nuevos_desde_1772():
    # dos cuadras de 1936 separadas por una calle (x = 220) que en 1772 no existía
    tramos = tramos_de(damero(2))
    calle36 = np.zeros((440, 440), bool)
    for k in (20, 220, 420):
        calle36[:, k - 8:k + 8] = True
        calle36[k - 8:k + 8, :] = True
    calle36[212:228, :] = False     # la calle horizontal del medio no está en el plano de 1936: es de después
    edificado72 = ~calle36
    edificado72[:, 212:228] = True  # en 1772 la vertical del medio era cuadra
    lejos72 = np.full(calle36.shape, 50.0)
    clases = clasificar(tramos, calle36, METRO, edificado72=edificado72, lejos72_m=lejos72)
    del_medio_v = [c for c in clases if abs(c['linea'][0][0] - 220) < 1 and abs(c['linea'][-1][0] - 220) < 1]
    del_medio_h = [c for c in clases if abs(c['linea'][0][1] - 220) < 1 and abs(c['linea'][-1][1] - 220) < 1]
    assert len(del_medio_v) == 2 and all(c['en1936'] and c['nueva'] for c in del_medio_v)
    assert len(del_medio_h) == 2 and not any(c['en1936'] for c in del_medio_h)
    borde = [c for c in clases if c not in del_medio_v and c not in del_medio_h]
    assert all(c['en1936'] and not c['nueva'] for c in borde)


def test_una_calle_que_1772_dibuja_cerca_no_es_nueva_aunque_el_calce_la_pise():
    tramos = [np.array([[20, 100], [420, 100]], float)]
    calle36 = np.zeros((200, 440), bool)
    calle36[92:108, :] = True
    edificado72 = np.ones(calle36.shape, bool)       # el calce corrió lo edificado encima de la calle…
    lejos72 = np.full(calle36.shape, 6.0)            # …pero 1772 dibuja una calle a 6 m
    assert not clasificar(tramos, calle36, METRO, edificado72=edificado72, lejos72_m=lejos72)[0]['nueva']


def test_las_caras_son_las_cuadras_de_la_red():
    caras = caras_de(tramos_de(damero(3)))
    assert len(caras) == 9
    assert all(c.area == pytest.approx(200 * 200) for c in caras)


def test_una_cara_se_ajusta_a_las_fachadas_de_su_cuadra_aunque_el_borde_sea_dentado():
    # la cara va por los ejes de las calles (un cuadrado de 100 × 100 m); la cuadra empieza 5 m adentro, con dientes
    cara = Polygon([(20, 20), (220, 20), (220, 220), (20, 220)])
    m = np.zeros((240, 240), bool)
    m[30:210, 30:210] = True
    rng = np.random.default_rng(1)
    for k in range(30, 210, 12):      # dientes de 1,5 m en los cuatro bordes
        if rng.random() < 0.5:
            m[30:33, k:k + 6] = False
            m[207:210, k:k + 6] = False
            m[k:k + 6, 30:33] = False
            m[k:k + 6, 207:210] = False
    p = ajustar_cara(cara, m, (0, 0), METRO)
    assert p is not None and len(p) == 4
    assert sorted(np.round(p.min(axis=0)).tolist()) == [30, 30] and sorted(np.round(p.max(axis=0)).tolist()) == [210, 210]


def test_una_muesca_en_un_lado_no_mueve_la_linea_de_fachada():
    cara = Polygon([(20, 20), (220, 20), (220, 220), (20, 220)])
    m = np.zeros((240, 240), bool)
    m[30:210, 30:210] = True
    m[30:110, 90:150] = False          # una plaza de 30 × 40 m abierta al lado norte
    p = ajustar_cara(cara, m, (0, 0), METRO)
    assert p is not None and len(p) == 4
    assert np.round(p[:, 1].min()) == 30   # el lado norte sigue en la línea de las casas, no en el fondo de la plaza


def test_una_cara_de_muchos_lados_no_se_ajusta():
    t = np.linspace(0, 2 * np.pi, 16, endpoint=False)   # una estrella de ocho puntas: 16 lados largos
    radio = np.where(np.arange(16) % 2 == 0, 200, 110)
    cara = Polygon(np.c_[220 + radio * np.cos(t), 220 + radio * np.sin(t)])
    m = np.zeros((440, 440), bool)
    yy, xx = np.mgrid[0:440, 0:440]
    m[(xx - 220) ** 2 + (yy - 220) ** 2 < 100 ** 2] = True
    assert ajustar_cara(cara, m, (0, 0), METRO) is None
