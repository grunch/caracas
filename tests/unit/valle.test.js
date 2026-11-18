import { describe, test, expect } from 'vitest'
import { crearMaterialCiudad } from '../../src/material.js'
import { desdeCuando, umbralDesde } from '../../src/epocas.js'
import { GLSL_VALLE, BORDE_CIUDAD_M } from '../../src/shader/valle.js'
import { GLSL_SUELO, TINTA_DEL_CAMPO_1936, JARDINES_DESDE } from '../../src/shader/suelo.js'
import { GLSL_RELIEVE } from '../../src/relieve.js'

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

describe('umbralDesde: el espejo del shader para "ya es ciudad en la época e"', () => {
  const E = 6
  const codificada = (k) => (E - k) / E // "desde cuándo" (specs/02)

  test('una celda urbanizada desde la etapa k pasa el umbral de la época e si y solo si k ≤ e', () => {
    for (let k = 0; k < E; k++) {
      for (let e = 0; e < E; e++) {
        expect(codificada(k) >= umbralDesde(e, E)).toBe(desdeCuando(codificada(k), E) <= e)
      }
    }
  })

  test('lo que nunca se urbaniza (0) no pasa el umbral de ninguna época; con la de reserva (99) lo descarta el shader', () => {
    for (let e = 0; e < E; e++) expect(0 >= umbralDesde(e, E)).toBe(false)
    expect(GLSL_VALLE).toContain('step(0.002, g)')
  })

  test('durante la ola la época es fraccionaria: la celda cambia a mitad de camino', () => {
    expect(codificada(3) >= umbralDesde(2.4, E)).toBe(false)
    expect(codificada(3) >= umbralDesde(2.6, E)).toBe(true)
  })

  test('el shader usa la misma cuenta, con el canal G de crece.png', () => {
    expect(GLSL_VALLE).toContain('1.0 - (e + 0.5) / uEtapas')
    expect(GLSL_VALLE).toMatch(/creceEn\(hoja\)\.g/)
  })
})

describe('el valle antes de la ciudad, en el shader del suelo', () => {
  const { fragmentShader, vertexShader } = compilar()

  test('el suelo se mezcla entre el campo y la ciudad según lo urbanizado en la época que rige ahí', () => {
    expect(fragmentShader).toContain('float ciudad = ciudadEn(hoja, epoca)')
    expect(fragmentShader).toContain('float epoca = epocaAqui(length(vMundo.xz))')
    expect(fragmentShader).toContain('mix(campo, c, ciudad)')
  })

  test('en el campo no se ve el dibujo del plano; en 1936, tenue (es el plano de ese campo)', () => {
    expect(GLSL_SUELO).toContain(`float dibujo = mix(${TINTA_DEL_CAMPO_1936} * smoothstep(4.5, 5.0, epoca), 1.0, ciudad)`)
    expect(GLSL_SUELO).toMatch(/tintaDe\(papel\) \* dibujo/)
    expect(TINTA_DEL_CAMPO_1936).toBeGreaterThan(0)
    expect(TINTA_DEL_CAMPO_1936).toBeLessThan(1)
  })

  test('el borde de la ciudad promedia vecinos a unos metros: neto, sin serrucho de celdas', () => {
    expect(GLSL_VALLE).toContain(`${BORDE_CIUDAD_M.toFixed(1)} / (uHoja * uMetro)`)
    expect(BORDE_CIUDAD_M).toBeLessThanOrEqual(12)
  })

  test('el campo usa el monte de crece.png (B), el agua de uSuelo y el terreno del vértice', () => {
    expect(GLSL_VALLE).toMatch(/creceEn\(hoja\)\.b/)
    expect(GLSL_VALLE).toMatch(/mix\(c, AGUA_CLARA[^;]*, s\.r\)/)
    expect(GLSL_VALLE).toContain('vTerreno.x, cuesta = vTerreno.y')
    expect(fragmentShader).toContain('varying vec2 vTerreno;')
  })

  test('los sembradíos del plano de 1936 aparecen recién en 1936', () => {
    expect(GLSL_VALLE).toContain('s.g * (1.0 - s.a) * smoothstep(4.5, 5.0, e)')
  })

  test('en la ciudad, los jardines y canteros no son verdes antes de 1889 (la Plaza Mayor era de tierra)', () => {
    expect(JARDINES_DESDE).toBe(3)
    expect(GLSL_SUELO).toContain('s.g * smoothstep(3.0 - 0.5, 3.0, epoca)')
  })

  test('el vértice del suelo manda la altura y la pendiente del terreno, sin la ola ni la exageración', () => {
    expect(vertexShader).toContain('vTerreno = aInfo.w < 0.5 ? terrenoEn(position.xz) : vec2(0.0)')
    const terreno = GLSL_RELIEVE.slice(GLSL_RELIEVE.indexOf('vec2 terrenoEn'), GLSL_RELIEVE.indexOf('float apoyoCasa'))
    expect(terreno).toContain('relieveCrudo')
    expect(terreno).not.toMatch(/uExageracion|uOla|sueloEn/)
  })

  test('sin crece.png (textura de reserva: todo urbanizado desde siempre) no hay campo', () => {
    const { U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    const [, g] = U.uCrece.value.image.data
    expect(g / 255 >= umbralDesde(0, U.uEtapas.value)).toBe(true)
  })

  test('no agrega muestreadores: sigue dentro de los 16 de WebGL2', () => {
    expect(GLSL_VALLE).not.toMatch(/uniform\s+sampler2D/)
  })
})
