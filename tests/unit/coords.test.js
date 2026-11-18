import { describe, test, expect } from 'vitest'
import { crearCoords } from '../../src/coords.js'

const plano = { ancho: 10000, alto: 8000, metro: 0.5, plaza: [4000, 3000] }

describe('crearCoords', () => {
  test('la plaza es el origen del mundo', () => {
    const c = crearCoords(plano)
    expect(c.aMundo(4000, 3000)).toEqual({ x: 0, z: 0 })
  })

  test('convierte píxeles a metros con la escala del plano', () => {
    const c = crearCoords(plano)
    expect(c.aMundo(4100, 2800)).toEqual({ x: 50, z: -100 })
  })

  test('aPixel es la inversa de aMundo', () => {
    const c = crearCoords(plano)
    const { x, z } = c.aMundo(1234, 5678)
    const p = c.aPixel(x, z)
    expect(p.px).toBeCloseTo(1234, 9)
    expect(p.py).toBeCloseTo(5678, 9)
  })

  test('da el tamaño de la hoja en metros', () => {
    expect(crearCoords(plano).hoja).toEqual({ ancho: 5000, alto: 4000, x0: -2000, z0: -1500 })
  })

  test('falla con un plano sin escala válida', () => {
    expect(() => crearCoords({ ...plano, metro: 0 })).toThrow(/metro/)
    expect(() => crearCoords({ ...plano, plaza: [1] })).toThrow(/plaza/)
  })
})
