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


def escribir_panel(ruta, img):
    """El panel en JPEG; OSError con la ruta si no se pudo escribir (cv2.imwrite solo devuelve False, como en
    epocas.escribir_imagen). Los paneles ya escritos quedan."""
    if not cv2.imwrite(str(ruta), img, [cv2.IMWRITE_JPEG_QUALITY, 85]):
        raise OSError(f'no se pudo escribir el panel {ruta}')


def leer_calzado(ruta):
    """El calzado.tif de calce.py (RGBA, como lo escribe tifffile) en BGR, el orden con que OpenCV pinta el panel.
    cv2.imread lo daría en BGRA y un RGBA2BGR cambiaría el rojo de las casas del original por azul."""
    import tifffile
    img = tifffile.imread(ruta)
    return cv2.cvtColor(img, cv2.COLOR_RGBA2BGR if img.shape[2] == 4 else cv2.COLOR_RGB2BGR)


FUERA_DEL_ROJO = 0.2       # menos que esto de la huella sobre lo rojo del original: la casa cae casi entera fuera
TOLERANCIA_ROJO_M = 2.0    # lo rojo se ensancha esto: el calce y el trazado corren el borde unos metros
ZONA_PX = 300              # las casas fuera de lo rojo se agrupan en zonas de este lado para los paneles
ZONAS_EN_PANELES = 12


def casas_fuera_del_rojo(casas, rojo, tolerancia_px, fraccion=FUERA_DEL_ROJO):
    """[{techo, sobre_el_rojo, centro}] de las casas con menos de `fraccion` de su huella sobre lo rojo del original
    (`rojo`: máscara 0/1 en px del plano base, ensanchada `tolerancia_px`). Es un informe, no una regla del generador
    (decisión del responsable del 23-11-2026): parte de lo que cae fuera es el error del calce."""
    if tolerancia_px > 0:
        lado = 2 * int(round(tolerancia_px)) + 1
        rojo = cv2.dilate(rojo.astype(np.uint8), np.ones((lado, lado), np.uint8))
    salida = []
    for k, g in casas:
        x0, y0, x1, y1 = (int(np.floor(g.bounds[0])), int(np.floor(g.bounds[1])), int(np.ceil(g.bounds[2])),
                          int(np.ceil(g.bounds[3])))
        if x1 <= x0 or y1 <= y0:
            continue
        huella = np.zeros((y1 - y0, x1 - x0), np.uint8)
        cv2.fillPoly(huella, [(np.asarray(g.exterior.coords) - (x0, y0)).round().astype(np.int32)], 1)
        area = int(huella.sum())
        trozo = rojo[max(y0, 0):y1, max(x0, 0):x1]
        sobre = int((huella[max(0, -y0):max(0, -y0) + trozo.shape[0], max(0, -x0):max(0, -x0) + trozo.shape[1]]
                     & (trozo > 0)).sum()) if trozo.size else 0
        if area and sobre < fraccion * area:
            c = g.centroid
            salida.append({'techo': k, 'sobre_el_rojo': round(sobre / area, 2), 'centro': [round(c.x), round(c.y)]})
    return salida


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
    ap.add_argument('--informe-rojo', type=Path, default=None,
                    help='además, el informe de las casas fuera de lo rojo del original (JSON) y sus paneles')
    args = ap.parse_args()
    ref = Path(__file__).parent / 'referencias'
    red = json.loads((ref / '1772-red.json').read_text(encoding='utf-8'))
    unidades = json.loads((ref / '1772-unidades.json').read_text(encoding='utf-8'))['unidades']
    tramos = json.loads((ref / '1772-calles-1936.json').read_text(encoding='utf-8'))['tramos']
    edificado = cargar_edificado_de_archivos(raiz / 'specs' / 'auditoria-1772', red, unidades)
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    a_la_vista = visibles(casas_de_epoca(json.loads(args.ciudad.read_text(encoding='utf-8'))), hitos)
    casas = [g for _, g in a_la_vista]
    plantas = plantas_en_pie(hitos)
    calce = json.loads((raiz / 'fuentes' / 'derivados' / '1772' / 'calzado.json').read_text(encoding='utf-8'))
    calzado = leer_calzado(raiz / 'fuentes' / 'derivados' / '1772' / 'calzado.tif')
    imagen = tuple(calce['recorte'])
    args.salida.mkdir(parents=True, exist_ok=True)
    sector_de = {u['id']: u['sector'] for u in unidades}
    for sector, ext in extension_de_sectores(edificado, sector_de, tramos).items():
        rec = recorte_de(ext, imagen)
        if rec[2] - rec[0] < 10 or rec[3] - rec[1] < 10:
            print(f'{sector}: fuera de la imagen calzada')
            continue
        escribir_panel(args.salida / f'{sector}.jpg', panel(calzado, imagen, rec, casas, plantas, tramos))
        print(f'{sector}: {rec}')
    if args.informe_rojo:
        informe_rojo(args, raiz, a_la_vista, edificado, sector_de, tramos, calzado, imagen, plantas)


def informe_rojo(args, raiz, a_la_vista, edificado, sector_de, tramos, calzado, imagen, plantas):
    """El informe de las casas de 1772 casi enteras fuera de lo rojo del original (fuentes/derivados/1936/
    edificado-1772.png, lo rojo del 1772 calzado), por sector, y un panel de cada zona con más de ellas."""
    from collections import Counter
    rojo = cv2.imread(str(raiz / 'fuentes' / 'derivados' / '1936' / 'edificado-1772.png'), cv2.IMREAD_UNCHANGED)
    rojo = (rojo if rojo.ndim == 2 else rojo[..., 0]) > 0
    fuera = casas_fuera_del_rojo(a_la_vista, rojo, TOLERANCIA_ROJO_M / METRO)
    extension = extension_de_sectores(edificado, sector_de, tramos)

    def sector(c):
        return next((s for s, (x0, y0, x1, y1) in extension.items() if x0 <= c[0] <= x1 and y0 <= c[1] <= y1), 'sin_sector')
    for f in fuera:
        f['sector'] = sector(f['centro'])
    zonas = Counter((f['centro'][0] // ZONA_PX, f['centro'][1] // ZONA_PX) for f in fuera).most_common(ZONAS_EN_PANELES)
    por_id = dict(a_la_vista)
    for i, ((zx, zy), n) in enumerate(zonas):
        rec = recorte_de((zx * ZONA_PX, zy * ZONA_PX, (zx + 1) * ZONA_PX, (zy + 1) * ZONA_PX), imagen, margen_m=20)
        suyas = [por_id[f['techo']] for f in fuera if (f['centro'][0] // ZONA_PX, f['centro'][1] // ZONA_PX) == (zx, zy)]
        escribir_panel(args.salida / f'fuera-del-rojo-{i + 1:02d}.jpg', panel(calzado, imagen, rec, suyas, plantas, tramos))
    informe = {
        'alcance': 'Casas de 1772 a la vista con menos del 20 % de su huella sobre lo rojo del original (ensanchado '
                   f'{TOLERANCIA_ROJO_M} m), por sector. Es un informe para decidir con evidencia, no una regla del generador '
                   '(decisión del responsable del 23-11-2026): parte de lo que cae fuera es el error del calce. Los paneles '
                   '(fuera-del-rojo-NN.jpg) quedan fuera de git.',
        'umbrales': {'fraccion': FUERA_DEL_ROJO, 'tolerancia_m': TOLERANCIA_ROJO_M, 'zona_px': ZONA_PX},
        'casas_1772': len(a_la_vista), 'fuera': len(fuera),
        'por_sector': dict(sorted(Counter(f['sector'] for f in fuera).items())),
        'zonas_en_paneles': [{'panel': f'fuera-del-rojo-{i + 1:02d}.jpg', 'caja_px': [zx * ZONA_PX, zy * ZONA_PX,
                              (zx + 1) * ZONA_PX, (zy + 1) * ZONA_PX], 'casas': n} for i, ((zx, zy), n) in enumerate(zonas)],
        'casas': fuera,
    }
    args.informe_rojo.write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f'casas fuera de lo rojo: {len(fuera)} de {len(a_la_vista)}')


if __name__ == '__main__':
    main()
