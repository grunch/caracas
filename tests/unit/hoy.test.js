import { describe, test, expect } from 'vitest'
import { texturasHoy, HOY_LEJOS, HOY_CERCA } from '../../src/hoy.js'
import { GLSL_HOY } from '../../src/shader/hoy.js'

describe('qué texturas de "lo de hoy" se cargan', () => {
  test('en un equipo que admite 8192 px y no es liviano, la de lejos y la de cerca', () => {
    // Arrange · Act
    const urls = texturasHoy({ maxTextura: 16384, liviano: false })
    // Assert
    expect(urls).toEqual([HOY_LEJOS, HOY_CERCA])
  })

  test('justo en 8192 px también carga la de cerca', () => {
    expect(texturasHoy({ maxTextura: 8192, liviano: false })).toEqual([HOY_LEJOS, HOY_CERCA])
  })

  test('si la GPU no admite 8192 px, solo la de lejos', () => {
    expect(texturasHoy({ maxTextura: 4096, liviano: false })).toEqual([HOY_LEJOS])
  })

  test('en modo liviano, solo la de lejos aunque la GPU admita 8192 px', () => {
    expect(texturasHoy({ maxTextura: 16384, liviano: true })).toEqual([HOY_LEJOS])
  })

  test('son las texturas del plano, de 2048 y 8192 px', () => {
    expect(HOY_LEJOS).toBe('plano/hoy-lejos.webp')
    expect(HOY_CERCA).toBe('plano/hoy-cerca.webp')
  })
})

describe('el shader de "lo de hoy"', () => {
  test('declara las dos texturas, la animación y la función que estampa', () => {
    expect(GLSL_HOY).toMatch(/uniform sampler2D tHoyLejos, tHoyCerca;/)
    expect(GLSL_HOY).toContain('uniform float uHoy')
    expect(GLSL_HOY).toMatch(/vec3 hoyEn\(vec2 hoja, vec3 c\)/)
  })

  test('elige entre lejos y cerca según cuántos texeles caen en un píxel (derivadas)', () => {
    expect(GLSL_HOY).toContain('fwidth(hoja)')
  })

  test('muestrea con la misma orientación que el plano (y hacia abajo en la hoja)', () => {
    expect(GLSL_HOY).toContain('vec2(hoja.x, 1.0 - hoja.y)')
  })
})
