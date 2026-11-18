import { describe, test, expect } from 'vitest'
import {
  CUBIERTA, ALTO_PISO_ESTILO, PRETIL_M, azar, altoDePiso, cubiertaDe, elegirFrente, planDeTecho, alturaDe, faldonEn, etapasDe,
} from '../../src/techos.js'
import { areaConSigno } from '../../src/poligono.js'

const COLONIAL = 0, REPUBLICANO = 1, GUZMANCISTA = 2, ECLECTICO = 3, MODERNO = 4, QUINTA = 5, RANCHO = 6, ORILLAS = 7, GALPON = 8, PUBLICO = 9
const ENTRE_MEDIANERAS = { izq: false, der: false, fondo: false }
const casa = (extra) => planDeTecho({ ancho: 10, fondo: 8, estilo: COLONIAL, pisos: 1, semilla: 77, nace: 1, libres: ENTRE_MEDIANERAS, lleno: 1, ...extra })
const areaDe = (plan) => plan.faldones.reduce((s, f) => s + Math.abs(areaConSigno(f.region)), 0)
const esConvexa = (region) => {
  const signos = region.map((p, k) => {
    const [q, r] = [region[(k + 1) % region.length], region[(k + 2) % region.length]]
    return Math.sign((q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]))
  }).filter((s) => s !== 0)
  return signos.every((s) => s === signos[0])
}
const grados = (tan) => (Math.atan(tan) * 180) / Math.PI

describe('azar', () => {
  test('es determinista, cae en [0, 1) y cambia con la sal', () => {
    expect(azar(123, 1)).toBe(azar(123, 1))
    expect(azar(123, 1)).not.toBe(azar(123, 2))
    for (let s = 0; s < 500; s++) {
      expect(azar(s, 3)).toBeGreaterThanOrEqual(0)
      expect(azar(s, 3)).toBeLessThan(1)
    }
  })
})

describe('altoDePiso', () => {
  test('cada estilo tiene su alto, y cada casa lo varía ±15 % con su semilla', () => {
    for (const [estilo, base] of Object.entries(ALTO_PISO_ESTILO)) {
      const altos = Array.from({ length: 200 }, (_, s) => altoDePiso(Number(estilo), s))
      expect(Math.min(...altos)).toBeGreaterThanOrEqual(base * 0.85 - 1e-9)
      expect(Math.max(...altos)).toBeLessThanOrEqual(base * 1.15 + 1e-9)
      expect(Math.max(...altos) - Math.min(...altos)).toBeGreaterThan(base * 0.2) // de verdad varía
    }
  })

  test('las casas del centro rondan los 5 m de fachada; las de las orillas, 3 m de alero', () => {
    expect(ALTO_PISO_ESTILO[COLONIAL]).toBeGreaterThanOrEqual(4.4)
    expect(ALTO_PISO_ESTILO[REPUBLICANO]).toBeGreaterThanOrEqual(4.6)
    expect(ALTO_PISO_ESTILO[ORILLAS]).toBeLessThanOrEqual(3.4)
    expect(ALTO_PISO_ESTILO[RANCHO]).toBeLessThan(ALTO_PISO_ESTILO[ORILLAS])
  })

  test('un estilo desconocido usa un alto por defecto', () => {
    expect(altoDePiso(42, 1)).toBeGreaterThan(2)
  })
})

describe('cubiertaDe', () => {
  test('teja en coloniales, republicanas, guzmancistas, quintas y orillas', () => {
    for (const e of [COLONIAL, REPUBLICANO, GUZMANCISTA, QUINTA, ORILLAS]) expect(cubiertaDe(e, 5, 2)).toBe(CUBIERTA.TEJA)
  })
  test('azotea en las modernas y zinc en los ranchos', () => {
    expect(cubiertaDe(MODERNO, 5, 5)).toBe(CUBIERTA.AZOTEA)
    expect(cubiertaDe(RANCHO, 5, 5)).toBe(CUBIERTA.ZINC)
    expect(cubiertaDe(GALPON, 5, 3)).toBe(CUBIERTA.ZINC)
  })
  test('las eclécticas, mitad azotea y mitad teja', () => {
    const tejas = Array.from({ length: 400 }, (_, s) => cubiertaDe(ECLECTICO, s, 4)).filter((c) => c === CUBIERTA.TEJA).length
    expect(tejas).toBeGreaterThan(140)
    expect(tejas).toBeLessThan(260)
  })
  test('los edificios públicos: teja hasta 1843 (no había azoteas), azotea después', () => {
    expect(cubiertaDe(PUBLICO, 5, 1)).toBe(CUBIERTA.TEJA)
    expect(cubiertaDe(PUBLICO, 5, 2)).toBe(CUBIERTA.TEJA)
    expect(cubiertaDe(PUBLICO, 5, 4)).toBe(CUBIERTA.AZOTEA)
  })
})

describe('elegirFrente', () => {
  test('el lado que da a la calle (el libre)', () => {
    expect(elegirFrente([10, 22, 10, 22], [0, 0, 1, 0])).toBe(2)
  })
  test('en una esquina (dos lados libres), el más largo', () => {
    expect(elegirFrente([10, 22, 10, 22], [1, 1, 0, 0])).toBe(1)
  })
  test('una casa suelta: el lado largo, así la cumbrera sigue el eje largo', () => {
    expect(elegirFrente([6, 14, 6, 14], [1, 1, 1, 1])).toBe(1)
  })
  test('sin ningún lado libre (en medio de la manzana), el más despejado; a igualdad, uno corto', () => {
    expect(elegirFrente([10, 22, 10, 22], [0.2, 0.4, 0, 0])).toBe(1)
    expect([0, 2]).toContain(elegirFrente([10, 22, 10, 22], [0, 0, 0, 0]))
  })
})

describe('planDeTecho: casa colonial chica', () => {
  const plan = casa()

  test('dos aguas de teja con la cumbrera paralela al frente', () => {
    expect(plan.faldones).toHaveLength(2)
    for (const f of plan.faldones) {
      expect(f.cubierta).toBe(CUBIERTA.TEJA)
      expect(Math.abs(f.caida[0])).toBeLessThan(1e-9) // cae hacia la calle o hacia el fondo, no a lo largo del frente
      expect(Math.abs(f.caida[1])).toBeCloseTo(1, 9)
    }
    const [frente, atras] = [plan.faldones.find((f) => f.caida[1] < 0), plan.faldones.find((f) => f.caida[1] > 0)]
    expect(frente && atras).toBeTruthy()
  })

  test('pendiente de 24° a 30°, alero de 0,5 a 0,8 m y sin pretil', () => {
    for (const f of plan.faldones) {
      expect(grados(f.tan)).toBeGreaterThanOrEqual(24)
      expect(grados(f.tan)).toBeLessThanOrEqual(30)
    }
    expect(plan.alero).toBeGreaterThanOrEqual(0.5)
    expect(plan.alero).toBeLessThanOrEqual(0.8)
    expect(plan.pretil).toBe(0)
  })

  test('el alero queda a la altura de la pared y la cumbrera más arriba, en el medio', () => {
    expect(plan.alto).toBeCloseTo(plan.pisos * plan.altoPiso, 9)
    expect(alturaDe(faldonEn(plan, 5, 0.001), 5, 0)).toBeCloseTo(plan.alto, 6)
    expect(alturaDe(faldonEn(plan, 5, 7.999), 5, 8)).toBeCloseTo(plan.alto, 6)
    const cumbre = alturaDe(faldonEn(plan, 5, 3.999), 5, 4)
    expect(cumbre).toBeGreaterThan(plan.alto + 1.5)
    expect(alturaDe(faldonEn(plan, 5, 4.001), 5, 4)).toBeCloseTo(cumbre, 6) // las dos aguas se encuentran
  })

  test('los faldones cubren toda la planta, sin encimarse, y son convexos', () => {
    expect(areaDe(plan)).toBeCloseTo(80, 6)
    for (const f of plan.faldones) expect(esConvexa(f.region)).toBe(true)
  })

  test('es determinista', () => {
    expect(casa()).toEqual(plan)
    expect(casa({ semilla: 78 })).not.toEqual(plan)
  })

  test('con un costado a la calle (esquina), ese extremo va a cuatro aguas', () => {
    const esquina = casa({ ancho: 16, libres: { izq: true, der: false, fondo: false } })
    expect(esquina.faldones).toHaveLength(3)
    const cadera = esquina.faldones.find((f) => f.caida[0] < -0.9)
    expect(cadera).toBeTruthy()
    expect(areaDe(esquina)).toBeCloseTo(16 * 8, 6)
  })
})

describe('planDeTecho: lote profundo (crujía al frente, alas y patio)', () => {
  const plan = casa({ ancho: 12, fondo: 26 })
  const tejados = plan.faldones.filter((f) => !f.hueco)
  const patio = plan.faldones.find((f) => f.hueco)

  test('la crujía del frente tiene 6 a 7,5 m de fondo y su cumbrera es paralela a la calle', () => {
    const frente = tejados.find((f) => f.caida[1] < -0.9 && f.region.some((p) => p[1] === 0))
    const fondoCrujia = 2 * Math.max(...frente.region.map((p) => p[1]))
    expect(fondoCrujia).toBeGreaterThanOrEqual(6)
    expect(fondoCrujia).toBeLessThanOrEqual(7.5)
  })

  test('deja un patio al centro, detrás de la crujía y sin tocar las medianeras', () => {
    expect(patio).toBeTruthy()
    const us = patio.region.map((p) => p[0]), vs = patio.region.map((p) => p[1])
    expect(Math.min(...us)).toBeGreaterThan(3)
    expect(Math.max(...us)).toBeLessThan(9)
    expect(Math.min(...vs)).toBeGreaterThanOrEqual(6)
    expect(alturaDe(patio, 6, 12)).toBe(0)
  })

  test('las alas caen hacia el patio y no pasan de la cumbrera del frente', () => {
    const cumbre = Math.max(...tejados.map((f) => f.cumbre))
    const alas = tejados.filter((f) => Math.abs(f.caida[0]) > 0.9)
    expect(alas.length).toBeGreaterThanOrEqual(2)
    const izq = alas.find((f) => f.region.every((p) => p[0] <= 6))
    expect(izq.caida[0]).toBeGreaterThan(0) // el ala de la izquierda baja hacia la derecha (el patio)
    for (const f of alas) expect(f.cumbre).toBeLessThanOrEqual(cumbre)
    // ninguna ala baja de 2 m: debajo hay un corredor
    for (const f of alas) for (const [u, v] of f.region) expect(alturaDe(f, u, v)).toBeGreaterThanOrEqual(2)
  })

  test('todo lo que no es patio está techado: las regiones cubren el lote', () => {
    expect(areaDe(plan)).toBeCloseTo(12 * 26, 6)
    for (const f of plan.faldones) expect(esConvexa(f.region)).toBe(true)
  })

  test('faldonEn encuentra el faldón de cada punto; fuera del lote, ninguno', () => {
    expect(faldonEn(plan, 6, 1)).toBeTruthy()
    expect(faldonEn(plan, 6, 12)).toBe(patio)
    expect(faldonEn(plan, -1, 5)).toBeNull()
  })

  test('un lote angosto y profundo no lleva patio: crujía al frente y un cuerpo atrás, más bajo', () => {
    const angosto = casa({ ancho: 6, fondo: 20 })
    expect(angosto.faldones.some((f) => f.hueco)).toBe(false)
    expect(areaDe(angosto)).toBeCloseTo(120, 6)
    const atras = angosto.faldones.filter((f) => Math.abs(f.caida[0]) > 0.9)
    expect(atras.length).toBeGreaterThanOrEqual(1)
  })
})

describe('planDeTecho: según el estilo', () => {
  test('republicanas y guzmancistas: pretil (sin alero); el tejado arranca a la altura de la casa y el pretil sube sobre él', () => {
    for (const estilo of [REPUBLICANO, GUZMANCISTA]) {
      const plan = casa({ estilo, nace: 3 })
      expect(plan.alero).toBe(0)
      expect(plan.pretil).toBe(PRETIL_M)
      expect(alturaDe(faldonEn(plan, 5, 0.001), 5, 0)).toBeCloseTo(plan.alto, 6)
    }
  })

  test('una etapa que pasa de colonial a republicana lleva alero y pretil: el shader muestra el de cada época', () => {
    const plan = casa({ conAlero: true, conPretil: true })
    expect(plan.alero).toBeGreaterThan(0.4)
    expect(plan.pretil).toBe(PRETIL_M)
  })

  test('las de las orillas: alero volado y paredes bajas', () => {
    const plan = casa({ estilo: ORILLAS, nace: 5 })
    expect(plan.alero).toBeGreaterThan(0.4)
    expect(plan.alto).toBeLessThan(3.8)
  })

  test('modernas: azotea plana con pretil alrededor', () => {
    const plan = casa({ estilo: MODERNO, pisos: 3, nace: 5 })
    const losa = plan.faldones.reduce((m, f) => (Math.abs(areaConSigno(f.region)) > Math.abs(areaConSigno(m.region)) ? f : m))
    expect(losa.cubierta).toBe(CUBIERTA.AZOTEA)
    expect(losa.tan).toBe(0)
    expect(losa.borde).toBeGreaterThan(0.4)
    expect(alturaDe(losa, 5, 4) + losa.borde).toBeCloseTo(plan.alto, 6)
    expect(areaDe(plan)).toBeCloseTo(80, 6)
  })

  test('ranchos: dos aguas de zinc, de poca pendiente', () => {
    const plan = casa({ estilo: RANCHO, ancho: 5, fondo: 4, nace: 5 })
    expect(plan.faldones).toHaveLength(2)
    for (const f of plan.faldones) {
      expect(f.cubierta).toBe(CUBIERTA.ZINC)
      expect(grados(f.tan)).toBeLessThan(20)
    }
  })

  test('quintas: cuatro aguas con alero', () => {
    const plan = casa({ estilo: QUINTA, ancho: 14, fondo: 9, nace: 5, libres: { izq: true, der: true, fondo: true } })
    expect(plan.faldones).toHaveLength(4)
    expect(plan.alero).toBeGreaterThan(0.4)
  })

  test('galpones de estación: zinc a dos aguas, con la cumbrera a lo largo y paredes altas', () => {
    const plan = casa({ estilo: GALPON, ancho: 18, fondo: 40, nace: 4 })
    expect(plan.faldones).toHaveLength(2)
    for (const f of plan.faldones) {
      expect(f.cubierta).toBe(CUBIERTA.ZINC)
      expect(Math.abs(f.caida[0])).toBeCloseTo(1, 9) // cumbrera a lo largo del fondo (el eje largo)
    }
    expect(plan.alto).toBeGreaterThan(4.5)
  })
})

describe('planDeTecho: polígonos irregulares', () => {
  test('si la casa llena poco su rectángulo, crujías paralelas bajas (sin patio ni frente que seguir)', () => {
    const plan = casa({ ancho: 20, fondo: 18, lleno: 0.4 })
    expect(plan.faldones.some((f) => f.hueco)).toBe(false)
    const subida = Math.max(...plan.faldones.map((f) => f.cumbre)) - plan.alto
    expect(subida).toBeGreaterThan(0.3)
    expect(subida).toBeLessThanOrEqual(1.6)
    expect(areaDe(plan)).toBeCloseTo(360, 6)
    for (const f of plan.faldones) expect(esConvexa(f.region)).toBe(true)
    // las cumbreras siguen el lado largo (u): los faldones caen a lo largo de v
    expect(plan.faldones.length).toBeGreaterThanOrEqual(4)
    for (const f of plan.faldones) expect(Math.abs(f.caida[1])).toBeCloseTo(1, 9)
  })

  test('medidas degeneradas no rompen: siempre hay al menos un faldón', () => {
    for (const [ancho, fondo] of [[0.4, 0.3], [1, 30], [30, 1], [3, 3]]) {
      const plan = casa({ ancho, fondo })
      expect(plan.faldones.length).toBeGreaterThanOrEqual(1)
      expect(areaDe(plan)).toBeCloseTo(ancho * fondo, 6)
    }
  })
})

describe('etapasDe: la casa a lo largo de las épocas', () => {
  const casaVieja = { estilo: MODERNO, pisos: 3, semilla: 8, nace: 1, muere: 0 } // "techos" trae lo de la última época
  const byte = (estilo, pisos) => estilo + 16 * pisos

  test('sin historia, una sola etapa con lo que dice el techo', () => {
    expect(etapasDe({ estilo: COLONIAL, pisos: 1, semilla: 3, nace: 2, muere: 4 })).toEqual([
      { estilo: COLONIAL, pisos: 1, nace: 2, muere: 4, conAlero: true, conPretil: false },
    ])
    expect(etapasDe({ estilo: REPUBLICANO, pisos: 2, semilla: 3 })[0]).toMatchObject({ nace: 0, muere: 0, conAlero: false, conPretil: true })
  })

  test('cambiar de fachada (colonial → republicana) no parte la casa: una etapa con alero y con pretil', () => {
    const h = [0, byte(COLONIAL, 1), byte(COLONIAL, 1), byte(REPUBLICANO, 1), byte(REPUBLICANO, 1), byte(GUZMANCISTA, 1)]
    expect(etapasDe({ ...casaVieja, estilo: GUZMANCISTA, pisos: 1 }, h)).toEqual([
      { estilo: COLONIAL, pisos: 1, nace: 1, muere: 0, conAlero: true, conPretil: true },
    ])
  })

  test('cambiar de pisos o de cubierta sí: cada etapa con su vida, una detrás de la otra', () => {
    const h = [0, byte(COLONIAL, 1), byte(COLONIAL, 1), byte(REPUBLICANO, 1), byte(REPUBLICANO, 2), byte(MODERNO, 3)]
    expect(etapasDe(casaVieja, h)).toEqual([
      { estilo: COLONIAL, pisos: 1, nace: 1, muere: 4, conAlero: true, conPretil: true },
      { estilo: REPUBLICANO, pisos: 2, nace: 4, muere: 5, conAlero: false, conPretil: true },
      { estilo: MODERNO, pisos: 3, nace: 5, muere: 0, conAlero: true, conPretil: false },
    ])
  })

  test('la última etapa muere cuando muere la casa, y lo de antes de nacer no cuenta', () => {
    const h = [byte(MODERNO, 4), byte(COLONIAL, 1), byte(COLONIAL, 1), byte(COLONIAL, 2), byte(MODERNO, 4), byte(MODERNO, 4)]
    expect(etapasDe({ estilo: COLONIAL, pisos: 2, semilla: 1, nace: 1, muere: 4 }, h)).toEqual([
      { estilo: COLONIAL, pisos: 1, nace: 1, muere: 3, conAlero: true, conPretil: false },
      { estilo: COLONIAL, pisos: 2, nace: 3, muere: 4, conAlero: true, conPretil: false },
    ])
  })

  test('lo público pasa de teja a azotea en 1889: otra etapa aunque el estilo no cambie', () => {
    const h = Array(6).fill(byte(PUBLICO, 2))
    expect(etapasDe({ estilo: PUBLICO, pisos: 2, semilla: 1, nace: 1, muere: 0 }, h).map((e) => [e.nace, e.muere])).toEqual([[1, 3], [3, 0]])
  })

  test('una época sin pisos en la historia toma los del techo', () => {
    const h = [0, 0, 0, 0, 0, byte(COLONIAL, 0)]
    expect(etapasDe({ estilo: COLONIAL, pisos: 2, semilla: 1, nace: 5, muere: 0 }, h)[0].pisos).toBe(2)
  })
})
