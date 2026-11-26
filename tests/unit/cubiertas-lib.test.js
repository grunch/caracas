import { describe, test, expect } from 'vitest'
import { cubiertasDeEpoca, huellasSha256, pedidoDeCubiertas, prepararCubiertas } from '../../tools/cubiertas-lib.mjs'
import { createHash } from 'node:crypto'
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


describe('huellasSha256: la procedencia que la puerta compara con la ciudad medida', () => {
  test('el sha256 de los vértices en float32 y de [inicio, cuántos] de cada techo en uint32, como cierre_fase6.py', () => {
    const datos = { vertices: new Float32Array([0, 0, 10, 0, 10.1, 10]), techos: new Uint32Array([0, 3, 2, 9]) }
    const bytes = Buffer.concat([Buffer.from(datos.vertices.buffer), Buffer.from(new Uint32Array([0, 3]).buffer)])
    expect(huellasSha256(datos)).toBe(createHash('sha256').update(bytes).digest('hex'))
  })
})

describe('pedidoDeCubiertas: qué épocas sacar y adónde', () => {
  const carpeta = 'fuentes/derivados/epocas'
  test('sin argumentos saca 1772 en su ruta de siempre (la que lee la puerta de la fase 6)', () => {
    expect(pedidoDeCubiertas([])).toEqual([{ epoca: 1, año: 1772, salida: `${carpeta}/cubiertas-1772.json` }])
  })
  test('una ruta sola sigue siendo 1772 en esa ruta (tools/geo/cierre_fase6.py la llama así)', () => {
    expect(pedidoDeCubiertas(['/tmp/x.json'])).toEqual([{ epoca: 1, año: 1772, salida: '/tmp/x.json' }])
  })
  test('--epoca con el año saca esa época, en su ruta por año o en la que se pida', () => {
    expect(pedidoDeCubiertas(['--epoca', '1843'])).toEqual([{ epoca: 2, año: 1843, salida: `${carpeta}/cubiertas-1843.json` }])
    expect(pedidoDeCubiertas(['--epoca=1936', 'b.json'])).toEqual([{ epoca: 5, año: 1936, salida: 'b.json' }])
  })
  test('--todas saca cada época de la línea de tiempo en su ruta por año', () => {
    expect(pedidoDeCubiertas(['--todas']).map((p) => [p.epoca, p.salida])).toEqual(
      [1578, 1772, 1843, 1889, 1911, 1936, 1946].map((a, i) => [i, `${carpeta}/cubiertas-${a}.json`]))
  })
  test('rechaza un año que no es época, --todas con una ruta y argumentos de más', () => {
    expect(() => pedidoDeCubiertas(['--epoca', '1850'])).toThrow(/1850.*1578, 1772, 1843, 1889, 1911, 1936/)
    expect(() => pedidoDeCubiertas(['--epoca', '1945'])).toThrow(/1945.*no es una época/)
    expect(() => pedidoDeCubiertas(['--epoca'])).toThrow(/año/)
    expect(() => pedidoDeCubiertas(['--todas', 'x.json'])).toThrow(/--todas/)
    expect(() => pedidoDeCubiertas(['a.json', 'b.json'])).toThrow(/de más/)
    expect(() => pedidoDeCubiertas(['--rapido'])).toThrow(/--rapido/)
  })
})

test('con la geometría preparada una vez, cada época da lo mismo que sacándola sola', () => {
  const preparada = prepararCubiertas(cuadra, coords)
  for (const epoca of [1, 2, 3]) {
    expect(cubiertasDeEpoca(cuadra, coords, { epoca, altura: () => 0, preparada }))
      .toEqual(cubiertasDeEpoca(cuadra, coords, { epoca, altura: () => 0 }))
  }
})
