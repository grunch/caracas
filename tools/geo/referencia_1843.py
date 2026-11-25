#!/usr/bin/env python3
"""Referencia histórica de 1843 (T81.2b): el censo revisado, proyectado al mosaico de 1936 y validado.

Una unidad entra aprobada si su lectura del censo es segura o si una revisión independiente la aprobó o
corrigió con seguridad; lo que sigue dudoso queda pendiente (no entra al generador) y lo rechazado sale.
Una revisión puede agregar una unidad que el censo no tenía (decision «nueva»). Los archivos de revisión se aplican
en orden de nombre y, para una misma unidad, gana el último (`ajustes.json`, que cierra, va después de los S1843-*). La geometría se proyecta con
el calce de 1843; los validadores marcan geometría inválida y manzanas rayadas que se pisan.

    .venv/bin/python tools/geo/referencia_1843.py   → tools/geo/referencias/1843-manzanas.json
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from shapely.geometry import Polygon

sys.path.insert(0, str(Path(__file__).resolve().parent))

EDIFICABLES = {'rayada', 'parte_de_otra_unidad'}
LIBRES = {'lote_especial', 'plaza', 'huerta', 'terreno_libre'}
PISAN = 0.5   # parte de la menor de dos manzanas aprobadas dentro de la otra: se pisan


def _proyectar(pol, proyectar):
    p = np.asarray(pol, float)
    x, y = proyectar(p[:, 0], p[:, 1])
    return [[round(float(a), 2), round(float(b), 2)] for a, b in zip(x, y)]


def construir(censo, revisiones, proyectar):
    por_unidad = {r['unidad']: r for r in revisiones if r.get('unidad')}
    unidades, rechazadas = [], []
    for u in censo['unidades']:
        r = por_unidad.get(u['id'])
        if r and r['decision'] == 'rechazada':
            rechazadas.append(u['id'])
            continue
        revisada = r is not None and r.get('seguridad') == 'segura'
        aprobada = u.get('lectura') == 'segura' if r is None else revisada
        ocupacion = (r or {}).get('ocupacion') or u['ocupacion']
        poligono = (r or {}).get('poligono_px') or u['poligono_px']
        unidades.append({'id': u['id'], 'sector': u.get('sector'), 'ocupacion': ocupacion,
                         'estado': 'aprobada' if aprobada else 'pendiente',
                         'procedencia': 'revision' if r else 'censo', 'poligono_px': poligono,
                         'poligono': _proyectar(poligono, proyectar),
                         **({'letras': r['letras']} if r is not None and 'letras' in r else
                            {'letras': u['letras']} if u.get('letras') else {}),
                         **({'de': u['de']} if u.get('de') else {}),
                         **({'motivo': r['motivo']} if r else {})})
    nuevas = [r for r in revisiones if r.get('decision') == 'nueva']
    for k, r in enumerate(nuevas, 1):
        unidades.append({'id': f'U1843-N{k:03d}', 'sector': r.get('sector'), 'ocupacion': r['ocupacion'],
                         'estado': 'aprobada' if r.get('seguridad') == 'segura' else 'pendiente', 'procedencia': 'revision',
                         'poligono_px': r['poligono_px'], 'poligono': _proyectar(r['poligono_px'], proyectar),
                         'motivo': r['motivo'], **({'de': r['de']} if r.get('de') else {})})
    return {'unidades': unidades, 'rechazadas': rechazadas}


def _figura(u):
    """La figura de la unidad, o None si el polígono tal como está guardado no es válido (sin repararlo: la
    máscara rasteriza las coordenadas guardadas, así que la validez tiene que ser la de ellas)."""
    if len(u['poligono']) < 3:
        return None
    f = Polygon(u['poligono'])
    return f if f.is_valid and f.area > 0 else None


def validar(unidades):
    salida, figuras = [], []
    for u in unidades:
        f = _figura(u)
        if f is None:
            salida.append({'tipo': 'geometria_invalida', 'unidad': u['id']})
        elif u['estado'] == 'aprobada' and u['ocupacion'] in EDIFICABLES:
            figuras.append((u, f))
    for i, (a, fa) in enumerate(figuras):
        for b, fb in figuras[i + 1:]:
            if fa.intersection(fb).area > PISAN * min(fa.area, fb.area):
                salida.append({'tipo': 'manzanas_se_pisan', 'unidad': a['id'], 'con': b['id']})
    return salida


def puerta_fase2(censo, ref, problemas):
    """Fase 2 de 1843 (specs/08): cada unidad del censo con referencia (o rechazada con motivo), validadores
    sin problemas e incertidumbres explícitas (las pendientes, con su motivo, no entran al generador)."""
    con_ref = {u['id'] for u in ref['unidades']} | set(ref['rechazadas'])
    faltan = [u['id'] for u in censo['unidades'] if u['id'] not in con_ref]
    pendientes = [u['id'] for u in ref['unidades'] if u['estado'] == 'pendiente']
    criterios = {'unidades_con_referencia': {'cumplido': not faltan, 'faltan': faltan},
                 'validadores_limpios': {'cumplido': not problemas, 'problemas': len(problemas)},
                 'pendientes_explicitos': {'cumplido': True, 'pendientes': pendientes}}
    return {'fase_2_cerrable': all(c['cumplido'] for c in criterios.values()), 'criterios': criterios}


def mascara(unidades, forma, escala):
    """Lo edificado de 1843 en la grilla reducida del mosaico (`escala` px del mosaico por celda): las unidades
    aprobadas edificables, menos los lotes especiales, plazas, huertas y terrenos libres aprobados. Se pintan de la
    más grande a la más chica: manda la más chica, así un lote se vacía dentro de su manzana y un edificio
    censado dentro de una huerta queda edificado."""
    m = np.zeros(forma, np.uint8)
    pintables = [u for u in unidades if u['estado'] == 'aprobada' and u['ocupacion'] in EDIFICABLES | LIBRES
                 and len(u['poligono']) >= 3]
    for u in sorted(pintables, key=lambda u: -Polygon(u['poligono']).buffer(0).area):
        pts = np.round(np.asarray(u['poligono'], float) / escala).astype(np.int32)
        cv2.fillPoly(m, [pts], 1 if u['ocupacion'] in EDIFICABLES else 0)
    return m > 0


def main(argv=None):  # pragma: no cover - E/S
    import argparse
    import hashlib
    from calce import Calce
    raiz = Path(__file__).resolve().parents[2]
    aud = raiz / 'specs/auditoria-1843'
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--salida', type=Path, default=raiz / 'tools/geo/referencias/1843-manzanas.json')
    a = ap.parse_args(argv)
    censo_p, gcp_p = aud / 'censo.json', raiz / 'tools/geo/gcp/calce-1843-nypl-jesurun-facsimil-muller-stapler.json'
    censo, cfg = json.loads(censo_p.read_text()), json.loads(gcp_p.read_text())
    revs_p = sorted((aud / 'revision-dudosas').glob('*.json'))
    revisiones = [r for p in revs_p for r in json.loads(p.read_text())['revisiones']]
    calce = Calce.ajustar(cfg['gcps'], 0.5, cfg.get('suavizado', 0.0))
    ref = construir(censo, revisiones, calce.a_1936)
    problemas = validar(ref['unidades'])
    sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()  # noqa: E731
    estados = {}
    for u in ref['unidades']:
        estados[u['estado']] = estados.get(u['estado'], 0) + 1
    doc = {'alcance': __doc__.split('\n\n')[0].replace('\n', ' '),
           'entradas': {str(p.relative_to(raiz)): sha(p) for p in [censo_p, gcp_p, *revs_p]},
           'estados': estados, 'problemas': problemas, **ref}
    a.salida.write_text(json.dumps(doc, ensure_ascii=False) + '\n', encoding='utf-8')
    cierre = puerta_fase2(censo, ref, problemas)
    (aud / 'cierre-fase2.json').write_text(json.dumps(cierre, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(estados, len(ref['rechazadas']), 'rechazadas;', len(problemas), 'problemas; fase 2 cerrable:', cierre['fase_2_cerrable'])


if __name__ == '__main__':
    main()
