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

  test('aAncla lleva el centroide (x, z) de la casa en todos sus vértices', () => {
    // el cuadrado ocupa los primeros 4 (techo) + 4·4 (paredes) = 20 vértices
    for (let v = 0; v < 20; v++) expect([g.anclas[v * 2], g.anclas[v * 2 + 1]]).toEqual([2.5, 2.5])
    const ultimo = g.anclas.length / 2 - 1
    expect(g.anclas[ultimo * 2]).toBeCloseTo(12.5, 3)
    expect(g.anclas[ultimo * 2 + 1]).toBeCloseTo(4 / 3, 3)
    expect(g.anclas.length / 2).toBe(g.posiciones.length / 3)
  })

  test('acepta polígonos en ambos sentidos de giro', () => {
    const inverso = new Float32Array([0, 10, 10, 10, 10, 0, 0, 0])
    const t = new Uint32Array([0, 4, empacarTecho({ pisos: 1, estilo: 0 }), 1])
    expect(extruirTechos({ vertices: inverso, techos: t }, coords).indices.length / 3).toBe(10)
  })
})

describe('extruirTechos con vida', () => {
  test('cada vértice lleva [nace, muere] de su techo; sin vida, [0, 0] (siempre visible)', () => {
    const vida = new Uint32Array([2, 0 + 8 * 4]) // techo 0 nace en 2; techo 1 nace en 0 y muere en 4
    const g = extruirTechos({ vertices, techos, vida }, coords)
    const n = g.posiciones.length / 3
    expect(g.vidas.length).toBe(n * 2)
    const pares = new Set()
    for (let v = 0; v < n; v++) pares.add(`${g.vidas[v * 2]},${g.vidas[v * 2 + 1]}`)
    expect([...pares].sort()).toEqual(['0,4', '2,0'])
    const sin = extruirTechos({ vertices, techos }, coords)
    expect(Array.from(new Set(sin.vidas))).toEqual([0])
  })
})

describe('extruirTechos: aPared (dónde está cada punto de la pared)', () => {
  const g = extruirTechos({ vertices, techos }, coords)
  const n = g.posiciones.length / 3
  const esPared = (v) => Math.abs(g.normales[v * 3 + 1]) < 0.5

  test('un par (metros desde la esquina de arranque, largo de la pared) por vértice', () => {
    expect(g.paredes).toBeInstanceOf(Float32Array)
    expect(g.paredes.length).toBe(n * 2)
  })

  test('techos (y todo lo que no es pared) llevan 0, 0', () => {
    for (let v = 0; v < n; v++) {
      if (esPared(v)) continue
      expect([g.paredes[v * 2], g.paredes[v * 2 + 1]]).toEqual([0, 0])
    }
  })

  test('cada pared lleva su largo en metros y u va de 0 a ese largo', () => {
    // el cuadrado mide 5 m por lado; el triángulo: 5 m de base y dos lados de √(2.5² + 4²)
    const largos = new Set()
    for (let v = 0; v < n; v++) if (esPared(v)) largos.add(+g.paredes[v * 2 + 1].toFixed(3))
    expect([...largos].sort((a, b) => a - b)).toEqual([+Math.hypot(2.5, 4).toFixed(3), 5])
    for (let v = 0; v < n; v++) {
      if (!esPared(v)) continue
      const [u, largo] = [g.paredes[v * 2], g.paredes[v * 2 + 1]]
      expect(u === 0 || Math.abs(u - largo) < 1e-5).toBe(true)
    }
  })

  test('u crece a lo largo de cada pared: es la distancia en planta a la esquina de arranque', () => {
    // en cada triángulo de pared, lo que cambia u entre dos vértices es lo que se mueven en planta
    let paredesVistas = 0
    for (let t = 0; t < g.indices.length; t += 3) {
      const [a, b, c] = [g.indices[t], g.indices[t + 1], g.indices[t + 2]]
      if (!esPared(a)) continue
      for (const [p, q] of [[a, b], [b, c], [a, c]]) {
        const du = Math.abs(g.paredes[p * 2] - g.paredes[q * 2])
        const dxz = Math.hypot(g.posiciones[p * 3] - g.posiciones[q * 3], g.posiciones[p * 3 + 2] - g.posiciones[q * 3 + 2])
        expect(du).toBeCloseTo(dxz, 4) // u sigue la planta: lo que avanza en u es lo que avanza la pared
      }
      paredesVistas++
    }
    expect(paredesVistas).toBe(2 * 7)
  })
})
