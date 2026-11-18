"""Color: paleta CIELAB del plano 1936 y clasificación por prototipo más cercano."""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np

RUTA_PALETA = Path(__file__).resolve().parent / "paleta-1936.json"

CLASES_FONDO = ("naranja", "crema", "verde", "azul")
CLASES_TINTA = ("negro", "rojo", "azul", "verde", "gris", "crema", "naranja")
PESO_L = 0.6  # la luminancia varía más que el tono entre zonas del escaneo
A_ROJO_MIN = 18.0  # a* desde el que una tinta oscura es roja (núcleo del texto de esquinas)


@dataclass(frozen=True)
class Prototipos:
    clases: tuple[str, ...]  # nombre de clase de cada prototipo
    lab: np.ndarray  # (n, 3) float32

    def indice_clase(self, nombres: tuple[str, ...]) -> np.ndarray:
        """Índice en `nombres` de la clase de cada prototipo."""
        return np.array([nombres.index(c) for c in self.clases], np.uint8)


@dataclass(frozen=True)
class Paleta:
    fondos: Prototipos
    tintas: Prototipos


def _prototipos(entradas: list, validas: tuple[str, ...], seccion: str) -> Prototipos:
    if not entradas:
        raise ValueError(f"paleta: la sección '{seccion}' está vacía")
    clases, labs = [], []
    for e in entradas:
        clase, lab = e.get("clase"), e.get("lab")
        if clase not in validas:
            raise ValueError(f"paleta: clase desconocida {clase!r} en '{seccion}'")
        if not (isinstance(lab, list) and len(lab) == 3):
            raise ValueError(f"paleta: 'lab' debe ser [L, a, b] en {e!r}")
        try:
            labs.append([float(v) for v in lab])
        except (TypeError, ValueError) as e:
            raise ValueError(f"paleta: valores no numéricos en {e!r}: {lab!r}") from e
        clases.append(clase)
    return Prototipos(tuple(clases), np.array(labs, np.float32))


def cargar_paleta(ruta: Path | str | None = None) -> Paleta:
    ruta = Path(ruta) if ruta else RUTA_PALETA
    try:
        datos = json.loads(ruta.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as e:
        raise ValueError(f"no se pudo leer la paleta {ruta}: {e}") from e
    return Paleta(
        fondos=_prototipos(datos.get("fondos", []), CLASES_FONDO, "fondos"),
        tintas=_prototipos(datos.get("tintas", []), CLASES_TINTA, "tintas"),
    )


def a_lab(rgb: np.ndarray) -> np.ndarray:
    """RGB uint8 → CIELAB float32 (L 0-100)."""
    return cv2.cvtColor(rgb.astype(np.float32) / 255.0, cv2.COLOR_RGB2Lab)


def suavizar_rgb(rgb: np.ndarray, sigma_px: float) -> np.ndarray:
    if sigma_px <= 0.3:
        return rgb.copy()
    return cv2.GaussianBlur(rgb, (0, 0), sigma_px)


def clasificar(lab: np.ndarray, protos: Prototipos, nombres: tuple[str, ...]) -> np.ndarray:
    """Índice (en `nombres`) de la clase del prototipo más cercano a cada píxel."""
    clase_de = protos.indice_clase(nombres)
    mejor = np.full(lab.shape[:2], np.inf, np.float32)
    salida = np.zeros(lab.shape[:2], np.uint8)
    for i, (L, a, b) in enumerate(protos.lab):
        d = PESO_L * (lab[..., 0] - L) ** 2 + (lab[..., 1] - a) ** 2 + (lab[..., 2] - b) ** 2
        menor = d < mejor
        mejor = np.where(menor, d, mejor)
        salida[menor] = clase_de[i]
    return salida


BITS_TABLA = 6  # bits por canal de la tabla RGB → clase (64³ colores)


def _tabla_rgb(protos: Prototipos, nombres: tuple[str, ...]) -> np.ndarray:
    """Clase de cada color RGB cuantizado (centro de cada celda), indexada por r·4096+g·64+b."""
    n = 1 << BITS_TABLA
    paso = 256 // n
    v = (np.arange(n) * paso + paso // 2).astype(np.uint8)
    r, g, b = np.meshgrid(v, v, v, indexing="ij")
    rgb = np.stack([r, g, b], axis=-1).reshape(n * n, n, 3)
    return clasificar(a_lab(rgb), protos, nombres).ravel()


_TABLAS: dict = {}  # caché de tablas por (prototipos, nombres)


def clasificar_rgb(rgb: np.ndarray, protos: Prototipos, nombres: tuple[str, ...]) -> np.ndarray:
    """Como `clasificar`, pero con una tabla precalculada sobre RGB cuantizado (mucho más rápido)."""
    clave = (protos.clases, protos.lab.tobytes(), nombres)
    if clave not in _TABLAS:
        _TABLAS[clave] = _tabla_rgb(protos, nombres)
    tabla = _TABLAS[clave]
    q = (rgb >> (8 - BITS_TABLA)).astype(np.int32)
    indice = (q[..., 0] << (2 * BITS_TABLA)) | (q[..., 1] << BITS_TABLA) | q[..., 2]
    return tabla[indice]


@dataclass(frozen=True)
class Tintas:
    negro: np.ndarray
    rojo: np.ndarray
    azul: np.ndarray
    verde: np.ndarray
    gris: np.ndarray

    @property
    def toda(self) -> np.ndarray:
        """Tinta que tapa el fondo (texto, bordes, símbolos); el gris del punteado no cuenta."""
        return self.negro | self.rojo | self.azul | self.verde


def detectar_tintas(rgb: np.ndarray, lab: np.ndarray, paleta: Paleta, l_tinta_max: float) -> Tintas:
    clase = clasificar_rgb(rgb, paleta.tintas, CLASES_TINTA)
    es = {n: clase == i for i, n in enumerate(CLASES_TINTA)}
    rojizo = lab[..., 1] >= A_ROJO_MIN
    oscuro = (lab[..., 0] < l_tinta_max) & ~rojizo
    return Tintas(
        negro=(es["negro"] & ~rojizo) | (oscuro & ~es["verde"] & ~es["azul"]),
        rojo=es["rojo"] | (es["negro"] & rojizo),
        azul=es["azul"] & ~oscuro,
        verde=es["verde"] & ~oscuro,
        gris=es["gris"],
    )
