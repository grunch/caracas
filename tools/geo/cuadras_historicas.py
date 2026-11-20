"""Cuadras cerradas comprobadas en el original de 1772, sin heredar sus pasajes modernos."""
import json
from pathlib import Path
from shapely.geometry import Polygon


def es_completa(cara, completas):
    """Correspondencia uno a uno; una cara que funde dos cuadras no sirve."""
    return any(.65 <= cara.area / p.area <= 1.5 and cara.intersection(p).area >= .65 * cara.area
               for p in completas)


def cargar():
    aqui = Path(__file__).resolve().parent
    datos = json.loads((aqui / 'cuadras-1772.json').read_text())
    return [Polygon(c['mosaico']) for c in datos['cuadras_cerradas']]
