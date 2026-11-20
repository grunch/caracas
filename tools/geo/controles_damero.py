"""Controles de calce por sector y correspondencias por unidad, con identidad de damero (specs/08, 1D → T33j.2a).

    .venv/bin/python tools/geo/controles_damero.py --ciudad fuentes/derivados/epocas/ciudad-estilos.json \
        [--original fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg --mosaico fuentes/derivados/1936/mosaico.tif \
         --recortes .cache/damero-1772 --muestra 2]

Escribe specs/auditoria-1772/controles-calce-sectores.json y correspondencias-unidades.json. No toca
tools/geo/gcp ni el generador: mide la discrepancia del TPS actual y clasifica; no aprueba geometría.
"""
import argparse
from collections import Counter
import datetime as dt
import hashlib
import json
from pathlib import Path
import sys

import numpy as np
from shapely.geometry import MultiPoint, Polygon
from shapely.ops import unary_union

sys.path.insert(0, str(Path(__file__).resolve().parent))
from calce import Calce  # noqa: E402
from damero import clasificar_correspondencias, controles, cruces_1772, reticula_1936  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
AUD = RAIZ / 'specs/auditoria-1772'
METRO = 0.5
ORIGEN_1936 = 'Las Monjas'   # esquina suroeste de la plaza, la misma que ORIGEN_1772_PX
# Hitos reconocibles en los dos planos, para sectores sin cruces del damero y como prueba de identidad a gran distancia.
HITOS = [
    {'id': 'H1772-plaza-mayor', 'unidad': None, 'centro_original': [1000.5, 824.5], 'sector': 'S1772-23', 'nombre_1936': 'Plaza Bolívar',
     'mosaico_1936': [8968.2, 6839.0], 'fuente': 'public/datos/ciudad.json (plaza) y semillas manuales del calce'},
    {'id': 'H1772-candelaria', 'unidad': 'U1772-0214', 'nombre_1936': 'Plaza de Candelaria', 'mosaico_1936': [11230.0, 7000.0],
     'fuente': 'src/marcas-datos.js (candelaria, plano DCN 1936); unidad «Plaza de Candelaria y tres cuerpos rojos» del censo'},
    {'id': 'H1772-la-pastora', 'unidad': 'U1772-0267', 'nombre_1936': 'Iglesia La Pastora', 'mosaico_1936': [8113.0, 4866.0],
     'fuente': 'src/hitos/datos/iglesias.js (la-pastora, plano DCN 1936); unidad «Templo de La Pastora» del censo'},
]


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def _sha(ruta):
    return hashlib.sha256(Path(ruta).read_bytes()).hexdigest()


def angulo_damero(puntos, rango_px=(150, 260)):
    """Giro del damero de 1936 respecto de los ejes del mosaico: mediana de los vectores entre esquinas vecinas."""
    P = np.asarray(puntos, float)
    d = P[:, None, :] - P[None, :, :]
    n = np.hypot(d[..., 0], d[..., 1])
    v = d[(n > rango_px[0]) & (n < rango_px[1])]
    a = np.degrees(np.arctan2(v[:, 1], v[:, 0])) % 90
    return float(np.median(np.where(a > 45, a - 90, a)))


def _escalar(calce):
    def proyectar(x, y):
        px, py = calce.a_1936(np.asarray([x], float), np.asarray([y], float))
        return float(px[0]), float(py[0])
    return proyectar


def resumen_por_sector(nodos, sectores):
    filas = []
    for s in sectores:
        d = sorted(n['desvio_m'] for n in nodos if n['sector'] == s['id'])
        filas.append({'sector': s['id'], 'controles': len(d),
                      'rms_m': round(float(np.sqrt(np.mean(np.square(d)))), 2) if d else None,
                      'mediana_m': round(float(np.median(d)), 2) if d else None, 'max_m': max(d) if d else None})
    return filas


def comparar_con_nucleo(nodos, nucleo, tolerancia_px=6):
    """Los 23 cruces curados de #77 frente a los de identidad de damero: misma esquina y desvío parecido."""
    filas = []
    for ref in nucleo:
        ox, oy = ref['original']
        mio = next((n for n in nodos if abs(n['original'][0] - ox) <= tolerancia_px and abs(n['original'][1] - oy) <= tolerancia_px), None)
        filas.append({'nodo_curado': ref['id'], 'desvio_curado_m': ref['desvio_m'], 'nodo_damero': mio['id'] if mio else None,
                      'desvio_damero_m': mio['desvio_m'] if mio else None,
                      'distancia_esquina_vs_curado_m': round(float(np.hypot(*(np.array(mio['mosaico_identidad']) - ref['mosaico_referencia'])) * METRO), 2) if mio else None})
    return filas


def controles_por_hito(hitos, unidades, proyectar_calce, proyectar_control, metro):
    """Desvío del TPS y del calce de control respecto del hito de 1936; el centro del hito de 1772 es el de su unidad censada."""
    filas = []
    for h in hitos:
        u = unidades.get(h['unidad']) if h.get('unidad') else None
        if u:
            x0, y0, x1, y1 = u['bbox_original']
            centro, sector = [(x0 + x1) / 2, (y0 + y1) / 2], u['sector']
        else:
            centro, sector = list(h['centro_original']), h['sector']
        hx, hy = h['mosaico_1936']
        tps, control = proyectar_calce(*centro), proyectar_control(*centro)
        filas.append({'id': h['id'], 'unidad': h.get('unidad'), 'sector': sector, 'centro_original': centro, 'mosaico_1936': [hx, hy],
                      'nombre_1936': h['nombre_1936'], 'fuente': h['fuente'],
                      'desvio_tps_m': round(float(np.hypot(tps[0] - hx, tps[1] - hy)) * metro, 2),
                      'desvio_control_m': round(float(np.hypot(control[0] - hx, control[1] - hy)) * metro, 2)})
    return filas


def cuadras_visibles(ciudad, epoca=1):
    """Polígono construido de cada cuadra del sistema en `epoca`: unión de sus huellas vivas (px del mosaico)."""
    techos, vertices, vida, cuadras = (ciudad[k] for k in ('techos', 'vertices', 'vida', 'cuadras'))
    por_cuadra = {}
    for numero, (nace, muere) in enumerate(vida):
        if nace > epoca or (muere and muere <= epoca) or numero >= len(cuadras) or cuadras[numero] < 0:
            continue
        inicio, cuantos = techos[numero][:2]
        puntos = list(zip(vertices[2 * inicio:2 * (inicio + cuantos):2], vertices[2 * inicio + 1:2 * (inicio + cuantos):2]))
        if cuantos >= 3:
            figura = Polygon(puntos).buffer(0)
            if figura.area > 0:
                por_cuadra.setdefault(cuadras[numero], []).append(figura)
    return [{'id': c, 'poligono': unary_union(figuras).buffer(4).buffer(-4), 'huellas': len(figuras)} for c, figuras in sorted(por_cuadra.items())]


def poligonos_unidades(unidades, proyectar, dentro_de):
    salida = []
    for u in unidades:
        x0, y0, x1, y1 = u['bbox_original']
        esquinas = [proyectar(x, y) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
        salida.append({'id': u['id_fuente'], 'sector': u['sector'], 'ocupacion': u['revision_original']['ocupacion'],
                       'poligono': Polygon(esquinas), 'centro_original': ((x0 + x1) / 2, (y0 + y1) / 2),
                       'extrapolada': not dentro_de.contains(MultiPoint([((x0 + x1) / 2, (y0 + y1) / 2)]))})
    return salida


def _ruta_relativa(ruta):
    return str(ruta.relative_to(RAIZ)) if ruta.is_relative_to(RAIZ) else str(ruta)


def _recortes(args, nodos, filas, unidades, cuadras):
    import damero_recortes as dr
    import tifffile
    from PIL import Image
    original = np.asarray(Image.open(args.original).convert('RGB'))
    mosaico = tifffile.imread(args.mosaico)
    salida = Path(args.recortes)
    evidencias = []
    for sector in sorted({n['sector'] for n in nodos if n['sector']}):
        propios = sorted((n for n in nodos if n['sector'] == sector), key=lambda n: n['desvio_m'])
        elegidos = {propios[-1]['id']: propios[-1], propios[len(propios) // 2]['id']: propios[len(propios) // 2]}
        for n in list(elegidos.values())[:args.muestra]:
            img = dr.lado_a_lado(original, mosaico, n['original'], 70, n['mosaico_identidad'], 220,
                                 [(*n['mosaico_identidad'], 'lime'), (*n['mosaico_calce'], 'red')],
                                 titulo=f"{n['id']} {sector} índice {n['indice']} · verde: esquina 1936 por identidad · rojo: TPS · desvío {n['desvio_m']} m")
            ruta = salida / 'controles' / f"{sector}-{n['id']}.png"
            evidencias.append({'archivo_local': _ruta_relativa(ruta), 'sha256': dr.guardar(img, ruta), 'nodo': n['id']})
    por_clase = {}
    for f in filas:
        por_clase.setdefault(f['clase'], []).append(f)
    u_por_id = {u['id']: u for u in unidades}
    c_por_id = {c['id']: c for c in cuadras}
    for clase, lista in por_clase.items():
        paso = max(1, len(lista) // 6)
        for f in lista[::paso][:6]:
            u = u_por_id[f['unidad']]
            cx, cy = u['poligono'].centroid.coords[0]
            poligonos = [(list(u['poligono'].exterior.coords), 'blue')]
            for g in f['cuadras'][:4]:
                p = c_por_id[g['cuadra']]['poligono']
                for parte in (p.geoms if hasattr(p, 'geoms') else [p]):
                    poligonos.append((list(parte.exterior.coords), 'orange'))
            img = dr.lado_a_lado(original, mosaico, u['centro_original'], 60, (cx, cy), 200, [], poligonos,
                                 titulo=f"{f['unidad']} {u['sector']} {u['ocupacion']} → {clase} · azul: unidad por calce de control · naranja: cuadras del sistema en 1772")
            ruta = salida / 'correspondencias' / f"{clase}-{f['unidad']}.png"
            evidencias.append({'archivo_local': _ruta_relativa(ruta), 'sha256': dr.guardar(img, ruta), 'unidad': f['unidad'], 'clase': clase})
    return evidencias


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--ciudad', type=Path, required=True, help='ciudad-estilos.json con techos, vertices, vida y cuadras')
    ap.add_argument('--gcp', type=Path, default=RAIZ / 'tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json')
    ap.add_argument('--esquinas', type=Path, default=RAIZ / 'tools/geo/esquinas/1936-esquinas.json')
    ap.add_argument('--original', type=Path, default=None)
    ap.add_argument('--mosaico', type=Path, default=None)
    ap.add_argument('--recortes', type=Path, default=None)
    ap.add_argument('--muestra', type=int, default=2)
    args = ap.parse_args()

    trazado = _leer(AUD / 'trazado-calles-original.json')
    sectores = _leer(AUD / 'sectores.json')['sectores']
    esquinas = _leer(args.esquinas)
    puntos = [e['px'] for e in esquinas]
    gcp = _leer(args.gcp)
    calce = Calce.ajustar(gcp['gcps'], METRO, gcp.get('suavizado', 0.0))
    angulo = angulo_damero(puntos)
    origen = next(i for i, e in enumerate(esquinas) if e['nombre'] == ORIGEN_1936)
    reticula = reticula_1936(puntos, origen, angulo)
    cruces = cruces_1772(trazado['lineas'], sectores)
    nodos = controles(cruces, reticula, puntos, _escalar(calce), METRO)
    for n in nodos:
        n['esquina_1936_nombre'] = esquinas[n['esquina_1936']]['nombre']
    nucleo = _leer(AUD / 'controles-calce-centro.json')['nodos']
    hoy = dt.date.today().isoformat()
    informe = {
        'fecha': hoy, 'alcance': 'Controles independientes del TPS por identidad de damero; miden discrepancia, no exactitud geográfica.',
        'fuentes': {'trazado': _sha(AUD / 'trazado-calles-original.json'), 'esquinas_1936': _sha(args.esquinas), 'gcp': _sha(args.gcp)},
        'parametros': {'angulo_damero_1936_grados': round(angulo, 2), 'origen_1936': ORIGEN_1936, 'metro': METRO,
                       'esquinas_indexadas': len(reticula), 'esquinas_totales': len(puntos), 'cruces_1772': len(cruces)},
        'por_sector': resumen_por_sector(nodos, sectores),
        'comparacion_nucleo': comparar_con_nucleo(nodos, nucleo),
        'nodos': nodos,
    }
    ciudad = _leer(args.ciudad)
    control = Calce.ajustar([{'px': n['original'][0], 'py': n['original'][1], 'x36': n['mosaico_identidad'][0], 'y36': n['mosaico_identidad'][1]} for n in nodos], METRO, 0.05)
    casco = MultiPoint([tuple(n['original']) for n in nodos]).convex_hull
    unidades_json = _leer(AUD / 'unidades-original.json')['unidades']
    unidades = poligonos_unidades(unidades_json, _escalar(control), casco)
    informe['controles_por_hito'] = controles_por_hito(HITOS, {u['id_fuente']: u for u in unidades_json}, _escalar(calce), _escalar(control), METRO)
    cuadras = cuadras_visibles(ciudad)
    filas, sobrantes = clasificar_correspondencias(unidades, cuadras)
    for f, u in zip(filas, unidades):
        f['sector'] = u['sector']
        f['extrapolada'] = u['extrapolada']
        f['mosaico_poligono'] = [[round(x, 1), round(y, 1)] for x, y in u['poligono'].exterior.coords[:-1]]
    huellas = {c['id']: c['huellas'] for c in cuadras}
    correspondencias = {
        'fecha': hoy, 'alcance': 'Clasificación geométrica bajo el calce de control; la aprobación exige la muestra visual registrada en verificacion_visual.',
        'entrada_sha256': _sha(args.ciudad), 'epoca': 1,
        'calce_de_control': {'nodos': len(nodos), 'residuos_loo_m': control.residuos_m()},
        'resumen': {'clases': dict(sorted(Counter(f['clase'] for f in filas).items())), 'extrapoladas': sum(1 for u in unidades if u['extrapolada']),
                    'cuadras_sistema_1772': len(cuadras), 'cuadras_sobrantes': len(sobrantes)},
        'por_sector': [{'sector': s['id'], **dict(sorted(Counter(f['clase'] for f in filas if f['sector'] == s['id']).items()))} for s in sectores],
        'unidades': filas, 'cuadras_sobrantes': [{'cuadra': c, 'huellas': huellas[c]} for c in sobrantes],
        'verificacion_visual': [],
    }
    if args.recortes:
        evidencias = _recortes(args, nodos, filas, unidades, cuadras)
        informe['evidencias'] = [e for e in evidencias if 'nodo' in e]
        correspondencias['evidencias'] = [e for e in evidencias if 'unidad' in e]
    (AUD / 'controles-calce-sectores.json').write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    (AUD / 'correspondencias-unidades.json').write_text(json.dumps(correspondencias, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"ángulo {angulo:.2f}°; esquinas indexadas {len(reticula)}/{len(puntos)}; cruces {len(cruces)}; controles {len(nodos)}")
    for s in informe['por_sector']:
        print(f"  {s['sector']}: {s['controles']} controles, mediana {s['mediana_m']} m, máx {s['max_m']} m")
    print('correspondencias:', correspondencias['resumen'])


if __name__ == '__main__':
    main()
