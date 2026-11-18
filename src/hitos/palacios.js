/**
 * Edificios civiles: el palacio de crujías alrededor de un patio (Casa Amarilla, Capitolio, Miraflores), el
 * pórtico de columnas con frontón y el frente neogótico de la Universidad. Marco: centrado en el origen del
 * pintor, `ancho` a lo largo de x y `fondo` a lo largo de z.
 */
import { TONO, caja, tronco, barra, tejado, vano, fronton, columna, cornisa, verja } from './piezas.js'
import { ventanas } from './iglesias.js'

/** Los cuatro frentes de un rectángulo centrado: [hacia afuera (da, db), centro (a, b), largo del frente]. */
const frentesDe = (ancho, fondo) => [
  [[0, -1], [0, -fondo / 2], ancho], [[0, 1], [0, fondo / 2], ancho], [[-1, 0], [-ancho / 2, 0], fondo], [[1, 0], [ancho / 2, 0], fondo],
]

const CUBIERTAS = Object.freeze({
  /** Azotea con cornisa volada y pretil (los palacios guzmancistas). */
  azotea(p, { largo, ancho, color }) {
    caja(p, { ancho: largo, alto: 0.25, fondo: ancho, color: TONO.CAL_SOMBRA, flota: true })
    cornisa(p.en(0, -0.35, 0), { largo, ancho, alto: 0.35, vuelo: 0.45, color })
    for (const s of [-1, 1]) caja(p.en(0, 0, s * (ancho / 2 - 0.15)), { ancho: largo, alto: 0.8, fondo: 0.3, color, flota: true })
    for (const s of [-1, 1]) caja(p.en(s * (largo / 2 - 0.15), 0, 0), { ancho: 0.3, alto: 0.8, fondo: ancho, color, flota: true })
  },
  /** Tejado de teja a cuatro aguas. */
  teja(p, { largo, ancho }) { tejado(p, { largo, ancho, alto: ancho * 0.26, tipo: 'cuatro' }) },
  /** Mansarda de pizarra: faldón empinado y remate casi plano (Miraflores en la panorámica de ~1903). */
  mansarda(p, { largo, ancho, color }) {
    cornisa(p.en(0, -0.3, 0), { largo, ancho, alto: 0.3, vuelo: 0.35, color })
    tejado(p, { largo, ancho, alto: 3.4, tipo: 'cuatro', alero: 0.1, color: TONO.PIZARRA })
  },
})

/**
 * Palacio: cuatro crujías de `crujia` metros de fondo alrededor de un patio, de `pisos` pisos, con hileras
 * de ventanas en los frentes de afuera, faja entre pisos y la `cubierta` pedida ('azotea' | 'teja' |
 * 'mansarda'). Con `pabellones`, las esquinas suben medio piso más.
 */
export function palacio(p, { ancho, fondo, crujia = 12, pisos = 2, altoPiso = 5, cubierta = 'azotea', pabellones = false, color = TONO.CAL, balcones = false }) {
  const cubrir = CUBIERTAS[cubierta]
  if (!cubrir) throw new Error(`palacio: cubierta desconocida "${cubierta}"`)
  const alto = pisos * altoPiso
  // las crujías del norte y del sur van de lado a lado; las del este y el oeste, entre ellas
  const crujias = [
    [0, -(fondo - crujia) / 2, ancho, 0], [0, (fondo - crujia) / 2, ancho, 0],
    [-(ancho - crujia) / 2, 0, fondo - 2 * crujia, Math.PI / 2], [(ancho - crujia) / 2, 0, fondo - 2 * crujia, Math.PI / 2],
  ]
  for (const [a, b, largo, giro] of crujias) {
    const q = p.en(a, 0, b, giro)
    caja(q, { ancho: largo, alto, fondo: crujia, color })
    cubrir(q.en(0, alto, 0), { largo, ancho: crujia, color })
  }
  for (const [[da, db], [a, b], largo] of frentesDe(ancho, fondo)) {
    const q = p.mirando(a, 0, b, da, db)
    const n = Math.max(3, Math.round(largo / 4.2))
    for (let piso = 0; piso < pisos; piso++) {
      ventanas(q, { largo: largo * 0.94, n, y: piso * altoPiso + altoPiso * 0.24, ancho: 1.25, alto: altoPiso * 0.52, arco: piso === 0 })
      if (piso > 0) caja(q.en(0, piso * altoPiso - 0.15, 0.12), { ancho: largo, alto: 0.3, fondo: 0.24, color, flota: true }) // la faja
      if (piso > 0 && balcones) verja(q.en(-largo * 0.47, piso * altoPiso + 0.15, 0.5), { largo: largo * 0.94, alto: 1 })
    }
  }
  if (!pabellones) return
  for (const sa of [-1, 1]) {
    for (const sb of [-1, 1]) {
      const q = p.en(sa * (ancho - crujia) / 2, 0, sb * (fondo - crujia) / 2)
      caja(q, { ancho: crujia + 1, alto: alto + altoPiso * 0.5, fondo: crujia + 1, color })
      cubrir(q.en(0, alto + altoPiso * 0.5, 0), { largo: crujia + 1, ancho: crujia + 1, color })
    }
  }
}

/** Pórtico: `columnas` columnas al frente (+z) con entablamento y frontón, de `fondo` metros de vuelo. */
export function portico(p, { ancho, alto, columnas = 6, fondo = 4, color = TONO.CAL, conFronton = true }) {
  for (let i = 0; i < columnas; i++) columna(p.en(-ancho / 2 + ((i + 0.5) / columnas) * ancho, 0, fondo - 0.6), { radio: 0.42, alto: alto - 0.8, color })
  caja(p.en(0, alto - 0.8, fondo / 2), { ancho: ancho + 0.4, alto: 0.8, fondo, color, flota: true })
  if (conFronton) fronton(p.en(0, alto, fondo), { ancho: ancho + 0.6, alto: ancho * 0.2, fondo, color })
  vano(p, { ancho: 2.2, alto: alto * 0.6 })
}

/** Remate central de un palacio: ático con escudo, frontón curvo y asta de bandera (la Casa Amarilla). */
export function remateConEscudo(p, { ancho = 7, alto = 2.6, color = TONO.CAL }) {
  caja(p.en(0, 0, -0.3), { ancho, alto, fondo: 0.6, color, flota: true })
  fronton(p.en(0, alto, 0), { ancho: ancho * 0.7, alto: 1.2, fondo: 0.6, color })
  vano(p.en(0, alto * 0.2, 0), { ancho: 1.3, alto: alto * 0.6, color: TONO.OCRE })
  barra(p, [0, alto + 1.2, -0.3], [0, alto + 6, -0.3], { radio: 0.06, radioFin: 0.03, lados: 4 })
}

/**
 * Frente neogótico de un piso alto: ventanas ojivales entre contrafuertes con pináculo, crestería calada y
 * un gablete central con aguja (la fachada de la foto de 1880 con la estatua de Guzmán Blanco).
 * Es un cuerpo de `largo` × `fondo`, con el frente hacia +z.
 */
export function frenteNeogotico(p, { largo, fondo = 12, alto = 9, color = TONO.CAL }) {
  caja(p, { ancho: largo, alto, fondo, color })
  caja(p.en(0, alto, 0), { ancho: largo, alto: 0.25, fondo, color: TONO.CAL_SOMBRA, flota: true })
  const q = p.en(0, 0, fondo / 2)
  const tramos = Math.max(4, Math.round(largo / 5.5))
  for (let i = 0; i <= tramos; i++) {
    const x = -largo / 2 + (i / tramos) * largo
    caja(q.en(x, 0, 0.2), { ancho: 0.7, alto: alto + 0.6, fondo: 0.7, color }) // contrafuerte
    tronco(q.en(x, alto + 0.6, 0.2), { radio: 0.45, radioArriba: 0.03, alto: 2.4, lados: 4, color, flota: true })
    if (i < tramos) vano(q.en(x + largo / tramos / 2, alto * 0.16, 0), { ancho: 1.3, alto: alto * 0.6 })
  }
  verja(q.en(-largo / 2, alto, 0), { largo, alto: 1.1, color }) // la crestería
  // el gablete central con su aguja
  caja(q.en(0, 0, 0.5), { ancho: 7, alto: alto + 1.5, fondo: 1.4, color })
  fronton(q.en(0, alto + 1.5, 1.2), { ancho: 7, alto: 5, fondo: 1.4, color })
  vano(q.en(0, 0, 1.2), { ancho: 2.4, alto: alto * 0.7 })
  tronco(q.en(0, alto + 6.2, 0.5), { radio: 0.7, radioArriba: 0.03, alto: 5, lados: 4, color, flota: true })
}
