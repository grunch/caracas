import { describe, test, expect } from 'vitest'
import { visibleEn, epocaAqui, vivo, desdeCuando } from '../../src/epocas.js'

describe('visibleEn', () => {
  test('una casa se ve desde que nace y hasta antes de morir (muere = 0: nunca)', () => {
    expect(visibleEn(2, 0, 1)).toBe(false)
    expect(visibleEn(2, 0, 2)).toBe(true)
    expect(visibleEn(2, 0, 5)).toBe(true)
    expect(visibleEn(0, 3, 2)).toBe(true)
    expect(visibleEn(0, 3, 3)).toBe(false)
  })
})

describe('epocaAqui', () => {
  const de = 0
  const a = 5
  test('delante del frente de la ola rige la época de partida; detrás, la de llegada', () => {
    expect(epocaAqui({ de, a, ola: 1000, ancho: 200 }, 3000)).toBe(0)
    expect(epocaAqui({ de, a, ola: 1000, ancho: 200 }, 100)).toBe(5)
    const medio = epocaAqui({ de, a, ola: 1000, ancho: 200 }, 900)
    expect(medio).toBeGreaterThan(0)
    expect(medio).toBeLessThan(5)
  })

  test('en reposo es exacta en todas partes, aun lejos de la plaza', () => {
    expect(epocaAqui({ de: 0, a: 0, ola: 0, ancho: 200 }, 6000)).toBe(0)
  })
})

describe('vivo', () => {
  test('en una época entera coincide con visibleEn', () => {
    for (const [nace, muere] of [[0, 0], [2, 0], [0, 3], [1, 4]]) {
      for (let e = 0; e <= 5; e++) expect(vivo(nace, muere, e)).toBe(visibleEn(nace, muere, e) ? 1 : 0)
    }
  })
})

describe('desdeCuando', () => {
  test('decodifica "desde cuándo" (con E etapas: la primera vale 1, la última 1/E, nunca 0)', () => {
    expect(desdeCuando(1, 6)).toBe(0)
    expect(desdeCuando(1 / 6, 6)).toBe(5)
    expect(desdeCuando(0, 6)).toBe(Infinity)
    expect(desdeCuando(4 / 6, 6)).toBe(2)
  })
})
