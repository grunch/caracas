import { describe, test, expect } from 'vitest'
import { DataUtils, HalfFloatType, RedFormat } from 'three'
import {
  decodificarRelieve, muestrear, crearRelieve, hinchado, alturaSuelo, texturaRelieve, uniformsRelieve,
} from '../../src/relieve.js'

/** relieve.bin sintético: Uint16 LE [w, h, alturas en dm…] */
function binario(w, h, dm) {
  const b = new ArrayBuffer(2 * (2 + w * h))
  const v = new DataView(b)
  v.setUint16(0, w, true)
  v.setUint16(2, h, true)
  dm.forEach((d, i) => v.setUint16(4 + 2 * i, d, true))
  return b
}

// hoja de 300×200 m con la plaza en el centro: x −150…150, z −100…100
const hoja = { x0: -150, z0: -100, ancho: 300, alto: 200 }

describe('decodificarRelieve', () => {
  test('lee ancho, alto y las alturas en metros', () => {
    const r = decodificarRelieve(binario(3, 2, [9000, 9013, 27500, 0, 100, 200]))
    expect(r.w).toBe(3)
    expect(r.h).toBe(2)
    expect(Array.from(r.alturas)).toEqual([900, 901.3, 2750, 0, 10, 20].map((m) => Math.fround(m)))
  })

  test('rechaza un buffer truncado', () => {
    expect(() => decodificarRelieve(new ArrayBuffer(2))).toThrow(/truncado/)
    expect(() => decodificarRelieve(binario(3, 2, [1, 2, 3]).slice(0, 10))).toThrow(/truncado/)
  })

  test('rechaza dimensiones nulas', () => {
    expect(() => decodificarRelieve(binario(0, 2, []))).toThrow(/dimensiones/)
  })
})

describe('muestrear', () => {
  const datos = { w: 2, h: 2, alturas: new Float32Array([0, 10, 20, 30]) }

  test('bilineal entre centros de celda', () => {
    expect(muestrear(datos, 0.5, 0.5)).toBeCloseTo(15)
    expect(muestrear(datos, 0.25, 0.25)).toBeCloseTo(0) // centro de la celda (0,0)
    expect(muestrear(datos, 0.75, 0.25)).toBeCloseTo(10)
    expect(muestrear(datos, 0.5, 0.25)).toBeCloseTo(5)
  })

  test('fuera de la hoja repite el borde', () => {
    expect(muestrear(datos, -1, -1)).toBeCloseTo(0)
    expect(muestrear(datos, 2, 2)).toBeCloseTo(30)
  })
})

describe('crearRelieve', () => {
  // 3×2 celdas de 100 m; la plaza (0, 0) cae en el centro de la celda del medio de la fila... entre filas
  const datos = { w: 3, h: 2, alturas: new Float32Array([920, 930, 940, 900, 910, 920]) }
  const r = crearRelieve(datos, hoja)

  test('la referencia es la altura en la plaza y alturaEn es relativa a ella', () => {
    expect(r.referencia).toBeCloseTo(920) // promedio de 930 y 910
    expect(r.alturaEn(0, 0)).toBeCloseTo(0)
    expect(r.alturaEn(0, -50)).toBeCloseTo(10) // centro de la celda norte del medio
    expect(r.alturaEn(100, 50)).toBeCloseTo(0) // celda sureste: 920 − 920
  })

  test('el norte (z negativa) es la fila 0', () => {
    expect(r.alturaEn(-100, -50)).toBeCloseTo(0)
    expect(r.alturaEn(-100, 50)).toBeCloseTo(-20)
  })
})

describe('hinchado y alturaSuelo', () => {
  test('el suelo se hincha con la ola: 0 antes del frente, 1 después', () => {
    expect(hinchado(500, 0, 260)).toBe(0)
    expect(hinchado(500, 500, 260)).toBe(0)
    expect(hinchado(500, 760, 260)).toBe(1)
    expect(hinchado(500, 630, 260)).toBeCloseTo(0.5)
  })

  test('alturaSuelo = relieve × exageración × hinchado', () => {
    const r = { alturaEn: () => 100 }
    expect(alturaSuelo(r, 30, 40, { ola: 0, anchoOla: 260, exageracion: 1.3 })).toBe(0)
    expect(alturaSuelo(r, 30, 40, { ola: 1000, anchoOla: 260, exageracion: 1.3 })).toBeCloseTo(130)
    expect(alturaSuelo(null, 30, 40, { ola: 1000, anchoOla: 260, exageracion: 1 })).toBe(0)
  })
})

describe('texturaRelieve', () => {
  test('half float en el canal R, relativo a la plaza', () => {
    const r = crearRelieve({ w: 3, h: 2, alturas: new Float32Array([920, 930, 940, 900, 910, 920]) }, hoja)
    const t = texturaRelieve(r)
    expect(t.type).toBe(HalfFloatType)
    expect(t.format).toBe(RedFormat)
    expect(t.image.width).toBe(3)
    expect(t.image.height).toBe(2)
    expect(Array.from(t.image.data, (h) => DataUtils.fromHalfFloat(h))).toEqual([0, 10, 20, -20, -10, 0])
  })

  test('uniformsRelieve arranca plano (textura de 1×1 en cero) con la hoja y exageración 1', () => {
    const U = uniformsRelieve(hoja)
    expect(U.uExageracion.value).toBe(1)
    expect(U.uRelieveHoja.value.toArray()).toEqual([-150, -100, 300, 200])
    expect(DataUtils.fromHalfFloat(U.tRelieve.value.image.data[0])).toBe(0)
  })
})
