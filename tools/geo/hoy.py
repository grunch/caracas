"""«Lo de hoy»: la Caracas actual de OpenStreetMap, alineada al plano de 1936, para estamparla en rojo.

Uso (desde la raíz del repo):
  python tools/geo/hoy.py [--descargar] [--solo-descargar] [--qa fuentes/derivados/hoy/qa-hoy.jpg]

1. Baja de Overpass calles, vías férreas y agua (hoy_osm.py) a fuentes/derivados/hoy/osm.json, solo si
   falta (--descargar fuerza otra bajada). Con la caché, todo lo que sigue corre sin red.
2. Lleva cada coordenada al píxel del mosaico: WGS84 → UTM 19N → cuadrícula 1936 → píxel (geo1936).
3. Rasteriza con antialias (sobremuestreo 4×, por teselas), con el ancho de cada vía en metros:
   public/plano/hoy-lejos.webp (2048 px de lado mayor: avenidas, vías férreas y ríos) y
   public/plano/hoy-cerca.webp (8192 px: todas las calles). RGB sin pérdida:
   R calles · G vías férreas · B agua; cada canal es la cobertura (0–255) de esa capa.
4. Nombres: public/datos/calles.json (nombres únicos ordenados) y calles.bin (6 × Uint16 por tramo con
   nombre; la codificación está en specs/02-arquitectura-y-formatos.md).
Datos © colaboradores de OpenStreetMap, ODbL 1.0 (fuentes/datos/osm-hoy/ficha.json).
"""
import argparse
import json
import math
from pathlib import Path

import cv2
import numpy as np

import geo1936 as geo
import hoy_osm

CANAL = {"calle": 0, "via": 1, "agua": 2}
SALIDAS = (("hoy-lejos.webp", 2048, False), ("hoy-cerca.webp", 8192, True))
SOBREMUESTREO = 4
TESELA = 1024
SUBPIXEL = 4  # bits fraccionarios de las coordenadas para cv2 (shift)
TRAMO_M = 200.0  # largo máximo de un tramo con nombre
TRAMO_MIN_M = 20.0
QUIEBRE_GRADOS = 35.0  # un giro mayor corta el tramo
DIRECCION = 32767  # escala de dx, dy en calles.bin
CENTRO_U16 = 32768


def forma_salida(ancho_px, alto_px, lado):
    """(alto, ancho) de una textura de `lado` px de lado mayor con la proporción del mosaico."""
    if ancho_px >= alto_px:
        return int(round(alto_px * lado / ancho_px)), lado
    return lado, int(round(ancho_px * lado / alto_px))


def _preparar(elems, escala, origen, cerca):
    """Cada elemento con sus líneas en píxeles de salida, su grosor y su caja."""
    media = (escala[0] + escala[1]) / 2
    listos = []
    for e in elems:
        if not cerca and not e["lejos"]:
            continue
        lineas = [(np.asarray(l, float) - origen) * escala for l in e["lineas"]]
        todas = np.concatenate(lineas)
        grosor = max(1.0, e["ancho_m"] / geo.METRO_PX * media)
        caja = np.r_[todas.min(axis=0) - grosor, todas.max(axis=0) + grosor]
        listos.append((CANAL[e["capa"]], e["area"], lineas, grosor, caja))
    return listos


def _dibujar_tesela(listos, x0, y0, ancho, alto, ss):
    lienzo = np.zeros((3, alto * ss, ancho * ss), np.uint8)
    fijo = ss * (1 << SUBPIXEL)
    for canal, area, lineas, grosor, caja in listos:
        if caja[2] < x0 or caja[0] > x0 + ancho or caja[3] < y0 or caja[1] > y0 + alto:
            continue
        pts = [np.round((l - (x0, y0)) * fijo).astype(np.int32) for l in lineas]
        g = max(ss, int(round(grosor * ss)))
        if area:
            cv2.fillPoly(lienzo[canal], pts, 255, lineType=cv2.LINE_8, shift=SUBPIXEL)
        cv2.polylines(lienzo[canal], pts, area, 255, thickness=g, lineType=cv2.LINE_8, shift=SUBPIXEL)
    return np.stack([cv2.resize(c, (ancho, alto), interpolation=cv2.INTER_AREA) for c in lienzo], axis=-1)


def rasterizar(elems, forma_mosaico, forma, origen=(0.0, 0.0), cerca=True, tesela=TESELA, sobremuestreo=SOBREMUESTREO):
    """Máscara RGB (alto, ancho, 3) de la región del mosaico de `forma_mosaico` px con esquina en `origen`.

    R calles · G vías · B agua. Con cerca=False solo entra lo que va de lejos.
    """
    alto, ancho = forma
    escala = np.array([ancho / forma_mosaico[1], alto / forma_mosaico[0]])
    listos = _preparar(elems, escala, np.asarray(origen, float), cerca)
    salida = np.zeros((alto, ancho, 3), np.uint8)
    for y0 in range(0, alto, tesela):
        for x0 in range(0, ancho, tesela):
            h, w = min(tesela, alto - y0), min(tesela, ancho - x0)
            salida[y0:y0 + h, x0:x0 + w] = _dibujar_tesela(listos, x0, y0, w, h, sobremuestreo)
    return salida


# --- nombres de calles -----------------------------------------------------------------------
def _leible(d):
    """Dirección para leer: de izquierda a derecha; si es vertical, de abajo hacia arriba (y crece al sur)."""
    if d[0] < -1e-12 or (abs(d[0]) <= 1e-12 and d[1] > 0):
        return -d
    return d


def _partir_en_quiebres(pts, quiebre_grados):
    v = np.diff(pts, axis=0)
    ang = np.arctan2(v[:, 1], v[:, 0])
    giro = np.abs((np.diff(ang) + np.pi) % (2 * np.pi) - np.pi)
    cortes = np.flatnonzero(giro > np.deg2rad(quiebre_grados)) + 1
    return [pts[a:b + 1] for a, b in zip(np.r_[0, cortes], np.r_[cortes, len(pts) - 1])]


def tramos(pts, largo_max_m=TRAMO_M, quiebre_grados=QUIEBRE_GRADOS):
    """Tramos casi rectos de una polilínea (px del mosaico): [(mx, my, dx, dy, largo_m)], en partes iguales."""
    pts = np.asarray(pts, float)
    pts = pts[np.r_[True, np.any(np.diff(pts, axis=0) != 0, axis=1)]]
    if len(pts) < 2:
        return []
    salida = []
    for pieza in _partir_en_quiebres(pts, quiebre_grados):
        s = np.r_[0.0, np.cumsum(np.hypot(*np.diff(pieza, axis=0).T))]
        largo = s[-1] * geo.METRO_PX
        k = max(1, math.ceil(largo / largo_max_m - 1e-9))
        en = lambda t: np.array([np.interp(t, s, pieza[:, 0]), np.interp(t, s, pieza[:, 1])])  # noqa: E731
        for j in range(k):
            a, b = s[-1] * j / k, s[-1] * (j + 1) / k
            d = en(b) - en(a)
            norma = np.hypot(*d)
            if norma == 0:
                continue
            m = en((a + b) / 2)
            dx, dy = _leible(d / norma)
            salida.append((float(m[0]), float(m[1]), float(dx), float(dy), largo / k))
    return salida


def calles(elems, ancho_px, alto_px):
    """(nombres ordenados, registros Uint16 (n, 6)) de los tramos de calles con nombre dentro del mosaico."""
    filas = []
    for e in elems:
        nombre = (e.get("nombre") or "").strip()
        if e["capa"] != "calle" or not nombre:
            continue
        for linea in e["lineas"]:
            for mx, my, dx, dy, largo in tramos(linea):
                if largo >= TRAMO_MIN_M and 0 <= mx < ancho_px and 0 <= my < alto_px:
                    filas.append((nombre, mx, my, dx, dy, largo))
    nombres = sorted({f[0] for f in filas})
    if len(nombres) > 0xFFFF:
        raise ValueError("demasiados nombres para un índice Uint16")
    indice = {n: i for i, n in enumerate(nombres)}
    reg = np.array([[min(round(mx), ancho_px - 1), min(round(my), alto_px - 1), round(dx * DIRECCION) + CENTRO_U16, round(dy * DIRECCION) + CENTRO_U16,
                     indice[n], min(0xFFFF, round(largo))] for n, mx, my, dx, dy, largo in filas],
                   dtype=np.int64).reshape(-1, 6)
    orden = np.lexsort((reg[:, 1], reg[:, 0], reg[:, 4], -reg[:, 5]))
    return nombres, reg[orden].astype(np.uint16)


def codificar_calles(registros):
    return np.ascontiguousarray(registros, dtype="<u2").tobytes()


# --- salida ----------------------------------------------------------------------------------
def escribir_atomico(ruta, datos):
    """Temporal en el mismo directorio y rename: nunca queda un archivo a medias con fecha nueva
    (tools/datos.mjs decide por fechas y lo daría por bueno)."""
    ruta = Path(ruta)
    temporal = ruta.with_name(ruta.name + ".parcial")
    temporal.write_bytes(datos)
    temporal.replace(ruta)


def escribir_webp(ruta, rgb):
    """WebP sin pérdida (calidad > 100 en OpenCV): los tres canales quedan intactos."""
    ok, datos = cv2.imencode(".webp", np.ascontiguousarray(rgb[..., ::-1]), [cv2.IMWRITE_WEBP_QUALITY, 101])
    if not ok:
        raise RuntimeError(f"no se pudo codificar {ruta}")
    escribir_atomico(ruta, datos.tobytes())


def leer_webp(ruta):
    return cv2.imdecode(np.frombuffer(Path(ruta).read_bytes(), np.uint8), cv2.IMREAD_COLOR)[..., ::-1]


def generar(osm_json, meta, dir_plano, dir_datos, transf):
    ancho, alto = meta["ancho"], meta["alto"]
    elems = hoy_osm.elementos(json.loads(Path(osm_json).read_text(encoding="utf-8")), transf)
    for archivo, lado, cerca in SALIDAS:
        img = rasterizar(elems, (alto, ancho), forma_salida(ancho, alto, lado), cerca=cerca)
        escribir_webp(Path(dir_plano) / archivo, img)
        print(f"  {archivo}: {img.shape[1]}×{img.shape[0]}")
    nombres, reg = calles(elems, ancho, alto)
    escribir_atomico(Path(dir_datos, "calles.json"), (json.dumps(nombres, ensure_ascii=False) + "\n").encode("utf-8"))
    escribir_atomico(Path(dir_datos, "calles.bin"), codificar_calles(reg))
    por_capa = {c: sum(e["capa"] == c for e in elems) for c in CANAL}
    print(f"  elementos {por_capa} · calles.bin {len(reg)} tramos · calles.json {len(nombres)} nombres")
    return elems


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--osm", default="fuentes/derivados/hoy/osm.json", help="caché de la respuesta de Overpass")
    ap.add_argument("--mosaico", default="fuentes/derivados/1936/mosaico.json")
    ap.add_argument("--plano", default="public/plano")
    ap.add_argument("--datos", default="public/datos")
    ap.add_argument("--descargar", action="store_true", help="vuelve a bajar de Overpass aunque haya caché")
    ap.add_argument("--solo-descargar", action="store_true", help="solo asegura la caché de OSM")
    ap.add_argument("--qa", help="imagen de control del centro (necesita el mosaico cosido)")
    ap.add_argument("--tif", default="fuentes/derivados/1936/mosaico-costura.tif")
    ap.add_argument("--clases", default="fuentes/derivados/1936/segmentacion/mosaico/clases-costura.png")
    a = ap.parse_args(argv)
    meta = json.loads(Path(a.mosaico).read_text(encoding="utf-8"))
    transf = geo.cargar()
    bbox = hoy_osm.bbox_wgs84(meta["ancho"], meta["alto"], transf)
    if hoy_osm.descargar(a.osm, bbox, forzar=a.descargar):
        print(f"  OSM bajado de Overpass → {a.osm}")
    if a.solo_descargar:
        return 0
    elems = generar(a.osm, meta, a.plano, a.datos, transf)
    if a.qa:
        import hoy_qa
        print(f"  QA: {hoy_qa.generar(elems, meta, a.tif, a.clases, a.qa)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
