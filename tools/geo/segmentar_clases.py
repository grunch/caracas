"""Códigos de clase de la segmentación del plano y colores para la vista de depuración."""
from __future__ import annotations

DESCONOCIDO = 0
CALLE = 1
PATIO = 2
EDIFICADO = 3
EDIFICIO_PUBLICO = 4
VERDE = 5
CULTIVO = 6
AGUA = 7
CERRO = 8  # cerro o terreno libre sin edificar
MARGEN = 9

NOMBRES = {
    DESCONOCIDO: "desconocido",
    CALLE: "calle",
    PATIO: "patio",
    EDIFICADO: "edificado",
    EDIFICIO_PUBLICO: "edificio_publico",
    VERDE: "verde",
    CULTIVO: "cultivo",
    AGUA: "agua",
    CERRO: "cerro",
    MARGEN: "margen",
}

N_CLASES = len(NOMBRES)

# RGB de cada clase en debug.jpg
COLORES_DEBUG = {
    DESCONOCIDO: (255, 0, 255),
    CALLE: (250, 250, 250),
    PATIO: (255, 215, 0),
    EDIFICADO: (200, 70, 40),
    EDIFICIO_PUBLICO: (110, 30, 120),
    VERDE: (30, 150, 40),
    CULTIVO: (170, 220, 90),
    AGUA: (40, 110, 230),
    CERRO: (160, 140, 110),
    MARGEN: (40, 40, 40),
}
