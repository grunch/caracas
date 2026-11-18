import { describe, test, expect } from 'vitest'
import { crearLienzo, MAT } from '../../src/hitos/lienzo.js'
import { torre, fachadaBarroca, portadaLateral, cupulaConTambor, ventanas, iglesia } from '../../src/hitos/iglesias.js'
import { PARTES } from '../../src/hitos/partes.js'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
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

describe('torre', () => {
  const cuerpos = [{ alto: 12, vanos: 'apilados' }, { alto: 8, vanos: 'reloj', balcon: true }, { alto: 6, lado: 6, vanos: 'arco' }]

  test('apila los cuerpos y devuelve la altura hasta el arranque del remate', () => {
    let alto = 0
    const d = dibujar((p) => { alto = torre(p, { lado: 7, cuerpos, remate: { tipo: 'cupulin', alto: 6 } }) })
    expect(alto).toBe(26)
    expect(d.caja.max[1]).toBeGreaterThan(32)
    expect(d.caja.max[1]).toBeLessThan(34)
    expect(d.sano).toBe(true)
  })

  test('el cuerpo del reloj lleva una esfera en cada cara y el del balcón, baranda', () => {
    const d = dibujar((p) => torre(p, { lado: 7, cuerpos }))
    expect(d.materiales.has(MAT.RELOJ)).toBe(true)
    expect(d.materiales.has(MAT.VERJA)).toBe(true)
    const sin = dibujar((p) => torre(p, { lado: 7, cuerpos: [{ alto: 10 }] }))
    expect(sin.materiales.has(MAT.RELOJ)).toBe(false)
  })

  test('con figura, el remate sube más', () => {
    const con = dibujar((p) => torre(p, { cuerpos: [{ alto: 10 }], remate: { tipo: 'cupulin', figura: true } }))
    const sin = dibujar((p) => torre(p, { cuerpos: [{ alto: 10 }], remate: { tipo: 'cupulin' } }))
    expect(con.caja.max[1]).toBeGreaterThan(sin.caja.max[1])
  })

  test.each([['aguja', 12, 13.2], ['chapitel', 3, 4.1], ['cupula', 4, 4.8]])('remate de %s: sube lo pedido sobre el último cuerpo', (tipo, alto, tope) => {
    const d = dibujar((p) => torre(p, { lado: 6, cuerpos: [{ alto: 10, vanos: 'ventana' }], remate: { tipo, alto } }))
    expect(d.caja.max[1]).toBeCloseTo(10 + tope, 1)
    expect(d.sano).toBe(true)
  })

  test('un remate desconocido es un error', () => {
    expect(() => dibujar((p) => torre(p, { cuerpos: [{ alto: 5 }], remate: { tipo: 'pagoda' } }))).toThrow(/remate/)
  })
})

describe('fachadas, portadas y cúpulas', () => {
  test('fachada barroca: del ancho pedido, con el frontón de volutas y la cruz arriba, hacia +z', () => {
    const d = dibujar((p) => fachadaBarroca(p, { ancho: 20, alto1: 7.5, alto2: 5, altoFronton: 5 }))
    expect(d.caja.max[0] - d.caja.min[0]).toBeGreaterThan(20)
    expect(d.caja.max[0] - d.caja.min[0]).toBeLessThan(21.5)
    expect(d.caja.max[1]).toBeCloseTo(17.5 + 1.6, 1)
    expect(d.caja.max[2]).toBeGreaterThan(0.5) // las columnas, delante del muro
    expect(d.caja.min[2]).toBeGreaterThanOrEqual(-1.001)
    expect(d.sano).toBe(true)
  })

  test('portada lateral: columnas, frontón y puerta', () => {
    const d = dibujar((p) => portadaLateral(p, {}))
    expect(d.caja.max[1]).toBeCloseTo(6 + 4.2 * 0.24, 1)
  })

  test('cúpula sobre tambor: más alta que el tambor, con linterna y cruz', () => {
    const d = dibujar((p) => cupulaConTambor(p.en(0, 20, 0), { radio: 7 }))
    expect(d.caja.min[1]).toBeCloseTo(20)
    expect(d.caja.max[1]).toBeGreaterThan(20 + 7 * 0.7 + 7 * 1.1)
    expect(d.caja.max[0]).toBeLessThan(7.5)
    expect(d.sano).toBe(true)
  })

  test('ventanas: con balcón suman baranda y tejadillo', () => {
    const lisas = dibujar((p) => ventanas(p, { largo: 20, n: 4, y: 4 }))
    const balcon = dibujar((p) => ventanas(p, { largo: 20, n: 4, y: 4, balcon: true }))
    expect(balcon.vertices).toBeGreaterThan(lisas.vertices)
    expect(balcon.materiales.has(MAT.TEJA)).toBe(true)
    expect(lisas.caja.max[0]).toBeLessThan(10)
  })
})

describe('iglesia paramétrica', () => {
  const base = { largo: 50, ancho: 20, alto: 11 }

  test('la nave entra hacia +x desde la fachada, que queda en el origen', () => {
    const d = dibujar((p) => iglesia(p, base))
    expect(d.caja.max[0]).toBeCloseTo(50, 1)
    expect(d.caja.min[0]).toBeGreaterThan(-2.5) // solo columnas y frontón delante
    expect(d.materiales.has(MAT.TEJA)).toBe(true)
  })

  test('dos torres: a los lados de la fachada, más altas que el tejado', () => {
    const torres = { n: 2, lado: 5, cuerpos: [{ alto: 12 }, { alto: 5, vanos: 'arco' }], remate: { tipo: 'cupula', alto: 3 } }
    const d = dibujar((p) => iglesia(p, { ...base, torres }))
    const sin = dibujar((p) => iglesia(p, base))
    expect(d.caja.max[1]).toBeGreaterThan(sin.caja.max[1] + 2)
    expect(d.caja.max[2]).toBeCloseTo(10.3, 0)
    expect(d.caja.min[2]).toBeCloseTo(-10.3, 0)
  })

  test('una torre centrada con aguja (Santa Capilla) y fachada neogótica', () => {
    const torres = { n: 1, centrada: true, lado: 6, cuerpos: [{ alto: 20 }], remate: { tipo: 'aguja', alto: 14 } }
    const d = dibujar((p) => iglesia(p, { ...base, fachada: 'neogotica', torres }))
    expect(d.caja.max[1]).toBeGreaterThan(34)
    expect(d.sano).toBe(true)
  })

  test('cúpula y dos fachadas (Santa Teresa)', () => {
    const una = dibujar((p) => iglesia(p, base))
    const d = dibujar((p) => iglesia(p, { ...base, dosFachadas: true, cupula: { a: 25, radio: 6 } }))
    expect(d.caja.max[1]).toBeGreaterThan(una.caja.max[1] + 6)
    expect(d.caja.max[0]).toBeGreaterThan(una.caja.max[0] + 0.5)
  })

  test('fachada barroca y fachada desconocida', () => {
    expect(dibujar((p) => iglesia(p, { ...base, fachada: 'barroca' })).sano).toBe(true)
    expect(() => dibujar((p) => iglesia(p, { ...base, fachada: 'rococó' }))).toThrow(/fachada/)
  })
})

describe('las partes de iglesia', () => {
  test('cuerpo con ventanas, torre, fachada, portada, ventanas, cúpula e iglesia están registradas y dibujan', () => {
    const casos = {
      cuerpo: { a: 10, b: 5, largo: 20, ancho: 10, alto: 6, ventanas: { n: 3, y: 3 } },
      torre: { a: 3, b: -3, cuerpos: [{ alto: 8 }] },
      fachadaBarroca: { a: 0, b: 0, mira: [-1, 0], ancho: 18 },
      portadaLateral: { a: 0, b: 4, mira: [-1, 0] },
      ventanas: { a: 0, b: 4, mira: [-1, 0], largo: 8, n: 2, y: 4 },
      cupula: { a: 10, h: 12, radio: 3 },
      iglesia: { largo: 30, ancho: 14, alto: 9 },
    }
    for (const [tipo, medidas] of Object.entries(casos)) {
      const d = dibujar((p) => PARTES[tipo](p, medidas))
      expect(d.vertices, tipo).toBeGreaterThan(20)
      expect(d.sano, tipo).toBe(true)
    }
  })

  test('una fachada que mira al oeste (−a) queda delante del origen, no detrás', () => {
    const d = dibujar((p) => PARTES.fachadaBarroca(p, { a: 0, b: 0, mira: [-1, 0], ancho: 18 }))
    expect(d.caja.min[0]).toBeLessThan(-0.5)
    expect(d.caja.max[0]).toBeLessThanOrEqual(1.001)
  })
})

describe('la Catedral y las iglesias', () => {
  const datos = construirHitos(HITOS, coords)
  const alturaDe = (id) => {
    const { desde, hasta } = datos.rangos.find((r) => r.id === id)
    let alto = 0
    for (let i = desde; i < hasta; i++) alto = Math.max(alto, datos.posiciones[i * 3 + 1])
    return alto
  }

  test('las definiciones pasan la validación', () => {
    expect(validarHitos(HITOS, PLANO)).toEqual([])
  })

  test('la Catedral está en la esquina de La Torre, desde 1772, y su torre mide unas tres veces el muro de la nave', () => {
    const c = hito('catedral')
    const [tx, ty] = esquina('La Torre')
    expect(Math.hypot(c.x - tx, c.y - ty) * METRO).toBeLessThan(40)
    expect(c.nace).toBe(1)
    const nave = c.partes.find((p) => p.tipo === 'cuerpo')
    const razon = alturaDe('catedral') / nave.alto
    expect(razon).toBeGreaterThan(2.8)
    expect(razon).toBeLessThan(3.5)
  })

  test('la torre de la Catedral queda al norte de la fachada (a su izquierda vista desde la plaza)', () => {
    const { partes } = hito('catedral')
    const [t, f] = [partes.find((p) => p.tipo === 'torre'), partes.find((p) => p.tipo === 'fachadaBarroca')]
    expect(t.b).toBeLessThan(f.b) // b crece hacia el sur
    expect(f.mira).toEqual([-1, 0]) // al oeste, hacia la plaza
  })

  test.each([
    ['san-francisco', 'San Francisco', 1, 80], ['altagracia', 'Altagracia', 1, 80], ['santa-capilla', 'Santa Capilla', 3, 40],
    ['santa-teresa', 'Santa Teresa', 3, 90], ['la-pastora', 'La Pastora', 1, 40], ['panteon', 'Panteón', 3, 60],
  ])('%s: cerca de su esquina del plano y desde su época', (id, nombreEsquina, nace, metros) => {
    const h = hito(id)
    const [ex, ey] = esquina(nombreEsquina)
    expect(Math.hypot(h.x - ex, h.y - ey) * METRO).toBeLessThan(metros)
    expect(h.nace).toBe(nace)
    expect(h.verificar.length).toBeGreaterThan(1)
    expect(h.suprime.length).toBe(1)
  })

  test('el perfil: la aguja de Santa Capilla y las torres del Panteón pasan los 35 m; Santa Teresa tiene cúpula', () => {
    expect(alturaDe('santa-capilla')).toBeGreaterThan(38)
    expect(alturaDe('panteon')).toBeGreaterThan(28)
    expect(hito('santa-teresa').partes[0].cupula.radio).toBeGreaterThan(5)
    expect(hito('la-pastora').partes[0].torres.n).toBe(2)
  })
})
