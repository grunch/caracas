// Lógica pura de tools/arboles.mjs: los árboles del plano de 1936 → public/datos/arboles.bin (specs/02).
import { desdeCuando } from '../src/epocas.js'
import { ALA, CAMPOS_ALA, CAMPOS_MARCO, esDePatio } from '../src/alas.js'
import { azar } from '../src/techos.js'

export const BYTES_POR_ARBOL = 8 // 4 × Uint16 LE: x, y (px del mosaico), radio (dm), vida
const DM_POR_M = 10
const MAX_U16 = 0xffff
const MAX_EPOCA = 7 // nace y muere van en 3 bits cada uno

/** La vida de un árbol en un u16: nace + 8·muere (como `vida` de ciudad.pak; muere = 0, no muere) + 64 si es silvestre. */
export function vidaArbol({ nace, muere = 0, silvestre = false }, i = 0) {
  const enteros = Number.isInteger(nace) && Number.isInteger(muere) && nace >= 0 && muere >= 0
  if (!enteros || nace > MAX_EPOCA || muere > MAX_EPOCA || (muere !== 0 && muere <= nace)) {
    throw new Error(`árbol ${i}: vida inválida (nace ${nace}, muere ${muere})`)
  }
  return nace + 8 * muere + (silvestre ? 64 : 0)
}

/**
 * [{x, y, r (px), nace, muere?, silvestre?}] → bytes de arboles.bin; `metro` = metros por píxel del mosaico.
 */
export function codificarArboles(arboles, metro) {
  const salida = new Uint8Array(arboles.length * BYTES_POR_ARBOL)
  const v = new DataView(salida.buffer)
  arboles.forEach(({ x, y, r, ...vida }, i) => {
    const [px, py] = [Math.round(x), Math.round(y)]
    if (!(px >= 0 && px <= MAX_U16 && py >= 0 && py <= MAX_U16)) throw new Error(`árbol ${i}: (${x}, ${y}) fuera de Uint16`)
    const dm = Math.round(r * metro * DM_POR_M)
    if (!(dm >= 1 && dm <= MAX_U16)) throw new Error(`árbol ${i}: radio inválido (${r} px)`)
    const o = i * BYTES_POR_ARBOL
    v.setUint16(o, px, true)
    v.setUint16(o + 2, py, true)
    v.setUint16(o + 4, dm, true)
    v.setUint16(o + 6, vidaArbol(vida, i), true)
  })
  return salida
}

/**
 * Desde qué época está edificado (canal 0, R) o urbanizado (canal 1, G) el píxel (x, y) del mosaico
 * según crece.png ("desde cuándo"; celdas de `celdaPx` píxeles desde la esquina noroeste). Nunca, fuera
 * de la imagen o si la imagen no trae ese canal: Infinity.
 */
export function desdeEnCrece({ datos, cols, rows, canales, celdaPx, etapas }, x, y, canal = 0) {
  const [j, i] = [Math.floor(x / celdaPx), Math.floor(y / celdaPx)]
  if (canal >= canales || j < 0 || i < 0 || j >= cols || i >= rows) return Infinity
  return desdeCuando(datos[(i * cols + j) * canales + canal] / 255, etapas)
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

/** Los anillos de los techos que nunca mueren (con vida: muere = 0; sin vida, todos). */
export function techosQueQuedan({ vertices, techos, vida }) {
  const anillos = []
  for (let t = 0; t < techos.length / 4; t++) {
    if (vida && vida[t] >= 8) continue
    const [inicio, cuantos] = [techos[t * 4], techos[t * 4 + 1]]
    anillos.push(Array.from(vertices.subarray(inicio * 2, (inicio + cuantos) * 2)))
  }
  return anillos
}

/**
 * `(x, y) → bool`: ¿el punto cae dentro de alguno de los anillos? Con una grilla de `celdaPx` para no
 * probar los ~60 mil techos por árbol.
 */
export function bajoUnTecho(anillos, celdaPx) {
  const grilla = new Map()
  const clave = (i, j) => `${i},${j}`
  for (const anillo of anillos) {
    const xs = anillo.filter((_, k) => k % 2 === 0)
    const ys = anillo.filter((_, k) => k % 2 === 1)
    for (let i = Math.floor(Math.min(...xs) / celdaPx); i <= Math.floor(Math.max(...xs) / celdaPx); i++) {
      for (let j = Math.floor(Math.min(...ys) / celdaPx); j <= Math.floor(Math.max(...ys) / celdaPx); j++) {
        const k = clave(i, j)
        if (!grilla.has(k)) grilla.set(k, [])
        grilla.get(k).push(anillo)
      }
    }
  }
  return (x, y) => (grilla.get(clave(Math.floor(x / celdaPx), Math.floor(y / celdaPx))) ?? [])
    .some((anillo) => dentroOCerca(anillo, x, y, 0))
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

const CLASE_CALLE = 1
const CLASES_DE_CIUDAD = new Set([1, 2, 3, 4]) // calle, patio, edificado, edificio público
const RUMBOS = 8
const RUMBOS_DE_PLAZA = 6
export const JARDINES_DESDE = 3 // 1889: los jardines de Guzmán Blanco (la Plaza Bolívar es de 1874)

/**
 * ¿El árbol está en una plaza o en una calle? Desde su centro se mira en 8 rumbos hasta `maxPx`: lo
 * primero de ciudad que se encuentra (calle, patio o casa; el verde del cantero y su contorno no
 * cuentan) es calle en casi todos. Un jardín de patio da con su patio o su casa. `claseEn(x, y)` lee
 * la segmentación de 1936.
 */
export function esDePlaza(claseEn, x, y, { pasoPx, maxPx }) {
  let calles = 0
  for (let k = 0; k < RUMBOS; k++) {
    const [dx, dy] = [Math.cos((k * 2 * Math.PI) / RUMBOS), Math.sin((k * 2 * Math.PI) / RUMBOS)]
    for (let d = pasoPx; d <= maxPx; d += pasoPx) {
      const clase = claseEn(x + dx * d, y + dy * d)
      if (!CLASES_DE_CIUDAD.has(clase)) continue
      if (clase === CLASE_CALLE) calles++
      break
    }
  }
  return calles >= RUMBOS_DE_PLAZA
}

/**
 * Hasta Guzmán Blanco las plazas eran de tierra (la Plaza Mayor, un mercado) y las calles no tenían
 * árboles: un árbol de plaza o de calle no aparece antes de 1889. Los de los patios, sí.
 */
export const naceEnPlaza = (nace, dePlaza) => (dePlaza ? Math.max(nace, JARDINES_DESDE) : nace)

const EPOCAS = 6
const ARBOL_EN_PATIO = 0.15 // de los patios en que cabe, cuántos tienen su árbol
const ARBOL_EN_SOLAR = 0.4
const PATIO_CON_ARBOL_M = 4 // lado mínimo del patio para que le quepa un árbol
const RADIO_PATIO_M = [1.6, 2.6]
const RADIO_SOLAR_M = [2.2, 3.8]

/**
 * Los árboles de los patios y los solares de las casas de patio (marcos y alas de ciudad.pak, tools/geo/alas.py):
 * el plano de 1936 no los dibuja (pinta la manzana maciza), así que van por regla, como en la vista aérea
 * del pueblo colonial: un árbol en algunos patios y en buena parte de los solares. Nacen con su casa
 * y mueren cuando la casa deja de ser de patio (pasa a ecléctica, moderna…: ahí el visor la techa entera)
 * o cuando muere. Determinista: el azar sale del número de techo y del ala. → [{x, y, r (px), nace, muere}]
 */
export function arbolesDePatio({ marcos, alas, techos, vida, historia }, metro) {
  if (!marcos || !alas) return []
  const salida = []
  for (let m = 0; m < marcos.length; m += CAMPOS_MARCO) {
    const [techo, ox, oy, eux, euy, , , , , primera, cuantas] = marcos.subarray(m, m + CAMPOS_MARCO)
    if (!cuantas) continue
    const semilla = techos[techo * 4 + 3]
    const [nace, muereCasa] = vida ? [vida[techo] % 8, Math.floor(vida[techo] / 8)] : [0, 0]
    const estiloEn = (e) => (historia ? historia[techo * EPOCAS + e] % 16 : (techos[techo * 4 + 2] >> 8) & 0xff)
    if (!esDePatio(estiloEn(nace), semilla, nace)) continue
    let muere = muereCasa
    for (let e = nace + 1; e < (muereCasa || EPOCAS); e++) {
      if (!esDePatio(estiloEn(e), semilla, e)) { muere = e; break }
    }
    for (let k = 0; k < cuantas; k++) {
      const [tipo, u0, v0, u1, v1] = alas.subarray((primera + k) * CAMPOS_ALA, (primera + k + 1) * CAMPOS_ALA)
      if (tipo !== ALA.PATIO && tipo !== ALA.SOLAR) continue
      const solar = tipo === ALA.SOLAR
      const lado = Math.min(u1 - u0, v1 - v0) * metro
      if (lado < PATIO_CON_ARBOL_M || azar(techo * 31 + k, 41) >= (solar ? ARBOL_EN_SOLAR : ARBOL_EN_PATIO)) continue
      const [r0, r1] = solar ? RADIO_SOLAR_M : RADIO_PATIO_M
      const r = Math.min(r0 + (r1 - r0) * azar(techo * 31 + k, 42), lado * 0.45)
      // en cualquier parte del patio (o del solar) en que la copa quepa entera
      const rp = r / metro
      const [u, v] = [u0 + rp + (u1 - u0 - 2 * rp) * azar(techo * 31 + k, 43), v0 + rp + (v1 - v0 - 2 * rp) * azar(techo * 31 + k, 44)]
      salida.push({ x: ox + u * eux - v * euy, y: oy + u * euy + v * eux, r: r / metro, nace, muere })
    }
  }
  return salida
}
