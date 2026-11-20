import math

import cv2
import numpy as np
import pytest

from tools.geo.lados import FRENTE_M, lotes_por_lados

METRO = 0.5


def rectangulo(ancho_m=100, alto_m=80, angulo_grados=0.0, borde_px=40):
    """Una manzana rectangular (máscara), girada `angulo_grados` alrededor de su centro."""
    w, h = ancho_m / METRO, alto_m / METRO
    lado = int(math.hypot(w, h) + 2 * borde_px)
    centro = (lado / 2, lado / 2)
    caja = cv2.boxPoints((centro, (w, h), angulo_grados))
    mascara = np.zeros((lado, lado), np.uint8)
    cv2.fillPoly(mascara, [np.round(caja).astype(np.int32)], 1)
    return mascara.astype(bool)


def lineas_de_borde(m):
    ys, xs = np.nonzero(m)
    return xs.min(), xs.max() + 1, ys.min(), ys.max() + 1


def test_reparte_una_manzana_rectangular_en_lotes_con_el_frente_sobre_sus_lados():
    m = rectangulo()
    x0, x1, y0, y1 = lineas_de_borde(m)
    etiquetas, lotes = lotes_por_lados(m, METRO, semilla=3)
    assert len(lotes) >= 4 * 5
    for k, lote in lotes.items():
        assert (etiquetas == k).any()
        assert FRENTE_M[0] - 1e-9 <= lote['ancho'] <= FRENTE_M[1] + 1e-9
        eu = np.asarray(lote['eu'])
        assert min(abs(eu[0]), abs(eu[1])) < 1e-6   # paralelo a un lado del rectángulo
        ox, oy = lote['origen']
        assert min(abs(ox - x0), abs(ox - x1), abs(oy - y0), abs(oy - y1)) < 1.5


def test_las_casas_de_un_mismo_lado_comparten_la_linea_de_fachada():
    _, lotes = lotes_por_lados(rectangulo(), METRO, semilla=3)
    por_lado = {}
    for lote in lotes.values():
        ev = (-lote['eu'][1], lote['eu'][0])
        linea = round(lote['origen'][0] * ev[0] + lote['origen'][1] * ev[1], 3)
        por_lado.setdefault((round(ev[0], 3), round(ev[1], 3)), set()).add(linea)
    assert len(por_lado) == 4 and all(len(lineas) == 1 for lineas in por_lado.values())


def test_los_lotes_cubren_la_manzana_sin_encimarse_y_las_esquinas_se_unen_en_la_diagonal():
    m = rectangulo()
    etiquetas, lotes = lotes_por_lados(m, METRO, semilla=3)
    assert ((etiquetas > 0) == m).mean() > 0.995
    x0, _, y0, _ = lineas_de_borde(m)
    norte = etiquetas[y0 + 2, x0 + 10]
    oeste = etiquetas[y0 + 10, x0 + 2]
    assert norte != oeste and lotes[norte]['esquina'] != lotes[oeste]['esquina']


def test_una_casa_de_esquina_por_esquina():
    m = rectangulo()
    etiquetas, lotes = lotes_por_lados(m, METRO, semilla=3)
    x0, x1, y0, y1 = lineas_de_borde(m)
    assert sum(lote['esquina'] for lote in lotes.values()) == 4
    for x, y in ((x0, y0), (x1 - 1, y0), (x1 - 1, y1 - 1), (x0, y1 - 1)):
        cerca = {int(etiquetas[j, i]) for j in range(y - 6, y + 7) for i in range(x - 6, x + 7)
                 if 0 <= j < m.shape[0] and 0 <= i < m.shape[1] and etiquetas[j, i]}
        assert sum(lotes[k]['esquina'] for k in cerca) == 1


def test_el_fondo_llega_hasta_la_medianera():
    _, lotes = lotes_por_lados(rectangulo(100, 80), METRO, semilla=3)
    assert max(lote['fondo'] for lote in lotes.values()) == pytest.approx(40, abs=1.5)   # la mitad del lado corto


@pytest.mark.parametrize('angulo', [17.0, 33.0, -25.0])
def test_una_manzana_girada_tambien(angulo):
    _, lotes = lotes_por_lados(rectangulo(angulo_grados=angulo), METRO, semilla=5)
    a = math.radians(angulo)
    esperadas = [(abs(math.cos(a)), abs(math.sin(a))), (abs(math.sin(a)), abs(math.cos(a)))]
    for lote in lotes.values():
        d = (abs(lote['eu'][0]), abs(lote['eu'][1]))
        assert min(abs(d[0] - e[0]) + abs(d[1] - e[1]) for e in esperadas) < 0.03


def test_una_manzana_redonda_no_se_reparte_por_lados():
    m = np.zeros((300, 300), np.uint8)
    cv2.circle(m, (150, 150), 110, 1, -1)
    assert lotes_por_lados(m.astype(bool), METRO, semilla=1) is None


def test_es_determinista():
    a = lotes_por_lados(rectangulo(), METRO, semilla=8)
    b = lotes_por_lados(rectangulo(), METRO, semilla=8)
    assert np.array_equal(a[0], b[0]) and a[1] == b[1]


def test_las_cuadras_pegadas_por_un_puente_fino_se_separan_y_lo_demas_va_con_la_mas_cercana():
    from tools.geo.lados import cuadras_pegadas
    m = np.zeros((260, 300), bool)
    m[30:230, 30:130] = True
    m[30:230, 146:246] = True
    m[120:128, 130:146] = True             # el puente, de 4 m
    piezas = cuadras_pegadas(m, METRO)
    assert len(piezas) == 2
    juntas = np.zeros(m.shape, int)
    for k, (pieza, (x, y)) in enumerate(piezas, start=1):
        h, w = pieza.shape
        assert not (juntas[y:y + h, x:x + w][pieza]).any()   # no se enciman
        juntas[y:y + h, x:x + w][pieza] = k
    assert ((juntas > 0) == m).all()                          # y cubren toda la manzana


def test_una_cuadra_sola_no_se_parte():
    from tools.geo.lados import cuadras_pegadas
    assert cuadras_pegadas(rectangulo(), METRO) is None


@pytest.mark.parametrize('largo', [9.5, 13.0, 19.0, 23.0, 31.0, 47.5, 100.0])
def test_los_frentes_quedan_entre_9_y_14_m_cuando_el_lado_lo_admite(largo):
    from tools.geo.lados import _cortes
    for semilla in range(30):
        cortes = _cortes(largo, np.random.default_rng(semilla))
        anchos = np.diff(np.concatenate([[0.0], cortes]))
        assert cortes[-1] == pytest.approx(largo)
        assert anchos.min() >= FRENTE_M[0] - 1e-9 and anchos.max() <= FRENTE_M[1] + 1e-9


@pytest.mark.parametrize('largo,esperado', [(17.0, 1), (8.5, 1)])
def test_un_lado_que_no_admite_frentes_de_9_a_14_m_va_con_la_cantidad_mas_cercana(largo, esperado):
    from tools.geo.lados import _cortes
    assert len(_cortes(largo, np.random.default_rng(1))) == esperado


def test_un_hueco_de_la_manzana_no_es_de_ningun_lote():
    m = rectangulo()
    ys, xs = np.nonzero(m)
    cy, cx = int(ys.mean()), int(xs.mean())
    con_hueco = m.copy()
    con_hueco[cy - 20:cy + 20, cx - 20:cx + 20] = False     # 20 × 20 m adentro: una plaza o un pasaje
    etiquetas, _ = lotes_por_lados(con_hueco, METRO, semilla=3)
    assert not (etiquetas[cy - 20:cy + 20, cx - 20:cx + 20] > 0).any()
    # y sin el hueco el reparto es el de siempre
    sin, _ = lotes_por_lados(m, METRO, semilla=3)
    assert np.array_equal(np.where(con_hueco, sin, 0), etiquetas)


def test_un_diente_chico_en_un_lado_no_lo_parte_en_dos():
    m = rectangulo()
    x0, x1, y0, y1 = lineas_de_borde(m)
    con_diente = m.copy()
    con_diente[(y0 + y1) // 2 - 4:(y0 + y1) // 2 + 4, x0 - 8:x0] = True   # 4 × 4 m pegados al lado oeste
    etiquetas, lotes = lotes_por_lados(con_diente, METRO, semilla=3)
    assert len({(round(l['eu'][0], 2), round(l['eu'][1], 2)) for l in lotes.values()}) == 4



def test_una_calle_pintada_de_jardin_parte_la_manzana_por_donde_va_la_calle_de_hoy():
    from tools.geo.lados import cortar_por_calles
    # dos cuadras de 50 × 100 m unidas por 10 m de jardín (la calle, en el plano, pintada de verde)
    m = np.zeros((260, 300), bool)
    m[30:230, 30:250] = True
    libre = np.zeros(m.shape, bool)
    libre[30:230, 130:150] = True                 # el jardín: lo que no es casa ni edificio público
    calles = np.zeros(m.shape, bool)
    calles[:, 138:142] = True                     # la calle de OSM, por el medio
    piezas = cortar_por_calles(m, calles, libre, METRO)
    assert len(piezas) == 2
    juntas = np.zeros(m.shape, int)
    for k, (pieza, (x, y)) in enumerate(piezas, start=1):
        h, w = pieza.shape
        juntas[y:y + h, x:x + w][pieza] = k
    assert not (juntas[30:230, 138:142] > 0).any()                    # por donde va la calle, nada
    assert set(np.unique(juntas[30:230, 30:130])) == {1} or set(np.unique(juntas[30:230, 30:130])) == {2}


def test_la_calle_de_hoy_no_corta_casas():
    from tools.geo.lados import cortar_por_calles
    m = np.zeros((260, 300), bool)
    m[30:230, 30:250] = True
    calles = np.zeros(m.shape, bool)
    calles[:, 138:142] = True                     # una avenida de después de 1936, que pasa sobre casas
    assert cortar_por_calles(m, calles, np.zeros(m.shape, bool), METRO) is None


# --- el polígono de afuera (la cara de la red, tools/geo/caras.py), la tolerancia y el retiro ---

def cuadrado_dentado(dientes_m=3.0):
    """Una cuadra de 100 × 100 m con el borde dentado: cada 8 m, un diente de `dientes_m` hacia adentro."""
    m = np.zeros((280, 280), bool)
    m[40:240, 40:240] = True
    d = int(dientes_m / METRO)
    for k in range(48, 232, 32):
        m[40:40 + d, k:k + 10] = False
        m[240 - d:240, k:k + 10] = False
        m[k:k + 10, 40:40 + d] = False
        m[k:k + 10, 240 - d:240] = False
    return m


def test_un_borde_muy_dentado_se_reparte_con_una_tolerancia_mayor():
    resultado = lotes_por_lados(cuadrado_dentado(6.0), METRO, semilla=2)
    assert resultado is not None
    _, lotes = resultado
    assert len({(round(l['eu'][0], 2), round(l['eu'][1], 2)) for l in lotes.values()}) == 4


def test_con_el_poligono_de_la_cara_los_lotes_siguen_sus_lados_aunque_la_cuadra_tenga_una_muesca():
    m = np.zeros((280, 280), bool)
    m[40:240, 40:240] = True
    m[40:120, 110:170] = False     # una plaza de 30 × 40 m abierta al norte
    cara = np.array([[40, 40], [240, 40], [240, 240], [40, 240]], float)
    etiquetas, lotes = lotes_por_lados(m, METRO, semilla=2, poligono=cara)
    assert ((etiquetas > 0) == m).mean() > 0.995
    al_norte = [l for l in lotes.values() if l['eu'][0] < -0.99 or l['eu'][0] > 0.99]
    al_norte = [l for l in al_norte if l['origen'][1] < 140]
    retirados = [l for l in al_norte if l['origen'][1] > 100]
    en_linea = [l for l in al_norte if abs(l['origen'][1] - 40) < 1]
    assert retirados and en_linea       # los del fondo de la plaza dan a ella; los demás, a la calle
    for l in retirados:
        assert l['origen'][1] == pytest.approx(120, abs=1.5) and l['fondo'] <= 60 + 1
        assert 110 - 14 / METRO <= l['origen'][0] <= 170 + 14 / METRO


def test_un_lote_sin_muesca_no_se_retira():
    _, lotes = lotes_por_lados(rectangulo(), METRO, semilla=3)
    m = rectangulo()
    x0, x1, y0, y1 = lineas_de_borde(m)
    for l in lotes.values():
        ox, oy = l['origen']
        assert min(abs(ox - x0), abs(ox - x1), abs(oy - y0), abs(oy - y1)) < 1.5
