/**
 * ¿Se coló la sección de una vía de hoy en una época anterior a su apertura? (#277, #278; paso 3 de #269)
 *
 * Toma el eje de una vía de la capa Hoy (los tramos de datos/calles.bin, de OpenStreetMap) y lo mide contra las
 * manzanas que el sitio dibuja en cada época (los campos de distancia firmada de suelo-manzanas). En cada muestra:
 *  - «dentro»: el eje de hoy cae en una manzana de esa época. Ahí la vía de hoy no se proyectó: la manzana sigue.
 *  - «corredor»: hay manzana a los dos lados; se mide el ancho libre de fachada a fachada.
 *  - «abierto»: de algún lado no hay manzana a la vista (campo, plaza, cruce): no hay sección que medir.
 * Un corredor tan ancho como una avenida moderna antes de que esa avenida abriera es un sospechoso a revisar contra
 * el plano de la época; puede ser una calle ancha de verdad. Lógica pura: no lee archivos.
 */

/** Píxeles del plano base por metro (mosaico de 1936 a 0,5 m/px). */
const PX_POR_M = 2
/** Entre muestras a lo largo del eje (m). */
export const PASO_M = 10
/** Hasta dónde se busca la manzana a cada lado del eje (m). */
export const MAX_M = 40
/** Desde este ancho libre (m), un tramo con corredor casi continuo se lista para revisar. */
export const ANCHO_SOSPECHOSO_M = 20
/** Parte de las muestras de un tramo que tienen que ser corredor para listarlo. */
export const CORREDOR_MINIMO = 0.8

/** Distancia firmada (m) al borde de manzana más cercano en `anio`: > 0 adentro. null fuera del campo o sin esa época. */
export function distanciaEn(campo, anio, x, y) {
  const canal = campo.meta.canales.indexOf(anio)
  const [x0, y0, x1, y1] = campo.meta.caja
  if (canal < 0 || x < x0 || x > x1 || y < y0 || y > y1) return null
  const i = Math.min(campo.ancho - 1, Math.floor(((x - x0) / (x1 - x0)) * campo.ancho))
  const j = Math.min(campo.alto - 1, Math.floor(((y - y0) / (y1 - y0)) * campo.alto))
  return ((campo.datos[(j * campo.ancho + i) * campo.canales + canal] - 128) / 127) * campo.meta.dist_max_m
}

/** Metros desde `p` en la dirección `n` hasta entrar en una manzana; null si no aparece ninguna en `max_m`. */
function hastaLaManzana(campo, anio, [x, y], [nx, ny], max_m) {
  for (let m = 1; m <= max_m; m++) {
    const d = distanciaEn(campo, anio, x + nx * m * PX_POR_M, y + ny * m * PX_POR_M)
    if (d === null) return null
    if (d > 0) return m
  }
  return null
}

/**
 * El ancho libre en `p` a través de la normal `n` (unitaria, en px del plano):
 * { estado: 'dentro' } · { estado: 'abierto' } · { estado: 'corredor', ancho_m } · null si el campo no llega.
 */
export function anchoLibre(campo, anio, p, n, { max_m = MAX_M } = {}) {
  const aqui = distanciaEn(campo, anio, p[0], p[1])
  if (aqui === null) return null
  if (aqui > 0) return { estado: 'dentro' }
  const a = hastaLaManzana(campo, anio, p, n, max_m), b = hastaLaManzana(campo, anio, p, [-n[0], -n[1]], max_m)
  if (a === null || b === null) return { estado: 'abierto' }
  return { estado: 'corredor', ancho_m: a + b }
}

/** Los puntos (px del plano) donde se mide un tramo de calles.bin {x, y, dx, dy, largo (m)}: cada `paso_m`, centrados. */
export function muestrasDeTramo(t, paso_m = PASO_M) {
  const cuantas = Math.max(1, Math.round(t.largo / paso_m))
  const puntos = []
  for (let k = 0; k < cuantas; k++) {
    const s = ((k + 0.5) / cuantas - 0.5) * t.largo * PX_POR_M
    puntos.push([t.x + t.dx * s, t.y + t.dy * s])
  }
  return puntos
}

const mediana = (valores) => {
  if (!valores.length) return null
  const v = [...valores].sort((a, b) => a - b)
  return v[Math.floor(v.length / 2)]
}
const porciento = (parte, total) => (total ? Math.round((parte / total) * 100) : null)

function medirTramo(t, campo, anio, opciones) {
  const cuenta = { muestras: 0, fuera: 0, dentro: 0, abierto: 0, anchos: [] }
  for (const p of muestrasDeTramo(t, opciones.paso_m)) {
    const r = anchoLibre(campo, anio, p, [-t.dy, t.dx], opciones)
    if (r === null) { cuenta.fuera++; continue }
    cuenta.muestras++
    if (r.estado === 'corredor') cuenta.anchos.push(r.ancho_m)
    else cuenta[r.estado]++
  }
  return cuenta
}

/** ¿El tramo tiene corredor casi continuo y tan ancho como una avenida moderna? */
function esSospechoso(c) {
  return c.muestras > 0 && c.anchos.length / c.muestras >= CORREDOR_MINIMO && mediana(c.anchos) >= ANCHO_SOSPECHOSO_M
}

/**
 * Una vía de hoy (sus tramos de calles.bin) contra las manzanas de `anio`: cuántas muestras, qué parte cae dentro de
 * una manzana, en campo abierto o en corredor, el ancho libre mediano y los tramos sospechosos, con su posición.
 */
export function medirVia(tramos, campo, anio, opciones = {}) {
  const total = { muestras: 0, fuera: 0, dentro: 0, abierto: 0, anchos: [] }, sospechosos = []
  for (const t of tramos) {
    const c = medirTramo(t, campo, anio, opciones)
    for (const k of ['muestras', 'fuera', 'dentro', 'abierto']) total[k] += c[k]
    total.anchos.push(...c.anchos)
    if (esSospechoso(c)) sospechosos.push({ nombre: t.nombre, x: t.x, y: t.y, largo_m: t.largo, ancho_mediana_m: mediana(c.anchos) })
  }
  return {
    muestras: total.muestras, fuera: total.fuera,
    dentro_pct: porciento(total.dentro, total.muestras), abierto_pct: porciento(total.abierto, total.muestras),
    corredor_pct: porciento(total.anchos.length, total.muestras), ancho_mediana_m: mediana(total.anchos), sospechosos,
  }
}

/** Los tramos de la capa Hoy que llevan exactamente uno de los nombres de la vía. */
export const tramosDeVia = (tramos, nombres) => tramos.filter((t) => nombres.includes(t.nombre))
