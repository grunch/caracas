"""Modelo denso de la hoja: además de los cruces, usa los tramos de línea trazados.

Un punto de una línea vertical x = X solo fija la coordenada x en metros; uno de una horizontal,
la y. Por eso se ajusta la transformación INVERSA como dos campos escalares independientes
(píxel → x_m y píxel → y_m), cada uno con los cruces más las muestras de sus líneas, con TPS.
Así las líneas impresas quedan rectas también entre cruces y a ambos lados de los pliegues.
La transformación directa (metros → píxel), que es la que necesita el remuestreo, se obtiene
por Newton sobre los campos muestreados en una malla de la hoja, arrancando del TPS de cruces.
"""
import numpy as np
from scipy.interpolate import RBFInterpolator

from tps import ModeloTPS

ESCALA_PX = 1000.0
ITERACIONES_NEWTON = 8


# ---------------------------------------------------------------- muestras de las trazas

def _intervalos(grid_m, t_de, ext_min, ext_max):
    """Tramos [t0, t1] entre cruces vecinos válidos, más prolongaciones hasta ext_min/ext_max m."""
    tramos = []
    for a, b in zip(grid_m[:-1], grid_m[1:]):
        if a in t_de and b in t_de:
            tramos.append((min(t_de[a], t_de[b]), max(t_de[a], t_de[b])))
    for extremo, vecino, limite in ((grid_m[0], grid_m[1], ext_min), (grid_m[-1], grid_m[-2], ext_max)):
        if limite is None or extremo not in t_de or vecino not in t_de:
            continue
        dt_dm = (t_de[extremo] - t_de[vecino]) / (extremo - vecino)
        t_lim = t_de[extremo] + dt_dm * (limite - extremo)
        tramos.append((min(t_de[extremo], t_lim), max(t_de[extremo], t_lim)))
    return tramos


def _filtrar_traza(t, pos, snr, tramos, snr_min, tolerancia_px, cada):
    dentro = np.zeros(len(t), bool)
    for t0, t1 in tramos:
        dentro |= (t >= t0) & (t <= t1)
    usar = np.flatnonzero(dentro & (snr >= snr_min))
    if len(usar) < 3:
        return np.array([], int)
    medianas = np.array([np.median(pos[usar[max(i - 3, 0):i + 4]]) for i in range(len(usar))])
    usar = usar[np.abs(pos[usar] - medianas) < tolerancia_px]
    return usar[::cada]


def muestras_de_lineas(gcps, trazas_v, trazas_h, xs_m, ys_m, snr_min, extension_m,
                       cada=1, tolerancia_px=1.0):
    """Muestras {"eje", "x_m"|"y_m", "px", "py"} de las líneas entre cruces válidos.

    extension_m puede traer x_min/x_max (prolonga las horizontales más allá de la última
    vertical, p. ej. hasta el borde recortado de la hoja) e y_min/y_max (las verticales).
    """
    cruces = {(g["x_m"], g["y_m"]): (g["px"], g["py"]) for g in gcps}
    ys = sorted(ys_m)
    xs = sorted(xs_m)
    muestras = []
    for x, (t, pos, snr) in trazas_v.items():
        t_de = {y: cruces[(x, y)][1] for y in ys if (x, y) in cruces}
        tramos = _intervalos(ys, t_de, extension_m.get("y_min"), extension_m.get("y_max"))
        for i in _filtrar_traza(t, pos, snr, tramos, snr_min, tolerancia_px, cada):
            muestras.append({"eje": "v", "x_m": float(x), "px": float(pos[i]), "py": float(t[i])})
    for y, (t, pos, snr) in trazas_h.items():
        t_de = {x: cruces[(x, y)][0] for x in xs if (x, y) in cruces}
        tramos = _intervalos(xs, t_de, extension_m.get("x_min"), extension_m.get("x_max"))
        for i in _filtrar_traza(t, pos, snr, tramos, snr_min, tolerancia_px, cada):
            muestras.append({"eje": "h", "y_m": float(y), "px": float(t[i]), "py": float(pos[i])})
    return muestras


# ---------------------------------------------------------------- modelo

def _campo(puntos_px, valores, suavizado):
    return RBFInterpolator(puntos_px / ESCALA_PX, valores, kernel="thin_plate_spline",
                           smoothing=suavizado, degree=1)


def _bilineal(campo, x0, y0, paso, px, py):
    fx = np.clip((px - x0) / paso, 0, campo.shape[1] - 1.000001)
    fy = np.clip((py - y0) / paso, 0, campo.shape[0] - 1.000001)
    j, i = fx.astype(int), fy.astype(int)
    wx, wy = fx - j, fy - i
    arriba = campo[i, j] * (1 - wx) + campo[i, j + 1] * wx
    abajo = campo[i + 1, j] * (1 - wx) + campo[i + 1, j + 1] * wx
    return arriba * (1 - wy) + abajo * wy


class ModeloLineas:
    """Metros ⇄ píxeles de una hoja con cruces + tramos de línea (ver docstring del módulo)."""

    def __init__(self, cruces, campos, origen_malla, paso):
        self._cruces = cruces
        self._x_m, self._y_m = campos
        self._x0, self._y0 = origen_malla
        self._paso = paso
        self._grad = [np.gradient(c, paso) for c in campos]  # [d/dpy, d/dpx] por campo
        alto, ancho = self._x_m.shape
        self._limites = (self._x0, self._y0, self._x0 + (ancho - 1) * paso,
                         self._y0 + (alto - 1) * paso)

    @classmethod
    def ajustar(cls, gcps, muestras, forma, paso_px=32, margen_px=1500, suavizado=1e-4):
        if len(gcps) < 4:
            raise ValueError(f"el modelo de líneas necesita al menos 4 cruces; hay {len(gcps)}")
        cruces = ModeloTPS.ajustar(gcps)
        campos = []
        for eje, clave in (("v", "x_m"), ("h", "y_m")):
            puntos = [(g["px"], g["py"], g[clave]) for g in gcps]
            puntos += [(m["px"], m["py"], m[clave]) for m in muestras if m["eje"] == eje]
            p = np.asarray(puntos, float)
            campos.append(_campo(p[:, :2], p[:, 2], suavizado))
        alto, ancho = forma
        gx = np.arange(-margen_px, ancho + margen_px + paso_px, paso_px, dtype=float)
        gy = np.arange(-margen_px, alto + margen_px + paso_px, paso_px, dtype=float)
        mx, my = np.meshgrid(gx, gy)
        nodos = np.stack([mx.ravel(), my.ravel()], axis=1) / ESCALA_PX
        mallas = tuple(c(nodos).reshape(mx.shape) for c in campos)
        return cls(cruces, mallas, (gx[0], gy[0]), float(paso_px))

    def a_metros(self, px, py):
        px, py = np.asarray(px, float), np.asarray(py, float)
        args = (self._x0, self._y0, self._paso, px, py)
        return _bilineal(self._x_m, *args), _bilineal(self._y_m, *args)

    def _jacobiano(self, px, py):
        args = (self._x0, self._y0, self._paso, px, py)
        (dxy, dxx), (dyy, dyx) = self._grad
        return (_bilineal(dxx, *args), _bilineal(dxy, *args),
                _bilineal(dyx, *args), _bilineal(dyy, *args))

    def __call__(self, x_m, y_m):
        x_m, y_m = np.asarray(x_m, float), np.asarray(y_m, float)
        px, py = self._cruces(x_m, y_m)
        px, py = np.array(px, float), np.array(py, float)
        x0, y0, x1, y1 = self._limites
        en_malla = (px >= x0) & (px <= x1) & (py >= y0) & (py <= y1)
        for _ in range(ITERACIONES_NEWTON):
            ex, ey = self.a_metros(px[en_malla], py[en_malla])
            ex, ey = ex - x_m[en_malla], ey - y_m[en_malla]
            a, b, c, d = self._jacobiano(px[en_malla], py[en_malla])
            det = a * d - b * c
            px[en_malla] -= (d * ex - b * ey) / det
            py[en_malla] -= (a * ey - c * ex) / det
        return px, py

    def a_pixeles(self, x_m, y_m):
        return self(x_m, y_m)

    def px_por_metro(self):
        return self._cruces.px_por_metro()

    def residuos_loo(self):
        """LOO conservador: el de los cruces con el TPS solo de cruces (sin las líneas)."""
        return self._cruces.residuos_loo()
