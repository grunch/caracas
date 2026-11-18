import { describe, test, expect } from 'vitest'
import { ALA, CALLE, CAMPOS_ALA, CAMPOS_MARCO, esDePatio, leerMarcos, planDeAlas } from '../../src/alas.js'
import { CUBIERTA, alturaDe, faldonEn, altoDePiso } from '../../src/techos.js'
import { alzarCasa } from '../../src/alzado.js'
import { alinearHuella, extruirTechos, empacarTecho } from '../../src/ciudad.js'
import { partesDeCiudad } from '../../tools/empacar-lib.mjs'
import { codificarPak } from '../../tools/pak.mjs'
import { decodificarPak } from '../../src/pak.js'
import { gunzipSync } from 'node:zlib'

const COLONIAL = 0, REPUBLICANO = 1, GUZMANCISTA = 2, ECLECTICO = 3, MODERNO = 4, QUINTA = 5, RANCHO = 6, ORILLAS = 7, PUBLICO = 9
const METRO = 0.5
const coords = { aMundo: (px, py) => ({ x: px * METRO, z: py * METRO }) }
const ala = (tipo, u0, v0, u1, v1) => ({ tipo, u0, v0, u1, v1 })

// un lote de 12 × 40 m: crujía, patio con un ala a la izquierda, ala cruzada, patio entre dos alas, ala cruzada y solar
const ALAS = [
  ala(ALA.FRENTE, 0, 0, 12, 7),
  ala(ALA.LATERAL_IZQ, 0, 7, 4, 13), ala(ALA.PATIO, 4, 7, 12, 13),
  ala(ALA.CRUZADA, 0, 13, 12, 18),
  ala(ALA.LATERAL_IZQ, 0, 18, 4, 24), ala(ALA.PATIO, 4, 18, 8, 24), ala(ALA.LATERAL_DER, 8, 18, 12, 24),
  ala(ALA.CRUZADA, 0, 24, 12, 29),
  ala(ALA.SOLAR, 0, 29, 12, 40),
]
const plan = (extra = {}) => planDeAlas({ ancho: 12, fondo: 40, alas: ALAS, estilo: COLONIAL, pisos: 1, semilla: 21, nace: 1, ...extra })
const techados = (p) => p.faldones.filter((f) => !f.hueco)
const cuantosContienen = (p, u, v) => p.faldones.filter((f) => {
  let signo = 0
  return f.region.every((a, k) => {
    const b = f.region[(k + 1) % f.region.length]
    const lado = (b[0] - a[0]) * (v - a[1]) - (b[1] - a[1]) * (u - a[0])
    if (Math.abs(lado) < 1e-9) return true
    if (signo === 0) signo = Math.sign(lado)
    return Math.sign(lado) === signo
  })
}).length

describe('esDePatio', () => {
  test('las casas de teja coloniales, republicanas, guzmancistas y de orillas; las demás no', () => {
    for (const estilo of [COLONIAL, REPUBLICANO, GUZMANCISTA, ORILLAS]) expect(esDePatio(estilo, 7, 1)).toBe(true)
    for (const estilo of [ECLECTICO, MODERNO, QUINTA, RANCHO, PUBLICO]) expect(esDePatio(estilo, 7, 5)).toBe(false)
  })
})

describe('leerMarcos', () => {
  const marcos = new Float32Array([3, 100, 200, 0, 1, 24, 80, CALLE.IZQ, 14, 0, 2, /**/ 5, 0, 0, 1, 0, 20, 30, 0, 13, 2, 0])
  const alas = new Float32Array([ALA.FRENTE, 0, 0, 24, 14, ALA.SOLAR, 0, 14, 24, 80])

  test('lleva el marco y las alas de píxeles del plano a metros del mundo, por número de techo', () => {
    const mapa = leerMarcos({ marcos, alas }, coords)
    expect([...mapa.keys()]).toEqual([3, 5])
    const m = mapa.get(3)
    expect(m.origen).toEqual([50, 100])
    expect(m.eu).toEqual([0, 1])
    expect(m.ev).toEqual([-1, 0]) // eu girado 90°
    expect([m.ancho, m.fondo, m.crujia]).toEqual([12, 40, 7])
    expect(m.calles).toEqual({ izq: true, der: false, fondo: false })
    expect(m.alas).toEqual([ala(ALA.FRENTE, 0, 0, 12, 7), ala(ALA.SOLAR, 0, 7, 12, 40)])
    expect(mapa.get(5).alas).toEqual([]) // una casa simple: solo el marco
  })

  test('sin marcos (datos viejos) no hay ninguno; truncados, falla', () => {
    expect(leerMarcos({}, coords).size).toBe(0)
    expect(() => leerMarcos({ marcos: marcos.subarray(0, CAMPOS_MARCO - 1), alas }, coords)).toThrow(/truncados/)
    expect(() => leerMarcos({ marcos, alas: alas.subarray(0, CAMPOS_ALA) }, coords)).toThrow(/fuera de las alas/)
  })
})

describe('planDeAlas: el tejado de una casa de patio', () => {
  const p = plan()

  test('la crujía del frente va a dos aguas con la cumbrera paralela a la calle, sobre todo el ancho', () => {
    const [afuera, adentro] = p.faldones
    expect(afuera.caida).toEqual([0, -1])
    expect(adentro.caida).toEqual([0, 1])
    // la cumbrera corre a lo largo de u, a la mitad de la crujía, a la misma altura de punta a punta
    for (const u of [0, 3, 6, 12]) {
      expect(alturaDe(afuera, u, 3.5)).toBeCloseTo(afuera.cumbre, 9)
      expect(alturaDe(adentro, u, 3.5)).toBeCloseTo(afuera.cumbre, 9)
    }
    expect(afuera.cumbre).toBeGreaterThan(p.alto + 1)
    expect(alturaDe(afuera, 6, 0)).toBeCloseTo(p.alto, 9) // el alero, a la altura de la pared
    expect(alturaDe(adentro, 6, 7)).toBeCloseTo(p.alto, 9)
  })

  test('las alas cruzadas van a dos aguas, paralelas a la calle y más bajas que la crujía', () => {
    const cruzadas = techados(p).filter((f) => f.caida[0] === 0 && f.base.every((q) => q[1] >= 13))
    expect(cruzadas).toHaveLength(4)
    for (const f of cruzadas) {
      expect(f.cumbre).toBeLessThan(p.faldones[0].cumbre)
      expect(f.cumbre).toBeGreaterThan(altoDePiso(COLONIAL, 21) - 0.5)
    }
  })

  test('las alas laterales van a media agua, con lo alto en la medianera y cayendo al patio', () => {
    const laterales = techados(p).filter((f) => f.caida[1] === 0)
    expect(laterales).toHaveLength(3)
    for (const f of laterales) {
      const us = f.base.map((q) => q[0])
      const izquierda = Math.min(...us) === 0
      expect(f.caida[0]).toBe(izquierda ? 1 : -1)
      const [alta, baja] = izquierda ? [0, 4] : [12, 8]
      expect(alturaDe(f, alta, 20)).toBeGreaterThan(alturaDe(f, baja, 20) + 0.5)
      expect(alturaDe(f, baja, 20)).toBeGreaterThanOrEqual(2.3 - 1e-9) // debajo hay un corredor
      expect(alturaDe(f, alta, 20)).toBeLessThanOrEqual(p.alto)
    }
  })

  test('los patios y el solar son huecos, con su piso; nada los techa', () => {
    const huecos = p.faldones.filter((f) => f.hueco)
    expect(huecos.map((f) => f.piso)).toEqual([CUBIERTA.PATIO, CUBIERTA.PATIO, CUBIERTA.SOLAR])
    expect(faldonEn(p, 8, 10).hueco).toBe(true)
    expect(faldonEn(p, 6, 21).hueco).toBe(true)
    expect(faldonEn(p, 6, 35).piso).toBe(CUBIERTA.SOLAR)
    expect(faldonEn(p, 2, 10).hueco).toBeFalsy()
  })

  test('los faldones cubren el lote sin encimarse, y también lo que la huella sobresale del rectángulo', () => {
    for (const f of p.faldones) expect(f.region.length).toBeGreaterThanOrEqual(3)
    for (let u = -2.3; u < 15; u += 1.37) {
      for (let v = -2.1; v < 43; v += 1.13) expect(cuantosContienen(p, u, v), `(${u}, ${v})`).toBe(1)
    }
    // el saliente lo cubre el ala del borde, con su mismo plano
    expect(faldonEn(p, 13, 15)).toBe(faldonEn(p, 11, 15))
    expect(faldonEn(p, -1, 2)).toBe(p.faldones[0])
  })

  test('el largo de cada faldón sale de su ala, no de lo que se estira', () => {
    for (const f of techados(p)) {
      const us = f.base.map((q) => q[0]), vs = f.base.map((q) => q[1])
      expect(Math.min(...us)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...us)).toBeLessThanOrEqual(12)
      expect(Math.min(...vs)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...vs)).toBeLessThanOrEqual(40)
    }
  })

  test('colonial con alero, republicana con pretil; dos pisos solo en la crujía de la calle', () => {
    expect(plan().alero).toBeGreaterThan(0.4)
    expect(plan().pretil).toBe(0)
    const republicana = plan({ estilo: REPUBLICANO })
    expect(republicana.alero).toBe(0)
    expect(republicana.pretil).toBeGreaterThan(0)
    const alta = plan({ pisos: 2 })
    expect(alta.alto).toBeCloseTo(2 * altoDePiso(COLONIAL, 21), 9)
    const cruzada = alta.faldones.find((f) => !f.hueco && f.base.every((q) => q[1] >= 13) && f.caida[0] === 0)
    expect(cruzada.cumbre).toBeLessThan(alta.alto)
  })

  test('sin la crujía del frente no hay plan', () => {
    expect(() => planDeAlas({ ancho: 12, fondo: 40, alas: ALAS.slice(1), estilo: COLONIAL, pisos: 1, semilla: 1 })).toThrow(/crujía/)
  })
})

describe('planDeAlas: la casa de esquina', () => {
  // 14 × 30, con la otra calle a la izquierda: su ala tiene el ancho de la crujía
  const alas = [
    ala(ALA.FRENTE, 0, 0, 14, 7), ala(ALA.ESQUINA_IZQ, 0, 7, 7, 30),
    ala(ALA.PATIO, 7, 7, 10, 14), ala(ALA.LATERAL_DER, 10, 7, 14, 14), ala(ALA.CRUZADA, 7, 14, 14, 20), ala(ALA.SOLAR, 7, 20, 14, 30),
  ]
  const p = planDeAlas({ ancho: 14, fondo: 30, alas, estilo: COLONIAL, pisos: 1, semilla: 5, nace: 1 })
  const [frenteAfuera, frenteAdentro, esquinaAfuera, esquinaAdentro] = p.faldones

  test('el ala de la otra calle tiene la cumbrera a lo largo de esa calle y cae hacia ella', () => {
    expect(esquinaAfuera.caida).toEqual([-1, 0])
    expect(esquinaAdentro.caida).toEqual([1, 0])
    for (const v of [8, 15, 29]) expect(alturaDe(esquinaAfuera, 3.5, v)).toBeCloseTo(esquinaAfuera.cumbre, 9)
    expect(alturaDe(esquinaAfuera, 0, 20)).toBeCloseTo(p.alto, 9)
  })

  test('se une a la crujía a inglete: limatesa por fuera y limahoya por dentro, sin escalón', () => {
    expect(esquinaAfuera.cumbre).toBeCloseTo(frenteAfuera.cumbre, 9)
    for (const t of [0, 1, 2.5, 3.5]) expect(alturaDe(frenteAfuera, t, t)).toBeCloseTo(alturaDe(esquinaAfuera, t, t), 9) // la limatesa
    for (const t of [3.5, 5, 7]) expect(alturaDe(frenteAdentro, t, t)).toBeCloseTo(alturaDe(esquinaAdentro, t, t), 9) // la limahoya
    expect(faldonEn(p, 1, 0.5)).toBe(frenteAfuera)
    expect(faldonEn(p, 0.5, 1)).toBe(esquinaAfuera)
    expect(faldonEn(p, 6, 5)).toBe(frenteAdentro)
    expect(faldonEn(p, 5, 6)).toBe(esquinaAdentro)
  })

  test('a la derecha, lo mismo en espejo', () => {
    const espejo = alas.map((a) => ({ ...a, u0: 14 - a.u1, u1: 14 - a.u0, tipo: { [ALA.ESQUINA_IZQ]: ALA.ESQUINA_DER, [ALA.LATERAL_DER]: ALA.LATERAL_IZQ }[a.tipo] ?? a.tipo }))
    const q = planDeAlas({ ancho: 14, fondo: 30, alas: espejo, estilo: COLONIAL, pisos: 1, semilla: 5, nace: 1 })
    for (const [u, v] of [[1, 0.5], [0.5, 1], [6, 5], [5, 6], [3, 20], [9, 10], [12, 10], [10, 17], [10, 25]]) {
      const [f, g] = [faldonEn(p, u, v), faldonEn(q, 14 - u, v)]
      expect(g.caida).toEqual([f.caida[0] === 0 ? 0 : -f.caida[0], f.caida[1]])
      expect(alturaDe(g, 14 - u, v)).toBeCloseTo(alturaDe(f, u, v), 9)
    }
  })
})

/** Una salida que junta lo que escribe alzarCasa. */
function recolector() {
  const vertices = []
  const triangulos = []
  return {
    vertices, triangulos,
    vertice(u, v, y, n, pared, techo) { vertices.push({ u, v, y, n, pared, techo, cubierta: techo[3] }); return vertices.length - 1 },
    triangulo(a, b, c, n) { triangulos.push({ a, b, c, n }) },
  }
}

describe('alzarCasa con un plan de alas', () => {
  const p = plan()
  const salida = recolector()
  // la huella sobresale un poco del rectángulo del lote por la derecha
  alzarCasa({ anillo: [[0, 0], [12, 0], [12, 14], [13, 14], [13, 17], [12, 17], [12, 40], [0, 40]], plan: p, libres: {} }, salida)
  const { vertices, triangulos } = salida
  const area = (t) => {
    const [a, b, c] = [vertices[t.a], vertices[t.b], vertices[t.c]]
    const [e1, e2] = [[b.u - a.u, b.y - a.y, b.v - a.v], [c.u - a.u, c.y - a.y, c.v - a.v]]
    return Math.hypot(e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]) / 2
  }

  test('ningún triángulo degenerado, ningún número raro', () => {
    expect(triangulos.length).toBeGreaterThan(60)
    for (const t of triangulos) {
      expect(new Set([t.a, t.b, t.c]).size).toBe(3)
      expect(area(t)).toBeGreaterThan(1e-9)
    }
    for (const v of vertices) expect([v.u, v.v, v.y, ...v.n, ...v.pared, ...v.techo].every(Number.isFinite)).toBe(true)
  })

  test('el tejado cubre lo edificado y los pisos, los patios y el solar: toda la huella', () => {
    const horizontal = (t) => {
      const [a, b, c] = [vertices[t.a], vertices[t.b], vertices[t.c]]
      return Math.abs((b.u - a.u) * (c.v - a.v) - (c.u - a.u) * (b.v - a.v)) / 2
    }
    const de = (...cubiertas) => triangulos.filter((t) => cubiertas.includes(vertices[t.a].cubierta) && vertices[t.a].v >= -1e-6 && vertices[t.b].v >= -1e-6 && vertices[t.c].v >= -1e-6)
      .reduce((s, t) => s + horizontal(t), 0)
    expect(de(CUBIERTA.PATIO)).toBeCloseTo(8 * 6 + 4 * 6, 6)
    expect(de(CUBIERTA.SOLAR)).toBeCloseTo(12 * 11, 6)
    expect(de(CUBIERTA.TEJA) + de(CUBIERTA.PATIO) + de(CUBIERTA.SOLAR)).toBeCloseTo(12 * 40 + 3, 6)
  })

  test('la cumbrera de la crujía corre a lo largo de la calle, a una sola altura', () => {
    const cumbre = p.faldones[0].cumbre
    const arriba = vertices.filter((v) => v.cubierta === CUBIERTA.TEJA && Math.abs(v.y - cumbre) < 1e-9)
    expect(arriba.length).toBeGreaterThanOrEqual(4)
    expect(new Set(arriba.map((v) => v.v.toFixed(6)))).toEqual(new Set(['3.500000']))
    expect(Math.max(...arriba.map((v) => v.u)) - Math.min(...arriba.map((v) => v.u))).toBeCloseTo(12, 9)
  })

  test('el alero vuela sobre la calle, y su faldón mide lo que el ala más el vuelo', () => {
    const volados = vertices.filter((v) => v.cubierta === CUBIERTA.TEJA + CUBIERTA.VOLADA)
    expect(volados.length).toBeGreaterThanOrEqual(4)
    expect(Math.min(...volados.map((v) => v.v))).toBeCloseTo(-p.alero, 9)
    for (const v of vertices.filter((q) => q.cubierta === CUBIERTA.TEJA)) expect(v.techo[2]).toBeLessThan(8)
  })

  test('los patios tienen paredes con vanos; el solar que toca la medianera, tapia', () => {
    const delPatio = vertices.filter((v) => v.cubierta === CUBIERTA.PARED && v.u > 4 - 1e-6 && v.u < 8 + 1e-6 && v.v > 18 - 1e-6 && v.v < 24 + 1e-6)
    expect(delPatio.filter((v) => v.pared[1] > 0).length).toBeGreaterThanOrEqual(16) // cuatro paredes
    const tapia = vertices.filter((v) => v.cubierta === CUBIERTA.PARED && Math.abs(v.v - 40) < 1e-6 && Math.abs(v.n[2]) > 0.9)
    expect(Math.max(...tapia.map((v) => v.y))).toBeCloseTo(2.6, 9)
  })
})

describe('alinearHuella', () => {
  test('lleva a la línea de fachada los dientes del frente y quita los vértices que sobran', () => {
    const dentada = [[0, 0.4], [3, -0.3], [6, 0.6], [9, 0.2], [12, -0.5], [12, 30], [0, 30]]
    expect(alinearHuella(dentada, 12, 30)).toEqual([[0, 0], [12, 0], [12, 30], [0, 30]])
  })

  test('los costados solo si dan a una calle; lo que está lejos de la línea no se toca', () => {
    const huella = [[0.5, 0], [12, 0], [11.4, 30], [0.7, 29.2], [0.3, 15]]
    expect(alinearHuella(huella, 12, 30)).toEqual([[0.5, 0], [12, 0], [11.4, 30], [0.7, 29.2], [0.3, 15]])
    expect(alinearHuella(huella, 12, 30, { izq: true, fondo: true })).toEqual([[0, 0], [12, 0], [11.4, 30], [0, 30]])
    expect(alinearHuella([[0, 3], [12, 3], [12, 30], [0, 30]], 12, 30)).toEqual([[0, 3], [12, 3], [12, 30], [0, 30]])
  })

  test('dos vértices llevados a la misma esquina dejan uno: la esquina no se pierde', () => {
    expect(alinearHuella([[0, 1], [1, 0], [12, 0], [12, 40], [0, 40]], 12, 40, { izq: true })).toEqual([[0, 0], [12, 0], [12, 40], [0, 40]])
  })

  test('si al alinear deja de ser un polígono, queda como vino', () => {
    const fina = [[0, 0.2], [12, 0.4], [12, 1.2], [0, 1.1]]
    expect(alinearHuella(fina, 12, 1.2)).toBe(fina)
  })
})

describe('extruirTechos con casas de patio', () => {
  // una casa de 12 × 40 m con el frente en z = 0 mirando al norte; su marco: eu = +x, ev = +z
  const rect = [[0, 0.3], [12, -0.2], [12, 40], [0, 40]]
  const datos = (estilo, conAlas = true) => ({
    vertices: Float32Array.from(rect.flat().map((m) => m / METRO)),
    techos: Uint32Array.from([0, 4, empacarTecho({ pisos: 1, estilo }), 21]),
    vida: Uint32Array.from([1]),
    marcos: Float32Array.from([0, 0, 0, 1, 0, 24, 80, 0, 14, 0, conAlas ? ALAS.length : 0]),
    alas: Float32Array.from(ALAS.flatMap((a) => [a.tipo, a.u0 / METRO, a.v0 / METRO, a.u1 / METRO, a.v1 / METRO])),
  })
  const cuenta = (g, cubierta) => g.cubiertas.filter((c, k) => k % 4 === 3 && c === cubierta).length

  test('la colonial lleva sus patios y su solar; los atributos traen un valor por vértice', () => {
    const g = extruirTechos(datos(COLONIAL), coords)
    const n = g.posiciones.length / 3
    expect(n).toBeGreaterThan(100)
    expect([g.normales.length, g.info.length, g.vidas.length, g.anclas.length, g.paredes.length, g.cubiertas.length, g.historias.length])
      .toEqual([n * 3, n * 4, n * 2, n * 2, n * 3, n * 4, n * 2])
    expect(g.indices.length % 3).toBe(0)
    expect(Math.max(...g.indices)).toBeLessThan(n)
    expect(cuenta(g, CUBIERTA.PATIO)).toBeGreaterThanOrEqual(8)
    expect(cuenta(g, CUBIERTA.SOLAR)).toBeGreaterThanOrEqual(4)
    expect(g.posiciones.every(Number.isFinite)).toBe(true)
  })

  test('el frente queda derecho sobre la línea de fachada, y el alero vuela parejo', () => {
    const g = extruirTechos(datos(COLONIAL), coords)
    let masAlNorte = Infinity
    for (let v = 0; v < g.posiciones.length / 3; v++) {
      if (g.cubiertas[v * 4 + 3] === CUBIERTA.PARED) masAlNorte = Math.min(masAlNorte, g.posiciones[v * 3 + 2])
    }
    expect(masAlNorte).toBeCloseTo(0, 6)
  })

  test('la moderna, en el mismo lote, no es de patio: azotea entera', () => {
    const g = extruirTechos(datos(MODERNO), coords)
    expect(cuenta(g, CUBIERTA.PATIO) + cuenta(g, CUBIERTA.SOLAR)).toBe(0)
    expect(cuenta(g, CUBIERTA.AZOTEA)).toBeGreaterThanOrEqual(4)
  })

  test('cuando no es de patio, el techo cubre también lo que la huella sobresale del rectángulo del lote', () => {
    const saliente = [[0, 0], [12, 0], [12, 14], [13, 14], [13, 17], [12, 17], [12, 40], [0, 40]]
    const d = { ...datos(MODERNO), vertices: Float32Array.from(saliente.flat().map((m) => m / METRO)), techos: Uint32Array.from([0, 8, empacarTecho({ pisos: 1, estilo: MODERNO }), 21]) }
    const g = extruirTechos(d, coords)
    let techado = 0
    for (let t = 0; t < g.indices.length; t += 3) {
      const [i, j, k] = [g.indices[t], g.indices[t + 1], g.indices[t + 2]]
      if (g.cubiertas[i * 4 + 3] !== CUBIERTA.AZOTEA || g.normales[i * 3 + 1] < 0.5) continue
      const p = (v) => [g.posiciones[v * 3], g.posiciones[v * 3 + 2]]
      const [a, b, c] = [p(i), p(j), p(k)]
      techado += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
    }
    expect(techado).toBeCloseTo(12 * 40 + 3, 4)
  })

  test('una casa simple (marco sin alas) se techa entera, con la crujía de su manzana', () => {
    const g = extruirTechos(datos(COLONIAL, false), coords)
    expect(cuenta(g, CUBIERTA.PATIO) + cuenta(g, CUBIERTA.SOLAR)).toBe(0)
    // la cumbrera de la crujía, a 3,5 m de la línea de fachada (crujía de 7 m)
    let [cumbre, z] = [-Infinity, 0]
    for (let v = 0; v < g.posiciones.length / 3; v++) {
      if (g.cubiertas[v * 4 + 3] === CUBIERTA.TEJA && g.posiciones[v * 3 + 1] > cumbre + 1e-6) [cumbre, z] = [g.posiciones[v * 3 + 1], g.posiciones[v * 3 + 2]]
    }
    expect(z).toBeCloseTo(3.5, 6)
  })
})

describe('empacar y leer las casas de patio', () => {
  const json = {
    vertices: [0, 0, 24, 0, 24, 80, 0, 80], techos: [[0, 4, 1, 0, 21]],
    marcos: [[0, 0, 0, 1, 0, 24, 80, 0, 14, 0, 2]], alas: [[ALA.FRENTE, 0, 0, 24, 14], [ALA.SOLAR, 0, 14, 24, 80]],
  }

  test('marcos y alas van como partes Float32 del pak y vuelven iguales', () => {
    const partes = partesDeCiudad(json)
    expect(partes.marcos.registro).toBe(CAMPOS_MARCO * 4)
    expect(partes.alas.registro).toBe(CAMPOS_ALA * 4)
    const crudo = gunzipSync(codificarPak(partes))
    const leido = decodificarPak(crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength),
      { vertices: Float32Array, techos: Uint32Array, marcos: Float32Array, alas: Float32Array })
    expect(Array.from(leido.marcos)).toEqual(json.marcos[0])
    expect(Array.from(leido.alas)).toEqual(json.alas.flat())
    expect(leerMarcos(leido, coords).get(0).alas).toHaveLength(2)
  })

  test('un visor anterior saltea las partes nuevas y sigue', () => {
    const crudo = gunzipSync(codificarPak(partesDeCiudad(json)))
    const avisos = []
    const leido = decodificarPak(crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength),
      { vertices: Float32Array, techos: Uint32Array }, (m) => avisos.push(m))
    expect(leido.techos).toHaveLength(4)
    expect(avisos).toHaveLength(2)
  })

  test('sin marcos no agrega las partes; con datos rotos, falla diciendo cuál', () => {
    expect(partesDeCiudad({ ...json, marcos: [], alas: [] }).marcos).toBeUndefined()
    expect(partesDeCiudad({ vertices: json.vertices, techos: json.techos }).alas).toBeUndefined()
    const con = (marco, alas = json.alas) => () => partesDeCiudad({ ...json, marcos: [marco], alas })
    expect(con([1, 0, 0, 1, 0, 24, 80, 0, 14, 0, 2])).toThrow(/techo que no existe/)
    expect(con([0, 0, 0, 1, 0, 24, 80, 0, 14, 1, 2])).toThrow(/fuera de las alas/)
    expect(con([0, 0, 0, 1, 0, 0, 80, 0, 14, 0, 2])).toThrow(/ancho/)
    expect(con([0, 0, 0, 1, 0, 24, 80, 0, 14, 0])).toThrow(/11 números/)
    expect(con(json.marcos[0], [[11, 0, 0, 24, 14], json.alas[1]])).toThrow(/tipo desconocido/)
    expect(con(json.marcos[0], [[ALA.FRENTE, 0, 0, 0, 14], json.alas[1]])).toThrow(/no tiene área/)
    expect(con(json.marcos[0], [[ALA.FRENTE, 0, 0, 24], json.alas[1]])).toThrow(/5 números/)
    expect(() => partesDeCiudad({ ...json, marcos: [json.marcos[0], json.marcos[0]] })).toThrow(/repetido/)
  })
})
