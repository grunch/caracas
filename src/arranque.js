/**
 * La entrada del sitio, como la de baires.mormon.garden: la hoja entera desde arriba, en tinta, se pone en
 * color; al rato la ciudad se levanta en una ola que sale de la plaza y se apura hacia las orillas, mientras la
 * cámara baja volando hasta el centro. Lógica pura; la secuencia la arma src/main.js.
 */

/** Adonde llega el vuelo: el centro, un poco al norte de la Plaza Bolívar (el origen), mirando hacia el Ávila. */
export const VISTA_CENTRO = Object.freeze({ x: 60, z: -260, dist: 1500, yaw: -0.35, pitch: 0.52 })
export const DURACION_VUELO_S = 5
/** Cuánto se espera antes de levantar la ciudad: tras cerrar la bienvenida, o desde que carga si no la hay. */
export const ESPERA_MS = Object.freeze({ trasIntro: 900, sinIntro: 1600 })

const OLA = Object.freeze({ base: 1500, aceleracion: 0.55, bajada: 5200 }) // m/s, 1/s y m/s

/** ¿Arranca con la entrada? Los tests (`?sinintro`, `?capture`), la vitrina y `?quieto` empiezan quietos. */
export function debeArrancar(params) {
  return !['capture', 'sinintro', 'vitrina', 'quieto'].some((p) => params.has(p))
}

export const esperaDeArranque = (huboIntro) => (huboIntro ? ESPERA_MS.trasIntro : ESPERA_MS.sinIntro)

/**
 * A qué velocidad (m/s) avanza el frente de la ola que levanta la ciudad, según dónde va (`frente`, m desde la
 * plaza): al subir arranca tranquila y se apura hacia las orillas; al acostar baja rápida y pareja.
 */
export function velocidadDeOla(frente, subiendo) {
  return subiendo ? OLA.base + Math.max(0, frente) * OLA.aceleracion : OLA.bajada
}

/** La hoja entera (`coords.hoja`), desde arriba: de donde sale el vuelo. La cámara la acota a su distancia máxima. */
export function vistaDeHoja({ x0, z0, ancho, alto }) {
  return { x: x0 + ancho / 2, z: z0 + alto / 2, dist: Math.max(ancho, alto) * 1.9, yaw: 0, pitch: 1.5 }
}
