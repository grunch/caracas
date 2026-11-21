"""Cierre de la fase 1 de la auditoría de 1772: totales, cobertura y puerta de salida.

Todo sale de los JSON versionados en specs/auditoria-1772/; este módulo no lee el original ni el
sistema, así que no puede confirmar ni descartar ningún defecto. Solo cuenta lo ya registrado y
declara qué criterio de la puerta de salida (specs/08, 1D) se cumple y cuál sigue pendiente.

    .venv/bin/python tools/geo/cierre_fase1.py specs/auditoria-1772 tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json
"""
import argparse
from collections import Counter, OrderedDict
import hashlib
import json
import math
from pathlib import Path
import re
import statistics

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
    ('T33j.7a', ['I1772-001', 'I1772-002', 'I1772-003', 'I1772-013']),
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


TOLERANCIA_AJUSTE_PX = 6   # como anclas_identidad.TOLERANCIA_SEMILLA_PX: a menos de esto, el mismo cruce


def fuera_del_ajuste(puntos, ajuste_px, tol=TOLERANCIA_AJUSTE_PX):
    """Los puntos (con `original` en px del plano viejo) que no caen sobre ningún punto del ajuste: uno que
    coincide con un GCP, una semilla o un ancla es parte del calce, no un control independiente."""
    return [p for p in puntos
            if all(math.hypot(p['original'][0] - x, p['original'][1] - y) >= tol for x, y in ajuste_px)]


def _sectores_sin_control(sectores, filas, residuos, damero):
    """Sectores con unidades y sin ningún control independiente: ni nodo curado medido sobre el calce vigente,
    ni cruce de damero, ni hito. S41 (sin unidades) no aplica."""
    con_unidades = {f['sector'] for f in filas}
    cubiertos = {r['sector'] for r in residuos
                 if r['controles_independientes'] > 0 and r.get('desvio_independiente_vigente') is not False}
    if damero:
        cubiertos |= {s['sector'] for s in damero.get('por_sector', []) if s['controles'] > 0}
        cubiertos |= {h['sector'] for h in damero.get('controles_por_hito', [])}
    return sorted(s['id'] for s in sectores if s['id'] in con_unidades and s['id'] not in cubiertos)


def controles_fuera_del_calce(damero, anclas, ajuste_px=(), descartados=()):
    """controles-calce-sectores.json sin los cruces ni los hitos que son anclas del calce vigente (`anclas`: sus id).

    `ajuste_px`: los puntos del ajuste en px del original; un cruce que cae sobre uno (una semilla) tampoco cuenta,
    aunque no figure entre las anclas. Un ancla es un punto del ajuste, no un control independiente: su desvío lo mide el LOO del calce
    (calce-identidad.json), no este control. `descartados`: cruces que no son ni ancla ni control (su esquina de 1936 es
    un rótulo, no un cruce). Por sector cuenta los controles que quedan, su mediana, las anclas y los descartados.
    """
    filas = []
    for s in damero.get('por_sector', []):
        todos = [n for n in damero['nodos'] if n['sector'] == s['sector']]
        nodos = [n for n in todos if n['id'] not in descartados]
        libres = [n['desvio_m'] for n in fuera_del_ajuste([n for n in nodos if n['id'] not in anclas], ajuste_px)]
        filas.append({'sector': s['sector'], 'controles': len(libres),
                      'mediana_m': round(statistics.median(libres), 2) if libres else None,
                      'anclas': len(nodos) - len(libres), 'descartados': len(todos) - len(nodos)})
    return {**damero, 'por_sector': filas,
            'controles_por_hito': [h for h in damero.get('controles_por_hito', [])
                                   if h.get('id') not in anclas and h.get('id') not in descartados]}


JUICIOS = {'coincide', 'compatible', 'contradice'}  # los de `metodo` en verificacion-damero.json


def _recortes_vigentes(*documentos):
    """{nombre del PNG: (sha256, unidad)} de las evidencias regeneradas; el PNG resume calce, trazado, censo y ciudad."""
    return {Path(e['archivo_local']).name: (e.get('sha256'), e.get('unidad'))
            for d in documentos if d for e in d.get('evidencias', []) if e.get('archivo_local')}


def _juicio_vigente(r, clases, entrada_sha256, recortes):
    """Un juicio cuenta solo si su recorte es el regenerado (mismo SHA-256) y, en correspondencias, si además es
    de la unidad, la clase y la ciudad de la clasificación actual."""
    sha, unidad = recortes.get(r.get('archivo'), (None, None))
    if not r.get('sha256') or sha != r['sha256']:
        return False
    if r.get('grupo') != 'correspondencias':
        return True
    return (r.get('objeto') in clases and r.get('clase') == clases[r['objeto']] and unidad == r['objeto']
            and bool(entrada_sha256) and r.get('entrada_sha256') == entrada_sha256)


def _criterio_correspondencia(filas, correspondencias, damero=None):
    if not correspondencias:
        return {'cumplido': False, 'clasificadas': 0, 'provisionales': len(filas), 'trasladado_a': 'T33j.2a'}
    clases = {u['unidad']: u['clase'] for u in correspondencias['unidades'] if u.get('clase')}
    muestra = correspondencias.get('verificacion_visual', [])
    fuera = sorted({r.get('juicio') for r in muestra} - JUICIOS, key=str)
    if fuera:
        raise ValueError(f'juicios fuera del método: {fuera}')
    recortes = _recortes_vigentes(correspondencias, damero)
    vigentes = [r for r in muestra if _juicio_vigente(r, clases, correspondencias.get('entrada_sha256'), recortes)]
    de_correspondencia = [r for r in vigentes if r.get('grupo') == 'correspondencias']
    contradicciones = [r for r in vigentes if r['juicio'] == 'contradice']
    desfasados = len(muestra) - len(vigentes)  # hay que volver a juzgarlos: ni aprueban ni se descartan en silencio
    cumplido = (set(clases) >= {f['unidad'] for f in filas} and bool(de_correspondencia)
                and not contradicciones and not desfasados)
    return {'cumplido': cumplido, 'clasificadas': len(clases), 'clases': correspondencias['resumen']['clases'],
            'muestra_visual': len(de_correspondencia), 'muestra_desfasada': desfasados,
            'contradicciones': len(contradicciones), **({} if cumplido else {'trasladado_a': 'T33j.2a'})}


ESTADOS_RECORRIDO = {'recorrido', 'pendiente'}


def _criterio_accesos(accesos):
    """Specs/08 1C: cada frente con candidato de acceso se recorre a nivel de calle con conclusión registrada.

    El sondeo solo propone; `recorridos_calle` dice, por frente, si el recorrido concluyó (`recorrido`) o no.
    """
    if not accesos:
        return {'cumplido': False, 'sin_registro_de_accesos': True}
    estados = {r['frente']: r.get('estado') for r in accesos.get('recorridos_calle', [])}
    fuera = sorted(set(estados.values()) - ESTADOS_RECORRIDO, key=str)
    if fuera:
        raise ValueError(f'estados de recorrido fuera del registro: {fuera}')
    con_candidatos = [f['frente'] for f in accesos['frentes'] if f.get('candidatos_entrada_profunda')]
    pendientes = [f for f in con_candidatos if estados.get(f) != 'recorrido']
    return {'cumplido': not pendientes, 'frentes_con_candidatos': len(con_candidatos),
            'recorridos': len(con_candidatos) - len(pendientes), 'pendientes': pendientes}


def leer_verificacion(verificacion):
    """Los recortes juzgados, comprobando que el resumen escrito a mano sea el conteo de sus juicios."""
    recortes = verificacion['recortes']
    cuenta = Counter(r.get('juicio') for r in recortes)
    esperado = {'revisados': len(recortes), **{j: cuenta.get(j, 0) for j in sorted(JUICIOS)}}
    if verificacion.get('resumen') != esperado:
        raise ValueError(f"resumen de la verificación distinto de sus filas: {verificacion.get('resumen')} ≠ {esperado}")
    return recortes


def _criterio_area(filas, sectores):
    """Cada sector con barrido general registrado y todas sus unidades declaradas censadas y leídas."""
    pendientes = []
    for s in sectores:
        propias = [f for f in filas if f['sector'] == s['id']]
        declaradas = (s.get('clasificacion_original') or {}).get('unidades')
        barrido = str(s.get('barrido_general') or '').startswith('realizado')
        if not barrido or declaradas != len(propias) or not all(f['lectura'] for f in propias):
            pendientes.append(s['id'])
    return {'cumplido': bool(sectores) and not pendientes, 'sectores': len(sectores), 'sectores_pendientes': pendientes}


def puerta_de_salida(filas, sectores, residuos, incidencias, damero=None, correspondencias=None, accesos=None, loo=None):
    """Criterios de 1D con su cumplimiento. `fase_1_cerrable` exige todos; los pendientes quedan a la vista.

    `damero`: controles-calce-sectores.json (por_sector, controles_por_hito); `correspondencias`:
    correspondencias-unidades.json con su verificación visual; `accesos`: accesos-primer-lote.json con sus
    recorridos de calle; `loo`: el `por_sector` de calce-identidad.json (error dejando uno fuera de las anclas).
    Sin ellos, sus criterios quedan pendientes.
    """
    sin_control = _sectores_sin_control(sectores, filas, residuos, damero)
    bajo_umbral = {r['sector'] for r in (loo or []) if r.get('bajo_umbral')}
    sin_loo = sorted({f['sector'] for f in filas} - bajo_umbral)
    sin_subtarea = [i['id'] for i in incidencias if i['sin_subtarea'] and i['estado'] not in ESTADOS_SIN_DEFECTO]
    criterios = {
        'area_recorrida': _criterio_area(filas, sectores),
        'unidades_clasificadas_y_leidas': {'cumplido': all(f['lectura'] and f['ocupacion'] for f in filas),
                                           'unidades': len(filas)},
        'correspondencia_clasificada_por_unidad': _criterio_correspondencia(filas, correspondencias, damero),
        'controles_de_calce_por_sector': {'cumplido': not sin_control and not sin_loo,
                                          'sectores_sin_control_independiente': sin_control, 'sectores_sin_loo_bajo_umbral': sin_loo,
                                          'sectores_sin_unidades': sorted({s['id'] for s in sectores} - {f['sector'] for f in filas}),
                                          **({} if not (sin_control or sin_loo) else {'trasladado_a': 'T33j.2a'})},
        'hallazgos_confirmados_con_subtarea': {'cumplido': not sin_subtarea, 'sin_subtarea': sin_subtarea},
        'accesos_recorridos_a_pie': _criterio_accesos(accesos),
    }
    return {**criterios, 'fase_1_cerrable': all(c['cumplido'] for c in criterios.values())}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def _damero_del_sector(control, sector):
    fila = next((d for d in (control or {}).get('por_sector', []) if d['sector'] == sector), {})
    return {'controles_damero': fila.get('controles', 0), 'desvio_damero_mediana_m': fila.get('mediana_m'),
            'anclas_damero': fila.get('anclas', 0), 'descartados_damero': fila.get('descartados', 0)}


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
    config = _leer(args.calce)
    centro = _leer(c / 'controles-calce-centro.json')
    # los nodos curados guardan su desvío; vale solo si se midió sobre este mismo archivo de calce
    centro_vigente = centro.get('config_sha256') == hashlib.sha256(args.calce.read_bytes()).hexdigest()
    ajuste_px = [(g['px'], g['py']) for g in config['gcps']]
    residuos = [{**r, 'desvio_independiente_vigente': centro_vigente if r['controles_independientes'] else None}
                for r in residuos_por_sector(config['gcps'], fuera_del_ajuste(centro['nodos'], ajuste_px), sectores)]
    anclas = {a['id'] for a in config.get('anclas', []) if a.get('id')}
    identidad = _leer(c / 'calce-identidad.json') if (c / 'calce-identidad.json').exists() else {}
    # el hito de la Plaza Mayor cae entre las semillas, no sobre una: el informe de identidad lo nombra
    anclas |= set(identidad.get('nodos_omitidos_por_semilla', [])) | set(identidad.get('hitos_cubiertos_por_semillas', []))
    # una esquina de 1936 que es un rótulo y no un cruce no sirve de ancla ni de control
    descartados = {x['id'] for x in identidad.get('excluidos_por_rotulo', [])}
    incidencias = enlazar_subtareas(_leer(c / 'incidencias.json')['incidencias'])
    damero = _leer(c / 'controles-calce-sectores.json') if (c / 'controles-calce-sectores.json').exists() else None
    correspondencias = _leer(c / 'correspondencias-unidades.json') if (c / 'correspondencias-unidades.json').exists() else None
    if correspondencias and (c / 'verificacion-damero.json').exists():
        correspondencias = {**correspondencias, 'verificacion_visual': leer_verificacion(_leer(c / 'verificacion-damero.json'))}
    control = controles_fuera_del_calce(damero, anclas, ajuste_px, descartados) if damero else None
    if damero:
        documentos['controles-calce-sectores.json'] = damero
        documentos['correspondencias-unidades.json'] = correspondencias
    informe = OrderedDict([
        ('alcance', 'Conteos derivados de los JSON del inventario; no certifica fidelidad histórica ni cierra incidencias.'),
        ('puerta_de_salida', puerta_de_salida(filas, sectores, residuos, incidencias, control, correspondencias,
                                              documentos.get('accesos-primer-lote.json'), identidad.get('por_sector'))),
        ('totales', {'unidades': len(filas), 'ocupacion': dict(sorted(Counter(f['ocupacion'] for f in filas).items())),
                     'lectura': dict(sorted(Counter(f['lectura'] for f in filas).items())),
                     'correspondencia': dict(sorted(Counter(f['correspondencia'] for f in filas).items())),
                     'incidencias': dict(sorted(Counter(i['estado'] for i in incidencias).items()))}),
        ('por_sector', resumen_por_sector(filas, sectores)),
        ('calce_por_sector_nota', 'gcp_ajuste y loo_* miden el calce vigente. controles_damero y desvio_damero_mediana_m '
                                  'cuentan solo los cruces de damero que no son anclas del calce (anclas_damero los que sí, o caen sobre '
                                  'una semilla: su error está en el LOO; descartados_damero los de esquina de 1936 que es un rótulo, '
                                  'ni ancla ni control). controles_independientes y desvio_independiente_max_m cuentan los nodos '
                                  'curados que no caen sobre un punto del ajuste (a menos de 6 px); desvio_independiente_vigente '
                                  'dice si su desvío guardado se midió sobre este archivo de calce, y solo entonces cuentan en la puerta.'),
        ('calce_por_sector', [{**r, **_damero_del_sector(control, r['sector'])} for r in residuos]),
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
