import { describe, test, expect } from 'vitest'
import { crearLienzo, MAT } from '../../src/hitos/lienzo.js'
import { palacio, portico, remateConEscudo, frenteNeogotico } from '../../src/hitos/palacios.js'
import { PARTES } from '../../src/hitos/partes.js'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { seSolapan } from '../../src/hitos/suprimir.js'
import { METRO } from '../../src/hitos/datos/marco.js'
import { crearCoords } from '../../src/coords.js'
import esquinas from '../../tools/geo/esquinas/1936-esquinas.json'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const hito = (id) => HITOS.find((h) => h.id === id)
const esquina = (nombre) => esquinas.find((e) => e.nombre === nombre).px

function dibujar(fn) {
  const lienzo = crearLienzo()
  fn(lienzo.hito({ origen: { x: 0, z: 0 } }))
  const d = lienzo.datos()
  const caja = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (let i = 0; i < d.posiciones.length; i++) {
    caja.min[i % 3] = Math.min(caja.min[i % 3], d.posiciones[i])
    caja.max[i % 3] = Math.max(caja.max[i % 3], d.posiciones[i])
  }
  const materiales = new Set([...d.hitos].filter((_, i) => i % 4 === 2))
  return { ...d, caja, materiales, vertices: lienzo.vertices, sano: d.posiciones.every(Number.isFinite) && d.normales.every(Number.isFinite) }
}

describe('palacio', () => {
  const base = { ancho: 40, fondo: 50, crujia: 10, pisos: 2, altoPiso: 5 }

  test('cuatro crujías alrededor de un patio: ocupa su planta y deja el centro libre', () => {
    const d = dibujar((p) => palacio(p, base))
    expect(d.caja.max[0]).toBeGreaterThan(20)
    expect(d.caja.max[0]).toBeLessThan(21.6)
    expect(d.caja.max[2]).toBeLessThan(26.6)
    // en el patio (a más de un metro de las crujías) no hay nada
    for (let i = 0; i < d.vertices; i++) {
      const [x, z] = [Math.abs(d.posiciones[i * 3]), Math.abs(d.posiciones[i * 3 + 2])]
      expect(x > 9 || z > 14).toBe(true)
    }
    expect(d.sano).toBe(true)
  })

  test.each([['azotea', 10.8], ['teja', 12.6], ['mansarda', 13.4]])('cubierta de %s: llega a su altura', (cubierta, alto) => {
    const d = dibujar((p) => palacio(p, { ...base, cubierta }))
    expect(d.caja.max[1]).toBeCloseTo(alto, 1)
  })

  test('la mansarda es de pizarra con el dibujo de tejas; la azotea no lleva tejas', () => {
    expect(dibujar((p) => palacio(p, { ...base, cubierta: 'mansarda' })).materiales.has(MAT.TEJA)).toBe(true)
    expect(dibujar((p) => palacio(p, base)).materiales.has(MAT.TEJA)).toBe(false)
  })

  test('con pabellones las esquinas suben medio piso; con balcones lleva barandas', () => {
    const liso = dibujar((p) => palacio(p, base))
    const pab = dibujar((p) => palacio(p, { ...base, pabellones: true }))
    expect(pab.caja.max[1]).toBeCloseTo(liso.caja.max[1] + 2.5, 1)
    expect(liso.materiales.has(MAT.VERJA)).toBe(false)
    expect(dibujar((p) => palacio(p, { ...base, balcones: true })).materiales.has(MAT.VERJA)).toBe(true)
  })

  test('una cubierta desconocida es un error', () => {
    expect(() => dibujar((p) => palacio(p, { ...base, cubierta: 'paja' }))).toThrow(/cubierta/)
  })
})

describe('pórtico, remate y frente neogótico', () => {
  test('pórtico: columnas al frente y frontón encima', () => {
    const con = dibujar((p) => portico(p, { ancho: 20, alto: 12, columnas: 6 }))
    const sin = dibujar((p) => portico(p, { ancho: 20, alto: 12, columnas: 6, conFronton: false }))
    expect(con.caja.max[1]).toBeCloseTo(12 + 20.6 * 0.2 * (20 / 20.6), 0)
    expect(sin.caja.max[1]).toBeCloseTo(12, 1)
    expect(con.caja.max[2]).toBeGreaterThan(3.5)
  })

  test('remate con escudo: el asta sube sobre el ático', () => {
    const d = dibujar((p) => remateConEscudo(p.en(0, 11, 0), {}))
    expect(d.caja.min[1]).toBeCloseTo(11)
    expect(d.caja.max[1]).toBeCloseTo(11 + 2.6 + 6, 1)
  })

  test('frente neogótico: pináculos, crestería y un gablete central con aguja que dobla el alto del muro', () => {
    const d = dibujar((p) => frenteNeogotico(p, { largo: 60, alto: 9 }))
    expect(d.caja.max[1]).toBeCloseTo(9 + 6.2 + 5, 1)
    expect(d.materiales.has(MAT.VERJA)).toBe(true)
    expect(d.caja.max[0] - d.caja.min[0]).toBeGreaterThan(60)
    expect(d.caja.max[0] - d.caja.min[0]).toBeLessThan(61.5)
    expect(d.sano).toBe(true)
  })

  test('las partes están registradas y dibujan', () => {
    const casos = {
      palacio: { a: 5, b: 5, ancho: 30, fondo: 30 },
      portico: { a: 0, b: 15, mira: [0, 1], ancho: 12, alto: 9 },
      remateConEscudo: { a: 15, b: 0, h: 10, mira: [1, 0] },
      frenteNeogotico: { a: 0, b: 6, mira: [0, -1], largo: 40 },
    }
    for (const [tipo, medidas] of Object.entries(casos)) expect(dibujar((p) => PARTES[tipo](p, medidas)).vertices, tipo).toBeGreaterThan(20)
    // el frente neogótico que mira al norte (−b) pone el gablete de ese lado
    const d = dibujar((p) => PARTES.frenteNeogotico(p, casos.frenteNeogotico))
    expect(d.caja.min[2]).toBeLessThan(-0.5)
    expect(d.caja.max[2]).toBeCloseTo(12, 0)
  })
})

describe('los edificios civiles', () => {
  test('las definiciones pasan la validación y ninguna planta pisa la de otro hito', () => {
    expect(validarHitos(HITOS, PLANO)).toEqual([])
    const plantas = HITOS.flatMap((h) => h.planta.map((poligono) => ({ id: h.id, poligono, nace: h.nace, muere: h.muere || Infinity })))
    for (const a of plantas) {
      for (const b of plantas) if (a.id < b.id && a.nace < b.muere && b.nace < a.muere) expect(seSolapan(a.poligono, b.poligono), `${a.id} × ${b.id}`).toBe(false)
    }
  })

  test.each([
    ['casa-amarilla', 'Principal', 1, 60], ['capitolio', 'La Bolsa', 1, 110], ['capitolio', 'Las Monjas', 1, 110],
    ['universidad', 'San Francisco', 3, 90], ['miraflores', 'Miraflores', 4, 80],
  ])('%s: cerca de la esquina de %s y desde su época', (id, nombreEsquina, nace, metros) => {
    const h = hito(id)
    const [ex, ey] = esquina(nombreEsquina)
    expect(Math.hypot(h.x - ex, h.y - ey) * METRO).toBeLessThan(metros)
    expect(h.nace).toBe(nace)
    expect(h.verificar.length).toBeGreaterThan(1)
  })

  test('la Casa Amarilla queda al oeste de la plaza y su remate con escudo mira hacia ella', () => {
    const [casa, plaza] = [hito('casa-amarilla'), hito('plaza-bolivar')]
    expect(casa.x).toBeLessThan(plaza.x)
    expect(casa.partes.every(p => p.tipo === 'casaAmarilla')).toBe(true) // orientación verificada con vértices en hitos-casa-amarilla.test.js
  })

  test('el Capitolio lleva la cúpula en el ala norte y la Universidad mira hacia él', () => {
    // la cúpula al norte (−b) se verifica con los vértices del modelo en hitos-capitolio.test.js
    expect(hito('capitolio').partes.filter((p) => p.componente === 'cupula').length).toBeGreaterThan(0)
    expect(hito('universidad').partes.find((p) => p.tipo === 'frenteNeogotico').mira).toEqual([0, -1])
    expect(hito('universidad').y).toBeGreaterThan(hito('capitolio').y)
  })

  test('todo junto sigue siendo una malla liviana', () => {
    const d = construirHitos(HITOS, coords)
    // T41c añade cinco etapas de Casa Amarilla (<220 mil, con envolvente compartida); T41d, el Capitolio desde
    // 1772 (~73 mil, con el cuerpo neoclásico compartido de 1889 a 1936); T41g, San Francisco en tres tramos
    // (~12,7 mil, sin interior). Siempre en el mismo draw call.
    // Cementerio Sur añade terreno/caminos siguiendo el relieve; total medido en todas las épocas: 1.080.573.
    // El Puente de Hierro (#272) añade 8.210 triángulos: 611.786 antes de 1946 y 1.091.159 en total.
    // Constitución y Sucre metálico (#272) añaden 8.760: 620.546 antes de 1946 y 1.099.919 en total.
    // Santa Rosalía, San Juan y San José (#259) añaden 4.747: 625.293 antes de 1946 y 1.104.666 en total (tope 625→630 mil).
    // Dolores y Restaurador (#272), solo en 1911, añaden 16.326: 641.619 antes de 1946 y 1.120.992 en total
    // (topes 630→645 mil y 1.110→1.125 mil).
    expect(construirHitos(HITOS.filter(h=>h.nace<6),coords).indices.length / 3).toBeLessThan(645_000)
    expect(d.indices.length / 3).toBeLessThan(1_125_000)
    expect(d.rangos.length).toBe(HITOS.length)
  }, 15_000)
})
