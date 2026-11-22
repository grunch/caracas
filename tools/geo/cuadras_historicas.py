"""Cuadras cerradas comprobadas en el original de 1772, sin heredar sus pasajes modernos."""
import json
from pathlib import Path
from shapely.geometry import LineString, Polygon


def es_completa(cara, completas):
    """Correspondencia uno a uno; una cara que funde dos cuadras no sirve."""
    return any(.65 <= cara.area / p.area <= 1.5 and cara.intersection(p).area >= .65 * cara.area
               for p in completas)


def cargar():
    aqui = Path(__file__).resolve().parent
    datos = json.loads((aqui / 'cuadras-1772.json').read_text())
    return [Polygon(c['mosaico']) for c in datos['cuadras_cerradas']]


OCUPACIONES_EDIFICADAS = {'continua', 'parcial', 'aislada', 'conjunto_especial'}
RELLENAR = {'continua'}   # solo una cuadra continua se edifica entera: en las demás lo abierto de 1936 se conserva


def cargar_referencia(red, unidades):
    """Las cuadras de 1772 de la referencia histórica (tools/geo/referencias/1772-*.json, fase 2): solo las unidades
    aprobadas con ocupación edificada, cada una con su anillo de ejes de calle en px del mosaico de 1936. Una
    pendiente nunca entra al generador. `rellenar`: si lo abierto de 1936 dentro de ella se vuelve a edificar."""
    por_id = {n['id']: n for n in red['nodos']}
    return [{'id': u['id'], 'poligono': Polygon([por_id[x]['mosaico'] for x in u['nodos']]),
             'rellenar': u['ocupacion'] in RELLENAR}
            for u in unidades if u['estado'] == 'aprobada' and u['nodos'] and u['ocupacion'] in OCUPACIONES_EDIFICADAS]


def ejes_de_calzada(red, verificadas=()):
    """Los ejes en 1936 de los tramos rectos de la referencia entre dos cruces identificados y de las calles históricas
    verificadas en los dos planos (calles-historicas.json, como San Jacinto–Traposos; por la referencia si se puede, si
    no por sus anclajes): las calles de 1772 que se saben ubicar en 1936. Ninguna casa de 1772 pisa su núcleo de calzada."""
    from cierre_fase3 import historicas_en_referencia
    por_id = {n['id']: n for n in red['nodos']}
    rectos = [LineString([por_id[a]['mosaico'], por_id[b]['mosaico']])
              for c in red['calles'] if c['tipo'] == 'calle_recta'
              for a, b in zip(c['nodos'], c['nodos'][1:]) if por_id[a]['mosaico'] and por_id[b]['mosaico']]
    return rectos + [LineString(v['anclajes']) for v in historicas_en_referencia(list(verificadas), red)]


def cargar_referencia_de_archivos(carpeta=None):
    """(referencia, ejes de calzada, edificado de las pendientes). Con `carpeta` (specs/auditoria-1772), lo edificado
    revisado: el de una unidad con anillo va a su cuadra (`edificado`), el de una pendiente se devuelve aparte."""
    aqui = Path(__file__).resolve().parent / 'referencias'
    red = json.loads((aqui / '1772-red.json').read_text(encoding='utf-8'))
    unidades = json.loads((aqui / '1772-unidades.json').read_text(encoding='utf-8'))['unidades']
    referencia, pendientes = cargar_referencia(red, unidades), []
    if carpeta is not None:
        edificado = cargar_edificado_de_archivos(Path(carpeta), red, unidades)
        de_anillo = {e['id']: e['poligonos'] for e in edificado if e['por_anillo']}
        referencia = [{**r, 'edificado': de_anillo[r['id']]} if r['id'] in de_anillo and not r['rellenar'] else r
                      for r in referencia]
        aprobadas = {r['id'] for r in referencia}
        pendientes = [e for e in edificado if not e['por_anillo'] and e['id'] not in aprobadas]
    verificadas = json.loads((Path(__file__).resolve().parent / 'calles-historicas.json').read_text(encoding='utf-8'))['tramos']
    return referencia, ejes_de_calzada(red, verificadas), pendientes


def cargar_edificado(red, unidades, aprobado, a_1936, limites):
    """Lo edificado revisado del original (edificado_original.edificado_aprobado: {unidad: polígonos en px del original})
    llevado a 1936, para las unidades edificadas fuera de los sectores límite del calce. Una unidad con anillo de cuatro
    cruces identificados va por la transformación de sus esquinas (`por_anillo`), mucho más precisa en su cuadra que el
    calce; una pendiente, por el calce por identidad (`a_1936`), con el error de su sector."""
    import cv2
    import numpy as np
    por_id = {n['id']: n for n in red['nodos']}
    resultado = []
    for u in unidades:
        if u['id'] not in aprobado or u['sector'] in limites or u['ocupacion'] not in OCUPACIONES_EDIFICADAS:
            continue
        anillo = [por_id[x] for x in (u['nodos'] or [])]
        por_anillo = len(anillo) == 4 and all(n.get('original') and n.get('mosaico') for n in anillo)
        if por_anillo:
            h = cv2.getPerspectiveTransform(np.float32([n['original'] for n in anillo]), np.float32([n['mosaico'] for n in anillo]))
            llevar = lambda p, h=h: cv2.perspectiveTransform(np.float32(p)[None], h)[0].tolist()
        else:
            llevar = lambda p: [list(v) for v in zip(*(np.asarray(c, float).tolist() for c in a_1936(
                [q[0] for q in p], [q[1] for q in p])))]
        poligonos = [Polygon(llevar(p)).buffer(0) for p in aprobado[u['id']]]
        poligonos = [q for q in poligonos if q.geom_type == 'Polygon' and not q.is_empty]
        if poligonos:
            resultado.append({'id': u['id'], 'poligonos': poligonos, 'por_anillo': por_anillo})
    return resultado


def cargar_edificado_de_archivos(carpeta, red, unidades):
    """cargar_edificado con lo revisado de specs/auditoria-1772 y el calce elegido."""
    import numpy as np
    from calce import Calce
    from edificado_original import edificado_aprobado
    aqui = Path(__file__).resolve().parent
    leer = lambda r: json.loads(Path(r).read_text(encoding='utf-8'))
    config = leer(aqui / 'gcp' / 'calce-1772-pares-agi-exato-mapa.json')
    calce = Calce.ajustar(config['gcps'], 0.5, config.get('suavizado', 0.0))
    aprobado = edificado_aprobado(leer(carpeta / 'edificado-original.json'), leer(carpeta / 'edificado-revisado.json'))
    limites = {s['sector'] for s in leer(carpeta / 'limites-calce.json')['sectores']}
    return cargar_edificado(red, unidades, aprobado,
                            lambda xs, ys: calce.a_1936(np.asarray(xs, float), np.asarray(ys, float)), limites)
