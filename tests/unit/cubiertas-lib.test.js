import { describe, test, expect } from 'vitest'
import { cubiertasDeEpoca } from '../../tools/cubiertas-lib.mjs'
import { empacarTecho } from '../../src/ciudad.js'
import { CUBIERTA } from '../../src/techos.js'

const METRO = 0.5
const coords = {
  aMundo: (px, py) => ({ x: px * METRO, z: py * METRO }),
  aPixel: (x, z) => ({ px: x / METRO, py: z / METRO }),
}
const COLONIAL = 0
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]

function ciudadDe(casas) {
  const vertices = [], techos = [], vida = []
  for (const { puntos, estilo = COLONIAL, pisos = 1, semilla = 7, nace = 1, muere = 0 } of casas) {
    techos.push(vertices.length / 2, puntos.length, empacarTecho({ pisos, estilo }), semilla)
    for (const [x, z] of puntos) vertices.push(x / METRO, z / METRO)
    vida.push(nace + 8 * muere)
  }
  return { vertices: new Float32Array(vertices), techos: new Uint32Array(techos), vida: new Uint32Array(vida) }
}

const cuadra = ciudadDe([
  { puntos: rect(0, 0, 10, 24), semilla: 5 },
  { puntos: rect(10, 0, 20, 24), semilla: 11 },
  { puntos: rect(30, 0, 40, 24), semilla: 6, nace: 3 },   // nace después de 1772
])

describe('cubiertasDeEpoca: los triángulos de techo de una época, por casa', () => {
  const r = cubiertasDeEpoca(cuadra, coords, { epoca: 1, altura: () => 0 })

  test('solo las casas en pie en la época, cada triángulo con su techo, en píxeles del plano y metros de alto', () => {
    expect(new Set(r.triangulos.map((t) => t.techo))).toEqual(new Set([0, 1]))
    for (const t of r.triangulos) {
      expect(t.puntos).toHaveLength(3)
      for (const [px, , y] of t.puntos) {
        expect(px).toBeGreaterThanOrEqual(-4)
        expect(px).toBeLessThanOrEqual(44)
        expect(y).toBeGreaterThan(0)
      }
    }
  })

  test('solo las cubiertas de techo: sin paredes, patios ni solares', () => {
    for (const t of r.triangulos) {
      expect([CUBIERTA.TEJA, CUBIERTA.AZOTEA, CUBIERTA.ZINC, CUBIERTA.ALERO]).toContain(t.tipo % 8)
    }
  })

  test('marca los vértices de la cumbrera: en la casa de una crujía, una recta paralela a un lado del lote', () => {
    const cumbre = r.triangulos.filter((t) => t.techo === 0 && t.tipo === CUBIERTA.TEJA)
      .flatMap((t) => t.puntos.filter((_, k) => t.cumbre[k]))
    expect(cumbre.length).toBeGreaterThan(1)
    const xs = new Set(cumbre.map((p) => p[0].toFixed(2)))
    const ys = new Set(cumbre.map((p) => p[1].toFixed(2)))
    expect(Math.min(xs.size, ys.size)).toBe(1)
    expect(Math.max(xs.size, ys.size)).toBeGreaterThan(1)
  })

  test('es determinista y no muta los datos', () => {
    const copia = cuadra.vertices.slice()
    expect(cubiertasDeEpoca(cuadra, coords, { epoca: 1, altura: () => 0 })).toEqual(r)
    expect(cuadra.vertices).toEqual(copia)
  })
})
