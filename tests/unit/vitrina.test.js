import { describe, test, expect } from 'vitest'
import { ordenDeVitrina, seccionesDeEdificios, margenDelMedio } from '../../src/vitrina.js'

const ORIGEN = 'https://caracas.city'
const evento = (data, origin = ORIGEN) => ({ origin, data })

describe('ordenDeVitrina', () => {
  test('acepta las órdenes conocidas del mismo origen', () => {
    expect(ordenDeVitrina(evento({ vitrina: { ir: 'catedral' } }), ORIGEN)).toEqual({ tipo: 'ir', id: 'catedral' })
    expect(ordenDeVitrina(evento({ vitrina: { epoca: 3 } }), ORIGEN)).toEqual({ tipo: 'epoca', indice: 3 })
    expect(ordenDeVitrina(evento({ vitrina: { levantar: true } }), ORIGEN)).toEqual({ tipo: 'levantar' })
    expect(ordenDeVitrina(evento({ vitrina: { girar: false } }), ORIGEN)).toEqual({ tipo: 'girar', si: false })
  })

  test('la pregunta «¿lista?» de la página que la embebe (la que escucha tarde), solo del mismo origen', () => {
    expect(ordenDeVitrina(evento({ vitrina: '¿lista?' }), ORIGEN)).toEqual({ tipo: 'pregunta' })
    expect(ordenDeVitrina(evento({ vitrina: '¿lista?' }, 'https://otro.example'), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento({ vitrina: 'lista' }), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento({ vitrina: '¿otra?' }), ORIGEN)).toBeNull()
  })

  test('descarta lo que viene de otro origen, lo que no es de la vitrina y lo malformado', () => {
    expect(ordenDeVitrina(evento({ vitrina: { ir: 'catedral' } }, 'https://otro.example'), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento({ otra: 1 }), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento('texto'), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento(null), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento({ vitrina: { ir: 42 } }), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento({ vitrina: { ir: '<script>' } }), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento({ vitrina: { epoca: 2.5 } }), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento({ vitrina: { epoca: -1 } }), ORIGEN)).toBeNull()
    expect(ordenDeVitrina(evento({ vitrina: { borrar: true } }), ORIGEN)).toBeNull()
  })
})

describe('seccionesDeEdificios', () => {
  const marca = (id, nace, nombres, extra = {}) => ({ id, nace, muere: 0, hito: id, nombres: nombres.map(([desde, nombre, nota = '']) => ({ desde, nombre, nota })), ...extra })
  const marcas = [
    marca('guaire', 1, [[1, 'Río Guaire']], { hito: null }),
    marca('capilla', 3, [[3, 'Santa Capilla', 'La capilla neogótica.']]),
    marca('catedral', 1, [[1, 'Catedral']]),
    marca('plaza', 1, [[1, 'Plaza Mayor'], [3, 'Plaza Bolívar']]),
  ]
  const fichas = { catedral: { textos: [[1, 'La iglesia mayor de la ciudad.'], [4, 'Otro párrafo.']] } }

  test('un artículo por edificio modelado (los que tienen hito), en orden de aparición y luego como vienen', () => {
    const s = seccionesDeEdificios(marcas, fichas)
    expect(s.map((x) => x.id)).toEqual(['catedral', 'plaza', 'capilla'])
  })

  test('con el año en que aparece, su primer nombre y el último si cambió, y el primer párrafo de su ficha o su nota', () => {
    const [catedral, plaza, capilla] = seccionesDeEdificios(marcas, fichas)
    expect(catedral).toMatchObject({ año: 1772, epoca: 1, nombre: 'Catedral', antes: null, texto: 'La iglesia mayor de la ciudad.' })
    expect(plaza).toMatchObject({ nombre: 'Plaza Bolívar', antes: 'Plaza Mayor' })
    expect(capilla).toMatchObject({ año: 1889, epoca: 3, texto: 'La capilla neogótica.' })
  })
})

describe('margenDelMedio', () => {
  // los porcentajes de rootMargin se resuelven contra el ANCHO de la raíz (W3C), así que van en píxeles del alto
  test('deja la franja del 10 % del medio del alto de la ventana, en píxeles', () => {
    expect(margenDelMedio(640)).toBe('-288px 0px -288px 0px')
    expect(margenDelMedio(1000)).toBe('-450px 0px -450px 0px')
  })

  test('redondea y nunca deja la franja vacía (ventanas chicas o alto inválido)', () => {
    expect(margenDelMedio(641)).toBe('-288px 0px -288px 0px')
    expect(margenDelMedio(1)).toBe('0px 0px 0px 0px')
    expect(margenDelMedio(0)).toBe('0px 0px 0px 0px')
    expect(margenDelMedio(Number.NaN)).toBe('0px 0px 0px 0px')
  })
})
