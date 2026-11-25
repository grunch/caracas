#!/usr/bin/env python3
"""Puerta de las fases 5 a 7 de la auditoría de 1843 (T81.5a–7a), sobre las casas a la vista en 1843.

Las puertas de 1772 miden contra los frentes y calles de su referencia, que 1843 no tiene: el plano de Jesurún
dibuja manzanas enteras, sin frentes ni patios. Se mide lo equivalente (decisión por delegación del responsable,
25-11-2026): casas sin solapes (fase 5), las casas propias con su frente sobre el borde de su manzana (fase 5),
huellas que el visor puede techar (fase 6: sin astillas ni triángulos sin área), cada casa con un lado a media
calle del borde de una manzana (fase 7: acceso; se exige a las casas propias de 1843: las heredadas de 1936 que
quedan en el interior llegan a la calle por su lote de 1936 y se cuentan aparte) y ninguna casa en lotes especiales, plazas o terrenos libres.
Las casas que vienen de 1772 se miden igual, pero las de 1772 tienen su propia auditoría. Cuenta lo medido.
"""
import json
import sys
from pathlib import Path

import numpy as np
from shapely.geometry import Point, Polygon
from shapely.strtree import STRtree

sys.path.insert(0, str(Path(__file__).resolve().parent))

SOLAPE_M2 = 0.01        # como la fase 5 de 1772
FRENTE_M = 0.5          # tolerancia de la fachada sobre su recta (decisión 1 de specs/11)
ACCESO_M = 3.0          # media calle angosta de 1843
ANCHO_MINIMO_M = 2.0    # una huella más angosta que esto (área / lado mayor) es una astilla
LIBRES = {'lote_especial', 'plaza', 'terreno_libre'}


def _ancho_m(f, metro):
    lados = np.diff(np.asarray(f.minimum_rotated_rectangle.exterior.coords), axis=0)
    largo = max(np.hypot(*lados.T)) * metro
    return f.area * metro ** 2 / largo if largo else 0.0


def puerta(casas, unidades, metro):
    figuras = [(c, Polygon(c['poligono'])) for c in casas]
    manzanas = [Polygon(u['poligono']).buffer(0) for u in unidades
                if u['estado'] == 'aprobada' and u['ocupacion'] in {'rayada', 'parte_de_otra_unidad'}]
    todas = [(u, Polygon(u['poligono']).buffer(0)) for u in unidades if u['estado'] == 'aprobada' and len(u['poligono']) >= 3]
    bordes = [m.exterior for m in manzanas]
    arbol = STRtree([f for _, f in figuras])
    pares = []
    for i, (c, f) in enumerate(figuras):
        for j in arbol.query(f):
            if j > i and f.is_valid and figuras[j][1].is_valid and f.intersection(figuras[j][1]).area * metro ** 2 > SOLAPE_M2:
                pares.append([c['techo'], figuras[j][0]['techo']])
    arbol_b = STRtree(bordes) if bordes else None

    def distancia_al_borde(f):
        if arbol_b is None:
            return np.inf
        return min(f.exterior.distance(bordes[k]) for k in arbol_b.query(f.buffer(ACCESO_M / metro * 4))) \
            if len(arbol_b.query(f.buffer(ACCESO_M / metro * 4))) else np.inf

    fuera = [c['techo'] for c, f in figuras if c.get('propia') and distancia_al_borde(f) * metro > FRENTE_M]
    lejos = [(c, distancia_al_borde(f) * metro > ACCESO_M) for c, f in figuras]
    sin_acceso = [c['techo'] for c, es in lejos if es and c.get('propia')]
    heredadas = [c['techo'] for c, es in lejos if es and not c.get('propia')]
    degeneradas = [c['techo'] for c, f in figuras if not f.is_valid or f.area == 0 or _ancho_m(f, metro) < ANCHO_MINIMO_M]
    arbol_u = STRtree([f for _, f in todas]) if todas else None

    def en_un_libre(f):   # manda la unidad más chica que contiene el centro (como epocas_1843.en_lotes_libres)
        if arbol_u is None:
            return False
        centro = Point(np.asarray(f.exterior.coords)[:-1].mean(axis=0))   # el mismo centro que epocas_1843
        contienen = [todas[k] for k in arbol_u.query(centro, predicate='within')]
        return bool(contienen) and min(contienen, key=lambda uf: uf[1].area)[0]['ocupacion'] in LIBRES

    en_libres = [c['techo'] for c, f in figuras if en_un_libre(f)]
    criterios = {
        'lotes_sin_solapes': {'cumplido': not pares, 'pares': pares},
        'frentes_propios_sobre_la_manzana': {'cumplido': not fuera, 'tolerancia_m': FRENTE_M, 'fuera': fuera},
        'huellas_sin_degenerar': {'cumplido': not degeneradas, 'degeneradas': degeneradas},
        'casas_con_acceso': {'cumplido': not sin_acceso, 'sin_acceso': sin_acceso, 'heredadas_interiores': heredadas},
        'libres_sin_casas': {'cumplido': not en_libres, 'casas': en_libres},
    }
    return {'cerrable': all(c['cumplido'] for c in criterios.values()), 'casas': len(casas), 'criterios': criterios}


CENTRO_M = 1.0   # como cierre_fase6: un límite registrado por el centro de la casa, a menos de esto, es la misma


def con_limites(resultado, casas, limites, metro):
    """El resultado con las casas en límite documentado (`limites`: [{centro, criterio, motivo}], px del mosaico)
    fuera de lo que impide cerrar: quedan en `en_limite`, a la vista."""
    centros = {c['techo']: np.asarray(c['poligono'], float).mean(axis=0) for c in casas}

    def en_limite(techo, criterio):
        return any(lim['criterio'] == criterio and techo in centros
                   and np.hypot(*(centros[techo] - np.asarray(lim['centro'], float))) * metro < CENTRO_M for lim in limites)

    criterios = {}
    for nombre, c in resultado['criterios'].items():
        clave = next(k for k, v in c.items() if isinstance(v, list))
        quedan, limite = [], []
        for x in c[clave]:
            techos = x if isinstance(x, list) else [x]
            (limite if all(en_limite(t, nombre) for t in techos) else quedan).append(x)
        criterios[nombre] = {**c, clave: quedan, 'en_limite': [t for x in limite for t in (x if isinstance(x, list) else [x])],
                             'cumplido': not quedan}
    return {**resultado, 'cerrable': all(c['cumplido'] for c in criterios.values()), 'criterios': criterios}


def main():  # pragma: no cover - E/S
    import subprocess
    from contraste_1843 import EPOCA_1843, visibles_en, vive
    raiz = Path(__file__).resolve().parents[2]
    ciudad = json.loads((raiz / 'fuentes/derivados/epocas/ciudad-epocas.json').read_text())
    unidades = json.loads((raiz / 'tools/geo/referencias/1843-manzanas.json').read_text())['unidades']
    V = np.asarray(ciudad['vertices'], float).reshape(-1, 2)
    n_1936 = len(ciudad.get('cuadras', []))   # las propias y las de 1578 van después de las de 1936
    casas = [{'techo': i, 'poligono': V[t[0]:t[0] + t[1]].tolist(), 'propia': i >= n_1936 and ciudad['vida'][i][0] == EPOCA_1843}
             for i, t in enumerate(ciudad['techos']) if vive(ciudad['vida'][i], EPOCA_1843)]
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    casas = visibles_en(casas, hitos)
    r = puerta(casas, unidades, metro=0.5)
    ruta_limites = raiz / 'specs/auditoria-1843/limites-fases-5-7.json'
    if ruta_limites.exists():
        r = con_limites(r, casas, json.loads(ruta_limites.read_text())['casas'], metro=0.5)
    doc = {'alcance': __doc__.split('\n\n')[1].replace('\n', ' '), **r}
    (raiz / 'specs/auditoria-1843/cierre-fases-5-7.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n')
    print('fases 5–7 de 1843 cerrables:', r['cerrable'], {k: (v['cumplido'], len(next(x for x in v.values() if isinstance(x, list)))) for k, v in r['criterios'].items()},
          'heredadas interiores:', len(r['criterios']['casas_con_acceso']['heredadas_interiores']))


if __name__ == '__main__':
    main()
