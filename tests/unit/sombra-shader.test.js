import { describe, test, expect } from 'vitest'
import { Vector3 } from 'three'
import { crearMaterialCiudad, crearMaterialSombraCiudad } from '../../src/material.js'
import { crearArboles } from '../../src/arboles.js'
import { crearHitos } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'
import { GLSL_SOMBRA, uniformsDeLuz, UNIFORMS_DE_LUZ } from '../../src/shader/sombra.js'
import { VERTICE_ACABADO, FRAGMENTO_ACABADO, CONTORNO } from '../../src/shader/acabado.js'
import { vectorSol } from '../../src/luz.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }

/** Shaders mínimos con los #include que parchea el material (los del MeshLambert de three.js). */
function compilar() {
  const { material, U } = crearMaterialCiudad({ plano: PLANO, metro: PLANO.metro, mapa: null })
  const s = {
    uniforms: {},
    vertexShader: '#include <common>\nvoid main() {\n#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>\n#include <worldpos_vertex>\n}',
    fragmentShader: '#include <common>\nvoid main() {\n#include <color_fragment>\nvec3 outgoingLight = vec3(0.0);\n#include <opaque_fragment>\n}',
  }
  material.onBeforeCompile(s)
  return { ...s, U }
}

/** Las funciones GLSL definidas en un shader, con su firma (para encontrar las repetidas). */
function repetidas(glsl) {
  const definidas = [...glsl.matchAll(/^\s*(?:float|vec[234]|bool|void|mat[234]|Medidas)\s+(\w+)\s*\(([^)]*)\)\s*\{/gm)]
    .map((m) => `${m[1]}(${m[2].split(',').map((a) => a.trim().split(/\s+/).slice(0, -1).join(' ')).join(',')})`)
  return definidas.filter((f, i) => definidas.indexOf(f) !== i)
}

/** Muestreadores de un fragment, de cualquier tipo (los arreglos cuentan su largo). */
function muestreadores(fragment) {
  return [...fragment.matchAll(/uniform\s+sampler\w+\s+([^;]+);/g)]
    .flatMap((m) => m[1].split(','))
    .reduce((n, decl) => n + Number(decl.match(/\[\s*(\d+)\s*\]/)?.[1] ?? 1), 0)
}

describe('los uniforms de la luz', () => {
  test('van en el U de la ciudad: el sol, el mapa de sombras y su matriz', () => {
    const { U } = compilar()
    for (const k of UNIFORMS_DE_LUZ) expect(U[k]).toBeTruthy()
    expect(Object.keys(uniformsDeLuz()).sort()).toEqual([...UNIFORMS_DE_LUZ].sort())
  })

  test('el sol es el de src/luz.js y las sombras arrancan apagadas (hasta que el acabado dibuje su mapa)', () => {
    const { U } = compilar()
    expect(U.uSol.value.toArray()).toEqual(vectorSol())
    expect(U.uSombra.value.x).toBe(0)
    expect(U.tSombra.value).toBeNull()
  })
})

describe('la sombra arrojada en el shader', () => {
  test('el mapa se lee con comparación (sampler2DShadow) y no pasa nada si está apagado', () => {
    expect(GLSL_SOMBRA).toContain('uniform sampler2DShadow tSombra;')
    expect(GLSL_SOMBRA).toMatch(/if \(uSombra\.x < 0\.5\) return 1\.0;/)
  })

  test('una cara que le da la espalda al sol está a la sombra sin mirar el mapa', () => {
    const cuerpo = GLSL_SOMBRA.slice(GLSL_SOMBRA.indexOf('float solEn'))
    expect(cuerpo.indexOf('if (nl <= 0.0) return 0.0;')).toBeGreaterThan(-1)
    expect(cuerpo.indexOf('if (nl <= 0.0) return 0.0;')).toBeLessThan(cuerpo.indexOf('texture(tSombra'))
  })

  test('el punto se corre hacia afuera de su cara, en texeles del mapa: una cara no se hace sombra a sí misma', () => {
    expect(GLSL_SOMBRA).toMatch(/mundo \+ N \* uSombra\.z \*/)
  })

  test('fuera del mapa, o más allá del alcance, hay sol', () => {
    expect(GLSL_SOMBRA).toMatch(/q\.x <= 0\.0 \|\| q\.y <= 0\.0 \|\| q\.x >= 1\.0 \|\| q\.y >= 1\.0 \|\| q\.z >= 1\.0\) return 1\.0;/)
    expect(GLSL_SOMBRA).toMatch(/smoothstep\(0\.75 \* uVista\.x, uVista\.x, distance\(cameraPosition, mundo\)\)/)
  })

  test('en tinta la sombra es un rayado en la pantalla, a la escala de los píxeles de CSS, y de lejos su tono medio', () => {
    const cuerpo = GLSL_SOMBRA.slice(GLSL_SOMBRA.indexOf('float rayadoSombra'))
    expect(cuerpo).toMatch(/gl_FragCoord\.x - gl_FragCoord\.y\) \/ \(6\.0 \* px\)/)
    expect(cuerpo).toMatch(/return mix\(linea, carga, smoothstep\([\d.]+, [\d.]+, metrosPorPixel\)\);/)
  })
})

describe('la ciudad recibe la sombra', () => {
  test('el fragment la aplica sobre la luz ya calculada: en color quita el sol directo; en tinta raya', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('float sol = solEn(vMundo, nMundo);')
    expect(fragmentShader).toContain('reflectedLight.directDiffuse * sol')
    expect(fragmentShader).toContain('outgoingLight = mix(conRaya, conSol, uColor);')
    // después de sumar las luces y antes de escribir el color
    expect(fragmentShader.indexOf('vec3 outgoingLight')).toBeLessThan(fragmentShader.indexOf('float sol = solEn'))
    expect(fragmentShader.indexOf('float sol = solEn')).toBeLessThan(fragmentShader.indexOf('#include <opaque_fragment>'))
  })

  test('la sombra propia (la cara de espaldas al sol) se raya más liviana que la arrojada', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('float propia = step(dot(nMundo, uSol), 0.0);')
    expect(fragmentShader).toMatch(/rayadoSombra\(\(1\.0 - sol\) \* mix\(1\.0, 0\.\d+, propia\), vMundo\)/)
  })

  test('la normal del mundo llega del vértice: la del terreno en el suelo, la de la cara en las casas', () => {
    const { vertexShader, fragmentShader } = compilar()
    expect(vertexShader).toContain('varying vec3 vNormalMundo;')
    expect(fragmentShader).toContain('varying vec3 vNormalMundo;')
    const suelo = vertexShader.indexOf('if (aInfo.w < 0.5) objectNormal = normalSuelo(position.xz);')
    expect(suelo).toBeGreaterThan(-1)
    expect(vertexShader.indexOf('vNormalMundo = objectNormal;')).toBeGreaterThan(suelo)
  })

  test('ninguna función GLSL queda definida dos veces, con la sombra incluida', () => {
    expect(repetidas(compilar().fragmentShader)).toEqual([])
  })

  test('con el mapa de sombras no pasa de los 16 muestreadores de fragment que garantiza WebGL2', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('sampler2DShadow')
    expect(muestreadores(fragmentShader)).toBeLessThanOrEqual(16)
  })
})

describe('la ciudad vista desde el sol', () => {
  const { U } = compilar()
  const m = crearMaterialSombraCiudad(U)

  test('comparte los uniforms de la ciudad y usa el mismo vértice: la ola, las épocas, el pretil y el relieve', () => {
    expect(m.uniforms).toBe(U)
    expect(m.vertexShader).toContain('float sube = smoothstep(0.0, 1.0, (uOla - aInfo.x - azar(aInfo.y) * 60.0) / uAnchoOla);')
    expect(m.vertexShader).toContain('vExiste = vivoEn(aVida, epocaAqui(aInfo.x));')
    expect(m.vertexShader).toContain('transformed.y += aTecho.x * pretil;')
    expect(m.vertexShader).toContain('apoyoCasa(aAncla, transformed.xz, position.y < 0.01)')
  })

  test('lo que no se levantó, lo que no existe en la época y el suelo no tiran sombra: se van de la vista', () => {
    expect(m.vertexShader).toMatch(/bool tira = aInfo\.w > 0\.5 && vAlzada \* vExiste > 0\.02/)
    expect(m.vertexShader).toMatch(/gl_Position = tira \? projectionMatrix \* viewMatrix \* vec4\(transformed, 1\.0\) : vec4\(2\.0, 2\.0, 2\.0, 1\.0\);/)
  })

  test('el alero que la fachada de pretil no lleva tampoco', () => {
    expect(m.vertexShader).toMatch(/!\(volado > 0\.5 && conPretil\(vInfo\.z\) > 0\.5\)/)
  })

  test('no define ninguna función dos veces', () => {
    expect(repetidas(m.vertexShader)).toEqual([])
  })
})

describe('los árboles y los hitos con sombra', () => {
  const coords = crearCoords(PLANO)
  const { U } = compilar()
  const datos = {
    n: 2, x: new Uint16Array([9000, 9100]), y: new Uint16Array([6800, 6900]), radio: new Float32Array([3, 4]),
    nace: new Uint16Array([0, 2]), muere: new Uint16Array([0, 0]), silvestre: new Uint8Array([0, 1]),
  }
  const arboles = crearArboles({ datos, coords, U })
  const hitos = crearHitos({ coords, U })

  test.each([['árboles', arboles], ['hitos', hitos]])('los %s leen el sol y el mapa de sombras de la ciudad', (_, malla) => {
    for (const k of UNIFORMS_DE_LUZ) expect(malla.material.uniforms[k]).toBe(U[k])
    expect(malla.material.fragmentShader).toContain('float solEn(vec3 mundo, vec3 N)')
    expect(malla.material.fragmentShader).toMatch(/solEn\(vMundo, /)
    expect(repetidas(malla.material.fragmentShader)).toEqual([])
    expect(malla.material.fragmentShader.match(/uniform vec3[^;]*\buSol\b/g)).toHaveLength(1) // declarado una sola vez
  })

  test.each([['árboles', arboles], ['hitos', hitos]])('los %s tiran sombra: el mismo vértice, sin color, con los mismos uniforms', (_, malla) => {
    expect(malla.castShadow).toBe(true)
    expect(malla.customDepthMaterial.vertexShader).toBe(malla.material.vertexShader)
    expect(malla.customDepthMaterial.uniforms).toBe(malla.material.uniforms)
    expect(malla.customDepthMaterial.fragmentShader).not.toContain('solEn')
  })

  test('las rejas de los hitos no tiran sombra (sus barrotes se dibujan en el fragment)', () => {
    expect(hitos.customDepthMaterial.fragmentShader).toMatch(/abs\(vMat - \d+\.0\) < 0\.5\) discard;/)
  })

  test('en los hitos, en tinta, la sombra arrojada se raya como en la ciudad', () => {
    expect(hitos.material.fragmentShader).toContain('float arrojada = rayadoSombra(')
  })

  test('sin los uniforms de la luz (un U a medias) quedan el sol de siempre y ninguna sombra', () => {
    const sinLuz = Object.fromEntries(Object.entries(U).filter(([k]) => !UNIFORMS_DE_LUZ.includes(k)))
    const m = crearArboles({ datos, coords, U: sinLuz })
    expect(m.material.uniforms.uSol.value).toBeInstanceOf(Vector3)
    expect(m.material.uniforms.uSol.value.toArray()).toEqual(vectorSol())
    expect(m.material.uniforms.tSombra).toBeUndefined()
  })
})

describe('el acabado: contorno, bruma y grano', () => {
  test('el contorno sale de la segunda diferencia de la profundidad cruda, en cuatro direcciones', () => {
    expect(FRAGMENTO_ACABADO.match(/cruda\(vUv [+-] /g)).toHaveLength(8)
    expect(FRAGMENTO_ACABADO).toMatch(/\) - 2\.0 \* d;/)
  })

  test('se normaliza por lo que mide un píxel a esa distancia (el espejo de saltoDeProfundidad)', () => {
    expect(FRAGMENTO_ACABADO).toContain('vec4 salto = s * z * (uCamara.y - uCamara.x) / (uCamara.y * uCamara.x * uCamara.z * paso);')
  })

  test('en pantallas densas los vecinos se leen a un píxel de CSS: la línea no se afina a medio píxel', () => {
    expect(FRAGMENTO_ACABADO).toContain('float paso = max(1.0, floor(uCamara.w + 0.5));')
    expect(FRAGMENTO_ACABADO).toContain('vec2 t = uTexel * paso;')
  })

  test('la silueta va del lado de adelante; del de atrás solo las aristas entrantes, no el eco del escalón', () => {
    expect(FRAGMENTO_ACABADO).toContain('float silueta = smoothstep(desde, hasta, adelante);')
    expect(FRAGMENTO_ACABADO).toMatch(/float entrante = smoothstep\(desde, hasta, atras\) \* \(1\.0 - smoothstep\(3\.5, 7\.0, atras\)\);/)
    expect(CONTORNO.ecoDesde).toBeGreaterThan(CONTORNO.hasta)
  })

  test('lejos se afloja: el umbral sube y la línea se aclara', () => {
    expect(FRAGMENTO_ACABADO).toMatch(/float lejos = smoothstep\([\d.]+, [\d.]+, z\);/)
    expect(FRAGMENTO_ACABADO).toMatch(/return max\(silueta, entrante\) \* \(1\.0 - 0\.\d+ \* lejos\);/)
  })

  test('fuerte en tinta y tenue en color', () => {
    expect(CONTORNO.tinta).toBeGreaterThan(2 * CONTORNO.enColor)
    expect(FRAGMENTO_ACABADO).toContain(`mix(${CONTORNO.tinta.toFixed(2)}, ${CONTORNO.enColor.toFixed(2)}, uColor)`)
  })

  test('la bruma es solo del color y solo sobre lo dibujado', () => {
    expect(FRAGMENTO_ACABADO).toMatch(/mix\(c, BRUMA, uColor \* hayAlgo \* /)
  })

  test('no desenfoca: el color se lee una sola vez, en su píxel', () => {
    expect(FRAGMENTO_ACABADO.match(/texture2D\(tColor/g)).toHaveLength(1)
    expect(FRAGMENTO_ACABADO).toContain('texture2D(tColor, vUv)')
  })

  test('el grano va al final, fijo en la pantalla, y cada cosa se puede apagar', () => {
    expect(FRAGMENTO_ACABADO.indexOf('uAjustes.y > 0.5')).toBeGreaterThan(FRAGMENTO_ACABADO.indexOf('BRUMA,'))
    expect(FRAGMENTO_ACABADO).toContain('if (uAjustes.x > 0.5)')
    expect(FRAGMENTO_ACABADO).toContain('gl_FragCoord.xy / max(uCamara.w, 1.0)')
  })

  test('el vértice es un triángulo que cubre la pantalla, sin cámara', () => {
    expect(VERTICE_ACABADO).toContain('gl_Position = vec4(position.xy, 0.0, 1.0);')
    expect(repetidas(FRAGMENTO_ACABADO)).toEqual([])
  })
})
