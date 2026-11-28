import { describe, test, expect } from 'vitest'
import { crearLienzo, lineal } from '../../src/hitos/lienzo.js'
import { TONO } from '../../src/hitos/piezas.js'
import { HITOS, validarHitos, construirHitos } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { zonasDeSupresion, puntoEnPoligono } from '../../src/hitos/suprimir.js'
import { casaNatal as hito, SOLAR, PATIOS, FASES, vanosDeFachada } from '../../src/hitos/datos/casa-natal.js'
import { parteDe } from '../../src/hitos/partes.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const lado = ([x0, y0], [x1, y1]) => Math.hypot(x1 - x0, y1 - y0) * PLANO.metro

/**
 * Dibuja las partes que cumplen `cuales` en un marco sin girar: x = a (hacia el fondo del solar), z = b
 * (b < 0 es el sur de la fachada).
 */
function dibujar(cuales) {
  const lienzo = crearLienzo()
  const p = lienzo.hito({ origen: { x: 0, z: 0 } })
  for (const { tipo, nace, muere, ...medidas } of hito.partes.filter(cuales)) parteDe(tipo)(p, medidas)
  const d = lienzo.datos()
  const vertices = []
  for (let i = 0; i < d.posiciones.length; i += 3) {
    vertices.push({ x: d.posiciones[i], y: d.posiciones[i + 1], z: d.posiciones[i + 2], color: [d.colores[i], d.colores[i + 1], d.colores[i + 2]] })
  }
  return { vertices, triangulos: d.indices.length / 3, sano: d.posiciones.every(Number.isFinite) && d.normales.every(Number.isFinite) }
}
const fachada = (fase) => dibujar((p) => p.pieza === 'fachada' && p.fase === fase)

/** El vértice más alto de lo que está en pie en `epoca`. */
function cimaEn(datos, id, epoca) {
  const { desde, hasta } = datos.rangos.find((r) => r.id === id)
  let cima = -Infinity
  let vivos = 0
  for (let i = desde; i < hasta; i++) {
    const [nace, muere] = [datos.vidas[i * 2], datos.vidas[i * 2 + 1]]
    if (nace > epoca || (muere && muere <= epoca)) continue
    vivos++
    cima = Math.max(cima, datos.posiciones[i * 3 + 1])
  }
  return { cima, vivos }
}

describe('Casa Natal del Libertador (#247): el solar y su vida', () => {
  test('es un hito válido, en pie en las seis épocas, y va al final de la lista', () => {
    // Arrange / Act
    const problemas = validarHitos([hito], PLANO)

    // Assert
    expect(problemas).toEqual([])
    expect(HITOS.find((h) => h.id === 'casa-natal')).toBe(hito)
    expect([hito.nace, hito.muere]).toEqual([1, 0])
  })

  test('el solar mide lo que da el Diccionario de Historia de Venezuela: 22,40 m de frente por 60,50 m de fondo', () => {
    const [a, b, c] = hito.suprime[0]
    expect(SOLAR).toEqual({ frente: 22.4, fondo: 60.5 })
    expect(lado(a, b)).toBeCloseTo(60.5, 3)
    expect(lado(b, c)).toBeCloseTo(22.4, 3)
  })

  test('la fachada da al este (a la calle de San Jacinto a Traposos) y el solar entra hacia el oeste', () => {
    const origen = coords.aMundo(hito.x, hito.y)
    const xs = hito.suprime[0].map(([x, y]) => coords.aMundo(x, y).x)
    expect(Math.max(...xs)).toBeLessThan(origen.x + 3) // nada pasa de la línea de fachada hacia la calle
    expect(Math.min(...xs)).toBeLessThan(origen.x - 55)
  })

  test.each([
    ['la calle, al este', [9278, 7168]],
    ['el vecino del norte', [9220, 7124]],
    ['el vecino del sur', [9220, 7200]],
    ['el fondo de la manzana, al oeste', [9125, 7140]],
  ])('la reserva es el solar y deja afuera %s', (_, punto) => {
    const zonas = zonasDeSupresion([hito])
    expect(zonas.some((z) => puntoEnPoligono([9200, 7155], z.poligono))).toBe(true)
    expect(zonas.some((z) => puntoEnPoligono(punto, z.poligono))).toBe(false)
    expect(zonas.every((z) => z.desde === 1 && z.hasta === 0)).toBe(true)
    // entre medianeras: sin solarCompleto, la casa vecina que apenas roza el solar sigue en pie
    expect(zonas.some((z) => z.solarCompleto)).toBe(false)
  })

  test('zaguán y dos patios (IPC): los patios quedan abiertos dentro del solar, donde el plano de 1936 deja blancos', () => {
    const enPlanta = (p) => hito.planta.some((poligono) => puntoEnPoligono(p, poligono))
    const enSolar = (p) => puntoEnPoligono(p, hito.suprime[0])
    expect(PATIOS).toHaveLength(2)
    for (const blanco of [[9232, 7157], [9185, 7153]]) {
      expect(enSolar(blanco)).toBe(true)
      expect(enPlanta(blanco)).toBe(false)
    }
    // la crujía de la calle, la que separa los patios y la del fondo sí son colisión
    for (const techado of [[9257, 7166], [9208, 7155], [9155, 7146]]) expect(enPlanta(techado)).toBe(true)
  })

  test('las plantas llegan a hitosConPlanta desde 1772', () => {
    const etapas = hitosConPlanta().filter((p) => p.id === 'casa-natal')
    expect(etapas).toHaveLength(1)
    expect(etapas[0].nace).toBe(1)
    expect(etapas[0].planta).toHaveLength(hito.planta.length)
  })
})

describe('Casa Natal: las fachadas por época', () => {
  test('cuatro fases de fachada que cubren las seis épocas sin huecos ni solapes', () => {
    const fachadas = hito.partes.filter((p) => p.pieza === 'fachada')
    const vidas = [...new Set(fachadas.map((p) => `${p.fase}:${p.nace}-${p.muere}`))]
    expect(vidas).toEqual(['colonial:1-2', 'republicana:2-4', 'comercio:4-5', 'restaurada:5-0'])
    expect(Object.keys(FASES)).toEqual(['colonial', 'republicana', 'comercio', 'restaurada'])
    // los cuerpos no llevan vida propia: están en pie toda la vida del hito
    const cuerpos = hito.partes.filter((p) => p.pieza === 'cuerpos')
    expect(cuerpos).toHaveLength(7)
    expect(cuerpos.every((p) => p.nace === undefined && p.muere === undefined)).toBe(true)
    expect(hito.partes).toHaveLength(cuerpos.length + fachadas.length)
  })

  test('colonial, republicana y restaurada: portón y cuatro ventanas, tres de ellas en la sala del sur (Landaeta, 1912)', () => {
    for (const fase of ['colonial', 'republicana', 'restaurada']) {
      const vanos = vanosDeFachada(fase)
      expect(vanos.filter((v) => v.tipo === 'ventana')).toHaveLength(4)
      expect(vanos.filter((v) => v.tipo === 'ventana' && v.b < 0)).toHaveLength(3)
      expect(vanos.filter((v) => v.tipo === 'porton')).toHaveLength(1)
      expect(vanos.find((v) => v.tipo === 'porton').b).toBeGreaterThan(0) // el portón, al norte de la sala
    }
  })

  test('comercio (1911): las tres ventanas del sur son puertas; queda el portón y la ventana del norte', () => {
    const vanos = vanosDeFachada('comercio')
    expect(vanos.filter((v) => v.tipo === 'puerta' && v.b < 0)).toHaveLength(3)
    expect(vanos.filter((v) => v.tipo === 'ventana').map((v) => Math.sign(v.b))).toEqual([1])
    expect(vanos.filter((v) => v.tipo === 'porton')).toHaveLength(1)
  })

  test('una fase desconocida es un error, no una fachada vacía', () => {
    expect(() => vanosDeFachada('moderna')).toThrow(/fase/)
  })

  test('en la geometría, solo en la fase de comercio los vanos del sur llegan al piso', () => {
    // Arrange
    const hueco = lineal(TONO.VANO)
    const esHueco = (v) => v.color.every((c, i) => Math.abs(c - hueco[i]) < 1e-6)
    const huecosDelSur = (fase) => fachada(fase).vertices.filter((v) => v.z < -0.8 && esHueco(v))
    const pisoDelSur = (fase) => Math.min(...huecosDelSur(fase).map((v) => v.y))

    // Act / Assert: z < 0 es el sur de la fachada; una ventana empieza en su repisa, una puerta en el suelo
    for (const fase of Object.keys(FASES)) {
      // los huecos dibujados están donde dice vanosDeFachada: tres al sur, cada uno centrado en su b
      const centros = vanosDeFachada(fase).filter((v) => v.b < 0).map((v) => v.b)
      for (const b of centros) expect(huecosDelSur(fase).some((v) => Math.abs(v.z - b) < 1)).toBe(true)
    }
    expect(pisoDelSur('comercio')).toBeCloseTo(0, 5)
    for (const fase of ['colonial', 'republicana', 'restaurada']) expect(pisoDelSur(fase)).toBeGreaterThan(0.5)
  })

  test('cada fase dibuja algo distinto y sano; solo la colonial lleva las rejas voladas de madera', () => {
    const fases = Object.keys(FASES).map(fachada)
    for (const f of fases) {
      expect(f.sano).toBe(true)
      expect(f.triangulos).toBeGreaterThan(0)
      expect(Math.min(...f.vertices.map((v) => v.x))).toBeGreaterThan(-1.2)
    }
    const firmas = fases.map((f) => `${f.triangulos}:${f.vertices.length}:${f.vertices.reduce((s, v) => s + v.x + 2 * v.y + 3 * v.z, 0).toFixed(3)}`)
    expect(new Set(firmas).size).toBe(4)
    const vuelo = fases.map((f) => -Math.min(...f.vertices.map((v) => v.x)))
    expect(vuelo[0]).toBeGreaterThan(0.6) // colonial: la reja vuela sobre la calle
    for (const v of vuelo.slice(1)) expect(v).toBeLessThan(0.45)
    expect(hito.partes.filter((p) => p.balcon).every((p) => p.fase === 'colonial')).toBe(true)
  })
})

describe('Casa Natal: el volumen', () => {
  const datos = construirHitos([hito], coords)

  test('es de un solo piso en todas las épocas: el piso alto anterior a 1812 no se dibuja porque no se sabe dónde estaba', () => {
    const cimas = [1, 2, 3, 4, 5, 6].map((e) => cimaEn(datos, 'casa-natal', e))
    for (const { cima, vivos } of cimas) {
      expect(vivos).toBeGreaterThan(0)
      expect(cima).toBeLessThan(9) // un piso y su tejado
      expect(cima).toBeGreaterThan(5)
    }
    expect(new Set(cimas.map((c) => c.cima.toFixed(3))).size).toBe(1) // la cumbrera no cambia: solo la fachada
    expect(hito.verificar.join(' ')).toMatch(/piso alto/i)
  })

  test('los cuerpos caben en el solar y dejan los dos patios sin techo', () => {
    const { vertices, sano } = dibujar((p) => p.pieza === 'cuerpos')
    expect(sano).toBe(true)
    const alero = 0.6
    expect(Math.min(...vertices.map((v) => v.x))).toBeGreaterThanOrEqual(-alero)
    expect(Math.max(...vertices.map((v) => v.x))).toBeLessThanOrEqual(SOLAR.fondo + 1e-6)
    expect(Math.max(...vertices.map((v) => Math.abs(v.z)))).toBeLessThanOrEqual(SOLAR.frente / 2 + 1e-6) // medianeras: sin alero a los lados
    for (const patio of PATIOS) {
      const dentro = vertices.filter((v) => Math.abs(v.x - patio.a) < patio.largo / 2 - alero - 0.01 && Math.abs(v.z - patio.b) < patio.ancho / 2 - alero - 0.01)
      expect(dentro).toEqual([])
    }
  })

  test('cuesta poco: menos de 1.000 triángulos con las cuatro fachadas', () => {
    expect(datos.indices.length / 3).toBeLessThan(1000)
    expect(datos.indices.length / 3).toBeGreaterThan(100)
  })
})

describe('Casa Natal: la marca y la ficha', () => {
  const marca = MARCAS.find((m) => m.id === 'casa-natal')

  test('la marca sale del hito y conserva sus dos nombres y sus planos', () => {
    expect(marca.hito).toBe('casa-natal')
    expect(marca.x).toBeUndefined()
    expect(marca.y).toBeUndefined()
    expect(marca.nace).toBe(1)
    expect(marca.nombres).toEqual([[1, 'Casa de los Bolívar'], [2, 'Casa natal del Libertador']])
    expect(marca.fuente).toMatch(/24 «Casa donde nació Bolívar»/)
    expect(marca.fuente).toMatch(/archive\.org\/details\/lacasadondenacie00land/)
  })

  test('la ficha cuenta cada etapa con lo que se dibuja y lo que no', () => {
    const ficha = FICHAS['casa-natal']
    expect(ficha.textos.map(([e]) => e)).toEqual([1, 2, 4, 5])
    const [colonial, republicana, comercio, restaurada] = ficha.textos.map(([, t]) => t)
    expect(colonial).toMatch(/1759/) // el padrón que ya la llama «casa de don Vicente Bolívar»
    expect(colonial).toMatch(/piso alto[^.]*no se dibuja/i)
    expect(republicana).toMatch(/1812/)
    expect(republicana).toMatch(/un solo piso/)
    expect(comercio).toMatch(/puertas/)
    expect(comercio).toMatch(/1912/)
    expect(restaurada).toMatch(/1921/)
    expect(restaurada).toMatch(/mármol/)
    expect(ficha.dudas).toMatch(/altura/i)
    expect(ficha.dudas).toMatch(/patios/i)
  })

  test('cada época muestra el texto de su etapa', () => {
    const normal = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find((m) => m.id === 'casa-natal')
    const textoEn = (epoca) => contenidoDeFicha({ marca: normal, ficha: FICHAS['casa-natal'], epoca }).parrafos.find((p) => p.rige).texto
    expect(textoEn(1)).toMatch(/1759/)
    expect(textoEn(3)).toMatch(/1812/)
    expect(textoEn(4)).toMatch(/puertas/)
    expect(textoEn(6)).toMatch(/1921/)
  })
})
