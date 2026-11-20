/**
 * A pie (T60): la cuenta del modo en primera persona, sin DOM ni three.js (el modo está en src/a-pie-modo.js).
 * El caminante es un círculo de RADIO_M en el plano xz del mundo (metros, plaza en el origen); choca con las
 * huellas de las casas en pie en la época (las de ciudad.pak) y se desliza a lo largo de sus paredes.
 * Rumbo 0 mira hacia −z (el norte del plano); crece hacia la derecha.
 */

export const RADIO_M = 0.4
export const VELOCIDAD = Object.freeze({ paso: 2.5, corre: 7 }) // m/s: un paso largo y una carrera (el centro es chico)
const CELDA_M = 20
const LEJOS_M = 1500 // con la cámara más lejos que esto, se entra en la plaza
const BUSCAR_HASTA_M = 40
const RADIO_JOYSTICK_PX = 52
const AJENO = 'input, textarea, select, [contenteditable], dialog, [role="dialog"]'
// los controles que Espacio activa por sí solo (los mismos que respeta accionDeTecla en src/controles.js)
const PULSABLE = 'button, a, [role="button"]'
const ADELANTE = new Set(['KeyW', 'ArrowUp'])
const ATRAS = new Set(['KeyS', 'ArrowDown'])
const IZQUIERDA = new Set(['KeyA', 'ArrowLeft'])
const DERECHA = new Set(['KeyD', 'ArrowRight'])
const CORRE = new Set(['ShiftLeft', 'ShiftRight'])

/** ¿Está en pie en la época `e` una casa con vida `v` (nace + 8·muere, src/ciudad.js)? */
const enPie = (v, e) => v % 8 <= e && (Math.floor(v / 8) === 0 || Math.floor(v / 8) > e)
const clave = (i, j) => `${i},${j}`

/**
 * Las huellas de las casas en pie en la época (en metros del mundo, `aMundo` de src/coords.js), repartidas en
 * celdas de CELDA_M para preguntar rápido. `epoca` 99: sin línea de tiempo (quedan las que no mueren).
 */
export function rejillaDeCasas({ vertices, techos, vida }, epoca, aMundo) {
  const celdas = new Map()
  for (let t = 0; t < techos.length / 4; t++) {
    if (vida && !enPie(vida[t], epoca)) continue
    const [inicio, cuantos] = [techos[t * 4], techos[t * 4 + 1]]
    const anillo = Array.from({ length: cuantos }, (_, k) => aMundo(vertices[2 * (inicio + k)], vertices[2 * (inicio + k) + 1]))
    const xs = anillo.map((p) => p.x)
    const zs = anillo.map((p) => p.z)
    const [i0, i1] = [Math.floor(Math.min(...xs) / CELDA_M), Math.floor(Math.max(...xs) / CELDA_M)]
    const [j0, j1] = [Math.floor(Math.min(...zs) / CELDA_M), Math.floor(Math.max(...zs) / CELDA_M)]
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        if (!celdas.has(clave(i, j))) celdas.set(clave(i, j), [])
        celdas.get(clave(i, j)).push(anillo)
      }
    }
  }
  return { celdas }
}

function dentroDe(anillo, x, z) {
  let adentro = false
  for (let a = 0, b = anillo.length - 1; a < anillo.length; b = a++) {
    const [p, q] = [anillo[a], anillo[b]]
    if ((p.z > z) !== (q.z > z) && x < ((q.x - p.x) * (z - p.z)) / (q.z - p.z) + p.x) adentro = !adentro
  }
  return adentro
}

function distanciaAlBorde(anillo, x, z) {
  let menor = Infinity
  for (let a = 0, b = anillo.length - 1; a < anillo.length; b = a++) {
    const [p, q] = [anillo[b], anillo[a]]
    const [dx, dz] = [q.x - p.x, q.z - p.z]
    const largo = dx * dx + dz * dz
    const t = largo > 0 ? Math.max(0, Math.min(1, ((x - p.x) * dx + (z - p.z) * dz) / largo)) : 0
    menor = Math.min(menor, Math.hypot(x - (p.x + t * dx), z - (p.z + t * dz)))
  }
  return menor
}

/** ¿El caminante en (x, z) choca con una casa (está dentro o a menos de `radio` de una pared)? */
export function choca({ celdas }, x, z, radio = RADIO_M) {
  const vistos = new Set()
  for (const [di, dj] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]]) {
    for (const anillo of celdas.get(clave(Math.floor(x / CELDA_M) + di, Math.floor(z / CELDA_M) + dj)) ?? []) {
      if (vistos.has(anillo)) continue
      vistos.add(anillo)
      if (dentroDe(anillo, x, z) || distanciaAlBorde(anillo, x, z) < radio) return true
    }
  }
  return false
}

/**
 * Un paso: `entrada` { adelante, lado (−1…1), corre } durante `dt` segundos. Si el paso entero choca, prueba
 * solo en x y solo en z (así se desliza por la pared). → un estado nuevo; no toca el de entrada.
 */
export function pasoAPie(estado, { adelante = 0, lado = 0, corre = false }, dt, { choca: chocaEn }) {
  const largo = Math.hypot(adelante, lado)
  if (largo === 0) return { ...estado }
  const v = (corre ? VELOCIDAD.corre : VELOCIDAD.paso) * dt / Math.max(1, largo)
  const [sen, cos] = [Math.sin(estado.rumbo), Math.cos(estado.rumbo)]
  const dx = (sen * adelante + cos * lado) * v
  const dz = (-cos * adelante + sen * lado) * v
  for (const [mx, mz] of [[dx, dz], [dx, 0], [0, dz]]) {
    if ((mx || mz) && !chocaEn(estado.x + mx, estado.z + mz)) return { ...estado, x: estado.x + mx, z: estado.z + mz }
  }
  return { ...estado }
}

/** Las teclas apretadas (KeyboardEvent.code) → { adelante, lado, corre }: WASD o flechas, Mayús corre. */
/**
 * El criterio de teclado de los modos (a pie, en avión y en coche): la tecla no es del modo si nace en un campo de texto o
 * en un diálogo (el visor del plano: flechas para moverlo, Esc para cerrarlo), ni si es Espacio sobre un botón
 * con foco (lo activa).
 */
export function teclaAjena(e) {
  if (e.target?.closest?.(AJENO)) return true
  return e.code === 'Space' && Boolean(e.target?.closest?.(PULSABLE))
}

export function entradaDeTeclas(apretadas) {
  const hay = (grupo) => [...grupo].some((c) => apretadas.has(c))
  return {
    adelante: (hay(ADELANTE) ? 1 : 0) - (hay(ATRAS) ? 1 : 0),
    lado: (hay(DERECHA) ? 1 : 0) - (hay(IZQUIERDA) ? 1 : 0),
    corre: hay(CORRE),
  }
}

/** El joystick táctil: cuánto se corrió el dedo desde donde se apoyó, hasta su radio → { adelante, lado }. */
export function joystick(inicio, ahora) {
  const [dx, dy] = [ahora.x - inicio.x, ahora.y - inicio.y]
  const f = 1 / Math.max(RADIO_JOYSTICK_PX, Math.hypot(dx, dy))
  return { adelante: -dy * f || 0, lado: dx * f || 0 }
}

/**
 * Dónde se entra a pie: donde mira la cámara (`{ x, z, dist }`) si está cerca, si no, la plaza; si ese lugar
 * choca, el más cercano que no (en anillos de 1 m hasta BUSCAR_HASTA_M).
 */
export function puntoDeEntrada({ x, z, dist }, chocaEn) {
  const [cx, cz] = dist > LEJOS_M ? [0, 0] : [x, z]
  if (!chocaEn(cx, cz)) return { x: cx, z: cz }
  for (let r = 1; r <= BUSCAR_HASTA_M; r++) {
    const pasos = Math.max(8, Math.round(2 * Math.PI * r))
    for (let k = 0; k < pasos; k++) {
      const a = (2 * Math.PI * k) / pasos
      const [px, pz] = [cx + r * Math.cos(a), cz + r * Math.sin(a)]
      if (!chocaEn(px, pz)) return { x: px, z: pz }
    }
  }
  return { x: cx, z: cz }
}
