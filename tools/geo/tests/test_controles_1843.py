"""CLI de controles de 1843: de las lecturas y la leyenda al informe por sector, sin tocar el calce."""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from controles_1843 import main, nombres_de  # noqa: E402


def test_nombres_de_ignora_las_esquinas_sin_nombre():
    leyenda = {'esquinas': [{'numero': 1, 'nombre': 'de la Torre', 'lectura': 'segura'}, {'numero': 2, 'nombre': None}]}
    assert nombres_de(leyenda) == {1: {'nombre': 'de la Torre', 'lectura': 'segura'}}


def test_main_escribe_el_informe_con_anclas_omitidas_y_hashes(tmp_path):
    pts = [(0, 0), (100, 0), (0, 100), (100, 100), (50, 50)]
    nombres = ['A', 'B', 'C', 'D', 'E']
    archivos = {
        'esquinas': {'esquinas': [{'numero': i + 1, 'cruce_px': list(p), 'lectura': 'segura'} for i, p in enumerate(pts)]
                     + [{'numero': 9, 'cruce_px': [5, 5], 'lectura': 'segura'}]},
        'leyenda': {'esquinas': [{'numero': i + 1, 'nombre': n, 'lectura': 'segura'} for i, n in enumerate(nombres)]},
        'diccionario': [{'nombre': n, 'px': [p[0] * 2.0, p[1] * 2.0]} for n, p in zip(nombres, pts)],
        'gcp': {'gcps': [{'px': p[0], 'py': p[1], 'x36': p[0] * 2.0 + 10, 'y36': p[1] * 2.0} for p in pts]},
        'sectores': {'sectores': [{'id': 'S1843-11', 'caja_px': [-10, -10, 200, 200]}]},
    }
    rutas = {}
    for k, v in archivos.items():
        rutas[k] = tmp_path / f'{k}.json'
        rutas[k].write_text(json.dumps(v))
    salida = tmp_path / 'informe.json'

    main([f'--{k}={r}' for k, r in rutas.items()] + [f'--salida={salida}'])

    informe = json.loads(salida.read_text())
    assert informe['anclas'] == 5
    assert [o['motivo'] for o in informe['omitidas']] == ['sin_nombre']
    assert informe['calce_vigente']['mediana_desvio_m'] == 5.0
    assert set(informe['entradas']) == set(archivos) and all(len(e['sha256']) == 64 for e in informe['entradas'].values())
