#!/usr/bin/env python3
"""La ciudad de 1578 según el esquema de Juan de Pimentel, levantada sobre las manzanas de 1936.

El dibujo de Pimentel no se calza (es un esquema, no un plano): se lee a mano en
tools/geo/epocas/1578-pimentel.json (25 manzanas, 4 solares cada una, con su estado) y cada
manzana se ubica sobre la real de 1936 por su índice desde la Plaza Bolívar (el damero
colonial no cambió de orientación). Las esquinas reales salen de la máscara de calles de
1936: se predicen desde la plaza hacia afuera con el afín de las ya halladas y se ajustan al
cruce de calles más cercano (molde en cruz). Cada manzana (el cuadrilátero de sus cuatro
esquinas menos media calle de 32 pies) se parte en cuatro solares y en cada solar con "casa"
se levanta una casa de un piso sobre la calle (norte o sur), con el corral atrás.

Uso (desde el checkout con los datos): python tools/geo/epocas_1578.py
Salida: fuentes/derivados/1578/ciudad-1578.json (vértices y techos en px del mosaico, en el
formato del vectorizador, más los 100 solares con su estado) y qa-1578.jpg.
"""
import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

import cv2  # noqa: E402
import numpy as np  # noqa: E402
from shapely.geometry import Polygon  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

from vectorizar import CLASE, semilla_de  # noqa: E402

AQUI = Path(__file__).resolve().parent
ESTADOS = ("casa", "vacio", "iglesia", "cabildo", "convento", "plaza")
ESTILO_COLONIAL = 0
FONDO_CASA_M = 8.0        # fondo de la casa sobre la calle; el resto del solar es corral
RETIRO_M = 0.5            # separación entre casas vecinas
MEDIA_CALLE_M = 4.9       # calles de 32 pies castellanos (≈ 8,9 m)
CUADRANTES = ((0.0, 0.5, 0.0, 0.5), (0.5, 1.0, 0.0, 0.5),   # (s0, s1, t0, t1): noroeste, noreste,
              (0.0, 0.5, 0.5, 1.0), (0.5, 1.0, 0.5, 1.0))   # suroeste, sureste
BRAZO_RELATIVO = 0.45     # largo de cada brazo de la cruz, en fracciones de manzana
RADIO_RELATIVO = 0.3      # cuánto puede corregirse la esquina predicha, en fracciones de manzana
PUNTAJE_MINIMO = 0.3      # bajo esto, la esquina queda donde la predice el afín
ALCANCE = range(-2, 4)    # esquinas de las 25 manzanas: índices −2…3


def validar(datos):
    """Revisa que el esquema tenga 25 manzanas bien ubicadas con 4 solares de estados válidos."""
    manzanas = datos["manzanas"]
    if len(manzanas) != 25:
        raise ValueError(f"Pimentel dibuja 25 manzanas; hay {len(manzanas)}")
    vistas = set()
    for m in manzanas:
        esperada = [m["columna"] - 2, m["fila"] - 2]
        if m["manzana"] != esperada or tuple(esperada) in vistas:
            raise ValueError(f"manzana mal ubicada: fila {m['fila']}, columna {m['columna']} → {m['manzana']}")
        vistas.add(tuple(esperada))
        if len(m["solares"]) != 4:
            raise ValueError(f"la manzana {m['manzana']} no tiene 4 solares")
        for s in m["solares"]:
            if s not in ESTADOS:
                raise ValueError(f"estado desconocido en {m['manzana']}: {s!r}")


def contar(datos):
    conteo = {e: 0 for e in ESTADOS}
    for m in datos["manzanas"]:
        for s in m["solares"]:
            conteo[s] += 1
    return conteo


def afin_de_semillas(semillas):
    """Afín 2×3 índice (i, j) → px ajustado a las esquinas de la plaza."""
    a = np.array([[s["i"], s["j"], 1.0] for s in semillas])
    b = np.array([[s["px"], s["py"]] for s in semillas], float)
    return np.linalg.lstsq(a, b, rcond=None)[0].T


# --- esquinas reales de 1936 ------------------------------------------------------------------

def _molde_cruz(eje_u, eje_v, brazo, ancho):
    un = eje_u / np.linalg.norm(eje_u)
    vn = eje_v / np.linalg.norm(eje_v)
    h = int(np.ceil(brazo * 1.5))
    dy, dx = np.mgrid[-h:h + 1, -h:h + 1].astype(float)
    a, b = dx * un[0] + dy * un[1], dx * vn[0] + dy * vn[1]
    dentro = (np.abs(a) <= brazo) & (np.abs(b) <= brazo)
    cruz = dentro & ((np.abs(a) <= ancho / 2) | (np.abs(b) <= ancho / 2))
    molde = np.zeros(dx.shape, np.float32)
    molde[cruz] = 1.0 / cruz.sum()
    molde[dentro & ~cruz] = -1.0 / max(1, (dentro & ~cruz).sum())
    return molde, h


def afinar_esquina(calle, punto, eje_u, eje_v, ancho_calle):
    """Cruce de calles más cercano a `punto` en la máscara de calles → ((x, y), puntaje)."""
    paso = min(np.linalg.norm(eje_u), np.linalg.norm(eje_v))
    molde, h = _molde_cruz(eje_u, eje_v, BRAZO_RELATIVO * paso, ancho_calle)
    r = int(np.ceil(RADIO_RELATIVO * paso))
    cx, cy = int(round(punto[0])), int(round(punto[1]))
    m = r + h
    ventana = np.zeros((2 * m + 1, 2 * m + 1), np.float32)
    alto, ancho = calle.shape
    x0, y0, x1, y1 = max(0, cx - m), max(0, cy - m), min(ancho, cx + m + 1), min(alto, cy + m + 1)
    if x0 >= x1 or y0 >= y1:
        return (float(punto[0]), float(punto[1])), -1.0
    ventana[y0 - cy + m:y1 - cy + m, x0 - cx + m:x1 - cx + m] = calle[y0:y1, x0:x1]
    zona = cv2.filter2D(ventana, cv2.CV_32F, molde, borderType=cv2.BORDER_CONSTANT)[h:h + 2 * r + 1, h:h + 2 * r + 1]
    fy, fx = np.unravel_index(int(np.argmax(zona)), zona.shape)
    return (float(cx - r + fx), float(cy - r + fy)), float(zona[fy, fx])


def esquinas_1936(calle, afin, ancho_calle, alcance=ALCANCE):
    """{(i, j): (x, y)} de las esquinas reales, de la plaza hacia afuera.

    Cada esquina se predice con el afín de las ya halladas (al principio, el de la plaza) y
    se ajusta al cruce de calles; si no hay cruce claro, queda la predicción.
    """
    claves = sorted(((i, j) for i in alcance for j in alcance), key=lambda c: (abs(c[0] - 0.5) + abs(c[1] - 0.5), c))
    halladas = {}
    for clave in claves:
        actual = afin if len(halladas) < 4 else _afin_cercano(halladas, clave)
        prediccion = actual @ [clave[0], clave[1], 1.0]
        punto, puntaje = afinar_esquina(calle, prediccion, actual[:, 0], actual[:, 1], ancho_calle)
        halladas[clave] = punto if puntaje >= PUNTAJE_MINIMO else (float(prediccion[0]), float(prediccion[1]))
    return halladas


def _afin_cercano(halladas, clave, vecinos=6):
    cercanas = sorted(halladas, key=lambda k: (k[0] - clave[0]) ** 2 + (k[1] - clave[1]) ** 2)[:vecinos]
    a = np.array([[k[0], k[1], 1.0] for k in cercanas])
    b = np.array([halladas[k] for k in cercanas])
    return np.linalg.lstsq(a, b, rcond=None)[0].T


# --- manzanas, solares y casas ------------------------------------------------------------------

def esquinas_de_manzana(esquinas, clave):
    """[noroeste, noreste, sureste, suroeste] de la manzana `clave` (centros de los cruces)."""
    i, j = clave
    return np.array([esquinas[(i, j)], esquinas[(i + 1, j)], esquinas[(i + 1, j + 1)], esquinas[(i, j + 1)]], float)


def _bilineal(cuadro, s, t):
    no, ne, se, so = cuadro
    return (1 - s) * (1 - t) * no + s * (1 - t) * ne + s * t * se + (1 - s) * t * so


def parche(cuadro, s0, s1, t0, t1):
    """Polígono del trozo [s0, s1] × [t0, t1] de la manzana (s hacia el este, t hacia el sur)."""
    return Polygon([_bilineal(cuadro, s, t) for s, t in ((s0, t0), (s1, t0), (s1, t1), (s0, t1))])


def _margenes(cuadro, metros_px):
    """Fracción de manzana que ocupan metros_px a lo ancho (s) y a lo alto (t)."""
    ancho = (np.linalg.norm(cuadro[1] - cuadro[0]) + np.linalg.norm(cuadro[2] - cuadro[3])) / 2
    alto = (np.linalg.norm(cuadro[3] - cuadro[0]) + np.linalg.norm(cuadro[2] - cuadro[1])) / 2
    return metros_px / ancho, metros_px / alto


def solares(cuadro, media_calle_px):
    """Los cuatro solares [noroeste, noreste, suroeste, sureste], sin la media calle de afuera."""
    ds, dt = _margenes(cuadro, media_calle_px)
    salida = []
    for s0, s1, t0, t1 in CUADRANTES:
        salida.append(parche(cuadro, max(s0, ds), min(s1, 1 - ds), max(t0, dt), min(t1, 1 - dt)))
    return salida


def casa_de_solar(cuadro, cuadrante, media_calle_px, fondo_px, retiro_px):
    """Casa sobre la calle del norte (solares 0, 1) o del sur (2, 3); atrás queda el corral."""
    ds, dt = _margenes(cuadro, media_calle_px)
    rs, _ = _margenes(cuadro, retiro_px)
    _, ft = _margenes(cuadro, fondo_px)
    s0, s1, t0, t1 = CUADRANTES[cuadrante]
    s0, s1 = max(s0, ds) + rs, min(s1, 1 - ds) - rs
    if cuadrante < 2:
        return parche(cuadro, s0, s1, dt, dt + ft)
    return parche(cuadro, s0, s1, 1 - dt - ft, 1 - dt)


def _agregar_techo(salida, figura):
    puntos = list(figura.exterior.coords)[:-1]
    semilla = semilla_de(figura.centroid.x, figura.centroid.y)
    salida["techos"].append([len(salida["vertices"]) // 2, len(puntos), 1, ESTILO_COLONIAL, semilla])
    for x, y in puntos:
        salida["vertices"].extend((round(float(x), 2), round(float(y), 2)))


def ciudad_1578(datos, esquinas, metro):
    """Casas y solares de 1578 en px del mosaico (formato del vectorizador + 'solares')."""
    validar(datos)
    media_calle, fondo, retiro = MEDIA_CALLE_M / metro, FONDO_CASA_M / metro, RETIRO_M / metro
    salida = {"vertices": [], "techos": [], "solares": []}
    for m in datos["manzanas"]:
        clave = tuple(m["manzana"])
        cuadro = esquinas_de_manzana(esquinas, clave)
        for k, (estado, solar) in enumerate(zip(m["solares"], solares(cuadro, media_calle))):
            salida["solares"].append({"manzana": list(clave), "solar": k, "estado": estado,
                                      "poligono": [[round(float(x), 1), round(float(y), 1)]
                                                   for x, y in list(solar.exterior.coords)[:-1]]})
            if estado == "casa":
                _agregar_techo(salida, casa_de_solar(cuadro, k, media_calle, fondo, retiro))
    return salida



COLORES_QA = {"casa": (40, 40, 200), "vacio": (120, 200, 120), "iglesia": (200, 60, 160),
              "cabildo": (200, 140, 0), "convento": (160, 60, 200), "plaza": (60, 200, 230)}


def guardar_qa(ruta, mosaico, ciudad, escala=2, margen=300):
    """Lámina: solares coloreados por estado y casas en negro sobre el recorte de 1936 (BGR)."""
    todos = np.array([p for s in ciudad["solares"] for p in s["poligono"]])
    x0, y0 = (todos.min(axis=0) - margen).astype(int)
    x1, y1 = (todos.max(axis=0) + margen).astype(int)
    base = cv2.cvtColor(np.ascontiguousarray(mosaico[y0:y1:escala, x0:x1:escala, :3]), cv2.COLOR_RGB2BGR)
    capa = base.copy()
    for s in ciudad["solares"]:
        pts = ((np.array(s["poligono"]) - (x0, y0)) / escala).round().astype(np.int32)
        cv2.fillPoly(capa, [pts], COLORES_QA[s["estado"]])
    lamina = cv2.addWeighted(base, 0.5, capa, 0.5, 0)
    v = np.asarray(ciudad["vertices"]).reshape(-1, 2)
    for inicio, cuantos, *_ in ciudad["techos"]:
        pts = ((v[inicio:inicio + cuantos] - (x0, y0)) / escala).round().astype(np.int32)
        cv2.fillPoly(lamina, [pts], (20, 20, 20))
    cv2.imwrite(str(ruta), lamina, [cv2.IMWRITE_JPEG_QUALITY, 88])


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--raiz", type=Path, default=Path.cwd(),
                    help="checkout con fuentes/ (por omisión, el directorio actual)")
    a = ap.parse_args()
    raiz = a.raiz.resolve()
    datos = json.loads((AQUI / "epocas" / "1578-pimentel.json").read_text())
    plaza = json.loads((AQUI / "gcp" / "plaza-1936.json").read_text())
    metro = json.loads((raiz / "fuentes/derivados/1936/mosaico.json").read_text())["metro"]
    clases = cv2.imread(str(raiz / plaza["clases"]), cv2.IMREAD_UNCHANGED)
    if clases is None:
        raise SystemExit(f"{plaza['clases']}: no se pudo leer")
    calle = (clases == CLASE["calle"]).astype(np.float32)
    esquinas = esquinas_1936(calle, afin_de_semillas(plaza["semillas"]), 2 * MEDIA_CALLE_M / metro)
    ciudad = ciudad_1578(datos, esquinas, metro)
    ciudad = {"fuente": datos["plano"], "año": datos["año"], **ciudad}
    salida = raiz / "fuentes/derivados/1578"
    salida.mkdir(parents=True, exist_ok=True)
    (salida / "ciudad-1578.json").write_text(json.dumps(ciudad, ensure_ascii=False))
    import tifffile
    guardar_qa(salida / "qa-1578.jpg", tifffile.imread(raiz / plaza["mosaico"]), ciudad)
    print(f"1578: {len(ciudad['techos'])} casas, {contar(datos)} → {salida}")


if __name__ == "__main__":
    main()
