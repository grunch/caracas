import { describe, test, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { COLOR_MESA, COLOR_MESA_CSS } from '../../src/mesa.js'

const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255]

describe('la mesa: el espacio fuera de la hoja', () => {
  test('es un gris cálido y apagado, no negro', () => {
    // Arrange
    const [r, g, b] = rgb(COLOR_MESA)
    // Act
    const luz = 0.2126 * r + 0.7152 * g + 0.0722 * b
    // Assert
    expect(luz).toBeGreaterThan(55) // la de antes (#1d1a17) andaba en 26: casi negro
    expect(luz).toBeLessThan(110) // sigue más oscura que el papel, que se lee encima
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(16) // gris: casi sin color
    expect(r).toBeGreaterThanOrEqual(b) // cálido, como el papel
  })

  test('la página usa el mismo color (fondo y barra del navegador) que la escena', () => {
    const html = readFileSync('index.html', 'utf8')
    expect(COLOR_MESA_CSS).toBe(`#${COLOR_MESA.toString(16).padStart(6, '0')}`)
    expect(html).toContain(`--fondo:${COLOR_MESA_CSS}`)
    expect(html).toContain(`<meta name="theme-color" content="${COLOR_MESA_CSS}">`)
  })
})
