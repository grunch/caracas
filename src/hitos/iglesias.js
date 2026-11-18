/**
 * Iglesias: la torre de cuerpos apilados con su remate, la fachada barroca de columnas pareadas y frontón
 * de volutas (la Catedral), y una iglesia paramétrica (nave + fachada + torres + cúpula) para las demás.
 * Marco de una iglesia: el origen está al pie de la fachada, en su centro; +x entra en la nave.
 */
import { MAT } from './lienzo.js'
import {
  TONO, caja, tronco, cupula, barra, bulto, tejado, cuerpo, vano, disco, fronton, frontonDeVolutas, columna, cornisa, verja,
} from './piezas.js'

const CARAS = [[0, 1], [1, 0], [0, -1], [-1, 0]]

/** Hilera de `n` vanos repartidos en un muro de `largo` (centrado en x), a la altura `y`; con balcón si se pide. */
export function ventanas(p, { largo, n, y, ancho = 1.1, alto = 2, arco = true, balcon = false, color = TONO.VANO }) {
  for (let i = 0; i < n; i++) {
    const x = -largo / 2 + ((i + 0.5) / n) * largo
    vano(p.en(x, y, 0), { ancho, alto, arco, color })
    if (!balcon) continue
    // balcón volado con baranda y tejadillo (los del costado de la Catedral, fotos de 1866 y 1867)
    caja(p.en(x, y - 0.15, 0.35), { ancho: ancho + 0.9, alto: 0.15, fondo: 0.7, color: TONO.MADERA, flota: true })
    caja(p.en(x, y, 0.66), { ancho: ancho + 0.9, alto: 0.9, fondo: 0.06, color: TONO.MADERA, flota: true })
    tejado(p.en(x, y + alto + 0.25, 0.3), { largo: ancho + 1.1, ancho: 0.7, alto: 0.4, tipo: 'una', alero: 0.1, color: TONO.TEJA_VIEJA })
  }
}

const REMATES = Object.freeze({
  /** Tambor ochavado, cupulín oscuro, linterna y perilla (con una figura encima si se pide): la Catedral. */
  cupulin(p, lado, { alto = 6.5, color, cubierta = TONO.PIZARRA, figura = false }) {
    const r = lado * 0.46
    tronco(p, { radio: r, alto: alto * 0.36, lados: 8, color, flota: true })
    for (const [da, db] of CARAS) vano(p.mirando(da * r * 0.92, alto * 0.08, db * r * 0.92, da, db), { ancho: r * 0.3, alto: alto * 0.2 })
    cornisa(p.en(0, alto * 0.36, 0), { largo: r * 1.7, ancho: r * 1.7, alto: 0.2, vuelo: 0.2, color })
    cupula(p.en(0, alto * 0.36 + 0.2, 0), { radio: r * 1.02, alto: alto * 0.36, lados: 8, color: cubierta })
    tronco(p.en(0, alto * 0.7, 0), { radio: r * 0.22, alto: alto * 0.14, lados: 8, color, flota: true })
    cupula(p.en(0, alto * 0.84, 0), { radio: r * 0.26, alto: alto * 0.08, lados: 8, color: cubierta })
    barra(p, [0, alto * 0.9, 0], [0, alto + (figura ? 0 : 0.6), 0], { radio: 0.07, radioFin: 0.02, lados: 4 })
    if (figura) bulto(p, [0, alto + 0.6, 0], [0.28, 0.7, 0.28], { color: TONO.BRONCE, lados: 6 })
  },
  /** Aguja ochavada de pizarra con pináculos en las esquinas (neogótico). */
  aguja(p, lado, { alto = 12, color, cubierta = TONO.PIZARRA }) {
    tronco(p, { radio: lado * 0.56, radioArriba: 0.05, alto, lados: 8, color: cubierta, flota: true })
    for (const [sx, sz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      tronco(p.en(sx * lado * 0.44, 0, sz * lado * 0.44), { radio: lado * 0.09, radioArriba: 0.02, alto: alto * 0.3, lados: 4, color, flota: true })
    }
    barra(p, [0, alto, 0], [0, alto + 1.2, 0], { radio: 0.05, lados: 4 })
    barra(p, [-0.35, alto + 0.8, 0], [0.35, alto + 0.8, 0], { radio: 0.05, lados: 4 })
  },
  /** Chapitel de teja a cuatro aguas con cruz. */
  chapitel(p, lado, { alto = 3, cubierta = TONO.TEJA }) {
    tejado(p, { largo: lado, ancho: lado, alto, tipo: 'cuatro', alero: 0.3, color: cubierta })
    barra(p, [0, alto, 0], [0, alto + 1.1, 0], { radio: 0.05, lados: 4 })
    barra(p, [-0.3, alto + 0.75, 0], [0.3, alto + 0.75, 0], { radio: 0.05, lados: 4 })
  },
  /** Media naranja directa sobre la torre, con linterna (las torres de cúpula de fin de siglo). */
  cupula(p, lado, { alto = 4, color, cubierta = TONO.PIZARRA }) {
    cupula(p, { radio: lado * 0.5, alto: alto * 0.7, lados: 8, color: cubierta })
    tronco(p.en(0, alto * 0.66, 0), { radio: lado * 0.1, alto: alto * 0.2, lados: 6, color, flota: true })
    barra(p, [0, alto * 0.86, 0], [0, alto + 0.8, 0], { radio: 0.06, radioFin: 0.02, lados: 4 })
  },
})

/**
 * Torre de planta cuadrada en cuerpos apilados: cada cuerpo { alto, lado?, vanos: 'ciego' | 'ventana' | 'apilados'
 * | 'arco' | 'reloj', balcon? } lleva su cornisa; arriba, el remate { tipo: 'cupulin' | 'aguja' | 'chapitel' | 'cupula', … }.
 */
export function torre(p, { lado = 8, cuerpos, remate = { tipo: 'cupulin' }, color = TONO.CAL }) {
  let h = 0
  let ultimo = lado
  cuerpos.forEach(({ alto, lado: l = lado, vanos = 'ciego', balcon = false }, i) => {
    caja(p.en(0, h, 0), { ancho: l, alto, fondo: l, color, flota: i > 0 })
    cornisa(p.en(0, h + alto - 0.3, 0), { largo: l, ancho: l, alto: 0.3, vuelo: balcon ? 0.7 : 0.3, color })
    for (const [da, db] of CARAS) {
      const q = p.mirando((da * l) / 2, h, (db * l) / 2, da, db)
      if (vanos === 'arco') vano(q.en(0, alto * 0.16, 0), { ancho: l * 0.28, alto: alto * 0.62 })
      if (vanos === 'ventana') vano(q.en(0, alto * 0.45, 0), { ancho: l * 0.13, alto: alto * 0.16 })
      if (vanos === 'apilados') for (const k of [0.2, 0.48, 0.76]) vano(q.en(0, alto * k, 0), { ancho: l * 0.16, alto: alto * 0.14 })
      if (vanos === 'reloj') {
        vano(q.en(0, alto * 0.1, 0), { ancho: l * 0.2, alto: alto * 0.34 })
        disco(q.en(0, alto * 0.7, 0), { radio: l * 0.17, mat: MAT.RELOJ })
      }
      if (balcon) verja(q.en(-l / 2 - 0.6, alto, 0.6), { largo: l + 1.2, alto: 1 })
    }
    h += alto
    ultimo = l
  })
  const { tipo, ...medidas } = remate
  const rematar = REMATES[tipo]
  if (!rematar) throw new Error(`torre: remate desconocido "${tipo}"`)
  rematar(p.en(0, h, 0), ultimo, { color, ...medidas })
  return h
}

/**
 * Fachada barroca de tres calles y dos cuerpos con columnas pareadas, puertas de arco, nichos, y frontón
 * curvo de volutas con pináculos y cruz (la Catedral: fotos de 1866 y 1874, grabado de 1867).
 * En el plano xy del pintor, centrada, con el frente hacia +z.
 */
export function fachadaBarroca(p, { ancho, alto1 = 7.5, alto2 = 5, altoFronton = 5, color = TONO.CAL }) {
  const w = ancho
  caja(p.en(0, 0, -0.5), { ancho: w, alto: alto1 + alto2, fondo: 1, color })
  const pares = [-0.46, -0.19, 0.19, 0.46].flatMap((k) => [k * w - 0.42, k * w + 0.42])
  // primer cuerpo: columnas sobre pedestal, tres puertas de arco y su entablamento
  for (const x of pares) columna(p.en(x, 0, 0.42), { radio: 0.3, alto: alto1 - 0.6, color })
  caja(p.en(0, alto1 - 0.6, 0.2), { ancho: w + 0.5, alto: 0.6, fondo: 1.2, color, flota: true })
  vano(p, { ancho: w * 0.16, alto: alto1 * 0.72 })
  for (const s of [-1, 1]) {
    vano(p.en(s * w * 0.325, 0, 0), { ancho: w * 0.1, alto: alto1 * 0.5 })
    disco(p.en(s * w * 0.325, alto1 * 0.68, 0), { radio: w * 0.028 })
  }
  // segundo cuerpo: columnas más finas, ventana del coro y nichos
  for (const x of pares) columna(p.en(x, alto1, 0.38), { radio: 0.24, alto: alto2 - 0.5, color })
  caja(p.en(0, alto1 + alto2 - 0.5, 0.15), { ancho: w + 0.4, alto: 0.5, fondo: 1.1, color, flota: true })
  vano(p.en(0, alto1 + 0.9, 0), { ancho: w * 0.085, alto: alto2 * 0.55, arco: false })
  for (const s of [-1, 1]) vano(p.en(s * w * 0.325, alto1 + 0.9, 0), { ancho: w * 0.06, alto: alto2 * 0.48, color: TONO.CAL_SOMBRA })
  // el remate: frontón de volutas con su nicho, pináculos y cruz
  const y = alto1 + alto2
  frontonDeVolutas(p.en(0, y, 0), { ancho: w * 0.66, alto: altoFronton, fondo: 0.9, color })
  vano(p.en(0, y + altoFronton * 0.3, 0), { ancho: w * 0.07, alto: altoFronton * 0.38, color: TONO.CAL_SOMBRA })
  for (const k of [-0.47, -0.3, 0.3, 0.47]) {
    tronco(p.en(k * w, y, -0.3), { radio: 0.22, radioArriba: 0.1, alto: 1.1, lados: 4, color, flota: true })
    bulto(p, [k * w, y + 1.3, -0.3], [0.2, 0.3, 0.2], { color, lados: 6 })
  }
  barra(p, [0, y + altoFronton, -0.4], [0, y + altoFronton + 1.6, -0.4], { radio: 0.07, lados: 4 })
  barra(p, [-0.5, y + altoFronton + 1.1, -0.4], [0.5, y + altoFronton + 1.1, -0.4], { radio: 0.07, lados: 4 })
}

/** Portada lateral: puerta de arco entre dos columnas, con frontón (el costado de la Catedral, 1867). */
export function portadaLateral(p, { ancho = 4.2, alto = 6, color = TONO.CAL }) {
  for (const s of [-1, 1]) columna(p.en(s * ancho * 0.4, 0, 0.3), { radio: 0.24, alto: alto - 0.4, color })
  caja(p.en(0, alto - 0.4, 0.2), { ancho: ancho + 0.3, alto: 0.4, fondo: 0.7, color, flota: true })
  fronton(p.en(0, alto, 0.5), { ancho: ancho + 0.5, alto: ancho * 0.24, fondo: 0.6, color })
  vano(p, { ancho: ancho * 0.45, alto: alto * 0.72 })
}

/** Cúpula sobre tambor con ventanas, linterna y cruz; el pintor está en el arranque del tambor. */
export function cupulaConTambor(p, { radio, altoTambor = radio * 0.7, alto = radio * 1.1, lados = 12, color = TONO.CAL, cubierta = TONO.PIZARRA }) {
  tronco(p, { radio, alto: altoTambor, lados, color, flota: true })
  for (let i = 0; i < lados; i += 1) {
    const g = ((i + 0.5) / lados) * Math.PI * 2 + Math.PI / lados
    const [da, db] = [Math.sin(g), Math.cos(g)]
    vano(p.mirando(da * radio * 0.97, altoTambor * 0.25, db * radio * 0.97, da, db), { ancho: radio * 0.22, alto: altoTambor * 0.55 })
  }
  cupula(p.en(0, altoTambor, 0), { radio: radio * 1.04, alto, lados, color: cubierta })
  tronco(p.en(0, altoTambor + alto * 0.94, 0), { radio: radio * 0.18, alto: radio * 0.4, lados: 8, color, flota: true })
  cupula(p.en(0, altoTambor + alto * 0.94 + radio * 0.4, 0), { radio: radio * 0.2, alto: radio * 0.22, lados: 8, color: cubierta })
  const y = altoTambor + alto * 0.94 + radio * 0.62
  barra(p, [0, y, 0], [0, y + 1.5, 0], { radio: 0.06, lados: 4 })
  barra(p, [-0.4, y + 1.05, 0], [0.4, y + 1.05, 0], { radio: 0.06, lados: 4 })
}

/** Fachadas sencillas de la iglesia paramétrica, en el plano xy con el frente hacia +z. */
const FACHADAS = Object.freeze({
  /** Hastial triangular, pilastras, puerta de arco y óculo: la iglesia colonial o neoclásica. */
  clasica(p, { ancho, alto, color }) {
    caja(p.en(0, 0, -0.4), { ancho, alto, fondo: 0.8, color })
    for (const k of [-0.46, -0.2, 0.2, 0.46]) columna(p.en(k * ancho, 0, 0.3), { radio: 0.32, alto: alto - 0.5, color })
    caja(p.en(0, alto - 0.5, 0.1), { ancho: ancho + 0.4, alto: 0.5, fondo: 1, color, flota: true })
    fronton(p.en(0, alto, 0.4), { ancho: ancho + 0.5, alto: ancho * 0.22, fondo: 0.8, color })
    vano(p, { ancho: ancho * 0.16, alto: alto * 0.6 })
    disco(p.en(0, alto * 0.78, 0), { radio: ancho * 0.045 })
  },
  /** Hastial apuntado con rosetón, puerta ojival y pináculos: el neogótico de Guzmán Blanco. */
  neogotica(p, { ancho, alto, altoTecho, color }) {
    caja(p.en(0, 0, -0.4), { ancho, alto, fondo: 0.8, color })
    fronton(p.en(0, alto, 0.4), { ancho, alto: altoTecho + 1.2, fondo: 0.8, color })
    vano(p, { ancho: ancho * 0.2, alto: alto * 0.55 })
    fronton(p.en(0, alto * 0.55, 0.3), { ancho: ancho * 0.3, alto: ancho * 0.2, fondo: 0.3, color })
    disco(p.en(0, alto * 0.95, 0), { radio: ancho * 0.1 })
    for (const s of [-1, 1]) vano(p.en(s * ancho * 0.32, alto * 0.2, 0), { ancho: ancho * 0.07, alto: alto * 0.45 })
    for (const k of [-0.5, -0.22, 0.22, 0.5]) {
      caja(p.en(k * ancho, 0, 0.15), { ancho: 0.7, alto: alto + 1, fondo: 0.7, color })
      tronco(p.en(k * ancho, alto + 1, 0.15), { radio: 0.45, radioArriba: 0.03, alto: 2.6, lados: 4, color, flota: true })
    }
  },
})

/**
 * Iglesia paramétrica: nave de `largo` × `ancho` con tejado a dos aguas y ventanas altas, `fachada`
 * ('clasica' | 'neogotica' | 'barroca'), `torres` { n: 0 | 1 | 2, lado, cuerpos, remate, centrada? }
 * a los lados de la fachada (o una sola al centro), `cupula` { a, radio, … } sobre el crucero y, si se pide,
 * `dosFachadas` (otra igual en la cabecera: Santa Teresa).
 */
export function iglesia(p, {
  largo, ancho, alto, altoTecho = ancho * 0.28, fachada = 'clasica', torres = null, cupula: domo = null,
  dosFachadas = false, color = TONO.CAL, teja = TONO.TEJA,
}) {
  cuerpo(p.en(largo / 2, 0, 0), { largo, ancho, alto, altoTecho, color, teja })
  const vanos = Math.max(2, Math.round(largo / 9))
  for (const s of [-1, 1]) ventanas(p.mirando(largo / 2, 0, (s * ancho) / 2, 0, s), { largo: largo * 0.8, n: vanos, y: alto * 0.52, ancho: 1.2, alto: alto * 0.28 })
  const frentes = dosFachadas ? [[0, -1], [largo, 1]] : [[0, -1]]
  for (const [a, da] of frentes) {
    const q = p.mirando(a, 0, 0, da, 0)
    const centrada = torres?.centrada
    const anchoFachada = torres && !centrada ? ancho - 2 * torres.lado + 0.4 : ancho
    if (fachada === 'barroca') fachadaBarroca(q, { ancho: anchoFachada, alto1: alto * 0.6, alto2: alto * 0.4, altoFronton: altoTecho + 1, color })
    else (FACHADAS[fachada] ?? (() => { throw new Error(`iglesia: fachada desconocida "${fachada}"`) }))(q, { ancho: anchoFachada, alto, altoTecho, color })
    if (!torres) continue
    const lugares = centrada ? [0] : torres.n === 1 ? [-1] : [-1, 1]
    // en el marco de la fachada (+z hacia afuera): la torre queda a ras, medio lado hacia adentro
    for (const s of lugares) torre(q.en(s * (ancho / 2 - torres.lado / 2), 0, -torres.lado / 2 + (centrada ? 1 : 0.2)), { color, ...torres })
    if (centrada) {
      // la torre del medio tapa la puerta y el rosetón de la fachada: van en su cara de afuera
      vano(q.en(0, 0, 1), { ancho: torres.lado * 0.42, alto: alto * 0.5 })
      disco(q.en(0, alto * 0.82, 1), { radio: torres.lado * 0.24 })
    }
  }
  if (domo) cupulaConTambor(p.en(domo.a ?? largo * 0.7, alto + altoTecho * 0.55, 0), { color, ...domo })
}
