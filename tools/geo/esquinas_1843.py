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
        if d.get('nombre'):
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


def _loo_desplegado(anclas, gcps, metro, suavizado):
    """Error dejando uno fuera de cada ancla en el calce desplegado: se ajusta el TPS con todas sus GCP menos la del
    ancla (la del mismo `id`; si el ancla cae sobre una semilla, que config_por_identidad no repite, esa semilla) y
    se mide en el destino del ancla. None si alguna ancla no es GCP de ese calce (el calce aún no las usa)."""
    from calce import Calce

    if len(gcps) < 5:
        return None
    por_id = {g['id']: k for k, g in enumerate(gcps) if g.get('id')}
    viejo = np.array([[g['px'], g['py']] for g in gcps], float)
    salida = {}
    for a in anclas:
        k = por_id.get(a['id'])
        if k is None:   # ¿sobre una semilla (GCP manual sin id: las de la plaza)?
            d = np.hypot(viejo[:, 0] - a['px'], viejo[:, 1] - a['py'])
            cerca = [j for j in np.argsort(d) if d[j] < TOLERANCIA_SEMILLA_PX and gcps[j].get('manual') and not gcps[j].get('id')]
            if not cerca:
                return None
            k = int(cerca[0])
        resto = gcps[:k] + gcps[k + 1:]
        x, y = Calce.ajustar(resto, metro, suavizado).a_1936(np.array([a['px']], float), np.array([a['py']], float))
        salida[a['id']] = float(np.hypot(np.asarray(x)[0] - a['x36'], np.asarray(y)[0] - a['y36'])) * metro
    return salida


def medir(anclas, gcps_vigentes, sectores, metro, suavizado=0.0):
    """Desvío del calce medido (el de `gcps_vigentes`) en cada ancla y error dejando uno fuera por sector.

    Antes se quitan las anclas que contradicen a sus vecinas (depurar_por_consistencia). El LOO es el del calce
    desplegado (sus GCP, semillas incluidas) cuando las anclas son parte de él (`metodo_loo`: «calce_desplegado»);
    si el calce medido todavía no las usa, el de un calce que solo usa las anclas («solo_anclas»). Sin anclas
    aceptadas no hay medición: el informe lo dice y conserva las omitidas."""
    from calce import Calce, residuos_loo_rapidos

    if not anclas:
        return {'anclas': 0, 'en_calce': 0, 'fuera_de_sectores': 0, 'calce_medido': None, 'calce_identidad': None,
                'metodo_loo': None, 'contradicen_a_sus_vecinas': [], 'sectores': [], 'detalle': [],
                'sin_medicion': 'ninguna esquina ancla: no hay con qué medir el calce'}
    medido = Calce.ajustar(gcps_vigentes, metro, suavizado)
    desvio = dict(zip([a['id'] for a in anclas], desvios_m(anclas, medido.a_1936, metro)))
    quedan, fuera = depurar_por_consistencia(anclas, metro, suavizado=suavizado)
    loo = _loo_desplegado(quedan, gcps_vigentes, metro, suavizado)
    metodo = 'calce_desplegado'
    if loo is None:
        metodo = 'solo_anclas'
        origen = np.array([[a['px'], a['py']] for a in quedan], float)
        destino = np.array([[a['x36'], a['y36']] for a in quedan], float)
        loo = dict(zip([a['id'] for a in quedan], residuos_loo_rapidos(origen, destino, suavizado) * metro))
    detalle = [{**a, 'sector': sector_de(a['px'], a['py'], sectores), 'en_calce': a['id'] in loo,
                'desvio_m': round(desvio[a['id']], 2),
                'loo_m': round(float(loo[a['id']]), 2) if a['id'] in loo else None}
               for a in anclas]
    medibles = [a for a in detalle if a['sector'] and a['en_calce']]
    filas = resumen_por_sector(medibles, [loo[a['id']] for a in medibles], [desvio[a['id']] for a in medibles])
    valores = np.array(list(loo.values()))
    return {'anclas': len(anclas), 'en_calce': len(quedan), 'fuera_de_sectores': sum(1 for a in detalle if not a['sector']),
            'calce_medido': {'mediana_desvio_m': round(float(np.median(list(desvio.values()))), 2),
                             'max_desvio_m': round(float(np.max(list(desvio.values()))), 2)},
            'calce_identidad': {'rms_loo_m': round(float(np.sqrt(np.mean(valores ** 2))), 2),
                                'p90_loo_m': round(float(np.percentile(valores, 90)), 2)},
            'metodo_loo': metodo, 'contradicen_a_sus_vecinas': fuera, 'sectores': filas, 'detalle': detalle}


TOLERANCIA_SEMILLA_PX = 6   # como anclas_identidad.py: un ancla a menos de esto de una semilla es el mismo cruce


def config_por_identidad(config, anclas, tol=TOLERANCIA_SEMILLA_PX):
    """Copia de la configuración del calce con las anclas por identidad y sin etapas de correlación.

    Las semillas (esquinas de la plaza) se conservan; un ancla sobre una semilla se deja fuera para no
    repetir el punto en el TPS. Devuelve (config nueva, ids dejados fuera por estar sobre una semilla)."""
    semillas = [(s['px'], s['py']) for s in config.get('semillas', [])]
    junto, nuevas = [], []
    for a in anclas:
        if any(np.hypot(a['px'] - x, a['py'] - y) < tol for x, y in semillas):
            junto.append(a['id'])
            continue
        nuevas.append({'px': a['px'], 'py': a['py'], 'x36': a['x36'], 'y36': a['y36'], 'id': a['id'],
                       'nota': f"esquina {int(a['id'][-3:])} «{a['nombre_1843']}» del plano de 1843 = «{a['nombre_1936']}» de 1936"})
    return {**config, 'etapas': [], 'anclas': nuevas}, junto


MEDIA_CUADRA_M = 55   # una cuadra con su calle mide ~110 m: más que esto al quitarla es otra esquina


def depurar_por_consistencia(anclas, metro, umbral_m=MEDIA_CUADRA_M, suavizado=0.0, minimo=6):
    """Quita, de a una, el ancla de mayor error dejando uno fuera mientras supere `umbral_m`.

    Un ancla así contradice a sus vecinas: un homónimo de 1936 en otro barrio o una lectura del cruce en la
    esquina equivocada. No se corrige: sale con su error para revisarla a ojo. Devuelve (quedan, fuera)."""
    from calce import residuos_loo_rapidos

    quedan, fuera = list(anclas), []
    while len(quedan) > minimo:
        origen = np.array([[a['px'], a['py']] for a in quedan], float)
        destino = np.array([[a['x36'], a['y36']] for a in quedan], float)
        loo = residuos_loo_rapidos(origen, destino, suavizado) * metro
        peor = int(np.argmax(loo))
        if loo[peor] <= umbral_m:
            break
        fuera.append({'id': quedan[peor]['id'], 'loo_m': round(float(loo[peor]), 1), 'motivo': 'contradice_a_sus_vecinas'})
        quedan = quedan[:peor] + quedan[peor + 1:]
    return quedan, fuera
