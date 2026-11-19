"""Lotes de la cuadra modelo, por sus lados: todas las casas de una calle sobre la misma línea de fachada.

El plano de 1936 dibuja las manzanas con el borde dentado; partir de ahí (tools/geo/lotes.py y el marco
de cada casa en tools/geo/alas.py) dejaba casas corridas, frentes torcidos y, en las esquinas, los lotes
de dos calles encimados. Aquí la manzana se simplifica a sus lados rectos y cada punto va al lado más
cercano: así las casas de dos calles se encuentran en la diagonal de la esquina (a inglete) y el fondo
de cada lote llega hasta la medianera. Cada lado se reparte en frentes de FRENTE_M, de esquina a esquina;
el marco de cada lote (origen sobre la línea del lado, eu a lo largo de ella, ev hacia adentro, como en
src/alas.js) sale de la geometría del lado, no de los píxeles de la casa.

Una manzana que no se deja simplificar (curva, con muchos lados o que no se parece a su polígono) no se
reparte por lados: `lotes_por_lados` da None y va con el reparto de siempre.
"""
import math

import cv2
import numpy as np

FRENTE_M = (9.0, 14.0)        # frente de una casa
TOLERANCIA_M = 1.5            # simplificación del borde de la manzana
LADO_MINIMO_M = 8.0           # un lado más corto que esto no da a la calle: lo cubren los vecinos
MAXIMO_DE_LADOS = 8
PARECIDO_MINIMO = 0.9         # intersección sobre unión entre la manzana y su polígono
VARIACION = 0.15              # cuánto varía un frente del promedio de su lado
ANGULO_MINIMO = math.radians(25)   # dos lados seguidos casi en línea no hacen esquina
PUENTE_M = 6.0                # lo que une dos cuadras pegadas en el plano y es más angosto que esto se corta
CUADRA_MINIMA_M2 = 1200.0     # un pedazo más chico que esto no es una cuadra (va con la vecina)


def _recta(borde, a, b, tolerancia_px):
    """La recta ajustada a los píxeles del borde que le tocan al lado a→b: (punto, dirección unitaria)."""
    largo = float(np.hypot(*(b - a)))
    d = (b - a) / largo
    t = (borde - a) @ d
    lejos = np.abs((borde - a) @ np.array([-d[1], d[0]]))
    suyos = borde[(t > 0.1 * largo) & (t < 0.9 * largo) & (lejos < 2 * tolerancia_px)]
    if len(suyos) < 8:
        return a, d
    dx, dy, x, y = (float(c) for c in cv2.fitLine(suyos.astype(np.float32), cv2.DIST_L2, 0, 0.01, 0.01).ravel())
    direccion = np.array([dx, dy]) * (1.0 if dx * d[0] + dy * d[1] >= 0 else -1.0)
    return np.array([x, y]), direccion


def _cruce(p1, d1, p2, d2):
    """Dónde se cortan dos rectas (punto, dirección), o None si son casi paralelas."""
    det = d1[0] * -d2[1] - d1[1] * -d2[0]
    if abs(det) < math.sin(ANGULO_MINIMO):
        return None
    t = ((p2[0] - p1[0]) * -d2[1] - (p2[1] - p1[1]) * -d2[0]) / det
    return p1 + t * d1


def _poligono(manzana, metro):
    """Los vértices (n, 2) del borde simplificado, en píxeles (coordenadas continuas), o None.

    Cada lado largo es la recta ajustada a los píxeles de su borde (así los dientes del plano no lo
    tuercen); los lados cortos se descartan y las esquinas son el cruce de las rectas vecinas."""
    contornos, _ = cv2.findContours(manzana.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contornos:
        return None
    contorno = max(contornos, key=cv2.contourArea)
    tolerancia = TOLERANCIA_M / metro
    simple = cv2.approxPolyDP(contorno, tolerancia, True)[:, 0, :].astype(float) + 0.5
    borde = contorno[:, 0, :].astype(float) + 0.5
    rectas = [_recta(borde, a, b, tolerancia) for a, b in zip(simple, np.roll(simple, -1, axis=0))
              if np.hypot(*(b - a)) * metro >= LADO_MINIMO_M]
    if not 3 <= len(rectas) <= MAXIMO_DE_LADOS:
        return None
    vertices = [_cruce(*rectas[k - 1], *rectas[k]) for k in range(len(rectas))]
    if any(v is None for v in vertices):
        return None
    vertices = np.array(vertices)
    # las rectas pasan por los centros de los píxeles del borde: medio píxel hacia afuera, al borde de la manzana
    return vertices + 0.5 * np.sign(vertices - vertices.mean(axis=0))


def _relleno(poligono, forma):
    mascara = np.zeros(forma, np.uint8)
    cv2.fillPoly(mascara, [np.round(poligono * 16).astype(np.int32)], 1, shift=4)
    return mascara.astype(bool)


def _lados(poligono, adentro, metro):
    """Los lados largos: [(A, B, eu, ev)], ev hacia adentro de la manzana y eu = ev girado −90° (src/alas.js)."""
    lados = []
    for a, b in zip(poligono, np.roll(poligono, -1, axis=0)):
        largo = float(np.hypot(*(b - a)))
        if largo * metro < LADO_MINIMO_M:
            continue
        d = (b - a) / largo
        ev = np.array([-d[1], d[0]])
        medio = (a + b) / 2 + ev * 3
        i, j = int(medio[0]), int(medio[1])
        if not (0 <= j < adentro.shape[0] and 0 <= i < adentro.shape[1] and adentro[j, i]):
            ev = -ev
        lados.append((a, b, np.array([ev[1], -ev[0]]), ev))
    return lados


def _distancia_a_segmento(px, py, a, b):
    ab = b - a
    t = np.clip(((px - a[0]) * ab[0] + (py - a[1]) * ab[1]) / float(ab @ ab), 0.0, 1.0)
    return np.hypot(px - (a[0] + t * ab[0]), py - (a[1] + t * ab[1]))


def _cortes(largo_m, rng):
    """Dónde terminan los frentes de un lado de `largo_m` metros (acumulado, el último = largo_m).

    Los frentes quedan entre FRENTE_M[0] y FRENTE_M[1] siempre que el lado lo admita. Un lado que no (entre
    14 y 18 m, o más corto que 9) va con la cantidad de lotes más cercana: un solo lado corto (una ochava)
    no saca a la cuadra entera del reparto por lados."""
    medio = sum(FRENTE_M) / 2
    pocos, muchos = math.ceil(largo_m / FRENTE_M[1]), math.floor(largo_m / FRENTE_M[0])
    n = round(largo_m / medio)
    n = max(1, min(max(n, pocos), muchos) if pocos <= muchos else n)
    base = largo_m / n
    # la variación no saca a ningún frente del intervalo (la mitad del margen: al centrarla se puede correr otro tanto)
    margen = min(VARIACION, FRENTE_M[1] / base - 1, 1 - FRENTE_M[0] / base) if pocos <= muchos else VARIACION
    desvio = rng.uniform(-max(margen, 0.0) / 2, max(margen, 0.0) / 2, n) * base
    anchos = base + desvio - desvio.mean()
    cortes = np.cumsum(anchos)
    cortes[-1] = largo_m
    return cortes


def _repartir_lado(lado, px, py, metro, rng):
    """Los lotes de los píxeles (px, py) de un lado: (cuál de ellos, [marco de cada lote])."""
    a, b, eu, ev = lado
    u = (px - a[0]) * eu[0] + (py - a[1]) * eu[1]
    v = (px - a[0]) * ev[0] + (py - a[1]) * ev[1]
    u0 = min(0.0, float((b - a) @ eu))          # el extremo del lado con menor u
    largo_m = float(np.hypot(*(b - a))) * metro
    cortes = _cortes(largo_m, rng)
    cual = np.minimum(np.searchsorted(cortes, (u - u0) * metro, side='right'), len(cortes) - 1)
    # la casa de esquina es la que arranca en el vértice A del lado: así hay una sola por esquina
    en_a = 0 if (b - a) @ eu > 0 else len(cortes) - 1
    desde = np.concatenate([[0.0], cortes[:-1]])
    marcos = []
    for j in range(len(cortes)):
        del_lote = cual == j
        inicio = u0 + desde[j] / metro
        marcos.append(None if not del_lote.any() else {
            'origen': (float(a[0] + eu[0] * inicio), float(a[1] + eu[1] * inicio)),
            'eu': (float(eu[0]), float(eu[1])),
            'ancho': float(cortes[j] - desde[j]),
            'fondo': float(max(v[del_lote].max() + 0.5, 1.0) * metro),
            'esquina': j == en_a,
        })
    return cual, marcos


def lotes_por_lados(manzana, metro, semilla):
    """(etiquetas, lotes) de la manzana repartida por sus lados, o None si no se deja.

    `etiquetas`: (alto, ancho) int32, 0 fuera de la manzana. `lotes`: {etiqueta: {origen: (x, y) en píxeles
    sobre la línea del lado, eu: dirección del frente, ancho y fondo en metros, esquina: si el lote toca
    una esquina de la manzana; de las dos que se unen en cada esquina, la del lado que arranca ahí}}.
    """
    manzana = np.asarray(manzana, bool)
    poligono = _poligono(manzana, metro)
    if poligono is None:
        return None
    adentro = _relleno(poligono, manzana.shape)
    union = np.count_nonzero(adentro | manzana)
    if not union or np.count_nonzero(adentro & manzana) / union < PARECIDO_MINIMO:
        return None
    lados = _lados(poligono, adentro, metro)
    if len(lados) < 3:
        return None
    ys, xs = np.nonzero(adentro & manzana)   # un hueco de la manzana (una plaza, un pasaje) no es de ningún lote
    px, py = xs + 0.5, ys + 0.5
    de_lado = np.argmin(np.stack([_distancia_a_segmento(px, py, a, b) for a, b, _, _ in lados]), axis=0)
    rng = np.random.default_rng(int(semilla))
    etiquetas = np.zeros(manzana.shape, np.int32)
    lotes = {}
    for k, lado in enumerate(lados):
        suyos = np.flatnonzero(de_lado == k)
        if not suyos.size:
            continue
        cual, marcos = _repartir_lado(lado, px[suyos], py[suyos], metro, rng)
        for j, marco in enumerate(marcos):
            if marco is None:
                continue
            etiqueta = len(lotes) + 1
            del_lote = suyos[cual == j]
            etiquetas[ys[del_lote], xs[del_lote]] = etiqueta
            lotes[etiqueta] = marco
    return etiquetas, lotes


def cuadras_pegadas(manzana, metro):
    """Las cuadras de una "manzana" de 1936 que son varias pegadas en el plano (por un patio, un jardín o un
    error de la segmentación): [(máscara, (x, y))] recortadas a su caja, o None si es una sola. Se cortan
    los puentes más angostos que PUENTE_M y cada píxel va con la cuadra más cercana."""
    manzana = np.asarray(manzana, bool)
    r = max(1, int(round(PUENTE_M / 2 / metro)))
    disco = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    abierta = cv2.morphologyEx(manzana.astype(np.uint8), cv2.MORPH_OPEN, disco)
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(abierta, connectivity=4)
    grandes = [k for k in range(1, n) if stats[k, cv2.CC_STAT_AREA] * metro ** 2 >= CUADRA_MINIMA_M2]
    if len(grandes) < 2:
        return None
    semillas = np.where(np.isin(etiquetas, grandes), etiquetas, 0)
    _, cual = cv2.distanceTransformWithLabels((semillas == 0).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    ys, xs = np.nonzero(semillas)
    de_semilla = np.zeros(int(cual.max()) + 1, np.int32)
    de_semilla[cual[ys, xs]] = semillas[ys, xs]
    asignada = np.where(manzana, de_semilla[cual], 0)
    piezas = []
    for k in grandes:
        filas, columnas = np.nonzero(asignada == k)
        y0, y1, x0, x1 = filas.min(), filas.max() + 1, columnas.min(), columnas.max() + 1
        piezas.append((asignada[y0:y1, x0:x1] == k, (int(x0), int(y0))))
    return piezas
