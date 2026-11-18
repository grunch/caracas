"""Relleno de la costura entre las dos hojas del plano DCN 1936.

Las hojas no se tocan: en el mosaico (tools/geo/mosaico.py) queda una franja casi vertical
junto a la costura que no cubre ninguna hoja, pintada de papel liso #f1e6cd (de 0 a ~80 m de
ancho). En 3D se ve como una avenida N–S falsa. Este paso la rellena, de forma reproducible,
en la imagen y en el mapa de clases:

1. Hueco por fila: los píxeles exactamente color papel cerca de la costura (es la máscara sin
   datos que deja mosaico.py: allí ninguna hoja escribió) agrupados en componentes grandes.
2. Clases: se toma la columna de clases justo a la izquierda y justo a la derecha del hueco
   (dos perfiles N–S) y se estima, por ventanas de filas, el desplazamiento vertical que mejor
   los empareja (las calles E–O cruzan la costura algo oblicuas). Cada píxel del hueco mira
   los dos perfiles, corridos según su posición: si casan y son calle o la clase de fondo del
   lugar, cruza (una calle entra por un lado y sale por el otro, las manzanas se cierran); si
   no, copia su lado hasta EXTRUSION_PX y más allá toma el fondo (las casas sueltas no se
   estiran). Al final, un filtro de moda dentro del hueco.
   Antes se ensancha el tramo sobre el borde roto del papel y sobre las manchas de "cerro" que
   la segmentación pegó a la franja lisa.
3. Imagen: cada clase se pinta con el color mediano que tiene esa clase a cada lado (variando
   a lo largo de la costura y fundiendo de un lado al otro), con grano de papel, el borde de
   tinta entre calle y manzana y el rayado de los edificios públicos.
4. Máscara: 255 = imagen y clases reconstruidas · 128 = solo clases · 0 = original.

Uso (desde la raíz del repo; ver tools/geo/README.md):
  python tools/geo/costura.py
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path

os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

import cv2  # noqa: E402
import numpy as np  # noqa: E402
from scipy.ndimage import median_filter, uniform_filter1d  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

from segmentar_clases import (  # noqa: E402
    AGUA, CALLE, CERRO, EDIFICADO, EDIFICIO_PUBLICO, N_CLASES, PATIO, VERDE,
)

RAIZ = Path(__file__).resolve().parents[2]
PAPEL = (241, 230, 205)  # el relleno sin datos de mosaico.py
MARCA_IMAGEN = 255
MARCA_CLASES = 128

BANDA_PX = 200            # se busca el hueco a ± esto de la columna de la costura
AREA_HUECO_MIN_PX = 50    # menos que esto es papel liso del propio escaneo, no hueco
MARGEN_IMAGEN_PX = 6      # borde mezclado con papel del remuestreo y borde roto de la hoja 2
MARGEN_CLASES_PX = 6      # borde roto y blanqueado de la hoja 2
RADIO_CONTAMINACION_PX = 120 # manchas de "cerro" que la segmentación pegó a la franja
VENTANA_FILAS = 61        # filas para estimar el desplazamiento entre los dos lados
S_MAX_BASE_PX = 8         # desplazamiento máximo: base + fracción del ancho del hueco
S_MAX_FRACCION = 0.5
EXTRUSION_PX = 10         # lo que no casa entre los dos lados entra a lo sumo esto (5 m)
VENTANA_FONDO_FILAS = 201  # filas para elegir la clase de fondo de la franja
LADO_MODA = 5
PASADAS_MODA = 2
BLOQUE_FILAS = 32         # resolución a lo largo de la costura de los colores por clase
VENTANA_COLOR_FILAS = 64
ANCHO_MUESTRA_PX = 40
RUIDO = 3.0               # grano del papel (desvío por canal)
TINTA = np.array((70, 62, 55), float)
OPACIDAD_TINTA = 0.85
PASO_RAYADO_PX = 6        # rayado de edificios públicos (~3 m)
SIN_PERFIL = 255

DE_MANZANA = (EDIFICADO, PATIO, EDIFICIO_PUBLICO, VERDE)
COLOR_POR_OMISION = {CALLE: PAPEL, EDIFICADO: (226, 178, 128), PATIO: (236, 214, 170),
                     EDIFICIO_PUBLICO: (226, 190, 150), VERDE: (170, 190, 120),
                     AGUA: (150, 180, 220), CERRO: (236, 226, 200)}


@dataclass(frozen=True)
class Tramos:
    """Intervalo [ini, fin) de columnas por fila; ini == fin = fila sin hueco."""
    ini: np.ndarray
    fin: np.ndarray

    def anchos(self) -> np.ndarray:
        return np.maximum(self.fin - self.ini, 0)

    def filas(self) -> int:
        return int((self.anchos() > 0).sum())

    def mascara(self, forma) -> np.ndarray:
        c = np.arange(forma[1])[None, :]
        return (c >= self.ini[:, None]) & (c < self.fin[:, None])

    def ensanchar(self, margen: int, ancho: int) -> "Tramos":
        lleno = self.anchos() > 0
        ini = np.where(lleno, np.maximum(self.ini - margen, 0), self.ini)
        fin = np.where(lleno, np.minimum(self.fin + margen, ancho), self.fin)
        return Tramos(ini, fin)

    def union(self, otro: "Tramos") -> "Tramos":
        a, b = self.anchos() > 0, otro.anchos() > 0
        ini = np.where(a & b, np.minimum(self.ini, otro.ini), np.where(a, self.ini, otro.ini))
        fin = np.where(a & b, np.maximum(self.fin, otro.fin), np.where(a, self.fin, otro.fin))
        return Tramos(ini, fin)

    def entre_filas(self, f0: int, f1: int) -> "Tramos":
        """Solo las filas [f0, f1); las demás quedan vacías."""
        dentro = np.zeros(len(self.ini), bool)
        dentro[max(f0, 0):max(f1, 0)] = True
        return Tramos(np.where(dentro, self.ini, 0), np.where(dentro, self.fin, 0))


def _tramos_de_mascara(mascara: np.ndarray, desde_col: int = 0) -> Tramos:
    hay = mascara.any(axis=1)
    primera = np.argmax(mascara, axis=1)
    ultima = mascara.shape[1] - np.argmax(mascara[:, ::-1], axis=1)
    return Tramos(np.where(hay, primera + desde_col, 0), np.where(hay, ultima + desde_col, 0))


# ------------------------------------------------------------------ 1. hueco

def hueco_de_imagen(imagen: np.ndarray, columna: int, banda: int = BANDA_PX,
                    papel=PAPEL, area_min: int = AREA_HUECO_MIN_PX) -> Tramos:
    """Franja sin datos (color papel exacto) a ± banda de la columna de la costura."""
    c0, c1 = max(columna - banda, 0), min(columna + banda, imagen.shape[1])
    liso = np.all(imagen[:, c0:c1] == np.asarray(papel, np.uint8), axis=2).astype(np.uint8)
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(liso, connectivity=8)
    grandes = np.flatnonzero(stats[:, cv2.CC_STAT_AREA] >= area_min)
    grandes = grandes[grandes > 0]
    return _tramos_de_mascara(np.isin(etiquetas, grandes), c0)


def extender_contaminacion(clases: np.ndarray, tramos: Tramos, clase: int = CERRO,
                           radio: int = RADIO_CONTAMINACION_PX) -> Tramos:
    """Ensancha cada fila sobre las manchas de `clase` pegadas al hueco (hasta `radio` px)."""
    zona = tramos.mascara(clases.shape)
    franja = tramos.ensanchar(radio, clases.shape[1]).mascara(clases.shape)
    candidato = ((clases == clase) & franja).astype(np.uint8)
    n, etiquetas = cv2.connectedComponents(candidato, connectivity=8)
    if n <= 1:
        return tramos
    vecino = cv2.dilate(zona.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
    tocan = np.unique(etiquetas[vecino & (candidato > 0)])
    tocan = tocan[tocan > 0]
    if len(tocan) == 0:
        return tramos
    return tramos.union(_tramos_de_mascara(np.isin(etiquetas, tocan)))


# ------------------------------------------------------------------ 2. clases

def _perfiles(clases: np.ndarray, tramos: Tramos) -> tuple[np.ndarray, np.ndarray]:
    filas = np.arange(clases.shape[0])
    lleno = tramos.anchos() > 0
    ci = np.clip(tramos.ini - 1, 0, clases.shape[1] - 1)
    cd = np.clip(tramos.fin, 0, clases.shape[1] - 1)
    izq = np.where(lleno & (tramos.ini > 0), clases[filas, ci], SIN_PERFIL)
    der = np.where(lleno & (tramos.fin < clases.shape[1]), clases[filas, cd], SIN_PERFIL)
    # sin un lado, se copia el otro
    return np.where(izq == SIN_PERFIL, der, izq).astype(np.uint8), np.where(der == SIN_PERFIL, izq, der).astype(np.uint8)


def desplazamientos(izq: np.ndarray, der: np.ndarray, s_max: np.ndarray,
                    ventana: int = VENTANA_FILAS) -> np.ndarray:
    """Por fila, el corrimiento s (filas) que mejor cumple der[f + s] == izq[f]."""
    n = len(izq)
    tope = int(max(np.max(s_max), 0)) if n else 0
    candidatos = np.arange(-tope, tope + 1)
    puntaje = np.full((len(candidatos), n), -np.inf)
    f = np.arange(n)
    for k, s in enumerate(candidatos):
        g = f + s
        valido = (g >= 0) & (g < n)
        igual = np.zeros(n)
        igual[valido] = (der[g[valido]] == izq[valido]) & (izq[valido] != SIN_PERFIL)
        suave = uniform_filter1d(igual, ventana, mode="nearest") - 1e-3 * abs(s)
        puntaje[k] = np.where(np.abs(s) <= s_max, suave, -np.inf)
    s = candidatos[np.argmax(puntaje, axis=0)]
    return median_filter(s, size=ventana, mode="nearest")


def _moda_en_zona(clases: np.ndarray, zona: np.ndarray, lado: int = LADO_MODA) -> np.ndarray:
    presentes = np.unique(clases[cv2.dilate(zona.astype(np.uint8), np.ones((lado, lado), np.uint8)) > 0])
    cuentas = np.stack([cv2.boxFilter((clases == c).astype(np.float32), -1, (lado, lado), normalize=False)
                        for c in presentes])
    moda = presentes[np.argmax(cuentas, axis=0)]
    return np.where(zona, moda, clases).astype(clases.dtype)


def _fondo(izq: np.ndarray, der: np.ndarray, ventana: int = VENTANA_FONDO_FILAS) -> np.ndarray:
    """Por fila, la clase más común en los dos perfiles alrededor."""
    clases = np.unique(np.concatenate([izq, der]))
    clases = clases[clases != SIN_PERFIL]
    if len(clases) == 0:
        return np.full(len(izq), CALLE, np.uint8)
    cuentas = np.stack([uniform_filter1d(((izq == c) | (der == c)).astype(float) + (izq == c) * (der == c),
                                         ventana, mode="nearest") for c in clases])
    return clases[np.argmax(cuentas, axis=0)].astype(np.uint8)


def rellenar_clases(clases: np.ndarray, tramos: Tramos, ventana: int = VENTANA_FILAS,
                    pasadas: int = PASADAS_MODA, extrusion: int = EXTRUSION_PX) -> np.ndarray:
    """Copia de `clases` con el hueco continuado desde los dos lados (ver docstring)."""
    salida = clases.copy()
    zona = tramos.mascara(clases.shape)
    if not zona.any():
        return salida
    izq, der = _perfiles(clases, tramos)
    anchos = tramos.anchos()
    s = desplazamientos(izq, der, S_MAX_BASE_PX + S_MAX_FRACCION * anchos, ventana)
    filas, cols = np.nonzero(zona)
    t = (cols - tramos.ini[filas] + 0.5) / anchos[filas]
    n = clases.shape[0]
    fila_izq = np.clip(np.round(filas - t * s[filas]).astype(int), 0, n - 1)
    fila_der = np.clip(np.round(filas + (1 - t) * s[filas]).astype(int), 0, n - 1)
    de_izq, de_der = izq[fila_izq], der[fila_der]
    fondo = _fondo(izq, der)[filas]
    # lo que casa a los dos lados cruza entero si es calle o la clase de fondo (manzanas en el
    # centro); lo demás (casas sueltas que casan por azar) entra poco desde su lado y el resto
    # de la franja toma el fondo del lugar
    hondo_izq = cols - tramos.ini[filas] + 0.5
    hondo_der = tramos.fin[filas] - cols - 0.5
    lado = np.where(t < 0.5, np.where(hondo_izq <= extrusion, de_izq, fondo),
                    np.where(hondo_der <= extrusion, de_der, fondo))
    cruza = (de_izq == de_der) & ((de_izq == fondo) | (de_izq == CALLE))
    salida[filas, cols] = np.where(cruza, de_izq, lado)
    for _ in range(pasadas):
        salida = _moda_en_zona(salida, zona)
    return salida


# ------------------------------------------------------------------ 3. imagen

def _colores_por_bloque(imagen, clases, muestra, n_bloques):
    """[bloque, clase, rgb] mediana de cada clase en las muestras de cada bloque de filas (NaN si no hay)."""
    colores = np.full((n_bloques, N_CLASES, 3), np.nan)
    medio = VENTANA_COLOR_FILAS
    for b in range(n_bloques):
        centro = (b + 0.5) * BLOQUE_FILAS
        f0, f1 = int(max(centro - medio, 0)), int(min(centro + medio, imagen.shape[0]))
        m = muestra[f0:f1]
        if not m.any():
            continue
        px, cl = imagen[f0:f1][m], clases[f0:f1][m]
        for c in np.unique(cl):
            if c < N_CLASES:
                colores[b, c] = np.median(px[cl == c], axis=0)
    return colores


def _completar(colores, respaldo):
    """Huecos de un lado: mediana global de esa clase, después el otro lado, después la paleta."""
    salida = colores.copy()
    for c in range(N_CLASES):
        global_c = np.nanmedian(colores[:, c], axis=0) if np.isfinite(colores[:, c]).any() else None
        falta = ~np.isfinite(salida[:, c, 0])
        if global_c is not None:
            salida[falta, c] = global_c
        falta = ~np.isfinite(salida[:, c, 0])
        salida[falta, c] = respaldo[falta, c]
    return salida


def _por_fila(colores_bloque, n_filas):
    pos = (np.arange(n_filas) + 0.5) / BLOQUE_FILAS - 0.5
    b0 = np.clip(np.floor(pos).astype(int), 0, len(colores_bloque) - 1)
    b1 = np.clip(b0 + 1, 0, len(colores_bloque) - 1)
    w = np.clip(pos - b0, 0, 1)[:, None, None]
    return colores_bloque[b0] * (1 - w) + colores_bloque[b1] * w


def _paleta_lados(imagen, muestras, tramos_muestras):
    n_filas, ancho = muestras.shape
    lleno = (tramos_muestras.anchos() > 0)[:, None]
    c = np.arange(ancho)[None, :]
    ini, fin = tramos_muestras.ini[:, None], tramos_muestras.fin[:, None]
    m_izq = lleno & (c >= ini - ANCHO_MUESTRA_PX) & (c < ini)
    m_der = lleno & (c >= fin) & (c < fin + ANCHO_MUESTRA_PX)
    n_bloques = max(1, int(np.ceil(n_filas / BLOQUE_FILAS)))
    izq = _colores_por_bloque(imagen, muestras, m_izq, n_bloques)
    der = _colores_por_bloque(imagen, muestras, m_der, n_bloques)
    omision = np.zeros((n_bloques, N_CLASES, 3))
    for k, rgb in COLOR_POR_OMISION.items():
        omision[:, k] = rgb
    omision[:, [k for k in range(N_CLASES) if k not in COLOR_POR_OMISION]] = PAPEL
    der_c = _completar(der, _completar(izq, omision))
    izq_c = _completar(izq, der_c)
    return _por_fila(izq_c, n_filas), _por_fila(der_c, n_filas)


def _tinta(clases, filas, cols):
    """Borde calle | manzana y rayado diagonal de los edificios públicos."""
    calle = np.pad(clases == CALLE, 1, mode="edge")
    vecina_calle = (calle[filas, cols + 1] | calle[filas + 2, cols + 1] | calle[filas + 1, cols]
                    | calle[filas + 1, cols + 2])
    clase = clases[filas, cols]
    borde = np.isin(clase, DE_MANZANA) & vecina_calle
    rayado = (clase == EDIFICIO_PUBLICO) & ((filas + cols) % PASO_RAYADO_PX == 0)
    return borde | rayado


def rellenar_imagen(imagen: np.ndarray, clases: np.ndarray, tramos: Tramos,
                    muestras: np.ndarray, tramos_muestras: Tramos | None = None,
                    semilla: int = 0) -> np.ndarray:
    """Copia de `imagen` con el hueco pintado según `clases` (ya rellenadas).

    Los colores salen de `muestras` (las clases originales) a ambos lados de `tramos_muestras`
    (por omisión el mismo hueco), fuera de él.
    """
    salida = imagen.copy()
    zona = tramos.mascara(clases.shape)
    if not zona.any():
        return salida
    izq, der = _paleta_lados(imagen, muestras, tramos_muestras or tramos)
    filas, cols = np.nonzero(zona)
    t = ((cols - tramos.ini[filas] + 0.5) / tramos.anchos()[filas])[:, None]
    clase = np.minimum(clases[filas, cols], N_CLASES - 1)
    color = izq[filas, clase] * (1 - t) + der[filas, clase] * t
    rng = np.random.default_rng(semilla)
    color = color + rng.normal(0, RUIDO, color.shape)
    tinta = _tinta(clases, filas, cols)[:, None]
    color = np.where(tinta, color * (1 - OPACIDAD_TINTA) + TINTA * OPACIDAD_TINTA, color)
    salida[filas, cols] = np.clip(np.round(color), 0, 255).astype(np.uint8)
    return salida


# ------------------------------------------------------------------ 4. todo junto

@dataclass(frozen=True)
class Costura:
    imagen: np.ndarray
    clases: np.ndarray
    mascara: np.ndarray  # uint8: MARCA_IMAGEN, MARCA_CLASES o 0
    meta: dict


def _meta(hueco: Tramos, t_img: Tramos, t_cls: Tramos, metro: float, c0: int) -> dict:
    anchos = hueco.anchos()
    filas = np.flatnonzero(anchos > 0)
    return {
        "filas": int(len(filas)),
        "fila_desde": int(filas[0]) if len(filas) else None,
        "fila_hasta": int(filas[-1]) if len(filas) else None,
        "columnas": [int(hueco.ini[filas].min() + c0), int(hueco.fin[filas].max() + c0)] if len(filas) else None,
        "ancho_medio_m": round(float(anchos[filas].mean() * metro), 2) if len(filas) else 0.0,
        "ancho_max_m": round(float(anchos.max() * metro), 2) if len(anchos) else 0.0,
        "pixeles_imagen": int(t_img.anchos().sum()),
        "pixeles_clases": int(t_cls.anchos().sum()),
    }


def coser(imagen: np.ndarray, clases: np.ndarray, columna: int, banda: int = BANDA_PX,
          margen_imagen: int = MARGEN_IMAGEN_PX, margen_clases: int = MARGEN_CLASES_PX,
          radio_contaminacion: int = RADIO_CONTAMINACION_PX, metro: float = 0.5,
          semilla: int = 0, filas: tuple[int, int] | None = None) -> Costura:
    """Rellena la franja sin datos junto a `columna` en la imagen y en las clases (copias).

    `filas` = (f0, f1): solo se rellena entre esas filas (el marco; el margen impreso queda igual).
    """
    if imagen.shape[:2] != clases.shape:
        raise ValueError(f"imagen {imagen.shape[:2]} y clases {clases.shape} no coinciden")
    ancho = imagen.shape[1]
    colchon = banda + max(margen_clases, margen_imagen) + radio_contaminacion + ANCHO_MUESTRA_PX + LADO_MODA
    c0, c1 = max(columna - colchon, 0), min(columna + colchon, ancho)
    img_b = np.ascontiguousarray(imagen[:, c0:c1])
    cls_b = np.ascontiguousarray(clases[:, c0:c1])
    hueco = hueco_de_imagen(img_b, columna - c0, banda)
    f0, f1 = filas or (0, imagen.shape[0])
    hueco = hueco.entre_filas(f0, f1)
    t_img = hueco.ensanchar(margen_imagen, c1 - c0)
    t_cls = extender_contaminacion(cls_b, hueco.ensanchar(margen_clases, c1 - c0),
                                   CERRO, radio_contaminacion).union(t_img).entre_filas(f0, f1)
    nuevas = rellenar_clases(cls_b, t_cls)
    pintada = rellenar_imagen(img_b, nuevas, t_img, muestras=cls_b, tramos_muestras=t_cls,
                              semilla=semilla)
    mascara = np.zeros(clases.shape, np.uint8)
    mascara[:, c0:c1][t_cls.mascara(cls_b.shape)] = MARCA_CLASES
    mascara[:, c0:c1][t_img.mascara(cls_b.shape)] = MARCA_IMAGEN
    imagen_salida = imagen.copy()
    imagen_salida[:, c0:c1] = pintada
    clases_salida = clases.copy()
    clases_salida[:, c0:c1] = nuevas
    return Costura(imagen_salida, clases_salida, mascara, _meta(hueco, t_img, t_cls, metro, c0))


# ------------------------------------------------------------------ CLI

def _lamina_qa(antes, despues, cls_antes, cls_despues, columna, filas, lado=300):
    from segmentar_salidas import colorear
    tiras = []
    for f in filas:
        f0 = int(np.clip(f - lado // 2, 0, antes.shape[0] - lado))
        c0 = int(np.clip(columna - lado // 2, 0, antes.shape[1] - lado))
        sl = (slice(f0, f0 + lado), slice(c0, c0 + lado))
        tiras.append(np.hstack([antes[sl], despues[sl], colorear(cls_antes[sl]), colorear(cls_despues[sl])]))
    return np.vstack(tiras)


def _relativa(ruta: Path) -> str:
    try:
        return str(ruta.resolve().relative_to(RAIZ))
    except ValueError:
        return str(ruta)


def _argumentos(argv):
    d = "fuentes/derivados/1936"
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    ap.add_argument("--mosaico", type=Path, default=RAIZ / d / "mosaico.tif")
    ap.add_argument("--meta", type=Path, default=RAIZ / d / "mosaico.json",
                    help="mosaico.json (origen_m, metro y costura_m dan la columna)")
    ap.add_argument("--clases", type=Path, default=RAIZ / d / "segmentacion/mosaico/clases.png")
    ap.add_argument("--banda", type=int, default=BANDA_PX)
    return ap.parse_args(argv)


def main(argv=None) -> int:
    a = _argumentos(argv)
    import tifffile
    from mosaico import guardar_tiff
    meta = json.loads(a.meta.read_text())
    columna = int(round((meta["costura_m"] - meta["origen_m"][0]) / meta["metro"]))
    imagen = tifffile.imread(str(a.mosaico))
    clases = cv2.imread(str(a.clases), cv2.IMREAD_UNCHANGED)
    if clases is None or clases.ndim != 2:
        print(f"error: {a.clases} no es una imagen de clases de un canal", file=sys.stderr)
        return 1
    _, f0, _, f1 = meta["marco"]
    res = coser(imagen, clases, columna, a.banda, metro=meta["metro"], filas=(f0, f1))
    dir_img, dir_cls = a.mosaico.parent, a.clases.parent
    guardar_tiff(dir_img / "mosaico-costura.tif", res.imagen)
    for ruta, img in ((dir_cls / "clases-costura.png", res.clases),
                      (dir_img / "costura-mascara.png", res.mascara)):
        if not cv2.imwrite(str(ruta), img):
            raise OSError(f"no se pudo escribir {ruta}")
    filas = [f for f in (res.meta["fila_desde"], res.meta["fila_hasta"]) if f is not None]
    if filas:
        muestras = np.linspace(filas[0], filas[1], 5).astype(int).tolist()
        lamina = _lamina_qa(imagen, res.imagen, clases, res.clases, columna, muestras)
        cv2.imwrite(str(dir_img / "qa-costura.jpg"), cv2.cvtColor(lamina, cv2.COLOR_RGB2BGR),
                    [cv2.IMWRITE_JPEG_QUALITY, 88])
    info = {**res.meta, "columna_costura": columna, "metro": meta["metro"],
            "entradas": [_relativa(a.mosaico), _relativa(a.clases)], "filas_marco": [f0, f1],
            "mascara": {"255": "imagen y clases reconstruidas", "128": "solo clases", "0": "original"}}
    (dir_img / "costura.json").write_text(json.dumps(info, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps(res.meta, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
