"""Unidades de la referencia histórica de 1772 (fase 2 de specs/08, T33j.2b).

Cada una de las 292 unidades del censo tiene su registro: ocupación y lectura del original, correspondencia con 1936
y, si cae entera en una celda del damero, su geometría como el anillo de los cuatro cruces de la red
(`1772-red.json`), de modo que dos unidades vecinas comparten los mismos tramos de calle. Se aprueba solo con todas
las condiciones del criterio; si falta alguna queda pendiente, sin geometría inventada y con sus motivos.
Valida coherencia, no fidelidad; aprobar no habilita la generación por sí solo (fase 3).

    .venv/bin/python tools/geo/referencia_unidades.py specs/auditoria-1772
"""
import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

from shapely.geometry import Polygon, box

from referencia_historica import validar_referencia

CONTENIDA = 0.85   # como damero.CONTENIDA: fracción de la unidad dentro de la celda para tenerla por entera dentro
SIN_UNIDAD_PROPIA = {'parte_de_otra_unidad', 'descartada_no_edificacion'}
# Motivos en el orden en que se informan; cada uno, una condición del criterio de aprobación.
MOTIVOS = {
    'sin_celda_del_damero': 'ninguna celda del damero contiene el 85 % de la unidad (periferia, forma irregular o '
                            'varias celdas): su contorno se cierra en la fase 3 (T33j.3b)',
    'celda_compartida': 'otra unidad cae en la misma celda: el anillo de la celda no es de ninguna de las dos',
    'lado_sin_calle': 'un lado de la celda no es un tramo de calle de la red',
    'esquina_sin_pareja_en_1936': 'una esquina de la celda no tiene pareja por identidad en 1936',
    'correspondencia_incierta': 'su correspondencia con 1936 es incierta (correspondencias-identidad.md)',
    'sector_limite_del_calce': 'su sector es un límite documentado del calce (limites-calce.json)',
    'ocupacion_sin_unidad_propia': 'el censo la lee como parte de otra unidad o la descarta como edificación',
    'excepcion_registrada': 'tiene una excepción registrada en el trazado que la fase 3 debe respetar',
}


def celdas_de_red(red):
    """{(i, j): anillo de los cruces (i, j), (i+1, j), (i+1, j+1), (i, j+1) y si sus cuatro lados son tramos de calle}."""
    cruces = {tuple(n['indice']): n['id'] for n in red['nodos'] if n.get('tipo') == 'cruce' and n.get('indice')}
    tramos = {frozenset(p) for c in red['calles'] for p in zip(c['nodos'], c['nodos'][1:])}
    celdas = {}
    for (i, j) in cruces:
        esquinas = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
        if all(e in cruces for e in esquinas):
            anillo = [cruces[e] for e in esquinas]
            celdas[(i, j)] = {'nodos': anillo,
                              'lados_de_calle': all(frozenset(p) in tramos for p in zip(anillo, anillo[1:] + anillo[:1]))}
    return celdas


def _celda_de(figura, poligonos):
    if not poligonos:
        return None
    clave, celda = max(poligonos.items(), key=lambda kv: kv[1].intersection(figura).area)
    return clave if celda.intersection(figura).area >= CONTENIDA * figura.area else None


def _motivos(u, celda, celdas, ocupadas, por_id, clase, limites, excepciones):
    m = []
    if celda is None:
        m.append('sin_celda_del_damero')
    else:
        if ocupadas[celda] > 1:
            m.append('celda_compartida')
        if not celdas[celda]['lados_de_calle']:
            m.append('lado_sin_calle')
        if any(por_id[x]['estado'] != 'identidad_verificada' for x in celdas[celda]['nodos']):
            m.append('esquina_sin_pareja_en_1936')
    if clase == 'incierta':
        m.append('correspondencia_incierta')
    if u['sector'] in limites:
        m.append('sector_limite_del_calce')
    if u['revision_original']['ocupacion'] in SIN_UNIDAD_PROPIA:
        m.append('ocupacion_sin_unidad_propia')
    if excepciones.get(u['id_fuente']):
        m.append('excepcion_registrada')
    return m


def unidades_de_referencia(unidades, red, lecturas, caras, correspondencias, limites, excepciones):
    """Un registro por unidad del censo. `lecturas`: {unidad: bordes | sin_cara | restantes}; `caras`: {unidad: cara
    candidata con `id` y `original`}; `correspondencias`: {unidad: fila de correspondencias-unidades.json};
    `limites`: sectores límite del calce; `excepciones`: {unidad: [criterios del trazado]}."""
    por_id = {n['id']: n for n in red['nodos']}
    celdas = celdas_de_red(red)
    poligonos = {k: Polygon([por_id[x]['original'] for x in c['nodos']]) for k, c in celdas.items()}
    figura = {u['id_fuente']: Polygon(caras[u['id_fuente']]['original']) if u['id_fuente'] in caras
              else box(*u['bbox_original']) for u in unidades}
    celda = {k: _celda_de(f, poligonos) for k, f in figura.items()}
    ocupadas = defaultdict(int)
    for c in celda.values():
        if c is not None:
            ocupadas[c] += 1
    registros = []
    for u in unidades:
        ident = u['id_fuente']
        cor = correspondencias[ident]
        motivos = _motivos(u, celda[ident], celdas, ocupadas, por_id, cor['clase'], limites, excepciones)
        geometria = celda[ident] is not None and ocupadas[celda[ident]] == 1 and celdas[celda[ident]]['lados_de_calle'] \
            and all(por_id[x]['estado'] == 'identidad_verificada' for x in celdas[celda[ident]]['nodos'])
        lectura = lecturas[ident]
        registros.append({
            'id': ident, 'sector': u['sector'], 'ocupacion': u['revision_original']['ocupacion'], 'lectura': lectura,
            'correspondencia': {'clase': cor['clase'], 'cuadras_1936': [c['cuadra'] for c in cor.get('cuadras', [])]},
            'celda': list(celda[ident]) if celda[ident] is not None else None,
            'nodos': list(celdas[celda[ident]]['nodos']) if geometria else None,
            'contorno_candidato': caras[ident]['id'] if ident in caras else None,
            'excepciones': list(excepciones.get(ident, [])),
            'estado': 'pendiente' if motivos else 'aprobada', 'motivos': motivos,
            'procedencia': f"censo del original (lectura {lectura}, revisión de la fase 1)"
                           + (f"; celda {list(celda[ident])} del damero sobre la red de la referencia" if celda[ident] else ''),
        })
    return registros


def _validar_registro(u, por_id, tramos):
    if u.get('estado') not in ('aprobada', 'pendiente'):
        raise ValueError(f"{u['id']}: estado inválido")
    if not isinstance(u.get('correspondencia'), dict) or not u['correspondencia'].get('clase'):
        raise ValueError(f"{u['id']}: sin correspondencia con 1936")
    if u['estado'] == 'pendiente':
        if not u.get('motivos') or any(m not in MOTIVOS for m in u['motivos']):
            raise ValueError(f"{u['id']}: pendiente sin motivo o con motivo desconocido {u.get('motivos')}")
    else:
        if u.get('motivos'):
            raise ValueError(f"{u['id']}: aprobada con motivos pendientes {u['motivos']}")
        if not u.get('nodos'):
            raise ValueError(f"{u['id']}: aprobada sin geometría")
    if u.get('nodos'):
        anillo = u['nodos']
        if any(frozenset(p) not in tramos for p in zip(anillo, anillo[1:] + anillo[:1])):
            raise ValueError(f"{u['id']}: un lado de su anillo no es un tramo de calle de la red")
        if any(por_id.get(x, {}).get('estado') != 'identidad_verificada' for x in anillo):
            raise ValueError(f"{u['id']}: una esquina de su anillo no tiene pareja por identidad en 1936")


def validar_unidades(referencia, red, censo):
    """Toda unidad del censo una sola vez; aprobadas con anillo sobre tramos de la red y esquinas identificadas, sin
    motivos; pendientes con motivos conocidos; sin solapes ni inversiones (referencia_historica.validar_referencia)."""
    unidades = referencia['unidades']
    ids = [u['id'] for u in unidades]
    if len(set(ids)) != len(ids):
        raise ValueError('unidad con ID duplicado')
    if set(ids) != set(censo):
        raise ValueError(f'las unidades no son las del censo: faltan {sorted(set(censo) - set(ids))[:5]}, '
                         f'sobran {sorted(set(ids) - set(censo))[:5]}')
    por_id = {n['id']: n for n in red['nodos']}
    tramos = {frozenset(p) for c in red['calles'] for p in zip(c['nodos'], c['nodos'][1:])}
    for u in unidades:
        _validar_registro(u, por_id, tramos)
    usados = {x for u in unidades for x in (u['nodos'] or [])}
    validar_referencia({'fuente': red['fuente'], 'fuente_sha256': red['fuente_sha256'],
                        'nodos': [{'id': x, 'original': por_id[x]['original'], 'mosaico': por_id[x]['mosaico']}
                                  for x in sorted(usados)],
                        'unidades': [{'id': u['id'], 'nodos': u['nodos'], 'estado': u['estado'], 'ocupacion': u['ocupacion'],
                                      'procedencia': u['procedencia']} for u in unidades]})
    motivos = defaultdict(int)
    for u in unidades:
        for m in u['motivos']:
            motivos[m] += 1
    return {'unidades': len(unidades), 'aprobadas': sum(u['estado'] == 'aprobada' for u in unidades),
            'pendientes': sum(u['estado'] == 'pendiente' for u in unidades),
            'con_geometria': sum(bool(u['nodos']) for u in unidades), 'motivos': dict(sorted(motivos.items()))}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def excepciones_del_trazado(trazado):
    """{unidad: [criterios]} de las excepciones registradas en la revisión del trazado (U0036, U0151, …)."""
    resultado = defaultdict(list)
    for e in trazado.get('revision', {}).get('excepciones', []):
        for u in ([e['unidad']] if e.get('unidad') else e.get('unidades', [])):
            resultado[u].append(e['criterio'])
    return dict(resultado)


def main():
    from cierre_fase1 import _lectura_de
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('--red', type=Path, default=Path(__file__).parent / 'referencias' / '1772-red.json')
    ap.add_argument('--salida', type=Path, default=Path(__file__).parent / 'referencias' / '1772-unidades.json')
    args = ap.parse_args()
    c = args.carpeta
    red = _leer(args.red)
    censo = _leer(c / 'unidades-original.json')['unidades']
    lecturas = _lectura_de({'bordes': _leer(c / 'lectura-bordes-original.json')['unidades'],
                            'sin_cara': _leer(c / 'contornos-sin-cara.json')['unidades'],
                            'restantes': _leer(c / 'lectura-restantes-original.json')['unidades']})
    caras = {f['unidad']: f for f in _leer(c / 'frentes-caras-candidatas.json')['caras']}
    correspondencias = {f['unidad']: f for f in _leer(c / 'correspondencias-unidades.json')['unidades']}
    limites = {s['sector'] for s in _leer(c / 'limites-calce.json')['sectores']}
    unidades = unidades_de_referencia(censo, red, lecturas, caras, correspondencias, limites,
                                      excepciones_del_trazado(_leer(c / 'trazado-calles-original.json')))
    resumen = validar_unidades({'unidades': unidades}, red, {u['id_fuente'] for u in censo})
    salida = {'fuente': red['fuente'], 'fuente_sha256': red['fuente_sha256'],
              'red': 'tools/geo/referencias/1772-red.json', 'red_sha256': hashlib.sha256(args.red.read_bytes()).hexdigest(),
              'huella_calce': red['huella_calce'],
              'alcance': 'Unidades de la referencia histórica de 1772 (specs/08 fase 2, T33j.2b). Aprobar exige las ocho '
                         'condiciones de `criterio`; una pendiente queda sin geometría inventada y con sus motivos. Los '
                         'anillos son ejes de calle, no fachadas: aprobar no habilita la generación (fase 3).',
              'criterio': MOTIVOS, 'resumen': resumen, 'unidades': unidades}
    args.salida.write_text(json.dumps(salida, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(json.dumps(resumen, ensure_ascii=False))


if __name__ == '__main__':
    main()
