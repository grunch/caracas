"""Tests de la ciudad de 1578: lectura del esquema de Pimentel y casas sobre las manzanas de 1936."""
import json
from pathlib import Path

import numpy as np
import pytest
from shapely.geometry import Polygon

import epocas_1578 as e78

PIMENTEL = Path(__file__).resolve().parents[1] / "epocas" / "1578-pimentel.json"


def _datos_validos():
    manzanas = [{"fila": f, "columna": c, "manzana": [c - 2, f - 2], "solares": ["casa"] * 4}
                for f in range(5) for c in range(5)]
    manzanas[12]["solares"] = ["plaza"] * 4
    return {"estados": list(e78.ESTADOS), "manzanas": manzanas}


# --- datos de Pimentel ------------------------------------------------------------------------

def test_el_archivo_de_pimentel_es_valido_y_tiene_la_plaza_al_centro():
    datos = json.loads(PIMENTEL.read_text())
    e78.validar(datos)
    centro = [m for m in datos["manzanas"] if m["manzana"] == [0, 0]][0]
    assert centro["solares"] == ["plaza"] * 4


def test_pimentel_dibuja_la_iglesia_al_este_de_la_plaza_y_san_francisco_al_suroeste():
    datos = {tuple(m["manzana"]): m for m in json.loads(PIMENTEL.read_text())["manzanas"]}
    assert datos[(1, 0)]["solares"][0] == "iglesia"
    assert datos[(-1, 2)]["solares"] == ["convento"] * 4
    assert "cabildo" in datos[(0, -1)]["solares"]


def test_conteo_de_estados():
    conteo = e78.contar(json.loads(PIMENTEL.read_text()))
    assert conteo["casa"] == 65
    assert sum(conteo.values()) == 100


def test_validar_rechaza_estados_desconocidos_y_manzanas_mal_ubicadas():
    datos = _datos_validos()
    datos["manzanas"][0]["solares"][0] = "rancho"
    with pytest.raises(ValueError, match="estado"):
        e78.validar(datos)
    datos = _datos_validos()
    datos["manzanas"][3]["manzana"] = [9, 9]
    with pytest.raises(ValueError, match="manzana"):
        e78.validar(datos)
    datos = _datos_validos()
    datos["manzanas"].pop()
    with pytest.raises(ValueError, match="25"):
        e78.validar(datos)


# --- geometría --------------------------------------------------------------------------------

def test_afin_de_la_plaza_con_cuatro_esquinas():
    semillas = [{"i": 0, "j": 0, "px": 10, "py": 20}, {"i": 1, "j": 0, "px": 210, "py": 30},
                {"i": 0, "j": 1, "px": 0, "py": 220}, {"i": 1, "j": 1, "px": 200, "py": 230}]
    afin = e78.afin_de_semillas(semillas)
    assert afin @ [1, 1, 1] == pytest.approx([200, 230])
    assert afin @ [0, 0, 1] == pytest.approx([10, 20])


def _calles(forma=(1600, 1600), xs=(), ys=(), ancho=16):
    calle = np.zeros(forma, np.float32)
    for x in xs:
        calle[:, int(x - ancho / 2):int(x + ancho / 2)] = 1
    for y in ys:
        calle[int(y - ancho / 2):int(y + ancho / 2), :] = 1
    return calle


def test_esquinas_1936_se_ajustan_a_los_cruces_reales_aunque_el_damero_se_estire():
    # Arrange: calles reales cada 200 px, pero las del este se abren (manzanas más anchas)
    xs = [300, 500, 700, 900, 1110, 1330, 1560]
    ys = [300, 500, 700, 900, 1100, 1300, 1500]
    calle = _calles(forma=(1700, 1700), xs=xs, ys=ys)
    afin = np.array([[200.0, 0.0, 703.0], [0.0, 200.0, 697.0]])  # plaza en (2, 2) con error de 3 px

    # Act
    esquinas = e78.esquinas_1936(calle, afin, ancho_calle=16, alcance=range(-2, 4))

    # Assert
    assert esquinas[(0, 0)] == pytest.approx((700, 700), abs=1.5)
    assert esquinas[(3, 1)] == pytest.approx((1330, 900), abs=1.5)
    assert esquinas[(-2, 3)] == pytest.approx((300, 1300), abs=1.5)


def test_esquina_sin_cruce_queda_donde_la_predice_el_afin():
    calle = np.zeros((900, 900), np.float32)
    afin = np.array([[200.0, 0.0, 400.0], [0.0, 200.0, 400.0]])
    esquinas = e78.esquinas_1936(calle, afin, ancho_calle=16, alcance=range(0, 2))
    assert esquinas[(1, 1)] == pytest.approx((600, 600))


CUADRO = np.array([[1200.0, 1200.0], [1400.0, 1200.0], [1400.0, 1400.0], [1200.0, 1400.0]])


def test_solares_parten_la_manzana_en_cuatro_sin_la_media_calle():
    solares = e78.solares(CUADRO, media_calle_px=10)
    assert [s.bounds for s in solares] == [(1210, 1210, 1300, 1300), (1300, 1210, 1390, 1300),
                                           (1210, 1300, 1300, 1390), (1300, 1300, 1390, 1390)]


def test_casa_va_sobre_la_calle_del_norte_o_del_sur_con_corral_atras():
    casa_n = e78.casa_de_solar(CUADRO, 0, media_calle_px=10, fondo_px=20, retiro_px=1)
    casa_s = e78.casa_de_solar(CUADRO, 3, media_calle_px=10, fondo_px=20, retiro_px=1)
    assert casa_n.bounds == pytest.approx((1211, 1210, 1299, 1230))
    assert casa_s.bounds == pytest.approx((1301, 1370, 1389, 1390))
    assert casa_n.area < 0.25 * e78.solares(CUADRO, 10)[0].area  # el resto es corral


def test_esquinas_de_manzana_en_orden_horario_desde_el_noroeste():
    esquinas = {(i, j): (100.0 * i, 100.0 * j) for i in range(3) for j in range(3)}
    assert e78.esquinas_de_manzana(esquinas, (1, 0)).tolist() == [[100, 0], [200, 0], [200, 100], [100, 100]]


# --- ciudad -----------------------------------------------------------------------------------

def test_ciudad_1578_genera_una_casa_por_solar_con_casa_y_los_solares_con_su_estado():
    # Arrange
    datos = _datos_validos()
    datos["manzanas"][0]["solares"] = ["vacio", "casa", "iglesia", "casa"]
    esquinas = {(i, j): (1300.0 + 200 * i, 1300.0 + 200 * j) for i in range(-2, 4) for j in range(-2, 4)}

    # Act
    ciudad = e78.ciudad_1578(datos, esquinas, metro=0.5)

    # Assert
    assert len(ciudad["techos"]) == 23 * 4 + 2
    assert all(t[2] == 1 and t[3] == e78.ESTILO_COLONIAL for t in ciudad["techos"])
    assert len(ciudad["solares"]) == 100
    assert ciudad["solares"][1]["estado"] == "casa"
    v = np.asarray(ciudad["vertices"]).reshape(-1, 2)
    inicio, cuantos = ciudad["techos"][0][:2]
    casa = Polygon(v[inicio:inicio + cuantos])
    assert casa.is_valid and casa.area == pytest.approx((100 - 9.8 - 2) * 16, rel=0.01)
