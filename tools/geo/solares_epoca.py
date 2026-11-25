"""Los solares de la época (specs/13 § 6, T82.9): las casas de una época anterior a 1936 por frente de manzana, del
tamaño de su época, en vez de los lotes de 1936 que la época heredaba.

Decisiones del responsable (25-11-2026, specs/13 § 6.3): la meta de casas es la de las fuentes; el centro sigue las
fuentes con gradiente (las manzanas más cercanas a la Plaza Mayor, las de menos casas: casas grandes de la élite);
las orillas, con tapia entre casa y casa (fuera de este spike).

Para cada manzana de la referencia de la época dentro del sector:
- las casas a la vista en la época con su punto en la manzana salen de esa época (las que venían de antes siguen
  en las anteriores; las que siguen en las épocas de después vuelven en la siguiente, con una copia de su techo);
- sobre cada lado de la manzana se levanta una fila de lotes del frente objetivo de su distancia a la plaza, cada
  uno con su marco sobre la línea de fachada y sus alas (tools/geo/alas.py: crujía, patios, solar), así no hay
  segunda fila (R1), las casas van paralelas a su calle (R3) y la cuenta baja hacia la plaza (R6).
No muta la ciudad. (No es tools/geo/lotes.py, que reparte en lotes las manzanas del raster de 1936.)
"""
import numpy as np
from shapely.geometry import LineString, Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

from alas import CALLE_DER, CALLE_IZQ, CRUJIA_M, LLENO_MINIMO, SOLAR, patios_segun_distancia, repartir
from vectorizar import ESTILO_COLONIAL, semilla_de

VUELO_POR_OMISION = 255        # como las casas de 1578 y las propias de 1843: sin tope de alero
FONDO_M = 45.0                 # fondo del lote (fuentes de 1772: de 43 a 63 m; specs/13 § 3), si la manzana da
FRENTE_MINIMO_M = 6.0          # un lado de manzana más corto no lleva casas
FACHADA_MINIMA_M = 3.0         # un lote con menos frente sobre la calle no da a ella
AREA_MINIMA_M2 = 30.0
TOLERANCIA_M = 3.0             # media calle angosta: una casa a menos de esto de la manzana es de ella
CALLE_LADO_M = 1.0             # un costado del lote a menos de esto del borde de la manzana da a la calle
# el frente objetivo según la distancia a la plaza (m): las casas grandes de la élite junto a la plaza (la casa natal,
# a una cuadra, mide 23 m; con 20 m, unas 18 casas por manzana: el mínimo de las matrículas del centro es 16) y el frente medio de la época más afuera (1766–1792: de 11 a 15 varas, 9 a 12,5 m)
GRADIENTE = ((0.0, 20.0), (150.0, 20.0), (500.0, 12.0), (1000.0, 10.0))
# lo techado del lote: la crujía, los patios y sus alas; detrás, el solar o corral (tipologia-17 y 22 de la
# investigación: zaguán y patio con los aposentos alrededor; las casas grandes, de varios patios, cerca de la plaza)
TECHADO = ((0.0, 32.0), (300.0, 32.0), (700.0, 22.0), (1500.0, 18.0))
REFERENCIA_LIBRES = {'lote_especial', 'plaza', 'terreno_libre', 'huerta'}


def frente_objetivo_m(distancia_m):
    """El frente de casa de una manzana a esa distancia de la plaza (interpolado en GRADIENTE)."""
    xs, ys = zip(*GRADIENTE)
    return float(np.interp(distancia_m, xs, ys))


def techado_m(distancia_m):
    """Hasta qué fondo llega lo techado de una casa a esa distancia de la plaza; detrás va el solar."""
    xs, ys = zip(*TECHADO)
    return float(np.interp(distancia_m, xs, ys))


def alas_del_lote(ancho_m, fondo_m, semilla, distancia_m, calles, crujia_m):
    """Las alas (en metros) de un lote de la época: las de alas.repartir hasta techado_m y el solar detrás."""
    techado = min(fondo_m, techado_m(distancia_m))
    azar = (int(semilla) * 40503 & 0xFFFF) / 0x10000
    alas = repartir(ancho_m, techado, semilla, patios_segun_distancia(distancia_m, azar), calles, (), crujia_m)
    if alas and fondo_m - techado > 1.0:
        alas = alas + [[SOLAR, 0.0, round(techado, 2), round(ancho_m, 2), round(fondo_m, 2)]]
    return alas


def _vive(vida, epoca):
    nace, muere = vida
    return nace <= epoca and (muere == 0 or epoca < muere)


def _mayor(g):
    if g.is_empty:
        return None
    if g.geom_type == 'Polygon':
        return g
    partes = [p for p in getattr(g, 'geoms', []) if p.geom_type == 'Polygon']
    return max(partes, key=lambda p: p.area) if partes else None


def lotes_de_la_epoca(poligono, frente_m, metro, semilla, fondo_m=FONDO_M, estorba=()):
    """[{huella, marco: {origen, eu, ancho, fondo}, calles, lleno}] de la fila de lotes de cada lado de la manzana,
    sin encimarse (la esquina es del primer lado que la toma) ni pisar `estorba`. Ancho y fondo del marco en metros;
    origen (la esquina izquierda del frente) en px; ev = (−euy, eux) mira hacia adentro. `semilla` queda para el
    reparto de alas de quien llama (los lotes no se sortean)."""
    manzana = orient(Polygon(poligono).buffer(0), sign=1.0)
    if manzana.is_empty or manzana.geom_type != 'Polygon':
        return []
    pts = np.asarray(manzana.exterior.coords, float)
    ocupado = unary_union(list(estorba)) if estorba else None
    lotes = []
    for a, b in zip(pts[:-1], pts[1:]):
        largo = float(np.hypot(*(b - a)))
        if largo * metro < FRENTE_MINIMO_M:
            continue
        eu = (b - a) / largo
        ev = np.array([-eu[1], eu[0]])
        if not manzana.contains(Point(*((a + b) / 2 + ev * 0.5))):   # ev tiene que mirar hacia adentro: al revés
            a, b, eu, ev = b, a, -eu, -ev
        hondo = max(float(((pts - a) @ ev).max()), 0.0)              # cuánto entra la manzana desde este lado
        fondo = min(fondo_m / metro, hondo / 2)
        n = max(1, int(round(largo * metro / frente_m)))
        for k in range(n):
            p, q = a + eu * largo * k / n, a + eu * largo * (k + 1) / n
            cuadro = Polygon([p, q, q + ev * fondo, p + ev * fondo])
            huella = cuadro.intersection(manzana)
            if ocupado is not None:
                huella = huella.difference(ocupado)
            huella = _mayor(huella)
            if huella is None or huella.area * metro ** 2 < AREA_MINIMA_M2:
                continue
            if huella.exterior.intersection(manzana.exterior.buffer(0.25)).length * metro < FACHADA_MINIMA_M:
                continue
            calles = 0
            for lado, bit in ((LineString([p, p + ev * fondo]), CALLE_IZQ), (LineString([q, q + ev * fondo]), CALLE_DER)):
                if manzana.exterior.distance(lado.interpolate(0.5, normalized=True)) * metro < CALLE_LADO_M:
                    calles |= bit
            lotes.append({'huella': huella, 'calles': calles, 'lleno': huella.area / cuadro.area,
                          'marco': {'origen': (float(p[0]), float(p[1])), 'eu': (float(eu[0]), float(eu[1])),
                                    'ancho': float(largo / n * metro), 'fondo': float(fondo * metro)}})
            ocupado = huella if ocupado is None else ocupado.union(huella)
    return lotes


def _copiar_techo(salida, ciudad, k, vida):
    """Agrega a `salida` una copia del techo `k` (huella y marco; las alas, compartidas) con `vida`."""
    inicio, n, *resto = ciudad['techos'][k]
    nuevo = len(salida['techos'])
    salida['techos'].append([len(salida['vertices']) // 2, n, *resto])
    salida['vertices'] += ciudad['vertices'][2 * inicio:2 * (inicio + n)]
    salida['vida'].append(list(vida))
    salida['esquinas'].append(salida['esquinas'][k])
    salida['vuelos'].append(salida['vuelos'][k])
    for m in [m for m in salida['marcos'] if int(m[0]) == k]:
        salida['marcos'].append([nuevo, *m[1:]])
    return nuevo


def _sacar_de_la_epoca(salida, ciudad, k, epoca):
    """La casa `k` deja de vivir en `epoca`; sigue en las anteriores y, con una copia, en las de después.
    → (copias, quitar): una casa que solo vivía en la época se quita (el empaquetador y estilos.py rechazan una vida
    que no cae en ninguna época; specs/12 § 8)."""
    nace, muere = ciudad['vida'][k]
    sigue = muere == 0 or muere > epoca + 1
    if nace < epoca:
        salida['vida'][k] = [nace, epoca]
        if sigue:
            _copiar_techo(salida, ciudad, k, [epoca + 1, muere])
            return 1, False
        return 0, False
    if sigue:
        salida['vida'][k] = [epoca + 1, muere]
        return 0, False
    return 0, True


def _agregar_lote(salida, lote, epoca, distancia_m, crujia_m, metro):
    huella, marco = lote['huella'], lote['marco']
    c = huella.representative_point()
    semilla = semilla_de(c.x, c.y)
    techo = len(salida['techos'])
    puntos = list(orient(huella, sign=1.0).exterior.coords)[:-1]
    salida['techos'].append([len(salida['vertices']) // 2, len(puntos), 1, ESTILO_COLONIAL, semilla])
    salida['vertices'] += [float(x) for p in puntos for x in p]
    salida['vida'].append([epoca, epoca + 1])
    salida['esquinas'].append(int(bool(lote['calles'] & (CALLE_IZQ | CALLE_DER))))
    salida['vuelos'].append(VUELO_POR_OMISION)
    alas = []
    if lote['lleno'] >= LLENO_MINIMO:
        alas = alas_del_lote(marco['ancho'], marco['fondo'], semilla, distancia_m, lote['calles'], crujia_m)
    (ox, oy), (eux, euy) = marco['origen'], marco['eu']
    salida['marcos'].append([techo, round(ox, 2), round(oy, 2), round(eux, 5), round(euy, 5), round(marco['ancho'] / metro, 2),
                             round(marco['fondo'] / metro, 2), lote['calles'], round(crujia_m / metro, 2),
                             len(salida['alas']), len(alas)])
    salida['alas'] += [[tipo, *(round(x / metro, 2) for x in medidas)] for tipo, *medidas in alas]


def solares_de_epoca(ciudad, unidades, epoca, metro, plaza, sector=None, hitos=()):
    """(ciudad nueva, informe): las casas de `epoca` en las manzanas rayadas aprobadas de `unidades` (dentro de
    `sector` = (x0, y0, x1, y1) en px, si lo hay) cambiadas por los lotes de su frente objetivo (`plaza`: px)."""
    n = len(ciudad['techos'])
    salida = {**ciudad, 'vertices': list(ciudad['vertices']), 'techos': [list(t) for t in ciudad['techos']],
              'vida': [list(v) for v in ciudad['vida']], 'esquinas': list(ciudad.get('esquinas') or [0] * n),
              'vuelos': list(ciudad.get('vuelos') or [VUELO_POR_OMISION] * n),
              'marcos': [list(m) for m in ciudad.get('marcos', [])], 'alas': [list(a) for a in ciudad.get('alas', [])]}
    zona = box(*sector) if sector else None
    aprobadas = [(u, Polygon(u['poligono']).buffer(0)) for u in unidades if u['estado'] == 'aprobada' and len(u['poligono']) >= 3]
    manzanas = [(u, f) for u, f in aprobadas
                if u['ocupacion'] == 'rayada' and (zona is None or zona.contains(f.representative_point()))]
    libres = [f for u, f in aprobadas if u['ocupacion'] in REFERENCIA_LIBRES]
    plantas = [Polygon(z).buffer(0) for h in hitos if h['nace'] <= epoca and (h['muere'] == 0 or h['muere'] > epoca)
               for z in h.get('planta', [])]
    region = unary_union([f.buffer(TOLERANCIA_M / metro) for _, f in manzanas]) if manzanas else None
    v = np.asarray(ciudad['vertices'], float).reshape(-1, 2)
    reemplazadas = copias = 0
    quitar = set()
    for k, t in enumerate(ciudad['techos']):
        if region is None or not _vive(ciudad['vida'][k], epoca):
            continue
        if region.contains(Polygon(v[t[0]:t[0] + t[1]]).buffer(0).representative_point()):
            reemplazadas += 1
            copia, sale = _sacar_de_la_epoca(salida, ciudad, k, epoca)
            copias += copia
            if sale:
                quitar.add(k)
    casas = 0
    for u, f in manzanas:
        estorba = [g for g in libres + plantas if g.intersects(f) and g.area < f.area]
        distancia = Point(plaza).distance(f.representative_point()) * metro
        semilla_m = semilla_de(*f.representative_point().coords[0])
        crujia = CRUJIA_M[0] + (CRUJIA_M[1] - CRUJIA_M[0]) * ((int(semilla_m) * 2654435761 & 0xFFFFFFFF) / 0xFFFFFFFF)
        for lote in lotes_de_la_epoca(u['poligono'], frente_objetivo_m(distancia), metro, semilla_m, estorba=estorba):
            _agregar_lote(salida, lote, epoca, distancia, crujia, metro)
            casas += 1
    from epocas_1843 import quitar_techos
    return quitar_techos(salida, quitar), {'manzanas': len(manzanas), 'reemplazadas': reemplazadas, 'copias': copias,
                                           'casas': casas, 'quitadas': len(quitar)}
