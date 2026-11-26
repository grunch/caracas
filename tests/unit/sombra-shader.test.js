import { describe, test, expect } from 'vitest'
import { Vector3 } from 'three'
import { crearMaterialCiudad, crearMaterialSombraCiudad } from '../../src/material.js'
import { crearArboles } from '../../src/arboles.js'
import { crearHitos } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'
import { GLSL_SOMBRA, RAYADO, uniformsDeLuz, UNIFORMS_DE_LUZ } from '../../src/shader/sombra.js'
import { VERTICE_ACABADO, FRAGMENTO_ACABADO, CONTORNO, idDeTecho, GLSL_ID_DE_TECHO, fuerzaDeContorno } from '../../src/shader/acabado.js'
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
    expect(cuerpo).toContain(`float paso = mix(${RAYADO.paso.toFixed(1)}, ${RAYADO.pasoEnPiso.toFixed(1)}, piso) * px;`)
    expect(cuerpo).toContain('(gl_FragCoord.x - gl_FragCoord.y) / paso')
    expect(cuerpo).toMatch(/return mix\(linea, carga, smoothstep\([\d.]+, [\d.]+, metrosPorPixel\)\) \* mix\(/)
  })

  test('en el piso la sombra es la del grabado: rayas gruesas y casi negras, con un filo de papel entre una y otra', () => {
    // más tinta que papel, y bastante más que en las paredes y los techos
    expect(RAYADO.cargaEnPiso).toBeGreaterThanOrEqual(0.75)
    expect(RAYADO.cargaEnPiso).toBeGreaterThan(RAYADO.carga + 0.1)
    expect(RAYADO.tintaEnPiso).toBeGreaterThanOrEqual(0.95)
    expect(RAYADO.tintaEnPiso).toBeGreaterThan(RAYADO.tinta)
    // la raya se ve como raya: de una a otra hay paso / √2 píxeles, y el papel que queda mide más de un píxel y medio
    const entreRayas = RAYADO.pasoEnPiso / Math.SQRT2
    expect(entreRayas).toBeGreaterThanOrEqual(8)
    expect(entreRayas * (1 - RAYADO.cargaEnPiso)).toBeGreaterThan(1.5)
    // y el plano de abajo se sigue leyendo por ese filo: no es una mancha negra
    expect(RAYADO.cargaEnPiso).toBeLessThanOrEqual(0.85)
  })

  test('el filo de la raya es de un píxel: nítida, no un degradé', () => {
    const cuerpo = GLSL_SOMBRA.slice(GLSL_SOMBRA.indexOf('float rayadoSombra'))
    expect(cuerpo).toContain('float filo = 1.4 / paso;')
    expect(cuerpo).toContain('smoothstep(carga - filo, carga + filo, a)')
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
    expect(fragmentShader).toMatch(/rayadoSombra\(\(1\.0 - sol\) \* mix\(1\.0, 0\.\d+, propia\), vMundo, max\(piso, 0\.\d+ \* vTecho\)\)/)
  })

  test('el piso es la calle, el patio y el solar: ahí la sombra va gruesa; en los techos, a medio camino', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('float piso = max(step(vInfo.w, 0.5), step(5.0 - 0.5, cubierta) * step(cubierta, 6.0 + 0.5));')
    expect(fragmentShader).toContain('float cubierta = mod(vCubierta, 8.0);')
  })

  test('el color no cambia: la raya solo entra en la rama de tinta', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('vec3 conRaya = mix(papelParejo, TINTA_SOMBRA, raya);')
    expect(fragmentShader).toContain('vec3 conSol = (reflectedLight.indirectDiffuse + reflectedLight.directDiffuse * sol) * luzDeColor(sol);')
    expect(fragmentShader).not.toMatch(/conSol[^;]*raya/)
  })

  test('cada techo deja el id de su casa en el alfa, después de escribir el color; el piso y las paredes, cero', () => {
    const { fragmentShader } = compilar()
    const alfa = fragmentShader.indexOf(`gl_FragColor.a = vTecho * (1.0 - piso) * ${GLSL_ID_DE_TECHO('vInfo.y')};`)
    expect(alfa).toBeGreaterThan(fragmentShader.indexOf('#include <opaque_fragment>'))
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

  test('sin los uniforms de la luz (un U a medias) quedan los de respaldo: el sol de siempre y el mapa apagado', () => {
    const sinLuz = Object.fromEntries(Object.entries(U).filter(([k]) => !UNIFORMS_DE_LUZ.includes(k)))
    for (const material of [crearArboles({ datos, coords, U: sinLuz }).material, crearHitos({ hitos: [], coords, U: sinLuz }).material]) {
      expect(material.uniforms.uSol.value).toBeInstanceOf(Vector3)
      expect(material.uniforms.uSol.value.toArray()).toEqual(vectorSol())
      // el sampler de sombra tiene su entrada (three le pone su textura vacía) y la lectura está apagada
      for (const k of UNIFORMS_DE_LUZ) expect(material.uniforms[k]).toBeTruthy()
      expect(material.uniforms.tSombra.value).toBeNull()
      expect(material.uniforms.uSombra.value.x).toBe(0)
    }
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
    expect(FRAGMENTO_ACABADO).toMatch(/float lejos = smoothstep\(mix\([\d.]+, [\d.]+, uColor\), mix\([\d.]+, [\d.]+, uColor\), z\);/)
    expect(FRAGMENTO_ACABADO).toMatch(/return max\(silueta, entrante\) \* \(1\.0 - mix\(0\.\d+, 0\.\d+, uColor\) \* lejos\) \* mix\(1\.0, 0\.\d+, techo\);/)
    // en tinta, antes que en T35 (600 m a 5 km): el fondo de una vista oblicua no es una mancha de líneas
    expect(CONTORNO.lejos.desde).toBeLessThanOrEqual(400)
    expect(CONTORNO.lejos.hasta).toBeLessThan(CONTORNO.lejosEnColor.hasta)
    // en color queda como en T35
    expect(CONTORNO.lejosEnColor).toEqual({ desde: 600, hasta: 5000, claro: 0.75 })
  })

  test('dentro del tejado de una casa el umbral es otro: el id va en el alfa del píxel y de sus cuatro vecinos', () => {
    expect(FRAGMENTO_ACABADO).toContain('float techo = mismoTecho(id, t) * (1.0 - uColor);')
    expect(FRAGMENTO_ACABADO).toContain(`mix(${CONTORNO.desde.toFixed(2)}, ${CONTORNO.techoDesde.toFixed(2)}, techo) * sube`)
    expect(FRAGMENTO_ACABADO).toContain('contorno(d, z, escena.a)')
    // el alfa 0 (piso, pared) y el 1 (hitos, árboles, la mesa) no son techos
    expect(FRAGMENTO_ACABADO).toContain('step(0.002, id) * step(id, 0.998)')
  })

  test('fuerte en tinta y tenue en color', () => {
    expect(CONTORNO.tinta).toBeGreaterThan(2 * CONTORNO.enColor)
    expect(FRAGMENTO_ACABADO).toContain(`mix(${CONTORNO.tinta.toFixed(2)}, ${CONTORNO.enColor.toFixed(2)}, uColor)`)
  })

  test('la bruma es solo del color y solo sobre lo dibujado', () => {
    expect(FRAGMENTO_ACABADO).toMatch(/mix\(c, BRUMA, uColor \* hayAlgo \* /)
  })

  test('no desenfoca: el color sale de su píxel; de los vecinos solo se lee el alfa (el id del techo)', () => {
    expect(FRAGMENTO_ACABADO.match(/texture2D\(tColor, vUv\)/g)).toHaveLength(1)
    expect(FRAGMENTO_ACABADO.match(/texture2D\(tColor, vUv [+-] [^)]*\)\)\.a/g)).toHaveLength(4)
    expect(FRAGMENTO_ACABADO.match(/texture2D\(tColor/g)).toHaveLength(5)
    expect(FRAGMENTO_ACABADO).toContain('gl_FragColor = vec4(c, 1.0);')
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

describe('el id del techo en el alfa', () => {
  test('cabe exacto en 8 bits y nunca es 0 (piso o pared) ni 255 (lo que no es la ciudad)', () => {
    for (const semilla of [0, 1, 252, 253, 254, 1000, 65535]) {
      const byte = idDeTecho(semilla) * 255
      expect(byte).toBeCloseTo(Math.round(byte), 9)
      expect(Math.round(byte)).toBeGreaterThanOrEqual(1)
      expect(Math.round(byte)).toBeLessThanOrEqual(253)
    }
  })

  test('dos casas con semillas distintas casi nunca comparten id: las seguidas, nunca', () => {
    for (let s = 0; s < 600; s++) expect(idDeTecho(s)).not.toBe(idDeTecho(s + 1))
    const distintos = new Set(Array.from({ length: 65536 }, (_, s) => idDeTecho(s)))
    expect(distintos.size).toBe(253)
  })

  test('el shader lo calcula igual', () => {
    expect(GLSL_ID_DE_TECHO('vInfo.y')).toBe('((1.0 + mod(vInfo.y, 253.0)) / 255.0)')
  })
})

describe('cuánta línea lleva un píxel (fuerzaDeContorno, el espejo del shader)', () => {
  const cerca = 100

  test('la silueta de una casa va entera; sobre un plano no hay línea', () => {
    expect(fuerzaDeContorno({ adelante: 20, atras: 0, z: cerca })).toBe(1)
    expect(fuerzaDeContorno({ adelante: 0, atras: 0, z: cerca })).toBe(0)
  })

  test('una cumbrera o una lima (un salto de 1 a 2) se marca entre dos casas, no dentro del tejado de una', () => {
    for (const adelante of [1.2, 1.6, 2]) {
      expect(fuerzaDeContorno({ adelante, atras: 0, z: cerca })).toBe(1)
      expect(fuerzaDeContorno({ adelante, atras: 0, z: cerca, mismoTecho: true })).toBe(0)
    }
    // la limahoya (entrante) entre dos alas, tampoco
    expect(fuerzaDeContorno({ adelante: 0, atras: 1.5, z: cerca })).toBeGreaterThan(0.9)
    expect(fuerzaDeContorno({ adelante: 0, atras: 1.5, z: cerca, mismoTecho: true })).toBe(0)
  })

  test('un escalón de verdad dentro del mismo tejado sí se marca, con menos tinta que una silueta', () => {
    const escalon = fuerzaDeContorno({ adelante: 12, atras: 0, z: cerca, mismoTecho: true })
    expect(escalon).toBeCloseTo(CONTORNO.techoTinta, 9)
    expect(escalon).toBeGreaterThan(0.4)
    expect(escalon).toBeLessThan(fuerzaDeContorno({ adelante: 12, atras: 0, z: cerca }))
  })

  test('el eco de una silueta (un salto grande hacia atrás) no se dibuja', () => {
    expect(fuerzaDeContorno({ adelante: 0, atras: 20, z: cerca })).toBe(0)
  })

  test('lejos la línea se aclara y pide más salto: al final queda un tercio de la silueta y las aristas se van', () => {
    expect(fuerzaDeContorno({ adelante: 20, atras: 0, z: CONTORNO.lejos.hasta })).toBeCloseTo(1 - CONTORNO.lejos.claro, 9)
    expect(fuerzaDeContorno({ adelante: 1.2, atras: 0, z: CONTORNO.lejos.hasta })).toBe(0)
    const a = [150, 600, 1200, 4000].map((z) => fuerzaDeContorno({ adelante: 20, atras: 0, z }))
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeLessThan(a[i - 1] + 1e-12)
    expect(a[0]).toBe(1)
    expect(a[2]).toBeLessThan(0.95)
  })

  test('en color no cambia nada respecto de T35: ni el tejado de una casa se trata aparte ni se afloja antes', () => {
    const cumbrera = { adelante: 1.6, atras: 0, z: cerca }
    expect(fuerzaDeContorno({ ...cumbrera, mismoTecho: true, color: true })).toBe(fuerzaDeContorno({ ...cumbrera, color: true }))
    expect(fuerzaDeContorno({ ...cumbrera, mismoTecho: true, color: true })).toBe(1)
    // a 600 m, en tinta la línea ya se aclaró; en color todavía está entera
    expect(fuerzaDeContorno({ adelante: 20, atras: 0, z: 600, color: true })).toBe(1)
    expect(fuerzaDeContorno({ adelante: 20, atras: 0, z: 600 })).toBeLessThan(1)
    expect(fuerzaDeContorno({ adelante: 20, atras: 0, z: 5000, color: true })).toBeCloseTo(0.25, 9)
  })
})
