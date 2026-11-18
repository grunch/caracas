import { describe, test, expect } from 'vitest'
import {
  codificarArboles, naceArbol, casasQueMueren, techosQueQuedan, bajoUnTecho, desdeEnCrece, desdeDelEntorno, dentroOCerca,
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
