"""La cuadra modelo: las manzanas de solo casas, rehechas como la cuadra colonial estándar vista desde arriba.

Referencia: la vista aérea de una cuadra colonial que pasó el usuario (Screenshots/cuadra.png, no va a
git). Una cuadra es un anillo de casas: todas dan la fachada a la calle, con una crujía corrida sobre
cada calle (la cumbrera paralela a ella, seguida de casa en casa) y, detrás de cada frente, nada más que
un ala hacia el fondo junto a un patio (en L) o un patio cerrado por un ala cruzada; a veces solo la
crujía. El centro de la manzana queda abierto: los solares del fondo de cada casa. Ninguna casa mira al
centro de la cuadra.

El plano de 1936 pinta macizas las manzanas del centro y el reparto por lotes de tools/geo/alas.py las
llenaba de patios hasta la medianera: en estas manzanas (sin edificios públicos y casi todas edificadas,
`es_de_solo_casas`) cada lote recto (tools/geo/lotes.py) se reparte con `alas_modelo`, con las mismas
alas que lee el visor (src/alas.js), y los lotes que no dan a ninguna calle se quedan sin casa: son
solar. Las variaciones (crujía de la cuadra, forma y hondura de cada casa) salen de las semillas.
"""
import numpy as np

from alas import (
    CALLE_DER, CALLE_FONDO, CALLE_IZQ, CRUZADA, ESQUINA_DER, ESQUINA_IZQ, FRENTE, LATERAL_DER, LATERAL_IZQ, PATIO,
    SOLAR, marco_de_casa, orientar_a_una_calle,
)

CRUJIA_M = (8.0, 9.5)             # fondo de la crujía sobre la calle
HONDURA_M = (8.0, 16.0)           # cuánto entran las alas detrás de la crujía
ALA_LATERAL_M = (3.8, 5.0)        # ancho del ala que va hacia el fondo
PATIO_M = (4.5, 7.0)              # fondo del patio que cierra un ala cruzada
ALA_CRUZADA_M = (4.5, 6.5)        # fondo del ala cruzada
SOLAR_MINIMO_M = 4.0              # lo que queda abierto al fondo del lote, como mínimo
HONDURA_MINIMA_M = 6.0            # menos que esto detrás de la crujía: la casa es solo la crujía
ANCHO_CON_ALAS_M = 7.5            # un lote más angosto no tiene alas detrás
ANCHO_DOS_LATERALES_M = 14.0      # desde aquí el patio cerrado puede tener ala a cada lado
INTERIOR_MINIMO_M = 1.0           # entre las alas de esquina, menos que esto no es nada: las alas llegan hasta ahí
# cuántas casas son solo la crujía, cuántas en L (las demás, patio cerrado por un ala cruzada)
SOLO_CRUJIA, EN_L = 0.2, 0.6
LLENO_MINIMO = 0.6                # sin contar sus edificios públicos, la manzana tiene que estar edificada al menos en esto
PUBLICO_MAXIMO = 0.5              # una manzana que es más que esto edificio público (un convento) no es una cuadra de casas
CUADRA_MINIMA_M2 = 1200.0         # una manzana más chica que esto es una casa suelta o un par: no es una cuadra


def es_de_solo_casas(clases, manzana, metro, edificado=3, publico=4):
    """¿Las casas de la manzana (máscara sobre `clases`, `metro` m/px) van con la cuadra modelo? Los
    edificios públicos quedan aparte (sus techos los hace el vectorizador y los hitos los tapan): cuenta lo
    demás de la manzana, que tiene que estar casi todo edificado."""
    manzana = np.asarray(manzana, bool)
    total = int(manzana.sum())
    if total * metro ** 2 < CUADRA_MINIMA_M2:
        return False
    de_la_manzana = np.asarray(clases)[manzana]
    publicos = np.count_nonzero(de_la_manzana == publico)
    return (publicos <= PUBLICO_MAXIMO * total
            and np.count_nonzero(de_la_manzana == edificado) >= LLENO_MINIMO * (total - publicos))


def _en_l(alas, rng, i0, i1, v0, hondura):
    a = float(rng.uniform(*ALA_LATERAL_M))
    if rng.random() < 0.5:
        alas += [[LATERAL_IZQ, i0, v0, i0 + a, v0 + hondura], [PATIO, i0 + a, v0, i1, v0 + hondura]]
    else:
        alas += [[PATIO, i0, v0, i1 - a, v0 + hondura], [LATERAL_DER, i1 - a, v0, i1, v0 + hondura]]


def _patio_cerrado(alas, rng, i0, i1, v0, hondura):
    """Un patio con una o dos alas laterales, cerrado al fondo por un ala cruzada. → la hondura que usó."""
    p, w = float(rng.uniform(*PATIO_M)), float(rng.uniform(*ALA_CRUZADA_M))
    hondura = min(p + w, hondura)
    p = max(hondura - w, PATIO_M[0] * 0.75)
    a = float(rng.uniform(*ALA_LATERAL_M))
    dos = i1 - i0 >= ANCHO_DOS_LATERALES_M and rng.random() < 0.5
    izq = dos or rng.random() < 0.5
    der = dos or not izq
    p0, p1 = i0 + (a if izq else 0.0), i1 - (a if der else 0.0)
    if izq:
        alas.append([LATERAL_IZQ, i0, v0, p0, v0 + p])
    alas.append([PATIO, p0, v0, p1, v0 + p])
    if der:
        alas.append([LATERAL_DER, p1, v0, i1, v0 + p])
    alas.append([CRUZADA, i0, v0 + p, i1, v0 + hondura])
    return hondura


def _detras(alas, rng, i0, i1, v0, hasta, fondo):
    """Lo que va detrás de la crujía de una casa entre los costados i0 e i1, de v0 hasta `hasta` como
    mucho; el resto, hasta `fondo`, es solar."""
    hondura = min(float(rng.uniform(*HONDURA_M)), hasta - v0)
    forma = rng.random()
    if i1 - i0 < ANCHO_CON_ALAS_M or hondura < HONDURA_MINIMA_M or forma < SOLO_CRUJIA:
        hondura = 0.0
    elif forma < EN_L:
        _en_l(alas, rng, i0, i1, v0, hondura)
    else:
        hondura = _patio_cerrado(alas, rng, i0, i1, v0, hondura)
    if fondo - (v0 + hondura) > 1e-6:
        alas.append([SOLAR, i0, v0 + hondura, i1, fondo])


def _interior(ancho, c, izq, der):
    """Los costados (i0, i1) de lo que queda entre las alas de esquina. En un lote de esquina angosto, si
    entre ellas no queda nada útil, las alas se reparten el lote entero (i0 == i1)."""
    i0, i1 = (c if izq else 0.0), (ancho - c if der else ancho)
    if i1 - i0 >= INTERIOR_MINIMO_M:
        return i0, i1
    if izq and der:
        return ancho / 2, ancho / 2
    return (ancho, ancho) if izq else (0.0, 0.0)


def alas_modelo(ancho, fondo, semilla, calles=0, crujia=None):
    """Las alas de un lote de `ancho` × `fondo` metros en la cuadra modelo: [[tipo, u0, v0, u1, v1], …] en
    metros, en el marco del lote (como alas.repartir). Cubren el lote sin encimarse. `calles`: qué otros
    lados dan a una calle; `crujia`: el fondo de la crujía, el mismo en toda la cuadra (si no, sale de la
    semilla)."""
    rng = np.random.default_rng(int(semilla))
    propia = float(rng.uniform(*CRUJIA_M))
    c = propia if crujia is None else float(crujia)
    if fondo < c + SOLAR_MINIMO_M:
        return [[FRENTE, 0, 0, ancho, fondo]]
    alas = [[FRENTE, 0.0, 0.0, ancho, c]]
    izq, der = bool(calles & CALLE_IZQ), bool(calles & CALLE_DER)
    i0, i1 = _interior(ancho, c, izq, der)
    if izq:
        alas.append([ESQUINA_IZQ, 0.0, c, i0, fondo])
    if der:
        alas.append([ESQUINA_DER, i1, c, ancho, fondo])
    if i1 - i0 > 1e-6:
        if calles & CALLE_FONDO:   # el lote cruza la cuadra: otra crujía en la calle de atrás y el patio entre las dos
            atras = max(c, fondo - c) if fondo >= 2 * c + SOLAR_MINIMO_M else c
            alas.append([CRUZADA, i0, atras, i1, fondo])
            if atras - c > 1e-6:
                alas.append([PATIO, i0, c, i1, atras])
        elif izq or der:           # la casa de esquina ya es una L: lo de adentro es solar
            alas.append([SOLAR, i0, c, i1, fondo])
        else:
            _detras(alas, rng, i0, i1, c, fondo - SOLAR_MINIMO_M, fondo)
    return [[tipo, *(round(float(x), 2) for x in medidas)] for tipo, *medidas in alas]


def crujia_de_cuadra(azar):
    """El fondo de la crujía de una cuadra, con `azar` en 0..1 (de la semilla de la manzana)."""
    return CRUJIA_M[0] + (CRUJIA_M[1] - CRUJIA_M[0]) * azar


def casa_modelo(casa, manzana, angulo, metro, semilla, frentes, crujia, calles72=()):
    """(marco, alas) de una casa de la cuadra modelo, como alas.alas_de_casa (alas en píxeles del marco),
    o None si el lote no da a ninguna calle: ese lote es solar. `calles72`: como en alas.marco_de_casa."""
    marco = marco_de_casa(casa, manzana, angulo, metro, frentes, calles72)
    if marco is None:
        return None
    sin_grilla = {**{k: v for k, v in marco.items() if k != 'grilla'}, 'crujia': float(crujia)}
    # el lote oblicuo, o el de esquina con el frente en la otra calle, hacia su calle de 1772 (T33j.6i)
    origen, eu, ancho, fondo = orientar_a_una_calle(marco['origen'], marco['eu'], marco['ancho'], marco['fondo'], calles72,
                                                    metro, manzana=manzana)
    if eu != marco['eu']:
        sin_grilla.update(origen=origen, eu=eu, ev=(-eu[1], eu[0]), ancho=ancho, fondo=fondo, calles=0)
    alas = alas_modelo(sin_grilla['ancho'], sin_grilla['fondo'], semilla, sin_grilla['calles'], crujia)
    return sin_grilla, [[tipo, *(round(x / metro, 2) for x in medidas)] for tipo, *medidas in alas]
