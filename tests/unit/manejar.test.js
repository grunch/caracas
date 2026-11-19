import { describe, test, expect } from 'vitest'
import {
  VEHICULOS, vehiculoDeEpoca, otroVehiculo, pasoEnCoche, entradaDeManejo, camaraDeCoche, sonidoDe,
} from '../../src/manejar.js'

describe('la flota', () => {
  test('cada vehículo tiene nombre, desde qué época, velocidad máxima, tracción y sonido', () => {
    for (const v of VEHICULOS) {
      expect(v.nombre && v.id, v.id).toBeTruthy()
      expect(Number.isInteger(v.desde)).toBe(true)
      expect(v.maxima).toBeGreaterThan(0)
      expect(['animal', 'motor']).toContain(v.traccion)
    }
    expect(VEHICULOS.map((v) => v.desde)).toEqual([...VEHICULOS.map((v) => v.desde)].sort((a, b) => a - b))
  })

  test('el vehículo de cada época es el más nuevo que ya existía; sin línea de tiempo, el de 1936', () => {
    expect(vehiculoDeEpoca(1).id).toBe('carreta')
    expect(vehiculoDeEpoca(2).id).toBe('coche-de-caballos')
    expect(vehiculoDeEpoca(4).id).toBe('ford-t')
    expect(vehiculoDeEpoca(5).id).toBe('ford-v8')
    expect(vehiculoDeEpoca(99).id).toBe('ford-v8')
  })

  test('«otro coche» recorre los que ya existían en la época, y vuelve al primero', () => {
    expect(otroVehiculo('carreta', 1).id).toBe('carreta')
    expect(otroVehiculo('coche-de-caballos', 4).id).toBe('ford-t')
    expect(otroVehiculo('ford-t', 4).id).toBe('carreta')
  })
})

describe('pasoEnCoche', () => {
  const ford = VEHICULOS.find((v) => v.id === 'ford-t')
  const quieto = { x: 0, z: 0, rumbo: 0, velocidad: 0 }
  const libre = { choca: () => false }

  test('acelerar suma velocidad hasta la máxima del vehículo y avanza hacia el rumbo (0: −z)', () => {
    let e = quieto
    for (let i = 0; i < 300; i++) e = pasoEnCoche(e, { acelera: 1, girar: 0 }, 0.1, ford, libre)
    expect(e.velocidad).toBeCloseTo(ford.maxima)
    expect(e.z).toBeLessThan(0)
    expect(e.x).toBeCloseTo(0)
  })

  test('sin acelerar se frena solo; S frena y después va marcha atrás, más despacio', () => {
    const andando = { ...quieto, velocidad: 5 }
    expect(pasoEnCoche(andando, { acelera: 0, girar: 0 }, 1, ford, libre).velocidad).toBeLessThan(5)
    let e = quieto
    for (let i = 0; i < 300; i++) e = pasoEnCoche(e, { acelera: -1, girar: 0 }, 0.1, ford, libre)
    expect(e.velocidad).toBeLessThan(0)
    expect(-e.velocidad).toBeLessThan(ford.maxima / 2)
  })

  test('gira solo si se mueve, y marcha atrás gira al revés', () => {
    expect(pasoEnCoche(quieto, { acelera: 0, girar: 1 }, 1, ford, libre).rumbo).toBe(0)
    expect(pasoEnCoche({ ...quieto, velocidad: 5 }, { acelera: 0, girar: 1 }, 0.1, ford, libre).rumbo).toBeGreaterThan(0)
    expect(pasoEnCoche({ ...quieto, velocidad: -3 }, { acelera: 0, girar: 1 }, 0.1, ford, libre).rumbo).toBeLessThan(0)
  })

  test('contra una casa se detiene', () => {
    const e = pasoEnCoche({ ...quieto, velocidad: 8 }, { acelera: 1, girar: 0 }, 0.5, ford, { choca: () => true })
    expect(e.velocidad).toBe(0)
    expect(e.z).toBe(0)
  })

  test('un paso largo (1 s con render por software) no atraviesa una casa aunque el destino esté libre', () => {
    // Arrange: el Ford V8 a 20 m/s; una casa entre z = −5 y z = −10, el destino (z = −20) libre
    const v8 = VEHICULOS.find((v) => v.id === 'ford-v8')
    const casa = { choca: (x, z) => z < -5 && z > -10 }
    // Act
    const e = pasoEnCoche({ ...quieto, velocidad: 20 }, { acelera: 1, girar: 0 }, 1, v8, casa)
    // Assert: se detiene antes de la casa
    expect(e.velocidad).toBe(0)
    expect(e.z).toBeGreaterThanOrEqual(-5)
  })
})

describe('entradaDeManejo', () => {
  test('W/↑ acelera, S/↓ frena o retrocede, A/D o ←/→ giran', () => {
    expect(entradaDeManejo(new Set(['KeyW', 'KeyD']))).toEqual({ acelera: 1, girar: 1 })
    expect(entradaDeManejo(new Set(['ArrowDown', 'ArrowLeft']))).toEqual({ acelera: -1, girar: -1 })
  })
})

describe('camaraDeCoche', () => {
  test('de afuera va detrás y arriba; desde la cabina, a la altura del conductor mirando adelante', () => {
    const coche = { x: 0, z: 0, rumbo: 0 }
    const afuera = camaraDeCoche(coche, 'afuera', () => 0)
    expect(afuera.ojo.z).toBeGreaterThan(0)
    expect(afuera.ojo.y).toBeGreaterThan(2)
    const cabina = camaraDeCoche(coche, 'cabina', () => 0)
    expect(cabina.ojo.y).toBeLessThan(2.5)
    expect(cabina.mira.z).toBeLessThan(cabina.ojo.z)
  })
})

describe('sonidoDe', () => {
  test('un motor suena más agudo cuanto más rápido va; quieto, en ralentí', () => {
    const ford = VEHICULOS.find((v) => v.id === 'ford-t')
    expect(sonidoDe(ford, 0).frecuencia).toBeGreaterThan(0)
    expect(sonidoDe(ford, ford.maxima).frecuencia).toBeGreaterThan(sonidoDe(ford, 0).frecuencia)
  })

  test('los de tiro: cascos más seguidos cuanto más rápido, y ninguno si está quieto', () => {
    const coche = VEHICULOS.find((v) => v.id === 'coche-de-caballos')
    expect(sonidoDe(coche, 0).cascosPorSegundo).toBe(0)
    expect(sonidoDe(coche, coche.maxima).cascosPorSegundo).toBeGreaterThan(sonidoDe(coche, 1).cascosPorSegundo)
  })
})
