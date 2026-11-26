"""Completa el tejido ya visible de 1772 y recorta el plan sin inventar calles.
Las huellas de respaldo son inferencias geométricas del visor, no linderos históricos aprobados.
"""
import json
from copy import deepcopy
import sys
import random
import hashlib
from pathlib import Path
from shapely.geometry import Polygon, Point
from shapely.ops import unary_union, polylabel
from shapely.strtree import STRtree
from shapely.geometry.polygon import orient


def partes(g):
    if g.is_empty:
        return []
    if g.geom_type == 'Polygon':
        return [g]
    return [p for q in getattr(g, 'geoms', []) for p in partes(q)]


def anillo(p):
    return [list(v) for v in orient(p, sign=1).exterior.coords[:-1]]


def semilla(s):
    return int(hashlib.sha256(s.encode()).hexdigest()[:16], 16)


def completar(datos, seleccion, hitos, metro):
    vertices = datos['vertices']
    vivos = [i for i, (n, f) in enumerate(datos['vida']) if n <= 1 and (not f or f > 1)]
    huellas = []
    for i in vivos:
        inicio, n = datos['techos'][i][:2]
        huellas.append(Polygon([vertices[2*j:2*j+2] for j in range(inicio, inicio+n)]).buffer(0))
    ms = deepcopy(seleccion['manzanas'])
    contornos = [Polygon(m['poligono']) for m in ms]
    ocupados = unary_union(contornos)
    restantes, originales = [], []
    for i, h in zip(vivos, huellas):
        if h.is_empty:
            continue
        mejor = max(range(len(ms)), key=lambda j: h.intersection(contornos[j]).area, default=None)
        if mejor is not None and h.intersection(contornos[mejor]).area >= .5*h.area:
            ms[mejor].setdefault('indicesOriginales', []).append(i)
            continue
        libre = h.difference(ocupados)
        if not libre.is_empty:
            restantes.append(libre)
            originales.append(i)
    # Unir parcelas que se tocan o tienen una junta de menos de 1 m; nunca atravesar una calle de 6 m.
    arbol = STRtree(restantes)
    padres = list(range(len(restantes)))
    def raiz(i):
        while padres[i] != i:
            padres[i] = padres[padres[i]]
            i = padres[i]
        return i
    for i, g in enumerate(restantes):
        for j in arbol.query(g, predicate='dwithin', distance=1/metro):
            padres[raiz(i)] = raiz(int(j))
    grupos = {}
    for i in range(len(restantes)):
        grupos.setdefault(raiz(i), []).append(i)
    reservas = [(h['id'], Polygon(p)) for h in hitos if h.get('nace', 0) <= 1 and (not h.get('muere') or h['muere'] > 1)
                for p in (h.get('suprime') or h.get('planta', []))]
    protegidos = unary_union([p for id, p in reservas if id == 'plaza-bolivar'])
    for grupo in sorted(grupos.values(), key=lambda g: (-unary_union([restantes[i] for i in g]).convex_hull.area, min(originales[i] for i in g))):
        union = unary_union([restantes[i] for i in grupo])
        # Cerrar juntas y rellenar patios interiores, conservando las concavidades del perímetro.
        cerrada = union.buffer(.51/metro, join_style=2).buffer(-.51/metro, join_style=2)
        for k, q in enumerate(partes(cerrada)):
            limite = Polygon(q.exterior).difference(ocupados).difference(protegidos)
            for l, p in enumerate(partes(limite)):
                if p.area*metro*metro < 1:
                    continue
                id = f"V1772-{min(originales[i] for i in grupo):05d}-{k}-{l}"
                rect = orient(p.minimum_rotated_rectangle, sign=1)
                puntos = anillo(rect)
                # El frente largo evita solares diminutos en las bandas estrechas de la periferia.
                if Point(puntos[0]).distance(Point(puntos[1])) < Point(puntos[1]).distance(Point(puntos[2])):
                    puntos = puntos[1:]+puntos[:1]
                ms.append({'id': id, 'poligono': puntos, 'limite': anillo(p),
                           'huecos': [[list(v) for v in h.coords[:-1]] for h in p.interiors],
                           'procedencia': 'envolvente de parcelas visibles contiguas; lindero inferido',
                           'indicesOriginales': [originales[i] for i in grupo],
                           'reservas': [{'id': nombre, 'poligono': anillo(r)} for nombre, r in reservas if r.intersects(p)],
                           'areaM2': p.area*metro*metro})
                ocupados = unary_union([ocupados,p])
    return {'manzanas': ms, 'originales1772': vivos, 'procedencia': 'referencia cuando existe; contorno de las huellas actuales en el resto'}


def abrir_corral(m):
    """Cede un solar pequeño, o el fondo de la única casa, para dejar vegetación real."""
    casas = m['casas']
    if len(casas) > 1:
        menor = min(range(len(casas)), key=lambda i: Polygon(casas[i]['huella']).area)
        m['casas'] = [c for i,c in enumerate(casas) if i != menor]
    elif casas:
        c = casas[0]
        p = Polygon(c['huella'])
        rect = list(p.minimum_rotated_rectangle.exterior.coords)[:4]
        a,b,c2,d = rect
        medio = lambda u,v: [(u[0]+v[0])/2,(u[1]+v[1])/2]
        recorte = Polygon([a,b,medio(b,c2),medio(a,d)])
        trozos = partes(p.intersection(recorte))
        if not trozos:
            raise ValueError(f"{m['id']}: no se pudo reservar un corral")
        m['casas'] = [{**c, 'huella': anillo(max(trozos,key=lambda q:q.area))}]
    else:
        raise ValueError(f"{m['id']}: el edificio histórico no deja espacio para árboles")
    m['ajusteCorral'] = m.get('ajusteCorral',0)+1


MARGEN_ALA_M = 40  # src/alas.js MARGEN_M: cuánto se estiran hacia afuera las alas del borde del lote
EPS_ALA_M = .02    # src/alas.js EPS: un ala a menos de esto del borde del lote lo toca
ALA_FRENTE, ALA_ESQUINA_IZQ, ALA_ESQUINA_DER = 2, 6, 7  # src/alas.js ALA
ALAS_CON_TEJADO = {3, 4, 5, 8}  # cruzada, laterales y fondo: estiradas como en planDeAlas


def techos_de_casa(c, metro):
    """La parte de la huella bajo tejado, como la dibuja planDeAlas (src/alas.js): la crujía y sus esquinas
    como frenteYEsquinas (del ancho de la crujía, unidas a inglete), y las demás alas estiradas hacia afuera
    si tocan el borde del marco, antes de recortarlas con la huella. alzado dibuja cada tejado aunque pise un
    patio, así que los patios y el solar no le restan nada: solo quedan abiertos donde ningún tejado los cubre."""
    ox, oy, ex, ey, ancho, fondo = c['marco'][:6]
    margen, eps = MARGEN_ALA_M/metro, EPS_ALA_M/metro
    def caja(x0, y0, x1, y1):
        return Polygon([[ox+x*ex-y*ey, oy+x*ey+y*ex] for x, y in [(x0,y0),(x1,y0),(x1,y1),(x0,y1)]])
    def estirada(x0, y0, x1, y1):
        x0, y0 = (-margen if x0 <= eps else x0), (-margen if y0 <= eps else y0)
        x1, y1 = (ancho+margen if x1 >= ancho-eps else x1), (fondo+margen if y1 >= fondo-eps else y1)
        return caja(x0, y0, x1, y1)
    de = {a[0]: a for a in c['alas']}
    frente = de.get(ALA_FRENTE)
    if frente is None:
        raise ValueError('alas: la casa no trae la crujía del frente')
    cruj = frente[4]
    hasta = lambda a: fondo+margen if a[4] >= fondo-eps else a[4]
    techos = [caja(-margen, -margen, ancho+margen, cruj)]
    if ALA_ESQUINA_IZQ in de:
        techos.append(caja(-margen, -margen, cruj, hasta(de[ALA_ESQUINA_IZQ])))
    if ALA_ESQUINA_DER in de:
        techos.append(caja(ancho-cruj, -margen, ancho+margen, hasta(de[ALA_ESQUINA_DER])))
    techos += [estirada(*a[1:]) for a in c['alas'] if a[0] in ALAS_CON_TEJADO]
    return Polygon(c['huella']).buffer(0).intersection(unary_union(techos))


def recortar_y_arbolar(ms, obstaculos_hitos, metro, intento=0, *, indexar_hitos=False):
    if intento == 0:
        ms = deepcopy(ms)
    plantas = [Polygon(p).buffer(0) for p in obstaculos_hitos]
    indice = STRtree(plantas) if indexar_hitos else None
    edificios = None if indexar_hitos else unary_union(plantas)
    for m in ms:
        limite = Polygon(m.get('limite', m['poligono']),m.get('huecos',[])).buffer(0)
        if indice is not None:
            edificios = unary_union([plantas[int(i)] for i in indice.query(limite)])
        casas = []
        for c in m['casas']:
            inter = Polygon(c['huella']).intersection(limite)
            trozos = [p for p in partes(inter) if p.area*metro*metro >= 3 and not p.interiors]
            if not trozos:
                continue
            p = max(trozos, key=lambda p: p.area)
            casas.append({**c, 'huella': anillo(p)})
        m['casas'] = casas
        techos = [techos_de_casa(c, metro) for c in casas]
        verde = limite.difference(unary_union(techos)).difference(edificios).buffer(-.25/metro)
        zonas = [p for p in partes(verde) if p.area*metro*metro > .8]
        if not zonas:
            if intento >= 12: raise ValueError(f"{m['id']}: no queda espacio libre para árboles")
            abrir_corral(m)
            recortar_y_arbolar([m], obstaculos_hitos, metro, intento+1, indexar_hitos=indexar_hitos)
            continue
        rng = random.Random(semilla(m['id']))
        area = limite.area*metro*metro
        objetivo = max(2, min(60, round(area*(.0008+.005*rng.random()**2))))
        candidatos = []
        # El punto más interior garantiza un árbol incluso en un patio pequeño o irregular.
        for z in zonas:
            p = polylabel(z, tolerance=.25/metro)
            candidatos.append((round(p.x), round(p.y)))
        x0,y0,x1,y1 = verde.bounds
        candidatos.extend((round(rng.uniform(x0,x1)),round(rng.uniform(y0,y1))) for _ in range(max(800, objetivo*100)))
        arboles = []
        for x,y in candidatos:
            p = Point(x,y)
            if not verde.contains(p):
                continue
            margen = p.distance(verde.boundary)
            r = int(min(rng.uniform(1.4,3.6)/metro, margen*.8)*metro*10)/(metro*10)
            if r*metro < .35 or any(Point(a['x'],a['y']).distance(p) < max(1.5/metro,(r+a['r'])*.68) for a in arboles):
                continue
            arboles.append({'x':x,'y':y,'r':r,'nace':1,'muere':2})
            if len(arboles) >= objetivo:
                break
        if not arboles:
            if intento >= 12: raise ValueError(f"{m['id']}: ningún árbol cabe sin invadir tejados")
            abrir_corral(m)
            recortar_y_arbolar([m], obstaculos_hitos, metro, intento+1, indexar_hitos=indexar_hitos)
            continue
        m['arboles'] = arboles
        m['arbolesObjetivo'] = objetivo
    return ms


if __name__ == '__main__':
    entrada = json.load(sys.stdin)
    if sys.argv[1] == 'completar':
        datos = json.loads(Path(sys.argv[2]).read_text())
        resultado = completar(datos, entrada['seleccion'], entrada['hitos'], entrada['metro'])
    else:
        resultado = recortar_y_arbolar(entrada['manzanas'], entrada['obstaculosHitos'], entrada['metro'], indexar_hitos=entrada.get('indexarHitos',False))
    json.dump(resultado, sys.stdout, separators=(',', ':'))
