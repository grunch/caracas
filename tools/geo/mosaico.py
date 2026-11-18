"""Rectificado de hojas escaneadas a un ráster métrico común (norte arriba) y mosaico.

Cada hoja se lleva a metros con un TPS ajustado a sus GCP (metros → píxeles de la hoja, así
el mapeo inverso es directo); el TPS se evalúa en una malla gruesa y se interpola
bilinealmente por tesela, y `cv2.remap` muestrea la hoja. Las hojas se cortan con una
costura recta vertical (x en metros), sin fundido. Fuera de las hojas queda color papel.

Uso:
  python tools/geo/mosaico.py --config tools/geo/mosaico-1936.json
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

import qa
from cuadricula import HojaTiff
from lineas import ModeloLineas
from tps import ModeloTPS

RAIZ = Path(__file__).resolve().parents[2]
PAPEL = (241, 230, 205)  # #f1e6cd
MARGEN_LECTURA_PX = 4


class ModeloHoja(ModeloTPS):
    """TPS metros → píxeles de una hoja (alias con nombre del dominio)."""


class Rejilla:
    """Ráster métrico norte arriba: columna → x creciente, fila → y decreciente.

    origen_m = (x del borde izquierdo, y del borde superior); el centro del píxel (c, f) está
    en x = x0 + (c + 0.5)·metro, y = y0 − (f + 0.5)·metro.
    """

    def __init__(self, origen_m, metro, ancho, alto):
        if metro <= 0 or ancho <= 0 or alto <= 0:
            raise ValueError("metro, ancho y alto deben ser positivos")
        self.origen_m = (float(origen_m[0]), float(origen_m[1]))
        self.metro, self.ancho, self.alto = float(metro), int(ancho), int(alto)

    def metros(self, col, fila):
        x0, y0 = self.origen_m
        return x0 + (np.asarray(col) + 0.5) * self.metro, y0 - (np.asarray(fila) + 0.5) * self.metro

    def pixeles(self, x_m, y_m):
        x0, y0 = self.origen_m
        return (np.asarray(x_m) - x0) / self.metro - 0.5, (y0 - np.asarray(y_m)) / self.metro - 0.5


def _interpolar_malla(gruesa, paso, alto, ancho):
    """Bilineal de una malla con nodos cada `paso` px (nodo 0 en el píxel 0) a alto×ancho."""
    fi = np.arange(alto) / paso
    fj = np.arange(ancho) / paso
    i0 = np.minimum(fi.astype(int), gruesa.shape[0] - 2)
    j0 = np.minimum(fj.astype(int), gruesa.shape[1] - 2)
    wi = (fi - i0)[:, None]
    wj = (fj - j0)[None, :]
    filas = gruesa[i0] * (1 - wi) + gruesa[i0 + 1] * wi
    return (filas[:, j0] * (1 - wj) + filas[:, j0 + 1] * wj).astype(np.float32)


def _mapa_tesela(rejilla, modelo, f0, c0, alto, ancho, paso):
    filas = f0 + np.arange(0, alto + paso, paso)
    cols = c0 + np.arange(0, ancho + paso, paso)
    cc, ff = np.meshgrid(cols, filas)
    x_m, y_m = rejilla.metros(cc, ff)
    px, py = modelo(x_m, y_m)
    return _interpolar_malla(px, paso, alto, ancho), _interpolar_malla(py, paso, alto, ancho)


def _muestrear(hoja, mapa_x, mapa_y, papel, suavizado):
    """remap de la región de la hoja que cubre el mapa; papel fuera de la hoja."""
    alto_h, ancho_h = hoja.forma
    x0 = max(int(np.floor(mapa_x.min())) - MARGEN_LECTURA_PX, 0)
    y0 = max(int(np.floor(mapa_y.min())) - MARGEN_LECTURA_PX, 0)
    x1 = min(int(np.ceil(mapa_x.max())) + MARGEN_LECTURA_PX, ancho_h)
    y1 = min(int(np.ceil(mapa_y.max())) + MARGEN_LECTURA_PX, alto_h)
    if x0 >= x1 or y0 >= y1:
        return None
    region = hoja.leer(y0, y1, x0, x1)
    if suavizado > 0:
        region = cv2.GaussianBlur(region, (0, 0), suavizado)
    return cv2.remap(region, mapa_x - x0, mapa_y - y0, cv2.INTER_LINEAR,
                     borderMode=cv2.BORDER_CONSTANT, borderValue=papel)


BLANCO_ESCANER = 253  # mínimo de los tres canales a partir del cual es cama del escáner


def _dentro_de_hoja(hoja, mapa_x, mapa_y):
    alto, ancho = hoja.forma
    return (mapa_x >= 0) & (mapa_x <= ancho - 1) & (mapa_y >= 0) & (mapa_y <= alto - 1)


def _fondo_escaner(hoja, mapa_x, mapa_y, pedazo):
    """Blanco puro cerca de los bordes de la hoja: fondo del escáner, sin dato."""
    b = hoja.borde_fondo_px
    if b <= 0:
        return np.zeros(mapa_x.shape, bool)
    alto, ancho = hoja.forma
    cerca = (mapa_x < b) | (mapa_x > ancho - 1 - b) | (mapa_y < b) | (mapa_y > alto - 1 - b)
    return cerca & (pedazo.min(axis=2) >= BLANCO_ESCANER)


def _componer_tesela(salida, capas, sigmas, rejilla, f0, c0, alto, ancho, paso, papel):
    """Cada capa pinta sus columnas (costura); donde su hoja no llega, rellena otra capa."""
    x_m, _ = rejilla.metros(c0 + np.arange(ancho), np.zeros(ancho))
    destino = salida[f0:f0 + alto, c0:c0 + ancho]
    cubierto = np.zeros((alto, ancho), bool)
    pendientes = []
    for (hoja, modelo, desde, hasta), sigma in zip(capas, sigmas):
        mx, my = _mapa_tesela(rejilla, modelo, f0, c0, alto, ancho, paso)
        dentro = _dentro_de_hoja(hoja, mx, my)
        if not dentro.any():
            continue
        pedazo = _muestrear(hoja, mx, my, papel, sigma)
        dentro &= ~_fondo_escaner(hoja, mx, my, pedazo)
        propio = dentro & ((x_m >= desde) & (x_m < hasta))[None, :]
        destino[propio] = pedazo[propio]
        cubierto |= propio
        pendientes.append((pedazo, dentro))
    for pedazo, dentro in pendientes:
        hueco = dentro & ~cubierto
        destino[hueco] = pedazo[hueco]
        cubierto |= hueco


def _sigma_antialias(rejilla, modelo):
    reduccion = rejilla.metro * modelo.px_por_metro()  # px de hoja por px de salida
    return 0.5 * np.sqrt(reduccion ** 2 - 1) if reduccion > 1.2 else 0.0


def componer(rejilla, capas, tesela=2048, paso_malla=16, papel=PAPEL, salida=None):
    """Mosaico de capas [(hoja, modelo, x_desde_m, x_hasta_m), …] sobre la rejilla."""
    if salida is None:
        salida = np.empty((rejilla.alto, rejilla.ancho, 3), np.uint8)
    salida[:] = papel
    sigmas = [_sigma_antialias(rejilla, m) for _, m, _, _ in capas]
    for f0 in range(0, rejilla.alto, tesela):
        for c0 in range(0, rejilla.ancho, tesela):
            alto, ancho = min(tesela, rejilla.alto - f0), min(tesela, rejilla.ancho - c0)
            _componer_tesela(salida, capas, sigmas, rejilla, f0, c0, alto, ancho, paso_malla,
                             papel)
    return salida


def rectificar(hoja, modelo, rejilla, tesela=2048, paso_malla=16, papel=PAPEL):
    return componer(rejilla, [(hoja, modelo, -np.inf, np.inf)], tesela, paso_malla, papel)


# ---------------------------------------------------------------- residuos y salidas

def residuos_hoja(modelo, gcps):
    """Residuos dejando-uno-fuera, en metros (px de hoja / px por metro)."""
    px_m = modelo.px_por_metro()
    loo_m = modelo.residuos_loo() / px_m
    peores = sorted(zip(loo_m, gcps), key=lambda p: -p[0])[:5]
    return {"n": len(gcps), "rms": round(float(np.sqrt(np.mean(loo_m ** 2))), 3),
            "max": round(float(loo_m.max()), 3), "px_por_metro": round(px_m, 4),
            "peores": [{"x_m": g["x_m"], "y_m": g["y_m"], "loo_m": round(float(r), 3)}
                       for r, g in peores]}, loo_m


def _rejilla_de_config(conf):
    x0, y0, x1, y1 = conf["extension_m"]  # oeste, sur, este, norte
    metro = conf["metro"]
    return Rejilla((x0, y1), metro, round((x1 - x0) / metro), round((y1 - y0) / metro))


def _rect_px(rejilla, rect_m):
    x0, y0, x1, y1 = rect_m
    c0, f0 = rejilla.pixeles(x0, y1)
    c1, f1 = rejilla.pixeles(x1, y0)
    return [int(round(float(c0) + 0.5)), int(round(float(f0) + 0.5)),
            int(round(float(c1) + 0.5)), int(round(float(f1) + 0.5))]


def _rango(desde, hasta, paso=500.0):
    return [float(v) for v in np.arange(desde, hasta + paso / 2, paso)]


def guardar_tiff(ruta, imagen):
    import tifffile
    tifffile.imwrite(str(ruta), imagen, photometric="rgb", tile=(512, 512),
                     compression="deflate", predictor=2, maxworkers=8)


def guardar_vista(ruta, imagen, lado_max=4096):
    escala = lado_max / max(imagen.shape[:2])
    vista = cv2.resize(imagen, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(ruta), cv2.cvtColor(vista, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 88])


def _modelo_de_hoja(conf_hoja, gcps, forma):
    """Modelo denso (cruces + tramos de línea) si hay muestras; si no, TPS de cruces."""
    if "lineas" not in conf_hoja:
        return ModeloHoja.ajustar(gcps)
    muestras = json.loads((RAIZ / conf_hoja["lineas"]).read_text())
    return ModeloLineas.ajustar(gcps, muestras, forma)


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    p.add_argument("--config", required=True)
    args = p.parse_args(argv)
    conf = json.loads(Path(args.config).read_text())
    rejilla = _rejilla_de_config(conf)
    capas, por_hoja, todos = [], {}, []
    for h in conf["hojas"]:
        gcps = json.loads((RAIZ / h["gcp"]).read_text())
        hoja = HojaTiff(RAIZ / h["original"], borde_fondo_px=h.get("borde_fondo_px", 0))
        modelo = _modelo_de_hoja(h, gcps, hoja.forma)
        por_hoja[h["nombre"]], loo = residuos_hoja(modelo, gcps)
        todos.extend(loo)
        capas.append((hoja, modelo, h["x_desde_m"], h["x_hasta_m"]))
        print(f"{h['nombre']}: {len(gcps)} GCP, LOO rms {por_hoja[h['nombre']]['rms']} m",
              file=sys.stderr)
    print(f"componiendo {rejilla.ancho}×{rejilla.alto} px…", file=sys.stderr)
    imagen = componer(rejilla, capas)
    destino = RAIZ / conf["salida"]
    destino.mkdir(parents=True, exist_ok=True)
    guardar_tiff(destino / "mosaico.tif", imagen)
    guardar_vista(destino / "mosaico-vista.jpg", imagen)
    qa.lamina_cuadricula(imagen, rejilla, conf["qa"], destino / "qa-cuadricula.jpg")
    verificacion = qa.verificar_cuadricula(imagen, rejilla, _rango(*conf["cuadricula_x_m"]),
                                           _rango(*conf["cuadricula_y_m"]))
    print(f"re-medición en el mosaico: {verificacion}", file=sys.stderr)
    todos = np.asarray(todos)
    meta = {
        "fuente": [h["fuente"] for h in conf["hojas"]],
        "metro": rejilla.metro, "ancho": rejilla.ancho, "alto": rejilla.alto,
        "origen_m": list(rejilla.origen_m),
        "marco": _rect_px(rejilla, conf["marco_m"]),
        "plaza": [round(float(v) + 0.5, 1) for v in rejilla.pixeles(*conf["plaza_m"])],
        "plaza_m": conf["plaza_m"],
        "costura_m": conf["costura_m"],
        "residuos_m": {"metodo": "dejando uno fuera (TPS sin ese GCP)",
                       "rms": round(float(np.sqrt(np.mean(todos ** 2))), 3),
                       "max": round(float(todos.max()), 3), "por_hoja": por_hoja,
                       "remedicion_en_mosaico": verificacion},
        "notas": conf["notas"],
    }
    (destino / "mosaico.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps(meta["residuos_m"], ensure_ascii=False), file=sys.stderr)


if __name__ == "__main__":
    main()
