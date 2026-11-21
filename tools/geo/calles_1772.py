"""Las calles de 1772 de la referencia llevadas a 1936, con su tolerancia, y su continuidad en la ciudad generada.

Fase 3 de specs/08 (T33j.3b): «red conectada como el original». Cada tramo de la red de la referencia
(`1772-red.json`) va a 1936 por la identidad de sus cruces y, donde no la hay, por el calce por identidad
(`calce.Calce`), con una banda de tolerancia del error medido del calce en su sector (mediana LOO de
calce-identidad.json, acotada). Un tramo está bloqueado si las casas de 1772 cierran todo paso de un extremo al otro
dentro de su banda. Los sectores límite del calce (limites-calce.json) no se miden: ahí el calce no ubica la calle.

    .venv/bin/python tools/geo/calles_1772.py specs/auditoria-1772
"""
import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import LineString

BANDA_MINIMA_M = 6.0      # aunque el calce cierre mejor, el trazado a mano no ubica una calle con menos que esto
BANDA_MAXIMA_M = 30.0     # más ancha, la banda abarca la cuadra de al lado y deja de medir esta calle
NUCLEO_DE_CALZADA_M = 4.0  # como cierre_fase3.ANCHO_INFERIDO_M: ancho inferido, el original no da anchos
RADIO_EXTREMO_PX = 4      # el extremo de un tramo es el paso libre a menos de esto del punto


def ejes_de_red(red, a_1936, errores, limites):
    """[{tramo, sector, puntos (px del mosaico), identificado (cruces con pareja), banda_m, medible}] de cada tramo.
    `a_1936(xs, ys)`: el calce del original al mosaico; `errores`: {sector: mediana LOO m}; `limites`: sectores
    límite del calce. Un tramo se mide si alguno de sus extremos cae fuera de un sector límite."""
    from referencia_red import _geometria_original
    por_id = {n['id']: n for n in red['nodos']}
    ejes = []
    for (calle, a, b), puntos in _geometria_original(red['calles'], por_id).items():
        xs, ys = a_1936([p[0] for p in puntos], [p[1] for p in puntos])
        en_1936 = [[round(float(x), 2), round(float(y), 2)] for x, y in zip(xs, ys)]
        identificados = []
        for k, ident in ((0, a), (-1, b)):
            if por_id[ident].get('mosaico'):
                en_1936[k] = [float(v) for v in por_id[ident]['mosaico']]
                identificados.append(ident)
        sector = por_id[a].get('sector') or por_id[b].get('sector')
        banda = min(BANDA_MAXIMA_M, max(BANDA_MINIMA_M, errores.get(sector) or BANDA_MAXIMA_M))
        ejes.append({'tramo': f'{calle}:{a}-{b}', 'sector': sector, 'puntos': en_1936, 'identificado': identificados,
                     'banda_m': banda,
                     'medible': any(por_id[x].get('sector') not in limites for x in (a, b))})
    return ejes


def bloqueado(eje, casas, metro):
    """True si `casas` (polígonos en px del mosaico) cierran todo paso entre los extremos del tramo dentro de su banda."""
    linea = LineString(eje['puntos'])
    banda = linea.buffer(eje['banda_m'] / metro)
    x0, y0, x1, y1 = (int(np.floor(v)) for v in banda.bounds)
    x0, y0 = x0 - 2, y0 - 2
    libre = np.zeros((y1 - y0 + 4, x1 - x0 + 4), np.uint8)
    cv2.fillPoly(libre, [np.round(np.asarray(banda.exterior.coords) - (x0, y0)).astype(np.int32)], 1)
    for casa in casas:
        if casa.intersects(banda):
            cv2.fillPoly(libre, [np.round(np.asarray(casa.exterior.coords) - (x0, y0)).astype(np.int32)], 0)
    _, etiquetas = cv2.connectedComponents(libre, connectivity=4)

    def alrededor(punto):
        i, j = int(round(punto[0] - x0)), int(round(punto[1] - y0))
        r = RADIO_EXTREMO_PX
        ventana = etiquetas[max(0, j - r):j + r + 1, max(0, i - r):i + r + 1]
        return set(ventana[ventana > 0].ravel().tolist())

    return not (alrededor(eje['puntos'][0]) & alrededor(eje['puntos'][-1]))


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def main():
    from calce import Calce
    from referencia_red import json_por_entidad
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('--calce', type=Path, default=Path(__file__).parent / 'gcp' / 'calce-1772-pares-agi-exato-mapa.json')
    ap.add_argument('--salida', type=Path, default=Path(__file__).parent / 'referencias' / '1772-calles-1936.json')
    args = ap.parse_args()
    config = _leer(args.calce)
    calce = Calce.ajustar(config['gcps'], 0.5, config.get('suavizado', 0.0))
    red = _leer(Path(__file__).parent / 'referencias' / '1772-red.json')
    errores = {r['sector']: r['mediana_loo_m'] for r in _leer(args.carpeta / 'calce-identidad.json')['por_sector']}
    limites = {s['sector'] for s in _leer(args.carpeta / 'limites-calce.json')['sectores']}
    ejes = ejes_de_red(red, lambda xs, ys: calce.a_1936(np.asarray(xs, float), np.asarray(ys, float)), errores, limites)
    args.salida.write_text(json_por_entidad({
        'alcance': 'Ejes en 1936 de los tramos de la red de la referencia de 1772 (T33j.3b): por la identidad de sus '
                   'cruces y, donde no la hay, por el calce por identidad, con la banda de tolerancia del error del calce '
                   'en su sector. Los sectores límite del calce no se miden. Generado por tools/geo/calles_1772.py.',
        'red_sha256': __import__('hashlib').sha256((Path(__file__).parent / 'referencias' / '1772-red.json').read_bytes()).hexdigest(),
        'huella_calce': red['huella_calce'], 'tramos': ejes}), encoding='utf-8')
    print(f"{len(ejes)} tramos; medibles {sum(e['medible'] for e in ejes)}; "
          f"con los dos cruces identificados {sum(len(e['identificado']) == 2 for e in ejes)}")


if __name__ == '__main__':
    main()
