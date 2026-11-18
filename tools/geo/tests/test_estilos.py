"""Tests de los estilos por época: las reglas que salen de fuentes/imagenes/README.md."""
from collections import Counter

import pytest

from tools.geo import estilos as es
from tools.geo.estilos import ESTILO, NIVEL, NOMBRE, Casa, asignar, en_epoca, historia

METRO = 0.5
SEMILLAS = range(0, 3000)
CENTRO = (300.0, -180.0)        # a 350 m de la plaza, fuera del núcleo comercial
NUCLEO = (-40.0, 200.0)         # sobre el eje de la plaza al Teatro Municipal
BARRIO = (300.0, -1500.0)       # La Pastora
AFUERAS = (2500.0, 2500.0)
CAÑO_AMARILLO = (-950.0, -300.0)


def casa(lugar, nace=1, semilla=1234, area_m2=150.0, esquina=False, largo_m=15.0, ancho_m=10.0):
    return Casa(nace, lugar[0], lugar[1], area_m2, semilla, esquina, largo_m, ancho_m)


def reparto(lugar, e, **kw):
    """Contador de (estilo, pisos) en la época e sobre muchas semillas."""
    kw.setdefault('nace', min(e, 1))
    return Counter(en_epoca(e, casa(lugar, semilla=s, **kw)) for s in SEMILLAS)


def parte(cuenta, condicion):
    return sum(n for (estilo, pisos), n in cuenta.items() if condicion(estilo, pisos)) / sum(cuenta.values())


# --- 1578 y 1772: colonial ---

def test_en_1578_y_1772_todo_es_colonial():
    for lugar in (CENTRO, NUCLEO, BARRIO):
        assert {estilo for estilo, _ in reparto(lugar, 0, nace=0)} == {'colonial'}
        assert {estilo for estilo, _ in reparto(lugar, 1, esquina=True)} == {'colonial'}
    assert set(reparto(CENTRO, 0, nace=0, esquina=True)) == {('colonial', 1)}  # y en 1578, de un piso


# --- la ciudad baja: un piso casi todo, altos en las esquinas, edificios solo en el núcleo ---

def test_a_media_cuadra_casi_todo_es_de_un_piso_hasta_1889():
    for e in (1, 2, 3):
        assert parte(reparto(CENTRO, e), lambda _, p: p == 1) >= 0.95
        assert parte(reparto(BARRIO, e), lambda _, p: p == 1) == 1.0


def test_los_altos_de_dos_pisos_van_en_las_esquinas_del_centro():
    for e in (1, 2, 3):
        en_esquina = parte(reparto(CENTRO, e, esquina=True), lambda _, p: p == 2)
        assert 0.3 <= en_esquina <= 0.65
        assert en_esquina > 8 * parte(reparto(CENTRO, e), lambda _, p: p == 2)
        assert parte(reparto(BARRIO, e, esquina=True), lambda _, p: p >= 2) <= 0.05
        assert parte(reparto(CENTRO, e, esquina=True), lambda _, p: p >= 3) == 0.0


def test_tres_y_cuatro_pisos_solo_en_el_nucleo_comercial_y_desde_1911():
    for e in range(es.EPOCAS):
        for lugar in (CENTRO, BARRIO, AFUERAS):
            assert parte(reparto(lugar, e, esquina=True), lambda _, p: p >= 3) == 0.0
    for e in (0, 1, 2, 3):
        assert parte(reparto(NUCLEO, e), lambda _, p: p >= 3) == 0.0
    assert parte(reparto(NUCLEO, 4), lambda _, p: p >= 3) == pytest.approx(es.TRES_PISOS[4], abs=0.03)
    assert parte(reparto(NUCLEO, 4), lambda _, p: p == 4) == 0.0
    en_1936 = reparto(NUCLEO, 5)
    assert parte(en_1936, lambda _, p: p >= 3) == pytest.approx(es.TRES_PISOS[5], abs=0.03)
    assert parte(en_1936, lambda _, p: p == 4) == pytest.approx(es.CUATRO_PISOS[5], abs=0.03)
    # aun en el núcleo son los menos: la foto de los años 30 sobre los techos muestra teja de un piso
    assert 0.1 <= es.TRES_PISOS[5] <= 0.35 and es.CUATRO_PISOS[5] <= 0.12 and es.TRES_PISOS[4] <= 0.1
    assert {estilo for (estilo, p) in en_1936 if p >= 3} <= {'eclectico', 'moderno'}


def test_fuera_del_nucleo_la_ciudad_de_1936_sigue_baja():
    assert parte(reparto(CENTRO, 5), lambda _, p: p == 1) >= 0.85
    assert parte(reparto(BARRIO, 5), lambda _, p: p == 1) >= 0.95
    assert parte(reparto(AFUERAS, 5, nace=5), lambda _, p: p == 1) >= 0.95


def test_el_nucleo_va_de_la_plaza_al_municipal_y_se_apaga():
    assert es.nucleo(0, 0) == 1.0 and es.nucleo(-140, 420) == 1.0   # la plaza y el Teatro Municipal
    assert es.nucleo(-70, 200) == 1.0
    assert 0 < es.nucleo(180, 100) < 1
    assert es.nucleo(500, 0) == 0.0 and es.nucleo(0, -400) == 0.0 and es.nucleo(-140, 800) == 0.0
    assert es.centralidad(0, 0) == 1.0 and es.centralidad(0, 725) == pytest.approx(0.5) and es.centralidad(1100, 0) == 0.0


# --- la fachada cambia con el tiempo: antes en el centro, después en los barrios ---

def test_el_pretil_llega_antes_al_centro_que_a_los_barrios():
    con_pretil = lambda estilo, _: NIVEL[estilo] >= 1
    centro = [parte(reparto(CENTRO, e), con_pretil) for e in range(6)]
    barrio = [parte(reparto(BARRIO, e), con_pretil) for e in range(6)]
    assert centro[:2] == [0, 0] and barrio[:3] == [0, 0, 0]
    assert all(c > b for c, b in zip(centro[2:], barrio[2:]))
    assert centro == sorted(centro) and barrio == sorted(barrio)
    assert barrio[3] <= 0.12     # La Pastora hacia 1892: casas coloniales bajas, de alero
    assert barrio[5] >= 0.7      # La Pastora en 1930: hileras de pretil
    assert 0.4 <= centro[3] <= 0.7 and centro[5] >= 0.85


def test_los_barrios_de_1936_son_republicanos_de_un_piso():
    cuenta = reparto(BARRIO, 5, nace=3)
    assert max(cuenta, key=cuenta.get) == ('republicano', 1)
    assert parte(cuenta, lambda estilo, _: estilo == 'rancho') == 0.0
    assert 0.05 <= parte(cuenta, lambda estilo, _: estilo == 'orillas') <= 0.25   # las hileras viejas y pobres


def test_las_casas_de_las_orillas_son_de_barrio_y_de_un_piso():
    assert parte(reparto(CENTRO, 3, nace=2), lambda estilo, _: estilo == 'orillas') <= 0.05
    en_1889 = reparto(BARRIO, 3, nace=3)
    assert parte(en_1889, lambda estilo, _: estilo == 'orillas') >= 0.5
    assert all(p == 1 for (estilo, p) in en_1889 if estilo == 'orillas')
    # las que ya estaban en 1772 siguen coloniales hasta que les llega el pretil
    assert parte(reparto(BARRIO, 3, nace=1), lambda estilo, _: estilo == 'orillas') == 0.0


def test_la_historia_de_una_casa_no_vuelve_atras():
    for lugar in (CENTRO, NUCLEO, BARRIO, (700.0, 300.0)):
        for s in range(600):
            for esquina in (False, True):
                h = [en_epoca(e, casa(lugar, semilla=s, esquina=esquina)) for e in range(1, 6)]
                niveles = [NIVEL[estilo] for estilo, _ in h]
                pisos = [p for _, p in h]
                assert niveles == sorted(niveles) and pisos == sorted(pisos)


def test_estilo_y_pisos_no_dependen_uno_del_otro():
    cuenta = reparto(CENTRO, 3, esquina=True)
    altos = parte(cuenta, lambda _, p: p == 2)
    con_pretil = parte(cuenta, lambda estilo, _: NIVEL[estilo] >= 1)
    juntos = parte(cuenta, lambda estilo, p: p == 2 and NIVEL[estilo] >= 1)
    assert juntos == pytest.approx(altos * con_pretil, abs=0.04)


# --- afueras y estaciones ---

def test_ranchos_solo_lo_muy_chico_y_lejano_de_1936():
    assert set(reparto(AFUERAS, 5, nace=5, area_m2=30)) == {('rancho', 1)}
    assert not any(estilo == 'rancho' for estilo, _ in reparto(AFUERAS, 5, nace=5, area_m2=80))
    assert not any(estilo == 'rancho' for estilo, _ in reparto((1500.0, 1500.0), 5, nace=5, area_m2=30))
    assert not any(estilo == 'rancho' for estilo, _ in reparto(AFUERAS, 5, nace=4, area_m2=30))


def test_quintas_grandes_y_compactas_en_las_afueras():
    quintas = reparto(AFUERAS, 5, nace=5, area_m2=320, largo_m=20, ancho_m=16)
    assert {estilo for estilo, _ in quintas} == {'quinta'} and {p for _, p in quintas} == {1, 2}
    assert not any(estilo == 'quinta' for estilo, _ in reparto(AFUERAS, 5, nace=5, area_m2=320, largo_m=40, ancho_m=8))
    assert not any(estilo == 'quinta' for estilo, _ in reparto(CENTRO, 5, nace=5, area_m2=320, largo_m=20, ancho_m=16))


def test_galpones_largos_junto_a_la_estacion_desde_que_hay_tren():
    largo = dict(area_m2=400, largo_m=40, ancho_m=10)
    assert set(reparto(CAÑO_AMARILLO, 3, nace=3, **largo)) == {('galpon', 1)}
    assert set(reparto(CAÑO_AMARILLO, 5, nace=3, **largo)) == {('galpon', 1)}
    assert not any(estilo == 'galpon' for estilo, _ in reparto(CAÑO_AMARILLO, 2, nace=2, **largo))  # antes del tren
    assert not any(estilo == 'galpon' for estilo, _ in reparto(CAÑO_AMARILLO, 3, nace=3))  # casa corta
    assert not any(estilo == 'galpon' for estilo, _ in reparto(BARRIO, 5, nace=3, **largo))
    palo_grande = (-2000.0, 900.0)
    assert not any(estilo == 'galpon' for estilo, _ in reparto(palo_grande, 3, nace=3, **largo))
    assert set(reparto(palo_grande, 4, nace=4, **largo)) == {('galpon', 1)}


def test_las_tablas_de_probabilidad_solo_suben():
    tablas = [t for grupo in (es.PRETIL, es.GUZMAN, es.ECLECTICO, es.MODERNO, es.DOS_PISOS) for t in grupo.values()]
    for tabla in [*tablas, es.TRES_PISOS, es.CUATRO_PISOS]:
        assert len(tabla) == es.EPOCAS and list(tabla) == sorted(tabla) and tabla[0] == 0.0


# --- la ciudad entera ---

def cuadrado(x, y, lado):
    return [x, y, x + lado, y, x + lado, y + lado, x, y + lado]


def ciudad_chica():
    # 20×20 px = 10×10 m: una casa a 500 m de la plaza (nace en 1772), un edificio público y una casa de 1578
    return {
        'vertices': [*cuadrado(1000, 0, 20), *cuadrado(0, 0, 30), *cuadrado(100, 100, 20)],
        'techos': [[0, 4, 1, 0, 9], [4, 4, 3, 9, 5], [8, 4, 1, 0, 77]],
        'vida': [[1, 0], [3, 0], [0, 3]],
        'esquinas': [1, 0, 0],
        'manzanas': 2,
    }


def test_asignar_da_la_historia_de_cada_techo_sin_tocar_lo_demas():
    ciudad = ciudad_chica()
    salida = asignar(ciudad, METRO, plaza=(0, 0))
    assert salida['vertices'] == ciudad['vertices'] and salida['vida'] == ciudad['vida']
    assert len(salida['historia']) == 3 and all(len(h) == es.EPOCAS for h in salida['historia'])
    h = salida['historia'][0]
    assert h[0] == h[1] and h[1] % 16 == ESTILO['colonial']      # antes de nacer, lo de cuando nace
    t0 = salida['techos'][0]
    assert t0[:2] == [0, 4] and t0[4] == 9 and es.empacar(t0[3], t0[2]) == h[5]   # en "techos", lo de 1936
    assert ciudad['techos'][0] == [0, 4, 1, 0, 9] and 'historia' not in ciudad    # no muta la entrada


def test_los_edificios_publicos_no_cambian():
    salida = asignar(ciudad_chica(), METRO, plaza=(0, 0))
    assert salida['techos'][1] == [4, 4, 3, 9, 5]
    assert salida['historia'][1] == [9 + 16 * 3] * es.EPOCAS


def test_una_casa_que_muere_queda_con_lo_de_su_ultima_epoca():
    salida = asignar(ciudad_chica(), METRO, plaza=(0, 0))
    _, _, pisos, estilo, _ = salida['techos'][2]   # muere en 1889: lo de 1843
    assert es.empacar(estilo, pisos) == salida['historia'][2][2]


def test_asignar_usa_la_esquina_y_la_forma_de_la_huella():
    ciudad = ciudad_chica()
    con = asignar(ciudad, METRO, plaza=(0, 0))['historia']
    sin = asignar({**ciudad, 'esquinas': [0, 0, 0]}, METRO, plaza=(0, 0))['historia']
    sin_dato = asignar({k: v for k, v in ciudad.items() if k != 'esquinas'}, METRO, plaza=(0, 0))['historia']
    assert sin == sin_dato
    muchas = {**ciudad, 'techos': [[0, 4, 1, 0, s] for s in range(400)], 'vida': [[1, 0]] * 400, 'esquinas': [1] * 400}
    altos = sum(h[3] // 16 == 2 for h in asignar(muchas, METRO, plaza=(1000, 0))['historia'])
    assert 150 <= altos <= 280    # en la plaza, más de la mitad de las esquinas de 1889 tienen alto
    assert con[1] == sin[1]
    cx, cy, area, largo, ancho = es._medidas([0, 0, 80, 0, 80, 20, 0, 20], 0, 4)
    assert (cx, cy, area, largo, ancho) == pytest.approx((40, 10, 1600, 80, 20))
    girado = es._medidas([0, 0, 60, 60, 50, 70, -10, 10], 0, 4)
    assert girado[3] == pytest.approx(60 * 2 ** 0.5) and girado[4] == pytest.approx(10 * 2 ** 0.5)


def test_los_galpones_nacen_con_su_estacion_aunque_el_plano_no_dibuje_el_patio():
    # una nave de 40×12 m en Caño Amarillo (x = −950 m, z = −300 m) que según los planos nace en 1936
    x, y = (-950 - 20) / METRO, (-300 - 6) / METRO
    nave = [x, y, x + 80, y, x + 80, y + 24, x, y + 24]
    ciudad = {'vertices': [*nave, *cuadrado(0, 0, 20)], 'techos': [[0, 4, 1, 0, 3], [4, 4, 1, 0, 4]],
              'vida': [[5, 0], [5, 0]], 'manzanas': 1}
    salida = asignar(ciudad, METRO, plaza=(0, 0))
    assert salida['vida'] == [[3, 0], [5, 0]] and ciudad['vida'] == [[5, 0], [5, 0]]
    assert [b % 16 for b in salida['historia'][0][3:]] == [ESTILO['galpon']] * 3
    assert salida['techos'][0][2:4] == [1, ESTILO['galpon']]
    assert [sum(c.values()) for c in es.histograma(salida)] == [0, 0, 0, 1, 1, 2]


def test_faltan_datos_falla_claro():
    with pytest.raises(ValueError, match='vida'):
        asignar({'vertices': [], 'techos': [], 'manzanas': 0}, METRO, plaza=(0, 0))
    with pytest.raises(ValueError, match='esquinas'):
        asignar({**ciudad_chica(), 'esquinas': [1]}, METRO, plaza=(0, 0))


def test_es_determinista_por_semilla():
    assert historia(casa(CENTRO, semilla=77)) == historia(casa(CENTRO, semilla=77))
    assert asignar(ciudad_chica(), METRO, plaza=(0, 0)) == asignar(ciudad_chica(), METRO, plaza=(0, 0))


def test_histograma_cuenta_las_casas_en_pie_de_cada_epoca():
    salida = asignar(ciudad_chica(), METRO, plaza=(0, 0))
    cuentas = es.histograma(salida)
    assert [sum(c.values()) for c in cuentas] == [1, 2, 2, 2, 2, 2]
    assert cuentas[0] == {(ESTILO['colonial'], 1): 1}
    assert cuentas[5][(ESTILO['publico'], 3)] == 1
    tabla = es.tabla_md(cuentas)
    assert '| Estilo | 1578 | 1772 | 1843 | 1889 | 1911 | 1936 |' in tabla
    assert '| publico (9) | — | — | — | 1 (3p: 1) | 1 (3p: 1) | 1 (3p: 1) |' in tabla
    assert '| **casas en pie** | 1 | 2 | 2 | 2 | 2 | 2 |' in tabla
    assert set(NOMBRE) == set(ESTILO.values())


def test_main_escribe_la_salida_y_la_tabla(tmp_path, monkeypatch, capsys):
    import json
    import sys
    entrada, salida = tmp_path / 'e.json', tmp_path / 's.json'
    entrada.write_text(json.dumps(ciudad_chica()))
    monkeypatch.setattr(sys, 'argv', ['estilos.py', str(entrada), str(salida), '--escala', '0.5', '--plaza', '0,0', '--tabla'])
    es.main()
    assert len(json.loads(salida.read_text())['historia']) == 3
    assert '| Estilo |' in capsys.readouterr().out
