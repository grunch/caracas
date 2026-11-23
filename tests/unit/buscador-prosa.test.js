import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { indexarEsquinas, resolver, sugerir } from '../../src/buscador.js'
import { lugaresDe } from '../../src/buscador/lugares.js'
import { rumbo, aQueDistancia, fraseEpoca, responder, pista, noEncontre, avisoDeError } from '../../src/buscador/prosa.js'
import { HITOS } from '../../src/hitos.js'

const DICCIONARIO = JSON.parse(readFileSync(new URL('../../tools/geo/esquinas/1936-esquinas.json', import.meta.url), 'utf8'))
const indice = indexarEsquinas(DICCIONARIO, { metro: 0.5, plaza: [8968.2, 6839], lugares: lugaresDe(HITOS) })
const EPOCAS = [1578, 1772, 1843, 1889, 1911, 1936].map((año) => ({ año }))
const DESDE_1772 = { edificado: 1, urbanizado: 1 }
const ctx = (epoca, etapas = DESDE_1772) => ({ indice, epoca, primera: 1, epocas: EPOCAS, etapas: () => etapas })
const SIN_EPOCAS = { indice, epoca: null, epocas: null, etapas: null }
const responde = (q, c) => responder(resolver(indice, q), c)

describe('rumbo y distancia', () => {
  test('ocho rumbos, con la y del plano hacia el sur', () => {
    expect(rumbo(0, -10)).toBe('norte')
    expect(rumbo(10, -10)).toBe('noreste')
    expect(rumbo(10, 0)).toBe('este')
    expect(rumbo(10, 10)).toBe('sureste')
    expect(rumbo(0, 10)).toBe('sur')
    expect(rumbo(-10, 10)).toBe('suroeste')
    expect(rumbo(-10, 0)).toBe('oeste')
    expect(rumbo(-10, -10)).toBe('noroeste')
    expect(rumbo(10, -1)).toBe('este')
  })

  test('las distancias se dicen en cuadras y, de lejos, en kilómetros', () => {
    expect(aQueDistancia(20)).toBe('junto')
    expect(aQueDistancia(70)).toBe('a media cuadra')
    expect(aQueDistancia(130)).toBe('a una cuadra')
    expect(aQueDistancia(400)).toBe('a 3 cuadras')
    expect(aQueDistancia(1240)).toBe('a 1,2 km')
  })
})

describe('fraseEpoca', () => {
  test('ya edificada en la época elegida; si es ciudad de antes, dice desde cuándo', () => {
    expect(fraseEpoca(DESDE_1772, ctx(1))).toBe('En 1772 ya estaba edificada.')
    expect(fraseEpoca(DESDE_1772, ctx(5))).toBe('En 1936 ya estaba edificada. Es ciudad desde el plano de 1772.')
    expect(fraseEpoca({ edificado: 3, urbanizado: 2 }, ctx(4), 'o')).toBe('En 1911 ya estaba edificado. Es ciudad desde el plano de 1843.')
  })

  test('lo anterior a la primera época que se muestra no se cuenta (el esquema de 1578 no está en la línea de tiempo)', () => {
    expect(fraseEpoca({ edificado: 0, urbanizado: 0 }, ctx(1))).toBe('En 1772 ya estaba edificada.')
    expect(fraseEpoca({ edificado: 0, urbanizado: 0 }, ctx(5))).toBe('En 1936 ya estaba edificada. Es ciudad desde el plano de 1772.')
    expect(fraseEpoca({ edificado: 0, urbanizado: 0 }, { ...ctx(1), primera: 0 })).toBe('En 1772 ya estaba edificada. Es ciudad desde el plano de 1578.')
  })

  test('"edificado" es "sin interrupción desde": si no alcanza, no se niega que hubiera casas', () => {
    expect(fraseEpoca({ edificado: 3, urbanizado: 1 }, ctx(1))).toBe('En 1772 ya era parte de la ciudad.')
    expect(fraseEpoca({ edificado: Infinity, urbanizado: 1 }, ctx(2))).toBe('En 1843 ya era parte de la ciudad. Es ciudad desde el plano de 1772.')
  })

  test('campo todavía, y nunca', () => {
    expect(fraseEpoca({ edificado: 4, urbanizado: 3 }, ctx(1))).toBe('En 1772 esto todavía era campo: la ciudad llega aquí en el plano de 1889.')
    expect(fraseEpoca({ edificado: Infinity, urbanizado: Infinity }, ctx(1))).toBe('En 1772 esto no era ciudad, y los planos no lo muestran como ciudad ni siquiera en 1936.')
  })

  test('sin datos de épocas no dice nada; sin época elegida habla de la última', () => {
    expect(fraseEpoca(null, ctx(1))).toBe('')
    expect(fraseEpoca(DESDE_1772, SIN_EPOCAS)).toBe('')
    expect(fraseEpoca(DESDE_1772, ctx(null))).toBe('En 1936 ya estaba edificada. Es ciudad desde el plano de 1772.')
  })
})

describe('responder', () => {
  test('De La Torre a Veroes: la cuadra al norte de la Catedral, ya edificada en 1772', () => {
    const r = responde('De La Torre a Veroes', ctx(1))
    expect(r.titulo).toBe('De La Torre a Veroes')
    expect(r.texto).toBe('La cuadra al norte de la Catedral. Va hacia el norte, unos 135 m. En 1772 ya estaba edificada.')
    expect(r.px).toEqual(resolver(indice, 'De La Torre a Veroes').px)
    expect(r.osm).toBe(false)
    expect(r.vista).toBeCloseTo(134, 0)
  })

  test('la misma cuadra en 1936 cuenta desde cuándo', () => {
    expect(responde('De La Torre a Veroes', ctx(5)).texto).toContain('En 1936 ya estaba edificada. Es ciudad desde el plano de 1772.')
  })

  test('sin datos de épocas (la ciudad de demostración) la respuesta no habla de años', () => {
    expect(responde('De La Torre a Veroes', SIN_EPOCAS).texto).toBe('La cuadra al norte de la Catedral. Va hacia el norte, unos 135 m.')
  })

  test('un hito que todavía no existe en la época elegida no se da por hecho', () => {
    // la Santa Capilla está modelada desde 1889 (el Capitolio ya no sirve de ejemplo: desde T41d es convento en 1772)
    expect(responde('De Mijares a Jesuitas', ctx(1)).texto).toMatch(/^La cuadra (junto a|al \w+ de) donde esta reconstrucción pone después la Santa Capilla\./)
    expect(responde('De Mijares a Jesuitas', ctx(3)).texto).toMatch(/^La cuadra (que pasa junto a la|al \w+ de la) Santa Capilla\./)
    expect(responde('De Padre Sierra a La Bolsa', ctx(1)).texto).toMatch(/^La cuadra (que pasa junto al|al \w+ del) Capitolio\./)
  })

  test('lejos de todo hito, la referencia es la Plaza Bolívar', () => {
    const lejos = indice.esquinas.find((e) => e.aLaPlaza > 1500 && indice.vecinas(e).length)
    const r = responder(resolver(indice, `De ${lejos.nombre} a ${indice.vecinas(lejos)[0].nombre}`), ctx(1))
    expect(r.texto).toMatch(/^Queda a \d,\d km al \w+ de la Plaza Bolívar\./)
  })

  test('el número de la casa: está en la cuadra, pero el plano no dice dónde', () => {
    const r = responde('Sociedad a Traposos n.º 12', ctx(1))
    expect(r.titulo).toBe('De Sociedad a Traposos')
    expect(r.texto).toContain('El n.º 12 está en esta cuadra; el plano no dice en qué puerta.')
    expect(r.texto).toContain('La lectura de «Traposos» en el plano es dudosa.')
  })

  test('dos esquinas que no son vecinas: lo dice, y ofrece las que sí', () => {
    const r = responde('De La Torre a Sociedad', ctx(1))
    expect(r.texto).toMatch(/^La Torre y Sociedad no son esquinas vecinas en el plano de 1936: las separan unos 240 m, más de una cuadra\. Te marco el punto medio\./)
    expect(r.texto).toContain('De La Torre salen cuadras a')
    expect(r.texto).not.toContain('edificada')
    expect(r.px).not.toBeNull()
  })

  test('una esquina: dónde queda, qué cuadras salen de ella y qué había', () => {
    const r = responde('Esquina de Gradillas', ctx(1))
    expect(r.titulo).toBe('Esquina de Las Gradillas')
    // desde T41e el Palacio Arzobispal ocupa la esquina: es la referencia más cercana (a menos de 150 m)
    expect(r.texto).toMatch(/^Queda junto al Palacio Arzobispal\. De aquí salen cuadras a /)
    expect(r.texto).toContain('La Torre')
    expect(r.texto).toMatch(/En 1772 ya estaba edificada\.$/)
  })

  test('una esquina de nombre repetido lo avisa', () => {
    expect(responde('La Cruz', ctx(1)).texto).toContain('En el plano hay otras 2 esquinas con este nombre.')
    expect(responde('Santa Isabel', ctx(1)).texto).toContain('En el plano hay otra esquina con este nombre.')
  })

  test('un lugar: dónde queda y si ya existía', () => {
    // el hito más cercano a la Catedral es, desde T41e, el Palacio Arzobispal, a su lado sur
    expect(responde('Catedral', ctx(1))).toMatchObject({ titulo: 'Catedral de Caracas', texto: 'Queda a media cuadra al norte del Palacio Arzobispal. En 1772 ya figura en esta reconstrucción.' })
    expect(responde('Palacio Episcopal', ctx(1))).toMatchObject({ titulo: 'Palacio Arzobispal', texto: 'Queda a media cuadra al sur de la Catedral. En 1772 ya figura en esta reconstrucción.' })
    expect(responde('Universidad', ctx(1)).texto).toMatch(/En 1772 todavía no figura en esta reconstrucción: aparece desde 1889\.$/)
    expect(responde('Capitolio', ctx(1)).texto).toMatch(/En 1772 ya figura en esta reconstrucción\.$/)
    expect(responde('Plaza Bolívar', ctx(1)).texto).toBe('En 1772 ya figura en esta reconstrucción.')
    // `nace` es desde cuándo está modelado, no cuándo se construyó: la prosa no habla de construir ni de existir
    for (const q of ['Capitolio', 'Casa Amarilla', 'Universidad', 'De Padre Sierra a La Bolsa']) expect(responde(q, ctx(1)).texto).not.toMatch(/exist|levant|(?<!re)constru/)
    expect(responde('Catedral', SIN_EPOCAS).texto).toBe('Queda a media cuadra al norte del Palacio Arzobispal.')
  })

  test('una dirección de hoy que cae sobre una cuadra o una esquina del diccionario lo dice', () => {
    const cuadra = resolver(indice, 'De La Torre a Veroes')
    const r = responder({ tipo: 'moderna', nombre: 'Avenida Norte', px: [cuadra.px[0] + 10, cuadra.px[1]], dentro: true }, ctx(1))
    expect(r).toMatchObject({ titulo: 'Avenida Norte', osm: true })
    expect(r.texto).toBe('Hoy queda en la cuadra de La Torre a Veroes. En 1772 ya estaba edificado.')
    const veroes = resolver(indice, 'Veroes').px
    expect(responder({ tipo: 'moderna', nombre: 'X', px: [veroes[0] + 20, veroes[1] + 20], dentro: true }, ctx(1)).texto).toMatch(/^Hoy queda en la esquina de Veroes\./)
  })

  test('una dirección de hoy lejos de las esquinas: respecto de la plaza, con lo que había', () => {
    const r = responder({ tipo: 'moderna', nombre: 'Algún lugar', px: [15000, 3000], dentro: true }, ctx(1, { edificado: Infinity, urbanizado: Infinity }))
    expect(r.texto).toMatch(/^Queda a \d,\d km al noreste de la Plaza Bolívar\. En 1772 esto no era ciudad/)
    expect(r.px).toEqual([15000, 3000])
  })

  test('fuera de la hoja: lo dice y no clava el alfiler', () => {
    const r = responder({ tipo: 'moderna', nombre: 'Petare', px: [30000, 9000], dentro: false }, ctx(1))
    expect(r.texto).toMatch(/^Queda fuera del plano de 1936: a \d+,\d km al este de la Plaza Bolívar\.$/)
    expect(r.px).toBeNull()
    expect(r.osm).toBe(true)
    expect(responder({ tipo: 'moderna', nombre: 'Raro', px: null, dentro: false }, ctx(1)).px).toBeNull()
  })

  test('un tipo que no se sabe responder es un error de programación', () => {
    expect(() => responder({ tipo: 'vacia' }, ctx(1))).toThrow(/vacia/)
    expect(() => responder(null, ctx(1))).toThrow()
  })

  test('todas las cuadras y esquinas del diccionario tienen respuesta, sin "undefined" ni "NaN"', () => {
    for (const e of indice.esquinas) {
      const frases = [responder(resolver(indice, e.nombre), ctx(3)), ...indice.vecinas(e).map((v) => responder(resolver(indice, `De ${e.nombre} a ${v.nombre}`), ctx(3)))]
      for (const f of frases) expect(`${f.titulo} ${f.texto}`).not.toMatch(/undefined|NaN|null|Infinity| {2}/)
    }
  })
})

describe('pista, noEncontre y avisoDeError', () => {
  test('la pista dice qué es cada sugerencia y por dónde queda', () => {
    expect(pista(sugerir(indice, 'veroe')[0], ctx(1))).toBe('esquina, a una cuadra al noreste de la plaza')
    expect(pista(sugerir(indice, 'la torre a ve')[0], ctx(1))).toBe('cuadra hacia el norte, 135 m')
    expect(pista(sugerir(indice, 'capitol')[0], ctx(1))).toMatch(/^lugar, a (una cuadra|\d cuadras) al suroeste de la plaza$/)
  })

  test('cuando no hay nada, enseña cómo se busca', () => {
    expect(noEncontre('xyz')).toBe('No encontré «xyz». Prueba con dos esquinas («De La Torre a Veroes»), con una sola («Gradillas») o con una dirección de hoy («Avenida Urdaneta»).')
    const { parcial } = resolver(indice, 'De La Torre a Xanadú')
    expect(noEncontre('De La Torre a Xanadú', parcial)).toContain('Conozco la esquina de La Torre, pero no «xanadu».')
  })

  test('cada motivo de error tiene su aviso, sin tecnicismos', () => {
    for (const motivo of ['red', 'servicio', 'limite', 'respuesta']) {
      expect(avisoDeError(motivo)).toMatch(/intentarlo/)
      expect(avisoDeError(motivo)).not.toMatch(/fetch|HTTP|JSON|Nominatim/)
    }
    expect(avisoDeError('red')).not.toBe(avisoDeError('limite'))
  })
})
