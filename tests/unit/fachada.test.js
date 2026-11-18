import { describe, test, expect } from 'vitest'
import { crearMaterialCiudad } from '../../src/material.js'
import { GLSL_FACHADA } from '../../src/shader/fachada.js'
import { ALTO_PISO } from '../../src/ciudad.js'

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
  const inicio = glsl.search(new RegExp(`\\b(?:void|float|bool|vec[234]|Medidas)\\s+${nombre}\\s*\\(`))
  expect(inicio, `falta la función ${nombre}`).toBeGreaterThan(-1)
  let nivel = 0
  for (let k = glsl.indexOf('{', inicio); k < glsl.length; k++) {
    if (glsl[k] === '{') nivel++
    if (glsl[k] === '}' && --nivel === 0) return glsl.slice(inicio, k + 1)
  }
  throw new Error(`${nombre} sin cerrar`)
}

const ESTILOS = ['COLONIAL', 'REPUBLICANO', 'GUZMANCISTA', 'ECLECTICO', 'MODERNO', 'QUINTA', 'RANCHO', 'ORILLAS', 'PUBLICO']

describe('fachadas: la geometría llega al fragment', () => {
  test('el vértice pasa aPared (metros a lo largo de la pared, largo) en vPared', () => {
    const { vertexShader, fragmentShader } = compilar()
    expect(vertexShader).toContain('attribute vec2 aPared;')
    expect(vertexShader).toMatch(/vPared\s*=\s*aPared;/)
    expect(fragmentShader).toContain('varying vec2 vPared;')
  })

  test('lo que es constante en la casa o en la pared va sin interpolar (flat): si no, azar() lo vuelve ruido', () => {
    const { vertexShader, fragmentShader } = compilar()
    for (const s of [vertexShader, fragmentShader]) {
      expect(s).toContain('flat varying vec4 vInfo;')
      expect(s).toContain('flat varying float vLargo;')
      expect(s).not.toMatch(/(?<!flat )varying vec4 vInfo/)
    }
    expect(vertexShader).toMatch(/vLargo\s*=\s*aPared\.y;/)
  })

  test('la fachada se calcula con la pared, la altura sobre la base de la casa y la info de la casa', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toMatch(/fachadaEn\(vec2\(vPared\.x, vLargo\), vMundo\.y - vBase, vInfo, paredColor\(vInfo\.y, vInfo\.z, vMundo\.y - vBase\), /)
  })

  test('las derivadas se toman fuera de toda rama (en main), y la función las recibe', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toMatch(/vec2 wPared = max\(fwidth\(vec2\(vPared\.x, vMundo\.y - vBase\)\)/)
    expect(cuerpo(GLSL_FACHADA, 'fachadaEn')).not.toContain('fwidth')
  })

  test('el alto del piso del shader es el de la extrusión', () => {
    expect(GLSL_FACHADA).toContain(`const float ALTO_PISO = ${ALTO_PISO.toFixed(2)};`)
  })
})

describe('fachadas: medidas por estilo', () => {
  test('cada estilo tiene sus medidas (paño, vano, alféizar, dintel, puerta, ciegos, remate)', () => {
    const medidas = cuerpo(GLSL_FACHADA, 'medidas')
    for (const e of ESTILOS.filter((e) => e !== 'PUBLICO')) expect(medidas).toContain(`ESTILO_${e}`)
    expect(GLSL_FACHADA).toMatch(/struct Medidas \{[^}]*pano[^}]*medio[^}]*alfeizar[^}]*dintel[^}]*puertaMedio[^}]*puertaAlto[^}]*ciegos[^}]*remate/)
  })

  test('la planta baja reparte puertas, ventanas, vidrieras y paños ciegos según el estilo', () => {
    const tipo = cuerpo(GLSL_FACHADA, 'tipoDeVano')
    for (const t of ['NADA', 'VENTANA', 'PUERTA', 'VIDRIERA', 'BALCON']) expect(tipo).toContain(t)
    for (const e of ['MODERNO', 'RANCHO', 'ORILLAS', 'GUZMANCISTA', 'ECLECTICO', 'PUBLICO']) expect(tipo).toContain(`ESTILO_${e}`)
    expect(tipo).toContain('m.ciegos')
  })
})

describe('fachadas: el detalle de cada estilo', () => {
  const f = GLSL_FACHADA
  const usaEn = (funcion, estilo) => expect(cuerpo(f, funcion), `${funcion} sin ${estilo}`).toContain(`ESTILO_${estilo}`)

  test('rejas de madera (coloniales, voladas) y de hierro (republicanas en adelante)', () => {
    cuerpo(f, 'rejaDeMadera')
    cuerpo(f, 'rejaDeHierro')
    usaEn('enrejado', 'COLONIAL')
    usaEn('enrejado', 'RANCHO')
  })

  test('remates: alero colonial, cornisas, dentículos, balaustrada y pretil liso', () => {
    for (const fn of ['alero', 'cornisa', 'denticulos', 'balaustrada', 'pretil']) cuerpo(f, fn)
    const remate = cuerpo(f, 'remate')
    for (const e of ['COLONIAL', 'REPUBLICANO', 'GUZMANCISTA', 'ECLECTICO', 'MODERNO', 'QUINTA', 'ORILLAS', 'PUBLICO']) {
      expect(remate, `remate sin ESTILO_${e}`).toContain(`ESTILO_${e}`)
    }
  })

  test('pilastras, guardapolvos y balcones en las guzmancistas; almohadillado en eclécticas y públicas', () => {
    usaEn('pilastras', 'GUZMANCISTA')
    usaEn('marco', 'GUZMANCISTA')
    expect(cuerpo(f, 'marco')).toContain('guardapolvo')
    cuerpo(f, 'balcon')
    usaEn('almohadillado', 'ECLECTICO')
    usaEn('almohadillado', 'PUBLICO')
  })

  test('modernas con losas marcadas y vidriera; quintas con porche; ranchos de zinc o bahareque; orillas con cal gastada', () => {
    usaEn('losas', 'MODERNO')
    cuerpo(f, 'vidriera')
    usaEn('porche', 'QUINTA')
    for (const fn of ['chapaAcanalada', 'bahareque', 'calGastada']) cuerpo(f, fn)
    usaEn('textura', 'RANCHO')
    usaEn('textura', 'ORILLAS')
  })

  test('los vanos: adentro oscuro o postigos de madera (marrón, verde…), según la semilla', () => {
    cuerpo(f, 'madera')
    const v = cuerpo(f, 'vano')
    expect(v).toContain('OSCURO')
    expect(v).toContain('madera(')
    expect(v).toContain('azar(')
  })
})

describe('fachadas: tinta y LOD', () => {
  test('en tinta, la fachada aporta su tinta (vanos rayados, molduras y hierros a pluma)', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toMatch(/enTinta = mix\(mix\(diffuseColor\.rgb, TINTA, fachada\.a\), papel, vTecho\)/)
    expect(cuerpo(GLSL_FACHADA, 'rayadoPantalla')).toContain('gl_FragCoord') // el rayado de los tonos, en píxeles: sin moiré
    cuerpo(GLSL_FACHADA, 'trazo')
  })

  test('en color, la pared es la fachada', () => {
    const { fragmentShader } = compilar()
    expect(fragmentShader).toContain('mix(mix(fachada.rgb, techoColor(vInfo.y, vInfo.z), vTecho), sueloColor(uv, papel), esSuelo)')
  })

  test('de lejos, los detalles se apagan hacia el tono medio de la pared (sin moiré)', () => {
    const fa = cuerpo(GLSL_FACHADA, 'fachadaEn')
    expect(fa).toMatch(/detalle\(/)
    expect(cuerpo(GLSL_FACHADA, 'barras')).toMatch(/mix\(g \/ per, /) // lo fino se vuelve su promedio
  })
})
