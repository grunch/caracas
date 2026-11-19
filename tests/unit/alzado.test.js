import { describe, test, expect } from 'vitest'
import { alzarCasa, coordsFaldon, largoFaldon, normalFaldon, PISO_PATIO_M } from '../../src/alzado.js'
import { planDeTecho, CUBIERTA, alturaDe, PRETIL_M } from '../../src/techos.js'
import { planDeAlas, ALA } from '../../src/alas.js'

const COLONIAL = 0, REPUBLICANO = 1, MODERNO = 4

/** Una salida que junta lo que escribe alzarCasa, para preguntarle. */
function recolector() {
  const vertices = []
  const triangulos = []
  return {
    vertices, triangulos,
    vertice(u, v, y, n, pared, techo) { vertices.push({ u, v, y, n, pared, techo, cubierta: techo[3] }); return vertices.length - 1 },
    triangulo(a, b, c, n) { triangulos.push({ a, b, c, n }) },
  }
}
const rect = (L, D) => [[0, 0], [L, 0], [L, D], [0, D]]
const alzar = (L, D, extra = {}, libres = {}) => {
  const medidas = { ancho: L, fondo: D, estilo: COLONIAL, pisos: 1, semilla: 11, nace: 1, ...extra }
  const plan = extra.alas ? planDeAlas(medidas) : planDeTecho({ ...medidas, libres, lleno: 1 })
  const salida = recolector()
  alzarCasa({ anillo: rect(L, D), plan, libres }, salida)
  return { plan, ...salida }
}
const esPared = (v) => v.cubierta === CUBIERTA.PARED
const ala = (tipo, u0, v0, u1, v1) => ({ tipo, u0, v0, u1, v1 })
// 12 × 26: la crujía, un patio entre dos alas laterales y un ala cruzada al fondo
const ALAS_12X26 = [
  ala(ALA.FRENTE, 0, 0, 12, 7), ala(ALA.LATERAL_IZQ, 0, 7, 4, 20), ala(ALA.PATIO, 4, 7, 8, 20), ala(ALA.LATERAL_DER, 8, 7, 12, 20),
  ala(ALA.CRUZADA, 0, 20, 12, 26),
]
// 9 × 16: un ala sola; el patio toca la otra medianera y el fondo
const ALAS_9X16 = [ala(ALA.FRENTE, 0, 0, 9, 7), ala(ALA.LATERAL_IZQ, 0, 7, 4, 16), ala(ALA.PATIO, 4, 7, 9, 16)]

describe('faldones: coordenadas, largo y normal', () => {
  const plan = planDeTecho({ ancho: 10, fondo: 8, estilo: COLONIAL, pisos: 1, semilla: 11, nace: 1, lleno: 1 })
  const frente = plan.faldones.find((f) => f.caida[1] < 0)

  test('t es la distancia bajando por la pendiente desde la cumbrera; s corre a lo largo del alero', () => {
    const k = Math.hypot(1, frente.tan)
    expect(coordsFaldon(frente, 3, 4)[1]).toBeCloseTo(0, 9) // en la cumbrera
    expect(coordsFaldon(frente, 3, 0)[1]).toBeCloseTo(4 * k, 9) // en el alero: 4 m en planta, más sobre la pendiente
    expect(Math.abs(coordsFaldon(frente, 7, 2)[0] - coordsFaldon(frente, 3, 2)[0])).toBeCloseTo(4, 9)
    expect(largoFaldon(frente)).toBeCloseTo(4 * k, 9)
  })

  test('la normal mira hacia arriba y se inclina hacia donde cae el faldón', () => {
    const n = normalFaldon(frente)
    expect(Math.hypot(...n)).toBeCloseTo(1, 9)
    expect(n[1]).toBeGreaterThan(0.85)
    expect(n[2]).toBeLessThan(-0.4) // cae hacia la calle (v negativo)
    expect(n[0]).toBeCloseTo(0, 9)
  })

  test('una azotea es plana: sus coordenadas son las del lote', () => {
    const losa = planDeTecho({ ancho: 6, fondo: 6, estilo: MODERNO, pisos: 2, semilla: 4, nace: 5, lleno: 1 }).faldones[0]
    expect(coordsFaldon(losa, 2, 5)).toEqual([2, 5])
    expect(largoFaldon(losa)).toBe(0)
    expect(normalFaldon(losa)).toEqual([0, 1, 0])
  })
})

describe('alzarCasa: lote profundo con patio', () => {
  const { plan, vertices, triangulos } = alzar(12, 26, { alas: ALAS_12X26 })
  const patio = plan.faldones.find((f) => f.hueco)
  const [pu, pv] = [patio.region.map((p) => p[0]), patio.region.map((p) => p[1])]
  const enElPatio = (v) => v.u >= Math.min(...pu) - 1e-6 && v.u <= Math.max(...pu) + 1e-6 && v.v >= Math.min(...pv) - 1e-6 && v.v <= Math.max(...pv) + 1e-6

  test('cada vértice de tejado está a la altura de su faldón', () => {
    const tejas = vertices.filter((v) => v.cubierta === CUBIERTA.TEJA)
    expect(tejas.length).toBeGreaterThan(12)
    for (const v of tejas) {
      const f = plan.faldones.find((g) => !g.hueco && Math.abs(alturaDe(g, v.u, v.v) - v.y) < 1e-9)
      expect(f, `sin faldón para (${v.u}, ${v.v}, ${v.y})`).toBeTruthy()
    }
  })

  test('el patio lleva piso, un poco sobre el terreno, y no tejado', () => {
    const piso = vertices.filter((v) => v.cubierta === CUBIERTA.PATIO)
    expect(piso.length).toBeGreaterThanOrEqual(4)
    for (const v of piso) {
      expect(v.y).toBe(PISO_PATIO_M)
      expect(enElPatio(v)).toBe(true)
    }
  })

  test('las paredes del patio bajan del alero de cada ala hasta el suelo y llevan vanos', () => {
    const deAdentro = vertices.filter((v) => esPared(v) && enElPatio(v) && v.u > 0.01 && v.u < 11.99)
    expect(deAdentro.length).toBeGreaterThanOrEqual(12) // la crujía, las dos alas y el fondo
    expect(Math.min(...deAdentro.map((v) => v.y))).toBe(0)
    expect(deAdentro.filter((v) => v.pared[1] > 0).length).toBeGreaterThanOrEqual(12)
    // miran hacia el patio
    const centro = [(Math.min(...pu) + Math.max(...pu)) / 2, (Math.min(...pv) + Math.max(...pv)) / 2]
    for (const v of deAdentro.filter((q) => q.y === 0)) {
      expect((centro[0] - v.u) * v.n[0] + (centro[1] - v.v) * v.n[2]).toBeGreaterThan(0)
    }
  })

  test('donde un tejado queda más alto que su vecino hay un escalón: ningún hueco entre faldones', () => {
    // la crujía (cumbrera) es más alta que las alas: en la línea v = c hay paredes lisas que no llegan al suelo
    const c = Math.min(...pv)
    const escalones = vertices.filter((v) => esPared(v) && Math.abs(v.v - c) < 1e-6 && v.y > 1 && !enElPatio({ ...v, v: v.v + 0.01 }))
    expect(escalones.length).toBeGreaterThanOrEqual(4)
    expect(Math.max(...escalones.map((v) => v.y))).toBeCloseTo(plan.alto, 9) // suben hasta el alero de la crujía
    for (const t of triangulos) expect(new Set([t.a, t.b, t.c]).size).toBe(3)
  })

  test('las medianeras suben hasta su faldón: más altas en la cumbrera que en el alero', () => {
    const medianera = vertices.filter((v) => esPared(v) && Math.abs(v.u) < 1e-6 && v.n[0] < -0.9)
    expect(Math.max(...medianera.map((v) => v.y))).toBeGreaterThan(plan.alto + 1.2)
    expect(Math.min(...medianera.map((v) => v.y))).toBe(0)
    // no dan a la calle: ni alero ni pretil
    expect(medianera.every((v) => v.techo[0] === 0 && v.techo[1] === 0)).toBe(true)
  })
})

describe('alzarCasa: alero y pretil', () => {
  test('colonial: el alero vuela a escuadra de la pared del frente y sigue el plano del tejado', () => {
    const { plan, vertices } = alzar(10, 8)
    const frente = plan.faldones.find((f) => f.caida[1] < 0)
    const volados = vertices.filter((v) => v.cubierta === CUBIERTA.TEJA + CUBIERTA.VOLADA)
    expect(volados).toHaveLength(4)
    expect(Math.min(...volados.map((v) => v.v))).toBeCloseTo(-plan.alero, 9)
    for (const v of volados) expect(v.y).toBeCloseTo(alturaDe(frente, v.u, v.v), 9)
    const largo = largoFaldon(frente) + plan.alero * Math.hypot(1, frente.tan)
    for (const v of vertices.filter((q) => q.cubierta === CUBIERTA.TEJA && q.n[2] < -0.3)) expect(v.techo[2]).toBeCloseTo(largo, 9)
    expect(vertices.filter((v) => v.cubierta === CUBIERTA.ALERO)).toHaveLength(4)
  })

  test('sin calle a los costados ni al fondo, solo vuela el frente; con el fondo a la calle, también el fondo', () => {
    const solo = alzar(10, 8).vertices.filter((v) => v.cubierta === CUBIERTA.ALERO)
    expect(solo.every((v) => v.v <= 1e-9)).toBe(true)
    const conFondo = alzar(10, 8, {}, { fondo: true }).vertices.filter((v) => v.cubierta === CUBIERTA.ALERO)
    expect(conFondo.some((v) => v.v > 8)).toBe(true)
  })

  test('republicana: la pared del frente y su cara de adentro suben con el pretil; nada vuela', () => {
    const { plan, vertices } = alzar(10, 8, { estilo: REPUBLICANO })
    expect(vertices.some((v) => v.cubierta >= CUBIERTA.ALERO)).toBe(false)
    const delFrente = vertices.filter((v) => esPared(v) && Math.abs(v.v) < 1e-9)
    const afuera = delFrente.filter((v) => v.n[2] < 0), adentro = delFrente.filter((v) => v.n[2] > 0)
    expect(afuera).toHaveLength(4)
    expect(adentro).toHaveLength(4)
    for (const v of [...afuera, ...adentro]) expect(v.techo[1]).toBe(PRETIL_M)
    expect(afuera.filter((v) => v.y > 0).every((v) => v.techo[0] === PRETIL_M && v.y === plan.alto)).toBe(true)
    expect(adentro.every((v) => v.y === plan.alto)).toBe(true) // nace sin altura: el shader la sube
    expect(adentro.map((v) => v.techo[0]).sort()).toEqual([0, 0, PRETIL_M, PRETIL_M])
  })

  test('una esquina republicana: el pretil da la vuelta, sobre una cadera y no sobre un hastial', () => {
    const { plan, vertices } = alzar(16, 8, { estilo: REPUBLICANO }, { izq: true })
    const costado = vertices.filter((v) => esPared(v) && Math.abs(v.u) < 1e-9 && v.n[0] < -0.9)
    expect(Math.max(...costado.map((v) => v.y))).toBeCloseTo(plan.alto, 9) // sin hastial
    expect(costado.every((v) => v.techo[1] === PRETIL_M)).toBe(true)
  })

  test('un hastial que da a la calle sube liso hasta la cumbrera, sin pretil', () => {
    // 6 × 8 con el costado a la calle: no entra la cadera, queda el hastial
    const { plan, vertices } = alzar(4, 8, { estilo: REPUBLICANO }, { izq: true })
    const costado = vertices.filter((v) => esPared(v) && Math.abs(v.u) < 1e-9 && v.n[0] < -0.9)
    expect(Math.max(...costado.map((v) => v.y))).toBeGreaterThan(plan.alto + 1)
    const arribaDelAlero = costado.filter((v) => v.y > plan.alto + 0.5)
    expect(arribaDelAlero.length).toBeGreaterThan(0)
    // el tramo que llega a la cumbrera no lleva pretil
    expect(arribaDelAlero.every((v) => v.techo[1] === 0)).toBe(true)
  })
})

describe('alzarCasa: azotea y tapia', () => {
  test('la azotea queda más baja que sus paredes, que tienen cara de adentro (el pretil, hecho)', () => {
    const { plan, vertices } = alzar(6, 6, { estilo: MODERNO, pisos: 2, nace: 5 })
    const losa = vertices.filter((v) => v.cubierta === CUBIERTA.AZOTEA)
    expect(losa.every((v) => Math.abs(v.y - (plan.alto - 0.7)) < 1e-9)).toBe(true)
    const paredes = vertices.filter(esPared)
    expect(Math.max(...paredes.map((v) => v.y))).toBeCloseTo(plan.alto, 9)
    const adentro = paredes.filter((v) => (3 - v.u) * v.n[0] + (3 - v.v) * v.n[2] > 0)
    expect(adentro).toHaveLength(16) // cuatro lados, cuatro vértices cada uno
    expect(Math.min(...adentro.map((v) => v.y))).toBeCloseTo(plan.alto - 0.7, 9)
    expect(paredes.every((v) => v.techo[0] === 0)).toBe(true) // este pretil no depende de la época
  })

  test('el patio que llega a la medianera se cierra con una tapia, lisa', () => {
    // 9 m de frente: un ala sola; el patio toca la otra medianera
    const { plan, vertices } = alzar(9, 16, { alas: ALAS_9X16 })
    const patio = plan.faldones.find((f) => f.hueco)
    expect(patio).toBeTruthy()
    const lado = patio.region.some((p) => p[0] === 0) ? 0 : 9
    const tapia = vertices.filter((v) => esPared(v) && Math.abs(v.u - lado) < 1e-9 && v.v > Math.min(...patio.region.map((p) => p[1])) + 0.01
      && v.v < Math.max(...patio.region.map((p) => p[1])) - 0.01)
    const delBorde = vertices.filter((v) => esPared(v) && Math.abs(v.u - lado) < 1e-9 && Math.abs(v.n[0]) > 0.9
      && v.v >= Math.min(...patio.region.map((p) => p[1])) - 1e-9 && v.v <= Math.max(...patio.region.map((p) => p[1])) + 1e-9 && v.pared[1] === 0)
    expect(tapia.length + delBorde.length).toBeGreaterThanOrEqual(8) // por fuera y por dentro
    expect(Math.max(...delBorde.map((v) => v.y))).toBeCloseTo(2.6, 9)
  })
})

describe('alzarCasa: huellas que no llenan su rectángulo', () => {
  test('el tejado se recorta con la huella: ningún vértice fuera de ella', () => {
    const ele = [[0, 0], [12, 0], [12, 6], [5, 6], [5, 14], [0, 14]]
    const plan = planDeTecho({ ancho: 12, fondo: 14, estilo: COLONIAL, pisos: 1, semilla: 5, nace: 1, lleno: 0.64 })
    const salida = recolector()
    alzarCasa({ anillo: ele, plan, libres: {} }, salida)
    const tejas = salida.vertices.filter((v) => v.cubierta === CUBIERTA.TEJA)
    expect(tejas.length).toBeGreaterThan(6)
    expect(tejas.some((v) => v.u > 5.01 && v.v > 6.01)).toBe(false)
    for (const v of salida.vertices) expect(Number.isFinite(v.y)).toBe(true)
  })

  test('una huella que se sale por un pelo del rectángulo del plan no rompe', () => {
    const plan = planDeTecho({ ancho: 10, fondo: 8, estilo: COLONIAL, pisos: 1, semilla: 5, nace: 1, lleno: 1 })
    const salida = recolector()
    alzarCasa({ anillo: [[-1e-7, 0], [10 + 1e-7, -1e-7], [10, 8 + 1e-7], [0, 8]], plan }, salida)
    expect(salida.triangulos.length).toBeGreaterThan(10)
  })
})
