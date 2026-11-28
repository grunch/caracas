// Avenida Bolívar en 1946 (#276): la ficha de evidencias y la lectura del plano tienen forma comprobable, y el
// mapa de 1946 no adelanta la avenida que abrió el 31-12-1949.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { MARCAS } from '../../src/marcas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, vivaEn } from '../../src/marcas.js'
import { crearCoords } from '../../src/coords.js'
import { puntoEnPoligono } from '../../src/hitos/suprimir.js'

const leer = (ruta) => JSON.parse(readFileSync(new URL(`../../${ruta}`, import.meta.url), 'utf8'))
const BOLIVAR = leer('tools/geo/referencias/1946-avenida-bolivar.json')
const RESERVAS = leer('tools/geo/referencias/1946-reservas.json')
const EPOCA_1946 = 6
const AÑO_DEL_MAPA = 1946
const coords = crearCoords({ ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] })
const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
const añoDe = (fecha) => Math.min(...fecha.match(/\d{4}/g).map(Number))
const centro = (poligono) => [0, 1].map((k) => poligono.reduce((s, v) => s + v[k], 0) / poligono.length)

describe('ficha de evidencias de la avenida Bolívar', () => {
  it('cada etapa trae hecho, fecha, certeza declarada y sus fuentes con enlace', () => {
    // Arrange
    const certezas = Object.keys(BOLIVAR.certezas)

    // Act
    const mal = BOLIVAR.etapas.filter((e) => !e.hecho || !/\d{4}/.test(e.fechaHecho) || !certezas.includes(e.certeza)
      || e.fuentes.some((f) => !/^https?:\/\//.test(f.url) || !f.documento))

    // Assert
    expect(BOLIVAR.etapas.length).toBeGreaterThanOrEqual(8)
    expect(mal.map((e) => e.id)).toEqual([])
  })

  it('solo queda sin fuente lo que se declara sin acreditar', () => {
    const sinFuente = BOLIVAR.etapas.filter((e) => e.fuentes.length === 0)

    expect(sinFuente.every((e) => e.certeza === 'sin-acreditar')).toBe(true)
  })

  it('ninguna obra física fechada hasta 1946 pasa por acreditada', () => {
    // Arrange: los planes y las comisiones no son obra en el terreno
    const obras = BOLIVAR.etapas.filter((e) => e.tipo === 'obra' && añoDe(e.fechaHecho) <= AÑO_DEL_MAPA)

    // Assert
    expect(obras.length).toBeGreaterThan(0)
    expect(obras.map((e) => e.certeza)).toEqual(obras.map(() => 'sin-acreditar'))
  })

  it('la apertura es de 1949 y no repite la atribución a Pérez Jiménez', () => {
    const apertura = BOLIVAR.etapas.find((e) => e.id === 'apertura-1949')

    expect(apertura.fechaHecho).toBe('1949-12-31')
    expect(apertura.hecho).toContain('Delgado Chalbaud')
    expect(apertura.hecho).not.toContain('Pérez Jiménez')
  })
})

describe('lectura del corredor en el plano de 1946', () => {
  it('cada tramo dice su trazo y trae el polígono en el original y en el mosaico', () => {
    const mal = BOLIVAR.tramos.filter((t) => !['lleno', 'discontinuo', 'en blanco'].includes(t.trazo) || !t.en1936 || !t.lectura
      || t.poligono_original.length < 3 || t.poligono_mosaico.length !== t.poligono_original.length)

    expect(mal.map((t) => t.id)).toEqual([])
  })

  it('lo que el plano deja en blanco es una franja y dos solares, no el corredor entero', () => {
    // Arrange
    const area = (p) => Math.abs(p.reduce((s, [x, y], i) => { const [u, v] = p[(i + 1) % p.length]; return s + x * v - u * y }, 0)) / 2
    const enBlanco = BOLIVAR.tramos.filter((t) => t.trazo === 'en blanco')

    // Act
    const fraccion = enBlanco.reduce((s, t) => s + area(t.poligono_mosaico), 0) / area(BOLIVAR.corredor.poligono_mosaico)

    // Assert
    expect(enBlanco.map((t) => t.id)).toEqual(['franja-entre-bloques', 'frente-del-teatro', 'manzana-al-oeste-del-teatro'])
    expect(fraccion).toBeLessThan(0.05)
  })

  it('la franja en blanco cae dentro del corredor entre la Este 6 y la Este 8', () => {
    const franja = BOLIVAR.tramos.find((t) => t.id === 'franja-entre-bloques')

    expect(puntoEnPoligono(centro(franja.poligono_mosaico), BOLIVAR.corredor.poligono_mosaico)).toBe(true)
  })

  it('el paquete conserva en 1946 los techos que el corredor tenía en 1936', () => {
    expect(BOLIVAR.corredor.techos['1946']).toBe(BOLIVAR.corredor.techos['1936'])
    expect(BOLIVAR.corredor.techos['1936']).toBeGreaterThan(200)
  })
})

describe('el mapa de 1946 no adelanta la avenida', () => {
  it('no hay reserva de la avenida mientras ninguna demolición tenga fecha', () => {
    expect(BOLIVAR.decision.reservaEn1946).toBe(false)
    expect(RESERVAS.reservas.some((r) => /bol[ií]var/i.test(r.nombre))).toBe(false)
  })

  it('ninguna marca ni hito se llama avenida Bolívar o Centro Simón Bolívar en las épocas del visor', () => {
    const adelantado = /avenida bol[ií]var|centro sim[oó]n bol[ií]var/i

    expect(MARCAS.filter((m) => adelantado.test(JSON.stringify(m.nombres ?? m.nombre))).map((m) => m.id)).toEqual([])
    expect(HITOS.filter((h) => /avenida-bolivar|simon-bolivar|csb/.test(h.id)).map((h) => h.id)).toEqual([])
  })

  it('el Hotel Majestic y el Teatro Municipal siguen en pie en 1946', () => {
    for (const id of ['hotel-majestic', 'teatro-municipal']) {
      expect(vivaEn(marcas.find((m) => m.id === id), EPOCA_1946), id).toBe(true)
    }
  })

  it('el Hotel Majestic cae en la mitad sur de la manzana que el plano parte, no en la franja', () => {
    // Arrange
    const majestic = MARCAS.find((m) => m.id === 'hotel-majestic')
    const tramo = (id) => BOLIVAR.tramos.find((t) => t.id === id).poligono_mosaico

    // Assert
    expect(puntoEnPoligono([majestic.x, majestic.y], tramo('resto-sur'))).toBe(true)
    expect(puntoEnPoligono([majestic.x, majestic.y], tramo('franja-entre-bloques'))).toBe(false)
  })
})
