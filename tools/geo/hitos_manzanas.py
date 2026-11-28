"""Ningún hito va sobre una manzana (specs/13, R13): el chico entra en ella y el grande la retira entera.
Mide cada cruce de hito y manzana por época y decide cuáles manzanas se retiran. Lógica pura, sin efectos."""
import json
import sys
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree

AÑOS = (1772, 1843, 1889, 1911, 1936, 1946)  # épocas 1 a 6


def poligono_de_manzana(m):
    return Polygon(m.get('limite', m['poligono']), m.get('huecos', [])).buffer(0)


def vivo(h, epoca):
    return h.get('nace', 0) <= epoca and (not h.get('muere') or h['muere'] > epoca)


def hitos_de_epoca(hitos, epoca):
    """Un registro por hito en pie: la huella (sus plantas) y el recinto (lo que reserva: su zona de supresión
    junto con la huella). Las etapas de un mismo hito que viven en la época se unen."""
    porId = {}
    for h in hitos:
        if vivo(h, epoca):
            porId.setdefault(h['id'], []).append(h)
    salida = []
    for id, etapas in porId.items():
        huella = unary_union([Polygon(p).buffer(0) for h in etapas for p in h.get('planta', [])])
        recinto = unary_union([huella, *[Polygon(p).buffer(0) for h in etapas for p in h.get('suprime') or []]])
        if not recinto.is_empty:
            salida.append({'id': id, 'huella': huella, 'recinto': recinto,
                           'transitable': any(h.get('transitable') for h in etapas)})
    return salida


ROCE_M2 = 1  # menos que esto en común es el calce, no un cruce
# Los tres umbrales salen de la medición de todos los hitos en las seis épocas (docs/manzanas-hitos.md).
OCUPA_BUENA_PARTE = .5  # los recintos cubren al menos la mitad de la manzana: es de ellos, se retira
CABE = .75              # al menos tres cuartos del recinto caen en la manzana: el hito está dentro de ella
ROCE = .1               # menos de un décimo en común: no se distingue del error de calce (7,6 m en una cuadra de 100 m)


def clase(fila):
    """grande: ocupa buena parte de la manzana, o es mayor que ella y la pisa más que un roce. chico: cabe
    dentro. roce: lo común es marginal para los dos. a caballo: ni cabe ni manda (queda como límite)."""
    en_manzana, del_hito = fila['manzanaBajoRecinto'], fila['recintoEnManzana']
    if en_manzana >= OCUPA_BUENA_PARTE or (fila['areaRecintoM2'] > fila['areaManzanaM2'] and en_manzana >= ROCE):
        return 'grande'
    if del_hito >= CABE:
        return 'chico'
    return 'roce' if en_manzana < ROCE and del_hito < ROCE else 'a caballo'


def _medir(manzanas, hitos, epoca, metro):
    poligonos = [poligono_de_manzana(m) for m in manzanas]
    indice = STRtree(poligonos) if poligonos else None
    m2 = metro*metro
    en_pie = hitos_de_epoca(hitos, epoca)
    filas, por_manzana = [], {}
    for h in en_pie:
        candidatas = sorted(int(i) for i in indice.query(h['recinto'])) if indice is not None else []
        tocadas = [(i, poligonos[i].intersection(h['recinto']).area) for i in candidatas]
        tocadas = [(i, a) for i, a in tocadas if a*m2 >= ROCE_M2]
        for i, comun in tocadas:
            p = poligonos[i]
            bajo_huella = p.intersection(h['huella']).area
            fila = {
                'epoca': epoca, 'año': AÑOS[epoca-1], 'hito': h['id'], 'manzana': manzanas[i]['id'],
                'areaManzanaM2': p.area*m2, 'areaHuellaM2': h['huella'].area*m2, 'areaRecintoM2': h['recinto'].area*m2,
                'manzanaBajoHuella': bajo_huella/p.area, 'manzanaBajoRecinto': comun/p.area,
                'huellaEnManzana': bajo_huella/h['huella'].area if h['huella'].area else 0,
                'recintoEnManzana': comun/h['recinto'].area,
                'manzanasDelHito': len(tocadas),
            }
            fila['clase'] = clase(fila)
            filas.append(fila)
            por_manzana.setdefault(i, []).append((fila, h['recinto']))
    decisiones = []
    for i, m in enumerate(manzanas):
        cruces = por_manzana.get(i, [])
        if not cruces:
            decisiones.append({'id': m['id'], 'retirar': False, 'ocupacion': 0, 'hitos': []})
            continue
        ocupacion = poligonos[i].intersection(unary_union([r for _, r in cruces])).area/poligonos[i].area
        d = {'id': m['id'], 'retirar': False, 'ocupacion': ocupacion,
             'hitos': [{'hito': f['hito'], 'clase': f['clase']} for f, _ in cruces]}
        if ocupacion >= OCUPA_BUENA_PARTE:
            d.update(retirar=True, motivo='ocupa la mayor parte')
        elif any(f['clase'] == 'grande' for f, _ in cruces):
            d.update(retirar=True, motivo='el hito es mayor que la manzana')
        for f, _ in cruces:
            f['ocupacionManzana'] = ocupacion
            f['decision'] = 'retirar' if d['retirar'] else 'conservar'
        decisiones.append(d)
    return filas, decisiones


def solapes(manzanas, hitos, epoca, metro):
    """Una fila por cada manzana que comparte área con el recinto de un hito en pie en la época: las áreas, las
    fracciones en los dos sentidos, la clase del cruce y lo que se decide para la manzana."""
    return _medir(manzanas, hitos, epoca, metro)[0]


def decidir(manzanas, hitos, epoca, metro):
    """Por manzana, en su orden: si se retira en la época y por qué. Se retira entera (casas, árboles y suelo)
    cuando los recintos de los hitos en pie ocupan buena parte de ella, o cuando la pisa, más que rozándola, un
    hito mayor que ella. Si no, se conserva y el hito va dentro (sus reservas dejan el solar sin casas)."""
    return _medir(manzanas, hitos, epoca, metro)[1]


if __name__ == '__main__':
    entrada = json.load(sys.stdin)
    filas, decisiones = _medir(entrada['manzanas'], entrada['hitos'], entrada['epoca'], entrada['metro'])
    json.dump({'filas': filas, 'decisiones': decisiones}, sys.stdout, separators=(',', ':'))
