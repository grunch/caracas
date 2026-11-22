"""Puerta de salida de la fase 5 de 1772 (specs/08: alineación y reparto de casas), medida sobre el generador.

Listo cuando: todas las casas del frente comparten su recta dentro de una tolerancia numérica declarada; lotes sin
solapes; ninguna casa enfrenta una medianera sin acceso; no se altera la calle aprobada. Se mide, sobre las casas que
el visor deja a la vista en 1772 (sin las que suprime un hito en pie, como en la fase 4):

- frentes alineados: en cada tramo recto medible de la red llevada a 1936 (1772-calles-1936.json), a cada lado, rayos
  perpendiculares cada PASO_M, lejos de las esquinas, hasta la primera casa (la planta de un hito corta el rayo). Por
  los puntos de fachada se ajusta una recta robusta; cada casa queda a su desvío mediano de ella y está desalineada si
  pasa TOLERANCIA_FACHADA_M. La recta no tiene que ser paralela al eje: la fachada de 1936 puede ir oblicua a él;
- lotes sin solapes: ningún par de casas con área común mayor que SOLAPE_MINIMO_M2 (el umbral de detección de
  T33j.1e: una medianera compartida tiene área común cero) y ninguna huella inválida;
- casas con acceso: las casas se juntan en manzanas edificadas (cerrando los huecos de menos de 2·CIERRE_M) y cada casa
  tiene al menos ACCESO_MINIMO_M de borde sobre el contorno exterior de la suya. Una casa que solo da a un patio o a una
  huerta interior, o que queda dentro del hueco de otra manzana, no tiene acceso;
- calle aprobada: la puerta de la fase 3 sigue cerrable sobre la misma ciudad.

Los tramos de los sectores límite del calce (medible = false) no se miden, como en la fase 3. Los umbrales son
inferidos, quedan declarados en el JSON y no se cambian para que algo pase. Cuenta lo medido; no certifica fidelidad.

    .venv/bin/python tools/geo/cierre_fase5.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json
"""
import argparse
import hashlib
import json
import subprocess
from collections import OrderedDict
from pathlib import Path

import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree

from cierre_fase3 import EPOCA_1772, METRO, casas_de_epoca
from cierre_fase4 import _en_pie, visibles

# los rayos, las estaciones y la recta de la mayoría son los mismos con que el generador alinea (tools/geo/fachadas.py)
from fachadas import (ALCANCE_M, ESQUINA_M, ESTACIONES_MINIMAS, PASO_M, TOLERANCIA_FACHADA_M,  # noqa: E402
                      de_su_manzana, estaciones as _estaciones, manzanas_de, recta_de_la_mayoria as _recta_robusta)
SOLAPE_MINIMO_M2 = 0.01      # umbral de detección de T33j.1e (diagnostico-huellas.md)
CIERRE_M = 1.0               # dos casas a menos de 2·CIERRE_M son de la misma manzana edificada
ACCESO_MINIMO_M = 2.0        # el ancho de una puerta: menos borde hacia afuera no da acceso
TOLERANCIA_BORDE_PX = 0.05    # borde de una casa sobre el contorno exterior de su manzana (numérica)
MAYORES = 50                 # cuántos pares de solape se listan


def _primero(rayo, origen, arbol, figuras, son_obstaculo):
    """(índice, punto) de la primera figura que corta el rayo desde su origen, o None."""
    mejor = None
    for j in arbol.query(rayo, predicate='intersects'):
        corte = rayo.intersection(figuras[j])
        if corte.is_empty:
            continue
        d = origen.distance(corte)
        if mejor is None or d < mejor[0]:
            mejor = (d, j, corte)
    if mejor is None or son_obstaculo[mejor[1]]:
        return None
    _d, j, corte = mejor
    puntos = [Point(c) for g in getattr(corte, 'geoms', [corte]) for c in g.coords]
    return j, min(puntos, key=origen.distance)


def frentes_desalineados(calles, casas, metro=METRO, obstaculos=(), tolerancia_m=TOLERANCIA_FACHADA_M):
    """Las casas que se apartan de la recta de su frente en los tramos rectos medibles."""
    figuras = [c for _, c in casas] + list(obstaculos)
    son_obstaculo = [False] * len(casas) + [True] * len(obstaculos)
    arbol = STRtree(figuras) if figuras else None
    tol_px, alcance = tolerancia_m / metro, ALCANCE_M / metro
    # una casa es fachada de un frente si es de la manzana edificada que lo arma (fachadas.de_su_manzana)
    manzana = manzanas_de([c for _, c in casas], metro) + [-1] * len(obstaculos)
    medidos, medidas, desalineados = 0, set(), []
    for eje in calles:
        if not eje['medible'] or arbol is None:
            continue
        for a, b in zip(eje['puntos'], eje['puntos'][1:]):
            d, estaciones = _estaciones(a, b, metro)
            for lado in (1, -1):
                if d is None:
                    continue
                n = np.array([-d[1], d[0]]) * lado
                golpes = [_primero(LineString([p, p + n * alcance]), Point(p), arbol, figuras, son_obstaculo)
                          for p in estaciones]
                golpes = de_su_manzana([g for g in golpes if g is not None], manzana)
                techos = {casas[j][0] for j, _ in golpes}
                if len(golpes) < ESTACIONES_MINIMAS or len(techos) < 2:
                    continue
                medidos += 1
                medidas |= techos
                puntos = np.array([[p.x, p.y] for _, p in golpes])
                centro, normal = _recta_robusta(puntos, tol_px, [n])
                residuo = np.abs((puntos - centro) @ normal)
                por_casa = {}
                for (j, _), r in zip(golpes, residuo):
                    por_casa.setdefault(casas[j][0], []).append(r)
                fuera = [{'techo': t, 'desvio_m': round(float(np.median(rs)) * metro, 2)}
                         for t, rs in sorted(por_casa.items()) if float(np.median(rs)) > tol_px]
                if fuera:
                    desalineados.append({'tramo': eje['tramo'], 'sector': eje['sector'], 'lado': lado, 'casas': fuera})
    return {'frentes_medidos': medidos, 'casas_medidas': len(medidas), 'desalineados': desalineados}


def solapes(casas, metro=METRO, umbral_m2=SOLAPE_MINIMO_M2):
    """Pares de casas con área común mayor que el umbral y huellas inválidas (no se reparan ni se intersectan)."""
    invalidas = [k for k, c in casas if not c.is_valid]
    validas = [(k, c) for k, c in casas if c.is_valid]
    figuras = [c for _, c in validas]
    arbol = STRtree(figuras) if figuras else None
    pares = []
    for i, (k, c) in enumerate(validas):
        for j in (arbol.query(c, predicate='intersects') if arbol is not None else ()):
            if j <= i:
                continue
            area = c.intersection(figuras[j]).area * metro ** 2
            if area > umbral_m2:
                pares.append({'techos': sorted([k, validas[j][0]]), 'area_m2': round(area, 3)})
    pares.sort(key=lambda p: (-p['area_m2'], p['techos']))
    return {'pares': len(pares), 'mayor_m2': pares[0]['area_m2'] if pares else 0.0, 'mayores': pares[:MAYORES],
            'invalidas': invalidas}


def casas_sin_acceso(casas, metro=METRO, cierre_m=CIERRE_M, acceso_minimo_m=ACCESO_MINIMO_M):
    """Las casas sin ACCESO_MINIMO_M de borde sobre el contorno exterior de su manzana edificada."""
    validas = [(k, c) for k, c in casas if c.is_valid and not c.is_empty]
    if not validas:
        return {'sin_acceso': []}
    g = cierre_m / metro
    juntas = unary_union([c for _, c in validas]).buffer(g, join_style='mitre').buffer(-g, join_style='mitre')
    manzanas = [m for m in getattr(juntas, 'geoms', [juntas]) if not m.is_empty]
    cascos = [Polygon(m.exterior) for m in manzanas]
    # una manzana que cae dentro del casco de otra (en su patio o su huerta) no da a la calle
    afuera = [m for i, m in enumerate(manzanas)
              if not any(j != i and cascos[j].area > cascos[i].area and cascos[j].contains(m.representative_point())
                         for j in range(len(manzanas)))]
    # solo el borde que coincide con el contorno exterior: la tolerancia es numérica, no suma medianeras laterales
    exterior = unary_union([LineString(m.exterior.coords) for m in afuera]).buffer(TOLERANCIA_BORDE_PX)
    sin = [k for k, c in validas if c.boundary.intersection(exterior).length * metro < acceso_minimo_m]
    return {'sin_acceso': sorted(sin)}


def plantas_en_pie(hitos, epoca=EPOCA_1772):
    return [Polygon(p) for h in hitos if _en_pie(h, epoca) for p in h['planta']]


def con_limites(desalineados, limites):
    """Los frentes desalineados con la clase del límite documentado que los cubre (limites-fase5.json, decisión del
    responsable): un frente registrado (tramo y lado) cuenta como límite si no tiene más casas fuera de la recta que
    las registradas; si tiene más, algo cambió y vuelve a contar entero. → (frentes nuevos, casas en límite, fuera)."""
    registro = {(x['tramo'], x['lado']): x for x in limites}
    salida, en_limite, fuera = [], set(), set()
    for f in desalineados:
        x = registro.get((f['tramo'], f['lado']))
        techos = {c['techo'] for c in f['casas']}
        if x is not None and len(f['casas']) <= x['casas_maximas']:
            salida.append({**f, 'limite': x['clase']})
            en_limite |= techos
        else:
            salida.append(dict(f))
            fuera |= techos
    return salida, en_limite, fuera


def puerta_fase5(ciudad, calles, hitos, fase3, metro=METRO, limites=()):
    """Criterios de la fase 5 con su cumplimiento sobre las casas visibles de 1772; `fase_5_cerrable` exige todos.
    Los frentes de `limites` (limites-fase5.json) no impiden cerrar, pero quedan listados con su clase."""
    casas = visibles(casas_de_epoca(ciudad), hitos)
    frentes = frentes_desalineados(calles, casas, metro, plantas_en_pie(hitos))
    desalineados, en_limite, fuera = con_limites(frentes['desalineados'], limites)
    frentes = {**frentes, 'desalineados': desalineados}
    lotes = solapes(casas, metro)
    acceso = casas_sin_acceso(casas, metro)
    criterios = OrderedDict([
        ('frentes_alineados', {'cumplido': not fuera, 'tolerancia_m': TOLERANCIA_FACHADA_M,
                               # casas distintas: una casa puede salir de la recta en más de un frente
                               'casas_desalineadas': len(en_limite | fuera),
                               'casas_en_limite': len(en_limite - fuera), 'casas_fuera_de_limite': len(fuera),
                               **frentes}),
        ('lotes_sin_solapes', {'cumplido': not lotes['pares'] and not lotes['invalidas'], 'umbral_m2': SOLAPE_MINIMO_M2,
                               **lotes}),
        ('casas_con_acceso', {'cumplido': not acceso['sin_acceso'], 'cierre_m': CIERRE_M,
                              'acceso_minimo_m': ACCESO_MINIMO_M, 'casas_sin_acceso': len(acceso['sin_acceso']),
                              **acceso}),
        ('calle_aprobada', {'cumplido': bool(fase3.get('fase_3_cerrable')), 'puerta': 'cierre_fase3'}),
    ])
    return {**criterios,
            'umbrales_inferidos': {'tolerancia_fachada_m': TOLERANCIA_FACHADA_M, 'paso_m': PASO_M, 'esquina_m': ESQUINA_M,
                                   'alcance_m': ALCANCE_M, 'solape_minimo_m2': SOLAPE_MINIMO_M2, 'cierre_m': CIERRE_M,
                                   'acceso_minimo_m': ACCESO_MINIMO_M},
            'casas_1772': len(casas), 'fase_5_cerrable': all(c['cumplido'] for c in criterios.values())}


def _leer(ruta):
    return json.loads(Path(ruta).read_text(encoding='utf-8'))


def main():
    from cierre_fase3 import puerta_fase3
    raiz = Path(__file__).resolve().parents[2]
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('carpeta', type=Path, help='specs/auditoria-1772')
    ap.add_argument('ciudad', type=Path, help='fuentes/derivados/epocas/ciudad-epocas.json (salida del generador)')
    ap.add_argument('--datos', default=None, help='release datos-* o commit del que sale la ciudad medida')
    args = ap.parse_args()
    referencias = Path(__file__).parent / 'referencias'
    red, unidades = _leer(referencias / '1772-red.json'), _leer(referencias / '1772-unidades.json')['unidades']
    calles = _leer(referencias / '1772-calles-1936.json')['tramos']
    verificadas = _leer(Path(__file__).parent / 'calles-historicas.json')['tramos']
    hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                      text=True, cwd=raiz).stdout)
    ciudad = _leer(args.ciudad)
    fase3 = puerta_fase3(ciudad, red, unidades, verificadas, calles=calles)
    registro = args.carpeta / 'limites-fase5.json'
    limites = _leer(registro)['frentes'] if registro.exists() else []
    puerta = puerta_fase5(ciudad, calles, hitos, fase3, limites=limites)
    informe = OrderedDict([
        ('alcance', 'Puerta de salida de la fase 5 de 1772 (specs/08), medida sobre la salida del generador. Cuenta lo '
                    'medido; no certifica fidelidad.'),
        ('ciudad', {'archivo': 'fuentes/' + args.ciudad.resolve().as_posix().split('/fuentes/', 1)[-1],
                    'sha256': hashlib.sha256(args.ciudad.read_bytes()).hexdigest(), 'datos': args.datos}),
        ('puerta_de_salida', puerta),
    ])
    (args.carpeta / 'cierre-fase5.json').write_text(json.dumps(informe, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"fase 5 cerrable: {puerta['fase_5_cerrable']}; casas de 1772: {puerta['casas_1772']}; "
          + '; '.join(f"{k}: {v['cumplido']}" for k, v in puerta.items() if isinstance(v, dict) and 'cumplido' in v))


if __name__ == '__main__':
    main()
