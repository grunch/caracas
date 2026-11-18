import pytest

from tools.geo.estilos import ESTILO, asignar, estilo_y_pisos

METRO = 0.5


def casa(nace, dist_m, area_m2=150.0, estilo=0, semilla=1234):
    return dict(nace=nace, dist_m=dist_m, area_m2=area_m2, estilo=estilo, semilla=semilla)


def test_las_casas_viejas_son_coloniales_de_un_piso():
    for nace in (0, 1):
        e, p = estilo_y_pisos(**casa(nace, 300))
        assert (e, p) == (ESTILO['colonial'], 1)


def test_cada_epoca_tiene_sus_estilos():
    estilos = lambda nace, dist, area=150.0: {estilo_y_pisos(**casa(nace, dist, area, semilla=s))[0] for s in range(400)}
    assert estilos(2, 400) <= {ESTILO['colonial'], ESTILO['republicano']}
    assert estilos(3, 400) <= {ESTILO['republicano'], ESTILO['guzmancista']}
    assert estilos(4, 400) <= {ESTILO['guzmancista'], ESTILO['eclectico']}
    assert estilos(5, 600) <= {ESTILO['eclectico'], ESTILO['moderno']}
    assert estilos(5, 3500, area=40) == {ESTILO['rancho']}
    assert estilos(5, 2000, area=40) == {ESTILO['orillas']}  # chica pero no tan lejos: casa de las orillas
    assert estilos(5, 3500, area=150) == {ESTILO['orillas']}
    assert estilos(5, 3500, area=400) == {ESTILO['quinta']}


def test_los_pisos_quedan_en_el_rango_de_cada_estilo():
    rango = {'colonial': (1, 1), 'republicano': (1, 2), 'guzmancista': (1, 2), 'eclectico': (2, 3),
             'moderno': (2, 4), 'quinta': (1, 2), 'rancho': (1, 1), 'orillas': (1, 1)}
    nombre = {v: k for k, v in ESTILO.items()}
    for nace, dist, area in [(2, 400, 150), (3, 400, 150), (4, 400, 150), (5, 600, 150), (5, 3500, 40), (5, 3500, 150), (5, 3500, 400)]:
        for s in range(300):
            e, p = estilo_y_pisos(**casa(nace, dist, area, semilla=s))
            lo, hi = rango[nombre[e]]
            assert lo <= p <= hi


def test_los_edificios_publicos_no_cambian():
    assert estilo_y_pisos(**casa(5, 300, estilo=ESTILO['publico'])) == (ESTILO['publico'], None)


def test_es_determinista_por_semilla():
    assert estilo_y_pisos(**casa(4, 500, semilla=77)) == estilo_y_pisos(**casa(4, 500, semilla=77))


def test_asignar_reescribe_estilo_y_pisos_sin_tocar_lo_demas():
    # un cuadrado de 20×20 px (10×10 m = 100 m²) a 1000 px de la plaza (500 m), nace en 1911
    ciudad = {
        'vertices': [1000, 0, 1020, 0, 1020, 20, 1000, 20, 0, 0, 30, 0, 30, 30, 0, 30],
        'techos': [[0, 4, 1, 0, 9], [4, 4, 3, 9, 5]],
        'vida': [[4, 0], [5, 0]],
        'manzanas': 2,
    }
    salida = asignar(ciudad, METRO, plaza=(0, 0))
    assert salida['vertices'] == ciudad['vertices'] and salida['vida'] == ciudad['vida']
    t0, t1 = salida['techos']
    assert t0[:2] == [0, 4] and t0[4] == 9 and t0[3] in (ESTILO['guzmancista'], ESTILO['eclectico'])
    assert t1 == [4, 4, 3, 9, 5]  # el público queda igual
    assert ciudad['techos'][0] == [0, 4, 1, 0, 9]  # no muta la entrada


def test_sin_vida_falla_claro():
    with pytest.raises(ValueError, match='vida'):
        asignar({'vertices': [], 'techos': [], 'manzanas': 0}, METRO, plaza=(0, 0))
