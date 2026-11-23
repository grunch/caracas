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


def lotes_encerrados(casas, metro, movibles, junta, vida, admite=None):
    """({techo: huella unida}, techos que se quitan): cada casa movible sin acceso, unida a la vecina movible de su
    misma junta y vida que da a la calle y le comparte más medianera. `junta` y `vida`, por techo; `admite(huella)`,
    si se da, descarta las uniones que no puede haber (la que el visor escondería bajo un hito). No muta nada."""
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
                if unida is not None and (admite is None or admite(unida)):
                    huellas[k] = nuevas[k] = unida
                    quitar.add(t)
                    cambio = True
                    # la vecina creció: el árbol indexa las huellas de ahora, para el próximo lote de esta vuelta
                    arbol = STRtree([huellas[j] for j in orden])
                    break
        if not cambio:
            break
    return nuevas, quitar


CIERRE_RADIO_M = 12.0     # lo que se busca de edificado sin casas alrededor del punto de una abertura
CIERRE_MINIMO_M2 = 2.0    # menos que esto no es un hueco que cerrar
VUELTAS_CIERRE = 3        # cerrar un tramo de frente puede dejar a la vista el que sigue


ALREDEDOR_M = 40.0        # las casas que puede dejar sin acceso un cierre: las de su manzana, a esto del hueco


def _encierra(huellas, k, unida, pieza, metro):
    """¿Darle `unida` a la casa k deja sin acceso a alguna casa cercana que lo tenía? (el hueco era un zaguán)."""
    zona = pieza.buffer(ALREDEDOR_M / metro)
    cerca = [(t, g) for t, g in huellas.items() if g.intersects(zona)]
    antes = set(casas_sin_acceso(cerca, metro)['sin_acceso'])
    despues = set(casas_sin_acceso([(t, unida if t == k else g) for t, g in cerca], metro)['sin_acceso'])
    return bool(despues - antes)


def cerrar_aberturas(casas, tramos, metro, movibles, edificado, vedado=(), obstaculos=()):
    """{techo: huella crecida} que cierran las aberturas indebidas de los frentes (cierre_fase7.aberturas_de_frentes:
    un hueco de al menos una puerta donde el original pinta edificado), T33j.7c. Lo edificado del original que no
    cubre ninguna casa alrededor del punto de la abertura (a no más de CIERRE_RADIO_M, fuera de lo vedado) se le suma
    a la casa movible que más borde le comparte: se cierra con fachada, según la referencia. Un hueco donde el
    original no pinta edificado (un solar, un pasaje) queda abierto, y uno que es el paso de otra casa (un zaguán: el
    cierre la dejaría sin acceso) también. No muta nada."""
    from shapely.geometry import Point
    from cierre_fase7 import aberturas_de_frentes
    if not len(edificado):
        return {}
    rojo = unary_union(list(edificado))
    prohibido = unary_union(list(vedado) + list(obstaculos)) if len(vedado) or len(obstaculos) else None
    huellas = dict(casas)
    nuevas = {}
    for _ in range(VUELTAS_CIERRE):
        actuales = [(k, huellas[k]) for k, _ in casas]
        indebidas = [a for a in aberturas_de_frentes(tramos, actuales, metro, obstaculos, edificado) if a['indebida']]
        if not indebidas:
            break
        orden = [k for k, _ in actuales]
        arbol = STRtree([g for _, g in actuales])
        cambio = False
        for a in indebidas:
            punto = Point(a['punto'])
            zona = rojo.intersection(punto.buffer(CIERRE_RADIO_M / metro))
            cerca = [huellas[orden[j]] for j in arbol.query(zona)]
            hueco = zona.difference(unary_union(cerca)) if cerca else zona
            if prohibido is not None:
                hueco = hueco.difference(prohibido)
            partes = [q for q in getattr(hueco, 'geoms', [hueco]) if q.geom_type == 'Polygon' and not q.is_empty]
            if not partes:
                continue
            pieza = min(partes, key=lambda q: q.distance(punto))
            if pieza.area * metro ** 2 < CIERRE_MINIMO_M2:
                continue
            vecinas = sorted(((_medianera(pieza, huellas[k]), k) for k in (orden[j] for j in arbol.query(pieza.buffer(MEDIANERA_PX)))
                              if k in movibles), reverse=True)
            for largo, k in vecinas:
                unida = _union(huellas[k], pieza) if largo > 0 else None
                if unida is None or _encierra(huellas, k, unida, pieza, metro):
                    continue
                huellas[k] = nuevas[k] = unida
                cambio = True
                break
        if not cambio:
            break
    return nuevas
