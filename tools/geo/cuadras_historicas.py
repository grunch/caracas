"""Cuadras cerradas comprobadas en el original de 1772, sin heredar sus pasajes modernos."""
import json
from pathlib import Path
from shapely.geometry import LineString, Polygon


def es_completa(cara, completas):
    """Correspondencia uno a uno; una cara que funde dos cuadras no sirve."""
    return any(.65 <= cara.area / p.area <= 1.5 and cara.intersection(p).area >= .65 * cara.area
               for p in completas)


def cargar():
    aqui = Path(__file__).resolve().parent
    datos = json.loads((aqui / 'cuadras-1772.json').read_text())
    return [Polygon(c['mosaico']) for c in datos['cuadras_cerradas']]


OCUPACIONES_EDIFICADAS = {'continua', 'parcial', 'aislada', 'conjunto_especial'}
RELLENAR = {'continua'}   # solo una cuadra continua se edifica entera: en las demás lo abierto de 1936 se conserva


def cargar_referencia(red, unidades):
    """Las cuadras de 1772 de la referencia histórica (tools/geo/referencias/1772-*.json, fase 2): solo las unidades
    aprobadas con ocupación edificada, cada una con su anillo de ejes de calle en px del mosaico de 1936. Una
    pendiente nunca entra al generador. `rellenar`: si lo abierto de 1936 dentro de ella se vuelve a edificar."""
    por_id = {n['id']: n for n in red['nodos']}
    return [{'id': u['id'], 'poligono': Polygon([por_id[x]['mosaico'] for x in u['nodos']]),
             'rellenar': u['ocupacion'] in RELLENAR}
            for u in unidades if u['estado'] == 'aprobada' and u['nodos'] and u['ocupacion'] in OCUPACIONES_EDIFICADAS]


def ejes_de_calzada(red):
    """Los ejes en 1936 de los tramos rectos de la referencia entre dos cruces identificados: las calles de 1772 que
    se saben ubicar en 1936. Ninguna casa de 1772 puede pisar su núcleo de calzada."""
    por_id = {n['id']: n for n in red['nodos']}
    return [LineString([por_id[a]['mosaico'], por_id[b]['mosaico']])
            for c in red['calles'] if c['tipo'] == 'calle_recta'
            for a, b in zip(c['nodos'], c['nodos'][1:]) if por_id[a]['mosaico'] and por_id[b]['mosaico']]


def cargar_referencia_de_archivos():
    aqui = Path(__file__).resolve().parent / 'referencias'
    red = json.loads((aqui / '1772-red.json').read_text(encoding='utf-8'))
    unidades = json.loads((aqui / '1772-unidades.json').read_text(encoding='utf-8'))['unidades']
    return cargar_referencia(red, unidades), ejes_de_calzada(red)
