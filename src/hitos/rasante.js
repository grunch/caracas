/**
 * La rasante de un puente (lógica pura, sin three.js). Un puente no se apoya en el relieve vértice a vértice como
 * una casa: tiene dos cabezas, y su tablero va recto de la cota de un acceso a la del otro. Los apoyos bajan por
 * separado hasta el lecho. Acá están las cuentas que comparten los datos (src/hitos/datos/puentes-guaire.js), el
 * adaptador (src/hitos/puente.js) y, como espejo, el shader (src/hitos/material.js, modo APOYO.RASANTE).
 */
import { METRO } from './datos/marco.js'

/** El talud de las orillas del lecho: a lo largo del puente (desde cada cabeza) y a lo ancho (desde el borde). */
export const TALUD_LARGO_M = 7
export const TALUD_ANCHO_M = 11

const suave = (t) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x) }

/**
 * El marco de un puente a partir de sus dos cabezas ([[x, y], [x, y]] en píxeles del plano): el centro, el eje
 * de la primera a la segunda y el largo en metros.
 */
export function marcoDeCabezas([[ax, ay], [bx, by]], metro = METRO) {
  const [dx, dy] = [bx - ax, by - ay]
  const largoPx = Math.hypot(dx, dy)
  if (!(largoPx > 0)) throw new Error('puente: las dos cabezas no pueden estar en el mismo punto')
  return Object.freeze({ x: (ax + bx) / 2, y: (ay + by) / 2, eje: Object.freeze([dx / largoPx, dy / largoPx]), largo: largoPx * metro })
}

/** Por dónde va el punto entre las dos cabezas: 0 en la primera, 1 en la segunda, sin pasarse. */
function avance(a, b, p) {
  const [dx, dz] = [b.x - a.x, b.z - a.z]
  const largo2 = dx * dx + dz * dz
  if (!(largo2 > 0)) throw new Error('puente: las dos cabezas no pueden estar en el mismo punto')
  return Math.min(1, Math.max(0, ((p.x - a.x) * dx + (p.z - a.z) * dz) / largo2))
}

/**
 * La cota de la rasante sobre el punto p = { x, z }: recta entre la cota de la cabeza a y la de la b
 * ({ x, z, cota }), sin mirar el terreno intermedio. Es lo que hace el shader con sueloEn() de cada cabeza.
 */
export function cotaDeRasante(a, b, p) {
  return a.cota + (b.cota - a.cota) * avance(a, b, p)
}

/** La pendiente del tablero (m/m), positiva si sube de a hacia b. */
export function pendienteDeRasante(a, b) {
  const largo = Math.hypot(b.x - a.x, b.z - a.z)
  if (!(largo > 0)) throw new Error('puente: las dos cabezas no pueden estar en el mismo punto')
  return (b.cota - a.cota) / largo
}

/**
 * El lecho bajo un puente, en su marco (x a lo largo, z a lo ancho, en metros desde el centro): cuánto baja el
 * suelo bajo el terreno. `vano` = [x0, x1], el tramo abierto; `ancho`, de borde a borde; `fondo`, lo que baja
 * en el medio. En el borde vale cero (empalma con el terreno) y las orillas bajan en talud.
 */
export function lechoDe({ vano, ancho, fondo, taludLargo = TALUD_LARGO_M, taludAncho = TALUD_ANCHO_M }) {
  const [x0, x1] = vano ?? []
  if (!(x1 > x0)) throw new Error('puente: el vano del lecho debe ser un intervalo [desde, hasta]')
  if (!(fondo > 0 && ancho > 0)) throw new Error('puente: el lecho necesita fondo y ancho mayores que cero')
  return (x, z) => fondo * suave(Math.min(x - x0, x1 - x) / taludLargo) * suave((ancho / 2 - Math.abs(z)) / taludAncho)
}
