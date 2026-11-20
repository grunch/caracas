"""Vectorizador: de la imagen de clases (tools/geo/segmentar.py) a los techos de la ciudad.

Cada manzana se divide en lotes rectos, de frente angosto y perpendiculares a su calle
(tools/geo/lotes.py). Lo edificado de cada lote es una casa; los pedazos muy chicos se unen a
la casa vecina. Los edificios públicos (rayados en el plano) van enteros. Salida: vértices en
píxeles del plano y techos [primer vértice, cuántos, pisos, estilo, semilla], el formato de
src/ciudad.js, más "esquinas": por techo, 1 si la casa hace esquina en su manzana (ahí iban los
altos con balcón, fuentes/imagenes/README.md; lo usa tools/geo/estilos.py).

Las casas de patio (tools/geo/alas.py) llevan además su marco y sus alas, para que el visor las teche
como un peine de alas alrededor de patios y no con una tapa: "marcos" [techo, ox, oy, eux, euy, ancho,
fondo, calles, crujía, primera ala, cuántas] (origen y medidas en píxeles; uno por cada casa que da a la
calle, con su frente sobre la línea de fachada de la cuadra) y "alas" [tipo, u0, v0, u1, v1] en píxeles
del marco (ninguna si la casa es simple; specs/02). Con --patios, además, la máscara de los patios y solares que se abrieron
por regla (el plano los pinta edificados): la usa tools/suelo.mjs para que el suelo ahí sea de patio.

Uso: vectorizar.py <clases.png> <salida.json> --escala <m/px> --plaza <px,py>
"""
import argparse
import json
import math
import sys
from pathlib import Path

import cv2
import numpy as np
from scipy import ndimage
from shapely.geometry import Polygon
from skimage import measure

sys.path.insert(0, str(Path(__file__).resolve().parent))

from alas import CRUJIA_M, PATIO, SOLAR, alas_de_casa, frentes_de_manzana  # noqa: E402
from cuadra import alas_modelo, casa_modelo, crujia_de_cuadra, es_de_solo_casas  # noqa: E402
from caras import Red, ajustar_cara, mascara_de_lineas  # noqa: E402
from lados import CUADRA_MINIMA_M2, _relleno, cortar_por_calles, cuadras_pegadas, lotes_por_lados  # noqa: E402
from lotes import (  # noqa: E402
    casas_de_esquina, direccion_de_manzana, esquinas_de_manzana, fundir_chicos, lotes_de_manzana, sin_pelos,
)

CLASE = {'desconocido': 0, 'calle': 1, 'patio': 2, 'edificado': 3, 'publico': 4,
         'verde': 5, 'cultivo': 6, 'agua': 7, 'cerro': 8, 'margen': 9}
ESTILO_COLONIAL = 0
ESTILO_PUBLICO = 9

AREA_FUSION_M2 = 30.0    # un pedazo de casa más chico que esto se une a la casa vecina
ANCHO_MINIMO_M = 3.0     # lo que mide menos que esto de ancho no es un ala de la casa: va con la vecina
AREA_MINIMA_M2 = 6.0     # menos que esto es ruido de la segmentación
TOLERANCIA_M = 0.35      # simplificación de los contornos
RADIO_ESQUINA_M = 6.0    # la casa de esquina llega a menos de esto del vértice de la manzana
CASAS_PARA_ESQUINA = 4   # con menos casas que estas, la manzana no tiene casas de esquina
DE_LA_MANZANA = (CLASE['edificado'], CLASE['publico'], CLASE['patio'], CLASE['verde'])


def semilla_de(x, y):
    return (int(x * 73856093) ^ int(y * 19349663)) & 0xFFFF


def pisos_de(semilla, distancia_m):
    """Casi todo es de un piso; los de dos se juntan en el centro."""
    azar = ((semilla * 2654435761) & 0xFFFFFFFF) / 0xFFFFFFFF
    prob_dos = 0.35 if distancia_m < 500 else 0.15 if distancia_m < 1200 else 0.04
    return 2 if azar < prob_dos else 1


def poligono_de(mascara, desplazamiento, tolerancia_px):
    """Contorno de una máscara binaria como polígono en coordenadas continuas (bordes de píxel)."""
    contornos, _ = cv2.findContours(mascara.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contornos:
        return None
    contorno = max(contornos, key=cv2.contourArea)[:, 0, :].astype(float) + 0.5 + np.asarray(desplazamiento, float)
    if len(contorno) < 3:
        contorno = np.array([[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]]) + contorno[0]
        figura = Polygon(contorno)
    else:
        figura = Polygon(contorno).buffer(0.5, join_style=2)
    figura = figura.simplify(tolerancia_px)
    if figura.geom_type == 'MultiPolygon':
        figura = max(figura.geoms, key=lambda g: g.area)
    return figura if figura.is_valid and not figura.is_empty else None


def agregar_techo(salida, figura, pisos, estilo, semilla, esquina=False, cuadra=-1, cede=-1):
    """Un techo más. `cuadra`: la manzana de la cuadra modelo a la que pertenece (-1: ninguna); `cede`: el
    edificio público (número de techo) que la casa pisa y al que le deja el lugar cuando nace (-1: ninguno)."""
    puntos = list(figura.exterior.coords)[:-1]
    salida['techos'].append([len(salida['vertices']) // 2, len(puntos), pisos, estilo, semilla])
    salida['esquinas'].append(int(esquina))
    salida['cuadras'].append(int(cuadra))
    salida['cede'].append(int(cede))
    salida['junta'].append(salida.get('_junta', -1))
    salida['antes'].append(salida.get('_antes', 0))
    for x, y in puntos:
        salida['vertices'].extend((round(x, 2), round(y, 2)))


def techos_publicos(clases, salida, area_min_px, tolerancia_px, metro):
    n, comp, stats, _ = cv2.connectedComponentsWithStats((clases == CLASE['publico']).astype(np.uint8), connectivity=8)
    for k in range(1, n):
        if stats[k, cv2.CC_STAT_AREA] < area_min_px:
            continue
        x, y, w, h = stats[k, :4]
        figura = poligono_de(comp[y:y + h, x:x + w] == k, (x, y), tolerancia_px)
        if figura is not None:
            pisos = 3 if figura.area * metro ** 2 > 2000 else 2
            salida['publicos'].append((figura, len(salida['techos'])))
            agregar_techo(salida, figura, pisos, ESTILO_PUBLICO, semilla_de(figura.centroid.x, figura.centroid.y))


CEDE_DESDE = 0.25   # una casa que pisa un edificio público en más que esto de su huella le cede el lugar


def publico_que_pisa(publicos, figura):
    """El techo del edificio público que la casa pisa en más de CEDE_DESDE de su huella, o -1."""
    for poligono, techo in publicos:
        if poligono.bounds[0] <= figura.bounds[2] and figura.bounds[0] <= poligono.bounds[2] \
                and poligono.bounds[1] <= figura.bounds[3] and figura.bounds[1] <= poligono.bounds[3] \
                and poligono.intersection(figura).area > CEDE_DESDE * figura.area:
            return techo
    return -1


def agregar_alas(salida, techo, marco, alas, origen, metro):
    """El marco y las alas de la casa `techo`, llevados de la manzana a los píxeles del plano."""
    ox, oy = marco['origen'][0] + origen[0], marco['origen'][1] + origen[1]
    salida['marcos'].append([techo, round(ox, 2), round(oy, 2), round(marco['eu'][0], 5), round(marco['eu'][1], 5),
                             round(marco['ancho'] / metro, 2), round(marco['fondo'] / metro, 2), marco['calles'],
                             round(marco['crujia'] / metro, 2), len(salida['alas']), len(alas)])
    salida['alas'].extend(alas)


def _casas_de_manzana(clases, manzana, lotes, metro, modelo):
    """Las casas de la manzana (etiquetas): lo edificado de cada lote o, en la cuadra modelo, el lote entero
    (también sobre los edificios públicos: antes de que existan, ahí había casas)."""
    edificado = manzana & (clases == CLASE['edificado'])
    casas = measure.label(np.where(manzana if modelo else edificado, lotes, 0), background=0, connectivity=2)
    casas = measure.label(sin_pelos(casas, ANCHO_MINIMO_M / 2 / metro), background=0, connectivity=2)
    return fundir_chicos(casas, AREA_FUSION_M2 / metro ** 2)


def casas_por_lados(manzana, origen, salida, area_min_px, tolerancia_px, distancia_m, metro, crujia, poligono=None):
    """Las casas de una cuadra modelo repartida por sus lados (tools/geo/lados.py): cada lote con su marco
    sobre la línea de fachada de su calle. → False si la manzana no se deja repartir así."""
    repartida = lotes_por_lados(manzana, metro, semilla_de(int(origen[0]) + 5, int(origen[1]) + 11), poligono)
    if repartida is None:
        return False
    etiquetas, lotes = repartida
    x, y = origen
    zonas = ndimage.find_objects(etiquetas)
    for k, lote in lotes.items():
        zona = zonas[k - 1]
        mascara = etiquetas[zona] == k
        if zona is None or mascara.sum() < area_min_px:
            continue
        figura = poligono_de(mascara, (x + zona[1].start, y + zona[0].start), tolerancia_px)
        if figura is None:
            continue
        semilla = semilla_de(figura.centroid.x, figura.centroid.y)
        agregar_techo(salida, figura, pisos_de(semilla, distancia_m(figura)), ESTILO_COLONIAL, semilla,
                      esquina=lote['esquina'], cuadra=salida['n_cuadras'] - 1, cede=publico_que_pisa(salida['publicos'], figura))
        alas = alas_modelo(lote['ancho'], lote['fondo'], semilla, 0, crujia)
        marco = {'origen': lote['origen'], 'eu': lote['eu'], 'ancho': lote['ancho'], 'fondo': lote['fondo'], 'calles': 0,
                 'crujia': crujia}
        agregar_alas(salida, len(salida['techos']) - 1, marco, [[t, *(round(m / metro, 2) for m in med)] for t, *med in alas],
                     origen, metro)
    return True


def techos_de_manzana(clases, manzana, origen, salida, area_min_px, tolerancia_px, distancia_m, metro, cuadra_modelo=True,
                      poligono=None):
    """Las casas de una manzana. Las de solo casas (tools/geo/cuadra.py) van con la cuadra modelo: un anillo
    de casas que dan a la calle y el centro abierto; las demás, con lo edificado del plano en cada lote. Recibe una cuadra
    (vectorizar separa las manzanas en cuadras); las manzanas de 1936 las cuenta vectorizar. `poligono`: los lados
    de la cuadra según la red de calles (tools/geo/caras.py), si se conocen: con ellos se reparte aunque su
    borde en el plano sea dentado o tenga muescas."""
    x, y = origen
    if (manzana & (clases == CLASE['edificado'])).sum() < area_min_px:
        return
    salida['n_cuadras'] += 1
    direccion = direccion_de_manzana(manzana, metro)
    modelo = (cuadra_modelo and (poligono is not None or direccion[1] is not None)
              and es_de_solo_casas(clases, manzana, metro, CLASE['edificado'], CLASE['publico']))
    azar = semilla_de(int(x) + 17, int(y) + 29) / 0xFFFF
    if modelo and casas_por_lados(manzana, origen, salida, area_min_px, tolerancia_px, distancia_m, metro, crujia_de_cuadra(azar),
                                  poligono):
        return
    lotes = lotes_de_manzana(manzana, metro, semilla_de(int(x), int(y)), direccion)
    # de toda la manzana: las líneas de fachada y el fondo de la crujía (la cumbrera corre seguida por la cuadra)
    frentes = frentes_de_manzana(manzana, direccion[0][0], metro)
    crujia = crujia_de_cuadra(azar) if modelo else CRUJIA_M[0] + (CRUJIA_M[1] - CRUJIA_M[0]) * azar
    casas = _casas_de_manzana(clases, manzana, lotes, metro, modelo)
    # una casa suelta o un par de casas no son una manzana con esquinas a la calle
    hay_esquinas = len(np.unique(casas)) - 1 >= CASAS_PARA_ESQUINA
    de_esquina = casas_de_esquina(casas, esquinas_de_manzana(manzana, metro), RADIO_ESQUINA_M / metro) if hay_esquinas else set()
    for casa, zona in enumerate(ndimage.find_objects(casas), start=1):
        if zona is None:
            continue
        mascara = casas[zona] == casa
        if mascara.sum() < area_min_px:
            continue
        figura = poligono_de(mascara, (x + zona[1].start, y + zona[0].start), tolerancia_px)
        if figura is None:
            continue
        semilla = semilla_de(figura.centroid.x, figura.centroid.y)
        # la casa en su ventana, con 10 m de manzana alrededor para ver qué lados dan a la calle
        margen = int(math.ceil(10 / metro))
        f0, c0 = max(0, zona[0].start - margen), max(0, zona[1].start - margen)
        ventana = (slice(f0, zona[0].stop + margen), slice(c0, zona[1].stop + margen))
        frentes_aqui = [(fx - c0, fy - f0, dx, dy) for fx, fy, dx, dy in frentes]
        if modelo:
            con_alas = casa_modelo(casas[ventana] == casa, manzana[ventana], direccion[1], metro, semilla, frentes_aqui, crujia)
            if con_alas is None:   # un lote que no da a la calle: en la cuadra modelo es solar
                continue
        else:
            con_alas = alas_de_casa(casas[ventana] == casa, manzana[ventana], direccion[1], metro, semilla,
                                    distancia_m(figura), frentes_aqui, crujia)
        agregar_techo(salida, figura, pisos_de(semilla, distancia_m(figura)), ESTILO_COLONIAL, semilla,
                      esquina=casa in de_esquina, cuadra=salida['n_cuadras'] - 1 if modelo else -1,
                      cede=publico_que_pisa(salida['publicos'], figura) if modelo else -1)
        if con_alas:
            agregar_alas(salida, len(salida['techos']) - 1, *con_alas, (x + c0, y + f0), metro)


ANCHO_DE_CORTE_M = 4.0    # lo que se lleva de la manzana la calle de hoy que la corta (más angosta que la calle)


def _cuadras_de(manzana, metro, cuadra_modelo, calles_hoy=None, libre=None):
    """Las cuadras de una manzana de 1936: [(máscara, (x, y))]. Se corta por las calles de hoy donde el plano
    pintó la calle de jardín o de patio (`calles_hoy`, `libre`: lo que no es casa ni edificio público; aunque
    la manzana unida sea un rectángulo que se deja repartir) y, lo que no se deja repartir por lados, se
    separa en las cuadras pegadas por un puente fino (tools/geo/lados.py). Cada cuadra decide sola si va con la cuadra modelo (una manzana con un convento
    puede no serlo entera y tener cuadras de casas)."""
    if not cuadra_modelo:
        return [(manzana, (0, 0))]
    cortadas = cortar_por_calles(manzana, calles_hoy, libre, metro) if calles_hoy is not None else None
    salida = []
    for pieza, (x, y) in cortadas or [(manzana, (0, 0))]:
        pegadas = cuadras_pegadas(pieza, metro) if lotes_por_lados(pieza, metro, 0) is None else None
        salida += [(p, (x + px, y + py)) for p, (px, py) in pegadas] if pegadas else [(pieza, (x, y))]
    return salida


def _clases_de_antes(clases, cuadra):
    """Las clases de la ventana de una cuadra de antes con lo abierto dentro de ella (las calles nuevas y sus
    puntas) edificado, como estaba en 1772. No toca el original."""
    abierto = np.asarray(cuadra, bool) & ~np.isin(clases, DE_LA_MANZANA)
    return np.where(abierto, CLASE['edificado'], clases).astype(clases.dtype)


COBERTURA_DE_CARA = 0.9    # la cuadra tiene que caer casi toda dentro del polígono ajustado de su cara
ABIERTO_MINIMO_M2 = 150.0  # lo abierto después de 1772 dentro de una cuadra, para que valga armar la de antes
PLAZA_VIEJA_M2 = 200.0     # lo abierto que 1772 tampoco edifica, desde este tamaño, ya era plaza: no se rellena
ASTILLA_M = 2.0            # lo abierto más angosto que el doble de esto es un diente del borde, no una calle
CARA_MAXIMA_M2 = 80000.0   # una cara más grande no es una cuadra (un cerro, un parque)


def _punto_interior(mascara):
    """El punto (x, y) más adentro de la máscara, en sus píxeles."""
    lejos = cv2.distanceTransform(np.asarray(mascara).astype(np.uint8), cv2.DIST_L2, 3)
    j, i = np.unravel_index(int(np.argmax(lejos)), lejos.shape)
    return i + 0.5, j + 0.5


def _sin_astillas(mascara, metro, area_minima_m2=0.0):
    """La máscara sin lo más angosto que 2·ASTILLA_M y sin los pedazos de menos de `area_minima_m2`."""
    r = max(1, int(round(ASTILLA_M / metro)))
    disco = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    gruesa = cv2.morphologyEx(np.asarray(mascara).astype(np.uint8), cv2.MORPH_OPEN, disco)
    if not area_minima_m2:
        return gruesa > 0
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(gruesa, connectivity=4)
    grandes = stats[:, cv2.CC_STAT_AREA] * metro ** 2 >= area_minima_m2
    grandes[0] = False
    return grandes[etiquetas]


def _poligonos_de_cara(red, lista, cajas, metro):
    """{etiqueta: polígono (n, 2) en la ventana de la cuadra}: los lados de cada cuadra según su cara de la red
    de 1936, ajustados a sus fachadas. Solo si la cara tiene una sola cuadra y el polígono la cubre."""
    de_cara = {}
    for etiqueta, parte in lista:
        if parte.sum() * metro ** 2 < CUADRA_MINIMA_M2:
            continue
        x, y = cajas[etiqueta][:2]
        i, j = _punto_interior(parte)
        cara = red.cara36_en(x + i, y + j)
        if cara is not None:
            de_cara.setdefault(cara, []).append((etiqueta, parte))
    salida = {}
    for cara, suyas in de_cara.items():
        if len(suyas) != 1:
            continue
        etiqueta, parte = suyas[0]
        poligono = ajustar_cara(red.caras36[cara], parte, cajas[etiqueta][:2], metro)
        if poligono is not None and (_relleno(poligono, parte.shape) & parte).sum() >= COBERTURA_DE_CARA * parte.sum():
            salida[etiqueta] = poligono
    return salida


def _cuadras_de_antes(red, edificado72, clases, cuadras, areas, metro):
    """Las cuadras de 1772 que el plano de 1936 muestra abiertas (una calle nueva que las parte, un pasaje o
    una plaza que les entra): por cada cara de la red sin los tramos nuevos, su polígono ajustado a las
    fachadas con lo abierto adentro vuelto a edificar, salvo lo que 1772 tampoco edifica (una plaza vieja).
    → [{miembros: las cuadras de 1936 que reemplaza, cuadra: máscara, origen: (x, y), clases: las de antes,
    poligono, abierto: máscara de lo que se abrió}]. Solo las que salen como cuadra modelo repartida por lados."""
    alto, ancho = clases.shape
    salida = []
    for cara in red.caras72:
        if not CUADRA_MINIMA_M2 <= cara.area * metro ** 2 <= CARA_MAXIMA_M2:
            continue
        bx0, by0, bx1, by1 = cara.bounds
        x0, y0, x1, y1 = max(0, int(bx0)), max(0, int(by0)), min(ancho, int(bx1) + 2), min(alto, int(by1) + 2)
        if x1 - x0 < 4 or y1 - y0 < 4 or not edificado72[y0:y1, x0:x1].any():
            continue
        cl = clases[y0:y1, x0:x1]
        dentro = np.zeros(cl.shape, np.uint8)
        cv2.fillPoly(dentro, [np.round((np.asarray(cara.exterior.coords) - (x0, y0)) * 16).astype(np.int32)], 1, shift=4)
        dentro = dentro > 0
        de_manzana = np.isin(cl, DE_LA_MANZANA)
        poligono = ajustar_cara(cara, dentro & de_manzana, (x0, y0), metro)
        if poligono is None:
            continue
        en_poligono = _relleno(poligono, cl.shape) & dentro
        calle = cl == CLASE['calle']
        plaza_vieja = _sin_astillas(en_poligono & calle & ~edificado72[y0:y1, x0:x1], metro, PLAZA_VIEJA_M2)
        cuadra = en_poligono & (de_manzana | calle) & ~plaza_vieja
        abierto = _sin_astillas(cuadra & calle, metro)
        if abierto.sum() * metro ** 2 < ABIERTO_MINIMO_M2:
            continue
        # las cuadras de 1936 que reemplaza: las que caen casi enteras adentro; lo de las demás (una miga con el
        # número de la cuadra de enfrente) no es de esta
        suyas = cuadras[y0:y1, x0:x1]
        cuenta = np.bincount(suyas[cuadra])
        miembros = {int(e) for e in np.flatnonzero(cuenta) if e > 0 and cuenta[e] >= 0.5 * areas.get(int(e), np.inf)}
        if not miembros:
            continue
        cuadra = cuadra & ((suyas == 0) | np.isin(suyas, list(miembros)))
        de_antes = _clases_de_antes(cl, cuadra)
        if not es_de_solo_casas(de_antes, cuadra, metro, CLASE['edificado'], CLASE['publico']) \
                or lotes_por_lados(cuadra, metro, 0, poligono) is None:
            continue
        salida.append({'miembros': miembros, 'cuadra': cuadra, 'origen': (x0, y0), 'clases': de_antes,
                       'poligono': poligono, 'abierto': abierto & cuadra})
    return salida


def _contornos_de(abierto, origen):
    """Lo abierto de una cuadra de antes como polígonos [[x, y, x, y, …], …] en píxeles del plano."""
    x0, y0 = origen
    contornos, _ = cv2.findContours(abierto.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return [[round(float(v), 1) for x, y in c[:, 0, :] for v in (x + x0 + 0.5, y + y0 + 0.5)] for c in contornos if len(c) >= 3]


def vectorizar(clases, metro, plaza, cuadra_modelo=True, red=None, calles_hoy=None):
    """La ciudad de la imagen de clases. Sin `cuadra_modelo`, todas las manzanas con lo edificado del plano.

    Cada manzana se arma cuadra por cuadra (_cuadras_de). `red`: {tramos: la red de calles clasificada
    (tools/geo/caras.py), edificado72: lo edificado del plano de 1772 ya corregido, o None}. Con ella:
    - las manzanas se cortan por los tramos que estaban en 1936 (y por los demás, solo donde el plano no tiene
      casas: `calles_hoy` es esa misma máscara, si se da suelta);
    - cada cuadra se reparte por los lados de su cara de la red, ajustados a sus fachadas;
    - las cuadras de 1772 que 1936 muestra abiertas (_cuadras_de_antes) van dos veces: como en 1936 ("antes" 0)
      y enteras, como eran ("antes" 1). Cada techo dice de qué grupo es ("junta", -1: de ninguno) y "juntas"
      trae, por grupo, lo que se abrió (tools/geo/epocas.py decide cuándo).
    """
    clases = np.asarray(clases)
    area_min_px = AREA_MINIMA_M2 / metro ** 2
    tolerancia_px = TOLERANCIA_M / metro
    salida = {'vertices': [], 'techos': [], 'esquinas': [], 'cuadras': [], 'cede': [], 'junta': [], 'antes': [], 'juntas': [],
              'manzanas': 0, 'marcos': [], 'alas': [], 'publicos': [], 'n_cuadras': 0}

    def distancia_m(f):
        return math.hypot(f.centroid.x - plaza[0], f.centroid.y - plaza[1]) * metro

    con_red = Red(red['tramos']) if red is not None and cuadra_modelo else None
    de_1936 = None
    if con_red is not None:
        grosor = ANCHO_DE_CORTE_M / metro
        calles_hoy = mascara_de_lineas(con_red.lineas(), clases.shape, grosor)
        de_1936 = mascara_de_lineas(con_red.lineas(solo_de_1936=True), clases.shape, grosor)
    techos_publicos(clases, salida, area_min_px, tolerancia_px, metro)
    manzanas = np.isin(clases, DE_LA_MANZANA).astype(np.uint8)
    n, cuadras, stats, _ = cv2.connectedComponentsWithStats(manzanas, connectivity=4)
    # cada manzana, en sus cuadras: las pegadas reciben su propio número en `cuadras` (la primera cuenta como la manzana)
    lista, cajas = [], {}
    for k in range(1, n):
        x, y, w, h = stats[k, :4]
        manzana = cuadras[y:y + h, x:x + w] == k
        salida['manzanas'] += int((manzana & (clases[y:y + h, x:x + w] == CLASE['edificado'])).sum() >= area_min_px)
        # una calle de hoy corta donde el plano no tiene casas ni edificios públicos; una que ya estaba en 1936, siempre
        libre = ~np.isin(clases[y:y + h, x:x + w], (CLASE['edificado'], CLASE['publico']))
        if de_1936 is not None:
            libre = libre | de_1936[y:y + h, x:x + w]
        partes = _cuadras_de(manzana, metro, cuadra_modelo, None if calles_hoy is None else calles_hoy[y:y + h, x:x + w], libre)
        # lo que el corte por la calle de hoy deja fuera de las partes no conserva el número de la manzana entera
        cuadras[y:y + h, x:x + w][manzana] = 0
        for parte, (dx, dy) in partes:
            etiqueta = k if len(partes) == 1 else n + len(cajas)
            ph, pw = parte.shape
            cuadras[y + dy:y + dy + ph, x + dx:x + dx + pw][parte] = etiqueta
            cajas[etiqueta] = (x + dx, y + dy, pw, ph)
            lista.append((etiqueta, parte))
    poligonos = _poligonos_de_cara(con_red, lista, cajas, metro) if con_red is not None else {}
    antes = []
    if con_red is not None and red.get('edificado72') is not None:
        areas = {etiqueta: int(parte.sum()) for etiqueta, parte in lista}
        antes = _cuadras_de_antes(con_red, np.asarray(red['edificado72'], bool), clases, cuadras, areas, metro)
    de_grupo = {m: j for j, grupo in enumerate(antes) for m in grupo['miembros']}
    for etiqueta, parte in lista:
        x, y, w, h = cajas[etiqueta]
        salida['_junta'] = de_grupo.get(etiqueta, -1)
        techos_de_manzana(clases[y:y + h, x:x + w], parte, (x, y), salida, area_min_px, tolerancia_px, distancia_m, metro,
                          cuadra_modelo, poligonos.get(etiqueta))
    salida['_antes'] = 1
    for j, grupo in enumerate(antes):
        salida['_junta'] = j
        techos_de_manzana(grupo['clases'], grupo['cuadra'], grupo['origen'], salida, area_min_px, tolerancia_px, distancia_m,
                          metro, cuadra_modelo, grupo['poligono'])
        salida['juntas'].append(_contornos_de(grupo['abierto'], grupo['origen']))
    for privada in ('publicos', 'n_cuadras', '_junta', '_antes'):
        salida.pop(privada, None)
    return salida


def mascara_de_patios(ciudad, forma):
    """Máscara (uint8, 255 = patio) de los patios y solares de las casas de patio, en píxeles del plano."""
    mascara = np.zeros(forma, np.uint8)
    for _, ox, oy, eux, euy, _, _, _, _, primera, cuantas in ciudad['marcos']:
        for tipo, u0, v0, u1, v1 in ciudad['alas'][primera:primera + cuantas]:
            if tipo in (PATIO, SOLAR):
                esquinas = [(ox + u * eux - v * euy, oy + u * euy + v * eux) for u, v in ((u0, v0), (u1, v0), (u1, v1), (u0, v1))]
                cv2.fillPoly(mascara, [np.round(np.array(esquinas) * 16).astype(np.int32)], 255, shift=4)
    return mascara


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('clases')
    ap.add_argument('salida')
    ap.add_argument('--escala', type=float, required=True, help='metros por píxel')
    ap.add_argument('--plaza', required=True, help='px,py de la Plaza Bolívar')
    ap.add_argument('--patios', help='PNG donde dejar la máscara de los patios abiertos por regla')
    ap.add_argument('--tramos', help='JSON de la red de calles clasificada (tools/geo/calles_nuevas.py): las cuadras salen de sus caras')
    ap.add_argument('--edificado-1772', help='PNG de lo edificado de 1772 ya corregido (tools/geo/calles_nuevas.py): con él se arman las cuadras de antes')
    a = ap.parse_args()
    clases = cv2.imread(a.clases, cv2.IMREAD_UNCHANGED)
    if clases is None or clases.ndim != 2:
        raise SystemExit(f'{a.clases}: se esperaba una imagen de clases de un canal')
    plaza = tuple(float(v) for v in a.plaza.split(','))
    red = None
    if a.tramos:
        red = {'tramos': json.loads(Path(a.tramos).read_text())['tramos'], 'edificado72': None}
        if a.edificado_1772:
            leida = cv2.imread(a.edificado_1772, cv2.IMREAD_UNCHANGED)
            if leida is None or leida.shape != clases.shape:
                raise SystemExit(f'{a.edificado_1772}: se esperaba una máscara de la forma de las clases')
            red['edificado72'] = leida > 0
    res = vectorizar(clases, a.escala, plaza, red=red)
    with open(a.salida, 'w') as f:
        json.dump(res, f)
    if a.patios and not cv2.imwrite(a.patios, mascara_de_patios(res, clases.shape)):
        raise SystemExit(f'no se pudo escribir {a.patios}')
    patios = sum(1 for ala in res['alas'] if ala[0] == PATIO)
    print(f"{res['manzanas']} manzanas, {len(res['techos'])} techos, {sum(1 for m in res['marcos'] if m[10])} casas de patio "
          f"({len(res['alas'])} alas, {patios} patios) → {a.salida}")


if __name__ == '__main__':
    main()
