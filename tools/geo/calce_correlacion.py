"""Puntos de enlace por correlación entre la red de calles de un plano viejo y la de 1936.

El damero colonial de Caracas persiste hasta 1936, así que las calles de los dos planos se
parecen. Ambos se reducen a una imagen de "callejidad" (1 = calle, 0 = manzana); el plano
viejo se lleva al marco de 1936 con el calce actual y, en una malla de puntos, se busca el
corrimiento que maximiza la correlación normalizada entre ventanas. La búsqueda es más chica
que media manzana, así que no se puede saltar a la calle vecina; se trabaja de grueso a fino
y desde la plaza hacia afuera, recalculando el calce entre etapas (ver calce.py).
"""
import math

import cv2
import numpy as np

SUAVE_POR_OMISION = 1.5   # ancho (en unidades del canal) de la sigmoide del umbral
DESVIO_MINIMO = 0.12      # una ventana sin calles (desvío bajo) no sirve para correlacionar
NITIDEZ_MINIMA = 0.05     # el pico debe superar en esto al mejor valor lejos de él


def _canal(rgb, nombre):
    if nombre in ("L", "a", "b"):
        lab = cv2.cvtColor(np.ascontiguousarray(rgb), cv2.COLOR_RGB2LAB)
        return lab[..., "Lab".index(nombre)].astype(np.float32)
    if nombre in ("h", "s", "v"):
        hsv = cv2.cvtColor(np.ascontiguousarray(rgb), cv2.COLOR_RGB2HSV)
        return hsv[..., "hsv".index(nombre)].astype(np.float32)
    raise ValueError(f"canal desconocido: {nombre!r} (se esperaba L, a, b, h, s o v)")


def _condicion(rgb, c):
    valor = _canal(rgb, c["canal"])
    sigma = float(c.get("suavizado_px", 0))
    if sigma > 0:
        valor = cv2.GaussianBlur(valor, (0, 0), sigma)
    signo = 1.0 if c.get("sentido", "mayor") == "mayor" else -1.0
    z = signo * (valor - float(c["umbral"])) / float(c.get("suave", SUAVE_POR_OMISION))
    return (1.0 / (1.0 + np.exp(-np.clip(z, -30, 30)))).astype(np.float32)


def callejidad(rgb, perfil):
    """Probabilidad (0..1) de que cada píxel sea calle según el perfil de color del plano.

    perfil = {"canal": L|a|b|h|s|v, "umbral", "sentido": mayor|menor, "suavizado_px", "suave"}
    o {"condiciones": [perfil, …]} (se multiplican: todas deben cumplirse)
    o {"alguna": [perfil, …]} (el máximo: basta una, p. ej. calle crema o con tranvía rojo).
    """
    if "alguna" in perfil:
        return np.maximum.reduce([callejidad(rgb, p) for p in perfil["alguna"]])
    salida = np.ones(rgb.shape[:2], np.float32)
    for c in perfil.get("condiciones", [perfil]):
        salida *= _condicion(rgb, c)
    return salida


def malla(forma, paso, centro, radio, margen):
    """Puntos (x, y) cada `paso` px a ≤ radio del centro y a ≥ margen del borde de la imagen."""
    alto, ancho = forma
    xs = np.arange(margen, ancho - margen, paso)
    ys = np.arange(margen, alto - margen, paso)
    mx, my = np.meshgrid(xs, ys)
    dentro = np.hypot(mx - centro[0], my - centro[1]) <= radio
    return np.stack([mx[dentro], my[dentro]], axis=1).astype(float)


def corrimiento(base, movil, punto, ventana, busqueda):
    """Corrimiento (dx, dy) que lleva el contenido de `movil` en `punto` a su lugar en `base`.

    Devuelve ((dx, dy), calidad) o (None, 0) si la ventana no tiene estructura o el pico no
    es nítido. calidad = correlación normalizada del pico (−1..1).
    """
    x, y = int(round(punto[0])), int(round(punto[1]))
    w, s = int(ventana), int(busqueda)
    molde = movil[y - w:y + w + 1, x - w:x + w + 1]
    zona = base[y - w - s:y + w + s + 1, x - w - s:x + w + s + 1]
    if molde.shape != (2 * w + 1, 2 * w + 1) or zona.shape != (2 * (w + s) + 1, 2 * (w + s) + 1):
        return None, 0.0
    if molde.std() < DESVIO_MINIMO or zona.std() < DESVIO_MINIMO:
        return None, 0.0
    sup = cv2.matchTemplate(zona.astype(np.float32), molde.astype(np.float32), cv2.TM_CCOEFF_NORMED)
    fy, fx = np.unravel_index(int(np.argmax(sup)), sup.shape)
    pico = float(sup[fy, fx])
    if not math.isfinite(pico) or not _nitido(sup, fx, fy, pico, w):
        return None, 0.0
    ox, oy = _subpixel(sup, fx, fy)
    return (ox - s, oy - s), pico


def _nitido(sup, fx, fy, pico, ventana):
    """El pico no tiene un rival comparable a más de un cuarto de ventana."""
    dy, dx = np.mgrid[0:sup.shape[0], 0:sup.shape[1]]
    lejos = np.hypot(dx - fx, dy - fy) > max(2.0, ventana / 4)
    return not lejos.any() or pico - float(sup[lejos].max()) >= NITIDEZ_MINIMA


def _subpixel(sup, fx, fy):
    """Vértice de la parábola por los tres valores alrededor del máximo, en cada eje."""
    def eje(a, b, c):
        d = a - 2 * b + c
        return 0.0 if not np.isfinite(d) or d >= 0 else float(np.clip(0.5 * (a - c) / d, -0.5, 0.5))
    ox, oy = float(fx), float(fy)
    if 0 < fx < sup.shape[1] - 1:
        ox += eje(sup[fy, fx - 1], sup[fy, fx], sup[fy, fx + 1])
    if 0 < fy < sup.shape[0] - 1:
        oy += eje(sup[fy - 1, fx], sup[fy, fx], sup[fy + 1, fx])
    return ox, oy


def enlaces(base, movil, puntos, ventana, busqueda, calidad_minima):
    """[(punto en movil, punto en base, calidad)] para los puntos cuya correlación alcanza."""
    salida = []
    for p in puntos:
        d, calidad = corrimiento(base, movil, p, ventana, busqueda)
        if d is not None and calidad >= calidad_minima:
            salida.append(((float(p[0]), float(p[1])), (float(p[0] + d[0]), float(p[1] + d[1])), calidad))
    return salida


def residuos_loo_rapidos(origen, destino, suavizado=0.0, escala=1.0):
    """Error dejando uno fuera de un TPS con parte afín, sin reajustar n veces (Rippa, 1999).

    Con el sistema aumentado M = [[K + λI, P], [Pᵀ, 0]] y c = M⁻¹·[f; 0], el error del punto
    i al predecirlo sin él es c_i / (M⁻¹)_ii. Las coordenadas de origen se centran y se
    dividen por escala (como en tps.py). Devuelve la distancia en unidades del destino.
    """
    x = (origen - origen.mean(axis=0)) / escala
    n = len(x)
    r = np.hypot(*(x[:, None, :] - x[None, :, :]).transpose(2, 0, 1))
    with np.errstate(divide="ignore", invalid="ignore"):
        k = np.where(r > 0, r ** 2 * np.log(r), 0.0)
    p = np.c_[np.ones(n), x]
    m = np.zeros((n + 3, n + 3))
    m[:n, :n] = k + suavizado * np.eye(n)
    m[:n, n:] = p
    m[n:, :n] = p.T
    inversa = np.linalg.pinv(m)
    coef = inversa[:, :n] @ destino
    errores = coef[:n] / np.diag(inversa)[:n, None]
    return np.hypot(errores[:, 0], errores[:, 1])
