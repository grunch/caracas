import { describe, test, expect } from 'vitest'
import { crearMaterialCiudad } from '../../src/material.js'
import { GLSL_PAPEL, NORMALES, RELLENO_M, CELDA_MATA_M, CELDA_PASTO_M } from '../../src/shader/papel.js'
import { GLSL_RELIEVE } from '../../src/relieve.js'
import { SIN_LINEA_DE_TIEMPO } from '../../src/epocas.js'

/** Shaders mínimos con los #include que parchea el material. */
function compilar() {
  const { material, U } = crearMaterialCiudad({ plano: { ancho: 100, alto: 100, plaza: [50, 50] }, metro: 1, mapa: null })
  const s = {
    uniforms: {},
    vertexShader: '#include <common>\nvoid main() {\n#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>\n#include <worldpos_vertex>\n}',
    fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\n}',
  }
  material.onBeforeCompile(s)
  return { ...s, U }
}

/** El cuerpo de una función GLSL del módulo. */
function cuerpo(nombre) {
  const desde = GLSL_PAPEL.indexOf(` ${nombre}(`)
  expect(desde, `falta ${nombre}`).toBeGreaterThan(-1)
  return GLSL_PAPEL.slice(desde, GLSL_PAPEL.indexOf('\n  }', desde))
}

/** El espejo de smoothstep de GLSL. */
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

describe('el papel antes de la ciudad: la hoja en tinta de cada época', () => {
  const { fragmentShader, vertexShader, U } = compilar()

  test('en tinta, el suelo y las casas acostadas llevan la hoja de la época; lo que está en pie no la calcula', () => {
    expect(fragmentShader).toContain('if (acostada > 0.0 && uColor < 1.0) hojaTinta = papelDeEpoca(uvPlano, papel, epoca, urbano, enSuelo, ribera, wRibera, rotulo, pxMundo);')
    expect(fragmentShader).toContain('mix(mix(diffuseColor.rgb, TINTA, casa.a), hojaTinta, acostada)')
  })

  test('la época es la que rige en el punto: la hoja cambia con el frente de la ola, como las casas', () => {
    expect(fragmentShader).toContain('float epoca = epocaAqui(length(vMundo.xz));')
    expect(fragmentShader).toContain('float urbano = urbanoEn(uvPlano, epoca);')
  })

  test('en 1936 la hoja es el plano tal cual, y también sin línea de tiempo y donde hay un plano de época (?planos)', () => {
    const fn = cuerpo('papelDeEpoca')
    expect(fn).toContain('float talCual = max(smoothstep(4.5, 5.0, epoca), planoViejo);')
    expect(fn).toContain('if (talCual >= 1.0) return papel;')
    expect(fn).toContain('return mix(c3, papel, talCual);')
    expect(suave(4.5, 5, 5)).toBe(1) // 1936
    expect(suave(4.5, 5, SIN_LINEA_DE_TIEMPO)).toBe(1) // la época de reserva (sin crece.json)
    expect(U.uEpocaA.value).toBe(SIN_LINEA_DE_TIEMPO)
    for (const e of [1, 2, 3, 4]) expect(suave(4.5, 5, e)).toBe(0) // 1772 … 1911: la hoja de la época
  })

  test('dentro de la ciudad, antes de 1936, la hoja va sin rótulos; en el campo, papel en blanco', () => {
    const fn = cuerpo('papelDeEpoca')
    expect(fn).toContain('vec3 ciudad = lineas > 0.0 ? sinRotulos(hoja, papel, rotulo, s.a, px) : papel;') // fuera de la ciudad no se rellena nada
    expect(fn).toContain('if (tinte >= 1.0) return mix(ciudad, papel, talCual);') // y adentro no se graba el valle
    expect(fn).toContain('vec3 c3 = mix(blanco, ciudad, tinte);')
    expect(GLSL_PAPEL).toMatch(/const vec3 PAPEL_EN_BLANCO = vec3\(0\.9\d+, 0\.9\d+, 0\.[78]\d+\);/) // claro, apenas tibio
  })

  test('el borde no es la línea de la máscara: tiembla y se va en dos tiempos (primero el tinte, después las líneas)', () => {
    const fn = cuerpo('papelDeEpoca')
    expect(fn).toMatch(/if \(urbano > 0\.02 && urbano < 0\.98\) c \+= 0\.3 \* \(0\.6 \* ruidoValle\(m \/ 34\.0\) \+ 0\.4 \* ruidoValle\(m \/ 8\.0\) - 0\.5\);/)
    const [, t0, t1, l0, l1] = fn.match(/tinte = smoothstep\(([\d.]+), ([\d.]+), c\), lineas = smoothstep\(([\d.]+), ([\d.]+), c\)/).map(Number)
    expect(l0).toBeLessThan(t0)
    expect(l1).toBeLessThanOrEqual(t0)
    // con el temblor (±0,15), lo que es ciudad entera sigue entera y el campo abierto sigue en blanco
    expect(1 - 0.15).toBeGreaterThanOrEqual(t1)
    expect(0 + 0.15).toBeLessThanOrEqual(l0)
    expect(fn).toContain('(lineas - tinte) * trazo')
  })

  test('el rótulo se rellena con el papel de alrededor: lo que no es rótulo, del mismo lado del borde de la manzana', () => {
    const fn = cuerpo('sinRotulos')
    expect(fn).toContain('if (rotulo < 0.02) return papel;')
    expect(fn).toContain('textureLod(uRotulos, uvh, 0.0)')
    expect(fn).toContain('textureLod(uSuelo, uvh, 1.0).a - manzana')
    expect(fn).toContain(`k < ${RELLENO_M.length * 4}`)
    // dentro de una rama no hay derivadas: todas las lecturas van con su nivel explícito
    expect(fn).not.toMatch(/texture2D\(|texture\(/)
    expect(fn).toContain('return mix(papel, relleno, rotulo * tinta);')
    expect(RELLENO_M).toEqual([...RELLENO_M].sort((a, b) => a - b))
    expect(RELLENO_M.at(-1)).toBeLessThan(25) // cerca: el papel de la otra cuadra no sirve
  })

  test('el valle a pluma: laderas en normales, el agua con su orilla, matas donde crece.png dice monte y pajonal en el llano', () => {
    const fn = cuerpo('papelDeEpoca')
    for (const f of ['aguasEn(s.r, ribera, wRibera)', 'matasEn(m, galeria, px)', 'laderasEn(m, vTerreno.x, vPendiente, px)', 'pajonalEn(m, vTerreno.y, px)']) expect(fn).toContain(f)
    expect(fn).toContain('pluma * (1.0 - lineas)') // nada de eso entra en la ciudad
    expect(cuerpo('matasEn')).toMatch(/creceEn\([^;]*\)\.b/)
    expect(CELDA_MATA_M).toBeGreaterThan(10)
    expect(CELDA_PASTO_M).toBeGreaterThan(10)
  })

  test('las normales corren cuesta abajo, engrosan con la pendiente y de lejos se espacian al doble', () => {
    const laderas = cuerpo('laderasEn')
    expect(laderas).toContain('atan(pendiente.y, pendiente.x) / 0.3927') // de a 22,5°
    expect(laderas).toContain(`log2(max(px / ${NORMALES.px.toFixed(2)}, 1.0))`)
    expect(laderas).toContain(`${NORMALES.paso.toFixed(1)} * escala`)
    expect(laderas).toContain(`${(2 * NORMALES.paso).toFixed(1)} * escala`)
    const normales = cuerpo('normalesEn')
    expect(normales).toMatch(/grueso = clamp\([^;]*cuesta/)
    expect(normales).toContain('altura / banda')
    // a la escala base, de trazo a trazo hay unos diez píxeles: se lee como rayado, no como gris
    expect(NORMALES.paso / NORMALES.px).toBeGreaterThanOrEqual(8)
  })

  test('el vértice del suelo manda hacia dónde sube el terreno, sin la ola ni la exageración', () => {
    expect(vertexShader).toContain('vPendiente = aInfo.w < 0.5 ? pendienteEn(position.xz) : vec2(0.0);')
    expect(fragmentShader).toContain('varying vec2 vTerreno; varying vec2 vPendiente;')
    const fn = GLSL_RELIEVE.slice(GLSL_RELIEVE.indexOf('vec2 pendienteEn'), GLSL_RELIEVE.indexOf('vec2 terrenoEn'))
    expect(fn).toContain('relieveCrudo')
    expect(fn).not.toMatch(/uExageracion|uOla|sueloEn/)
  })

  test('no agrega muestreadores ni uniforms: usa los del color (uSuelo, uRotulos, uCrece) y el plano', () => {
    expect(GLSL_PAPEL).not.toMatch(/uniform\s/)
  })
})
