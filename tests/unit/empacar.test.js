import { describe, test, expect } from 'vitest'
import { partesDeCiudad } from '../../tools/empacar-lib.mjs'
import { desempacarTecho } from '../../src/ciudad.js'

const json = { vertices: [0, 0, 10, 0, 10, 10, 1.5, 2.5, 4, 2, 3, 3], techos: [[0, 3, 2, 0, 99], [3, 3, 1, 9, 7]], manzanas: 1 }

describe('partesDeCiudad', () => {
  test('convierte el JSON del vectorizador a las partes del .pak', () => {
    const p = partesDeCiudad(json)
    expect(p.vertices.registro).toBe(8)
    expect(Array.from(p.vertices.datos)).toEqual([0, 0, 10, 0, 10, 10, 1.5, 2.5, 4, 2, 3, 3])
    expect(p.techos.registro).toBe(16)
    const t = Array.from(p.techos.datos)
    expect(t.slice(0, 2)).toEqual([0, 3])
    expect(desempacarTecho(t[2])).toEqual({ pisos: 2, estilo: 0 })
    expect(t[3]).toBe(99)
    expect(desempacarTecho(t[6])).toEqual({ pisos: 1, estilo: 9 })
  })

  test('rechaza techos que apuntan fuera de los vértices', () => {
    expect(() => partesDeCiudad({ ...json, techos: [[4, 3, 1, 0, 0]] })).toThrow(/vértices/)
  })

  test('sin "vida" no agrega la parte', () => {
    expect(partesDeCiudad(json).vida).toBeUndefined()
  })

  test('empaca la vida de cada techo como nace + 8·muere (Uint32, registro 4)', () => {
    const p = partesDeCiudad({ ...json, vida: [[0, 1], [3, 0]] })
    expect(p.vida.registro).toBe(4)
    expect(p.vida.datos).toBeInstanceOf(Uint32Array)
    expect(Array.from(p.vida.datos)).toEqual([8, 3])
  })

  test('rechaza una vida que no acompaña a los techos o que muere antes de nacer', () => {
    expect(() => partesDeCiudad({ ...json, vida: [[0, 0]] })).toThrow(/vida/)
    expect(() => partesDeCiudad({ ...json, vida: [[2, 1], [0, 0]] })).toThrow(/muere/)
    expect(() => partesDeCiudad({ ...json, vida: [[8, 0], [0, 0]] })).toThrow(/época/)
  })

  test('rechaza épocas fuera de las siete vistas (0…6), sin usar el centinela7', () => {
    for (const malo of [[7, 0], [0, 7], [-1, 0]]) {
      expect(() => partesDeCiudad({ ...json, vida: [malo, [0, 0]] })).toThrow(/épocas 0…6/)
    }
    expect(Array.from(partesDeCiudad({ ...json, vida: [[6, 0], [0, 6]] }).vida.datos)).toEqual([6, 48])
  })

  test('rechaza épocas que no son enteros', () => {
    for (const malo of [['2', 3], [1.5, 0], [0, '3'], [null, 0], [NaN, 0]]) {
      expect(() => partesDeCiudad({ ...json, vida: [malo, [0, 0]] })).toThrow(/enter/)
    }
    expect(Array.from(partesDeCiudad({ ...json, vida: [[2, 3], [0, 0]] }).vida.datos)).toEqual([26, 0])
  })

  test('rechaza una "vida" presente que no es una lista', () => {
    for (const malo of [null, {}, 'x', 3]) {
      expect(() => partesDeCiudad({ ...json, vida: malo })).toThrow(/vida/)
    }
  })

  test('rechaza una cantidad impar de coordenadas', () => {
    expect(() => partesDeCiudad({ ...json, vertices: [1, 2, 3] })).toThrow(/pares/)
  })
})

describe('historia: el estilo y los pisos de cada techo en cada época', () => {
  const historia = [[16, 16, 17, 17, 34, 51], [57, 57, 57, 57, 57, 57]]

  test('sin "historia" no agrega la parte', () => {
    expect(partesDeCiudad(json).historia).toBeUndefined()
  })

  test('empaca un byte por época (estilo + 16·pisos): Uint8, registro 6', () => {
    const p = partesDeCiudad({ ...json, historia })
    expect(p.historia.registro).toBe(6)
    expect(p.historia.datos).toBeInstanceOf(Uint8Array)
    expect(Array.from(p.historia.datos)).toEqual(historia.flat())
  })

  test('rechaza una historia que no acompaña a los techos o que no trae seis épocas', () => {
    expect(() => partesDeCiudad({ ...json, historia: [historia[0]] })).toThrow(/historia/)
    expect(() => partesDeCiudad({ ...json, historia: [historia[0], [57, 57]] })).toThrow(/6 épocas/)
    expect(() => partesDeCiudad({ ...json, historia: 'x' })).toThrow(/historia/)
  })

  test('rechaza bytes que no son enteros de 0 a 255 o que no tienen pisos', () => {
    for (const malo of [256, -1, 1.5, '17', null, 3]) {
      expect(() => partesDeCiudad({ ...json, historia: [[16, 16, 16, 16, 16, malo], historia[1]] })).toThrow(/historia/)
    }
  })

  test('va y vuelve por el .pak, y un visor anterior saltea la parte', async () => {
    const { codificarPak } = await import('../../tools/pak.mjs')
    const { decodificarPak } = await import('../../src/pak.js')
    const { gunzipSync } = await import('node:zlib')
    const crudo = gunzipSync(codificarPak(partesDeCiudad({ ...json, vida: [[0, 1], [3, 0]], historia })))
    const buffer = () => crudo.buffer.slice(crudo.byteOffset, crudo.byteOffset + crudo.byteLength)
    const tipos = { vertices: Float32Array, techos: Uint32Array, vida: Uint32Array }
    const leido = decodificarPak(buffer(), { ...tipos, historia: Uint8Array })
    expect(Array.from(leido.historia)).toEqual(historia.flat())
    const avisos = []
    const sinHistoria = decodificarPak(buffer(), tipos, (m) => avisos.push(m))
    expect(sinHistoria.historia).toBeUndefined()
    expect(Array.from(sinHistoria.vida)).toEqual([8, 3])
    expect(avisos.join()).toMatch(/historia/)
  })
})
