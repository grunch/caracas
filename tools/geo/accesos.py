"""Ninguna casa de 1772 encerrada sin acceso a la calle (specs/08, fase 5; T33j.5h).

El reparto de la reconstrucción deja algún lote al fondo de su manzana, sin borde hacia afuera: entre las casas del
frente, o con la casa de otro grupo a menos de una calle delante de su fachada. Un lote así no es una casa: es el
fondo de la vecina. Se une a la vecina de su misma junta y con la misma vida (unirlas no cambia otras épocas) que sí
da a la calle, la de más medianera compartida. La medida es la de la puerta (cierre_fase5.casas_sin_acceso).
"""
import shapely
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree

from cierre_fase5 import casas_sin_acceso

GRILLA_PX = 1e-3          # la grilla de las coordenadas (milésimas de píxel, como fachadas.alinear_casas)
MEDIANERA_PX = 0.05       # dos bordes a menos de esto son la misma medianera (TOLERANCIA_BORDE_PX de la puerta)
VUELTAS = 3               # un lote unido puede darle acceso a otro que lo tocaba: se vuelve a medir


def _union(a, b):
    """La huella de dos casas vecinas como una sola: un polígono sin huecos, o None si no lo es."""
    g = unary_union([x.buffer(GRILLA_PX, join_style='mitre') for x in (a, b)]).buffer(-GRILLA_PX, join_style='mitre')
    g = shapely.set_precision(g.simplify(GRILLA_PX), GRILLA_PX)
    if g.geom_type != 'Polygon' or g.interiors or not g.is_valid:
        return None
    return Polygon(g.exterior)


def _medianera(a, b):
    return a.boundary.intersection(b.buffer(MEDIANERA_PX)).length


def _vecinas(t, lote, arbol, orden, huellas, apta):
    """Las vecinas aptas del lote, de más a menos medianera compartida."""
    vecinas = [orden[j] for j in arbol.query(lote.buffer(MEDIANERA_PX))]
    return sorted(((_medianera(lote, huellas[k]), k) for k in vecinas if k != t and apta(k)), reverse=True)


def lotes_encerrados(casas, metro, movibles, junta, vida):
    """({techo: huella unida}, techos que se quitan): cada casa movible sin acceso, unida a la vecina movible de su
    misma junta y vida que da a la calle y le comparte más medianera. `junta` y `vida`, por techo. No muta nada."""
    huellas = dict(casas)
    quitar, nuevas = set(), {}
    for _ in range(VUELTAS):
        vigentes = [(k, huellas[k]) for k, _ in casas if k not in quitar]
        sin = set(casas_sin_acceso(vigentes, metro)['sin_acceso'])
        orden = [k for k, _ in vigentes]
        arbol = STRtree([g for _, g in vigentes])
        cambio = False
        for t in sorted(sin & set(movibles)):
            def apta(k):
                return (k not in sin and k not in quitar and k in movibles and junta[k] == junta[t]
                        and tuple(vida[k]) == tuple(vida[t]))
            for largo, k in _vecinas(t, huellas[t], arbol, orden, huellas, apta):
                unida = _union(huellas[k], huellas[t]) if largo > 0 else None
                if unida is not None:
                    huellas[k] = nuevas[k] = unida
                    quitar.add(t)
                    cambio = True
                    break
        if not cambio:
            break
    return nuevas, quitar
