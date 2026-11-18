#!/usr/bin/env python3
"""Calce de los planos viejos sobre el mosaico DCN de 1936 (0,5 m/px, Plaza Bolívar al centro).

GCP manuales: las cuatro esquinas de la Plaza Bolívar (Principal, La Torre, Gradillas,
Monjas) y anclas sueltas (puentes, iglesias) leídas a ojo en los dos planos. Con ellas se
arranca y, de la plaza hacia afuera y de grueso a fino, se agregan puntos de enlace
automáticos por correlación de la red de calles (calce_correlacion.py), se descartan los que
el resto no explica (residuo dejando uno fuera) y se reajusta un TPS (tools/geo/tps.py) en
los dos sentidos. Al final el plano se deforma a la grilla del mosaico, recortado a su
cobertura.

Uso (desde el checkout con los datos): python tools/geo/calce.py <carpeta de fuentes/mapas>
Lee tools/geo/gcp/calce-<carpeta>.json y le escribe los GCP y los residuos.
Salidas: fuentes/derivados/<año>/calzado.tif (RGBA, alfa 0 fuera del plano), calzado.json
(recorte en px del mosaico, residuos) y qa-calce.jpg (plano viejo al 50 % sobre 1936).
"""
import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

import cv2  # noqa: E402
import numpy as np  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

from calce_correlacion import callejidad, corrimiento, enlaces, malla  # noqa: E402,F401
from calce_correlacion import residuos_loo_rapidos as _rippa  # noqa: E402
from tps import ESCALA_NORMALIZACION, ModeloTPS  # noqa: E402

GCP_DIR = Path(__file__).resolve().parent / "gcp"
NOTA_AUTOMATICA = "enlace automático por correlación de calles (calidad {calidad:.2f})"
FILAS_POR_TESELA = 2048
ESCALA_QA = 4
QUITAR_DE_UNA_VEZ = 0.7   # en cada vuelta de depurar se quitan los que superan esto × el peor
ETAPAS_POR_OMISION = (     # de la plaza hacia afuera, de grueso a fino (metros)
    {"radio_m": 700, "paso_m": 100, "ventana_m": 70, "busqueda_m": 40, "calidad": 0.3},
    {"radio_m": 1400, "paso_m": 80, "ventana_m": 60, "busqueda_m": 25, "calidad": 0.3},
    {"radio_m": 2600, "paso_m": 70, "ventana_m": 50, "busqueda_m": 15, "calidad": 0.3},
    {"radio_m": 4500, "paso_m": 70, "ventana_m": 50, "busqueda_m": 12, "calidad": 0.3},
)


def _tps(origen, destino, suavizado):
    return ModeloTPS.ajustar([{"x_m": a, "y_m": b, "px": c, "py": d}
                              for (a, b), (c, d) in zip(origen, destino)], suavizado=suavizado)


def _matrices(gcps):
    viejo = np.array([[g["px"], g["py"]] for g in gcps], float)
    base = np.array([[g["x36"], g["y36"]] for g in gcps], float)
    return viejo, base


class Calce:
    """TPS plano viejo (px) ⇄ mosaico de 1936 (px), con residuos en metros."""

    def __init__(self, viejo, base, metro, suavizado):
        self.viejo, self.base, self.metro, self.suavizado = viejo, base, metro, suavizado
        self._ida = _tps(viejo, base, suavizado)
        self._vuelta = _tps(base, viejo, suavizado)

    @classmethod
    def ajustar(cls, gcps, metro, suavizado=0.0):
        viejo, base = _matrices(gcps)
        return cls(viejo, base, metro, suavizado)

    def a_1936(self, px, py):
        return self._ida(px, py)

    def al_viejo(self, x36, y36):
        return self._vuelta(x36, y36)

    def errores_loo_m(self):
        return residuos_loo_rapidos(self.viejo, self.base, self.suavizado) * self.metro

    def residuos_m(self):
        e = self.errores_loo_m()
        return {"metodo": "dejando uno fuera (TPS sin ese GCP), en metros sobre 1936",
                "n": int(len(e)), "rms": round(float(np.sqrt(np.mean(e ** 2))), 2),
                "p90": round(float(np.percentile(e, 90)), 2), "max": round(float(e.max()), 2)}


def residuos_loo_rapidos(origen, destino, suavizado=0.0):
    """Error LOO (en unidades del destino) del TPS de tps.py, por la fórmula de Rippa."""
    return _rippa(origen, destino, suavizado, escala=ESCALA_NORMALIZACION)


def depurar(gcps, metro, umbral_m, suavizado=0.0):
    """Quita los GCP automáticos de mayor residuo LOO mientras el peor supere umbral_m.

    En cada vuelta salen los que superan QUITAR_DE_UNA_VEZ × el peor (al menos el peor);
    los manuales no se tocan. Devuelve (limpios, quitados).
    """
    limpios, quitados = list(gcps), []
    while len(limpios) > 4:
        viejo, base = _matrices(limpios)
        errores = residuos_loo_rapidos(viejo, base, suavizado) * metro
        errores = np.where([bool(g.get("manual")) for g in limpios], -1.0, errores)
        peor = float(errores.max())
        if peor <= umbral_m:
            break
        corte = max(umbral_m, QUITAR_DE_UNA_VEZ * peor)
        quitados += [g for g, e in zip(limpios, errores) if e > corte or e == peor]
        limpios = [g for g, e in zip(limpios, errores) if not (e > corte or e == peor)]
    return limpios, quitados


def cobertura(calce, forma_viejo, forma_1936, margen_px=None):
    """Rectángulo [x0, y0, x1, y1) del mosaico que cubre el plano viejo (y los GCP + margen)."""
    alto, ancho = forma_viejo
    t = np.linspace(0, 1, 64)
    bx = np.r_[t * (ancho - 1), np.full_like(t, ancho - 1), t * (ancho - 1), np.zeros_like(t)]
    by = np.r_[np.zeros_like(t), t * (alto - 1), np.full_like(t, alto - 1), t * (alto - 1)]
    x36, y36 = calce.a_1936(bx, by)
    x0, y0, x1, y1 = x36.min(), y36.min(), x36.max(), y36.max()
    if margen_px is not None:
        gx, gy = calce.base[:, 0], calce.base[:, 1]
        x0, y0 = max(x0, gx.min() - margen_px), max(y0, gy.min() - margen_px)
        x1, y1 = min(x1, gx.max() + margen_px), min(y1, gy.max() + margen_px)
    a36, h36 = forma_1936[1], forma_1936[0]
    return (int(np.clip(np.floor(x0), 0, a36)), int(np.clip(np.floor(y0), 0, h36)),
            int(np.clip(np.ceil(x1) + 1, 0, a36)), int(np.clip(np.ceil(y1) + 1, 0, h36)))


def _malla_vuelta(calce, recorte, paso, factor_base, factor_viejo):
    """Coordenadas en el plano viejo (reducido 1/factor_viejo) de una malla gruesa del mosaico."""
    x0, y0, x1, y1 = recorte
    gx = np.arange(x0, x1 + paso, paso, dtype=float)
    gy = np.arange(y0, y1 + paso, paso, dtype=float)
    mx, my = np.meshgrid((gx + 0.5) * factor_base - 0.5, (gy + 0.5) * factor_base - 0.5)
    px, py = calce.al_viejo(mx, my)
    return ((px + 0.5) / factor_viejo - 0.5).astype(np.float32), ((py + 0.5) / factor_viejo - 0.5).astype(np.float32)


def remuestrear(imagen, calce, recorte, paso=16, factor_base=1, factor_viejo=1):
    """Lleva `imagen` (plano viejo reducido 1/factor_viejo) al mosaico reducido 1/factor_base.

    recorte en px del mosaico reducido. Devuelve (imagen deformada, máscara de lo que cae
    dentro del plano viejo).
    """
    x0, y0, x1, y1 = recorte
    gpx, gpy = _malla_vuelta(calce, recorte, paso, factor_base, factor_viejo)
    ancho, alto = x1 - x0, y1 - y0
    salida = np.zeros((alto, ancho) + imagen.shape[2:], imagen.dtype)
    dentro = np.zeros((alto, ancho), bool)
    cx = (np.arange(ancho, dtype=np.float32) / paso)[None, :]
    for f0 in range(0, alto, FILAS_POR_TESELA):
        f1 = min(alto, f0 + FILAS_POR_TESELA)
        cy = (np.arange(f0, f1, dtype=np.float32) / paso)[:, None]
        mx = np.ascontiguousarray(np.broadcast_to(cx, (f1 - f0, ancho)))
        my = np.ascontiguousarray(np.broadcast_to(cy, (f1 - f0, ancho)))
        px = cv2.remap(gpx, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        py = cv2.remap(gpy, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
        salida[f0:f1] = cv2.remap(imagen, px, py, cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT, borderValue=0)
        dentro[f0:f1] = (px >= 0) & (py >= 0) & (px <= imagen.shape[1] - 1) & (py <= imagen.shape[0] - 1)
    return salida, dentro


def deformar(viejo, calce, recorte, paso=16, mascara=None):
    """Lleva el plano viejo (RGB) a la grilla del mosaico dentro de recorte → RGBA uint8.

    mascara (bool, forma del plano viejo): lo que vale del plano; afuera queda alfa 0.
    """
    if mascara is not None:
        viejo = np.dstack([viejo, mascara.astype(np.uint8) * 255])
    salida, dentro = remuestrear(viejo, calce, recorte, paso)
    alfa = np.where(dentro, 255, 0).astype(np.uint8)
    if mascara is not None:
        alfa = np.where(salida[..., 3] >= 128, alfa, 0).astype(np.uint8)
    return np.dstack([salida[..., :3], alfa])


def mascara_marco(forma, marco=None, excluir=()):
    """Máscara del área útil del plano: dentro del marco [x0, y0, x1, y1] y fuera de excluir."""
    alto, ancho = forma
    if marco is None:
        mascara = np.ones((alto, ancho), bool)
    else:
        mascara = np.zeros((alto, ancho), bool)
        x0, y0, x1, y1 = marco
        mascara[max(0, y0):y1, max(0, x0):x1] = True
    for x0, y0, x1, y1 in excluir:
        mascara[max(0, y0):y1, max(0, x0):x1] = False
    return mascara


def superponer(base, rgba, opacidad=0.5):
    """Mezcla el RGBA del plano calzado sobre el RGB de 1936 (misma forma)."""
    a = rgba[..., 3:4].astype(np.float32) / 255.0 * opacidad
    out = base.astype(np.float32) * (1 - a) + rgba[..., :3].astype(np.float32) * a
    return np.clip(np.round(out), 0, 255).astype(np.uint8)


# --- calce iterativo --------------------------------------------------------------------------

def _enlaces_de_etapa(base, viejo, calce, etapa, contexto):
    """GCP automáticos de una etapa: correlación entre 1936 y el viejo llevado a 1936."""
    fb, fv, metro = contexto["factor_base"], contexto["factor_viejo"], contexto["metro"]
    m_por_px = metro * fb
    ventana = int(round(etapa["ventana_m"] / m_por_px))
    busqueda = int(round(etapa["busqueda_m"] / m_por_px))
    movil, dentro = remuestrear(viejo, calce, (0, 0, base.shape[1], base.shape[0]), 8, fb, fv)
    plaza = [(c + 0.5) / fb - 0.5 for c in contexto["plaza"]]
    puntos = malla(base.shape, etapa["paso_m"] / m_por_px, plaza, etapa["radio_m"] / m_por_px,
                   ventana + busqueda + 1)
    lleno = cv2.erode(dentro.astype(np.uint8), np.ones((2 * ventana + 1, 2 * ventana + 1), np.uint8))
    puntos = [p for p in puntos if lleno[int(p[1]), int(p[0])]]
    gcps = []
    for (mx, my), (bx, by), calidad in enlaces(base, movil, puntos, ventana, busqueda, etapa["calidad"]):
        px, py = calce.al_viejo(np.array([(mx + 0.5) * fb - 0.5]), np.array([(my + 0.5) * fb - 0.5]))
        gcps.append({"px": round(float(px[0]), 2), "py": round(float(py[0]), 2),
                     "x36": round((bx + 0.5) * fb - 0.5, 2), "y36": round((by + 0.5) * fb - 0.5, 2),
                     "manual": False, "nota": NOTA_AUTOMATICA.format(calidad=calidad)})
    return gcps


def calzar(base, viejo, manuales, contexto, etapas=ETAPAS_POR_OMISION):
    """Calce por etapas. base/viejo = callejidad reducida (1/factor_base, 1/factor_viejo).

    contexto: factor_base, factor_viejo, metro (m/px del mosaico), plaza (px del mosaico),
    umbral_residuo_m, suavizado. Devuelve (calce, gcps, quitados).
    """
    metro, suavizado = contexto["metro"], contexto.get("suavizado", 0.0)
    gcps, quitados = list(manuales), []
    calce = Calce.ajustar(gcps, metro)
    for etapa in etapas:
        automaticos = _enlaces_de_etapa(base, viejo, calce, etapa, contexto)
        gcps, quitados = depurar(list(manuales) + automaticos, metro, contexto["umbral_residuo_m"], suavizado)
        calce = Calce.ajustar(gcps, metro, suavizado)
    return calce, gcps, quitados


# --- programa -------------------------------------------------------------------------------

def leer_plano(ruta):
    """RGB uint8 del plano original (JPG, TIFF RGB o TIFF con paleta)."""
    ruta = Path(ruta)
    if ruta.suffix.lower() in (".tif", ".tiff"):
        import tifffile
        with tifffile.TiffFile(ruta) as t:
            pagina = t.pages[0]
            img = pagina.asarray()
            if img.ndim == 2 and pagina.colormap is not None:
                img = (pagina.colormap >> 8).astype(np.uint8).T[img]
        return img[..., :3] if img.ndim == 3 else np.repeat(img[..., None], 3, axis=2)
    img = cv2.imread(str(ruta), cv2.IMREAD_COLOR)
    if img is None:
        raise SystemExit(f"{ruta}: no se pudo leer")
    return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)


def reducir(img, factor):
    if factor == 1:
        return img
    alto, ancho = img.shape[:2]
    return cv2.resize(img, (ancho // factor, alto // factor), interpolation=cv2.INTER_AREA)


def manuales_de(config, config_1936):
    """GCP manuales: semillas (esquinas de la plaza, por índice) y anclas sueltas."""
    plaza_1936 = {(s["i"], s["j"]): s for s in config_1936["semillas"]}
    salida = []
    for s in config["semillas"]:
        b = plaza_1936[(s["i"], s["j"])]
        salida.append({"px": s["px"], "py": s["py"], "x36": b["px"], "y36": b["py"],
                       "manual": True, "nota": s["nota"]})
    return salida + [{**a, "manual": True} for a in config.get("anclas", [])]


def callejidad_1936(config_1936, raiz):
    clases = cv2.imread(str(raiz / config_1936["clases"]), cv2.IMREAD_UNCHANGED)
    if clases is None:
        raise SystemExit(f"{config_1936['clases']}: no se pudo leer (¿corriste segmentar.py?)")
    calle = reducir(np.isin(clases, config_1936["clases_calle"]).astype(np.float32), config_1936["factor"])
    return calle, clases.shape


def _guardar_qa(ruta, mosaico, rgba, recorte):
    x0, y0, x1, y1 = recorte
    base = np.ascontiguousarray(mosaico[y0:y1:ESCALA_QA, x0:x1:ESCALA_QA, :3])
    capa = np.ascontiguousarray(rgba[::ESCALA_QA, ::ESCALA_QA])
    mezcla = superponer(base, capa, 0.5)
    cv2.imwrite(str(ruta), cv2.cvtColor(mezcla, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 85])


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("carpeta", help="carpeta del plano en fuentes/mapas/")
    ap.add_argument("--raiz", type=Path, default=Path.cwd(),
                    help="checkout con fuentes/ (por omisión, el directorio actual)")
    a = ap.parse_args()
    raiz = a.raiz.resolve()
    ruta_config = GCP_DIR / f"calce-{a.carpeta}.json"
    config = json.loads(ruta_config.read_text())
    config_1936 = json.loads((GCP_DIR / "plaza-1936.json").read_text())
    meta = json.loads((raiz / "fuentes/derivados/1936/mosaico.json").read_text())
    rgb = leer_plano(next((raiz / "fuentes/mapas" / a.carpeta).glob("original.*")))
    base, forma_1936 = callejidad_1936(config_1936, raiz)
    mascara = mascara_marco(rgb.shape[:2], config.get("marco"), config.get("excluir", ()))
    viejo = callejidad(reducir(rgb, config["factor"]), config["perfil"])
    viejo = viejo * (reducir(mascara.astype(np.float32), config["factor"]) > 0.99)
    contexto = {"factor_base": config_1936["factor"], "factor_viejo": config["factor"],
                "metro": meta["metro"], "plaza": meta["plaza"],
                "umbral_residuo_m": config["umbral_residuo_m"], "suavizado": config.get("suavizado", 0.0)}
    calce, gcps, quitados = calzar(base, viejo, manuales_de(config, config_1936), contexto,
                                   config.get("etapas", ETAPAS_POR_OMISION))
    residuos = {**calce.residuos_m(), "descartados": len(quitados),
                "manuales": sum(1 for g in gcps if g["manual"])}
    config["gcps"] = [{**g, "loo_m": round(float(e), 2)} for g, e in zip(gcps, calce.errores_loo_m())]
    config["residuos_m"] = residuos
    ruta_config.write_text(json_legible(config))
    escribir_salidas(raiz, a.carpeta, config, calce, rgb, mascara, forma_1936, meta["metro"],
                     config_1936["mosaico"])


def json_legible(config):
    """JSON con un GCP por línea (diffs chicos y legibles)."""
    resto = {k: v for k, v in config.items() if k != "gcps"}
    texto = json.dumps(resto, ensure_ascii=False, indent=1)
    if "gcps" not in config:
        return texto + "\n"
    filas = ",\n".join("  " + json.dumps(g, ensure_ascii=False) for g in config["gcps"])
    return texto[:-2] + ',\n "gcps": [\n' + filas + "\n ]\n}\n"


def escribir_salidas(raiz, carpeta, config, calce, rgb, mascara, forma_1936, metro, ruta_mosaico):
    import tifffile
    recorte = cobertura(calce, rgb.shape[:2], forma_1936, config.get("margen_px"))
    rgba = deformar(rgb, calce, recorte, mascara=mascara)
    salida = raiz / "fuentes/derivados" / str(config["año"])
    salida.mkdir(parents=True, exist_ok=True)
    tifffile.imwrite(salida / "calzado.tif", rgba, compression="zlib", tile=(512, 512))
    (salida / "calzado.json").write_text(json.dumps(
        {"plano": carpeta, "año": config["año"], "metro": metro, "recorte": list(recorte),
         "residuos_m": config["residuos_m"]}, ensure_ascii=False, indent=1) + "\n")
    _guardar_qa(salida / "qa-calce.jpg", tifffile.imread(raiz / ruta_mosaico),
                rgba, recorte)
    r = config["residuos_m"]
    print(f"{carpeta}: {r['n']} GCP ({r['manuales']} manuales, {r['descartados']} descartados), "
          f"LOO rms {r['rms']} m, p90 {r['p90']} m, max {r['max']} m, recorte {recorte} → {salida}")


if __name__ == "__main__":
    main()
