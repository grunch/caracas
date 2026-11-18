"""Diccionario de esquinas del plano DCN 1936: nombre de cada cruce → píxel del mosaico.

En Caracas las direcciones se dan "de esquina a esquina". El plano de 1936 rotula en rojo
(tinta terracota, en cursiva y casi siempre en diagonal, en el ángulo de la manzana) el nombre
de la mayoría de las esquinas del centro. Este módulo prepara la lectura asistida:

1. Cruces: ejes de las calles (clase calle del mapa de clases, alisada y esqueletizada, con las
   ramitas cortas podadas) y sus nodos, fundidos cuando quedan a pocos píxeles → un punto por
   cruce.
2. Rótulos rojos: umbral en Lab sobre el mosaico; se quitan las manchas grandes (letras rojas de
   parroquia) y las menudas (líneas punteadas del tranvía, acentos); las letras que quedan se
   agrupan por cercanía en rótulos, con su orientación (eje principal de los píxeles).
3. Asociación: cada rótulo va al cruce más cercano a alguno de sus píxeles (los rótulos se
   escriben en la manzana, junto a su esquina).
4. Salidas para leer a ojo: una ficha por rótulo (recorte enderezado + contexto con el cruce),
   hojas de contacto y vistas del centro con el número de cada candidato.

Los nombres los lee una persona (o un agente mirando las fichas) y los escribe en un JSON de
lecturas; `componer` lo une con los candidatos en el diccionario curado
tools/geo/esquinas/1936-esquinas.json. `qa` dibuja el resultado sobre el mosaico.

Uso (desde la raíz del repo; ver tools/geo/README.md):
  python tools/geo/esquinas.py detectar --salida /tmp/esquinas
  python tools/geo/esquinas.py componer --candidatos /tmp/esquinas/candidatos.json \
      --lecturas lecturas.json --salida tools/geo/esquinas/1936-esquinas.json
  python tools/geo/esquinas.py qa --esquinas tools/geo/esquinas/1936-esquinas.json \
      --salida fuentes/derivados/1936/qa-esquinas.jpg
"""
from __future__ import annotations

import argparse
import json
import math
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path

os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

import cv2  # noqa: E402
import numpy as np  # noqa: E402
from scipy.spatial import cKDTree  # noqa: E402
from skimage.morphology import skeletonize  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

from segmentar_clases import CALLE, CERRO, DESCONOCIDO  # noqa: E402

RAIZ = Path(__file__).resolve().parents[2]
DERIVADOS = RAIZ / "fuentes/derivados/1936"
PLAZA_PX = (8968.2, 6839.0)
FUENTE = "plano DCN 1936"

# color de la tinta roja (Lab de OpenCV, a y b con desplazamiento 128)
ROJO_A_MIN = 14           # a* mínimo: las manzanas naranjas quedan en ~7
ROJO_L_MAX = 200
ROJO_PENDIENTE_B = 0.6    # a* > 0.6·b* − 5: separa el rojo del naranja/ocre
ROJO_HOLGURA_B = 5

# letras y rótulos (píxeles a 0,5 m/px)
GROSOR_LETRA_MAX = 32     # mancha más gruesa que esto: letra de parroquia, no de esquina
AREA_LETRA_MIN = 20       # menos: punto del tranvía, acento o ruido
RADIO_GRUPO = 7           # letras a menos de 2·RADIO de distancia forman un rótulo
LARGO_MIN, LARGO_MAX = 25, 300
GROSOR_MIN, GROSOR_MAX = 8, 80
PIXELES_MIN = 60
BIN_PERFIL_PX = 2         # resolución del perfil de proyección para medir la orientación

# cruces
APERTURA_PX = 5           # quita astillas finas de calle (rayado de edificios públicos)
CIERRE_PX = 9
PODA_PX = 50              # ramitas del esqueleto más cortas que esto no son calles
RADIO_NODO_PX = 7         # nodos a menos de 2·esto forman un solo cruce (cruces en dos nodos)
RAMA_MIN_PX = 8           # un nodo es cruce si salen de él 3 o más ramas de al menos esto
FUSION_PX = 15            # nodos más cercanos que esto son un solo cruce
# calle, cerro/terreno libre y desconocido: las cotas y los rótulos negros sobre la calzada
# salen como cerro o desconocido y, si no, cortan la calle justo en el cruce
CLASES_CALLE = [CALLE, CERRO, DESCONOCIDO]
DIST_MAX_PX = 90          # rótulo a más de 45 m de todo cruce: queda sin cruce

ALTO_TITULO = 22
ESCALA_FICHA = 2


@dataclass(frozen=True)
class Etiqueta:
    centro: tuple[float, float]   # (x, y) del centro del rótulo
    angulo: float                 # dirección de lectura, grados en (-90, 90], y hacia abajo
    largo: float
    grosor: float
    caja: tuple[int, int, int, int]  # x0, y0, x1, y1
    n_px: int
    puntos: np.ndarray = field(repr=False, compare=False)  # (N, 2) x, y


# ------------------------------------------------------------------ color

def mascara_roja(rgb: np.ndarray) -> np.ndarray:
    """Píxeles de tinta roja terracota (nombres de esquina), no naranja de manzana ni negro."""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.int16)
    L, a, b = lab[..., 0], lab[..., 1] - 128, lab[..., 2] - 128
    return (a >= ROJO_A_MIN) & (L < ROJO_L_MAX) & (a > ROJO_PENDIENTE_B * b - ROJO_HOLGURA_B)


# ------------------------------------------------------------------ cruces

def _disco(d: int) -> np.ndarray:
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (d, d))


def _vecinos(sk: np.ndarray) -> np.ndarray:
    k = np.ones((3, 3), np.float32)
    k[1, 1] = 0
    return cv2.filter2D(sk.astype(np.uint8), cv2.CV_16S, k, borderType=cv2.BORDER_CONSTANT)


def _podar(sk: np.ndarray, largo: int, vueltas: int = 3) -> np.ndarray:
    for _ in range(vueltas):
        n = _vecinos(sk)
        nodos = sk & (n >= 3)
        ramas = sk & ~cv2.dilate(nodos.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
        num, lab = cv2.connectedComponents(ramas.astype(np.uint8), connectivity=8)
        tam = np.bincount(lab.ravel(), minlength=num)
        con_extremo = np.unique(lab[sk & (n <= 1)])
        cortas = con_extremo[(con_extremo > 0) & (tam[con_extremo] < largo)]
        if len(cortas) == 0:
            break
        sk = skeletonize(sk & ~np.isin(lab, cortas))
    return sk


def _fundir(pts: np.ndarray, radio: float) -> np.ndarray:
    if len(pts) == 0:
        return np.zeros((0, 2))
    padre = list(range(len(pts)))

    def raiz(i):
        while padre[i] != i:
            padre[i] = padre[padre[i]]
            i = padre[i]
        return i

    for i, j in cKDTree(pts).query_pairs(radio):
        padre[raiz(i)] = raiz(j)
    grupos: dict[int, list[int]] = {}
    for i in range(len(pts)):
        grupos.setdefault(raiz(i), []).append(i)
    return np.array([pts[g].mean(axis=0) for g in grupos.values()])


def cruces(calle: np.ndarray) -> np.ndarray:
    """Puntos (x, y) de los cruces de los ejes de calle."""
    m = cv2.morphologyEx(calle.astype(np.uint8), cv2.MORPH_OPEN, _disco(APERTURA_PX))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, _disco(CIERRE_PX))
    if not m.any():
        return np.zeros((0, 2))
    sk = _podar(skeletonize(m.astype(bool)), PODA_PX)
    uno = np.ones((3, 3), np.uint8)
    zona = cv2.dilate((sk & (_vecinos(sk) >= 3)).astype(np.uint8), _disco(2 * RADIO_NODO_PX + 1))
    _, lab_r = cv2.connectedComponents((sk & ~zona.astype(bool)).astype(np.uint8), connectivity=8)
    largas = np.bincount(lab_r.ravel()) >= RAMA_MIN_PX
    n_z, lab_z, _, centros = cv2.connectedComponentsWithStats(zona, connectivity=8)
    toca = cv2.dilate(lab_z.astype(np.float32), uno).astype(np.int32)  # zona + 1 px de borde
    sel = (toca > 0) & (lab_r > 0)
    pares = np.unique(np.stack([toca[sel], lab_r[sel]], 1), axis=0)
    pares = pares[largas[pares[:, 1]]]
    grado = np.bincount(pares[:, 0], minlength=n_z)
    return _fundir(centros[np.flatnonzero(grado >= 3)], FUSION_PX)


# ------------------------------------------------------------------ rótulos

def _letras(mascara: np.ndarray) -> np.ndarray:
    """Máscara sólo con las manchas del tamaño de una letra de esquina."""
    num, lab, stats, _ = cv2.connectedComponentsWithStats(mascara.astype(np.uint8), connectivity=8)
    validas = np.zeros(num, bool)
    for i in range(1, num):
        x, y, w, h, area = stats[i]
        if area < AREA_LETRA_MIN:
            continue
        if min(w, h) > GROSOR_LETRA_MAX:  # la caja ya es gruesa: ¿lo es también rotada?
            ys, xs = np.nonzero(lab[y:y + h, x:x + w] == i)
            (_, _), (rw, rh), _ = cv2.minAreaRect(np.stack([xs, ys], 1).astype(np.float32))
            if min(rw, rh) > GROSOR_LETRA_MAX:
                continue
        validas[i] = True
    return validas[lab]


def _angulo_renglones(pts: np.ndarray) -> float:
    """Dirección de los renglones: el giro que concentra más los píxeles en franjas finas
    (perfil de proyección más picudo). A diferencia del eje principal, no se tuerce con dos
    renglones de largo distinto ("Las / Gradillas")."""
    rel = pts - pts.mean(axis=0)

    def puntaje(grados):
        t = math.radians(grados)
        v = -rel[:, 0] * math.sin(t) + rel[:, 1] * math.cos(t)
        h = np.bincount(np.floor((v - v.min()) / BIN_PERFIL_PX).astype(int))
        return float(np.sum(h.astype(float) ** 2))

    grueso = max(np.arange(-88, 92, 4.0), key=puntaje)
    return float(max(np.arange(grueso - 4, grueso + 4.01, 0.5), key=puntaje))


def _medir(pts: np.ndarray) -> tuple[tuple[float, float], float, float, float]:
    media = pts.mean(axis=0)
    t = math.radians(_angulo_renglones(pts))
    eje = np.array([math.cos(t), math.sin(t)])
    if eje[0] < 0 or (eje[0] == 0 and eje[1] > 0):
        eje = -eje
    normal = np.array([-eje[1], eje[0]])
    u = (pts - media) @ eje
    v = (pts - media) @ normal
    centro = media + eje * (u.max() + u.min()) / 2 + normal * (v.max() + v.min()) / 2
    angulo = math.degrees(math.atan2(eje[1], eje[0]))
    if angulo <= -90:
        angulo += 180
    return (float(centro[0]), float(centro[1])), angulo, float(np.ptp(u) + 1), float(np.ptp(v) + 1)


def etiquetas(mascara: np.ndarray) -> list[Etiqueta]:
    """Rótulos rojos: letras agrupadas por cercanía, con centro, orientación y tamaño."""
    letras = _letras(mascara)
    grupos = cv2.dilate(letras.astype(np.uint8), _disco(2 * RADIO_GRUPO + 1))
    num, lab = cv2.connectedComponents(grupos, connectivity=8)
    ys, xs = np.nonzero(letras)
    ids = lab[ys, xs]
    orden = np.argsort(ids, kind="stable")
    cortes = np.flatnonzero(np.diff(ids[orden])) + 1
    salida = []
    for tramo in np.split(orden, cortes):
        if len(tramo) < PIXELES_MIN:
            continue
        pts = np.stack([xs[tramo], ys[tramo]], 1).astype(float)
        centro, angulo, largo, grosor = _medir(pts)
        if not (LARGO_MIN <= largo <= LARGO_MAX and GROSOR_MIN <= grosor <= GROSOR_MAX):
            continue
        caja = (int(pts[:, 0].min()), int(pts[:, 1].min()), int(pts[:, 0].max()) + 1,
                int(pts[:, 1].max()) + 1)
        salida.append(Etiqueta(centro, angulo, largo, grosor, caja, len(tramo), pts))
    return sorted(salida, key=lambda e: (round(e.centro[1]), e.centro[0]))


# ------------------------------------------------------------------ asociación

def asociar(ets: list[Etiqueta], pts: np.ndarray, dist_max: float = DIST_MAX_PX):
    """Para cada rótulo, (índice del cruce más cercano a sus píxeles o None, distancia)."""
    if len(pts) == 0:
        return [(None, float("inf"))] * len(ets)
    arbol = cKDTree(pts)
    salida = []
    for e in ets:
        cerca = arbol.query_ball_point(e.centro, dist_max + e.largo / 2 + e.grosor / 2)
        if not cerca:
            salida.append((None, float("inf")))
            continue
        d, _ = cKDTree(e.puntos).query(pts[cerca])
        k = int(np.argmin(d))
        mejor = float(d[k])
        salida.append((int(cerca[k]) if mejor <= dist_max else None, mejor))
    return salida


# ------------------------------------------------------------------ recortes y láminas

def recorte_derecho(img: np.ndarray, e: Etiqueta, margen: int = 12) -> np.ndarray:
    """Recorte del rótulo girado para que se lea horizontal."""
    w = int(math.ceil(e.largo)) + 2 * margen
    h = int(math.ceil(e.grosor)) + 2 * margen
    r = int(math.hypot(w, h) / 2) + 2
    cx, cy = e.centro
    x0, y0 = max(int(cx) - r, 0), max(int(cy) - r, 0)
    sub = img[y0:int(cy) + r + 1, x0:int(cx) + r + 1]
    m = cv2.getRotationMatrix2D((cx - x0, cy - y0), e.angulo, 1.0)
    m[:, 2] += (w / 2 - (cx - x0), h / 2 - (cy - y0))
    return cv2.warpAffine(sub, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def _ventana(img, centro, lado):
    x0 = int(np.clip(centro[0] - lado / 2, 0, max(img.shape[1] - lado, 0)))
    y0 = int(np.clip(centro[1] - lado / 2, 0, max(img.shape[0] - lado, 0)))
    return img[y0:y0 + lado, x0:x0 + lado].copy(), (x0, y0)


def ficha(img: np.ndarray, e: Etiqueta, cruce) -> np.ndarray:
    """Recorte enderezado (×2) sobre el contexto sin girar, con el cruce asociado marcado."""
    der = cv2.resize(recorte_derecho(img, e), None, fx=ESCALA_FICHA, fy=ESCALA_FICHA,
                     interpolation=cv2.INTER_CUBIC)
    medio = e.centro if cruce is None else ((e.centro[0] + cruce[0]) / 2, (e.centro[1] + cruce[1]) / 2)
    ctx, (x0, y0) = _ventana(img, medio, int(max(e.largo, 120) + 140))
    caja = cv2.boxPoints(((e.centro[0] - x0, e.centro[1] - y0), (e.largo, e.grosor), e.angulo))
    cv2.polylines(ctx, [caja.astype(np.int32)], True, (0, 160, 0), 1)
    if cruce is not None:
        cv2.circle(ctx, (int(round(cruce[0] - x0)), int(round(cruce[1] - y0))), 7, (0, 0, 255), 1)
    ancho = max(der.shape[1], ctx.shape[1])
    pad = lambda a: cv2.copyMakeBorder(a, 0, 4, 0, ancho - a.shape[1], cv2.BORDER_CONSTANT,
                                       value=(255, 255, 255))
    return np.vstack([pad(der), pad(ctx)])


def hoja_de_contactos(fichas, titulos, columnas: int = 3, lado: int = 400) -> np.ndarray:
    filas = max(1, math.ceil(len(fichas) / columnas))
    alto_celda = lado + ALTO_TITULO
    hoja = np.full((filas * alto_celda, columnas * lado, 3), 255, np.uint8)
    for k, (f, t) in enumerate(zip(fichas, titulos)):
        x0, y0 = (k % columnas) * lado, (k // columnas) * alto_celda
        esc = min(lado / f.shape[1], lado / f.shape[0], 2.0)
        g = cv2.resize(f, (max(1, int(f.shape[1] * esc)), max(1, int(f.shape[0] * esc))))
        hoja[y0 + ALTO_TITULO:y0 + ALTO_TITULO + g.shape[0], x0:x0 + g.shape[1]] = g
        cv2.putText(hoja, str(t), (x0 + 4, y0 + 16), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 0, 0), 1)
        cv2.rectangle(hoja, (x0, y0), (x0 + lado - 1, y0 + alto_celda - 1), (180, 180, 180), 1)
    return hoja


def lamina_qa(img: np.ndarray, esquinas, ventana, escala: float = 1.0) -> np.ndarray:
    """Ventana (x0, y0, x1, y1) del mosaico con un punto y el nombre de cada esquina.

    Verde: verificada; naranja: sin verificar. Si la entrada trae "centro_px" (centro del
    rótulo), una línea lo une con el cruce."""
    x0, y0, x1, y1 = ventana
    lam = img[y0:y1, x0:x1].copy()
    if escala != 1.0:
        lam = cv2.resize(lam, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
    a_lam = lambda p: (int(round((p[0] - x0) * escala)), int(round((p[1] - y0) * escala)))
    for e in esquinas:
        if e.get("px") is None:
            continue
        p = a_lam(e["px"])
        color = (0, 150, 0) if e.get("verificado") else (230, 120, 0)
        if e.get("centro_px") is not None:
            cv2.line(lam, p, a_lam(e["centro_px"]), (40, 40, 220), 1)
        cv2.circle(lam, p, 4, color, -1)
        texto = e.get("nombre") or "?"
        cv2.putText(lam, texto, (p[0] + 5, p[1] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45,
                    (255, 255, 255), 3, cv2.LINE_AA)
        cv2.putText(lam, texto, (p[0] + 5, p[1] - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1,
                    cv2.LINE_AA)
    return lam


# ------------------------------------------------------------------ componer

def _redondear(p):
    return None if p is None else [round(float(p[0]), 1), round(float(p[1]), 1)]


def _entrada(lect: dict, px, notas_extra: str = "") -> dict:
    nombre = lect.get("nombre")
    notas = "; ".join(n for n in (lect.get("notas", ""), notas_extra) if n)
    return {"nombre": nombre, "px": _redondear(px), "fuente": FUENTE,
            "verificado": bool(lect.get("verificado", True)) and nombre is not None
            and not notas_extra,
            "cota_m": lect.get("cota_m"), "notas": notas}


def componer(candidatos: list[dict], lecturas: dict) -> list[dict]:
    """Une los candidatos detectados con las lecturas a ojo en el diccionario de esquinas.

    lecturas: {"<id>": {"nombre", "cota_m", "verificado", "notas", "px", "descartar"}} para los
    candidatos, y {"manual-<n>": {... con "px"}} para esquinas que el detector no vio. Los
    candidatos sin lectura (no revisados) no entran."""
    por_id = {str(c["id"]): c for c in candidatos}
    ajenas = [k for k in lecturas if not k.startswith("manual") and k not in por_id]
    if ajenas:
        raise ValueError(f"lecturas de candidatos inexistentes: {', '.join(sorted(ajenas))}")
    salida = []
    for c in candidatos:
        lect = lecturas.get(str(c["id"]))
        if lect is None or "descartar" in lect:  # sin revisar o descartado: no entra
            continue
        if lect.get("px") is not None:
            salida.append(_entrada(lect, lect["px"]))
        elif c.get("cruce_px") is not None:
            salida.append(_entrada(lect, c["cruce_px"]))
        else:
            salida.append(_entrada(lect, c["centro_px"], "sin cruce: punto en el centro del rótulo"))
    for k in sorted(k for k in lecturas if k.startswith("manual")):
        lect = lecturas[k]
        if lect.get("px") is None:
            raise ValueError(f"la lectura {k} no trae px")
        salida.append(_entrada(lect, lect["px"]))
    return salida


def a_json(esquinas: list[dict]) -> str:
    """Una esquina por línea: el diccionario se lee y se revisa en un diff."""
    filas = [json.dumps(e, ensure_ascii=False) for e in esquinas]
    return "[\n" + ",\n".join(" " + f for f in filas) + "\n]\n"


# ------------------------------------------------------------------ CLI

def _leer_rgb(ruta: Path) -> np.ndarray:
    import tifffile
    img = tifffile.imread(str(ruta))
    if img.ndim != 3 or img.shape[2] < 3:
        raise ValueError(f"{ruta} no es una imagen RGB")
    return np.ascontiguousarray(img[..., :3])


def _ventana_radio(forma, centro, radio):
    cx, cy = centro
    return (max(int(cx - radio), 0), max(int(cy - radio), 0),
            min(int(cx + radio), forma[1]), min(int(cy + radio), forma[0]))


def _guardar(ruta: Path, rgb: np.ndarray):
    ruta.parent.mkdir(parents=True, exist_ok=True)
    opciones = [cv2.IMWRITE_JPEG_QUALITY, 90] if ruta.suffix.lower() in (".jpg", ".jpeg") else []
    if not cv2.imwrite(str(ruta), cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), opciones):
        raise OSError(f"no se pudo escribir {ruta}")


def _detectar(a) -> int:
    img = _leer_rgb(a.mosaico)
    clases = cv2.imread(str(a.clases), cv2.IMREAD_UNCHANGED)
    if clases is None or clases.shape != img.shape[:2]:
        print(f"error: {a.clases} no es un mapa de clases del tamaño del mosaico", file=sys.stderr)
        return 1
    x0, y0, x1, y1 = _ventana_radio(img.shape, a.centro, a.radio)
    sub = img[y0:y1, x0:x1]
    ets = etiquetas(mascara_roja(sub))
    pts = cruces(np.isin(clases[y0:y1, x0:x1], a.calle))
    asoc = asociar(ets, pts)
    a.salida.mkdir(parents=True, exist_ok=True)
    lista, fichas = [], []
    for k, (e, (i, d)) in enumerate(zip(ets, asoc)):
        cruce = None if i is None else pts[i]
        f = ficha(sub, e, cruce)
        _guardar(a.salida / "crops" / f"{k:04d}.png", f)
        fichas.append(f)
        lista.append({"id": k, "centro_px": _redondear((e.centro[0] + x0, e.centro[1] + y0)),
                      "angulo": round(e.angulo, 1), "largo_px": round(e.largo, 1),
                      "grosor_px": round(e.grosor, 1),
                      "cruce_px": None if cruce is None else _redondear((cruce[0] + x0, cruce[1] + y0)),
                      "dist_px": None if i is None else round(d, 1)})
    for h in range(0, len(fichas), a.por_hoja):
        hoja = hoja_de_contactos(fichas[h:h + a.por_hoja], [f"#{c['id']}" for c in lista[h:h + a.por_hoja]])
        _guardar(a.salida / f"hoja-{h // a.por_hoja:02d}.jpg", hoja)
    _vistas(img, lista, (x0, y0, x1, y1), a.salida, a.lado_vista)
    info = {"ventana": [x0, y0, x1, y1], "cruces": len(pts), "etiquetas": lista,
            "sin_cruce": sum(1 for c in lista if c["cruce_px"] is None),
            "cruces_px": [_redondear((p[0] + x0, p[1] + y0)) for p in pts]}
    (a.salida / "candidatos.json").write_text(json.dumps(info, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps({k: v for k, v in info.items() if k not in ("etiquetas", "cruces_px")} | {"n": len(lista)}))
    return 0


def _vistas(img, lista, ventana, salida: Path, lado: int):
    """Vistas en mosaico de la ventana con el número de cada candidato junto a su cruce."""
    x0, y0, x1, y1 = ventana
    marcas = [{"nombre": f"#{c['id']}", "px": c["cruce_px"] or c["centro_px"],
               "centro_px": c["centro_px"], "verificado": c["cruce_px"] is not None} for c in lista]
    for fy, vy in enumerate(range(y0, y1, lado)):
        for fx, vx in enumerate(range(x0, x1, lado)):
            v = (vx, vy, min(vx + lado + lado // 8, x1), min(vy + lado + lado // 8, y1))
            dentro = [m for m in marcas if v[0] <= m["centro_px"][0] < v[2] and v[1] <= m["centro_px"][1] < v[3]]
            if dentro:
                _guardar(salida / "vistas" / f"vista-{fy:02d}-{fx:02d}.jpg", lamina_qa(img, dentro, v))


def _componer(a) -> int:
    cand = json.loads(a.candidatos.read_text())["etiquetas"]
    lect = json.loads(a.lecturas.read_text())
    esq = componer(cand, lect)
    a.salida.parent.mkdir(parents=True, exist_ok=True)
    a.salida.write_text(a_json(esq))
    n_nombre = sum(1 for e in esq if e["nombre"])
    print(json.dumps({"esquinas": len(esq), "con_nombre": n_nombre,
                      "verificadas": sum(1 for e in esq if e["verificado"])}))
    return 0


def _qa(a) -> int:
    img = _leer_rgb(a.mosaico)
    esq = json.loads(a.esquinas.read_text())
    lam = lamina_qa(img, esq, _ventana_radio(img.shape, a.centro, a.radio), a.escala)
    _guardar(a.salida, lam)
    return 0


def _punto(s: str) -> tuple[float, float]:
    x, y = (float(v) for v in s.split(","))
    return x, y


def _argumentos(argv):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    sub = ap.add_subparsers(dest="orden", required=True)
    d = sub.add_parser("detectar", help="rótulos rojos, cruces, fichas y vistas para leer")
    d.add_argument("--mosaico", type=Path, default=DERIVADOS / "mosaico-costura.tif")
    d.add_argument("--clases", type=Path, default=DERIVADOS / "segmentacion/mosaico/clases-costura.png")
    d.add_argument("--centro", type=_punto, default=PLAZA_PX, help="x,y en píxeles del mosaico")
    d.add_argument("--radio", type=float, default=3200, help="semilado de la ventana, en píxeles")
    d.add_argument("--calle", type=lambda v: [int(c) for c in v.split(",")], default=CLASES_CALLE,
                   help="códigos de clase que cuentan como calle (coma)")
    d.add_argument("--por-hoja", type=int, default=9)
    d.add_argument("--lado-vista", type=int, default=1100)
    d.add_argument("--salida", type=Path, required=True)
    c = sub.add_parser("componer", help="candidatos + lecturas → diccionario de esquinas")
    c.add_argument("--candidatos", type=Path, required=True)
    c.add_argument("--lecturas", type=Path, required=True)
    c.add_argument("--salida", type=Path, default=Path(__file__).parent / "esquinas/1936-esquinas.json")
    q = sub.add_parser("qa", help="lámina con cada esquina sobre el mosaico")
    q.add_argument("--mosaico", type=Path, default=DERIVADOS / "mosaico-costura.tif")
    q.add_argument("--esquinas", type=Path, default=Path(__file__).parent / "esquinas/1936-esquinas.json")
    q.add_argument("--centro", type=_punto, default=PLAZA_PX)
    q.add_argument("--radio", type=float, default=3200)
    q.add_argument("--escala", type=float, default=1.0)
    q.add_argument("--salida", type=Path, default=DERIVADOS / "qa-esquinas.jpg")
    return ap.parse_args(argv)


def main(argv=None) -> int:
    a = _argumentos(argv)
    return {"detectar": _detectar, "componer": _componer, "qa": _qa}[a.orden](a)


if __name__ == "__main__":
    sys.exit(main())
