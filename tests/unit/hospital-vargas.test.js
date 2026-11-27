import { describe, expect, test } from 'vitest'
import { crearCoords } from '../../src/coords.js'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion } from '../../src/hitos.js'
import { hitosConPlanta } from '../../src/hitos/plantas.js'
import { hospitalVargas } from '../../src/hitos/datos/hospital-vargas.js'
import { parteDe } from '../../src/hitos/partes.js'

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
})
