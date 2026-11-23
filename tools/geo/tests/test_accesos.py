"""Ninguna casa de 1772 queda encerrada sin acceso a la calle (T33j.5h, specs/08 fase 5)."""
import sys
from pathlib import Path

from shapely.geometry import box

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from accesos import lotes_encerrados  # noqa: E402
from cierre_fase5 import casas_sin_acceso  # noqa: E402

METRO = 0.5


def manzana_con_un_lote_al_fondo():
    """Dos casas al frente (y = 0..20 px) y una al fondo que solo toca a sus vecinas: la de la izquierda le da más
    medianera (30 px) que la de la derecha (10 px). A los costados y detrás, otras casas cierran el lote."""
    return [
        (1, box(0, 0, 40, 20)),     # frente izquierda
        (2, box(40, 0, 60, 20)),    # frente derecha
        (3, box(10, 20, 50, 40)),   # el lote encerrado: 30 px con 1, 10 px con 2, 20 px con 4 y 5, 40 px con 6
        (4, box(0, 20, 10, 40)),    # costados y fondo: cierran el lote 3
        (5, box(50, 20, 60, 40)),
        (6, box(0, 40, 60, 60)),
    ]


def todas(casas, **cambios):
    return {**{k: 7 for k, _ in casas}, **cambios}


def test_el_lote_encerrado_es_la_unica_casa_sin_acceso_del_ejemplo():
    assert casas_sin_acceso(manzana_con_un_lote_al_fondo(), METRO)['sin_acceso'] == [3]


def test_un_lote_encerrado_se_une_a_la_vecina_de_su_junta_con_mas_medianera_que_da_a_la_calle():
    casas = manzana_con_un_lote_al_fondo()
    junta = {k: (9 if k == 6 else 7) for k, _ in casas}      # el fondo es de otra junta
    nuevas, quitar = lotes_encerrados(casas, METRO, movibles={1, 2, 3, 4, 5, 6}, junta=junta,
                                      vida={k: (1, 2) for k, _ in casas})
    assert quitar == {3}
    assert set(nuevas) == {1}
    assert nuevas[1].geom_type == 'Polygon' and not nuevas[1].interiors
    assert abs(nuevas[1].area - (40 * 20 + 40 * 20)) < 1e-6
    final = [(k, nuevas.get(k, g)) for k, g in casas if k not in quitar]
    assert casas_sin_acceso(final, METRO)['sin_acceso'] == []


def test_entre_vecinas_de_la_misma_junta_gana_la_de_mas_medianera():
    casas = manzana_con_un_lote_al_fondo()
    nuevas, quitar = lotes_encerrados(casas, METRO, movibles={1, 2, 3, 4, 5, 6}, junta=todas(casas),
                                      vida={k: (1, 2) for k, _ in casas})
    assert quitar == {3} and set(nuevas) == {6}               # el fondo le da 40 px de medianera


def test_no_se_une_a_una_vecina_de_otra_junta_ni_de_otra_vida():
    casas = manzana_con_un_lote_al_fondo()
    junta = {k: (8 if k in (1, 4, 5) else 7) for k, _ in casas}
    vida = {k: ((1, 4) if k in (2, 6) else (1, 2)) for k, _ in casas}   # vivir más cambiaría 1843
    nuevas, quitar = lotes_encerrados(casas, METRO, movibles={1, 2, 3, 4, 5, 6}, junta=junta, vida=vida)
    assert (nuevas, quitar) == ({}, set())


def test_solo_se_tocan_casas_movibles():
    casas = manzana_con_un_lote_al_fondo()
    nuevas, quitar = lotes_encerrados(casas, METRO, movibles={1, 2, 4, 5, 6},   # el lote es de 1578 o de 1936
                                      junta=todas(casas), vida={k: (1, 2) for k, _ in casas})
    assert (nuevas, quitar) == ({}, set())
    nuevas, quitar = lotes_encerrados(casas, METRO, movibles={2, 3},            # la vecina no se puede tocar
                                      junta={k: (7 if k in (2, 3) else 8) for k, _ in casas},
                                      vida={k: (1, 2) for k, _ in casas})
    assert quitar == {3} and set(nuevas) == {2}


def test_no_muta_las_casas_de_entrada():
    casas = manzana_con_un_lote_al_fondo()
    antes = [(k, g.wkt) for k, g in casas]
    lotes_encerrados(casas, METRO, movibles={1, 2, 3, 4, 5, 6}, junta=todas(casas),
                     vida={k: (1, 2) for k, _ in casas})
    assert [(k, g.wkt) for k, g in casas] == antes


def test_el_segundo_lote_de_una_vuelta_ve_a_la_vecina_que_ya_absorbio_al_primero():
    """T1 se une a A; T2, que antes no tocaba a A, ahora le comparte 40 px y a B solo 10 px (revisión de #134)."""
    casas = [
        (1, box(0, 0, 50, 20)),     # A, al frente
        (2, box(50, 20, 80, 60)),   # B, da a la calle por el este
        (3, box(10, 20, 50, 50)),   # T1: 40 px con A, 30 px con B
        (4, box(10, 50, 50, 60)),   # T2: 40 px con T1, 10 px con B
        (5, box(0, 20, 10, 70)),    # de otra junta: cierran al oeste y al norte
        (6, box(10, 60, 80, 70)),
    ]
    assert casas_sin_acceso(casas, METRO)['sin_acceso'] == [3, 4]
    junta = {k: (8 if k in (5, 6) else 7) for k, _ in casas}
    nuevas, quitar = lotes_encerrados(casas, METRO, movibles={1, 2, 3, 4}, junta=junta,
                                      vida={k: (1, 2) for k, _ in casas})
    assert quitar == {3, 4} and set(nuevas) == {1}


def test_no_se_une_si_la_huella_unida_no_se_admite():
    """Una unión que el visor escondería (la huella unida pisa la zona de un hito) no se hace."""
    casas = manzana_con_un_lote_al_fondo()
    nuevas, quitar = lotes_encerrados(casas, METRO, movibles={1, 2, 3, 4, 5, 6}, junta=todas(casas),
                                      vida={k: (1, 2) for k, _ in casas}, admite=lambda huella: huella.area < 1000)
    assert (nuevas, quitar) == ({}, set())


def test_cerrar_aberturas_llena_el_hueco_del_frente_donde_el_original_pinta_edificado():
    # T33j.7c: una hilera con un hueco de 10 m (x 70..90) donde el original es rojo; se lo lleva la vecina
    from accesos import cerrar_aberturas
    from cierre_fase7 import aberturas_de_frentes
    from shapely.geometry import box as caja
    casas = [(k, caja(10 + k * 20, 12, 10 + (k + 1) * 20, 42)) for k in range(8) if k != 3]
    eje = [{'tramo': 'L1:A-B', 'sector': 'S1', 'puntos': [[0, 0], [180, 0]], 'banda_m': 6.0, 'medible': True}]
    rojo = [caja(60, 10, 100, 45)]
    nuevas = cerrar_aberturas(casas, eje, METRO, movibles={0, 1, 2, 4, 5, 6, 7}, edificado=rojo)
    assert set(nuevas) & {2, 4}
    final = [(k, nuevas.get(k, g)) for k, g in casas]
    assert [a for a in aberturas_de_frentes(eje, final, METRO, edificado=rojo) if a['indebida']] == []
    for k, g in nuevas.items():
        assert g.geom_type == 'Polygon' and g.is_valid and not g.interiors
    # sin rojo en el hueco (un solar del original), no se cierra
    assert cerrar_aberturas(casas, eje, METRO, movibles={0, 1, 2, 4, 5, 6, 7}, edificado=[caja(200, 200, 210, 210)]) == {}


def test_cerrar_aberturas_no_cierra_el_paso_de_una_casa_del_fondo():
    # el hueco del frente es el único paso de la casa del fondo (un zaguán): cerrarlo la dejaría encerrada
    from accesos import cerrar_aberturas
    from shapely.geometry import box as caja
    casas = [(k, caja(10 + k * 20, 12, 10 + (k + 1) * 20, 42)) for k in range(8) if k != 3]
    casas += [(9, caja(10, 42, 170, 70))]      # detrás de la hilera, la cierra por el fondo
    casas += [(11, caja(70, 30, 90, 42))]      # la casa del fondo del hueco: su único borde a la calle es el zaguán
    eje = [{'tramo': 'L1:A-B', 'sector': 'S1', 'puntos': [[0, 0], [180, 0]], 'banda_m': 6.0, 'medible': True}]
    rojo = [caja(60, 10, 100, 45)]
    movibles = {0, 1, 2, 4, 5, 6, 7, 9, 11}
    assert casas_sin_acceso(casas, METRO)['sin_acceso'] == []
    nuevas = cerrar_aberturas(casas, eje, METRO, movibles=movibles, edificado=rojo)
    final = [(k, nuevas.get(k, g)) for k, g in casas]
    assert casas_sin_acceso(final, METRO)['sin_acceso'] == []


def test_un_cierre_que_dejaria_una_fachada_fuera_de_la_recta_no_se_hace():
    # un hueco de dos casas (x 70..110), rojo desde 0,95 m detrás de la línea: la vecina que lo cierra quedaría con la
    # mayor parte de su frente retirado; ese cierre no se hace (no puede romper la fase 5)
    from accesos import cerrar_aberturas
    from cierre_fase5 import frentes_desalineados
    from shapely.geometry import box as caja
    casas = [(k, caja(10 + k * 20, 12, 10 + (k + 1) * 20, 42)) for k in range(8) if k not in (3, 4)]
    eje = [{'tramo': 'L1:A-B', 'sector': 'S1', 'puntos': [[0, 0], [180, 0]], 'banda_m': 6.0, 'medible': True}]
    rojo = [caja(70, 13.9, 110, 45)]     # empieza 0,95 m detrás de la línea: el punto de la abertura (a 1 m) cae adentro
    nuevas = cerrar_aberturas(casas, eje, METRO, movibles={0, 1, 2, 5, 6, 7}, edificado=rojo)
    final = [(k, nuevas.get(k, g)) for k, g in casas]
    assert frentes_desalineados(eje, final, METRO)['desalineados'] == []
