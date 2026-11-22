"""Una línea de fachada por frente recto (specs/08, fase 5; T33j.5d).

Lo edificado del original de 1772 llega a 1936 por el calce, con el error de su sector, y su borde no cae sobre una
recta: las fachadas de un frente quedan en escalera o corridas. Aquí se mide cada frente como la puerta de la fase 5
(tools/geo/cierre_fase5.py): rayos perpendiculares a cada tramo recto medible de la red llevada a 1936, la primera
cuadra de la reconstrucción que tocan y la recta que siguen la mayoría de esos puntos. Lo que queda retirado de esa
recta hasta TOPE_M se rellena hasta ella; lo que sale hacia la calle, se corta. Nunca se rellena lo vedado (la calzada
de las calles de 1772 y las plantas de los hitos) ni lo que ya es de otro grupo. Un retiro mayor que el tope no es el
calce corrido: queda como está.
"""
import cv2
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
OBLICUIDAD_MINIMA = 0.3      # coseno entre el rayo y la normal de la recta: más oblicua, el rayo no la corta bien
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


def recta_de_la_mayoria(puntos, tol_px, normales=()):
    """(punto, normal) de la recta que siguen la mayoría de los puntos. Para cada dirección candidata (las `normales`,
    como la del eje, y la del ajuste de todos los puntos) busca la posición que deja más puntos a menos de la tolerancia
    (la de la mayoría, aunque haya varias casas corridas) y la afina por mínimos cuadrados totales con esos puntos."""
    centro = puntos.mean(axis=0)
    candidatas = [np.asarray(n, float) / np.hypot(*n) for n in normales] + [np.linalg.svd(puntos - centro)[2][1]]
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


def _franjas_de_un_lado(golpes, n, recta, d_ancho, tope):
    """[(grupo, suma: bool, franja)] entre la fachada de cada golpe y la recta de la mayoría de un lado de un tramo."""
    centro, normal, _coseno = recta
    franjas = []
    for j, h, p in golpes:
        s = float((h - centro) @ normal)
        # también las que ya están dentro de la tolerancia: si no, su escalón de hasta un píxel queda entre las franjas
        # corregidas, la fachada sale dentada y el polígono del grupo pasa de sus pocos lados
        if s == 0 or abs(s) > tope:
            continue
        q = _sobre_la_recta(p, n, recta)
        if s > 0:
            franjas.append((j, True, Polygon([q - d_ancho, h - d_ancho, h + d_ancho, q + d_ancho])))
        else:   # desde un píxel antes de la fachada: el borde del píxel tocado también se va
            franjas.append((j, False, Polygon([q - d_ancho, h - n - d_ancho, h - n + d_ancho, q + d_ancho])))
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
    mascara = np.zeros(forma, np.uint8)
    for parte in getattr(figura, 'geoms', [figura]):
        if parte.geom_type == 'Polygon' and not parte.is_empty:
            cv2.fillPoly(mascara, [np.round((np.asarray(parte.exterior.coords) - origen) * 16).astype(np.int32)], 1, shift=4)
            for hueco in parte.interiors:
                cv2.fillPoly(mascara, [np.round((np.asarray(hueco.coords) - origen) * 16).astype(np.int32)], 0, shift=4)
    return mascara.astype(bool)


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
        otros = _de_otros(grupos, j, a)
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
