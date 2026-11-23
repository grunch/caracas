import { describe, test, expect } from 'vitest'
import {
  VEHICULOS, vehiculoDeEpoca, otroVehiculo, pasoEnCoche, entradaDeManejo, camaraDeCoche, sonidoDe, chocaVehiculo,
} from '../../src/manejar.js'
import { choca, rejillaDeCasas } from '../../src/a-pie.js'

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

  test('S frena hasta 0 y retrocede solo en lo que resta del paso, no con el freno de todo el intervalo', () => {
    // Arrange: el Ford T a 0,1 m/s; frena a 4 m/s² → se detiene en 0,025 s
    const casiQuieto = { ...quieto, velocidad: 0.1 }
    // Act
    const e = pasoEnCoche(casiQuieto, { acelera: -1, girar: 0 }, 1, ford, libre)
    // Assert: 0,975 s de marcha atrás a 2 m/s²
    expect(e.velocidad).toBeCloseTo(-1.95)
  })

  test('S sin llegar a 0 solo frena; detenido, retrocede con su aceleración', () => {
    expect(pasoEnCoche({ ...quieto, velocidad: 5 }, { acelera: -1, girar: 0 }, 0.5, ford, libre).velocidad).toBeCloseTo(3)
    expect(pasoEnCoche(quieto, { acelera: -1, girar: 0 }, 0.5, ford, libre).velocidad).toBeCloseTo(-1)
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

describe('chocaVehiculo: la huella del vehículo con sus medidas y su rumbo', () => {
  // una casa de 10 × 10 m entre x, z = 0 y 10; la calle, del lado de z < 0
  const casa = { vertices: Float32Array.from([0, 0, 10, 0, 10, 10, 0, 10]), techos: Uint32Array.from([0, 4, 0, 0]) }
  const rejilla = rejillaDeCasas(casa, 99, (x, y) => ({ x, z: y }))
  const v8 = VEHICULOS.find((v) => v.id === 'ford-v8')
  const chocaV8 = chocaVehiculo(v8, (x, z, radio) => choca(rejilla, x, z, radio))

  test('el Ford V8 (4,3 m) con el centro a 1,5 m de la casa y de punta hacia ella choca: la cola entraría', () => {
    expect(chocaV8(5, -1.5, 0)).toBe(true)
    expect(chocaV8(5, -1.5, Math.PI)).toBe(true)
  })

  test('de costado a la misma distancia no choca: sigue pasando por una calle tan ancha como antes', () => {
    expect(chocaV8(5, -1.5, Math.PI / 2)).toBe(false)
  })

  test('lejos de la casa no choca; el centro adentro, sí', () => {
    expect(chocaV8(5, -3, 0)).toBe(false)
    expect(chocaV8(5, 5, 0)).toBe(true)
  })

  test('pasoEnCoche mira la huella con el rumbo del paso: no se mete de cola en la casa', () => {
    // Arrange: el V8 de punta a la calle (rumbo 0: −z), con la cola a 0,35 m de la casa, marcha atrás
    const e0 = { x: 5, z: -2.5, rumbo: 0, velocidad: -3 }
    // Act
    const e = pasoEnCoche(e0, { acelera: -1, girar: 0 }, 1, v8, { choca: chocaV8 })
    // Assert: se detiene sin que la cola (z + 2,15) pase del borde de la casa
    expect(e.velocidad).toBe(0)
    expect(e.z + v8.largo / 2).toBeLessThanOrEqual(0)
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

describe('la velocidad máxima de los vehículos', () => {
  test('ninguno va a menos de 30 km/h, y los de tiro llegan a ella en el mismo tiempo que antes (3,3 s)', () => {
    for (const v of VEHICULOS) expect(v.maxima * 3.6).toBeGreaterThanOrEqual(30 - 1e-9)
    for (const id of ['carreta', 'coche-de-caballos']) {
      const v = VEHICULOS.find((x) => x.id === id)
      expect(v.maxima * 3.6).toBeCloseTo(30)
      expect(v.maxima / v.aceleracion).toBeCloseTo(10 / 3)
    }
    expect(VEHICULOS.find((x) => x.id === 'ford-t').maxima).toBe(12)
    expect(VEHICULOS.find((x) => x.id === 'ford-v8').maxima).toBe(20)
  })
})
