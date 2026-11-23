#!/usr/bin/env python3
"""Épocas de la ciudad: desde cuándo existe cada casa de 1936 (y qué casas viejas ya no están).

Línea de tiempo (índice de época → año): 0 → 1578 (Pimentel), 1 → 1772 (Exato mapa),
2 → 1843 (Jesurún), 3 → 1889 (Mestre), 4 → 1911 (Razetti), 5 → 1936 (DCN).

1. Para cada plano calzado (tools/geo/calce.py) se segmenta lo edificado por color (manzanas
   rojas, rayadas, durazno o grises, según el plano), en la grilla del mosaico de 1936.
2. Cada casa de 1936 (techos de ciudad-1936.json) nace en la primera época desde la cual su
   huella cae mayormente en lo edificado de esa época y de todas las siguientes.
3. Las casas de 1578 (tools/geo/epocas_1578.py) mueren cuando las reemplaza la casa de 1936
   que las pisa o, si no las pisa ninguna, en la primera época en que su lugar no está edificado.
4. Salidas: fuentes/derivados/epocas/ciudad-epocas.json (el JSON del vectorizador con los
   techos de 1578 agregados y "vida": [[nace, muere], …], 0 = desde siempre / nunca muere),
   crece.json (metadatos por época, como specs/02) y crece.png (R = desde qué época está
   edificado cada punto, G = desde cuál está urbanizado —manzanas con sus calles, tools/geo/valle.py—,
   los dos codificados como en specs/02, y B = el monte del valle), más láminas QA por época.
   crece.json va también a public/datos/ y crece.png a public/plano/.

Uso (desde el checkout con los datos): python tools/geo/epocas.py
"""
import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

import cv2  # noqa: E402
import numpy as np  # noqa: E402
from skimage import draw  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

import valle  # noqa: E402
from calce_correlacion import callejidad  # noqa: E402
from segmentar_clases import AGUA, DESCONOCIDO, EDIFICADO, EDIFICIO_PUBLICO, MARGEN, PATIO  # noqa: E402
from vectorizar import DE_LA_MANZANA  # noqa: E402

AQUI = Path(__file__).resolve().parent
NUNCA = 255                 # etapa de lo que nunca está edificado
CUANTAS = 6                 # épocas de la línea de tiempo
ULTIMA = CUANTAS - 1        # 1936
PUBLICOS_DESDE = 3          # los edificios públicos del plano de 1936 (grandes, de varios pisos) no existen antes de 1889
MITAD_DE_LA_CUADRA = 0.5    # una cuadra modelo nace entera cuando ya está al menos esta parte de sus casas
ESTILO_PUBLICO = 9          # tools/geo/vectorizar.py
CASAS_1936 = (EDIFICADO, EDIFICIO_PUBLICO, PATIO)   # lo que urbaniza en 1936 (los árboles sueltos no)
AGUA_MINIMA = 0.15          # parte de una celda de crece.png con agua para que cuente como agua
CONSTRUIDOS_1578 = ("casa", "iglesia", "cabildo", "convento")
SIN_LICENCIA = "sin licencia declarada (derechos por verificar)"
PISADA_MINIMA = 0.3         # fracción de una casa de 1578 cubierta por una de 1936 para pasarle la posta
PISADA_ENTRE_TODAS = 0.15   # … o cubierta entre todas las de 1936 que ya nacieron (los lotes de la cuadra modelo son angostos)


def desde_cuando(etapas, cuantas=CUANTAS):
    """Etapa (0..cuantas−1, o NUNCA) → canal uint8: la etapa e vale (cuantas − e)/cuantas."""
    etapas = np.asarray(etapas)
    valor = np.round(255.0 * (cuantas - etapas.astype(float)) / cuantas)
    return np.where(etapas == NUNCA, 0, valor).astype(np.uint8)


def vida_empacada(nace, muere):
    """nace + 8·muere, como mueT en specs/02 (muere = 0: no muere)."""
    if muere and muere <= nace:
        raise ValueError(f"no puede morir ({muere}) antes de nacer o al nacer ({nace})")
    return int(nace) + 8 * int(muere)


# --- máscaras de lo edificado ------------------------------------------------------------------

def _disco(radio_px):
    lado = 2 * max(1, int(round(radio_px))) + 1
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (lado, lado))


def edificado(rgba, perfil, cierre_px, area_minima_px, apertura_px=0, ancho_minimo_px=0):
    """Máscara de lo edificado de un plano calzado (RGBA, alfa 0 = fuera del plano).

    Color según el perfil (formato de calce_correlacion.callejidad, > 0,5), apertura para
    borrar líneas finas (vías, marcos, rayados de cerro), cierre para tapar rótulos y bordes
    de tinta, y sin manchas menores que area_minima_px ni componentes más angostas que
    ancho_minimo_px (2·área/perímetro: vías largas, marcos de la hoja).
    """
    color = callejidad(np.ascontiguousarray(rgba[..., :3]), perfil) > 0.5
    dentro = rgba[..., 3] >= 128
    mascara = (color & dentro).astype(np.uint8)
    if apertura_px:
        mascara = cv2.morphologyEx(mascara, cv2.MORPH_OPEN, _disco(apertura_px))
    mascara = cv2.morphologyEx(mascara, cv2.MORPH_CLOSE, _disco(cierre_px))
    mascara &= dentro.astype(np.uint8)
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(mascara, connectivity=8)
    vale = np.zeros(n, bool)
    vale[1:] = stats[1:, cv2.CC_STAT_AREA] >= area_minima_px
    for k in np.flatnonzero(vale) if ancho_minimo_px else ():
        vale[k] = _ancho_medio(etiquetas, stats[k], k) >= ancho_minimo_px
    return vale[etiquetas]


def _ancho_medio(etiquetas, stat, k):
    """2·área/perímetro de una componente: cuán ancha es (una vía o un marco dan poco).

    El perímetro suma el borde de afuera y los de sus huecos: un marco cerrado mide su ancho real.
    """
    x, y, w, h = stat[:4]
    sola = (etiquetas[y:y + h, x:x + w] == k).astype(np.uint8)
    contornos, _ = cv2.findContours(sola, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    perimetro = sum(cv2.arcLength(c, True) for c in contornos)
    return 2.0 * float(stat[cv2.CC_STAT_AREA]) / max(perimetro, 1.0)


def en_marco(parcial, recorte, forma):
    """Pone la máscara de un recorte [x0, y0, x1, y1) en una máscara de la forma completa.

    Lo que cae fuera de la forma se descarta.
    """
    salida = np.zeros(forma, bool)
    x0, y0, x1, y1 = recorte
    ax0, ay0 = max(x0, 0), max(y0, 0)
    ax1, ay1 = min(x1, forma[1]), min(y1, forma[0])
    if ax1 > ax0 and ay1 > ay0:
        salida[ay0:ay1, ax0:ax1] = parcial[ay0 - y0:ay1 - y0, ax0 - x0:ax1 - x0]
    return salida


def _huella(poligono, forma, escala):
    """(filas, columnas) de los píxeles cuyo centro cae en el polígono (bordes de píxel, px del mosaico)."""
    pts = np.asarray(poligono, float) / escala - 0.5
    return draw.polygon(pts[:, 1], pts[:, 0], shape=forma)


def mascara_de_solares(solares, forma, escala):
    """Solares construidos de 1578 (casa, iglesia, cabildo, convento) rasterizados."""
    mascara = np.zeros(forma, bool)
    for s in solares:
        if s["estado"] in CONSTRUIDOS_1578:
            mascara[_huella(s["poligono"], forma, escala)] = True
    return mascara


def poligonos(ciudad):
    v = np.asarray(ciudad["vertices"], float).reshape(-1, 2)
    return [v[i:i + n] for i, n, *_ in ciudad["techos"]]


def huellas(ciudad, forma, escala):
    """Huella entera de cada techo, (filas, columnas): los techos que se enciman no se tapan."""
    return [_huella(p, forma, escala) for p in poligonos(ciudad)]


def fracciones(huellas_, mascaras):
    """(techos × máscaras): parte de la huella de cada techo que cae en cada máscara (0 si no tiene)."""
    salida = np.zeros((len(huellas_), len(mascaras)))
    for k, (filas, columnas) in enumerate(huellas_):
        if filas.size:
            salida[k] = [m[filas, columnas].mean() for m in mascaras]
    return salida


# --- nace y muere ------------------------------------------------------------------------------

def nace(fr, primera, umbral):
    """Primera época desde la cual la casa existe en todas las siguientes (si no, la última+1).

    fr: fracciones por casa en las épocas primera, primera+1, …; existe si fr ≥ umbral.
    """
    existe = fr >= umbral
    seguido = np.flip(np.logical_and.accumulate(np.flip(existe, axis=1), axis=1), axis=1)
    primera_col = np.where(seguido.any(axis=1), np.argmax(seguido, axis=1), existe.shape[1])
    return primera + primera_col


def muere(fr, nace, umbral):
    """Primera época (desde nace+1) en que la casa ya no está; ULTIMA si llega a 1911."""
    falta = fr < umbral
    return np.where(falta.any(axis=1), nace + 1 + np.argmax(falta, axis=1), ULTIMA)


def _cajas(huellas_):
    """(n × 4) fila mín., fila máx., columna mín., columna máx. de cada huella (vacía: caja imposible)."""
    cajas = np.tile([-1, -2, -1, -2], (len(huellas_), 1))
    for k, (f, c) in enumerate(huellas_):
        if f.size:
            cajas[k] = f.min(), f.max(), c.min(), c.max()
    return cajas


def _cubiertas(huella78, huellas36, cajas36, ancho):
    """(índices de las casas de 1936 que tocan la huella, [los píxeles de la huella que cubre cada una])."""
    f, c = huella78
    if not f.size:
        return np.array([], int), []
    cerca = np.flatnonzero((cajas36[:, 0] <= f.max()) & (cajas36[:, 1] >= f.min())
                           & (cajas36[:, 2] <= c.max()) & (cajas36[:, 3] >= c.min()))
    propia = f.astype(np.int64) * ancho + c
    cubiertos = []
    for j in cerca:
        suya = huellas36[j][0].astype(np.int64) * ancho + huellas36[j][1]
        cubiertos.append(suya[np.isin(suya, propia)])
    return cerca, cubiertos


def pisadas(huella78, huellas36, cajas36, ancho):
    """Índices de las casas de 1936 que por sí solas cubren ≥ PISADA_MINIMA de la huella dada."""
    cerca, cubiertos = _cubiertas(huella78, huellas36, cajas36, ancho)
    return cerca[np.array([len(c) for c in cubiertos], int) >= PISADA_MINIMA * huella78[0].size] if len(cerca) else cerca


def tapada_desde(huella78, huellas36, cajas36, nace36, ancho):
    """La primera época en que las casas de 1936 ya nacidas cubren, entre todas, ≥ PISADA_ENTRE_TODAS de la
    huella (cada píxel cuenta una vez: las dos versiones de una cuadra se enciman), o None."""
    cerca, cubiertos = _cubiertas(huella78, huellas36, cajas36, ancho)
    if not len(cerca):
        return None
    nacen = np.asarray(nace36)[cerca]
    for epoca in sorted(set(int(n) for n in nacen)):
        juntos = [c for c, n in zip(cubiertos, nacen) if n <= epoca and len(c)]
        if juntos and np.unique(np.concatenate(juntos)).size >= PISADA_ENTRE_TODAS * huella78[0].size:
            return epoca
    return None


def vida_de_1578(ciudad78, huellas36, nace36, construido, escala):
    """[[0, muere], …] de las casas de 1578.

    construido: máscaras de las épocas 1..4. Muere cuando nace la primera casa de 1936 que la pisa (por sí
    sola ≥ PISADA_MINIMA de su huella) o cuando las ya nacidas la tapan entre todas (≥ PISADA_ENTRE_TODAS), lo
    que pase primero; si no, en la primera época en que su lugar no está edificado (< la mitad) o, si sigue
    edificado hasta 1911, en 1936.
    """
    forma = construido[0].shape
    huellas78 = huellas(ciudad78, forma, escala)
    sin_pisar = muere(fracciones(huellas78, construido), nace=0, umbral=0.5)
    cajas36 = _cajas(huellas36)
    vida = []
    for k, h in enumerate(huellas78):
        pisan = pisadas(h, huellas36, cajas36, forma[1])
        cuando = [int(np.min(nace36[pisan]))] if pisan.size else []
        tapada = tapada_desde(h, huellas36, cajas36, nace36, forma[1])
        if tapada is not None:
            cuando.append(tapada)
        vida.append([0, max(1, min(cuando)) if cuando else int(sin_pisar[k])])
    return vida


def cerrar_cuadras(nace, cuadras):
    """El nacimiento de cada casa con las cuadras cerradas: todas las casas de una cuadra modelo (`cuadras`,
    -1: ninguna) nacen juntas, en la primera época en que ya estaba MITAD_DE_LA_CUADRA de ellas. Así no
    quedan lotes vacíos que abran los patios de las otras casas a la calle. → un array nuevo."""
    nace = np.asarray(nace)
    cuadras = np.asarray(cuadras)
    salida = nace.copy()
    for q in np.unique(cuadras[cuadras >= 0]):
        suyas = cuadras == q
        orden = np.sort(nace[suyas])
        salida[suyas] = orden[int(np.ceil(MITAD_DE_LA_CUADRA * len(orden))) - 1]
    return salida


def apertura_de_juntas(juntas, edificado, escala, minimos=None, hastas=None):
    """La época en que se abre cada grupo de calles nuevas (tools/geo/vectorizar.py, "juntas"): la primera
    cuyo plano (`edificado`: máscaras de las épocas 1..4, en la grilla reducida) ya no tiene edificada la
    mayor parte de sus calles; si todas la tienen, 1936. `hastas`: la época en que el grupo cede a más tardar
    (0 = sin tope); las cuadras de la referencia de 1772 ceden en 1843, porque la referencia solo describe 1772."""
    forma = edificado[0].shape if edificado else (0, 0)
    abre = []
    for indice, poligonos in enumerate(juntas):
        mascara = np.zeros(forma, bool)
        for p in poligonos:
            mascara[_huella(np.asarray(p, float).reshape(-1, 2), forma, escala)] = True
        tapadas = [m[mascara].mean() if mascara.any() else 1.0 for m in edificado]
        minimo = minimos[indice] if minimos is not None else 1
        cuando = next((1 + e for e, f in enumerate(tapadas) if 1 + e >= minimo and f < 0.5), ULTIMA)
        tope = hastas[indice] if hastas is not None and indice < len(hastas) else 0
        abre.append(min(cuando, tope) if tope else cuando)
    return abre


def _vida_de_casa(k, nace, cede, junta, antes, apertura):
    """[nace, muere] de un techo, o None si no llega a vivir."""
    muere = int(nace[cede]) if cede >= 0 else 0
    desde = int(nace[k])
    if junta >= 0:
        abre = int(apertura[junta])
        if antes:
            muere = min(muere, abre) if muere else abre
        else:
            desde = max(desde, abre)
    if muere and muere <= desde:
        return None
    return [desde, muere]


def vida_de_1936(nace36, ciudad, apertura=()):
    """([[nace, muere], …], techos a quitar) de la ciudad de 1936. Las cuadras modelo nacen enteras
    (cerrar_cuadras); los edificios públicos, no antes de PUBLICOS_DESDE; una casa que pisa uno ("cede")
    vive hasta que él nace. Con calles nuevas ("junta"; `apertura`: la época en que se abre cada grupo,
    apertura_de_juntas), la cuadra de antes ("antes" 1) vive hasta que se abre su calle y las de después
    nacen recién entonces. Una casa que pisa una calle de 1772 de la referencia ("calzada72") o que queda debajo de una
    casa de su reconstrucción ("tapada72") no vive en 1772.
    Una casa que no llega a vivir sobra: se quita."""
    n = len(ciudad["techos"])
    nace = cerrar_cuadras(nace36, ciudad.get("cuadras", [-1] * n))
    publico = np.array([t[3] == ESTILO_PUBLICO for t in ciudad["techos"]], bool)
    nace = np.where(publico, np.maximum(nace, PUBLICOS_DESDE), nace)
    # La lectura directa del plano prevalece sobre el calce automático: estas
    # casas forman una cuadra documentada como cerrada en 1772.
    minimos = ciudad.get("juntas_minimo", [])
    for k, (junta, antes) in enumerate(zip(ciudad.get("junta", [-1] * n), ciudad.get("antes", [0] * n))):
        if antes and 0 <= junta < len(minimos) and minimos[junta] >= 2 and not publico[k]:
            nace[k] = 1
    vida, quitar = [], set()
    datos = zip(ciudad.get("cede", [-1] * n), ciudad.get("junta", [-1] * n), ciudad.get("antes", [0] * n))
    calzada, tapada = ciudad.get("calzada72", [0] * n), ciudad.get("tapada72", [0] * n)
    for k, (cede, junta, antes) in enumerate(datos):
        una = _vida_de_casa(k, nace, cede, junta, antes, apertura)
        afuera = (k < len(calzada) and calzada[k]) or (k < len(tapada) and tapada[k])
        if una is not None and afuera and una[0] <= 1 and (una[1] == 0 or una[1] > 1):
            # pisa una calle de 1772 de la referencia: en 1772 no está (la calle manda sobre la casa heurística)
            una = None if antes or (una[1] and una[1] <= 2) else [2, una[1]]
        if una is None:
            vida.append([int(nace[k]), 0])
            quitar.add(k)
        else:
            vida.append(una)
    return vida, quitar


def abrir_calles_de_1772(ciudad, vida, quitar, calles, metro, area_minima_m2=1.0, desde=0):
    """(vida, quitar, sin abrir): las calles de la referencia de 1772 (tools/geo/calles_1772.py) que las casas vivas
    en 1772 bloquean de un extremo al otro se abren quitándole 1772 a las casas que pisan su núcleo de calzada: una de
    1936 nace desde 1843, una «de antes» se quita y una de 1578 (índice más allá de "antes") vive solo hasta 1772. Solo se tocan las calles bloqueadas y solo lo que pisa su eje;
    lo que siga bloqueado se informa. `desde`: solo se tocan los techos desde ese índice (la pasada sobre la ciudad
    final toca solo las casas de 1578: atrasar ahí una de 1936 dejaría sin relevo a su antecesora). No muta las entradas."""
    from shapely.geometry import LineString, Polygon
    from calles_1772 import NUCLEO_DE_CALZADA_M, bloqueado
    vida, quitar = [list(v) for v in vida], set(quitar)
    v, antes = ciudad["vertices"], ciudad.get("antes", [])
    figuras = [Polygon([(v[2 * i], v[2 * i + 1]) for i in range(t[0], t[0] + t[1])]) for t in ciudad["techos"]]

    def vivas():
        return [k for k, (nace_, muere) in enumerate(vida)
                if k not in quitar and nace_ <= 1 and (muere == 0 or muere > 1) and figuras[k].is_valid]

    sin_abrir = []
    for eje in calles:
        if not eje.get("medible", True):
            continue
        ahora = vivas()
        # `siempre`: una calle conocida (núcleo de calzada de la referencia o calle histórica verificada) se despeja
        # aunque no quede cerrada de lado a lado
        if not eje.get("siempre") and not bloqueado(eje, [figuras[k] for k in ahora], metro):
            continue
        nucleo = LineString(eje["puntos"]).buffer(NUCLEO_DE_CALZADA_M / 2 / metro, cap_style="flat")
        for k in ahora:
            if k < desde or figuras[k].intersection(nucleo).area * metro ** 2 < area_minima_m2:
                continue
            nace_, muere = vida[k]
            if k >= len(antes):
                # una casa de 1578 (la ciudad final las suma después de las de 1936): vive solo antes de 1772
                if nace_ < 1:
                    vida[k] = [nace_, 1]
                else:
                    quitar.add(k)
            elif antes[k] or (muere and muere <= 2):
                quitar.add(k)
            else:
                vida[k] = [max(2, nace_), muere]
        if not eje.get("siempre") and bloqueado(eje, [figuras[k] for k in vivas()], metro):
            sin_abrir.append(eje["tramo"])
    return vida, quitar, sin_abrir


SOLAPE_1772_M2 = 0.01   # como la puerta de la fase 5: una casa de 1578 que pisa esto de una de 1772 le cede el lugar


def ceder_a_1772(ciudad, vida, desde, metro, epoca=1, area_minima_m2=SOLAPE_1772_M2):
    """La vida con las casas de 1578 (índice desde `desde`) que siguen en pie en 1772 y pisan una casa de 1772 muertas en
    1772: en 1772 manda el plano de 1772 (T33j.5c). → una lista nueva; no muta las entradas."""
    from shapely.geometry import Polygon
    from shapely.strtree import STRtree
    v = ciudad["vertices"]

    def figura(k):
        i, n = ciudad["techos"][k][:2]
        return Polygon([(v[2 * j], v[2 * j + 1]) for j in range(i, i + n)])

    def vive(k):
        nace, muere = vida[k]
        return nace <= epoca and (muere == 0 or muere > epoca)

    de_1772 = [figura(k) for k in range(min(desde, len(vida))) if vive(k)]
    de_1772 = [f for f in de_1772 if f.is_valid]
    arbol = STRtree(de_1772) if de_1772 else None
    salida = [list(x) for x in vida]
    for k in range(desde, len(vida)):
        if not vive(k) or arbol is None:
            continue
        f = figura(k)
        if f.is_valid and any(f.intersection(de_1772[j]).area * metro ** 2 > area_minima_m2
                              for j in arbol.query(f, predicate="intersects")):
            salida[k] = [salida[k][0], epoca]
    return salida


def ceder_frentes_a_1772(ciudad, tramos, hitos, metro, desde, epoca=1):
    """La vida con las casas de 1578 (índice desde `desde`) que en 1772 quedan paradas en la calle, entre el eje y la
    recta del frente de la reconstrucción (fachadas.delante_de_la_recta), muertas en 1772: en 1772 manda el plano de
    1772, como en ceder_a_1772 (T33j.5j). → una lista nueva; no muta las entradas."""
    from cierre_fase3 import casas_de_epoca
    from cierre_fase4 import visibles
    from fachadas import delante_de_la_recta
    casas = visibles(casas_de_epoca(ciudad, epoca), hitos, epoca)
    n = len(ciudad.get("antes", []))
    de_1772 = {k for k, _ in casas if k < n and ciudad["antes"][k] and ciudad["junta"][k] >= 0}
    delante = {k for k in delante_de_la_recta(casas, tramos, metro, de_1772) if k >= desde}
    print(f"casas de 1578 paradas en la calle de 1772: {len(delante)}")
    return [[v[0], epoca] if k in delante else list(v) for k, v in enumerate(ciudad["vida"])]


def con_huellas(ciudad, nuevas):
    """La ciudad con las huellas `nuevas` ({techo: Polygon}) en lugar de las de esos techos; los vértices se vuelven a
    armar en el orden de los techos. → una ciudad nueva; no muta la entrada."""
    v = ciudad["vertices"]
    vertices, techos = [], []
    for k, techo in enumerate(ciudad["techos"]):
        i, n = techo[:2]
        if k in nuevas:
            puntos = [c for x, y in list(nuevas[k].exterior.coords)[:-1] for c in (round(x, 3), round(y, 3))]
        else:
            puntos = v[2 * i:2 * (i + n)]
        techos.append([len(vertices) // 2, len(puntos) // 2, *techo[2:]])
        vertices.extend(puntos)
    return {**ciudad, "vertices": vertices, "techos": techos}


PASADAS_ALINEAR = 2   # la segunda corrige las que la primera dejó fuera al correr la recta (T33j.5j)


def alinear_1772(ciudad, tramos, hitos, red72, verificadas, metro):
    """La ciudad final con las fachadas de las casas de la reconstrucción que están a la vista en 1772 sobre la recta de
    su frente (fachadas.alinear_casas, T33j.5f): el último paso de la alineación, sobre las casas mismas. Ningún relleno
    entra a los corredores de calle de la fase 3 (las calles de 1772 y las verificadas) ni cruza la planta de un hito."""
    from shapely.geometry import LineString
    from cierre_fase3 import ANCHO_INFERIDO_M, casas_de_epoca, corredores
    from cierre_fase4 import visibles
    from cierre_fase5 import plantas_en_pie
    import fachadas
    casas = visibles(casas_de_epoca(ciudad), hitos)
    n = len(ciudad.get("antes", []))
    movibles = {k for k, _ in casas if k < n and ciudad["antes"][k] and ciudad["junta"][k] >= 0}
    vedado = [c["poligono"] for c in corredores(red72, metro=metro)] + \
        [LineString(t["anclajes"]).buffer(ANCHO_INFERIDO_M / 2 / metro, cap_style="flat") for t in verificadas]
    nuevas = {}
    # una saliente que se ajusta corre la recta de sus vecinas: la segunda pasada mide sobre las huellas ya ajustadas
    for _ in range(PASADAS_ALINEAR):
        otras = fachadas.alinear_casas([(k, nuevas.get(k, g)) for k, g in casas], tramos, metro, movibles,
                                       obstaculos=plantas_en_pie(hitos), vedado=vedado)
        if not otras:
            break
        nuevas.update(otras)
    print(f"casas de 1772 ajustadas a la recta de su frente: {len(nuevas)}")
    return con_huellas(ciudad, nuevas)


def cerrar_aberturas_1772(ciudad, tramos, hitos, red72, verificadas, edificado, metro):
    """La ciudad final con las aberturas indebidas de los frentes de 1772 cerradas (accesos.cerrar_aberturas, T33j.7c):
    lo edificado del original que no cubre ninguna casa junto a un hueco del frente se le suma a la casa vecina de la
    reconstrucción, sin entrar en los corredores de calle ni en las plantas de los hitos. → una ciudad nueva."""
    from shapely.geometry import LineString
    from accesos import cerrar_aberturas
    from cierre_fase3 import ANCHO_INFERIDO_M, casas_de_epoca, corredores
    from cierre_fase4 import visibles
    from cierre_fase5 import plantas_en_pie
    casas = visibles(casas_de_epoca(ciudad), hitos)
    n = len(ciudad.get("antes", []))
    movibles = {k for k, _ in casas if k < n and ciudad["antes"][k] and ciudad["junta"][k] >= 0}
    vedado = [c["poligono"] for c in corredores(red72, metro=metro)] + \
        [LineString(t["anclajes"]).buffer(ANCHO_INFERIDO_M / 2 / metro, cap_style="flat") for t in verificadas]
    frentes = {m[0]: (m[3], m[4]) for m in ciudad.get("marcos", [])}
    nuevas = cerrar_aberturas(casas, tramos, metro, movibles, edificado, vedado=vedado, obstaculos=plantas_en_pie(hitos),
                              frentes=frentes)
    print(f"casas de 1772 que cierran una abertura del frente: {len(nuevas)}")
    if not nuevas:
        return ciudad
    # la casa que crece conserva la dirección de su marco (el frente sigue en su calle: el cierre corre a lo largo de la
    # fachada) pero pierde sus alas, que eran de la casa sin el hueco: el visor la ajusta a su huella en ese marco
    return {**con_huellas(ciudad, nuevas),
            "marcos": [[*m[:10], 0] if m[0] in nuevas else m for m in ciudad.get("marcos", [])]}


def sin_solapes_residuales(ciudad, hitos, metro):
    """La ciudad sin los solapes residuales entre casas de 1772 a la vista (T33j.6j, decisión del responsable del
    23-11-2026): dos huellas que se pisan, aunque sea menos que el umbral de la fase 5 (0,01 m²), cruzan sus techos.
    El área común se le resta a la más grande de las dos que se pueda tocar (de la reconstrucción); las de 1936 y de
    1578 no se tocan. La huella sigue siendo un polígono válido sin huecos. → una ciudad nueva; no muta la entrada."""
    import shapely
    from shapely.geometry import Polygon
    from shapely.strtree import STRtree
    from cierre_fase3 import casas_de_epoca
    from cierre_fase4 import visibles
    casas = visibles(casas_de_epoca(ciudad), hitos)
    n = len(ciudad.get("antes", []))
    movibles = {k for k, _ in casas if k < n and ciudad["antes"][k] and ciudad["junta"][k] >= 0}
    huellas = dict(casas)
    orden = [k for k, _ in casas]
    arbol = STRtree([g for _, g in casas])
    nuevas = {}
    for i, k in enumerate(orden):
        for j in arbol.query(huellas[k]):
            otra = orden[j]
            if otra <= k:
                continue
            a, b = nuevas.get(k, huellas[k]), nuevas.get(otra, huellas[otra])
            comun = a.intersection(b)
            if comun.area <= 0:
                continue
            candidatas = [t for t in (k, otra) if t in movibles]
            if not candidatas:
                continue
            cede = max(candidatas, key=lambda t: nuevas.get(t, huellas[t]).area)
            otra_g = b if cede == k else a
            resto = nuevas.get(cede, huellas[cede]).difference(otra_g)
            partes = [q for q in getattr(resto, "geoms", [resto]) if q.geom_type == "Polygon" and not q.is_empty]
            if len(partes) != 1:
                continue   # un solape que cruza la casa entera la partiría: ese corte no se hace (revisión de #150)
            mayor = shapely.set_precision(Polygon(partes[0].exterior), 1e-3)
            if mayor.geom_type == "Polygon" and mayor.is_valid and not mayor.interiors and mayor.area > 0.5 * huellas[cede].area:
                nuevas[cede] = mayor
    print(f"casas de 1772 sin su solape residual con la vecina: {len(nuevas)}")
    return con_huellas(ciudad, nuevas) if nuevas else ciudad


VUELO_MAXIMO_M = 0.8   # el alero más largo del visor (src/techos.js y src/alas.js: 0,5 + 0,3 · azar)
SIN_TOPE = 255         # en "vuelos", un byte por techo: centímetros que puede volar su alero; esto, sin tope


def vuelos_1772(ciudad, hitos, red72, metro):
    """La ciudad con "vuelos" (T33j.6f, decisión del responsable del 22-11-2026): por techo, los centímetros que puede
    volar el alero de una casa de 1772 sin entrar en el núcleo de la calzada de las calles de 1772 (la distancia de
    su huella al núcleo: todo el alero queda a menos de su vuelo de la huella), o SIN_TOPE si su alero más largo no
    llega. El visor (src/ciudad.js) lo respeta: en las calles angostas el alero es más corto. No toca fachadas ni
    ocupación. → una ciudad nueva; no muta la entrada."""
    from shapely.ops import unary_union
    from shapely.strtree import STRtree
    from cierre_fase3 import casas_de_epoca, corredores
    from cierre_fase4 import visibles
    vuelos = [SIN_TOPE] * len(ciudad["techos"])
    nucleos = [c["poligono"] for c in corredores(red72, metro=metro)]
    if nucleos:
        arbol = STRtree(nucleos)
        cerca = VUELO_MAXIMO_M / metro
        for k, huella in visibles(casas_de_epoca(ciudad), hitos):
            vecinos = [nucleos[j] for j in arbol.query(huella.buffer(cerca))]
            if not vecinos:
                continue
            distancia_m = huella.distance(unary_union(vecinos)) * metro
            if distancia_m < VUELO_MAXIMO_M:
                vuelos[k] = int(distancia_m * 100 + 1e-6)   # hacia abajo: el alero no llega al núcleo
    print(f"casas de 1772 con el alero topado por la calzada: {sum(v < SIN_TOPE for v in vuelos)}")
    return {**ciudad, "vuelos": vuelos}


def dar_acceso_1772(ciudad, hitos, metro):
    """La ciudad final sin casas de la reconstrucción encerradas en 1772 (accesos.lotes_encerrados, T33j.5h): cada lote
    sin borde hacia la calle se une a su vecina de la misma junta y vida, que pierde su marco (el visor la techa por su
    huella: sus alas eran de la casa sin el lote), y su techo se quita. → una ciudad nueva; no muta la entrada."""
    from accesos import lotes_encerrados
    from cierre_fase3 import casas_de_epoca
    from cierre_fase4 import visibles
    casas = visibles(casas_de_epoca(ciudad), hitos)
    n = len(ciudad.get("antes", []))
    movibles = {k for k, _ in casas if k < n and ciudad["antes"][k] and ciudad["junta"][k] >= 0}
    # la huella unida tiene que seguir a la vista: dos casas que pisan poco la zona de un hito pueden pisarla juntas
    nuevas, quitar = lotes_encerrados(casas, metro, movibles, ciudad["junta"], ciudad["vida"],
                                      admite=lambda huella: bool(visibles([(0, huella)], hitos)))
    print(f"lotes de 1772 sin acceso unidos a su vecina: {len(quitar)}")
    if not quitar:
        return ciudad
    con_lotes = con_huellas(ciudad, nuevas)
    con_lotes["marcos"] = [m for m in ciudad.get("marcos", []) if m[0] not in nuevas]
    salida, vida = sin_techos(con_lotes, ciudad["vida"], quitar)
    return {**salida, "vida": vida}


def relevos(huellas36, vida36, quitar):
    """(huellas, nace) de las casas de 1936 que quedan, con su nacimiento final (vida_de_1936): las que
    pueden pasarle la posta a una de 1578. Un techo quitado no reemplaza nada, y un edificio público no
    reemplaza antes de existir."""
    quedan = [k for k in range(len(huellas36)) if k not in quitar]
    return [huellas36[k] for k in quedan], np.array([vida36[k][0] for k in quedan], int)


def sin_techos(ciudad, vida, quitar):
    """(ciudad, vida) sin los techos de `quitar`: los vértices, los marcos y las listas por techo se corren.
    No toca los originales."""
    quedan = [k for k in range(len(ciudad["techos"])) if k not in quitar]
    nuevo = {k: j for j, k in enumerate(quedan)}
    v = ciudad["vertices"]
    vertices, techos = [], []
    for k in quedan:
        i, cuantos, *resto = ciudad["techos"][k]
        techos.append([len(vertices) // 2, cuantos, *resto])
        vertices.extend(v[2 * i:2 * (i + cuantos)])
    salida = {**ciudad, "vertices": vertices, "techos": techos}
    for clave in ("esquinas", "cuadras", "cede", "junta", "antes", "calzada72", "tapada72"):
        if clave in ciudad:
            salida[clave] = [ciudad[clave][k] for k in quedan if k < len(ciudad[clave])]   # las de 1578 no las traen
    if "cede" in ciudad:
        salida["cede"] = [nuevo.get(c, -1) if c >= 0 else -1 for c in salida["cede"]]
    if "marcos" in ciudad:
        salida["marcos"] = [[nuevo[m[0]], *m[1:]] for m in ciudad["marcos"] if m[0] in nuevo]
    return salida, [list(vida[k]) for k in quedan]


def casas_por_epoca(vida, cuantas=CUANTAS):
    return [sum(1 for n, m in vida if n <= e and (m == 0 or m > e)) for e in range(cuantas)]


def unir(ciudad_a, vida_a, ciudad_b, vida_b):
    """Techos de b agregados a los de a (índices de vértices corridos) y la vida de los dos. Si alguna
    trae "esquinas" (una por techo, tools/geo/vectorizar.py), se unen también; la que no, va en ceros."""
    corrimiento = len(ciudad_a["vertices"]) // 2
    techos_b = [[t[0] + corrimiento, *t[1:]] for t in ciudad_b["techos"]]
    union = {**ciudad_a, "vertices": list(ciudad_a["vertices"]) + list(ciudad_b["vertices"]),
             "techos": list(ciudad_a["techos"]) + techos_b, "vida": list(vida_a) + list(vida_b)}
    if "esquinas" in ciudad_a or "esquinas" in ciudad_b:
        union["esquinas"] = [q for c in (ciudad_a, ciudad_b) for q in c.get("esquinas", [0] * len(c["techos"]))]
    return union


def metadatos(epoca, ficha, casas):
    """Entrada de crece.json (specs/02) para una época, con los datos de la ficha del plano."""
    salida = {"año": epoca["año"], "plano": epoca["plano"], "titulo": ficha["titulo"],
              "autor": ficha.get("autor"), "fuente": f"{ficha['institucion']} · {ficha['url_fuente']}",
              "licencia": ficha.get("licencia") or SIN_LICENCIA, "corto": epoca["corto"]}
    if epoca.get("obras"):
        salida["obras"] = epoca["obras"]
    return {**salida, "casas": casas}


def etapas_por_punto(construidas):
    """Etapa desde la cual cada punto está edificado en esa época y en todas las siguientes."""
    etapa = np.full(construidas[0].shape, NUNCA, np.uint8)
    seguido = np.ones(construidas[0].shape, bool)
    for e in range(len(construidas) - 1, -1, -1):
        seguido &= construidas[e]
        etapa[seguido] = e
    return etapa


def reducir_etapas(etapa, factor):
    """Reduce un raster de etapas: cada celda toma la primera etapa que cubre ≥ la mitad.

    Las celdas van desde la esquina noroeste; la última columna y la última fila pueden ser
    parciales (cuentan solo sus píxeles) y se conservan, así el raster cubre todo el mosaico.
    """
    filas, columnas = -(-etapa.shape[0] // factor), -(-etapa.shape[1] // factor)
    relleno = np.full((filas * factor, columnas * factor), NUNCA, np.uint8)
    relleno[:etapa.shape[0], :etapa.shape[1]] = etapa
    validos = np.zeros(relleno.shape, bool)
    validos[:etapa.shape[0], :etapa.shape[1]] = True
    bloques = relleno.reshape(filas, factor, columnas, factor)
    cuantos = validos.reshape(filas, factor, columnas, factor).sum(axis=(1, 3))
    salida = np.full((filas, columnas), NUNCA, np.uint8)
    for e in range(CUANTAS - 1, -1, -1):
        salida[(bloques <= e).sum(axis=(1, 3)) >= 0.5 * cuantos] = e
    return salida


# --- el valle: lo urbanizado y el monte ----------------------------------------------------------

def urbanizados(solares, construido, casas36, forma, escala, m_px, cfg):
    """Lo urbanizado de cada época: 1578 (la envolvente de las 25 manzanas), los planos calzados y 1936."""
    medidas = (m_px, cfg["cierre_m"], cfg["holgura_m"], cfg["hueco_m2"])
    de_1578 = valle.urbanizado(valle.envolvente(solares, forma, escala), m_px, 0, cfg["holgura_m"], 0)
    return [de_1578, *(valle.urbanizado(m, *medidas) for m in construido), valle.urbanizado(casas36, *medidas)]


def canales_del_valle(urbanos, etapa_r, clases, factor_clases, celda_m, semilla, altura):
    """(G, B) de crece.png: etapa desde la que cada celda es ciudad, y el monte (uint8).

    etapa_r: las etapas de lo edificado ya reducidas (canal R); clases: la segmentación de 1936, a
    factor_clases píxeles por celda de crece.png.
    """
    paso = int(round(urbanos[0].shape[1] / etapa_r.shape[1]))
    etapa_g = np.minimum(reducir_etapas(valle.urbanizado_desde(urbanos), paso), etapa_r)
    agua = valle.fraccion(clases == AGUA, factor_clases) >= AGUA_MINIMA
    fuera = valle.fraccion(np.isin(clases, (MARGEN, DESCONOCIDO)), factor_clases) > 0.5
    return etapa_g, valle.monte(agua, celda_m, semilla, altura=altura, fuera=fuera)


# --- programa ----------------------------------------------------------------------------------

def alinear(img, x0, y0, escala):
    """Rellena un recorte con origen (x0, y0) hasta los bordes de la grilla de paso escala.

    Devuelve el recorte rellenado y su origen alineado. El relleno repite el borde; en un RGBA,
    el alfa del relleno es 0 (fuera del plano).
    """
    izq, arr = x0 % escala, y0 % escala
    alto, ancho = img.shape[:2]
    der, aba = -(izq + ancho) % escala, -(arr + alto) % escala
    salida = cv2.copyMakeBorder(img, arr, aba, izq, der, cv2.BORDER_REPLICATE)
    if img.ndim == 3 and img.shape[2] == 4:
        salida[..., 3] = 0
        salida[arr:arr + alto, izq:izq + ancho, 3] = img[..., 3]
    return salida, x0 - izq, y0 - arr


def _reducir(img, escala):
    """Promedio por bloques de escala × escala desde (0, 0); el borde parcial se rellena."""
    img, _, _ = alinear(img, 0, 0, escala)
    alto, ancho = img.shape[:2]
    return cv2.resize(img, (ancho // escala, alto // escala), interpolation=cv2.INTER_AREA)


def reducir_recorte(img, x0, y0, escala):
    """Reduce un recorte con origen (x0, y0) en la grilla global: (reducido, (x0, y0) en celdas)."""
    alineado, ax0, ay0 = alinear(img, x0, y0, escala)
    return _reducir(alineado, escala), (ax0 // escala, ay0 // escala)


def escribir_imagen(ruta, img, params=()):
    """cv2.imwrite que falla (OSError con la ruta) si no pudo escribir."""
    if not cv2.imwrite(str(ruta), img, list(params)):
        raise OSError(f"no se pudo escribir la imagen {ruta}")


def construido_de_epoca(raiz, epoca, forma, escala, metro):
    """Máscara de lo edificado de un plano calzado, en la grilla reducida del mosaico."""
    import tifffile
    carpeta = raiz / "fuentes/derivados" / str(epoca["año"])
    meta = json.loads((carpeta / "calzado.json").read_text())
    x0, y0 = (int(c) for c in meta["recorte"][:2])
    rgba, (cx0, cy0) = reducir_recorte(tifffile.imread(carpeta / "calzado.tif"), x0, y0, escala)
    m_px = metro * escala
    parcial = edificado(rgba, epoca["perfil"], epoca["cierre_m"] / m_px, epoca["area_minima_m2"] / m_px ** 2,
                        epoca.get("apertura_m", 0) / m_px, epoca.get("ancho_minimo_m", 0) / m_px)
    mascara = en_marco(parcial, (cx0, cy0, cx0 + parcial.shape[1], cy0 + parcial.shape[0]), forma)
    if epoca.get("holgura_m"):
        mascara = cv2.dilate(mascara.astype(np.uint8), _disco(epoca["holgura_m"] / m_px)) > 0
    return mascara


def guardar_lamina(ruta, vista, mascara, color=(0, 0, 255)):
    """La máscara de una época en color sobre la vista de 1936 (BGR, misma forma)."""
    capa = vista.copy()
    capa[mascara] = color
    escribir_imagen(ruta, cv2.addWeighted(vista, 0.55, capa, 0.45, 0), [cv2.IMWRITE_JPEG_QUALITY, 85])


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--raiz", type=Path, default=Path.cwd(),
                    help="checkout con fuentes/ y public/ (por omisión, el directorio actual)")
    a = ap.parse_args()
    raiz = a.raiz.resolve()
    config = json.loads((AQUI / "epocas" / "epocas.json").read_text())
    plaza = json.loads((AQUI / "gcp" / "plaza-1936.json").read_text())
    metro = json.loads((raiz / "fuentes/derivados/1936/mosaico.json").read_text())["metro"]
    escala = config["escala"]
    clases = cv2.imread(str(raiz / plaza["clases"]), cv2.IMREAD_UNCHANGED)
    forma = (-(-clases.shape[0] // escala), -(-clases.shape[1] // escala))  # el borde parcial cuenta
    ciudad36 = json.loads((raiz / "fuentes/derivados/1936/ciudad-1936.json").read_text())
    ciudad78 = json.loads((raiz / "fuentes/derivados/1578/ciudad-1578.json").read_text())
    salida = raiz / "fuentes/derivados/epocas"
    salida.mkdir(parents=True, exist_ok=True)

    epocas = config["epocas"]
    construido = [construido_de_epoca(raiz, e, forma, escala, metro) for e in epocas[1:ULTIMA]]
    huellas36 = huellas(ciudad36, forma, escala)
    nace36 = nace(fracciones(huellas36, construido), primera=1, umbral=config["umbral"])
    apertura = apertura_de_juntas(ciudad36.get("juntas", []), construido, escala, ciudad36.get("juntas_minimo"),
                                  ciudad36.get("juntas_hasta"))
    vida36, quitar = vida_de_1936(nace36, ciudad36, apertura)
    calles72 = raiz / "tools/geo/referencias/1772-calles-1936.json"
    if calles72.exists():
        vida36, quitar, sin_abrir = abrir_calles_de_1772(ciudad36, vida36, quitar,
                                                          json.loads(calles72.read_text())["tramos"], metro)
        print(f"calles de 1772 que siguen bloqueadas: {len(sin_abrir)} {sin_abrir[:10]}")
    vida78 = vida_de_1578(ciudad78, *relevos(huellas36, vida36, quitar), construido, escala)
    ciudad = unir(*sin_techos(ciudad36, vida36, quitar), ciudad78, vida78)
    if calles72.exists():
        # la ciudad final suma las casas de 1578: ninguna puede volver a cerrar una calle de 1772
        from cuadras_historicas import ejes_de_calzada
        red72 = json.loads((raiz / "tools/geo/referencias/1772-red.json").read_text())
        verificadas = json.loads((raiz / "tools/geo/calles-historicas.json").read_text())["tramos"]
        conocidas = [{"tramo": f"calzada-{k}", "puntos": [list(p) for p in e.coords], "banda_m": 0, "medible": True,
                      "siempre": True} for k, e in enumerate(ejes_de_calzada(red72, verificadas))]
        desde = len(ciudad["techos"]) - len(ciudad78["techos"])   # las de 1578 van al final; quitar_f solo toca esas
        vida_f, quitar_f, sin_abrir = abrir_calles_de_1772(ciudad, ciudad["vida"], set(),
                                                            json.loads(calles72.read_text())["tramos"] + conocidas, metro,
                                                            desde=desde)
        ciudad, vida_f = sin_techos(ciudad, vida_f, quitar_f)
        ciudad["vida"] = ceder_a_1772(ciudad, vida_f, desde, metro)
        import subprocess
        hitos = json.loads(subprocess.run(["node", str(raiz / "tools" / "hitos-planta.mjs")], check=True, capture_output=True,
                                          text=True, cwd=raiz).stdout)
        ciudad["vida"] = ceder_frentes_a_1772(ciudad, json.loads(calles72.read_text())["tramos"], hitos, metro, desde)
        ciudad = alinear_1772(ciudad, json.loads(calles72.read_text())["tramos"], hitos, red72, verificadas, metro)
        ciudad = dar_acceso_1772(ciudad, hitos, metro)
        from cuadras_historicas import cargar_edificado_de_archivos
        unidades72 = json.loads((raiz / "tools/geo/referencias/1772-unidades.json").read_text())["unidades"]
        edificado = [p for e in cargar_edificado_de_archivos(raiz / "specs/auditoria-1772", red72, unidades72)
                     for p in e["poligonos"]]
        ciudad = cerrar_aberturas_1772(ciudad, json.loads(calles72.read_text())["tramos"], hitos, red72, verificadas,
                                       edificado, metro)
        ciudad = sin_solapes_residuales(ciudad, hitos, metro)
        ciudad = vuelos_1772(ciudad, hitos, red72, metro)
        print(f"calles de 1772 bloqueadas en la ciudad final: {len(sin_abrir)} {sin_abrir[:10]}")
    (salida / "ciudad-epocas.json").write_text(json.dumps(ciudad))

    casas = casas_por_epoca(ciudad["vida"])
    fichas = [json.loads((raiz / "fuentes/mapas" / e["plano"] / "ficha.json").read_text()) for e in epocas]
    crece = {"celda_m": metro * config["escala_crece"],  # crece.png: celdas desde la esquina noroeste
             "epocas": [metadatos(e, f, c) for e, f, c in zip(epocas, fichas, casas)]}
    texto = json.dumps(crece, ensure_ascii=False, indent=1) + "\n"
    (salida / "crece.json").write_text(texto)
    (raiz / "public/datos/crece.json").write_text(texto)

    m1578 = mascara_de_solares(ciudad78["solares"], forma, escala)
    m1936 = _reducir(np.isin(clases, DE_LA_MANZANA).astype(np.uint8), escala) > 0
    construidas = [m1578, *construido, m1936]
    etapa_r = reducir_etapas(etapas_por_punto(construidas), config["escala_crece"] // escala)
    casas36 = _reducir(np.isin(clases, CASAS_1936).astype(np.uint8), escala) > 0
    urbanos = urbanizados(ciudad78["solares"], construido, casas36, forma, escala, metro * escala, config["urbanizado"])
    altura = valle.leer_relieve(raiz / "public/datos/relieve.bin", etapa_r.shape)  # sin relieve: monte sin cuestas
    etapa_g, monte = canales_del_valle(urbanos, etapa_r, clases, config["escala_crece"], crece["celda_m"],
                                       config["monte"]["semilla"], altura)
    png = np.dstack([monte, desde_cuando(etapa_g), desde_cuando(etapa_r)])  # BGR
    escribir_imagen(salida / "crece.png", png)
    (raiz / "public/plano").mkdir(parents=True, exist_ok=True)
    escribir_imagen(raiz / "public/plano/crece.png", png)

    import tifffile
    vista = cv2.cvtColor(_reducir(tifffile.imread(raiz / plaza["mosaico"]), 4), cv2.COLOR_RGB2BGR)
    for e, m in zip(epocas, construidas):
        guardar_lamina(salida / f"qa-{e['año']}.jpg", vista, _reducir(m.astype(np.uint8), 4 // escala) > 0)
    for e, u in zip(epocas, urbanos):
        guardar_lamina(salida / f"qa-urbano-{e['año']}.jpg", vista, _reducir(u.astype(np.uint8), 4 // escala) > 0,
                       color=(255, 128, 0))
    for e, c, u in zip(epocas, casas, urbanos):
        print(f"{e['año']}: {c} casas · {u.sum() * (metro * escala) ** 2 / 1e6:.2f} km² urbanizados")
    print(f"→ {salida}")


if __name__ == "__main__":
    main()
