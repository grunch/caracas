import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import {
  SIN_LICENCIA, DOMINIO_SIN_ESTABLECER, derechosDeFicha, tituloComun, mapasUsados, entradaDeMapa, entradaDeDato, entradaDeFoto,
  entradaDePrograma, armarCreditos, fichasDeCreditos,
} from '../../tools/creditos-lib.mjs'

const mapa = (extra = {}) => ({
  titulo: 'Plano de Caracas', año: 1889, año_representado: null, autor: 'Vicente S. Mestre',
  institucion: 'Bibliothèque nationale de France', url_fuente: 'https://commons.wikimedia.org/wiki/File:Mestre.jpg',
  licencia: 'Public domain (Wikimedia Commons)', dominio_publico: true, ...extra,
})
const hoja = (n) => mapa({
  titulo: `Caracas. No. 7 (Dirección de Cartografía Nacional) — hoja ${n} de 2`, año: 1936, autor: 'Dirección de Cartografía Nacional',
  institucion: 'University of Alberta Libraries', url_fuente: 'https://archive.org/details/WCWdb_18053', licencia: null, dominio_publico: 'dudoso',
})
const EPOCAS = [
  { año: 1578, plano: 'pimentel' },
  { año: 1889, plano: 'mestre' },
  { año: 1936, plano: 'dcn-hoja1' },
]
const FICHAS = { pimentel: mapa({ año: 1578 }), mestre: mapa(), 'dcn-hoja1': hoja(1), 'dcn-hoja2': hoja(2) }

describe('derechosDeFicha', () => {
  it('copia la licencia de la ficha tal cual cuando el dominio público está establecido', () => {
    // Arrange
    const ficha = mapa({ licencia: 'No Known Copyright (http://rightsstatements.org/vocab/NKC/1.0/). Princeton believes…' })
    // Act
    const r = derechosDeFicha(ficha)
    // Assert
    expect(r).toEqual({ licencia: ficha.licencia, porVerificar: false })
  })

  it('pone «Dominio público» donde la ficha dice «Public domain», y conserva quién lo declara', () => {
    expect(derechosDeFicha(mapa()).licencia).toBe('Dominio público (Wikimedia Commons)')
  })

  it('sin licencia en la ficha, lo dice con palabras neutras y lo marca por verificar: nunca inventa una', () => {
    expect(derechosDeFicha(hoja(1))).toEqual({ licencia: SIN_LICENCIA, porVerificar: true })
    expect(derechosDeFicha(mapa({ licencia: '  ', dominio_publico: true }))).toEqual({ licencia: SIN_LICENCIA, porVerificar: true })
    expect(SIN_LICENCIA).not.toMatch(/dominio público|libre|CC/i)
  })

  it('con licencia pero dominio público dudoso, agrega que los derechos están por verificar', () => {
    const r = derechosDeFicha(mapa({ licencia: 'Imagen del archivo, descarga libre', dominio_publico: 'dudoso' }))
    expect(r).toEqual({ licencia: `Imagen del archivo, descarga libre. ${DOMINIO_SIN_ESTABLECER}`, porVerificar: true })
  })

  it('en los datos que no son de dominio público (ODbL, Copernicus) la licencia declarada alcanza', () => {
    expect(derechosDeFicha({ licencia: 'Open Database License (ODbL) 1.0', dominio_publico: false }))
      .toEqual({ licencia: 'Open Database License (ODbL) 1.0', porVerificar: false })
  })
})

describe('tituloComun', () => {
  it('de las hojas de un mismo plano deja lo que comparten, sin el «— hoja 1 de 2»', () => {
    expect(tituloComun([hoja(1).titulo, hoja(2).titulo])).toBe('Caracas. No. 7 (Dirección de Cartografía Nacional)')
  })

  it('con un solo título, ese', () => {
    expect(tituloComun(['Plano de Caracas, 1911'])).toBe('Plano de Caracas, 1911')
  })

  it('si no comparten casi nada, el primero entero', () => {
    expect(tituloComun(['Plano A', 'Otro mapa'])).toBe('Plano A')
  })
})

describe('mapasUsados', () => {
  it('agrupa las hojas del plano base y dice qué año de la línea de tiempo sale de cada plano', () => {
    // Act
    const grupos = mapasUsados({ epocas: EPOCAS, desde: 1, base: ['dcn-hoja1', 'dcn-hoja2'] })
    // Assert
    expect(grupos).toEqual([
      { ids: ['mestre'], epocas: [1889], base: false },
      { ids: ['dcn-hoja1', 'dcn-hoja2'], epocas: [1936], base: true },
    ])
  })

  it('deja fuera las épocas que el sitio no muestra (antes de `desde`)', () => {
    const ids = mapasUsados({ epocas: EPOCAS, desde: 1, base: [] }).flatMap((g) => g.ids)
    expect(ids).not.toContain('pimentel')
  })

  it('sin línea de tiempo, queda el plano base', () => {
    expect(mapasUsados({ epocas: [], desde: 1, base: ['dcn-hoja1'] })).toEqual([{ ids: ['dcn-hoja1'], epocas: [], base: true }])
  })
})

describe('entradaDeMapa', () => {
  it('junta las hojas en una fila con su cuenta, su fuente y sus derechos', () => {
    // Act
    const e = entradaDeMapa({ ids: ['dcn-hoja1', 'dcn-hoja2'], epocas: [1936], base: true }, FICHAS)
    // Assert
    expect(e).toEqual({
      id: 'dcn-hoja1', año: 1936, titulo: 'Caracas. No. 7 (Dirección de Cartografía Nacional)', hojas: 2,
      autor: 'Dirección de Cartografía Nacional', institucion: 'University of Alberta Libraries',
      url: 'https://archive.org/details/WCWdb_18053', licencia: SIN_LICENCIA, porVerificar: true, base: true, epocas: [1936],
    })
  })

  it('usa el año representado cuando la copia no tiene año propio (un facsímil)', () => {
    const e = entradaDeMapa({ ids: ['f'], epocas: [1843], base: false }, { f: mapa({ año: null, año_representado: 1843 }) })
    expect(e.año).toBe(1843)
  })

  it('no deja pasar un enlace que no sea http(s)', () => {
    const e = entradaDeMapa({ ids: ['f'], epocas: [], base: false }, { f: mapa({ url_fuente: 'javascript:alert(1)' }) })
    expect(e.url).toBeNull()
  })

  it('falla si falta la ficha de un plano usado, o si las hojas no comparten los derechos', () => {
    expect(() => entradaDeMapa({ ids: ['no-esta'], epocas: [], base: false }, FICHAS)).toThrow(/no-esta/)
    const mezcla = { a: hoja(1), b: { ...hoja(2), licencia: 'CC0' } }
    expect(() => entradaDeMapa({ ids: ['a', 'b'], epocas: [], base: true }, mezcla)).toThrow(/derechos/)
  })
})

describe('entradaDeDato', () => {
  it('lleva título, autor, institución, licencia, atribución y uso; el enlace es el de la fuente o el de la descarga', () => {
    // Arrange
    const ficha = {
      titulo: 'Copernicus DEM GLO-30', autor: 'DLR y Airbus', institucion: 'Unión Europea y ESA', url_descarga: 'https://copernicus-dem-30m.s3.amazonaws.com/x.tif',
      licencia: '© DLR e.V. 2010-2014 … all rights reserved', atribucion_requerida: '© DLR e.V. 2010-2014 … all rights reserved', dominio_publico: false,
      tipo: 'modelo de elevación (DSM, 30 m)',
    }
    // Act
    const e = entradaDeDato('copernicus', ficha)
    // Assert
    expect(e).toEqual({
      id: 'copernicus', titulo: 'Copernicus DEM GLO-30', tipo: 'modelo de elevación (DSM, 30 m)', autor: 'DLR y Airbus', institucion: 'Unión Europea y ESA',
      url: 'https://copernicus-dem-30m.s3.amazonaws.com/x.tif', licencia: '© DLR e.V. 2010-2014 … all rights reserved', porVerificar: false, atribucion: null,
    })
  })

  it('la atribución va aparte solo si dice algo distinto de la licencia', () => {
    const e = entradaDeDato('osm', { titulo: 'Calles', autor: 'Colaboradores', url_fuente: 'https://www.openstreetmap.org/copyright', licencia: 'ODbL 1.0', atribucion_requerida: '© colaboradores de OpenStreetMap', dominio_publico: false })
    expect(e.atribucion).toBe('© colaboradores de OpenStreetMap')
    expect(e.url).toBe('https://www.openstreetmap.org/copyright')
  })
})

describe('entradaDeFoto y entradaDePrograma', () => {
  it('de la foto del manifiesto queda lo que hace falta para acreditarla', () => {
    const f = { id: 'a', titulo: 'La plaza.', autor: 'Autor desconocido', fecha: '1910', año: 1910, licencia: 'Dominio público', fuente: 'https://commons.wikimedia.org/wiki/File:A.jpg', institucion: null, epocas: [4], marcas: ['plaza'], w: 1, h: 1 }
    expect(entradaDeFoto(f)).toEqual({ id: 'a', titulo: 'La plaza.', autor: 'Autor desconocido', fecha: '1910', licencia: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:A.jpg', institucion: null })
  })

  it('del paquete, nombre, versión, licencia y página', () => {
    expect(entradaDePrograma({ name: 'three', version: '0.187.0', license: 'MIT', homepage: 'https://threejs.org/', author: 'mrdoob' }))
      .toEqual({ nombre: 'three', version: '0.187.0', licencia: 'MIT', url: 'https://threejs.org/' })
  })

  it('un paquete sin licencia declarada lo dice, no la supone', () => {
    expect(entradaDePrograma({ name: 'x', version: '1.0.0' })).toEqual({ nombre: 'x', version: '1.0.0', licencia: null, url: null })
  })
})

describe('armarCreditos', () => {
  const entradas = {
    epocas: EPOCAS, desde: 1, base: ['dcn-hoja1', 'dcn-hoja2'], fichasMapas: FICHAS,
    fichasDatos: { osm: { titulo: 'Calles de hoy', autor: 'Colaboradores de OpenStreetMap', url_fuente: 'https://www.openstreetmap.org/copyright', licencia: 'ODbL 1.0', dominio_publico: false } },
    fotos: [{ id: 'b', titulo: 'B', autor: 'X', fecha: '1900', licencia: 'CC0', fuente: 'https://commons.wikimedia.org/wiki/File:B.jpg' }],
    paquetes: [{ name: 'three', version: '0.187.0', license: 'MIT', homepage: 'https://threejs.org/' }],
  }

  it('arma las cuatro listas: planos (por año), datos, fotos y programas', () => {
    // Act
    const c = armarCreditos(entradas)
    // Assert
    expect(c.mapas.map((m) => [m.año, m.base, m.porVerificar])).toEqual([[1889, false, false], [1936, true, true]])
    expect(c.datos.map((d) => d.id)).toEqual(['osm'])
    expect(c.fotos.map((f) => f.id)).toEqual(['b'])
    expect(c.programas).toEqual([{ nombre: 'three', version: '0.187.0', licencia: 'MIT', url: 'https://threejs.org/' }])
  })

  it('es determinista: sin fechas ni rutas de la máquina', () => {
    expect(JSON.stringify(armarCreditos(entradas))).toBe(JSON.stringify(armarCreditos(entradas)))
    expect(JSON.stringify(armarCreditos(entradas))).not.toMatch(/\/home|\/disco|generado/)
  })

  it('no modifica lo que recibe', () => {
    const copia = structuredClone(entradas)
    armarCreditos(entradas)
    expect(entradas).toEqual(copia)
  })
})

describe('fichasDeCreditos', () => {
  it('las rutas de las fichas de los planos usados (las entradas del paso)', () => {
    expect(fichasDeCreditos({ epocas: EPOCAS, desde: 1, base: ['dcn-hoja1', 'dcn-hoja2'] })).toEqual([
      'fuentes/mapas/mestre/ficha.json', 'fuentes/mapas/dcn-hoja1/ficha.json', 'fuentes/mapas/dcn-hoja2/ficha.json',
    ])
  })
})

describe('con las fichas del repo', () => {
  const RAIZ = path.resolve(import.meta.dirname, '../..')
  const leer = (ruta) => JSON.parse(readFileSync(path.join(RAIZ, ruta), 'utf8'))
  const carpetas = (base) => readdirSync(path.join(RAIZ, base), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  const fichasMapas = Object.fromEntries(carpetas('fuentes/mapas').map((id) => [id, leer(`fuentes/mapas/${id}/ficha.json`)]))
  const fichasDatos = Object.fromEntries(carpetas('fuentes/datos').map((id) => [id, leer(`fuentes/datos/${id}/ficha.json`)]))
  const { epocas } = leer('tools/geo/epocas/epocas.json')
  const base = leer('tools/geo/mosaico-1936.json').hojas.map((h) => h.fuente)

  it('el plano de 1936 queda con los derechos por verificar, y ningún plano sin enlace a su fuente', () => {
    // Act
    const c = armarCreditos({ epocas, desde: 1, base, fichasMapas, fichasDatos, fotos: [], paquetes: [] })
    // Assert
    const de1936 = c.mapas.find((m) => m.base)
    expect(de1936).toMatchObject({ año: 1936, hojas: 2, licencia: SIN_LICENCIA, porVerificar: true })
    expect(c.mapas.map((m) => m.año)).toEqual([1772, 1843, 1889, 1911, 1936])
    for (const m of c.mapas) expect(m.url, m.id).toMatch(/^https:\/\//)
    for (const d of c.datos) expect(d.licencia, d.id).toBeTruthy()
  })
})
