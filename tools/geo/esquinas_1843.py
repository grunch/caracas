"""Anclas por identidad del calce de 1843 (T81, fase 1A): esquina numerada del plano de Jesurún ⇄ esquina de 1936.

El plano de 1843 imprime un número dentro de la manzana, junto a cada esquina, y la leyenda «Nombres de las
Esquinas» le da su nombre. Una esquina ancla el calce solo si su número y su cruce se leyeron con seguridad,
su nombre también, y el nombre aparece una sola vez en el diccionario de 1936 (tools/geo/esquinas). Nada
se empareja por cercanía ni por parecido: lo demás queda omitido con su motivo (specs/11, consecuencia 1).

Lógica pura: no lee archivos ni el original.
"""
import re
import unicodedata
from collections import defaultdict

import numpy as np

UMBRAL_SECTOR_M = 15        # specs/08 (heredado en specs/11): desvío mediano por sector bajo 15 m
MINIMO_ANCLAS_LOO = 2       # con una sola ancla, su LOO es una extrapolación y no controla nada
MISMA_LECTURA_PX = 8        # dos lecturas del mismo número a menos de esto son la misma (solape de cuadrantes)

ABREVIATURAS = {'sn': 'san', 's': 'san', 'sta': 'santa', 'sto': 'santo', 'dr': 'doctor', 'pte': 'puente'}
ARTICULOS = ('de las ', 'de los ', 'de la ', 'del ', 'de ', 'las ', 'los ', 'la ', 'el ')


def normalizar(nombre):
    """Clave de comparación: sin tildes, mayúsculas, puntuación, artículo inicial ni abreviaturas."""
    texto = unicodedata.normalize('NFKD', nombre).encode('ascii', 'ignore').decode().lower()
    palabras = [ABREVIATURAS.get(p, p) for p in re.sub(r'[^a-z0-9 ]', ' ', texto).split()]
    texto = ' '.join(palabras)
    cambio = True
    while cambio:
        cambio = False
        for articulo in ARTICULOS:
            if texto.startswith(articulo):
                texto, cambio = texto[len(articulo):], True
    return texto


def _por_numero(esquinas):
    grupos = defaultdict(list)
    for e in esquinas:
        grupos[e['numero']].append(e)
    return grupos


def _misma_lectura(lecturas):
    x0, y0 = lecturas[0]['cruce_px']
    return all(np.hypot(e['cruce_px'][0] - x0, e['cruce_px'][1] - y0) < MISMA_LECTURA_PX for e in lecturas)


def _motivo(lecturas, nombre, candidatas):
    if not _misma_lectura(lecturas):
        return 'numero_repetido'
    if any(e.get('lectura') != 'segura' for e in lecturas):
        return 'cruce_dudoso'
    if nombre is None:
        return 'sin_nombre'
    if nombre.get('lectura') != 'segura':
        return 'nombre_dudoso'
    if not candidatas:
        return 'sin_pareja_1936'
    if len(candidatas) > 1:
        return 'ambigua_en_1936'
    return None


def emparejar(esquinas, nombres, dic_1936):
    """(anclas, omitidas). `esquinas`: lecturas {numero, cruce_px, lectura}; `nombres`: numero → {nombre, lectura}."""
    indice = defaultdict(list)
    for d in dic_1936:
        indice[normalizar(d['nombre'])].append(d)
    anclas, omitidas = [], []
    for numero, lecturas in sorted(_por_numero(esquinas).items()):
        nombre = nombres.get(numero)
        candidatas = indice.get(normalizar(nombre['nombre']), []) if nombre else []
        motivo = _motivo(lecturas, nombre, candidatas)
        if motivo:
            omitidas.append({'numero': numero, 'motivo': motivo, 'nombre': nombre['nombre'] if nombre else None})
            continue
        px, py = lecturas[0]['cruce_px']
        destino = candidatas[0]
        anclas.append({'id': f'E1843-{numero:03d}', 'numero': numero, 'nombre_1843': nombre['nombre'],
                       'nombre_1936': destino['nombre'], 'px': px, 'py': py,
                       'x36': float(destino['px'][0]), 'y36': float(destino['px'][1])})
    return anclas, omitidas


def desvios_m(anclas, proyectar, metro):
    """Distancia, en metros sobre 1936, entre cada ancla proyectada por el calce y su esquina de 1936."""
    if not anclas:
        return []
    x, y = proyectar([a['px'] for a in anclas], [a['py'] for a in anclas])
    dx = np.asarray(x, float) - [a['x36'] for a in anclas]
    dy = np.asarray(y, float) - [a['y36'] for a in anclas]
    return [float(v) for v in np.hypot(dx, dy) * metro]


def resumen_por_sector(anclas, loo_m, desvio_m, umbral_m=UMBRAL_SECTOR_M):
    """Por sector: anclas, mediana del LOO y del desvío del calce vigente; controlado con al menos dos anclas."""
    grupos = defaultdict(lambda: ([], []))
    for a, e, d in zip(anclas, loo_m, desvio_m):
        grupos[a['sector']][0].append(e)
        grupos[a['sector']][1].append(d)
    filas = []
    for sector, (loo, desvio) in sorted(grupos.items()):
        mediana = round(float(np.median(loo)), 2)
        filas.append({'sector': sector, 'anclas': len(loo), 'mediana_loo_m': mediana,
                      'max_loo_m': round(float(np.max(loo)), 2),
                      'mediana_desvio_m': round(float(np.median(desvio)), 2),
                      'controlado': len(loo) >= MINIMO_ANCLAS_LOO, 'bajo_umbral': mediana < umbral_m})
    return filas


def sector_de(px, py, sectores):
    """Id del primer sector cuya caja (sin el solape de lectura) contiene el punto, o None."""
    for s in sectores:
        x0, y0, x1, y1 = s['caja_px']
        if x0 <= px < x1 and y0 <= py < y1:
            return s['id']
    return None


def medir(anclas, gcps_vigentes, sectores, metro, suavizado=0.0):
    """Desvío del calce vigente en cada ancla y error dejando uno fuera del calce que solo usa las anclas."""
    from calce import Calce, residuos_loo_rapidos

    vigente = Calce.ajustar(gcps_vigentes, metro, suavizado)
    desvio = desvios_m(anclas, vigente.a_1936, metro)
    origen = np.array([[a['px'], a['py']] for a in anclas], float)
    destino = np.array([[a['x36'], a['y36']] for a in anclas], float)
    loo = [float(v) for v in residuos_loo_rapidos(origen, destino, suavizado) * metro]
    detalle = [{**a, 'sector': sector_de(a['px'], a['py'], sectores),
                'desvio_vigente_m': round(d, 2), 'loo_identidad_m': round(e, 2)}
               for a, d, e in zip(anclas, desvio, loo)]
    con_sector = [(a, a_loo, a_d) for a, a_loo, a_d in zip(detalle, loo, desvio) if a['sector']]
    filas = resumen_por_sector([a for a, _, _ in con_sector], [e for _, e, _ in con_sector],
                               [d for _, _, d in con_sector])
    return {'anclas': len(anclas), 'fuera_de_sectores': len(detalle) - len(con_sector),
            'calce_vigente': {'mediana_desvio_m': round(float(np.median(desvio)), 2),
                              'max_desvio_m': round(float(np.max(desvio)), 2)},
            'calce_identidad': {'rms_loo_m': round(float(np.sqrt(np.mean(np.square(loo)))), 2),
                                'p90_loo_m': round(float(np.percentile(loo, 90)), 2)},
            'sectores': filas, 'detalle': detalle}
