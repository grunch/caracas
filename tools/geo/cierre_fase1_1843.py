#!/usr/bin/env python3
"""Puerta de salida de la fase 1 de la auditoría de 1843 (1D, T81), calculada desde los JSON versionados.

    .venv/bin/python tools/geo/cierre_fase1_1843.py

Criterios (specs/08 § 1D, con lo propio de 1843 en specs/11): todo el área recorrida, cada unidad
clasificada y leída (las dudosas quedan a la vista), censo sin problemas, correspondencia del original
con el sistema por unidad, controles de calce en cada sector con unidades (o su límite documentado) e
incidencias con subtarea. Los accesos a pie no son criterio de la fase 1 de 1843: el original no dibuja
frentes ni patios y se miden en la fase 7 (decisión por delegación del responsable, 24-11-2026).
No certifica la fidelidad del mapa.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from censo_1843 import OCUPACIONES  # noqa: E402

LECTURAS = {'segura', 'dudosa'}
CON_CONTROL = {'rayada', 'lote_especial', 'plaza', 'parte_de_otra_unidad'}   # lo que se calza; huertas y campo no


def puerta(sectores, censo, contraste, calce, limites, incidencias):
    ids = [s['id'] for s in sectores['sectores']]
    leidos = {lect['sector'] for lect in censo['lecturas']}
    unidades = censo['unidades']
    mal = [u['id'] for u in unidades if u['ocupacion'] not in OCUPACIONES or u.get('lectura') not in LECTURAS]
    medidas = {f['id'] for f in contraste['unidades'] if f.get('estado')}
    controlados = {f['sector'] for f in calce['sectores'] if f['controlado'] and f['bajo_umbral']}
    en_limite = {lim['sector'] for lim in limites['limites']} | set(limites.get('sin_anclas', {}).get('sectores', []))
    con_unidades = sorted({u['sector'] for u in unidades if u['ocupacion'] in CON_CONTROL})
    sin_control = [s for s in con_unidades if s not in controlados | en_limite]
    sin_subtarea = [i['id'] for i in incidencias['incidencias'] if not re.match(r'T81\.\d', i.get('resolucion', ''))]
    criterios = {
        'area_recorrida': {'cumplido': set(ids) <= leidos, 'sectores': len(ids), 'leidos': len(leidos & set(ids)),
                           'faltan': sorted(set(ids) - leidos)},
        'unidades_clasificadas': {'cumplido': not mal, 'unidades': len(unidades), 'invalidas': mal,
                                  'dudosas': [u['id'] for u in unidades if u.get('lectura') == 'dudosa']},
        'censo_sin_problemas': {'cumplido': not censo['problemas'], 'problemas': len(censo['problemas'])},
        'correspondencia_por_unidad': {'cumplido': all(u['id'] in medidas for u in unidades),
                                       'faltan': [u['id'] for u in unidades if u['id'] not in medidas]},
        'controles_de_calce': {'cumplido': not sin_control, 'sectores_con_unidades': len(con_unidades),
                               'controlados': sorted(set(con_unidades) & controlados),
                               'en_limite_documentado': sorted(set(con_unidades) & en_limite), 'sin_control': sin_control},
        'incidencias_con_subtarea': {'cumplido': not sin_subtarea, 'incidencias': len(incidencias['incidencias']),
                                     'sin_subtarea': sin_subtarea},
    }
    return {'fase_1_cerrable': all(c['cumplido'] for c in criterios.values()), 'criterios': criterios}


def main():  # pragma: no cover - E/S
    aud = Path(__file__).resolve().parents[2] / 'specs/auditoria-1843'
    leer = lambda n: json.loads((aud / n).read_text(encoding='utf-8'))  # noqa: E731
    r = puerta(leer('sectores.json'), leer('censo.json'), leer('contraste-unidades.json'), leer('calce-identidad.json'),
               leer('limites-calce.json'), leer('incidencias.json'))
    doc = {'alcance': __doc__.split('\n\n')[1].replace('\n', ' '), **r}
    (aud / 'cierre-fase1.json').write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('fase 1 cerrable:', r['fase_1_cerrable'], {k: v['cumplido'] for k, v in r['criterios'].items()})


if __name__ == '__main__':
    main()
