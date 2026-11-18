"""Relieve del valle para el visor: DEM Copernicus GLO-30 → grilla del mosaico 1936 → relieve.bin.

Uso:
  python tools/geo/relieve.py --dem /ruta/Copernicus_DSM_COG_10_N10_00_W067_00_DEM.tif \\
      [--salida public/datos/relieve.bin] [--paso 10] [--informe informe.json]

La hoja N10 W067 (lat 10…11, lon −67…−66) cubre todo el plano. Se descarga de
https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N10_00_W067_00_DEM/Copernicus_DSM_COG_10_N10_00_W067_00_DEM.tif
(si no existe en --dem, se baja ahí). Pasos:
1. muestrear el DEM (alturas EGM2008) en el centro de cada celda de la grilla del mosaico, pasando por
   cuadrícula 1936 → UTM 19N → WGS84 (geo1936 + gcp/1936-wgs84.json);
2. quitar los edificios de hoy (el DEM es de superficie): apertura morfológica con un disco y un
   suavizado gaussiano leve;
3. comparar con las cotas impresas en el plano (gcp/1936-cotas.json), restar el sesgo (mediana) y
   tender hacia las cotas cerca de ellas;
4. escribir relieve.bin: Uint16 little-endian [w, h, alturas…] en decímetros sobre el nivel del mar,
   fila 0 = borde norte (arriba del plano), columna 0 = borde oeste; la celda (i, j) es el centro
   del píxel ((j + ½)·ANCHO/w, (i + ½)·ALTO/h) del mosaico.
"""
import argparse
import json
import urllib.request
from pathlib import Path

import numpy as np
import tifffile
from scipy import ndimage

import geo1936 as geo

ANCHO_PX, ALTO_PX = 18600, 14800  # el mosaico entero (fuentes/derivados/1936/mosaico.json)
URL_DEM = ("https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_N10_00_W067_00_DEM/"
           "Copernicus_DSM_COG_10_N10_00_W067_00_DEM.tif")
RUTA_COTAS = Path(__file__).resolve().parent / "gcp" / "1936-cotas.json"
DM_MAX = 65535


def leer_dem(ruta):
    """Alturas (float32) y georreferencia {lon0, lat0, dlon, dlat} del centro del píxel (0, 0)."""
    with tifffile.TiffFile(ruta) as t:
        p = t.pages[0]
        escala = p.tags["ModelPixelScaleTag"].value
        ancla = p.tags["ModelTiepointTag"].value
        claves = p.tags["GeoKeyDirectoryTag"].value
        z = p.asarray().astype(np.float32)
    es_punto = _geoclave(claves, 1025) == 2  # GTRasterTypeGeoKey: 1 área, 2 punto
    medio = 0.0 if es_punto else 0.5
    return z, {"lon0": ancla[3] + medio * escala[0], "lat0": ancla[4] - medio * escala[1],
               "dlon": escala[0], "dlat": escala[1]}


def _geoclave(claves, id_):
    for k in range(4, len(claves), 4):
        if claves[k] == id_:
            return claves[k + 3]
    return None


def centros_px(forma):
    """Píxeles del mosaico (px, py) del centro de cada celda de una grilla (h, w)."""
    h, w = forma
    j, i = np.meshgrid(np.arange(w), np.arange(h))
    return (j + 0.5) * ANCHO_PX / w, (i + 0.5) * ALTO_PX / h


def dem_en_grilla(dem, georef, transf, forma):
    """Muestreo bilineal del DEM en los centros de la grilla del mosaico."""
    px, py = centros_px(forma)
    lat, lon = geo.grid_a_wgs84(*geo.px_a_grid(px, py), transf)
    fila = (georef["lat0"] - lat) / georef["dlat"]
    col = (lon - georef["lon0"]) / georef["dlon"]
    return ndimage.map_coordinates(dem, [fila, col], order=1, mode="nearest")


def quitar_edificios(z, paso_m, radio_m=60.0, sigma_m=20.0):
    """Apertura con un disco (borra lo que mida menos de 2·radio) y un gaussiano leve."""
    r = max(1, int(round(radio_m / paso_m)))
    yy, xx = np.mgrid[-r:r + 1, -r:r + 1]
    disco = xx**2 + yy**2 <= r * r
    abierto = ndimage.grey_opening(z, footprint=disco, mode="nearest")
    return ndimage.gaussian_filter(abierto, sigma_m / paso_m, mode="nearest") if sigma_m > 0 else abierto


def altura_en(z, px, py):
    """Altura bilineal en el píxel (px, py) del mosaico (convención de centros de celda)."""
    h, w = z.shape
    fx = np.clip(np.asarray(px, dtype=float) / ANCHO_PX * w - 0.5, 0, w - 1)
    fy = np.clip(np.asarray(py, dtype=float) / ALTO_PX * h - 0.5, 0, h - 1)
    return ndimage.map_coordinates(z, [np.atleast_1d(fy), np.atleast_1d(fx)], order=1, mode="nearest").reshape(np.shape(fx))


def comparar_cotas(z, cotas):
    """DEM − cota en cada punto; sesgo = mediana (robusta a una cota mal leída)."""
    dem = altura_en(z, [c["px"] for c in cotas], [c["py"] for c in cotas])
    filas = [{**c, "dem_m": round(float(d), 2), "dif_m": round(float(d - c["valor"]), 2)} for c, d in zip(cotas, dem)]
    dif = np.array([f["dif_m"] for f in filas])
    return {"n": len(filas), "sesgo_m": float(np.median(dif)), "media_m": float(dif.mean()),
            "desvio_m": float(dif.std()), "cotas": filas}


def corregir(z, cotas, radio_m=150.0, regularizacion=0.05):
    """Resta el sesgo y suma los residuos interpolados con una RBF gaussiana: el campo pasa
    (casi) por cada cota y se apaga a unos radios de distancia, donde queda solo el DEM."""
    r = comparar_cotas(z, cotas)
    base = z - r["sesgo_m"]
    xy = np.array([[c["px"], c["py"]] for c in r["cotas"]]) * geo.METRO_PX
    resto = np.array([c["valor"] - (c["dem_m"] - r["sesgo_m"]) for c in r["cotas"]])
    nucleo = lambda d2: np.exp(-d2 / (2 * radio_m**2))  # noqa: E731
    k = nucleo(((xy[:, None, :] - xy[None, :, :]) ** 2).sum(-1))
    pesos = np.linalg.solve(k + regularizacion * np.eye(len(xy)), resto)
    px, py = centros_px(z.shape)
    campo = np.zeros_like(base)
    for (cx, cy), a in zip(xy, pesos):
        campo += a * nucleo((px * geo.METRO_PX - cx) ** 2 + (py * geo.METRO_PX - cy) ** 2)
    return base + campo


def codificar(z_m):
    dm = np.round(np.asarray(z_m, dtype=float) * 10)
    if dm.min() < 0 or dm.max() > DM_MAX:
        raise ValueError(f"alturas fuera de rango para Uint16 en dm: {dm.min() / 10}…{dm.max() / 10} m")
    h, w = dm.shape
    return np.concatenate([[w, h], dm.ravel()]).astype("<u2").tobytes()


def decodificar(datos):
    u = np.frombuffer(datos, dtype="<u2")
    w, h = int(u[0]), int(u[1])
    return u[2:2 + w * h].reshape(h, w).astype(float) / 10


def descargar_dem(destino):
    destino = Path(destino)
    destino.parent.mkdir(parents=True, exist_ok=True)
    pedido = urllib.request.Request(URL_DEM, headers={"User-Agent": "caracas-historica/0.1"})
    with urllib.request.urlopen(pedido, timeout=300) as r, open(destino, "wb") as f:
        f.write(r.read())


def generar(ruta_dem, paso_m=10.0, cotas=None, radio_edificios_m=60.0):
    dem, georef = leer_dem(ruta_dem)
    transf = geo.cargar()
    forma = (int(round(ALTO_PX * geo.METRO_PX / paso_m)), int(round(ANCHO_PX * geo.METRO_PX / paso_m)))
    crudo = dem_en_grilla(dem, georef, transf, forma)
    limpio = quitar_edificios(crudo, paso_m, radio_edificios_m)
    informe = {"forma": forma, "paso_m": paso_m, "radio_edificios_m": radio_edificios_m}
    if cotas:
        informe["crudo"] = _resumen(comparar_cotas(crudo, cotas))
        informe["limpio"] = comparar_cotas(limpio, cotas)
        limpio = corregir(limpio, cotas)
        informe["corregido"] = _resumen(comparar_cotas(limpio, cotas))
    return limpio, informe


def _resumen(r):
    return {k: round(v, 2) if isinstance(v, float) else v for k, v in r.items() if k != "cotas"}


def main(argv=None):
    ap = argparse.ArgumentParser(description="DEM → relieve.bin en la grilla del mosaico 1936")
    ap.add_argument("--dem", required=True)
    ap.add_argument("--salida", default="public/datos/relieve.bin")
    ap.add_argument("--paso", type=float, default=10.0, help="metros por celda")
    ap.add_argument("--cotas", default=str(RUTA_COTAS))
    ap.add_argument("--sin-cotas", action="store_true")
    ap.add_argument("--informe")
    args = ap.parse_args(argv)
    if not Path(args.dem).exists():
        descargar_dem(args.dem)
    cotas = None if args.sin_cotas else json.loads(Path(args.cotas).read_text(encoding="utf-8"))["cotas"]
    z, informe = generar(args.dem, args.paso, cotas)
    Path(args.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(args.salida).write_bytes(codificar(z))
    informe["rango_m"] = [round(float(z.min()), 1), round(float(z.max()), 1)]
    if args.informe:
        Path(args.informe).write_text(json.dumps(informe, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in informe.items() if k != "limpio"}, ensure_ascii=False))
    if "limpio" in informe:
        print("limpio:", json.dumps(_resumen(informe["limpio"])))
    return informe


if __name__ == "__main__":
    main()
