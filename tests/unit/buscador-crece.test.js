import { describe, test, expect } from 'vitest'
import { etapasDe, celdasAlrededor, UMBRAL, RADIO_MUESTRA_M } from '../../src/buscador/crece.js'

const E = 6
/** El byte de crece.png para "desde la época k" (specs/02): la primera vale 255, la última 255/E, nunca 0. */
const byte = (k) => (Number.isFinite(k) ? Math.round(255 * (1 - k / E)) : 0)
const celdas = (...pares) => new Uint8ClampedArray(pares.flatMap(([r, g]) => [byte(r), byte(g), 0, 255]))

describe('etapasDe', () => {
  test('una zona pareja: edificada y urbanizada desde su época', () => {
    expect(etapasDe(celdas([1, 1], [1, 1], [1, 1], [1, 1]), E)).toEqual({ edificado: 1, urbanizado: 1 })
  })

  test('una cuadra: la calle no está edificada nunca, pero las casas de los lados sí', () => {
    const calle = Array.from({ length: 6 }, () => [Infinity, 1])
    const casas = Array.from({ length: 4 }, () => [1, 1])
    expect(etapasDe(celdas(...calle, ...casas), E)).toEqual({ edificado: 1, urbanizado: 1 })
  })

  test('una casa suelta no alcanza para decir que el lugar estaba edificado', () => {
    const campo = Array.from({ length: 19 }, () => [Infinity, 3])
    expect(etapasDe(celdas(...campo, [1, 1]), E)).toEqual({ edificado: Infinity, urbanizado: 3 })
    expect(1 / 20).toBeLessThan(UMBRAL.edificado)
  })

  test('la época es la primera en que se junta lo suficiente', () => {
    const mezcla = [[1, 1], ...Array.from({ length: 4 }, () => [3, 3]), ...Array.from({ length: 5 }, () => [Infinity, 4])]
    expect(etapasDe(celdas(...mezcla), E)).toEqual({ edificado: 3, urbanizado: 3 })
  })

  test('campo: nunca', () => {
    expect(etapasDe(celdas([Infinity, Infinity], [Infinity, Infinity]), E)).toEqual({ edificado: Infinity, urbanizado: Infinity })
  })

  test('sin celdas (fuera de la imagen) no hay dato', () => {
    expect(etapasDe(new Uint8ClampedArray(0), E)).toBeNull()
  })
})

describe('celdasAlrededor', () => {
  const rejilla = { metro: 0.5, celdaM: 8, cols: 100, rows: 80 }

  test('un redondel de celdas alrededor del punto, todas a menos del radio', () => {
    const c = celdasAlrededor([800, 640], rejilla) // (400 m, 320 m) → celda (50, 40)
    expect(c.length).toBeGreaterThan(40)
    expect(c.length).toBeLessThan(60)
    for (const [i, j] of c) expect(Math.hypot((i + 0.5) * 8 - 400, (j + 0.5) * 8 - 320)).toBeLessThanOrEqual(RADIO_MUESTRA_M)
    expect(c).toContainEqual([50, 40])
  })

  test('en el borde se recorta y fuera de la imagen no queda nada', () => {
    const borde = celdasAlrededor([0, 0], rejilla)
    expect(borde.length).toBeGreaterThan(5)
    expect(borde.every(([i, j]) => i >= 0 && j >= 0)).toBe(true)
    expect(celdasAlrededor([-5000, 300], rejilla)).toEqual([])
    expect(celdasAlrededor([5000, 5000], rejilla)).toEqual([])
  })
})
