import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { describe, test, expect } from 'vitest'
import {
  rejillaDeCasas, choca, pasoAPie, entradaDeTeclas, joystick, puntoDeEntrada, teclaAjena, RADIO_M, VELOCIDAD,
} from '../../src/a-pie.js'

// px = m: un plano de 1 m por píxel con la plaza en (0, 0)
const aMundo = (px, py) => ({ x: px, z: py })
const cuadrado = (x, y, lado) => [x, y, x + lado, y, x + lado, y + lado, x, y + lado]

// dos casas de 10 × 10: la 0 nace en 1772 y vive siempre; la 1 nace en 1843 y muere en 1911
const datos = {
  vertices: Float32Array.from([...cuadrado(0, 0, 10), ...cuadrado(30, 0, 10)]),
  techos: Uint32Array.from([0, 4, 0, 0, 4, 4, 0, 0]),
  vida: Uint32Array.from([1 + 8 * 0, 2 + 8 * 4]),
}

describe('rejillaDeCasas y choca', () => {
  test('choca dentro de una casa y a menos del radio de su pared; no, en la calle', () => {
    const r = rejillaDeCasas(datos, 1, aMundo)
    expect(choca(r, 5, 5)).toBe(true)
    expect(choca(r, 10 + RADIO_M / 2, 5)).toBe(true)
    expect(choca(r, 10 + RADIO_M * 2, 5)).toBe(false)
    expect(choca(r, 20, 20)).toBe(false)
  })

  test('solo las casas en pie en la época: la 1 está de 1843 a 1911', () => {
    expect(choca(rejillaDeCasas(datos, 1, aMundo), 35, 5)).toBe(false)
    expect(choca(rejillaDeCasas(datos, 3, aMundo), 35, 5)).toBe(true)
    expect(choca(rejillaDeCasas(datos, 4, aMundo), 35, 5)).toBe(false)
  })

  test('sin línea de tiempo (época 99) quedan las casas que no mueren, como en 1936', () => {
    const r = rejillaDeCasas(datos, 99, aMundo)
    expect(choca(r, 5, 5)).toBe(true)
    expect(choca(r, 35, 5)).toBe(false)
  })

  test('sin vida, todas las casas están', () => {
    expect(choca(rejillaDeCasas({ ...datos, vida: undefined }, 1, aMundo), 35, 5)).toBe(true)
  })
})

describe('pasoAPie', () => {
  const r = rejillaDeCasas(datos, 1, aMundo)
  const quieto = { x: 5, z: 20, rumbo: 0, mirada: 0 }

  test('rumbo 0 mira hacia −z (el norte del plano): «adelante» avanza hacia allá, a la velocidad de paso', () => {
    const e = pasoAPie(quieto, { adelante: 1, lado: 0 }, 1, { choca: () => false })
    expect(e.z).toBeCloseTo(20 - VELOCIDAD.paso)
    expect(e.x).toBeCloseTo(5)
  })

  test('Mayús corre y «lado» va a la derecha', () => {
    const e = pasoAPie(quieto, { adelante: 0, lado: 1, corre: true }, 1, { choca: () => false })
    expect(e.x).toBeCloseTo(5 + VELOCIDAD.corre)
  })

  test('contra una pared de frente no pasa; en diagonal se desliza a lo largo de ella', () => {
    // la casa 0 ocupa z de 0 a 10: desde z = 11 hacia el norte, choca
    const frente = pasoAPie({ ...quieto, z: 11 }, { adelante: 1, lado: 0 }, 1, { choca: (x, z) => choca(r, x, z) })
    expect(frente.z).toBe(11)
    const diagonal = pasoAPie({ ...quieto, z: 11, rumbo: Math.PI / 4 }, { adelante: 1, lado: 0 }, 1, { choca: (x, z) => choca(r, x, z) })
    expect(diagonal.z).toBe(11)
    expect(diagonal.x).toBeGreaterThan(5)
  })

  test('no toca el estado de entrada', () => {
    const e = { ...quieto }
    pasoAPie(e, { adelante: 1, lado: 0 }, 1, { choca: () => false })
    expect(e).toEqual(quieto)
  })
})

describe('entradaDeTeclas', () => {
  test('WASD y las flechas, combinadas; Mayús corre', () => {
    expect(entradaDeTeclas(new Set(['KeyW']))).toEqual({ adelante: 1, lado: 0, corre: false })
    expect(entradaDeTeclas(new Set(['ArrowDown', 'KeyD', 'ShiftLeft']))).toEqual({ adelante: -1, lado: 1, corre: true })
    expect(entradaDeTeclas(new Set(['KeyW', 'KeyS']))).toEqual({ adelante: 0, lado: 0, corre: false })
  })
})

describe('joystick', () => {
  test('el corrimiento del dedo, hasta el radio: arriba es adelante', () => {
    expect(joystick({ x: 100, y: 100 }, { x: 100, y: 74 })).toEqual({ adelante: 0.5, lado: 0 })
    const lejos = joystick({ x: 100, y: 100 }, { x: 300, y: 100 })
    expect(lejos.lado).toBe(1)
    expect(lejos.adelante).toBeCloseTo(0)
  })
})

describe('puntoDeEntrada', () => {
  const r = rejillaDeCasas(datos, 1, aMundo)
  test('donde mira la cámara si está cerca; si no, en la plaza', () => {
    expect(puntoDeEntrada({ x: 20, z: 20, dist: 400 }, (x, z) => choca(r, x, z))).toMatchObject({ x: 20, z: 20 })
    expect(puntoDeEntrada({ x: 900, z: 900, dist: 5000 }, () => false)).toMatchObject({ x: 0, z: 0 })
  })

  test('si ese lugar está dentro de una casa, busca el más cercano que no', () => {
    const p = puntoDeEntrada({ x: 5, z: 5, dist: 400 }, (x, z) => choca(r, x, z))
    expect(choca(r, p.x, p.z)).toBe(false)
    expect(Math.hypot(p.x - 5, p.z - 5)).toBeLessThan(12)
  })
})

describe('teclaAjena', () => {
  const en = (selectores) => ({ closest: (s) => (selectores.some((x) => s.split(',').map((y) => y.trim()).includes(x)) ? {} : null) })

  test('lo que nace en un campo de texto o en un diálogo es suyo, sea la tecla que sea', () => {
    // Arrange
    const teclas = ['ArrowLeft', 'KeyW', 'KeyE', 'Escape', 'Space']
    // Act
    const ajenas = teclas.flatMap((code) => [en(['input']), en(['dialog']), en(['[role="dialog"]'])].map((target) => teclaAjena({ code, target })))
    // Assert
    expect(ajenas.every(Boolean)).toBe(true)
  })

  test('Espacio sobre un botón o un enlace es del control; las demás teclas sobre un botón son del modo', () => {
    // Arrange
    const boton = en(['button'])
    // Act y Assert
    expect(teclaAjena({ code: 'Space', target: boton })).toBe(true)
    expect(teclaAjena({ code: 'Space', target: en(['a']) })).toBe(true)
    expect(teclaAjena({ code: 'KeyW', target: boton })).toBe(false)
    expect(teclaAjena({ code: 'Space', target: en([]) })).toBe(false)
    expect(teclaAjena({ code: 'Space', target: null })).toBe(false)
  })
})

describe('rejillaDeCasas con las plantas de los hitos (T33j.7b, I1772-013)', () => {
  const plantas = [
    { id: 'catedral', nace: 1, muere: 0, planta: [[[100, 100], [120, 100], [120, 130], [100, 130]]] },
    { id: 'plaza', nace: 1, muere: 0, transitable: true, planta: [[[200, 200], [260, 200], [260, 260], [200, 260]]] },
  ]

  test('el caminante choca con la planta de un hito en pie, y no antes de que nazca', () => {
    expect(choca(rejillaDeCasas(datos, 1, aMundo, plantas), 110, 115)).toBe(true)
    expect(choca(rejillaDeCasas(datos, 0, aMundo, plantas), 110, 115)).toBe(false)
  })

  test('la planta de un hito transitable (una plaza) se camina', () => {
    expect(choca(rejillaDeCasas(datos, 1, aMundo, plantas), 230, 230)).toBe(false)
  })
})

describe('la colisión de los hitos grandes y la entrada (revisión de #152)', () => {
  const grande = [{ id: 'capitolio', nace: 1, muere: 0, patio: true, planta: [[[0, 0], [92, 0], [92, 108], [0, 108]]] }]
  const chica = [{ id: 'capilla', nace: 1, muere: 0, planta: [[[200, 0], [212, 0], [212, 30], [200, 30]]] }]

  test('en un hito grande choca la crujía junto al borde, no el patio del medio', () => {
    const rejilla = rejillaDeCasas(datos, 1, aMundo, grande)
    expect(choca(rejilla, 3, 50)).toBe(true)
    expect(choca(rejilla, 46, 54)).toBe(false)
  })

  test('un hito chico (una nave) choca entero', () => {
    expect(choca(rejillaDeCasas(datos, 1, aMundo, chica), 206, 15)).toBe(true)
  })

  test('una planta grande sin patio declarado (la nave de la Catedral, 78 × 27 m) choca entera: el patio no se infiere del tamaño', () => {
    const nave = [{ id: 'catedral', nace: 1, muere: 0, planta: [[[300, 0], [378, 0], [378, 27], [300, 27]]] }]
    expect(choca(rejillaDeCasas(datos, 1, aMundo, nave), 339, 13.5)).toBe(true)
    expect(choca(rejillaDeCasas(datos, 1, aMundo, grande.map(({ patio, ...h }) => h)), 46, 54)).toBe(true)
  })

  test('hitosConPlanta conserva el patio de los hitos que lo modelan (Capitolio, Miraflores) y nada más', () => {
    const conPatio = hitosConPlanta().filter((h) => h.patio).map((h) => h.id).sort()
    expect(conPatio).toEqual(['capitolio', 'miraflores'])
  })

  test('desde dentro de una planta sólida grande la entrada encuentra la calle aunque esté a más de 40 m', () => {
    const solida = [{ id: 'cuadra', nace: 1, muere: 0, planta: [[[500, 500], [612, 500], [612, 612], [500, 612]]] }]
    const rejilla = rejillaDeCasas({ vertices: new Float32Array(), techos: new Uint32Array(), vida: new Uint32Array() }, 1, aMundo,
      solida)
    const p = puntoDeEntrada({ x: 556, z: 556, dist: 0 }, (x, z) => choca(rejilla, x, z))
    expect(choca(rejilla, p.x, p.z)).toBe(false)
  })
})
