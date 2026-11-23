"""El censo final de 1772 (specs/08, fase 8, T33j.8a): por cada sector del original, un panel con el 1772 calzado
sobre el plano base (fuentes/derivados/1772/calzado.tif) y, al lado, lo mismo con la reconstrucción encima: las casas
de 1772 a la vista (contorno naranja), las plantas de los hitos en pie (violeta) y las calles de la referencia (verde).

Los paneles son la evidencia para repetir el censo contra el original; quedan fuera de git (.cache/censo-fase8/). Lo
que se observa en cada uno se registra a mano en specs/auditoria-1772/censo-fase8.json. Cuenta lo dibujado; no
certifica fidelidad. Uso:
  .venv/bin/python tools/geo/censo_fase8.py fuentes/derivados/epocas/ciudad-epocas.json .cache/censo-fase8
"""
import argparse
import json
import subprocess
from pathlib import Path

import cv2
import numpy as np

from cierre_fase3 import METRO, casas_de_epoca
from cierre_fase4 import visibles
from cierre_fase5 import plantas_en_pie

MARGEN_M = 40.0   # alrededor de lo que el sector abarca
LADO_PX = 900     # lado mayor de cada mitad del panel


def extension_de_sectores(edificado, sector_de, tramos):
    """{sector: (x0, y0, x1, y1)} en px del plano base: lo edificado revisado de sus unidades y sus tramos de calle."""
    partes = {}
    for e in edificado:
        s = sector_de.get(e['id'])
        if s:
            partes.setdefault(s, []).extend(p.bounds for p in e['poligonos'])
    for t in tramos:
        xs, ys = [p[0] for p in t['puntos']], [p[1] for p in t['puntos']]
        partes.setdefault(t['sector'], []).append((min(xs), min(ys), max(xs), max(ys)))
    return {s: (min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs))
            for s, bs in sorted(partes.items())}


def recorte_de(extension, imagen, metro=METRO, margen_m=MARGEN_M):
    """El recorte (px del plano base, enteros) de una extensión con su margen, dentro de lo que cubre la imagen."""
    m = margen_m / metro
    x0, y0, x1, y1 = extension
    ix0, iy0, ix1, iy1 = imagen
    return (int(max(ix0, x0 - m)), int(max(iy0, y0 - m)), int(min(ix1, x1 + m)), int(min(iy1, y1 + m)))


def _dibujar(img, geometrias, origen, escala, color, grosor):
    for g in geometrias:
        for p in getattr(g, 'geoms', [g]):
            q = ((np.asarray(p.exterior.coords) - origen) * escala).astype(np.int32)
            cv2.polylines(img, [q], True, color, grosor, cv2.LINE_AA)


def panel(calzado, recorte_img, recorte, casas, plantas, tramos):
    """[original | original con la reconstrucción encima], en BGR."""
    x0, y0, x1, y1 = recorte
    ix0, iy0 = recorte_img[:2]
    trozo = np.ascontiguousarray(calzado[y0 - iy0:y1 - iy0, x0 - ix0:x1 - ix0, :3])
    escala = LADO_PX / max(x1 - x0, y1 - y0)
    original = cv2.resize(trozo, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
    encima = original.copy()
    origen = np.array([x0, y0], float)
    _dibujar(encima, plantas, origen, escala, (160, 40, 150), 2)
    _dibujar(encima, casas, origen, escala, (0, 140, 255), 1)
    for t in tramos:
        q = ((np.asarray(t['puntos'], float) - origen) * escala).astype(np.int32)
        cv2.polylines(encima, [q], False, (40, 150, 40), 2, cv2.LINE_AA)
    return np.hstack([original, np.full((original.shape[0], 8, 3), 255, np.uint8), encima])


def main():
    from cuadras_historicas import cargar_edificado_de_archivos
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('ciudad', type=Path)
    ap.add_argument('salida', type=Path)
    args = ap.parse_args()
    ref = Path(__file__).parent / 'referencias'
    red = json.loads((ref / '1772-red.json').read_text(encoding='utf-8'))
    unidades = json.loads((ref / '1772-unidades.json').read_text(encoding='utf-8'))['unidades']
    tramos = json.loads((ref / '1772-calles-1936.json').read_text(encoding='utf-8'))['tramos']
    edificado = cargar_edificado_de_archivos(raiz / 'specs' / 'auditoria-1772', red, unidades)
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    casas = [g for _, g in visibles(casas_de_epoca(json.loads(args.ciudad.read_text(encoding='utf-8'))), hitos)]
    plantas = plantas_en_pie(hitos)
    calce = json.loads((raiz / 'fuentes' / 'derivados' / '1772' / 'calzado.json').read_text(encoding='utf-8'))
    calzado = cv2.imread(str(raiz / 'fuentes' / 'derivados' / '1772' / 'calzado.tif'), cv2.IMREAD_UNCHANGED)
    calzado = cv2.cvtColor(calzado, cv2.COLOR_RGBA2BGR) if calzado.shape[2] == 4 else calzado
    imagen = tuple(calce['recorte'])
    args.salida.mkdir(parents=True, exist_ok=True)
    sector_de = {u['id']: u['sector'] for u in unidades}
    for sector, ext in extension_de_sectores(edificado, sector_de, tramos).items():
        rec = recorte_de(ext, imagen)
        if rec[2] - rec[0] < 10 or rec[3] - rec[1] < 10:
            print(f'{sector}: fuera de la imagen calzada')
            continue
        cv2.imwrite(str(args.salida / f'{sector}.jpg'), panel(calzado, imagen, rec, casas, plantas, tramos),
                    [cv2.IMWRITE_JPEG_QUALITY, 85])
        print(f'{sector}: {rec}')


if __name__ == '__main__':
    main()
