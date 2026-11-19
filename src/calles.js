/**
 * Nombres de las calles de hoy (con "lo de hoy", H) en un <canvas> 2D sobre la vista.
 * Datos: `datos/calles.bin` (6 × Uint16 LE por tramo) + `datos/calles.json` (nombres); formato en specs/02.
 * Cada cuadro que dibuja el bucle bajo demanda se proyectan los tramos cercanos, se alinean con su calle
 * (sin quedar de cabeza) y se descartan los que no entran en su tramo o chocan con otra etiqueta.
 */
import { Vector3 } from 'three'

export const BYTES_TRAMO = 12
export const CELDA_INDICE_M = 300
export const CELDA_COLISION_PX = 13
export const MAX_ETIQUETAS = 90
/** Distancias de cámara (m) entre las que se muestran; `borde` es la fracción de la rampa de entrada/salida. */
export const BANDA = Object.freeze({ min: 300, max: 3600, borde: 0.2 })
export const FUENTE_PX = 14
const FAMILIA = '"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif'
const TINTA = '#8f2a1a'
const HALO = 'rgba(244,234,211,0.95)' // #f4ead3, el papel
const HALO_PX = 4
const MARGEN_PX = 6 // la etiqueta tiene que caber en su tramo con este aire
const REPETICION_PX = 280 // el mismo nombre no se repite más cerca que esto en pantalla
const RADIO_POR_DIST = 2.5 // radio de búsqueda de tramos en función de la distancia de la cámara
const RADIO_MAX_M = 9000
const DPR_MAX = 2

const unidad = (u) => Math.max(-1, Math.min(1, (u - 32768) / 32767))

/** calles.bin + calles.json → tramos {x, y (px del mosaico 1936), dx, dy, nombre, largo (m)} en orden de archivo. */
export function decodificarCalles(buffer, nombres) {
  if (!Array.isArray(nombres)) throw new Error('calles.json: se esperaba una lista de nombres')
  if (buffer.byteLength % BYTES_TRAMO !== 0) {
    throw new Error(`calles.bin: ${buffer.byteLength} bytes no es múltiplo de ${BYTES_TRAMO}`)
  }
  const v = new DataView(buffer)
  const n = buffer.byteLength / BYTES_TRAMO
  const tramos = new Array(n)
  for (let i = 0; i < n; i++) {
    const o = i * BYTES_TRAMO
    const k = v.getUint16(o + 8, true)
    if (k >= nombres.length) throw new Error(`calles.bin: tramo ${i} con nombre ${k} fuera de calles.json (${nombres.length})`)
    tramos[i] = Object.freeze({
      x: v.getUint16(o, true),
      y: v.getUint16(o + 2, true),
      dx: unidad(v.getUint16(o + 4, true)),
      dy: unidad(v.getUint16(o + 6, true)),
      nombre: String(nombres[k]),
      largo: v.getUint16(o + 10, true),
    })
  }
  return Object.freeze(tramos)
}

/** Grilla de `celda` metros sobre el mundo: `cerca(x, z, radio)` devuelve los tramos en el orden del archivo. */
export function indexarTramos(tramos, coords, celda = CELDA_INDICE_M) {
  const mundo = tramos.map((t, i) => {
    const { x, z } = coords.aMundo(t.x, t.y)
    return Object.freeze({ i, x, z, dx: t.dx, dz: t.dy, nombre: t.nombre, largo: t.largo })
  })
  const celdas = new Map()
  const clave = (ci, cj) => `${ci},${cj}`
  for (const t of mundo) {
    const k = clave(Math.floor(t.x / celda), Math.floor(t.z / celda))
    if (!celdas.has(k)) celdas.set(k, [])
    celdas.get(k).push(t)
  }
  function cerca(x, z, radio) {
    const r2 = radio * radio
    const res = []
    for (let ci = Math.floor((x - radio) / celda); ci <= Math.floor((x + radio) / celda); ci++) {
      for (let cj = Math.floor((z - radio) / celda); cj <= Math.floor((z + radio) / celda); cj++) {
        for (const t of celdas.get(clave(ci, cj)) ?? []) {
          if ((t.x - x) ** 2 + (t.z - z) ** 2 <= r2) res.push(t)
        }
      }
    }
    return res.sort((a, b) => a.i - b.i)
  }
  return Object.freeze({ tramos: Object.freeze(mundo), cerca })
}

/** Ángulo de pantalla (y hacia abajo) en [−90°, 90°): el texto nunca queda de cabeza; las verticales suben. */
export function anguloLegible(dx, dy) {
  let a = Math.atan2(dy, dx)
  if (a >= Math.PI / 2 - 1e-9) a -= Math.PI
  if (a < -Math.PI / 2 - 1e-9) a += Math.PI
  return a
}

/**
 * Celdas de `celda` px que cubre un rectángulo rotado (centro, ángulo, ancho × alto), muestreado cada media
 * celda; null si alguna parte cae fuera de la pantalla.
 */
export function celdasEtiqueta({ cx, cy, angulo, ancho, alto }, celda, w, h) {
  const cols = Math.ceil(w / celda)
  const [c, s] = [Math.cos(angulo), Math.sin(angulo)]
  const nu = Math.max(1, Math.ceil(ancho / (celda / 2)))
  const nv = Math.max(1, Math.ceil(alto / (celda / 2)))
  const res = new Set()
  for (let a = 0; a <= nu; a++) {
    const u = -ancho / 2 + (ancho * a) / nu
    for (let b = 0; b <= nv; b++) {
      const v = -alto / 2 + (alto * b) / nv
      const x = cx + u * c - v * s
      const y = cy + u * s + v * c
      if (x < 0 || y < 0 || x >= w || y >= h) return null
      res.add(Math.floor(y / celda) * cols + Math.floor(x / celda))
    }
  }
  return [...res]
}

/** Celdas de `celda` px que toca una caja recta { x0, y0, x1, y1 }, recortada a la pantalla (puede dar ninguna). */
export function celdasCaja({ x0, y0, x1, y1 }, celda, w, h) {
  const cols = Math.ceil(w / celda)
  const res = []
  const [c0, c1] = [Math.max(0, Math.floor(x0 / celda)), Math.min(cols - 1, Math.floor(x1 / celda))]
  const [f0, f1] = [Math.max(0, Math.floor(y0 / celda)), Math.min(Math.ceil(h / celda) - 1, Math.floor(y1 / celda))]
  for (let f = f0; f <= f1; f++) for (let c = c0; c <= c1; c++) res.push(f * cols + c)
  return res
}

/** Ocupación de la pantalla: `ocupar(celdas)` las toma solo si todas están libres; `reservar`, sin preguntar. */
export function crearGrilla(w, h, celda = CELDA_COLISION_PX) {
  const ocupadas = new Uint8Array(Math.ceil(w / celda) * Math.ceil(h / celda))
  return {
    ocupar(celdas) {
      if (!celdas || celdas.some((k) => ocupadas[k])) return false
      for (const k of celdas) ocupadas[k] = 1
      return true
    },
    reservar(celdas) { for (const k of celdas) ocupadas[k] = 1 },
    vaciar() { ocupadas.fill(0) },
  }
}

/** measureText cacheado por fuente y texto. */
export function crearMedidor(ctx) {
  const cache = new Map()
  return (texto, fuente) => {
    const k = `${fuente}\u0000${texto}`
    let w = cache.get(k)
    if (w === undefined) {
      ctx.font = fuente
      w = ctx.measureText(texto).width
      cache.set(k, w)
    }
    return w
  }
}

/** 0 fuera de la banda, 1 dentro; rampas lineales en los bordes. */
export function opacidadPorDistancia(d, { min, max, borde }) {
  if (d <= min || d >= max) return 0
  const entrada = (d - min) / (min * borde)
  const salida = (max - d) / (max * borde)
  return Math.min(1, entrada, salida)
}

/**
 * El dibujante: `dibujar({camera, dist, x, z, opacidad, ocupados})` devuelve cuántas etiquetas puso.
 * `ocupados` son cajas { x0, y0, x1, y1 } en píxeles de la vista que ya tienen dueño (los carteles de las
 * marcas, src/marcas.js): ahí no se escribe ninguna calle.
 * `tamaño()` da el tamaño CSS de la vista y el devicePixelRatio; `altura(x, z)`, el suelo tal como se dibuja.
 */
export function crearRotulos({ lienzo, indice, tamaño, altura = () => 0, fuentePx = FUENTE_PX, banda = BANDA }) {
  const ctx = lienzo.getContext('2d')
  const medir = crearMedidor(ctx)
  const fuente = `italic ${fuentePx}px ${FAMILIA}`
  const [p, a, b] = [new Vector3(), new Vector3(), new Vector3()]
  let grilla = null
  let dimGrilla = ''
  let sucio = true
  const estado = { cuantas: 0 }

  function preparar() {
    const { ancho, alto, dpr } = tamaño()
    const r = Math.min(dpr || 1, DPR_MAX)
    const [w, h] = [Math.round(ancho * r), Math.round(alto * r)]
    if (lienzo.width !== w || lienzo.height !== h) Object.assign(lienzo, { width: w, height: h })
    ctx.setTransform(r, 0, 0, r, 0, 0)
    if (dimGrilla !== `${ancho}x${alto}`) {
      grilla = crearGrilla(ancho, alto, CELDA_COLISION_PX)
      dimGrilla = `${ancho}x${alto}`
    }
    return { ancho, alto }
  }

  function limpiar() {
    estado.cuantas = 0
    if (!sucio) return
    const { ancho, alto } = preparar()
    ctx.clearRect(0, 0, ancho, alto)
    sucio = false
  }

  const aPantalla = (v, ancho, alto) => ({ x: ((v.x + 1) / 2) * ancho, y: ((1 - v.y) / 2) * alto, dentro: v.z < 1 && v.z > -1 })

  /** Dónde y con qué ángulo iría la etiqueta de un tramo, o null si no entra. */
  function ubicar(t, camera, ancho, alto, wTexto) {
    const y = altura(t.x, t.z)
    const m = t.largo / 2
    const pm = aPantalla(p.set(t.x, y, t.z).project(camera), ancho, alto)
    const pa = aPantalla(a.set(t.x - t.dx * m, y, t.z - t.dz * m).project(camera), ancho, alto)
    const pb = aPantalla(b.set(t.x + t.dx * m, y, t.z + t.dz * m).project(camera), ancho, alto)
    if (!pm.dentro || !pa.dentro || !pb.dentro) return null
    const [sx, sy] = [pb.x - pa.x, pb.y - pa.y]
    if (Math.hypot(sx, sy) < wTexto + MARGEN_PX) return null
    return { cx: pm.x, cy: pm.y, angulo: anguloLegible(sx, sy) }
  }

  function dibujar({ camera, dist, x, z, opacidad = 1, ocupados = [] }) {
    const alfa = opacidad * opacidadPorDistancia(dist, banda)
    if (alfa <= 0.01) { limpiar(); return 0 }
    const { ancho, alto } = preparar()
    ctx.clearRect(0, 0, ancho, alto)
    sucio = true
    grilla.vaciar()
    for (const caja of ocupados) grilla.reservar(celdasCaja(caja, CELDA_COLISION_PX, ancho, alto))
    camera.updateMatrixWorld()
    Object.assign(ctx, {
      globalAlpha: alfa, font: fuente, textAlign: 'center', textBaseline: 'middle',
      lineJoin: 'round', lineWidth: HALO_PX, strokeStyle: HALO, fillStyle: TINTA,
    })
    const puestos = new Map() // nombre → posiciones en pantalla, para no repetirlo pegado
    let n = 0
    for (const t of indice.cerca(x, z, Math.min(dist * RADIO_POR_DIST, RADIO_MAX_M))) {
      if (n >= MAX_ETIQUETAS) break
      const wTexto = medir(t.nombre, fuente)
      const e = ubicar(t, camera, ancho, alto, wTexto)
      if (!e) continue
      const previos = puestos.get(t.nombre) ?? []
      if (previos.some(([px, py]) => Math.hypot(px - e.cx, py - e.cy) < REPETICION_PX)) continue
      const celdas = celdasEtiqueta({ ...e, ancho: wTexto + HALO_PX * 2, alto: fuentePx + HALO_PX }, CELDA_COLISION_PX, ancho, alto)
      if (!grilla.ocupar(celdas)) continue
      puestos.set(t.nombre, [...previos, [e.cx, e.cy]])
      ctx.save()
      ctx.translate(e.cx, e.cy)
      ctx.rotate(e.angulo)
      ctx.strokeText(t.nombre, 0, 0)
      ctx.fillText(t.nombre, 0, 0)
      ctx.restore()
      n++
    }
    estado.cuantas = n
    return n
  }

  return {
    dibujar,
    limpiar,
    get cuantas() { return estado.cuantas },
  }
}

/** Baja calles.bin + calles.json y arma el índice. */
export async function cargarCalles(base, coords) {
  const [bin, json] = await Promise.all([
    fetch(`${base}calles.bin`).then((r) => { if (!r.ok) throw new Error(`calles.bin: ${r.status}`); return r.arrayBuffer() }),
    fetch(`${base}calles.json`).then((r) => { if (!r.ok) throw new Error(`calles.json: ${r.status}`); return r.json() }),
  ])
  return indexarTramos(decodificarCalles(bin, json), coords)
}
