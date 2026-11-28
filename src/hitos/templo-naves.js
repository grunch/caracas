/**
 * Templo de tres naves, como los describe el catálogo del IPC (Santa Rosalía, San José): la nave central más
 * alta que las laterales, fachada de tres puertas con frontón sobre el cuerpo del medio, torres donde el plano
 * las dibuja y, si se piden, brazos a los lados y cúpulas sobre la cabecera.
 * Marco: el origen está al pie de la fachada, en su centro; +x entra en la nave y z es el ancho.
 */
import { TONO, caja, tejado, vano, disco, fronton, columna, cornisa } from './piezas.js'
import { torre, cupulaConTambor, ventanas } from './iglesias.js'

const CUBIERTAS = Object.freeze(['teja', 'plana'])
const PENDIENTE_LATERAL = 0.3 // lo que sube el tejado de una nave lateral por metro de ancho
const PENDIENTE_CENTRAL = 0.28
const VANOS_CADA_M = 8
const RETIRO_TEJADO_M = 1.2 // lo que el tejado se aparta de una fachada de pantalla: más que su alero

/**
 * `largo` × `ancho` de las tres naves; `altoLateral` y `altoCentral` al borde de los muros; `anchoCentral` de la
 * nave del medio. `cubierta`: 'teja' (a dos aguas la central, a un agua las laterales) o 'plana' (platabanda).
 * `pantalla`: la fachada es un solo plano del ancho de las tres naves, a la altura de la central.
 * `torres` { lado, a, b: [centros], cuerpos, remate }, `brazos` { a, largo, ancho, alto } (cuerpo atravesado,
 * centrado en a) y `cupulas` [{ a, b?, radio, … }] (sobre la nave central si b = 0; si no, sobre las laterales).
 */
export function temploDeNaves(p, {
  largo, ancho, altoLateral, altoCentral, anchoCentral = ancho * 0.44, cubierta = 'teja', pantalla = false,
  torres = null, brazos = null, cupulas = [], color = TONO.CAL, teja = TONO.TEJA,
}) {
  if (!(altoCentral > altoLateral)) throw new Error('temploDeNaves: la nave central va más alta que las laterales')
  if (!CUBIERTAS.includes(cubierta)) throw new Error(`temploDeNaves: cubierta desconocida "${cubierta}"`)
  const plana = cubierta === 'plana'
  const anchoLateral = (ancho - anchoCentral) / 2
  const caida = plana ? 0 : Math.min(anchoLateral * PENDIENTE_LATERAL, (altoCentral - altoLateral) * 0.6)
  const vanos = Math.max(2, Math.round(largo / VANOS_CADA_M))

  // detrás de una fachada de pantalla los tejados arrancan después del muro: si no, el alero lo atraviesa
  const retiro = pantalla && !plana ? RETIRO_TEJADO_M : 0
  naveCentral(p, { largo, anchoCentral, altoCentral, plana, retiro, color, teja })
  for (const s of [-1, 1]) {
    const b = (s * (anchoCentral + anchoLateral)) / 2
    caja(p.en(largo / 2, 0, b), { ancho: largo, alto: altoLateral, fondo: anchoLateral, color })
    if (plana) cornisa(p.en(largo / 2, altoLateral, b), { largo, ancho: anchoLateral, alto: 0.45, vuelo: 0.15, color })
    else tejado(p.mirando((largo + retiro) / 2, altoLateral, b, 0, s), { largo: largo - retiro, ancho: anchoLateral, alto: caida, tipo: 'una', alero: 0.3, color: teja, hastial: color })
    ventanas(p.mirando(largo / 2, 0, (s * ancho) / 2, 0, s), { largo: largo * 0.82, n: vanos, y: altoLateral * 0.42, ancho: 1.2, alto: altoLateral * 0.3 })
    // las ventanas altas de la nave central, sobre el tejado de las laterales
    const claro = altoCentral - altoLateral - caida
    ventanas(p.mirando(largo / 2, 0, (s * anchoCentral) / 2, 0, s), { largo: largo * 0.82, n: vanos, y: altoLateral + caida + claro * 0.25, ancho: 1, alto: claro * 0.5 })
  }
  if (brazos) cuerpoAtravesado(p, { ...brazos, plana, color, teja })
  fachada(p.mirando(0, 0, 0, -1, 0), { ancho, anchoCentral, anchoLateral, altoLateral, altoCentral, pantalla, color })
  if (torres) for (const b of torres.b) torre(p.en(torres.a, 0, b), { lado: torres.lado, cuerpos: torres.cuerpos, remate: torres.remate, color })
  for (const { a, b = 0, ...medidas } of cupulas) cupulaConTambor(p.en(a, b === 0 ? altoCentral : altoLateral, b), { color, ...medidas })
}

function naveCentral(p, { largo, anchoCentral, altoCentral, plana, retiro, color, teja }) {
  const q = p.en(largo / 2, 0, 0)
  caja(q, { ancho: largo, alto: altoCentral, fondo: anchoCentral, color })
  if (plana) cornisa(q.en(0, altoCentral, 0), { largo, ancho: anchoCentral, alto: 0.45, vuelo: 0.2, color })
  else tejado(q.en(retiro / 2, altoCentral, 0), { largo: largo - retiro, ancho: anchoCentral, alto: anchoCentral * PENDIENTE_CENTRAL, color: teja, hastial: color })
}

/** Los brazos: un cuerpo bajo atravesado a las naves, con la cumbrera de lado a lado. */
function cuerpoAtravesado(p, { a, largo, ancho, alto, plana, color, teja }) {
  const q = p.en(a, 0, 0, Math.PI / 2) // girado: su largo corre a lo ancho del templo
  caja(q, { ancho, alto, fondo: largo, color })
  if (plana) cornisa(q.en(0, alto, 0), { largo: ancho, ancho: largo, alto: 0.45, vuelo: 0.15, color })
  else tejado(q.en(0, alto, 0), { largo: ancho, ancho: largo, alto: largo * PENDIENTE_CENTRAL, color: teja, hastial: color })
  for (const s of [-1, 1]) vano(p.mirando(a, alto * 0.4, (s * ancho) / 2, 0, s), { ancho: 1.3, alto: alto * 0.32 })
}

/** La fachada, en el plano xy del pintor con el frente hacia +z: tres puertas, pilastras, entablamento y frontón. */
function fachada(q, { ancho, anchoCentral, anchoLateral, altoLateral, altoCentral, pantalla, color }) {
  const anchoAlto = pantalla ? ancho : anchoCentral // lo que llega a la altura de la nave central
  if (pantalla) caja(q.en(0, 0, -0.3), { ancho, alto: altoCentral, fondo: 0.6, color })
  const pilastras = pantalla ? [-0.48, -0.2, 0.2, 0.48].map((k) => k * ancho) : [-0.5, 0.5].map((k) => k * anchoCentral)
  for (const x of pilastras) columna(q.en(x, 0, 0.3), { radio: 0.32, alto: altoCentral - 0.5, color })
  caja(q.en(0, altoCentral - 0.5, 0.1), { ancho: anchoAlto + 0.5, alto: 0.5, fondo: 1, color, flota: true })
  const anchoFronton = pantalla ? ancho * 0.62 : anchoCentral + 0.6
  fronton(q.en(0, altoCentral, 0.4), { ancho: anchoFronton, alto: anchoFronton * 0.2, fondo: 0.8, color })
  vano(q, { ancho: anchoCentral * 0.3, alto: altoLateral * 0.62 })
  disco(q.en(0, altoLateral + (altoCentral - altoLateral) * 0.45, 0), { radio: anchoCentral * 0.08 })
  for (const s of [-1, 1]) vano(q.en((s * (anchoCentral + anchoLateral)) / 2, 0, 0), { ancho: anchoLateral * 0.36, alto: altoLateral * 0.5 })
}
