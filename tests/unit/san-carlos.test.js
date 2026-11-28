import { describe, test, expect } from 'vitest'
import { crearLienzo, MAT } from '../../src/hitos/lienzo.js'
import { sanCarlos, CUERPOS_SAN_CARLOS, CUADRO_M, LARGO_M, ALTO_MURO_M } from '../../src/hitos/datos/san-carlos.js'
import { parteDe } from '../../src/hitos/partes.js'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { validarMarcas } from '../../src/marcas.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const ALERO_M = 0.5
const MEDIO_FRENTE_M = 36.2
// El patio central que el plano de 1936 deja en blanco, en metros del marco (docs/san-carlos-georreferencia.json)
const PATIO = { a: [13, 61.3], b: [-5.8, 27.8] }
// Las esquinas del contorno leídas en el plano, en píxeles del mosaico de 1936
const ESQUINAS_PX = { norte: [9173, 4860], oeste: [9075, 5030.5], sur: [9202, 5100], este1946: [9293.3, 4932.5] }

function dibujar(fn) {
  const lienzo = crearLienzo()
  fn(lienzo.hito({ origen: { x: 0, z: 0 } }))
  const d = lienzo.datos()
  const caja = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (let i = 0; i < d.posiciones.length; i++) {
    caja.min[i % 3] = Math.min(caja.min[i % 3], d.posiciones[i])
    caja.max[i % 3] = Math.max(caja.max[i % 3], d.posiciones[i])
  }
  const puntos = []
  for (let i = 0; i < d.posiciones.length; i += 3) puntos.push([d.posiciones[i], d.posiciones[i + 1], d.posiciones[i + 2]])
  const materiales = new Set()
  for (let i = 2; i < d.hitos.length; i += 4) materiales.add(d.hitos[i])
  return { caja, puntos, materiales, triangulos: d.indices.length / 3, sano: d.posiciones.every(Number.isFinite) && d.normales.every(Number.isFinite) }
}

/** El vértice más alto de lo que está en pie en `epoca`, o null si no hay nada. */
function cimaEn(datos, id, epoca) {
  const { desde, hasta } = datos.rangos.find((r) => r.id === id)
  let cima = null
  for (let i = desde; i < hasta; i++) {
    const [nace, muere] = [datos.vidas[i * 2], datos.vidas[i * 2 + 1]]
    if (nace > epoca || (muere && muere <= epoca)) continue
    if (cima === null || datos.posiciones[i * 3 + 1] > cima) cima = datos.posiciones[i * 3 + 1]
  }
  return cima
}

/** Vértices en pie en `epoca`. */
function verticesEn(datos, id, epoca) {
  const { desde, hasta } = datos.rangos.find((r) => r.id === id)
  let n = 0
  for (let i = desde; i < hasta; i++) {
    const [nace, muere] = [datos.vidas[i * 2], datos.vidas[i * 2 + 1]]
    if (nace <= epoca && !(muere && muere <= epoca)) n++
  }
  return n
}

/** De metros del marco del cuartel a píxeles del plano. */
function aPixeles(a, b) {
  const [ux, uy] = sanCarlos.eje.map((c) => c / Math.hypot(...sanCarlos.eje))
  return [sanCarlos.x + (a * ux - b * uy) / PLANO.metro, sanCarlos.y + (a * uy + b * ux) / PLANO.metro]
}

/** Dibuja en el origen las partes del hito que nacen en `nace` (3: el cuadro; 4: la prolongación). */
const cuartelSanCarlos = (p, { nace }) => {
  for (const { tipo, nace: n, muere, ...medidas } of sanCarlos.partes.filter((parte) => parte.nace === nace)) parteDe(tipo)(p, medidas)
}
const CUADRO = { nace: 3 }
const PROLONGACION = { nace: 4 }

describe('los cuerpos del Cuartel San Carlos', () => {
  test('el cuadro llega hasta la crujía norte del patio y no pasa de ahí', () => {
    // Arrange / Act
    const d = dibujar((p) => cuartelSanCarlos(p, CUADRO))

    // Assert
    expect(d.sano).toBe(true)
    expect(d.caja.max[0]).toBeGreaterThan(CUADRO_M - 0.01)
    expect(d.caja.max[0]).toBeLessThan(CUADRO_M + ALERO_M)
    expect(d.caja.min[0]).toBeGreaterThan(-ALERO_M)
    expect(d.caja.max[2]).toBeLessThan(MEDIO_FRENTE_M + ALERO_M)
    expect(d.caja.min[2]).toBeGreaterThan(-MEDIO_FRENTE_M - ALERO_M)
  })

  test('la prolongación empieza donde termina el cuadro y llega al fondo del contorno de 1936', () => {
    const d = dibujar((p) => cuartelSanCarlos(p, PROLONGACION))
    expect(d.sano).toBe(true)
    expect(d.caja.min[0]).toBeGreaterThan(CUADRO_M - ALERO_M)
    expect(d.caja.max[0]).toBeGreaterThan(LARGO_M - 0.01)
    expect(d.caja.max[0]).toBeLessThan(LARGO_M + ALERO_M)
  })

  test('el patio central queda abierto: ningún vértice cae dentro, ni muro ni alero', () => {
    const d = dibujar((p) => { cuartelSanCarlos(p, CUADRO); cuartelSanCarlos(p, PROLONGACION) })
    const dentro = d.puntos.filter(([a, , b]) => a > PATIO.a[0] + ALERO_M && a < PATIO.a[1] - ALERO_M && b > PATIO.b[0] + ALERO_M && b < PATIO.b[1] - ALERO_M)
    expect(dentro).toEqual([])
  })

  test('es una envolvente de un piso con teja: no pasa del muro más la cubierta baja', () => {
    const d = dibujar((p) => cuartelSanCarlos(p, CUADRO))
    expect(d.materiales.has(MAT.TEJA)).toBe(true)
    expect(d.caja.max[1]).toBeGreaterThan(ALTO_MURO_M + 1)
    expect(d.caja.max[1]).toBeLessThanOrEqual(ALTO_MURO_M + 3 + 1e-6)
  })

  test('solo el cuadro lleva la puerta, en el frente sur', () => {
    const cuadro = dibujar((p) => cuartelSanCarlos(p, CUADRO))
    // cada cuerpo: 12 triángulos de caja, 4 de faldones y 2 de hastiales
    expect(cuadro.triangulos).toBeGreaterThan(CUERPOS_SAN_CARLOS.cuadro.length * 18)
    expect(dibujar((p) => cuartelSanCarlos(p, PROLONGACION)).triangulos).toBe(CUERPOS_SAN_CARLOS.prolongacion.length * 18)
    expect(cuadro.puntos.some(([a, y, b]) => a < 0 && a > -0.2 && y < 0.01 && Math.abs(b) < 2)).toBe(true)
  })

  test('cada cuerpo del plano es una parte, con la cumbrera a lo largo y la cubierta baja', () => {
    const cuerpos = sanCarlos.partes.filter((parte) => parte.tipo === 'cuerpo')
    expect(cuerpos.length).toBe(CUERPOS_SAN_CARLOS.cuadro.length + CUERPOS_SAN_CARLOS.prolongacion.length)
    for (const parte of cuerpos) {
      expect(parte.largo).toBeGreaterThanOrEqual(parte.ancho)
      expect(parte.altoTecho).toBeLessThanOrEqual(3)
      expect(parte.alto).toBe(ALTO_MURO_M)
    }
  })

  test('los cuerpos no se pisan entre sí ni salen del contorno', () => {
    const todos = [...CUERPOS_SAN_CARLOS.cuadro, ...CUERPOS_SAN_CARLOS.prolongacion]
    for (const [a0, a1, b0, b1] of todos) {
      expect(a0).toBeGreaterThanOrEqual(0)
      expect(a1).toBeLessThanOrEqual(LARGO_M)
      expect(Math.abs(b0)).toBeLessThanOrEqual(MEDIO_FRENTE_M)
      expect(Math.abs(b1)).toBeLessThanOrEqual(MEDIO_FRENTE_M)
    }
    for (const [i, p] of todos.entries()) {
      for (const q of todos.slice(i + 1)) {
        const solapan = Math.min(p[1], q[1]) - Math.max(p[0], q[0]) > 1e-6 && Math.min(p[3], q[3]) - Math.max(p[2], q[2]) > 1e-6
        expect(solapan, `${p} y ${q}`).toBe(false)
      }
    }
  })
})

describe('Cuartel San Carlos como hito (#248)', () => {
  const datos = construirHitos(HITOS, coords)

  test('está en HITOS y pasa la validación', () => {
    expect(HITOS.filter((h) => h.id === 'san-carlos')).toEqual([sanCarlos])
    expect(validarHitos([sanCarlos], PLANO)).toEqual([])
  })

  test('no existe en 1772 ni en 1843 (en ruinas y en reparación): ni geometría, ni reserva, ni colisión', () => {
    // Arrange
    const zonas = zonasDeSupresion([sanCarlos])

    // Assert
    expect([sanCarlos.nace, sanCarlos.muere]).toEqual([3, 0])
    for (const epoca of [1, 2]) expect(verticesEn(datos, 'san-carlos', epoca)).toBe(0)
    expect(zonas.length).toBeGreaterThan(0)
    expect(zonas.every((z) => z.desde >= 3)).toBe(true)
    expect(hitosConPlanta().filter((h) => h.id === 'san-carlos').every((h) => h.nace >= 3)).toBe(true)
  })

  test('en 1889 está el cuadro; desde 1911, también las naves prolongadas', () => {
    const [v1889, v1911] = [verticesEn(datos, 'san-carlos', 3), verticesEn(datos, 'san-carlos', 4)]
    expect(v1889).toBeGreaterThan(0)
    expect(v1911).toBeGreaterThan(v1889)
    expect(verticesEn(datos, 'san-carlos', 5)).toBe(v1911)
    expect(verticesEn(datos, 'san-carlos', 6)).toBe(v1911)
    expect(new Set(sanCarlos.partes.map((p) => `${p.nace}-${p.muere}`))).toEqual(new Set(['3-0', '4-0']))
  })

  test('la planta de colisión sigue las fases: el fondo norte solo choca desde 1911', () => {
    const plantas = hitosConPlanta().filter((h) => h.id === 'san-carlos')
    const fondo = aPixeles(95, 0)
    const frente = aPixeles(6, 0)
    const chocaEn = (punto, epoca) => plantas.some((h) => h.nace <= epoca && h.planta.some((poligono) => puntoEnPoligono(punto, poligono)))
    expect(chocaEn(frente, 2)).toBe(false)
    expect(chocaEn(frente, 3)).toBe(true)
    expect(chocaEn(fondo, 3)).toBe(false)
    expect(chocaEn(fondo, 4)).toBe(true)
    expect(chocaEn(aPixeles(37, 11), 5)).toBe(false) // el patio central es transitable
  })

  test('la reserva es el recinto documentado de cada época: el cuadro en 1889 y el contorno completo desde 1911', () => {
    // Arrange
    const zonas = zonasDeSupresion([sanCarlos])
    const enEpoca = (e) => zonas.filter((z) => z.desde <= e && (!z.hasta || z.hasta > e))
    const reservado = (punto, e) => enEpoca(e).some((z) => puntoEnPoligono(punto, z.poligono))
    const haciaElCentro = ([x, y]) => { const [cx, cy] = aPixeles(LARGO_M / 2, 0); return [x + (cx - x) * 0.05, y + (cy - y) * 0.05] }

    // Assert: una sola zona en pie por época
    for (const e of [3, 4, 5, 6]) expect(enEpoca(e)).toHaveLength(1)
    // 1889: el frente y el cuadro, pero no el traspatio ni las esquinas del fondo, que el cuartel aún no ocupaba
    expect(reservado(haciaElCentro(ESQUINAS_PX.oeste), 3)).toBe(true)
    expect(reservado(haciaElCentro(ESQUINAS_PX.sur), 3)).toBe(true)
    expect(reservado(aPixeles(CUADRO_M - 2, 0), 3)).toBe(true)
    expect(reservado(aPixeles(CUADRO_M + 2, 0), 3)).toBe(false)
    expect(reservado(haciaElCentro(ESQUINAS_PX.norte), 3)).toBe(false)
    // desde 1911: las cuatro esquinas leídas en el plano
    for (const e of [4, 5, 6]) for (const esquina of Object.values(ESQUINAS_PX)) expect(reservado(haciaElCentro(esquina), e)).toBe(true)
    // nunca la calle ni los jardines del sur
    for (const e of [3, 4, 5, 6]) {
      for (const afuera of [aPixeles(-8, 0), aPixeles(LARGO_M + 8, 0), aPixeles(40, -MEDIO_FRENTE_M - 8), aPixeles(40, MEDIO_FRENTE_M + 8)]) {
        expect(reservado(afuera, e)).toBe(false)
      }
    }
    expect(zonas.every((z) => z.solarCompleto)).toBe(true)
  })

  test('la regla de hitos y manzanas (R13) mide el recinto de cada etapa, no el contorno completo desde 1889', () => {
    // Arrange: lo que tools/hitos-manzanas.mjs le pasa a la medición
    const etapas = hitosConPlanta().filter((h) => h.id === 'san-carlos')
    const area = (poligono) => Math.abs(poligono.reduce((s, [x, y], i) => { const [x1, y1] = poligono[(i + 1) % poligono.length]; return s + x * y1 - x1 * y }, 0) / 2) * PLANO.metro ** 2
    const recintoEn = (e) => etapas.filter((h) => h.nace <= e).flatMap((h) => h.suprime)

    // Act / Assert: en 1889 solo el cuadro (72,4 × 77 m); desde 1911 entra también el contorno completo (72,4 × 98,3 m)
    expect(recintoEn(2)).toEqual([])
    expect(recintoEn(3).map(area).map(Math.round)).toEqual([Math.round(72.4 * CUADRO_M)])
    expect(Math.max(...recintoEn(4).map(area))).toBeCloseTo(72.4 * LARGO_M, 0)
  })

  test('las esquinas del modelo caen a menos de 4 m de las leídas en el plano', () => {
    const modelo = { norte: aPixeles(LARGO_M, -MEDIO_FRENTE_M), oeste: aPixeles(0, -MEDIO_FRENTE_M), sur: aPixeles(0, MEDIO_FRENTE_M), este1946: aPixeles(LARGO_M, MEDIO_FRENTE_M) }
    for (const [nombre, [x, y]] of Object.entries(ESQUINAS_PX)) {
      expect(Math.hypot(modelo[nombre][0] - x, modelo[nombre][1] - y) * PLANO.metro, nombre).toBeLessThan(4)
    }
  })

  test('no pasa de un piso con su cubierta en ninguna época, y en 1843 no hay nada en pie', () => {
    for (const epoca of [3, 4, 5, 6]) {
      const cima = cimaEn(datos, 'san-carlos', epoca)
      expect(cima).toBeGreaterThan(ALTO_MURO_M)
      expect(cima).toBeLessThanOrEqual(ALTO_MURO_M + 3 + 1e-6)
    }
    expect(cimaEn(datos, 'san-carlos', 2)).toBeNull()
  })

  test('declara la fuente con enlace, las citas de segunda mano y lo que no se modela', () => {
    expect(sanCarlos.fuente).toMatch(/https:\/\/dialnet\.unirioja\.es/)
    expect(sanCarlos.fuente).toMatch(/según Liendo, 2001, citado por Flores/)
    expect(sanCarlos.fuente).toMatch(/según Avendaño, 1999, citado por Flores/)
    const pendientes = sanCarlos.verificar.join(' ')
    expect(pendientes).toMatch(/Alturas sin fuente/)
    expect(pendientes).toMatch(/garitas/)
    expect(pendientes).toMatch(/ruinas/)
    expect(pendientes).toMatch(/dos pisos/)
  })
})

describe('marca y ficha del Cuartel San Carlos', () => {
  const marca = MARCAS.find((m) => m.id === 'san-carlos')

  test('la marca sale del hito, desde 1843, con el nombre de cada plano', () => {
    expect(marca.hito).toBe('san-carlos')
    expect(marca.nace).toBe(2)
    expect(marca.nombres.map(([desde, nombre]) => [desde, nombre])).toEqual([[2, 'Cuartel Veterano'], [3, 'Cuartel San Carlos']])
    expect(marca.nombres[0][2]).toMatch(/ruinas.*no se dibuja/)
    expect(sanCarlos.nace).toBe(3) // la marca nace antes que el edificio: en 1843 solo hay nombre
    expect(validarMarcas([marca], { hitos: HITOS, plano: PLANO })).toEqual([])
  })

  test('el rótulo cae dentro del contorno del cuartel', () => {
    const [zona] = zonasDeSupresion([sanCarlos])
    expect(puntoEnPoligono([marca.x ?? sanCarlos.x, marca.y ?? sanCarlos.y], zona.poligono)).toBe(true)
  })

  test('la ficha dice en cada época lo que el mapa muestra y lo que no', () => {
    const textos = new Map(FICHAS['san-carlos'].textos.map(([desde, texto]) => [desde, texto]))
    expect([...textos.keys()]).toEqual([2, 3, 4, 6])
    expect(textos.get(2)).toMatch(/ruinas/)
    expect(textos.get(2)).toMatch(/no se dibuja/)
    expect(textos.get(2)).toMatch(/citado por/)
    expect(textos.get(3)).toMatch(/1884/)
    expect(textos.get(4)).toMatch(/1900/)
    expect(textos.get(4)).toMatch(/garitas/)
    expect(textos.get(6)).toMatch(/Comandancia/)
    expect(textos.get(6)).toMatch(/no se dibuja/)
    expect(FICHAS['san-carlos'].dudas).toMatch(/altura/i)
  })
})
