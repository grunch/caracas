import { describe, test, expect } from 'vitest'
import { rejillaComoElVisor } from '../../tools/choca-a-pie-lib.mjs'
import { choca } from '../../src/a-pie.js'
import { HITOS, zonasDeSupresion } from '../../src/hitos.js'

const aMundo = (px, py) => ({ x: px, z: py })

describe('rejillaComoElVisor: la colisión del modo a pie como la arma el visor (revisión de #151)', () => {
  test('una casa genérica dentro de la zona de supresión de un hito no choca: el visor no la levanta', () => {
    const zona = zonasDeSupresion(HITOS).find((z) => z.desde <= 1 && (!z.hasta || z.hasta > 1))
    const anillo = zona.poligono
    const xs = anillo.map((p) => p[0]), ys = anillo.map((p) => p[1])
    const [cx, cy] = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2]
    const casa = [cx - 2, cy - 2, cx + 2, cy - 2, cx + 2, cy + 2, cx - 2, cy + 2]
    const datos = { vertices: Float32Array.from(casa), techos: Uint32Array.from([0, 4, 1, 7]), vida: Uint32Array.from([1]) }
    expect(choca(rejillaComoElVisor(datos, 1, aMundo), cx, cy)).toBe(false)
  })
})
