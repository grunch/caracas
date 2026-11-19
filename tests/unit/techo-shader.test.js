import { describe, test, expect } from 'vitest'
import { crearMaterialCiudad } from '../../src/material.js'
import { GLSL_TECHO } from '../../src/shader/techo.js'
import { GLSL_FACHADA } from '../../src/shader/fachada.js'
import { GLSL_PRETIL } from '../../src/shader/comun.js'
import { CUBIERTA } from '../../src/techos.js'

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

/** El cuerpo de una función GLSL (desde su firma hasta la llave que la cierra). */
function cuerpo(glsl, nombre) {
  const inicio = glsl.search(new RegExp(`\\b(?:void|float|bool|vec[234])\\s+${nombre}\\s*\\(`))
  expect(inicio, `falta la función ${nombre}`).toBeGreaterThan(-1)
  let nivel = 0
  for (let k = glsl.indexOf('{', inicio); k < glsl.length; k++) {
    if (glsl[k] === '{') nivel++
    if (glsl[k] === '}' && --nivel === 0) return glsl.slice(inicio, k + 1)
  }
  throw new Error(`${nombre} sin cerrar`)
}

describe('techos: la geometría llega al fragment', () => {
  const { vertexShader, fragmentShader } = compilar()

  test('el vértice pasa aTecho: las coordenadas del faldón interpoladas y la cubierta sin interpolar', () => {
    expect(vertexShader).toContain('attribute vec4 aTecho;')
    expect(vertexShader).toMatch(/vFaldon\s*=\s*aTecho\.xyz;/)
    for (const s of [vertexShader, fragmentShader]) {
      expect(s).toContain('varying vec3 vFaldon;')
      expect(s).toContain('flat varying float vCubierta;')
      expect(s).not.toMatch(/(?<!flat )varying float vCubierta/)
    }
  })

  test('el suelo no trae aTecho (un atributo que falta vale 0, 0, 0, 1): no cuenta como techo', () => {
    expect(vertexShader).toMatch(/vCubierta = aInfo\.w < 0\.5 \? 0\.0 : aTecho\.w;/)
    expect(vertexShader).toMatch(/vTecho = step\(0\.5, vCubierta\);/)
  })

  test('cuánto mira cada cara al sol va al fragment, para sombrear los faldones', () => {
    // el sol es un uniform (src/luz.js); el coseno se lleva a la escala con que se ajustaron los tonos del tejado
    expect(vertexShader).toContain('uniform vec3 uSol;')
    expect(vertexShader).toMatch(/vLuz = 0\.30 \+ 0\.76 \* dot\(normalize\(normal\), uSol\);/)
  })

  test('las derivadas del faldón se toman en main, fuera de toda rama; techoEn las recibe', () => {
    expect(fragmentShader).toMatch(/vec2 wTecho = max\(fwidth\(vFaldon\.xy\), vec2\(1e-4\)\);/)
    expect(fragmentShader.indexOf('vec2 wTecho')).toBeLessThan(fragmentShader.indexOf('vec4 casa ='))
    expect(GLSL_TECHO).not.toContain('fwidth')
  })

  test('cada fragmento calcula o el techo o la fachada, y el suelo ninguno de los dos (con if: el render por software los salta)', () => {
    expect(fragmentShader).toMatch(/if \(esSuelo < 0\.5\) \{\s*if \(vTecho < 0\.5\) casa = fachadaEn\(/)
    expect(fragmentShader).toContain('else if (vAlzada > 0.0) casa = techoEn(vFaldon, vCubierta, vInfo.y, vLuz, wTecho);')
    expect(fragmentShader).toContain('else casa = techoLlano(vCubierta, vInfo.y);')
    expect(fragmentShader.indexOf('vec2 wTecho')).toBeLessThan(fragmentShader.indexOf('casa = techoEn('))
  })
})

describe('techos: el pretil y el alero cambian con la época', () => {
  const { vertexShader, fragmentShader } = compilar()

  test('conPretil vale para republicana, guzmancista y ecléctica (1 a 3), en el vértice y en el fragment', () => {
    expect(GLSL_PRETIL).toContain('float conPretil(float estilo) { return step(0.5, estilo) * step(estilo, 3.5); }')
    expect(vertexShader).toContain('float conPretil(float estilo)')
    expect(fragmentShader).toContain('float conPretil(float estilo)')
  })

  test('el vértice sube el pretil (aTecho.x de las paredes) según la fachada de la época, con la ola', () => {
    expect(vertexShader).toMatch(/float pretil = \(1\.0 - vTecho\) \* mix\(conPretil\(de\.x\), conPretil\(a\.x\), frente\);/)
    expect(vertexShader).toMatch(/transformed\.y \+= aTecho\.x \* pretil;/)
    expect(vertexShader).toMatch(/vPretil = aTecho\.y \* pretil;/)
    // primero se suma el pretil y después se escala la altura (pisos de la época, ola, vida)
    expect(vertexShader.indexOf('transformed.y += aTecho.x * pretil;')).toBeLessThan(vertexShader.indexOf('transformed.y *= sube * vExiste;'))
  })

  test('la fachada mide su alto con el pretil: el remate queda arriba de todo', () => {
    expect(fragmentShader).toContain('gPretil = vPretil;')
    expect(cuerpo(GLSL_FACHADA, 'fachadaEn')).toContain('float alto = pisos * gAltoPiso + gPretil')
  })

  test('el alero (su cara de abajo y la de arriba, marcada) se descarta cuando la fachada de la época lleva pretil', () => {
    expect(fragmentShader).toContain(`float volado = max(1.0 - step(0.5, abs(vCubierta - ${CUBIERTA.ALERO}.0)), step(${CUBIERTA.VOLADA}.0 - 0.5, vCubierta));`)
    expect(fragmentShader).toMatch(/if \(volado > 0\.5 && conPretil\(vInfo\.z\) > 0\.5\) discard;/)
    expect(cuerpo(GLSL_TECHO, 'techoEn')).toContain('if (cubierta > CUB_VOLADA - 0.5) cubierta -= CUB_VOLADA;')
  })
})

describe('techos: qué dibuja cada cubierta', () => {
  test('las cubiertas del shader son las de la geometría', () => {
    for (const [nombre, valor] of [['TEJA', CUBIERTA.TEJA], ['AZOTEA', CUBIERTA.AZOTEA], ['ZINC', CUBIERTA.ZINC], ['ALERO', CUBIERTA.ALERO],
      ['PATIO', CUBIERTA.PATIO], ['VOLADA', CUBIERTA.VOLADA]]) {
      expect(GLSL_TECHO).toContain(`CUB_${nombre} = ${valor}.0`)
    }
  })

  test('techoEn reparte: azotea, zinc (la chapa acanalada de las fachadas), alero por debajo, patio y teja', () => {
    const t = cuerpo(GLSL_TECHO, 'techoEn')
    for (const s of ['CUB_AZOTEA', 'losa(', 'CUB_ZINC', 'chapaAcanalada(', 'CUB_ALERO', 'bajoAlero(', 'CUB_PATIO', 'pisoDePatio(', 'tejado(']) expect(t).toContain(s)
  })

  test('la teja no es roja: de naranja terroso claro a marrón, según la casa', () => {
    const teja = cuerpo(GLSL_TECHO, 'teja')
    const colores = [...teja.matchAll(/vec3\((0\.\d+), (0\.\d+), (0\.\d+)\)/g)].map((m) => m.slice(1).map(Number))
    expect(colores.length).toBeGreaterThanOrEqual(3)
    for (const [r, g, b] of colores) {
      expect(r).toBeGreaterThan(g)
      expect(g).toBeGreaterThan(b)
      expect(g / r).toBeGreaterThan(0.5) // un rojo vivo tendría el verde por debajo de la mitad del rojo
    }
    expect(teja).toContain('azar(semilla')
  })

  test('el tejado: hileras de canal y cobija a lo largo de s, hiladas a lo largo de t, moho, parches, caballete y alero', () => {
    const t = cuerpo(GLSL_TECHO, 'tejado')
    expect(t).toMatch(/floor\(s \/ TEJA_ANCHO\)/)
    expect(t).toMatch(/t \/ TEJA_LARGO/)
    for (const s of ['canal', 'lomo', 'labio', 'moho', 'parche', 'caballete', 'largo - t', 'sombra']) expect(t).toContain(s)
  })

  test('de lejos el detalle se apaga a su tono medio (sin moiré): cada escala con su detalle()', () => {
    const t = cuerpo(GLSL_TECHO, 'tejado')
    expect(t).toMatch(/float cerca = detalle\(TEJA_ANCHO, w\);/)
    expect(t).toMatch(/c \*= mix\(0\.\d+, detalleTeja, cerca\);/)
    expect(t).toMatch(/float lejos = detalle\(4\.0, w\);/)
    expect((t.match(/detalle\(/g) ?? []).length).toBeGreaterThanOrEqual(4)
  })

  test('en tinta: rayas a pluma en el sentido de la pendiente (más cargadas a la sombra), cumbrera y alero', () => {
    const t = cuerpo(GLSL_TECHO, 'tejado')
    expect(t).toMatch(/rayasDePluma\(s, /)
    expect(t).toMatch(/trazo\(t - 0\.03/)
    expect(t).toMatch(/trazo\(largo - t - 0\.03/)
    // las rayas no se juntan a menos de unos píxeles: el paso se duplica con la distancia
    const r = cuerpo(GLSL_TECHO, 'rayasDePluma')
    expect(r).toContain('log2')
    expect(r).toContain('exp2(floor(nivel))')
  })

  test('en tinta la casa es papel con trazos: ya no se pega el plano sobre el techo', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('vec3 enTinta = mix(mix(diffuseColor.rgb, TINTA, casa.a), hojaTinta, acostada);')
    expect(fragmentShader).not.toMatch(/papel, vTecho\)/)
  })

  test('acostada en la hoja (antes de la ola) la casa todavía es el plano: el grabado aparece al levantarse', () => {
    const { vertexShader, fragmentShader } = compilar()
    expect(vertexShader).toMatch(/vAlzada = sube;/)
    expect(fragmentShader).toContain('float acostada = max(esSuelo, 1.0 - smoothstep(0.0, 0.3, vAlzada));')
  })
})
