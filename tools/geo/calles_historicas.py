"""Correcciones auditables de calles vistas en los planos de 1772 y 1936."""
import numpy as np
from shapely.geometry import LineString
from shapely.ops import unary_union
from shapely.strtree import STRtree


def completar(tramos, correcciones, metro):
    """Conecta nudos existentes o corrige su tramo; nunca desplaza el resto de la red.

    Los anclajes documentados admiten hasta 5 m de cambio en OSM. Si se supera,
    el pipeline exige revisar la correspondencia en vez de inventar una conexión.
    """
    salida = [dict(t) for t in tramos]
    nudos = np.unique(np.asarray([p for t in tramos for p in t['linea']]), axis=0)
    for correccion in correcciones:
        extremos = []
        for anclaje in correccion['anclajes']:
            distancias = np.linalg.norm(nudos - anclaje, axis=1) if len(nudos) else np.array([])
            if not len(distancias) or distancias.min() * metro > 5:
                raise ValueError(f"{correccion['id']}: anclaje sin nudo a menos de 5 m: {anclaje}")
            extremos.append(nudos[np.argmin(distancias)].tolist())
        if extremos[0] == extremos[1]:
            raise ValueError(f"{correccion['id']}: los anclajes coinciden")
        coincide = lambda t: (t['linea'][0] == extremos[0] and t['linea'][-1] == extremos[1]) or (t['linea'][0] == extremos[1] and t['linea'][-1] == extremos[0])
        encontrados = [k for k, t in enumerate(salida) if coincide(t)]
        if encontrados:
            for k in encontrados:
                salida[k] = {**salida[k], 'en1936': True, 'nueva': False, 'verificada': correccion['id']}
        else:
            salida.append({'linea': extremos, 'en1936': True, 'nueva': False, 'verificada': correccion['id']})
    lineas = [LineString(t['linea']) for t in salida]
    if not lineas:
        return salida
    arbol = STRtree(lineas)
    red = unary_union(lineas)
    partes = list(red.geoms) if hasattr(red, 'geoms') else [red]
    anudadas = []
    for parte in partes:
        medio = parte.interpolate(.5, normalized=True)
        candidatas = [int(k) for k in arbol.query(medio.buffer(1e-7))
                      if lineas[int(k)].distance(medio) < 1e-7]
        if not candidatas:
            raise ValueError('tramo anudado sin procedencia')
        # La evidencia curada tiene prioridad sobre una clasificación automática.
        k = max(candidatas, key=lambda i: bool(salida[i].get('verificada')))
        anudadas.append({**salida[k], 'linea': [list(p) for p in parte.coords]})
    return anudadas
