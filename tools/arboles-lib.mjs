// Lógica pura de tools/arboles.mjs: los árboles del plano de 1936 → public/datos/arboles.bin (specs/02).
import { desdeCuando } from '../src/epocas.js'

export const BYTES_POR_ARBOL = 8 // 4 × Uint16 LE: x, y (px del mosaico), radio (dm), nace (época)
const DM_POR_M = 10
const MAX_U16 = 0xffff

/** [{x, y, r (px), nace}] → bytes de arboles.bin; `metro` = metros por píxel del mosaico. */
export function codificarArboles(arboles, metro) {
  const salida = new Uint8Array(arboles.length * BYTES_POR_ARBOL)
  const v = new DataView(salida.buffer)
  arboles.forEach(({ x, y, r, nace }, i) => {
    const [px, py] = [Math.round(x), Math.round(y)]
    if (!(px >= 0 && px <= MAX_U16 && py >= 0 && py <= MAX_U16)) throw new Error(`árbol ${i}: (${x}, ${y}) fuera de Uint16`)
    const dm = Math.round(r * metro * DM_POR_M)
    if (!(dm >= 1 && dm <= MAX_U16)) throw new Error(`árbol ${i}: radio inválido (${r} px)`)
    const o = i * BYTES_POR_ARBOL
    v.setUint16(o, px, true)
    v.setUint16(o + 2, py, true)
    v.setUint16(o + 4, dm, true)
    v.setUint16(o + 6, nace, true)
  })
  return salida
}

/**
 * Desde qué época está edificado el píxel (x, y) del mosaico según crece.png (R, "desde cuándo";
 * celdas de `celdaPx` píxeles desde la esquina noroeste). Nunca, o fuera de la imagen: Infinity.
 */
export function desdeEnCrece({ datos, cols, rows, canales, celdaPx, etapas }, x, y) {
  const [j, i] = [Math.floor(x / celdaPx), Math.floor(y / celdaPx)]
  if (j < 0 || i < 0 || j >= cols || i >= rows) return Infinity
  return desdeCuando(datos[(i * cols + j) * canales] / 255, etapas)
}

/**
 * Para los árboles de jardín (plazas y patios): la época más tardía edificada a `radioCeldas` celdas o
 * menos (el patio aparece con la casa que lo rodea). Sin nada edificado alrededor: Infinity.
 */
export function desdeDelEntorno(crece, x, y, radioCeldas) {
  let ultima = -Infinity
  for (let di = -radioCeldas; di <= radioCeldas; di++) {
    for (let dj = -radioCeldas; dj <= radioCeldas; dj++) {
      const e = desdeEnCrece(crece, x + dj * crece.celdaPx, y + di * crece.celdaPx)
      if (Number.isFinite(e)) ultima = Math.max(ultima, e)
    }
  }
  return Number.isFinite(ultima) ? ultima : Infinity
}

/** ¿El punto cae dentro del polígono [x0, y0, x1, y1, …] o a menos de `margen` de su borde? */
export function dentroOCerca(anillo, x, y, margen) {
  let dentro = false
  let cerca = false
  const n = anillo.length / 2
  for (let k = 0, m = n - 1; k < n; m = k++) {
    const [ax, ay, bx, by] = [anillo[k * 2], anillo[k * 2 + 1], anillo[m * 2], anillo[m * 2 + 1]]
    if ((ay > y) !== (by > y) && x < ((bx - ax) * (y - ay)) / (by - ay) + ax) dentro = !dentro
    const [dx, dy] = [bx - ax, by - ay]
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)))
    if (Math.hypot(ax + t * dx - x, ay + t * dy - y) < margen) cerca = true
  }
  return dentro || cerca
}

/** Los techos de ciudad.pak que dejan de estar en alguna época (vida = nace + 8·muere, muere > 0). */
export function casasQueMueren({ vertices, techos, vida }) {
  if (!vida) return []
  const casas = []
  for (let t = 0; t < techos.length / 4; t++) {
    const muere = Math.floor(vida[t] / 8)
    if (muere === 0) continue
    const [inicio, cuantos] = [techos[t * 4], techos[t * 4 + 1]]
    casas.push({ anillo: Array.from(vertices.subarray(inicio * 2, (inicio + cuantos) * 2)), muere })
  }
  return casas
}

/**
 * Desde qué época se ve un árbol de 1936. Fuera de lo edificado (quebradas, haciendas, cerros) existió
 * siempre; en la ciudad, nace con su barrio (crece.png). Y nunca dentro de una casa en pie: si su copa
 * pisa un techo que después desaparece, espera a que muera. `desde(x, y)` lee crece.png.
 */
export function naceArbol({ x, y, r }, { desde, casas }) {
  const barrio = desde(x, y)
  let nace = Number.isFinite(barrio) ? barrio : 0
  for (const { anillo, muere } of casas) {
    if (muere > nace && dentroOCerca(anillo, x, y, r * 0.5)) nace = muere
  }
  return nace
}
