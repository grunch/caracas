"""Las caras de la red de calles: la geometría limpia de las cuadras.

El plano de 1936 dibuja las manzanas con el borde dentado, con muescas (pasajes, plazas) y a veces pegadas
a la vecina; sacar de ahí los lados de una cuadra (tools/geo/lados.py) falla en la mayoría de las del casco.
La red de calles de hoy (OpenStreetMap, tools/geo/hoy_osm.py) sí es limpia: partida en tramos de esquina a
esquina (`tramos_de`), cada tramo se compara con los planos (`clasificar`: ¿estaba en 1936?, ¿es nuevo desde
1772?), y las caras de la red de los tramos de una época (`caras_de`) son sus cuadras: polígonos de pocos
lados rectos, por los ejes de las calles.

`ajustar_cara` lleva cada lado de una cara, paralelo a sí mismo, hasta la línea de fachada de la cuadra
dibujada: el polígono que resulta es el de `lados.lotes_por_lados`. La dirección de cada lado sale de la
calle, no del borde dentado; lo que se mide en el plano es solo cuánto se retira la fachada del eje.

Datos © colaboradores de OpenStreetMap, ODbL 1.0 (fuentes/datos/osm-hoy/ficha.json).
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import LineString, Point
from shapely.ops import linemerge, polygonize, unary_union
from shapely.strtree import STRtree

sys.path.insert(0, str(Path(__file__).resolve().parent))

from lados import LADO_MINIMO_M, _cruce, _fundir_en_linea  # noqa: E402

PASO_M = 2.0                  # cada cuánto se mira un tramo contra un plano
CERCA_DE_CALLE_M = 3.0        # el eje de la calle de hoy puede caer hasta esto fuera de la calle de 1936
EN_1936 = 0.6                 # un tramo estaba en 1936 si esta parte de su eje cae sobre calle del plano
NUEVA = 0.6                   # … y es nuevo desde 1772 si esta parte cae sobre lo edificado de 1772, lejos de sus calles
LEJOS_DE_CALLE_VIEJA_M = 12.0
RECORTE_M = 10.0              # las puntas de un tramo (las esquinas) no cuentan para saber si es nuevo
TRAMO_MINIMO_NUEVO_M = 25.0
TOLERANCIA_CARA_M = 4.0       # simplificación de una cara (la calle de hoy tiene chaflanes y curvas suaves)
MAXIMO_DE_LADOS_CARA = 10
RETIRO_MAXIMO_M = 20.0        # hasta dónde se busca la fachada desde el eje de la calle
RETIRO_POR_OMISION_M = 5.0    # medio ancho de una calle del casco, si el lado no tiene fachada que medir
RAYOS_MINIMOS = 0.25          # parte de los rayos de un lado que tiene que dar con la cuadra
CUANTIL_DE_FACHADA = 0.25     # la fachada es la línea de las casas que más salen, no el promedio de los dientes


def tramos_de(lineas):
    """Las calles (polilíneas (n, 2)) partidas en tramos de esquina a esquina: se anudan en cada cruce y se
    unen los pedazos entre cruces. → [(n, 2) float]."""
    geometrias = [LineString(np.asarray(linea, float)) for linea in lineas if len(linea) >= 2]
    if not geometrias:
        return []
    unidos = linemerge(unary_union(geometrias))
    partes = unidos.geoms if hasattr(unidos, 'geoms') else [unidos]
    return [np.asarray(p.coords, float) for p in partes if p.length > 0]


def fraccion_sobre(linea, mascara, paso_px, recorte_px=0.0):
    """Qué parte de la línea (muestreada cada `paso_px`, sin `recorte_px` en cada punta) cae sobre la máscara;
    None si es más corta que los recortes o sale de la imagen en más de un décimo."""
    eje = LineString(np.asarray(linea, float))
    largo = eje.length - 2 * recorte_px
    if largo <= 0:
        return None
    n = max(2, int(largo / paso_px) + 1)
    puntos = np.array([eje.interpolate(recorte_px + largo * k / (n - 1)).coords[0] for k in range(n)])
    alto, ancho = mascara.shape
    dentro = (puntos[:, 0] >= 0) & (puntos[:, 0] < ancho) & (puntos[:, 1] >= 0) & (puntos[:, 1] < alto)
    if dentro.mean() < 0.9:
        return None
    p = puntos[dentro].astype(int)
    return float(np.asarray(mascara)[p[:, 1], p[:, 0]].mean())


def clasificar(tramos, calle36, metro, edificado72=None, lejos72_m=None, escala=1.0):
    """Cada tramo con lo que dicen los planos: [{linea: [[x, y], …], en1936, nueva}].

    `calle36`: la calle del plano de 1936; `edificado72` y `lejos72_m` (metros hasta la calle más cercana de
    1772): el plano de 1772 ya corregido (tools/geo/calles_nuevas.py). Las máscaras pueden venir reducidas:
    `escala` = píxeles de los tramos por píxel de las máscaras; `metro`, metros por píxel de las máscaras.
    """
    radio = max(1, int(round(CERCA_DE_CALLE_M / metro)))
    disco = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * radio + 1, 2 * radio + 1))
    cerca36 = cv2.dilate(np.asarray(calle36).astype(np.uint8), disco) > 0
    vieja = None if edificado72 is None else np.asarray(edificado72, bool) & (np.asarray(lejos72_m) >= LEJOS_DE_CALLE_VIEJA_M)
    paso = PASO_M / metro
    salida = []
    for tramo in tramos:
        reducido = np.asarray(tramo, float) / escala
        f36 = fraccion_sobre(reducido, cerca36, paso)
        en1936 = f36 is not None and f36 >= EN_1936
        nueva = False
        if en1936 and vieja is not None and LineString(reducido).length * metro >= TRAMO_MINIMO_NUEVO_M:
            f72 = fraccion_sobre(reducido, vieja, paso, RECORTE_M / metro)
            nueva = f72 is not None and f72 >= NUEVA
        salida.append({'linea': [[round(float(x), 1), round(float(y), 1)] for x, y in tramo],
                       'en1936': bool(en1936), 'nueva': bool(nueva)})
    return salida


def caras_de(lineas):
    """Las caras (shapely Polygon) de la red que forman las líneas, ya anudadas (tramos_de)."""
    return list(polygonize([LineString(np.asarray(linea, float)) for linea in lineas if len(linea) >= 2]))


def _retiro(a, b, hacia, mascara, origen, metro):
    """Cuánto hay, en píxeles, del lado a→b (eje de la calle) a la fachada de la cuadra, hacia adentro."""
    largo = float(np.hypot(*(b - a)))
    n = max(3, int(largo * metro / PASO_M))
    t = np.linspace(0.15, 0.85, n)
    k = np.arange(int(RETIRO_MAXIMO_M / metro) + 1)
    # (medio paso adentro: el píxel que se mira es el que queda entre k y k + 1 del eje)
    px = a[0] + (b[0] - a[0]) * t[:, None] + hacia[0] * (k[None, :] + 0.5) - origen[0]
    py = a[1] + (b[1] - a[1]) * t[:, None] + hacia[1] * (k[None, :] + 0.5) - origen[1]
    alto, ancho = mascara.shape
    dentro = (px >= 0) & (px < ancho) & (py >= 0) & (py < alto)
    toca = np.zeros(px.shape, bool)
    toca[dentro] = mascara[py[dentro].astype(int), px[dentro].astype(int)]
    da = toca.any(axis=1)
    if da.mean() < RAYOS_MINIMOS:
        return RETIRO_POR_OMISION_M / metro
    return float(np.quantile(np.argmax(toca[da], axis=1), CUANTIL_DE_FACHADA))


def ajustar_cara(cara, mascara, origen, metro):
    """El polígono (n, 2) de una cuadra, en píxeles de la ventana de `mascara` (cuya esquina es `origen` en las
    coordenadas de la cara): los lados de la cara, cada uno llevado paralelo a sí mismo hasta la fachada. None
    si la cara no es de pocos lados rectos."""
    contorno = np.asarray(cara.exterior.coords, float)[:-1]
    simple = cv2.approxPolyDP(contorno.astype(np.float32).reshape(-1, 1, 2), TOLERANCIA_CARA_M / metro, True)[:, 0, :].astype(float)
    if len(simple) < 3:
        return None
    area = 0.5 * float(np.sum(simple[:, 0] * np.roll(simple[:, 1], -1) - np.roll(simple[:, 0], -1) * simple[:, 1]))
    giro = 1.0 if area > 0 else -1.0
    rectas = []
    for a, b in zip(simple, np.roll(simple, -1, axis=0)):
        largo = float(np.hypot(*(b - a)))
        if largo * metro < LADO_MINIMO_M:
            continue
        d = (b - a) / largo
        hacia = np.array([-d[1], d[0]]) * giro   # la normal hacia adentro de la cara
        retiro = _retiro(a, b, hacia, np.asarray(mascara, bool), origen, metro)
        rectas.append((a + hacia * retiro - np.asarray(origen, float), d, largo))
    rectas = _fundir_en_linea(rectas, TOLERANCIA_CARA_M / metro)
    if not 3 <= len(rectas) <= MAXIMO_DE_LADOS_CARA:
        return None
    vertices = [_cruce(*rectas[k - 1], *rectas[k]) for k in range(len(rectas))]
    if any(v is None for v in vertices):
        return None
    return np.array(vertices)


def mascara_de_lineas(lineas, forma, grosor_px):
    """Las líneas dibujadas con ese grosor en una máscara (bool) de la forma dada."""
    mascara = np.zeros(forma, np.uint8)
    for linea in lineas:
        cv2.polylines(mascara, [np.round(np.asarray(linea, float) * 16).astype(np.int32)], False, 1, max(1, int(round(grosor_px))), cv2.LINE_8, shift=4)
    return mascara > 0


class Red:
    """La red de calles clasificada (clasificar): sus tramos y las caras de cada época.

    `caras36`: las cuadras de 1936 (las caras de los tramos que estaban en ese plano); `caras72`: las de 1772
    (sin los tramos abiertos después). `cara36_en(x, y)`: el índice de la cuadra de 1936 que contiene el punto.
    """

    def __init__(self, tramos):
        self.tramos = list(tramos)
        de_1936 = [t['linea'] for t in self.tramos if t['en1936']]
        self.caras36 = caras_de(de_1936)
        self.caras72 = caras_de([t['linea'] for t in self.tramos if t['en1936'] and not t['nueva']])
        self._arbol = STRtree(self.caras36) if self.caras36 else None

    def lineas(self, solo_de_1936=False):
        return [t['linea'] for t in self.tramos if t['en1936'] or not solo_de_1936]

    def cara36_en(self, x, y):
        if self._arbol is None:
            return None
        punto = Point(float(x), float(y))
        encontradas = [int(k) for k in self._arbol.query(punto) if self.caras36[int(k)].contains(punto)]
        return encontradas[0] if encontradas else None
