"""Estilos y alturas por época: qué fachada y cuántos pisos tiene cada casa en cada época.

El plano de 1936 dice dónde está cada casa, no cómo era. La vida de cada casa (tools/geo/epocas.py)
dice desde cuándo existe; acá se le da su **historia**: un estilo y unos pisos por época, desde que
nace. Las reglas salen de las pinturas y fotos de fuentes/imagenes/README.md:

- la ciudad es baja en todas las épocas: un piso con teja, casi todo;
- la misma casa cambia de fachada: de colonial de alero a republicana de pretil, antes en el centro
  y más tarde (o nunca) en los barrios;
- los altos de dos pisos van en las esquinas (1772–1889), cerca de la plaza;
- los edificios de tres y cuatro pisos (eclécticos y modernos) aparecen en 1911–1936 y solo en el
  núcleo comercial: de la Plaza Bolívar al sur, hacia el Teatro Municipal;
- los barrios de 1936 son hileras republicanas de un piso; los ranchos, solo lo muy chico y lejano;
- junto a las estaciones hay galpones de zinc.

Todo determinista por la semilla de cada casa. Cada casa tiene dos números al azar fijos: uno
decide hasta dónde llega su fachada y otro sus pisos; las probabilidades solo suben con las épocas,
así una casa nunca vuelve atrás.

Uso: estilos.py <ciudad-epocas.json> <salida.json> --escala <m/px> --plaza <px,py> [--tabla]
"""
import argparse
import json
import math
from collections import Counter, namedtuple

# índices que lee el shader (src/shader/fachada.js); 9 = edificio público (tools/geo/vectorizar.py)
ESTILO = {'colonial': 0, 'republicano': 1, 'guzmancista': 2, 'eclectico': 3, 'moderno': 4,
          'quinta': 5, 'rancho': 6, 'orillas': 7, 'galpon': 8, 'publico': 9}
NOMBRE = {v: k for k, v in ESTILO.items()}

# épocas (specs/02): 0 = 1578 · 1 = 1772 · 2 = 1843 · 3 = 1889 · 4 = 1911 · 5 = 1936
EPOCAS = 6
AÑOS = (1578, 1772, 1843, 1889, 1911, 1936)

# --- lugares, en metros desde la Plaza Bolívar (x al este, z al sur; el mosaico tiene el norte arriba) ---
# centralidad: 1 hasta CENTRO_M[0] de la plaza, 0 desde CENTRO_M[1] (la iglesia de La Pastora está a 1080 m)
CENTRO_M = (350.0, 1100.0)
# núcleo comercial: el eje que baja de la plaza hacia el Teatro Municipal (Gradillas, Sociedad, San
# Francisco…); pleno hasta NUCLEO_M[0] del eje, se apaga en NUCLEO_M[1]
EJE_NUCLEO = ((0.0, -20.0), (-140.0, 420.0))
NUCLEO_M = (70.0, 240.0)
# estaciones de tren: rectángulo (x0, z0, x1, z1) de sus patios y la época desde la que hay galpones
ESTACIONES = (
    {'nombre': 'Caño Amarillo (F. C. de La Guaira, 1883)', 'zona': (-1045.0, -480.0, -760.0, -60.0), 'desde': 3},
    {'nombre': 'Palo Grande (Gran Ferrocarril de Venezuela, 1894)', 'zona': (-2330.0, 760.0, -1790.0, 1010.0), 'desde': 4},
)
GALPON_LARGO_M = 22.0      # un galpón es largo…
GALPON_PROPORCION = 1.8    # … y bastante más largo que ancho
# afueras de 1911–1936: la quinta es la casa grande y compacta (El Paraíso); el rancho, lo muy chico y lejano
AFUERAS_M = 1800.0
QUINTA_M2 = 200.0
QUINTA_PROPORCION = 2.0
RANCHO_M2 = 45.0
RANCHO_DESDE_M = 2500.0

# --- probabilidades acumuladas por época (índice = época); solo suben: una casa no vuelve atrás ---
#                    1578 1772 1843  1889  1911  1936
# fachada de pretil (republicana) o más nueva
PRETIL = {'centro': (0.0, 0.0, 0.15, 0.55, 0.80, 0.92),
          'barrio': (0.0, 0.0, 0.00, 0.08, 0.35, 0.78)}
# con el adorno neoclásico de Guzmán Blanco o más nueva
GUZMAN = {'centro': (0.0, 0.0, 0.00, 0.25, 0.45, 0.55),
          'barrio': (0.0, 0.0, 0.00, 0.02, 0.06, 0.14)}
# ecléctica o moderna: en el núcleo comercial; fuera de él, pocas
ECLECTICO = {'nucleo': (0.0, 0.0, 0.0, 0.0, 0.35, 0.70),
             'centro': (0.0, 0.0, 0.0, 0.0, 0.08, 0.16),
             'barrio': (0.0, 0.0, 0.0, 0.0, 0.00, 0.05)}
MODERNO = {'nucleo': (0.0, 0.0, 0.0, 0.0, 0.0, 0.22),
           'centro': (0.0, 0.0, 0.0, 0.0, 0.0, 0.03),
           'barrio': (0.0, 0.0, 0.0, 0.0, 0.0, 0.00)}
# dos pisos o más: las esquinas (el alto con balcón), las de media cuadra y el núcleo comercial
DOS_PISOS = {'esquina': (0.0, 0.35, 0.50, 0.60, 0.65, 0.70),   # × centralidad
             'esquina_barrio': (0.0, 0.0, 0.0, 0.03, 0.05, 0.08),
             'media_cuadra': (0.0, 0.0, 0.02, 0.04, 0.07, 0.10),  # × centralidad
             'media_cuadra_barrio': (0.0, 0.0, 0.0, 0.0, 0.01, 0.03),
             'nucleo': (0.0, 0.0, 0.0, 0.0, 0.30, 0.50)}
TRES_PISOS = (0.0, 0.0, 0.0, 0.0, 0.04, 0.14)     # × núcleo
CUATRO_PISOS = (0.0, 0.0, 0.0, 0.0, 0.0, 0.05)    # × núcleo
ORILLAS = 0.75            # de las casas sin pretil nacidas desde 1843 en los barrios: bajas, de las orillas
QUINTA_UN_PISO = 0.6

# orden de las fachadas, para saber qué es "más nueva"
NIVEL = {'orillas': 0, 'colonial': 0, 'republicano': 1, 'guzmancista': 2, 'eclectico': 3, 'moderno': 4}

Casa = namedtuple('Casa', 'nace x_m z_m area_m2 semilla esquina largo_m ancho_m',
                  defaults=(False, 0.0, 0.0))


def _azar(semilla, sal):
    """Número en [0, 1) determinista por semilla y sal. Se mezclan con un hash de 32 bits (el
    finalizador de murmur3): con una suma lineal, sales distintas daban números casi iguales y el
    estilo de una casa decidía también sus pisos."""
    x = (semilla * 0x9E3779B1 + sal * 0x85EBCA77) & 0xFFFFFFFF
    x ^= x >> 16
    x = (x * 0x7FEB352D) & 0xFFFFFFFF
    x ^= x >> 15
    x = (x * 0x846CA68B) & 0xFFFFFFFF
    x ^= x >> 16
    return x / 0x100000000


def _rampa(valor, lleno, vacio):
    """1 hasta `lleno`, 0 desde `vacio`, lineal en el medio."""
    return min(1.0, max(0.0, (vacio - valor) / (vacio - lleno)))


def centralidad(x_m, z_m):
    """1 en el centro (hasta CENTRO_M[0] de la plaza), 0 en los barrios (desde CENTRO_M[1])."""
    return _rampa(math.hypot(x_m, z_m), *CENTRO_M)


def nucleo(x_m, z_m):
    """1 sobre el eje comercial (de la plaza al Teatro Municipal), 0 a más de NUCLEO_M[1] de él."""
    (ax, az), (bx, bz) = EJE_NUCLEO
    dx, dz = bx - ax, bz - az
    t = min(1.0, max(0.0, ((x_m - ax) * dx + (z_m - az) * dz) / (dx * dx + dz * dz)))
    return _rampa(math.hypot(x_m - ax - t * dx, z_m - az - t * dz), *NUCLEO_M)


def galpon_desde(casa):
    """Época desde la que la casa es un galpón de estación (None si no lo es): huella larga, en el patio."""
    if casa.largo_m < GALPON_LARGO_M or casa.largo_m < GALPON_PROPORCION * max(casa.ancho_m, 1e-6):
        return None
    for estacion in ESTACIONES:
        x0, z0, x1, z1 = estacion['zona']
        if x0 <= casa.x_m <= x1 and z0 <= casa.z_m <= z1:
            return estacion['desde']
    return None


def _de_las_afueras(casa):
    """'quinta', 'rancho' o None: lo que solo hay lejos del centro, en lo que se construye desde 1911."""
    dist = math.hypot(casa.x_m, casa.z_m)
    compacta = casa.largo_m <= QUINTA_PROPORCION * max(casa.ancho_m, 1e-6)
    if casa.nace >= 4 and dist > AFUERAS_M and casa.area_m2 >= QUINTA_M2 and compacta:
        return 'quinta'
    if casa.nace == 5 and dist > RANCHO_DESDE_M and casa.area_m2 < RANCHO_M2:
        return 'rancho'
    return None


def _mezcla(tabla, e, c, n=0.0):
    """Probabilidad en la época e: entre barrio y centro por la centralidad c, y hacia el núcleo por n."""
    p = tabla['barrio'][e] + (tabla['centro'][e] - tabla['barrio'][e]) * c
    return p + (tabla['nucleo'][e] - p) * n if 'nucleo' in tabla else p


def _pisos(e, casa, c, n):
    x = _azar(casa.semilla, 2)
    lado = 'esquina' if casa.esquina else 'media_cuadra'
    dos = DOS_PISOS[lado + '_barrio'][e] + (DOS_PISOS[lado][e] - DOS_PISOS[lado + '_barrio'][e]) * c
    dos += (DOS_PISOS['nucleo'][e] - dos) * n if DOS_PISOS['nucleo'][e] > dos else 0.0
    return 1 + (x < dos) + (x < TRES_PISOS[e] * n) + (x < CUATRO_PISOS[e] * n)


def _fachada(e, casa, c, n, pisos):
    x = _azar(casa.semilla, 1)
    if x < _mezcla(MODERNO, e, c, n):
        return 'moderno'
    if x < _mezcla(ECLECTICO, e, c, n) or pisos >= 3:   # lo de tres pisos o más es de este siglo
        return 'eclectico'
    if x < _mezcla(GUZMAN, e, c):
        return 'guzmancista'
    if x < _mezcla(PRETIL, e, c):
        return 'republicano'
    de_orillas = casa.nace >= 2 and pisos == 1 and _azar(casa.semilla, 3) < ORILLAS * (1.0 - c)
    return 'orillas' if de_orillas else 'colonial'


def en_epoca(e, casa):
    """(nombre del estilo, pisos) de la casa en la época e (se supone e ≥ casa.nace)."""
    if e <= 0:
        return 'colonial', 1
    desde = galpon_desde(casa)
    if desde is not None and e >= desde:
        return 'galpon', 1
    afuera = _de_las_afueras(casa)
    if afuera == 'quinta':
        return 'quinta', 1 if _azar(casa.semilla, 4) < QUINTA_UN_PISO else 2
    if afuera == 'rancho':
        return 'rancho', 1
    c, n = centralidad(casa.x_m, casa.z_m), nucleo(casa.x_m, casa.z_m)
    pisos = _pisos(e, casa, c, n)
    return ('colonial' if e == 1 else _fachada(e, casa, c, n, pisos)), pisos


def historia(casa):
    """[(estilo, pisos)] × 6 épocas; antes de nacer, lo de la época en que nace."""
    return [(ESTILO[nombre], pisos) for nombre, pisos in (en_epoca(max(e, casa.nace), casa) for e in range(EPOCAS))]


def empacar(estilo, pisos):
    """Un byte por época, como en ciudad.pak (specs/02): estilo + 16·pisos."""
    return estilo + 16 * pisos


# --- la ciudad entera ------------------------------------------------------------------------------

def _medidas(vertices, inicio, cuantos):
    """(centro x, centro y, área, largo, ancho) de un techo, en píxeles: largo y ancho son los de su
    rectángulo sobre el eje principal de sus vértices."""
    xs = vertices[inicio * 2:(inicio + cuantos) * 2:2]
    ys = vertices[inicio * 2 + 1:(inicio + cuantos) * 2:2]
    area = 0.5 * abs(sum(xs[i] * ys[(i + 1) % cuantos] - xs[(i + 1) % cuantos] * ys[i] for i in range(cuantos)))
    cx, cy = sum(xs) / cuantos, sum(ys) / cuantos
    sxx = sum((x - cx) ** 2 for x in xs)
    syy = sum((y - cy) ** 2 for y in ys)
    sxy = sum((x - cx) * (y - cy) for x, y in zip(xs, ys))
    giro = 0.5 * math.atan2(2 * sxy, sxx - syy)
    ux, uy = math.cos(giro), math.sin(giro)
    a = [(x - cx) * ux + (y - cy) * uy for x, y in zip(xs, ys)]
    b = [-(x - cx) * uy + (y - cy) * ux for x, y in zip(xs, ys)]
    lados = sorted((max(a) - min(a), max(b) - min(b)))
    return cx, cy, area, lados[1], lados[0]


def asignar(ciudad, metro, plaza):
    """Copia de la ciudad con "historia" (un byte estilo + 16·pisos por época y por techo) y, en
    "techos", el estilo y los pisos de la última época en que cada casa está en pie. Los galpones de
    una estación nacen con ella ("vida"), aunque el plano de esa época no dibuje su patio."""
    if 'vida' not in ciudad or len(ciudad['vida']) != len(ciudad['techos']):
        raise ValueError('estilos: hace falta "vida" (una por techo), de tools/geo/epocas.py')
    esquinas = ciudad.get('esquinas') or [0] * len(ciudad['techos'])
    if len(esquinas) != len(ciudad['techos']):
        raise ValueError('estilos: "esquinas" tiene que traer una por techo (tools/geo/vectorizar.py)')
    vertices = ciudad['vertices']
    techos, historias, vida = [], [], []
    for (inicio, cuantos, pisos, estilo, semilla), (nace, muere), esquina in zip(ciudad['techos'], ciudad['vida'], esquinas):
        if estilo == ESTILO['publico']:   # los edificios públicos quedan como los dejó el vectorizador
            techos.append([inicio, cuantos, pisos, estilo, semilla])
            historias.append([empacar(estilo, pisos)] * EPOCAS)
            vida.append([nace, muere])
            continue
        cx, cy, area_px, largo_px, ancho_px = _medidas(vertices, inicio, cuantos)
        casa = Casa(nace, (cx - plaza[0]) * metro, (cy - plaza[1]) * metro, area_px * metro ** 2, semilla,
                    bool(esquina), largo_px * metro, ancho_px * metro)
        desde = galpon_desde(casa)
        if desde is not None and desde < nace:
            casa = casa._replace(nace=desde)
        h = historia(casa)
        vida.append([casa.nace, muere])
        ultimo_estilo, ultimos_pisos = h[muere - 1 if muere else EPOCAS - 1]
        techos.append([inicio, cuantos, ultimos_pisos, ultimo_estilo, semilla])
        historias.append([empacar(e, p) for e, p in h])
    return {**ciudad, 'techos': techos, 'historia': historias, 'vida': vida}


def histograma(ciudad):
    """Por época, cuántas casas en pie hay de cada (estilo, pisos): [Counter, …] × 6."""
    cuentas = [Counter() for _ in range(EPOCAS)]
    for h, (nace, muere) in zip(ciudad['historia'], ciudad['vida']):  # la vida que devuelve asignar()
        for e in range(nace, muere or EPOCAS):
            cuentas[e][(h[e] % 16, h[e] // 16)] += 1
    return cuentas


def tabla_md(cuentas):
    """El histograma como tabla Markdown: una fila por estilo, una columna por época, "n (pisos…)"."""
    filas = ['| Estilo | ' + ' | '.join(str(a) for a in AÑOS) + ' |', '|---|' + '---|' * EPOCAS]

    def celda(c, estilo):
        por_pisos = sorted((p, n) for (e, p), n in c.items() if e == estilo)
        total = sum(n for _, n in por_pisos)
        if not total:
            return '—'
        if len(por_pisos) == 1 and por_pisos[0][0] == 1:
            return str(total)
        return f'{total} (' + ' · '.join(f'{p}p: {n}' for p, n in por_pisos) + ')'

    for estilo in sorted(NOMBRE):
        if any(e == estilo for c in cuentas for e, _ in c):
            filas.append(f'| {NOMBRE[estilo]} ({estilo}) | ' + ' | '.join(celda(c, estilo) for c in cuentas) + ' |')
    filas.append('| **casas en pie** | ' + ' | '.join(str(sum(c.values())) for c in cuentas) + ' |')
    filas.append('| de un piso | ' + ' | '.join(
        f'{100 * sum(n for (_, p), n in c.items() if p == 1) / max(1, sum(c.values())):.0f} %' for c in cuentas) + ' |')
    filas.append('| de 3 o 4 pisos | ' + ' | '.join(
        str(sum(n for (e, p), n in c.items() if p >= 3 and e != ESTILO['publico'])) for c in cuentas) + ' |')
    return '\n'.join(filas)


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('entrada')
    ap.add_argument('salida')
    ap.add_argument('--escala', type=float, required=True, help='metros por píxel')
    ap.add_argument('--plaza', required=True, help='px,py de la Plaza Bolívar')
    ap.add_argument('--tabla', action='store_true', help='imprime el histograma por época en Markdown')
    a = ap.parse_args()
    with open(a.entrada) as f:
        ciudad = json.load(f)
    plaza = tuple(float(v) for v in a.plaza.split(','))
    salida = asignar(ciudad, a.escala, plaza)
    with open(a.salida, 'w') as f:
        json.dump(salida, f)
    cuentas = histograma(salida)
    if a.tabla:
        print(tabla_md(cuentas))
    for año, c in zip(AÑOS, cuentas):
        por_estilo = Counter()
        for (estilo, _), n in c.items():
            por_estilo[estilo] += n
        print(f'{año}:', ', '.join(f'{NOMBRE[k]} {v}' for k, v in sorted(por_estilo.items())))
    print('→', a.salida)


if __name__ == '__main__':
    main()
