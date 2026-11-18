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

  test('un paso sin entradas (una descarga con caché) solo corre si falta su salida', () => {
    const conDescarga = [
      { id: 'osm', entradas: [], salidas: ['osm.json'] },
      { id: 'hoy', entradas: ['osm.json'], salidas: ['hoy.webp'] },
    ]
    expect(pendientes(conDescarga, { 'osm.json': 5, 'hoy.webp': 9 })).toEqual([])
    expect(pendientes(conDescarga, { 'hoy.webp': 9 })).toEqual(['osm', 'hoy'])
    expect(pendientes(conDescarga, { 'osm.json': 5 })).toEqual(['hoy'])
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

  test('los árboles se rehacen si cambia la segmentación o la ciudad empacada', () => {
    const conArboles = [
      { id: 'segmentar', entradas: ['mosaico.tif'], salidas: ['clases.png', 'arboles.json'] },
      { id: 'empacar', entradas: ['ciudad.json'], salidas: ['ciudad.pak'] },
      { id: 'arboles', entradas: ['arboles.json', 'ciudad.pak'], salidas: ['arboles.bin'] },
    ]
    const t = { 'mosaico.tif': 1, 'clases.png': 2, 'arboles.json': 2, 'ciudad.json': 1, 'ciudad.pak': 2, 'arboles.bin': 3 }
    expect(pendientes(conArboles, t)).toEqual([])
    expect(pendientes(conArboles, { ...t, 'ciudad.pak': 4 })).toEqual(['arboles'])
    expect(pendientes(conArboles, { ...t, 'mosaico.tif': 5 })).toEqual(['segmentar', 'arboles'])
  })

  test('una entrada opcional que falta no es error; si está, cuenta su fecha', () => {
    const conOpcional = [{ id: 'arboles', entradas: ['arboles.json'], opcionales: ['crece.png'], salidas: ['arboles.bin'] }]
    expect(pendientes(conOpcional, { 'arboles.json': 1, 'arboles.bin': 3 })).toEqual([])
    expect(pendientes(conOpcional, { 'arboles.json': 1, 'crece.png': 2, 'arboles.bin': 3 })).toEqual([])
    // crece.png aparece o cambia después de arboles.bin: el paso se rehace
    expect(pendientes(conOpcional, { 'arboles.json': 1, 'crece.png': 5, 'arboles.bin': 3 })).toEqual(['arboles'])
  })

  test('una entrada opcional que produce un paso que corre ensucia al que la usa', () => {
    const pasos2 = [
      { id: 'epocas', entradas: ['x'], salidas: ['crece.png'] },
      { id: 'arboles', entradas: [], opcionales: ['crece.png'], salidas: ['arboles.bin'] },
    ]
    expect(pendientes(pasos2, { x: 9, 'crece.png': 2, 'arboles.bin': 3 })).toEqual(['epocas', 'arboles'])
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
