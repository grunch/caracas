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
