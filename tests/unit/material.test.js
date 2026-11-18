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
    expect(fragmentShader).toContain('paredColor(vInfo.y, vInfo.z, vMundo.y - vBase)')
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

describe('estilos en el shader', () => {
  test('techo y pared se eligen por el estilo de la casa (aInfo.z)', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('techoColor(vInfo.y, vInfo.z)')
    for (const estilo of ['ESTILO_MODERNO', 'ESTILO_RANCHO', 'ESTILO_PUBLICO', 'ESTILO_ORILLAS']) expect(fragmentShader).toContain(estilo)
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

describe('material con el plano de cada época', () => {
  /** Muestreadores del fragment: cada nombre de `uniform sampler2D a, b[4];` (los arreglos cuentan su largo). */
  function muestreadores(fragment) {
    return [...fragment.matchAll(/uniform\s+sampler2D\s+([^;]+);/g)]
      .flatMap((m) => m[1].split(','))
      .reduce((n, decl) => n + Number(decl.match(/\[\s*(\d+)\s*\]/)?.[1] ?? 1), 0)
  }

  test('el fragment recibe el plano de la época "de" y el de la "a", con su rectángulo en la hoja', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('uniform sampler2D uPlanoDe, uPlanoA;')
    expect(fragmentShader).toContain('uniform vec4 uPlanoDeRect, uPlanoARect;')
  })

  test('la hoja pasa de un plano al otro con el frente de la ola, como las casas', () => {
    const { fragmentShader } = compilar()
    // la misma función que usa epocaAqui, a la distancia de la plaza de ese punto de la hoja
    expect(fragmentShader).toMatch(/float frenteEpoca\(float dist\)/)
    expect(fragmentShader).toMatch(/epocaAqui\(float dist\) \{ return mix\(uEpocaDe, uEpocaA, frenteEpoca\(dist\)\)/)
    expect(fragmentShader).toContain('vec3 de = planoDeEpoca(uPlanoDe, uPlanoDeRect, hoja, c, tapaDe);')
    expect(fragmentShader).toContain('vec3 a = planoDeEpoca(uPlanoA, uPlanoARect, hoja, c, tapaA);')
    expect(fragmentShader).toContain('return mix(de, a, frente);')
    // fuera del plano viejo (alfa 0) queda el de 1936
    expect(fragmentShader).toContain('mix(base, p.rgb, p.a * adentro)')
  })

  test('arranca sin planos de época: ranuras transparentes (se ve 1936)', () => {
    const { U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    for (const r of ['uPlanoDe', 'uPlanoA']) {
      expect(U[r].value.image.data[3]).toBe(0)
      expect(U[`${r}Rect`].value.toArray()).toEqual([0, 0, 1, 1])
    }
  })

  test('no pasa de los 16 muestreadores de fragment que garantiza WebGL2', () => {
    expect(muestreadores(compilar().fragmentShader)).toBeLessThanOrEqual(16)
    expect(muestreadores('uniform sampler2D a, b[4]; uniform sampler2D c;')).toBe(6)
  })
})

describe('color sin rótulos', () => {
  test('en color, donde la máscara marca un rótulo, la tinta del plano no oscurece el suelo', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('uniform sampler2D uSuelo, uRotulos;')
    expect(fragmentShader).toContain('float rotulo = min(1.0, 2.0 * texture2D(uRotulos, uv).r) * (1.0 - planoViejo);')
    expect(fragmentShader).toContain('return c * (1.0 - 0.4 * tintaDe(papel) * (1.0 - rotulo));')
  })

  test('la máscara es del plano de 1936: donde la hoja muestra el de otra época, no se aplica', () => {
    const { fragmentShader } = compilar()
    // planoEn deja anotado cuánto tapa el plano de la época (su alfa, con el frente de la ola)
    expect(fragmentShader).toMatch(/float planoViejo = 0\.0;/)
    expect(fragmentShader).toContain('planoViejo = mix(tapaDe, tapaA, frente);')
    expect(fragmentShader).toContain('tapa = p.a * adentro;')
    // y el suelo se pinta después de leer el plano
    expect(fragmentShader.indexOf('vec3 papel = planoEn(uvPlano);')).toBeLessThan(fragmentShader.indexOf('sueloColor(uv, papel)'))
  })

  test('la tinta no cambia: el techo y el suelo siguen siendo el plano entero', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('vec3 enTinta = mix(diffuseColor.rgb, papel, vTecho);')
    expect(fragmentShader.match(/uRotulos/g)).toHaveLength(2) // la declaración y sueloColor: nada más la usa
  })

  test('arranca sin rótulos (1×1 en cero): hasta que llega la máscara, el plano se marca entero', () => {
    const { U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
    expect([U.uRotulos.value.image.width, U.uRotulos.value.image.height]).toEqual([1, 1])
    expect(U.uRotulos.value.image.data[0]).toBe(0)
  })
})
