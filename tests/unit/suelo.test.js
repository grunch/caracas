import { describe, test, expect } from 'vitest'
import { rgbaDeClase, tablaSuelo, conPatios } from '../../tools/suelo-lib.mjs'

describe('rgbaDeClase', () => {
  test.each([
    ['calle', 1, [0, 0, 0, 0]],
    ['patio', 2, [0, 0, 0, 255]],
    ['edificado', 3, [0, 0, 255, 255]],
    ['publico', 4, [0, 0, 255, 255]],
    ['verde', 5, [0, 255, 0, 255]],
    ['cultivo', 6, [0, 255, 0, 0]],
    ['agua', 7, [255, 0, 0, 0]],
    ['cerro', 8, [0, 0, 0, 0]],
  ])('%s (%i) → R agua · G vegetación · B edificado · A manzana', (_, clase, rgba) => {
    expect(rgbaDeClase(clase)).toEqual(rgba)
  })

  test('lo desconocido y el margen no pintan nada', () => {
    expect(rgbaDeClase(0)).toEqual([0, 0, 0, 0])
    expect(rgbaDeClase(9)).toEqual([0, 0, 0, 0])
  })
})

describe('tablaSuelo', () => {
  test('es una tabla de 256 colores RGBA lista para indexar por clase', () => {
    const t = tablaSuelo()
    expect(t).toBeInstanceOf(Uint8Array)
    expect(t.length).toBe(256 * 4)
    expect(Array.from(t.subarray(3 * 4, 3 * 4 + 4))).toEqual([0, 0, 255, 255])
    expect(Array.from(t.subarray(200 * 4, 200 * 4 + 4))).toEqual([0, 0, 0, 0])
  })
})

import sharp from 'sharp'
import { generarMascara, codificarMascara } from '../../tools/suelo-lib.mjs'

describe('generarMascara', () => {
  // 8×8 clases: mitad izquierda agua (R, A=0), mitad derecha cultivo (G, A=0)
  const ancho = 8
  const alto = 8
  const clases = Buffer.alloc(ancho * alto)
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) clases[y * ancho + x] = x < 4 ? 7 : 6

  test('al achicar, el agua y los cultivos no se pierden aunque su alfa sea 0', async () => {
    const { data, width, height } = await generarMascara({ datos: clases, ancho, alto }, 4)
    expect([width, height]).toEqual([4, 4])
    const px = (x, y) => Array.from(data.subarray((y * width + x) * 4, (y * width + x) * 4 + 4))
    expect(px(0, 0)).toEqual([255, 0, 0, 0])
    expect(px(3, 3)).toEqual([0, 255, 0, 0])
  })

  test('el WebP conserva los canales bajo alfa 0', async () => {
    const mascara = await generarMascara({ datos: clases, ancho, alto }, 4)
    const webp = await codificarMascara(mascara)
    const { data } = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    expect(data[0]).toBeGreaterThan(240) // R del agua
    expect(data[(3 * 4 + 3) * 4 + 1]).toBeGreaterThan(240) // G del cultivo
  })
})

describe('generarMascara con alfa mezclado', () => {
  test('la manzana (alfa) queda en su lugar: mitad izquierda manzana, mitad derecha calle', async () => {
    const ancho = 8
    const alto = 8
    const clases = Buffer.alloc(ancho * alto)
    for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) clases[y * ancho + x] = x < 4 ? 2 : 1 // patio | calle
    const { data, width } = await generarMascara({ datos: clases, ancho, alto }, 4)
    const alfaFila = (y) => Array.from({ length: width }, (_, x) => data[(y * width + x) * 4 + 3])
    for (let y = 0; y < 4; y++) {
      const fila = alfaFila(y)
      expect(fila[0]).toBeGreaterThan(240)
      expect(fila[3]).toBeLessThan(15)
    }
  })
})

describe('conPatios', () => {
  test('lo edificado bajo la máscara de patios pasa a patio; lo demás no cambia; no toca lo que recibe', () => {
    const clases = Uint8Array.from([3, 3, 1, 4, 5, 3])
    const patios = Uint8Array.from([255, 0, 255, 255, 255, 200])
    expect(Array.from(conPatios(clases, patios))).toEqual([2, 3, 1, 4, 5, 2])
    expect(Array.from(clases)).toEqual([3, 3, 1, 4, 5, 3])
    expect(rgbaDeClase(conPatios(clases, patios)[0])).toEqual([0, 0, 0, 255]) // manzana sin edificar: tierra de patio
  })

  test('la máscara tiene que medir lo mismo que las clases', () => {
    expect(() => conPatios(new Uint8Array(4), new Uint8Array(3))).toThrow(/mide/)
  })
})
