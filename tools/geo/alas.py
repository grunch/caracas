"""Casas de patio: las alas de cada casa, a partir de su lote.

En un pueblo colonial visto desde arriba (fuentes/imagenes/0000-usuario-aerea-pueblo-colonial y su
nota en fuentes/imagenes/README.md) una manzana es un anillo de casas: una crujía corrida sobre cada
calle, con la cumbrera paralela a ella, y detrás de cada frente un peine de alas angostas alrededor de
uno, dos o tres patios, con el solar al fondo. El plano de 1936 pinta macizas casi todas las manzanas
del centro: los patios hay que abrirlos por regla.

Todo se arma en el **marco del lote**: origen en la esquina izquierda del frente, `eu` a lo largo de
la calle y `ev` hacia el fondo (ev = eu girado 90°, como en src/ciudad.js). `repartir` corta el lote
(ancho × fondo, en metros) en bandas hacia el fondo: la crujía del frente, y después patios (con una o
dos alas laterales que los unen) y alas cruzadas, hasta el solar. Los patios que el plano sí dibuja
como huecos de la casa se conservan donde están. El resultado cubre el lote entero sin encimarse: el
visor (src/alas.js) techa cada ala y recorta todo con la huella de la casa, así nada sale de lo
edificado.

Determinista: el azar sale de la semilla de la casa.
"""
import math

import cv2
import numpy as np
from scipy import ndimage

# tipos de ala (los lee src/alas.js)
PATIO, SOLAR, FRENTE, CRUZADA, LATERAL_IZQ, LATERAL_DER, ESQUINA_IZQ, ESQUINA_DER, FONDO = range(9)
# qué otros lados del lote dan a una calle, además del frente (bits de "calles")
CALLE_DER, CALLE_FONDO, CALLE_IZQ = 1, 2, 4

CRUJIA_M = (7.0, 8.5)        # fondo de la crujía del frente
PATIO_M = (4.0, 6.0)         # fondo de un patio
ALA_CRUZADA_M = (5.5, 7.0)   # fondo de un ala cruzada
ALA_MINIMA_M = 3.5
ALA_MAXIMA_M = 9.0           # un ala que se queda con el resto del lote no pasa de esto (salvo que no haya más remedio)
ALA_LATERAL_M = (3.8, 5.0)   # ancho de un ala lateral
PATIO_ANCHO_MINIMO_M = 3.0
ANCHO_MINIMO_M = 7.5         # un lote más angosto no tiene patio
ANCHO_DOS_LATERALES_M = 14.0
DOS_LATERALES = 0.6          # de los lotes anchos, cuántos llevan alas a los dos lados del patio
SOLAR_MINIMO_M = 4.0
FONDO_MEDIA_AGUA_M = 4.2     # el ala del fondo, si es más angosta que esto, va a media agua contra la medianera
HUECO_MINIMO_M2 = 9.0        # un hueco del plano más chico que esto no es un patio
HUECO_DESDE_M = 4.5          # un hueco pegado a la calle no se toma: ahí va la crujía
LLENO_MINIMO = 0.8           # la casa tiene que llenar esto de su rectángulo para repartirla en alas
FRENTE_EDIFICADO = 0.6       # … y la crujía del frente tiene que caer casi toda sobre lo edificado
SALIENTE = 0.5               # una franja del borde edificada en menos de esto es un saliente: no es del rectángulo
FRENTE_DE_MANZANA_M = 10.0    # un lado de la manzana más corto que esto no da una línea de fachada
FRENTE_CERCA_M = 4.0          # hasta dónde se busca la línea de fachada de una casa (y los píxeles de un lado)
FRENTE_TORCIDO = 0.26         # seno del ángulo máximo entre el frente de la casa y la línea de su cuadra (15°)
LADO_LIBRE = 0.5             # desde qué parte despejada un lado da a la calle
SONDAS_M = (2.0, 4.0)        # a qué distancia de cada lado se mira si hay calle (las calles miden 5 m o más)
# hasta qué distancia de la plaza, cuántos patios como mucho y cuántas casas llevan uno más; más lejos, lo último
PATIOS_POR_DISTANCIA = ((700.0, 3, 0.6), (1500.0, 2, 0.5), (math.inf, 1, 0.3))

_PATIO_Y_ALA = PATIO_M[0] + ALA_MINIMA_M   # lo mínimo que hace falta detrás de un ala para abrir otro patio


def patios_segun_distancia(distancia_m, azar=1.0):
    """Cuántos patios, como mucho, tiene una casa a esa distancia de la plaza: tres o cuatro en el centro,
    uno o dos en las orillas. `azar` (0..1, de la casa) decide si lleva el patio de más."""
    for hasta, cuantos, uno_mas in PATIOS_POR_DISTANCIA:
        if distancia_m < hasta:
            return cuantos + (azar < uno_mas)
    return 1


def _huecos_utiles(huecos, interior, fondo):
    """Los patios del plano, recortados al interior del lote, ordenados hacia el fondo y unidos si se
    solapan a lo largo de v: [(u0, v0, u1, v1)]."""
    utiles = []
    for u0, v0, u1, v1 in sorted(huecos, key=lambda h: h[1]):
        u0, u1 = max(u0, interior[0]), min(u1, interior[1])
        v1 = min(v1, fondo)
        if v0 < HUECO_DESDE_M or u1 - u0 < 1 or v1 - v0 < 1:
            continue
        if utiles and v0 < utiles[-1][3] + ALA_MINIMA_M:   # sin lugar para un ala entre los dos: un solo patio
            a = utiles.pop()
            u0, v0, u1, v1 = min(a[0], u0), a[1], max(a[2], u1), max(a[3], v1)
        utiles.append((u0, v0, u1, v1))
    return utiles


class _Reparto:
    """El reparto de un lote: lleva la cuenta de las bandas y de los patios abiertos."""

    def __init__(self, ancho, fondo, rng, patios_max, calles, crujia=None):
        self.rng, self.patios_max, self.patios = rng, patios_max, 0
        self.alas = []
        self.fondo = fondo
        propia = float(rng.uniform(*CRUJIA_M))
        self.crujia = propia if crujia is None else float(crujia)
        izq, der = bool(calles & CALLE_IZQ), bool(calles & CALLE_DER)
        self.interior = (self.crujia if izq else 0.0, ancho - self.crujia if der else ancho)
        self.esquinas = (izq, der)
        ancho_interior = self.interior[1] - self.interior[0]
        self.lateral = float(rng.uniform(*ALA_LATERAL_M))
        dos = ancho_interior >= ANCHO_DOS_LATERALES_M and rng.random() < DOS_LATERALES
        a_la_izquierda = rng.random() < 0.5
        # contra la calle de una esquina no va un ala lateral: ahí está el ala de esa calle
        self.lados = (not izq and (dos or a_la_izquierda or der), not der and (dos or not a_la_izquierda or izq))
        if izq and der:
            self.lados = (False, False)

    def ala(self, tipo, u0, v0, u1, v1):
        if u1 - u0 > 1e-6 and v1 - v0 > 1e-6:
            self.alas.append([tipo, u0, v0, u1, v1])

    def cruzada(self, v0, v1):
        self.ala(CRUZADA, self.interior[0], v0, self.interior[1], v1)

    def banda_de_patio(self, v0, v1, hueco=None):
        """Un patio entre v0 y v1 con sus alas laterales; con `hueco` (u0, u1), el patio es el del plano."""
        i0, i1 = self.interior
        if hueco is None:
            izq, der = self.lados
            a = self.lateral
            cabe = (i1 - i0) - a * (int(izq) + int(der))
            if cabe < PATIO_ANCHO_MINIMO_M and izq and der:
                der, cabe = False, cabe + a
            if cabe < PATIO_ANCHO_MINIMO_M:
                izq = der = False
            p0, p1 = i0 + (a if izq else 0.0), i1 - (a if der else 0.0)
        else:
            p0, p1 = (hueco[0] if hueco[0] - i0 >= 0.5 else i0), (hueco[1] if i1 - hueco[1] >= 0.5 else i1)
        self.ala(LATERAL_IZQ, i0, v0, p0, v1)
        self.ala(PATIO, p0, v0, p1, v1)
        self.ala(LATERAL_DER, p1, v0, i1, v1)
        self.patios += 1

    def fondo_de_ala(self, resto, cierra):
        """Cuánto mide el ala que sigue, con `resto` metros por delante. Si `cierra`, el tramo termina en un ala."""
        ancho = float(self.rng.uniform(*ALA_CRUZADA_M))
        if cierra:
            return resto if resto < ALA_MINIMA_M + _PATIO_Y_ALA else min(ancho, resto - _PATIO_Y_ALA)
        if resto <= ALA_MAXIMA_M:
            return resto if resto - ancho < SOLAR_MINIMO_M else ancho
        return min(ancho, resto - SOLAR_MINIMO_M)

    def fondo_de_patio(self, resto, cierra):
        """Cuánto mide el patio que sigue: deja lugar para el ala que lo cierra y no deja un resto sin salida."""
        p = min(float(self.rng.uniform(*PATIO_M)), resto - ALA_MINIMA_M)
        if cierra and ALA_MAXIMA_M < resto - p < ALA_MINIMA_M + _PATIO_Y_ALA:
            menos = resto - ALA_MAXIMA_M
            p = menos if PATIO_M[0] <= menos <= PATIO_M[1] else resto - (ALA_MINIMA_M + _PATIO_Y_ALA)
        return p

    def tramo(self, desde, hasta, cierra, tras_patio):
        """Reparte lo macizo entre `desde` y `hasta`. `cierra`: termina en un ala (después viene un patio
        del plano o una calle); si no, puede terminar en el solar. `tras_patio`: arranca con un ala.
        En un tramo que cierra, `patios_max` no rige: no hay solar donde terminar, y cerrar todo el resto
        con un ala la haría mucho más honda que ALA_MAXIMA_M; se siguen alternando patios y alas."""
        v = desde
        if tras_patio and hasta - v > 1e-6:
            w = self.fondo_de_ala(hasta - v, cierra)
            self.cruzada(v, v + w)
            v += w
        while hasta - v > 1e-6:
            resto = hasta - v
            quedan = cierra or self.patios < self.patios_max
            if quedan and resto >= _PATIO_Y_ALA:
                p = self.fondo_de_patio(resto, cierra)
                self.banda_de_patio(v, v + p)
                w = self.fondo_de_ala(resto - p, cierra)
                self.cruzada(v + p, v + p + w)
                v += p + w
            elif cierra or resto < SOLAR_MINIMO_M:
                self.cruzada(v, hasta)
                v = hasta
            else:
                self.ala(SOLAR, self.interior[0], v, self.interior[1], hasta)
                v = hasta


def _redondear(alas):
    return [[tipo, *(round(float(x), 2) for x in medidas)] for tipo, *medidas in alas]


def repartir(ancho, fondo, semilla, patios_max, calles=0, huecos=(), crujia=None):
    """Las alas de un lote de `ancho` × `fondo` metros: [[tipo, u0, v0, u1, v1], …] en el marco del lote.

    `calles`: qué otros lados dan a una calle (CALLE_IZQ, CALLE_DER, CALLE_FONDO). `huecos`: los patios
    que dibuja el plano, [(u0, v0, u1, v1)]. `crujia`: el fondo de la crujía del frente si lo fija la
    manzana (así la cumbrera corre seguida de casa en casa); si no, sale de la semilla. Lista vacía: la casa es chica (o angosta) y queda simple.
    """
    r = _Reparto(ancho, fondo, np.random.default_rng(int(semilla)), patios_max, calles, crujia)
    c, (i0, i1) = r.crujia, r.interior
    if ancho < ANCHO_MINIMO_M or i1 - i0 < PATIO_ANCHO_MINIMO_M + 0.5:
        return []
    utiles = _huecos_utiles(huecos, r.interior, fondo)
    if utiles and utiles[0][1] < c + ALA_MINIMA_M:   # el primer patio del plano, casi pegado a la crujía: llega hasta él
        c = r.crujia = utiles[0][1]
        r.interior = (i0, i1) = (c if r.esquinas[0] else 0.0, ancho - c if r.esquinas[1] else ancho)
    if fondo - c < _PATIO_Y_ALA and not utiles:
        return []
    r.ala(FRENTE, 0.0, 0.0, ancho, c)
    if r.esquinas[0]:
        r.ala(ESQUINA_IZQ, 0.0, c, c, fondo)
    if r.esquinas[1]:
        r.ala(ESQUINA_DER, ancho - c, c, ancho, fondo)
    a_la_calle = bool(calles & CALLE_FONDO)
    v, tras_patio = c, False
    for u0, v0, u1, v1 in utiles:
        r.tramo(v, v0, cierra=True, tras_patio=tras_patio)
        if 0 < fondo - v1 < ALA_MINIMA_M - 1:   # detrás no cabe un ala: el patio llega al fondo
            v1 = fondo
        r.banda_de_patio(v0, v1, hueco=(u0, u1))
        v, tras_patio = v1, True
    r.tramo(v, fondo, cierra=a_la_calle, tras_patio=tras_patio)
    ultima = max((a for a in r.alas if a[0] == CRUZADA), key=lambda a: a[4], default=None)
    if ultima and not a_la_calle and abs(ultima[4] - fondo) < 1e-6 and ultima[4] - ultima[2] <= FONDO_MEDIA_AGUA_M:
        ultima[0] = FONDO
    return _redondear(r.alas)


# --- el marco del lote, a partir de la casa dibujada en el plano ---

def _libres(lados, manzana, a_px, metro):
    """Qué parte de lo que hay justo afuera de cada lado no es de la manzana (0..1)."""
    alto, ancho = manzana.shape
    libres = []
    for (p, q), normal in lados:
        cuenta, total = 0, 0
        for t in np.linspace(0.1, 0.9, 9):
            for d in SONDAS_M:
                x, y = a_px(p[0] + (q[0] - p[0]) * t + normal[0] * d / metro, p[1] + (q[1] - p[1]) * t + normal[1] * d / metro)
                i, j = int(math.floor(x)), int(math.floor(y))
                total += 1
                cuenta += not (0 <= i < ancho and 0 <= j < alto and manzana[j, i])
        libres.append(cuenta / total)
    return libres


def _huecos_de(grilla, metro):
    """Los patios encerrados en la casa: huecos de la grilla (en el marco del lote) que no tocan su borde."""
    vacio = np.pad(~grilla, 1, constant_values=True)
    etiquetas, _ = ndimage.label(vacio)
    huecos = []
    for k, zona in enumerate(ndimage.find_objects(etiquetas), start=1):
        if k == etiquetas[0, 0] or zona is None:
            continue
        if (etiquetas[zona] == k).sum() * metro ** 2 < HUECO_MINIMO_M2:
            continue
        (v0, v1), (u0, u1) = (((z.start - 1) * metro, (z.stop - 1) * metro) for z in zona)
        huecos.append([u0, v0, u1, v1])
    return huecos


def frentes_de_manzana(manzana, exterior, metro):
    """Las líneas de fachada de la manzana: por cada lado largo de su borde simplificado (`exterior`,
    (n, 2) en píxeles), la recta ajustada a los píxeles del borde que le tocan. → [(x, y, dx, dy)]: un
    punto de la recta y su dirección unitaria. Con ellas todas las casas de una cuadra comparten la
    línea de su frente, y la cumbrera y el alero corren seguidos a lo largo de la calle."""
    contornos, _ = cv2.findContours(np.asarray(manzana).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contornos or len(exterior) < 3:
        return []
    borde = max(contornos, key=len)[:, 0, :].astype(float) + 0.5
    frentes = []
    for a, b in zip(exterior, np.roll(exterior, -1, axis=0)):
        largo = float(np.hypot(*(b - a)))
        if largo * metro < FRENTE_DE_MANZANA_M:
            continue
        d = (b - a) / largo
        a_lo_largo = (borde - a) @ d
        lejos = np.abs((borde - a) @ np.array([-d[1], d[0]]))
        suyos = borde[(a_lo_largo > 0.1 * largo) & (a_lo_largo < 0.9 * largo) & (lejos < FRENTE_CERCA_M / metro)]
        if len(suyos) < 8:
            continue
        dx, dy, x, y = (float(t) for t in cv2.fitLine(suyos.astype(np.float32), cv2.DIST_L2, 0, 0.01, 0.01).ravel())
        frentes.append((x, y, dx, dy))
    return frentes


def _frente_de_la_cuadra(frentes, medio, ev, metro):
    """La línea de fachada que le toca a un frente (su punto medio y su normal hacia adentro), o None."""
    mejor, distancia = None, FRENTE_CERCA_M / metro
    for x, y, dx, dy in frentes:
        if abs(dx * ev[0] + dy * ev[1]) > FRENTE_TORCIDO:
            continue
        d = abs((medio[0] - x) * -dy + (medio[1] - y) * dx)
        if d < distancia:
            mejor, distancia = (x, y, dx, dy), d
    return mejor


def _grilla(casa, origen, eu, ev, nu, nv):
    """Lo edificado en un marco (origen, eu, ev), una celda por píxel: (nv, nu) bool."""
    gu, gv = np.meshgrid(np.arange(nu) + 0.5, np.arange(nv) + 0.5)
    gx = np.floor(origen[0] + gu * eu[0] + gv * ev[0]).astype(int)
    gy = np.floor(origen[1] + gu * eu[1] + gv * ev[1]).astype(int)
    dentro = (gx >= 0) & (gx < casa.shape[1]) & (gy >= 0) & (gy < casa.shape[0])
    grilla = np.zeros((nv, nu), bool)
    grilla[dentro] = casa[gy[dentro], gx[dentro]]
    return grilla


def _sin_salientes(grilla, banda, con_frente=True):
    """El rectángulo de la casa sin sus salientes: se le quitan las franjas del borde (de `banda` celdas)
    edificadas en menos de la mitad. → (i0, i1, j0, j1) en celdas. Sin `con_frente`, la primera fila
    (la línea de fachada) no se toca."""
    j0, j1, i0, i1 = 0, grilla.shape[0], 0, grilla.shape[1]
    while j1 - j0 > 2 * banda and i1 - i0 > 2 * banda:
        dentro = grilla[j0:j1, i0:i1]
        bordes = [dentro[:banda].mean() if con_frente else 1.0, dentro[-banda:].mean(), dentro[:, :banda].mean(), dentro[:, -banda:].mean()]
        peor = int(np.argmin(bordes))
        if bordes[peor] >= SALIENTE:
            break
        j0, j1, i0, i1 = j0 + banda * (peor == 0), j1 - banda * (peor == 1), i0 + banda * (peor == 2), i1 - banda * (peor == 3)
    return i0, i1, j0, j1


def _calle_del_lado(p, q, normal, calles72, metro, giro_maximo=None):
    """La dirección unitaria del eje de 1772 al que da el lado p→q (px), o None: un eje medible de `calles72` (los
    tramos de 1772-calles-1936.json, en las mismas coordenadas) que corre con el lado dentro de `giro_maximo` grados
    (por omisión GIRO_MAXIMO_GRADOS), pasa frente a su punto medio y queda hacia afuera a no más de ALCANCE_M: lo
    mismo que mide la puerta de la fase 5."""
    from fachadas import ALCANCE_M, GIRO_MAXIMO_GRADOS
    medio = (np.asarray(p, float) + np.asarray(q, float)) / 2
    lado = np.asarray(q, float) - np.asarray(p, float)
    lado /= max(float(np.hypot(*lado)), 1e-9)
    paralelo = math.cos(math.radians(GIRO_MAXIMO_GRADOS if giro_maximo is None else giro_maximo))
    for eje in calles72:
        if not eje.get('medible', True):
            continue
        for a, b in zip(eje['puntos'], eje['puntos'][1:]):
            a, b = np.asarray(a, float), np.asarray(b, float)
            largo = float(np.hypot(*(b - a)))
            if largo == 0:
                continue
            d = (b - a) / largo
            t = float((medio - a) @ d)
            hacia = float((a + d * t - medio) @ np.asarray(normal, float))
            if abs(float(d @ lado)) >= paralelo and 0 <= t <= largo and 0 < hacia <= ALCANCE_M / metro:
                return d if float(d @ lado) >= 0 else -d
    return None


def _da_a_una_calle(p, q, normal, calles72, metro):
    """¿El lado p→q (px) da a una calle de 1772? (_calle_del_lado)"""
    return _calle_del_lado(p, q, normal, calles72, metro) is not None


GIRO_DE_LOTE_OBLICUO = 60.0   # un lado a más que el giro de fachada (20°) y hasta esto de su calle: lote oblicuo
LIBRE_DE_LADO = 0.8           # parte de las sondas que caen fuera de la manzana para que un costado sea libre


def _lado_libre(p, q, afuera, manzana, metro):
    """¿Lo que hay justo afuera del lado p→q (px) está fuera de la manzana? Cinco puntos a lo largo (hasta cerca de
    las puntas, donde toca el lote de la otra calle en la esquina), a 2 y
    4 m hacia afuera; libre si al menos LIBRE_DE_LADO de ellos caen fuera de la máscara: un contacto solo en la punta
    no lo cierra (el visor no pone alero sobre una casa de su época, T33j.6h), uno más largo sí."""
    p, q, afuera = (np.asarray(x, float) for x in (p, q, afuera))
    fuera = total = 0
    for t in (0.05, 0.2, 0.5, 0.8, 0.95):
        for d in (2.0, 4.0):
            x, y = p + (q - p) * t + afuera * d / metro
            i, j = int(math.floor(y)), int(math.floor(x))
            total += 1
            fuera += not (0 <= i < manzana.shape[0] and 0 <= j < manzana.shape[1] and manzana[i, j])
    return fuera >= LIBRE_DE_LADO * total


def orientar_a_una_calle(origen, eu, ancho_m, fondo_m, calles72, metro, manzana=None):
    """(origen, eu, ancho, fondo) del marco de un lote (origen en px, ancho y fondo en m) con el frente sobre una
    calle de 1772 (T33j.6g): si su frente no da a una (_da_a_una_calle) y otro de sus lados sí, el frente pasa a ese
    lado (ev entra desde él; eu = ev girado −90°, como en marco_de_casa). Si el frente ya da a una calle de 1772, o
    ningún lado da, el marco queda como estaba. Con `manzana` (la máscara de la cuadra, en las mismas coordenadas), el
    lado nuevo tiene que estar libre (_lado_libre): un costado pegado a otra casa es medianera, no calle. La huella no
    cambia: solo el marco con que se techa."""
    if not calles72:
        return origen, eu, ancho_m, fondo_m
    o, u = np.asarray(origen, float), np.asarray(eu, float)
    v = np.array([-u[1], u[0]])
    a, f = ancho_m / metro, fondo_m / metro
    esquinas = [o, o + u * a, o + u * a + v * f, o + v * f]
    # los lados en orden: frente (v = 0), derecha, fondo, izquierda, con su normal hacia afuera
    lados = [(esquinas[0], esquinas[1], -v), (esquinas[1], esquinas[2], u), (esquinas[2], esquinas[3], v),
             (esquinas[3], esquinas[0], -u)]
    if _da_a_una_calle(*lados[0], calles72, metro):
        return origen, eu, ancho_m, fondo_m
    def marco_con(eu2):
        ev2 = np.array([-eu2[1], eu2[0]])
        en_u, en_v = [float(e @ eu2) for e in esquinas], [float(e @ ev2) for e in esquinas]
        nuevo = min(en_u) * eu2 + min(en_v) * ev2
        return ((float(nuevo[0]), float(nuevo[1])), (float(eu2[0]), float(eu2[1])),
                (max(en_u) - min(en_u)) * metro, (max(en_v) - min(en_v)) * metro)

    libre = (lambda p, q, afuera: True) if manzana is None else (lambda p, q, afuera: _lado_libre(p, q, afuera, manzana, metro))
    for p, q, afuera in lados[1:]:
        if libre(p, q, afuera) and _da_a_una_calle(p, q, afuera, calles72, metro):
            return marco_con(np.array([-afuera[1], afuera[0]]))     # ev entra desde ese lado; eu = ev girado −90°
    # el lote oblicuo (T33j.6i): ningún lado corre con su calle, pero uno libre da a ella con más giro; el marco va en
    # la dirección de la calle y encierra el lote (el techo se recorta con la huella)
    for k, (p, q, afuera) in enumerate(lados):
        # el frente ya es un lado libre (marco_de_casa lo eligió entre los libres): no se le vuelve a pedir
        if k > 0 and not libre(p, q, afuera):
            continue
        d = _calle_del_lado(p, q, afuera, calles72, metro, giro_maximo=GIRO_DE_LOTE_OBLICUO)
        if d is not None:
            ev2 = np.array([-d[1], d[0]])
            if float(ev2 @ afuera) > 0:      # ev entra al lote, desde la calle
                d = -d
            return marco_con(d)
    return origen, eu, ancho_m, fondo_m


def marco_de_casa(casa, manzana, angulo, metro, frentes=(), calles72=()):
    """El marco del lote de una casa: su rectángulo en la dirección de la manzana, con el frente en la calle.

    `casa` y `manzana`: máscaras de la misma forma (la manzana incluye sus patios y jardines); `angulo`:
    la dirección de los lados de la manzana (None: la del rectángulo mínimo de la casa). El rectángulo
    es el de la casa sin sus salientes (los pedazos que se le unieron, los dientes del borde): lo que
    quede afuera lo cubre el visor estirando las alas del borde. → None si ningún lado da a la calle; si
    no, {origen: (x, y) en píxeles, eu, ev, ancho y fondo en metros, calles, lleno (qué parte del
    rectángulo está edificada), huecos: los patios del plano [[u0, v0, u1, v1]] en metros, grilla: lo
    edificado en el marco, una celda por píxel}.
    """
    ys, xs = np.nonzero(casa)
    if len(xs) < 4:
        return None
    if angulo is None:
        angulo = math.radians(cv2.minAreaRect(np.c_[xs, ys].astype(np.float32))[2])
    c, s = math.cos(angulo), math.sin(angulo)
    x, y = xs + 0.5, ys + 0.5
    u, v = x * c + y * s, -x * s + y * c
    u0, v0 = u.min() - 0.5, v.min() - 0.5

    def a_px(pu, pv):
        return pu * c - pv * s, pu * s + pv * c

    entera = _grilla(casa, a_px(u0, v0), (c, s), (-s, c), int(round(u.max() + 0.5 - u0)), int(round(v.max() + 0.5 - v0)))
    banda = max(1, int(round(1.0 / metro)))
    i0, i1, j0, j1 = _sin_salientes(entera, banda)
    u0, u1, v0, v1 = u0 + i0, u0 + i1, v0 + j0, v0 + j1
    # los lados en orden v0, u1, v1, u0, con la normal hacia afuera (en el marco de la manzana)
    lados = [(((u0, v0), (u1, v0)), (0, -1)), (((u1, v0), (u1, v1)), (1, 0)),
             (((u1, v1), (u0, v1)), (0, 1)), (((u0, v1), (u0, v0)), (-1, 0))]
    libres = _libres(lados, manzana, a_px, metro)
    largos = [u1 - u0, v1 - v0, u1 - u0, v1 - v0]
    sueltos = [k for k in range(4) if libres[k] >= LADO_LIBRE]
    if not sueltos:
        return None
    # el frente es un lado libre que da a una calle de 1772, si lo hay (T33j.6c: un lado libre que da a un patio de
    # la manzana o a un solar no es la calle); entre ellos, el corto: los lotes son tiras
    a_la_calle = [k for k in sueltos if calles72 and _da_a_una_calle(
        a_px(*lados[k][0][0]), a_px(*lados[k][0][1]), a_px(*lados[k][1]), calles72, metro)]
    frente = min(a_la_calle or sueltos, key=lambda k: (largos[k], k))
    # el marco del lote: ev entra desde el frente; eu = ev girado −90° (así ev = eu girado 90°)
    normales = [a_px(*n) for _, n in lados]
    ev = (-normales[frente][0], -normales[frente][1])
    esquinas = [a_px(*p) for (p, _), _ in lados]
    (p, q) = esquinas[frente], esquinas[(frente + 1) % 4]
    linea = _frente_de_la_cuadra(frentes, ((p[0] + q[0]) / 2, (p[1] + q[1]) / 2), ev, metro)
    if linea:   # el frente va sobre la línea de fachada de su cuadra (`frentes`: frentes_de_manzana)
        x, y, dx, dy = linea
        signo = 1.0 if -dy * ev[0] + dx * ev[1] > 0 else -1.0
        ev = (-dy * signo, dx * signo)
    eu = (ev[1], -ev[0])
    en_u, en_v = [px * eu[0] + py * eu[1] for px, py in esquinas], [px * ev[0] + py * ev[1] for px, py in esquinas]
    ou, ov = min(en_u), (linea[0] * ev[0] + linea[1] * ev[1]) if linea else min(en_v)
    ancho_px, fondo_px = max(en_u) - ou, max(en_v) - ov
    origen = (ou * eu[0] + ov * ev[0], ou * eu[1] + ov * ev[1])
    calles = 0
    for k in sueltos:
        if k == frente:
            continue
        a_lo_largo = normales[k][0] * eu[0] + normales[k][1] * eu[1]
        hacia_el_fondo = normales[k][0] * ev[0] + normales[k][1] * ev[1]
        calles |= CALLE_DER if a_lo_largo > 0.9 else CALLE_IZQ if a_lo_largo < -0.9 else CALLE_FONDO if hacia_el_fondo > 0.9 else 0
    grilla = _grilla(casa, origen, eu, ev, max(1, int(round(ancho_px))), max(1, int(round(fondo_px))))
    if linea:   # el lote sigue el marco de la manzana y el frente, su calle: se quitan las cuñas que sobran
        i0, i1, _, j1 = _sin_salientes(grilla, banda, con_frente=False)
        grilla = grilla[:j1, i0:i1]
        origen = (origen[0] + i0 * eu[0], origen[1] + i0 * eu[1])
        ancho_px, fondo_px = float(i1 - i0), float(j1)
    return {'origen': (float(origen[0]), float(origen[1])), 'eu': (float(eu[0]), float(eu[1])), 'ev': (float(ev[0]), float(ev[1])),
            'ancho': float(ancho_px * metro), 'fondo': float(fondo_px * metro), 'calles': calles,
            'lleno': float(grilla.mean()), 'huecos': _huecos_de(grilla, metro), 'grilla': grilla}


def _edificado(grilla, ala, metro):
    """Qué parte del ala (en metros, en el marco) cae sobre lo edificado."""
    _, u0, v0, u1, v1 = ala
    parte = grilla[int(round(v0 / metro)):max(int(round(v1 / metro)), int(round(v0 / metro)) + 1),
                   int(round(u0 / metro)):max(int(round(u1 / metro)), int(round(u0 / metro)) + 1)]
    return float(parte.mean()) if parte.size else 0.0


def alas_de_casa(casa, manzana, angulo, metro, semilla, distancia_m, frentes=(), crujia=None, calles72=()):
    """(marco, alas) de una casa que da a la calle, o None si no da a ninguna.

    Las alas van en píxeles del marco: [[tipo, u0, v0, u1, v1], …]; ninguna si la casa queda simple (chica,
    angosta o irregular: el visor la techa en su marco, sin patios). El marco, como lo da marco_de_casa
    (ancho y fondo en metros), sin la grilla y con "crujia": el fondo de la crujía del frente, en metros.
    """
    marco = marco_de_casa(casa, manzana, angulo, metro, frentes, calles72)
    if marco is None:
        return None
    if crujia is None:
        crujia = CRUJIA_M[0] + (CRUJIA_M[1] - CRUJIA_M[0]) * ((int(semilla) * 2654435761 & 0xFFFFFFFF) / 0xFFFFFFFF)
    sin_grilla = {**{k: v for k, v in marco.items() if k != 'grilla'}, 'crujia': float(crujia)}
    if marco['lleno'] < LLENO_MINIMO:
        return sin_grilla, []
    azar = (int(semilla) * 40503 & 0xFFFF) / 0x10000
    alas = repartir(marco['ancho'], marco['fondo'], semilla, patios_segun_distancia(distancia_m, azar), marco['calles'], marco['huecos'], crujia)
    if not alas or _edificado(marco['grilla'], next(a for a in alas if a[0] == FRENTE), metro) < FRENTE_EDIFICADO:
        return sin_grilla, []
    return sin_grilla, [[tipo, *(round(x / metro, 2) for x in medidas)] for tipo, *medidas in alas]
