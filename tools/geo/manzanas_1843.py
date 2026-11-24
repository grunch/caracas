#!/usr/bin/env python3
"""Borrador de manzanas del plano de 1843 (T81, fase 1B): lo rayado sin las calles, en componentes.

No es el censo: une manzanas cuando una calle no se detecta y parte otras por las rayas blancas del
rayado. Los lectores de cada sector lo corrigen sobre el original (specs/11). Lógica pura sobre una
imagen en gris; el programa recorta el marco del original y escribe las candidatas.

    .venv/bin/python -I tools/geo/manzanas_1843.py --salida specs/auditoria-1843/manzanas-borrador.json
"""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np

OSCURO = 170             # gris bajo el cual un píxel es tinta del rayado
VENTANA_RAYADO = 15      # px: ventana de densidad del rayado
DENSIDAD_RAYADO = 0.28   # fracción de tinta en la ventana para que sea manzana rayada
CLARO = 175              # gris sobre el cual un píxel es papel (calle)
LARGO_CALLE = 70         # px: un trazo claro de al menos esto en línea es calle
GIROS = range(-6, 7, 2)  # grados: el damero del plano está casi a escuadra
ANCHO_CALLE = 1          # px de erosión antes de buscar trazos (1 = ninguna: en el original las calles miden 5–8 px y se perderían)
AREA_MINIMA = 2000       # px: menos es rótulo, árbol o resto del rayado


def mascara_rayado(gris):
    tinta = (gris < OSCURO).astype(np.float32)
    return cv2.blur(tinta, (VENTANA_RAYADO, VENTANA_RAYADO)) > DENSIDAD_RAYADO


def _trazo(largo, horizontal, giro):
    lado = largo + 11
    k = np.zeros((lado, lado), np.uint8)
    c = lado // 2
    a, b = ((5, c), (lado - 6, c)) if horizontal else ((c, 5), (c, lado - 6))
    cv2.line(k, a, b, 1, 1)
    rot = cv2.getRotationMatrix2D((c, c), giro, 1)
    return cv2.warpAffine(k, rot, (lado, lado), flags=cv2.INTER_NEAREST)


def mascara_calles(gris, largo=LARGO_CALLE, giros=GIROS):
    claro = (cv2.GaussianBlur(gris, (3, 3), 0) > CLARO).astype(np.uint8)
    claro = cv2.erode(claro, np.ones((ANCHO_CALLE, ANCHO_CALLE), np.uint8))
    calles = np.zeros_like(claro)
    for giro in giros:
        for horizontal in (True, False):
            calles |= cv2.morphologyEx(claro, cv2.MORPH_OPEN, _trazo(largo, horizontal, giro))
    return cv2.dilate(calles, np.ones((ANCHO_CALLE + 2, ANCHO_CALLE + 2), np.uint8)) > 0


def candidatas(gris, area_minima=AREA_MINIMA, largo=LARGO_CALLE, origen=(0, 0)):
    """Componentes de lo rayado sin calles: [{id, caja_px, area_px, centro_px}] en píxeles del original."""
    ray = mascara_rayado(gris) & ~mascara_calles(gris, largo)
    ray = cv2.morphologyEx(ray.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, _, st, centros = cv2.connectedComponentsWithStats(ray, connectivity=4)
    ox, oy = origen
    filas = [(st[i], centros[i]) for i in range(1, n) if st[i, 4] >= area_minima]
    filas.sort(key=lambda f: (round(f[1][1] / 50), f[1][0]))
    return [{'id': f'K1843-{k + 1:04d}', 'caja_px': [int(s[0] + ox), int(s[1] + oy), int(s[0] + s[2] + ox), int(s[1] + s[3] + oy)],
             'area_px': int(s[4]), 'centro_px': [round(float(c[0]) + ox, 1), round(float(c[1]) + oy, 1)]}
            for k, (s, c) in enumerate(filas)]


def main(argv=None):  # pragma: no cover - E/S sobre el original
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--original', type=Path, default=raiz / 'fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler/original.tiff')
    ap.add_argument('--sectores', type=Path, default=raiz / 'specs/auditoria-1843/sectores.json')
    ap.add_argument('--salida', type=Path, required=True)
    a = ap.parse_args(argv)
    x0, y0, x1, y1 = json.loads(a.sectores.read_text())['marco_px']
    gris = np.asarray(Image.open(a.original).convert('L'))[y0:y1, x0:x1]
    cands = candidatas(gris, origen=(x0, y0))
    doc = {'alcance': 'Borrador automático (no es el censo): componentes de lo rayado sin las calles detectadas.',
           'original_sha256': hashlib.sha256(a.original.read_bytes()).hexdigest(),
           'parametros': {'oscuro': OSCURO, 'densidad_rayado': DENSIDAD_RAYADO, 'claro': CLARO, 'largo_calle': LARGO_CALLE,
                          'area_minima': AREA_MINIMA}, 'candidatas': cands}
    a.salida.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(len(cands), 'candidatas')


if __name__ == '__main__':
    main()
