#!/usr/bin/env python3
"""Contraste 1C de 1843 (T81): el censo del original contra las casas que el sitio muestra en 1843.

Cada unidad del censo (specs/auditoria-1843/censo.json, píxeles del original) se proyecta con el calce de 1843
al mosaico de 1936, donde están las casas del generador (fuentes/derivados/epocas/ciudad-epocas.json). Una casa
cuenta en la unidad que contiene su centro; con `tolerancia_m`, también la que está a esa distancia del borde
(media calle: las fachadas del generador y los bordes leídos no coinciden al metro).

- rayada: con_casas | sin_casas (la manzana del original no tiene casas en el sitio).
- lote_especial, plaza, huerta, terreno_libre: sin_casas (bien) | con_casas_indebidas.
- sobrantes: casas vivas en 1843 fuera de toda unidad (las de un lote o plaza cuentan como indebidas ahí).

Cuenta lo medido; no certifica fidelidad.
"""
import argparse
import hashlib
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from shapely.geometry import Point, Polygon
from shapely.strtree import STRtree

sys.path.insert(0, str(Path(__file__).resolve().parent))

EPOCA_1843 = 2
EDIFICABLES = {'rayada', 'parte_de_otra_unidad'}
LIBRES = {'lote_especial', 'plaza', 'huerta', 'terreno_libre'}
TOLERANCIA_M = 3.0   # media calle angosta de 1843 (~6 m): una casa a menos de esto del borde es de la manzana


def vive(vida, epoca):
    nace, muere = vida
    return nace <= epoca and (muere == 0 or epoca < muere)


def _figura(pol):
    f = Polygon(pol).buffer(0)
    return f if not f.is_empty else None


def clasificar(unidades, casas, metro, tolerancia_m=TOLERANCIA_M):
    """unidades: [{id, ocupacion, poligono (px del mosaico)}]; casas: [{techo, poligono}] ya filtradas por época."""
    figuras = [(u, _figura(u['poligono'])) for u in unidades]
    figuras = [(u, f) for u, f in figuras if f is not None]
    arbol = STRtree([f for _, f in figuras])
    tol = tolerancia_m / metro
    cuenta, ubicadas = defaultdict(int), set()
    for c in casas:
        centro = Point(np.asarray(c['poligono'], float).mean(axis=0))
        cerca = [figuras[i] for i in arbol.query(centro.buffer(tol) if tol > 0 else centro)]
        # un lote, plaza o huerta manda sobre la manzana que lo contiene: la casa es indebida ahí y en ningún otro lado
        destino = [u for u, f in cerca if u['ocupacion'] in LIBRES and f.contains(centro)] or \
                  [u for u, f in cerca if u['ocupacion'] in EDIFICABLES and (f.contains(centro) or f.distance(centro) <= tol)]
        for u in destino:
            cuenta[u['id']] += 1
        if destino:
            ubicadas.add(c['techo'])
    filas = []
    for u, _ in figuras:
        n = cuenta[u['id']]
        if u['ocupacion'] == 'rayada':
            estado = 'con_casas' if n else 'sin_casas'
        elif u['ocupacion'] in LIBRES:
            estado = 'con_casas_indebidas' if n else 'sin_casas'
        else:
            estado = 'no_aplica'
        filas.append({'id': u['id'], 'ocupacion': u['ocupacion'], 'casas': n, 'estado': estado,
                      **({'letras': u['letras']} if u.get('letras') else {})})
    resumen = defaultdict(Counter)
    for f in filas:
        if f['estado'] != 'no_aplica':
            resumen[f['ocupacion']][f['estado']] += 1
    return {'unidades': filas, 'sobrantes': sorted(c['techo'] for c in casas if c['techo'] not in ubicadas),
            'resumen': {k: dict(sorted(v.items())) for k, v in resumen.items()}}


def main(argv=None):  # pragma: no cover - E/S
    from calce import Calce
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--censo', type=Path, default=raiz / 'specs/auditoria-1843/censo.json')
    ap.add_argument('--gcp', type=Path, default=raiz / 'tools/geo/gcp/calce-1843-nypl-jesurun-facsimil-muller-stapler.json')
    ap.add_argument('--ciudad', type=Path, default=raiz / 'fuentes/derivados/epocas/ciudad-epocas.json')
    ap.add_argument('--datos', default=None, help='release datos-* o commit del que sale la ciudad medida')
    ap.add_argument('--salida', type=Path, default=raiz / 'specs/auditoria-1843/contraste-unidades.json')
    a = ap.parse_args(argv)
    censo = json.loads(a.censo.read_text())
    calce_cfg = json.loads(a.gcp.read_text())
    metro = 0.5
    calce = Calce.ajustar(calce_cfg['gcps'], metro, calce_cfg.get('suavizado', 0.0))
    unidades = []
    for u in censo['unidades']:
        pol = np.asarray(u['poligono_px'], float)
        x, y = calce.a_1936(pol[:, 0], pol[:, 1])
        unidades.append({**u, 'poligono': np.column_stack([x, y]).tolist()})
    ciudad = json.loads(a.ciudad.read_text())
    V = np.asarray(ciudad['vertices'], float).reshape(-1, 2)
    casas = [{'techo': i, 'poligono': V[t[0]:t[0] + t[1]]} for i, t in enumerate(ciudad['techos'])
             if vive(ciudad['vida'][i], EPOCA_1843)]
    r = clasificar(unidades, casas, metro)
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()  # noqa: E731
    doc = {'alcance': __doc__.split('\n\n')[0], 'datos': a.datos, 'casas_1843': len(casas),
           'entradas': {k: {'archivo': str(getattr(a, k).relative_to(raiz)) if getattr(a, k).is_relative_to(raiz) else str(getattr(a, k)),
                            'sha256': sha(getattr(a, k))} for k in ('censo', 'gcp', 'ciudad')},
           'tolerancia_m': TOLERANCIA_M, **r}
    a.salida.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{len(casas)} casas en 1843; {r['resumen']}; {len(r['sobrantes'])} sobrantes")


if __name__ == '__main__':
    main()
