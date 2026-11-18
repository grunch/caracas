"""Control de calidad del mosaico: re-medición de la cuadrícula y lámina visual de recortes."""
import cv2
import numpy as np

import cuadricula as cu

COLOR_IDEAL = (0, 170, 255)  # RGB: línea ideal discontinua, cian anaranjado sobre el papel
TRAZO_PX, HUECO_PX = 7, 7


def verificar_cuadricula(imagen, rejilla, xs_m, ys_m, espaciado_m=500.0, snr_min=4.0):
    """Vuelve a detectar la cuadrícula en el ráster ya rectificado y la compara con la ideal.

    Devuelve los residuos de las intersecciones (m) y la máxima separación entre cada línea
    trazada y su recta ideal a lo largo de todo su recorrido (m), que mide también el ajuste
    entre GCP y en las costuras.
    """
    hoja = cu.HojaEnMemoria(imagen)
    metro = rejilla.metro
    bloque = max(8, int(round(0.06 * espaciado_m / metro)))
    ventana = int(round(0.25 * espaciado_m / metro))
    radio = max(6, int(round(5.0 / metro)))
    semillas = _semillas_ideales(rejilla, xs_m, ys_m)
    gcps = cu.detectar_cuadricula(hoja, semillas, xs_m, ys_m, radio=radio * 5, bloque=bloque,
                                  ventana=ventana, snr_min=snr_min)
    errores = []
    for g in gcps:
        c, f = rejilla.pixeles(g["x_m"], g["y_m"])
        errores.append(float(np.hypot(g["px"] - c, g["py"] - f)) * metro)
    desvios = _desvios_lineas(hoja, rejilla, xs_m, ys_m, radio, bloque, snr_min)
    errores = np.asarray(errores) if errores else np.zeros(1)
    return {"n": len(gcps), "rms_m": round(float(np.sqrt(np.mean(errores ** 2))), 3),
            "max_m": round(float(errores.max()), 3),
            "desvio_lineas_p95_m": round(float(np.percentile(desvios, 95)), 3),
            "desvio_lineas_max_m": round(float(desvios.max()), 3)}


def _semillas_ideales(rejilla, xs_m, ys_m):
    semillas = []
    for x in (min(xs_m), max(xs_m)):
        for y in (min(ys_m), max(ys_m)):
            c, f = rejilla.pixeles(x, y)
            semillas.append({"x_m": x, "y_m": y, "px": float(c), "py": float(f)})
    return semillas


def _desvios_lineas(hoja, rejilla, xs_m, ys_m, radio, bloque, snr_min):
    desvios = []
    y_arriba, y_abajo = rejilla.pixeles(0, max(ys_m))[1], rejilla.pixeles(0, min(ys_m))[1]
    x_izq, x_der = rejilla.pixeles(min(xs_m), 0)[0], rejilla.pixeles(max(xs_m), 0)[0]
    for x in xs_m:
        c = float(rejilla.pixeles(x, 0)[0])
        t, pos, snr = cu.trazar_linea(hoja, lambda tt, c=c: np.full_like(tt, c), "v",
                                      int(y_arriba), int(y_abajo), radio, bloque, 9)
        desvios.extend(np.abs(pos - c)[snr >= snr_min])
    for y in ys_m:
        f = float(rejilla.pixeles(0, y)[1])
        t, pos, snr = cu.trazar_linea(hoja, lambda tt, f=f: np.full_like(tt, f), "h",
                                      int(x_izq), int(x_der), radio, bloque, 9)
        desvios.extend(np.abs(pos - f)[snr >= snr_min])
    return np.asarray(desvios if desvios else [0.0]) * rejilla.metro


# ---------------------------------------------------------------- lámina visual

def _discontinua(img, p, q):
    p, q = np.asarray(p, float), np.asarray(q, float)
    largo = float(np.hypot(*(q - p)))
    if largo == 0:
        return
    u = (q - p) / largo
    for s in np.arange(0, largo, TRAZO_PX + HUECO_PX):
        a, b = p + u * s, p + u * min(s + TRAZO_PX, largo)
        cv2.line(img, tuple(int(v) for v in np.round(a * 16)), tuple(int(v) for v in np.round(b * 16)),
                 COLOR_IDEAL, 1, cv2.LINE_AA, shift=4)


def recorte_con_cuadricula(imagen, rejilla, centro_m, lado_m, espaciado_m=500.0, zoom=1.5):
    """Recorte centrado en centro_m con las líneas ideales de la cuadrícula en discontinuo."""
    c, f = (float(v) for v in rejilla.pixeles(*centro_m))
    medio = int(round(lado_m / rejilla.metro / 2))
    c0, f0 = int(round(c)) - medio, int(round(f)) - medio
    recorte = cu.HojaEnMemoria(imagen).leer(f0, f0 + 2 * medio, c0, c0 + 2 * medio)
    recorte = cv2.resize(recorte, None, fx=zoom, fy=zoom, interpolation=cv2.INTER_CUBIC)
    x_m0, y_m1 = rejilla.metros(c0 - 0.5, f0 - 0.5)
    x_m1, y_m0 = rejilla.metros(c0 + 2 * medio - 0.5, f0 + 2 * medio - 0.5)
    lado = recorte.shape[0]
    for x in np.arange(np.ceil(x_m0 / espaciado_m), np.floor(x_m1 / espaciado_m) + 1) * espaciado_m:
        u = (float(rejilla.pixeles(x, 0)[0]) - c0 + 0.5) * zoom - 0.5
        _discontinua(recorte, (u, 0), (u, lado))
    for y in np.arange(np.ceil(y_m0 / espaciado_m), np.floor(y_m1 / espaciado_m) + 1) * espaciado_m:
        v = (float(rejilla.pixeles(0, y)[1]) - f0 + 0.5) * zoom - 0.5
        _discontinua(recorte, (0, v), (lado, v))
    return recorte


def lamina_cuadricula(imagen, rejilla, lugares, ruta, columnas=3, zoom=1.5):
    """JPEG con un recorte por lugar ({"nombre", "centro_m", "lado_m"}) y su rótulo."""
    if not lugares:
        raise ValueError("no hay lugares para la lámina de QA")
    recortes = []
    for lugar in lugares:
        r = recorte_con_cuadricula(imagen, rejilla, lugar["centro_m"], lugar["lado_m"], zoom=zoom)
        r = cv2.copyMakeBorder(r, 34, 6, 6, 6, cv2.BORDER_CONSTANT, value=(255, 255, 255))
        x, y = lugar["centro_m"]
        cv2.putText(r, f"{lugar['nombre']}  ({x:+.0f}, {y:+.0f}) m", (8, 24),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (20, 20, 20), 2, cv2.LINE_AA)
        recortes.append(r)
    alto = max(r.shape[0] for r in recortes)
    ancho = max(r.shape[1] for r in recortes)
    recortes = [cv2.copyMakeBorder(r, 0, alto - r.shape[0], 0, ancho - r.shape[1],
                                   cv2.BORDER_CONSTANT, value=(255, 255, 255)) for r in recortes]
    while len(recortes) % columnas:
        recortes.append(np.full_like(recortes[0], 255))
    filas = [np.hstack(recortes[i:i + columnas]) for i in range(0, len(recortes), columnas)]
    cv2.imwrite(str(ruta), cv2.cvtColor(np.vstack(filas), cv2.COLOR_RGB2BGR),
                [cv2.IMWRITE_JPEG_QUALITY, 90])
