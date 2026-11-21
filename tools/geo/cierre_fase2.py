"""Puerta de salida de la fase 2 de 1772 (specs/08: referencia histórica verificable, T33j.2b).

Listo cuando: cada entidad corregible tiene referencia y correspondencia; los validadores detectan duplicados,
cruces imposibles y geometría inválida; las incertidumbres son explícitas. Además, T33j.2b: las excepciones
registradas (U0036, U0151, plazas, pasos de agua…) están en la referencia, los datos históricos quedan separados de
las heurísticas heredadas de 1936/OSM y ninguna entidad pendiente entra al generador.
Cuenta lo registrado; no certifica fidelidad.

    .venv/bin/python tools/geo/cierre_fase2.py specs/auditoria-1772
"""
import argparse
import json
from collections import Counter, OrderedDict
from copy import deepcopy
from pathlib import Path

from referencia_red import validar_red
from referencia_unidades import validar_unidades


def excepciones_1772(trazado, unidades, limites):
    """Registro de excepciones: las del trazado, las plazas, los pasos de agua, los trazos descartados como calles y
    los sectores límite del calce, cada una con un ID, su tipo, lo que afecta y su criterio."""
    registros = []
    for e in trazado.get('revision', {}).get('excepciones', []):
        registros.append({'tipo': 'trazado', 'unidades': [e['unidad']] if e.get('unidad') else list(e.get('unidades', [])),
                          'criterio': e['criterio'], 'fuente': 'trazado-calles-original.json (revision.excepciones)'})
    plazas = sorted(u['id'] for u in unidades if u['ocupacion'] == 'plaza')
    if plazas:
        registros.append({'tipo': 'plaza', 'unidades': plazas,
                          'criterio': 'plaza del original: no se edifica ni se parte con calles',
                          'fuente': 'censo del original (ocupación plaza)'})
    for p in trazado.get('pasos_agua_observados', []):
        registros.append({'tipo': 'paso_de_agua', 'paso': p['id'], 'original': p.get('original_aproximado'),
                          'criterio': p['nota'], 'fuente': 'trazado-calles-original.json (pasos_agua_observados)'})
    for t in trazado.get('trazos_descartados_como_calles', []):
        registros.append({'tipo': 'trazo_descartado', 'clave': t['clave'], 'criterio': t['nota'],
                          'fuente': 'trazado-calles-original.json (trazos_descartados_como_calles)'})
    for s in limites.get('sectores', []):
        registros.append({'tipo': 'limite_del_calce', 'sectores': [s['sector']], 'criterio': s['motivo'],
                          'incidencia': s.get('incidencia'), 'fuente': 'limites-calce.json'})
    return [{'id': f'EX1772-{k:03d}', **r} for k, r in enumerate(registros, 1)]


def validar_excepciones(excepciones, unidades):
    """IDs únicos, criterio en cada una y unidades que existen en la referencia."""
    ids = [e['id'] for e in excepciones]
    if len(set(ids)) != len(ids):
        raise ValueError('excepción con ID duplicado')
    for e in excepciones:
        if not e.get('criterio'):
            raise ValueError(f"{e['id']}: sin criterio")
        faltan = [u for u in e.get('unidades', []) if u not in unidades]
        if faltan:
            raise ValueError(f"{e['id']}: la unidad {faltan} no está en la referencia")


def validar_procedencias(procedencias):
    """Cada entrada del generador de 1772 tiene una clase (histórica o heurística) y su nota; la referencia solo lee
    entradas históricas. Devuelve las entradas del generador («paso: entrada», porque una misma entrada puede cumplir
    otro papel en otro paso) separadas en históricas y heurísticas."""
    clases = procedencias['clases']
    historicas, heuristicas = [], []
    for paso, entradas in procedencias['pasos'].items():
        for e in entradas:
            if e.get('clase') not in clases:
                raise ValueError(f"{paso}: {e.get('entrada')} con clase desconocida {e.get('clase')!r}")
            if not e.get('nota'):
                raise ValueError(f"{paso}: {e['entrada']} sin nota")
            (historicas if clases[e['clase']] else heuristicas).append(f"{paso}: {e['entrada']}")
    for e in procedencias.get('referencia', []):
        if not clases.get(e.get('clase')):
            raise ValueError(f"la referencia lee una heurística o una entrada sin clase: {e.get('entrada')}")
    return {'historicas': historicas, 'heuristicas': heuristicas}


def _rechaza(validar, *args):
    try:
        validar(*args)
    except ValueError:
        return True
    return False


def _tramo_que_salta_un_cruce(red):
    """Una calle a–c que salta el nodo b de otra calle a–b–c: se superpone a ella y pasa por b sin compartirlo."""
    usos = Counter(x for c in red['calles'] for x in c['nodos'])
    for c in red['calles']:
        for a, b, d in zip(c['nodos'], c['nodos'][1:], c['nodos'][2:]):
            if usos[b] > 1:
                return [a, d]
    raise ValueError('la red no tiene un cruce con el que probar el validador')


def detecta_fallos(red, unidades, censo):
    """Inyecta en copias un fallo de cada clase y comprueba que el validador lo rechaza. La referencia tiene que
    validar antes: si no, la prueba no dice nada."""
    validar_red(red)
    validar_unidades({'unidades': unidades}, red, censo)
    aprobadas = [k for k, u in enumerate(unidades) if u['nodos']]
    if len(aprobadas) < 2:
        raise ValueError('hacen falta dos unidades con geometría para probar los solapes')

    def red_con(**cambio):
        return {**deepcopy(red), **cambio}

    def unidades_con(k, **cambio):
        copia = deepcopy(unidades)
        copia[k] = {**copia[k], **cambio}
        return copia

    primera = next(c for c in red['calles'] if len(c['nodos']) >= 2)
    a, b, c, d = unidades[aprobadas[0]]['nodos'][:4]
    pruebas = {
        'nodo_duplicado': (validar_red, red_con(nodos=red['nodos'] + [{**red['nodos'][0], 'id': 'DUPLICADO'}])),
        'tramo_duplicado': (validar_red, red_con(calles=red['calles'] + [
            {**primera, 'id': 'DUPLICADA', 'nodos': primera['nodos'][1::-1]}])),
        'cruce_imposible': (validar_red, red_con(calles=red['calles'] + [
            {**primera, 'id': 'IMPOSIBLE', 'nodos': _tramo_que_salta_un_cruce(red)}])),
        'unidad_duplicada': (lambda u: validar_unidades({'unidades': u}, red, censo), unidades + unidades[:1]),
        'anillo_invalido': (lambda u: validar_unidades({'unidades': u}, red, censo),
                            unidades_con(aprobadas[0], nodos=[a, c, b, d])),
        'solape': (lambda u: validar_unidades({'unidades': u}, red, censo),
                   unidades_con(aprobadas[1], nodos=list(unidades[aprobadas[0]]['nodos']))),
    }
    return {nombre: _rechaza(validar, entrada) for nombre, (validar, entrada) in pruebas.items()}


def _criterio_entidades(red, unidades, censo, lineas, cruces):
    ids = {u['id'] for u in unidades}
    calles, nodos = {c['id'] for c in red['calles']}, {n['id'] for n in red['nodos']}
    faltan = {'unidades': sorted(set(censo) - ids), 'lineas': sorted(set(lineas) - calles),
              'cruces': sorted(set(cruces) - nodos)}
    return {'cumplido': not any(faltan.values()) and ids == set(censo), 'unidades': len(ids), 'calles': len(calles),
            'nodos': len(nodos), 'faltan': faltan}


def _criterio_validadores(red, unidades, censo):
    try:
        detectados = detecta_fallos(red, unidades, censo)
    except ValueError as e:
        return {'cumplido': False, 'error': str(e)}
    return {'cumplido': all(detectados.values()), 'referencia_valida': True, 'detecta': detectados}


def puerta_fase2(red, unidades, censo, lineas, cruces, excepciones, procedencias):
    """Criterios de la fase 2 con su cumplimiento; `fase_2_cerrable` exige todos."""
    pendientes = [u for u in unidades if u['estado'] == 'pendiente']
    sin_pareja = [n for n in red['nodos'] if n['estado'] != 'identidad_verificada']
    try:
        validar_excepciones(excepciones, {u['id'] for u in unidades})
        excepciones_ok = True
    except ValueError:
        excepciones_ok = False
    separadas = validar_procedencias(procedencias)
    lee_referencia = [e['entrada'] for entradas in procedencias['pasos'].values() for e in entradas
                      if 'referencias/' in e['entrada']]
    criterios = OrderedDict([
        ('entidades_con_referencia', _criterio_entidades(red, unidades, censo, lineas, cruces)),
        ('correspondencia_por_unidad', {'cumplido': all(u.get('correspondencia', {}).get('clase') for u in unidades),
                                        'clases': dict(sorted(Counter(u['correspondencia']['clase'] for u in unidades).items()))}),
        ('validadores_detectan_fallos', _criterio_validadores(red, unidades, censo)),
        ('incertidumbres_explicitas', {'cumplido': all(u['motivos'] for u in pendientes) and all(n['motivo'] for n in sin_pareja),
                                       'pendientes_con_motivo': sum(bool(u['motivos']) for u in pendientes),
                                       'nodos_sin_pareja_con_motivo': sum(bool(n['motivo']) for n in sin_pareja)}),
        ('excepciones_registradas', {'cumplido': excepciones_ok and bool(excepciones),
                                     'por_tipo': dict(sorted(Counter(e['tipo'] for e in excepciones).items()))}),
        ('historico_separado_de_heuristicas', {'cumplido': True, **separadas}),
        ('ninguna_pendiente_en_el_generador', {'cumplido': not lee_referencia, 'generador_lee_la_referencia': lee_referencia,
                                               'aprobadas_disponibles_para_la_fase_3': len(unidades) - len(pendientes)}),
    ])
    return {**criterios, 'fase_2_cerrable': all(c['cumplido'] for c in criterios.values())}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def main():
    from damero import cruces_1772
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('--referencias', type=Path, default=Path(__file__).parent / 'referencias')
    args = ap.parse_args()
    c, r = args.carpeta, args.referencias
    red, unidades = _leer(r / '1772-red.json'), _leer(r / '1772-unidades.json')['unidades']
    trazado = _leer(c / 'trazado-calles-original.json')
    censo = {u['id_fuente'] for u in _leer(c / 'unidades-original.json')['unidades']}
    excepciones = excepciones_1772(trazado, unidades, _leer(c / 'limites-calce.json'))
    validar_excepciones(excepciones, {u['id'] for u in unidades})
    (r / '1772-excepciones.json').write_text(json.dumps(
        {'alcance': 'Excepciones de la referencia histórica de 1772 (specs/08 fase 2, T33j.2b): lo que las fases '
                    'siguientes tienen que respetar y no corregir. Generado por tools/geo/cierre_fase2.py.',
         'excepciones': excepciones}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    cruces = {x['id'] for x in cruces_1772(trazado['lineas'], _leer(c / 'sectores.json')['sectores'])}
    puerta = puerta_fase2(red, unidades, censo, {l['id'] for l in trazado['lineas']}, cruces, excepciones,
                          _leer(c / 'procedencia-generador.json'))
    informe = OrderedDict([
        ('alcance', 'Puerta de salida de la fase 2 de 1772 (specs/08). Cuenta lo registrado en la referencia; no certifica '
                    'fidelidad ni habilita la generación.'),
        ('puerta_de_salida', puerta),
        ('pendientes_del_trazado', trazado.get('revision', {}).get('pendiente', [])),
        ('referencias', {'red': 'tools/geo/referencias/1772-red.json', 'unidades': 'tools/geo/referencias/1772-unidades.json',
                         'excepciones': 'tools/geo/referencias/1772-excepciones.json'}),
    ])
    (c / 'cierre-fase2.json').write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"fase 2 cerrable: {puerta['fase_2_cerrable']}; "
          + '; '.join(f'{k}: {v["cumplido"]}' for k, v in puerta.items() if isinstance(v, dict)))


if __name__ == '__main__':
    main()
