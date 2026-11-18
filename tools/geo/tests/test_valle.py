"""Tests del valle antes de la ciudad: lo urbanizado por época (crece.png G) y el monte (B)."""
import numpy as np

import valle


def manzanas(forma=(120, 120), lado=30, calle=8, cuantas=2, origen=20):
    """cuantas × cuantas manzanas de `lado` separadas por calles de `calle` (1 px = 1 m)."""
    m = np.zeros(forma, bool)
    for i in range(cuantas):
        for j in range(cuantas):
            y, x = origen + i * (lado + calle), origen + j * (lado + calle)
            m[y:y + lado, x:x + lado] = True
    return m


# --- lo urbanizado de una época ----------------------------------------------------------------

def test_urbanizado_incluye_las_calles_entre_las_manzanas():
    # Arrange
    m = manzanas()
    # Act
    u = valle.urbanizado(m, metro=1.0, cierre_m=6, holgura_m=0, hueco_m2=0)
    # Assert: la cruz de calles entre las cuatro manzanas es ciudad; lejos, no
    assert u[54, 35] and u[35, 54] and u[54, 54]
    assert not u[5, 5] and not u[110, 110]
    assert (u & m).sum() == m.sum()


def test_la_holgura_suma_la_calle_del_borde_y_nada_mas():
    m = manzanas()
    u = valle.urbanizado(m, metro=1.0, cierre_m=6, holgura_m=5, hueco_m2=0)
    assert u[35, 16] and not u[35, 12]


def test_los_huecos_chicos_se_rellenan_y_los_grandes_quedan():
    # Arrange: un anillo de manzanas con una plaza adentro (con sus calles, 46 × 46 m)
    m = manzanas(forma=(160, 160), cuantas=3)
    m[58:88, 58:88] = False
    # Act
    con_plaza = valle.urbanizado(m, metro=1.0, cierre_m=6, holgura_m=0, hueco_m2=3000)
    sin_rellenar = valle.urbanizado(m, metro=1.0, cierre_m=6, holgura_m=0, hueco_m2=500)
    # Assert
    assert con_plaza[73, 73]
    assert not sin_rellenar[73, 73]


def test_los_radios_van_en_metros():
    m = manzanas(forma=(60, 60), lado=15, calle=4, origen=10)       # la misma ciudad a 2 m/px
    u = valle.urbanizado(m, metro=2.0, cierre_m=6, holgura_m=0, hueco_m2=0)
    assert u[27, 17] and not u[2, 2]


def test_una_mascara_vacia_no_urbaniza_nada():
    assert not valle.urbanizado(np.zeros((20, 20), bool), 1.0, 10, 5, 100).any()


def test_la_envolvente_de_los_solares_de_1578_incluye_calles_y_plaza():
    # Arrange: 4 solares en las esquinas de un cuadrado; el del medio (la plaza) no está en la lista
    solares = [{"poligono": [[x, y], [x + 20, y], [x + 20, y + 20], [x, y + 20]]}
               for x in (20, 60) for y in (20, 60)]
    # Act
    u = valle.envolvente(solares, forma=(50, 50), escala=2)
    # Assert (celdas de 2 px): el centro y las calles, adentro; afuera, no
    assert u[25, 25] and u[12, 25] and u[25, 12]
    assert not u[5, 5] and not u[45, 25]


# --- desde cuándo ------------------------------------------------------------------------------

def test_urbanizado_desde_es_monotono_una_vez_ciudad_siempre_ciudad():
    # Arrange: el punto (0, 1) es ciudad en la época 0, falta en la 1 (error de calce) y vuelve en la 2
    a = np.array([[True, True, False, False]])
    b = np.array([[True, False, True, False]])
    c = np.array([[True, True, True, False]])
    # Act
    etapa = valle.urbanizado_desde([a, b, c])
    # Assert
    assert etapa.tolist() == [[0, 0, 1, valle.NUNCA]]


def test_lo_que_no_es_ciudad_en_la_ultima_epoca_no_lo_fue_nunca():
    # el marco de un plano viejo cae en el campo de 1936: no urbaniza
    viejo = np.array([[True, True, True]])
    ultimo = np.array([[True, False, True]])
    assert valle.urbanizado_desde([viejo, ultimo]).tolist() == [[0, valle.NUNCA, 0]]


def test_urbanizado_desde_nunca_es_posterior_a_lo_edificado():
    # una casa aislada edificada desde la época 1, sin estar en lo urbanizado de ninguna
    urbanos = [np.zeros((1, 3), bool)] * 3
    edificado = np.array([[valle.NUNCA, 1, 2]], np.uint8)
    etapa = valle.urbanizado_desde(urbanos, edificado)
    assert etapa.tolist() == [[valle.NUNCA, 1, 2]]


# --- el monte ----------------------------------------------------------------------------------

def test_el_monte_es_reproducible_y_cambia_con_la_semilla():
    agua = np.zeros((40, 60), bool)
    a = valle.monte(agua, celda_m=8, semilla=1578)
    b = valle.monte(agua, celda_m=8, semilla=1578)
    c = valle.monte(agua, celda_m=8, semilla=7)
    assert a.dtype == np.uint8 and a.shape == (40, 60)
    assert np.array_equal(a, b) and not np.array_equal(a, c)


def test_el_monte_es_mas_tupido_junto_al_agua_y_no_hay_en_el_agua():
    # Arrange: una quebrada de norte a sur
    agua = np.zeros((60, 120), bool)
    agua[:, 60] = True
    # Act
    m = valle.monte(agua, celda_m=8, semilla=1)
    # Assert
    assert (m[:, 60] == 0).all()
    assert m[:, 57:60].mean() > m[:, :30].mean() + 40
    assert m[:, 57:60].min() >= valle.MONTE_RIBERA * 255 * 0.5


def test_el_monte_ralea_en_las_cuestas_y_vuelve_en_lo_alto_del_cerro():
    # Arrange: llano al oeste, una cuesta fuerte en el medio y una meseta alta al este
    agua = np.zeros((40, 150), bool)
    x = np.arange(150) * 8.0
    altura = np.tile(np.interp(x, [0, 400, 800, 1200], [900, 900, 1300, 1900]), (40, 1))
    # Act
    m = valle.monte(agua, celda_m=8, semilla=3, altura=altura)
    llano, cuesta, selva = m[:, 5:45].mean(), m[:, 60:95].mean(), m[:, 135:].mean()
    # Assert
    assert cuesta < llano
    assert selva > cuesta and selva > 0.3 * 255


def test_fuera_del_plano_no_hay_monte():
    agua = np.zeros((20, 20), bool)
    fuera = np.zeros((20, 20), bool)
    fuera[:, :5] = True
    m = valle.monte(agua, celda_m=8, semilla=1, fuera=fuera)
    assert (m[:, :5] == 0).all() and m[:, 5:].any()


# --- relieve.bin y reducción -------------------------------------------------------------------

def test_leer_relieve_y_llevarlo_a_la_grilla(tmp_path):
    # Arrange: 3 × 2 celdas, alturas en dm (specs/02)
    ruta = tmp_path / "relieve.bin"
    np.array([3, 2, 9000, 9100, 9200, 9000, 9100, 9200], "<u2").tofile(ruta)
    # Act
    altura = valle.leer_relieve(ruta, forma=(4, 6))
    # Assert
    assert altura.shape == (4, 6)
    assert altura[0, 0] == 900.0 and altura[3, 5] == 920.0
    assert 900.0 < altura[2, 2] < 920.0


def test_sin_relieve_devuelve_none(tmp_path):
    assert valle.leer_relieve(tmp_path / "no-esta.bin", forma=(4, 6)) is None


def test_fraccion_por_celda_con_borde_parcial():
    m = np.zeros((3, 5), bool)
    m[:2, :2] = True
    m[:, 4] = True
    f = valle.fraccion(m, 2)
    assert f.shape == (2, 3)
    assert f[0, 0] == 1.0 and f[0, 1] == 0.0 and f[0, 2] == 1.0 and f[1, 2] == 1.0


# --- en epocas.py: los canales G y B de crece.png -----------------------------------------------

def test_urbanizados_de_todas_las_epocas_y_canales_del_valle():
    import epocas as ep
    from segmentar_clases import AGUA, CERRO, EDIFICADO, MARGEN

    # Arrange: máscaras de 64 × 64 celdas de 1 m (2 px del mosaico); crece.png de 8 × 8 celdas de 8 m
    forma, escala, m_px = (64, 64), 2, 1.0
    solares = [{"poligono": [[2 * x, 2 * y], [2 * x + 16, 2 * y], [2 * x + 16, 2 * y + 16], [2 * x, 2 * y + 16]]}
               for x in (24, 34) for y in (24, 34)]            # 1578: cuatro solares en el centro
    de_1772 = np.zeros(forma, bool)
    de_1772[16:48, 16:48] = True
    casas36 = np.zeros(forma, bool)
    casas36[8:56, 8:56] = True
    cfg = {"cierre_m": 3, "holgura_m": 2, "hueco_m2": 50}
    clases = np.full((128, 128), CERRO, np.uint8)               # la segmentación de 1936, en px del mosaico
    clases[16:112, 16:112] = EDIFICADO
    clases[:, 120:124] = AGUA
    clases[:16, :16] = MARGEN
    etapa_r = np.full((8, 8), ep.NUNCA, np.uint8)
    etapa_r[0, 7] = 1                                           # una casa suelta, fuera de lo urbanizado

    # Act
    urbanos = ep.urbanizados(solares, [de_1772], casas36, forma, escala, m_px, cfg)
    etapa_g, monte = ep.canales_del_valle(urbanos, etapa_r, clases, 16, 8.0, 1578, None)

    # Assert
    assert len(urbanos) == 3 and urbanos[0][30, 30] and not urbanos[0][10, 10]
    assert etapa_g.shape == (8, 8) and monte.shape == (8, 8)
    assert etapa_g[3, 3] == 0 and etapa_g[2, 2] == 1 and etapa_g[7, 7] == ep.NUNCA
    assert etapa_g[1, 3] == 2                                   # 1936 es la tercera de esta lista
    assert etapa_g[0, 7] == 1                                   # nunca después que lo edificado
    assert monte[0, 0] == 0 and monte[4, 7] == 0                # el margen y el agua, sin monte
    assert monte[7, 0] > 0
