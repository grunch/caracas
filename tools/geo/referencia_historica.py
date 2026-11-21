"""Contrato explícito de nodos y unidades de una referencia histórica.

Valida coherencia, no demuestra fidelidad: aprobar requiere inspección de fuentes.
Este módulo no convierte cajas, sondeos de color ni candidatos en construcción.
"""
from copy import deepcopy
import math
import re

from shapely.geometry import Polygon
from shapely.strtree import STRtree

OCUPACIONES = {'continua', 'parcial', 'aislada', 'terreno_libre', 'plaza', 'conjunto_especial',
               'parte_de_otra_unidad', 'descartada_no_edificacion'}   # las dos últimas, del censo de la fase 1


def _indexar(registros, clase):
    resultado = {}
    for registro in registros:
        ident = registro.get('id')
        if not isinstance(ident, str) or not ident.strip() or ident in resultado:
            raise ValueError(f'{clase}: ID vacío o duplicado')
        resultado[ident] = registro
    return resultado


def validar_referencia(referencia):
    """Rechaza contradicciones de identidad, topología o procedencia.

    Original y mosaico expresan píxeles, no metros. La tolerancia de área de
    1e-8 px² solo evita ruido numérico en intersecciones; no admite calles falsas
    ni compensa errores de calce. Las unidades pendientes también se validan.
    """
    if not isinstance(referencia.get('fuente'), str) or not referencia['fuente'].strip() \
            or not re.fullmatch(r'[0-9a-f]{64}', referencia.get('fuente_sha256', '')):
        raise ValueError('fuente y SHA-256 obligatorios')
    nodos = _indexar(referencia['nodos'], 'nodos')
    unidades = _indexar(referencia['unidades'], 'unidades')
    for campo in ('original', 'mosaico'):
        vistos = {}
        for ident, nodo in nodos.items():
            punto = nodo.get(campo)
            if not isinstance(punto, (list, tuple)) or len(punto) != 2 \
                    or not all(isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)
                               for x in punto):
                raise ValueError(f'{ident}: coordenadas inválidas en {campo}')
            if tuple(punto) in vistos:
                raise ValueError(f'{ident}: coordenada duplicada en {campo} con {vistos[tuple(punto)]}')
            vistos[tuple(punto)] = ident
    figuras = {'original': [], 'mosaico': []}
    nombres = []
    for ident, unidad in unidades.items():
        if unidad.get('estado') not in ('pendiente', 'aprobada'):
            raise ValueError(f'{ident}: estado inválido')
        if not isinstance(unidad.get('procedencia'), str) or not unidad['procedencia'].strip():
            raise ValueError(f'{ident}: procedencia obligatoria')
        if unidad.get('ocupacion') not in OCUPACIONES:
            raise ValueError(f'{ident}: ocupación inválida')
        ids = unidad['nodos']
        if ids is None:
            if unidad['estado'] == 'aprobada':
                raise ValueError(f'{ident}: unidad aprobada sin geometría')
            continue
        if len(ids) < 3 or len(set(ids)) != len(ids):
            raise ValueError(f'{ident}: anillo corto o nodos repetidos')
        if any(n not in nodos for n in ids):
            raise ValueError(f'{ident}: nodo inexistente')
        for campo in figuras:
            poligono = Polygon([nodos[n][campo] for n in ids])
            if not poligono.is_valid or poligono.area == 0:
                raise ValueError(f'{ident}: polígono inválido en {campo}')
            figuras[campo].append(poligono)
        if figuras['original'][-1].exterior.is_ccw != figuras['mosaico'][-1].exterior.is_ccw:
            raise ValueError(f'{ident}: inversión de orientación entre original y mosaico')
        nombres.append(ident)
    for campo, poligonos in figuras.items():
        arbol = STRtree(poligonos)
        for i, figura in enumerate(poligonos):
            for j in arbol.query(figura, predicate='intersects'):
                if j > i and figura.intersection(poligonos[j]).area > 1e-8:
                    raise ValueError(f'solape en {campo}: {nombres[i]} / {nombres[j]}')


def unidades_aprobadas(referencia):
    """Selección explícita; el consumidor no recibe referencias mutables al registro."""
    validar_referencia(referencia)
    return deepcopy([u for u in referencia['unidades'] if u['estado'] == 'aprobada'])
