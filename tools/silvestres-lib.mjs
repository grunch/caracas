// Lógica pura de los árboles silvestres (tools/arboles.mjs): el monte del valle antes de la ciudad.
// Viven desde la primera época y mueren cuando su lugar se urbaniza (crece.png G); su densidad sale
// del monte (crece.png B, tools/geo/valle.py). Ver specs/02, `datos/arboles.bin`.

/** Las clases de la segmentación de 1936 (tools/geo/segmentar_clases.py). */
export const CLASE = Object.freeze({
  DESCONOCIDO: 0, CALLE: 1, PATIO: 2, EDIFICADO: 3, PUBLICO: 4, VERDE: 5, CULTIVO: 6, AGUA: 7, CERRO: 8, MARGEN: 9,
})
const ULTIMA_EPOCA = 5 // 1936
const SIN_MONTE = new Set([CLASE.AGUA, CLASE.MARGEN, CLASE.DESCONOCIDO])
const DESPEJADO_EN_1936 = new Set([CLASE.CULTIVO, CLASE.CALLE, CLASE.PATIO, CLASE.EDIFICADO, CLASE.PUBLICO])
const CANAL_MONTE = 2

/** Azar reproducible en [0, 1) a partir de una semilla entera (mulberry32). */
export function azarDe(semilla) {
  let a = semilla >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** El monte (0–1) del píxel (x, y) del mosaico según crece.png (canal B); fuera de la imagen, 0. */
export function monteEnCrece({ datos, cols, rows, canales, celdaPx }, x, y) {
  const [j, i] = [Math.floor(x / celdaPx), Math.floor(y / celdaPx)]
  if (canales <= CANAL_MONTE || j < 0 || i < 0 || j >= cols || i >= rows) return 0
  return datos[(i * cols + j) * canales + CANAL_MONTE] / 255
}

/**
 * Hasta cuándo vive un árbol silvestre: `null` si ahí no puede haber (la ciudad de 1578, el agua,
 * fuera del plano); la época en que su lugar se urbaniza (`urbano`, de crece.png G); 1936 si el plano
 * de 1936 dibuja ahí un sembradío, un camino o una casa suelta; y 0 (no muere) en el resto del valle.
 */
export function muereSilvestre({ urbano, clase }) {
  if (urbano === 0 || SIN_MONTE.has(clase)) return null
  if (Number.isFinite(urbano)) return urbano
  return DESPEJADO_EN_1936.has(clase) ? ULTIMA_EPOCA : 0
}

/** `(x, y) → bool`: ¿hay alguno de los árboles dados a menos de `distancia` (px)? Con una grilla. */
export function cercaDeOtro(arboles, distancia) {
  const grilla = new Map()
  const clave = (j, i) => j * 65536 + i
  for (const { x, y } of arboles) {
    const k = clave(Math.floor(x / distancia), Math.floor(y / distancia))
    if (!grilla.has(k)) grilla.set(k, [])
    grilla.get(k).push(x, y)
  }
  return (x, y) => {
    const [j, i] = [Math.floor(x / distancia), Math.floor(y / distancia)]
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const v = grilla.get(clave(j + dj, i + di))
        for (let k = 0; v && k < v.length; k += 2) if (Math.hypot(v[k] - x, v[k + 1] - y) < distancia) return true
      }
    }
    return false
  }
}

const SIEMPRE = () => 1
const NUNCA = () => false

/**
 * Los árboles del monte: una grilla de `pasoPx` con un candidato sacudido por celda (así nunca quedan
 * encimados), que se planta con probabilidad `monte(x, y) · ralo(x, y)`. El azar de cada celda es propio
 * (semilla + celda): descartar un árbol no mueve a los demás.
 * - `muere(x, y)`: época en que muere (0 = nunca) o `null` si ahí no va (ver muereSilvestre).
 * - `ocupado(x, y)`: ya hay un árbol del plano; `marco` = [x0, y0, x1, y1): fuera no se planta.
 * - `radioPx` = [mínimo, máximo]: los más son matas chicas; en el monte cerrado, árboles más grandes.
 * Devuelve [{x, y, r, nace: 0, muere, silvestre: true}], en píxeles del mosaico, por filas.
 */
export function arbolesSilvestres({
  ancho, alto, pasoPx, semilla, monte, muere, radioPx, ralo = SIEMPRE, ocupado = NUNCA, marco = [0, 0, ancho, alto],
}) {
  const [x0, y0, x1, y1] = marco
  const [rMin, rMax] = radioPx
  const arboles = []
  for (let i = 0; i < Math.ceil(alto / pasoPx); i++) {
    for (let j = 0; j < Math.ceil(ancho / pasoPx); j++) {
      const azar = azarDe(Math.imul(semilla, 0x9e3779b1) ^ Math.imul(i, 73856093) ^ Math.imul(j, 19349663))
      const [x, y] = [(j + azar()) * pasoPx, (i + azar()) * pasoPx]
      const [suerte, talla] = [azar(), azar()]
      if (x < x0 || y < y0 || x >= x1 || y >= y1 || x >= ancho || y >= alto) continue
      const m = monte(x, y)
      if (suerte >= m * ralo(x, y)) continue
      const hasta = muere(x, y)
      if (hasta === null || ocupado(x, y)) continue
      const r = rMin + (rMax - rMin) * (0.25 + 0.75 * m) * talla ** 1.5
      arboles.push({ x: Math.floor(x * 10) / 10, y: Math.floor(y * 10) / 10, r: Math.round(r * 10) / 10, nace: 0, muere: hasta, silvestre: true })
    }
  }
  return arboles
}
