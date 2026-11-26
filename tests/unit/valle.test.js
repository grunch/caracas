import { describe, test, expect } from 'vitest'
import { crearMaterialCiudad } from '../../src/material.js'
import { desdeCuando, umbralDesde } from '../../src/epocas.js'
import { GLSL_VALLE, BORDE_CIUDAD_M, PALETA_VALLE } from '../../src/shader/valle.js'
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
    expect(fragmentShader).toContain('float urbano = urbanoEn(uvPlano, epoca);')
    expect(fragmentShader).toContain('float ciudad = ciudadDe(urbano);')
    expect(GLSL_VALLE).toContain('float ciudadDe(float urbano) { return smoothstep(0.25, 0.75, urbano); }')
    expect(fragmentShader).toContain('float epoca = epocaAqui(length(vMundo.xz))')
    expect(fragmentShader).toContain('mix(campo, c, ciudad)')
  })

  test('en el campo no se ve el dibujo del plano; en 1936, tenue (es el plano de ese campo)', () => {
    expect(GLSL_SUELO).toContain(`float dibujo = mix(${TINTA_DEL_CAMPO_1936} * smoothstep(4.5, 5.0, epoca), 1.0 - antes, ciudad)`)
    expect(GLSL_SUELO).toMatch(/tintaDe\(papel\) \* dibujo/)
    expect(TINTA_DEL_CAMPO_1936).toBeGreaterThan(0)
    expect(TINTA_DEL_CAMPO_1936).toBeLessThan(1)
  })

  test('antes de 1936, en la ciudad no va nada de 1936: tierra de la calle, el agua y las calles de la época (I1772-008)', () => {
    // salvo donde está el plano de la época (?planos): ahí sigue como antes
    expect(GLSL_SUELO).toContain('float antes = (1.0 - smoothstep(4.5, 5.0, epoca)) * (1.0 - planoViejo);')
    expect(GLSL_SUELO).toContain('vec3 liso = mix(mix(TIERRA_DE_CALLE, CALZADA, calle.x), CALZADA * 0.8, 0.6 * calle.y);')
    expect(GLSL_SUELO).toContain('c = mix(c, mix(liso, BARRO, s.r), antes);')
    // ni el dibujo del plano: con antes = 1, dibujo = 0 en la ciudad
    expect(GLSL_SUELO).toMatch(/vec3 sueloColor\([^)]*vec2 calle, float verde\)/)
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

/** Matiz (grados) y saturación (0–1, HSV) de un color sRGB 0–255. */
function matizYSaturacion([r, g, b]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (d === 0) return { matiz: 0, saturacion: 0 }
  const matiz = max === r ? 60 * (((g - b) / d) % 6) : max === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4)
  return { matiz: (matiz + 360) % 360, saturacion: d / max }
}

describe('la paleta del campo: el verde del Ávila y del valle (fotos de Commons, fuentes/imagenes/20*-commons-*avila*)', () => {
  const VERDES = ['SABANA', 'SABANA_VERDE', 'LOMA', 'AVILA', 'AVILA_ALTO', 'MONTE', 'RIBERA']

  test('el llano, las lomas, el Ávila y el monte son verdes: ni pajizo, ni ocre, ni malva', () => {
    for (const nombre of VERDES) {
      const { matiz, saturacion } = matizYSaturacion(PALETA_VALLE[nombre])
      expect(matiz, nombre).toBeGreaterThanOrEqual(65) // las fotos de lluvias: 70–85°; el pajizo de 1839 andaba en 45°
      expect(matiz, nombre).toBeLessThanOrEqual(110)
      expect(saturacion, nombre).toBeGreaterThanOrEqual(0.3)
    }
  })

  test('arriba el cerro es más oscuro que abajo (la selva nublada sobre el pajonal), y el monte, lo más oscuro', () => {
    const luz = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b
    expect(luz(PALETA_VALLE.AVILA_ALTO)).toBeLessThan(luz(PALETA_VALLE.AVILA))
    expect(luz(PALETA_VALLE.AVILA)).toBeLessThan(luz(PALETA_VALLE.SABANA))
    for (const nombre of VERDES) expect(luz(PALETA_VALLE.MONTE)).toBeLessThanOrEqual(luz(PALETA_VALLE[nombre]))
  })

  test('el shader usa la paleta, pasada a lineal', () => {
    const [r, g, b] = PALETA_VALLE.AVILA.map((v) => ((v / 255) ** 2.2).toFixed(3))
    expect(GLSL_VALLE).toContain(`AVILA = vec3(${r}, ${g}, ${b})`)
    expect(Object.isFrozen(PALETA_VALLE)).toBe(true)
  })
})
