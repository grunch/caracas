import { describe, test, expect } from 'vitest'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { TONO } from '../../src/hitos/piezas.js'
import { sanJacinto, solarDelMercado, mercadoSanJacinto, sanJacintoYMercado } from '../../src/hitos/datos/san-jacinto.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { normalizarMarcas, nombreEn } from '../../src/marcas.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const EPOCAS = [1, 2, 3, 4, 5, 6]
// la manzana del mapa (V1772-37095-0-0): sus cuatro esquinas, de los informes de retiro de las seis épocas
const MANZANA = [[9322, 7056], [9533, 7103], [9485, 7317], [9274, 7271]]

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
const area = (ps) => Math.abs(ps.reduce((s, [x, y], i) => { const [x2, y2] = ps[(i + 1) % ps.length]; return s + x * y2 - x2 * y }, 0)) / 2
const m2 = (poligonos) => poligonos.reduce((s, p) => s + area(p), 0) * PLANO.metro ** 2
const centro = (ps) => [0, 1].map((k) => ps.reduce((s, p) => s + p[k], 0) / ps.length)
const estaEnPie = (h, e) => h.nace <= e && (!h.muere || h.muere > e)

describe('San Jacinto: el conjunto dominico y el mercado (#245)', () => {
  const datos = construirHitos(HITOS, coords)
  const zonasDe = (h) => zonasDeSupresion([h])
  const dentroDe = (h, p) => zonasDe(h).some((z) => puntoEnPoligono(p, z.poligono))

  test('los tres hitos están en HITOS, seguidos y detrás de los templos para no mover las semillas de los anteriores, y pasan la validación', () => {
    const desde = HITOS.indexOf(sanJacinto)
    expect(HITOS.slice(desde, desde + 3)).toEqual([sanJacinto, solarDelMercado, mercadoSanJacinto])
    expect(desde).toBeGreaterThan(HITOS.findIndex((h) => h.id === 'san-jose'))
    expect(sanJacintoYMercado).toEqual([sanJacinto, solarDelMercado, mercadoSanJacinto])
    expect(validarHitos(sanJacintoYMercado, PLANO)).toEqual([])
  })

  test('en cada época hay exactamente uno en pie: convento en 1772 y 1843, solar en 1889, mercado desde 1911', () => {
    const enPie = EPOCAS.map((e) => sanJacintoYMercado.filter((h) => estaEnPie(h, e)).map((h) => h.id))
    expect(enPie).toEqual([['san-jacinto'], ['san-jacinto'], ['solar-mercado-san-jacinto'], ['mercado-san-jacinto'], ['mercado-san-jacinto'], ['mercado-san-jacinto']])
  })

  test('la geometría aparece y desaparece con su hito', () => {
    for (const h of sanJacintoYMercado) {
      for (const e of EPOCAS) {
        const cima = cimaEn(datos, h.id, e)
        if (estaEnPie(h, e)) expect(cima, `${h.id} en ${e}`).not.toBeNull()
        else expect(cima, `${h.id} en ${e}`).toBeNull()
      }
    }
  })

  describe('la iglesia y el convento (1772 y 1843)', () => {
    const h = sanJacinto
    const [iglesia, terceros, torre, claustro] = h.partes
    const origen = coords.aMundo(h.x, h.y)

    test('la fachada mira al norte: la nave entra hacia el sur desde el pie de la fachada', () => {
      const cabecera = coords.aMundo(...centro([h.planta[0][1], h.planta[0][2]]))
      expect(cabecera.z - origen.z).toBeGreaterThan(iglesia.largo - 2)
      expect(h.eje[1]).toBeGreaterThan(0.95)
    })

    test('tres naves bajo un tejado con una sola puerta: la iglesia paramétrica de fachada clásica, sin torres propias', () => {
      expect(iglesia).toMatchObject({ tipo: 'iglesia', fachada: 'clasica', largo: 39, ancho: 18.5 })
      expect(iglesia.torres).toBeUndefined()
      expect(iglesia.cupula).toBeUndefined()
    })

    test('el retablo mayor de 12,45 m (Bueno, por Dávila) cabe bajo la cumbrera', () => {
      expect(iglesia.alto + iglesia.altoTecho).toBeGreaterThanOrEqual(12.45)
      expect(iglesia.alto + iglesia.altoTecho).toBeLessThan(14)
    })

    test('la torre al oeste, junto a la fachada, y la nave de los Terceros del lado opuesto, al este', () => {
      expect(torre.tipo).toBe('torre')
      expect(torre.b).toBeGreaterThan(0) // b: a la derecha de quien entra hacia el sur, el oeste
      expect(torre.a).toBeLessThan(torre.lado)
      expect(terceros).toMatchObject({ tipo: 'cuerpo' })
      expect(terceros.b).toBeCloseTo(-(iglesia.ancho + terceros.ancho) / 2, 5) // pegada al muro este
      expect(terceros.alto).toBeLessThan(iglesia.alto)
      const cima = cimaEn(datos, h.id, 1)
      expect(cima.x).toBeLessThan(origen.x - 2) // lo más alto es la torre, al oeste del eje
      expect(Math.abs(cima.z - origen.z)).toBeLessThan(torre.lado + 1)
    })

    test('el claustro queda al este de la iglesia, de un piso, y llega a la calle del norte', () => {
      expect(claustro).toMatchObject({ tipo: 'palacio', pisos: 1, cubierta: 'teja' })
      expect(claustro.b + claustro.fondo / 2).toBeLessThan(terceros.b - terceros.ancho / 2) // no pisa la nave de los Terceros
      expect(claustro.a - claustro.ancho / 2).toBeCloseTo(-13, 5) // 13 m delante de la fachada: la línea de la calle
      const masAltoDelClaustro = cimaEn(datos, h.id, 1, (v) => v.x > origen.x + 25)
      expect(masAltoDelClaustro.y).toBeGreaterThan(5) // la altura va sobre el suelo: el relieve lo pone el shader
      expect(masAltoDelClaustro.y).toBeLessThan(iglesia.alto)
    })

    test('va igual en 1843: nada tiene vida propia dentro del hito', () => {
      expect(h.partes.every((p) => p.nace === undefined && p.muere === undefined)).toBe(true)
      expect(cimaEn(datos, h.id, 2)).toEqual(cimaEn(datos, h.id, 1))
    })

    test('la reserva cubre la iglesia, el atrio y el claustro, dentro de la manzana del mapa por el norte y el este', () => {
      expect(h.suprime).toHaveLength(2)
      expect(m2(h.suprime)).toBeGreaterThan(3300)
      expect(m2(h.suprime)).toBeLessThan(3700)
      const atrio = centro([h.suprime[0][0], h.suprime[0][3]])
      expect(dentroDe(h, [(atrio[0] + h.x) / 2, (atrio[1] + h.y) / 2])).toBe(true)
      // el claustro no cruza los lados norte y este de la manzana
      for (const p of h.planta[2]) expect(puntoEnPoligono(p, MANZANA), `${p}`).toBe(true)
      expect(zonasDe(h).every((z) => z.desde === 1 && z.hasta === 3 && z.solarCompleto)).toBe(true)
    })
  })

  describe('el solar del mercado (1889)', () => {
    const h = solarDelMercado

    test('no tiene edificio: una sola parte, el piso de tierra, y nada se levanta más que la losa', () => {
      expect(h.partes).toEqual([{ tipo: 'terraza', ancho: 44, fondo: 83, piso: 'tierra' }])
      let [bajo, alto] = [Infinity, -Infinity]
      const { desde, hasta } = datos.rangos.find((r) => r.id === h.id)
      for (let i = desde; i < hasta; i++) { bajo = Math.min(bajo, datos.posiciones[i * 3 + 1]); alto = Math.max(alto, datos.posiciones[i * 3 + 1]) }
      expect(alto - bajo).toBeLessThan(1) // una losa, sin paredes ni techo
    })

    test('se camina y dice en `verificar` que no se sabe qué había construido', () => {
      expect(h.transitable).toBe(true)
      expect(h.verificar.join(' ')).toMatch(/No se dibuja ningún edificio/)
      expect(h.verificar.join(' ')).toMatch(/se extendieron hasta 1895/)
    })

    test('reserva el mismo solar que el mercado de 1897', () => {
      expect(h.suprime).toEqual(mercadoSanJacinto.suprime)
      expect(zonasDe(h).every((z) => z.desde === 3 && z.hasta === 4)).toBe(true)
    })
  })

  describe('el mercado de 1897 (desde 1911)', () => {
    const h = mercadoSanJacinto
    const naves = h.partes.filter((p) => p.tipo === 'cuerpo' && p.techo !== 'plano')
    const frente = h.partes.find((p) => p.tipo === 'cuerpo' && p.techo === 'plano')

    test('«tres cuerpos autónomos adosados, de los cuales el central era de mayor altura y ancho que los laterales»', () => {
      expect(naves).toHaveLength(3)
      const [oeste, central, este] = [...naves].sort((p, q) => q.b - p.b)
      expect(central.alto).toBeGreaterThan(Math.max(oeste.alto, este.alto))
      expect(central.ancho).toBeGreaterThan(Math.max(oeste.ancho, este.ancho))
      // adosados: cada uno empieza donde termina el anterior y entre los tres llenan el ancho del solar
      expect(oeste.b - oeste.ancho / 2).toBeCloseTo(central.b + central.ancho / 2, 5)
      expect(central.b - central.ancho / 2).toBeCloseTo(este.b + este.ancho / 2, 5)
      expect(oeste.ancho + central.ancho + este.ancho).toBe(83)
    })

    test('techos bajos de zinc, no de teja («metal galvanizado»)', () => {
      for (const n of naves) {
        expect(n.teja).toBe(TONO.ZINC)
        expect(n.altoTecho).toBeLessThan(n.ancho * 0.15)
      }
    })

    test('«antecedidos por un volumen de dos pisos de mampostería»: el frente, sobre la calle del norte, a todo el ancho', () => {
      expect(frente.largo).toBe(83)
      expect(frente.alto).toBe(9)
      for (const n of naves) expect(frente.a + frente.ancho / 2).toBeCloseTo(n.a - n.largo / 2, 5) // las naves arrancan detrás
      const filas = h.partes.filter((p) => p.tipo === 'ventanas')
      expect(filas).toHaveLength(2)
      expect(filas.every((f) => f.mira[0] === -1 && f.a === frente.a - frente.ancho / 2)).toBe(true) // en la cara norte
      expect(filas[1].y).toBeGreaterThan(filas[0].y + filas[0].alto)
    })

    test('lo más alto es el cuerpo central y no pasa de 15 m: ninguna altura está medida', () => {
      const alto = cimaEn(datos, h.id, 4).y
      expect(alto).toBeGreaterThan(10)
      expect(alto).toBeLessThan(15)
      for (const e of [5, 6]) expect(cimaEn(datos, h.id, e)).toEqual(cimaEn(datos, h.id, 4))
    })

    test('solo el cuerpo norte: la reserva no llega al sur del solar, donde el plano de 1936 sigue', () => {
      expect(m2(h.suprime)).toBeCloseTo(83 * 44, 0)
      const [cx, cy] = centro(h.suprime[0])
      expect(dentroDe(h, [cx, cy])).toBe(true)
      expect(dentroDe(h, [cx - 0.2177 * 2 * 40, cy + 0.976 * 2 * 40])).toBe(false) // 40 m al sur del centro
      expect(h.verificar.join(' ')).toMatch(/Solo se modela el cuerpo norte/)
    })

    test('ocupa el lugar de la iglesia: Dávila dice que se hizo «sobre los mismos cimientos»', () => {
      expect(dentroDe(h, centro(sanJacinto.planta[0]))).toBe(true)
      expect(dentroDe(h, centro(sanJacinto.planta[2]))).toBe(true)
    })
  })

  test('las plantas de colisión llegan a hitosConPlanta con su vida; el solar de 1889, como transitable', () => {
    const etapas = hitosConPlanta().filter((p) => sanJacintoYMercado.some((h) => h.id === p.id))
    expect(etapas.map((p) => [p.id, p.nace, p.muere, Boolean(p.transitable)])).toEqual([
      ['san-jacinto', 1, 3, false], ['solar-mercado-san-jacinto', 3, 4, true], ['mercado-san-jacinto', 4, 0, false],
    ])
  })

  test('cada hito trae sus fuentes con enlace y declara las citas de segunda mano y lo que no está medido', () => {
    expect(sanJacinto.fuente).toMatch(/pdf\.blucher\.com\.br/)
    expect(sanJacinto.fuente).toMatch(/segunda mano, no cotejadas: la visita del obispo Martí de 1772 según Virginia Vivas/)
    expect(mercadoSanJacinto.fuente).toMatch(/trienal\.fau\.ucv\.ve/)
    expect(mercadoSanJacinto.fuente).toMatch(/Silva, 2010, p\. 213, de segunda mano/)
    expect(solarDelMercado.fuente).toMatch(/archive\.org\/details\/estatuasypilasan00land/)
    for (const h of [sanJacinto, mercadoSanJacinto]) expect(h.verificar[0]).toMatch(/^Alturas sin fuente: ninguna está medida/)
    expect(sanJacinto.verificar.join(' ')).toMatch(/puede estar a 15 o 20 m de su sitio/)
    expect(mercadoSanJacinto.verificar.join(' ')).toMatch(/1942.*1947.*1946/)
  })

  describe('las marcas y las fichas', () => {
    const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
    const marca = marcas.find((x) => x.id === 'san-jacinto')
    const plaza = marcas.find((x) => x.id === 'plaza-venezolano')

    test('la marca de San Jacinto apunta al hito y cae sobre lo que está en pie en cada época', () => {
      expect(marca.hito).toBe('san-jacinto')
      expect(EPOCAS.map((e) => nombreEn(marca, e).nombre)).toEqual(['Convento de San Jacinto', 'San Jacinto', 'Mercado de San Jacinto', 'Mercado de San Jacinto', 'Mercado Principal', 'Mercado Principal'])
      for (const h of sanJacintoYMercado) expect(dentroDe(h, [marca.px, marca.py]), h.id).toBe(true)
      expect(puntoEnPoligono([marca.px, marca.py], sanJacinto.planta[0])).toBe(true) // sobre la iglesia, no sobre el claustro
    })

    test('la marca de la plaza queda en la plaza: fuera de las reservas, al oeste del mercado y dentro de la cuadra', () => {
      const p = [plaza.px, plaza.py]
      for (const h of sanJacintoYMercado) expect(dentroDe(h, p), h.id).toBe(false)
      expect(puntoEnPoligono(p, MANZANA)).toBe(true)
      const bordeOeste = centro([mercadoSanJacinto.suprime[0][2], mercadoSanJacinto.suprime[0][3]])
      const distancia = Math.hypot(p[0] - bordeOeste[0], p[1] - bordeOeste[1]) * PLANO.metro
      expect(plaza.px).toBeLessThan(bordeOeste[0])
      expect(distancia).toBeGreaterThan(8)
      expect(distancia).toBeLessThan(30)
      expect([1, 3].map((e) => nombreEn(plaza, e).nombre)).toEqual(['Plaza de San Jacinto', 'Plaza El Venezolano'])
    })

    test('la ficha tiene un texto por época y dice en cada una lo que el dibujo interpreta o no muestra', () => {
      const textos = new Map(FICHAS['san-jacinto'].textos)
      expect([...textos.keys()]).toEqual(EPOCAS)
      expect(textos.get(1)).toMatch(/según Virginia Vivas, citada por Mariolly Dávila Cordido/)
      expect(textos.get(1)).toMatch(/Ninguna altura está medida/)
      expect(textos.get(2)).toMatch(/terremoto de 1812/)
      expect(textos.get(2)).toMatch(/no se halló cuándo se reparó/)
      expect(textos.get(2)).toMatch(/va dibujado igual que en 1772/)
      expect(textos.get(3)).toMatch(/no se dibuja ningún edificio/)
      expect(textos.get(4)).toMatch(/septiembre de 1897/)
      expect(textos.get(4)).toMatch(/Pérez Gallego/)
      expect(textos.get(4)).toMatch(/solo se dibuja el cuerpo norte/)
      expect(textos.get(6)).toMatch(/1942/)
      expect(textos.get(6)).toMatch(/1947/)
      expect(FICHAS['san-jacinto'].dudas).toMatch(/segunda mano/)
      expect(FICHAS['san-jacinto'].dudas).toMatch(/15 o 20 m/)
    })

    test('la ficha de la plaza cuenta la pila y la estatua con su fuente y dice que no se dibujan', () => {
      const textos = new Map(FICHAS['plaza-venezolano'].textos)
      expect(textos.get(2)).toMatch(/1845/)
      expect(textos.get(3)).toMatch(/1883/)
      expect(textos.get(3)).toMatch(/Landaeta/)
      expect(FICHAS['plaza-venezolano'].dudas).toMatch(/no se dibujan/)
    })
  })
})
