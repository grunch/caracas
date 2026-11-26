import { describe, it, expect } from 'vitest'
import {
  contenidoDeFicha, nombresPorEpoca, epocaDeFicha, fotosPorMarca, validarFichas, validarFotos, creditoDeFoto, nombreDeFuente, leerFotos,
} from '../../src/fichas.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'

const coords = crearCoords({ ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] })
const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
const marca = (id) => marcas.find((m) => m.id === id)
const foto = (id, epocas, marcasDeFoto, año) => ({
  id, titulo: `Foto ${id}`, autor: 'Autor desconocido', fecha: String(año), año, licencia: 'Dominio público',
  fuente: `https://commons.wikimedia.org/wiki/File:${id}.jpg`, institucion: null, epocas, marcas: marcasDeFoto, w: 1600, h: 900, mw: 640, mh: 360,
})
const FOTOS = [
  foto('mercado', [2], ['plaza-bolivar'], 1852),
  foto('estatua', [3], ['plaza-bolivar', 'catedral'], 1880),
  foto('damero', [4, 5], ['plaza-bolivar'], 1910),
]
const ficha = { textos: [[1, 'Era la plaza del mercado.'], [3, 'Se hizo jardín, con la estatua.']], hoy: 'la Plaza Bolívar.', dudas: 'La fecha del decreto, sin cotejar.' }
const contenido = (id, epoca, extra = {}) => contenidoDeFicha({ marca: marca(id), ficha, fotos: FOTOS, epoca, ...extra })

describe('nombresPorEpoca', () => {
  it('da cada nombre con los años en que rigió y marca el de la época elegida', () => {
    expect(nombresPorEpoca(marca('plaza-bolivar'), 1)).toEqual([
      { nombre: 'Plaza Mayor', periodo: '1772–1843', rige: true },
      { nombre: 'Plaza Bolívar', periodo: 'desde 1889', rige: false },
    ])
    expect(nombresPorEpoca(marca('plaza-bolivar'), 4).map((n) => n.rige)).toEqual([false, true])
  })

  it('un nombre de una sola época lleva solo su año; el último de un lugar que desaparece, su rango', () => {
    expect(nombresPorEpoca(marca('san-jacinto'), 5).map((n) => n.periodo)).toEqual(['1772–1843', '1889–1911', 'desde 1936'])
    // el Concejo Municipal figura en 1889 y 1911, y en 1936 ya es el Palacio de Justicia
    expect(nombresPorEpoca(marca('concejo'), 3)).toEqual([{ nombre: 'Concejo Municipal', periodo: '1889–1911', rige: true }])
    expect(nombresPorEpoca(marca('hipodromo'), 4)[0]).toEqual({ nombre: 'Hipódromo del Paraíso', periodo: '1911', rige: true })
  })

  it('un nombre que dejó de regir antes de que la marca naciera no figura', () => {
    const m = { ...marca('plaza-bolivar'), nace: 3, nombres: [{ desde: 1, nombre: 'Viejo', nota: '' }, { desde: 2, nombre: 'Medio', nota: '' }, { desde: 4, nombre: 'Nuevo', nota: '' }] }
    expect(nombresPorEpoca(m, 3)).toEqual([{ nombre: 'Medio', periodo: '1889', rige: true }, { nombre: 'Nuevo', periodo: 'desde 1911', rige: false }])
  })

  it('en una época en que el lugar no existe, ningún nombre rige', () => {
    expect(nombresPorEpoca(marca('concejo'), 5).some((n) => n.rige)).toBe(false)
    expect(nombresPorEpoca(marca('justicia'), 1).some((n) => n.rige)).toBe(false)
  })
})

describe('contenidoDeFicha', () => {
  it('en 1772 la plaza se llama Plaza Mayor y el texto que rige es el del mercado', () => {
    // Arrange / Act
    const c = contenido('plaza-bolivar', 1)
    // Assert
    expect(c.titulo).toBe('Plaza Mayor')
    expect(c.año).toBe(1772)
    expect(c.existe).toBe(true)
    expect(c.cuando).toBe('Hacia 1772')
    expect(c.parrafos).toEqual([
      { año: 1772, texto: 'Era la plaza del mercado.', rige: true },
      { año: 1889, texto: 'Se hizo jardín, con la estatua.', rige: false },
    ])
    expect(c.hoy).toBe('la Plaza Bolívar.')
    expect(c.dudas).toBe('La fecha del decreto, sin cotejar.')
  })

  it('al cambiar la época cambian el nombre, el texto que rige y las fotos «de esta época»', () => {
    const en1889 = contenido('plaza-bolivar', 3)
    expect(en1889.titulo).toBe('Plaza Bolívar')
    // el párrafo que rige va primero; los demás, después y en orden
    expect(en1889.parrafos.map((p) => [p.año, p.rige])).toEqual([[1889, true], [1772, false]])
    expect(en1889.fotos.map((f) => [f.id, f.deEpoca])).toEqual([['estatua', true], ['mercado', false], ['damero', false]])
    expect(en1889.hayDeEpoca).toBe(true)

    const en1936 = contenido('plaza-bolivar', 5)
    expect(en1936.fotos.map((f) => [f.id, f.deEpoca])).toEqual([['damero', true], ['mercado', false], ['estatua', false]])
  })

  it('si ninguna foto es de la época elegida, van todas en orden y sin destacar', () => {
    const c = contenido('plaza-bolivar', 1)
    expect(c.fotos.map((f) => f.id)).toEqual(['mercado', 'estatua', 'damero'])
    expect(c.hayDeEpoca).toBe(false)
  })

  it('solo trae las fotos de la marca', () => {
    expect(contenido('catedral', 3).fotos.map((f) => f.id)).toEqual(['estatua'])
    expect(contenido('guaire', 3).fotos).toEqual([])
  })

  it('un lugar que todavía no existe en la época lo dice, con el nombre con que aparece', () => {
    const c = contenidoDeFicha({ marca: marca('justicia'), ficha: undefined, fotos: [], epoca: 1 })
    expect(c.existe).toBe(false)
    expect(c.titulo).toBe('Palacio de Justicia')
    expect(c.cuando).toBe('Todavía no figura en 1772: aparece en 1936')
  })

  it('un lugar que ya no está lo dice, con su último nombre', () => {
    const c = contenidoDeFicha({ marca: marca('concejo'), ficha: undefined, fotos: [], epoca: 5 })
    expect(c.existe).toBe(false)
    expect(c.titulo).toBe('Concejo Municipal')
    expect(c.cuando).toBe('Ya no figura en 1936: estuvo hasta 1911')
  })

  it('sin texto propio usa las notas de la marca, cada una en su época, sin repetir', () => {
    const c = contenidoDeFicha({ marca: marca('teatro-municipal'), ficha: undefined, fotos: [], epoca: 3 })
    expect(c.parrafos).toEqual([
      { año: 1889, texto: 'Donde estuvo la plaza de San Pablo.', rige: true },
      { año: 1772, texto: 'La plaza y la iglesia de San Pablo.', rige: false },
    ])
    expect(contenidoDeFicha({ marca: marca('catuche'), ficha: undefined, fotos: [], epoca: 3 }).parrafos).toEqual([])
  })

  it('un texto de antes de que el lugar exista rige mientras no haya otro', () => {
    const c = contenidoDeFicha({ marca: marca('plaza-bolivar'), ficha: { textos: [[3, 'Solo de 1889.']] }, fotos: [], epoca: 1 })
    expect(c.parrafos).toEqual([{ año: 1889, texto: 'Solo de 1889.', rige: false }])
  })

  it('lleva la fuente del nombre (la de la marca) y solo los nombres cuando hubo más de uno', () => {
    expect(contenido('plaza-bolivar', 3).fuente).toMatch(/plano DCN de 1936/)
    expect(contenido('plaza-bolivar', 3).nombres.length).toBe(2)
    expect(contenido('catedral', 3).nombres).toEqual([])
  })

  it('acepta otros años de época (los de crece.json)', () => {
    const c = contenido('plaza-bolivar', 1, { años: [1578, 1775, 1843, 1889, 1911, 1936] })
    expect(c.año).toBe(1775)
    expect(c.cuando).toBe('Hacia 1775')
  })
})

describe('epocaDeFicha', () => {
  it('redondea la época de la ola y la deja entre la primera y la última', () => {
    expect(epocaDeFicha(2.4)).toBe(2)
    expect(epocaDeFicha(2.5)).toBe(3)
    expect(epocaDeFicha(99)).toBe(6) // sin línea de tiempo: la ciudad final
    expect(epocaDeFicha(0)).toBe(1)
    expect(epocaDeFicha(NaN)).toBe(6)
  })
})

describe('fotos', () => {
  it('fotosPorMarca agrupa por id de marca', () => {
    const porMarca = fotosPorMarca(FOTOS)
    expect(porMarca.get('plaza-bolivar').length).toBe(3)
    expect(porMarca.get('catedral').map((f) => f.id)).toEqual(['estatua'])
    expect(porMarca.get('guaire')).toBeUndefined()
  })

  it('validarFotos descarta las filas sin crédito completo: sin autor, fecha, licencia o fuente no se muestra', () => {
    const { autor, ...sinAutor } = FOTOS[0]
    const mal = [sinAutor, { ...FOTOS[1], fuente: 'javascript:alert(1)' }, { ...FOTOS[2], licencia: '' }, { ...FOTOS[2], fuente: 'https://:' }, { ...FOTOS[0], id: '../x' }, { ...FOTOS[0], w: 0 }, null]
    expect(validarFotos([...mal, FOTOS[1]])).toEqual([FOTOS[1]])
    expect(validarFotos(undefined)).toEqual([])
  })

  it('leerFotos devuelve [] si el manifiesto no está (la demo de CI) o no es JSON', async () => {
    const html = { ok: true, headers: { get: () => 'text/html' }, json: async () => { throw new Error('no es JSON') } }
    expect(await leerFotos(async () => html)).toEqual([])
    expect(await leerFotos(async () => ({ ok: false, headers: { get: () => 'application/json' } }))).toEqual([])
    expect(await leerFotos(async () => { throw new Error('sin red') })).toEqual([])
    const bien = { ok: true, headers: { get: () => 'application/json' }, json: async () => ({ fotos: FOTOS }) }
    expect(await leerFotos(async () => bien)).toEqual(FOTOS)
  })

  it('el crédito junta autor y fecha; la fuente se nombra por su sitio', () => {
    expect(creditoDeFoto(FOTOS[0])).toBe('Autor desconocido, 1852')
    expect(nombreDeFuente('https://commons.wikimedia.org/wiki/File:x.jpg')).toBe('Wikimedia Commons')
    expect(nombreDeFuente('https://www.loc.gov/item/1')).toBe('loc.gov')
  })
})

describe('los datos de las fichas', () => {
  it('cada ficha es de una marca que existe, con textos en orden y dentro de su vida', () => {
    expect(validarFichas(FICHAS, MARCAS, HITOS)).toEqual([])
  })

  it('validarFichas avisa de una marca desconocida, un texto vacío o fuera de orden', () => {
    const mal = { nadie: { textos: [[1, 'x']] }, catedral: { textos: [[3, 'a'], [1, 'b']] }, guaire: { textos: [[1, '']] }, 'san-agustin': { textos: [[2, 'antes de nacer']] } }
    const problemas = validarFichas(mal, MARCAS, HITOS).join('\n')
    expect(problemas).toMatch(/nadie: marca desconocida/)
    expect(problemas).toMatch(/catedral: textos desordenados/)
    expect(problemas).toMatch(/guaire: texto vacío/)
  })

  it('todas las marcas dan una ficha en todas las épocas, con título', () => {
    for (const m of marcas) {
      for (let e = 1; e <= 5; e++) {
        const c = contenidoDeFicha({ marca: m, ficha: FICHAS[m.id], fotos: [], epoca: e })
        expect(c.titulo, `${m.id} en ${e}`).toBeTruthy()
        expect(c.cuando, `${m.id} en ${e}`).toBeTruthy()
      }
    }
  })

  it('los lugares principales tienen texto propio', () => {
    for (const id of ['plaza-bolivar', 'catedral', 'capitolio', 'universidad', 'panteon', 'teatro-municipal', 'calvario', 'miraflores', 'san-jacinto', 'guaire']) {
      expect(FICHAS[id]?.textos.length, id).toBeGreaterThan(0)
    }
  })
})

it('Candelaria tiene relato propio en 1772 y conserva las referencias posteriores', () => {
  const de = epoca => contenidoDeFicha({marca:marca('candelaria'),ficha:FICHAS.candelaria,fotos:[],epoca})
  expect(marca('candelaria').nace).toBe(1)
  const colonial=de(1)
  expect(JSON.stringify(colonial)).toContain('17 de mayo de 1772')
  expect(FICHAS.candelaria.textos.find(([e])=>e===1)[1]).toContain('tres naves')
  expect(FICHAS.candelaria.textos.find(([e])=>e===2)[1]).toContain('1843')
  expect(FICHAS.candelaria.textos.find(([e])=>e===3)[1]).toContain('1889')
  expect(marca('candelaria').fuente).toContain('laiglesiayplazad00land')
})
