"""Identidad de los cruces por su posición en el damero, en el original de 1772 y en el mosaico de 1936.

El TPS de tools/geo/calce.py enlaza los dos planos por correlación; aquí cada cruce se identifica
por cuántas calles lo separan de la Plaza Mayor en cada plano, que es lo que hizo a mano #77 en el
núcleo. Así un cruce del original y una esquina de 1936 se emparejan sin usar el calce, y la
distancia entre esa esquina y la proyección del TPS es un control independiente.

Convenciones: el original está girado (x crece hacia el norte, y hacia el este); el índice de un
cruce es (kx, ky) = (calles al norte, calles al este) de la esquina de Las Monjas, suroeste de la
plaza. En el mosaico, (iu, in) = (calles al este, calles al norte) de la misma esquina. Ningún
resultado de este módulo aprueba geometría: clasifica y mide.
"""
from collections import defaultdict, deque
import math

from shapely.geometry import LineString

OCUPACIONES_EDIFICADAS = {'continua', 'parcial', 'aislada', 'conjunto_especial'}
OCUPACIONES_VACIAS = {'terreno_libre', 'plaza', 'descartada_no_edificacion', 'parte_de_otra_unidad'}
PASO_1772_PX = 66.3           # una cuadra con su calle, medido sobre los ejes trazados (specs/auditoria-1772)
ORIGEN_1772_PX = (967.7, 791.7)  # esquina de Las Monjas en el original (semilla manual del calce)


def indice_1772(x, y, origen=ORIGEN_1772_PX, paso=PASO_1772_PX, tolerancia=0.2):
    """(kx, ky) del cruce más cercano de la retícula, o None si el punto no cae sobre ella."""
    kx, ky = (x - origen[0]) / paso, (y - origen[1]) / paso
    if abs(kx - round(kx)) > tolerancia or abs(ky - round(ky)) > tolerancia:
        return None
    return int(round(kx)), int(round(ky))


def _sector_de(x, y, sectores):
    for s in sectores:
        x0, y0, x1, y1 = s['bbox_original']
        if x0 <= x < x1 and y0 <= y < y1:
            return s['id']
    return None


def cruces_1772(lineas, sectores, origen=ORIGEN_1772_PX, paso=PASO_1772_PX):
    """Intersecciones de las calles rectas trazadas que caen sobre la retícula, con índice y sector."""
    rectas = [(l['id'], LineString(l['puntos'])) for l in lineas if l['tipo'] == 'calle_recta' and len(l['puntos']) > 1]
    cruces = []
    for i, (ida, a) in enumerate(rectas):
        for idb, b in rectas[i + 1:]:
            g = a.intersection(b)
            for p in (g.geoms if hasattr(g, 'geoms') else [g]):
                if p.is_empty or p.geom_type != 'Point':
                    continue
                indice = indice_1772(p.x, p.y, origen, paso)
                if indice is None:
                    continue
                cruces.append({'id': f'X1772-{len(cruces) + 1:04d}', 'lineas': [ida, idb],
                               'original': [round(p.x, 2), round(p.y, 2)], 'indice': list(indice),
                               'sector': _sector_de(p.x, p.y, sectores)})
    return cruces


def _recorrer(puntos, origen, direcciones, rango_px, cos_tol, bloqueadas):
    """Propuestas de índice de cada esquina alcanzada desde `origen`; las `bloqueadas` reciben pero no propagan."""
    propuestas = defaultdict(set)
    propuestas[origen].add((0, 0))
    cola, vistos = deque([origen]), {origen}
    while cola:
        actual = cola.popleft()
        if actual in bloqueadas:
            continue
        iu, inorte = next(iter(propuestas[actual]))
        ax, ay = puntos[actual]
        for (du, dn), (vx, vy) in direcciones.items():
            mejor, mejor_d = None, None
            for j, (px, py) in enumerate(puntos):
                dx, dy = px - ax, py - ay
                d = math.hypot(dx, dy)
                if not rango_px[0] <= d <= rango_px[1] or (dx * vx + dy * vy) / d < cos_tol:
                    continue
                if mejor_d is None or d < mejor_d:
                    mejor, mejor_d = j, d
            if mejor is None:
                continue
            propuestas[mejor].add((iu + du, inorte + dn))
            if mejor not in vistos:
                vistos.add(mejor)
                cola.append(mejor)
    return propuestas


def reticula_1936(puntos, origen, angulo_grados, rango_px=(140, 320), tolerancia_grados=20):
    """Índices (iu este, in norte) de las esquinas de 1936, recorriendo la retícula desde `origen`.

    Desde cada esquina indexada se busca la más cercana dentro de `rango_px` en cada una de las cuatro
    direcciones del damero (girado `angulo_grados`). Una esquina con dos propuestas distintas, o un
    índice con dos esquinas, se excluye: ahí la retícula es irregular y la identidad se decide a ojo.
    Una esquina ambigua tampoco propaga: el recorrido se repite sin expandir desde ella hasta que no
    aparecen ambigüedades nuevas, así todo índice sale de una ruta sin ambigüedad.
    """
    a = math.radians(angulo_grados)
    direcciones = {(1, 0): (math.cos(a), math.sin(a)), (-1, 0): (-math.cos(a), -math.sin(a)),
                   (0, 1): (math.sin(a), -math.cos(a)), (0, -1): (-math.sin(a), math.cos(a))}
    cos_tol = math.cos(math.radians(tolerancia_grados))
    bloqueadas = frozenset()
    while True:
        propuestas = _recorrer(puntos, origen, direcciones, rango_px, cos_tol, bloqueadas)
        ambiguas = {j for j, indices in propuestas.items() if len(indices) > 1}
        if ambiguas <= bloqueadas:
            break
        bloqueadas = bloqueadas | ambiguas
    por_indice = defaultdict(list)
    for j, indices in propuestas.items():
        if len(indices) == 1:
            por_indice[next(iter(indices))].append(j)
    return {indice: js[0] for indice, js in por_indice.items() if len(js) == 1}


def controles(cruces, reticula, puntos, proyectar, metro):
    """Para cada cruce con esquina homónima en 1936: la esquina, la proyección del calce y su desvío en metros."""
    nodos = []
    for c in cruces:
        kx, ky = c['indice']
        j = reticula.get((ky, kx))
        if j is None:
            continue
        ex, ey = puntos[j]
        cx, cy = proyectar(*c['original'])
        delta = [round((cx - ex) * metro, 3), round((cy - ey) * metro, 3)]
        nodos.append({'id': c['id'], 'sector': c.get('sector'), 'original': list(c['original']), 'indice': [kx, ky],
                      'esquina_1936': j, 'mosaico_identidad': [round(ex, 2), round(ey, 2)],
                      'mosaico_calce': [round(cx, 2), round(cy, 2)],
                      'desvio_m': round(math.hypot(*delta), 3), 'delta_m': delta})
    return nodos


def celda_que_contiene(punto, esquinas):
    """La celda (i, j) del damero que contiene `punto`: el cuadrilátero de las esquinas (i, j), (i+1, j), (i+1, j+1)
    y (i, j+1). `esquinas`: {(i, j): (x, y)}. None si el punto no está en ninguna celda con sus cuatro esquinas."""
    from shapely.geometry import Point, Polygon
    p = Point(float(punto[0]), float(punto[1]))
    for (i, j) in esquinas:
        vecinas = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        if all(k in esquinas for k in vecinas):
            if Polygon([tuple(map(float, esquinas[k])) for k in vecinas]).buffer(1e-9).contains(p):
                return (i, j)
    return None


def confirmar_uno_a_uno(filas, unidades, cuadras, esquinas_original, esquinas_1936):
    """Identidad por pareja de las uno a uno (specs/08, T33j.2a): la unidad del original y su cuadra del sistema tienen
    que caer en la misma celda del damero, la del mismo par de calles contado desde Las Monjas. La celda del original
    sale de los cruces del trazado; la de 1936, de las esquinas por identidad. Sin esa evidencia la fila pasa a
    `incierta` con su motivo. Las demás clases no cambian. Devuelve filas nuevas."""
    centro_unidad = {u['id']: u['centro_original'] for u in unidades}
    centro_cuadra = {c['id']: c['poligono'].centroid.coords[0] for c in cuadras}
    salida = []
    for f in filas:
        if f['clase'] != 'uno_a_uno':
            salida.append(f)
            continue
        en_original = celda_que_contiene(centro_unidad[f['unidad']], esquinas_original)
        en_1936 = celda_que_contiene(centro_cuadra[f['cuadras'][0]['cuadra']], esquinas_1936)
        evidencia = {'celda_original': list(en_original) if en_original else None,
                     'celda_1936': list(en_1936) if en_1936 else None}
        if en_original is not None and en_original == en_1936:
            salida.append({**f, 'identidad_pareja': evidencia})
            continue
        motivo = ('la cuadra del sistema está en otra celda del damero que la unidad' if en_original and en_1936
                  else 'sin celda completa del damero para comprobar la pareja')
        salida.append({**f, 'clase': 'incierta', 'identidad_pareja': evidencia, 'motivo': motivo})
    return salida


CONTENIDA = 0.85  # fracción de la unidad dentro de una cuadra para tenerla por entera dentro de ella


def clasificar_correspondencias(unidades, cuadras, umbral=0.5, minimo=0.2):
    """Clase de cada unidad del original frente a las cuadras del sistema (polígonos en el mismo marco).

    Una cuadra «cae dentro» de una unidad si al menos `umbral` de su área está en ella. Edificadas:
    una dentro → uno_a_uno; varias → dividida; una compartida con otra unidad → fusionada; ninguna
    pero algo de solape (≥ `minimo`) → desplazada_o_parcial; nada → ausente. Dos o más unidades enteras (≥ CONTENIDA)
    dentro de una cuadra que entre todas cubren ≥ `umbral` de ella → fusionada, aunque ninguna llegue sola al umbral. Vacías: casas encima
    → adicional_sobre_vacio; si no, vacio_coincide. Devuelve (filas, cuadras sin ninguna unidad).
    """
    for u in unidades:
        if u['ocupacion'] not in OCUPACIONES_EDIFICADAS | OCUPACIONES_VACIAS:
            raise ValueError(f"{u['id']}: ocupación desconocida {u['ocupacion']!r}")
    solapes = {}  # fracciones sin redondear: los umbrales se comparan con estas; el informe lleva las redondeadas
    for u in unidades:
        filas = []
        for c in cuadras:
            inter = u['poligono'].intersection(c['poligono']).area
            if inter <= 0:
                continue
            filas.append({'cuadra': c['id'], 'fraccion_cuadra': inter / c['poligono'].area,
                          'fraccion_unidad': inter / u['poligono'].area})
        solapes[u['id']] = sorted(filas, key=lambda f: -f['fraccion_cuadra'])
    reclamos = defaultdict(list)
    for u in unidades:
        for f in solapes[u['id']]:
            if f['fraccion_cuadra'] >= umbral:
                reclamos[f['cuadra']].append(u['id'])
    contenidas = defaultdict(list)
    for u in unidades:
        if u['ocupacion'] in OCUPACIONES_VACIAS:
            continue
        for f in solapes[u['id']]:
            if f['fraccion_unidad'] >= CONTENIDA:
                contenidas[f['cuadra']].append(f['fraccion_cuadra'])
    repartidas = {c for c, fr in contenidas.items() if len(fr) > 1 and sum(fr) >= umbral}
    atribuidas = {f['cuadra'] for filas in solapes.values() for f in filas if f['fraccion_cuadra'] >= minimo}
    resultado = []
    for u in unidades:
        filas = solapes[u['id']]
        dentro = [f for f in filas if f['fraccion_cuadra'] >= umbral]
        if u['ocupacion'] in OCUPACIONES_VACIAS:
            clase = 'adicional_sobre_vacio' if any(f['fraccion_unidad'] >= minimo for f in filas) else 'vacio_coincide'
        elif len(dentro) == 1:
            clase = 'fusionada' if len(reclamos[dentro[0]['cuadra']]) > 1 else 'uno_a_uno'
        elif len(dentro) > 1:
            clase = 'dividida'
        elif any(f['cuadra'] in repartidas and f['fraccion_unidad'] >= CONTENIDA for f in filas):
            clase = 'fusionada'
        elif any(f['fraccion_unidad'] >= minimo or f['fraccion_cuadra'] >= minimo for f in filas):
            clase = 'desplazada_o_parcial'
        else:
            clase = 'ausente'
        redondeadas = [{**f, 'fraccion_cuadra': round(f['fraccion_cuadra'], 2), 'fraccion_unidad': round(f['fraccion_unidad'], 2)}
                       for f in filas]
        resultado.append({'unidad': u['id'], 'ocupacion': u['ocupacion'], 'clase': clase, 'cuadras': redondeadas})
    sobrantes = [c['id'] for c in cuadras if c['id'] not in atribuidas]
    return resultado, sobrantes
