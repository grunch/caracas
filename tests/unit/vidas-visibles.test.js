import { describe, test, expect } from 'vitest'
import { vidasVisibles } from '../../tools/vidas-visibles.mjs'

const rect = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y1, x0, y1]

describe('vidasVisibles: la vida de cada casa con los hitos puestos, como la ve el visor', () => {
  const datos = {
    vertices: new Float32Array([...rect(0, 0, 10, 10), ...rect(100, 0, 110, 10)]),
    techos: new Uint32Array([0, 4, 0, 1, 4, 4, 0, 2]),
    vida: new Uint32Array([1 + 8 * 0, 2 + 8 * 5]),
  }
  test('sin hitos, la vida empaquetada como [nace, muere]', () => {
    expect(vidasVisibles(datos, [])).toEqual([[1, 0], [2, 5]])
  })
  test('una casa bajo la zona de un hito en pie no vive mientras el hito está', () => {
    const hito = { nace: 1, muere: 0, suprime: [[[-1, -1], [11, -1], [11, 11], [-1, 11]]] }
    const [primera, segunda] = vidasVisibles(datos, [hito])
    expect(primera[0] === primera[1] || primera[0] > 5).toBe(true)   // no vive en ninguna época
    expect(segunda).toEqual([2, 5])
  })
})
