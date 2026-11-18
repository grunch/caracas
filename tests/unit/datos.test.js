import { describe, test, expect } from 'vitest'
import { pendientes, verificarConteos } from '../../tools/datos-lib.mjs'

const pasos = [
  { id: 'mosaico', entradas: ['hoja.tif'], salidas: ['mosaico.tif'] },
  { id: 'segmentar', entradas: ['mosaico.tif'], salidas: ['clases.png'] },
  { id: 'vectorizar', entradas: ['clases.png'], salidas: ['ciudad.json'] },
]

describe('pendientes', () => {
  test('todo al día: nada que correr', () => {
    const t = { 'hoja.tif': 1, 'mosaico.tif': 2, 'clases.png': 3, 'ciudad.json': 4 }
    expect(pendientes(pasos, t)).toEqual([])
  })

  test('una salida que falta corre ese paso y todo lo que depende de él', () => {
    const t = { 'hoja.tif': 1, 'mosaico.tif': 2, 'ciudad.json': 4 }
    expect(pendientes(pasos, t)).toEqual(['segmentar', 'vectorizar'])
  })

  test('una entrada más nueva que la salida la vuelve vieja', () => {
    const t = { 'hoja.tif': 1, 'mosaico.tif': 5, 'clases.png': 3, 'ciudad.json': 4 }
    expect(pendientes(pasos, t)).toEqual(['segmentar', 'vectorizar'])
  })

  test('--desde fuerza ese paso y los siguientes', () => {
    const t = { 'hoja.tif': 1, 'mosaico.tif': 2, 'clases.png': 3, 'ciudad.json': 4 }
    expect(pendientes(pasos, t, { desde: 'segmentar' })).toEqual(['segmentar', 'vectorizar'])
  })

  test('--forzar corre todo (pero las entradas de origen tienen que existir)', () => {
    const t = { 'hoja.tif': 1, 'mosaico.tif': 2, 'clases.png': 3, 'ciudad.json': 4 }
    expect(pendientes(pasos, t, { forzar: true })).toEqual(['mosaico', 'segmentar', 'vectorizar'])
    expect(() => pendientes(pasos, {}, { forzar: true })).toThrow(/hoja\.tif/)
  })

  test('una entrada de origen que falta es un error claro', () => {
    expect(() => pendientes(pasos, {})).toThrow(/hoja\.tif/)
  })

  test('--desde con un paso inexistente es un error', () => {
    expect(() => pendientes(pasos, {}, { desde: 'nada' })).toThrow(/nada/)
  })
})

describe('verificarConteos', () => {
  const esperados = { techos: { valor: 58954, tolerancia: 0.02 }, manzanas: { valor: 7851, tolerancia: 0.02 } }

  test('dentro de la tolerancia: sin errores', () => {
    expect(verificarConteos({ techos: 59500, manzanas: 7800 }, esperados)).toEqual([])
  })

  test('fuera de la tolerancia o ausente: un error por conteo', () => {
    const errores = verificarConteos({ techos: 40000 }, esperados)
    expect(errores).toHaveLength(2)
    expect(errores[0]).toMatch(/techos.*40000.*58954/)
    expect(errores[1]).toMatch(/manzanas/)
  })
})

import { salidasDeTeselas, firmasCambiadas } from '../../tools/datos-lib.mjs'

describe('código del paso', () => {
  const al_dia = { 'clases.png': 1, 'ciudad.json': 4 }
  const paso = { id: 'vectorizar', entradas: ['clases.png'], salidas: ['ciudad.json'] }

  test('si cambió el código de un paso, corre ese paso y los que dependen de él', () => {
    const pasos2 = [paso, { id: 'empacar', entradas: ['ciudad.json'], salidas: ['ciudad.pak'] }]
    const t = { ...al_dia, 'ciudad.pak': 5 }
    expect(pendientes(pasos2, t, { codigoCambiado: new Set(['vectorizar']) })).toEqual(['vectorizar', 'empacar'])
  })

  test('firmasCambiadas compara la firma actual del código con la guardada', () => {
    expect([...firmasCambiadas({ a: 'h1', b: 'h2', c: 'h3' }, { a: 'h1', b: 'viejo' })]).toEqual(['b', 'c'])
  })
})

describe('salidasDeTeselas', () => {
  test('una tesela por celda de la grilla de laminas.json', () => {
    expect(salidasDeTeselas({ cols: 2, rows: 2 })).toEqual([
      'public/plano/f/0-0.webp', 'public/plano/f/1-0.webp', 'public/plano/f/0-1.webp', 'public/plano/f/1-1.webp',
    ])
  })

  test('sin laminas.json todavía no hay teselas que declarar', () => {
    expect(salidasDeTeselas(null)).toEqual([])
  })
})
