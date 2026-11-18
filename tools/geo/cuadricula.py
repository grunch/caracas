"""Detección de las intersecciones de la cuadrícula métrica impresa en una hoja escaneada.

Método: a partir de unas pocas semillas etiquetadas (esquinas leídas a ojo) se predice el
recorrido de cada línea de la cuadrícula; cada línea se traza a resolución completa con
programación dinámica sobre la respuesta de "línea fina oscura" (black-hat orientado sobre el
canal máximo, que apaga las tintas rojas, naranjas y verdes); las intersecciones salen de
cortar los ajustes rectos locales de la línea vertical y la horizontal. Se hacen dos pasadas:
la segunda usa un TPS de la primera como predicción y un radio de búsqueda pequeño.

Uso:
  python tools/geo/cuadricula.py --semillas tools/geo/gcp/semillas-1936.json --hoja 1936-hoja1
"""
import argparse
import json
import sys
from pathlib import Path

import cv2
import numpy as np

from tps import ModeloTPS

RAIZ = Path(__file__).resolve().parents[2]
NUM_TERMINOS = {1: 3, 2: 6, 3: 10}


# ---------------------------------------------------------------- acceso a la hoja

class HojaEnMemoria:
    """Hoja RGB uint8 en memoria (o memmap). `leer` recorta y rellena con papel fuera."""

    def __init__(self, pixeles, borde_fondo_px=0):
        if pixeles.ndim != 3 or pixeles.shape[2] != 3 or pixeles.dtype != np.uint8:
            raise ValueError("se esperaba una imagen RGB uint8 (alto, ancho, 3)")
        self.pixeles = pixeles
        self.forma = pixeles.shape[:2]
        # franja junto a los bordes donde el blanco puro es cama del escáner, no papel
        self.borde_fondo_px = int(borde_fondo_px)

    def leer(self, y0, y1, x0, x1, relleno=255):
        """Ventana [y0:y1, x0:x1] (enteros, puede salirse de la hoja) como array propio."""
        alto, ancho = self.forma
        salida = np.full((y1 - y0, x1 - x0, 3), relleno, np.uint8)
        ya, yb, xa, xb = max(y0, 0), min(y1, alto), max(x0, 0), min(x1, ancho)
        if ya < yb and xa < xb:
            salida[ya - y0:yb - y0, xa - x0:xb - x0] = self.pixeles[ya:yb, xa:xb]
        return salida


class HojaTiff(HojaEnMemoria):
    """TIFF RGB sin comprimir abierto como memmap de solo lectura (no se modifica nunca)."""

    def __init__(self, ruta, borde_fondo_px=0):
        import tifffile
        super().__init__(tifffile.memmap(str(ruta), mode="r"), borde_fondo_px)


# ---------------------------------------------------------------- modelo polinómico

def _terminos(x, y, grado):
    columnas = [np.ones_like(x)]
    for g in range(1, grado + 1):
        for i in range(g + 1):
            columnas.append(x ** (g - i) * y ** i)
    return np.stack(columnas, axis=-1)


class ModeloPolinomico:
    """Polinomio 2D metros → píxeles (grado 1 = afín), por mínimos cuadrados."""

    def __init__(self, coef, centro, grado):
        self.coef, self.centro, self.grado = coef, centro, grado

    @classmethod
    def ajustar(cls, gcps, grado=1):
        necesarios = NUM_TERMINOS[grado]
        if len(gcps) < necesarios:
            raise ValueError(f"el polinomio de grado {grado} necesita al menos {necesarios} "
                             f"puntos; hay {len(gcps)}")
        xy = np.array([[g["x_m"], g["y_m"]] for g in gcps], float)
        pxy = np.array([[g["px"], g["py"]] for g in gcps], float)
        centro = xy.mean(axis=0)
        a = _terminos(*((xy - centro) / 1000.0).T, grado)
        coef, *_ = np.linalg.lstsq(a, pxy, rcond=None)
        return cls(coef, centro, grado)

    def __call__(self, x_m, y_m):
        x = (np.asarray(x_m, float) - self.centro[0]) / 1000.0
        y = (np.asarray(y_m, float) - self.centro[1]) / 1000.0
        pxy = _terminos(x, y, self.grado) @ self.coef
        return pxy[..., 0], pxy[..., 1]


# ---------------------------------------------------------------- respuesta y trazado

def respuesta_lineas(rgb, ancho_kernel=9):
    """Realce de líneas finas oscuras verticales (en filas = a lo largo de la línea).

    Canal máximo (las tintas de color quedan claras), luego black-hat con elemento
    horizontal 1×k: solo responde a trazos oscuros más estrechos que k en horizontal.
    """
    maximo = rgb.max(axis=2)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (ancho_kernel, 1))
    return cv2.morphologyEx(maximo, cv2.MORPH_BLACKHAT, kernel).astype(np.float32)


def trazar_camino(perfiles, paso_max=2, penalizacion=0.2, tope=5.0):
    """Camino de máxima respuesta (programación dinámica) a través de bloques sucesivos.

    perfiles: (K, O) respuesta normalizada por bloque y desplazamiento. Entre bloques el
    desplazamiento cambia como mucho `paso_max`, con coste `penalizacion`·|salto|.
    """
    puntaje = np.minimum(perfiles, tope)
    k_total, o_total = puntaje.shape
    acumulado = puntaje[0].copy()
    origen = np.zeros((k_total, o_total), np.int32)
    indices = np.arange(o_total)
    for k in range(1, k_total):
        mejor = np.full(o_total, -np.inf)
        mejor_de = np.zeros(o_total, np.int32)
        for d in range(-paso_max, paso_max + 1):
            previo = indices - d
            validos = (previo >= 0) & (previo < o_total)
            candidato = np.full(o_total, -np.inf)
            candidato[validos] = acumulado[previo[validos]] - penalizacion * abs(d)
            mejora = candidato > mejor
            mejor[mejora] = candidato[mejora]
            mejor_de[mejora] = previo[mejora]
        acumulado = mejor + puntaje[k]
        origen[k] = mejor_de
    camino = np.empty(k_total, np.int32)
    camino[-1] = int(np.argmax(acumulado))
    for k in range(k_total - 1, 0, -1):
        camino[k - 1] = origen[k, camino[k]]
    return camino


def _normalizar_bloques(bloques):
    mediana = np.median(bloques, axis=1, keepdims=True)
    centrados = bloques - mediana
    mad = 1.4826 * np.median(np.abs(centrados), axis=1, keepdims=True)
    piso = max(float(np.median(mad)) * 0.5, 1e-3)
    return centrados / np.maximum(mad, piso)


def _subpixel(fila, j, semiancho=3):
    """Corrección subpíxel respecto a j: centroide del trazo alrededor del máximo local.

    El camino de la programación dinámica usa la respuesta topada, así que j puede caer en
    el hombro del trazo: primero se sube al máximo sin topar cercano. El trazo impreso tiene
    2-4 px con techo plano (una parábola sesga hacia un borde); se usa el centroide de lo que
    supera la mitad del máximo, para no arrastrar tintas vecinas más débiles.
    """
    a, b = max(j - semiancho, 0), min(j + semiancho + 1, len(fila))
    pico = a + int(np.argmax(fila[a:b]))
    a, b = max(pico - semiancho, 0), min(pico + semiancho + 1, len(fila))
    tramo = fila[a:b]
    pesos = np.where(tramo >= 0.5 * fila[pico], tramo, 0.0)
    total = pesos.sum()
    if total <= 0:
        return 0.0
    return float((pesos * np.arange(a, b)).sum() / total - j)


def trazar_linea(hoja, prevista, eje, t0, t1, radio, bloque, ancho_kernel):
    """Traza una línea de la cuadrícula. eje 'v': t = fila, pos = columna; 'h' al revés.

    prevista(t) → posición prevista. Devuelve (t_centros, pos, snr) por bloque.
    """
    k_total = max((t1 - t0) // bloque, 1)
    t_centros = t0 + np.arange(k_total) * bloque + (bloque - 1) / 2.0
    centros = np.round(prevista(t_centros)).astype(int)
    margen = radio + ancho_kernel
    p0, p1 = int(centros.min()) - margen, int(centros.max()) + margen + 1
    tira = _leer_tira(hoja, eje, t0, t0 + k_total * bloque, p0, p1)
    resp = respuesta_lineas(tira, ancho_kernel)
    bloques = resp.reshape(k_total, bloque, -1).mean(axis=1)
    norm = _normalizar_bloques(bloques)
    desplaz = np.arange(-radio, radio + 1)
    columnas = (centros - p0)[:, None] + desplaz[None, :]
    perfiles = np.take_along_axis(norm, columnas, axis=1)
    camino = trazar_camino(perfiles)
    pos = np.array([centros[k] + desplaz[j] + _subpixel(perfiles[k], j)
                    for k, j in enumerate(camino)])
    snr = perfiles[np.arange(k_total), camino]
    return t_centros, pos, snr


def _leer_tira(hoja, eje, t0, t1, p0, p1):
    if eje == "v":
        return hoja.leer(t0, t1, p0, p1)
    if eje == "h":
        return np.ascontiguousarray(hoja.leer(p0, p1, t0, t1).transpose(1, 0, 2))
    raise ValueError(f"eje desconocido: {eje!r}")


# ---------------------------------------------------------------- intersecciones

def interseccion_rectas(vertical, horizontal):
    """vertical: x = a + b·y ; horizontal: y = c + d·x  →  (x, y)."""
    a, b = vertical
    c, d = horizontal
    x = (a + b * c) / (1.0 - b * d)
    return x, c + d * x


def _recta_local(t, pos, snr, t_centro, ventana, snr_min, minimo_bloques):
    """Ajuste robusto pos = a + b·t cerca de t_centro; None si no hay línea visible."""
    cerca = (np.abs(t - t_centro) <= ventana) & (snr >= snr_min)
    if cerca.sum() < minimo_bloques:
        return None
    usar = _consenso_recta(t[cerca], pos[cerca], tolerancia=1.0)
    if usar.sum() < minimo_bloques:
        return None
    b, a = np.polyfit(t[cerca][usar], pos[cerca][usar], 1)
    return a, b


def _consenso_recta(t, pos, tolerancia):
    """Máscara de inliers de la recta (definida por dos bloques) con más apoyos (RANSAC
    exhaustivo). Los bloques donde el trazado se fue a un estorbo no son colineales."""
    n = len(t)
    i, j = np.triu_indices(n, k=1)
    validos = t[j] != t[i]
    i, j = i[validos], j[validos]
    if len(i) == 0:
        return np.zeros(n, bool)
    pendiente = (pos[j] - pos[i]) / (t[j] - t[i])
    ordenada = pos[i] - pendiente * t[i]
    residuos = np.abs(pos[None, :] - (ordenada[:, None] + pendiente[:, None] * t[None, :]))
    apoyos = residuos < tolerancia
    puntaje = apoyos.sum(axis=1) - 1e-3 * np.where(apoyos, residuos, 0).sum(axis=1)
    return apoyos[int(np.argmax(puntaje))]


def _intersecar(traza_v, traza_h, punto, ventana, snr_min, minimo_bloques):
    x, y = punto
    for _ in range(2):
        rv = _recta_local(*traza_v, y, ventana, snr_min, minimo_bloques)
        rh = _recta_local(*traza_h, x, ventana, snr_min, minimo_bloques)
        if rv is None or rh is None:
            return None
        x, y = interseccion_rectas(rv, rh)
    return x, y


def _prevista_linea(modelo, eje, valor_m, rango_m):
    """Función t → pos prevista para la línea x = valor_m (eje 'v') o y = valor_m ('h')."""
    muestras = np.linspace(rango_m[0], rango_m[1], 400)
    if eje == "v":
        px, py = modelo(np.full_like(muestras, valor_m), muestras)
        t, pos = py, px
    else:
        px, py = modelo(muestras, np.full_like(muestras, valor_m))
        t, pos = px, py
    orden = np.argsort(t)
    return lambda tt: np.interp(tt, t[orden], pos[orden])


def _una_pasada(hoja, modelo, xs_m, ys_m, radio, bloque, ventana, ancho_kernel, snr_min):
    margen_m = 0.25 * max(max(xs_m) - min(xs_m), max(ys_m) - min(ys_m))
    rango_y = (min(ys_m) - margen_m, max(ys_m) + margen_m)
    rango_x = (min(xs_m) - margen_m, max(xs_m) + margen_m)
    extra = ventana + 2 * bloque
    trazas_v, trazas_h = {}, {}
    for x in xs_m:
        _, py = modelo(np.array([x, x]), np.array([max(ys_m), min(ys_m)]))
        t0, t1 = int(py.min()) - extra, int(py.max()) + extra
        trazas_v[x] = trazar_linea(hoja, _prevista_linea(modelo, "v", x, rango_y), "v",
                                   t0, t1, radio, bloque, ancho_kernel)
    for y in ys_m:
        px, _ = modelo(np.array([min(xs_m), max(xs_m)]), np.array([y, y]))
        t0, t1 = int(px.min()) - extra, int(px.max()) + extra
        trazas_h[y] = trazar_linea(hoja, _prevista_linea(modelo, "h", y, rango_x), "h",
                                   t0, t1, radio, bloque, ancho_kernel)
    minimo = max(3, int(0.3 * ventana / bloque))
    gcps = []
    for x in xs_m:
        for y in ys_m:
            punto = tuple(float(v[0]) for v in modelo(np.array([x]), np.array([y])))
            cruce = _intersecar(trazas_v[x], trazas_h[y], punto, ventana, snr_min, minimo)
            if cruce is not None:
                gcps.append({"x_m": float(x), "y_m": float(y),
                             "px": float(cruce[0]), "py": float(cruce[1])})
    return gcps, trazas_v, trazas_h


def detectar_cuadricula(hoja, semillas, xs_m, ys_m, radio=160, bloque=48, ventana=400,
                        ancho_kernel=9, snr_min=4.0, umbral_atipico_px=None,
                        devolver_muestras=False, extension_m=None, excluir=()):
    """Intersecciones de la cuadrícula visibles en la hoja, en píxeles de resolución completa.

    Con devolver_muestras=True devuelve además muestras de los tramos de línea trazados
    (ver lineas.muestras_de_lineas), que sirven para ajustar el modelo denso. `excluir` son
    pares (x_m, y_m) vetados a mano (p. ej. bajo el cajetín): no salen ni limitan tramos.
    """
    modelo = ModeloPolinomico.ajustar(semillas, grado=1)
    gcps, _, _ = _una_pasada(hoja, modelo, xs_m, ys_m, radio, bloque, ventana, ancho_kernel,
                             snr_min)
    if len(gcps) < 4:
        raise RuntimeError(f"primera pasada: solo {len(gcps)} intersecciones; revisar semillas")
    umbral = umbral_atipico_px or radio / 4.0
    gcps, _ = descartar_atipicos(gcps, umbral_px=umbral)
    modelo = ModeloTPS.ajustar(gcps, suavizado=1e-3)
    radio_fino = max(8, radio // 5)
    gcps, trazas_v, trazas_h = _una_pasada(hoja, modelo, xs_m, ys_m, radio_fino, bloque, ventana,
                                           ancho_kernel, snr_min)
    vetados = {(float(x), float(y)) for x, y in excluir}
    gcps = [g for g in gcps if (g["x_m"], g["y_m"]) not in vetados]
    if not devolver_muestras:
        return gcps
    from lineas import muestras_de_lineas
    muestras = muestras_de_lineas(gcps, trazas_v, trazas_h, xs_m, ys_m, snr_min,
                                  extension_m or {})
    return gcps, muestras


# ---------------------------------------------------------------- limpieza y E/S

def descartar_atipicos(gcps, umbral_px):
    """Quita, de uno en uno y empezando por el peor, los GCP cuyo residuo LOO supera el umbral."""
    limpios, descartados = list(gcps), []
    while len(limpios) > 5:
        residuos = ModeloTPS.ajustar(limpios).residuos_loo()
        peor = int(np.argmax(residuos))
        if residuos[peor] <= umbral_px:
            break
        descartados.append({**limpios[peor], "residuo_loo_px": float(residuos[peor])})
        limpios = limpios[:peor] + limpios[peor + 1:]
    return limpios, descartados


def guardar_gcps(ruta, gcps):
    ordenados = sorted(gcps, key=lambda g: (-g["y_m"], g["x_m"]))
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    Path(ruta).write_text(json.dumps(ordenados, ensure_ascii=False, indent=1) + "\n")


def _rango(desde, hasta, paso=500.0):
    return [float(v) for v in np.arange(desde, hasta + paso / 2, paso)]


def main(argv=None):
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    p.add_argument("--semillas", required=True, help="JSON de semillas por hoja")
    p.add_argument("--hoja", required=True, help="clave de la hoja en el JSON de semillas")
    p.add_argument("--salida", help="JSON de GCP (por defecto tools/geo/gcp/<hoja>.json)")
    args = p.parse_args(argv)
    config = json.loads(Path(args.semillas).read_text())
    if args.hoja not in config:
        raise SystemExit(f"la hoja {args.hoja!r} no está en {args.semillas}")
    conf = config[args.hoja]
    hoja = HojaTiff(RAIZ / conf["original"])
    xs_m, ys_m = _rango(*conf["x_m"]), _rango(*conf["y_m"])
    gcps, muestras = detectar_cuadricula(hoja, conf["semillas"], xs_m, ys_m,
                                         devolver_muestras=True,
                                         extension_m=conf.get("extension_lineas_m"),
                                         excluir=conf.get("excluir", []),
                                         **conf.get("parametros", {}))
    gcps = _aplicar_manuales(gcps, conf)
    gcps, descartados = descartar_atipicos(gcps, umbral_px=conf.get("umbral_atipico_px", 6.0))
    salida = Path(args.salida or Path(__file__).parent / "gcp" / f"{args.hoja}.json")
    guardar_gcps(salida, gcps)
    ruta_lineas = salida.with_name(salida.stem + "-lineas.json")
    ruta_lineas.write_text(json.dumps(muestras, ensure_ascii=False) + "\n")
    print(f"{args.hoja}: {len(gcps)} GCP → {salida}; {len(muestras)} muestras de línea → "
          f"{ruta_lineas}; descartados {len(descartados)}:", file=sys.stderr)
    for d in descartados:
        print(f"  ({d['x_m']:.0f}, {d['y_m']:.0f}) LOO {d['residuo_loo_px']:.1f} px",
              file=sys.stderr)


def _aplicar_manuales(gcps, conf):
    """Añade los cruces leídos a mano (marcados "manual": true), que mandan sobre los automáticos."""
    manuales = [{**m, "manual": True} for m in conf.get("manuales", [])]
    claves_manuales = {(m["x_m"], m["y_m"]) for m in manuales}
    automaticos = [g for g in gcps if (g["x_m"], g["y_m"]) not in claves_manuales]
    return automaticos + manuales


if __name__ == "__main__":
    main()
