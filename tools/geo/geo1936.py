"""El plano DCN 1936 en el mundo: píxel del mosaico ⇄ cuadrícula impresa ⇄ UTM 19N ⇄ WGS84.

- Mosaico: 0,5 m/px, píxel (0, 0) = cuadrícula (-2900, +3700) m; x al este, y al norte.
- Cuadrícula ⇄ UTM 19N (EPSG:32619): similitud o afín ajustada con puntos de control de OSM
  (tools/geo/gcp/1936-wgs84.json, generado por gcp1936.py).
- UTM ⇄ WGS84: serie de Krüger (Karney 2011) hasta n⁴: error < 1 mm en la zona; sin pyproj.
"""
import json
from pathlib import Path

import numpy as np

METRO_PX = 0.5
ORIGEN_M = (-2900.0, 3700.0)
RUTA_GCP = Path(__file__).resolve().parent / "gcp" / "1936-wgs84.json"

# --- UTM (WGS84) ---------------------------------------------------------------------------
_A = 6378137.0
_F = 1 / 298.257223563
_K0 = 0.9996
_FALSO_ESTE = 500000.0
_N = _F / (2 - _F)
_A_RECT = _A / (1 + _N) * (1 + _N**2 / 4 + _N**4 / 64)
_ALFA = (_N / 2 - 2 * _N**2 / 3 + 5 * _N**3 / 16 + 41 * _N**4 / 180,
         13 * _N**2 / 48 - 3 * _N**3 / 5 + 557 * _N**4 / 1440,
         61 * _N**3 / 240 - 103 * _N**4 / 140,
         49561 * _N**4 / 161280)
_BETA = (_N / 2 - 2 * _N**2 / 3 + 37 * _N**3 / 96 - _N**4 / 360,
         _N**2 / 48 + _N**3 / 15 - 437 * _N**4 / 1440,
         17 * _N**3 / 480 - 37 * _N**4 / 840,
         4397 * _N**4 / 161280)
_E = np.sqrt(_F * (2 - _F))


def _meridiano_central(zona):
    return np.deg2rad(-183.0 + 6.0 * zona)


def wgs84_a_utm(lat, lon, zona=19):
    """Grados → (E, N) en metros, hemisferio norte."""
    fi = np.deg2rad(np.asarray(lat, dtype=float))
    dl = np.deg2rad(np.asarray(lon, dtype=float)) - _meridiano_central(zona)
    t = np.sinh(np.arctanh(np.sin(fi)) - _E * np.arctanh(_E * np.sin(fi)))
    xi_ = np.arctan2(t, np.cos(dl))
    eta_ = np.arctanh(np.sin(dl) / np.sqrt(1 + t * t))
    xi, eta = xi_.copy(), eta_.copy()
    for j, a in enumerate(_ALFA, start=1):
        xi = xi + a * np.sin(2 * j * xi_) * np.cosh(2 * j * eta_)
        eta = eta + a * np.cos(2 * j * xi_) * np.sinh(2 * j * eta_)
    return _FALSO_ESTE + _K0 * _A_RECT * eta, _K0 * _A_RECT * xi


def utm_a_wgs84(e, n, zona=19):
    """(E, N) en metros → (lat, lon) en grados, hemisferio norte."""
    xi = np.asarray(n, dtype=float) / (_K0 * _A_RECT)
    eta = (np.asarray(e, dtype=float) - _FALSO_ESTE) / (_K0 * _A_RECT)
    xi_, eta_ = xi.copy(), eta.copy()
    for j, b in enumerate(_BETA, start=1):
        xi_ = xi_ - b * np.sin(2 * j * xi) * np.cosh(2 * j * eta)
        eta_ = eta_ - b * np.cos(2 * j * xi) * np.sinh(2 * j * eta)
    chi = np.arcsin(np.sin(xi_) / np.cosh(eta_))
    fi = chi.copy()
    for _ in range(6):  # punto fijo: converge en 3-4 vueltas
        fi = np.arcsin(np.tanh(np.arctanh(np.sin(chi)) + _E * np.arctanh(_E * np.sin(fi))))
    dl = np.arctan2(np.sinh(eta_), np.cos(xi_))
    return np.rad2deg(fi), np.rad2deg(dl + _meridiano_central(zona))


# --- píxel del mosaico ⇄ cuadrícula ---------------------------------------------------------
def px_a_grid(px, py):
    return ORIGEN_M[0] + np.asarray(px, dtype=float) * METRO_PX, ORIGEN_M[1] - np.asarray(py, dtype=float) * METRO_PX


def grid_a_px(x, y):
    return (np.asarray(x, dtype=float) - ORIGEN_M[0]) / METRO_PX, (ORIGEN_M[1] - np.asarray(y, dtype=float)) / METRO_PX


# --- cuadrícula ⇄ UTM -----------------------------------------------------------------------
_MINIMO = {"similitud": 2, "afin": 3}


def ajustar(grid, utm, modelo="similitud"):
    """Mínimos cuadrados cuadrícula (N×2) → UTM (N×2). Devuelve un dict serializable."""
    if modelo not in _MINIMO:
        raise ValueError(f"modelo desconocido: {modelo}")
    grid = np.asarray(grid, dtype=float)
    utm = np.asarray(utm, dtype=float)
    if len(grid) < _MINIMO[modelo] or len(grid) != len(utm):
        raise ValueError(f"el modelo {modelo} necesita al menos {_MINIMO[modelo]} puntos pareados")
    centro = grid.mean(axis=0)
    g = grid - centro
    if modelo == "similitud":
        # E = a·x − b·y + tx ; N = b·x + a·y + ty
        filas_e = np.c_[g[:, 0], -g[:, 1], np.ones(len(g)), np.zeros(len(g))]
        filas_n = np.c_[g[:, 1], g[:, 0], np.zeros(len(g)), np.ones(len(g))]
        a, b, tx, ty = np.linalg.lstsq(np.r_[filas_e, filas_n], np.r_[utm[:, 0], utm[:, 1]], rcond=None)[0]
        matriz = [[a, -b], [b, a]]
    else:
        m = np.c_[g, np.ones(len(g))]
        coef = np.linalg.lstsq(m, utm, rcond=None)[0]
        matriz = coef[:2].T.tolist()
        tx, ty = coef[2]
    matriz = np.asarray(matriz, dtype=float)
    return {
        "modelo": modelo,
        "centro_grid": centro.tolist(),
        "matriz": matriz.tolist(),
        "traslacion": [float(tx), float(ty)],
        "escala": float(np.sqrt(abs(np.linalg.det(matriz)))),
        "rotacion_grados": float(np.rad2deg(np.arctan2(matriz[1, 0], matriz[0, 0]))),
    }


def grid_a_utm(x, y, t):
    m = np.asarray(t["matriz"])
    cx, cy = t["centro_grid"]
    gx = np.asarray(x, dtype=float) - cx
    gy = np.asarray(y, dtype=float) - cy
    return m[0, 0] * gx + m[0, 1] * gy + t["traslacion"][0], m[1, 0] * gx + m[1, 1] * gy + t["traslacion"][1]


def utm_a_grid(e, n, t):
    inv = np.linalg.inv(np.asarray(t["matriz"]))
    de = np.asarray(e, dtype=float) - t["traslacion"][0]
    dn = np.asarray(n, dtype=float) - t["traslacion"][1]
    cx, cy = t["centro_grid"]
    return inv[0, 0] * de + inv[0, 1] * dn + cx, inv[1, 0] * de + inv[1, 1] * dn + cy


def grid_a_wgs84(x, y, t):
    return utm_a_wgs84(*grid_a_utm(x, y, t))


def wgs84_a_grid(lat, lon, t):
    return utm_a_grid(*wgs84_a_utm(lat, lon), t)


def residuos(grid, utm, t):
    e, n = grid_a_utm(np.asarray(grid)[:, 0], np.asarray(grid)[:, 1], t)
    d = np.hypot(e - np.asarray(utm)[:, 0], n - np.asarray(utm)[:, 1])
    return {"n": len(d), "rms_m": float(np.sqrt(np.mean(d**2))), "max_m": float(d.max()),
            "por_punto_m": [round(float(v), 2) for v in d]}


def dejando_uno_fuera(grid, utm, modelo="similitud"):
    """Error de cada punto predicho por el ajuste hecho sin él."""
    grid = np.asarray(grid, dtype=float)
    utm = np.asarray(utm, dtype=float)
    d = []
    for i in range(len(grid)):
        resto = np.arange(len(grid)) != i
        t = ajustar(grid[resto], utm[resto], modelo)
        e, n = grid_a_utm(grid[i, 0], grid[i, 1], t)
        d.append(float(np.hypot(e - utm[i, 0], n - utm[i, 1])))
    d = np.array(d)
    return {"rms_m": float(np.sqrt(np.mean(d**2))), "max_m": float(d.max()),
            "por_punto_m": [round(float(v), 2) for v in d]}


def cargar(ruta=RUTA_GCP):
    """La transformación guardada en el JSON de puntos de control."""
    return json.loads(Path(ruta).read_text(encoding="utf-8"))["transformacion"]
