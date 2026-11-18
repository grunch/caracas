#!/usr/bin/env python3
"""Rótulos del plano de 1936: la tinta que es letra, número o símbolo, y no dibujo.

En modo color el suelo se pinta según la segmentación y el plano queda debajo como un dibujo
tenue (src/shader/suelo.js). Los nombres de edificios y esquinas, las cotas ("▲919.674"), las
letras grandes de las parroquias y el punteado del tranvía no son dibujo: acá se los separa de
las líneas que arman el plano (bordes de manzana y de calle, contornos, curvas de nivel) para que
el visor no los marque.

Por cada tinta (negra, roja y azul, las de segmentar_color.detectar_tintas) y por componente conexa:
 - del tamaño de un glifo (lado mayor < `glifo_max_m`) y compacta: rótulo. Letras, cifras, el
   triángulo de las cotas, las cruces de las iglesias y los puntos sueltos (el punteado del tranvía).
 - chica pero alargada (el trazo de un sendero, de una cerca o de una quebrada): dibujo, salvo que
   esté pegada a un glifo (una "I", un "1", un guion).
 - compacta pero casi sin tinta (el pedazo de una línea fina que se cortó): dibujo.
 - varias letras o cifras que se tocan (densa y alta, hasta `trazo_min_m`): rótulo.
 - el resto (líneas largas, contornos): dibujo. Se queda.
En la tinta negra, además, los símbolos de trazo grueso (la cruz de una iglesia) y los rótulos que
tocan una línea: las letras en negrita (por el grosor del
trazo: sobre el rayado de un edificio, atravesadas en una calle) y las cotas apoyadas en el borde de
la manzana (a la componente se le quitan los trazos rectos largos y las cifras se encadenan desde el
triángulo). Y las letras de las parroquias: cuerpos gruesos, rayados, con tinta roja.

Uso (desde la raíz del repo):
  python tools/geo/rotulos.py <mosaico.tif> <rotulos.png> [--escala 0.5]
Salida: PNG de un canal del tamaño del mosaico, 255 = rótulo.
"""
from __future__ import annotations

import argparse
import math
import os
import sys
from dataclasses import dataclass
from pathlib import Path

os.environ.setdefault("OPENCV_IO_MAX_IMAGE_PIXELS", str(2 ** 40))

import cv2  # noqa: E402
import numpy as np  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parent))

from segmentar_color import Paleta, a_lab, cargar_paleta, detectar_tintas  # noqa: E402
from segmentar_morfologia import abrir, cerrar, dilatar  # noqa: E402
from segmentar_parametros import Parametros  # noqa: E402

FRANJA_PX = 2048  # el mosaico se lee por franjas: la tinta se decide píxel a píxel


@dataclass(frozen=True)
class ParametrosRotulos:
    escala: float  # metros por píxel

    glifo_max_m: float = 17.0  # lado mayor de una letra (las de los nombres de calle miden ~11 m)
    trazo_min_m: float = 35.0  # de acá para arriba es una línea del dibujo
    densidad_palabra_min: float = 0.22  # tinta / caja de varias letras o cifras pegadas; un contorno es más ralo
    alto_palabra_min_m: float = 3.5  # y su eje menor: lo más bajo es un trazo de línea cortada
    punto_max_m: float = 3.0  # un punto suelto (el punteado del tranvía) es rótulo, pero no arrastra a sus vecinos
    esbeltez_glifo_max: float = 2.2  # largo / ancho: una letra es compacta; un trazo de línea cortada, no
    tinta_glifo_min_m: float = 1.25  # área / lado mayor: el pedazo de una línea fina que se cortó tiene menos tinta
    grueso_simbolo_min: float = 0.5  # parte gruesa de un símbolo mediano (la cruz de una iglesia)
    esbeltez_barra_min: float = 3.0  # un núcleo grueso más alargado que esto es un tramo de línea gruesa
    grosor_negrita_m: float = 1.5  # las letras son más gruesas que las líneas del dibujo (~0,8 m)
    area_negrita_min_m2: float = 5.0  # menos que esto es el cruce de dos líneas, no una letra
    borde_negrita_m: float = 1.5  # cuánto se extiende el núcleo grueso de una letra sobre su tinta
    cerca_m: float = 4.0  # un trazo simple a menos de esto de un glifo es parte del rótulo
    vueltas_cerca: int = 3  # cuántas veces se propaga ("Hill": la H se lleva la i y las dos eles)
    recta_min_m: float = 20.0  # un trazo recto más largo que esto es una línea (ninguna letra lo tiene)
    orientaciones_recta: int = 24
    vueltas_cota: int = 8  # cifras de una cota que se encadenan desde su triángulo
    cifra_max_m: float = 8.5  # lado mayor de una cifra de cota
    lado_triangulo_m: tuple[float, float] = (2.0, 6.0)  # el triángulo de una cota…
    densidad_triangulo_min: float = 0.4  # …es macizo: llena buena parte de su caja
    cierre_cuerpo_m: float = 1.25  # junta el rayado de las letras de parroquia
    grosor_cuerpo_m: float = 4.0  # y lo que queda más grueso que 2·esto es una de esas letras
    rojo_cuerpo_min: float = 0.25  # parte roja de su tinta (el rayado de adentro sale casi negro)

    def px(self, metros: float) -> float:
        return metros / self.escala

    def px2(self, m2: float) -> float:
        return m2 / (self.escala * self.escala)

    def radio(self, metros: float) -> int:
        return max(1, int(round(metros / self.escala)))


@dataclass(frozen=True)
class Componentes:
    etiquetas: np.ndarray  # int32 (alto, ancho); 0 = fondo
    area: np.ndarray  # px
    lado: np.ndarray  # lado mayor de la caja de cada componente, px
    densidad: np.ndarray  # área / caja
    ancho: np.ndarray  # eje menor (de los segundos momentos), px
    esbeltez: np.ndarray  # eje mayor / eje menor


def componentes(mascara: np.ndarray) -> Componentes:
    """Componentes conexas (8 vecinos) con su caja y su forma; el índice 0 es el fondo."""
    n, etiquetas, stats, _ = cv2.connectedComponentsWithStats(mascara.astype(np.uint8), connectivity=8)
    w, h, area = (stats[:, i].astype(np.float64) for i in (cv2.CC_STAT_WIDTH, cv2.CC_STAT_HEIGHT, cv2.CC_STAT_AREA))
    ys, xs = np.nonzero(etiquetas)
    et = etiquetas[ys, xs]
    x, y = xs.astype(np.float64), ys.astype(np.float64)

    def suma(v=None):
        return np.bincount(et, weights=v, minlength=n)

    cuenta = np.maximum(suma(), 1)
    mx, my = suma(x) / cuenta, suma(y) / cuenta
    cxx = suma(x * x) / cuenta - mx * mx
    cyy = suma(y * y) / cuenta - my * my
    cxy = suma(x * y) / cuenta - mx * my
    media, dif = (cxx + cyy) / 2, np.hypot((cxx - cyy) / 2, cxy)
    # una barra de n píxeles tiene varianza (n² − 1) / 12
    largo = np.sqrt(12 * np.maximum(media + dif, 0) + 1)
    ancho = np.sqrt(12 * np.maximum(media - dif, 0) + 1)
    return Componentes(etiquetas, area, np.maximum(w, h), area / np.maximum(w * h, 1), ancho, largo / ancho)


def _toca(etiquetas: np.ndarray, zona: np.ndarray, n: int) -> np.ndarray:
    """Por componente: si tiene algún píxel dentro de `zona`."""
    return np.bincount(etiquetas[zona], minlength=n) > 0


def _gruesos(tinta: np.ndarray, p: ParametrosRotulos) -> np.ndarray:
    """La parte de la tinta más gruesa que una línea del dibujo (el cuerpo de las letras en negrita)."""
    lado = max(2, int(round(p.px(p.grosor_negrita_m))))
    return cv2.morphologyEx(tinta.astype(np.uint8), cv2.MORPH_OPEN, np.ones((lado, lado), np.uint8)).astype(bool)


def letras_en_negrita(grueso: np.ndarray, tinta: np.ndarray, p: ParametrosRotulos) -> np.ndarray:
    """Letras que tocan una línea o van sobre un rayado: se las reconoce por el grosor del trazo."""
    c = componentes(cerrar(grueso, 1))
    letra = ((c.area >= p.px2(p.area_negrita_min_m2)) & (c.lado < p.px(p.trazo_min_m))
             & (c.esbeltez < p.esbeltez_barra_min))
    letra[0] = False
    return tinta & dilatar(letra[c.etiquetas], p.radio(p.borde_negrita_m))


def lineas_rectas(tinta: np.ndarray, p: ParametrosRotulos) -> np.ndarray:
    """La parte de la tinta que es un trazo recto largo, en cualquier dirección.

    Apertura con un segmento por orientación sobre la tinta engordada un píxel: así una línea de un
    píxel de grosor entra aunque no caiga justo en una de las orientaciones.
    """
    largo = max(3, int(round(p.px(p.recta_min_m))))
    gorda = cv2.dilate(tinta.astype(np.uint8), np.ones((3, 3), np.uint8))
    rectas = np.zeros(tinta.shape, np.uint8)
    c = (largo - 1) / 2
    for k in range(p.orientaciones_recta):
        ang = math.pi * k / p.orientaciones_recta
        dx, dy = c * math.cos(ang), c * math.sin(ang)
        segmento = np.zeros((largo, largo), np.uint8)
        cv2.line(segmento, (int(round(c - dx)), int(round(c - dy))), (int(round(c + dx)), int(round(c + dy))), 1, 1)
        rectas |= cv2.morphologyEx(gorda, cv2.MORPH_OPEN, segmento)
    return rectas.astype(bool) & tinta


def _macizos(c: Componentes, p: ParametrosRotulos) -> np.ndarray:
    """Por componente: si es chica, compacta y llena su caja (el triángulo de una cota)."""
    minimo, maximo = (p.px(m) for m in p.lado_triangulo_m)
    return ((c.lado >= minimo) & (c.lado <= maximo) & (c.esbeltez < p.esbeltez_glifo_max)
            & (c.densidad >= p.densidad_triangulo_min))


def _encadenar(c: Componentes, zona: np.ndarray, candidato: np.ndarray, frente: np.ndarray, vueltas: int,
               p: ParametrosRotulos) -> np.ndarray:
    """Por componente: las candidatas que tocan el frente (a menos de `cerca_m`), y las que tocan a esas…"""
    aceptado = np.zeros(len(c.lado), bool)
    for _ in range(vueltas):
        nuevo = candidato & ~aceptado & _toca(c.etiquetas, dilatar(frente, p.radio(p.cerca_m)) & zona, len(c.lado))
        if not nuevo.any():
            break
        aceptado |= nuevo
        frente = nuevo[c.etiquetas]  # la vuelta siguiente solo mira alrededor de lo recién aceptado
    return aceptado


def pegados_a_lineas(grande: np.ndarray, grueso: np.ndarray, rotulos_ya: np.ndarray, triangulos: np.ndarray,
                     p: ParametrosRotulos) -> np.ndarray:
    """Rótulos que tocan una línea: una letra atravesada en la calle, una cota apoyada en la manzana.

    A las componentes grandes se les quitan los trazos rectos largos. De lo que queda, son rótulo:
     - los pedazos compactos y gruesos (letras en negrita);
     - los compactos y con tinta que siguen a un rótulo ya reconocido (`rotulos_ya`): la "G" de
       "IGLESIA" cuando la "I" pisa el borde del patio;
     - las cifras de las cotas, que se encadenan desde su triángulo (`triangulos`: los que ya se
       reconocieron sueltos): el triángulo se lleva el 9, el 9 el 1…
    """
    resto = grande & ~lineas_rectas(grande, p)
    c = componentes(resto)
    n = len(c.lado)
    chico = c.lado < p.px(p.glifo_max_m)
    forma = chico & (c.esbeltez < p.esbeltez_glifo_max) & (c.area >= p.px(p.tinta_glifo_min_m) * c.lado)
    letra = forma & (np.bincount(c.etiquetas[grueso & resto], minlength=n) >= p.px2(p.area_negrita_min_m2))
    triangulo = _macizos(c, p)
    cifra = c.lado < p.px(p.cifra_max_m)
    vecina = forma & (c.lado > p.px(p.punto_max_m))
    for v in (letra, triangulo, cifra, vecina):
        v[0] = False
    aceptado = (letra | triangulo
                | _encadenar(c, resto, vecina, rotulos_ya | letra[c.etiquetas], p.vueltas_cerca, p)
                | _encadenar(c, resto, cifra, triangulos | triangulo[c.etiquetas], p.vueltas_cota, p))
    return aceptado[c.etiquetas]


def rotulos_de_tinta(tinta: np.ndarray, p: ParametrosRotulos, negra: bool = False) -> np.ndarray:
    """Los píxeles de una tinta (máscara booleana) que son rótulo. No modifica la entrada.

    `negra`: además, las letras gruesas y las cotas pegadas a una línea (solo en la tinta negra: en las
    otras, lo grueso y lo curvo son las curvas de nivel y las quebradas).
    """
    c = componentes(tinta)
    n = len(c.lado)
    chico = c.lado < p.px(p.glifo_max_m)
    mediano = ~chico & (c.lado < p.px(p.trazo_min_m))
    compacto = c.esbeltez < p.esbeltez_glifo_max
    punto = c.lado <= p.px(p.punto_max_m)
    palabra = (c.ancho >= p.px(p.alto_palabra_min_m)) & (c.densidad >= p.densidad_palabra_min)
    # el pedazo de una línea fina cortada (el contorno de un cantero) es compacto, pero casi no tiene tinta
    con_tinta = c.area >= p.px(p.tinta_glifo_min_m) * c.lado
    glifo = (chico & compacto & con_tinta) | ((chico | mediano) & palabra)
    grueso = _gruesos(tinta, p) if negra else None
    if negra:  # símbolos medianos hechos de trazo grueso: no son una línea del dibujo
        glifo |= mediano & (np.bincount(c.etiquetas[grueso], minlength=n) >= p.grueso_simbolo_min * c.area)
    glifo[0] = False
    # los trazos simples (una "I", un "1", un guion) se van con el glifo que tienen al lado
    simple = chico & ~glifo
    simple[0] = False
    for _ in range(p.vueltas_cerca):
        cerca = dilatar((glifo & ~punto)[c.etiquetas], p.radio(p.cerca_m))
        pegado = simple & ~glifo & _toca(c.etiquetas, cerca & tinta, n)
        if not pegado.any():
            break
        glifo = glifo | pegado
    salida = glifo[c.etiquetas]
    if negra:
        grande = ~chico & ~glifo
        grande[0] = False
        ya = (glifo & ~punto)[c.etiquetas] | letras_en_negrita(grueso, tinta, p)
        salida |= ya | pegados_a_lineas(grande[c.etiquetas] & ~ya, grueso, ya, (glifo & _macizos(c, p))[c.etiquetas], p)
    return salida


def letras_de_parroquia(negro: np.ndarray, rojo: np.ndarray, p: ParametrosRotulos) -> np.ndarray:
    """Las letras grandes rojas, rayadas por dentro: cuerpos gruesos con buena parte de tinta roja."""
    tinta = negro | rojo
    c = componentes(abrir(cerrar(tinta, p.radio(p.cierre_cuerpo_m)), p.radio(p.grosor_cuerpo_m)))
    n = len(c.lado)
    en_rojo = np.bincount(c.etiquetas[rojo], minlength=n)
    en_tinta = np.bincount(c.etiquetas[tinta], minlength=n)
    letra = en_rojo >= p.rojo_cuerpo_min * np.maximum(en_tinta, 1)
    letra[0] = False
    return tinta & dilatar(letra[c.etiquetas], p.radio(p.grosor_cuerpo_m))


def rotulos(negro: np.ndarray, rojo: np.ndarray, azul: np.ndarray, p: ParametrosRotulos) -> np.ndarray:
    """Máscara booleana de rótulos a partir de las tres tintas que llevan texto."""
    for nombre, m in (("negro", negro), ("rojo", rojo), ("azul", azul)):
        if m.dtype != bool or m.ndim != 2 or m.shape != negro.shape:
            raise ValueError(f"tinta {nombre}: se espera una máscara booleana {negro.shape}; llegó {m.dtype} {m.shape}")
    return (rotulos_de_tinta(negro, p, negra=True) | rotulos_de_tinta(rojo, p) | rotulos_de_tinta(azul, p)
            | letras_de_parroquia(negro, rojo, p))


def tintas_por_franjas(rgb: np.ndarray, paleta: Paleta, l_tinta_max: float,
                       franja: int = FRANJA_PX) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """(negro, rojo, azul) de toda la imagen, sin tener nunca el CIELAB entero en memoria."""
    alto, ancho = rgb.shape[:2]
    negro, rojo, azul = (np.zeros((alto, ancho), bool) for _ in range(3))
    for y in range(0, alto, franja):
        sub = np.ascontiguousarray(rgb[y:y + franja, :, :3])
        t = detectar_tintas(sub, a_lab(sub), paleta, l_tinta_max)
        negro[y:y + franja], rojo[y:y + franja], azul[y:y + franja] = t.negro, t.rojo, t.azul
    return negro, rojo, azul


def rotulos_de_plano(rgb: np.ndarray, escala: float, paleta: Paleta | None = None) -> np.ndarray:
    """Máscara booleana de rótulos de una imagen RGB uint8 del plano (no la modifica)."""
    if not isinstance(rgb, np.ndarray) or rgb.ndim != 3 or rgb.shape[2] < 3 or rgb.dtype != np.uint8:
        raise ValueError(f"se espera una imagen RGB uint8 (alto, ancho, 3); llegó {getattr(rgb, 'shape', None)}")
    if not (math.isfinite(escala) and escala > 0):
        raise ValueError(f"escala inválida: {escala}")
    negro, rojo, azul = tintas_por_franjas(rgb, paleta or cargar_paleta(), Parametros(escala=escala).l_tinta_max)
    return rotulos(negro, rojo, azul, ParametrosRotulos(escala=escala))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Máscara de rótulos (texto, cotas, símbolos) del plano de 1936.")
    ap.add_argument("entrada", type=Path)
    ap.add_argument("salida", type=Path)
    ap.add_argument("--escala", type=float, default=0.5, help="metros por píxel")
    args = ap.parse_args(argv)
    try:
        from segmentar import leer_imagen
        mascara = rotulos_de_plano(leer_imagen(args.entrada), args.escala)
        args.salida.parent.mkdir(parents=True, exist_ok=True)
        if not cv2.imwrite(str(args.salida), mascara.astype(np.uint8) * 255):
            raise OSError(f"no se pudo escribir {args.salida}")
    except (ValueError, FileNotFoundError, OSError, cv2.error) as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    print(f"listo: {args.salida} ({mascara.mean() * 100:.2f} % de la hoja es rótulo)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
