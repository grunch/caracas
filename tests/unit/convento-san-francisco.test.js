import { describe, test, expect } from 'vitest'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { conventoSanFrancisco, COLUMNA, PATIOS } from '../../src/hitos/datos/convento-san-francisco.js'
import { EJE_DAMERO, METRO } from '../../src/hitos/datos/marco.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { normalizarMarcas, nombreEn } from '../../src/marcas.js'
import { validarFichas } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const [UX, UY] = EJE_DAMERO

/** Un punto del marco del convento (a metros al este, b metros al sur del medio del frente de la Universidad), en píxeles. */
const px = (a, b) => [conventoSanFrancisco.x + (a * UX - b * UY) / METRO, conventoSanFrancisco.y + (a * UY + b * UX) / METRO]
/** Un píxel del plano, en metros del marco del convento. */
const enMarco = ([x, y]) => {
  const [dx, dy] = [x - conventoSanFrancisco.x, y - conventoSanFrancisco.y]
  return [(dx * UX + dy * UY) * METRO, (-dx * UY + dy * UX) * METRO]
}
const cajaDe = (poligonos) => {
  const puntos = poligonos.flat().map(enMarco)
  const [as, bs] = [puntos.map(([a]) => a), puntos.map(([, b]) => b)]
  return { a0: Math.min(...as), a1: Math.max(...as), b0: Math.min(...bs), b1: Math.max(...bs) }
}

/** Los vértices de un hito que están en pie en `epoca`, en metros del marco del convento, con su altura. */
function verticesEn(datos, id, epoca) {
  const { desde, hasta } = datos.rangos.find((r) => r.id === id)
  const origen = coords.aMundo(conventoSanFrancisco.x, conventoSanFrancisco.y)
  const vertices = []
  for (let i = desde; i < hasta; i++) {
    const [nace, muere] = [datos.vidas[i * 2], datos.vidas[i * 2 + 1]]
    if (nace > epoca || (muere && muere <= epoca)) continue
    const [dx, dz] = [datos.posiciones[i * 3] - origen.x, datos.posiciones[i * 3 + 2] - origen.z]
    vertices.push({ a: dx * UX + dz * UY, b: -dx * UY + dz * UX, y: datos.posiciones[i * 3 + 1] })
  }
  return vertices
}
const cima = (vertices) => Math.max(...vertices.map((v) => v.y))

describe('el convento de San Francisco antes de la Universidad (#254)', () => {
  const datos = construirHitos(HITOS, coords)
  const h = HITOS.find((x) => x.id === 'convento-san-francisco')
  const universidad = HITOS.find((x) => x.id === 'universidad')
  const iglesia = HITOS.find((x) => x.id === 'san-francisco')
  const plantasEn = (epoca) => hitosConPlanta()
    .filter((p) => p.id === 'convento-san-francisco' && p.nace <= epoca && (!p.muere || p.muere > epoca))
    .flatMap((p) => p.planta)

  test('está en HITOS, después de los que ya estaban (cada hito lleva de semilla su lugar), y pasa la validación', () => {
    expect(h).toBe(conventoSanFrancisco)
    for (const id of ['universidad', 'san-francisco', 'san-jose']) {
      expect(HITOS.indexOf(h)).toBeGreaterThan(HITOS.findIndex((x) => x.id === id))
    }
    expect(validarHitos([conventoSanFrancisco], PLANO)).toEqual([])
  })

  test('está en pie en 1772 y 1843 y deja el lugar a la Universidad en 1889, que no cambia', () => {
    expect([h.nace, h.muere]).toEqual([1, 3])
    expect(h.muere).toBe(universidad.nace)
    expect(verticesEn(datos, h.id, 0)).toEqual([])
    for (const e of [1, 2]) expect(verticesEn(datos, h.id, e).length).toBeGreaterThan(100)
    for (const e of [3, 4, 5, 6]) expect(verticesEn(datos, h.id, e)).toEqual([])
    expect([universidad.nace, universidad.muere]).toEqual([3, 0])
    expect(cajaDe(universidad.planta)).toEqual({ a0: expect.closeTo(-48, 1), a1: expect.closeTo(48, 1), b0: expect.closeTo(0, 1), b1: expect.closeTo(56, 1) })
  })

  test('va pegado al muro oeste de la iglesia, sin pisarla, con el frente en la línea del de la Universidad', () => {
    const [nave] = iglesia.planta
    const muroOeste = Math.min(...nave.map((p) => enMarco(p)[0]))
    const caja = cajaDe(plantasEn(2))
    expect(muroOeste - caja.a1).toBeGreaterThanOrEqual(0)
    expect(muroOeste - caja.a1).toBeLessThan(0.5)
    expect(caja.b0).toBeCloseTo(0, 1)
    // ningún punto de las plantas del convento cae dentro de la nave ni del campanario
    for (const poligono of plantasEn(2)) {
      for (const p of poligono) for (const parte of iglesia.planta) expect(puntoEnPoligono(p, parte)).toBe(false)
    }
  })

  test('la columna de claustros mide lo que el levantamiento del edificio de hoy: 32 m de ancho y 97 de fondo', () => {
    const caja = cajaDe(plantasEn(2))
    expect(caja.a1 - caja.a0).toBeCloseTo(32.3, 1)
    expect(caja.b1 - caja.b0).toBeCloseTo(97, 1)
    expect([COLUMNA.a1 - COLUMNA.a0, COLUMNA.b1 - COLUMNA.b0]).toEqual([expect.closeTo(32.3, 1), expect.closeTo(97, 1)])
  })

  test('tres patios en fila de norte a sur, como en el plano de 1889: se camina por ellos y se choca en las crujías', () => {
    expect(PATIOS).toHaveLength(3)
    const centros = PATIOS.map((p) => [(p.a0 + p.a1) / 2, (p.b0 + p.b1) / 2])
    // en fila: mismo eje norte-sur, uno detrás del otro
    for (const [a] of centros) expect(a).toBeCloseTo(centros[0][0], 5)
    expect(centros.map(([, b]) => b)).toEqual([...centros.map(([, b]) => b)].sort((x, y) => x - y))
    const plantas = plantasEn(2)
    for (const patio of PATIOS) {
      // ni el centro ni las cuatro esquinas (un metro adentro) del patio tocan una planta
      const puntos = [[(patio.a0 + patio.a1) / 2, (patio.b0 + patio.b1) / 2], [patio.a0 + 1, patio.b0 + 1], [patio.a1 - 1, patio.b0 + 1], [patio.a1 - 1, patio.b1 - 1], [patio.a0 + 1, patio.b1 - 1]]
      for (const [a, b] of puntos) expect(plantas.some((poligono) => puntoEnPoligono(px(a, b), poligono))).toBe(false)
    }
    // entre patio y patio hay una crujía: el punto medio entre dos patios seguidos sí choca
    for (let i = 0; i + 1 < PATIOS.length; i++) {
      const medio = px(centros[i][0], (PATIOS[i].b1 + PATIOS[i + 1].b0) / 2)
      expect(plantas.some((poligono) => puntoEnPoligono(medio, poligono))).toBe(true)
    }
    // y los patios quedan abiertos en el dibujo: nada pasa de un metro sobre el suelo en su interior
    const vertices = verticesEn(datos, h.id, 2)
    for (const patio of PATIOS) {
      const adentro = vertices.filter((v) => v.a > patio.a0 + 1.5 && v.a < patio.a1 - 1.5 && v.b > patio.b0 + 1.5 && v.b < patio.b1 - 1.5 && v.y > 1)
      expect(adentro).toEqual([])
    }
  })

  test('en 1772 solo va el claustro del norte: la parte de atrás no tiene fuente que la dé por terminada antes de 1794', () => {
    const [norte, medio] = PATIOS
    const limite = medio.b0 // donde empieza el segundo patio
    const v1772 = verticesEn(datos, h.id, 1)
    const v1843 = verticesEn(datos, h.id, 2)
    expect(Math.max(...v1772.map((v) => v.b))).toBeLessThan(limite + 1) // el alero puede volar medio metro
    expect(Math.max(...v1772.map((v) => v.b))).toBeGreaterThan(norte.b1)
    expect(Math.max(...v1843.map((v) => v.b))).toBeGreaterThan(COLUMNA.b1 - 1)
    // lo de 1772 sigue en 1843: nada del claustro del norte desaparece
    expect(v1843.filter((v) => v.b < limite).length).toBe(v1772.length)
    // y las plantas de colisión siguen al dibujo
    expect(cajaDe(plantasEn(1)).b1).toBeCloseTo(limite, 1)
    expect(cajaDe(plantasEn(2)).b1).toBeCloseTo(COLUMNA.b1, 1)
  })

  test('es bajo, de tejado: no llega a la altura de la iglesia ni a la de la Universidad neogótica', () => {
    const convento = cima(verticesEn(datos, h.id, 2))
    expect(convento).toBeGreaterThan(4)
    expect(convento).toBeLessThan(cima(verticesEn(datos, 'san-francisco', 2)) - 3)
    expect(convento).toBeLessThan(cima(verticesEn(datos, 'universidad', 3)) - 3)
    for (const parte of h.partes) {
      expect(parte.tipo).toBe('cuerpo')
      expect(parte.techo ?? 'dos').not.toBe('plano')
    }
  })

  test('reserva la columna entera, sin casas ni árboles, solo mientras está en pie', () => {
    const zona = zonasDeSupresion([conventoSanFrancisco])
    expect(zona).toHaveLength(1)
    expect(zona[0]).toMatchObject({ desde: 1, hasta: 3, solarCompleto: true })
    expect(cajaDe([zona[0].poligono])).toEqual({ a0: expect.closeTo(COLUMNA.a0, 1), a1: expect.closeTo(COLUMNA.a1, 1), b0: expect.closeTo(COLUMNA.b0, 1), b1: expect.closeTo(COLUMNA.b1, 1) })
    expect(h.sinArboles).toEqual(h.suprime)
    // también en 1772, cuando la parte de atrás no se dibuja: queda como solar, sin casas genéricas encima
    expect(puntoEnPoligono(px((COLUMNA.a0 + COLUMNA.a1) / 2, COLUMNA.b1 - 5), zona[0].poligono)).toBe(true)
  })

  test('la marca es la de la Universidad, con el nombre del convento hasta 1843, y cita las fuentes del hito', () => {
    const fila = MARCAS.find((m) => m.id === 'universidad')
    const [marca] = normalizarMarcas([fila], { hitos: HITOS, coords })
    expect(fila.hito).toBe('universidad')
    expect([1, 2, 3, 6].map((e) => nombreEn(marca, e))).toEqual(['Convento de San Francisco', 'Convento de San Francisco', 'Universidad', 'Universidad'])
    const enlaces = h.fuente.match(/https?:\/\/[^\s;,)]+/g)
    expect(enlaces.length).toBeGreaterThanOrEqual(3)
    for (const enlace of enlaces) expect(fila.fuente).toContain(enlace)
  })

  test('la ficha tiene un texto propio para 1772, 1843 y 1889, y el de 1772 dice lo que el dibujo no lleva', () => {
    const { textos } = FICHAS.universidad
    expect(textos.map(([epoca]) => epoca)).toEqual([1, 2, 3])
    expect(new Set(textos.map(([, texto]) => texto)).size).toBe(3)
    expect(validarFichas(FICHAS, MARCAS, HITOS)).toEqual([])
    const traseras = h.partes.filter((p) => p.nace === 2)
    expect(traseras.length).toBeGreaterThan(0)
    // mientras haya partes que nacen en 1843, el texto de 1772 tiene que decir que la parte de atrás no se dibuja
    expect(textos[0][1]).toMatch(/parte de atrás no se dibuja/)
    expect(textos[0][1]).toContain('1794')
  })
})
