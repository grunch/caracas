/**
 * Un vuelo de cámara con guion (la entrada del sitio, src/arranque.js): de una vista a otra en un tiempo dado,
 * con arranque y llegada suaves. Lógica pura; la cámara (src/camara.js) lo recorre cuadro a cuadro.
 */

/** Sube lento, acelera y llega lento (cúbica de entrada y salida). `t` se acota a [0, 1]. */
export function curvaSuave(t) {
  const u = Math.min(1, Math.max(0, t))
  return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2
}

/** El giro de `a` a `b` por el lado corto, en (−π, π]. */
const giroCorto = (a, b) => {
  const d = (b - a) % (2 * Math.PI)
  return d > Math.PI ? d - 2 * Math.PI : d <= -Math.PI ? d + 2 * Math.PI : d
}

/**
 * La vista a la fracción `t` (0 a 1, ya suavizada o no) del camino de `desde` a `hasta` ({ x, z, dist, yaw,
 * pitch }). La distancia va en escala logarítmica, para que acercarse desde lejos se sienta parejo.
 */
export function vistaEnTrayecto(desde, hasta, t) {
  const mezcla = (a, b) => a + (b - a) * t
  return {
    x: mezcla(desde.x, hasta.x),
    z: mezcla(desde.z, hasta.z),
    dist: Math.exp(mezcla(Math.log(desde.dist), Math.log(hasta.dist))),
    yaw: desde.yaw + giroCorto(desde.yaw, hasta.yaw) * t,
    pitch: mezcla(desde.pitch, hasta.pitch),
  }
}
