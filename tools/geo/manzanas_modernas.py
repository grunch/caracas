"""Envolventes del tejido ya documentado, separadas por calles; no es un censo histórico."""
import json
import sys
from pathlib import Path
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree
from manzanas_completas import partes, anillo
from ampliacion_manzanas import seleccionar_ampliacion
from retiro_manzanas import retraer


def referencias(datos, epoca, caras, metro):
    indice = STRtree(caras)
    grupos, sueltas = {}, []
    for t, (n, f) in zip(datos['techos'], datos['vida']):
        if n > epoca or f and f <= epoca:
            continue
        inicio, cuantos = t[:2]
        p = Polygon([datos['vertices'][2*j:2*j+2] for j in range(inicio, inicio+cuantos)]).buffer(0)
        if p.is_empty:
            continue
        candidatas = [int(k) for k in indice.query(p.representative_point()) if caras[k].covers(p.representative_point())]
        if candidatas:
            grupos.setdefault(min(candidatas), []).append(p)
        else:
            sueltas.append(p)
    contornos = []
    for k, ps in sorted(grupos.items()):
        # La envolvente llena patios, pero nunca la calle que separa dos caras.
        # No se llena toda la cara: una casa aislada no urbaniza una cuadra vacía.
        contornos.extend(partes(unary_union(ps).convex_hull.intersection(caras[k].buffer(-3/metro, join_style=2))))
    # Fuera de la red, solo se juntan huellas contiguas (juntas menores que 1 m).
    juntas = unary_union([p.buffer(.51/metro, join_style=2) for p in sueltas])
    for p in partes(juntas):
        contornos.extend(partes(Polygon(p.exterior).buffer(-.51/metro, join_style=2)))
    contornos.sort(key=lambda p: (p.bounds[1], p.bounds[0], p.area))
    return [{'id': f'M{epoca}-{i:04d}', 'poligono': anillo(p), 'estado': 'extraida',
             'ocupacion': 'edificada', 'procedencia': 'envolvente de huellas vivas del mapa, limitada por calles'}
            for i, p in enumerate(contornos) if p.area*metro**2 >= 12]



def quitar_franjas_sin_espacio(seleccion, metro):
    utiles, descartadas = [], []
    for m in seleccion['manzanas']:
        p = Polygon(m.get('limite', m['poligono']), m.get('huecos', [])).buffer(0)
        bordes = list(p.minimum_rotated_rectangle.exterior.coords)
        largo = max(((b[0]-a[0])**2+(b[1]-a[1])**2)**.5 for a,b in zip(bordes,bordes[1:]))
        if p.area*metro**2 < 12 or p.area/max(largo,1e-9)*metro < 2:
            descartadas.append({'id':m['id'],'referencia':m['referencia'],'motivo':'sin espacio útil después del retiro'})
        else:
            utiles.append(m)
    ids = {m['id'] for m in utiles}
    for r in seleccion['cobertura']:
        if r['estado'] == 'ampliacion':
            r['unidades'] = [i for i in r['unidades'] if i in ids]
            if not r['unidades']:
                r['estado'] = 'sin_area_nueva_util'
    seleccion['manzanas'], seleccion['descartadasTrasRetiro'] = utiles, descartadas
    return seleccion


def preparar(datos, heredadas, hitos, caras, epoca, metro):
    refs = referencias(datos, epoca, caras, metro)
    seleccion = seleccionar_ampliacion(refs, heredadas, hitos, metro, epoca, 'extraida', indexar_ocupacion=epoca >= 5)
    seleccion['manzanas'] = retraer(seleccion['manzanas'], 1, metro)
    if epoca >= 5:
        quitar_franjas_sin_espacio(seleccion, metro)
    seleccion['referencias'] = len(refs)
    return seleccion


if __name__ == '__main__':
    from caras import Red
    d = json.load(sys.stdin)
    datos = json.loads(Path(d['entrada']).read_text())
    caras = Red(json.loads(Path('fuentes/derivados/1936/tramos.json').read_text())['tramos']).caras36
    json.dump(preparar(datos, d['heredadas'], d['hitos'], caras, d['epoca'], d['metro']), sys.stdout)
