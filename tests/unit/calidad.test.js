import { describe, test, expect } from 'vitest'
import { esLiviano, proporcionDePixeles } from '../../src/calidad.js'

const equipo = (cambios = {}) => ({ params: new URLSearchParams(''), maxTextura: 16384, pantalla: { ancho: 1440, alto: 900 }, memoria: 8, ...cambios })

describe('esLiviano', () => {
  test('una laptop con buena GPU no es liviana', () => {
    expect(esLiviano(equipo())).toBe(false)
  })

  test('es liviano un teléfono (lado corto < 600), una GPU que no llega a 8192 o poca memoria', () => {
    expect(esLiviano(equipo({ pantalla: { ancho: 390, alto: 844 } }))).toBe(true)
    expect(esLiviano(equipo({ maxTextura: 4096 }))).toBe(true)
    expect(esLiviano(equipo({ memoria: 2 }))).toBe(true)
  })

  test('sin dato de memoria (Safari, Firefox) cuenta como suficiente', () => {
    expect(esLiviano(equipo({ memoria: undefined }))).toBe(false)
  })

  test('?liviano lo fuerza y ?pesado lo impide', () => {
    expect(esLiviano(equipo({ params: new URLSearchParams('liviano') }))).toBe(true)
    expect(esLiviano(equipo({ params: new URLSearchParams('pesado'), pantalla: { ancho: 390, alto: 844 } }))).toBe(false)
  })
})

describe('proporcionDePixeles', () => {
  test('hasta 2 en equipos completos y hasta 1,5 en livianos: en un teléfono de 3× es lo que más cuesta', () => {
    expect(proporcionDePixeles({ dpr: 3, liviano: false })).toBe(2)
    expect(proporcionDePixeles({ dpr: 3, liviano: true })).toBe(1.5)
    expect(proporcionDePixeles({ dpr: 1, liviano: true })).toBe(1)
  })

  test('las capturas van siempre a 1', () => {
    expect(proporcionDePixeles({ dpr: 2, liviano: false, captura: true })).toBe(1)
  })
})
