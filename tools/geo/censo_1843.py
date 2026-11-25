#!/usr/bin/env python3
"""Censo 1B de 1843 (T81): junta las lecturas por sector en unidades con ID estable y las valida.

Cada lector registra las unidades cuyo centro cae en su sector (specs/11); este módulo les da un ID
U1843-NNNN ordenado por sector y posición (de norte a sur, de oeste a este), cuenta por ocupación y por
sector, y lista los problemas: ocupación fuera del vocabulario, centro fuera del sector y la misma
unidad registrada desde dos sectores. Lógica pura; el programa lee scratch y escribe el censo.

    .venv/bin/python tools/geo/censo_1843.py <carpeta con S1843-*.json> --salida specs/auditoria-1843/censo.json
"""
import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

from shapely.geometry import Polygon, box

OCUPACIONES = {'rayada', 'lote_especial', 'plaza', 'huerta', 'terreno_libre', 'parte_de_otra_unidad',
               'descartada_no_edificacion'}
SOLAPE_DUPLICADA = 0.6   # intersección / caja menor: más que esto entre sectores distintos es la misma unidad…
TAMANO_PARECIDO = 0.5    # …si además la menor mide al menos esto de la mayor; si no, una está dentro de la otra
FILA_PX = 40             # para ordenar de norte a sur sin que un px de diferencia cambie el orden


def _centro(caja):
    return ((caja[0] + caja[2]) / 2, (caja[1] + caja[3]) / 2)


def corregir(lecturas, correcciones):
    """Lecturas nuevas con las correcciones aplicadas (quitar, mover a otro sector, cambiar la ocupación).

    Cada corrección nombra su unidad por sector y letra local y lleva su motivo, que queda en la unidad.
    Una corrección que no encuentra su unidad es un error: la lectura cambió y hay que revisarla."""
    por_sector = {lect['sector']: [dict(u) for u in lect.get('unidades', [])] for lect in lecturas}
    for c in correcciones:
        filas = por_sector.get(c['sector'], [])
        i = next((k for k, u in enumerate(filas) if u['local'] == c['local']), None)
        if i is None:
            raise KeyError(f"{c['sector']}/{c['local']}: la corrección no encuentra su unidad")
        u = {**filas.pop(i), 'correccion': c['motivo']}
        if c['accion'] == 'mover':
            por_sector.setdefault(c['a'], []).append({**u, 'local': f"{u['local']}@{c['sector']}"})
        elif c['accion'] == 'ocupacion':
            filas.insert(i, {**u, 'ocupacion': c['valor'], **({'de': c['de']} if 'de' in c else {})})
    return [{**lect, 'unidades': por_sector.get(lect['sector'], [])} for lect in lecturas] + [
        {'sector': s, 'unidades': us} for s, us in por_sector.items() if s not in {l['sector'] for l in lecturas}]


def juntar(lecturas, sectores):
    orden = {s['id']: i for i, s in enumerate(sectores)}
    filas = [{**u, 'sector': lect['sector']} for lect in lecturas for u in lect.get('unidades', [])]
    filas.sort(key=lambda u: (orden.get(u['sector'], len(orden)), round(_centro(u['caja_px'])[1] / FILA_PX),
                              _centro(u['caja_px'])[0]))
    unidades = [{'id': f'U1843-{i + 1:04d}', **u} for i, u in enumerate(filas)]
    return {'unidades': unidades, 'por_ocupacion': dict(sorted(Counter(u['ocupacion'] for u in unidades).items())),
            'por_sector': dict(sorted(Counter(u['sector'] for u in unidades).items()))}


def _figura(u):
    """El polígono leído (válido) o, si no sirve, la caja."""
    pol = u.get('poligono_px') or []
    if len(pol) >= 3:
        figura = Polygon(pol).buffer(0)
        if not figura.is_empty and figura.area > 0:
            return figura
    return box(*u['caja_px'])


def _solape(a, b):
    fa, fb = _figura(a), _figura(b)
    menor = min(fa.area, fb.area)
    return fa.intersection(fb).area / menor if menor > 0 else 0.0


def _choque(a, b):
    """'duplicada' (la misma unidad desde dos sectores), 'manzana_dentro_de_manzana' (dos lectores partieron
    distinto la misma manzana) o None (lo anidado válido: un edificio en una huerta, un lote en su manzana)."""
    if a['sector'] == b['sector'] or _solape(a, b) <= SOLAPE_DUPLICADA:
        return None
    menor, mayor = sorted((_figura(a).area, _figura(b).area))
    if mayor and menor / mayor >= TAMANO_PARECIDO:
        return 'duplicada'
    if a['ocupacion'] == b['ocupacion'] == 'rayada':
        return 'manzana_dentro_de_manzana'
    return None


def problemas(censo, sectores):
    cajas = {s['id']: s['caja_px'] for s in sectores}
    salida = []
    unidades = censo['unidades']
    for u in unidades:
        if u['ocupacion'] not in OCUPACIONES:
            salida.append({'tipo': 'ocupacion_invalida', 'unidad': u['id'], 'valor': u['ocupacion']})
        cx, cy = _centro(u['caja_px'])
        x0, y0, x1, y1 = cajas.get(u['sector'], (0, 0, 0, 0))
        if not (x0 <= cx < x1 and y0 <= cy < y1):
            salida.append({'tipo': 'centro_fuera_del_sector', 'unidad': u['id'], 'centro_px': [cx, cy]})
    for i, a in enumerate(unidades):
        for b in unidades[i + 1:]:
            tipo = _choque(a, b)
            if tipo:
                salida.append({'tipo': tipo, 'unidad': a['id'], 'con': b['id']})
    return salida


def main(argv=None):  # pragma: no cover - E/S
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('carpeta', type=Path)
    ap.add_argument('--sectores', type=Path, default=raiz / 'specs/auditoria-1843/sectores.json')
    ap.add_argument('--correcciones', type=Path, default=raiz / 'specs/auditoria-1843/censo-correcciones.json')
    ap.add_argument('--salida', type=Path, required=True)
    a = ap.parse_args(argv)
    sectores = json.loads(a.sectores.read_text())['sectores']
    archivos = sorted(a.carpeta.glob('S1843-*.json'))
    lecturas = [json.loads(p.read_text()) for p in archivos]
    correcciones = json.loads(a.correcciones.read_text())['correcciones'] if a.correcciones.exists() else []
    censo = juntar(corregir(lecturas, correcciones), sectores)
    doc = {'alcance': 'Censo 1B de 1843 sobre el original (T81): una unidad por manzana, lote especial, plaza, huerta o '
                      'terreno delimitado, registrada por el lector del sector que contiene su centro.',
           'lecturas': [{'sector': l['sector'], 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
                         'vacio': l.get('vacio', False), 'teselas': l.get('teselas'), 'observaciones': l.get('observaciones', [])}
                        for p, l in zip(archivos, lecturas)],
           'correcciones': len(correcciones), **censo, 'problemas': problemas(censo, sectores)}
    a.salida.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(len(censo['unidades']), 'unidades;', censo['por_ocupacion'], ';', len(doc['problemas']), 'problemas')


if __name__ == '__main__':
    main()
