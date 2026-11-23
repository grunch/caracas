import { describe, test, expect } from 'vitest'
import { rectDeCalles, epocaDeCalles, SIN_EPOCA_DE_CALLES, ponerCallesDeEpoca } from '../../src/calles-epoca.js'
import { GLSL_CALLES, DIST_MAX_M, NUCLEO_M } from '../../src/shader/calles.js'
import { crearMaterialCiudad } from '../../src/material.js'

const PLANO = { ancho: 18600, alto: 14800 }
const META = { año: 1772, imagen: 'plano/calles-1772.png', caja: [5902, 4773, 11679, 10399], ancho: 1445, alto: 1407, m_por_px: 2, dist_max_m: 10, nucleo_m: 4 }
const EPOCAS = [1578, 1772, 1843, 1889, 1911, 1936].map((año) => ({ año }))

describe('las calles de una época: dónde van y cuándo rigen', () => {
  test('el rectángulo de la textura en la hoja, normalizado como los planos de época', () => {
    expect(rectDeCalles(META, PLANO)).toEqual([5902 / 18600, 4773 / 14800, 11679 / 18600, 10399 / 14800])
  })

  test('una caja que no sirve (vacía, al revés o sin números) es un error claro', () => {
    expect(() => rectDeCalles({ ...META, caja: [10, 10, 10, 20] }, PLANO)).toThrow(/caja/)
    expect(() => rectDeCalles({ ...META, caja: [10, 10, 5, 20] }, PLANO)).toThrow(/caja/)
    expect(() => rectDeCalles({ ...META, caja: [0, 0, 'x', 1] }, PLANO)).toThrow(/caja/)
    expect(() => rectDeCalles({ ...META, caja: undefined }, PLANO)).toThrow(/caja/)
  })

  test('la época de las calles es el índice de su año en la línea de tiempo; sin ese año, ninguna', () => {
    expect(epocaDeCalles(1772, EPOCAS)).toBe(1)
    expect(epocaDeCalles(1700, EPOCAS)).toBe(SIN_EPOCA_DE_CALLES)
    expect(epocaDeCalles(1772, [])).toBe(SIN_EPOCA_DE_CALLES)
  })

  test('las medidas del dibujo tienen que ser las que el shader sabe dibujar', () => {
    const { U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    const textura = { isTexture: true }
    expect(() => ponerCallesDeEpoca(U, { ...META, dist_max_m: 20 }, textura, { plano: PLANO, epocas: EPOCAS })).toThrow(/dist_max_m/)
    expect(() => ponerCallesDeEpoca(U, { ...META, nucleo_m: 6 }, textura, { plano: PLANO, epocas: EPOCAS })).toThrow(/nucleo_m/)
    expect(U.uCalles.value).not.toBe(textura) // no quedó a medias
  })

  test('puestas, el material tiene la textura, su rectángulo y su época', () => {
    const { U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    const textura = { isTexture: true }
    ponerCallesDeEpoca(U, META, textura, { plano: PLANO, epocas: EPOCAS })
    expect(U.uCalles.value).toBe(textura)
    expect(U.uCallesRect.value.toArray()).toEqual(rectDeCalles(META, PLANO))
    expect(U.uCallesEpoca.value).toBe(1)
  })
})

describe('el material arranca sin calles de época', () => {
  test('textura de 1×1 lejos de toda calle (255), rectángulo de la hoja entera y ninguna época', () => {
    const { U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    expect([U.uCalles.value.image.width, U.uCalles.value.image.height]).toEqual([1, 1])
    expect(U.uCalles.value.image.data[0]).toBe(255)
    expect(U.uCallesRect.value.toArray()).toEqual([0, 0, 1, 1])
    expect(U.uCallesEpoca.value).toBe(SIN_EPOCA_DE_CALLES)
  })
})

describe('GLSL_CALLES', () => {
  test('la calle rige solo en su época: lejos de ella (y sin época, SIN_EPOCA_DE_CALLES) no se dibuja nada', () => {
    expect(GLSL_CALLES).toContain('1.0 - smoothstep(0.25, 0.5, abs(epoca - uCallesEpoca))')
    expect(Math.abs(1 - SIN_EPOCA_DE_CALLES)).toBeGreaterThan(0.5)
  })

  test('fuera de su rectángulo no hay calle, y la distancia se lee con la fila 0 al norte', () => {
    expect(GLSL_CALLES).toContain('step(0.0, local.x) * step(local.x, 1.0) * step(0.0, local.y) * step(local.y, 1.0)')
    expect(GLSL_CALLES).toContain('texture2D(uCalles, vec2(local.x, 1.0 - local.y)).r')
  })

  test('de lejos, un texel sin calle (distancia saturada en DIST_MAX_M) no pinta calzada', () => {
    // la misma cuenta que el shader: el filo crece con px, pero no pasa de DIST_MAX_M - NUCLEO_M/2
    const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
    const m = GLSL_CALLES.match(/float filo = min\(max\(px, 0\.25\), ([\d.]+)\);/)
    expect(m).not.toBe(null)
    const media = NUCLEO_M / 2
    const calzada = (d, px) => { const filo = Math.min(Math.max(px, 0.25), Number(m[1])); return 1 - smooth(media - filo, media + filo, d) }
    for (const px of [1, 8, 20, 200]) expect(calzada(DIST_MAX_M, px)).toBe(0)
    expect(calzada(0, 20)).toBeGreaterThan(0.5) // sobre el eje sigue habiendo calzada
  })
})
