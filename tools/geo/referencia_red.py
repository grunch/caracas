"""Red de calles de la referencia histórica de 1772 (fase 2 de specs/08, T33j.2b).

Cada intersección del trazado del original es un nodo con un solo ID: los cruces del damero conservan su X1772-…,
los encuentros fuera del damero son E1772-… y los extremos sueltos de una línea, T1772-…. Una calle es la secuencia
de sus nodos en el orden del trazado. La pareja en 1936 (`mosaico`) sale solo de la identidad del calce vigente
(anclas y semillas), nunca de la proyección del calce: un nodo sin pareja segura lleva su motivo.

Valida coherencia, no fidelidad: los ejes son aproximados y no habilitan la generación (eso es la fase 3).

    .venv/bin/python tools/geo/referencia_red.py specs/auditoria-1772 tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json
"""
import argparse
import itertools
import json
import math
from pathlib import Path

from shapely.geometry import LineString, Point
from shapely.strtree import STRtree

TOLERANCIA_PX = 3          # dos intersecciones a menos de esto son el mismo nodo (el trazado es a mano, en px)
ESTADOS = {'identidad_verificada', 'sin_pareja_segura'}
COLINEAL = 1e-3            # |seno| bajo el cual tres nodos se tienen por alineados y no definen orientación


def _cerca(a, b, tol=TOLERANCIA_PX):
    return math.hypot(a[0] - b[0], a[1] - b[1]) < tol


def _identidad_de(ident, identidad):
    anclas = {a['id']: a for a in identidad.get('anclas', []) if a.get('id')}
    if ident in anclas:
        a = anclas[ident]
        return {'estado': 'identidad_verificada', 'mosaico': [a['x36'], a['y36']], 'motivo': None,
                'procedencia': f"ancla del calce por identidad: {a.get('nota') or ident}"}
    if ident in identidad.get('por_semilla', {}):
        return {'estado': 'identidad_verificada', 'mosaico': list(identidad['por_semilla'][ident]), 'motivo': None,
                'procedencia': 'cruce sobre una semilla manual del calce (Plaza Mayor); pareja de controles-calce-sectores.json'}
    motivo = ('la esquina de 1936 asignada es un rótulo, no un cruce (calce-identidad.json, excluidos_por_rotulo)'
              if ident in identidad.get('rotulos', set()) else
              identidad.get('sin_pareja', {}).get(ident, 'sin esquina con nombre en 1936 ni pareja por topología'))
    return {'estado': 'sin_pareja_segura', 'mosaico': None, 'motivo': motivo,
            'procedencia': 'cruce de dos calles rectas del trazado sobre la retícula del damero (damero.cruces_1772)'}


def _intersecciones(lineas):
    """(punto, ids de las dos líneas) de cada par de líneas que se corta en un punto."""
    geos = [(l['id'], LineString(l['puntos'])) for l in lineas if len(l['puntos']) > 1]
    for (ia, a), (ib, b) in itertools.combinations(geos, 2):
        g = a.intersection(b)
        for p in getattr(g, 'geoms', [g]):
            if not p.is_empty and p.geom_type == 'Point':
                yield (round(p.x, 2), round(p.y, 2)), (ia, ib)


def _sumar(nodos, punto, ids, tipo, prefijo, sin_pareja):
    for n in nodos:
        if _cerca(n['original'], punto):
            n['lineas'] = sorted(set(n['lineas']) | set(ids))
            return
    nodos.append({'id': None, 'tipo': tipo, 'lineas': sorted(ids), 'original': list(punto), 'estado': 'sin_pareja_segura',
                  'mosaico': None, 'motivo': sin_pareja, 'procedencia': f'{tipo} del trazado del original ({prefijo})'})


def nodos_de_red(lineas, cruces, identidad, prefijo='1772', sector_de=None):
    """Cruces del damero (con su identidad), encuentros fuera del damero y extremos sueltos, cada uno una sola vez.
    `sector_de(x, y)`: el sector de un encuentro o un extremo (los cruces ya traen el suyo)."""
    cruce = [{'id': c['id'], 'tipo': 'cruce', 'lineas': sorted(c['lineas']), 'original': list(c['original']),
              'indice': list(c['indice']), 'sector': c.get('sector'), **_identidad_de(c['id'], identidad)} for c in cruces]
    nuevos = []
    for punto, ids in _intersecciones(lineas):
        if not any(_cerca(n['original'], punto) for n in cruce):
            _sumar(nuevos, punto, ids, 'encuentro', prefijo, 'encuentro fuera del damero: sin pareja por identidad en 1936')
        else:
            _sumar(cruce, punto, ids, 'cruce', prefijo, None)
    encuentros = sorted(nuevos, key=lambda n: (n['original'][1], n['original'][0]))
    terminales = []
    for l in lineas:
        for extremo in (l['puntos'][0], l['puntos'][-1]):
            punto = (round(float(extremo[0]), 2), round(float(extremo[1]), 2))
            if not any(_cerca(n['original'], punto) for n in cruce + encuentros):
                _sumar(terminales, punto, [l['id']], 'terminal', prefijo, 'extremo del trazado sin cruce: sin pareja en 1936')
    terminales.sort(key=lambda n: (n['original'][1], n['original'][0]))
    for letra, grupo in (('E', encuentros), ('T', terminales)):
        for k, n in enumerate(grupo, 1):
            n['id'] = f'{letra}{prefijo}-{k:04d}'
            n['sector'] = sector_de(*n['original']) if sector_de else None
    return cruce + encuentros + terminales


def calles_de_red(lineas, nodos):
    """Cada línea del trazado como la secuencia de sus nodos, ordenados a lo largo del trazado."""
    calles = []
    for l in lineas:
        geo = LineString(l['puntos'])
        propios = [n for n in nodos if l['id'] in n['lineas']]
        propios.sort(key=lambda n: geo.project(Point(n['original'])))
        calles.append({'id': l['id'], 'tipo': l['tipo'], 'estado': l['estado'], 'nodos': [n['id'] for n in propios]})
    return calles


def _validar_nodos(nodos):
    vistos, ids = {}, set()
    for n in nodos:
        if not n.get('id') or n['id'] in ids:
            raise ValueError(f"nodo con ID vacío o duplicado: {n.get('id')}")
        ids.add(n['id'])
        clave = tuple(round(v, 2) for v in n['original'])
        if clave in vistos:
            raise ValueError(f"{n['id']}: coordenada duplicada con {vistos[clave]}")
        vistos[clave] = n['id']
        if n.get('estado') not in ESTADOS:
            raise ValueError(f"{n['id']}: estado inválido {n.get('estado')!r}")
        if not n.get('procedencia'):
            raise ValueError(f"{n['id']}: procedencia obligatoria")
        m = n.get('mosaico')
        if n['estado'] == 'identidad_verificada':
            if not (isinstance(m, (list, tuple)) and len(m) == 2 and all(math.isfinite(v) for v in m)):
                raise ValueError(f"{n['id']}: identidad verificada sin mosaico")
        elif not n.get('motivo'):
            raise ValueError(f"{n['id']}: sin pareja segura y sin motivo obligatorio")
        elif m is not None:
            raise ValueError(f"{n['id']}: mosaico solo con identidad verificada")


def _tramos(calles, por_id):
    tramos, vistos = [], {}
    for c in calles:
        if len(c['nodos']) < 2:
            raise ValueError(f"{c['id']}: calle con menos de dos nodos")
        for a, b in zip(c['nodos'], c['nodos'][1:]):
            if a not in por_id or b not in por_id:
                raise ValueError(f"{c['id']}: nodo inexistente {a if a not in por_id else b}")
            if a == b:
                raise ValueError(f"{c['id']}: nodo repetido {a}")
            clave = frozenset((a, b))
            if clave in vistos:
                raise ValueError(f"tramo duplicado {a}–{b} en {vistos[clave]} y {c['id']}")
            vistos[clave] = c['id']
            tramos.append((c['id'], a, b))
    return tramos


def _sin_cruces(tramos, por_id, campo):
    geos = [LineString([por_id[a][campo], por_id[b][campo]]) for _, a, b in tramos]
    arbol = STRtree(geos)
    for i, g in enumerate(geos):
        for j in arbol.query(g, predicate='intersects'):
            if j <= i:
                continue
            comunes = {tramos[i][1], tramos[i][2]} & {tramos[j][1], tramos[j][2]}
            corte = g.intersection(geos[j])
            if comunes and corte.geom_type == 'Point':
                continue
            raise ValueError(f'cruce imposible en {campo}: {tramos[i][0]} {tramos[i][1]}–{tramos[i][2]} / '
                             f'{tramos[j][0]} {tramos[j][1]}–{tramos[j][2]}')


def _giro(o, a, b):
    ax, ay, bx, by = a[0] - o[0], a[1] - o[1], b[0] - o[0], b[1] - o[1]
    norma = math.hypot(ax, ay) * math.hypot(bx, by)
    return 0.0 if norma == 0 else (ax * by - ay * bx) / norma


def _vecinos_identificados(calles, por_id):
    """Para cada nodo identificado, el identificado anterior y siguiente en cada calle que lo contiene."""
    vecinos = {}
    for c in calles:
        ident = [x for x in c['nodos'] if por_id[x]['estado'] == 'identidad_verificada']
        for k, x in enumerate(ident):
            vecinos.setdefault(x, []).extend((c['id'], y) for y in (ident[k - 1:k] + ident[k + 1:k + 2]))
    return vecinos


def _orden(calles, por_id):
    """El orden de los cruces identificados es el mismo en 1936: a lo largo de cada calle recta y en el giro de cada
    esquina entre dos calles distintas (un pliegue invierte el giro)."""
    for c in calles:
        ident = [por_id[x] for x in c['nodos'] if por_id[x]['estado'] == 'identidad_verificada']
        if c['tipo'] != 'calle_recta' or len(ident) < 3:
            continue
        dx, dy = (ident[-1]['mosaico'][0] - ident[0]['mosaico'][0], ident[-1]['mosaico'][1] - ident[0]['mosaico'][1])
        avance = [n['mosaico'][0] * dx + n['mosaico'][1] * dy for n in ident]
        if any(b <= a for a, b in zip(avance, avance[1:])):
            raise ValueError(f"{c['id']}: el orden de sus cruces en 1936 no es el del original")
    for x, vs in _vecinos_identificados(calles, por_id).items():
        for (ca, a), (cb, b) in itertools.combinations(vs, 2):
            if ca == cb:
                continue
            o, pa, pb = por_id[x], por_id[a], por_id[b]
            g0, g1 = _giro(o['original'], pa['original'], pb['original']), _giro(o['mosaico'], pa['mosaico'], pb['mosaico'])
            if abs(g0) > COLINEAL and abs(g1) > COLINEAL and (g0 > 0) != (g1 > 0):
                raise ValueError(f'{x}: el orden de {a} y {b} en 1936 no es el del original (giro invertido)')


def validar_red(red):
    """Rechaza IDs o coordenadas duplicados, nodos sin estado, procedencia o motivo, calles con nodos inexistentes,
    nodos sueltos, tramos repetidos, cruces imposibles (en el original y entre nodos identificados en 1936) y cambios
    de orden. Devuelve un resumen; no muta la red."""
    nodos, calles = red['nodos'], red['calles']
    _validar_nodos(nodos)
    por_id = {n['id']: n for n in nodos}
    if len({c['id'] for c in calles}) != len(calles):
        raise ValueError('calle con ID duplicado')
    tramos = _tramos(calles, por_id)
    usados = {x for c in calles for x in c['nodos']}
    sueltos = sorted(set(por_id) - usados)
    if sueltos:
        raise ValueError(f'nodos que no usa ninguna calle: {sueltos}')
    _sin_cruces(tramos, por_id, 'original')
    _sin_cruces([t for t in tramos if por_id[t[1]]['mosaico'] and por_id[t[2]]['mosaico']], por_id, 'mosaico')
    _orden(calles, por_id)
    return {'nodos': len(nodos), 'calles': len(calles), 'tramos': len(tramos),
            'identidad_verificada': sum(n['estado'] == 'identidad_verificada' for n in nodos),
            'por_tipo': {t: sum(n['tipo'] == t for n in nodos) for t in ('cruce', 'encuentro', 'terminal')}}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def identidad_de_auditoria(carpeta, config):
    """Las parejas por identidad del calce vigente y los motivos de los cruces sin pareja, desde los JSON de la auditoría."""
    ident = _leer(carpeta / 'calce-identidad.json')
    controles = {n['id']: n for n in _leer(carpeta / 'controles-calce-sectores.json')['nodos']}
    topologia = _leer(carpeta / 'anclas-topologia.json')
    sin_pareja = {r['id']: f"pareja por topología rechazada a ojo: {r.get('motivo') or r.get('verificacion')}"
                  for r in topologia.get('rechazados', [])}
    return {'anclas': config.get('anclas', []),
            'por_semilla': {x: controles[x]['mosaico_identidad'] for x in ident.get('nodos_omitidos_por_semilla', [])},
            'rotulos': {x['id'] for x in ident.get('excluidos_por_rotulo', [])},
            'sin_pareja': sin_pareja}


def main():
    import hashlib
    from damero import _sector_de, cruces_1772
    from anclas_identidad import huella_calce
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('calce', type=Path, help='tools/geo/gcp/calce-1772-….json')
    ap.add_argument('--salida', type=Path, default=Path(__file__).parent / 'referencias' / '1772-red.json')
    args = ap.parse_args()
    trazado_ruta = args.carpeta / 'trazado-calles-original.json'
    trazado = _leer(trazado_ruta)
    sectores = _leer(args.carpeta / 'sectores.json')['sectores']
    config = _leer(args.calce)
    nodos = nodos_de_red(trazado['lineas'], cruces_1772(trazado['lineas'], sectores),
                         identidad_de_auditoria(args.carpeta, config), sector_de=lambda x, y: _sector_de(x, y, sectores))
    red = {'fuente': trazado['fuente'], 'fuente_sha256': trazado['fuente_sha256'],
           'trazado': 'specs/auditoria-1772/trazado-calles-original.json',
           'trazado_sha256': hashlib.sha256(trazado_ruta.read_bytes()).hexdigest(),
           'huella_calce': huella_calce(config.get('gcps', []), config.get('suavizado', 0.0)),
           'alcance': 'Red de la referencia histórica de 1772 (specs/08 fase 2, T33j.2b): cada intersección del trazado es '
                      'un nodo con un solo ID y cada calle, la secuencia de sus nodos. Ejes aproximados del original, sin '
                      'anchos; la pareja en 1936 sale solo de la identidad del calce vigente. No habilita la generación.',
           'nodos': nodos, 'calles': calles_de_red(trazado['lineas'], nodos)}
    resumen = validar_red(red)
    red = {**red, 'resumen': resumen}
    args.salida.write_text(json.dumps(red, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps(resumen, ensure_ascii=False))


if __name__ == '__main__':
    main()
