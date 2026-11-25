#!/usr/bin/env python3
"""Contraste 1C de 1843 (T81): el censo del original contra las casas que el sitio muestra en 1843.

Cada unidad del censo (specs/auditoria-1843/censo.json, píxeles del original) se proyecta con el calce de 1843
al mosaico de 1936, donde están las casas del generador (fuentes/derivados/epocas/ciudad-epocas.json). Una casa
cuenta en la unidad que contiene su centro; con `tolerancia_m`, también la que está a esa distancia del borde
(media calle: las fachadas del generador y los bordes leídos no coinciden al metro).

- rayada: con_casas | sin_casas (la manzana del original no tiene casas en el sitio).
- lote_especial, plaza, huerta, terreno_libre: sin_casas (bien) | con_casas_indebidas.
- sobrantes: casas vivas en 1843 fuera de toda unidad (las de un lote o plaza cuentan como indebidas ahí).

Cuentan las casas a la vista: las que un hito en pie en 1843 esconde (pisaLaZona) no. Manda la unidad más chica
que contiene la casa. Cuenta lo medido; no certifica fidelidad.
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


def visibles_en(casas, hitos, epoca=EPOCA_1843):
    """Las casas que el visor deja a la vista en `epoca`: sin las que suprime un hito en pie (la regla de
    src/hitos/suprimir.js, la misma de cierre_fase4.visibles)."""
    from cierre_fase4 import se_suprime
    zonas = [z for h in hitos if h['nace'] <= epoca and (h['muere'] == 0 or h['muere'] > epoca) for z in h.get('suprime', [])]
    return [c for c in casas if not se_suprime(Polygon(np.asarray(c['poligono'], float)).buffer(0), zonas)]


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
        centro = Polygon(np.asarray(c['poligono'], float)).buffer(0).representative_point()   # siempre dentro de la casa
        cerca = [figuras[i] for i in arbol.query(centro.buffer(tol) if tol > 0 else centro)]
        # manda la unidad más chica que contiene la casa: un lote dentro de su manzana, una manzana dentro de una huerta
        contienen = sorted((f.area, k) for k, (u, f) in enumerate(cerca) if f.contains(centro))
        if contienen:
            destino = [cerca[contienen[0][1]][0]]
        else:
            destino = [u for u, f in cerca if u['ocupacion'] in EDIFICABLES and f.distance(centro) <= tol][:1]
        for u in destino:
            if u['ocupacion'] in EDIFICABLES | LIBRES:
                cuenta[u['id']] += 1
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


def puerta_fases_3_4(contraste, estados, vida, cubiertas_por_hito):
    """Fases 3 y 4 de 1843 desde el contraste (specs/08 con lo de specs/11). Fase 3: ninguna casa nacida en 1843
    fuera de las unidades (en una calle o en el campo); las vivas desde antes son límite (cambiarlas tocaría 1772).
    Fase 4: cada manzana rayada aprobada con casas, salvo la que cubre un hito en pie; ningún lote especial, plaza,
    huerta o terreno libre con casas. `estados`: id → estado en la referencia; `vida`: techo → [nace, muere]."""
    nuevas = [t for t in contraste['sobrantes'] if vida[t][0] >= EPOCA_1843]
    antes = [t for t in contraste['sobrantes'] if vida[t][0] < EPOCA_1843]
    vacias = [f['id'] for f in contraste['unidades'] if f['ocupacion'] == 'rayada' and f['estado'] == 'sin_casas']
    pendientes = [i for i in vacias if estados.get(i) != 'aprobada']
    por_hito = [i for i in vacias if estados.get(i) == 'aprobada' and i in cubiertas_por_hito]
    sin_motivo = [i for i in vacias if i not in pendientes and i not in por_hito]
    indebidas = [f['id'] for f in contraste['unidades'] if f['estado'] == 'con_casas_indebidas']
    criterios = {'calles_de_1843_libres': {'cumplido': not nuevas, 'casas': nuevas, 'de_antes_en_limite': antes},
                 'rayadas_con_casas': {'cumplido': not sin_motivo, 'sin_casas': sin_motivo, 'por_hito': por_hito,
                                       'pendientes': pendientes},
                 'libres_sin_casas': {'cumplido': not indebidas, 'con_casas': indebidas}}
    return {'fase_3_cerrable': criterios['calles_de_1843_libres']['cumplido'],
            'fase_4_cerrable': criterios['rayadas_con_casas']['cumplido'] and criterios['libres_sin_casas']['cumplido'],
            'criterios': criterios}


CUBIERTA_POR_HITO = 0.3   # parte de la manzana bajo la zona que suprime un hito en pie para que su vacío sea del hito


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
    import subprocess
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    vivas = len(casas)
    casas = visibles_en(casas, hitos)
    r = clasificar(unidades, casas, metro)
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()  # noqa: E731
    doc = {'alcance': __doc__.split('\n\n')[0], 'datos': a.datos, 'casas_1843': len(casas), 'casas_bajo_hitos': vivas - len(casas),
           'entradas': {k: {'archivo': str(getattr(a, k).relative_to(raiz)) if getattr(a, k).is_relative_to(raiz) else str(getattr(a, k)),
                            'sha256': sha(getattr(a, k))} for k in ('censo', 'gcp', 'ciudad')},
           'tolerancia_m': TOLERANCIA_M, **r}
    a.salida.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{len(casas)} casas en 1843; {r['resumen']}; {len(r['sobrantes'])} sobrantes")
    ref = raiz / 'tools/geo/referencias/1843-manzanas.json'
    if ref.exists():
        estados = {u['id']: u['estado'] for u in json.loads(ref.read_text())['unidades']}
        zonas = [Polygon(z).buffer(0) for h in hitos if h['nace'] <= EPOCA_1843 and (h['muere'] == 0 or h['muere'] > EPOCA_1843)
                 for z in h.get('suprime', [])]
        cubiertas = set()
        for u in unidades:
            f = _figura(u['poligono'])
            if f is not None and sum(f.intersection(z).area for z in zonas) > CUBIERTA_POR_HITO * f.area:
                cubiertas.add(u['id'])
        cierre = puerta_fases_3_4(r, estados, {k: ciudad['vida'][k] for k in r['sobrantes']}, cubiertas)
        (raiz / 'specs/auditoria-1843/cierre-fases-3-4.json').write_text(json.dumps({'datos': a.datos, **cierre}, ensure_ascii=False, indent=1) + '\n')
        print('fase 3 cerrable:', cierre['fase_3_cerrable'], '· fase 4 cerrable:', cierre['fase_4_cerrable'])


if __name__ == '__main__':
    main()
