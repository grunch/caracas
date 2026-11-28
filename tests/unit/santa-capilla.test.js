import { describe, test, expect } from 'vitest'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { sanMauricio, santaCapilla, SOLAR_SANTA_CAPILLA } from '../../src/hitos/datos/santa-capilla.js'
import { crearLienzo } from '../../src/hitos/lienzo.js'
import { PARTES } from '../../src/hitos/partes.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { normalizarMarcas, nombreEn } from '../../src/marcas.js'
import { crearCoords } from '../../src/coords.js'
import esquinas from '../../tools/geo/esquinas/1936-esquinas.json'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const datos = construirHitos(HITOS, coords)
const origen = coords.aMundo(santaCapilla.x, santaCapilla.y)

/** Los vértices de un hito que están en pie en `epoca`, en metros del marco del mundo relativos al pie de la fachada. */
function enPie(id, epoca) {
  const { desde, hasta } = datos.rangos.find((r) => r.id === id)
  const vs = []
  for (let i = desde; i < hasta; i++) {
    const [nace, muere] = [datos.vidas[i * 2], datos.vidas[i * 2 + 1]]
    if (nace > epoca || (muere && muere <= epoca)) continue
    vs.push({ x: datos.posiciones[i * 3] - origen.x, y: datos.posiciones[i * 3 + 1], z: datos.posiciones[i * 3 + 2] - origen.z })
  }
  return vs
}
const cima = (vs) => vs.reduce((m, v) => (!m || v.y > m.y ? v : m), null)
/** De un vértice del mundo a (a, b) del marco del hito: a entra en la nave (al este), b crece hacia el sur. */
const [ex, ey] = santaCapilla.eje
const aB = (v) => ({ a: v.x * ex + v.z * ey, b: -v.x * ey + v.z * ex, y: v.y })
const partesEn = (h, epoca) => h.partes.filter((p) => (p.nace ?? h.nace) <= epoca && (!(p.muere ?? h.muere) || (p.muere ?? h.muere) > epoca))
/** De muro a muro entre la nave norte y la sur (a 6,4 m del eje del medio), detrás de la torre y del frente: las cumbreras de las naves quedan fuera. */
const entreLasNaves = (torre) => (v) => v.a > 8 && Math.abs(v.b - torre.b) < 6.5
const area = (ps) => Math.abs(ps.reduce((s, [x, y], i) => { const [x2, y2] = ps[(i + 1) % ps.length]; return s + x * y2 - x2 * y }, 0)) / 2

describe('San Mauricio y la Santa Capilla por etapas (#253)', () => {
  test('son dos hitos: San Mauricio de 1772 a 1889 y la Santa Capilla desde 1889, que conserva su lugar en la lista', () => {
    // Arrange
    const [m, c] = [HITOS.find((h) => h.id === 'san-mauricio'), HITOS.find((h) => h.id === 'santa-capilla')]

    // Assert
    expect(m).toBe(sanMauricio)
    expect(c).toBe(santaCapilla)
    expect([m.nace, m.muere]).toEqual([1, 3])
    expect([c.nace, c.muere]).toEqual([3, 0])
    expect(m.muere).toBe(c.nace)
    // la Santa Capilla sigue tercera entre las iglesias: los hitos que la siguen no cambian de semilla
    expect(HITOS.findIndex((h) => h.id === 'santa-capilla')).toBe(HITOS.findIndex((h) => h.id === 'altagracia') + 1)
    expect(HITOS.findIndex((h) => h.id === 'santa-teresa')).toBe(HITOS.findIndex((h) => h.id === 'santa-capilla') + 1)
    expect(validarHitos([m, c], PLANO)).toEqual([])
  })

  test('cada época tiene algo en pie en el solar y nada antes de 1772', () => {
    expect(enPie('san-mauricio', 0)).toEqual([])
    expect(enPie('santa-capilla', 0)).toEqual([])
    for (const e of [1, 2]) {
      expect(enPie('san-mauricio', e).length, `San Mauricio en ${e}`).toBeGreaterThan(0)
      expect(enPie('santa-capilla', e), `Santa Capilla en ${e}`).toEqual([])
    }
    for (const e of [3, 4, 5, 6]) {
      expect(enPie('san-mauricio', e), `San Mauricio en ${e}`).toEqual([])
      expect(enPie('santa-capilla', e).length, `Santa Capilla en ${e}`).toBeGreaterThan(0)
    }
  })

  test('el solar es el recuadro en blanco del plano de 1936, en la esquina sureste del cruce de Santa Capilla', () => {
    // Arrange
    const esquina = esquinas.find((e) => e.nombre === 'Santa Capilla').px
    const [no, ne, se, so] = SOLAR_SANTA_CAPILLA

    // Assert: 28,7 m de frente sobre la calle del norte y 43,4 m de fondo, leídos del plano a 0,5 m por píxel
    expect(Math.hypot(ne[0] - no[0], ne[1] - no[1]) * PLANO.metro).toBeCloseTo(28.7, 1)
    expect(Math.hypot(so[0] - no[0], so[1] - no[1]) * PLANO.metro).toBeCloseTo(43.4, 1)
    expect(area(SOLAR_SANTA_CAPILLA) * PLANO.metro ** 2).toBeCloseTo(28.7 * 43.4, 0)
    // la esquina noroeste del solar queda a menos de 10 m del punto acotado del cruce, al sureste
    expect(Math.hypot(no[0] - esquina[0], no[1] - esquina[1]) * PLANO.metro).toBeLessThan(10)
    expect(no[0]).toBeGreaterThan(esquina[0])
    expect(no[1]).toBeGreaterThan(esquina[1])
    expect(se[1]).toBeGreaterThan(ne[1])
  })

  test('«tres puertas principales hacia el occidente»: las fachadas miran al oeste y las naves entran hacia el este', () => {
    for (const h of [sanMauricio, santaCapilla]) {
      expect(h.eje[0], h.id).toBeGreaterThan(0.95) // el eje del damero, de oeste a este
      expect(Math.abs(h.eje[1]), h.id).toBeLessThan(0.2)
      for (const e of [h.nace, h.muere ? h.muere - 1 : 6]) {
        const vs = enPie(h.id, e).map(aB)
        expect(Math.min(...vs.map((v) => v.a)), `${h.id} en ${e}: nada al oeste del solar`).toBeGreaterThan(-2.5)
        expect(Math.max(...vs.map((v) => v.a)), `${h.id} en ${e}: llega al fondo`).toBeGreaterThan(26)
        expect(Math.max(...vs.map((v) => v.a)), `${h.id} en ${e}: no pasa del fondo`).toBeLessThan(31.5)
      }
    }
  })

  test('1772: tres naves, la del medio de las 25 × 9 varas del documento de 1737, media naranja en la capilla mayor y torre de tres cuerpos al suroeste', () => {
    // Arrange
    const partes = partesEn(sanMauricio, 1)
    const naves = partes.find((p) => p.tipo === 'temploDeNaves')
    const torre = partes.find((p) => p.tipo === 'torre')

    // Act
    const masAlto = aB(cima(enPie('san-mauricio', 1)))

    // Assert
    expect(naves.anchoCentral).toBeCloseTo(9 * 0.8359, 0) // 9 varas castellanas: 7,5 m
    expect(naves.ancho).toBeGreaterThan(naves.anchoCentral * 2.5)
    expect(naves.cupulas).toHaveLength(1)
    expect(naves.cupulas[0].a).toBeGreaterThan(naves.largo * 0.75) // sobre la capilla mayor, a la cabeza
    expect(naves.cubierta).toBe('teja')
    expect(naves.torres ?? null).toBeNull()
    expect(torre.cuerpos).toHaveLength(3)
    expect(torre.b).toBeGreaterThan(naves.ancho / 2) // al sur de las naves
    expect(torre.a).toBeLessThan(naves.a + 6) // junto a la fachada
    expect(masAlto.b).toBeGreaterThan(naves.ancho / 2) // lo más alto es la torre
    expect(masAlto.y).toBeGreaterThan(20)
    expect(masAlto.y).toBeLessThan(33) // por debajo de la torre de la Catedral del mapa
  })

  test('1843: de la torre queda el primer cuerpo (terremoto de 1812) y la media naranja sigue en pie', () => {
    // Arrange
    const [antes, despues] = [partesEn(sanMauricio, 1), partesEn(sanMauricio, 2)]
    const torre = antes.find((p) => p.tipo === 'torre')
    const resto = despues.find((p) => p.tipo === 'cuerpo' && Math.abs(p.a - torre.a) < 0.01 && Math.abs(p.b - torre.b) < 0.01)

    // Act
    const [c1, c2] = [cima(enPie('san-mauricio', 1)), cima(enPie('san-mauricio', 2))]
    const sobreLaTorre = enPie('san-mauricio', 2).map(aB).filter((v) => Math.abs(v.a - torre.a) < torre.lado / 2 + 0.5 && Math.abs(v.b - torre.b) < torre.lado / 2 + 0.5)

    // Assert
    expect(despues.some((p) => p.tipo === 'torre')).toBe(false)
    expect(resto).toMatchObject({ techo: 'plano', alto: torre.cuerpos[0].alto, largo: torre.lado, ancho: torre.lado })
    expect(Math.max(...sobreLaTorre.map((v) => v.y))).toBeCloseTo(torre.cuerpos[0].alto, 1)
    expect(c2.y).toBeLessThan(c1.y - 8)
    // lo más alto pasa a ser la media naranja del presbiterio, que Geldner dibuja todavía en la década de 1860
    expect(aB(c2).a).toBeGreaterThan(18)
    expect(Math.abs(aB(c2).b)).toBeLessThan(4)
    expect(despues.find((p) => p.tipo === 'temploDeNaves')).toBe(antes.find((p) => p.tipo === 'temploDeNaves'))
  })

  test('1889: la capilla de 1883, de una nave de 7 m de luz y 24 m de largo, sin torre, retirada de la calle tras su atrio', () => {
    // Arrange
    const partes = partesEn(santaCapilla, 3)
    const nave = partes.find((p) => p.tipo === 'iglesia')

    // Act
    const vs = enPie('santa-capilla', 3).map(aB)

    // Assert
    expect(partes.filter((p) => p.tipo === 'iglesia')).toHaveLength(1)
    expect(partes.some((p) => p.tipo === 'torre')).toBe(false)
    expect(nave).toMatchObject({ fachada: 'neogotica' })
    expect(nave.torres ?? null).toBeNull()
    expect(nave.ancho).toBeGreaterThanOrEqual(7.5) // 7 m de luz más los muros
    expect(nave.ancho).toBeLessThan(9)
    expect(nave.a + nave.largo).toBeCloseTo(28.7, 1) // la cabecera, en el fondo del solar
    expect(nave.largo).toBeGreaterThan(20)
    expect(nave.largo).toBeLessThanOrEqual(24)
    expect(Math.min(...vs.map((v) => v.a))).toBeGreaterThan(3) // el atrio: nada en los primeros metros del solar
    expect(Math.max(...vs.map((v) => v.b))).toBeLessThan(13) // ni la nave sur ni la casa del sur existen todavía
    expect(Math.max(...vs.map((v) => v.y))).toBeLessThan(22) // sin torre ni aguja
    // la T: dos capillas a los lados de la cabecera
    const capillas = partes.filter((p) => p.tipo === 'cuerpo')
    expect(capillas.map((p) => Math.sign(p.b)).sort()).toEqual([-1, 1])
    for (const c of capillas) expect(c.a).toBeGreaterThan(nave.a + nave.largo / 2)
  })

  test('1911: el ensanche de 1889–1891, con la nave sur, el pasadizo entre las dos y la torre con aguja en el medio del frente', () => {
    // Arrange
    const partes = partesEn(santaCapilla, 4)
    const naves = partes.filter((p) => p.tipo === 'iglesia').sort((x, y) => x.b - y.b)
    const torre = partes.find((p) => p.tipo === 'torre')

    // Act
    const masAlto = aB(cima(enPie('santa-capilla', 4)))

    // Assert
    expect(naves).toHaveLength(2)
    expect(naves[0].b).toBe(0) // la nave norte es la capilla de 1883 alargada hasta la calle
    expect(naves[0].a).toBe(0)
    expect(naves[1].b - naves[0].b).toBeGreaterThan(naves[0].ancho + 10) // entre las dos, el pasadizo y los patios
    expect(torre.b).toBeCloseTo((naves[0].b + naves[1].b) / 2, 1)
    expect(torre.remate.tipo).toBe('aguja')
    expect(torre.cuerpos).toHaveLength(3)
    expect(Math.abs(masAlto.b - torre.b)).toBeLessThan(1)
    expect(masAlto.y).toBeGreaterThan(30)
    expect(masAlto.y).toBeLessThan(40)
    // no hay nave central todavía: detrás del frente, entre las dos naves, solo el pasadizo y la sacristía, más bajos
    const medio = enPie('santa-capilla', 4).map(aB).filter(entreLasNaves(torre))
    expect(medio.length).toBeGreaterThan(0)
    expect(Math.max(...medio.map((v) => v.y))).toBeLessThanOrEqual(naves[0].alto + 0.01) // nada pasa de los muros de las naves
    for (const p of partes.filter((x) => x.tipo === 'cuerpo' && Math.abs(x.b - torre.b) < 0.01)) {
      expect(p.alto + (p.techo === 'plano' ? 0 : p.altoTecho), `cuerpo en a = ${p.a}`).toBeLessThan(naves[0].alto - 2)
    }
  })

  test('1936 y 1946: la nave central de Castillo (1917–1924) llena el medio, con cubierta plana, y la torre sigue al centro', () => {
    for (const e of [5, 6]) {
      // Arrange
      const partes = partesEn(santaCapilla, e)
      const naves = partes.filter((p) => p.tipo === 'iglesia')
      const central = partes.find((p) => p.tipo === 'cuerpo' && p.techo === 'plano' && p.largo > 20)
      const torre = partes.find((p) => p.tipo === 'torre')

      // Act
      const medio = enPie('santa-capilla', e).map(aB).filter(entreLasNaves(torre))

      // Assert
      expect(naves, `época ${e}`).toHaveLength(2)
      expect(central.b).toBeCloseTo(torre.b, 1)
      expect(central.ancho).toBeGreaterThan(12)
      expect(central.alto).toBeGreaterThan(naves[0].alto)
      expect(Math.max(...medio.map((v) => v.y))).toBeCloseTo(central.alto, 5) // la azotea de la nave central, sobre los muros de las otras dos
      expect(torre.remate.tipo).toBe('aguja')
    }
    // la torre de 1911 y la de 1936 son piezas distintas: Castillo le abrió el gran arco y le quitó la balaustrada
    expect(partesEn(santaCapilla, 4).find((p) => p.tipo === 'torre')).not.toBe(partesEn(santaCapilla, 5).find((p) => p.tipo === 'torre'))
    expect(partesEn(santaCapilla, 5)).toEqual(partesEn(santaCapilla, 6))
  })

  test('las naves son de teja y no de pizarra: en 1910 se cambiaron «las cubiertas de madera, caña amarga y tejas»', () => {
    for (const p of santaCapilla.partes.filter((x) => x.tipo === 'iglesia')) expect(p.teja).toBeUndefined()
  })

  test('las partes «iglesia» y «temploDeNaves» se pueden correr dentro del marco con a y b', () => {
    // Arrange
    const caja = (fn) => {
      const lienzo = crearLienzo()
      fn(lienzo.hito({ origen: { x: 0, z: 0 } }))
      const { posiciones } = lienzo.datos()
      const xs = [...posiciones].filter((_, i) => i % 3 === 0), zs = [...posiciones].filter((_, i) => i % 3 === 2)
      return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]
    }
    const iglesia = { largo: 20, ancho: 8, alto: 9, fachada: 'neogotica' }
    const naves = { largo: 20, ancho: 20, altoLateral: 6, altoCentral: 8 }

    // Act
    for (const [tipo, medidas] of [['iglesia', iglesia], ['temploDeNaves', naves]]) {
      const [en0, corrida] = [caja((p) => PARTES[tipo](p, medidas)), caja((p) => PARTES[tipo](p, { ...medidas, a: 7, b: -3 }))]

      // Assert
      corrida.forEach((v, i) => expect(v, `${tipo} ${i}`).toBeCloseTo(en0[i] + (i < 2 ? 7 : -3), 5))
    }
  })

  test('la reserva de San Mauricio es la del templo y no la de todo el solar; la de la Santa Capilla es el solar del plano de 1936', () => {
    // Arrange
    const m2 = (poligonos) => poligonos.reduce((s, p) => s + area(p), 0) * PLANO.metro ** 2
    const zonas = (h) => zonasDeSupresion([h])
    const dentro = (h, p) => zonas(h).some((z) => puntoEnPoligono(p, z.poligono))

    // Assert
    expect(santaCapilla.suprime).toEqual([SOLAR_SANTA_CAPILLA])
    expect(m2(sanMauricio.suprime)).toBeLessThan(m2(santaCapilla.suprime) * 0.7)
    expect(zonas(sanMauricio).every((z) => z.desde === 1 && z.hasta === 3)).toBe(true)
    expect(zonas(santaCapilla).every((z) => z.desde === 3 && z.hasta === 0)).toBe(true)
    // dentro de las dos: el medio de la nave; solo en la de la Santa Capilla: el sur del solar, donde estaban las casas de las cofradías
    expect(dentro(sanMauricio, [8975, 6492])).toBe(true)
    expect(dentro(santaCapilla, [8975, 6492])).toBe(true)
    expect(dentro(sanMauricio, [8960, 6545])).toBe(false)
    expect(dentro(santaCapilla, [8960, 6545])).toBe(true)
    // fuera de las dos: las calles del norte y del oeste y la Academia de Bellas Artes, al este
    for (const p of [[8975, 6460], [8935, 6500], [9020, 6510], [8960, 6575]]) {
      expect(dentro(sanMauricio, p), `${p}`).toBe(false)
      expect(dentro(santaCapilla, p), `${p}`).toBe(false)
    }
    for (const h of [sanMauricio, santaCapilla]) {
      expect(h.sinArboles).toEqual(h.suprime)
      expect(h.solarCompleto).toBe(true)
    }
  })

  test('las plantas de colisión cambian con el edificio: cada etapa trae las suyas, dentro de su reserva', () => {
    // Arrange
    const etapas = hitosConPlanta().filter((p) => p.id === 'santa-capilla' || p.id === 'san-mauricio')
    const vivas = (id, e) => etapas.filter((p) => p.id === id && p.nace <= e && (!p.muere || p.muere > e))
    const m2 = (ps) => ps.flatMap((p) => p.planta).reduce((s, pol) => s + area(pol), 0) * PLANO.metro ** 2

    // Assert
    expect(vivas('san-mauricio', 1).length).toBeGreaterThan(0)
    expect(vivas('san-mauricio', 3)).toEqual([])
    expect(vivas('santa-capilla', 2)).toEqual([])
    // la capilla de 1883 ocupa menos de la tercera parte del solar; el ensanche, más de la mitad; con la nave central, más todavía
    const [a3, a4, a5] = [3, 4, 5].map((e) => m2(vivas('santa-capilla', e)))
    const solar = area(SOLAR_SANTA_CAPILLA) * PLANO.metro ** 2
    expect(a3).toBeLessThan(solar / 3)
    expect(a4).toBeGreaterThan(solar / 2)
    expect(a5).toBeGreaterThan(a4 + 100)
    expect(a5).toBeLessThanOrEqual(solar + 1)
    expect(m2(vivas('santa-capilla', 6))).toBe(a5)
    for (const h of [sanMauricio, santaCapilla]) {
      const zona = h.suprime[0]
      for (const pol of [...(h.planta ?? []), ...(h.plantaPorEpoca ?? []).flatMap((f) => f.poligonos)]) {
        const centro = pol.reduce(([sx, sy], [x, y]) => [sx + x / pol.length, sy + y / pol.length], [0, 0])
        expect(puntoEnPoligono(centro, zona), `${h.id}: ${centro}`).toBe(true)
      }
    }
  })

  test('cada hito trae sus fuentes con enlace, atribuye las citas de segunda mano y dice lo que es hipótesis', () => {
    for (const h of [sanMauricio, santaCapilla]) {
      expect(h.fuente).toMatch(/Pérez Gallego/)
      expect(h.fuente).toMatch(/https:\/\/saber\.ucv\.ve\/jspui\/handle\/10872\/21681/)
      expect(h.fuente).toMatch(/citad[oa]s? por Pérez Gallego/)
      expect(h.verificar.length).toBeGreaterThan(3)
      expect(h.verificar.join(' ')).toMatch(/hipótesis gráfica/)
      expect(h.verificar.join(' ')).toMatch(/[Aa]lturas?/)
    }
    expect(sanMauricio.fuente).toMatch(/Martí/)
    expect(sanMauricio.fuente).toMatch(/Otaduy/)
    expect(sanMauricio.fuente).toMatch(/Arístides Rojas/)
    expect(sanMauricio.verificar.join(' ')).toMatch(/43,2 m/) // la torre de la hipótesis de Pérez Gallego, que no se sigue
    expect(sanMauricio.verificar.join(' ')).toMatch(/cubiertas/) // lo que cayó en 1812 y no se sabe cuándo se rehízo
    expect(santaCapilla.fuente).toMatch(/https:\/\/saber\.ucv\.ve\/jspui\/handle\/10872\/24360/)
    expect(santaCapilla.verificar.join(' ')).toMatch(/1952/)
    expect(santaCapilla.verificar.join(' ')).toMatch(/octogonal/)
  })

  test('la marca es una sola, enlazada al hito, con sus dos nombres y las fuentes de las dos iglesias', () => {
    // Arrange
    const fila = MARCAS.find((x) => x.id === 'santa-capilla')

    // Act
    const m = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find((x) => x.id === 'santa-capilla')

    // Assert
    expect(fila.hito).toBe('santa-capilla')
    expect(fila.x).toBeUndefined() // la posición sale del hito
    expect([m.px, m.py]).toEqual([santaCapilla.x, santaCapilla.y])
    expect(m.nace).toBe(1)
    expect([1, 2, 3, 4, 5, 6].map((e) => nombreEn(m, e).nombre)).toEqual(['San Mauricio', 'San Mauricio', 'Santa Capilla', 'Santa Capilla', 'Santa Capilla', 'Santa Capilla'])
    expect(fila.fuente).toMatch(/saber\.ucv\.ve\/jspui\/handle\/10872\/21681/)
    expect(fila.dudas).not.toMatch(/es CG/) // el solar ya no es un dato general: lo dan los planos de 1772 y 1843
    expect(fila.dudas).toMatch(/1772/)
  })

  test('la ficha tiene un texto por etapa y cada uno dice, a la vista, lo que el dibujo no prueba', () => {
    // Arrange
    const f = FICHAS['santa-capilla']
    const texto = (e) => f.textos.find(([desde]) => desde === e)[1]

    // Assert
    expect(f.textos.map(([e]) => e)).toEqual([1, 2, 3, 4, 5])
    expect(texto(1)).toMatch(/tres naves/)
    expect(texto(1)).toMatch(/Martí/)
    expect(texto(1)).toMatch(/según Otaduy, citado por Pérez Gallego/)
    expect(texto(2)).toMatch(/1812/)
    expect(texto(2)).toMatch(/primer cuerpo/)
    expect(texto(2)).toMatch(/no se sabe/) // qué cubiertas seguían caídas en 1843
    expect(texto(3)).toMatch(/1883/)
    expect(texto(3)).toMatch(/Hurtado Manrique/)
    expect(texto(3)).toMatch(/una (sola )?nave/)
    expect(texto(3)).not.toMatch(/aguja/) // la torre con aguja es del ensanche, posterior al plano de 1889
    expect(texto(4)).toMatch(/1891/)
    expect(texto(4)).toMatch(/1900/)
    expect(texto(4)).toMatch(/aguja/)
    expect(texto(5)).toMatch(/Castillo/)
    expect(texto(5)).toMatch(/1917/)
    expect(texto(5)).toMatch(/1924/)
    expect(f.dudas).toMatch(/hipótesis/)
    expect(f.dudas).toMatch(/1952/)
    expect(f.dudas).not.toMatch(/falta ver dónde cae su letra/)
  })
})
