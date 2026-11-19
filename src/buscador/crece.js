/**
 * Desde cuándo un punto del plano es ciudad, leído de plano/crece.png (specs/02): R = desde qué época
 * está edificado, G = desde cuál está urbanizado, con la codificación "desde cuándo" de src/epocas.js.
 * El buscador mira un redondel alrededor del punto: una cuadra o una esquina caen sobre la calle, que
 * nunca está "edificada"; lo que cuenta es lo que la rodea.
 */
import { desdeCuando } from '../epocas.js'

export const RADIO_MUESTRA_M = 32
/** Parte del redondel que tiene que estar edificada (o urbanizada) para decir que el lugar lo está. */
export const UMBRAL = Object.freeze({ edificado: 0.2, urbanizado: 0.5 })

/** La primera época en la que al menos `parte` de las celdas ya llegó (Infinity si ninguna). */
function primeraCon(etapas, E, parte) {
  const cuenta = new Array(E).fill(0)
  for (const k of etapas) if (k < E) cuenta[k]++
  let acumulado = 0
  for (let k = 0; k < E; k++) {
    acumulado += cuenta[k]
    if (acumulado >= parte * etapas.length) return k
  }
  return Infinity
}

/** Celdas RGBA de crece.png (las del redondel) → { edificado, urbanizado }: índices de época o Infinity. */
export function etapasDe(rgba, E, umbral = UMBRAL) {
  const n = Math.floor(rgba.length / 4)
  if (!n) return null
  const canal = (c) => Array.from({ length: n }, (_, i) => desdeCuando(rgba[i * 4 + c] / 255, E))
  return { edificado: primeraCon(canal(0), E, umbral.edificado), urbanizado: primeraCon(canal(1), E, umbral.urbanizado) }
}

/** Las celdas (columna, fila) de un redondel de `radioM` alrededor del píxel del plano, dentro de la imagen. */
export function celdasAlrededor([px, py], { metro, celdaM, cols, rows }, radioM = RADIO_MUESTRA_M) {
  const [cx, cy] = [(px * metro) / celdaM, (py * metro) / celdaM]
  const r = radioM / celdaM
  const celdas = []
  for (let j = Math.floor(cy - r); j <= Math.ceil(cy + r); j++) {
    for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++) {
      if (i < 0 || j < 0 || i >= cols || j >= rows) continue
      if (Math.hypot(i + 0.5 - cx, j + 0.5 - cy) <= r) celdas.push([i, j])
    }
  }
  return celdas
}

/**
 * Baja datos/crece.json y plano/crece.png (ya están en la caché del navegador si la línea de tiempo
 * arrancó) y devuelve { epocas, etapas(px) } o null si faltan (la ciudad de demostración no los tiene).
 */
export async function cargarCrece({ metro }) {
  try {
    const r = await fetch('datos/crece.json')
    if (!r.ok) return null
    const { epocas, celda_m: celdaM = 8 } = await r.json()
    if (!Array.isArray(epocas) || !epocas.length || !(celdaM > 0)) return null
    const imagen = new Image()
    imagen.src = 'plano/crece.png'
    await imagen.decode()
    const lienzo = Object.assign(document.createElement('canvas'), { width: imagen.naturalWidth, height: imagen.naturalHeight })
    const g = lienzo.getContext('2d', { willReadFrequently: true })
    g.drawImage(imagen, 0, 0)
    const rejilla = { metro, celdaM, cols: lienzo.width, rows: lienzo.height }
    return Object.freeze({
      epocas: Object.freeze(epocas.map((e) => Object.freeze({ año: e.año }))),
      etapas(px) {
        const celdas = celdasAlrededor(px, rejilla)
        const rgba = new Uint8ClampedArray(celdas.length * 4)
        celdas.forEach(([i, j], k) => rgba.set(g.getImageData(i, j, 1, 1).data, k * 4))
        return etapasDe(rgba, epocas.length)
      },
    })
  } catch {
    return null
  }
}
