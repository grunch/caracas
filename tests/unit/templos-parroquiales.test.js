import { describe, test, expect } from 'vitest'
import { crearLienzo, MAT } from '../../src/hitos/lienzo.js'
import { temploDeNaves } from '../../src/hitos/templo-naves.js'
import { parteDe } from '../../src/hitos/partes.js'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { templosParroquiales } from '../../src/hitos/datos/templos-parroquiales.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const hito = (id) => HITOS.find((h) => h.id === id)
const IDS = ['santa-rosalia', 'san-juan', 'san-jose']

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
  return { ...d, caja, materiales, sano: d.posiciones.every(Number.isFinite) && d.normales.every(Number.isFinite) }
}

/** La altura máxima de lo que está en pie en `epoca`, y el vértice más alto (en metros del mundo). */
function perfilEn(datos, id, epoca) {
  const { desde, hasta } = datos.rangos.find((r) => r.id === id)
  let cima = null
  for (let i = desde; i < hasta; i++) {
    const [nace, muere] = [datos.vidas[i * 2], datos.vidas[i * 2 + 1]]
    if (nace > epoca || (muere && muere <= epoca)) continue
    const y = datos.posiciones[i * 3 + 1]
    if (!cima || y > cima.y) cima = { x: datos.posiciones[i * 3], y, z: datos.posiciones[i * 3 + 2] }
  }
  return cima
}

describe('templo de tres naves (parte temploDeNaves)', () => {
  const base = { largo: 40, ancho: 24, altoLateral: 8, altoCentral: 13 }

  test('entra hacia +x desde la fachada y la nave central sube más que las laterales', () => {
    // Arrange / Act
    const d = dibujar((p) => temploDeNaves(p, base))

    // Assert
    expect(d.sano).toBe(true)
    expect(d.caja.max[0]).toBeGreaterThan(39.9)
    expect(d.caja.max[0]).toBeLessThan(41)
    expect(d.caja.min[0]).toBeGreaterThan(-2)
    expect(d.caja.max[1]).toBeGreaterThan(13)
    expect(Math.max(Math.abs(d.caja.min[2]), d.caja.max[2])).toBeLessThan(13)
    expect(d.materiales.has(MAT.TEJA)).toBe(true)
  })

  test('con cubierta plana no lleva teja y no pasa de la cornisa y el frontón', () => {
    const d = dibujar((p) => temploDeNaves(p, { ...base, cubierta: 'plana', pantalla: true }))
    expect(d.materiales.has(MAT.TEJA)).toBe(false)
    expect(d.caja.max[1]).toBeLessThan(13 + 24 * 0.62 * 0.2 + 1)
  })

  test('las torres van donde se piden, salen del ancho de las naves y pasan la cumbrera', () => {
    const torres = { lado: 6, a: 3, b: [-13, 13], cuerpos: [{ alto: 9 }, { alto: 6, vanos: 'arco' }, { alto: 4, lado: 5 }], remate: { tipo: 'cupula', alto: 3 } }
    const sin = dibujar((p) => temploDeNaves(p, base))
    const d = dibujar((p) => temploDeNaves(p, { ...base, torres }))
    expect(d.caja.max[1]).toBeGreaterThan(sin.caja.max[1] + 4)
    expect(d.caja.max[2]).toBeGreaterThan(15.9)
    expect(d.caja.min[2]).toBeLessThan(-15.9)
  })

  test('los brazos ensanchan la planta y las cúpulas suben sobre la cabecera', () => {
    const sin = dibujar((p) => temploDeNaves(p, base))
    const brazos = dibujar((p) => temploDeNaves(p, { ...base, brazos: { a: 28, largo: 10, ancho: 32, alto: 8 } }))
    const cupulas = dibujar((p) => temploDeNaves(p, { ...base, cubierta: 'plana', cupulas: [{ a: 34, radio: 4 }, { a: 34, b: 9, radio: 2 }] }))
    expect(brazos.caja.max[2]).toBeGreaterThan(15.9)
    expect(sin.caja.max[2]).toBeLessThan(13)
    expect(cupulas.caja.max[1]).toBeGreaterThan(13 + 4)
  })

  test('rechaza una nave central más baja que las laterales y una cubierta desconocida', () => {
    expect(() => dibujar((p) => temploDeNaves(p, { ...base, altoCentral: 7 }))).toThrow(/central/)
    expect(() => dibujar((p) => temploDeNaves(p, { ...base, cubierta: 'paja' }))).toThrow(/cubierta/)
  })

  test('está registrada como parte', () => {
    expect(dibujar((p) => parteDe('temploDeNaves')(p, base)).sano).toBe(true)
  })
})

describe('Santa Rosalía, San Juan y San José (#259)', () => {
  const datos = construirHitos(HITOS, coords)

  test('están en HITOS, al final para no mover las semillas de los anteriores, y pasan la validación', () => {
    expect(templosParroquiales.map((h) => h.id)).toEqual(IDS)
    expect(HITOS.slice(-3).map((h) => h.id)).toEqual(IDS)
    expect(validarHitos(templosParroquiales, PLANO)).toEqual([])
  })

  test.each([
    // la época en que nace sale del plano que ya lo dibuja terminado (docs/templos-259-integracion.md)
    ['santa-rosalia', 2], ['san-juan', 3], ['san-jose', 4],
  ])('%s nace en la época %i, no muere y no existe antes', (id, nace) => {
    const h = hito(id)
    expect([h.nace, h.muere]).toEqual([nace, 0])
    expect(perfilEn(datos, id, nace - 1)).toBeNull()
    for (let e = nace; e <= 6; e++) expect(perfilEn(datos, id, e).y).toBeGreaterThan(9)
  })

  test('cada uno trae su fuente con enlace y lo que queda por verificar', () => {
    for (const id of IDS) {
      const h = hito(id)
      expect(h.fuente).toMatch(/https:\/\//)
      expect(h.verificar.length).toBeGreaterThan(2)
      expect(h.verificar.join(' ')).toMatch(/altura/i)
    }
  })

  test('cada templo tiene su propia planta, medida del plano: no comparten medidas', () => {
    const medidas = IDS.map((id) => { const p = hito(id).partes.at(-1); return `${p.largo}×${p.ancho}` })
    expect(new Set(medidas).size).toBe(3)
  })

  test('Santa Rosalía: hasta 1889 es la envolvente del templo de 1817; la torre y las cúpulas, desde 1911', () => {
    // Arrange
    const h = hito('santa-rosalia')

    // Act
    const [antes, despues] = [perfilEn(datos, h.id, 3), perfilEn(datos, h.id, 4)]

    // Assert
    expect(perfilEn(datos, h.id, 2).y).toBeCloseTo(antes.y, 5)
    expect(despues.y).toBeGreaterThan(antes.y + 5)
    expect(perfilEn(datos, h.id, 6).y).toBeCloseTo(despues.y, 5)
    expect(h.partes.map((p) => [p.tipo, p.nace, p.muere])).toEqual([['iglesia', 2, 4], ['temploDeNaves', 4, 0]])
  })

  test('Santa Rosalía: la torre queda al norte de la fachada, que mira al oeste (a la calle Sur 1)', () => {
    const h = hito('santa-rosalia')
    const origen = coords.aMundo(h.x, h.y)
    const cima = perfilEn(datos, h.id, 5)
    const cabecera = coords.aMundo(...h.planta[0][1])
    expect(cabecera.x).toBeGreaterThan(origen.x + 30) // la nave entra hacia el este
    expect(cima.z).toBeLessThan(origen.z - 8) // la torre, al norte del eje (z crece hacia el sur)
    expect(Math.abs(cima.x - origen.x)).toBeLessThan(12)
  })

  test('San José: dos torres gemelas a los lados de la fachada sur, fuera del ancho de las naves', () => {
    const h = hito('san-jose')
    const [parte] = h.partes
    expect(parte.torres.b).toHaveLength(2)
    expect(parte.torres.b[0]).toBe(-parte.torres.b[1])
    expect(Math.abs(parte.torres.b[0]) - parte.torres.lado / 2).toBeGreaterThanOrEqual(parte.ancho / 2 - 0.2)
    expect(parte.torres.cuerpos).toHaveLength(3) // «tres cuerpos cada una» (IPC)
    const origen = coords.aMundo(h.x, h.y)
    expect(coords.aMundo(...h.planta[0][1]).z).toBeLessThan(origen.z - 40) // la nave entra hacia el norte
  })

  test('San Juan: envolvente sin torre ni cúpula (el alzado no tiene fuente), con la fachada a la plaza, al norte', () => {
    const h = hito('san-juan')
    expect(h.partes).toHaveLength(1)
    expect(h.partes[0]).toMatchObject({ tipo: 'iglesia', fachada: 'clasica' })
    expect(h.partes[0].torres).toBeUndefined()
    expect(h.partes[0].cupula).toBeUndefined()
    const origen = coords.aMundo(h.x, h.y)
    expect(coords.aMundo(...h.planta[0][1]).z).toBeGreaterThan(origen.z + 30) // la nave entra hacia el sur
  })

  test.each([
    // [templo, un punto del cuerpo, puntos de la calle y de los vecinos que no se reservan]
    ['santa-rosalia', [9117, 8545], [[9020, 8540], [9117, 8480], [9117, 8610], [9200, 8560]]],
    ['san-juan', [6928, 8360], [[6928, 8300], [6870, 8350], [6985, 8350], [6928, 8430]]],
    ['san-jose', [10628, 5330], [[10560, 5330], [10690, 5330], [10640, 5240], [10618, 5400]]],
  ])('%s: la reserva cubre el templo y deja afuera la calle y a los vecinos', (id, adentro, afuera) => {
    const zonas = zonasDeSupresion([hito(id)])
    const dentro = (p) => zonas.some((z) => puntoEnPoligono(p, z.poligono))
    expect(dentro(adentro)).toBe(true)
    for (const p of afuera) expect(dentro(p)).toBe(false)
    expect(zonas.every((z) => z.desde === hito(id).nace && z.hasta === 0)).toBe(true)
  })

  test('las plantas de colisión llegan a hitosConPlanta con su vida; la torre de Santa Rosalía, desde 1911', () => {
    for (const id of IDS) {
      const etapas = hitosConPlanta().filter((p) => p.id === id)
      expect(etapas.length).toBeGreaterThan(0)
      expect(etapas[0].nace).toBe(hito(id).nace)
    }
    expect(hitosConPlanta().filter((p) => p.id === 'santa-rosalia').map((p) => p.nace)).toEqual([2, 4])
  })

  test('las marcas salen de su hito, con su época, y citan el plano que las respalda', () => {
    for (const id of IDS) {
      const m = MARCAS.find((x) => x.id === id)
      expect(m.hito).toBe(id)
      expect(m.x).toBeUndefined()
      expect(m.y).toBeUndefined()
      expect(m.nace ?? 0).toBe(hito(id).nace)
    }
    expect(MARCAS.find((x) => x.id === 'san-jose').fuente).toMatch(/Razetti de 1911/)
  })

  test('las fichas cuentan cada etapa con su fuente y dicen lo que no se sabe', () => {
    for (const id of IDS) {
      const f = FICHAS[id]
      expect(MARCAS.find((x) => x.id === id).fuente).toMatch(/https:\/\//) // la ficha muestra la fuente de la marca
      expect(f.dudas).toMatch(/altura/i)
      expect(f.textos[0][0]).toBe(hito(id).nace)
    }
    expect(FICHAS['santa-rosalia'].textos.map(([e]) => e)).toEqual([2, 4])
    expect(FICHAS['san-juan'].textos[0][1]).toMatch(/1868/)
    expect(FICHAS['san-jose'].dudas).toMatch(/1889/)
  })
})
