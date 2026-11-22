"""Una línea de fachada por frente recto (specs/08, fase 5; T33j.5d).

Lo edificado del original de 1772 llega a 1936 por el calce, con el error de su sector, y su borde no cae sobre una
recta: las fachadas de un frente quedan en escalera o corridas. Aquí se mide cada frente como la puerta de la fase 5
(tools/geo/cierre_fase5.py): rayos perpendiculares a cada tramo recto medible de la red llevada a 1936, la primera
cuadra de la reconstrucción que tocan y la recta que siguen la mayoría de esos puntos. Lo que queda retirado de esa
recta hasta TOPE_M se rellena hasta ella; lo que sale hacia la calle, se corta. Nunca se rellena lo vedado (la calzada
de las calles de 1772 y las plantas de los hitos) ni lo que ya es de otro grupo. Un retiro mayor que el tope no es el
calce corrido: queda como está.
"""
import numpy as np
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

TOLERANCIA_FACHADA_M = 0.5   # una fachada a más de esto de la recta de su frente está fuera de ella (un píxel del mosaico)
PASO_M = 1.0                 # un rayo cada esto a lo largo del frente
ESQUINA_M = 8.0              # sin rayos a menos de esto de cada extremo del tramo: la esquina tiene dos frentes
ALCANCE_M = 20.0             # un rayo busca la fachada hasta esto del eje (media calle ancha más un retiro)
ESTACIONES_MINIMAS = 5       # un lado con menos puntos de fachada no es un frente que se pueda medir
TOPE_M = 8.0                 # lo más que se corre una fachada (inferido: el error del calce en los sectores medibles)
MUESTRA_PX = 0.25            # paso con que un rayo recorre las máscaras
GRILLA_PX = 1e-3            # la grilla de las coordenadas (milésimas de píxel, vectorizar.agregar_techo)
OBLICUIDAD_MINIMA = 0.3      # coseno entre el rayo y la normal de la recta: más oblicua, el rayo no la corta bien
GIRO_MAXIMO_GRADOS = 20.0    # cuánto puede girar una fachada respecto del eje de su tramo (la puerta no pide paralelas)
PASO_GIRO_GRADOS = 0.25      # en 30 m de frente, un cuarto de grado corre la punta 13 cm: menos que la tolerancia
SIMPLIFICACION_PX = (0.5, 1, 2)   # tolerancias con que el polígono alineado vuelve a sus pocos lados (hasta 1 m)


def estaciones(a, b, metro, esquina_m=ESQUINA_M, paso_m=PASO_M):
    """(dirección, puntos) de los rayos de un tramo recto: cada `paso_m`, desde `esquina_m` de cada extremo."""
    a, b = np.asarray(a, float), np.asarray(b, float)
    largo = float(np.hypot(*(b - a)))
    esquina, paso = esquina_m / metro, paso_m / metro
    if largo < 2 * esquina + paso:
        return None, []
    d = (b - a) / largo
    return d, [a + d * s for s in np.arange(esquina, largo - esquina + 1e-9, paso)]


def _giradas(normal):
    """La normal girada de a PASO_GIRO_GRADOS hasta GIRO_MAXIMO_GRADOS a cada lado."""
    salida = []
    for grados in np.arange(-GIRO_MAXIMO_GRADOS, GIRO_MAXIMO_GRADOS + 1e-9, PASO_GIRO_GRADOS):
        a = np.radians(grados)
        salida.append(np.array([[np.cos(a), -np.sin(a)], [np.sin(a), np.cos(a)]]) @ normal)
    return salida


def recta_de_la_mayoria(puntos, tol_px, normales=()):
    """(punto, normal) de la recta que siguen la mayoría de los puntos. Para cada dirección candidata busca la posición
    que deja más puntos a menos de la tolerancia (la de la mayoría, aunque haya varias casas corridas) y la afina por
    mínimos cuadrados totales con esos puntos. Las candidatas son las `normales` (como la del eje), cada una girada
    hasta GIRO_MAXIMO_GRADOS, y la del ajuste de todos los puntos: una fachada apenas girada respecto del eje, con casas
    del fondo que tuercen ese ajuste, no la seguía ninguna de las dos (L1772-0085: 20 de 100 puntos, con 90 en recta)."""
    centro = puntos.mean(axis=0)
    candidatas = [g for n in normales for g in _giradas(np.asarray(n, float) / np.hypot(*n))] \
        + [np.linalg.svd(puntos - centro)[2][1]]
    mejor = None
    for normal in candidatas:
        proy = np.sort(puntos @ normal)
        cuantos = np.searchsorted(proy, proy + 2 * tol_px, side='right') - np.arange(len(proy))
        k = int(np.argmax(cuantos))
        if mejor is None or cuantos[k] > mejor[0]:
            mejor = (int(cuantos[k]), normal, proy[k] + tol_px)
    _n, normal, desplazamiento = mejor
    dentro = np.abs(puntos @ normal - desplazamiento) <= tol_px
    for _ in range(4):
        if dentro.sum() < 2:
            break
        centro = puntos[dentro].mean(axis=0)
        normal = np.linalg.svd(puntos[dentro] - centro)[2][1]
        dentro = np.abs((puntos - centro) @ normal) <= tol_px
    return centro, normal


def _caja(g):
    x0, y0 = g['origen']
    alto, ancho = g['cuadra'].shape
    return x0, y0, x0 + ancho, y0 + alto


def _golpe(p, n, alcance, grupos, candidatos):
    """(grupo, punto) de la primera cuadra que corta el rayo desde p en la dirección n, o None."""
    t = np.arange(0, alcance, MUESTRA_PX)
    puntos = p + np.outer(t, n)
    columnas, filas = np.floor(puntos[:, 0]).astype(int), np.floor(puntos[:, 1]).astype(int)
    mejor = None
    for j in candidatos:
        x0, y0, x1, y1 = _caja(grupos[j])
        c, f = columnas - x0, filas - y0
        dentro = (c >= 0) & (f >= 0) & (c < x1 - x0) & (f < y1 - y0)
        if not dentro.any():
            continue
        tocan = np.zeros(len(t), bool)
        tocan[dentro] = grupos[j]['cuadra'][f[dentro], c[dentro]]
        if tocan.any():
            k = int(np.argmax(tocan))
            if mejor is None or k < mejor[0]:
                mejor = (k, j)
    return None if mejor is None else (mejor[1], puntos[mejor[0]])


def _recta_del_frente(golpes, n, tol):
    """(centro, normal hacia las casas, coseno con el rayo) de la recta de la mayoría de un lado, o None si es tan
    oblicua al rayo que no la corta bien."""
    centro, normal = recta_de_la_mayoria(np.array([h for _, h, _ in golpes]), tol, [n])
    if normal @ n < 0:
        normal = -normal
    coseno = float(n @ normal)
    return None if coseno < OBLICUIDAD_MINIMA else (centro, normal, coseno)


def _sobre_la_recta(p, n, recta):
    """Donde el rayo desde p corta la recta del frente."""
    centro, normal, coseno = recta
    return p + n * (float((centro - p) @ normal) / coseno)


def _tramos_seguidos(golpes, recta, tope, paso_px):
    """Los golpes en tramos seguidos: estaciones contiguas del mismo grupo, con la fachada a no más de `tope` de la
    recta. → [(grupo, [(punto de fachada, estación), …])]."""
    centro, normal, _coseno = recta
    tramos, actual = [], None
    for j, h, p in golpes:
        if abs(float((h - centro) @ normal)) > tope:
            actual = None
            continue
        if actual is not None and actual[0] == j and np.hypot(*(p - actual[1][-1][1])) <= 1.5 * paso_px:
            actual[1].append((h, p))
        else:
            actual = (j, [(h, p)])
            tramos.append(actual)
    return tramos


def _franjas_de_un_lado(golpes, n, recta, d_ancho, tope):
    """[(grupo, suma: bool, franja)] de un lado de un tramo. Por cada tramo seguido de un grupo, una sola figura hasta la
    recta (lo que suma: entre la recta y su fachada) y una sola banda que quita lo que sale hacia la calle: la fachada
    queda sobre la recta y el polígono del grupo no se llena de vértices (franjas sueltas por estación dejaban
    escalones y migas). Cada tramo se extiende un paso más allá de su primera y su última estación, hasta el escalón
    donde termina el retiro. Entra toda la fachada, también la que ya estaba dentro de la tolerancia."""
    franjas = []
    for j, seguidos in _tramos_seguidos(golpes, recta, tope, float(np.hypot(*d_ancho))):
        q0 = _sobre_la_recta(seguidos[0][1], n, recta) - d_ancho
        q1 = _sobre_la_recta(seguidos[-1][1], n, recta) + d_ancho
        # el borde de adentro, un píxel detrás de cada fachada tocada: la figura se funde con la cuadra sin rendijas
        adentro = [h + n for h, _p in seguidos]
        adentro = [adentro[0] - d_ancho] + adentro + [adentro[-1] + d_ancho]
        franjas.append((j, True, Polygon([q0, q1] + adentro[::-1]).buffer(0)))
        # el tope se mide en perpendicular a la recta y la banda corre por el rayo: con la recta oblicua al rayo, la
        # banda va 1/coseno más lejos para llegar a la saliente más lejana que se admite
        hondo = n * (tope + 1) / recta[2]
        franjas.append((j, False, Polygon([q0, q1, q1 - hondo, q0 - hondo])))
    return franjas


def _frentes(grupos, tramos, metro, tolerancia_m):
    """Por cada lado medible de cada tramo recto: (dirección, normal hacia las casas, golpes, recta de la mayoría).
    Los golpes son (grupo, punto de fachada, estación) de la primera cuadra de la reconstrucción que toca cada rayo."""
    tol, alcance = tolerancia_m / metro, ALCANCE_M / metro
    cajas = [box(*_caja(g)) for g in grupos]
    con_casas = [bool(g['cuadra'].any()) for g in grupos]
    for eje in tramos:
        if not eje.get('medible'):
            continue
        for a, b in zip(eje['puntos'], eje['puntos'][1:]):
            d, puntos = estaciones(a, b, metro)
            if d is None:
                continue
            banda = box(min(a[0], b[0]), min(a[1], b[1]), max(a[0], b[0]), max(a[1], b[1])).buffer(alcance)
            candidatos = [j for j, c in enumerate(cajas) if con_casas[j] and c.intersects(banda)]
            if not candidatos:
                continue
            for lado in (1, -1):
                n = np.array([-d[1], d[0]]) * lado
                golpes = []
                for p in puntos:
                    g = _golpe(p, n, alcance, grupos, candidatos)
                    if g is not None:
                        golpes.append((g[0], g[1], p))
                if len(golpes) < ESTACIONES_MINIMAS:
                    continue
                recta = _recta_del_frente(golpes, n, tol)
                if recta is not None:
                    yield d, n, golpes, recta


def _franjas(grupos, tramos, metro, tope_m, tolerancia_m):
    """{grupo: franjas que suma}, {grupo: franjas que pierde}: entre su fachada y la recta de su frente."""
    tope = tope_m / metro
    sumar, restar = {}, {}
    for d, n, golpes, recta in _frentes(grupos, tramos, metro, tolerancia_m):
        # cada franja cubre un paso a cada lado de su rayo: las vecinas se enciman y la última llega al escalón
        # donde termina el retiro (entre dos rayos quedaría una muesca)
        for j, suma, franja in _franjas_de_un_lado(golpes, n, recta, d * (PASO_M / metro), tope):
            (sumar if suma else restar).setdefault(j, []).append(franja)
    return sumar, restar


def calles_delante(grupos, tramos, metro, tolerancia_m=TOLERANCIA_FACHADA_M):
    """Lo que queda entre el eje de cada frente medido y la recta de su fachada (menos la tolerancia): la calle de 1772
    delante de la reconstrucción, solo donde un rayo encontró su fachada. Una casa de 1936 que se para ahí no vive en
    1772 (vectorizar.marcar_tapadas)."""
    tol = tolerancia_m / metro
    franjas = []
    for d, n, golpes, recta in _frentes(grupos, tramos, metro, tolerancia_m):
        ancho = d * (PASO_M / metro) / 2
        for _j, _h, p in golpes:
            q = _sobre_la_recta(p, n, recta) - n * tol
            if (q - p) @ n > 0:
                franjas.append(Polygon([p - ancho, q - ancho, q + ancho, p + ancho]))
    return unary_union(franjas) if franjas else Polygon()


def _relleno(figura, origen, forma):
    """Los píxeles de la figura por su centro: el píxel (f, c) cubre [c, c + 1) × [f, f + 1) y es de la figura si su
    centro cae adentro. Con fillPoly el borde se llevaba la fila que apenas toca, y la banda que quita lo que sale a la
    calle se comía la fila de la fachada."""
    import shapely
    mascara = np.zeros(forma, bool)
    if figura is None or figura.is_empty:
        return mascara
    x0, y0 = origen
    bx0, by0, bx1, by1 = figura.bounds
    c0, f0 = max(0, int(np.floor(bx0 - x0))), max(0, int(np.floor(by0 - y0)))
    c1, f1 = min(forma[1], int(np.ceil(bx1 - x0)) + 1), min(forma[0], int(np.ceil(by1 - y0)) + 1)
    if c0 >= c1 or f0 >= f1:
        return mascara
    cs, fs = np.meshgrid(np.arange(c0, c1) + x0 + 0.5, np.arange(f0, f1) + y0 + 0.5)
    shapely.prepare(figura)
    mascara[f0:f1, c0:c1] = shapely.contains_xy(figura, cs, fs)
    return mascara


def _ventana(g, extra, forma):
    """La caja del grupo agrandada para que quepa `extra`, dentro del plano."""
    x0, y0, x1, y1 = _caja(g)
    if extra is not None and not extra.is_empty:
        ex0, ey0, ex1, ey1 = extra.bounds
        x0, y0 = min(x0, int(np.floor(ex0))), min(y0, int(np.floor(ey0)))
        x1, y1 = max(x1, int(np.ceil(ex1)) + 1), max(y1, int(np.ceil(ey1)) + 1)
    return max(0, x0), max(0, y0), min(forma[1], x1), min(forma[0], y1)


def _en_ventana(arreglo, de, a, fondo):
    """`arreglo` (con su caja `de`) llevado a la caja `a` (que la contiene), sobre una copia de `fondo`."""
    salida = np.array(fondo, copy=True)
    dx0, dy0, dx1, dy1 = de
    ax0, ay0 = a[:2]
    salida[dy0 - ay0:dy1 - ay0, dx0 - ax0:dx1 - ax0] = arreglo
    return salida


def _de_otros(grupos, j, ventana):
    """Lo que ocupan en la ventana las cuadras de los demás grupos."""
    x0, y0, x1, y1 = ventana
    otros = np.zeros((y1 - y0, x1 - x0), bool)
    for k, g in enumerate(grupos):
        gx0, gy0, gx1, gy1 = _caja(g)
        fx0, fy0, fx1, fy1 = max(x0, gx0), max(y0, gy0), min(x1, gx1), min(y1, gy1)
        if k != j and fx0 < fx1 and fy0 < fy1:
            otros[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0] |= g['cuadra'][fy0 - gy0:fy1 - gy0, fx0 - gx0:fx1 - gx0]
    return otros


def _poligono_nuevo(g, suma, resta, otros, ventana, lados_maximos):
    """El polígono del grupo con lo que suma y sin lo que pierde (en coordenadas de la ventana nueva), o None si deja
    de ser un polígono de pocos lados: el grupo se reparte entonces por su máscara."""
    if g['poligono'] is None:
        return None
    figura = Polygon(np.asarray(g['poligono']) + g['origen'])
    if suma is not None:
        figura = figura.union(suma)
    if resta is not None:
        figura = figura.difference(resta)
    x0, y0 = ventana[:2]
    pisado = _relleno(figura, (x0, y0), otros.shape) & otros
    if pisado.any():   # el reparto exacto por lados no debe devolverle lo que es de otro grupo
        filas, columnas = np.nonzero(pisado)
        celdas = unary_union([box(x0 + c, y0 + f, x0 + c + 1, y0 + f + 1) for f, c in zip(filas, columnas)])
        figura = figura.difference(celdas.buffer(0.5, join_style='mitre'))
    partes = [q for q in getattr(figura, 'geoms', [figura]) if q.geom_type == 'Polygon' and not q.is_empty]
    if not partes:
        return None
    # la parte mayor: las migas son puntas de franjas sueltas; y sin huecos, que son rendijas entre las franjas
    figura = Polygon(max(partes, key=lambda q: q.area).exterior)
    for tolerancia_px in SIMPLIFICACION_PX:
        simple = figura.simplify(tolerancia_px)
        if simple.geom_type == 'Polygon' and simple.is_valid and len(simple.exterior.coords) - 1 <= lados_maximos:
            return np.asarray(simple.exterior.coords)[:-1] - (x0, y0)
    return None


def alinear_fachadas(grupos, tramos, clases, metro, vedado=(), edificado=1, calle=0, tope_m=TOPE_M,
                     tolerancia_m=TOLERANCIA_FACHADA_M, lados_maximos=10):
    """Los grupos de la reconstrucción (vectorizar: cuadra, clases, abierto, origen, poligono) con sus fachadas sobre la
    recta de su frente. `vedado`: polígonos que ningún relleno pisa. No muta los grupos: devuelve copias de los que
    cambian."""
    sumar, restar = _franjas(grupos, tramos, metro, tope_m, tolerancia_m)
    prohibido = unary_union(list(vedado)) if len(vedado) else None
    salida = list(grupos)
    for j in sorted(set(sumar) | set(restar)):
        g = grupos[j]
        suma = unary_union(sumar[j]) if j in sumar else None
        if suma is not None and prohibido is not None:
            suma = suma.difference(prohibido)
        resta = unary_union(restar[j]) if j in restar else None
        de, a = _caja(g), _ventana(g, suma, clases.shape)
        x0, y0, x1, y1 = a
        forma = (y1 - y0, x1 - x0)
        # lo de los demás como va quedando: lo que ya sumó un grupo vecino no lo suma este (sus franjas se enciman)
        otros = _de_otros(salida, j, a)
        cuadra = _en_ventana(g['cuadra'], de, a, np.zeros(forma, bool))
        nuevo = np.zeros(forma, bool) if suma is None else _relleno(suma, (x0, y0), forma) & ~cuadra & ~otros
        quitado = np.zeros(forma, bool) if resta is None else _relleno(resta, (x0, y0), forma)
        cuadra = (cuadra | nuevo) & ~quitado
        de_1936 = clases[y0:y1, x0:x1]
        cl = _en_ventana(g['clases'], de, a, de_1936)
        cl[nuevo] = edificado
        abierto = (_en_ventana(g['abierto'], de, a, np.zeros(forma, bool)) | (nuevo & (de_1936 == calle))) & cuadra
        salida[j] = {**g, 'origen': (x0, y0), 'cuadra': cuadra, 'clases': cl, 'abierto': abierto,
                     'poligono': _poligono_nuevo(g, suma, resta, otros, a, lados_maximos)}
    return salida


def _primera_casa(p, n, alcance, arbol, figuras, son_obstaculo):
    """(índice, punto) de la primera figura que corta el rayo desde p, o None si no hay o es un obstáculo (un hito)."""
    from shapely.geometry import LineString, Point
    rayo, origen = LineString([p, p + n * alcance]), Point(p)
    mejor = None
    for j in arbol.query(rayo, predicate='intersects'):
        corte = rayo.intersection(figuras[j])
        if corte.is_empty:
            continue
        d = origen.distance(corte)
        if mejor is None or d < mejor[0]:
            mejor = (d, j, corte)
    if mejor is None or son_obstaculo[mejor[1]]:
        return None
    _d, j, corte = mejor
    puntos = [np.asarray(c) for g in getattr(corte, 'geoms', [corte]) for c in g.coords]
    return j, min(puntos, key=lambda q: float(np.hypot(*(q - p))))


HUECO_OCUPADO_PX2 = 0.01   # un hueco que comparte menos que esto con otra casa o lo vedado no tiene nada adentro


def sin_huecos_libres(poligono, ocupado):
    """El polígono con sus huecos libres rellenos: la rendija que queda entre una franja de relleno y la casa (los
    rayos van cada metro). Un hueco con otra casa o algo vedado adentro (`ocupado`, o None) queda."""
    from shapely.geometry import Polygon as _Poligono
    quedan = [anillo for anillo in poligono.interiors
              if ocupado is not None and _Poligono(anillo).intersection(ocupado).area > HUECO_OCUPADO_PX2]
    return _Poligono(poligono.exterior, quedan)


def a_la_grilla(poligono, ocupado):
    """El polígono en la grilla de la ciudad (milésimas de píxel). Redondear puede cerrar una entrada angosta y dejar
    un hueco nuevo: el que queda libre (`ocupado`: geometría, None o una función que la da) se rellena, como los de
    las franjas."""
    import shapely
    g = shapely.set_precision(poligono.simplify(GRILLA_PX), GRILLA_PX)
    if g.geom_type == 'Polygon' and g.interiors:
        g = shapely.set_precision(sin_huecos_libres(g, ocupado() if callable(ocupado) else ocupado), GRILLA_PX)
    return g


def _cunas(golpes, n, recta, d_ancho, tol, tope, alcance):
    """[(grupo, franja)] de las cuñas de un lado: el grupo que ya está sobre la recta en alguna estación y en otras se
    retira más que el tope. No es una manzana retirada (esa no toca la recta): es la misma casa con el frente en
    diagonal (la punta de una esquina), y se rellena hasta la recta, hasta donde llega el rayo. Solo suma."""
    centro, normal, _coseno = recta
    s = [float((h - centro) @ normal) for _j, h, _p in golpes]
    en_recta = {j for (j, _h, _p), x in zip(golpes, s) if abs(x) <= tol}
    cunas = {j for (j, _h, _p), x in zip(golpes, s) if j in en_recta and x > tope}
    propios = [(j, h, p) for (j, h, p), x in zip(golpes, s) if j in cunas and x > tol]
    return [(j, figura) for j, suma, figura in _franjas_de_un_lado(propios, n, recta, d_ancho, alcance) if suma]


def alinear_casas(casas, tramos, metro, movibles, obstaculos=(), vedado=(), tope_m=TOPE_M,
                  tolerancia_m=TOLERANCIA_FACHADA_M):
    """{techo: huella nueva} de las casas `movibles` con la fachada sobre la recta de su frente, medida como la puerta de
    la fase 5 sobre las casas mismas (`casas`: [(techo, Polygon)], las que están en pie en la época). Es el último paso
    de alinear_fachadas: el reparto de cada cuadra deja casas que no llenan su lote hasta la fachada (cuñas de
    esquina, lotes de solar). Lo que suma no pisa a otra casa ni lo vedado; la huella sigue sin huecos."""
    from shapely.strtree import STRtree
    tol, tope, alcance = tolerancia_m / metro, tope_m / metro, ALCANCE_M / metro
    figuras = [c for _, c in casas] + list(obstaculos)
    son_obstaculo = [False] * len(casas) + [True] * len(obstaculos)
    if not figuras:
        return {}
    arbol = STRtree(figuras)
    manzana = manzanas_de([c for _, c in casas], metro) + [-1] * len(obstaculos)
    sumar, restar = {}, {}
    for eje in tramos:
        if not eje.get('medible'):
            continue
        for a, b in zip(eje['puntos'], eje['puntos'][1:]):
            d, puntos = estaciones(a, b, metro)
            if d is None:
                continue
            for lado in (1, -1):
                n = np.array([-d[1], d[0]]) * lado
                golpes = []
                for p in puntos:
                    g = _primera_casa(p, n, alcance, arbol, figuras, son_obstaculo)
                    if g is not None:
                        golpes.append((g[0], g[1], p))
                golpes = de_su_manzana(golpes, manzana)
                if len(golpes) < ESTACIONES_MINIMAS or len({j for j, _, _ in golpes}) < 2:
                    continue
                recta = _recta_del_frente(golpes, n, tol)
                if recta is None:
                    continue
                # solo las casas que salen de la tolerancia: las que ya están sobre la recta quedan como están
                centro, normal, _c = recta
                fuera = {j for j, h, _p in golpes if tol < abs(float((h - centro) @ normal)) <= tope}
                ancho = d * (PASO_M / metro) / 2
                for j, suma, figura in _franjas_de_un_lado(golpes, n, recta, ancho, tope):
                    if j in fuera and casas[j][0] in movibles:
                        (sumar if suma else restar).setdefault(j, []).append(figura)
                for j, figura in _cunas(golpes, n, recta, ancho, tol, tope, alcance):
                    if casas[j][0] in movibles:
                        sumar.setdefault(j, []).append(figura)
    # ningún relleno pisa lo vedado ni la planta de un hito (una angosta puede caer entre dos rayos)
    prohibido = unary_union(list(vedado) + list(obstaculos)) if len(vedado) or len(obstaculos) else None
    salida = {}
    for j in sorted(set(sumar) | set(restar)):
        techo, huella = casas[j]
        nueva = huella
        if j in sumar:
            suma = unary_union(sumar[j])
            if prohibido is not None:
                suma = suma.difference(prohibido)
            nueva = nueva.union(suma)
        if j in restar:
            nueva = nueva.difference(unary_union(restar[j]))
        # sobre la huella con sus huecos llenos: una casa dentro de un hueco, lejos de su borde, también es vecina
        zona = unary_union([Polygon(q.exterior) for q in getattr(nueva, 'geoms', [nueva])
                            if q.geom_type == 'Polygon' and not q.is_empty]).buffer(1)
        vecinas = [salida.get(casas[k][0], figuras[k]) for k in arbol.query(zona, predicate='intersects')
                   if k != j and not son_obstaculo[k]]
        # y las huellas ya cambiadas que la tocan aunque su original no (el árbol indexa los originales)
        vecinas += [f for t, f in salida.items() if t != techo and f.intersects(zona)]
        if vecinas:
            nueva = nueva.difference(unary_union(vecinas))
        partes = [q for q in getattr(nueva, 'geoms', [nueva]) if q.geom_type == 'Polygon' and not q.is_empty]
        if not partes:
            continue
        mayor = max(partes, key=lambda q: q.area)

        def ocupado(vecinas=vecinas):   # solo si hay huecos: lo vedado de toda la ciudad pesa
            g = unary_union(vecinas + ([prohibido] if prohibido is not None else []))
            return None if g.is_empty else g
        if mayor.interiors:
            mayor = sin_huecos_libres(mayor, ocupado())
        if mayor.interiors or not mayor.is_valid or mayor.area < 0.5 * huella.area:
            continue   # una huella con huecos no se puede techar; una que pierde media casa no se toca
        # en la grilla de la ciudad (milésimas de píxel): redondear después rompía la validez de alguna huella
        mayor = a_la_grilla(mayor, ocupado)
        if mayor.geom_type != 'Polygon' or mayor.is_empty or not mayor.is_valid or mayor.interiors:
            continue
        if not mayor.equals_exact(huella, 1e-6):
            salida[techo] = mayor
    return salida


CIERRE_MANZANA_M = 1.0       # dos casas a menos de 2·esto son de la misma manzana edificada (como la puerta de acceso)


def manzanas_de(figuras, metro, cierre_m=CIERRE_MANZANA_M):
    """[índice de manzana edificada por figura]: las casas se juntan cerrando los huecos de menos de 2·cierre_m."""
    from shapely.strtree import STRtree
    validas = [f if f.is_valid else f.buffer(0) for f in figuras]
    if not validas:
        return []
    g = cierre_m / metro
    juntas = unary_union(validas).buffer(g, join_style='mitre').buffer(-g, join_style='mitre')
    partes = [m for m in getattr(juntas, 'geoms', [juntas]) if not m.is_empty]
    arbol = STRtree(partes)
    salida = []
    for f in validas:
        cerca = list(arbol.query(f.representative_point(), predicate='intersects')) or list(arbol.query(f, predicate='intersects'))
        salida.append(int(cerca[0]) if cerca else -1)
    return salida


def de_su_manzana(golpes, manzana):
    """Los golpes de la manzana edificada que arma el frente (la de la mayoría de sus golpes): una casa de otra
    manzana (la de la esquina de enfrente, pasada la bocacalle, o una aislada) no es fachada de este frente."""
    if not golpes:
        return golpes
    from collections import Counter
    dominante = Counter(manzana[j] for j, *_ in golpes).most_common(1)[0][0]
    return [x for x in golpes if manzana[x[0]] == dominante]


def delante_de_la_recta(casas, tramos, metro, de_1772, tolerancia_m=TOLERANCIA_FACHADA_M):
    """Techos de las casas que no son de la reconstrucción (`de_1772`) y quedan entre la calle y la recta del frente de
    la reconstrucción, más allá de la tolerancia: paradas en la calle de 1772. La recta sale solo de la reconstrucción
    (la casa de delante tapa a las de atrás), medida como la puerta de la fase 5."""
    from shapely.strtree import STRtree
    tol, alcance = tolerancia_m / metro, ALCANCE_M / metro
    propias = [g for t, g in casas if t in de_1772]
    todas = [g for _, g in casas]
    if not propias:
        return set()
    arbol_propias, arbol_todas = STRtree(propias), STRtree(todas)
    manzana = manzanas_de(propias, metro)
    sin_obstaculos_p, sin_obstaculos_t = [False] * len(propias), [False] * len(todas)
    salida = set()
    for eje in tramos:
        if not eje.get('medible'):
            continue
        for a, b in zip(eje['puntos'], eje['puntos'][1:]):
            d, puntos = estaciones(a, b, metro)
            if d is None:
                continue
            for lado in (1, -1):
                n = np.array([-d[1], d[0]]) * lado
                golpes = [(g[0], g[1], p) for p in puntos
                          if (g := _primera_casa(p, n, alcance, arbol_propias, propias, sin_obstaculos_p)) is not None]
                golpes = de_su_manzana(golpes, manzana)
                if len(golpes) < ESTACIONES_MINIMAS or len({j for j, _, _ in golpes}) < 2:
                    continue
                recta = _recta_del_frente(golpes, n, tol)
                if recta is None:
                    continue
                centro, normal, _c = recta
                # solo las estaciones del frente medido: más allá de su manzana la recta no dice nada
                for _j, _h, p in golpes:
                    g = _primera_casa(p, n, alcance, arbol_todas, todas, sin_obstaculos_t)
                    if g is not None and casas[g[0]][0] not in de_1772 and float((g[1] - centro) @ normal) < -tol:
                        salida.add(casas[g[0]][0])
    return salida
