"""Cierre de la fase 1 de la auditoría de 1772: totales, cobertura y puerta de salida.

Todo sale de los JSON versionados en specs/auditoria-1772/; este módulo no lee el original ni el
sistema, así que no puede confirmar ni descartar ningún defecto. Solo cuenta lo ya registrado y
declara qué criterio de la puerta de salida (specs/08, 1D) se cumple y cuál sigue pendiente.

    .venv/bin/python tools/geo/cierre_fase1.py specs/auditoria-1772 tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json
"""
import argparse
from collections import Counter, OrderedDict
import json
import math
from pathlib import Path
import re

# Subtareas correctivas de specs/08 (tabla «Subtareas correctivas identificadas por la auditoría»).
SUBTAREAS = OrderedDict([
    ('T33j.2a', ['I1772-010']),
    ('T33j.2b', []),
    ('T33j.3a', ['I1772-001', 'I1772-003']),
    ('T33j.3b', ['I1772-007', 'I1772-010']),
    ('T33j.4a', ['I1772-007']),
    ('T33j.4b', ['I1772-004', 'I1772-009']),
    ('T33j.5a', ['I1772-001', 'I1772-002', 'I1772-003', 'I1772-011']),
    ('T33j.6a', ['I1772-005', 'I1772-011', 'I1772-012']),
    ('T33j.7a', ['I1772-001', 'I1772-002', 'I1772-003']),
    ('T33j.8a', ['I1772-006', 'I1772-008']),
])
SIN_EDIFICACION = {'terreno_libre', 'plaza', 'descartada_no_edificacion', 'parte_de_otra_unidad'}
ESTADOS_SIN_DEFECTO = {'incierto', 'candidato'}
SHA256 = re.compile(r'[0-9a-f]{64}')


def _lectura_de(lecturas):
    vista = {}
    for nombre, registros in lecturas.items():
        for r in registros:
            if r['unidad'] in vista:
                raise ValueError(f"{r['unidad']} leída dos veces ({vista[r['unidad']]}, {nombre})")
            vista[r['unidad']] = nombre
    return vista


def cobertura_unidades(unidades, lecturas, contraste):
    """Una fila por unidad censada: sector, ocupación, de qué lectura viene y su correspondencia provisional.

    La correspondencia es la del contraste bajo el TPS: un candidato espacial, nunca una aprobada.
    """
    lectura = _lectura_de(lecturas)
    candidatos = {c['unidad']: bool(c.get('techos_intersectan_caja')) for c in contraste}
    filas = []
    for u in unidades:
        ident, ocupacion = u['id_fuente'], u['revision_original']['ocupacion']
        if ident not in lectura:
            raise ValueError(f'{ident} sin lectura individual')
        if ocupacion in SIN_EDIFICACION:
            correspondencia = 'sin_edificacion_esperada'
        elif candidatos.get(ident):
            correspondencia = 'candidato_bajo_TPS_no_aprobado'
        else:
            correspondencia = 'sin_candidato_bajo_TPS'
        filas.append({'unidad': ident, 'sector': u['sector'], 'ocupacion': ocupacion,
                      'lectura': lectura[ident], 'correspondencia': correspondencia})
    return filas


def resumen_por_sector(filas, sectores):
    ids = [s['id'] for s in sectores]
    desconocidos = sorted({f['sector'] for f in filas} - set(ids))
    if desconocidos:
        raise ValueError(f'sectores fuera de sectores.json: {desconocidos}')
    resumen = []
    for ident in ids:
        propias = [f for f in filas if f['sector'] == ident]
        resumen.append({'sector': ident, 'unidades': len(propias), 'leidas': sum(1 for f in propias if f['lectura']),
                        'ocupacion': dict(sorted(Counter(f['ocupacion'] for f in propias).items())),
                        'correspondencia': dict(sorted(Counter(f['correspondencia'] for f in propias).items()))})
    return resumen


def _sector_de(px, py, sectores):
    for s in sectores:
        x0, y0, x1, y1 = s['bbox_original']
        if x0 <= px < x1 and y0 <= py < y1:
            return s['id']
    return None


def residuos_por_sector(gcps, nodos, sectores):
    """Residuos LOO de los GCP del ajuste y desvío de los controles independientes, por sector.

    Un GCP del ajuste no es un control independiente: su residuo mide la consistencia interna del TPS.
    """
    filas = []
    for s in sectores:
        propios = [g for g in gcps if _sector_de(g['px'], g['py'], [s]) == s['id']]
        controles = [n for n in nodos if _sector_de(*n['original'], [s]) == s['id']]
        loo = [g['loo_m'] for g in propios if g.get('loo_m') is not None]
        filas.append({
            'sector': s['id'], 'gcp_ajuste': len(propios), 'gcp_manuales': sum(1 for g in propios if g.get('manual')),
            'loo_rms_m': round(math.sqrt(sum(e * e for e in loo) / len(loo)), 3) if loo else None,
            'loo_max_m': max(loo) if loo else None,
            'controles_independientes': len(controles),
            'desvio_independiente_max_m': max(n['desvio_m'] for n in controles) if controles else None,
        })
    return filas


def enlazar_subtareas(incidencias):
    """Añade a cada incidencia las subtareas de specs/08 que la citan; no cambia su estado."""
    por_incidencia = {}
    for subtarea, ids in SUBTAREAS.items():
        for ident in ids:
            por_incidencia.setdefault(ident, []).append(subtarea)
    enlazadas = []
    for i in incidencias:
        subtareas = por_incidencia.get(i['id'], [])
        enlazadas.append({**i, 'subtareas': subtareas, 'sin_subtarea': not subtareas})
    return enlazadas


CLAVES_ARCHIVO = ('archivo', 'archivo_local', 'captura')


def _evidencias_de(valor):
    """Recorre un JSON y devuelve (archivo, sha256) de cada captura: dicts con archivo + sha256*, o {nombre: sha}."""
    if isinstance(valor, list):
        for v in valor:
            yield from _evidencias_de(v)
        return
    if not isinstance(valor, dict):
        return
    archivo = next((valor[k] for k in CLAVES_ARCHIVO if isinstance(valor.get(k), str)), None)
    sha = next((v for k, v in valor.items() if k.startswith('sha256') and k != 'sha256_recorte_ampliado'), None)
    if archivo and sha is not None:
        yield archivo, sha
    for k, v in valor.items():
        if k == 'capturas' and isinstance(v, dict):
            yield from v.items()
        else:
            yield from _evidencias_de(v)


def indice_evidencias(documentos):
    """Capturas locales (archivo + SHA-256) citadas por los JSON, con los documentos que las citan."""
    indice = OrderedDict()
    for nombre, doc in documentos.items():
        for archivo, sha in _evidencias_de(doc):
            if not isinstance(sha, str) or not SHA256.fullmatch(sha):
                raise ValueError(f'evidencia sin SHA-256 válido: {archivo}')
            entrada = indice.setdefault((archivo, sha), {'archivo': archivo, 'sha256': sha, 'documentos': []})
            if nombre not in entrada['documentos']:
                entrada['documentos'].append(nombre)
    return list(indice.values())


def puerta_de_salida(filas, sectores, residuos, incidencias):
    """Criterios de 1D con su cumplimiento. `fase_1_cerrable` exige todos; los pendientes quedan a la vista."""
    sin_control = [r['sector'] for r in residuos if r['controles_independientes'] == 0]
    sin_subtarea = [i['id'] for i in incidencias if i['sin_subtarea'] and i['estado'] not in ESTADOS_SIN_DEFECTO]
    aprobadas = 0  # ninguna lectura de la fase 1 aprueba correspondencias; eso es T33j.2a
    criterios = {
        'area_recorrida': {'cumplido': len(sectores) > 0, 'sectores': len(sectores)},
        'unidades_clasificadas_y_leidas': {'cumplido': all(f['lectura'] and f['ocupacion'] for f in filas),
                                           'unidades': len(filas)},
        'correspondencia_aprobada_por_unidad': {'cumplido': False, 'aprobadas': aprobadas,
                                                'provisionales': len(filas) - aprobadas, 'trasladado_a': 'T33j.2a'},
        'controles_de_calce_por_sector': {'cumplido': not sin_control, 'sectores_sin_control_independiente': sin_control,
                                          **({} if not sin_control else {'trasladado_a': 'T33j.2a'})},
        'hallazgos_confirmados_con_subtarea': {'cumplido': not sin_subtarea, 'sin_subtarea': sin_subtarea},
    }
    return {**criterios, 'fase_1_cerrable': all(c['cumplido'] for c in criterios.values())}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('calce', type=Path, help='tools/geo/gcp/calce-1772-….json')
    ap.add_argument('--salida', type=Path, default=None)
    args = ap.parse_args()
    c = args.carpeta
    nombres = ['B1772-001.json', 'accesos-primer-lote.json', 'bordes-especiales-original.json', 'contraste-unidades.json',
               'continuidad-calles-nucleo.json', 'cruces-cubiertas-3d.json', 'sectores.json']
    documentos = {n: _leer(c / n) for n in nombres if (c / n).exists()}
    sectores = _leer(c / 'sectores.json')['sectores']
    filas = cobertura_unidades(
        _leer(c / 'unidades-original.json')['unidades'],
        {'bordes': _leer(c / 'lectura-bordes-original.json')['unidades'],
         'sin_cara': _leer(c / 'contornos-sin-cara.json')['unidades'],
         'restantes': _leer(c / 'lectura-restantes-original.json')['unidades']},
        _leer(c / 'contraste-unidades.json')['unidades'])
    residuos = residuos_por_sector(_leer(args.calce)['gcps'], _leer(c / 'controles-calce-centro.json')['nodos'], sectores)
    incidencias = enlazar_subtareas(_leer(c / 'incidencias.json')['incidencias'])
    informe = OrderedDict([
        ('alcance', 'Conteos derivados de los JSON del inventario; no certifica fidelidad histórica ni cierra incidencias.'),
        ('puerta_de_salida', puerta_de_salida(filas, sectores, residuos, incidencias)),
        ('totales', {'unidades': len(filas), 'ocupacion': dict(sorted(Counter(f['ocupacion'] for f in filas).items())),
                     'lectura': dict(sorted(Counter(f['lectura'] for f in filas).items())),
                     'correspondencia': dict(sorted(Counter(f['correspondencia'] for f in filas).items())),
                     'incidencias': dict(sorted(Counter(i['estado'] for i in incidencias).items()))}),
        ('por_sector', resumen_por_sector(filas, sectores)),
        ('calce_por_sector', residuos),
        ('incidencias', [{'id': i['id'], 'estado': i['estado'], 'prioridad': i.get('prioridad'),
                          'subtareas': i['subtareas']} for i in incidencias]),
        ('evidencias', indice_evidencias(documentos)),
        ('unidades', filas),
    ])
    salida = args.salida or c / 'cierre-fase1.json'
    salida.write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    p = informe['puerta_de_salida']
    print(f"{len(filas)} unidades; {len(incidencias)} incidencias; fase 1 cerrable: {p['fase_1_cerrable']}; "
          f"sin control independiente: {p['controles_de_calce_por_sector']['sectores_sin_control_independiente']}")


if __name__ == '__main__':
    main()
