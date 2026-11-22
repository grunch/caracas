"""Lo edificado de cada unidad en el original de 1772: las manchas rojas, trazadas para revisarlas a ojo (fase 4, T33j.4a).

El censo de la fase 1 prohíbe usar en el generador los contornos automáticos de lo rojo sin revisar: pueden seguir el
color y no lo dibujado. Por decisión del responsable (22-11-2026), cada unidad se traza aquí y se revisa a ojo sobre
su recorte; solo un contorno revisado como fiel entra a la referencia (edificado-revisado.json). Este módulo no decide
nada: traza y deja los recortes, con su sha256, para la revisión.

    .venv/bin/python tools/geo/edificado_original.py specs/auditoria-1772 --recortes <carpeta fuera de git>
"""
import argparse
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import Polygon

ROJO_RGB = (205, 95, 95)       # un rojo del original, para los tests
TONO_ROJO = (12, 165)          # tono (0–180 de OpenCV) por debajo del primero o por encima del segundo
SATURACION_MINIMA = 70
BRILLO_MINIMO = 60
MARGEN_PX = 14                 # alrededor de la caja de la unidad, para ver el contexto en el recorte
DENTRO_MINIMO = 0.5            # fracción de una mancha dentro de la caja para tenerla por de esta unidad
AREA_MINIMA_PX = 12            # menos que esto es una mota del papel, no un edificio
SIMPLIFICACION_PX = 1.0


def mascara_roja(rgb):
    """True donde el original pinta rojo (los edificios), no el papel ni la tinta negra."""
    hsv = cv2.cvtColor(np.ascontiguousarray(rgb), cv2.COLOR_RGB2HSV)
    tono, sat, brillo = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return ((tono < TONO_ROJO[0]) | (tono > TONO_ROJO[1])) & (sat > SATURACION_MINIMA) & (brillo > BRILLO_MINIMO)


def edificado_de_unidad(rgb, bbox, margen=MARGEN_PX):
    """[polígono [[x, y]…] en px del original] de cada mancha roja que cae al menos la mitad dentro de la caja."""
    x0, y0 = max(0, bbox[0] - margen), max(0, bbox[1] - margen)
    x1, y1 = min(rgb.shape[1], bbox[2] + margen), min(rgb.shape[0], bbox[3] + margen)
    rojo = mascara_roja(rgb[y0:y1, x0:x1]).astype(np.uint8)
    rojo = cv2.morphologyEx(rojo, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))   # simétrico: no corre la mancha
    caja = np.zeros_like(rojo)
    caja[bbox[1] - y0:bbox[3] - y0, bbox[0] - x0:bbox[2] - x0] = 1
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(rojo, connectivity=8)
    poligonos = []
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] < AREA_MINIMA_PX:
            continue
        mancha = etiquetas == k
        if (mancha & (caja > 0)).sum() < DENTRO_MINIMO * mancha.sum():
            continue
        contornos, _ = cv2.findContours(mancha.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
        c = max(contornos, key=cv2.contourArea)[:, 0, :]
        if len(c) < 3:
            continue
        # el contorno de OpenCV pasa por los centros de los píxeles del borde: medio píxel afuera está el borde real
        figura = Polygon(c + 0.5 + (x0, y0)).buffer(0.5, join_style='mitre').simplify(SIMPLIFICACION_PX)
        if figura.geom_type == 'Polygon' and not figura.is_empty:
            poligonos.append([[round(float(x), 2), round(float(y), 2)] for x, y in list(figura.exterior.coords)[:-1]])
    return poligonos


JUICIOS = {'fiel', 'fiel_solo_la_mayor', 'dudoso'}


def edificado_aprobado(original, revisado):
    """{unidad: polígonos} de lo revisado a ojo como fiel (edificado-revisado.json), solo si el recorte y el trazado
    son los que se revisaron (mismos sha256). `fiel_solo_la_mayor`: solo la mancha más grande es de la unidad (las
    demás son vecinas que la caja alcanza). Lo dudoso no entra."""
    from shapely.geometry import Polygon as _P
    por_unidad = {r['unidad']: r for r in original['unidades']}
    aprobado = {}
    for v in revisado['revisiones']:
        if v['juicio'] not in JUICIOS:
            raise ValueError(f"{v['unidad']}: juicio desconocido {v['juicio']!r}")
        r = por_unidad.get(v['unidad'])
        if r is None or v['juicio'] == 'dudoso' or v['recorte_sha256'] != r['recorte']['sha256'] \
                or v['poligonos_sha256'] != r['poligonos_sha256'] or not r['poligonos']:
            continue
        poligonos = r['poligonos'] if v['juicio'] == 'fiel' else [max(r['poligonos'], key=lambda p: _P(p).area)]
        aprobado[v['unidad']] = poligonos
    return aprobado


EDIFICADAS = {'continua', 'parcial', 'aislada', 'conjunto_especial'}
ESCALA_RECORTE = 3
POR_LAMINA = 12


def a_revisar(unidades, limites):
    """Las unidades cuyo edificado se traza: pendientes edificadas (la periferia sin casas, I007) y parciales aprobadas
    (que el generador rellena), fuera de los sectores límite del calce."""
    return [u for u in unidades if u['ocupacion'] in EDIFICADAS and u['sector'] not in limites
            and (u['estado'] == 'pendiente' or u['ocupacion'] == 'parcial')]


def recorte(rgb, bbox, poligonos, margen=MARGEN_PX, escala=ESCALA_RECORTE):
    """El recorte del original alrededor de la caja, ampliado, con lo trazado en verde y la caja en azul (RGB)."""
    x0, y0 = max(0, bbox[0] - margen), max(0, bbox[1] - margen)
    x1, y1 = min(rgb.shape[1], bbox[2] + margen), min(rgb.shape[0], bbox[3] + margen)
    grande = cv2.resize(np.ascontiguousarray(rgb[y0:y1, x0:x1]), None, fx=escala, fy=escala, interpolation=cv2.INTER_NEAREST)
    cv2.rectangle(grande, ((bbox[0] - x0) * escala, (bbox[1] - y0) * escala), ((bbox[2] - x0) * escala, (bbox[3] - y0) * escala),
                  (0, 90, 255), 1)
    for p in poligonos:
        puntos = np.round((np.asarray(p) - (x0, y0)) * escala).astype(np.int32)
        cv2.polylines(grande, [puntos], True, (0, 200, 0), 2)
    return grande


def main():
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('--recortes', type=Path, required=True, help='carpeta fuera de git para los recortes y las láminas')
    ap.add_argument('--original', type=Path, default=raiz / 'fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg')
    args = ap.parse_args()
    ficha = args.original
    rgb = np.asarray(Image.open(ficha).convert('RGB'))
    censo = {u['id_fuente']: u for u in json.loads((args.carpeta / 'unidades-original.json').read_text())['unidades']}
    unidades = json.loads((Path(__file__).parent / 'referencias' / '1772-unidades.json').read_text())['unidades']
    limites = {s['sector'] for s in json.loads((args.carpeta / 'limites-calce.json').read_text())['sectores']}
    args.recortes.mkdir(parents=True, exist_ok=True)
    registros, laminas, tanda = [], [], []
    for u in a_revisar(unidades, limites):
        bbox = censo[u['id']]['bbox_original']
        poligonos = edificado_de_unidad(rgb, bbox)
        imagen = recorte(rgb, bbox, poligonos)
        archivo = args.recortes / f"{u['id']}.png"
        Image.fromarray(imagen).save(archivo)
        registros.append({'unidad': u['id'], 'sector': u['sector'], 'ocupacion': u['ocupacion'], 'estado': u['estado'],
                          'bbox_original': bbox, 'poligonos': poligonos,
                          'poligonos_sha256': hashlib.sha256(json.dumps(poligonos).encode()).hexdigest(),
                          'recorte': {'archivo_local': f'edificado/{archivo.name}', 'sha256': hashlib.sha256(archivo.read_bytes()).hexdigest()}})
        tanda.append((u['id'], imagen))
        if len(tanda) == POR_LAMINA:
            laminas.append(tanda); tanda = []
    if tanda:
        laminas.append(tanda)
    for k, t in enumerate(laminas, 1):
        _guardar_lamina(t, args.recortes / f'lamina-{k:02d}.png')
    from referencia_red import json_por_entidad
    (args.carpeta / 'edificado-original.json').write_text(json_por_entidad({
        'alcance': 'Lo edificado (manchas rojas) de cada unidad en el original de 1772, trazado automáticamente para revisarlo '
                   'a ojo (T33j.4a, decisión del responsable del 22-11-2026). No se usa sin la revisión de edificado-revisado.json.',
        'fuente': 'fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg', 'fuente_sha256': hashlib.sha256(ficha.read_bytes()).hexdigest(),
        'umbrales': {'tono_rojo': TONO_ROJO, 'saturacion_minima': SATURACION_MINIMA, 'brillo_minimo': BRILLO_MINIMO,
                     'dentro_minimo': DENTRO_MINIMO, 'area_minima_px': AREA_MINIMA_PX},
        'recortes': {'directorio': 'fuera de git', 'regenerar': '.venv/bin/python tools/geo/edificado_original.py specs/auditoria-1772 --recortes <carpeta>'},
        'unidades': registros}), encoding='utf-8')
    print(f'{len(registros)} unidades trazadas, {sum(1 for r in registros if not r["poligonos"])} sin mancha roja; {len(laminas)} láminas')


def _guardar_lamina(tanda, ruta):
    from PIL import Image, ImageDraw
    alto = max(i.shape[0] for _, i in tanda)
    ancho = max(i.shape[1] for _, i in tanda)
    columnas = 4
    hoja = Image.new('RGB', (columnas * ancho, -(-len(tanda) // columnas) * (alto + 16)), 'white')
    for k, (ident, imagen) in enumerate(tanda):
        x, y = (k % columnas) * ancho, (k // columnas) * (alto + 16)
        hoja.paste(Image.fromarray(imagen), (x, y + 16))
        ImageDraw.Draw(hoja).text((x + 2, y + 2), ident, fill='black')
    hoja.thumbnail((1800, 1800))
    hoja.save(ruta)


if __name__ == '__main__':
    main()
