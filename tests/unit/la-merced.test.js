import { describe, test, expect } from 'vitest'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { laMerced } from '../../src/hitos/datos/la-merced.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)

/** El vértice más alto de lo que está en pie en `epoca` (en metros del mundo), entre los que cumplen `donde`. */
function cimaEn(datos, id, epoca, donde = () => true) {
  const { desde, hasta } = datos.rangos.find((r) => r.id === id)
  let cima = null
  for (let i = desde; i < hasta; i++) {
    const [nace, muere] = [datos.vidas[i * 2], datos.vidas[i * 2 + 1]]
    if (nace > epoca || (muere && muere <= epoca)) continue
    const v = { x: datos.posiciones[i * 3], y: datos.posiciones[i * 3 + 1], z: datos.posiciones[i * 3 + 2] }
    if (donde(v) && (!cima || v.y > cima.y)) cima = v
  }
  return cima
}

describe('Las Mercedes (#244)', () => {
  const datos = construirHitos(HITOS, coords)
  const h = HITOS.find((x) => x.id === 'las-mercedes')
  const origen = coords.aMundo(laMerced.x, laMerced.y)

  test('está en HITOS, detrás de los que ya estaban (no mueve sus semillas), y pasa la validación', () => {
    expect(h).toBe(laMerced)
    expect(HITOS[HITOS.findIndex((x) => x.id === 'candelaria') + 1].id).toBe('las-mercedes') // detrás de La Candelaria
    expect(validarHitos([laMerced], PLANO)).toEqual([])
  })

  test('el templo de 1857 se dibuja desde 1889: en 1772 no hay descripción del convento y en 1843 estaba en obra', () => {
    expect([h.nace, h.muere]).toEqual([3, 0])
    for (const e of [1, 2]) expect(cimaEn(datos, h.id, e)).toBeNull()
    for (const e of [3, 4, 5, 6]) expect(cimaEn(datos, h.id, e).y).toBeGreaterThan(15)
    expect(cimaEn(datos, h.id, 6).y).toBeCloseTo(cimaEn(datos, h.id, 3).y, 5) // el mismo volumen en las cuatro épocas
  })

  test('la fachada mira al sur, a la esquina de Las Mercedes, y la nave entra hacia el norte', () => {
    const cabecera = coords.aMundo(...h.planta[0][1])
    expect(cabecera.z).toBeLessThan(origen.z - 30)
    expect(Math.abs(cabecera.x - origen.x)).toBeLessThan(20)
  })

  test('tres naves con la central más alta y más ancha que las laterales, como las dibuja el plano de 1936', () => {
    const naves = h.partes.find((p) => p.tipo === 'temploDeNaves')
    expect(naves.altoCentral).toBeGreaterThan(naves.altoLateral)
    expect(naves.anchoCentral).toBeGreaterThan((naves.ancho - naves.anchoCentral) / 2) // nave central de 13 m, laterales de 5,35
    expect(naves.pantalla ?? false).toBe(false) // el frontis va sobre la calle central (IPC)
  })

  test('dos torres gemelas a los lados de la fachada, dentro del ancho de las naves, de un cuerpo cuadrado y otro ochavado con cúpula', () => {
    // Arrange
    const { torres, ancho } = h.partes.find((p) => p.tipo === 'temploDeNaves')

    // Act
    const [oeste, este] = [-1, 1].map((s) => cimaEn(datos, h.id, 5, (v) => s * (v.x - origen.x) > 5 && Math.abs(v.z - origen.z) < 9))

    // Assert
    expect(torres.b).toHaveLength(2)
    expect(torres.b[0]).toBe(-torres.b[1])
    expect(Math.abs(torres.b[0]) + torres.lado / 2).toBeLessThanOrEqual(ancho / 2 + 0.3)
    expect(torres.cuerpos).toHaveLength(1) // el segundo cuerpo, ochavado, es el tambor del remate
    expect(torres.remate.tipo).toBe('cupulin')
    expect(oeste.y).toBeCloseTo(este.y, 3)
    expect(oeste.y).toBeGreaterThan(cimaEn(datos, h.id, 5, (v) => v.z < origen.z - 15).y) // pasan la cumbrera
  })

  test('el presbiterio sigue a la nave central más allá de las laterales, como en el contorno del plano', () => {
    const [naves, presbiterio] = h.partes
    expect(presbiterio).toMatchObject({ tipo: 'cuerpo', ancho: naves.anchoCentral, alto: naves.altoCentral })
    expect(presbiterio.a - presbiterio.largo / 2).toBeCloseTo(naves.largo, 5)
    expect(h.planta).toHaveLength(2)
  })

  test('trae sus fuentes con enlace y dice lo que queda por verificar', () => {
    expect(h.fuente).toMatch(/albaciudad\.org/)
    expect(h.fuente).toMatch(/pp\. 150–151/)
    expect(h.verificar.length).toBeGreaterThan(4)
    expect(h.verificar.join(' ')).toMatch(/altura/i)
    expect(h.verificar.join(' ')).toMatch(/1772/)
    expect(h.verificar.join(' ')).toMatch(/1843/)
    expect(h.verificar.join(' ')).toMatch(/torres/)
  })

  test('la reserva cubre el templo y su atrio, y deja afuera las calles, la plaza y a los vecinos', () => {
    const zonas = zonasDeSupresion([h])
    const dentro = (p) => zonas.some((z) => puntoEnPoligono(p, z.poligono))
    for (const p of [[9068, 5850], [9060, 5893], [9076, 5800]]) expect(dentro(p), `${p}`).toBe(true)
    for (const p of [[9020, 5850], [9120, 5850], [9055, 5925], [9082, 5760], [8880, 5830]]) expect(dentro(p), `${p}`).toBe(false)
    expect(zonas.every((z) => z.desde === 3 && z.hasta === 0)).toBe(true)
  })

  test('las plantas de colisión llegan a hitosConPlanta desde 1889', () => {
    const etapas = hitosConPlanta().filter((p) => p.id === 'las-mercedes')
    expect(etapas).toHaveLength(1)
    expect(etapas[0].nace).toBe(3)
  })

  test('la marca sale del hito: deja el ancla puesta a mano, que caía 100 m al oeste del templo', () => {
    const cruda = MARCAS.find((x) => x.id === 'las-mercedes')
    expect(cruda.hito).toBe('las-mercedes')
    expect(cruda.x).toBeUndefined()
    expect(cruda.y).toBeUndefined()
    const m = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find((x) => x.id === 'las-mercedes')
    expect([m.px, m.py]).toEqual([h.x, h.y])
    expect(Math.hypot(m.px - 8880, m.py - 5830) * PLANO.metro).toBeGreaterThan(80)
  })

  test('la marca sigue viva desde 1772 con el nombre de cada época, aunque el edificio empiece en 1889', () => {
    const m = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find((x) => x.id === 'las-mercedes')
    expect(m.nace).toBe(1)
    for (let e = 1; e <= 6; e++) expect(vivaEn(m, e)).toBe(true)
    expect([1, 2, 3, 5].map((e) => nombreEn(m, e).nombre)).toEqual(['Convento de La Merced', 'La Merced', 'Las Mercedes', 'Las Mercedes'])
  })

  test('la ficha cuenta cada etapa con su fuente y dice que en 1772 y 1843 no hay edificio dibujado', () => {
    const f = FICHAS['las-mercedes']
    expect(f.textos.map(([e]) => e)).toEqual([1, 2, 3])
    expect(f.textos[0][1]).toMatch(/1681/)
    expect(f.textos[1][1]).toMatch(/1842/)
    expect(f.textos[2][1]).toMatch(/1857/)
    expect(f.dudas).toMatch(/altura/i)
    expect(f.dudas).toMatch(/no se dibuja/)
    expect(MARCAS.find((x) => x.id === 'las-mercedes').fuente).toMatch(/albaciudad\.org/)
    const dudas = MARCAS.find((x) => x.id === 'las-mercedes').dudas
    expect(dudas).toMatch(/dentro del calce/) // los planos antiguos no «ponen la iglesia en el mismo sitio» sin más
    expect(dudas).toMatch(/letra E/)
  })
})
