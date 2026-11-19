import { describe, test, expect } from 'vitest'
import { pasoEnAvion, entradaDeVuelo, despegue, camaraDetras, ALTURA, VELOCIDAD } from '../../src/volar.js'

const hoja = { x0: -1000, z0: -1000, ancho: 2000, alto: 2000 }
const llano = () => 0

describe('pasoEnAvion', () => {
  const avion = { x: 0, y: 300, z: 0, rumbo: 0, alabeo: 0 }

  test('sin tocar nada vuela derecho hacia donde apunta (rumbo 0: hacia −z), a velocidad de crucero', () => {
    const e = pasoEnAvion(avion, { girar: 0, subir: 0 }, 1, { suelo: llano, hoja })
    expect(e.z).toBeCloseTo(-VELOCIDAD.crucero)
    expect(e.x).toBeCloseTo(0)
    expect(e.y).toBe(300)
  })

  test('Mayús acelera; girar cambia el rumbo y lo inclina hacia ese lado', () => {
    const rapido = pasoEnAvion(avion, { girar: 0, subir: 0, acelera: true }, 1, { suelo: llano, hoja })
    expect(rapido.z).toBeCloseTo(-VELOCIDAD.rapido)
    const giro = pasoEnAvion(avion, { girar: 1, subir: 0 }, 0.5, { suelo: llano, hoja })
    expect(giro.rumbo).toBeGreaterThan(0)
    expect(giro.alabeo).toBeGreaterThan(0)
  })

  test('sube y baja, pero nunca por debajo de la altura mínima sobre el suelo ni por encima del techo', () => {
    const baja = pasoEnAvion({ ...avion, y: 60 }, { girar: 0, subir: -1 }, 10, { suelo: () => 40, hoja })
    expect(baja.y).toBe(40 + ALTURA.minima)
    const sube = pasoEnAvion(avion, { girar: 0, subir: 1 }, 1000, { suelo: llano, hoja })
    expect(sube.y).toBe(ALTURA.techo)
  })

  test('al llegar al borde de la hoja no se va: queda dentro', () => {
    const e = pasoEnAvion({ ...avion, z: -995 }, { girar: 0, subir: 0 }, 1, { suelo: llano, hoja })
    expect(e.z).toBeGreaterThanOrEqual(hoja.z0)
  })

  test('no toca el estado de entrada', () => {
    const e = { ...avion }
    pasoEnAvion(e, { girar: 1, subir: 1 }, 1, { suelo: llano, hoja })
    expect(e).toEqual(avion)
  })
})

describe('entradaDeVuelo', () => {
  test('A/D o ←/→ giran, W/S o ↑/↓ suben y bajan, Mayús acelera', () => {
    expect(entradaDeVuelo(new Set(['KeyD', 'ArrowUp']))).toEqual({ girar: 1, subir: 1, acelera: false })
    expect(entradaDeVuelo(new Set(['ArrowLeft', 'KeyS', 'ShiftRight']))).toEqual({ girar: -1, subir: -1, acelera: true })
  })
})

describe('despegue', () => {
  test('arranca sobre donde mira la vista (o sobre la plaza si está lejos), a 300 m del suelo, mirando como el mapa', () => {
    expect(despegue({ x: 100, z: 50, dist: 800, yaw: 0.5 }, () => 20)).toEqual({ x: 100, y: 320, z: 50, rumbo: -0.5, alabeo: 0 })
    expect(despegue({ x: 9000, z: 9000, dist: 6000, yaw: 0 }, llano)).toMatchObject({ x: 0, z: 0 })
  })
})

describe('camaraDetras', () => {
  test('la cámara va detrás y arriba del avión, mirándolo', () => {
    const { ojo, mira } = camaraDetras({ x: 0, y: 300, z: 0, rumbo: 0 })
    expect(ojo.z).toBeGreaterThan(0) // detrás: el avión va hacia −z
    expect(ojo.y).toBeGreaterThan(300)
    expect(mira).toMatchObject({ x: 0, z: 0 })
  })
})
