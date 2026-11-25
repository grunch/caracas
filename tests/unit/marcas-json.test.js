import { describe, test, expect } from 'vitest'
import { marcasConPosicion } from '../../tools/marcas-json.mjs'

describe('marcasConPosicion: las marcas con su punto en píxeles y su vida, como las resuelve el visor', () => {
  const hitos = [{ id: 'h', x: 100, y: 200, nace: 2 }]
  test('una marca con hito toma de él su punto y, si no trae la suya, su época', () => {
    const [m] = marcasConPosicion([{ id: 'a', hito: 'h', nivel: 2, nombre: 'A', fuente: 'f' }], hitos)
    expect(m).toMatchObject({ id: 'a', px: 100, py: 200, nace: 2, muere: 0, hito: 'h' })
  })
  test('una marca suelta conserva su punto y su vida', () => {
    const [m] = marcasConPosicion([{ id: 'b', x: 5, y: 6, nace: 1, muere: 3, nivel: 2, nombre: 'B', fuente: 'f' }], hitos)
    expect(m).toMatchObject({ id: 'b', px: 5, py: 6, nace: 1, muere: 3, hito: null })
  })
})
