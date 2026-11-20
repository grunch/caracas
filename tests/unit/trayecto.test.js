import { describe, test, expect } from 'vitest'
import { curvaSuave, vistaEnTrayecto } from '../../src/trayecto.js'

describe('curvaSuave', () => {
  test('arranca y llega quieta: 0 en 0, 1 en 1, ½ en la mitad', () => {
    expect(curvaSuave(0)).toBe(0)
    expect(curvaSuave(1)).toBe(1)
    expect(curvaSuave(0.5)).toBeCloseTo(0.5)
  })

  test('lenta en las puntas, rápida en el medio', () => {
    expect(curvaSuave(0.1)).toBeLessThan(0.1)
    expect(curvaSuave(0.9)).toBeGreaterThan(0.9)
  })

  test('fuera de [0, 1] se queda en las puntas', () => {
    expect(curvaSuave(-1)).toBe(0)
    expect(curvaSuave(2)).toBe(1)
  })
})

describe('vistaEnTrayecto', () => {
  const desde = { x: 0, z: 0, dist: 8000, yaw: 0, pitch: 1.5 }
  const hasta = { x: 100, z: -200, dist: 1000, yaw: -0.4, pitch: 0.5 }

  test('en las puntas es el origen y el destino', () => {
    expect(vistaEnTrayecto(desde, hasta, 0)).toEqual(desde)
    const fin = vistaEnTrayecto(desde, hasta, 1)
    for (const c of Object.keys(hasta)) expect(fin[c]).toBeCloseTo(hasta[c])
  })

  test('la distancia va en escala logarítmica: a mitad de camino, la media geométrica', () => {
    // Act
    const medio = vistaEnTrayecto(desde, hasta, 0.5)
    // Assert
    expect(medio.dist).toBeCloseTo(Math.sqrt(8000 * 1000))
    expect(medio.x).toBeCloseTo(50)
    expect(medio.pitch).toBeCloseTo(1)
  })

  test('el giro va por el lado corto', () => {
    const v = vistaEnTrayecto({ ...desde, yaw: 3 }, { ...hasta, yaw: -3 }, 0.5)
    expect(Math.abs(Math.abs(v.yaw) - Math.PI)).toBeLessThan(0.01)
  })

  test('no toca las vistas de entrada', () => {
    const copia = { ...desde }
    vistaEnTrayecto(desde, hasta, 0.3)
    expect(desde).toEqual(copia)
  })
})
