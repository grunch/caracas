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
   edificado cada punto, codificado como en specs/02), más láminas QA por época. crece.json va
   también a public/datos/ y crece.png a public/plano/.

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

from calce_correlacion import callejidad  # noqa: E402
from vectorizar import DE_LA_MANZANA  # noqa: E402

AQUI = Path(__file__).resolve().parent
NUNCA = 255                 # etapa de lo que nunca está edificado
CUANTAS = 6                 # épocas de la línea de tiempo
ULTIMA = CUANTAS - 1        # 1936
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
    """2·área/perímetro de una componente: cuán ancha es (una vía o un marco dan poco)."""
    x, y, w, h = stat[:4]
    sola = (etiquetas[y:y + h, x:x + w] == k).astype(np.uint8)
    contornos, _ = cv2.findContours(sola, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    perimetro = sum(cv2.arcLength(c, True) for c in contornos)
    return 2.0 * float(stat[cv2.CC_STAT_AREA]) / max(perimetro, 1.0)


def en_marco(parcial, recorte, forma):
    """Pone la máscara de un recorte [x0, y0, x1, y1) en una máscara de la forma completa."""
    salida = np.zeros(forma, bool)
    x0, y0, x1, y1 = recorte
    salida[y0:y1, x0:x1] = parcial[:y1 - y0, :x1 - x0]
    return salida


def _rellenar(forma, poligonos, escala, valores):
    """Pinta cada polígono (bordes de píxel, en px del mosaico) donde cae el centro del píxel."""
    lienzo = np.zeros(forma, np.int32)
    for p, v in zip(poligonos, valores):
        pts = np.asarray(p, float) / escala - 0.5
        filas, columnas = draw.polygon(pts[:, 1], pts[:, 0], shape=forma)
        lienzo[filas, columnas] = int(v)
    return lienzo


def mascara_de_solares(solares, forma, escala):
    """Solares construidos de 1578 (casa, iglesia, cabildo, convento) rasterizados."""
    construidos = [s["poligono"] for s in solares if s["estado"] in CONSTRUIDOS_1578]
    return _rellenar(forma, construidos, escala, [1] * len(construidos)) > 0


def poligonos(ciudad):
    v = np.asarray(ciudad["vertices"], float).reshape(-1, 2)
    return [v[i:i + n] for i, n, *_ in ciudad["techos"]]


def etiquetar_techos(ciudad, forma, escala):
    """Raster int32 con k + 1 en la huella del techo k (0 = sin techo)."""
    figuras = poligonos(ciudad)
    return _rellenar(forma, figuras, escala, range(1, len(figuras) + 1))


def fracciones(etiquetas, mascaras, cuantos):
    """(cuantos × len(mascaras)): parte de la huella de cada techo que cae en cada máscara."""
    total = np.bincount(etiquetas.ravel(), minlength=cuantos + 1)[1:].astype(float)
    columnas = [np.bincount(etiquetas[m], minlength=cuantos + 1)[1:] for m in mascaras]
    with np.errstate(divide="ignore", invalid="ignore"):
        return np.nan_to_num(np.stack(columnas, axis=1) / total[:, None])


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


def vida_de_1578(ciudad78, etiquetas36, nace36, construido, escala):
    """[[0, muere], …] de las casas de 1578.

    construido: máscaras de las épocas 1..4. Si una casa de 1936 la pisa (≥ PISADA_MINIMA),
    muere cuando esa nace; si no, en la primera época en que su lugar no está edificado.
    """
    etiquetas78 = etiquetar_techos(ciudad78, etiquetas36.shape, escala)
    n78 = len(ciudad78["techos"])
    fr = fracciones(etiquetas78, construido, n78)
    sin_pisar = muere(fr, nace=0, umbral=0.5)
    vida = []
    for k in range(n78):
        bajo = etiquetas36[etiquetas78 == k + 1]
        pisada = bajo[bajo > 0]
        if bajo.size and pisada.size / bajo.size >= PISADA_MINIMA:
            vida.append([0, max(1, int(np.min(nace36[pisada - 1])))])
        else:
            vida.append([0, int(sin_pisar[k])])
    return vida


def casas_por_epoca(vida, cuantas=CUANTAS):
    return [sum(1 for n, m in vida if n <= e and (m == 0 or m > e)) for e in range(cuantas)]


def unir(ciudad_a, vida_a, ciudad_b, vida_b):
    """Techos de b agregados a los de a (índices de vértices corridos) y la vida de los dos."""
    corrimiento = len(ciudad_a["vertices"]) // 2
    techos_b = [[t[0] + corrimiento, *t[1:]] for t in ciudad_b["techos"]]
    return {**ciudad_a, "vertices": list(ciudad_a["vertices"]) + list(ciudad_b["vertices"]),
            "techos": list(ciudad_a["techos"]) + techos_b, "vida": list(vida_a) + list(vida_b)}


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
    """Reduce un raster de etapas: cada celda toma la primera etapa que cubre ≥ la mitad."""
    alto, ancho = (etapa.shape[0] // factor) * factor, (etapa.shape[1] // factor) * factor
    bloques = etapa[:alto, :ancho].reshape(alto // factor, factor, ancho // factor, factor)
    salida = np.full((alto // factor, ancho // factor), NUNCA, np.uint8)
    for e in range(CUANTAS - 1, -1, -1):
        salida[(bloques <= e).mean(axis=(1, 3)) >= 0.5] = e
    return salida


# --- programa ----------------------------------------------------------------------------------

def _reducir(img, escala):
    alto, ancho = img.shape[:2]
    return cv2.resize(img, (ancho // escala, alto // escala), interpolation=cv2.INTER_AREA)


def construido_de_epoca(raiz, epoca, forma, escala, metro):
    """Máscara de lo edificado de un plano calzado, en la grilla reducida del mosaico."""
    import tifffile
    carpeta = raiz / "fuentes/derivados" / str(epoca["año"])
    meta = json.loads((carpeta / "calzado.json").read_text())
    rgba = _reducir(tifffile.imread(carpeta / "calzado.tif"), escala)
    m_px = metro * escala
    parcial = edificado(rgba, epoca["perfil"], epoca["cierre_m"] / m_px, epoca["area_minima_m2"] / m_px ** 2,
                        epoca.get("apertura_m", 0) / m_px, epoca.get("ancho_minimo_m", 0) / m_px)
    x0, y0, x1, y1 = (int(c) // escala for c in meta["recorte"])
    mascara = en_marco(parcial, (x0, y0, x0 + parcial.shape[1], y0 + parcial.shape[0]), forma)
    if epoca.get("holgura_m"):
        mascara = cv2.dilate(mascara.astype(np.uint8), _disco(epoca["holgura_m"] / m_px)) > 0
    return mascara


def guardar_lamina(ruta, vista, mascara, color=(0, 0, 255)):
    """La máscara de una época en color sobre la vista de 1936 (BGR, misma forma)."""
    capa = vista.copy()
    capa[mascara] = color
    cv2.imwrite(str(ruta), cv2.addWeighted(vista, 0.55, capa, 0.45, 0), [cv2.IMWRITE_JPEG_QUALITY, 85])


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
    forma = (clases.shape[0] // escala, clases.shape[1] // escala)
    ciudad36 = json.loads((raiz / "fuentes/derivados/1936/ciudad-1936.json").read_text())
    ciudad78 = json.loads((raiz / "fuentes/derivados/1578/ciudad-1578.json").read_text())
    salida = raiz / "fuentes/derivados/epocas"
    salida.mkdir(parents=True, exist_ok=True)

    epocas = config["epocas"]
    construido = [construido_de_epoca(raiz, e, forma, escala, metro) for e in epocas[1:ULTIMA]]
    etiquetas36 = etiquetar_techos(ciudad36, forma, escala)
    n36 = len(ciudad36["techos"])
    nace36 = nace(fracciones(etiquetas36, construido, n36), primera=1, umbral=config["umbral"])
    vida78 = vida_de_1578(ciudad78, etiquetas36, nace36, construido, escala)
    ciudad = unir(ciudad36, [[int(n), 0] for n in nace36], ciudad78, vida78)
    (salida / "ciudad-epocas.json").write_text(json.dumps(ciudad))

    casas = casas_por_epoca(ciudad["vida"])
    fichas = [json.loads((raiz / "fuentes/mapas" / e["plano"] / "ficha.json").read_text()) for e in epocas]
    crece = {"epocas": [metadatos(e, f, c) for e, f, c in zip(epocas, fichas, casas)]}
    texto = json.dumps(crece, ensure_ascii=False, indent=1) + "\n"
    (salida / "crece.json").write_text(texto)
    (raiz / "public/datos/crece.json").write_text(texto)

    m1578 = mascara_de_solares(ciudad78["solares"], forma, escala)
    m1936 = _reducir(np.isin(clases, DE_LA_MANZANA).astype(np.uint8), escala) > 0
    construidas = [m1578, *construido, m1936]
    r = desde_cuando(reducir_etapas(etapas_por_punto(construidas), config["escala_crece"] // escala))
    png = np.dstack([np.zeros_like(r), np.zeros_like(r), r])  # BGR: solo el canal R
    cv2.imwrite(str(salida / "crece.png"), png)
    (raiz / "public/plano").mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(raiz / "public/plano/crece.png"), png)

    import tifffile
    vista = cv2.cvtColor(_reducir(tifffile.imread(raiz / plaza["mosaico"]), 4), cv2.COLOR_RGB2BGR)
    for e, m in zip(epocas, construidas):
        guardar_lamina(salida / f"qa-{e['año']}.jpg", vista, _reducir(m.astype(np.uint8), 4 // escala) > 0)
    for e, c in zip(epocas, casas):
        print(f"{e['año']}: {c} casas")
    print(f"→ {salida}")


if __name__ == "__main__":
    main()
