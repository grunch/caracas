import { describe, test, expect } from 'vitest'
import { visibleEn, epocaAqui, vivo, desdeCuando, escalaCrece } from '../../src/epocas.js'

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

describe('escalaCrece', () => {
  test('la hoja ocupa la parte de crece.png que le corresponde (la última celda sobra)', () => {
    // 18600 × 14800 px a 0,5 m/px = 9300 × 7400 m; celdas de 8 m: 1163 × 925 celdas (9304 × 7400 m)
    const [ex, ey] = escalaCrece({ ancho: 18600, alto: 14800, metro: 0.5 }, { cols: 1163, rows: 925 }, 8)
    expect(ex).toBeCloseTo(9300 / 9304, 6)
    expect(ey).toBeCloseTo(1, 6)
  })
})

import { crearSecuencia, SIN_LINEA_DE_TIEMPO } from '../../src/epocas.js'

describe('crearSecuencia', () => {
  test('una época elegida durante una ola espera a que termine (sin saltos en lo lejano)', () => {
    const olas = []
    const s = crearSecuencia((de, a) => olas.push([de, a]))
    s.elegir(5) // 0 → 5
    s.elegir(1) // en curso: queda en espera
    expect(olas).toEqual([[0, 5]])
    s.termino()
    expect(olas).toEqual([[0, 5], [5, 1]])
    s.termino()
    s.termino() // sin espera: no hace nada
    expect(olas).toHaveLength(2)
  })

  test('de varias elecciones durante una ola, solo cuenta la última', () => {
    const olas = []
    const s = crearSecuencia((de, a) => olas.push([de, a]))
    s.elegir(5)
    s.elegir(1)
    s.elegir(3)
    s.termino()
    expect(olas).toEqual([[0, 5], [5, 3]])
  })

  test('elegir la época que ya rige no lanza otra ola', () => {
    const olas = []
    const s = crearSecuencia((de, a) => olas.push([de, a]))
    s.elegir(0)
    expect(olas).toEqual([])
  })
})

describe('sin línea de tiempo', () => {
  test('la época de reserva muestra la ciudad final: todo lo nacido, nada de lo que murió', () => {
    expect(vivo(5, 0, SIN_LINEA_DE_TIEMPO)).toBe(1)
    expect(vivo(0, 0, SIN_LINEA_DE_TIEMPO)).toBe(1)
    expect(vivo(0, 4, SIN_LINEA_DE_TIEMPO)).toBe(0)
  })
})

import { acotarEpoca, PRIMERA_EPOCA } from '../../src/epocas.js'

describe('la primera época visible', () => {
  test('la línea de tiempo arranca en 1772: 1578 (época 0) no se muestra', () => {
    expect(PRIMERA_EPOCA).toBe(1)
  })

  test('acotarEpoca no deja elegir antes de la primera visible ni después de la última', () => {
    expect(acotarEpoca(0, 1, 6)).toBe(1)
    expect(acotarEpoca(3, 1, 6)).toBe(3)
    expect(acotarEpoca(9, 1, 6)).toBe(5)
    expect(acotarEpoca(0, 0, 6)).toBe(0)
  })
})

test('una preparación fallida revierte la secuencia y permite reintentar o elegir otra época',()=>{
 const llamadas=[],s=crearSecuencia((de,a)=>llamadas.push([de,a]),5)
 s.elegir(6);s.elegir(4);s.cancelar(5)
 expect(s.rige).toBe(5)
 s.elegir(6);expect(llamadas).toEqual([[5,6],[5,6]])
 s.termino();expect(s.rige).toBe(6)
})
