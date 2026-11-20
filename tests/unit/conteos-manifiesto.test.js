import { describe, expect, test } from 'vitest'
import { conteosDelManifiesto, verificarConteos } from '../../tools/datos-lib.mjs'

describe('conteos del paquete y del origen', () => {
  test('el filtrado de épocas cambia el paquete sin falsificar el control de 1936', () => {
    const origen = { techos: 100, manzanas: 20, arboles: 9 }
    const antes = { ...origen }
    const informe = conteosDelManifiesto(origen, new Uint32Array(4 * 80), new Uint8Array(8 * 7))
    expect(informe).toEqual({
      conteos: { techos: 80, arboles: 7 },
      conteos_origen: { techos: 100, manzanas: 20, arboles: 9 },
    })
    expect(verificarConteos(informe.conteos_origen, { techos: { valor: 100, tolerancia: 0 } })).toEqual([])
    informe.conteos_origen.techos = 1
    expect(origen).toEqual(antes)
  })

  test('un paquete vacío tiene conteos cero, sin heredar el origen', () => {
    expect(conteosDelManifiesto({ techos: 5 }, new Uint32Array(), new Uint8Array()).conteos)
      .toEqual({ techos: 0, arboles: 0 })
  })

  test('rechaza un registro parcial en lugar de publicar conteos fraccionarios', () => {
    expect(() => conteosDelManifiesto({}, new Uint32Array(3), new Uint8Array(8))).toThrow(/techos/)
    expect(() => conteosDelManifiesto({}, new Uint32Array(4), new Uint8Array(7))).toThrow(/árboles/)
  })
})
