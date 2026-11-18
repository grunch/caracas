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

  test('rechaza una cantidad impar de coordenadas', () => {
    expect(() => partesDeCiudad({ ...json, vertices: [1, 2, 3] })).toThrow(/pares/)
  })
})
