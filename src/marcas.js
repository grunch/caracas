/**
 * Las marcas: los nombres de los lugares de la ciudad, anclados en 3D y distintos en cada época (specs/05).
 * Este módulo es la lógica pura: qué marcas están vivas y cómo se llaman en una época, qué nivel se ve a cada
 * distancia, dónde caen en la pantalla y cuáles se muestran sin pisarse. La capa de DOM está en
 * src/marcas-capa.js y los datos, en src/marcas-datos.js.
 *
 * Fila de datos (píxeles del mosaico de 1936; épocas como en src/epocas.js, 1 = 1772 … 5 = 1936):
 *   { id, nombre | nombres: [[desde, nombre, nota?], …], x, y | hito: 'id-del-hito', nace, muere?,
 *     nivel: 1–3, alto? (m), radio? (m), nota?, fuente, dudas? }
 */
import { visibleEn, vivo, epocaAqui, PRIMERA_EPOCA } from './epocas.js'

const ULTIMA_EPOCA = 5
/** El nivel n se ve con la cámara a menos de DIST_NIVEL[n] metros; el 1, siempre. */
export const DIST_NIVEL = Object.freeze({ 2: 4200, 3: 1500 })
/** Hasta qué distancia (m) se acerca la cámara al tocar una marca, según su nivel. */
export const DIST_VUELO_M = Object.freeze({ 1: 1500, 2: 700, 3: 450 })
/** Fracción de la distancia umbral dentro de la cual se conserva el nivel que ya se veía. */
export const HISTERESIS_NIVEL = 0.08
/** Del punto al borde de abajo del cartel (el hilo), en píxeles de pantalla. */
export const HILO_PX = 26
/** Aire entre carteles, y entre un cartel y el punto de otra marca. */
export const MARGEN_PX = 5
const RADIO_PUNTO_PX = 5
const RADIO_M = 30

const esEpoca = (e) => Number.isInteger(e) && e >= PRIMERA_EPOCA && e <= ULTIMA_EPOCA

/** Los nombres de una fila como lista ordenada [{ desde, nombre, nota }]. */
function nombresDe(f, nace) {
  const lista = f.nombres ?? [[nace, f.nombre, f.nota]]
  return lista.map(([desde, nombre, nota]) => Object.freeze({ desde, nombre, nota: nota ?? f.nota ?? '' }))
}

/**
 * Filas de datos → marcas listas para dibujar: posición en metros del mundo, vida y nombres resueltos.
 * Las que apuntan a un hito (`hito`) toman de él la posición y, si no traen la suya, la época en que nace.
 */
export function normalizarMarcas(filas, { hitos = [], coords }) {
  const porId = new Map(hitos.map((h) => [h.id, h]))
  return Object.freeze(filas.map((f, orden) => {
    const hito = f.hito ? porId.get(f.hito) : null
    if (f.hito && !hito) throw new Error(`marca ${f.id}: hito desconocido "${f.hito}"`)
    const [px, py] = [f.x ?? hito?.x, f.y ?? hito?.y]
    const nace = f.nace ?? hito?.nace ?? PRIMERA_EPOCA
    const { x, z } = coords.aMundo(px, py)
    return Object.freeze({
      id: f.id, orden, px, py, x, z, nace, naceHito: hito?.nace ?? nace, muere: f.muere ?? 0, nivel: f.nivel,
      alto: f.alto ?? 0, radio: f.radio ?? RADIO_M, hito: f.hito ?? null,
      nombres: Object.freeze(nombresDe(f, nace)), fuente: f.fuente, dudas: f.dudas ?? '',
    })
  }))
}

/** Revisa las filas contra la hoja ({ ancho, alto } en píxeles) y los hitos; devuelve la lista de problemas. */
export function validarMarcas(filas, { hitos = [], plano }) {
  const problemas = []
  const porId = new Map(hitos.map((h) => [h.id, h]))
  const vistos = new Set()
  for (const f of filas) {
    const de = f.id ?? '(sin id)'
    if (!f.id || vistos.has(f.id)) problemas.push(`${de}: id faltante o repetido`)
    vistos.add(f.id)
    if (!f.fuente) problemas.push(`${de}: sin fuente`)
    if (![1, 2, 3].includes(f.nivel)) problemas.push(`${de}: nivel fuera de 1 a 3`)
    const hito = f.hito ? porId.get(f.hito) : null
    if (f.hito && !hito) { problemas.push(`${de}: hito desconocido "${f.hito}"`); continue }
    const [x, y] = [f.x ?? hito?.x, f.y ?? hito?.y]
    if (!(x >= 0 && y >= 0 && x <= plano.ancho && y <= plano.alto)) problemas.push(`${de}: fuera de la hoja`)
    const nace = f.nace ?? hito?.nace
    const muere = f.muere ?? 0
    if (!esEpoca(nace) || !(muere === 0 || (esEpoca(muere) && muere > nace))) problemas.push(`${de}: vida inválida (nace ${nace}, muere ${muere})`)
    const nombres = nombresDe(f, nace)
    if (!nombres.length || nombres.some((n) => !n.nombre)) problemas.push(`${de}: sin nombre`)
    const ordenados = nombres.every((n, i) => esEpoca(n.desde) && (i === 0 || n.desde > nombres[i - 1].desde))
    if (!ordenados || nombres[0]?.desde > nace) problemas.push(`${de}: nombres desordenados o que empiezan después de nacer`)
  }
  return problemas
}

/** ¿La marca existe en la época e? Misma convención que las casas (src/epocas.js). */
export const vivaEn = (marca, e) => visibleEn(marca.nace, marca.muere, e)

/** Cuánto se ve la marca en la época (fraccionaria, en plena ola) e: 0 a 1. */
export const presenciaEn = (marca, e) => vivo(marca.nace, marca.muere, e)

/** El nombre que rige en la época e (fraccionaria: cambia a mitad de camino, como nacen las casas). */
export function nombreEn(marca, e) {
  let rige = null
  for (const n of marca.nombres) if (n.desde <= e + 0.5) rige = n
  return rige
}

/** Hasta qué nivel se muestra con la cámara a `dist` metros; `previo` evita el parpadeo en los umbrales. */
export function nivelPorDistancia(dist, previo = null, histeresis = HISTERESIS_NIVEL) {
  const dentro = (n) => {
    const holgura = previo === null ? 1 : previo >= n ? 1 + histeresis : 1 - histeresis
    return dist < DIST_NIVEL[n] * holgura
  }
  return dentro(3) ? 3 : dentro(2) ? 2 : 1
}

/**
 * A qué distancia queda la cámara al tocar una marca de ese nivel: se acerca hasta la del nivel, pero nunca se
 * aleja, ni de donde está (`ahora`) ni de adonde ya iba (`destino`).
 */
export const distanciaDeVuelo = (nivel, { ahora, destino }) => Math.min(ahora, destino, DIST_VUELO_M[nivel])

/**
 * Proyecta un punto del mundo con la matriz de vista y proyección (16 números por columnas, como
 * Matrix4.elements de three) a píxeles de una vista de `ancho × alto`.
 */
export function aPantalla(m, x, y, z, ancho, alto) {
  const w = m[3] * x + m[7] * y + m[11] * z + m[15]
  if (!(w > 0)) return { x: 0, y: 0, visible: false }
  const nx = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w
  const ny = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w
  const nz = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w
  const visible = Math.abs(nx) <= 1 && Math.abs(ny) <= 1 && Math.abs(nz) <= 1
  return { x: ((nx + 1) / 2) * ancho, y: ((1 - ny) / 2) * alto, visible }
}

/** La caja del cartel de una marca cuyo punto está en (x, y): centrada, encima del hilo. */
export const cajaDe = ({ x, y }, { ancho, alto }) => ({ x0: x - ancho / 2, y0: y - HILO_PX - alto, x1: x + ancho / 2, y1: y - HILO_PX })

const dentro = (c, x, y, m) => x >= c.x0 - m && x <= c.x1 + m && y >= c.y0 - m && y <= c.y1 + m

/** ¿Chocan dos marcas? Sus carteles se tocan, o el cartel de una tapa el punto de la otra. */
export function seTapan(a, b, margen = MARGEN_PX) {
  const cajas = a.caja.x0 - margen < b.caja.x1 && b.caja.x0 - margen < a.caja.x1 && a.caja.y0 - margen < b.caja.y1 && b.caja.y0 - margen < a.caja.y1
  return cajas || dentro(a.caja, b.x, b.y, RADIO_PUNTO_PX) || dentro(b.caja, a.x, a.y, RADIO_PUNTO_PX)
}

/**
 * Despeje voraz: entran primero las de más nivel; a igual nivel, las que ya estaban puestas (`previas`, para
 * que nada parpadee al mover la cámara) y después el orden de la lista. `primera` (la marca abierta, con su
 * nota a la vista) entra antes que todas. Devuelve las que quedan.
 */
export function despejar(candidatas, { previas = new Set(), margen = MARGEN_PX, primera = null } = {}) {
  const orden = candidatas.map((c, i) => ({ c, i })).sort((a, b) => Number(b.c.id === primera) - Number(a.c.id === primera)
    || a.c.nivel - b.c.nivel || Number(previas.has(b.c.id)) - Number(previas.has(a.c.id)) || a.i - b.i)
  const puestas = []
  for (const { c } of orden) if (!puestas.some((p) => seTapan(p, c, margen))) puestas.push(c)
  return puestas
}

/**
 * Todo lo de un cuadro: de las marcas, cuáles se ven, con qué nombre, dónde y con qué opacidad.
 *  - `epoca`: { de, a, ola, ancho } como los uniforms de la ola de época (src/epocas.js `epocaAqui`)
 *  - `matriz`: proyección × vista de la cámara; `vista`: { ancho, alto } en píxeles CSS
 *  - `altura(x, z)`: el suelo tal como se dibuja; `sube(distPlaza)`: cuánto se levantó la ciudad ahí (0–1)
 *  - `medir(nombre, nivel, abierta)`: { ancho, alto } del cartel; `previas` / `nivelPrevio`: lo del cuadro anterior
 *  - `abierta`: id de la marca abierta (su cartel es más grande, con la nota, y tiene prioridad sobre todos)
 */
export function calcularMarcas(marcas, {
  epoca, matriz, vista, dist, medir, altura = () => 0, sube = () => 1, previas = new Set(), nivelPrevio = null, abierta = null,
}) {
  const nivel = nivelPorDistancia(dist, nivelPrevio)
  const candidatas = []
  for (const marca of marcas) {
    if (marca.nivel > nivel) continue
    const distPlaza = Math.hypot(marca.x, marca.z)
    const e = epocaAqui(epoca, distPlaza)
    const opacidad = presenciaEn(marca, e)
    const rige = nombreEn(marca, e)
    if (opacidad <= 0.01 || !rige) continue
    const y3 = altura(marca.x, marca.z) + marca.alto * sube(distPlaza) * opacidad
    const p = aPantalla(matriz, marca.x, y3, marca.z, vista.ancho, vista.alto)
    if (!p.visible) continue
    const punto = { x: p.x, y: p.y }
    candidatas.push({ id: marca.id, marca, nivel: marca.nivel, nombre: rige.nombre, nota: rige.nota, ...punto, opacidad, caja: cajaDe(punto, medir(rige.nombre, marca.nivel, marca.id === abierta)) })
  }
  return { nivel, visibles: despejar(candidatas, { previas, primera: abierta }) }
}
