import { describe, test, expect } from 'vitest'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { sanPablo } from '../../src/hitos/datos/san-pablo.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { normalizarMarcas, nombreEn } from '../../src/marcas.js'
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

describe('la iglesia de San Pablo, anterior al Teatro Municipal (#246)', () => {
  const datos = construirHitos(HITOS, coords)
  const h = HITOS.find((x) => x.id === 'san-pablo')
  const teatro = HITOS.find((x) => x.id === 'teatro-municipal')
  const origen = coords.aMundo(sanPablo.x, sanPablo.y)

  test('está en HITOS, al final para no mover las semillas de los anteriores, y pasa la validación', () => {
    expect(h).toBe(sanPablo)
    expect(HITOS[HITOS.findIndex((x) => x.id === 'las-mercedes') + 1].id).toBe('san-pablo') // detrás de Las Mercedes
    expect(validarHitos([sanPablo], PLANO)).toEqual([])
  })

  test('está en pie en 1772 y 1843 y desaparece cuando nace el teatro: se demolió en 1876', () => {
    expect([h.nace, h.muere]).toEqual([1, 3])
    expect(h.muere).toBe(teatro.nace)
    expect(cimaEn(datos, h.id, 0)).toBeNull()
    for (const e of [1, 2]) expect(cimaEn(datos, h.id, e).y).toBeGreaterThan(10)
    for (const e of [3, 4, 5, 6]) expect(cimaEn(datos, h.id, e)).toBeNull()
  })

  test('el teatro no cambia: sigue naciendo en 1889 con su planta', () => {
    expect([teatro.nace, teatro.muere]).toEqual([3, 0])
    expect(teatro.planta).toHaveLength(3)
  })

  test('«la puerta principal mira al norte»: la fachada da a la plazuela y la nave entra hacia el sur', () => {
    const cabecera = coords.aMundo(...h.planta[0][1])
    expect(cabecera.z).toBeGreaterThan(origen.z + 30)
    expect(Math.abs(cabecera.x - origen.x)).toBeLessThan(15)
  })

  test('una nave grande y otra menor del lado de la Epístola (al oeste), más corta, con la torre en su extremo junto a la fachada', () => {
    // Arrange
    const [nave, menor] = h.partes
    const torres = h.partes.filter((p) => p.tipo === 'torre')

    // Act
    const cima = cimaEn(datos, h.id, 1)

    // Assert
    expect(nave).toMatchObject({ tipo: 'iglesia', fachada: 'clasica' })
    expect(nave.torres).toBeUndefined()
    expect(menor.tipo).toBe('cuerpo')
    expect(menor.b).toBeGreaterThan(nave.ancho / 2) // b: a la derecha del eje, que entra hacia el sur: el oeste
    expect(menor.ancho).toBeLessThan(nave.ancho)
    expect(menor.largo).toBeLessThan(nave.largo)
    expect(menor.alto).toBeLessThan(nave.alto)
    for (const t of torres) {
      expect(t.b).toBeCloseTo(menor.b, 5)
      expect(t.a + t.lado / 2).toBeCloseTo(menor.a - menor.largo / 2, 5) // la nave menor empieza donde acaba la torre
    }
    expect(cima.x).toBeLessThan(origen.x - 4) // lo más alto es la torre, al oeste de la nave
    expect(Math.abs(cima.z - origen.z)).toBeLessThan(8) // en línea con la fachada
  })

  test('la torre tiene tres cuerpos en 1772 (Martí) y dos en 1843, después del terremoto de 1812 (Gasparini)', () => {
    const cuerposEn = (e) => h.partes.find((p) => p.tipo === 'torre' && p.nace <= e && p.muere > e).cuerpos.length
    expect([1, 2].map(cuerposEn)).toEqual([3, 2])
    expect(cimaEn(datos, h.id, 2).y).toBeLessThan(cimaEn(datos, h.id, 1).y - 2)
  })

  test('la huella no es la del teatro: es más chica y queda al este de su eje', () => {
    const area = (ps) => Math.abs(ps.reduce((s, [x, y], i) => { const [x2, y2] = ps[(i + 1) % ps.length]; return s + x * y2 - x2 * y }, 0)) / 2
    const m2 = (poligonos) => poligonos.reduce((s, p) => s + area(p), 0) * PLANO.metro ** 2
    expect(m2(h.suprime)).toBeLessThan(m2(teatro.suprime) / 3)
    expect(h.x).toBeGreaterThan(teatro.x + 30) // el eje de la nave, 17 m al este del centro del teatro
  })

  test('trae sus fuentes con enlace y dice lo que queda por verificar', () => {
    expect(h.fuente).toMatch(/saber\.ucv\.ve/)
    expect(h.fuente).toMatch(/Otaduy/)
    expect(h.fuente).toMatch(/Gasparini/)
    expect(h.fuente).toMatch(/Landaeta/)
    expect(h.verificar.length).toBeGreaterThan(4)
    expect(h.verificar.join(' ')).toMatch(/altura/i)
    expect(h.verificar.join(' ')).toMatch(/hospital/i)
    expect(h.verificar.join(' ')).toMatch(/1757/)
    expect(h.verificar.join(' ')).toMatch(/39 %/) // el error de escala, sin subestimarlo
    expect(h.verificar.join(' ')).toMatch(/se sale unos 13 m/)
    expect(h.fuente).toMatch(/segunda mano/)
  })

  test('la reserva cubre el templo solo mientras está en pie y deja afuera la plaza, la calle y el hospital', () => {
    const zonas = zonasDeSupresion([h])
    const dentro = (p) => zonas.some((z) => puntoEnPoligono(p, z.poligono))
    for (const p of [[8380, 7700], [8366, 7690], [8374, 7745]]) expect(dentro(p), `${p}`).toBe(true)
    for (const p of [[8380, 7650], [8355, 7570], [8405, 7700], [8330, 7700], [8370, 7770]]) expect(dentro(p), `${p}`).toBe(false)
    expect(zonas.every((z) => z.desde === 1 && z.hasta === 3)).toBe(true)
  })

  test('las plantas de colisión llegan a hitosConPlanta con su vida: de 1772 a 1889', () => {
    const etapas = hitosConPlanta().filter((p) => p.id === 'san-pablo')
    expect(etapas).toHaveLength(1)
    expect([etapas[0].nace, etapas[0].muere]).toEqual([1, 3])
  })

  test('la marca compartida con el teatro conserva sus nombres y cita las fuentes del templo', () => {
    const m = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find((x) => x.id === 'teatro-municipal')
    expect([1, 2, 3].map((e) => nombreEn(m, e).nombre)).toEqual(['Iglesia y plaza de San Pablo', 'Iglesia y plaza de San Pablo', 'Teatro Municipal'])
    expect(m.fuente).toMatch(/saber\.ucv\.ve/)
    expect(Math.hypot(m.px - h.x, m.py - h.y) * PLANO.metro).toBeLessThan(30) // a menos de 30 m del pie de la fachada
  })

  test('la ficha describe el templo en 1772 y en 1843, separa el hospital y dice lo que no se sabe', () => {
    const f = FICHAS['teatro-municipal']
    expect(f.textos.map(([e]) => e)).toEqual([1, 2, 3])
    expect(f.textos[0][1]).toMatch(/colonial/)
    expect(f.textos[0][1]).toMatch(/tres cuerpos/)
    expect(f.textos[0][1]).toMatch(/Hospital Real/)
    expect(f.textos[1][1]).toMatch(/1812/)
    expect(f.textos[2][1]).toMatch(/1876/)
    expect(f.dudas).toMatch(/San Pablo/)
    expect(f.dudas).toMatch(/hospital/i)
    // las citas de segunda mano van atribuidas en el texto, y el error de escala, en las dudas
    expect(f.textos[0][1]).toMatch(/Según Otaduy, citado por Gois/)
    expect(f.textos[1][1]).toMatch(/sin dar fecha/)
    expect(f.textos[1][1]).toMatch(/lectura de Gois/)
    expect(f.dudas).toMatch(/57 m/)
    expect(f.dudas).toMatch(/segunda mano/)
  })
})
