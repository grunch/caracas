/**
 * El Palacio Municipal tras la reforma de Alejandro Chataing (1904–1906), como lo describe el catálogo del IPC
 * (citado por IAM Venezuela): un volumen de esquina de planta rectangular con un patio central con fuente,
 * corredores con columnas en planta baja y alta, y un frente de tres cuerpos, el central con frontón
 * triangular y los laterales con frontones curvos. Marco: centrado en el origen del pintor, `ancho` a lo
 * largo de x (este–oeste) y `fondo` a lo largo de z; el frente a la plaza es el de z = −fondo/2.
 * Lo que no tiene fuente (alturas, vanos, cuerpo de atrás) está en `verificar` del hito y en
 * docs/palacio-municipal-integracion.md.
 */
import { ExtrudeGeometry, Shape } from 'three'
import { TONO, caja, tronco, vano, fronton, columna, verja } from './piezas.js'

const CRUJIA_MINIMA_M = 4
const ALTO_PRETIL_M = 0.8
const CORREDOR_M = 2.6 // lo que los corredores del patio entran en él
const CUERPO_CENTRAL_M = 9
const PABELLON_M = 8

/** Frontón curvo (un segmento de círculo) de frente, centrado en x, de `fondo` metros hacia atrás. */
function frontonCurvo(p, { ancho, alto, fondo = 0.5, color = TONO.CAL }) {
  const w = ancho / 2
  const radio = (w * w + alto * alto) / (2 * alto)
  const abre = Math.asin(w / radio)
  const forma = new Shape().moveTo(-w, 0).lineTo(w, 0)
  forma.absarc(0, alto - radio, radio, Math.PI / 2 - abre, Math.PI / 2 + abre, false)
  forma.closePath()
  p.geo(new ExtrudeGeometry(forma, { depth: fondo, bevelEnabled: false, curveSegments: 8 }).translate(0, 0, -fondo), { color, flota: true })
}

/** Un vano de planta baja (de arco) y, encima, el de planta alta con su balcón. */
function ejeDeVanos(q, x, { pisos, altoPiso }) {
  vano(q.en(x, altoPiso * 0.12, 0), { ancho: 1.5, alto: altoPiso * 0.62 })
  for (let piso = 1; piso < pisos; piso++) {
    const y = piso * altoPiso + altoPiso * 0.2
    vano(q.en(x, y, 0), { ancho: 1.4, alto: altoPiso * 0.56 })
    caja(q.en(x, y - 0.2, 0.3), { ancho: 2.4, alto: 0.2, fondo: 0.6, color: TONO.PIEDRA_CLARA, flota: true })
    verja(q.en(x - 1.2, y, 0.58), { largo: 2.4, alto: 0.9 })
  }
}

/** Un cuerpo saliente del frente: muro adelantado, columnas de doble altura a los lados, vanos y remate. */
function cuerpoSaliente(q, { ancho, alto, saliente, columnas, medidas, puerta, remate, color }) {
  caja(q.en(0, 0, saliente / 2), { ancho, alto: alto + ALTO_PRETIL_M, fondo: saliente, color })
  const frente = q.en(0, 0, saliente)
  for (const x of columnas) columna(frente.en(x, 0, 0.55), { radio: 0.38, alto: alto - 0.5, color })
  caja(frente.en(0, alto - 0.5, 0.35), { ancho: ancho + 0.3, alto: 0.5, fondo: 1.1, color, flota: true }) // el entablamento
  if (puerta) {
    vano(frente, { ancho: 2.6, alto: medidas.altoPiso * 0.86 })
    for (let piso = 1; piso < medidas.pisos; piso++) {
      const y = piso * medidas.altoPiso + medidas.altoPiso * 0.16
      vano(frente.en(0, y, 0), { ancho: 1.8, alto: medidas.altoPiso * 0.62 })
      verja(frente.en(-1.6, y, 0.5), { largo: 3.2, alto: 0.9 })
    }
  } else ejeDeVanos(frente, 0, medidas)
  remate(frente.en(0, alto + ALTO_PRETIL_M, 0.9), { ancho: ancho + 0.4, fondo: saliente + 0.9, color })
}

/** El frente a la plaza: tres cuerpos salientes y, entre ellos, dos paños de vanos con balcones arriba. */
function frenteALaPlaza(q, { ancho, alto, medidas, color }) {
  cuerpoSaliente(q, {
    ancho: CUERPO_CENTRAL_M, alto, saliente: 0.8, columnas: [-3.7, -2.7, 2.7, 3.7], medidas, puerta: true, color,
    remate: (r, m) => fronton(r, { ...m, alto: 2.4 }),
  })
  const centroPabellon = ancho / 2 - PABELLON_M / 2
  for (const s of [-1, 1]) {
    cuerpoSaliente(q.en(s * centroPabellon, 0, 0), {
      ancho: PABELLON_M, alto, saliente: 0.5, columnas: [-2.7, 2.7], medidas, puerta: false, color,
      remate: (r, m) => frontonCurvo(r, { ...m, alto: 1.9 }),
    })
    // el paño entre el cuerpo central y el pabellón: dos ejes de vanos
    const [desde, hasta] = [CUERPO_CENTRAL_M / 2, centroPabellon - PABELLON_M / 2]
    for (const t of [0.28, 0.72]) ejeDeVanos(q, s * (desde + (hasta - desde) * t), medidas)
  }
}

/** Los corredores del patio: pilares en los dos pisos y sus losas, por los cuatro lados; al centro, la fuente. */
function patioConCorredores(p, { patio, pisos, altoPiso, color }) {
  const lados = [
    [0, -1, patio.ancho, patio.fondo], [0, 1, patio.ancho, patio.fondo], [-1, 0, patio.fondo, patio.ancho], [1, 0, patio.fondo, patio.ancho],
  ]
  caja(p, { ancho: patio.ancho, alto: 0.08, fondo: patio.fondo, color: TONO.LOSA })
  for (const [da, db, largo, hondo] of lados) {
    // de espaldas al muro: +z local entra en el patio
    const q = p.mirando(da * hondo / 2, 0, db * hondo / 2, -da, -db)
    const tramos = Math.max(3, Math.round(largo / 3.6))
    for (let piso = 0; piso < pisos; piso++) {
      const y = piso * altoPiso
      for (let i = 0; i <= tramos; i++) {
        caja(q.en(-largo / 2 + (i / tramos) * largo, y, CORREDOR_M), { ancho: 0.42, alto: altoPiso - 0.25, fondo: 0.42, color, flota: piso > 0 })
      }
      caja(q.en(0, y + altoPiso - 0.25, CORREDOR_M / 2), { ancho: largo, alto: 0.25, fondo: CORREDOR_M, color: TONO.CAL_SOMBRA, flota: true })
    }
  }
  // la fuente: taza baja, pedestal y plato
  tronco(p, { radio: 1.7, alto: 0.5, lados: 10, color: TONO.PIEDRA_CLARA })
  tronco(p.en(0, 0.5, 0), { radio: 0.3, alto: 1.1, lados: 6, color: TONO.PIEDRA_CLARA, flota: true })
  tronco(p.en(0, 1.6, 0), { radio: 0.35, radioArriba: 1.0, alto: 0.3, lados: 10, color: TONO.PIEDRA_CLARA, flota: true })
}

/**
 * Palacio Municipal: cuatro cuerpos de `pisos` pisos alrededor de un `patio` ({ ancho, fondo, a, b }, descentrado
 * como en el plano), azotea con cornisa y pretil, frente de tres cuerpos hacia −z y vanos sobre la calle del
 * oeste. Los lados este y sur son medianeras: van ciegos.
 */
export function palacioMunicipal(p, { ancho, fondo, patio, pisos = 2, altoPiso = 5, color = TONO.CAL }) {
  const [x0, x1] = [patio.a - patio.ancho / 2, patio.a + patio.ancho / 2]
  const [z0, z1] = [patio.b - patio.fondo / 2, patio.b + patio.fondo / 2]
  const entra = x0 >= -ancho / 2 + CRUJIA_MINIMA_M && x1 <= ancho / 2 - CRUJIA_MINIMA_M && z0 >= -fondo / 2 + CRUJIA_MINIMA_M && z1 <= fondo / 2 - CRUJIA_MINIMA_M
  if (!entra) throw new Error('palacioMunicipal: el patio no entra en la planta')
  const alto = pisos * altoPiso
  const medidas = { pisos, altoPiso }
  // [centro a, centro b, ancho, fondo]: norte y sur de lado a lado; este y oeste, entre ellos
  const cuerpos = [
    [0, (-fondo / 2 + z0) / 2, ancho, z0 + fondo / 2], [0, (z1 + fondo / 2) / 2, ancho, fondo / 2 - z1],
    [(-ancho / 2 + x0) / 2, patio.b, x0 + ancho / 2, patio.fondo], [(x1 + ancho / 2) / 2, patio.b, ancho / 2 - x1, patio.fondo],
  ]
  for (const [a, b, w, f] of cuerpos) {
    caja(p.en(a, 0, b), { ancho: w, alto, fondo: f, color })
    caja(p.en(a, alto, b), { ancho: w, alto: 0.2, fondo: f, color: TONO.CAL_SOMBRA, flota: true }) // la azotea
  }
  // cornisa volada y pretil por los cuatro lados de afuera (en fajas: una caja entera techaría el patio)
  const bordes = [[0, -fondo / 2, ancho, 0], [0, fondo / 2, ancho, 0], [-ancho / 2, 0, fondo, Math.PI / 2], [ancho / 2, 0, fondo, Math.PI / 2]]
  for (const [a, b, largo, giro] of bordes) {
    const q = p.en(a, 0, b, giro)
    caja(q.en(0, alto - 0.4, 0), { ancho: largo + 0.9, alto: 0.4, fondo: 0.9, color, flota: true })
    caja(q.en(0, alto, 0), { ancho: largo, alto: ALTO_PRETIL_M, fondo: 0.3, color, flota: true })
  }
  frenteALaPlaza(p.mirando(0, 0, -fondo / 2, 0, -1), { ancho, alto, medidas, color })
  // la calle del oeste (Sur 2): hileras de vanos, sin cuerpos salientes
  const oeste = p.mirando(-ancho / 2, 0, 0, -1, 0)
  const ejes = Math.max(4, Math.round(fondo / 5.2))
  for (let i = 0; i < ejes; i++) ejeDeVanos(oeste, -fondo / 2 + ((i + 0.5) / ejes) * fondo, medidas)
  patioConCorredores(p.en(patio.a, 0, patio.b), { patio, pisos, altoPiso, color })
}
