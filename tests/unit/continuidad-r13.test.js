import { describe, it, expect } from 'vitest'
import { centroDeHuella, hayManzana, manzanaDe, muertesSinR13, recintosDe, texelDe } from '../e2e/continuidad-r13.js'

// Un campo de 12 × 6 texeles de 10 px de lado, un canal por época. `filas`: una cadena por canal y fila, '#' manzana.
function campoDe(...canales) {
  const [ancho, alto] = [canales[0][0].length, canales[0].length]
  const datos = new Uint8Array(ancho * alto * canales.length)
  canales.forEach((filas, c) => filas.forEach((fila, j) => [...fila].forEach((t, i) => {
    datos[(j * ancho + i) * canales.length + c] = t === '#' ? 200 : 60
  })))
  return { caja: [0, 0, ancho * 10, alto * 10], ancho, alto, canales: canales.length, datos }
}

// Época anterior: dos manzanas (A a la izquierda, B a la derecha). En esta, A ya no está.
const ANTES = [
  '............',
  '.####..####.',
  '.####..####.',
  '.####..####.',
  '.####..####.',
  '............',
]
const AHORA = [
  '............',
  '.......####.',
  '.......####.',
  '.......####.',
  '.......####.',
  '............',
]
const campo = campoDe(ANTES, AHORA)
const antes = { campo, canal: 0 }
const ahora = { campo, canal: 1 }
const cuadro = (x, y, lado = 10) => [[x, y], [x + lado, y], [x + lado, y + lado], [x, y + lado]]
const enA = { casa: 7, huella: cuadro(20, 20) }
const enB = { casa: 8, huella: cuadro(80, 20) }
const HITO_SOBRE_A = cuadro(0, 0, 30)

describe('campo de manzanas', () => {
  it('ubica el texel de un punto y dice −1 fuera de la caja', () => {
    expect(texelDe(campo, [25, 15])).toBe(1 * 12 + 2)
    expect(texelDe(campo, [-1, 15])).toBe(-1)
    expect(texelDe(campo, [25, 60])).toBe(-1)
  })

  it('lee cada época de su canal', () => {
    const k = texelDe(campo, [25, 25])
    expect(hayManzana(campo, 0, k)).toBe(true)
    expect(hayManzana(campo, 1, k)).toBe(false)
    expect(hayManzana(campo, 0, -1)).toBe(false)
  })

  it('el borde (0 m) no es manzana: el byte 127 queda afuera y el 128 adentro', () => {
    const borde = { caja: [0, 0, 20, 10], ancho: 2, alto: 1, canales: 1, datos: Uint8Array.of(127, 128) }
    expect([0, 1].map((k) => hayManzana(borde, 0, k))).toEqual([false, true])
  })

  it('una manzana son sus texeles conexos: no cruza la calle', () => {
    expect(manzanaDe(campo, 0, texelDe(campo, [25, 25]))).toHaveLength(16)
    expect(manzanaDe(campo, 0, texelDe(campo, [5, 5]))).toEqual([])
  })
})

describe('centro de una huella', () => {
  it('es el de área, sin importar cuántos vértices tenga un lado ni el sentido del anillo', () => {
    const conEscalera = [[0, 0], [30, 0], [30, 1], [30, 2], [30, 5], [30, 10], [30, 20], [30, 30], [0, 30]]
    expect(centroDeHuella([[0, 0], [30, 0], [30, 30], [0, 30]])).toEqual([15, 15])
    expect(centroDeHuella(conEscalera)).toEqual([15, 15])
    expect(centroDeHuella([[0, 30], [30, 30], [30, 0], [0, 0]])).toEqual([15, 15])
  })

  it('rechaza una huella sin área', () => {
    expect(() => centroDeHuella([[0, 0], [10, 10]])).toThrow(/sin área/)
  })
})

describe('recintos de los hitos en pie', () => {
  const hitos = [
    { id: 'viejo', nace: 1, muere: 5, planta: [cuadro(0, 0)], suprime: [cuadro(0, 0, 20)] },
    { id: 'nuevo', nace: 5, muere: 0, planta: [cuadro(50, 50)] },
  ]

  it('junta las plantas y lo que reserva cada hito vivo en la época', () => {
    expect(recintosDe(hitos, 4)).toEqual([cuadro(0, 0), cuadro(0, 0, 20)])
    expect(recintosDe(hitos, 5)).toEqual([cuadro(50, 50)])
    expect(recintosDe(hitos, 0)).toEqual([])
  })
})

describe('muertes que la R13 no explica', () => {
  it('ninguna si la manzana de la casa ya no está y un hito la pisa', () => {
    expect(muertesSinR13({ muertas: [enA], antes, ahora, recintos: [HITO_SOBRE_A] })).toEqual([])
  })

  it('una casa que muere en una manzana que sigue en pie', () => {
    expect(muertesSinR13({ muertas: [enA, enB], antes, ahora, recintos: [HITO_SOBRE_A] }))
      .toEqual([{ casa: 8, motivo: 'su manzana sigue en pie' }])
  })

  it('una manzana que desaparece sin que ningún hito la pise', () => {
    expect(muertesSinR13({ muertas: [enA], antes, ahora, recintos: [] }))
      .toEqual([{ casa: 7, motivo: 'ningún hito pisa su manzana' }])
    // el hito de la manzana vecina no cuenta
    expect(muertesSinR13({ muertas: [enA], antes, ahora, recintos: [cuadro(70, 10, 40)] }))
      .toEqual([{ casa: 7, motivo: 'ningún hito pisa su manzana' }])
  })

  it('una casa que no estaba en ninguna manzana, ni dentro del campo', () => {
    const suelta = { casa: 3, huella: cuadro(52, 22, 6) }
    const lejos = { casa: 4, huella: cuadro(500, 500) }
    expect(muertesSinR13({ muertas: [suelta, lejos], antes, ahora, recintos: [cuadro(40, 0, 600)] })).toEqual([
      { casa: 3, motivo: 'no estaba en una manzana' },
      { casa: 4, motivo: 'no estaba en una manzana' },
    ])
  })

  it('mide cada manzana una sola vez y no toca lo que recibe', () => {
    const otraEnA = { casa: 9, huella: cuadro(30, 30) }
    const muertas = Object.freeze([enA, otraEnA])
    expect(muertesSinR13({ muertas, antes, ahora, recintos: Object.freeze([HITO_SOBRE_A]) })).toEqual([])
  })

  it('las épocas pueden venir de campos distintos (1889 y 1911 están en dos imágenes)', () => {
    const viejo = { campo: campoDe(ANTES), canal: 0 }
    const nuevo = { campo: { ...campoDe(AHORA), caja: [-60, -10, 60, 50] }, canal: 0 }
    // en el campo nuevo, corrido, bajo la casa de A hay manzana: el texel se busca con la caja de cada campo
    expect(muertesSinR13({ muertas: [enA], antes: viejo, ahora: nuevo, recintos: [HITO_SOBRE_A] }))
      .toEqual([{ casa: 7, motivo: 'su manzana sigue en pie' }])
  })
})
