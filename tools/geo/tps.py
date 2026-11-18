"""Modelos de transformación metros → píxeles a partir de puntos de control (GCP).

Un GCP es un dict {"x_m", "y_m", "px", "py"}: coordenada métrica de la cuadrícula impresa y
su posición en píxeles de la hoja original (centro de píxel = entero, convención OpenCV).
"""
import numpy as np
from scipy.interpolate import RBFInterpolator

ESCALA_NORMALIZACION = 1000.0  # metros: lleva las coordenadas a ~unidades para el ajuste


def _como_matrices(gcps):
    if not gcps:
        raise ValueError("no hay GCP para ajustar el modelo")
    origen = np.array([[g["x_m"], g["y_m"]] for g in gcps], dtype=float)
    destino = np.array([[g["px"], g["py"]] for g in gcps], dtype=float)
    return origen, destino


class ModeloTPS:
    """Spline de placa delgada (thin-plate spline) metros → píxeles, con parte afín."""

    def __init__(self, origen, destino, suavizado, centro):
        self._origen = origen
        self._destino = destino
        self._suavizado = suavizado
        self._centro = centro
        self._rbf = RBFInterpolator(self._normalizar(origen), destino,
                                    kernel="thin_plate_spline", smoothing=suavizado, degree=1)

    @classmethod
    def ajustar(cls, gcps, suavizado=0.0):
        origen, destino = _como_matrices(gcps)
        if len(origen) < 4:
            raise ValueError(f"el TPS necesita al menos 4 GCP; hay {len(origen)}")
        return cls(origen, destino, suavizado, origen.mean(axis=0))

    def _normalizar(self, xy):
        return (xy - self._centro) / ESCALA_NORMALIZACION

    def __call__(self, x_m, y_m):
        x_m = np.asarray(x_m, dtype=float)
        xy = np.stack([x_m.ravel(), np.asarray(y_m, dtype=float).ravel()], axis=1)
        pxy = self._rbf(self._normalizar(xy))
        return pxy[:, 0].reshape(x_m.shape), pxy[:, 1].reshape(x_m.shape)

    def a_pixeles(self, x_m, y_m):
        return self(x_m, y_m)

    def px_por_metro(self):
        """Escala media (raíz del determinante del jacobiano de la parte afín ajustada)."""
        a = np.c_[self._origen, np.ones(len(self._origen))]
        coef, *_ = np.linalg.lstsq(a, self._destino, rcond=None)
        return float(np.sqrt(abs(np.linalg.det(coef[:2, :2]))))

    def residuos_loo(self):
        """Error en píxeles al predecir cada GCP con el modelo ajustado sin él."""
        n = len(self._origen)
        errores = np.empty(n)
        for i in range(n):
            resto = np.arange(n) != i
            rbf = RBFInterpolator(self._normalizar(self._origen[resto]), self._destino[resto],
                                  kernel="thin_plate_spline", smoothing=self._suavizado, degree=1)
            pred = rbf(self._normalizar(self._origen[i:i + 1]))[0]
            errores[i] = np.hypot(*(pred - self._destino[i]))
        return errores
