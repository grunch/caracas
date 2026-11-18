import { describe, test, expect } from 'vitest'
import { crearMaterialCiudad } from '../../src/material.js'

/** Shaders mínimos con los #include que parchea el material. */
function compilar() {
  const { material } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
  const s = {
    uniforms: {},
    vertexShader: '#include <common>\nvoid main() {\n#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>\n#include <worldpos_vertex>\n}',
    fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\n}',
  }
  material.onBeforeCompile(s)
  return s
}

describe('material de la ciudad', () => {
  test('el zócalo se mide desde la base de la casa, no desde la altura absoluta', () => {
    const { vertexShader, fragmentShader } = compilar()
    expect(vertexShader).toMatch(/vBase\s*=\s*aInfo\.w < 0\.5 \? sueloEn\(position\.xz\) : sueloEn\(aAncla\)/)
    expect(fragmentShader).toContain('paredColor(vInfo.y, vMundo.y - vBase)')
    expect(fragmentShader).toContain('step(0.8, sobreLaBase)')
    expect(fragmentShader).not.toContain('step(0.8, vMundo.y)')
  })
})

import { SIN_LINEA_DE_TIEMPO } from '../../src/epocas.js'

describe('material sin línea de tiempo', () => {
  test('hasta que la línea de tiempo arranca, las épocas valen la de reserva (se ve la ciudad entera)', () => {
    const { U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    expect(U.uEpocaDe.value).toBe(SIN_LINEA_DE_TIEMPO)
    expect(U.uEpocaA.value).toBe(SIN_LINEA_DE_TIEMPO)
  })
})

describe('material con "lo de hoy"', () => {
  test('el fragment incluye el shader de hoy y lo aplica solo al suelo, después de tinta y color', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('uniform sampler2D tHoyLejos, tHoyCerca;')
    const composicion = fragmentShader.indexOf('diffuseColor.rgb = mix(enTinta, enColor, uColor);')
    const estampa = fragmentShader.indexOf('diffuseColor.rgb = mix(diffuseColor.rgb, hoyEn(uvPlano, diffuseColor.rgb), esSuelo);')
    expect(composicion).toBeGreaterThan(-1)
    expect(estampa).toBeGreaterThan(composicion)
  })

  test('arranca apagado, con texturas de respaldo y sin la de cerca', () => {
    const { U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    expect(U.uHoy.value).toBe(0)
    expect(U.uHoyCercaOn.value).toBe(0)
    expect(U.tHoyLejos.value).toBeTruthy()
    expect(U.tHoyCerca.value).toBeTruthy()
  })
})
