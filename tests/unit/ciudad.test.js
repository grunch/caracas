import { describe, test, expect } from 'vitest'
import { extruirTechos, ALTO_PISO, empacarTecho, desempacarTecho } from '../../src/ciudad.js'

// un cuadrado de 10×10 px y un triángulo; metro = 0.5 → 5×5 m
const vertices = new Float32Array([0, 0, 10, 0, 10, 10, 0, 10, 20, 0, 30, 0, 25, 8])
const techos = new Uint32Array([
  0, 4, empacarTecho({ pisos: 2, estilo: 1 }), 123,
  4, 3, empacarTecho({ pisos: 1, estilo: 0 }), 456,
])
const coords = { aMundo: (px, py) => ({ x: px * 0.5, z: py * 0.5 }) }

describe('empacarTecho', () => {
  test('ida y vuelta de pisos y estilo', () => {
    expect(desempacarTecho(empacarTecho({ pisos: 9, estilo: 8 }))).toEqual({ pisos: 9, estilo: 8 })
  })
})

describe('extruirTechos', () => {
  const g = extruirTechos({ vertices, techos }, coords)

  test('techo triangulado + una pared (2 triángulos) por lado', () => {
    // cuadrado: 2 triángulos de techo + 4 lados·2 · triángulo: 1 + 3·2 → 17 triángulos
    expect(g.indices.length / 3).toBe(17)
  })

  test('la altura del techo es pisos × ALTO_PISO, el pie en el suelo', () => {
    const ys = new Set()
    for (let k = 1; k < g.posiciones.length; k += 3) ys.add(+g.posiciones[k].toFixed(3))
    expect([...ys].sort((a, b) => a - b)).toEqual([0, ALTO_PISO, 2 * ALTO_PISO].map((v) => +v.toFixed(3)))
  })

  test('aInfo lleva la distancia a la plaza, la semilla y el estilo', () => {
    // vértice 0 del primer techo está en (0,0): distancia al centroide del techo = (2.5,2.5)
    expect(g.info[0]).toBeCloseTo(Math.hypot(2.5, 2.5), 3)
    expect(g.info[1]).toBe(123)
    expect(g.info[2]).toBe(1)
  })

  test('las normales de las paredes miran hacia afuera', () => {
    const p = g.posiciones
    const n = g.normales
    // toda normal horizontal apunta en sentido contrario al centroide de su techo (aprox.)
    let malas = 0
    for (let v = 0; v < p.length / 3; v++) {
      if (Math.abs(n[v * 3 + 1]) > 0.5) continue
      const cx = p[v * 3] < 7 ? 2.5 : 12.5
      const cz = p[v * 3] < 7 ? 2.5 : 1.33
      if ((p[v * 3] - cx) * n[v * 3] + (p[v * 3 + 2] - cz) * n[v * 3 + 2] < 0) malas++
    }
    expect(malas).toBe(0)
  })

  test('acepta polígonos en ambos sentidos de giro', () => {
    const inverso = new Float32Array([0, 10, 10, 10, 10, 0, 0, 0])
    const t = new Uint32Array([0, 4, empacarTecho({ pisos: 1, estilo: 0 }), 1])
    expect(extruirTechos({ vertices: inverso, techos: t }, coords).indices.length / 3).toBe(10)
  })
})
