"""Utilidades compartidas por los tests: hojas sintéticas con cuadrícula conocida."""
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

PAPEL = (241, 230, 205)


class Deformacion:
    """Transformación conocida metros → píxeles: afín + ondulación suave + pliegue."""

    def __init__(self, escala=0.8, angulo_grados=0.7, desplazamiento=(220.0, 180.0),
                 amplitud=6.0, longitud_onda=2600.0, x0_m=-1000.0, y0_m=1500.0,
                 pliegue_py=None, salto_px=0.0):
        self.escala = escala  # píxeles por metro
        self.angulo = np.deg2rad(angulo_grados)
        self.desplazamiento = desplazamiento
        self.amplitud = amplitud
        self.longitud_onda = longitud_onda
        self.x0_m = x0_m
        self.y0_m = y0_m
        self.pliegue_py = pliegue_py  # fila de un pliegue horizontal: salto lateral brusco
        self.salto_px = salto_px

    def __call__(self, x_m, y_m):
        x_m = np.asarray(x_m, dtype=float)
        y_m = np.asarray(y_m, dtype=float)
        u = (x_m - self.x0_m) * self.escala
        v = (self.y0_m - y_m) * self.escala
        c, s = np.cos(self.angulo), np.sin(self.angulo)
        px = c * u + s * v + self.desplazamiento[0]
        py = -s * u + c * v + self.desplazamiento[1]
        k = 2 * np.pi / self.longitud_onda
        px = px + self.amplitud * np.sin(k * py)
        py = py + self.amplitud * np.cos(k * px * 0.8)
        if self.pliegue_py is not None:
            px = px + self.salto_px * 0.5 * (1 + np.tanh((py - self.pliegue_py) / 3.0))
        return px, py


def dibujar_hoja(deformacion, xs_m, ys_m, forma=(2600, 2200), ruido=True, semilla=0):
    """Dibuja una cuadrícula deformada sobre papel con estorbos (curvas rojas, manzanas, calles)."""
    rng = np.random.default_rng(semilla)
    alto, ancho = forma
    img = np.empty((alto, ancho, 3), np.uint8)
    img[:] = PAPEL
    _dibujar_estorbos(img, rng)
    y_min, y_max = min(ys_m), max(ys_m)
    x_min, x_max = min(xs_m), max(xs_m)
    t = np.linspace(0, 1, 4000)
    for x in xs_m:
        px, py = deformacion(np.full_like(t, x), y_min + (y_max - y_min) * t)
        _polilinea(img, px, py)
    for y in ys_m:
        px, py = deformacion(x_min + (x_max - x_min) * t, np.full_like(t, y))
        _polilinea(img, px, py)
    if ruido:
        img = np.clip(img.astype(np.int16) + rng.normal(0, 4, img.shape).astype(np.int16), 0, 255)
    return img.astype(np.uint8)


def _polilinea(img, px, py, color=(70, 70, 70)):
    sub = 16
    pts = np.stack([px * sub, py * sub], axis=1).round().astype(np.int32)
    cv2.polylines(img, [pts], False, color, thickness=2, lineType=cv2.LINE_AA, shift=4)


def _dibujar_estorbos(img, rng):
    alto, ancho = img.shape[:2]
    for _ in range(60):  # curvas de nivel rojas
        c = rng.uniform([0, 0], [ancho, alto])
        ejes = tuple(int(v) for v in rng.uniform(40, 400, 2))
        cv2.ellipse(img, tuple(int(v) for v in c), ejes, float(rng.uniform(0, 180)), 0, 360,
                    (200, 90, 60), 2, cv2.LINE_AA)
    for _ in range(80):  # manzanas naranjas con borde negro
        x, y = rng.integers(0, [ancho - 120, alto - 120])
        w, h = rng.integers(30, 110, 2)
        cv2.rectangle(img, (int(x), int(y)), (int(x + w), int(y + h)), (230, 170, 110), -1)
        cv2.rectangle(img, (int(x), int(y)), (int(x + w), int(y + h)), (40, 40, 40), 2)
    for _ in range(25):  # tramos de calle negros cortos y oblicuos
        p = rng.uniform([0, 0], [ancho, alto])
        ang = rng.uniform(0, np.pi)
        largo = rng.uniform(60, 250)
        q = p + largo * np.array([np.cos(ang), np.sin(ang)])
        cv2.line(img, tuple(int(v) for v in p), tuple(int(v) for v in q), (30, 30, 30), 2)


@pytest.fixture
def hoja_sintetica():
    deformacion = Deformacion()
    xs_m = [-1000.0 + 500.0 * i for i in range(5)]
    ys_m = [1500.0 - 500.0 * i for i in range(6)]
    img = dibujar_hoja(deformacion, xs_m, ys_m)
    return img, deformacion, xs_m, ys_m
