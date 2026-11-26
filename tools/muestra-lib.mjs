// La muestra de datos (T12): un recorte de 1 km² alrededor de la Plaza Bolívar, sacado de los datos del sitio
// (public/), para que los E2E del CI corran con datos de verdad sin bajar ni dibujar la ciudad entera. Las
// coordenadas no cambian (píxeles del plano entero): solo quedan menos techos, árboles y teselas.

export const LADO_M = 1000
const CAMPOS_TECHO = 4 // inicio, cuántos, pisos y estilo, semilla
const CAMPOS_MARCO = 11 // techo, ox, oy, eux, euy, ancho, fondo, calles, crujía, primera ala, cuántas
const CAMPOS_ALA = 5
const CAMPOS_HISTORIA = 6
const BYTES_ARBOL = 8

/** Las texturas grandes que en la muestra son las de 2048 o 4096 que ya existen (el material las estira igual). */
export const SUSTITUTOS = Object.freeze({
  'public/plano/medio.webp': 'public/plano/medio-4k.webp',
  'public/plano/suelo.webp': 'public/plano/suelo-2k.webp',
  'public/plano/rotulos.webp': 'public/plano/rotulos-2k.webp',
})

/** [x0, y0, x1, y1] en píxeles del plano: LADO_M alrededor de la plaza, dentro de la hoja. */
export function cajaDeMuestra({ ancho, alto, metro, plaza }) {
  const medio = LADO_M / 2 / metro
  const [px, py] = plaza
  return [Math.max(0, Math.round(px - medio)), Math.max(0, Math.round(py - medio)),
    Math.min(ancho, Math.round(px + medio)), Math.min(alto, Math.round(py + medio))]
}

const dentro = ([x0, y0, x1, y1], x, y) => x >= x0 && x < x1 && y >= y0 && y < y1

/** Los índices de los techos con el centro (el promedio de sus vértices) dentro de la caja. */
function techosDentro({ vertices, techos }, caja) {
  const quedan = []
  for (let k = 0; k < techos.length / CAMPOS_TECHO; k++) {
    const inicio = techos[k * CAMPOS_TECHO]
    const cuantos = techos[k * CAMPOS_TECHO + 1]
    let sx = 0
    let sy = 0
    for (let v = inicio; v < inicio + cuantos; v++) {
      sx += vertices[2 * v]
      sy += vertices[2 * v + 1]
    }
    if (dentro(caja, sx / cuantos, sy / cuantos)) quedan.push(k)
  }
  return quedan
}

/** Los registros `quedan` de un arreglo de registros de `campos` valores. */
const registros = (datos, campos, quedan) => quedan.flatMap((k) => [...datos.subarray(k * campos, (k + 1) * campos)])

/** Las casas de patio de los techos que quedan: el techo y la primera ala, renumerados; sus alas, compactas. */
function recortarPatios({ marcos, alas }, nuevo) {
  const salMarcos = []
  const salAlas = []
  for (let m = 0; m < marcos.length / CAMPOS_MARCO; m++) {
    const marco = [...marcos.subarray(m * CAMPOS_MARCO, (m + 1) * CAMPOS_MARCO)]
    if (!nuevo.has(marco[0])) continue
    const [primera, cuantas] = marco.slice(9)
    salMarcos.push(nuevo.get(marco[0]), ...marco.slice(1, 9), salAlas.length / CAMPOS_ALA, cuantas)
    salAlas.push(...alas.subarray(primera * CAMPOS_ALA, (primera + cuantas) * CAMPOS_ALA))
  }
  return { marcos: Float32Array.from(salMarcos), alas: Float32Array.from(salAlas) }
}

/**
 * Las partes del .pak (vertices, techos y, si están, vida, historia, vuelos, paletas, marcos y alas; src/ciudad.js) con los techos
 * cuyo centro cae en la caja. Partes nuevas: no toca las originales.
 */
export function recortarCiudad(partes, caja) {
  const quedan = techosDentro(partes, caja)
  const nuevo = new Map(quedan.map((k, j) => [k, j]))
  const vertices = []
  const techos = []
  for (const k of quedan) {
    const [inicio, cuantos, tipo, semilla] = partes.techos.subarray(k * CAMPOS_TECHO, (k + 1) * CAMPOS_TECHO)
    techos.push(vertices.length / 2, cuantos, tipo, semilla)
    vertices.push(...partes.vertices.subarray(2 * inicio, 2 * (inicio + cuantos)))
  }
  const salida = { vertices: Float32Array.from(vertices), techos: Uint32Array.from(techos) }
  if (partes.vida) salida.vida = Uint32Array.from(quedan.map((k) => partes.vida[k]))
  if (partes.historia) salida.historia = Uint8Array.from(registros(partes.historia, CAMPOS_HISTORIA, quedan))
  if (partes.vuelos) salida.vuelos = Uint8Array.from(quedan.map((k) => partes.vuelos[k]))
  if (partes.paletas) salida.paletas = Uint8Array.from(quedan.map((k) => partes.paletas[k]))
  if (partes.marcos && partes.alas) Object.assign(salida, recortarPatios(partes, nuevo))
  return salida
}

/** arboles.bin (registros de 8 bytes: x, y, radio, vida en Uint16 LE) con los árboles dentro de la caja. */
export function recortarArboles(datos, caja) {
  const v = new DataView(datos.buffer, datos.byteOffset, datos.byteLength)
  const quedan = []
  for (let k = 0; k < datos.length / BYTES_ARBOL; k++) {
    if (dentro(caja, v.getUint16(k * BYTES_ARBOL, true), v.getUint16(k * BYTES_ARBOL + 2, true))) quedan.push(k)
  }
  const salida = new Uint8Array(quedan.length * BYTES_ARBOL)
  quedan.forEach((k, j) => salida.set(datos.subarray(k * BYTES_ARBOL, (k + 1) * BYTES_ARBOL), j * BYTES_ARBOL))
  return salida
}

/** Los nombres "<columna>-<fila>" de las teselas finas (plano/laminas.json) que tocan la caja. */
export function teselasEnCaja({ tesela, cols, rows }, [x0, y0, x1, y1]) {
  const rango = (a, b, n) => {
    const desde = Math.max(0, Math.floor(a / tesela))
    const hasta = Math.min(n - 1, Math.floor((b - 1) / tesela))
    return Array.from({ length: Math.max(0, hasta - desde + 1) }, (_, k) => desde + k)
  }
  return rango(y0, y1, rows).flatMap((j) => rango(x0, x1, cols).map((i) => `${i}-${j}`))
}

/** plano/epocas.json con solo el nivel chico de cada plano de época. */
export function nivelesDeMuestra(epocas) {
  return { ...epocas, planos: epocas.planos.map((p) => ({ ...p, niveles: p.niveles.slice(0, 1) })) }
}

const RECORTES = Object.freeze({ 'public/datos/ciudad.pak': 'recortar-ciudad', 'public/datos/arboles.bin': 'recortar-arboles' })
const TESELA = /^public\/plano\/f\/(\d+-\d+)\.webp$/
const PLANO_DE_EPOCA = /^public\/plano\/\d{4}\/(.+)$/

/**
 * Qué se hace con cada archivo de los datos (las rutas del manifiesto) para armar la muestra: [{ destino, hacer,
 * origen }], con `hacer` 'copiar', 'recortar-ciudad', 'recortar-arboles' o 'epocas'. Quedan afuera las teselas
 * finas que no tocan la caja (`teselas`), los niveles grandes de los planos de época y el manifiesto.
 */
export function planDeMuestra(archivos, teselas) {
  const plan = []
  for (const ruta of archivos) {
    if (ruta === 'public/datos/manifiesto.json') continue
    const tesela = ruta.match(TESELA)
    if (tesela && !teselas.includes(tesela[1])) continue
    const deEpoca = ruta.match(PLANO_DE_EPOCA)
    if (deEpoca && deEpoca[1] !== 'chico.webp' && ruta !== 'public/plano/1946/crece.png') continue
    const hacer = RECORTES[ruta] ?? (ruta === 'public/plano/epocas.json' ? 'epocas' : 'copiar')
    plan.push({ destino: ruta, hacer, origen: SUSTITUTOS[ruta] ?? ruta })
  }
  return plan
}
