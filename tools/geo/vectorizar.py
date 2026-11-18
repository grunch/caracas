"""Vectorizador: de la imagen de clases (tools/geo/segmentar.py) a los techos de la ciudad.

Cada manzana se divide en lotes sembrando puntos cada FRENTE_M metros a lo largo de su borde
y asignando cada píxel a la semilla más cercana (los lotes salen angostos al frente y largos
hacia el fondo, como los solares partidos). Lo edificado de cada lote es una casa; los
edificios públicos (rayados en el plano) van enteros. Salida: vértices en píxeles del plano y
techos [primer vértice, cuántos, pisos, estilo, semilla], el formato de src/ciudad.js.

Uso: vectorizar.py <clases.png> <salida.json> --escala <m/px> --plaza <px,py>
"""
import argparse
import json
import math

import cv2
import numpy as np
from shapely.geometry import Polygon

CLASE = {'desconocido': 0, 'calle': 1, 'patio': 2, 'edificado': 3, 'publico': 4,
         'verde': 5, 'cultivo': 6, 'agua': 7, 'cerro': 8, 'margen': 9}
ESTILO_COLONIAL = 0
ESTILO_PUBLICO = 9

FRENTE_M = 12.0          # frente típico de una casa del centro
AREA_MINIMA_M2 = 6.0     # menos que esto es ruido de la segmentación
TOLERANCIA_M = 0.35      # simplificación de los contornos
DE_LA_MANZANA = (CLASE['edificado'], CLASE['publico'], CLASE['patio'], CLASE['verde'])


def semilla_de(x, y):
    return (int(x * 73856093) ^ int(y * 19349663)) & 0xFFFF


def pisos_de(semilla, distancia_m):
    """Casi todo es de un piso; los de dos se juntan en el centro."""
    azar = ((semilla * 2654435761) & 0xFFFFFFFF) / 0xFFFFFFFF
    prob_dos = 0.35 if distancia_m < 500 else 0.15 if distancia_m < 1200 else 0.04
    return 2 if azar < prob_dos else 1


def poligono_de(mascara, desplazamiento, tolerancia_px):
    """Contorno de una máscara binaria como polígono en coordenadas continuas (bordes de píxel)."""
    contornos, _ = cv2.findContours(mascara.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contornos:
        return None
    contorno = max(contornos, key=cv2.contourArea)[:, 0, :].astype(float) + 0.5 + np.asarray(desplazamiento, float)
    if len(contorno) < 3:
        contorno = np.array([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) + contorno[0]
        figura = Polygon(contorno)
    else:
        figura = Polygon(contorno).buffer(0.5, join_style=2)
    figura = figura.simplify(tolerancia_px)
    if figura.geom_type == 'MultiPolygon':
        figura = max(figura.geoms, key=lambda g: g.area)
    return figura if figura.is_valid and not figura.is_empty else None


def lotes_de_manzana(manzana, frente_px):
    """Etiqueta cada píxel de la manzana con el lote (semilla de borde más cercana)."""
    contornos, _ = cv2.findContours(manzana.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    borde = max(contornos, key=len)[:, 0, :]
    paso = max(1, int(round(frente_px)))
    semillas = borde[::paso]
    sin_semilla = np.ones(manzana.shape, np.uint8)
    sin_semilla[semillas[:, 1], semillas[:, 0]] = 0
    _, etiquetas = cv2.distanceTransformWithLabels(sin_semilla, cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
    return np.where(manzana, etiquetas, 0)


def agregar_techo(salida, figura, pisos, estilo, semilla):
    puntos = list(figura.exterior.coords)[:-1]
    salida['techos'].append([len(salida['vertices']) // 2, len(puntos), pisos, estilo, semilla])
    for x, y in puntos:
        salida['vertices'].extend((round(x, 2), round(y, 2)))


def techos_publicos(clases, salida, area_min_px, tolerancia_px, metro):
    n, comp, stats, _ = cv2.connectedComponentsWithStats((clases == CLASE['publico']).astype(np.uint8), connectivity=8)
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] < area_min_px:
            continue
        x, y, w, h = stats[k, :4]
        figura = poligono_de(comp[y:y + h, x:x + w] == k, (x, y), tolerancia_px)
        if figura is not None:
            pisos = 3 if figura.area * metro ** 2 > 2000 else 2
            agregar_techo(salida, figura, pisos, ESTILO_PUBLICO, semilla_de(figura.centroid.x, figura.centroid.y))


def techos_de_manzana(clases, manzana, origen, salida, area_min_px, tolerancia_px, distancia_m, metro):
    x, y = origen
    edificado = manzana & (clases == CLASE['edificado'])
    if edificado.sum() < area_min_px:
        return
    salida['manzanas'] += 1
    lotes = lotes_de_manzana(manzana, FRENTE_M / metro)
    for lote in np.unique(lotes[edificado]):
        m, partes, st, _ = cv2.connectedComponentsWithStats((edificado & (lotes == lote)).astype(np.uint8), connectivity=8)
        for p in range(1, m):
            if st[p, cv2.CC_STAT_AREA] < area_min_px:
                continue
            px, py, pw, ph = st[p, :4]
            figura = poligono_de(partes[py:py + ph, px:px + pw] == p, (x + px, y + py), tolerancia_px)
            if figura is None:
                continue
            semilla = semilla_de(figura.centroid.x, figura.centroid.y)
            agregar_techo(salida, figura, pisos_de(semilla, distancia_m(figura)), ESTILO_COLONIAL, semilla)


def vectorizar(clases, metro, plaza):
    clases = np.asarray(clases)
    area_min_px = AREA_MINIMA_M2 / metro ** 2
    tolerancia_px = TOLERANCIA_M / metro
    salida = {'vertices': [], 'techos': [], 'manzanas': 0}

    def distancia_m(f):
        return math.hypot(f.centroid.x - plaza[0], f.centroid.y - plaza[1]) * metro

    techos_publicos(clases, salida, area_min_px, tolerancia_px, metro)
    manzanas = np.isin(clases, DE_LA_MANZANA).astype(np.uint8)
    n, comp, stats, _ = cv2.connectedComponentsWithStats(manzanas, connectivity=4)
    for k in range(1, n):
        x, y, w, h = stats[k, :4]
        techos_de_manzana(clases[y:y + h, x:x + w], comp[y:y + h, x:x + w] == k, (x, y),
                          salida, area_min_px, tolerancia_px, distancia_m, metro)
    return salida


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('clases')
    ap.add_argument('salida')
    ap.add_argument('--escala', type=float, required=True, help='metros por píxel')
    ap.add_argument('--plaza', required=True, help='px,py de la Plaza Bolívar')
    a = ap.parse_args()
    clases = cv2.imread(a.clases, cv2.IMREAD_UNCHANGED)
    if clases is None or clases.ndim != 2:
        raise SystemExit(f'{a.clases}: se esperaba una imagen de clases de un canal')
    plaza = tuple(float(v) for v in a.plaza.split(','))
    res = vectorizar(clases, a.escala, plaza)
    with open(a.salida, 'w') as f:
        json.dump(res, f)
    print(f"{res['manzanas']} manzanas, {len(res['techos'])} techos → {a.salida}")


if __name__ == '__main__':
    main()
