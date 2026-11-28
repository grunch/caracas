import { describe, expect, test } from 'vitest'
import { crearCoords } from '../../src/coords.js'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { hospitalVargas } from '../../src/hitos/datos/hospital-vargas.js'
import { parteDe } from '../../src/hitos/partes.js'
import { crearLienzo, lineal } from '../../src/hitos/lienzo.js'
import { TONO } from '../../src/hitos/piezas.js'
import { hospitalVargas as dibujarHospital } from '../../src/hitos/hospital-vargas.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'

const plano = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)

describe('Hospital Vargas', () => {
  test('reutiliza marca y cronología existente, con una huella hospitalaria desde 1889', () => {
    expect(HITOS.filter(h => h.id === 'hospital-vargas')).toHaveLength(1)
    expect(hospitalVargas.nace).toBe(3)
    expect(hospitalVargas.partes.map(({ anio, nace, muere }) => [anio, nace, muere])).toEqual([
      [1889, 3, 4], [1911, 4, 5], [1936, 5, 0],
    ])
    expect(zonasDeSupresion([hospitalVargas]).map(z => [z.desde, z.hasta])).toEqual([[3, 0]])
    expect(hitosConPlanta().find(h => h.id === 'hospital-vargas').planta).toHaveLength(5)
    expect(hospitalVargas.suprime[0]).toHaveLength(4)
    expect(validarHitos([hospitalVargas], plano)).toEqual([])
    expect(parteDe('hospitalVargas')).toBeTypeOf('function')
  })

  test('construye las fases documentadas en una malla finita', () => {
    const datos = construirHitos([hospitalVargas], coords)
    const rangos = new Map(datos.rangos.map(r => [r.id, r]))
    const rango = rangos.get('hospital-vargas')
    expect(rango.hasta - rango.desde).toBeGreaterThan(1000)
    expect(rango.hasta - rango.desde).toBeLessThan(6000)
    expect(datos.posiciones.every(Number.isFinite)).toBe(true)
    const vidas = new Set()
    for (let i = rango.desde; i < rango.hasta; i++) vidas.add(`${datos.vidas[2 * i]}/${datos.vidas[2 * i + 1]}`)
    expect(vidas).toEqual(new Set(['3/4', '4/5', '5/0']))
  })

  test('los vanos del núcleo central quedan en sus muros exteriores, a la vista', () => {
    // Núcleo de 28 × 23 m centrado en el origen; las salas quedan lejos (a = ±28, b = ±73).
    const MEDIO_ANCHO = 14, MEDIO_FONDO = 11.5
    const vano = lineal(TONO.VANO)
    for (const anio of [1889, 1911, 1936]) {
      const lienzo = crearLienzo()
      dibujarHospital(lienzo.hito({ origen: { x: 0, z: 0 } }), { anio })
      const { posiciones, colores } = lienzo.datos()
      const delNucleo = []
      for (let i = 0; i < posiciones.length / 3; i++) {
        const [x, z] = [posiciones[3 * i], posiciones[3 * i + 2]]
        const esVano = [0, 1, 2].every(k => Math.abs(colores[3 * i + k] - vano[k]) < 1e-6)
        if (esVano && Math.abs(x) < MEDIO_ANCHO + 2 && Math.abs(z) < MEDIO_FONDO + 2) delNucleo.push([x, z])
      }
      expect(delNucleo.length).toBeGreaterThan(0)
      const escondidos = delNucleo.filter(([x, z]) => Math.abs(x) < MEDIO_ANCHO && Math.abs(z) < MEDIO_FONDO)
      expect(escondidos, `${anio}`).toEqual([])
    }
  })
  test('la marca va enlazada al hito y cae sobre su núcleo, no en el borde del solar', () => {
    const dato = MARCAS.find(m => m.id === 'hospital-vargas')
    expect(dato.hito).toBe('hospital-vargas')
    expect(dato.x).toBeUndefined()
    expect(dato.y).toBeUndefined()
    const marca = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find(m => m.id === 'hospital-vargas')
    expect([marca.px, marca.py]).toEqual([hospitalVargas.x, hospitalVargas.y])
    expect(marca.nace).toBe(3)
    expect(dato.dudas).not.toMatch(/pendiente/i)
  })

  test('la ficha cuenta las cubiertas planas desde 1936 y deja los anexos de 1939 como duda', () => {
    const marca = normalizarMarcas(MARCAS, { hitos: HITOS, coords }).find(m => m.id === 'hospital-vargas')
    const rige = epoca => contenidoDeFicha({ marca, ficha: FICHAS['hospital-vargas'], epoca }).parrafos.find(p => p.rige).texto
    expect(rige(4)).not.toMatch(/platabanda/)
    for (const epoca of [5, 6]) {
      expect(rige(epoca)).toMatch(/platabandas/)
      expect(rige(epoca)).toMatch(/1891/)
    }
    expect(FICHAS['hospital-vargas'].dudas).toMatch(/1939/)
    expect(FICHAS['hospital-vargas'].dudas).toMatch(/1889/)
  })
})
