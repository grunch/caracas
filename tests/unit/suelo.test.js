import { describe, test, expect } from 'vitest'
import { rgbaDeClase, tablaSuelo } from '../../tools/suelo-lib.mjs'

describe('rgbaDeClase', () => {
  test.each([
    ['calle', 1, [0, 0, 0, 0]],
    ['patio', 2, [0, 0, 0, 255]],
    ['edificado', 3, [0, 0, 255, 255]],
    ['publico', 4, [0, 0, 255, 255]],
    ['verde', 5, [0, 255, 0, 255]],
    ['cultivo', 6, [0, 255, 0, 0]],
    ['agua', 7, [255, 0, 0, 0]],
    ['cerro', 8, [0, 0, 0, 0]],
  ])('%s (%i) → R agua · G vegetación · B edificado · A manzana', (_, clase, rgba) => {
    expect(rgbaDeClase(clase)).toEqual(rgba)
  })

  test('lo desconocido y el margen no pintan nada', () => {
    expect(rgbaDeClase(0)).toEqual([0, 0, 0, 0])
    expect(rgbaDeClase(9)).toEqual([0, 0, 0, 0])
  })
})

describe('tablaSuelo', () => {
  test('es una tabla de 256 colores RGBA lista para indexar por clase', () => {
    const t = tablaSuelo()
    expect(t).toBeInstanceOf(Uint8Array)
    expect(t.length).toBe(256 * 4)
    expect(Array.from(t.subarray(3 * 4, 3 * 4 + 4))).toEqual([0, 0, 255, 255])
    expect(Array.from(t.subarray(200 * 4, 200 * 4 + 4))).toEqual([0, 0, 0, 0])
  })
})
