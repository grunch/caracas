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
CASAS_1936 = (EDIFICADO, EDIFICIO_PUBLICO, PATIO)   # lo que urbaniza en 1936 (los árboles sueltos no)
AGUA_MINIMA = 0.15          # parte de una celda de crece.png con agua para que cuente como agua
CONSTRUIDOS_1578 = ("casa", "iglesia", "cabildo", "convento")
SIN_LICENCIA = "sin licencia declarada (derechos por verificar)"
PISADA_MINIMA = 0.3         # fracción de una casa de 1578 cubierta por una de 1936 para pasarle la posta


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


def pisadas(huella78, huellas36, cajas36, ancho):
    """Índices de las casas de 1936 que por sí solas cubren ≥ PISADA_MINIMA de la huella dada."""
    f, c = huella78
    if not f.size:
        return np.array([], int)
    cerca = np.flatnonzero((cajas36[:, 0] <= f.max()) & (cajas36[:, 1] >= f.min())
                           & (cajas36[:, 2] <= c.max()) & (cajas36[:, 3] >= c.min()))
    propia = f.astype(np.int64) * ancho + c
    cubre = np.array([np.isin(huellas36[j][0].astype(np.int64) * ancho + huellas36[j][1], propia).sum()
                      for j in cerca], int)
    return cerca[cubre >= PISADA_MINIMA * f.size]


def vida_de_1578(ciudad78, huellas36, nace36, construido, escala):
    """[[0, muere], …] de las casas de 1578.

    construido: máscaras de las épocas 1..4. Si casas de 1936 la pisan (cada una por sí sola
    ≥ PISADA_MINIMA de su huella), muere cuando nace la primera de ellas; si no, en la primera
    época en que su lugar no está edificado (< la mitad) o, si sigue edificado hasta 1911, en 1936.
    """
    forma = construido[0].shape
    huellas78 = huellas(ciudad78, forma, escala)
    sin_pisar = muere(fracciones(huellas78, construido), nace=0, umbral=0.5)
    cajas36 = _cajas(huellas36)
    vida = []
    for k, h in enumerate(huellas78):
        pisan = pisadas(h, huellas36, cajas36, forma[1])
        vida.append([0, max(1, int(np.min(nace36[pisan]))) if pisan.size else int(sin_pisar[k])])
    return vida


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
    vida78 = vida_de_1578(ciudad78, huellas36, nace36, construido, escala)
    ciudad = unir(ciudad36, [[int(n), 0] for n in nace36], ciudad78, vida78)
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
