import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { wgs84AUtm, crearGeo, elegirLugar } from '../../src/buscador/geo.js'

const { transformacion, puntos } = JSON.parse(readFileSync(new URL('../../tools/geo/gcp/1936-wgs84.json', import.meta.url), 'utf8'))
const PLANO = { metro: 0.5, origen_m: [-2900, 3700], ancho: 18600, alto: 14800, marco: [300, 400, 18300, 14400] }

// valores de tools/geo/geo1936.py (wgs84_a_utm y wgs84_a_grid + grid_a_px con la transformación guardada)
const DE_PYTHON = [
  // lat, lon, E, N, px, py
  [10.5059993, -66.9146252, 728232.6322575166, 1162116.0015967751, 8971.500136010422, 6839.20849039018],
  [10.5131506, -66.9125613, 728453.3484217816, 1162908.693761527, 9420.644849137276, 5257.054703565197],
  [10.4902737, -66.9241915, 727196.7123319736, 1160369.259335082, 6883.362484567194, 10320.033433212493],
  [10.5168325, -66.9457029, 724822.127972149, 1163292.096336412, 2166.6742099635194, 4454.124189027532],
  [10.48, -66.85, 735328.2412276204, 1159287.1464050144, 23125.198624181558, 12564.872715051659],
  [10.53, -66.99, 719963.0291176206, 1164717.4210664246, -7530.991095149799, 1556.2905862872876],
  [10.4806, -66.9036, 729458.5176733914, 1159313.9487495166, 11393.464947602362, 12452.120906152963],
]

describe('wgs84AUtm', () => {
  test('da lo mismo que geo1936.py (UTM 19N), al milímetro', () => {
    for (const [lat, lon, e, n] of DE_PYTHON) {
      const [este, norte] = wgs84AUtm(lat, lon)
      expect(Math.abs(este - e)).toBeLessThan(1e-3)
      expect(Math.abs(norte - n)).toBeLessThan(1e-3)
    }
  })
})

describe('crearGeo', () => {
  const geo = crearGeo({ transformacion, plano: PLANO })

  test('lat/lon → píxel del plano, igual que geo1936.py', () => {
    for (const [lat, lon, , , px, py] of DE_PYTHON) {
      const p = geo.aPixel(lat, lon)
      expect(Math.abs(p[0] - px)).toBeLessThan(0.01)
      expect(Math.abs(p[1] - py)).toBeLessThan(0.01)
    }
  })

  test('los puntos de control caen a pocos metros de donde se midieron', () => {
    for (const p of puntos) {
      const [px, py] = geo.aPixel(p.lat, p.lon)
      expect(Math.hypot(px - p.px, py - p.py) * PLANO.metro, p.nombre).toBeLessThan(10)
    }
  })

  test('sin transformación válida avisa al crear, no al buscar', () => {
    expect(() => crearGeo({ transformacion: null, plano: PLANO })).toThrow(/transformación/)
    expect(() => crearGeo({ transformacion: { ...transformacion, matriz: [[0, 0], [0, 0]] }, plano: PLANO })).toThrow(/transformación/)
    expect(() => crearGeo({ transformacion, plano: { ...PLANO, metro: 0 } })).toThrow(/plano/)
  })

  test('coordenadas que no son números finitos dan null', () => {
    expect(geo.aPixel(NaN, -66.9)).toBeNull()
    expect(geo.aPixel(10.5, Infinity)).toBeNull()
    expect(geo.aPixel('10.5', -66.9)).toBeNull()
    expect(geo.aPixel(95, -66.9)).toBeNull()
  })
})

describe('dentro del plano y elegirLugar', () => {
  const geo = crearGeo({ transformacion, plano: PLANO })
  const PLAZA = { nombre: 'Plaza Bolívar', lat: 10.5059993, lon: -66.9146252 }
  const PETARE = { nombre: 'Petare', lat: 10.4767, lon: -66.8078 }

  test('dentro es dentro del marco dibujado, no de la hoja entera', () => {
    expect(geo.dentro([8968, 6839])).toBe(true)
    expect(geo.dentro([300, 400])).toBe(true)
    expect(geo.dentro([100, 6839])).toBe(false)
    expect(geo.dentro([8968, 14500])).toBe(false)
    expect(geo.dentro(null)).toBe(false)
    const sinMarco = crearGeo({ transformacion, plano: { ...PLANO, marco: undefined } })
    expect(sinMarco.dentro([100, 6839])).toBe(true)
    expect(sinMarco.dentro([-1, 6839])).toBe(false)
  })

  test('se elige el primer lugar que cae dentro del plano', () => {
    const r = elegirLugar([PETARE, PLAZA, { ...PLAZA, nombre: 'Otra' }], geo)
    expect(r).toMatchObject({ tipo: 'moderna', nombre: 'Plaza Bolívar', dentro: true })
    expect(Math.hypot(r.px[0] - 8968, r.px[1] - 6839)).toBeLessThan(10)
  })

  test('si ninguno cae dentro, el primero, marcado como de afuera; sin lugares, null', () => {
    expect(elegirLugar([PETARE], geo)).toMatchObject({ nombre: 'Petare', dentro: false })
    expect(elegirLugar([{ nombre: 'Rota', lat: NaN, lon: 0 }], geo)).toEqual({ tipo: 'moderna', nombre: 'Rota', px: null, dentro: false })
    expect(elegirLugar([], geo)).toBeNull()
  })
})
