import { describe, test, expect } from 'vitest'
import { cajaAlrededor, recortarCiudad, recortarArboles, reducirRelieve, nivelesReducidos, teselaToca } from '../../tools/fixture-lib.mjs'

describe('cajaAlrededor', () => {
  test('un cuadrado de lado `lado_m` alrededor de la plaza, en píxeles del plano', () => {
    expect(cajaAlrededor([1000, 2000], 0.5, 1000)).toEqual({ x0: 0, y0: 1000, x1: 2000, y1: 3000 })
  })
})

describe('recortarCiudad', () => {
  // tres casas: la 0 y la 2 adentro de la caja (0..100), la 1 afuera; la 2 con su marco y dos alas
  const cuadrado = (x, y) => [x, y, x + 10, y, x + 10, y + 10, x, y + 10]
  const ciudad = () => ({
    vertices: [...cuadrado(10, 10), ...cuadrado(500, 500), ...cuadrado(60, 60)],
    techos: [[0, 4, 1, 0, 11], [4, 4, 1, 0, 22], [8, 4, 2, 0, 33]],
    vida: [[1, 0], [2, 0], [3, 0]],
    historia: [[1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2], [3, 3, 3, 3, 3, 3]],
    esquinas: [0, 1, 1],
    marcos: [[1, 500, 500, 1, 0, 10, 10, 0, 8, 0, 1], [2, 60, 60, 1, 0, 10, 10, 0, 8, 1, 2]],
    alas: [[2, 0, 0, 10, 8], [2, 0, 0, 10, 8], [1, 0, 8, 10, 10]],
    manzanas: 2,
  })

  test('se queda con las casas de la caja, con sus vértices corridos y sus listas por techo', () => {
    const r = recortarCiudad(ciudad(), { x0: 0, y0: 0, x1: 100, y1: 100 })
    expect(r.techos).toEqual([[0, 4, 1, 0, 11], [4, 4, 2, 0, 33]])
    expect(r.vertices).toEqual([...cuadrado(10, 10), ...cuadrado(60, 60)])
    expect(r.vida).toEqual([[1, 0], [3, 0]])
    expect(r.historia).toEqual([[1, 1, 1, 1, 1, 1], [3, 3, 3, 3, 3, 3]])
    expect(r.esquinas).toEqual([0, 1])
  })

  test('los marcos apuntan al techo nuevo y las alas quedan juntas', () => {
    const r = recortarCiudad(ciudad(), { x0: 0, y0: 0, x1: 100, y1: 100 })
    expect(r.marcos).toEqual([[1, 60, 60, 1, 0, 10, 10, 0, 8, 0, 2]])
    expect(r.alas).toEqual([[2, 0, 0, 10, 8], [1, 0, 8, 10, 10]])
  })

  test('no toca la ciudad original', () => {
    const c = ciudad()
    recortarCiudad(c, { x0: 0, y0: 0, x1: 100, y1: 100 })
    expect(c.techos).toHaveLength(3)
  })
})

describe('recortarArboles', () => {
  test('se queda con los registros de 8 bytes cuyo (x, y) cae en la caja', () => {
    const buf = new Uint8Array(24)
    const v = new DataView(buf.buffer)
    ;[[10, 10], [500, 10], [50, 90]].forEach(([x, y], i) => { v.setUint16(i * 8, x, true); v.setUint16(i * 8 + 2, y, true); v.setUint16(i * 8 + 4, 30 + i, true) })
    const r = recortarArboles(buf, { x0: 0, y0: 0, x1: 100, y1: 100 })
    expect(r.byteLength).toBe(16)
    const w = new DataView(r.buffer, r.byteOffset)
    expect([w.getUint16(0, true), w.getUint16(8, true), w.getUint16(12, true)]).toEqual([10, 50, 32])
  })
})

describe('reducirRelieve', () => {
  test('la mitad de ancho y de alto, cada celda con el promedio de las cuatro', () => {
    const w = 4, h = 2
    const buf = new Uint8Array(4 + 2 * w * h)
    const v = new DataView(buf.buffer)
    v.setUint16(0, w, true); v.setUint16(2, h, true)
    ;[10, 20, 30, 50, 30, 40, 70, 90].forEach((dm, i) => v.setUint16(4 + 2 * i, dm, true))
    const r = new DataView(reducirRelieve(buf, 2).buffer)
    expect([r.getUint16(0, true), r.getUint16(2, true)]).toEqual([2, 1])
    expect([r.getUint16(4, true), r.getUint16(6, true)]).toEqual([25, 60])
  })
})

describe('nivelesReducidos', () => {
  test('cada plano de época con un solo nivel, del lado de la imagen reducida', () => {
    const epocas = { planos: [{ año: 1772, niveles: [{ url: 'plano/1772/chico.webp', lado: 2048 }, { url: 'plano/1772/medio.webp', lado: 4096 }] }] }
    expect(nivelesReducidos(epocas, 512)).toEqual({ planos: [{ año: 1772, niveles: [{ url: 'plano/1772/chico.webp', lado: 512 }] }] })
  })
})

describe('teselaToca', () => {
  test('la tesela toca la caja si se cruzan, aunque sea por un borde de adentro', () => {
    const caja = { x0: 2500, y0: 100, x1: 3500, y1: 900 }
    expect(teselaToca(0, 0, 3072, caja)).toBe(true)
    expect(teselaToca(1, 0, 3072, caja)).toBe(true)
    expect(teselaToca(2, 0, 3072, caja)).toBe(false)
    expect(teselaToca(0, 1, 3072, caja)).toBe(false)
  })
})
