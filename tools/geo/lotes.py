"""Lotes de una manzana: solares rectos, de frente angosto y perpendiculares a su calle.

La manzana se mira en su propio marco (girada según la dirección dominante de sus lados, con el
lado largo en u). Ahí se reparte como un solar de damero:

- a los dos lados cortos dan lotes de fondo limitado (`FONDO_CABECERA_M`), cortados a lo largo de v;
- el resto da a los lados largos: tiras cortadas a lo largo de u que llegan hasta la mitad del
  tramo (la medianera del fondo), o lo cruzan entero si la manzana es angosta.

Los frentes varían entre FRENTE_MIN_M y FRENTE_MAX_M con el azar de la semilla de la manzana. "Dar
a un lado" se mide por filas y columnas del marco girado (cuánto falta para salir de la manzana
hacia cada lado), así una manzana en L, con muescas o pegada a la vecina se resuelve igual. Todos
los lotes salen rectángulos, salvo donde los recorta el borde de la manzana.

Las manzanas angostas, sin dirección dominante y que no llenan su rectángulo mínimo (las hileras
que siguen una calle curva, en los cerros) usan el método de las semillas: puntos cada FRENTE_M
sobre el borde y cada píxel a la más cercana. Ahí no hay centro adonde lleguen las cuñas.

Después de cruzar los lotes con lo edificado (tools/geo/vectorizar.py), `sin_pelos` y
`fundir_chicos` limpian las casas: las tiras finas y los pedazos chicos van con la casa vecina.
"""
import math

import cv2
import numpy as np
from skimage import measure

FRENTE_M = 12.0                    # frente típico de una casa del centro (método de las semillas)
FRENTE_MIN_M, FRENTE_MAX_M = 9.0, 14.0
FONDO_CABECERA_M = (20.0, 26.0)    # fondo de los lotes que dan a los lados cortos de la manzana
FONDO_MINIMO_M = 10.0              # un tramo de menos de dos fondos mínimos no se parte en dos filas
TOLERANCIA_LADOS_M = 2.5           # simplificación del borde para hallar los lados
ALINEACION_MINIMA = 0.5            # menos que esto: la manzana no tiene dirección dominante
GROSOR_FINO_M = 15.0               # … y si además es más angosta que esto
LLENO_MINIMO = 0.5                 # … y llena menos que esto de su rectángulo mínimo, va con semillas
PELO_MINIMO_PX = 16                # una tira fina de menos píxeles que esto es una miga del borde
CASI_CUADRADA = 0.8                # proporción desde la cual el lado "largo" se echa a la suerte


def lotes_por_semillas(manzana, frente_px):
    """Etiqueta cada píxel de la manzana con el lote (semilla de borde más cercana)."""
    contornos, _ = cv2.findContours(manzana.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    borde = max(contornos, key=len)[:, 0, :]
    paso = max(1, int(round(frente_px)))
    semillas = borde[::paso]
    sin_semilla = np.ones(manzana.shape, np.uint8)
    sin_semilla[semillas[:, 1], semillas[:, 0]] = 0
    _, etiquetas = cv2.distanceTransformWithLabels(sin_semilla, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    return np.where(manzana, etiquetas, 0)


def lados_de(manzana, tolerancia_px):
    """Borde de la manzana simplificado: [contorno exterior, huecos…], cada uno (n, 2) en píxeles."""
    contornos, jerarquia = cv2.findContours(manzana.astype(np.uint8), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
    simples = [(cv2.approxPolyDP(c, tolerancia_px, True)[:, 0, :].astype(float), h[3] < 0, cv2.contourArea(c))
               for c, h in zip(contornos, jerarquia[0])]
    exterior = max((s for s in simples if s[1]), key=lambda s: s[2])[0]
    huecos = [p for p, afuera, area in simples if not afuera and len(p) >= 3 and area > tolerancia_px ** 2]
    return [exterior, *huecos]


def orientacion(poligonos):
    """(ángulo dominante de los lados en [0, π/2), alineación 0..1) de unos polígonos cerrados.

    Los lados a 90° entre sí cuentan como la misma dirección (se promedia el ángulo ×4, pesado por
    el largo). Alineación 1: todos los lados siguen dos direcciones perpendiculares; 0: un círculo.
    """
    suma, largo = 0j, 0.0
    for p in poligonos:
        p = np.asarray(p, float)
        d = np.roll(p, -1, axis=0) - p
        largos = np.hypot(d[:, 0], d[:, 1])
        suma += np.sum(largos * np.exp(4j * np.arctan2(d[:, 1], d[:, 0])))
        largo += float(largos.sum())
    if largo == 0:
        return 0.0, 0.0
    return (math.atan2(suma.imag, suma.real) / 4) % (math.pi / 2), abs(suma) / largo


def cortes(desde, hasta, rng, minimo, maximo, margen=None):
    """Posiciones de las medianeras: reparten [desde, hasta] en frentes al azar entre mínimo y máximo
    (ajustados para que entren justo) y siguen a paso fijo `margen` más allá de cada punta."""
    medio = (minimo + maximo) / 2
    largo = max(hasta - desde, 0.0)
    margen = largo + 10 * maximo if margen is None else margen
    cuantos = max(1, int(round(largo / medio)))
    anchos = rng.uniform(minimo, maximo, cuantos)
    adentro = desde + np.concatenate([[0.0], np.cumsum(anchos * (largo / anchos.sum()))]) if largo > 0 else np.array([desde])
    adentro[-1] = max(hasta, desde)
    afuera = np.arange(1, int(math.ceil(margen / medio)) + 1) * medio
    return np.concatenate([(desde - afuera)[::-1], adentro, adentro[-1] + afuera])


LEJOS = 1 << 30


def hasta_el_borde(dentro, eje, no_cuenta=None):
    """Para cada píxel, cuántos faltan para salir de la máscara hacia atrás y hacia adelante en ese eje.

    Si la salida es por un píxel de `no_cuenta`, la distancia es LEJOS: por ahí no se sale.
    """
    n = dentro.shape[eje]
    indice = np.arange(n).reshape((-1, 1) if eje == 0 else (1, -1))
    atras = indice - np.maximum.accumulate(np.where(dentro, -1, indice), axis=eje)
    al_reves = np.flip(np.where(dentro, n, indice), axis=eje)
    adelante = np.flip(np.minimum.accumulate(al_reves, axis=eje), axis=eje) - indice
    if no_cuenta is not None:
        for distancia, sentido in ((atras, -1), (adelante, 1)):
            ultimo = np.clip(indice + sentido * (distancia - 1), 0, n - 1)   # el último píxel de adentro
            distancia[np.take_along_axis(no_cuenta, np.broadcast_to(ultimo, dentro.shape), axis=eje)] = LEJOS
    return atras, adelante


def lados_cortos(puntos, largo_minimo):
    """Qué lados de un polígono (en el marco girado) son cabeceras: corren a lo largo de v y, junto
    con los que les siguen, cubren al menos `largo_minimo` (el fondo de un callejón no es cabecera)."""
    delta = np.abs(np.roll(puntos, -1, axis=0) - puntos)
    a_lo_ancho = delta[:, 1] > delta[:, 0]
    if a_lo_ancho.all():
        return a_lo_ancho
    primero = int(np.flatnonzero(~a_lo_ancho)[0])            # se arranca en un lado largo: los tramos no dan la vuelta
    orden = np.roll(np.arange(len(puntos)), -primero)
    tramo = np.cumsum(~a_lo_ancho[orden])
    alcance = np.bincount(tramo, weights=np.where(a_lo_ancho[orden], delta[orden, 1], 0))
    cabecera = np.zeros(len(puntos), bool)
    cabecera[orden] = a_lo_ancho[orden] & (alcance[tramo] >= largo_minimo)
    return cabecera


def marco_girado(poligonos, angulo, largo_minimo):
    """La manzana rasterizada en su marco (u a lo largo del ángulo).

    → (máscara, borde largo, origen (u, v), girar). «Borde largo»: los píxeles del borde que no son
    de una cabecera (ver lados_cortos) ni tocan una.
    """
    c, s = math.cos(angulo), math.sin(angulo)

    def girar(x, y):
        return x * c + y * s, -x * s + y * c

    girados = [np.c_[girar(p[:, 0], p[:, 1])] for p in poligonos]
    origen = np.floor(girados[0].min(axis=0)) - 2
    ancho, alto = (np.ceil(girados[0].max(axis=0)) - origen + 3).astype(int)
    dentro = np.zeros((alto, ancho), np.uint8)
    largos, cabeceras = np.zeros_like(dentro), np.zeros_like(dentro)
    for k, g in enumerate(girados):
        puntos = np.round(g - origen).astype(np.int32)
        cv2.fillPoly(dentro, [puntos], 1 if k == 0 else 0)
        for p, q, es_cabecera in zip(puntos, np.roll(puntos, -1, axis=0), lados_cortos(puntos, largo_minimo)):
            cv2.line(cabeceras if es_cabecera else largos, tuple(map(int, p)), tuple(map(int, q)), 1)
    for g in girados[1:]:   # el borde de un hueco es de la manzana
        cv2.polylines(dentro, [np.round(g - origen).astype(np.int32)], True, 1)
    vecindad = np.ones((3, 3), np.uint8)
    borde_largo = (cv2.dilate(largos, vecindad) > 0) & (cv2.dilate(cabeceras, vecindad) == 0)
    return dentro.astype(bool), borde_largo, origen, girar


def mas_cercano_adentro(dentro):
    """Para cada píxel del marco, el índice plano del píxel de la máscara más cercano."""
    _, etiquetas = cv2.distanceTransformWithLabels((~dentro).astype(np.uint8), cv2.DIST_L2, 5,
                                                   labelType=cv2.DIST_LABEL_PIXEL)
    planos = np.flatnonzero(dentro)
    tabla = np.zeros(int(etiquetas.max()) + 1, np.int64)
    tabla[etiquetas.ravel()[planos]] = planos
    return tabla[etiquetas]


def lotes_rectos(manzana, poligonos, angulo, metro, rng):
    """Etiqueta cada píxel de la manzana con su lote, en el marco girado `angulo` (ver el módulo)."""
    dentro, borde_largo, origen, girar = marco_girado(poligonos, angulo, FRENTE_MIN_M / metro)
    if not dentro.any():
        return manzana.astype(np.int32)
    ys, xs = np.nonzero(manzana)
    u, v = girar(xs.astype(float), ys.astype(float))
    columna = np.clip(np.round(u - origen[0]).astype(int), 0, dentro.shape[1] - 1)
    fila = np.clip(np.round(v - origen[1]).astype(int), 0, dentro.shape[0] - 1)
    donde = mas_cercano_adentro(dentro)[fila, columna]   # los dientes del borde miran al lado más cercano
    # a un lado corto se llega por la fila; si la fila sale por un lado largo (apenas torcido
    # respecto del marco), ese píxel no es de cabecera
    izquierda, derecha = (campo.ravel()[donde] for campo in hasta_el_borde(dentro, 1, borde_largo))
    arriba, abajo = (campo.ravel()[donde] for campo in hasta_el_borde(dentro, 0))

    v_adentro, u_adentro = np.nonzero(dentro)
    u0, u1 = origen[0] + u_adentro.min() - 0.5, origen[0] + u_adentro.max() + 0.5
    v0, v1 = origen[1] + v_adentro.min() - 0.5, origen[1] + v_adentro.max() + 0.5
    frente = (FRENTE_MIN_M / metro, FRENTE_MAX_M / metro)
    dos_filas = 2 * FONDO_MINIMO_M / metro
    fondo = rng.uniform(*FONDO_CABECERA_M) / metro if v1 - v0 >= dos_filas else 0.0
    con_tiras = u1 - u0 - 2 * fondo >= frente[0]
    margen = (u1 - u0) + (v1 - v0)
    cortes_u = cortes(u0 + fondo, u1 - fondo, rng, *frente, margen) if con_tiras else cortes(u0, u1, rng, *frente, margen)
    cortes_v = cortes(v0, v1, rng, *frente, margen)

    de_cabecera = np.minimum(izquierda, derecha) < fondo
    lado_cabecera = (derecha < izquierda) & ((izquierda >= LEJOS) | (izquierda + derecha - 1 >= dos_filas))
    lado_tira = (abajo < arriba) & (arriba + abajo - 1 >= dos_filas)
    tira = 1 + 2 * np.searchsorted(cortes_u, u) + lado_tira
    cabecera = 1 + 2 * (len(cortes_u) + 1 + np.searchsorted(cortes_v, v)) + lado_cabecera
    lotes = np.zeros(manzana.shape, np.int32)
    lotes[ys, xs] = np.where(de_cabecera, cabecera, tira)
    return lotes


def lotes_de_manzana(manzana, metro, semilla):
    """Etiqueta (> 0) cada píxel de la manzana con su lote; 0 fuera de la manzana."""
    manzana = np.asarray(manzana, bool)
    poligonos = lados_de(manzana, TOLERANCIA_LADOS_M / metro)
    if len(poligonos[0]) < 3:
        return manzana.astype(np.int32)
    angulo, alineacion = orientacion(poligonos)
    if alineacion < ALINEACION_MINIMA:
        # sin dirección dominante: la del rectángulo mínimo, salvo que sea una hilera curva
        (_, (ancho, alto), grados) = cv2.minAreaRect(poligonos[0].astype(np.float32))
        grosor = 2 * cv2.distanceTransform(np.pad(manzana, 1).astype(np.uint8), cv2.DIST_L2, 5).max() * metro
        if grosor < GROSOR_FINO_M and manzana.sum() < LLENO_MINIMO * (ancho + 1) * (alto + 1):
            return lotes_por_semillas(manzana, FRENTE_M / metro)
        angulo = math.radians(grados) % (math.pi / 2)
    rng = np.random.default_rng(int(semilla))
    exterior = poligonos[0]
    c, s = math.cos(angulo), math.sin(angulo)
    largo_u = np.ptp(exterior[:, 0] * c + exterior[:, 1] * s)
    largo_v = np.ptp(-exterior[:, 0] * s + exterior[:, 1] * c)
    casi_cuadrada = min(largo_u, largo_v) >= CASI_CUADRADA * max(largo_u, largo_v)
    if (rng.random() < 0.5) if casi_cuadrada else (largo_v > largo_u):
        angulo += math.pi / 2
    return lotes_rectos(manzana, poligonos, angulo, metro, rng)


def fundir_chicos(casas, area_minima_px):
    """Une cada pedazo de menos de `area_minima_px` al vecino con el que comparte más borde.

    `casas`: etiquetas (0 = nada). Los pedazos sin vecinos quedan como están. → etiquetas nuevas.
    """
    areas = np.bincount(casas.ravel()).astype(np.int64)
    n = len(areas)
    chicos = [int(k) for k in np.flatnonzero(areas < area_minima_px) if k > 0 and areas[k] > 0]
    if not chicos:
        return casas
    claves = []
    for a, b in ((casas[:, :-1], casas[:, 1:]), (casas[:-1], casas[1:])):
        distintos = (a != b) & (a > 0) & (b > 0)
        a, b = a[distintos].astype(np.int64), b[distintos].astype(np.int64)
        claves.append(np.minimum(a, b) * n + np.maximum(a, b))
    pares, contacto = np.unique(np.concatenate(claves), return_counts=True)
    es_chico = np.zeros(n, bool)
    es_chico[chicos] = True
    vecinos = {k: {} for k in chicos}
    for par, cuanto in zip(pares.tolist(), contacto.tolist()):
        a, b = divmod(par, n)
        if es_chico[a]:
            vecinos[a][b] = cuanto
        if es_chico[b]:
            vecinos[b][a] = cuanto

    padre = list(range(n))

    def raiz(k):
        while padre[k] != k:
            padre[k] = padre[padre[k]]
            k = padre[k]
        return k

    for k in sorted(chicos, key=lambda k: (areas[k], k)):
        yo = raiz(k)
        if areas[yo] >= area_minima_px:
            continue
        borde = {}
        for otro, cuanto in vecinos[yo].items():
            destino = raiz(otro)
            if destino != yo:
                borde[destino] = borde.get(destino, 0) + cuanto
        if not borde:
            continue
        destino = max(borde, key=lambda d: (borde[d], -d))
        padre[yo] = destino
        areas[destino] += areas[yo]
        if destino in vecinos:
            for otro, cuanto in vecinos[yo].items():
                vecinos[destino][otro] = vecinos[destino].get(otro, 0) + cuanto
    return np.array([raiz(k) for k in range(n)], casas.dtype)[casas]


def sin_pelos(casas, radio_px):
    """Le saca a cada casa lo que mide menos de 2·radio de ancho y se lo da a la casa de al lado.

    Donde dos medianeras se juntan en ángulo cerrado queda una tira fina de un lote metida en el
    vecino. Lo fino que no tiene otra casa a menos de un par de radios se queda como está, y también
    las migas de menos de PELO_MINIMO_PX píxeles (esquinas, bordes en escalera).
    """
    lado = 2 * int(radio_px) + 1
    disco = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (lado, lado))
    etiquetas = np.pad(casas, int(radio_px)).astype(np.float32)   # float32: exacto hasta 2²⁴ casas
    parejo = (cv2.erode(etiquetas, disco) == cv2.dilate(etiquetas, disco)) & (etiquetas > 0)
    grueso = (cv2.dilate(np.where(parejo, etiquetas, 0), disco) == etiquetas) & (etiquetas > 0)
    fino = (etiquetas > 0) & ~grueso
    if not fino.any() or not grueso.any():
        return casas
    # las migas de las esquinas y de los bordes en escalera no son pelos: solo lo fino de cierto tamaño
    pedazos = measure.label(np.where(fino, etiquetas, 0).astype(np.int32), background=0, connectivity=1)
    fino = (np.bincount(pedazos.ravel()) >= PELO_MINIMO_PX)[pedazos] & fino
    if not fino.any():
        return casas
    distancia, cercano = cv2.distanceTransformWithLabels((~grueso).astype(np.uint8), cv2.DIST_L2, 5,
                                                         labelType=cv2.DIST_LABEL_PIXEL)
    de_quien = np.zeros(int(cercano.max()) + 1, np.float32)
    de_quien[cercano[grueso]] = etiquetas[grueso]
    cambia = fino & (distancia <= 2 * radio_px + 2)
    limpias = np.where(cambia, de_quien[cercano], etiquetas).astype(casas.dtype)
    borde = int(radio_px)
    return limpias[borde:limpias.shape[0] - borde, borde:limpias.shape[1] - borde] if borde else limpias
