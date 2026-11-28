import { describe, it, expect } from 'vitest'
import { distanciaEn, anchoLibre, muestrasDeTramo, medirVia, tramosDeVia, ANCHO_SOSPECHOSO_M } from '../../tools/red-vial-corredor-lib.mjs'

/**
 * Un campo de prueba de 100 × 100 px del plano (50 × 50 m), a 1 texel por px: dos manzanas a los lados de una calle
 * que corre de norte a sur por x = 50, con `ancho_px` de fachada a fachada. Un solo canal, el año 1936.
 */
function campo(ancho_px, { desdeY = 0 } = {}) {
  const ancho = 100, alto = 100, datos = new Uint8Array(ancho * alto)
  const DIST_MAX_M = 16
  for (let j = 0; j < alto; j++) {
    for (let i = 0; i < ancho; i++) {
      const alBorde_m = (Math.abs(i + 0.5 - 50) - ancho_px / 2) * 0.5 // > 0 adentro de la manzana
      const d = j < desdeY ? -DIST_MAX_M : Math.max(-DIST_MAX_M, Math.min(DIST_MAX_M, alBorde_m))
      datos[j * ancho + i] = Math.round(128 + (d / DIST_MAX_M) * 127)
    }
  }
  return { meta: { caja: [0, 0, 100, 100], dist_max_m: DIST_MAX_M, canales: [1936] }, ancho, alto, canales: 1, datos }
}
const OPC = { max_m: 15 }

describe('distancia firmada a las manzanas de una época', () => {
  it('es negativa en la calle y positiva adentro de la manzana', () => {
    const c = campo(20)
    expect(distanciaEn(c, 1936, 50, 50)).toBeLessThan(0)
    expect(distanciaEn(c, 1936, 80, 50)).toBeGreaterThan(0)
  })

  it('es null fuera de la caja del campo o para una época que el campo no trae', () => {
    const c = campo(20)
    expect(distanciaEn(c, 1936, -1, 50)).toBeNull()
    expect(distanciaEn(c, 1936, 50, 101)).toBeNull()
    expect(distanciaEn(c, 1772, 50, 50)).toBeNull()
  })
})

describe('ancho libre de fachada a fachada', () => {
  it('mide una calle de 10 m con el error del texel', () => {
    const r = anchoLibre(campo(20), 1936, [50, 50], [1, 0], OPC)
    expect(r.estado).toBe('corredor')
    expect(Math.abs(r.ancho_m - 10)).toBeLessThanOrEqual(2)
  })

  it('dice «dentro» si el eje cae en una manzana: ahí no hay calle que medir', () => {
    expect(anchoLibre(campo(20), 1936, [80, 50], [1, 0], OPC)).toEqual({ estado: 'dentro' })
  })

  it('dice «abierto» si de algún lado no hay manzana a la vista', () => {
    expect(anchoLibre(campo(20, { desdeY: 60 }), 1936, [50, 30], [1, 0], OPC).estado).toBe('abierto')
  })

  it('es null donde el campo no llega', () => {
    expect(anchoLibre(campo(20), 1936, [500, 500], [1, 0], OPC)).toBeNull()
  })
})

describe('muestras a lo largo de un tramo de calles.bin', () => {
  it('reparte los puntos a lo largo del tramo, centrados en su medio, sin tocar el tramo', () => {
    const t = Object.freeze({ x: 50, y: 50, dx: 0, dy: 1, largo: 40, nombre: 'Avenida Nueva' }) // 40 m = 80 px
    const ms = muestrasDeTramo(t, 10)
    expect(ms).toHaveLength(4)
    expect(ms.map((p) => p[0])).toEqual([50, 50, 50, 50])
    expect(ms.map((p) => p[1])).toEqual([20, 40, 60, 80])
  })

  it('un tramo más corto que el paso da una muestra, en su medio', () => {
    expect(muestrasDeTramo({ x: 7, y: 9, dx: 1, dy: 0, largo: 3 }, 10)).toEqual([[7, 9]])
  })
})

describe('medir una vía de hoy contra las manzanas de una época', () => {
  const via = (x) => [{ x, y: 50, dx: 0, dy: 1, largo: 40, nombre: 'Avenida Nueva' }]

  it('una avenida de hoy sobre una calle vieja mide el ancho de la calle vieja', () => {
    const m = medirVia(via(50), campo(20), 1936, OPC)
    expect(m).toMatchObject({ muestras: 4, dentro_pct: 0, abierto_pct: 0, corredor_pct: 100 })
    expect(Math.abs(m.ancho_mediana_m - 10)).toBeLessThanOrEqual(2)
    expect(m.sospechosos).toEqual([])
  })

  it('una calzada de hoy corrida sobre lo que era manzana cae «dentro»: la sección moderna no se proyectó', () => {
    const m = medirVia(via(70), campo(20), 1936, OPC)
    expect(m).toMatchObject({ muestras: 4, dentro_pct: 100, corredor_pct: 0, ancho_mediana_m: null })
  })

  it('un corredor tan ancho como una avenida moderna, antes de que abriera, queda como sospechoso con su posición', () => {
    const ancho_px = (ANCHO_SOSPECHOSO_M + 6) * 2
    const m = medirVia(via(50), campo(ancho_px), 1936, { max_m: 20 })
    expect(m.corredor_pct).toBe(100)
    expect(m.sospechosos).toHaveLength(1)
    expect(m.sospechosos[0]).toMatchObject({ nombre: 'Avenida Nueva', x: 50, y: 50, largo_m: 40 })
    expect(m.sospechosos[0].ancho_mediana_m).toBeGreaterThanOrEqual(ANCHO_SOSPECHOSO_M)
  })

  it('fuera del campo no hay muestras ni porcentajes', () => {
    const m = medirVia([{ x: 900, y: 900, dx: 0, dy: 1, largo: 40, nombre: 'Lejos' }], campo(20), 1936, OPC)
    expect(m).toMatchObject({ muestras: 0, fuera: 4, dentro_pct: null, corredor_pct: null, ancho_mediana_m: null })
  })
})

describe('qué tramos de hoy son de una vía del catálogo', () => {
  const tramos = [{ nombre: 'Avenida Urdaneta' }, { nombre: 'Plaza Rafael Urdaneta' }, { nombre: 'Avenida Principal de Lomas de Urdaneta' }, { nombre: 'Avenida Rafael Baralt' }]

  it('compara el nombre entero, no un pedazo', () => {
    expect(tramosDeVia(tramos, ['Avenida Urdaneta'])).toEqual([{ nombre: 'Avenida Urdaneta' }])
    expect(tramosDeVia(tramos, ['Avenida Baralt', 'Avenida Rafael Baralt'])).toEqual([{ nombre: 'Avenida Rafael Baralt' }])
    expect(tramosDeVia(tramos, [])).toEqual([])
  })
})
