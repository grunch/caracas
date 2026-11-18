"""Estilos y alturas por época: a cada casa, el estilo de cuando nace y del lugar donde está.

El plano de 1936 dice dónde está cada casa, no cómo era. La vida de cada casa (tools/geo/epocas.py)
dice en qué época aparece; de ahí sale su estilo, con la costumbre de esa época: lo colonial hasta
mediados del XIX, lo republicano, el neoclásico guzmancista de fin de siglo, el eclecticismo del
XX y, en 1936, lo moderno en el centro y, en las afueras, casas de las orillas, quintas y ranchos. Los pisos van según
el estilo. Todo determinista por la semilla de cada casa.

Uso: estilos.py <ciudad-epocas.json> <salida.json> --escala <m/px> --plaza <px,py>
"""
import argparse
import json
import math

# índices que lee el shader (src/shader/fachada.js); 9 = edificio público (tools/geo/vectorizar.py)
ESTILO = {'colonial': 0, 'republicano': 1, 'guzmancista': 2, 'eclectico': 3, 'moderno': 4,
          'quinta': 5, 'rancho': 6, 'orillas': 7, 'publico': 9}

# épocas (specs/02): 0 = 1578 · 1 = 1772 · 2 = 1843 · 3 = 1889 · 4 = 1911 · 5 = 1936
CENTRO_M = 1800        # hasta acá, en 1936, se construye moderno o ecléctico
# en las afueras de 1936: la casa sencilla de las orillas es lo común; la quinta, lo grande; el rancho,
# lo muy chico y lejos (en las quebradas y las lomas de las orillas)
QUINTA_M2 = 300
RANCHO_M2 = 60
RANCHO_DESDE_M = 2500

# por época: [(estilo, probabilidad acumulada)] y pisos (mínimo, máximo) por estilo
POR_EPOCA = {
    2: [('colonial', 0.7), ('republicano', 1.0)],
    3: [('republicano', 0.5), ('guzmancista', 1.0)],
    4: [('guzmancista', 0.35), ('eclectico', 1.0)],
}
PISOS = {'colonial': (1, 1), 'republicano': (1, 2), 'guzmancista': (1, 2), 'eclectico': (2, 3),
         'moderno': (2, 4), 'quinta': (1, 2), 'rancho': (1, 1), 'orillas': (1, 1)}
PROB_UN_PISO = {'republicano': 0.7, 'guzmancista': 0.5, 'quinta': 0.6}


def _azar(semilla, sal):
    """Número en [0, 1) determinista por semilla (y una sal para no repetir el mismo número)."""
    return ((semilla * 2654435761 + sal * 40503) & 0xFFFFFFFF) / 0x100000000


def _estilo(nace, dist_m, area_m2, semilla):
    if nace <= 1:
        return 'colonial'
    if nace in POR_EPOCA:
        x = _azar(semilla, 1)
        return next(nombre for nombre, hasta in POR_EPOCA[nace] if x < hasta)
    if dist_m <= CENTRO_M:
        return 'moderno' if _azar(semilla, 1) < 0.35 else 'eclectico'
    if area_m2 >= QUINTA_M2:
        return 'quinta'
    return 'rancho' if area_m2 < RANCHO_M2 and dist_m > RANCHO_DESDE_M else 'orillas'


def _pisos(nombre, semilla):
    lo, hi = PISOS[nombre]
    if lo == hi:
        return lo
    x = _azar(semilla, 2)
    if nombre in PROB_UN_PISO:
        return lo if x < PROB_UN_PISO[nombre] else hi
    return lo + min(hi - lo, int(x * (hi - lo + 1)))


def estilo_y_pisos(nace, dist_m, area_m2, estilo, semilla):
    """(estilo, pisos) de una casa; los edificios públicos quedan como están (pisos None)."""
    if estilo == ESTILO['publico']:
        return ESTILO['publico'], None
    nombre = _estilo(nace, dist_m, area_m2, semilla)
    return ESTILO[nombre], _pisos(nombre, semilla)


def _centro_y_area(vertices, inicio, cuantos):
    xs = vertices[inicio * 2:(inicio + cuantos) * 2:2]
    ys = vertices[inicio * 2 + 1:(inicio + cuantos) * 2:2]
    area = 0.5 * abs(sum(xs[i] * ys[(i + 1) % cuantos] - xs[(i + 1) % cuantos] * ys[i] for i in range(cuantos)))
    return sum(xs) / cuantos, sum(ys) / cuantos, area


def asignar(ciudad, metro, plaza):
    """Copia de la ciudad con estilo y pisos de cada techo según su época y su lugar."""
    if 'vida' not in ciudad or len(ciudad['vida']) != len(ciudad['techos']):
        raise ValueError('estilos: hace falta "vida" (una por techo), de tools/geo/epocas.py')
    vertices = ciudad['vertices']
    techos = []
    for (inicio, cuantos, pisos, estilo, semilla), (nace, _muere) in zip(ciudad['techos'], ciudad['vida']):
        cx, cy, area_px = _centro_y_area(vertices, inicio, cuantos)
        dist_m = math.hypot(cx - plaza[0], cy - plaza[1]) * metro
        nuevo_estilo, nuevos_pisos = estilo_y_pisos(nace, dist_m, area_px * metro ** 2, estilo, semilla)
        techos.append([inicio, cuantos, pisos if nuevos_pisos is None else nuevos_pisos, nuevo_estilo, semilla])
    return {**ciudad, 'techos': techos}


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('entrada')
    ap.add_argument('salida')
    ap.add_argument('--escala', type=float, required=True, help='metros por píxel')
    ap.add_argument('--plaza', required=True, help='px,py de la Plaza Bolívar')
    a = ap.parse_args()
    with open(a.entrada) as f:
        ciudad = json.load(f)
    plaza = tuple(float(v) for v in a.plaza.split(','))
    salida = asignar(ciudad, a.escala, plaza)
    with open(a.salida, 'w') as f:
        json.dump(salida, f)
    cuenta = {}
    for t in salida['techos']:
        cuenta[t[3]] = cuenta.get(t[3], 0) + 1
    nombres = {v: k for k, v in ESTILO.items()}
    print(', '.join(f'{nombres[k]} {v}' for k, v in sorted(cuenta.items())), '→', a.salida)


if __name__ == '__main__':
    main()
