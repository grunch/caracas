import { describe, test, expect } from 'vitest'
import { gestoDeDosDedos, modoDeGesto } from '../../src/gestos.js'

const par = (x1, y1, x2, y2) => [{ x: x1, y: y1 }, { x: x2, y: y2 }]

describe('gestoDeDosDedos', () => {
  test('separar los dedos acerca: la escala es cuánto creció la distancia entre ellos', () => {
    // Act
    const g = gestoDeDosDedos(par(40, 50, 60, 50), par(30, 50, 70, 50))

    // Assert
    expect(g.escala).toBeCloseTo(2)
    expect(g.giro).toBeCloseTo(0)
    expect(g.medio).toEqual({ x: 50, y: 50 })
  })

  test('girar los dedos en el sentido del reloj (en pantalla, y hacia abajo) da un giro positivo', () => {
    const g = gestoDeDosDedos(par(40, 50, 60, 50), par(50, 40, 50, 60))
    expect(g.giro).toBeCloseTo(Math.PI / 2)
    expect(g.escala).toBeCloseTo(1)
  })

  test('el giro cruza ±π por el camino corto', () => {
    // de casi π a casi −π es un giro chico, no una vuelta entera
    const g = gestoDeDosDedos(par(60, 50.5, 40, 49.5), par(60, 49.5, 40, 50.5))
    expect(Math.abs(g.giro)).toBeLessThan(0.2)
  })

  test('deslizar los dos dedos juntos hacia arriba o abajo inclina: el corrimiento vertical del medio', () => {
    const g = gestoDeDosDedos(par(40, 50, 60, 50), par(40, 30, 60, 30))
    expect(g.inclinar).toBe(-20)
    expect(g.escala).toBeCloseTo(1)
  })


  test('dos dedos en el mismo punto no rompen la cuenta', () => {
    const g = gestoDeDosDedos(par(50, 50, 50, 50), par(40, 50, 60, 50))
    expect(g.escala).toBe(1)
    expect(Number.isFinite(g.giro)).toBe(true)
  })
})

describe('modoDeGesto', () => {
  // el navegador avisa un dedo por vez: el modo se decide una vez, con lo que se movieron desde que se apoyaron
  test('sin moverse lo suficiente, todavía no decide', () => {
    expect(modoDeGesto(par(40, 50, 60, 50), par(40, 45, 60, 50))).toBeNull()
  })

  test('los dos dedos hacia arriba (o abajo), casi en vertical: inclinar', () => {
    expect(modoDeGesto(par(40, 50, 60, 50), par(41, 40, 60, 40))).toBe('inclinar')
    expect(modoDeGesto(par(40, 50, 60, 50), par(40, 60, 61, 58))).toBe('inclinar')
  })

  test('separarlos, juntarlos, girarlos o moverlos en direcciones distintas: pellizcar', () => {
    expect(modoDeGesto(par(40, 50, 60, 50), par(32, 50, 68, 50))).toBe('pellizcar')
    expect(modoDeGesto(par(40, 50, 60, 50), par(40, 40, 60, 60))).toBe('pellizcar')
    expect(modoDeGesto(par(40, 50, 60, 50), par(40, 50, 60, 10))).toBe('pellizcar')   // solo uno se movió, y mucho
  })

  test('un dedo bajó o subió y el otro todavía no avisó: espera al otro antes de decidir', () => {
    // Arrange: los dos suben de y = 200 a y = 185, pero el navegador avisa primero uno solo
    const inicio = par(40, 200, 60, 200)

    // Act
    const conUno = modoDeGesto(inicio, par(40, 185, 60, 200))
    const conLosDos = modoDeGesto(inicio, par(40, 185, 60, 185))

    // Assert
    expect(conUno).toBeNull()
    expect(conLosDos).toBe('inclinar')
  })
})
