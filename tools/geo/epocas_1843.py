"""Casas propias de 1843 (T81.4c): los frentes de las manzanas rayadas del original sin casas a la vista en 1843.

Donde la ciudad de 1936 no tiene casas que calcen con una manzana rayada de la referencia de 1843 (crecimiento
posterior a 1772, trazado distinto), o solo tiene algunas y deja frentes vacíos, el plano de Jesurún no dice cómo
eran las casas: solo que la manzana entera estaba urbanizada. Se levanta una crujía de casas de un piso sobre cada frente, de FRENTE_M de ancho y CRUJIA_M de fondo,
con el patio libre (la casa de patio de specs/06 § 4), como reconstrucción y no como dato. Cada tramo vive desde 1843
hasta que nace una casa que lo pisa (o siempre, si ninguna).

Lógica pura sobre la ciudad del generador (vértices y techos en px del mosaico de 1936).
"""
import numpy as np
import shapely
from shapely.geometry import LineString, Point, Polygon
from shapely.geometry.polygon import orient
from shapely.strtree import STRtree

from vectorizar import ESTILO_COLONIAL, semilla_de

CRUJIA_M = 8.0       # fondo de la crujía de frente de una casa colonial de un piso (specs/06 § 4)
FRENTE_M = 10.0      # ancho de un lote de frente
RETIRO_M = 0.2       # la casa no toca el borde leído de la manzana; menos que la tolerancia de fachada (0,5 m)
AREA_MINIMA_M2 = 12.0
FRENTE_SOBRE_LA_CALLE_M = 0.5   # la fachada sobre el borde de la manzana (tolerancia de specs/11, decisión 1)
ANCHO_MINIMO_M = 2.0  # una casa más angosta que esto (área / lado mayor) es una astilla de esquina: no se levanta
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


def _ancho_m(f, metro):
    lados = np.diff(np.asarray(f.minimum_rotated_rectangle.exterior.coords), axis=0)
    largo = float(max(np.hypot(*lados.T))) * metro
    return f.area * metro ** 2 / largo if largo else 0.0


def _sin(casa, libres, metro):
    """La casa sin lo que pisa (lotes, plazas, huertas de su manzana; casas vivas; casas propias ya puestas), el
    pedazo mayor, o None si queda chica, astillada o con un hueco."""
    for f in libres:
        casa = casa.difference(f)
    if casa.geom_type == 'MultiPolygon':
        casa = max(casa.geoms, key=lambda g: g.area)
    if casa.is_empty or casa.geom_type != 'Polygon' or casa.area * metro ** 2 < AREA_MINIMA_M2:
        return None
    if casa.interiors:
        return None   # un lote entero dentro de la casa: el techo solo guarda el contorno y lo volvería a tapar
    if _ancho_m(casa, metro) < ANCHO_MINIMO_M:
        return None
    return casa


def _limpia(casa, metro, grilla=0.01):
    """La huella en una grilla de `grilla` px, válida tal como se va a guardar (sin puntos repetidos ni lados que
    se toquen): el empaquetador y las puertas leen esas mismas coordenadas. None si no queda una casa válida."""
    g = shapely.set_precision(casa.buffer(-2 * grilla, join_style=2), grilla)   # encogida: el ajuste no la solapa
    if g.geom_type == 'MultiPolygon':
        g = max(g.geoms, key=lambda x: x.area)
    if g.is_empty or g.geom_type != 'Polygon' or not g.is_valid or g.interiors:
        return None
    return g if g.area * metro ** 2 >= AREA_MINIMA_M2 and _ancho_m(g, metro) >= ANCHO_MINIMO_M else None


SEPARACION_M = 0.5      # una casa propia no se arrima a menos de esto de una casa viva
FRENTE_MINIMO_M = 3.0   # una casa propia con menos fachada que esto sobre su manzana no da a la calle


def frente_m(casa, borde, metro, tolerancia_m=FRENTE_SOBRE_LA_CALLE_M):
    """Metros del contorno de la casa a menos de `tolerancia_m` del borde de la manzana: la fachada sobre la calle
    (un vértice que toca el borde no es una fachada)."""
    return casa.exterior.intersection(borde.buffer(tolerancia_m / metro)).length * metro


def _centros(ciudad):
    v = np.asarray(ciudad['vertices'], float).reshape(-1, 2)
    return [Polygon(v[t[0]:t[0] + t[1]]).buffer(0).representative_point() for t in ciudad['techos']]   # siempre dentro de la casa


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


def agregar_casas(ciudad, unidades, metro, epoca, hitos=()):
    """(ciudad nueva con las casas propias al final, {manzanas, casas}). No muta la ciudad.

    En cada manzana rayada aprobada se levanta la crujía de sus frentes y se conservan los tramos que no pisan una
    casa viva en la época (a SEPARACION_M), la planta de un hito en pie ni un lote, plaza o huerta de la manzana:
    así se llenan tanto las manzanas vacías como los frentes vacíos de las que tienen algunas casas de 1936. Cada
    tramo vive desde la época hasta que nace una casa que lo pisa (o siempre, si ninguna)."""
    vertices, techos = list(ciudad['vertices']), list(ciudad['techos'])
    n = len(techos)
    esquinas, vida = list(ciudad.get('esquinas', [0] * n)), list(ciudad['vida'])
    vuelos = list(ciudad.get('vuelos', [VUELO_POR_OMISION] * n))
    libres = [Polygon(u['poligono']).buffer(0) for u in unidades
              if u['estado'] == 'aprobada' and u['ocupacion'] in LIBRES and len(u['poligono']) >= 3]
    v = np.asarray(ciudad['vertices'], float).reshape(-1, 2)
    figuras = [Polygon(v[t[0]:t[0] + t[1]]).buffer(0) for t in ciudad['techos']]
    vivas = [f.buffer(SEPARACION_M / metro) for f, vd in zip(figuras, ciudad['vida']) if _vive(vd, epoca)]
    vivas += [Polygon(z).buffer(0) for h in hitos if h['nace'] <= epoca and (h['muere'] == 0 or h['muere'] > epoca)
              for z in h.get('planta', [])]
    despues = [(f, vd[0]) for f, vd in zip(figuras, ciudad['vida']) if vd[0] > epoca]
    arbol_v = STRtree(vivas) if vivas else None
    arbol_d = STRtree([f for f, _ in despues]) if despues else None
    puestas, manzanas = [], 0
    for u in unidades:
        if u['estado'] != 'aprobada' or u['ocupacion'] != 'rayada' or len(u['poligono']) < 3:
            continue
        figura = Polygon(u['poligono']).buffer(0)
        # los lotes, plazas y huertas de la manzana; no la huerta que la envuelve (un edificio censado dentro de ella)
        estorba = [f for f in libres if f.intersects(figura) and f.area < figura.area]
        estorba += [vivas[i] for i in arbol_v.query(figura)] if arbol_v is not None else []
        estorba += [f for f in puestas if f.intersects(figura)]
        casas = []
        for casa in casas_de_manzana(u['poligono'], metro):
            casa = _sin(casa, estorba, metro)
            casa = _limpia(casa, metro) if casa is not None else None
            if casa is None or frente_m(casa, figura.exterior, metro) < FRENTE_MINIMO_M:
                continue   # sin frente: lo que pisaba le comió la fachada
            casas.append(casa)
        puestas += casas
        manzanas += bool(casas)
        for casa in casas:
            pisan = [despues[i][1] for i in arbol_d.query(casa) if despues[i][0].intersection(casa).area > 0] \
                if arbol_d is not None else []
            puntos = list(casa.exterior.coords)[:-1]
            c = casa.centroid
            techos.append([len(vertices) // 2, len(puntos), 1, ESTILO_COLONIAL, semilla_de(c.x, c.y)])
            vertices += [float(x) for p in puntos for x in p]
            esquinas.append(0)
            vida.append([epoca, min(pisan) if pisan else 0])
            vuelos.append(VUELO_POR_OMISION)
    nueva = {**ciudad, 'vertices': vertices, 'techos': techos, 'esquinas': esquinas, 'vida': vida, 'vuelos': vuelos}
    return nueva, {'manzanas': manzanas, 'casas': len(techos) - len(ciudad['techos'])}

TOLERANCIA_CALLE_M = 3.0   # media calle angosta de 1843: a menos de esto del borde, la casa es de la manzana
UNIDADES = {'rayada', 'parte_de_otra_unidad'} | LIBRES


def fuera_de_la_referencia(ciudad, unidades, metro, epoca, tolerancia_m=TOLERANCIA_CALLE_M):
    """(ciudad nueva, cuántas) con las casas que nacen en `epoca` fuera de toda unidad aprobada de la referencia
    (más de `tolerancia_m` de una manzana) naciendo en la época siguiente: en 1843 estarían en una calle o en el
    campo (T81.3a). Si morían en esa época siguiente, no viven en ninguna. Las que nacían antes no se tocan."""
    edificables, todas = [], []
    for u in unidades:
        if u['estado'] != 'aprobada' or len(u['poligono']) < 3 or u['ocupacion'] not in UNIDADES:
            continue
        f = Polygon(u['poligono']).buffer(0)
        todas.append(f)
        if u['ocupacion'] in {'rayada', 'parte_de_otra_unidad'}:
            edificables.append(f.buffer(tolerancia_m / metro))
    arbol = STRtree(todas + edificables) if todas else None
    vida, movidas, quitar = [list(v) for v in ciudad['vida']], 0, set()
    for k, c in enumerate(_centros(ciudad)):
        if vida[k][0] != epoca:
            continue
        if arbol is not None and len(arbol.query(c, predicate='within')):
            continue
        movidas += 1
        quitar |= _correr(vida, k, epoca)
    return quitar_techos({**ciudad, 'vida': vida}, quitar), movidas


def _correr(vida, k, epoca):
    """La casa k nace en la época siguiente; si moría en ella no vive en ninguna: {k} para quitarla."""
    siguiente = epoca + 1
    if vida[k][1] != 0 and vida[k][1] <= siguiente:
        return {k}
    vida[k] = [siguiente, vida[k][1]]
    return set()


def quitar_techos(ciudad, quitar):
    """La ciudad sin los techos de `quitar`, con los vértices y todas las listas por techo corridas (las de
    epocas.sin_techos, la vida y los vuelos). No toca la original."""
    if not quitar:
        return ciudad
    from epocas import sin_techos
    salida, vida = sin_techos(ciudad, ciudad['vida'], quitar)
    quedan = [k for k in range(len(ciudad['techos'])) if k not in quitar]
    salida['vida'] = vida
    if 'vuelos' in ciudad:
        salida['vuelos'] = [ciudad['vuelos'][k] for k in quedan]
    return salida


def en_lotes_libres(ciudad, unidades, epoca):
    """(ciudad nueva, cuántas) con las casas que nacen en `epoca` dentro de un lote especial, plaza o terreno libre
    aprobado (la unidad más chica que las contiene) naciendo en la época siguiente (T81.4b): el plano los pinta
    en blanco. Si morían en esa época siguiente, se quitan. Las que nacían antes no se tocan (límite de la fase 4)."""
    figuras = [(u, Polygon(u['poligono']).buffer(0)) for u in unidades
               if u['estado'] == 'aprobada' and len(u['poligono']) >= 3 and u['ocupacion'] in UNIDADES]
    arbol = STRtree([f for _, f in figuras]) if figuras else None
    vida, movidas, quitar = [list(v) for v in ciudad['vida']], 0, set()
    for k, c in enumerate(_centros(ciudad)):
        if vida[k][0] != epoca or arbol is None:
            continue
        contienen = [figuras[i] for i in arbol.query(c, predicate='within')]
        if not contienen:
            continue
        u, _ = min(contienen, key=lambda uf: uf[1].area)
        if u['ocupacion'] not in {'lote_especial', 'plaza', 'terreno_libre'}:
            continue
        movidas += 1
        quitar |= _correr(vida, k, epoca)
    return quitar_techos({**ciudad, 'vida': vida}, quitar), movidas
