#!/usr/bin/env python3
"""Controles del calce de 1843 por identidad (T81, fase 1A): esquinas numeradas del plano ⇄ esquinas de 1936.

    .venv/bin/python tools/geo/controles_1843.py

Lee las lecturas de las esquinas del original (specs/auditoria-1843/esquinas-original.json), los nombres de la
leyenda (leyenda.json), el diccionario de 1936 y el calce vigente; escribe calce-identidad.json con las anclas,
las omitidas y su motivo, el desvío del calce vigente y el error dejando uno fuera del calce por identidad,
por sector. No toca el calce ni los datos.
"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from esquinas_1843 import emparejar, medir  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
AUD = RAIZ / 'specs/auditoria-1843'
METRO_1936 = 0.5   # metros por píxel del mosaico de 1936 (el mismo METRO de controles_damero.py)


def _leer(ruta):
    datos = ruta.read_bytes()
    return json.loads(datos), hashlib.sha256(datos).hexdigest()


def _relativa(ruta):
    try:
        return str(ruta.resolve().relative_to(RAIZ))
    except ValueError:
        return str(ruta)


def nombres_de(leyenda):
    """numero → {nombre, lectura} desde la lista `esquinas` de la leyenda transcrita."""
    return {e['numero']: {'nombre': e['nombre'], 'lectura': e.get('lectura', 'dudosa')}
            for e in leyenda['esquinas'] if e.get('nombre')}


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--esquinas', type=Path, default=AUD / 'esquinas-original.json')
    ap.add_argument('--leyenda', type=Path, default=AUD / 'leyenda.json')
    ap.add_argument('--diccionario', type=Path, default=RAIZ / 'tools/geo/esquinas/1936-esquinas.json')
    ap.add_argument('--gcp', type=Path, default=RAIZ / 'tools/geo/gcp/calce-1843-nypl-jesurun-facsimil-muller-stapler.json')
    ap.add_argument('--sectores', type=Path, default=AUD / 'sectores.json')
    ap.add_argument('--salida', type=Path, default=AUD / 'calce-identidad.json')
    a = ap.parse_args(argv)
    entradas = {k: _leer(getattr(a, k)) for k in ('esquinas', 'leyenda', 'diccionario', 'gcp', 'sectores')}
    (esquinas, _), (leyenda, _), (dic, _), (calce, _), (sectores, _) = entradas.values()
    anclas, omitidas = emparejar(esquinas['esquinas'], nombres_de(leyenda), dic)
    informe = medir(anclas, calce['gcps'], sectores['sectores'], METRO_1936, calce.get('suavizado', 0.0))
    doc = {'alcance': 'Calce de 1843 por identidad (T81, 1A): una esquina ancla solo con número, cruce y nombre '
                      'leídos con seguridad y un nombre único en el diccionario de 1936. El desvío mide cuánto se '
                      'aparta el calce vigente (por correlación) de cada ancla; el LOO, cuánto se aparta el calce '
                      'que solo usa las anclas al quitar cada una.',
           'entradas': {k: {'archivo': _relativa(getattr(a, k)), 'sha256': sha} for k, (_, sha) in entradas.items()},
           'metro': METRO_1936, **informe, 'omitidas': omitidas}
    a.salida.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"{informe['anclas']} anclas, {len(omitidas)} omitidas; calce vigente: mediana "
          f"{informe['calce_vigente']['mediana_desvio_m']} m; identidad: LOO RMS {informe['calce_identidad']['rms_loo_m']} m")


if __name__ == '__main__':
    main()
