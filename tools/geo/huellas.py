"""Reparto vectorial de cuadras convexas: fachadas y medianeras sin rasterizar.

Las distancias a los lados son funciones afines dentro de una cuadra convexa. Su
bisectriz reparte cada esquina a inglete; cortar después por los frentes produce
huellas que encajan exactamente, sin el buffer independiente de cada lote raster.
"""
import numpy as np
from shapely.geometry import Polygon

try:
    from .lados import _cortes
except ImportError:
    from lados import _cortes


def _recortar(puntos, normal, limite):
    """Semiplano normal·p <= limite, conservando los cruces exactos."""
    salida = []
    for a, b in zip(puntos, np.roll(puntos, -1, axis=0)):
        da, db = a @ normal - limite, b @ normal - limite
        if da <= 1e-9:
            salida.append(a)
        if (da < -1e-9 and db > 1e-9) or (da > 1e-9 and db < -1e-9):
            salida.append(a + (b - a) * da / (da - db))
    return np.asarray(salida)


def repartir_huellas(puntos, metro, semilla):
    """[{figura, origen, eu, ancho, fondo, esquina, frente}], o None si no es convexa.

    Coordenadas en píxeles; ancho y fondo en metros, como lados.lotes_por_lados.
    """
    puntos = np.asarray(puntos, float)
    figura = Polygon(puntos)
    if not figura.is_valid or figura.area <= 0 or figura.convex_hull.area - figura.area > 1e-6:
        return None
    centro = np.array(figura.centroid.coords[0])
    lados = []
    for a, b in zip(puntos, np.roll(puntos, -1, axis=0)):
        largo = np.linalg.norm(b - a)
        if largo < 1e-8:
            return None
        ev = np.array([-(b - a)[1], (b - a)[0]]) / largo
        if (centro - a) @ ev < 0:
            ev = -ev
        eu = np.array([ev[1], -ev[0]])
        inicio = a if (b - a) @ eu > 0 else b
        lados.append((inicio, eu, ev, largo))
    rng = np.random.default_rng(int(semilla))
    casas = []
    for k, (inicio, eu, ev, largo) in enumerate(lados):
        region = puntos.copy()
        for j, (otro, _, normal, _) in enumerate(lados):
            if j != k:
                region = _recortar(region, ev - normal, inicio @ ev - otro @ normal)
        desde = 0.0
        for fin in _cortes(largo * metro, rng) / metro:
            huella = _recortar(region, -eu, -(inicio @ eu + desde))
            huella = _recortar(huella, eu, inicio @ eu + fin)
            origen = inicio + eu * desde
            casas.append({'figura': Polygon(huella), 'origen': tuple(origen), 'eu': tuple(eu),
                          'ancho': float((fin - desde) * metro),
                          'fondo': float(np.max((huella - origen) @ ev) * metro),
                          'esquina': desde == 0, 'frente': 1.0})
            desde = fin
    return casas


def huellas_de_manzana(manzana, poligono, metro, semilla):
    """Reparto exacto cuando el contorno solo difiere en el ruido de sus bordes.

    Una plaza, pasaje o hueco real conserva el reparto por máscara. La tolerancia
    es de 2 m y solo en el borde exterior: nunca se rellenan patios interiores.
    """
    import cv2
    from shapely.geometry import Point
    try:
        from .lados import poligono_de_manzana, _relleno
    except ImportError:
        from lados import poligono_de_manzana, _relleno
    if poligono is None:
        poligono = poligono_de_manzana(manzana, metro)
    if poligono is None:
        return None
    figura = Polygon(poligono)
    x0, y0, x1, y1 = figura.bounds
    margen = 2 / metro
    if x0 < -margen or y0 < -margen or x1 > manzana.shape[1] + margen or y1 > manzana.shape[0] + margen:
        return None
    faltante = _relleno(poligono, manzana.shape) & ~manzana
    ys, xs = np.nonzero(faltante)
    if any(figura.boundary.distance(Point(x + .5, y + .5)) * metro > 2 for x, y in zip(xs, ys)):
        return None
    # Un hueco encerrado, aunque sea chico, se conserva.
    n, etiquetas = cv2.connectedComponents((~manzana).astype(np.uint8), connectivity=4)
    exteriores = set(np.r_[etiquetas[0], etiquetas[-1], etiquetas[:, 0], etiquetas[:, -1]])
    if any(k not in exteriores for k in np.unique(etiquetas[faltante])):
        return None
    return repartir_huellas(poligono, metro, semilla)
