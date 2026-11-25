"""Casas propias de 1843 (T81.4c): las manzanas rayadas del original sin casas a la vista en 1843.

Donde la ciudad de 1936 no tiene casas que calcen con una manzana rayada de la referencia de 1843 (crecimiento
posterior a 1772, trazado distinto), el plano de Jesurún no dice cómo eran las casas: solo que la manzana estaba
urbanizada. Se levanta una crujía de casas de un piso sobre cada frente, de FRENTE_M de ancho y CRUJIA_M de fondo,
con el patio libre (la casa de patio de specs/06 § 4), como reconstrucción y no como dato. Viven desde 1843 hasta
la primera época en que una casa de 1936 aparece en la manzana (o siempre, si ninguna).

Lógica pura sobre la ciudad del generador (vértices y techos en px del mosaico de 1936).
"""
import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.strtree import STRtree

from vectorizar import ESTILO_COLONIAL, semilla_de

CRUJIA_M = 8.0       # fondo de la crujía de frente de una casa colonial de un piso (specs/06 § 4)
FRENTE_M = 10.0      # ancho de un lote de frente
RETIRO_M = 0.5       # la casa no toca el borde leído de la manzana (el borde va a ojo, ±1 m)
AREA_MINIMA_M2 = 12.0
VUELO_POR_OMISION = 255   # como las casas de 1578: sin tope de alero


def casas_de_manzana(poligono, metro, crujia_m=CRUJIA_M, frente_m=FRENTE_M, retiro_m=RETIRO_M):
    """Huellas (shapely, px del mosaico) de una crujía sobre cada lado de la manzana, sin solaparse."""
    manzana = orient(Polygon(poligono).buffer(0), sign=1.0)
    if retiro_m:
        manzana = manzana.buffer(-retiro_m / metro, join_style=2)
    if manzana.is_empty or manzana.geom_type != 'Polygon':
        return []
    patio = manzana.buffer(-crujia_m / metro, join_style=2)
    if patio.is_empty or patio.area < (crujia_m / metro) ** 2:
        return [manzana]                        # demasiado chica para patio: una sola casa
    anillo = manzana.difference(patio)
    coords = list(manzana.exterior.coords)
    fondo = crujia_m / metro * 1.5
    casas, ocupado = [], None
    for a, b in zip(coords[:-1], coords[1:]):
        lado = LineString([a, b])
        n = max(1, int(round(lado.length * metro / frente_m)))
        ux, uy = (b[0] - a[0]) / lado.length, (b[1] - a[1]) / lado.length
        nx, ny = -uy, ux                         # hacia adentro en un polígono antihorario (y hacia abajo: igual da)
        if not manzana.contains(Point(a[0] + (b[0] - a[0]) / 2 + nx, a[1] + (b[1] - a[1]) / 2 + ny)):
            nx, ny = -nx, -ny
        for k in range(n):
            p = lado.interpolate(k / n, normalized=True).coords[0]
            q = lado.interpolate((k + 1) / n, normalized=True).coords[0]
            cuadro = Polygon([p, q, (q[0] + nx * fondo, q[1] + ny * fondo), (p[0] + nx * fondo, p[1] + ny * fondo)])
            casa = cuadro.intersection(anillo)
            if ocupado is not None:
                casa = casa.difference(ocupado)
            if casa.geom_type == 'MultiPolygon':
                casa = max(casa.geoms, key=lambda g: g.area)
            if casa.is_empty or casa.geom_type != 'Polygon' or casa.area * metro ** 2 < AREA_MINIMA_M2:
                continue
            casas.append(casa)
            ocupado = casa if ocupado is None else ocupado.union(casa)
    return casas


LIBRES = {'lote_especial', 'plaza', 'huerta', 'terreno_libre'}


def _sin(casa, libres, metro):
    """La casa sin lo que pisa de un lote especial, plaza o huerta de su manzana (el pedazo mayor), o None."""
    for f in libres:
        casa = casa.difference(f)
    if casa.geom_type == 'MultiPolygon':
        casa = max(casa.geoms, key=lambda g: g.area)
    if casa.is_empty or casa.geom_type != 'Polygon' or casa.area * metro ** 2 < AREA_MINIMA_M2:
        return None
    return casa


def _centros(ciudad):
    v = np.asarray(ciudad['vertices'], float).reshape(-1, 2)
    return [Point(v[t[0]:t[0] + t[1]].mean(axis=0)) for t in ciudad['techos']]


def _vive(vida, epoca):
    nace, muere = vida
    return nace <= epoca and (muere == 0 or epoca < muere)


def sin_casas(unidades, ciudad, epoca):
    """Las manzanas rayadas aprobadas sin ninguna casa viva en `epoca` con el centro adentro."""
    centros = _centros(ciudad)
    vivas = [c for c, v in zip(centros, ciudad['vida']) if _vive(v, epoca)]
    arbol = STRtree(vivas) if vivas else None
    salida = []
    for u in unidades:
        if u['estado'] != 'aprobada' or u['ocupacion'] != 'rayada' or len(u['poligono']) < 3:
            continue
        figura = Polygon(u['poligono']).buffer(0)
        if arbol is None or not len(arbol.query(figura, predicate='contains')):
            salida.append(u)
    return salida


def agregar_casas(ciudad, unidades, metro, epoca):
    """(ciudad nueva con las casas propias al final, {manzanas, casas}). No muta la ciudad."""
    centros = _centros(ciudad)
    arbol = STRtree(centros) if centros else None
    vertices, techos = list(ciudad['vertices']), list(ciudad['techos'])
    n = len(techos)
    esquinas, vida = list(ciudad.get('esquinas', [0] * n)), list(ciudad['vida'])
    vuelos = list(ciudad.get('vuelos', [VUELO_POR_OMISION] * n))
    libres = [Polygon(u['poligono']).buffer(0) for u in unidades
              if u['estado'] == 'aprobada' and u['ocupacion'] in LIBRES and len(u['poligono']) >= 3]
    manzanas = 0
    for u in sin_casas(unidades, ciudad, epoca):
        figura = Polygon(u['poligono']).buffer(0)
        cerca = arbol.query(figura, predicate='contains') if arbol is not None else []
        despues = [ciudad['vida'][i][0] for i in cerca if ciudad['vida'][i][0] > epoca]
        muere = min(despues) if despues else 0
        adentro = [f for f in libres if f.intersects(figura)]
        casas = [_sin(casa, adentro, metro) for casa in casas_de_manzana(u['poligono'], metro)]
        casas = [c for c in casas if c is not None]
        manzanas += bool(casas)
        for casa in casas:
            puntos = list(casa.exterior.coords)[:-1]
            c = casa.centroid
            techos.append([len(vertices) // 2, len(puntos), 1, ESTILO_COLONIAL, semilla_de(c.x, c.y)])
            vertices += [round(float(x), 2) for p in puntos for x in p]
            esquinas.append(0)
            vida.append([epoca, muere])
            vuelos.append(VUELO_POR_OMISION)
    nueva = {**ciudad, 'vertices': vertices, 'techos': techos, 'esquinas': esquinas, 'vida': vida, 'vuelos': vuelos}
    return nueva, {'manzanas': manzanas, 'casas': len(techos) - len(ciudad['techos'])}
