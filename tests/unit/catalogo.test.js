import { describe, test, expect } from 'vitest'
import { periodoDe, armarCatalogo } from '../../tools/catalogo-lib.mjs'

describe('periodoDe', () => {
  test.each([
    [1578, 'colonial'],
    [1810, 'colonial'],
    [1843, 'republica-temprana'],
    [1874, 'guzmancista'],
    [1899, 'guzmancista'],
    [1906, 'inicios-siglo-xx'],
    [1936, 'modernizacion'],
    [1960, 'modernizacion'],
    [1975, 'contemporaneo'],
  ])('%i → %s', (año, periodo) => {
    expect(periodoDe(año)).toBe(periodo)
  })

  test('sin año o año 0 es "sin-fecha"', () => {
    expect(periodoDe(null)).toBe('sin-fecha')
    expect(periodoDe(0)).toBe('sin-fecha')
  })
})

describe('armarCatalogo', () => {
  const fichas = [
    { carpeta: '1897-x-razetti', ficha: { titulo: 'Razetti', año: 1897, ancho: 9000, alto: 7000 } },
    { carpeta: '1874-x-ricard', ficha: { titulo: 'Ricard', año: '1874', ancho: 12000, alto: 9000, muestra_interior_manzanas: 'si', dominio_publico: true } },
    { carpeta: '0000-x-sf', ficha: { titulo: 'Sin fecha', año: null } },
  ]

  test('ordena por año, deja lo sin fecha al final y agrega el período', () => {
    const cat = armarCatalogo(fichas)
    expect(cat.map((m) => m.carpeta)).toEqual(['1874-x-ricard', '1897-x-razetti', '0000-x-sf'])
    expect(cat[0]).toMatchObject({ año: 1874, periodo: 'guzmancista', megapixeles: 108 })
  })

  test('marca como candidato a base lo grande, libre y con interior de manzanas', () => {
    const cat = armarCatalogo(fichas)
    expect(cat.find((m) => m.carpeta === '1874-x-ricard').candidato_base).toBe(true)
    expect(cat.find((m) => m.carpeta === '1897-x-razetti').candidato_base).toBe(false)
  })

  test('no muta las fichas de entrada', () => {
    const copia = structuredClone(fichas)
    armarCatalogo(fichas)
    expect(fichas).toEqual(copia)
  })
})

import { normalizarFicha, celda, enlace, esCarpetaValida, markdown, esOriginalValido } from '../../tools/catalogo-lib.mjs'

describe('normalizarFicha', () => {
  test.each([null, [], 42, 'texto'])('rechaza lo que no es un objeto: %j', (v) => {
    expect(normalizarFicha(v)).toBeNull()
  })

  test('deja ancho y alto solo si son números positivos', () => {
    expect(normalizarFicha({ ancho: '9000', alto: -3 })).toMatchObject({ ancho: 9000, alto: null })
    expect(normalizarFicha({ ancho: 'mucho', alto: 1e3 })).toMatchObject({ ancho: null, alto: 1000 })
  })
})

describe('armarCatalogo con datos sucios', () => {
  test('ignora ancho no numérico al calcular megapíxeles', () => {
    const [m] = armarCatalogo([{ carpeta: '1900-a', ficha: { año: 1900, ancho: 'x', alto: 10 } }])
    expect(m.megapixeles).toBeNull()
  })

  test('año negativo es sin fecha', () => {
    const [m] = armarCatalogo([{ carpeta: '0000-a', ficha: { año: -5 } }])
    expect(m).toMatchObject({ año: null, periodo: 'sin-fecha' })
  })
})

describe('sanitización del Markdown', () => {
  test('celda escapa lo que rompe una tabla o inyecta formato', () => {
    expect(celda('a|b\r\nc [x](y) `z` <i>\\')).toBe('a\\|b c \\[x\\]\\(y\\) \\`z\\` &lt;i&gt;\\\\')
    expect(celda(null)).toBe('—')
  })

  test('enlace solo acepta http(s) y escapa paréntesis', () => {
    expect(enlace('https://x.org/a_(b).jpg', 'T')).toBe('[T](https://x.org/a_%28b%29.jpg)')
    expect(enlace('javascript:alert(1)', 'T')).toBe('T')
    expect(enlace('no es url', 'T')).toBe('T')
  })

  test('esCarpetaValida acepta solo nombres simples', () => {
    expect(esCarpetaValida('1874-commons-ricard_plano.v2')).toBe(true)
    for (const mal of ['a`b', 'a|b', '..', 'a b', '%s', '']) expect(esCarpetaValida(mal)).toBe(false)
  })

  test('markdown agrupa por período y no deja pasar campos sin escapar', () => {
    const cat = armarCatalogo([{ carpeta: '1874-a', ficha: { año: 1874, titulo: 'R|x', url_fuente: 'javascript:1', ancho: 10, alto: 10 } }])
    const md = markdown(cat)
    expect(md).toContain('## Guzmán Blanco y fin de siglo (1870–1899)')
    expect(md).toContain('R\\|x')
    expect(md).not.toContain('javascript:')
  })
})

describe('esOriginalValido', () => {
  test('solo formatos raster conocidos', () => {
    for (const ok of ['original.jpg', 'original.JPEG', 'original.tif', 'original.png', 'original.jp2', 'original.webp']) expect(esOriginalValido(ok)).toBe(true)
    for (const mal of ['original.svg', 'original.mvg', 'original.jpg.part', 'original.txt', 'otro.jpg']) expect(esOriginalValido(mal)).toBe(false)
  })
})

describe('año representado', () => {
  test('sin año de impresión, clasifica y ordena por el año que representa', () => {
    const [m] = armarCatalogo([{ carpeta: '1843-f', ficha: { año: null, año_representado: 1843 } }])
    expect(m).toMatchObject({ año: null, periodo: 'republica-temprana' })
    expect(markdown([m])).toContain('s.f. \\(rep. 1843\\)')
  })
})
