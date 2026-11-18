import { describe, test, expect } from 'vitest'
import {
  codificarArboles, naceArbol, esDePlaza, naceEnPlaza, casasQueMueren, techosQueQuedan, bajoUnTecho, desdeEnCrece, desdeDelEntorno, dentroOCerca, arbolesDePatio,
} from '../../tools/arboles-lib.mjs'
import { decodificarArboles } from '../../src/arboles.js'

const comoArrayBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)

describe('codificarArboles ⇄ decodificarArboles', () => {
  test('ida y vuelta: x, y en píxeles enteros, radio en dm, nace', () => {
    // Arrange
    const arboles = [{ x: 3009.4, y: 1629.6, r: 7.4, nace: 0 }, { x: 18286.1, y: 14066.7, r: 9.2, nace: 4 }]
    // Act
    const buf = codificarArboles(arboles, 0.5)
    const d = decodificarArboles(comoArrayBuffer(buf))
    // Assert
    expect(buf.byteLength).toBe(16)
    expect(d.n).toBe(2)
    expect([...d.x]).toEqual([3009, 18286])
    expect([...d.y]).toEqual([1630, 14067])
    expect(d.radio[0]).toBeCloseTo(3.7, 5)
    expect(d.radio[1]).toBeCloseTo(4.6, 5)
    expect([...d.nace]).toEqual([0, 4])
  })

  test('rechaza coordenadas fuera de Uint16 y radios fuera de rango', () => {
    expect(() => codificarArboles([{ x: 70000, y: 1, r: 5, nace: 0 }], 0.5)).toThrow(/fuera/)
    expect(() => codificarArboles([{ x: 1, y: 1, r: 0, nace: 0 }], 0.5)).toThrow(/radio/)
  })

  test('un buffer que no es múltiplo de 8 bytes es un error', () => {
    expect(() => decodificarArboles(new ArrayBuffer(7))).toThrow(/8 bytes/)
  })
})

describe('desdeEnCrece', () => {
  // 2×1 celdas de 8 m (16 px a 0,5 m/px), RGB: R = "desde cuándo" (E = 6: 255 época 0, 0 nunca)
  const crece = { datos: new Uint8Array([255, 0, 0, 0, 0, 0]), cols: 2, rows: 1, canales: 3, celdaPx: 16, etapas: 6 }

  test('lee la época de la celda que contiene el punto', () => {
    expect(desdeEnCrece(crece, 3, 3)).toBe(0)
  })

  test('nunca edificado devuelve Infinity; fuera de la imagen también', () => {
    expect(desdeEnCrece(crece, 20, 3)).toBe(Infinity)
    expect(desdeEnCrece(crece, 100, 300)).toBe(Infinity)
  })
})

describe('desdeDelEntorno', () => {
  // 3×1 celdas: época 1 · nunca · época 4 (R = 255·(1 − e/6))
  const crece = { datos: new Uint8Array([213, 0, 0, 0, 0, 0, 85, 0, 0]), cols: 3, rows: 1, canales: 3, celdaPx: 16, etapas: 6 }

  test('un jardín nace con lo último que se edificó alrededor (el patio, con su casa)', () => {
    expect(desdeDelEntorno(crece, 20, 3, 1)).toBe(4)
    expect(desdeDelEntorno(crece, 3, 3, 0)).toBe(1)
  })

  test('sin nada edificado alrededor: Infinity', () => {
    expect(desdeDelEntorno(crece, 20, 3, 0)).toBe(Infinity)
  })
})

describe('dentroOCerca', () => {
  const cuadrado = [0, 0, 10, 0, 10, 10, 0, 10]
  test('adentro, cerca del borde y lejos', () => {
    expect(dentroOCerca(cuadrado, 5, 5, 0)).toBe(true)
    expect(dentroOCerca(cuadrado, 12, 5, 3)).toBe(true)
    expect(dentroOCerca(cuadrado, 15, 5, 3)).toBe(false)
  })
})

describe('casasQueMueren', () => {
  test('saca solo los techos con muere > 0, con su anillo en píxeles', () => {
    const vertices = new Float32Array([0, 0, 10, 0, 10, 10, 20, 20, 30, 20, 30, 30])
    const techos = new Uint32Array([0, 3, 0, 1, 3, 3, 0, 2])
    const vida = new Uint32Array([5 + 8 * 0, 0 + 8 * 2])
    expect(casasQueMueren({ vertices, techos, vida })).toEqual([{ anillo: [20, 20, 30, 20, 30, 30], muere: 2 }])
    expect(casasQueMueren({ vertices, techos })).toEqual([])
  })
})

describe('techosQueQuedan y bajoUnTecho', () => {
  const vertices = new Float32Array([0, 0, 10, 0, 10, 10, 0, 10, 200, 200, 230, 200, 230, 230, 200, 230])
  const techos = new Uint32Array([0, 4, 0, 1, 4, 4, 0, 2])

  test('los techos que nunca mueren (o todos, si no hay vida)', () => {
    expect(techosQueQuedan({ vertices, techos, vida: new Uint32Array([1, 8 * 3]) })).toEqual([[0, 0, 10, 0, 10, 10, 0, 10]])
    expect(techosQueQuedan({ vertices, techos })).toHaveLength(2)
  })

  test('un árbol con el centro bajo un techo que queda en pie se descarta; al lado, no', () => {
    const bajo = bajoUnTecho(techosQueQuedan({ vertices, techos }), 64)
    expect(bajo(5, 5)).toBe(true)
    expect(bajo(215, 215)).toBe(true)
    expect(bajo(12, 5)).toBe(false)
    expect(bajo(100, 100)).toBe(false)
  })
})

describe('naceArbol', () => {
  const casas = [{ anillo: [0, 0, 10, 0, 10, 10, 0, 10], muere: 3 }]

  test('fuera de lo edificado (quebradas, haciendas) existe desde siempre', () => {
    expect(naceArbol({ x: 100, y: 100, r: 4 }, { desde: () => Infinity, casas })).toBe(0)
  })

  test('en lo edificado, nace con su barrio', () => {
    expect(naceArbol({ x: 100, y: 100, r: 4 }, { desde: () => 4, casas })).toBe(4)
  })

  test('nunca aparece dentro de una casa que todavía está en pie: espera a que muera', () => {
    expect(naceArbol({ x: 5, y: 5, r: 4 }, { desde: () => 0, casas })).toBe(3)
    expect(naceArbol({ x: 5, y: 5, r: 4 }, { desde: () => 5, casas })).toBe(5)
  })
})

describe('esDePlaza: los árboles de plaza y de calle no son coloniales', () => {
  // 1 calle · 2 patio · 3 edificado · 5 verde · 8 cerro (tools/geo/segmentar_clases.py)
  const medidas = { pasoPx: 2, maxPx: 60 }
  const cantero = (x, y) => Math.hypot(x - 100, y - 100) < 10

  test('un cantero rodeado de calle (una plaza) sí', () => {
    const plaza = (x, y) => (cantero(x, y) ? 5 : 1)
    expect(esDePlaza(plaza, 100, 100, medidas)).toBe(true)
  })

  test('un jardín de patio, rodeado de patio y casas, no', () => {
    const patio = (x, y) => (cantero(x, y) ? 5 : x < 100 ? 2 : 3)
    expect(esDePlaza(patio, 100, 100, medidas)).toBe(false)
  })

  test('el contorno de tinta del cantero (que se lee como cerro) no cuenta: se sigue mirando', () => {
    const plaza = (x, y) => (cantero(x, y) ? 5 : Math.hypot(x - 100, y - 100) < 14 ? 8 : 1)
    expect(esDePlaza(plaza, 100, 100, medidas)).toBe(true)
  })

  test('un árbol del campo, sin ciudad alrededor, no', () => {
    expect(esDePlaza(() => 8, 100, 100, medidas)).toBe(false)
  })

  test('naceEnPlaza: en plaza no antes de 1889 (época 3); los demás y los que nacen después, igual', () => {
    expect(naceEnPlaza(0, true)).toBe(3)
    expect(naceEnPlaza(4, true)).toBe(4)
    expect(naceEnPlaza(1, false)).toBe(1)
  })
})

describe('arbolesDePatio', () => {
  const COLONIAL = 0, MODERNO = 4
  // casas de patio de 12 × 40 m (24 × 80 px), una al lado de la otra, con un patio y un solar cada una
  const marco = (techo, ox, primera) => [techo, ox, 100, 1, 0, 24, 80, 0, 14, primera, 3]
  const alasDe = () => [2, 0, 0, 24, 14, /* patio */ 0, 8, 14, 24, 26, /* solar */ 1, 0, 40, 24, 80]
  const ciudad = (cuantas, historia = null) => ({
    techos: Uint32Array.from(Array.from({ length: cuantas }, (_, k) => [k * 4, 4, (COLONIAL << 8) | 1, 100 + k]).flat()),
    vida: Uint32Array.from(Array.from({ length: cuantas }, () => 1)),
    marcos: Float32Array.from(Array.from({ length: cuantas }, (_, k) => marco(k, 100 + 24 * k, 3 * k)).flat()),
    alas: Float32Array.from(Array.from({ length: cuantas }, alasDe).flat()),
    ...(historia ? { historia } : {}),
  })

  test('planta árboles en algunos patios y en más solares, dentro de su patio o su solar, y es determinista', () => {
    const arboles = arbolesDePatio(ciudad(400), 0.5)
    expect(arbolesDePatio(ciudad(400), 0.5)).toEqual(arboles)
    const enSolar = arboles.filter((a) => a.y > 140)
    const enPatio = arboles.filter((a) => a.y <= 140)
    expect(enPatio.length).toBeGreaterThan(400 * 0.2)
    expect(enPatio.length).toBeLessThan(400 * 0.4)
    expect(enSolar.length).toBeGreaterThan(400 * 0.5)
    expect(enSolar.length).toBeLessThan(400 * 0.7)
    for (const a of arboles) {
      const u = (a.x - 100) % 24
      const [v0, v1, u0, u1] = a.y > 140 ? [140, 180, 0, 24] : [114, 126, 8, 24]
      expect(a.y - a.r).toBeGreaterThanOrEqual(v0 - 1e-6)
      expect(a.y + a.r).toBeLessThanOrEqual(v1 + 1e-6)
      expect(u - a.r).toBeGreaterThanOrEqual(u0 - 1e-6)
      expect(u + a.r).toBeLessThanOrEqual(u1 + 1e-6)
      expect(a.nace).toBe(1)
      expect(a.muere).toBe(0)
    }
  })

  test('el árbol muere cuando la casa deja de ser de patio; la que nunca lo fue no tiene', () => {
    const b = (estilo) => estilo + 16
    const seVuelveModerna = Uint8Array.from(Array.from({ length: 200 }, () => [b(COLONIAL), b(COLONIAL), b(COLONIAL), b(COLONIAL), b(MODERNO), b(MODERNO)]).flat())
    const arboles = arbolesDePatio(ciudad(200, seVuelveModerna), 0.5)
    expect(arboles.length).toBeGreaterThan(50)
    expect(arboles.every((a) => a.nace === 1 && a.muere === 4)).toBe(true)
    const siempreModerna = Uint8Array.from(Array.from({ length: 200 }, () => Array(6).fill(b(MODERNO))).flat())
    expect(arbolesDePatio(ciudad(200, siempreModerna), 0.5)).toEqual([])
  })

  test('sin marcos (datos viejos) no hay árboles de patio', () => {
    expect(arbolesDePatio({ techos: new Uint32Array(4) }, 0.5)).toEqual([])
  })
})
