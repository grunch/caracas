import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  percentil, mediana, resumirPedidos, resumirTareas, valoresDelPresupuesto, compararConPresupuesto, informeDelPresupuesto,
} from '../../tools/rendimiento/rendimiento-lib.mjs'

describe('percentil y mediana', () => {
  it('ordenan la muestra sin tocarla', () => {
    const muestra = [9, 1, 5, 3, 7]
    expect(mediana(muestra)).toBe(5)
    expect(percentil(muestra, 0.9)).toBe(9)
    expect(percentil(muestra, 0)).toBe(1)
    expect(muestra).toEqual([9, 1, 5, 3, 7])
  })
  it('sin muestra no hay valor', () => {
    expect(mediana([])).toBe(null)
  })
})

describe('resumirPedidos', () => {
  const pedidos = [
    { url: 'http://x/plano/medio.webp', bytes: 300 },
    { url: 'http://x/datos/ciudad.pak', bytes: 200 },
    { url: 'http://x/a.js', bytes: 50 },
    { url: 'http://x/colgado' }, // no terminó: no cuenta
  ]
  it('cuenta los terminados, suma sus bytes y pone primero los más pesados, sin la raíz', () => {
    expect(resumirPedidos(pedidos, 'http://x/', 2)).toEqual({
      cuantos: 3, bytes: 550, mayores: [{ url: 'plano/medio.webp', bytes: 300 }, { url: 'datos/ciudad.pak', bytes: 200 }],
    })
  })
  it('deja entera la URL que no empieza con la raíz', () => {
    expect(resumirPedidos([{ url: 'https://otro/a', bytes: 1 }], 'http://x/').mayores[0].url).toBe('https://otro/a')
  })
})

describe('resumirTareas', () => {
  it('cuenta, suma y da la mayor', () => {
    expect(resumirTareas([[100, 1800], [3200, 8700], [12500, 1300]])).toEqual({ cuantas: 3, sumaMs: 11800, mayorMs: 8700 })
  })
  it('sin tareas largas, todo en cero', () => {
    expect(resumirTareas([])).toEqual({ cuantas: 0, sumaMs: 0, mayorMs: 0 })
  })
})

describe('el presupuesto', () => {
  const presupuesto = { topes: { casasMs: 5000, tareaMasLargaMs: 200, msPorCuadroCentro: 16.6 } }
  const medicion = { hitos: { casas: 12500 }, tareas: { mayorMs: 150 }, pedidos: { bytes: 23e6 }, memoria: { heapMB: 600 } }

  it('saca de la medición los valores que mira; lo no medido queda en null', () => {
    expect(valoresDelPresupuesto(medicion)).toEqual({
      casasMs: 12500, tareaMasLargaMs: 150, bytesAlAbrir: 23e6, heapMB: 600, triangulosCentro: null, msPorCuadroCentro: null,
    })
    expect(valoresDelPresupuesto({ cuadro: { centro: { triangulos: 6.5e6, medianaMs: 10.4 } } })).toMatchObject({ triangulosCentro: 6.5e6, msPorCuadroCentro: 10.4 })
  })
  it('compara cada tope: pasa, no pasa o sin medir', () => {
    expect(compararConPresupuesto(medicion, presupuesto)).toEqual([
      { clave: 'casasMs', valor: 12500, tope: 5000, pasa: false },
      { clave: 'tareaMasLargaMs', valor: 150, tope: 200, pasa: true },
      { clave: 'msPorCuadroCentro', valor: null, tope: 16.6, pasa: null },
    ])
  })
  it('el informe dice una línea por tope', () => {
    expect(informeDelPresupuesto(compararConPresupuesto(medicion, presupuesto))).toBe(
      'casasMs: 12500 (tope 5000) · NO PASA\ntareaMasLargaMs: 150 (tope 200) · pasa\nmsPorCuadroCentro: — (tope 16.6) · sin medir')
  })
  it('el presupuesto del repo solo tiene topes que la medición conoce', () => {
    const real = JSON.parse(readFileSync('tools/rendimiento/presupuesto.json', 'utf8'))
    expect(Object.keys(real.topes).sort()).toEqual(Object.keys(valoresDelPresupuesto({})).sort())
    for (const tope of Object.values(real.topes)) expect(tope).toBeGreaterThan(0)
  })
})
