"""Diagnóstico de huellas por época, sin reparar ni modificar la ciudad.

Intersecciones de lotes no equivalen a intersecciones de cubiertas renderizadas.
Los índices son locales al JSON identificado por hash, no IDs históricos.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

from shapely.geometry import Polygon
from shapely.strtree import STRtree
from shapely.validation import explain_validity


def auditar(ciudad, *, epoca, metro, area_minima_m2=.01):
    """Huellas inválidas y pares con área común estrictamente mayor al umbral.

    No cuenta medianeras compartidas ni casas que no coexisten. No usa buffer(0)
    para ocultar errores: las figuras inválidas se reportan y no se intersectan.
    """
    if not math.isfinite(metro) or metro <= 0:
        raise ValueError('metro debe ser finito y positivo')
    if not math.isfinite(area_minima_m2) or area_minima_m2 < 0:
        raise ValueError('area_minima_m2 debe ser finita y no negativa')
    if not isinstance(epoca, int) or not 0 <= epoca <= 5:
        raise ValueError('epoca debe ser un índice entre 0 y 5')
    techos, vertices, vida = (ciudad[k] for k in ('techos', 'vertices', 'vida'))
    if len(vida) != len(techos):
        raise ValueError('vida y techos deben tener la misma longitud')
    if len(vertices) % 2:
        raise ValueError('vertices debe contener pares de coordenadas')
    figuras, indices, invalidas = [], [], []
    visibles = 0
    for numero, techo in enumerate(techos):
        nace, muere = vida[numero]
        if nace > epoca or (muere and muere <= epoca):
            continue
        visibles += 1
        inicio, cuantos = techo[:2]
        if not isinstance(inicio, int) or not isinstance(cuantos, int) or inicio < 0 or cuantos < 0 \
                or 2 * (inicio + cuantos) > len(vertices):
            raise ValueError(f'techo {numero}: intervalo de vertices inválido')
        puntos = list(zip(vertices[2 * inicio:2 * (inicio + cuantos):2],
                          vertices[2 * inicio + 1:2 * (inicio + cuantos):2]))
        if cuantos < 3 or not all(math.isfinite(c) for p in puntos for c in p):
            invalidas.append({'techo': numero, 'motivo': 'menos de tres puntos o coordenadas no finitas'})
            continue
        figura = Polygon(puntos)
        if not figura.is_valid or figura.area == 0:
            invalidas.append({'techo': numero, 'motivo': explain_validity(figura)})
            continue
        figuras.append(figura)
        indices.append(numero)
    arbol = STRtree(figuras)
    solapes = []
    for i, figura in enumerate(figuras):
        for j in sorted(arbol.query(figura, predicate='intersects')):
            if j <= i:
                continue
            area = figura.intersection(figuras[j]).area * metro ** 2
            if area > area_minima_m2:
                solapes.append({'techos': [indices[i], indices[j]], 'area_m2': round(area, 6)})
    return {'epoca': epoca, 'metro': metro, 'area_minima_m2': area_minima_m2,
            'visibles': visibles, 'validas': len(figuras), 'invalidas': invalidas, 'solapes': solapes}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('ciudad', type=Path)
    ap.add_argument('salida', type=Path)
    ap.add_argument('--epoca', type=int, required=True)
    ap.add_argument('--metro', type=float, required=True)
    ap.add_argument('--area-minima-m2', type=float, default=.01)
    args = ap.parse_args()
    if args.ciudad.resolve() == args.salida.resolve() or (args.salida.exists() and args.ciudad.samefile(args.salida)):
        ap.error("la salida no puede sobrescribir la ciudad de entrada")
    datos = args.ciudad.read_bytes()
    informe = auditar(json.loads(datos), epoca=args.epoca, metro=args.metro,
                      area_minima_m2=args.area_minima_m2)
    informe['entrada_sha256'] = hashlib.sha256(datos).hexdigest()
    informe['alcance'] = 'Huellas de entrada; no certifica cubiertas, accesos ni correspondencia histórica.'
    args.salida.parent.mkdir(parents=True, exist_ok=True)
    args.salida.write_text(json.dumps(informe, ensure_ascii=False, indent=2) + '\n')
    print(f"{informe['visibles']} visibles; {len(informe['invalidas'])} inválidas; "
          f"{len(informe['solapes'])} pares con solape sobre el umbral")


if __name__ == '__main__':
    main()
