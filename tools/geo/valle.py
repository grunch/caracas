"""El valle antes de la ciudad: qué parte del valle ya era ciudad en cada época, y el monte.

Lo edificado de cada plano (tools/geo/epocas.py) son las casas y las manzanas; lo *urbanizado*
son las manzanas con sus calles, sus plazas y sus solares: lo edificado cerrado (para tapar las
calles) y con una holgura (la calle del borde). Lo que todavía no es ciudad se pinta en el visor
como campo, sin el dibujo del plano (crece.png, canal G: desde qué época está urbanizado cada
punto; una vez ciudad, siempre ciudad).

El monte (canal B) es cuánta vegetación silvestre le toca a cada punto, 0–255: el valle es una
sabana abierta con manchones al azar (ruido reproducible), monte tupido en las riberas, ralo en
las cuestas y algo más cerrado en lo alto del Ávila. Lo leen el visor (el tono del campo) y tools/arboles.mjs (dónde van los árboles).
"""
from pathlib import Path

import cv2
import numpy as np
from scipy import ndimage
from skimage import draw

NUNCA = 255                       # como en epocas.py: etapa de lo que nunca fue ciudad
MONTE_BASE = 0.10                 # la sabana abierta: algún árbol suelto
MONTE_MANCHON = 0.55              # lo que suman los manchones de monte
MONTE_RIBERA = 0.92               # el bosque de galería, pegado al agua
RIBERA_M = 45.0                   # a esta distancia del agua la ribera ya perdió ~2/3 de su monte
CUESTA = (0.18, 0.55)             # pendiente (m/m) desde la que ralea y a la que queda casi pelado
CUESTA_RALEA = 0.7
SELVA_MSNM = (1400.0, 1900.0)     # desde dónde empieza el monte de altura del Ávila
MONTE_SELVA = 0.45
ONDAS_M = (1500.0, 520.0, 170.0, 60.0)   # largos de onda del ruido de los manchones
PESOS = (0.3, 0.3, 0.25, 0.15)
MANCHON = (0.15, 1.4)             # en desvíos del ruido: dónde empieza el manchón y dónde ya es monte cerrado


def _disco(radio_px):
    lado = 2 * max(1, int(round(radio_px))) + 1
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (lado, lado))


def _suave(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


# --- lo urbanizado -----------------------------------------------------------------------------

def urbanizado(mascara, metro, cierre_m, holgura_m, hueco_m2):
    """Lo urbanizado de una época a partir de lo edificado (bool, `metro` m por píxel).

    Cierre de radio cierre_m (une las manzanas a través de las calles), relleno de los huecos
    de hasta hueco_m2 (plazas, corazones de manzana) y holgura_m de dilatación (la calle del borde).
    """
    m = np.ascontiguousarray(mascara, np.uint8)
    if not m.any():
        return np.zeros(m.shape, bool)
    borde = int(np.ceil(cierre_m / metro)) + 1      # el cierre no se apoya en el borde de la imagen
    m = cv2.copyMakeBorder(m, borde, borde, borde, borde, cv2.BORDER_CONSTANT, value=0)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, _disco(cierre_m / metro))
    if hueco_m2 > 0:
        n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(1 - m, connectivity=4)
        chico = stats[:, cv2.CC_STAT_AREA] * metro * metro <= hueco_m2
        chico[etiquetas[0, 0]] = False              # lo de afuera no es un hueco
        m[chico[etiquetas] & (m == 0)] = 1
    if holgura_m > 0:
        m = cv2.dilate(m, _disco(holgura_m / metro))
    return m[borde:-borde, borde:-borde] > 0


def envolvente(solares, forma, escala):
    """La envolvente convexa de todos los solares (1578: las 25 manzanas, con calles y plaza)."""
    pts = np.concatenate([np.asarray(s["poligono"], float) for s in solares]) / escala - 0.5
    casco = cv2.convexHull(pts.astype(np.float32)).reshape(-1, 2)
    salida = np.zeros(forma, bool)
    salida[draw.polygon(casco[:, 1], casco[:, 0], shape=forma)] = True
    return salida


def urbanizado_desde(urbanos, edificado=None):
    """Primera época en que cada punto es ciudad (después lo sigue siendo); NUNCA si no lo es.

    La última época es la referencia (el levantamiento de 1936): lo que ahí no es ciudad no lo fue
    nunca, así los marcos y las cartelas de los planos viejos, o un error de calce, no urbanizan el
    campo. edificado: etapas de lo edificado (canal R); lo urbanizado nunca llega después que sus casas.
    """
    etapa = np.full(urbanos[0].shape, NUNCA, np.uint8)
    for e in range(len(urbanos) - 1, -1, -1):
        etapa[urbanos[e] & urbanos[-1]] = e
    return etapa if edificado is None else np.minimum(etapa, edificado)


# --- el monte ----------------------------------------------------------------------------------

def _ruido(forma, celda_m, rng):
    """Ruido suave, de media 0 y desvío 1: octavas de grillas al azar interpoladas con splines cúbicos."""
    alto, ancho = forma
    filas, columnas = np.mgrid[0:alto, 0:ancho].astype(np.float32)
    total = np.zeros(forma, np.float32)
    for onda, peso in zip(ONDAS_M, PESOS):
        paso = max(1.0, onda / celda_m)
        chica = rng.random((int(np.ceil(alto / paso)) + 2, int(np.ceil(ancho / paso)) + 2), np.float32)
        total += peso * ndimage.map_coordinates(chica, [filas / paso, columnas / paso], order=3, mode="nearest")
    return (total - total.mean()) / max(float(total.std()), 1e-6)


def monte(agua, celda_m, semilla, altura=None, fuera=None):
    """Densidad del monte por celda (uint8). agua, fuera: bool; altura: m s. n. m. (o None)."""
    rng = np.random.default_rng(semilla)
    d = MONTE_BASE + MONTE_MANCHON * _suave(*MANCHON, _ruido(agua.shape, celda_m, rng))
    if agua.any():
        lejos = cv2.distanceTransform((~agua).astype(np.uint8), cv2.DIST_L2, 5) * celda_m
        d = np.maximum(d, MONTE_RIBERA * np.exp(-np.maximum(lejos - celda_m, 0.0) / RIBERA_M))
    if altura is not None:
        gy, gx = np.gradient(cv2.GaussianBlur(altura.astype(np.float32), (0, 0), 1.5), celda_m)
        d = d * (1.0 - CUESTA_RALEA * _suave(*CUESTA, np.hypot(gx, gy)))
        selva = _suave(*SELVA_MSNM, altura)
        d = d * (1.0 - selva) + MONTE_SELVA * selva
    d = np.where(agua, 0.0, d)
    if fuera is not None:
        d = np.where(fuera, 0.0, d)
    return np.round(255.0 * np.clip(d, 0.0, 1.0)).astype(np.uint8)


# --- entradas ----------------------------------------------------------------------------------

def leer_relieve(ruta, forma):
    """relieve.bin (specs/02: Uint16 LE w, h, alturas en dm) llevado a `forma`, en metros; None si falta."""
    ruta = Path(ruta)
    if not ruta.exists():
        return None
    crudo = np.fromfile(ruta, "<u2")
    w, h = int(crudo[0]), int(crudo[1])
    alturas = crudo[2:2 + w * h].reshape(h, w).astype(np.float32) / 10.0
    return cv2.resize(alturas, (forma[1], forma[0]), interpolation=cv2.INTER_LINEAR)


def fraccion(mascara, factor):
    """Parte de cada celda de factor × factor que cae en la máscara (el borde parcial cuenta lo que tiene)."""
    alto, ancho = mascara.shape
    filas, columnas = -(-alto // factor), -(-ancho // factor)
    relleno = np.zeros((filas * factor, columnas * factor), np.float32)
    relleno[:alto, :ancho] = mascara
    validos = np.zeros(relleno.shape, np.float32)
    validos[:alto, :ancho] = 1.0
    suma = relleno.reshape(filas, factor, columnas, factor).sum(axis=(1, 3))
    return suma / validos.reshape(filas, factor, columnas, factor).sum(axis=(1, 3))
