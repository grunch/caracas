"""Puerta de salida de la fase 7 de 1772: cierres y accesos (specs/08, T33j.7a).

- sin aberturas indebidas: en cada frente medible (los de la puerta de la fase 5), una abertura es un tramo de
  estaciones seguidas, de al menos ANCHO_ABERTURA_M (una puerta), donde el rayo pasa la recta de la fachada por más
  de ANCHO_ABERTURA_M o no toca nada, entre la primera y la última casa de la manzana que arma el frente. Es indebida si
  el original pinta edificado en ese lugar (lo edificado revisado de la fase 4): por ahí se entra a un patio privado
  por un hueco accidental;
- casas con acceso: el de la puerta de la fase 5 (ninguna casa sin borde hacia la calle);
- pasajes públicos abiertos: las calles libres de la puerta de la fase 3 (ningún pasaje sellado);
- terreno libre sin casas: el de la puerta de la fase 4;
- lo visible choca (I1772-013): en el modo a pie no se atraviesa la planta de un hito en pie (la rejilla de colisión
  del visor, src/a-pie.js, con tools/choca-a-pie.mjs).

Cuenta lo medido; no certifica fidelidad. Uso:
  .venv/bin/python tools/geo/cierre_fase7.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json \\
      --datos <release o commit>
"""
import argparse
import hashlib
import json
import subprocess
from collections import Counter, OrderedDict
from pathlib import Path

import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree

from cierre_fase3 import METRO, casas_de_epoca
from cierre_fase4 import _en_pie, visibles
from cierre_fase5 import _estaciones, _primero, _recta_robusta, plantas_en_pie
from fachadas import ALCANCE_M, ESTACIONES_MINIMAS, PASO_M, TOLERANCIA_FACHADA_M, manzanas_de

ANCHO_ABERTURA_M = 2.0      # una abertura más angosta que una puerta no deja entrar (el acceso mínimo de la fase 5)
ADENTRO_M = 1.0             # el punto de la abertura, esto detrás de la recta de la fachada
EPOCA_1772 = 1


def _de_la_manzana(golpes, manzana):
    """Los golpes (casa, punto, estación) de la manzana que arma el frente: la de la mayoría."""
    if not golpes:
        return []
    suya = Counter(manzana[j] for j, _, _ in golpes).most_common(1)[0][0]
    return [g for g in golpes if manzana[g[0]] == suya]


def _tramos_abiertos(golpes, suyos, n, metro, cerradas=frozenset()):
    """([(primera, última)] estaciones seguidas donde el rayo no pega sobre la fachada, recta). La recta sale de los
    golpes de la manzana que arma el frente (`suyos`, como en la fase 5); sobre la fachada está cualquier golpe a no más
    de ANCHO_ABERTURA_M de ella (un hueco grande parte la manzana edificada, pero sigue siendo del frente). Solo entre
    la primera y la última estación sobre la fachada. ([], None) si el frente no se puede medir."""
    if len(suyos) < ESTACIONES_MINIMAS or len({j for j, _, _ in suyos}) < 2:
        return [], None
    puntos = np.array([[h.x, h.y] for _, h, _ in suyos])
    centro, normal = _recta_robusta(puntos, TOLERANCIA_FACHADA_M / metro, [n])
    if normal @ n < 0:
        normal = -normal
    pega = {k for _, h, k in golpes if abs(float((np.array([h.x, h.y]) - centro) @ normal)) <= ANCHO_ABERTURA_M / metro}
    pega |= set(cerradas)   # las estaciones cuyo rayo pega en un hito están cerradas
    if not pega:
        return [], None
    tramos, actual = [], None
    for k in range(min(pega), max(pega) + 1):
        if k in pega:
            actual = None
        elif actual is None:
            actual = [k, k]
            tramos.append(actual)
        else:
            actual[1] = k
    return [tuple(t) for t in tramos], (centro, normal)


def aberturas_de_frentes(calles, casas, metro=METRO, obstaculos=(), edificado=()):
    """Las aberturas de los frentes medibles: [{tramo, lado, segmento, ancho_m, punto (px), indebida}]. `edificado`:
    polígonos (px) de lo que el original pinta edificado; una abertura cuyo punto cae ahí es indebida."""
    figuras = [c for _, c in casas] + list(obstaculos)
    son_obstaculo = [False] * len(casas) + [True] * len(obstaculos)
    if not figuras:
        return []
    arbol = STRtree(figuras)
    manzana = manzanas_de([c for _, c in casas], metro) + [-1] * len(obstaculos)
    rojo = unary_union(list(edificado)) if len(edificado) else None
    alcance = ALCANCE_M / metro
    ninguno = [False] * len(figuras)
    salida = []
    for eje in calles:
        if not eje['medible']:
            continue
        for segmento, (a, b) in enumerate(zip(eje['puntos'], eje['puntos'][1:])):
            d, estaciones = _estaciones(a, b, metro)
            if d is None:
                continue
            for lado in (1, -1):
                n = np.array([-d[1], d[0]]) * lado
                golpes, en_hito = [], set()
                for k, p in enumerate(estaciones):
                    # sin tratar los hitos como obstáculo: un rayo que pega primero en la planta de un hito no ve un
                    # hueco, ve el hito (revisión de #151)
                    g = _primero(LineString([p, p + n * alcance]), Point(p), arbol, figuras, ninguno)
                    if g is None:
                        continue
                    if son_obstaculo[g[0]]:
                        en_hito.add(k)
                    else:
                        golpes.append((g[0], g[1], k))
                tramos, recta = _tramos_abiertos(golpes, _de_la_manzana(golpes, manzana), n, metro, cerradas=en_hito)
                for k0, k1 in tramos:
                    ancho_m = (k1 - k0 + 1) * PASO_M
                    if ancho_m < ANCHO_ABERTURA_M:
                        continue
                    centro, normal = recta
                    medio = (np.asarray(estaciones[k0], float) + np.asarray(estaciones[k1], float)) / 2
                    sobre = medio + n * (float((centro - medio) @ normal) / float(n @ normal))
                    punto = sobre + n * (ADENTRO_M / metro)
                    salida.append({'tramo': eje['tramo'], 'lado': lado, 'segmento': segmento, 'ancho_m': ancho_m,
                                   'punto': [round(float(punto[0]), 2), round(float(punto[1]), 2)],
                                   'indebida': bool(rojo is not None and rojo.contains(Point(punto)))})
    return salida


def de_fases(fases, sha256):
    """Los criterios que ya miden las puertas 3, 4 y 5, sobre esta misma ciudad (su sha256)."""
    def de(fase, criterio):
        f = fases[fase]
        misma = f['ciudad']['sha256'] == sha256
        return {'cumplido': misma and bool(f['puerta_de_salida'][criterio]['cumplido']), 'puerta': f'cierre_fase{fase}',
                'criterio': criterio, 'misma_ciudad': misma}
    return OrderedDict([('casas_con_acceso', de(5, 'casas_con_acceso')),
                        ('pasajes_publicos_abiertos', de(3, 'calles_libres')),
                        ('terreno_libre_sin_casas', de(4, 'libres_sin_casas'))])


def puntos_de_hitos(hitos, epoca=EPOCA_1772):
    """[(id, (x, y))]: un punto dentro de cada planta de los hitos en pie en la época (px). La de un hito transitable
    (una plaza: se camina, chocan sus piezas) no cuenta."""
    return [(h['id'], tuple(Polygon(p).representative_point().coords[0]))
            for h in hitos if _en_pie(h, epoca) and not h.get('transitable') for p in h.get('planta', [])]


def hitos_atravesables(hitos, choca, epoca=EPOCA_1772):
    """Los hitos en pie con algún punto de su planta donde el caminante no choca (`choca(x, y)`, en px)."""
    return sorted({i for i, (x, y) in puntos_de_hitos(hitos, epoca) if not choca(x, y)})


def puerta_fase7(ciudad, calles, hitos, fases, sha256, edificado, choca, metro=METRO):
    """Criterios de la fase 7 sobre las casas de 1772 a la vista; `fase_7_cerrable` exige todos."""
    casas = visibles(casas_de_epoca(ciudad), hitos)
    aberturas = aberturas_de_frentes(calles, casas, metro, plantas_en_pie(hitos), edificado)
    indebidas = [a for a in aberturas if a['indebida']]
    atravesables = hitos_atravesables(hitos, choca)
    criterios = OrderedDict([
        ('sin_aberturas_indebidas', {'cumplido': not indebidas, 'ancho_minimo_m': ANCHO_ABERTURA_M,
                                     'aberturas': len(aberturas), 'indebidas': len(indebidas), 'lista': aberturas}),
        *de_fases(fases, sha256).items(),
        ('lo_visible_choca', {'cumplido': not atravesables, 'hitos_atravesables': atravesables}),
    ])
    return {**criterios,
            'umbrales_inferidos': {'ancho_abertura_m': ANCHO_ABERTURA_M, 'adentro_m': ADENTRO_M,
                                   'tolerancia_fachada_m': TOLERANCIA_FACHADA_M},
            'casas_1772': len(casas), 'fase_7_cerrable': all(c['cumplido'] for c in criterios.values())}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def main():
    from cuadras_historicas import cargar_edificado_de_archivos
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('ciudad', type=Path, help='fuentes/derivados/epocas/ciudad-epocas.json (salida del generador)')
    ap.add_argument('--datos', default=None, help='release datos-* o commit del que sale la ciudad medida')
    args = ap.parse_args()
    referencias = Path(__file__).parent / 'referencias'
    red, unidades = _leer(referencias / '1772-red.json'), _leer(referencias / '1772-unidades.json')['unidades']
    calles = _leer(referencias / '1772-calles-1936.json')['tramos']
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    ciudad = _leer(args.ciudad)
    sha256 = hashlib.sha256(args.ciudad.read_bytes()).hexdigest()
    fases = {k: _leer(args.carpeta / f'cierre-fase{k}.json') for k in (3, 4, 5)}
    edificado = [p for e in cargar_edificado_de_archivos(args.carpeta, red, unidades) for p in e['poligonos']]
    # la colisión la decide el visor: src/a-pie.js con los datos generados (tools/choca-a-pie.mjs)
    puntos = puntos_de_hitos(hitos)
    salida = subprocess.run(['node', str(raiz / 'tools' / 'choca-a-pie.mjs'), str(EPOCA_1772)], check=True,
                            capture_output=True, text=True, cwd=raiz, input=json.dumps([list(p) for _, p in puntos])).stdout
    chocan = dict(zip([p for _, p in puntos], json.loads(salida)))
    puerta = puerta_fase7(ciudad, calles, hitos, fases, sha256, edificado, lambda x, y: chocan.get((x, y), False))
    informe = OrderedDict([
        ('alcance', 'Puerta de salida de la fase 7 de 1772 (specs/08), medida sobre la salida del generador y la colisión '
                    'del modo a pie del visor. Cuenta lo medido; no certifica fidelidad.'),
        ('ciudad', {'archivo': 'fuentes/' + args.ciudad.resolve().as_posix().split('/fuentes/', 1)[-1],
                    'sha256': sha256, 'datos': args.datos}),
        ('puerta_de_salida', puerta),
    ])
    (args.carpeta / 'cierre-fase7.json').write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"fase 7 cerrable: {puerta['fase_7_cerrable']}; casas de 1772: {puerta['casas_1772']}; "
          + '; '.join(f"{k}: {v['cumplido']}" for k, v in puerta.items() if isinstance(v, dict) and 'cumplido' in v))


if __name__ == '__main__':
    main()
