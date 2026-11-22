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
from shapely.ops import unary_union
from skimage import measure

sys.path.insert(0, str(Path(__file__).resolve().parent))

from alas import CRUJIA_M, PATIO, SOLAR, alas_de_casa, frentes_de_manzana  # noqa: E402
from cuadra import alas_modelo, casa_modelo, crujia_de_cuadra, es_de_solo_casas  # noqa: E402
from cuadras_historicas import es_completa  # noqa: E402
from huellas import huellas_de_manzana  # noqa: E402
from caras import RETIRO_MINIMO_M, Red, ajustar_cara, mascara_de_lineas  # noqa: E402
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


GRILLA_PX = 1e-3   # las restas y recortes redondean a la grilla de las coordenadas (milésimas, agregar_techo)


def huellas_de_casas(piezas, tolerancia_px, recorte=None):
    """[polígono o None] de cada (máscara, (ox, oy)) de una misma manzana, sin pisarse (I1772-011). Cada lote se
    vectoriza solo (poligono_de: medio píxel de buffer y su propia simplificación), y en los bordes oblicuos dos vecinas
    se pisaban en una franja fina: a cada casa se le resta lo que ya ocupan las anteriores de su manzana, así su
    medianera es el borde de la vecina. `recorte`: la cara de la cuadra (su línea de fachada), antes de restar."""
    from shapely.strtree import STRtree
    figuras = [poligono_de(m, o, tolerancia_px) for m, o in piezas]
    if recorte is not None:
        figuras = [None if f is None else _mayor(f.intersection(recorte, grid_size=GRILLA_PX)) for f in figuras]
    puestas, salida = [], []
    for f in figuras:
        if f is not None and puestas:
            arbol = STRtree(puestas)
            pisadas = [puestas[j] for j in arbol.query(f, predicate='intersects') if f.intersection(puestas[j]).area > 0]
            if pisadas:
                f = _mayor(f.difference(unary_union(pisadas), grid_size=GRILLA_PX))
        salida.append(f)
        if f is not None:
            puestas.append(f)
    return salida


def _mayor(figura):
    """El polígono más grande de una figura (sin las astillas que deja un recorte), o None."""
    partes = [g for g in getattr(figura, 'geoms', [figura]) if g.geom_type == 'Polygon' and not g.is_empty]
    if not partes:
        return None
    mayor = Polygon(max(partes, key=lambda g: g.area).exterior)
    return mayor if mayor.is_valid and mayor.area > 0 else None


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
    # milésimas de píxel (lo que guarda el float32 del .pak a 10 000 px): con centésimas, el vértice de un lote que
    # termina sobre la medianera larga de su vecino (unión en T) se salía de su recta y dejaba una astilla (I1772-011)
    for x, y in puntos:
        salida['vertices'].extend((round(x, 3), round(y, 3)))


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


FRENTE_MINIMO = 0.4  # un lote con menos que esto de la franja de su crujía edificada no es una casa: es solar
CEDE_DESDE = 0.25   # una casa que pisa un edificio público en más que esto de su huella le cede el lugar


def publico_que_pisa(publicos, figura):
    """El techo del edificio público que la casa pisa en más de CEDE_DESDE de su huella, o -1."""
    for poligono, techo in publicos:
        if poligono.bounds[0] <= figura.bounds[2] and figura.bounds[0] <= poligono.bounds[2] \
                and poligono.bounds[1] <= figura.bounds[3] and figura.bounds[1] <= poligono.bounds[3] \
                and poligono.intersection(figura).area > CEDE_DESDE * figura.area:
            return techo
    return -1


BORDE_PX = 0.05   # un ala que termina a menos de esto del borde de su marco termina en el borde


def agregar_alas(salida, techo, marco, alas, origen, metro):
    """El marco y las alas de la casa `techo`, llevados de la manzana a los píxeles del plano. El ancho y el
    fondo del marco y las alas se redondean por separado: las alas que llegan al borde se llevan justo a él
    (el visor estira las que lo tocan, src/alas.js; a una que se queda a milímetros le deja una franja sin techo)."""
    ox, oy = marco['origen'][0] + origen[0], marco['origen'][1] + origen[1]
    ancho, fondo = round(marco['ancho'] / metro, 2), round(marco['fondo'] / metro, 2)
    salida['marcos'].append([techo, round(ox, 2), round(oy, 2), round(marco['eu'][0], 5), round(marco['eu'][1], 5),
                             ancho, fondo, marco['calles'], round(marco['crujia'] / metro, 2), len(salida['alas']), len(alas)])
    salida['alas'].extend([tipo, u0, v0, ancho if abs(u1 - ancho) < BORDE_PX else u1, fondo if abs(v1 - fondo) < BORDE_PX else v1]
                          for tipo, u0, v0, u1, v1 in alas)


def _casas_de_manzana(clases, manzana, lotes, metro, modelo):
    """Las casas de la manzana (etiquetas): lo edificado de cada lote o, en la cuadra modelo, el lote entero
    (también sobre los edificios públicos: antes de que existan, ahí había casas)."""
    edificado = manzana & (clases == CLASE['edificado'])
    casas = measure.label(np.where(manzana if modelo else edificado, lotes, 0), background=0, connectivity=2)
    casas = measure.label(sin_pelos(casas, ANCHO_MINIMO_M / 2 / metro), background=0, connectivity=2)
    return fundir_chicos(casas, AREA_FUSION_M2 / metro ** 2)


def casas_por_lados(manzana, origen, salida, area_min_px, tolerancia_px, distancia_m, metro, crujia, poligono=None, publico=None):
    """Las casas de una cuadra modelo repartida por sus lados (tools/geo/lados.py): cada lote con su marco
    sobre la línea de fachada de su calle. → False si la manzana no se deja repartir así. `publico`: la máscara
    de los edificios públicos; el lote que pisa uno en menos de CEDE_DESDE pierde ese pedazo (el que lo pisa en
    más le cede el lugar entero cuando nace: publico_que_pisa)."""
    semilla_cuadra = semilla_de(int(origen[0]) + 5, int(origen[1]) + 11)
    exactas = huellas_de_manzana(manzana, poligono, metro, semilla_cuadra) if publico is None or not publico.any() else None
    x, y = origen
    figuras = []
    if exactas is not None:
        from shapely.affinity import translate
        figuras = [(lote, translate(lote['figura'], xoff=x, yoff=y)) for lote in exactas]
    else:
        repartida = lotes_por_lados(manzana, metro, semilla_cuadra, poligono)
        if repartida is None:
            return False
        etiquetas, lotes = repartida
        zonas = ndimage.find_objects(etiquetas)
        piezas = []
        for k, lote in lotes.items():
            zona = zonas[k - 1]
            if zona is None:
                continue
            mascara = etiquetas[zona] == k
            if publico is not None:
                pisado = mascara & publico[zona]
                if pisado.any() and pisado.sum() < CEDE_DESDE * mascara.sum():
                    mascara = mascara & ~pisado
            if mascara.sum() < area_min_px or lote['frente'] < FRENTE_MINIMO:
                continue
            piezas.append((lote, mascara, (x + zona[1].start, y + zona[0].start)))
        recorte = None if poligono is None else Polygon(np.asarray(poligono) + (x, y))
        huellas = huellas_de_casas([(m, o) for _, m, o in piezas], tolerancia_px, recorte)
        figuras = [(lote, figura) for (lote, _, _), figura in zip(piezas, huellas)]
    finales = []
    for lote, figura in figuras:
        if figura is None or (exactas is None and figura.area < area_min_px):
            continue
        if poligono is not None and exactas is not None:   # las del reparto raster ya salen recortadas
            figura = figura.intersection(Polygon(np.asarray(poligono) + (x, y)))
            if figura.is_empty or figura.geom_type != 'Polygon' or figura.area < area_min_px:
                continue
        finales.append((lote, figura))
    for lote, figura in finales:
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
    if poligono is not None:
        manzana = manzana & _relleno(poligono, manzana.shape)
    if (manzana & (clases == CLASE['edificado'])).sum() < area_min_px:
        return
    salida['n_cuadras'] += 1
    direccion = direccion_de_manzana(manzana, metro)
    modelo = (cuadra_modelo and (poligono is not None or direccion[1] is not None)
              and es_de_solo_casas(clases, manzana, metro, CLASE['edificado'], CLASE['publico']))
    azar = semilla_de(int(x) + 17, int(y) + 29) / 0xFFFF
    if modelo and casas_por_lados(manzana, origen, salida, area_min_px, tolerancia_px, distancia_m, metro, crujia_de_cuadra(azar),
                                  poligono, None if salida.get('_antes') else clases == CLASE['publico']):
        return
    lotes = lotes_de_manzana(manzana, metro, semilla_de(int(x), int(y)), direccion)
    # de toda la manzana: las líneas de fachada y el fondo de la crujía (la cumbrera corre seguida por la cuadra)
    frentes = frentes_de_manzana(manzana, direccion[0][0], metro)
    crujia = crujia_de_cuadra(azar) if modelo else CRUJIA_M[0] + (CRUJIA_M[1] - CRUJIA_M[0]) * azar
    casas = _casas_de_manzana(clases, manzana, lotes, metro, modelo)
    # una casa suelta o un par de casas no son una manzana con esquinas a la calle
    hay_esquinas = len(np.unique(casas)) - 1 >= CASAS_PARA_ESQUINA
    de_esquina = casas_de_esquina(casas, esquinas_de_manzana(manzana, metro), RADIO_ESQUINA_M / metro) if hay_esquinas else set()
    piezas = [(casa, zona) for casa, zona in enumerate(ndimage.find_objects(casas), start=1)
              if zona is not None and (casas[zona] == casa).sum() >= area_min_px]
    recorte = None if poligono is None else Polygon(np.asarray(poligono) + (x, y))
    huellas = huellas_de_casas([(casas[zona] == casa, (x + zona[1].start, y + zona[0].start)) for casa, zona in piezas],
                               tolerancia_px, recorte)
    for (casa, zona), figura in zip(piezas, huellas):
        # el área mínima ya la pasó la máscara; recortada por la cara, la huella la vuelve a pasar (como antes)
        if figura is None or (recorte is not None and figura.area < area_min_px):
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
    de 1936, ajustados a las fachadas. Los pedazos de manzana de una misma cara (un pasaje del plano que la
    red de hoy no tiene los separa) comparten el polígono, ajustado a todos juntos. Solo para la cuadra que su
    polígono cubre."""
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
        x0 = min(cajas[e][0] for e, _ in suyas)
        y0 = min(cajas[e][1] for e, _ in suyas)
        x1 = max(cajas[e][0] + cajas[e][2] for e, _ in suyas)
        y1 = max(cajas[e][1] + cajas[e][3] for e, _ in suyas)
        juntas = np.zeros((y1 - y0, x1 - x0), bool)
        for etiqueta, parte in suyas:
            x, y, w, h = cajas[etiqueta]
            juntas[y - y0:y - y0 + h, x - x0:x - x0 + w] |= parte
        poligono = ajustar_cara(red.caras36[cara], juntas, (x0, y0), metro)
        if poligono is None:
            continue
        for etiqueta, parte in suyas:
            x, y = cajas[etiqueta][:2]
            propio = poligono - (x - x0, y - y0)
            if (_relleno(propio, parte.shape) & parte).sum() >= COBERTURA_DE_CARA * parte.sum():
                salida[etiqueta] = propio
    return salida


def _mascara_de(poligonos, origen, forma):
    """Máscara (forma de la ventana con esquina en `origen`) de lo que cubren los polígonos (px del mosaico)."""
    mascara = np.zeros(forma, np.uint8)
    for p in poligonos:
        cv2.fillPoly(mascara, [np.round((np.asarray(p.exterior.coords) - origen) * 16).astype(np.int32)], 1, shift=4)
    return mascara > 0


MARGEN_OCUPADO_PX = 1.0     # una cuadra de OSM no llega a menos de esto de lo que ocupa la reconstrucción


def _cuadras_de_antes(red, edificado72, clases, cuadras, areas, metro, completas=(), ocupado=()):
    """Las cuadras de 1772 que el plano de 1936 muestra abiertas (una calle nueva que las parte, un pasaje o
    una plaza que les entra): por cada cara de la red sin los tramos nuevos, su polígono ajustado a las
    fachadas con lo abierto adentro vuelto a edificar, salvo lo que 1772 tampoco edifica (una plaza vieja).
    → [{miembros: las cuadras de 1936 que reemplaza, cuadra: máscara, origen: (x, y), clases: las de antes,
    poligono, abierto: máscara de lo que se abrió}]. Solo las que salen como cuadra modelo repartida por lados.
    `ocupado`: los anillos de la referencia histórica; una cara que cae sobre ellos la arma la referencia, y de una que
    los pisa poco se recorta lo que cae dentro de ellos (la referencia ya lo reconstruye)."""
    alto, ancho = clases.shape
    salida = []
    for cara in red.caras72:
        if not CUADRA_MINIMA_M2 <= cara.area * metro ** 2 <= CARA_MAXIMA_M2:
            continue
        if sum(cara.intersection(p).area for p in ocupado) >= SOBRE_REFERENCIA * cara.area:
            continue
        bx0, by0, bx1, by1 = cara.bounds
        x0, y0, x1, y1 = max(0, int(bx0)), max(0, int(by0)), min(ancho, int(bx1) + 2), min(alto, int(by1) + 2)
        documentada = next((p for p in completas if es_completa(cara, [p])), None)
        if x1 - x0 < 4 or y1 - y0 < 4:
            continue
        if documentada is None and not edificado72[y0:y1, x0:x1].any():
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
        if documentada is not None:
            evidencia = _relleno(np.asarray(documentada.exterior.coords) - (x0, y0), cl.shape)
            plaza_vieja &= ~evidencia
        # un píxel de margen hacia lo ocupado: las casas salen de la máscara con medio píxel de buffer (poligono_de)
        cuadra = en_poligono & (de_manzana | calle) & ~plaza_vieja & ~_mascara_de([o.buffer(MARGEN_OCUPADO_PX, join_style='mitre')
                                                                                for o in ocupado], (x0, y0), cl.shape)
        abierto = _sin_astillas(cuadra & calle, metro)
        if documentada is None and abierto.sum() * metro ** 2 < ABIERTO_MINIMO_M2:
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
                       'poligono': poligono, 'abierto': abierto & cuadra, 'minimo': 2 if documentada is not None else 1})
    return salida


SOBRE_REFERENCIA = 0.3     # fracción de una cara de OSM sobre la referencia desde la que la cuadra la arma la referencia
RETIRO_REFERENCIA_M = 3.0  # si las fachadas de 1936 no dan el contorno, el anillo de ejes se encoge esto (ancho inferido)


def _ventana(poligono, forma):
    alto, ancho = forma
    bx0, by0, bx1, by1 = poligono.bounds
    return max(0, int(bx0)), max(0, int(by0)), min(ancho, int(bx1) + 2), min(alto, int(by1) + 2)


def _de_referencia(r, clases, metro):
    """(origen, cuadra sin asignar, abierto, polígono) de una cuadra de la referencia, o None si no cabe."""
    x0, y0, x1, y1 = _ventana(r['poligono'], clases.shape)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None
    cl = clases[y0:y1, x0:x1]
    dentro = np.zeros(cl.shape, np.uint8)
    cv2.fillPoly(dentro, [np.round((np.asarray(r['poligono'].exterior.coords) - (x0, y0)) * 16).astype(np.int32)], 1, shift=4)
    dentro = dentro > 0
    de_manzana = np.isin(cl, DE_LA_MANZANA)
    poligono = ajustar_cara(r['poligono'], dentro & de_manzana, (x0, y0), metro)
    if poligono is None:
        encogido = r['poligono'].buffer(-RETIRO_REFERENCIA_M / metro, join_style='mitre')
        if encogido.is_empty or encogido.geom_type != 'Polygon':
            return None
        poligono = np.asarray(encogido.exterior.coords)[:-1] - (x0, y0)
    en_poligono = _relleno(poligono, cl.shape) & dentro
    calle = cl == CLASE['calle']
    cuadra = en_poligono & (de_manzana | calle) if r['rellenar'] else en_poligono & de_manzana
    return (x0, y0), cuadra, _sin_astillas(cuadra & calle, metro) & cuadra, poligono


def _cuadras_de_referencia(referencia, clases, cuadras, areas, metro, edificado=(), reservas=()):
    """Las cuadras de 1772 de la referencia histórica aprobada (cuadras_historicas.cargar_referencia): el anillo de
    ejes de la unidad, ajustado a las fachadas (o encogido si no las hay), determina el contorno; nada de la cara de
    OSM ni de la máscara de color. Cada manzana de 1936 que cae sobre la referencia es de la unidad que más la cubre
    (sus casas de 1936 no viven en 1772); las demás unidades igual edifican su parte. → grupos como los de
    _cuadras_de_antes, con `minimo` 2 (documentadas en 1772), `hasta` 2 (ceden a 1936 desde 1843: la referencia
    describe 1772) y `referencia` (el ID de la unidad). `edificado`: lo edificado revisado del original de las unidades
    pendientes (cuadras_historicas.cargar_edificado): cada mancha es una cuadra de 1772 entera edificada; se resuelve
    junto con las de anillo, así una manzana de 1936 nunca queda con dos grupos."""
    candidatas = []
    for r in referencia:
        # una parcial con lo edificado revisado se arma por sus manchas rojas, como las pendientes: las huertas
        # del original quedan sin casas
        armada = _de_referencia(r, clases, metro)
        if r.get('edificado'):
            # su anillo decide qué manzanas de 1936 reemplaza (sus casas de 1936 no viven en 1772), sin casas propias
            if armada is not None:
                candidatas.append(({'id': r['id'], 'rellenar': False, 'rol': 'dueno'}, *armada))
            for figura in r['edificado']:
                pieza = _de_edificado(figura.buffer(HOLGURA_EDIFICADO_M / metro), clases, metro)
                if pieza is not None:
                    candidatas.append(({'id': r['id'], 'rellenar': True, 'rol': 'casas'}, *pieza))
        elif armada is not None:
            candidatas.append((r, *armada))
    for e in edificado:
        for figura in e['poligonos']:
            pieza = _de_edificado(figura, clases, metro)
            if pieza is not None:
                candidatas.append(({'id': e['id'], 'rellenar': True, 'rol': 'casas'}, *pieza))
    if reservas:
        # la planta de un hito en pie en 1772 es su reserva de ocupación: ninguna casa de 1772 la cruza (T33j.4b)
        candidatas = [(r, o, cuadra & ~_mascara_de(reservas, o, cuadra.shape), abierto & ~_mascara_de(reservas, o, cuadra.shape), p)
                      for r, o, cuadra, abierto, p in candidatas]
    candidatas = _sin_pisarse(candidatas)
    # qué manzanas de 1936 son de la referencia lo deciden todas las candidatas; el dueño, solo una aceptada (si la que
    # más la cubre no pasa la validación, la manzana pasa a otra: sus casas de 1936 nunca conviven con la reconstrucción)
    de_toda, _ = _duenos(candidatas, range(len(candidatas)), cuadras, areas)
    aceptadas = list(range(len(candidatas)))
    while True:
        _, mejor = _duenos(candidatas, aceptadas, cuadras, {e: 0 for e in de_toda})
        de_referencia = set(mejor)
        salida, rechazadas = [], []
        for k in aceptadas:
            grupo = _grupo_de_referencia(candidatas[k], clases, cuadras, de_referencia, metro)
            if grupo is None:
                rechazadas.append(k)
            else:
                salida.append({**grupo, 'miembros': {e for e in de_referencia if mejor[e] == k}})
        # un dueño sin ninguna mancha con casas no reemplaza nada: su manzana de 1936 sigue en pie
        con_casas = {g['referencia'] for g in salida if g['cuadra'].any()}
        rechazadas += [k for k in aceptadas if candidatas[k][0].get('rol') == 'dueno'
                       and candidatas[k][0]['id'] not in con_casas and k not in rechazadas]
        if not rechazadas:
            return salida
        # una rechazada no es dueña de nada: se reparte de nuevo entre las que quedan
        aceptadas = [k for k in aceptadas if k not in rechazadas]


def _sin_pisarse(candidatas):
    """Las candidatas con casas (rol 'casas': manchas rojas) sin lo que ya ocupan las anteriores: dos manchas que el
    calce lleva una sobre otra, o una esquina viva sobre la vecina, no arman dos casas en el mismo lugar (T33j.5c)."""
    puestas, salida = [], []
    for r, (x0, y0), cuadra, abierto, p in candidatas:
        if r.get('rol') == 'casas':
            alto, ancho = cuadra.shape
            cuadra = cuadra.copy()
            for (px, py), otra in puestas:
                oa, ob = otra.shape
                fx0, fy0, fx1, fy1 = max(x0, px), max(y0, py), min(x0 + ancho, px + ob), min(y0 + alto, py + oa)
                if fx0 < fx1 and fy0 < fy1:
                    cuadra[fy0 - y0:fy1 - y0, fx0 - x0:fx1 - x0] &= ~otra[fy0 - py:fy1 - py, fx0 - px:fx1 - px]
            puestas.append(((x0, y0), cuadra))
            abierto = abierto & cuadra
        salida.append((r, (x0, y0), cuadra, abierto, p))
    return salida


HOLGURA_EDIFICADO_M = 1.0   # lo rojo llevado a 1936 se ensancha esto: el borde del dibujo no deja sin casas su frente
LADOS_MAXIMOS = 10          # como ajustar_cara: un polígono de más lados no se reparte por lados
EDIFICADO_MINIMO_M2 = 20.0  # una mancha roja más chica es una mota del dibujo, no un edificio


CHAFLAN_MAXIMO_M = 6.0      # un lado más corto que esto entre dos largos es un chaflán del dibujo o del calce
ALCANCE_CHAFLAN_M = 4.0     # … si la esquina viva (donde se cruzan sus vecinos) queda a menos de esto


def _sin_chaflanes(poligono, metro):
    """El polígono con cada chaflán cambiado por la esquina viva donde se cruzan sus dos lados vecinos (T33j.5c). El
    dibujo de 1772 y el calce redondean las esquinas de lo rojo: un lado de pocos metros en diagonal es un lado más del
    reparto, y sus casas quedan en cuña mirando a la esquina. Una L o un entrante de verdad (lados largos) no se tocan."""
    corto, alcance = CHAFLAN_MAXIMO_M / metro, ALCANCE_CHAFLAN_M / metro
    p = [np.asarray(q, float) for q in list(poligono.exterior.coords)[:-1]]
    cambio = True
    while cambio and len(p) > 4:
        cambio = False
        n = len(p)
        for i in range(n):
            a, b, c, d = p[i - 1], p[i], p[(i + 1) % n], p[(i + 2) % n]
            lado = np.hypot(*(c - b))
            if lado >= corto or np.hypot(*(b - a)) <= lado or np.hypot(*(d - c)) <= lado:
                continue
            u, w = b - a, d - c
            det = u[0] * w[1] - u[1] * w[0]
            if abs(det) < 1e-9:
                continue
            s = ((c - a)[0] * w[1] - (c - a)[1] * w[0]) / det
            viva = a + s * u
            if np.hypot(*(viva - (b + c) / 2)) > alcance:
                continue
            nuevo = [q for k, q in enumerate(p) if k not in (i, (i + 1) % n)]
            nuevo.insert(i if (i + 1) % n else 0, viva)
            candidato = Polygon(nuevo)
            if candidato.is_valid and candidato.area >= poligono.area * 0.99:
                p, cambio = nuevo, True
                break
    salida = Polygon(p)
    return salida if salida.is_valid else poligono


def _de_edificado(figura, clases, metro):
    """(origen, cuadra, abierto, polígono) de una mancha roja del original llevada a 1936, o None si no cabe. Sus
    chaflanes se cambian por esquinas vivas (_sin_chaflanes) y la cuadra las incluye, sin entrar a la calle."""
    if figura.area * metro ** 2 < EDIFICADO_MINIMO_M2:
        return None
    x0, y0, x1, y1 = _ventana(figura.buffer(ALCANCE_CHAFLAN_M / metro), clases.shape)
    if x1 - x0 < 4 or y1 - y0 < 4:
        return None
    simple = figura
    for tolerancia_m in (0.5, 1, 2, 3, 4):
        simple = figura.simplify(tolerancia_m / metro)
        if len(simple.exterior.coords) - 1 <= LADOS_MAXIMOS:
            break
    if simple.geom_type == 'Polygon':
        simple = _sin_chaflanes(simple, metro)
    lados = simple.geom_type == 'Polygon' and len(simple.exterior.coords) - 1 <= LADOS_MAXIMOS
    cl = clases[y0:y1, x0:x1]
    calle = cl == CLASE['calle']
    # lo rojo revisado es edificado de 1772 sea lo que sea en 1936 (un parque, una plaza o un edificio público posteriores)
    cuadra = _mascara_de([figura], (x0, y0), cl.shape)
    if lados:
        cuadra |= _mascara_de([simple], (x0, y0), cl.shape) & ~calle   # las esquinas vivas, nunca en la calle
    # sin un polígono de pocos lados, la mancha se reparte por su máscara (techos_de_manzana sin polígono)
    return (x0, y0), cuadra, _sin_astillas(cuadra & calle, metro) & cuadra, \
        (np.asarray(simple.exterior.coords)[:-1] - (x0, y0) if lados else None)


def _cuadras_de_edificado(edificado, clases, cuadras, areas, metro):
    """Las cuadras de 1772 de lo edificado revisado de las pendientes, solas (ver _cuadras_de_referencia)."""
    return _cuadras_de_referencia([], clases, cuadras, areas, metro, edificado)


def _duenos(candidatas, aceptadas, cuadras, areas):
    """(manzanas de 1936 que la referencia cubre en un 50 % o más, {manzana: la candidata que más la cubre})."""
    cubierto, mejor = {}, {}
    for k in aceptadas:
        _r, (x0, y0), cuadra, _abierto, _p = candidatas[k]
        if _r.get('rol') == 'casas':
            continue   # una mancha roja edifica, pero no decide qué manzanas de 1936 reemplaza
        alto, ancho = cuadra.shape
        cuenta = np.bincount(cuadras[y0:y0 + alto, x0:x0 + ancho][cuadra])
        for e in np.flatnonzero(cuenta):
            if e > 0:
                cubierto[int(e)] = cubierto.get(int(e), 0) + int(cuenta[e])
                if cuenta[e] > mejor.get(int(e), (None, 0))[1]:
                    mejor[int(e)] = (k, int(cuenta[e]))
    de_referencia = {e for e, n in cubierto.items() if n >= 0.5 * areas.get(e, np.inf)}
    return de_referencia, {e: mejor[e][0] for e in de_referencia}


def _grupo_de_referencia(candidata, clases, cuadras, de_referencia, metro):
    """El grupo de una candidata (sin miembros) si sale como cuadra de solo casas repartida por lados, o None."""
    r, (x0, y0), cuadra, abierto, poligono = candidata
    alto, ancho = cuadra.shape
    cl = clases[y0:y0 + alto, x0:x0 + ancho]
    base = {'origen': (x0, y0), 'poligono': poligono, 'minimo': 2, 'hasta': 2, 'referencia': r['id']}
    if r.get('rol') == 'dueno':
        nada = np.zeros_like(cuadra)
        return {**base, 'cuadra': nada, 'clases': cl, 'abierto': nada}
    if r.get('rol') != 'casas':
        suyas = cuadras[y0:y0 + alto, x0:x0 + ancho]
        cuadra = cuadra & ((suyas == 0) | np.isin(suyas, list(de_referencia)))
    if r.get('rol') == 'casas':
        de_antes = np.where(cuadra, CLASE['edificado'], cl).astype(cl.dtype)   # una mancha roja, entera edificada
    elif r['rellenar']:
        # una cuadra continua de 1772: lo abierto y lo público de 1936 (posterior; sus techos nacen desde 1889) se edifican
        de_antes = np.where(cuadra & (cl == CLASE['publico']), CLASE['edificado'], _clases_de_antes(cl, cuadra)).astype(cl.dtype)
    else:
        de_antes = np.where(cuadra, cl, CLASE['calle']).astype(cl.dtype)
    # una mancha roja es un edificio, no una cuadra modelo: no pide el tamaño ni el lleno de es_de_solo_casas
    if not cuadra.any() or (r.get('rol') != 'casas'
                            and not es_de_solo_casas(de_antes, cuadra, metro, CLASE['edificado'], CLASE['publico'])):
        return None
    if poligono is None or lotes_por_lados(cuadra, metro, 0, poligono) is None:
        if r.get('rol') != 'casas':
            return None
        poligono = None   # una mancha roja que no se reparte por lados se reparte por su máscara
    return {**base, 'cuadra': cuadra, 'clases': de_antes, 'abierto': abierto & cuadra}


NUCLEO_DE_CALZADA_M = 4.0   # ancho inferido de lo que ninguna calle de 1772 deja de tener (como cierre_fase3)


def marcar_calzada(salida, ejes, metro, area_minima_m2=1.0):
    """[0/1 por techo]: 1 si su huella pisa (desde `area_minima_m2`) el núcleo de calzada de alguna calle de 1772 de la
    referencia (`ejes`, cuadras_historicas.ejes_de_calzada). tools/geo/epocas.py no la deja vivir en 1772."""
    from shapely.geometry import Polygon as _Poligono
    from shapely.strtree import STRtree
    nucleos = [e.buffer(NUCLEO_DE_CALZADA_M / 2 / metro, cap_style='flat') for e in ejes]
    arbol = STRtree(nucleos) if nucleos else None
    v, marcas = salida['vertices'], []
    for inicio, n, *_ in salida['techos']:
        casa = _Poligono([(v[2 * i], v[2 * i + 1]) for i in range(inicio, inicio + n)])
        pisa = arbol is not None and casa.is_valid and any(
            casa.intersection(nucleos[j]).area * metro ** 2 >= area_minima_m2 for j in arbol.query(casa, predicate='intersects'))
        marcas.append(int(pisa))
    return marcas


EPOCA_1772 = 1
DOBLE_MINIMO = 0.10         # como cierre_fase4: una casa que pisa más que esto de su huella sobre la planta de un hito


def plantas_de_1772(hitos):
    """Las plantas (polígonos en px del mosaico) de los hitos modelados en pie en 1772 (tools/hitos-planta.mjs): su
    reserva de ocupación. Ninguna casa de 1772 las cruza (T33j.4b)."""
    from shapely.geometry import Polygon as _Poligono
    return [_Poligono(p) for h in hitos if h['nace'] <= EPOCA_1772 and (h['muere'] == 0 or h['muere'] > EPOCA_1772)
            for p in h['planta']]


TAPADA_MINIMA_M2 = 0.01     # como la puerta de la fase 5: una casa de 1936 que pisa esto de una de 1772 no vive en 1772


def marcar_tapadas(salida, metro, area_minima_m2=TAPADA_MINIMA_M2, plantas=()):
    """[0/1 por techo]: 1 si es una casa de 1936 («antes» 0) que queda debajo de una casa de la reconstrucción de 1772 de
    la referencia (grupo con `hasta`), o que pisa más del 10 % de su huella sobre la planta de un hito en pie en 1772
    (`plantas`, su reserva de ocupación): no puede vivir en 1772. tools/geo/epocas.py la saca de 1772."""
    from shapely.geometry import Polygon as _Poligono
    from shapely.strtree import STRtree
    v, hasta = salida['vertices'], salida.get('juntas_hasta', [])
    figuras = [_Poligono([(v[2 * i], v[2 * i + 1]) for i in range(t[0], t[0] + t[1])]) for t in salida['techos']]
    de_1772 = [figuras[k] for k, (a, j) in enumerate(zip(salida['antes'], salida['junta']))
               if a and 0 <= j < len(hasta) and hasta[j] and figuras[k].is_valid]
    arbol = STRtree(de_1772) if de_1772 else None
    marcas = []
    for k, f in enumerate(figuras):
        de_1936 = k < len(salida['antes']) and not salida['antes'][k] and f.is_valid
        tapada = de_1936 and arbol is not None and any(
            f.intersection(de_1772[j]).area * metro ** 2 >= area_minima_m2 for j in arbol.query(f, predicate='intersects'))
        en_hito = de_1936 and any(f.intersection(p).area > DOBLE_MINIMO * f.area for p in plantas)
        marcas.append(int(tapada or en_hito))
    return marcas


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
    salida = {'vertices': [], 'techos': [], 'esquinas': [], 'cuadras': [], 'cede': [], 'junta': [], 'antes': [], 'juntas': [], 'juntas_minimo': [],
              'juntas_hasta': [],
              'manzanas': 0, 'marcos': [], 'alas': [], 'publicos': [], 'n_cuadras': 0}

    def distancia_m(f):
        return math.hypot(f.centroid.x - plaza[0], f.centroid.y - plaza[1]) * metro

    con_red = Red(red['tramos']) if red is not None and cuadra_modelo else None
    de_1936 = None
    if con_red is not None:
        grosor = ANCHO_DE_CORTE_M / metro
        calles_hoy = mascara_de_lineas(con_red.lineas(), clases.shape, grosor)
        # Un píxel extra por lado compensa el buffer de poligono_de al vectorizar.
        de_1936 = mascara_de_lineas(con_red.lineas(solo_de_1936=True), clases.shape, 2 * RETIRO_MINIMO_M / metro + 2)
    techos_publicos(clases, salida, area_min_px, tolerancia_px, metro)
    manzanas = np.isin(clases, DE_LA_MANZANA).astype(np.uint8)
    if de_1936 is not None:
        # Una calle reconocida queda libre aunque no parta la máscara en dos
        # componentes grandes (p. ej., casas de un solo lado junto a un solar).
        manzanas[de_1936] = 0
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
        referencia, revisado = red.get('referencia72', ()), red.get('edificado_revisado', ())
        # reservas de 1772: las plantas de los hitos en pie y los núcleos de calzada de las calles conocidas (las casas se
        # reparten al borde de la calle, no a través de ella)
        reservas = list(red.get('reservas72', ())) + [e.buffer(NUCLEO_DE_CALZADA_M / 2 / metro + 1, cap_style='flat')
                                                     for e in red.get('calzada72', ())]
        antes = _cuadras_de_referencia(referencia, clases, cuadras, areas, metro, revisado, reservas)
        tomadas = {m for g in antes for m in g['miembros']}
        # lo que ya ocupa la reconstrucción, con las esquinas vivas de las manchas (_sin_chaflanes): OSM no lo repite
        vivas = [Polygon(np.asarray(g['poligono']) + g['origen']) for g in antes if g.get('poligono') is not None]
        ocupado = [r['poligono'] for r in referencia] + [p for e in revisado for p in e['poligonos']] + vivas + list(reservas)
        for g in _cuadras_de_antes(con_red, np.asarray(red['edificado72'], bool), clases, cuadras, areas, metro,
                                   red.get('completas72', ()), ocupado):
            antes.append({**g, 'miembros': g['miembros'] - tomadas})
    de_grupo = {m: j for j, grupo in enumerate(antes) for m in grupo['miembros']}
    for etiqueta, parte in lista:
        x, y, w, h = cajas[etiqueta]
        salida['_junta'] = de_grupo.get(etiqueta, -1)
        techos_de_manzana(clases[y:y + h, x:x + w], parte, (x, y), salida, area_min_px, tolerancia_px, distancia_m, metro,
                          cuadra_modelo, poligonos.get(etiqueta))
    salida['_antes'] = 1
    for j, grupo in enumerate(antes):
        salida['_junta'] = j
        if grupo['cuadra'].any():   # el dueño de una parcial no arma casas: solo reemplaza sus manzanas de 1936
            techos_de_manzana(grupo['clases'], grupo['cuadra'], grupo['origen'], salida, area_min_px, tolerancia_px,
                              distancia_m, metro, cuadra_modelo, grupo['poligono'])
        salida['juntas'].append(_contornos_de(grupo['abierto'], grupo['origen']))
        salida['juntas_minimo'].append(grupo['minimo'])
        salida['juntas_hasta'].append(grupo.get('hasta', 0))
    if red is not None and red.get('calzada72'):
        salida['calzada72'] = marcar_calzada(salida, red['calzada72'], metro)
    if red is not None and red.get('referencia72') is not None:
        salida['tapada72'] = marcar_tapadas(salida, metro, plantas=red.get('reservas72', ()))
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
    if red is not None:
        from cuadras_historicas import cargar, cargar_referencia_de_archivos
        red['completas72'] = cargar()
        import subprocess
        raiz = Path(__file__).resolve().parents[2]
        hitos = json.loads(subprocess.run(['node', str(raiz / 'tools' / 'hitos-planta.mjs')], check=True, capture_output=True,
                                          text=True, cwd=raiz).stdout)
        red['reservas72'] = plantas_de_1772(hitos)
        red['referencia72'], red['calzada72'], red['edificado_revisado'] = cargar_referencia_de_archivos(
            Path(__file__).resolve().parents[2] / 'specs' / 'auditoria-1772')
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
