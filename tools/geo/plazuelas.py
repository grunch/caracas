"""Las plazuelas y ensanches abiertos de 1772 que la referencia de la fase 2 no registraba (censo final, T33j.8c):
tools/geo/referencias/1772-plazuelas.json, trazadas a mano sobre el original y revisadas a ojo. En 1772 no vive
ninguna casa en ellas (epocas.despejar_plazuelas_de_1772), ningún paso del generador las ocupa (son terreno vedado) y
la puerta de la fase 3 lo mide (plazas sin casas)."""
import json
from pathlib import Path

from shapely.geometry import Polygon

FRACCION_DENTRO = 0.5   # una casa con menos de esto dentro es vecina: el calce la corre unos metros, no es de la plazuela
REGISTRO = Path(__file__).parent / 'referencias' / '1772-plazuelas.json'


def cargar_plazuelas(registro, a_1936):
    """[{id, hallazgo, poligono (px del plano base)}] del registro, llevadas del original a 1936 con `a_1936(xs, ys)`."""
    salida = []
    for p in registro['plazuelas']:
        xs, ys = a_1936([q[0] for q in p['contorno_original']], [q[1] for q in p['contorno_original']])
        figura = Polygon([(float(x), float(y)) for x, y in zip(xs, ys)]).buffer(0)
        if figura.geom_type == 'Polygon' and not figura.is_empty:
            salida.append({'id': p['id'], 'hallazgo': p.get('hallazgo'), 'poligono': figura})
    return salida


def plazuelas_en_1936(ruta=REGISTRO):
    """Las plazuelas del registro en px del plano base, por el calce elegido de 1772; [] si no hay registro."""
    if not Path(ruta).exists():
        return []
    import numpy as np
    from calce import Calce
    config = json.loads((Path(__file__).parent / 'gcp' / 'calce-1772-pares-agi-exato-mapa.json').read_text(encoding='utf-8'))
    calce = Calce.ajustar(config['gcps'], 0.5, config.get('suavizado', 0.0))
    return cargar_plazuelas(json.loads(Path(ruta).read_text(encoding='utf-8')),
                            lambda xs, ys: calce.a_1936(np.asarray(xs, float), np.asarray(ys, float)))


def en_plazuela(figura, plazuelas, fraccion=FRACCION_DENTRO):
    """¿La casa tiene al menos `fraccion` de su área dentro de alguna plazuela (polígonos en px del plano base)?"""
    area = figura.area
    return area > 0 and any(figura.intersection(p).area >= fraccion * area for p in plazuelas if figura.intersects(p))
