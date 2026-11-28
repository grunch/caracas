import { describe, it, expect } from 'vitest'
import { jsonCompacto } from '../../tools/json-compacto.mjs'

describe('JSON compacto', () => {
  const dato = { nombre: 'Avenida', tramos: [{ id: 'a', puntos: [[1, 2], [3, 4]] }, { id: 'b', puntos: [] }], nada: null, sin: undefined }

  it('se lee de vuelta igual que el JSON de siempre', () => {
    for (const ancho of [0, 20, 400]) expect(JSON.parse(jsonCompacto(dato, ancho))).toEqual(JSON.parse(JSON.stringify(dato)))
  })

  it('deja en una línea lo que entra en el ancho y abre lo demás', () => {
    expect(jsonCompacto(dato)).toBe(JSON.stringify(dato))
    const abierto = jsonCompacto(dato, 40).split('\n')
    expect(abierto).toContain(' "tramos": [')
    expect(abierto).toContain('  {"id":"a","puntos":[[1,2],[3,4]]},')
  })

  it('trata undefined y los huecos de una lista como JSON.stringify: null, también al abrirla', () => {
    const lista = [1, undefined, , () => {}, { a: undefined, b: 2 }] // eslint-disable-line no-sparse-arrays
    for (const ancho of [0, 400]) {
      const texto = jsonCompacto(lista, ancho)
      expect(JSON.parse(texto)).toEqual([1, null, null, null, { b: 2 }])
      expect(JSON.parse(texto)).toEqual(JSON.parse(JSON.stringify(lista)))
    }
    expect(jsonCompacto(undefined)).toBe('null')
  })

  it('escribe los valores sueltos como JSON', () => {
    expect(jsonCompacto('á')).toBe('"á"')
    expect(jsonCompacto(null)).toBe('null')
    expect(jsonCompacto(3.5)).toBe('3.5')
  })
})
