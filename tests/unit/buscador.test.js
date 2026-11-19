import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  normalizar, clave, distanciaEdicion, tolerancia, separarNumero, indexarEsquinas, buscarNombre, resolver, sugerir,
  ADYACENCIA,
} from '../../src/buscador.js'

const DICCIONARIO = JSON.parse(readFileSync(new URL('../../tools/geo/esquinas/1936-esquinas.json', import.meta.url), 'utf8'))
const PLANO = { metro: 0.5, plaza: [8968.2, 6839] }
const LUGARES = [
  { id: 'catedral', nombre: 'Catedral de Caracas', alias: ['Catedral'], px: [9079, 6803], nace: 1, muere: 0 },
  { id: 'plaza-bolivar', nombre: 'Plaza Bolívar', alias: ['Plaza Mayor'], px: [8976, 6844], nace: 1, muere: 0 },
  { id: 'san-francisco', nombre: 'Iglesia de San Francisco', alias: [], px: [8768, 7198], nace: 1, muere: 0 },
]
const indice = indexarEsquinas(DICCIONARIO, { ...PLANO, lugares: LUGARES })
const esquina = (nombre) => indice.esquinas.find((e) => e.nombre === nombre)

describe('normalizar y clave', () => {
  test('quita tildes, mayúsculas, signos y espacios de más', () => {
    expect(normalizar('  De  LA  Tórre ')).toBe('de la torre')
    expect(normalizar('Muñoz')).toBe('munoz')
    expect(normalizar("O'Leary")).toBe('oleary')
    expect(normalizar(null)).toBe('')
  })

  test('abre las abreviaturas comunes', () => {
    expect(normalizar('Esq. Sta. Bárbara')).toBe('esquina santa barbara')
    expect(normalizar('Dr. Paúl')).toBe('doctor paul')
    expect(normalizar('Pte. Yanes')).toBe('puente yanes')
  })

  test('la clave de un nombre no lleva el artículo inicial (pero sí los de adentro)', () => {
    expect(clave('La Torre')).toBe('torre')
    expect(clave('Las Gradillas')).toBe('gradillas')
    expect(clave('El Conde')).toBe('conde')
    expect(clave('Pele el Ojo')).toBe('pele el ojo')
    expect(clave('Luneta de la Merced')).toBe('luneta de la merced')
    expect(clave('la')).toBe('la')
  })
})

describe('distanciaEdicion', () => {
  test('cuenta cambios, faltas, sobras y letras cruzadas', () => {
    expect(distanciaEdicion('veroes', 'veroes')).toBe(0)
    expect(distanciaEdicion('veroes', 'beroes')).toBe(1)
    expect(distanciaEdicion('veroes', 'veros')).toBe(1)
    expect(distanciaEdicion('veroes', 'veeroes')).toBe(1)
    expect(distanciaEdicion('veroes', 'veores')).toBe(1)
    expect(distanciaEdicion('', 'abc')).toBe(3)
    expect(distanciaEdicion('gradillas', 'traposos')).toBeGreaterThan(3)
  })

  test('la tolerancia crece con el largo: las palabras cortas no se adivinan', () => {
    expect(tolerancia(3)).toBe(0)
    expect(tolerancia(5)).toBe(1)
    expect(tolerancia(9)).toBe(2)
  })
})

describe('separarNumero', () => {
  test('saca el número de la casa del final de la dirección', () => {
    expect(separarNumero('Sociedad a Traposos n.º 12')).toEqual({ texto: 'Sociedad a Traposos', numero: '12' })
    expect(separarNumero('Sociedad a Traposos, Nro. 12')).toEqual({ texto: 'Sociedad a Traposos', numero: '12' })
    expect(separarNumero('Sociedad a Traposos #12')).toEqual({ texto: 'Sociedad a Traposos', numero: '12' })
    expect(separarNumero('Sociedad a Traposos 12')).toEqual({ texto: 'Sociedad a Traposos', numero: '12' })
    expect(separarNumero('Ño Pastor No 7')).toEqual({ texto: 'Ño Pastor', numero: '7' })
  })

  test('sin número, la dirección queda igual (y un nombre que empieza con número no lo pierde)', () => {
    expect(separarNumero(' Gradillas ')).toEqual({ texto: 'Gradillas', numero: null })
    expect(separarNumero('9 de Febrero')).toEqual({ texto: '9 de Febrero', numero: null })
    expect(separarNumero('12')).toEqual({ texto: '12', numero: null })
  })
})

describe('indexarEsquinas', () => {
  test('entran todas las esquinas con nombre del diccionario y cada una se encuentra por su nombre', () => {
    const conNombre = DICCIONARIO.filter((e) => e.nombre)
    expect(indice.esquinas).toHaveLength(conNombre.length)
    expect(indice.esquinas.length).toBeGreaterThanOrEqual(320)
    for (const e of indice.esquinas) {
      const r = buscarNombre(indice, e.nombre)
      expect(r, e.nombre).not.toBeNull()
      expect(r.exacta).toBe(true)
      expect(r.entradas.map((x) => x.id)).toContain(e.id)
    }
  })

  test('descarta las entradas sin nombre o con un píxel que no es un par de números', () => {
    const i = indexarEsquinas([
      { nombre: 'Uno', px: [10, 10], verificado: true },
      { nombre: null, px: [20, 20] },
      { nombre: 'Rota', px: ['a', 3] },
      { nombre: '  ', px: [1, 2] },
      { nombre: 'Sin punto' },
    ], PLANO)
    expect(i.esquinas.map((e) => e.nombre)).toEqual(['Uno'])
  })

  test('no muta el diccionario y congela lo que devuelve', () => {
    const copia = structuredClone(DICCIONARIO)
    indexarEsquinas(DICCIONARIO, PLANO)
    expect(DICCIONARIO).toEqual(copia)
    expect(Object.isFrozen(indice.esquinas)).toBe(true)
    expect(Object.isFrozen(esquina('La Torre'))).toBe(true)
  })

  test('sin diccionario queda un índice vacío que no rompe nada', () => {
    const vacio = indexarEsquinas(undefined, PLANO)
    expect(vacio.esquinas).toEqual([])
    expect(resolver(vacio, 'De La Torre a Veroes')).toMatchObject({ tipo: 'moderna' })
    expect(sugerir(vacio, 'la to')).toEqual([])
  })
})

describe('esquinas vecinas', () => {
  const vecinas = (nombre) => indice.vecinas(esquina(nombre)).map((e) => e.nombre).sort()

  test('La Torre tiene una cuadra hacia cada lado', () => {
    expect(vecinas('La Torre')).toEqual(['Las Gradillas', 'Las Madrices', 'Principal', 'Veroes'])
  })

  test('la diagonal de la manzana y la esquina a dos cuadras no son vecinas', () => {
    expect(vecinas('La Torre')).not.toContain('Las Ibarras')
    expect(vecinas('La Torre')).not.toContain('Sociedad')
    expect(vecinas('Principal')).not.toContain('Las Gradillas')
  })

  test('la vecindad es simétrica y nunca pasa del largo máximo de una cuadra', () => {
    for (const a of indice.esquinas) {
      for (const b of indice.vecinas(a)) {
        expect(indice.vecinas(b)).toContain(a)
        expect(Math.hypot(a.px[0] - b.px[0], a.px[1] - b.px[1]) * PLANO.metro).toBeLessThanOrEqual(ADYACENCIA.maxM)
      }
    }
  })

  test('casi todas las esquinas tienen al menos una vecina', () => {
    const solas = indice.esquinas.filter((e) => indice.vecinas(e).length === 0)
    expect(solas.length).toBeLessThan(indice.esquinas.length * 0.02)
  })
})

describe('buscarNombre', () => {
  test('con o sin artículo, con o sin tildes', () => {
    for (const q of ['La Torre', 'torre', 'LA TORRE', 'la tórre']) {
      expect(buscarNombre(indice, q).entradas[0].nombre).toBe('La Torre')
    }
    expect(buscarNombre(indice, 'gradillas').entradas[0].nombre).toBe('Las Gradillas')
    expect(buscarNombre(indice, 'Munoz').entradas[0].nombre).toBe('Muñoz')
  })

  test('perdona una errata chica y avisa que no fue exacta', () => {
    const r = buscarNombre(indice, 'Beroes')
    expect(r.entradas[0].nombre).toBe('Veroes')
    expect(r.exacta).toBe(false)
    expect(buscarNombre(indice, 'Gradiyas').entradas[0].nombre).toBe('Las Gradillas')
    expect(buscarNombre(indice, 'Trapozos').entradas[0].nombre).toBe('Traposos')
  })

  test('no adivina palabras cortas ni cosas que no se parecen', () => {
    expect(buscarNombre(indice, 'Rio')).toMatchObject({ exacta: true })
    expect(buscarNombre(indice, 'Ria')).toBeNull()
    expect(buscarNombre(indice, 'Avenida Urdaneta')).toBeNull()
    expect(buscarNombre(indice, '')).toBeNull()
  })

  test('un nombre repetido devuelve todas sus esquinas, la más cercana a la plaza primero', () => {
    const r = buscarNombre(indice, 'La Cruz')
    expect(r.entradas).toHaveLength(3)
    const d = r.entradas.map((e) => Math.hypot(e.px[0] - PLANO.plaza[0], e.px[1] - PLANO.plaza[1]))
    expect(d).toEqual([...d].sort((a, b) => a - b))
  })

  test('si el nombre escrito coincide con artículo y todo, gana ese ("El Rosario" no es "Rosario")', () => {
    expect(buscarNombre(indice, 'El Rosario').entradas.map((e) => e.nombre)).toEqual(['El Rosario'])
    expect(buscarNombre(indice, 'Rosario').entradas.map((e) => e.nombre)).toEqual(['Rosario'])
  })

  test('los lugares se encuentran por nombre o alias, y solo si se piden', () => {
    expect(buscarNombre(indice, 'Catedral').entradas[0]).toMatchObject({ tipo: 'lugar', id: 'catedral' })
    expect(buscarNombre(indice, 'plaza bolivar').entradas[0]).toMatchObject({ tipo: 'lugar', id: 'plaza-bolivar' })
    expect(buscarNombre(indice, 'Catedral', { soloEsquinas: true })).toBeNull()
  })

  test('una esquina y un lugar con el mismo nombre: va primero la esquina', () => {
    expect(buscarNombre(indice, 'San Francisco').entradas[0]).toMatchObject({ tipo: 'esquina', nombre: 'San Francisco' })
  })
})

describe('resolver', () => {
  test.each([
    'De La Torre a Veroes', 'de la torre a veroes', 'La Torre a Veroes', 'torre a veroes', 'DE LA TORRE A VEROES',
    'entre La Torre y Veroes', 'La Torre con Veroes', 'La Torre - Veroes', 'De la esquina de La Torre a la esquina de Veroes',
    'Esq. La Torre a esq. Veroes', 'de la tore a beroes', 'Entre las esquinas de La Torre y Veroes',
  ])('«%s» es la cuadra de La Torre a Veroes', (q) => {
    const r = resolver(indice, q)
    expect(r.tipo).toBe('cuadra')
    expect([r.a.nombre, r.b.nombre]).toEqual(['La Torre', 'Veroes'])
    expect(r.adyacentes).toBe(true)
    expect(r.numero).toBeNull()
  })

  test('la cuadra trae su punto medio, su largo en metros y hacia dónde va', () => {
    const r = resolver(indice, 'De La Torre a Veroes')
    const [a, b] = [esquina('La Torre').px, esquina('Veroes').px]
    expect(r.px[0]).toBeCloseTo((a[0] + b[0]) / 2, 6)
    expect(r.px[1]).toBeCloseTo((a[1] + b[1]) / 2, 6)
    expect(r.largo).toBeCloseTo(133.9, 0)
    expect(r.hacia).toBe('norte')
    expect(resolver(indice, 'De Veroes a La Torre').hacia).toBe('sur')
    expect(resolver(indice, 'De La Torre a Madrices').hacia).toBe('este')
  })

  test('el número de la casa se conserva', () => {
    const r = resolver(indice, 'Sociedad a Traposos n.º 12')
    expect(r).toMatchObject({ tipo: 'cuadra', numero: '12', adyacentes: true })
    expect([r.a.nombre, r.b.nombre]).toEqual(['Sociedad', 'Traposos'])
  })

  test('dos esquinas que no son vecinas: lo dice, con la distancia', () => {
    const r = resolver(indice, 'De La Torre a Sociedad')
    expect(r).toMatchObject({ tipo: 'cuadra', adyacentes: false })
    expect(r.largo).toBeGreaterThan(200)
    expect(resolver(indice, 'La Torre a Las Ibarras').adyacentes).toBe(false)
  })

  test('con nombres repetidos elige el par que sí es una cuadra', () => {
    for (const a of indice.esquinas.filter((e) => buscarNombre(indice, e.nombre).entradas.length > 1)) {
      for (const b of indice.vecinas(a)) {
        const r = resolver(indice, `De ${a.nombre} a ${b.nombre}`)
        expect(r.tipo, `${a.nombre} a ${b.nombre}`).toBe('cuadra')
        expect(r.adyacentes, `${a.nombre} a ${b.nombre}`).toBe(true)
      }
    }
  })

  test('todas las cuadras del diccionario se resuelven escritas "De X a Y"', () => {
    let cuadras = 0
    for (const a of indice.esquinas) {
      for (const b of indice.vecinas(a)) {
        const r = resolver(indice, `De ${a.nombre} a ${b.nombre}`)
        expect(r.tipo, `${a.nombre} a ${b.nombre}`).toBe('cuadra')
        expect(r.adyacentes, `${a.nombre} a ${b.nombre}`).toBe(true)
        cuadras++
      }
    }
    expect(cuadras / 2).toBeGreaterThan(500)
  })

  test.each(['Esquina de Gradillas', 'esq. Gradillas', 'Gradillas', 'las gradillas', 'la esquina de las Gradillas', 'En la esquina de Gradillas', 'gradiyas'])(
    '«%s» es la esquina de Las Gradillas', (q) => {
      const r = resolver(indice, q)
      expect(r.tipo).toBe('esquina')
      expect(r.esquina.nombre).toBe('Las Gradillas')
      expect(r.px).toEqual(esquina('Las Gradillas').px)
    })

  test('nombres con "de", "el" o "a" adentro no se parten', () => {
    expect(resolver(indice, 'Pele el Ojo')).toMatchObject({ tipo: 'esquina', esquina: { nombre: 'Pele el Ojo' } })
    expect(resolver(indice, 'Luneta de la Merced')).toMatchObject({ tipo: 'esquina' })
    expect(resolver(indice, 'de Gracia de Dios a Luneta de la Merced')).toMatchObject({ tipo: 'cuadra' })
    expect(resolver(indice, 'Ña Romualda')).toMatchObject({ tipo: 'esquina', esquina: { nombre: 'Ña Romualda' } })
    expect(resolver(indice, '9 de Febrero')).toMatchObject({ tipo: 'esquina', esquina: { nombre: '9 de Febrero' } })
  })

  test('una esquina de nombre repetido avisa de las otras', () => {
    const r = resolver(indice, 'La Cruz')
    expect(r.tipo).toBe('esquina')
    expect(r.otras).toHaveLength(2)
  })

  test('la misma esquina dos veces es esa esquina', () => {
    expect(resolver(indice, 'De Veroes a Veroes')).toMatchObject({ tipo: 'esquina', esquina: { nombre: 'Veroes' } })
  })

  test('un lugar con nombre', () => {
    expect(resolver(indice, 'Catedral')).toMatchObject({ tipo: 'lugar', lugar: { id: 'catedral' }, px: [9079, 6803] })
    expect(resolver(indice, 'la plaza bolívar')).toMatchObject({ tipo: 'lugar', lugar: { id: 'plaza-bolivar' } })
  })

  test('lo que no está en el diccionario es una dirección moderna, con el texto tal como se escribió', () => {
    expect(resolver(indice, ' Avenida Urdaneta ')).toEqual({ tipo: 'moderna', texto: 'Avenida Urdaneta', parcial: null })
    expect(resolver(indice, 'Av. Sucre con Calle Colombia')).toMatchObject({ tipo: 'moderna' })
  })

  test('"De X a Y" con una sola esquina conocida: moderna, pero dice cuál conoce y cuál no', () => {
    const r = resolver(indice, 'De La Torre a Xanadú')
    expect(r.tipo).toBe('moderna')
    expect(r.parcial.conocida.nombre).toBe('La Torre')
    expect(r.parcial.desconocida).toBe('xanadu')
  })

  test('vacía o solo signos', () => {
    expect(resolver(indice, '')).toEqual({ tipo: 'vacia' })
    expect(resolver(indice, ' ¿? ')).toEqual({ tipo: 'vacia' })
    expect(resolver(indice, undefined)).toEqual({ tipo: 'vacia' })
  })

  test('una consulta enorme no cuelga nada: se corta', () => {
    expect(resolver(indice, 'a '.repeat(5000)).tipo).toBe('moderna')
    expect(resolver(indice, 'x'.repeat(100000)).texto.length).toBeLessThanOrEqual(200)
  })
})

describe('sugerir', () => {
  const textos = (q, max) => sugerir(indice, q, max).map((s) => s.texto)

  test('primero las que empiezan así; después las que tienen una palabra que empieza así', () => {
    const s = textos('torr')
    expect(s[0]).toBe('La Torre')
    expect(s).toContain('Torrero')
    const camilo = textos('tor', 20)
    expect(camilo.indexOf('La Torre')).toBeLessThan(camilo.indexOf('Camilo Torres'))
  })

  test('después las parecidas (erratas)', () => {
    expect(textos('beroe')).toContain('Veroes')
    expect(textos('gradiy')[0]).toBe('Las Gradillas')
  })

  test('respeta el máximo y no repite', () => {
    const s = textos('san', 5)
    expect(s).toHaveLength(5)
    expect(sugerir(indice, 'san', 50).length).toBeGreaterThan(20)
    const ids = sugerir(indice, 's', 400).map((x) => `${x.tipo}:${x.resultado.px}:${x.texto}`)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('entre iguales, primero las más cercanas a la plaza', () => {
    const s = sugerir(indice, 'la cruz')
    expect(s.slice(0, 3).every((x) => x.texto === 'La Cruz')).toBe(true)
    const d = s.slice(0, 3).map((x) => Math.hypot(x.resultado.px[0] - PLANO.plaza[0], x.resultado.px[1] - PLANO.plaza[1]))
    expect(d).toEqual([...d].sort((a, b) => a - b))
  })

  test('con una esquina completa ofrece también sus cuadras', () => {
    const s = textos('La Torre')
    expect(s[0]).toBe('La Torre')
    expect(s).toEqual(expect.arrayContaining(['De La Torre a Veroes', 'De La Torre a Principal', 'De La Torre a Las Madrices', 'De La Torre a Las Gradillas']))
  })

  test('escribiendo "de X a …" ofrece las cuadras que salen de X, filtradas por lo que sigue', () => {
    expect(textos('de la torre a ').sort()).toEqual(['De La Torre a Las Gradillas', 'De La Torre a Las Madrices', 'De La Torre a Principal', 'De La Torre a Veroes'])
    expect(textos('la torre a ve')).toEqual(['De La Torre a Veroes'])
    expect(textos('de la torre a bero')).toEqual(['De La Torre a Veroes'])
  })

  test('cada sugerencia trae su resultado ya resuelto', () => {
    const [s] = sugerir(indice, 'la torre a ve')
    expect(s).toMatchObject({ tipo: 'cuadra', resultado: { tipo: 'cuadra', adyacentes: true } })
    expect(sugerir(indice, 'catedr')[0]).toMatchObject({ tipo: 'lugar', texto: 'Catedral de Caracas', resultado: { tipo: 'lugar' } })
    expect(sugerir(indice, 'veroe')[0]).toMatchObject({ tipo: 'esquina', resultado: { tipo: 'esquina', esquina: { nombre: 'Veroes' } } })
  })

  test('nada que sugerir', () => {
    expect(sugerir(indice, '')).toEqual([])
    expect(sugerir(indice, '   ')).toEqual([])
    expect(sugerir(indice, 'xqzwk')).toEqual([])
  })
})
