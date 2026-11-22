import { describe, test, expect } from 'vitest'
import { hitosConPlanta } from '../../tools/hitos-planta.mjs'

describe('hitosConPlanta', () => {
  test('entrega cada hito modelado con planta, supresión y vida, para medir los dobles edificios de 1772', () => {
    const hitos = hitosConPlanta()
    const catedral = hitos.find((h) => h.id === 'catedral')
    expect(catedral.nace).toBe(1)
    expect(catedral.planta.length).toBeGreaterThan(0)
    expect(catedral.suprime.length).toBeGreaterThan(0)
    expect(hitos.every((h) => Array.isArray(h.planta) && Array.isArray(h.suprime))).toBe(true)
  })
})
