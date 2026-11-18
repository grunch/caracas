#!/usr/bin/env python3
"""Segmentación del plano DCN 1936 (1:5.000) en clases de suelo.

Uso:
    segmentar.py <entrada.tif> <salida_dir> [--recorte x,y,w,h] [--escala m_por_px]
                 [--tesela px] [--trabajadores n] [--paleta ruta.json]

Salidas en <salida_dir>: clases.png (uint8, códigos en segmentar_clases.py), suelo.png
(R agua · G patio · B edificado), arboles.json ([{x, y, r}] en píxeles de la salida),
debug.jpg (original | clases) y meta.json.

Algoritmo por tesela (con halo, para poder correr sobre el mosaico completo):
 1. CIELAB; tintas por prototipo más cercano sobre el píxel crudo (negro, rojo, azul,
    verde, gris del punteado) y fondos sobre la imagen suavizada (naranja, crema).
 2. Texturas: rayado (densidad de tinta oscura + coherencia de orientación), árboles
    (manchas verdes redondas), verde sólido, cultivo (densidad de trazos verdes),
    agua (densidad azul) y cerro (punteado gris + curvas rojas, sin naranja).
 3. Base edificado / claro; la tinta (texto, bordes, cotas, tranvía) toma la clase
    del fondo más cercano para que los nombres no corten manzanas ni calles.
 4. Claro → calle / patio / terreno libre por componentes conexas tras una apertura
    (cortar zaguanes): red grande o alargada = calle; encerrado = patio.
 5. Capas en orden de prioridad y limpieza de manchas chicas.
"""
from __future__ import annotations

import argparse
import math
import os
import sys
import time
from concurrent.futures import ProcessPoolExecutor
from dataclasses import dataclass
from pathlib import Path

# las imágenes del mosaico superan el tope por omisión de OpenCV (2^30 píxeles)
os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

import cv2  # noqa: E402
import numpy as np  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

from segmentar_arboles import detectar_arboles, fuera_de, mascara_de  # noqa: E402
from segmentar_clases import (  # noqa: E402
    AGUA, CALLE, CERRO, CULTIVO, DESCONOCIDO, EDIFICADO, EDIFICIO_PUBLICO, MARGEN, VERDE,
)
from segmentar_color import (  # noqa: E402
    CLASES_FONDO, Paleta, a_lab, cargar_paleta, clasificar_rgb, detectar_tintas, suavizar_rgb,
)
from segmentar_marco import Ubicacion, detectar_margen  # noqa: E402
from segmentar_morfologia import abrir, densidad, dilatar, rellenar_desde_vecinos  # noqa: E402
from segmentar_parametros import Parametros  # noqa: E402
from segmentar_texturas import (  # noqa: E402
    detectar_agua, detectar_cerro, detectar_cultivo, detectar_rayado, detectar_verde_solido,
)
from segmentar_topologia import (  # noqa: E402
    Cortes, nucleo_de_rayado, patios_sin_edificar_alrededor, quitar_manchas, separar_claros,
)  # noqa: E402

TESELA_POR_OMISION = 3072
L_SOMBRA_VERDE = 74.0  # verde más oscuro que esto = sombreado del símbolo de árbol
ESCALA_1936_400PPI = 0.0254 / 400 * 5000  # 1:5.000 escaneado a 400 ppi ≈ 0,3175 m/px


@dataclass(frozen=True)
class Segmentacion:
    clases: np.ndarray  # uint8 (alto, ancho)
    arboles: list  # [{x, y, r}] en píxeles de la entrada


@dataclass(frozen=True)
class Capas:
    naranja: np.ndarray
    rayado: np.ndarray
    arboles: np.ndarray
    verde_solido: np.ndarray
    cultivo: np.ndarray
    agua: np.ndarray
    cerro: np.ndarray
    margen: np.ndarray


# --- una tesela ---------------------------------------------------------------------

def _validar(rgb: np.ndarray) -> None:
    if not isinstance(rgb, np.ndarray) or rgb.ndim != 3 or rgb.shape[2] != 3 or rgb.dtype != np.uint8:
        forma = getattr(rgb, "shape", None)
        raise ValueError(f"se espera una imagen RGB uint8 (alto, ancho, 3); llegó {forma}")
    if min(rgb.shape[:2]) < 8:
        raise ValueError(f"imagen demasiado chica: {rgb.shape[:2]}")


def _capas(rgb: np.ndarray, sin_datos: np.ndarray, ubic: Ubicacion, p: Parametros, paleta: Paleta) -> tuple:
    lab = a_lab(rgb)
    tintas = detectar_tintas(rgb, lab, paleta, p.l_tinta_max)
    fondo = clasificar_rgb(suavizar_rgb(rgb, p.px(p.sigma_suavizado_m)), paleta.fondos, CLASES_FONDO)
    naranja = (fondo == CLASES_FONDO.index("naranja")) & ~tintas.toda
    # en los cerros, la mezcla suavizada de curvas rojas y punteado gris parece naranja:
    # allí solo cuenta el naranja macizo (casas de verdad)
    naranja_macizo = abrir(naranja, p.radio_px(p.grosor_casa_min_m))
    cerro = detectar_cerro(tintas.gris, tintas.rojo, naranja_macizo, p)
    naranja = np.where(cerro, naranja_macizo, naranja)
    # candidatos a árbol; los que caen dentro de un campo de cultivo son trazos del campo
    sombra = tintas.negro | (tintas.verde & (lab[..., 0] < L_SOMBRA_VERDE))
    candidatos, mascara_cand = detectar_arboles(tintas.verde, sombra, p)
    verde_libre = tintas.verde & ~dilatar(mascara_cand, p.radio_px(1.0))
    cultivo = detectar_cultivo(verde_libre, p)
    verde_solido = detectar_verde_solido(verde_libre, p) & ~cultivo  # manchas densas del campo
    arboles = fuera_de(candidatos, dilatar(cultivo, p.radio_px(p.radio_arbol_max_m)))
    mascara_arboles = mascara_de(arboles, rgb.shape)
    halo_arboles = dilatar(mascara_arboles, p.radio_px(1.0))
    capas = Capas(
        naranja=naranja,
        rayado=detectar_rayado(tintas.negro & ~halo_arboles, p) & ~cerro,  # curvas a trazos y hachures
        arboles=mascara_arboles,
        verde_solido=verde_solido,
        cultivo=cultivo,
        agua=detectar_agua(tintas.azul, p),
        cerro=cerro,
        margen=detectar_margen(tintas.negro, sin_datos, ubic, p),
    )
    return capas, tintas, arboles


def _base(capas: Capas, tinta: np.ndarray, p: Parametros) -> np.ndarray:
    """Edificado / claro con la tinta rellenada desde el fondo vecino."""
    desconocido = dilatar(tinta, p.radio_px(p.dilatar_tinta_m, minimo=0)) | capas.margen
    base = np.where(capas.naranja, EDIFICADO, CALLE).astype(np.uint8)
    base[desconocido] = DESCONOCIDO
    return rellenar_desde_vecinos(base, desconocido)


def _componer(base: np.ndarray, capas: Capas, cortes: Cortes, p: Parametros) -> np.ndarray:
    tapado = capas.agua | capas.margen | capas.cultivo | capas.verde_solido | capas.cerro
    claro_total = (base == CALLE) & ~tapado
    # el borde del rayado puede haberse corrido sobre la calle: entra en la topología
    nucleo_rayado = nucleo_de_rayado(capas.rayado, p)
    claro = claro_total & ~nucleo_rayado
    topologia = separar_claros(claro, p, cortes)
    rayado = capas.rayado & ~(claro & (topologia == CALLE))
    clases = np.where(base == EDIFICADO, EDIFICADO, DESCONOCIDO).astype(np.uint8)
    clases = np.where(claro, topologia, clases)
    casas = abrir(base == EDIFICADO, p.radio_px(p.grosor_casa_min_m)) | capas.rayado
    clases[patios_sin_edificar_alrededor(clases, casas, p)] = CERRO
    no_edif = base != EDIFICADO
    clases[capas.cerro & no_edif] = CERRO
    clases[capas.cultivo & no_edif] = CULTIVO
    clases[capas.verde_solido] = VERDE
    clases[rayado] = EDIFICIO_PUBLICO
    clases = quitar_manchas(clases, p.px2(p.area_mancha_min_m2), proteger=capas.margen)
    d_arboles = densidad(capas.arboles, p.lado_ventana(p.ventana_arbolado_m))
    jardin = ((d_arboles >= p.densidad_arbolado_min) & (clases == CERRO) & ~capas.cerro) | (
        (d_arboles >= p.densidad_arbolado_calle_min) & (clases == CALLE))
    clases[jardin] = VERDE  # claro abierto con árboles densos = jardín o plaza arbolada
    clases[capas.arboles & ~rayado] = VERDE
    clases[capas.agua] = AGUA
    clases[capas.margen] = MARGEN
    return clases


def segmentar_tesela(rgb: np.ndarray, p: Parametros, paleta: Paleta, ubic: Ubicacion,
                     cortes: Cortes = Cortes(), sin_datos: np.ndarray | None = None) -> Segmentacion:
    _validar(rgb)
    if sin_datos is None:
        sin_datos = np.all(rgb == 0, axis=2)
    capas, tintas, arboles = _capas(rgb, sin_datos, ubic, p, paleta)
    base = _base(capas, tintas.toda, p)
    clases = _componer(base, capas, cortes, p)
    return Segmentacion(clases, [a.como_dict() for a in arboles])


# --- teselado -----------------------------------------------------------------------

@dataclass(frozen=True)
class Tesela:
    y0: int
    y1: int
    x0: int
    x1: int  # núcleo
    ey0: int
    ey1: int
    ex0: int
    ex1: int  # con halo


def _cortes_1d(total: int, lado: int, minimo: int) -> list[tuple[int, int]]:
    """Intervalos [ini, fin) de `lado`; un resto menor que `minimo` se suma al anterior."""
    bordes = list(range(0, total, lado)) + [total]
    if len(bordes) > 2 and bordes[-1] - bordes[-2] < minimo:
        bordes.pop(-2)
    return list(zip(bordes[:-1], bordes[1:]))


def teselas(alto: int, ancho: int, lado: int, halo: int) -> list[Tesela]:
    salida = []
    minimo = max(64, halo)
    for y0, y1 in _cortes_1d(alto, lado, minimo):
        for x0, x1 in _cortes_1d(ancho, lado, minimo):
            salida.append(Tesela(y0, y1, x0, x1, max(0, y0 - halo), min(alto, y1 + halo),
                                 max(0, x0 - halo), min(ancho, x1 + halo)))
    return salida


_IMAGEN: dict = {}  # imagen compartida con los procesos hijos (fork)


def _procesar(t: Tesela) -> tuple[Tesela, np.ndarray, list]:
    rgb, sin_datos, p, paleta = _IMAGEN["rgb"], _IMAGEN["sin_datos"], _IMAGEN["p"], _IMAGEN["paleta"]
    hoja = _IMAGEN["hoja"]
    alto, ancho = rgb.shape[:2]
    sub = np.ascontiguousarray(rgb[t.ey0:t.ey1, t.ex0:t.ex1])
    sd = None if sin_datos is None else np.ascontiguousarray(sin_datos[t.ey0:t.ey1, t.ex0:t.ex1])
    cortes = Cortes(arriba=t.ey0 > 0, abajo=t.ey1 < alto, izquierda=t.ex0 > 0, derecha=t.ex1 < ancho)
    res = segmentar_tesela(sub, p, paleta, Ubicacion(hoja.x0 + t.ex0, hoja.y0 + t.ey0, hoja.ancho_total, hoja.alto_total), cortes, sd)
    nucleo = res.clases[t.y0 - t.ey0:t.y1 - t.ey0, t.x0 - t.ex0:t.x1 - t.ex0].copy()
    arboles = []
    for a in res.arboles:
        gx, gy = a["x"] + t.ex0, a["y"] + t.ey0
        if t.x0 <= gx < t.x1 and t.y0 <= gy < t.y1:
            arboles.append({"x": round(gx, 1), "y": round(gy, 1), "r": a["r"]})
    return t, nucleo, arboles


def segmentar(rgb: np.ndarray, escala: float, paleta: Paleta | None = None, tesela: int | None = None,
              trabajadores: int = 1, sin_datos: np.ndarray | None = None,
              parametros: Parametros | None = None,
              hoja: Ubicacion | None = None) -> Segmentacion:
    """Segmenta una imagen RGB uint8 (no la modifica). `escala` en m/px.

    `hoja`: si la imagen es un recorte, su origen y el tamaño de la hoja completa
    (para saber de qué lado del marco queda el margen).
    """
    p = parametros or Parametros(escala=escala)
    if parametros is not None and not math.isclose(parametros.escala, escala):
        raise ValueError(f"escala {escala} distinta de la de los parámetros ({parametros.escala})")
    _validar(rgb)
    if sin_datos is not None and sin_datos.shape != rgb.shape[:2]:
        raise ValueError(f"sin_datos {sin_datos.shape} no coincide con la imagen {rgb.shape[:2]}")
    paleta = paleta or cargar_paleta()
    alto, ancho = rgb.shape[:2]
    lado = int(TESELA_POR_OMISION if tesela is None else tesela)
    if lado < 64:
        raise ValueError(f"tesela demasiado chica: {lado}")
    lista = teselas(alto, ancho, lado, int(math.ceil(p.px(p.halo_m))))
    hoja = hoja or Ubicacion(0, 0, ancho, alto)
    _IMAGEN.update(rgb=rgb, sin_datos=sin_datos, p=p, paleta=paleta, hoja=hoja)
    clases = np.zeros((alto, ancho), np.uint8)
    arboles: list = []
    try:
        if trabajadores > 1 and len(lista) > 1:
            import multiprocessing as mp
            with ProcessPoolExecutor(trabajadores, mp_context=mp.get_context("fork")) as pool:
                resultados = pool.map(_procesar, lista)
                for t, nucleo, arb in resultados:
                    clases[t.y0:t.y1, t.x0:t.x1] = nucleo
                    arboles.extend(arb)
        else:
            for t in lista:
                t, nucleo, arb = _procesar(t)
                clases[t.y0:t.y1, t.x0:t.x1] = nucleo
                arboles.extend(arb)
    finally:
        _IMAGEN.clear()
    return Segmentacion(clases, arboles)


# --- entrada / CLI ------------------------------------------------------------------

def _leer_tiff(ruta: Path):
    import tifffile
    try:
        return tifffile.memmap(str(ruta), mode="r")
    except (ValueError, OSError):
        return tifffile.imread(str(ruta))


def _escala_de_tiff(ruta: Path) -> float | None:
    """m/px de un GeoTIFF (ModelPixelScale) o, para un escaneo 1:5.000, de su resolución en ppi."""
    import tifffile
    with tifffile.TiffFile(str(ruta)) as tif:
        pagina = tif.pages[0]
        escala_geo = pagina.tags.get(33550)
        if escala_geo is not None:
            return float(escala_geo.value[0])
        res = pagina.tags.get(282)
        unidad = pagina.tags.get(296)
        if res is not None and unidad is not None and int(unidad.value) == 2:
            num, den = res.value
            ppi = num / den
            if ppi > 0:
                return 0.0254 / ppi * 5000
    return None


def leer_imagen(ruta: Path) -> np.ndarray:
    """Imagen (alto, ancho, 3|4) uint8 sin copiar si es un TIFF sin comprimir."""
    if not ruta.exists():
        raise FileNotFoundError(f"no existe la entrada: {ruta}")
    if ruta.suffix.lower() in (".tif", ".tiff"):
        img = _leer_tiff(ruta)
    else:
        bgr = cv2.imread(str(ruta), cv2.IMREAD_UNCHANGED)
        if bgr is None:
            raise ValueError(f"no se pudo leer la imagen: {ruta}")
        img = cv2.cvtColor(bgr, cv2.COLOR_BGRA2RGBA if bgr.ndim == 3 and bgr.shape[2] == 4 else cv2.COLOR_BGR2RGB)
    if img.ndim != 3 or img.shape[2] not in (3, 4) or img.dtype != np.uint8:
        raise ValueError(f"se espera RGB/RGBA de 8 bits; {ruta} es {img.shape} {img.dtype}")
    return img


def parsear_recorte(texto: str, alto: int, ancho: int) -> tuple[int, int, int, int]:
    try:
        x, y, w, h = (int(v) for v in texto.split(","))
    except ValueError as e:
        raise ValueError(f"recorte inválido {texto!r}: se espera x,y,w,h enteros") from e
    if w <= 0 or h <= 0 or x < 0 or y < 0 or x + w > ancho or y + h > alto:
        raise ValueError(f"recorte {texto} fuera de la imagen ({ancho}×{alto})")
    return x, y, w, h


def _argumentos(argv: list[str] | None) -> argparse.Namespace:
    ap = argparse.ArgumentParser(description="Segmenta el plano DCN 1936 en clases de suelo.")
    ap.add_argument("entrada", type=Path)
    ap.add_argument("salida_dir", type=Path)
    ap.add_argument("--recorte", help="x,y,w,h en píxeles de la entrada")
    ap.add_argument("--escala", type=float, help="metros por píxel (por omisión: del TIFF, o 0,3175)")
    ap.add_argument("--tesela", type=int, default=TESELA_POR_OMISION, help="lado de tesela en px")
    ap.add_argument("--trabajadores", type=int, default=max(1, min(4, (os.cpu_count() or 1) // 2)))
    ap.add_argument("--paleta", type=Path, help="paleta CIELAB (por omisión tools/geo/paleta-1936.json)")
    return ap.parse_args(argv)


def _escala(args: argparse.Namespace) -> float:
    if args.escala is not None:
        return args.escala
    if args.entrada.suffix.lower() in (".tif", ".tiff"):
        escala = _escala_de_tiff(args.entrada)
        if escala:
            return escala
    return ESCALA_1936_400PPI


def ejecutar(args: argparse.Namespace) -> dict:
    img = leer_imagen(args.entrada)
    alto, ancho = img.shape[:2]
    x, y, w, h = parsear_recorte(args.recorte, alto, ancho) if args.recorte else (0, 0, ancho, alto)
    sub = img[y:y + h, x:x + w]
    rgb = np.ascontiguousarray(sub[..., :3])
    sin_datos = (sub[..., 3] == 0) if sub.shape[2] == 4 else np.all(rgb == 0, axis=2)
    escala = _escala(args)
    t0 = time.perf_counter()
    res = segmentar(rgb, escala, paleta=cargar_paleta(args.paleta), tesela=args.tesela,
                    trabajadores=args.trabajadores, sin_datos=sin_datos,
                    hoja=Ubicacion(x, y, ancho, alto))
    segundos = time.perf_counter() - t0
    from segmentar_salidas import escribir_salidas
    meta = {"entrada": str(args.entrada), "recorte": [x, y, w, h], "escala_m_por_px": escala,
            "segundos": round(segundos, 2), "segundos_por_megapixel": round(segundos / (w * h / 1e6), 3)}
    escribir_salidas(args.salida_dir, rgb, res.clases, res.arboles, meta)
    return meta


def main(argv: list[str] | None = None) -> int:
    args = _argumentos(argv)
    try:
        meta = ejecutar(args)
    except (ValueError, FileNotFoundError, OSError, RuntimeError, cv2.error) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(f"listo: {args.salida_dir} ({meta['segundos']} s, {meta['segundos_por_megapixel']} s/Mpx)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
