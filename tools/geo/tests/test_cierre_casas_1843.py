"""Puerta de las fases 5 a 7 de 1843 sobre las casas a la vista en 1843 (T81.5a–7a)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from cierre_casas_1843 import puerta  # noqa: E402


def _c(x, y, w, h):
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]


UNIDADES = [{'id': 'A', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _c(0, 0, 100, 100)},
            {'id': 'L', 'ocupacion': 'lote_especial', 'estado': 'aprobada', 'poligono': _c(200, 0, 50, 50)}]


def test_casas_bien_puestas_cierran():
    casas = [{'techo': 1, 'poligono': _c(0, 0, 20, 16), 'propia': True}, {'techo': 2, 'poligono': _c(20, 0, 20, 16), 'propia': False}]
    manzana_llena = [{'id': 'A', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _c(0, 0, 40, 16)}, UNIDADES[1]]
    r = puerta(casas, manzana_llena, metro=0.5)
    assert r['cerrable'] is True and all(c['cumplido'] for c in r['criterios'].values())


def test_cada_criterio_falla_por_su_causa():
    solapadas = [{'techo': 1, 'poligono': _c(0, 0, 20, 16), 'propia': False}, {'techo': 2, 'poligono': _c(10, 0, 20, 16), 'propia': False}]
    assert puerta(solapadas, UNIDADES, metro=0.5)['criterios']['lotes_sin_solapes']['pares'] == [[1, 2]]
    retirada = [{'techo': 3, 'poligono': _c(10, 10, 20, 16), 'propia': True}]
    r = puerta(retirada, UNIDADES, metro=0.5)
    assert r['criterios']['frentes_propios_sobre_la_manzana']['fuera'] == [3]
    assert r['criterios']['casas_con_acceso']['sin_acceso'] == [3]
    astilla = [{'techo': 4, 'poligono': [[0, 0], [40, 0], [40, 0.5]], 'propia': True}]
    assert puerta(astilla, UNIDADES, metro=0.5)['criterios']['huellas_sin_degenerar']['degeneradas'] == [4]
    en_lote = [{'techo': 5, 'poligono': _c(210, 10, 10, 10), 'propia': False}]
    assert puerta(en_lote, UNIDADES, metro=0.5)['criterios']['libres_sin_casas']['casas'] == [5]


def test_las_heredadas_interiores_se_cuentan_sin_cerrar_y_lo_anidado_en_un_lote_vale():
    unidades = UNIDADES + [{'id': 'R', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': _c(205, 5, 20, 20)}]
    casas = [{'techo': 6, 'poligono': _c(40, 40, 10, 10), 'propia': False},   # interior de 1936: sin frente propio
             {'techo': 7, 'poligono': _c(206, 6, 10, 10), 'propia': False}]   # en una manzana censada dentro del lote
    r = puerta(casas, unidades, metro=0.5)
    assert r['criterios']['casas_con_acceso']['cumplido'] is True
    assert r['criterios']['casas_con_acceso']['heredadas_interiores'] == [6]
    assert r['criterios']['libres_sin_casas']['casas'] == []


def test_las_heredadas_en_limite_documentado_no_impiden_cerrar():
    from cierre_casas_1843 import con_limites
    astilla = {'techo': 4, 'poligono': [[0, 0], [40, 0], [40, 0.5]], 'propia': False}
    r = puerta([astilla], UNIDADES[1:], metro=0.5)   # sin manzanas: solo la huella
    limites = [{'centro': [80 / 3, 1 / 6], 'criterio': 'huellas_sin_degenerar', 'motivo': 'heredada de 1936'}]
    r2 = con_limites(r, [astilla], limites, metro=0.5)
    assert r['cerrable'] is False and r2['criterios']['huellas_sin_degenerar']['cumplido'] is True
    assert r2['criterios']['huellas_sin_degenerar']['en_limite'] == [4]


def test_una_casa_propia_que_solo_toca_la_manzana_con_una_esquina_no_tiene_frente():
    esquina = [{'techo': 9, 'poligono': [[0, 0], [10, 10], [0, 20], [-10, 10]], 'propia': True}]   # rombo: un vértice en el borde
    unidades = [{'id': 'A', 'ocupacion': 'rayada', 'estado': 'aprobada', 'poligono': [[0, -50], [100, -50], [100, 50], [0, 50]]}]
    r = puerta(esquina, unidades, metro=0.5)
    assert r['criterios']['frentes_propios_sobre_la_manzana']['fuera'] == [9]


def test_una_manzana_con_el_frente_cortado_no_cierra_y_un_hito_cuenta_como_frente():
    casas = [{'techo': 1, 'poligono': _c(0, 0, 100, 16), 'propia': False}]   # solo el frente norte
    r = puerta(casas, UNIDADES, metro=0.5)
    assert r['criterios']['frentes_de_manzana_continuos']['cortadas'] == ['A']
    rodeada = [{'techo': k, 'poligono': p, 'propia': False} for k, p in
               enumerate([_c(0, 0, 100, 16), _c(0, 84, 100, 16), _c(0, 0, 16, 100)])]
    plantas = [_c(84, 0, 16, 100)]   # el frente este lo ocupa un hito
    assert puerta(rodeada, UNIDADES, metro=0.5, plantas=plantas)['criterios']['frentes_de_manzana_continuos']['cumplido']


def test_una_manzana_en_limite_documentado_no_impide_cerrar():
    from cierre_casas_1843 import con_limites
    r = puerta([{'techo': 1, 'poligono': _c(0, 0, 100, 16), 'propia': False}], UNIDADES, metro=0.5)
    limites = [{'unidad': 'A', 'criterio': 'frentes_de_manzana_continuos', 'motivo': 'x'}]
    r2 = con_limites(r, [], limites, metro=0.5)
    assert r2['criterios']['frentes_de_manzana_continuos']['cumplido'] and r2['criterios']['frentes_de_manzana_continuos']['en_limite'] == ['A']
