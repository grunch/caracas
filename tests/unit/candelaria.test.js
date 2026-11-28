import { describe, test, expect } from 'vitest'
import { crearLienzo, MAT } from '../../src/hitos/lienzo.js'
import { temploDeNaves } from '../../src/hitos/templo-naves.js'
import { iglesia } from '../../src/hitos/iglesias.js'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { candelaria } from '../../src/hitos/datos/candelaria.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)

function dibujar(fn) {
  const lienzo = crearLienzo()
  fn(lienzo.hito({ origen: { x: 0, z: 0 } }))
  const d = lienzo.datos()
  const caja = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (let i = 0; i < d.posiciones.length; i++) {
    caja.min[i % 3] = Math.min(caja.min[i % 3], d.posiciones[i])
    caja.max[i % 3] = Math.max(caja.max[i % 3], d.posiciones[i])
  }
  return { ...d, caja, triangulos: d.indices.length / 3, sano: d.posiciones.every(Number.isFinite) && d.normales.every(Number.isFinite) }
}

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

describe('iglesia paramétrica: fachada lisa, tres puertas y fachada más alta que la nave', () => {
  const base = { largo: 40, ancho: 24, alto: 10, altoTecho: 4 }

  test('la fachada lisa es un hastial sin columnas: menos triángulos que la clásica y sin pasar de la cumbrera', () => {
    // Arrange / Act
    const lisa = dibujar((p) => iglesia(p, { ...base, fachada: 'lisa' }))
    const clasica = dibujar((p) => iglesia(p, { ...base, fachada: 'clasica' }))

    // Assert
    expect(lisa.sano).toBe(true)
    expect(lisa.triangulos).toBeLessThan(clasica.triangulos)
    expect(lisa.caja.max[1]).toBeLessThan(base.alto + base.altoTecho + 1.5)
  })

  test('con tres puertas dibuja dos vanos más que con una', () => {
    const una = dibujar((p) => iglesia(p, { ...base, fachada: 'lisa' }))
    const tres = dibujar((p) => iglesia(p, { ...base, fachada: 'lisa', puertas: 3 }))
    const tresClasica = dibujar((p) => iglesia(p, { ...base, fachada: 'clasica', puertas: 3 }))
    expect(tres.triangulos).toBeGreaterThan(una.triangulos)
    expect(tresClasica.triangulos).toBeGreaterThan(dibujar((p) => iglesia(p, base)).triangulos)
  })

  test('altoFachada levanta la fachada sobre la nave sin mover la nave', () => {
    const pareja = dibujar((p) => iglesia(p, base))
    const alta = dibujar((p) => iglesia(p, { ...base, altoFachada: 15 }))
    expect(alta.caja.max[1]).toBeGreaterThan(pareja.caja.max[1] + 4)
    expect(alta.caja.max[0]).toBeCloseTo(pareja.caja.max[0], 5)
  })

  test('sin los parámetros nuevos, la iglesia sale igual que antes', () => {
    const d = dibujar((p) => iglesia(p, base))
    const explicita = dibujar((p) => iglesia(p, { ...base, puertas: 1, altoFachada: base.alto }))
    expect(explicita.triangulos).toBe(d.triangulos)
    expect([...explicita.posiciones]).toEqual([...d.posiciones])
  })

  test('sin frente (fachada «ninguna») no dibuja puertas ni hastial: menos triángulos que la lisa y la misma nave', () => {
    const lisa = dibujar((p) => iglesia(p, { ...base, fachada: 'lisa' }))
    const ninguna = dibujar((p) => iglesia(p, { ...base, fachada: 'ninguna' }))
    expect(ninguna.sano).toBe(true)
    expect(ninguna.triangulos).toBeLessThan(lisa.triangulos)
    expect(ninguna.caja.min[0]).toBeGreaterThan(lisa.caja.min[0]) // nada delante del muro de la nave
    expect(ninguna.caja.max[0]).toBeCloseTo(lisa.caja.max[0], 5)
  })

  test('sin frente, una torre centrada tampoco lleva la puerta ni el rosetón que se le ponen delante', () => {
    const torres = { centrada: true, lado: 6, cuerpos: [{ alto: 14 }], remate: { tipo: 'chapitel', alto: 2 } }
    const conFrente = dibujar((p) => iglesia(p, { ...base, fachada: 'lisa', torres }))
    const sinFrente = dibujar((p) => iglesia(p, { ...base, fachada: 'ninguna', torres }))
    const soloTorre = dibujar((p) => iglesia(p, { ...base, fachada: 'ninguna' })).triangulos
    const laTorre = conFrente.triangulos - dibujar((p) => iglesia(p, { ...base, fachada: 'lisa' })).triangulos
    expect(sinFrente.triangulos - soloTorre).toBeLessThan(laTorre) // la torre, sin su puerta ni su rosetón
  })

  test('rechaza un número de puertas que no sea 1 o 3', () => {
    expect(() => dibujar((p) => iglesia(p, { ...base, puertas: 2 }))).toThrow(/puertas/)
  })
})

describe('templo de naves con fachada de pantalla y tejado', () => {
  test('ningún tejado asoma por delante de la pantalla', () => {
    // Arrange
    const medidas = { largo: 40, ancho: 24, altoLateral: 9, altoCentral: 14, cubierta: 'teja' }
    const frenteDeLaTeja = (d) => {
      let min = Infinity
      for (let i = 0; i < d.posiciones.length / 3; i++) if (d.hitos[i * 4 + 2] === MAT.TEJA) min = Math.min(min, d.posiciones[i * 3])
      return min
    }

    // Act
    const [con, sin] = [true, false].map((pantalla) => dibujar((p) => temploDeNaves(p, { ...medidas, pantalla })))

    // Assert
    expect(frenteDeLaTeja(con)).toBeGreaterThan(0)
    expect(frenteDeLaTeja(sin)).toBeLessThan(0) // sin pantalla, el alero vuela sobre la fachada como antes
  })
})

describe('La Candelaria (#243)', () => {
  const datos = construirHitos(HITOS, coords)
  const h = HITOS.find((x) => x.id === 'candelaria')
  const origen = coords.aMundo(candelaria.x, candelaria.y)

  test('está en HITOS, después de los que ya estaban (no mueve sus semillas), y pasa la validación', () => {
    expect(h).toBe(candelaria)
    // no «el último»: los hitos que entran después van detrás de ella
    expect(HITOS.findIndex((x) => x.id === 'candelaria')).toBeGreaterThan(HITOS.findIndex((x) => x.id === 'san-jose'))
    expect(validarHitos([candelaria], PLANO)).toEqual([])
  })

  test('está en pie en las seis épocas: los seis planos la dibujan', () => {
    expect([h.nace, h.muere]).toEqual([1, 0])
    expect(cimaEn(datos, h.id, 0)).toBeNull()
    for (let e = 1; e <= 6; e++) expect(cimaEn(datos, h.id, e).y).toBeGreaterThan(12)
  })

  test('la fachada mira al oeste, a la plaza, y la nave entra hacia el este («tres puertas mirando al ocaso»)', () => {
    const cabecera = coords.aMundo(...h.planta[0][1])
    expect(cabecera.x).toBeGreaterThan(origen.x + 40)
    expect(Math.abs(cabecera.z - origen.z)).toBeLessThan(20)
    // las tres puertas van donde hay fuente: 1772 (Martí) y 1889 (puertas de 1880); el templo de naves trae tres siempre
    const iglesias = h.partes.filter((p) => p.tipo === 'iglesia')
    expect(iglesias.map((p) => [p.nace, p.fachada, p.puertas ?? 1])).toEqual([[1, 'lisa', 3], [2, 'ninguna', 1], [3, 'clasica', 3]])
  })

  test('la torre queda al sur de la fachada (lado de la Epístola), fuera del ancho de las naves', () => {
    // Arrange
    const torres = h.partes.filter((p) => p.tipo === 'torre')
    const nave = h.partes[0]

    // Act
    const cima = cimaEn(datos, h.id, 1, (v) => Math.abs(v.x - origen.x) < 12)

    // Assert
    expect(cima.z).toBeGreaterThan(origen.z + 5) // z crece hacia el sur
    for (const t of torres) {
      expect(t.b).toBeGreaterThan(0) // b: a la derecha del eje, que entra hacia el este
      expect(t.b + t.lado / 2).toBeGreaterThan(nave.ancho / 2 + 3)
      expect(t.a).toBeLessThan(t.lado) // contigua a la fachada
    }
  })

  test('la torre tiene tres cuerpos en 1772, dos tras el terremoto de 1812 y otra vez tres desde 1911', () => {
    const cuerposEn = (e) => h.partes.find((p) => p.tipo === 'torre' && p.nace <= e && (!p.muere || p.muere > e)).cuerpos.length
    expect([1, 2, 3, 4, 5, 6].map(cuerposEn)).toEqual([3, 2, 2, 3, 3, 3])
    const alto = (e) => cimaEn(datos, h.id, e, (v) => v.z > origen.z + 12 && Math.abs(v.x - origen.x) < 12).y
    expect(alto(2)).toBeLessThan(alto(1) - 2)
    expect(alto(3)).toBeCloseTo(alto(2), 5)
    expect(alto(4)).toBeGreaterThan(alto(3) + 2)
  })

  test('cada etapa tiene su cuerpo: fachada lisa (1772), sin frente (1843: cayó en 1812), fachada alta de 1872 (1889) y naves levantadas (desde 1911)', () => {
    expect(h.partes.filter((p) => p.tipo !== 'torre').map((p) => [p.tipo, p.fachada ?? null, p.nace, p.muere])).toEqual([
      ['iglesia', 'lisa', 1, 2], ['iglesia', 'ninguna', 2, 3], ['iglesia', 'clasica', 3, 4], ['temploDeNaves', null, 4, 0],
    ])
    const [, , de1889, de1911] = h.partes.filter((p) => p.tipo !== 'torre')
    expect(de1889.altoFachada).toBeGreaterThan(de1889.alto + de1889.altoTecho) // «levantando los techos para que… concuerden con la fachada»
    expect(de1911.altoCentral).toBeGreaterThan(de1911.altoLateral)
    // la nave sube en 1911: los techos se levantaron después del terremoto de 1900
    const naveEn = (e) => cimaEn(datos, h.id, e, (v) => v.x > origen.x + 20).y
    expect(naveEn(2)).toBeCloseTo(naveEn(1), 5)
    expect(naveEn(4)).toBeGreaterThan(naveEn(3) + 2)
    expect(naveEn(6)).toBeCloseTo(naveEn(4), 5)
  })

  test('trae su fuente con enlace y dice lo que queda por verificar', () => {
    expect(h.fuente).toMatch(/Landaeta Rosales/)
    expect(h.fuente).toMatch(/https:\/\/archive\.org\/details\/laiglesiayplazad00land/)
    expect(h.verificar.length).toBeGreaterThan(4)
    expect(h.verificar.join(' ')).toMatch(/altura/i)
    expect(h.verificar.join(' ')).toMatch(/1843/)
    expect(h.verificar.join(' ')).toMatch(/cementerio/i)
  })

  test('la reserva es el solar del templo: lo cubre con su torre y su sacristía, y deja afuera la plaza, las calles y a los vecinos', () => {
    const zonas = zonasDeSupresion([h])
    const dentro = (p) => zonas.some((z) => puntoEnPoligono(p, z.poligono))
    for (const p of [[11235, 6997], [11188, 7024], [11295, 7004]]) expect(dentro(p), `${p}`).toBe(true)
    for (const p of [[11140, 6990], [11170, 6990], [11235, 6940], [11235, 7050], [11330, 7010]]) expect(dentro(p), `${p}`).toBe(false)
    expect(zonas.every((z) => z.desde === 1 && z.hasta === 0)).toBe(true)
    expect(h.sinArboles).toEqual(h.suprime)
  })

  test('las plantas de colisión llegan a hitosConPlanta desde 1772: las naves y la torre', () => {
    const etapas = hitosConPlanta().filter((p) => p.id === 'candelaria')
    expect(etapas).toHaveLength(1)
    expect(etapas[0].nace).toBe(1)
    expect(etapas[0].planta).toHaveLength(2)
  })

  test('la marca sale del hito y conserva su época y la leyenda de 1843', () => {
    const m = MARCAS.find((x) => x.id === 'candelaria')
    expect(m.hito).toBe('candelaria')
    expect(m.x).toBeUndefined()
    expect(m.y).toBeUndefined()
    expect(m.nace ?? h.nace).toBe(1)
    expect(m.fuente).toMatch(/leyenda del plano de Jesurún de 1843 \(J «La Candelaria»\)/)
  })

  test('la ficha cuenta cada etapa del templo y dice lo que no se sabe', () => {
    const f = FICHAS.candelaria
    expect(f.textos.map(([e]) => e)).toEqual([1, 2, 3, 4])
    expect(f.textos[2][1]).toMatch(/1872/)
    expect(f.textos[3][1]).toMatch(/1900/)
    expect(f.dudas).toMatch(/altura/i)
    expect(f.dudas).toMatch(/1843/)
    // lo que el dibujo interpreta va dicho en el texto de su época, no solo en las dudas
    expect(f.textos[1][1]).toMatch(/sin fachada/)
    expect(f.textos[3][1]).toMatch(/interpretación/)
    expect(f.textos[3][1]).toMatch(/no se sabe cuándo terminó/)
  })
})
