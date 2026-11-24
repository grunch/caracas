import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  percentil, mediana, resumirPedidos, resumirTareas, valoresDelPresupuesto, compararConPresupuesto, informeDelPresupuesto,
  tamanosDelBuild, compararBuild,
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

describe('el presupuesto del build', () => {
  const html = '<link rel="modulepreload" crossorigin href="./assets/comun-B1.js"><script type="module" crossorigin src="./assets/main-A1.js"></script>'
  const archivos = [
    { ruta: 'assets/main-A1.js', gzip: 170 * 1024 }, { ruta: 'assets/comun-B1.js', gzip: 130 * 1024 },
    { ruta: 'assets/ciudad-trabajador-C1.js', gzip: 40 * 1024 }, { ruta: 'assets/hitos-trabajador-D1.js', gzip: 95 * 1024 },
    { ruta: 'assets/esquinas-E1.js', gzip: 8 * 1024 }, { ruta: 'sw.js', gzip: 1280 },
  ]
  it('suma lo que index.html carga o precarga, los workers y el service worker; lo que se pide después no cuenta al abrir', () => {
    expect(tamanosDelBuild(archivos, html)).toEqual({ jsAlAbrirKB: 300, trabajadoresKB: 135, servicioKB: 1.3 })
  })
  it('compara con los topes; un tope sin medida no pasa', () => {
    expect(compararBuild({ jsAlAbrirKB: 300, trabajadoresKB: 160 }, { jsAlAbrirKB: 330, trabajadoresKB: 150, servicioKB: 3 })).toEqual([
      { clave: 'jsAlAbrirKB', valor: 300, tope: 330, pasa: true },
      { clave: 'trabajadoresKB', valor: 160, tope: 150, pasa: false },
      { clave: 'servicioKB', valor: null, tope: 3, pasa: false },
    ])
  })
  it('los topes del repo son de claves que el build mide', () => {
    const real = JSON.parse(readFileSync('tools/rendimiento/presupuesto.json', 'utf8'))
    expect(Object.keys(real.build.topes).sort()).toEqual(Object.keys(tamanosDelBuild([], '')).sort())
  })
})
