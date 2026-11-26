import { describe, test, expect, vi, afterEach } from 'vitest'
import { ponerSueloManzanas, cargarSueloManzanas } from '../../src/suelo-manzanas.js'
import { GLSL_SUELO_MANZANAS, DIST_MAX_M, BANDA_CALLE_M, EPOCAS_CANALES, SATURACION_VERDE_CIUDAD } from '../../src/shader/suelo-manzanas.js'
import { PALETA_VALLE } from '../../src/shader/valle.js'
import * as lib from '../../tools/suelo-manzanas-lib.mjs'
import { GLSL_SUELO } from '../../src/shader/suelo.js'
import { crearMaterialCiudad } from '../../src/material.js'
import { GLSL_TECHO } from '../../src/shader/techo.js'

const PLANO = { ancho: 18600, alto: 14800 }
const META = { imagen: 'plano/suelo-manzanas.png', caja: [5000, 4000, 13000, 11000], ancho: 2000, alto: 1750, m_por_px: 2, dist_max_m: DIST_MAX_M, banda_calle_m: BANDA_CALLE_M }
const material = () => crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null }).U

afterEach(() => vi.unstubAllGlobals())

describe('el campo del pipeline y el shader hablan de lo mismo', () => {
  test('las medidas y las épocas de los canales son las del generador', () => {
    expect(DIST_MAX_M).toBe(lib.DIST_MAX_M)
    expect(BANDA_CALLE_M).toBe(lib.BANDA_CALLE_M)
    expect(EPOCAS_CANALES).toEqual(lib.EPOCAS_SUELO.map((e) => e.epoca))
  })
})

describe('GLSL_SUELO_MANZANAS', () => {
  test('cada canal rige solo en su época, con el frente de la ola', () => {
    expect(GLSL_SUELO_MANZANAS).toContain('1.0 - smoothstep(0.25, 0.5, abs(vec3(epoca) - vec3(1.0, 2.0, 3.0)))')
  })

  test('verde adentro de la manzana y más allá de la banda de calle; apagado sin datos', () => {
    expect(GLSL_SUELO_MANZANAS).toContain(`* ${(2 * DIST_MAX_M).toFixed(1)}`)
    expect(GLSL_SUELO_MANZANAS).toContain('smoothstep(-filo, filo, d)')
    expect(GLSL_SUELO_MANZANAS).toContain(`smoothstep(${BANDA_CALLE_M.toFixed(1)} - filo, ${BANDA_CALLE_M.toFixed(1)} + filo, -d)`)
    expect(GLSL_SUELO_MANZANAS).toContain('return uManzanasOn * dot(rige, mix(vec3(1.0), verde, adentro));')
  })

  test('el suelo pinta con el campo de alrededor solo antes de 1936 y fuera de la calzada', () => {
    expect(GLSL_SUELO).toContain('c = mix(c, verdeCiudad(campo), antes * verde * (1.0 - calle.x));')
  })
})

describe('el verde de la ciudad, más apagado que el campo', () => {
  test('conserva solo parte de la saturación del campo, y la misma en el suelo y en el piso de los patios', () => {
    expect(SATURACION_VERDE_CIUDAD).toBeGreaterThan(0)
    expect(SATURACION_VERDE_CIUDAD).toBeLessThan(1)
    expect(GLSL_SUELO_MANZANAS).toContain(`, c, ${SATURACION_VERDE_CIUDAD.toFixed(2)}); }`)
    // el piso del patio: SABANA apagada, no SABANA tal cual
    const sabana = `vec3(${PALETA_VALLE.SABANA.map((v) => ((v / 255) ** 2.2).toFixed(3)).join(', ')})`
    expect(GLSL_TECHO).not.toContain(`PATIO_VERDE = ${sabana}`)
    const m = GLSL_TECHO.match(/PATIO_VERDE = vec3\(([\d.]+), ([\d.]+), ([\d.]+)\)/).slice(1).map(Number)
    const [r, g] = PALETA_VALLE.SABANA.map((v) => (v / 255) ** 2.2)
    expect(m[1] - m[0]).toBeLessThan(g - r) // menos distancia entre verde y rojo: menos saturado
    expect(m[1] - m[0]).toBeGreaterThan(0) // pero sigue siendo verde
  })
})

describe('ponerSueloManzanas', () => {
  test('arranca apagado, con una textura de 1×1', () => {
    const U = material()
    expect(U.uManzanasOn.value).toBe(0)
    expect([U.uManzanasSuelo.value.image.width, U.uManzanasSuelo.value.image.height]).toEqual([1, 1])
  })

  test('puesto, el material tiene la textura, su rectángulo y queda prendido', () => {
    const U = material()
    const textura = { isTexture: true }
    ponerSueloManzanas(U, META, textura, { plano: PLANO })
    expect(U.uManzanasSuelo.value).toBe(textura)
    expect(U.uManzanasRect.value.toArray()).toEqual([5000 / 18600, 4000 / 14800, 13000 / 18600, 11000 / 14800])
    expect(U.uManzanasOn.value).toBe(1)
  })

  test('con medidas que el shader no sabe leer falla sin tocar nada', () => {
    const U = material()
    const textura = { isTexture: true }
    expect(() => ponerSueloManzanas(U, { ...META, dist_max_m: 10 }, textura, { plano: PLANO })).toThrow(/dist_max_m/)
    expect(() => ponerSueloManzanas(U, { ...META, banda_calle_m: 8 }, textura, { plano: PLANO })).toThrow(/banda_calle_m/)
    expect(() => ponerSueloManzanas(U, { ...META, caja: [1, 1, 0, 0] }, textura, { plano: PLANO })).toThrow(/caja/)
    expect(U.uManzanasSuelo.value).not.toBe(textura)
    expect(U.uManzanasOn.value).toBe(0)
  })
})

describe('cargarSueloManzanas', () => {
  const respuesta = (cuerpo, { ok = true, status = 200, tipo = 'application/json' } = {}) =>
    ({ ok, status, headers: { get: () => tipo }, json: async () => cuerpo })

  test('baja el índice, después la imagen, y la pone', async () => {
    const U = material()
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(META)))
    const textura = { isTexture: true }
    const cargar = vi.fn(async () => textura)
    await cargarSueloManzanas({ U, plano: PLANO, cargar })
    expect(fetch).toHaveBeenCalledWith('datos/suelo-manzanas.json')
    expect(cargar).toHaveBeenCalledWith('plano/suelo-manzanas.png')
    expect(U.uManzanasOn.value).toBe(1)
  })

  test('sin el índice (404 o el HTML de respaldo) rechaza sin bajar la imagen', async () => {
    const cargar = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(null, { ok: false, status: 404 })))
    await expect(cargarSueloManzanas({ U: material(), plano: PLANO, cargar })).rejects.toThrow(/404/)
    vi.stubGlobal('fetch', vi.fn(async () => respuesta(null, { tipo: 'text/html' })))
    await expect(cargarSueloManzanas({ U: material(), plano: PLANO, cargar })).rejects.toThrow(/no está/)
    vi.stubGlobal('fetch', vi.fn(async () => respuesta({ ...META, caja: null })))
    await expect(cargarSueloManzanas({ U: material(), plano: PLANO, cargar })).rejects.toThrow(/caja/)
    expect(cargar).not.toHaveBeenCalled()
  })
})

describe('los patios y solares de las casas', () => {
  /** El fragment de la ciudad ya parcheado (como tests/unit/material.test.js). */
  function fragmentDeCiudad() {
    const { material } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    const s = {
      uniforms: {},
      vertexShader: '#include <common>\nvoid main() {\n#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>\n#include <worldpos_vertex>\n}',
      fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\n}',
    }
    material.onBeforeCompile(s)
    return s.fragmentShader
  }

  test('son verdes de 1772 a 1889, con el campo cargado; de tierra en 1578, desde 1911 y sin datos', () => {
    expect(GLSL_TECHO).toContain('c = mix(c, mix(verde, PATIO_VERDE_OSCURO * 0.8, 0.6 * matas * cerca), gVerdor);')
    expect(GLSL_TECHO).toContain('mix(vec3(0.42, 0.38, 0.30), PATIO_VERDE, gVerdor)')
    const f = fragmentDeCiudad()
    expect(f).toContain('gVerdor = uManzanasOn * smoothstep(0.5, 1.0, epocaVerde)')
    expect(f).toContain('* (1.0 - smoothstep(3.5, 4.0, epocaVerde));')
  })

  test('el suelo de la ciudad lee el verde de la época y se lo pasa a sueloColor', () => {
    const f = fragmentDeCiudad()
    expect(f).toContain('float verde = max(verdeEn(uvPlano, epoca, pxMundo), verdeModernoEn(uvPlano, epoca, pxMundo));')
    expect(f).toContain('ciudad, calle, verde), esSuelo)')
  })
})
