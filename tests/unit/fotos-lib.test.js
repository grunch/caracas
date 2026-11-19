import { describe, it, expect } from 'vitest'
import {
  elegibilidad, fechaDe, licenciaVisible, medidasDerivadas, entradaDeFoto, armarManifiesto, descargable, informe, salidasDeFotos,
} from '../../tools/fotos-lib.mjs'

const COMMONS = 'https://commons.wikimedia.org/wiki/File:Algo.jpg'
const libre = (extra = {}) => ({
  titulo: 'Plaza Bolívar de Caracas, 1910', año: 1910, año_representado: 1910, autor: 'Autor desconocido',
  url_fuente: COMMONS, url_descarga: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Algo.jpg',
  licencia: 'Public domain (según Wikimedia Commons)', dominio_publico: true, epocas: [4], marcas: ['plaza-bolivar'], ...extra,
})

describe('elegibilidad', () => {
  it('acepta una imagen en dominio público con fuente, autor y fecha', () => {
    // Arrange
    const ficha = libre()
    // Act
    const r = elegibilidad(ficha)
    // Assert
    expect(r).toEqual({ elegible: true, motivos: [] })
  })

  it('acepta una licencia libre (CC0, CC BY, CC BY-SA) aunque no sea dominio público', () => {
    for (const licencia of ['CC0', 'CC0 1.0', 'CC BY 4.0', 'CC BY-SA 3.0']) {
      expect(elegibilidad(libre({ licencia, dominio_publico: false })).elegible, licencia).toBe(true)
    }
  })

  it('rechaza lo que tiene derechos reservados, aunque diga el autor y la fecha', () => {
    const r = elegibilidad(libre({ licencia: 'Derechos reservados El Nacional (marca de agua en la imagen)', dominio_publico: false }))
    expect(r.elegible).toBe(false)
    expect(r.motivos.join(' ')).toMatch(/derechos reservados/)
  })

  it('rechaza una derivada de una foto con derechos, y lo que no es libre ni dominio público', () => {
    expect(elegibilidad(libre({ licencia: 'Derivada de una foto con derechos reservados de El Nacional', dominio_publico: false })).elegible).toBe(false)
    expect(elegibilidad(libre({ licencia: 'CC BY-NC 4.0', dominio_publico: false })).elegible).toBe(false)
  })

  it('rechaza el dominio público dudoso o sin licencia: lo no verificado no se muestra', () => {
    expect(elegibilidad(libre({ dominio_publico: 'dudoso' })).motivos.join(' ')).toMatch(/dudoso/)
    expect(elegibilidad(libre({ licencia: null, dominio_publico: 'dudoso' })).motivos.join(' ')).toMatch(/sin licencia/)
    // una licencia «a verificar» que menciona CC0 no es una licencia libre establecida
    const majestic = libre({ licencia: 'A verificar en la página de Commons (los fondos del Nationaal Archief suelen estar en CC0)', dominio_publico: 'dudoso' })
    expect(elegibilidad(majestic).elegible).toBe(false)
  })

  it('una ficha que dice dominio público pero sin licencia escrita no alcanza', () => {
    expect(elegibilidad(libre({ licencia: null })).elegible).toBe(false)
  })

  it('rechaza lo marcado como no publicable, diga lo que diga la licencia', () => {
    const r = elegibilidad(libre({ publicar: false }))
    expect(r.elegible).toBe(false)
    expect(r.motivos.join(' ')).toMatch(/no publicable/)
  })

  it('nunca inventa: sin autor, sin fecha o sin página de la fuente, no es elegible', () => {
    expect(elegibilidad(libre({ autor: null })).motivos.join(' ')).toMatch(/autor/)
    expect(elegibilidad(libre({ autor: 'A verificar: Commons la atribuye a Fulano' })).motivos.join(' ')).toMatch(/autor/)
    expect(elegibilidad(libre({ año: null, año_representado: null })).motivos.join(' ')).toMatch(/fecha/)
    expect(elegibilidad(libre({ url_fuente: null })).motivos.join(' ')).toMatch(/fuente/)
    expect(elegibilidad(libre({ url_fuente: 'imagen de Facebook (enlace temporal)' })).motivos.join(' ')).toMatch(/fuente/)
  })

  it('junta todos los motivos', () => {
    const r = elegibilidad({ titulo: 'x', autor: null, licencia: null, dominio_publico: 'dudoso', url_fuente: null })
    expect(r.motivos.length).toBe(4)
  })
})

describe('fechaDe y licenciaVisible', () => {
  it('la fecha es la que escribe la ficha: `fecha`, el año o el año aproximado', () => {
    expect(fechaDe({ fecha: 'hacia 1900–1906', año: null })).toBe('hacia 1900–1906')
    expect(fechaDe({ año: 1867 })).toBe('1867')
    expect(fechaDe({ año: null, año_aproximado: 'hacia 1870' })).toBe('hacia 1870')
    expect(fechaDe({ año: null })).toBe(null)
  })

  it('el año de lo que la imagen representa no es la fecha de la imagen', () => {
    expect(fechaDe({ año: null, año_representado: 1812 })).toBe(null)
  })

  it('la licencia se muestra corta y en español', () => {
    expect(licenciaVisible('Public domain (según Wikimedia Commons)')).toBe('Dominio público')
    expect(licenciaVisible('Public domain')).toBe('Dominio público')
    expect(licenciaVisible('CC BY-SA 4.0')).toBe('CC BY-SA 4.0')
    expect(licenciaVisible('CC0 (Nationaal Archief)')).toBe('CC0')
  })
})

describe('medidasDerivadas', () => {
  it('achica al lado mayor pedido y conserva la proporción', () => {
    expect(medidasDerivadas(6477, 2206, 1600)).toEqual({ w: 1600, h: 545 })
    expect(medidasDerivadas(834, 949, 480)).toEqual({ w: 422, h: 480 })
  })

  it('no agranda una imagen chica', () => {
    expect(medidasDerivadas(640, 397, 1600)).toEqual({ w: 640, h: 397 })
  })
})

describe('entradaDeFoto', () => {
  it('arma la fila del manifiesto con los créditos de la ficha y las medidas de los derivados', () => {
    const e = entradaDeFoto('1910-commons-plaza-bolivar', libre({ institucion: 'Archivo Fotografía Urbana', pie: 'La plaza en 1910.' }), { ancho: 668, alto: 461 })
    expect(e).toEqual({
      id: '1910-commons-plaza-bolivar', titulo: 'La plaza en 1910.', autor: 'Autor desconocido', fecha: '1910', año: 1910,
      licencia: 'Dominio público', fuente: COMMONS, institucion: 'Archivo Fotografía Urbana',
      epocas: [4], marcas: ['plaza-bolivar'], w: 668, h: 461, mw: 640, mh: 442,
    })
  })

  it('sin pie usa el título; el año para ordenar es el representado', () => {
    const e = entradaDeFoto('x', libre({ año: null, fecha: 'hacia 1900', año_representado: 1903 }), { ancho: 3200, alto: 1600 })
    expect(e.titulo).toBe('Plaza Bolívar de Caracas, 1910')
    expect(e.año).toBe(1903)
    expect([e.w, e.h, e.mw, e.mh]).toEqual([1600, 800, 640, 320])
  })
})

describe('armarManifiesto', () => {
  const marcas = new Set(['plaza-bolivar', 'catedral'])
  const lista = [
    { id: '1910-b', ficha: libre(), original: 'original.jpg' },
    { id: '1867-a', ficha: libre({ año: 1867, año_representado: 1867, marcas: ['catedral', 'plaza-bolivar'] }), original: 'original.jpg' },
    { id: '1955-nacional', ficha: libre({ licencia: 'Derechos reservados El Nacional', dominio_publico: false }), original: 'original.jpg' },
    { id: '1880-dudosa', ficha: libre({ dominio_publico: 'dudoso', licencia: null }), original: 'original.jpg' },
    { id: '1900-sin-original', ficha: libre(), original: null },
    { id: '1839-sin-marca', ficha: libre({ marcas: undefined }), original: 'original.jpg' },
  ]

  it('separa las que se publican de las excluidas, con su motivo, y ordena por año', () => {
    const r = armarManifiesto(lista, { marcas })
    expect(r.publicables.map((p) => p.id)).toEqual(['1867-a', '1910-b'])
    const porId = Object.fromEntries(r.excluidas.map((x) => [x.id, x.motivos.join('; ')]))
    expect(porId['1955-nacional']).toMatch(/derechos reservados/)
    expect(porId['1880-dudosa']).toMatch(/sin licencia/)
    expect(porId['1900-sin-original']).toMatch(/original/)
    expect(porId['1839-sin-marca']).toMatch(/marca/)
    expect(r.excluidas.length).toBe(4)
  })

  it('una imagen sin derechos claros queda fuera aunque tenga marcas y original', () => {
    const r = armarManifiesto(lista, { marcas })
    expect(r.publicables.some((p) => /nacional|dudosa/.test(p.id))).toBe(false)
  })

  it('falla si una ficha nombra una marca que no existe', () => {
    const mal = [{ id: '1910-b', ficha: libre({ marcas: ['plaza-bolibar'] }), original: 'original.jpg' }]
    expect(() => armarManifiesto(mal, { marcas })).toThrow(/plaza-bolibar/)
  })

  it('el informe dice qué entra y qué no, y por qué', () => {
    const texto = informe(armarManifiesto(lista, { marcas }))
    expect(texto).toMatch(/2 fotos publicables/)
    expect(texto).toMatch(/1955-nacional.*derechos reservados/)
  })
})

describe('descargable', () => {
  it('solo se bajan originales de Wikimedia, por https', () => {
    expect(descargable('https://upload.wikimedia.org/wikipedia/commons/c/c6/Algo.jpg')).toBe(true)
    expect(descargable('http://upload.wikimedia.org/wikipedia/commons/c/c6/Algo.jpg')).toBe(false)
    expect(descargable('https://upload.wikimedia.org.malo.example/x.jpg')).toBe(false)
    expect(descargable('https://i.pinimg.com/1200x/a.jpg')).toBe(false)
    expect(descargable('imagen de Facebook')).toBe(false)
    expect(descargable(null)).toBe(false)
  })
})

describe('salidasDeFotos', () => {
  it('dos archivos por foto del manifiesto; sin manifiesto, ninguno', () => {
    expect(salidasDeFotos({ fotos: [{ id: 'a' }, { id: 'b' }] })).toEqual(['public/fotos/a.webp', 'public/fotos/m/a.webp', 'public/fotos/b.webp', 'public/fotos/m/b.webp'])
    expect(salidasDeFotos(null)).toEqual([])
  })
})
