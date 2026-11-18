"""«Lo de hoy», parte OSM: bajar de Overpass calles, vías férreas y agua, clasificarlas y llevarlas al mosaico.

Una sola consulta por el rectángulo del mosaico de 1936 pasado a WGS84 (con un margen de 200 m), con
User-Agent genérico; la respuesta cruda se guarda y, si ya está, no se vuelve a pedir.
Datos © colaboradores de OpenStreetMap, ODbL 1.0 (fuentes/datos/osm-hoy/ficha.json).
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np

import geo1936 as geo

URL_OVERPASS = "https://overpass-api.de/api/interpreter"
USER_AGENT = "caracas-historica/0.1"
ESPERA_S = 300
REINTENTOS_S = (30, 90)  # pausas antes de reintentar un 429/502/503/504 (el servidor está ocupado)
CODIGOS_OCUPADO = {429, 502, 503, 504}

# ancho de dibujo (m) y si se ve de lejos; "mayor" = avenidas y troncales
CALLES_MAYORES = {"motorway": 22.0, "trunk": 18.0, "primary": 15.0, "secondary": 13.0, "tertiary": 11.0}
CALLES_MENORES = {"unclassified": 8.0, "residential": 8.0, "road": 8.0, "living_street": 6.0, "pedestrian": 6.0}
ANCHO_ENLACE_M = 7.0  # *_link
VIAS = {"rail": 5.0, "light_rail": 4.0, "subway": 5.0, "narrow_gauge": 4.0}
AGUAS = {"river": (15.0, True), "canal": (8.0, True), "stream": (4.0, False)}
ANCHO_COSTA_M = 6.0
ANCHO_ORILLA_M = 2.0  # borde de lagunas y embalses (además del relleno)
BAJO_TIERRA = {"yes", "culvert", "flooded"}  # tunnel=building_passage sí se ve


def bbox_wgs84(ancho_px, alto_px, transf, margen_m=200.0):
    """(sur, oeste, norte, este) en grados del mosaico entero más un margen en metros."""
    x0, y0 = geo.px_a_grid(0, 0)
    x1, y1 = geo.px_a_grid(ancho_px, alto_px)
    xs = np.array([x0 - margen_m, x1 + margen_m, x0 - margen_m, x1 + margen_m])
    ys = np.array([y0 + margen_m, y0 + margen_m, y1 - margen_m, y1 - margen_m])
    lat, lon = geo.grid_a_wgs84(xs, ys, transf)
    return float(lat.min()), float(lon.min()), float(lat.max()), float(lon.max())


def consulta(bbox):
    s, w, n, e = bbox
    mayores = "|".join(CALLES_MAYORES)
    return (
        f"[out:json][timeout:{ESPERA_S}][bbox:{s},{w},{n},{e}];\n"
        "(\n"
        f'  way["highway"~"^({mayores})(_link)?$"];\n'
        f'  way["highway"~"^({"|".join(CALLES_MENORES)})$"];\n'
        f'  way["railway"~"^({"|".join(VIAS)})$"];\n'
        f'  way["waterway"~"^({"|".join(AGUAS)})$"];\n'
        '  way["natural"~"^(water|coastline)$"];\n'
        '  relation["natural"="water"];\n'
        ");\n"
        "out geom;\n"
    )


def _pedir(pedido, abrir, dormir):
    for pausa in (*REINTENTOS_S, None):
        try:
            with abrir(pedido, timeout=ESPERA_S + 60) as r:
                return r.read()
        except urllib.error.HTTPError as err:
            if err.code not in CODIGOS_OCUPADO or pausa is None:
                raise
            print(f"  Overpass respondió {err.code}; reintento en {pausa} s")
            dormir(pausa)


def descargar(destino, bbox, forzar=False, abrir=urllib.request.urlopen, dormir=time.sleep):
    """Baja la consulta a `destino` si no está (o si se fuerza). Devuelve si bajó algo."""
    destino = Path(destino)
    if destino.exists() and not forzar:
        return False
    cuerpo = urllib.parse.urlencode({"data": consulta(bbox)}).encode()
    pedido = urllib.request.Request(URL_OVERPASS, data=cuerpo, headers={"User-Agent": USER_AGENT})
    crudo = _pedir(pedido, abrir, dormir)
    try:
        datos = json.loads(crudo)
    except ValueError as err:
        raise ValueError(f"Overpass no devolvió JSON: {crudo[:200]!r}") from err
    if not isinstance(datos, dict) or not isinstance(datos.get("elements"), list):
        raise ValueError("la respuesta de Overpass no trae 'elements'")
    # un timeout o falta de memoria llega con HTTP 200, datos parciales y el error en "remark"
    if "error" in str(datos.get("remark", "")).lower():
        raise ValueError(f"Overpass devolvió datos incompletos: {datos['remark']}")
    destino.parent.mkdir(parents=True, exist_ok=True)
    temporal = destino.with_suffix(".parcial")
    temporal.write_bytes(crudo)
    temporal.replace(destino)
    return True


def _clase(capa, ancho_m, lejos, mayor=False, area=False):
    return {"capa": capa, "ancho_m": ancho_m, "lejos": lejos, "mayor": mayor, "area": area}


def _capa_negativa(tags):
    try:
        return float(tags.get("layer", "0").split(";")[0]) < 0
    except ValueError:
        return False


def _bajo_tierra(tags):
    """Túneles y entubados; los rieles bajo tierra aunque no digan tunnel; y túneles mal etiquetados
    (en Caracas hay calles "Túnel …" sin tunnel=yes)."""
    if tags.get("tunnel") in BAJO_TIERRA or tags.get("location") == "underground":
        return True
    if "railway" in tags and _capa_negativa(tags):
        return True
    return "highway" in tags and tags.get("name", "").lower().startswith(("túnel ", "tunel "))


def clasificar(tags):
    """Capa (calle, via, agua), ancho en metros, si va de lejos y si es área; None si no se dibuja."""
    if _bajo_tierra(tags):
        return None
    h = tags.get("highway", "")
    base = h[:-5] if h.endswith("_link") else h
    if base in CALLES_MAYORES:
        return _clase("calle", ANCHO_ENLACE_M if h != base else CALLES_MAYORES[h], True, mayor=True)
    if h in CALLES_MENORES:
        return _clase("calle", CALLES_MENORES[h], False)
    if tags.get("railway") in VIAS:
        return _clase("via", VIAS[tags["railway"]], True)
    if tags.get("waterway") in AGUAS:
        ancho, lejos = AGUAS[tags["waterway"]]
        return _clase("agua", ancho, lejos)
    if tags.get("natural") == "water":
        return _clase("agua", ANCHO_ORILLA_M, True, area=True)
    if tags.get("natural") == "coastline":
        return _clase("agua", ANCHO_COSTA_M, True)
    return None


def _a_px(geometria, transf):
    validas = [g for g in geometria if g is not None]  # Overpass pone null si no conoce la posición
    lat = np.array([g["lat"] for g in validas], dtype=float)
    lon = np.array([g["lon"] for g in validas], dtype=float)
    px, py = geo.grid_a_px(*geo.wgs84_a_grid(lat, lon, transf))
    return np.c_[px, py]


def unir_anillos(tramos, tolerancia=1e-6):
    """Encadena tramos abiertos por sus puntas hasta cerrar anillos; lo que no cierra se descarta."""
    cerca = lambda a, b: np.hypot(*(a - b)) <= tolerancia  # noqa: E731
    pendientes = [np.asarray(t, float) for t in tramos if len(t) >= 2]
    anillos = []
    while pendientes:
        anillo = pendientes.pop(0)
        while not cerca(anillo[0], anillo[-1]):
            for i, t in enumerate(pendientes):
                if cerca(anillo[-1], t[0]):
                    anillo = np.r_[anillo, t[1:]]
                elif cerca(anillo[-1], t[-1]):
                    anillo = np.r_[anillo, t[::-1][1:]]
                else:
                    continue
                pendientes.pop(i)
                break
            else:
                anillo = None
                break
        if anillo is not None and len(anillo) >= 4:
            anillos.append(anillo)
    return anillos


def _lineas(el, transf, area):
    if el["type"] == "way":
        linea = _a_px(el.get("geometry") or [], transf)
        if area:
            return [linea] if len(linea) >= 4 and np.allclose(linea[0], linea[-1]) else []
        return [linea] if len(linea) >= 2 else []
    tramos = [_a_px(m["geometry"], transf) for m in el.get("members", [])
              if m.get("type") == "way" and m.get("role") in ("outer", "inner") and m.get("geometry")]
    return unir_anillos(tramos)


def elementos(datos, transf):
    """Lo dibujable de una respuesta de Overpass, con las coordenadas en píxeles del mosaico."""
    salida = []
    for el in datos.get("elements", []):
        if el.get("type") not in ("way", "relation"):
            continue
        c = clasificar(el.get("tags", {}))
        if c is None or (el["type"] == "relation" and not c["area"]):
            continue
        lineas = _lineas(el, transf, c["area"])
        if lineas:
            salida.append({**c, "id": el.get("id"), "nombre": el.get("tags", {}).get("name"), "lineas": lineas})
    return salida
