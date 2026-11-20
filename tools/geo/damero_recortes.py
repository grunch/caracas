"""Recortes de verificación visual para los controles del damero: original de 1772 junto al mosaico de 1936.

Solo dibuja; no decide nada. Las imágenes van fuera de git (.cache/), con su SHA-256 en el JSON.
"""
import hashlib

import numpy as np
from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
ESCALA_ORIGINAL = 3  # el original es esquemático (≈1,7 m/px): se amplía para que se vea el trazo


def caja(centro, radio, forma):
    """[x0, y0, x1, y1] de lado 2·radio alrededor de `centro`, recortada a `forma` = (alto, ancho)."""
    cx, cy = centro
    return [max(0, int(cx - radio)), max(0, int(cy - radio)), min(forma[1], int(cx + radio)), min(forma[0], int(cy + radio))]


def _recorte(imagen, c):
    return Image.fromarray(np.ascontiguousarray(imagen[c[1]:c[3], c[0]:c[2]]))


def _marca(dibujo, x, y, color, r=6):
    dibujo.ellipse([x - r, y - r, x + r, y + r], outline=color, width=2)
    dibujo.line([x - 2 * r, y, x + 2 * r, y], fill=color, width=1)
    dibujo.line([x, y - 2 * r, x, y + 2 * r], fill=color, width=1)


def lado_a_lado(original, mosaico, centro_original, radio_original, centro_mosaico, radio_mosaico, marcas_mosaico,
                poligonos_mosaico=(), titulo=''):
    """Izquierda: el original ampliado con el punto en rojo; derecha: el mosaico con las marcas y polígonos dados.

    `marcas_mosaico`: [(x, y, color)] en px del mosaico; `poligonos_mosaico`: [([(x, y)...], color)].
    """
    co = caja(centro_original, radio_original, original.shape)
    izq = _recorte(original, co).resize(((co[2] - co[0]) * ESCALA_ORIGINAL, (co[3] - co[1]) * ESCALA_ORIGINAL), Image.NEAREST)
    d = ImageDraw.Draw(izq)
    _marca(d, (centro_original[0] - co[0]) * ESCALA_ORIGINAL, (centro_original[1] - co[1]) * ESCALA_ORIGINAL, 'red', 9)
    cm = caja(centro_mosaico, radio_mosaico, mosaico.shape)
    der = _recorte(mosaico, cm)
    d = ImageDraw.Draw(der)
    for puntos, color in poligonos_mosaico:
        d.polygon([(x - cm[0], y - cm[1]) for x, y in puntos], outline=color, width=3)
    for x, y, color in marcas_mosaico:
        _marca(d, x - cm[0], y - cm[1], color, 8)
    alto = max(izq.height, der.height) + 24
    lienzo = Image.new('RGB', (izq.width + der.width + 12, alto), 'white')
    lienzo.paste(izq, (0, 24))
    lienzo.paste(der, (izq.width + 12, 24))
    ImageDraw.Draw(lienzo).text((4, 4), titulo, fill='black')
    return lienzo


def guardar(imagen, ruta):
    """Escribe el PNG y devuelve su SHA-256 (lo que entra al JSON de evidencias)."""
    ruta.parent.mkdir(parents=True, exist_ok=True)
    imagen.save(ruta)
    return hashlib.sha256(ruta.read_bytes()).hexdigest()
