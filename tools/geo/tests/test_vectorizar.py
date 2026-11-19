import math

import numpy as np
import pytest
from shapely.geometry import Point, Polygon, box

from tools.geo.vectorizar import CLASE, vectorizar

METRO = 0.5  # m/px


def manzana_con_patio(con_iglesia=False):
    """Una manzana de 100×100 m: corona edificada de 20 m de fondo, patio al medio, calles alrededor.
    `con_iglesia`: un edificio público en una esquina (así no va con la cuadra modelo)."""
    c = np.full((260, 260), CLASE['calle'], np.uint8)
    c[30:230, 30:230] = CLASE['edificado']
    c[70:190, 70:190] = CLASE['patio']
    if con_iglesia:
        c[30:70, 30:70] = CLASE['publico']
    return c


def poligonos(res):
    v = np.asarray(res['vertices'], float).reshape(-1, 2)
    return [Polygon(v[i:i + n]) for i, n, *_ in res['techos']]


def test_divide_la_corona_en_lotes_de_frente_razonable():
    res = vectorizar(manzana_con_patio(), METRO, plaza=(130, 130))
    perimetro_m = 4 * 100
    assert perimetro_m / 16 <= len(res['techos']) <= perimetro_m / 8


def test_las_huellas_no_invaden_la_calle():
    polis = poligonos(vectorizar(manzana_con_patio(), METRO, plaza=(130, 130)))
    afuera = box(0, 0, 260, 260).difference(box(28, 28, 232, 232))
    assert all(p.is_valid and p.area > 0 for p in polis)
    assert sum(p.intersection(afuera).area for p in polis) < 1


def test_fuera_de_la_cuadra_modelo_las_huellas_no_invaden_el_patio_ni_la_calle():
    polis = poligonos(vectorizar(manzana_con_patio(), METRO, plaza=(130, 130), cuadra_modelo=False))
    patio = box(72, 72, 188, 188)
    afuera = box(0, 0, 260, 260).difference(box(28, 28, 232, 232))
    assert all(p.is_valid and p.area > 0 for p in polis)
    assert sum(p.intersection(patio).area for p in polis) < 1
    assert sum(p.intersection(afuera).area for p in polis) < 1


def test_fuera_de_la_cuadra_modelo_las_huellas_cubren_casi_todo_lo_edificado():
    polis = poligonos(vectorizar(manzana_con_patio(), METRO, plaza=(130, 130), cuadra_modelo=False))
    edificado_px = 200 * 200 - 120 * 120
    assert sum(p.area for p in polis) == pytest.approx(edificado_px, rel=0.05)


def test_un_edificio_publico_es_un_solo_techo_con_su_estilo():
    c = np.full((200, 200), CLASE['calle'], np.uint8)
    c[40:160, 40:160] = CLASE['publico']
    res = vectorizar(c, METRO, plaza=(0, 0))
    assert len(res['techos']) == 1
    _, _, pisos, estilo, _ = res['techos'][0]
    assert estilo == 9 and pisos >= 2


def test_es_determinista():
    a = vectorizar(manzana_con_patio(), METRO, plaza=(130, 130))
    b = vectorizar(manzana_con_patio(), METRO, plaza=(130, 130))
    assert a == b


def test_ignora_manchas_menores_al_area_minima():
    c = np.full((100, 100), CLASE['calle'], np.uint8)
    c[10:13, 10:13] = CLASE['edificado']  # 1,5 × 1,5 m
    assert vectorizar(c, METRO, plaza=(0, 0))['techos'] == []


def test_marca_las_casas_de_esquina_una_por_esquina():
    res = vectorizar(manzana_con_patio(), METRO, plaza=(130, 130))
    assert len(res['esquinas']) == len(res['techos']) and set(res['esquinas']) <= {0, 1}
    de_esquina = [p for p, e in zip(poligonos(res), res['esquinas']) if e]
    assert len(de_esquina) == 4
    for x, y in ((30, 30), (230, 30), (230, 230), (30, 230)):  # cada esquina de la manzana toca una sola
        assert sum(p.distance(Point(x, y)) < 3 for p in de_esquina) == 1


def test_un_edificio_publico_no_es_casa_de_esquina():
    c = np.full((200, 200), CLASE['calle'], np.uint8)
    c[40:160, 40:160] = CLASE['publico']
    assert vectorizar(c, METRO, plaza=(0, 0))['esquinas'] == [0]


def test_una_casa_suelta_no_hace_esquina():
    c = np.full((200, 200), CLASE['calle'], np.uint8)
    c[40:100, 40:90] = CLASE['edificado']  # 30 × 25 m: dos o tres lotes, no una manzana
    res = vectorizar(c, METRO, plaza=(0, 0))
    assert res['techos'] and not any(res['esquinas'])


# --- las casas de patio: marcos y alas (tools/geo/alas.py) ---

def manzana_maciza(lado_m=110):
    """Una manzana toda edificada, como las del centro en el plano de 1936, con calle alrededor."""
    borde = 30
    lado = int(lado_m / METRO)
    c = np.full((lado + 2 * borde, lado + 2 * borde), CLASE['calle'], np.uint8)
    c[borde:borde + lado, borde:borde + lado] = CLASE['edificado']
    return c


def manzana_con_iglesia():
    """La manzana maciza con un edificio público sobre la calle norte."""
    c = manzana_maciza()
    c[30:90, 110:170] = CLASE['publico']
    return c


def test_sin_la_cuadra_modelo_una_manzana_maciza_da_casas_de_patio_con_su_marco_y_sus_alas():
    from tools.geo.alas import FRENTE, PATIO
    res = vectorizar(manzana_maciza(), METRO, plaza=(140, 140), cuadra_modelo=False)
    con_alas = [m for m in res['marcos'] if m[10] > 0]
    assert len(con_alas) >= 0.5 * len(res['techos'])
    polis = poligonos(res)
    for techo, ox, oy, eux, euy, ancho, fondo, calles, crujia, primera, cuantas in res['marcos']:
        assert 0 <= techo < len(res['techos'])
        assert math.hypot(eux, euy) == pytest.approx(1, abs=1e-4)
        assert ancho > 0 and fondo > 0 and 7 / METRO <= crujia <= 8.5 / METRO
        alas = res['alas'][primera:primera + cuantas]
        assert len(alas) == cuantas
        if not alas:
            continue
        assert alas[0][0] == FRENTE and any(a[0] == PATIO for a in alas)
        assert m_es_casa(res, techo)
        # el frente está en la calle: el punto medio de la línea de fachada toca el borde de la casa
        medio = Point(ox + eux * ancho / 2, oy + euy * ancho / 2)
        assert polis[techo].exterior.distance(medio) < 3
        # y las alas caen sobre la casa
        for _, u0, v0, u1, v1 in alas:
            centro = Point(ox + eux * (u0 + u1) / 2 - euy * (v0 + v1) / 2, oy + euy * (u0 + u1) / 2 + eux * (v0 + v1) / 2)
            assert polis[techo].buffer(2).contains(centro)
    assert len({m[0] for m in res['marcos']}) == len(res['marcos'])   # un marco por casa, como mucho
    assert len({m[8] for m in res['marcos']}) == 1   # la crujía es de la manzana: la misma en todas sus casas


def m_es_casa(res, techo):
    from tools.geo.vectorizar import ESTILO_COLONIAL
    return res['techos'][techo][3] == ESTILO_COLONIAL


# --- la cuadra modelo (tools/geo/cuadra.py): las manzanas de solo casas ---

def test_una_manzana_de_solo_casas_es_un_anillo_de_casas_con_el_centro_abierto():
    from tools.geo.alas import FRENTE, SOLAR
    from tools.geo.cuadra import CRUJIA_M
    c = manzana_maciza()
    res = vectorizar(c, METRO, plaza=(140, 140))
    assert len(res['marcos']) == len(res['techos'])   # toda casa da a la calle: ninguna mira al centro
    con_solar = 0
    for _, ox, oy, eux, euy, ancho, fondo, calles, crujia, primera, cuantas in res['marcos']:
        alas = res['alas'][primera:primera + cuantas]
        assert alas and alas[0][0] == FRENTE
        assert CRUJIA_M[0] / METRO <= crujia <= CRUJIA_M[1] / METRO
        con_solar += any(a[0] == SOLAR for a in alas)
    assert con_solar >= 0.6 * len(res['marcos'])
    assert len({m[8] for m in res['marcos']}) == 1
    # el centro de la manzana (un cuadrado de 30 m) queda en los solares
    from tools.geo.vectorizar import mascara_de_patios
    patios = mascara_de_patios(res, c.shape)[110:170, 110:170] > 0
    assert patios.mean() > 0.9


def test_las_casas_de_la_cuadra_modelo_cambian_de_forma():
    from tools.geo.alas import CRUZADA, LATERAL_DER, LATERAL_IZQ
    res = vectorizar(manzana_maciza(), METRO, plaza=(140, 140))
    formas = set()
    for *_, primera, cuantas in res['marcos']:
        tipos = {a[0] for a in res['alas'][primera:primera + cuantas]}
        formas.add((bool(tipos & {LATERAL_IZQ, LATERAL_DER}), CRUZADA in tipos))
    assert len(formas) >= 2


def test_los_frentes_de_una_cuadra_quedan_en_una_sola_linea():
    res = vectorizar(manzana_maciza(), METRO, plaza=(140, 140))
    # las casas que miran al norte (eu = +x): todas con el origen en la misma fila de píxeles, el borde de la manzana
    al_norte = [m for m in res['marcos'] if m[3] > 0.99]
    assert len(al_norte) >= 4
    assert max(m[2] for m in al_norte) - min(m[2] for m in al_norte) < 0.05
    assert al_norte[0][2] == pytest.approx(30, abs=0.6)


def test_la_mascara_de_patios_marca_patios_y_solares_dentro_de_lo_edificado():
    from tools.geo.vectorizar import mascara_de_patios
    c = manzana_maciza()
    res = vectorizar(c, METRO, plaza=(140, 140))
    mascara = mascara_de_patios(res, c.shape)
    assert mascara.dtype == np.uint8 and set(np.unique(mascara)) == {0, 255}
    patios = mascara > 0
    assert 0.08 < patios.sum() / (c == CLASE['edificado']).sum() < 0.75   # en la cuadra modelo, el centro es solar
    assert (patios & (c != CLASE['edificado'])).sum() < 0.01 * patios.sum()


def test_una_casa_suelta_y_chica_tiene_marco_pero_no_alas():
    c = np.full((120, 120), CLASE['calle'], np.uint8)
    c[40:60, 40:64] = CLASE['edificado']   # 12 × 10 m
    res = vectorizar(c, METRO, plaza=(0, 0))
    assert len(res['techos']) == 1 and len(res['marcos']) == 1
    assert res['marcos'][0][10] == 0 and res['alas'] == []


def test_en_una_manzana_con_iglesia_las_casas_la_cubren_y_le_ceden_el_lugar():
    """Antes de que exista el edificio público su lugar es de casas (la cuadra queda cerrada); las casas que
    lo pisan anotan en "cede" cuál es, para morir cuando nazca (tools/geo/epocas.py)."""
    from tools.geo.vectorizar import ESTILO_PUBLICO
    res = vectorizar(manzana_con_iglesia(), METRO, plaza=(140, 140))
    polis = poligonos(res)
    iglesia = [k for k, t in enumerate(res['techos']) if t[3] == ESTILO_PUBLICO]
    assert len(iglesia) == 1
    assert len(res['cede']) == len(res['techos']) == len(res['cuadras'])
    for k, p in enumerate(polis):
        if k == iglesia[0]:
            assert res['cede'][k] == -1 and res['cuadras'][k] == -1
            continue
        pisa = p.intersection(polis[iglesia[0]]).area > 0.25 * p.area
        assert res['cede'][k] == (iglesia[0] if pisa else -1)
    assert any(c == iglesia[0] for c in res['cede'])


def test_las_casas_de_una_cuadra_modelo_comparten_su_cuadra():
    c = np.full((560, 300), CLASE['calle'], np.uint8)
    c[30:250, 30:270] = CLASE['edificado']
    c[310:530, 30:270] = CLASE['edificado']
    res = vectorizar(c, METRO, plaza=(150, 280))
    cuadras = {q for q in res['cuadras']}
    assert len(cuadras) == 2 and -1 not in cuadras


def test_fuera_de_la_cuadra_modelo_las_casas_no_tienen_cuadra():
    res = vectorizar(manzana_maciza(), METRO, plaza=(140, 140), cuadra_modelo=False)
    assert set(res['cuadras']) == {-1} and set(res['cede']) == {-1}


# --- los lotes por lados (tools/geo/lados.py): casas alineadas, sin encimarse en las esquinas ---

def manzana_girada(angulo=23.0, ancho_m=96, alto_m=82, dientes=True):
    """Una manzana maciza girada, con el borde dentado (cada tanto un píxel de más o de menos)."""
    import cv2
    lado = 360
    c = np.full((lado, lado), CLASE['calle'], np.uint8)
    caja = cv2.boxPoints(((lado / 2, lado / 2), (ancho_m / METRO, alto_m / METRO), angulo))
    m = np.zeros((lado, lado), np.uint8)
    cv2.fillPoly(m, [np.round(caja).astype(np.int32)], 1)
    if dientes:
        rng = np.random.default_rng(4)
        borde = (cv2.dilate(m, np.ones((3, 3), np.uint8)) - cv2.erode(m, np.ones((3, 3), np.uint8))) > 0
        ys, xs = np.nonzero(borde)
        elegidos = rng.random(len(xs)) < 0.25
        m[ys[elegidos], xs[elegidos]] = rng.integers(0, 2, elegidos.sum())
    c[m > 0] = CLASE['edificado']
    return c


@pytest.mark.parametrize('angulo', [23.0, -38.0])
def test_en_la_cuadra_modelo_las_casas_no_se_enciman_y_miran_derecho_a_su_calle(angulo):
    res = vectorizar(manzana_girada(angulo), METRO, plaza=(180, 180))
    polis = poligonos(res)
    for i in range(len(polis)):
        for j in range(i + 1, len(polis)):
            # el medio píxel de cada borde (poligono_de) deja una franja fina en los bordes diagonales: nada más
            pisado = polis[i].intersection(polis[j])
            if pisado.area > 1:
                assert 2 * pisado.area / pisado.length < 1.5, (i, j)   # el ancho de la franja, en píxeles
    a = math.radians(angulo)
    for m in res['marcos']:
        paralelo = max(abs(m[3] * math.cos(a) + m[4] * math.sin(a)), abs(-m[3] * math.sin(a) + m[4] * math.cos(a)))
        assert paralelo > 0.999   # eu a lo largo de un lado de la manzana
    # cuatro líneas de fachada, una por calle: todas las casas de una calle con el frente en la misma recta
    lineas = {}
    for m in res['marcos']:
        ev = (round(-m[4], 2), round(m[3], 2))
        lineas.setdefault(ev, []).append(m[1] * -m[4] + m[2] * m[3])
    assert len(lineas) == 4
    assert all(max(v) - min(v) < 0.5 for v in lineas.values())


def test_cuadras_pegadas_en_el_plano_se_reparten_cada_una_por_sus_lados():
    # tres cuadras de 50 × 100 m que el plano une por patios de 4 m de ancho: una sola "manzana" de 1936
    c = np.full((260, 420), CLASE['calle'], np.uint8)
    for x0 in (30, 146, 262):
        c[30:230, x0:x0 + 100] = CLASE['edificado']
    c[60:68, 130:146] = CLASE['patio']
    c[180:188, 246:262] = CLASE['patio']
    res = vectorizar(c, METRO, plaza=(210, 130))
    assert res['marcos'] and len(res['marcos']) == len(res['techos'])
    lineas = {}
    for m in res['marcos']:
        ev = (round(-m[4], 2), round(m[3], 2))
        lineas.setdefault(ev, set()).add(round(m[1] * -m[4] + m[2] * m[3]))
    # tres cuadras: tres líneas de fachada mirando al este y tres al oeste (una por cuadra), todas rectas
    assert len(lineas) == 4
    assert len(lineas[(1.0, 0.0)]) == 3 and len(lineas[(-1.0, 0.0)]) == 3
