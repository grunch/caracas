import { describe, test, expect } from 'vitest'
import { DataUtils, HalfFloatType, RedFormat } from 'three'
import {
  decodificarRelieve, muestrear, crearRelieve, hinchado, alturaSuelo, texturaRelieve, uniformsRelieve, subdivisionDeLaHoja,
  terrazasDeHitos, ponerRelieve, GLSL_RELIEVE, GLSL_TERRAZAS_TAPADAS, TALUD_M, MAX_TERRAZAS, UNIFORMS_RELIEVE,
} from '../../src/relieve.js'

/** relieve.bin sintético: Uint16 LE [w, h, alturas en dm…] */
function binario(w, h, dm) {
  const b = new ArrayBuffer(2 * (2 + w * h))
  const v = new DataView(b)
  v.setUint16(0, w, true)
  v.setUint16(2, h, true)
  dm.forEach((d, i) => v.setUint16(4 + 2 * i, d, true))
  return b
}

// hoja de 300×200 m con la plaza en el centro: x −150…150, z −100…100
const hoja = { x0: -150, z0: -100, ancho: 300, alto: 200 }

describe('decodificarRelieve', () => {
  test('lee ancho, alto y las alturas en metros', () => {
    const r = decodificarRelieve(binario(3, 2, [9000, 9013, 27500, 0, 100, 200]))
    expect(r.w).toBe(3)
    expect(r.h).toBe(2)
    expect(Array.from(r.alturas)).toEqual([900, 901.3, 2750, 0, 10, 20].map((m) => Math.fround(m)))
  })

  test('rechaza un buffer truncado', () => {
    expect(() => decodificarRelieve(new ArrayBuffer(2))).toThrow(/truncado/)
    expect(() => decodificarRelieve(binario(3, 2, [1, 2, 3]).slice(0, 10))).toThrow(/truncado/)
  })

  test('rechaza dimensiones nulas', () => {
    expect(() => decodificarRelieve(binario(0, 2, []))).toThrow(/dimensiones/)
  })
})

describe('muestrear', () => {
  const datos = { w: 2, h: 2, alturas: new Float32Array([0, 10, 20, 30]) }

  test('bilineal entre centros de celda', () => {
    expect(muestrear(datos, 0.5, 0.5)).toBeCloseTo(15)
    expect(muestrear(datos, 0.25, 0.25)).toBeCloseTo(0) // centro de la celda (0,0)
    expect(muestrear(datos, 0.75, 0.25)).toBeCloseTo(10)
    expect(muestrear(datos, 0.5, 0.25)).toBeCloseTo(5)
  })

  test('fuera de la hoja repite el borde', () => {
    expect(muestrear(datos, -1, -1)).toBeCloseTo(0)
    expect(muestrear(datos, 2, 2)).toBeCloseTo(30)
  })
})

describe('crearRelieve', () => {
  // 3×2 celdas de 100 m; la plaza (0, 0) cae en el centro de la celda del medio de la fila... entre filas
  const datos = { w: 3, h: 2, alturas: new Float32Array([920, 930, 940, 900, 910, 920]) }
  const r = crearRelieve(datos, hoja)

  test('la referencia es la altura en la plaza y alturaEn es relativa a ella', () => {
    expect(r.referencia).toBeCloseTo(920) // promedio de 930 y 910
    expect(r.alturaEn(0, 0)).toBeCloseTo(0)
    expect(r.alturaEn(0, -50)).toBeCloseTo(10) // centro de la celda norte del medio
    expect(r.alturaEn(100, 50)).toBeCloseTo(0) // celda sureste: 920 − 920
  })

  test('el norte (z negativa) es la fila 0', () => {
    expect(r.alturaEn(-100, -50)).toBeCloseTo(0)
    expect(r.alturaEn(-100, 50)).toBeCloseTo(-20)
  })
})

describe('hinchado y alturaSuelo', () => {
  test('el suelo se hincha con la ola: 0 antes del frente, 1 después', () => {
    expect(hinchado(500, 0, 260)).toBe(0)
    expect(hinchado(500, 500, 260)).toBe(0)
    expect(hinchado(500, 760, 260)).toBe(1)
    expect(hinchado(500, 630, 260)).toBeCloseTo(0.5)
  })

  test('alturaSuelo = relieve × exageración × hinchado', () => {
    const r = { alturaEn: () => 100 }
    expect(alturaSuelo(r, 30, 40, { ola: 0, anchoOla: 260, exageracion: 1.3 })).toBe(0)
    expect(alturaSuelo(r, 30, 40, { ola: 1000, anchoOla: 260, exageracion: 1.3 })).toBeCloseTo(130)
    expect(alturaSuelo(null, 30, 40, { ola: 1000, anchoOla: 260, exageracion: 1 })).toBe(0)
  })
})

describe('texturaRelieve', () => {
  test('half float en el canal R, relativo a la plaza', () => {
    const r = crearRelieve({ w: 3, h: 2, alturas: new Float32Array([920, 930, 940, 900, 910, 920]) }, hoja)
    const t = texturaRelieve(r)
    expect(t.type).toBe(HalfFloatType)
    expect(t.format).toBe(RedFormat)
    expect(t.image.width).toBe(3)
    expect(t.image.height).toBe(2)
    expect(Array.from(t.image.data, (h) => DataUtils.fromHalfFloat(h))).toEqual([0, 10, 20, -20, -10, 0])
  })

  test('uniformsRelieve arranca plano (textura de 1×1 en cero) con la hoja y exageración 1', () => {
    const U = uniformsRelieve(hoja)
    expect(U.uExageracion.value).toBe(1)
    expect(U.uRelieveHoja.value.toArray()).toEqual([-150, -100, 300, 200])
    expect(DataUtils.fromHalfFloat(U.tRelieve.value.image.data[0])).toBe(0)
  })
})

describe('subdivisionDeLaHoja', () => {
  test('con GPU, la hoja se subdivide fino para apoyarse en el relieve (≈ 24 m por cuadro)', () => {
    expect(subdivisionDeLaHoja(false)).toEqual([384, 306])
  })

  test('con render por software, cuatro veces más grueso en cada lado: el suelo era el 90 % del cuadro', () => {
    expect(subdivisionDeLaHoja(true)).toEqual([96, 77])
  })
})

describe('terrazas: un hito grande asentado en la ladera (el convento de las Concepciones y el Capitolio)', () => {
  // una ladera que sube 1 m cada 10 m hacia el oeste: 31 × 1 celdas de 10 m sobre la hoja de 300 m
  const ladera = { w: 31, h: 1, alturas: Float32Array.from({ length: 31 }, (_, i) => 100 - i) }
  const hoja31 = { x0: -155, z0: -100, ancho: 310, alto: 200 }
  // una terraza de 60 × 40 m centrada en (0, 0), girada con el damero
  const terraza = { x: 0, z: 0, eje: [1, 0], medioA: 30, medioB: 20 }
  const r = crearRelieve(ladera, hoja31, [terraza])
  const sin = crearRelieve(ladera, hoja31)

  // una ladera que no es pareja: se empina hacia el oeste
  const curva = { w: 31, h: 1, alturas: Float32Array.from({ length: 31 }, (_, i) => 100 - i - 0.05 * (i - 15) ** 2) }
  const rc = crearRelieve(curva, hoja31, [terraza])
  const sinC = crearRelieve(curva, hoja31)

  test('en una ladera pareja la terraza no cambia el suelo: ni pozo cuesta arriba ni zócalo cuesta abajo (revisión de #164)', () => {
    // con el piso horizontal a la altura del centro, el convento quedaba ~6 m bajo la calle en su esquina noroeste
    for (let x = -45; x <= 45; x += 2.5) for (const z of [-25, -19, 0, 19, 25]) expect(r.alturaEn(x, z)).toBeCloseTo(sin.alturaEn(x, z), 6)
  })

  test('adentro el suelo es un plano: el que mejor se ajusta al terreno de su rectángulo', () => {
    // plano: el punto medio de dos puntos es el promedio de sus alturas
    for (const [[x1, z1], [x2, z2]] of [[[-29, 0], [29, 0]], [[-29, -19], [17, 19]], [[0, -19], [-20, 11]]]) {
      expect(rc.alturaEn((x1 + x2) / 2, (z1 + z2) / 2)).toBeCloseTo((rc.alturaEn(x1, z1) + rc.alturaEn(x2, z2)) / 2, 6)
    }
    // el mejor ajuste: el terreno queda por encima y por debajo, y en promedio sobre él
    const xs = Array.from({ length: 61 }, (_, i) => i - 30)
    const resto = xs.map((x) => sinC.alturaEn(x, 0) - rc.alturaEn(x, 0))
    expect(Math.max(...resto)).toBeGreaterThan(0.1); expect(Math.min(...resto)).toBeLessThan(-0.1)
    expect(Math.abs(resto.reduce((a, b) => a + b) / resto.length)).toBeLessThan(0.05)
  })

  test('el talud va afuera, en la calle, y a TALUD_M el terreno es el de siempre', () => {
    expect(TALUD_M).toBeLessThanOrEqual(5) // la mitad de una calle de 1772: no llega a la casa de enfrente
    for (const x of [-30 - TALUD_M, -40, 30 + TALUD_M, 45]) expect(rc.alturaEn(x, 0)).toBeCloseTo(sinC.alturaEn(x, 0), 6)
    // a mitad del talud, entre el plano (prolongado) y el terreno
    const plano = (x) => rc.alturaEn(0, 0) + ((rc.alturaEn(29, 0) - rc.alturaEn(-29, 0)) / 58) * x
    for (const x of [-30 - TALUD_M / 2, 30 + TALUD_M / 2]) {
      const [a, b] = [plano(x), sinC.alturaEn(x, 0)].sort((u, v) => u - v)
      expect(rc.alturaEn(x, 0)).toBeGreaterThan(a); expect(rc.alturaEn(x, 0)).toBeLessThan(b)
    }
  })

  test('las terrazas salen de los hitos que la piden, en metros del mundo y con su eje', () => {
    const coords = { metro: 0.5, aMundo: (px, py) => ({ x: (px - 100) * 0.5, z: (py - 50) * 0.5 }) }
    const hitos = [{ id: 'a', x: 120, y: 70, eje: [3, 4], nace: 1, terraza: { ancho: 60, fondo: 40 } }, { id: 'b', x: 0, y: 0, eje: [1, 0] }]
    expect(terrazasDeHitos(hitos, coords)).toEqual([{ x: 10, z: 10, eje: [0.6, 0.8], medioA: 30, medioB: 20, vida: [1, 0] }])
  })

  test('el shader hace el mismo plano: hasta MAX_TERRAZAS en uniforms, con su altura al centro y su pendiente', () => {
    const U = uniformsRelieve(hoja31, [terraza])
    expect(U.uTerrazaMarco.value).toHaveLength(MAX_TERRAZAS)
    expect(U.uTerrazaMedida.value[0].toArray().slice(0, 2)).toEqual([30, 20])
    expect(U.uTerrazaMedida.value[1].w).toBe(0) // sin terraza: inactiva
    ponerRelieve(U, r)
    expect(U.uTerrazaMedida.value[0].z).toBeCloseTo(r.alturaEn(0, 0), 6)
    expect(U.uTerrazaMedida.value[0].w).toBe(1)
    // la ladera sube 1 m cada 10 m hacia el oeste (−a): la pendiente en el marco de la terraza (a, b)
    expect(U.uTerrazaPendiente.value[0].x).toBeCloseTo(-0.1, 6)
    expect(U.uTerrazaPendiente.value[0].y).toBeCloseTo(0, 6)
    expect(GLSL_RELIEVE).toContain('dot(vec2(a, b), uTerrazaPendiente[i])')
    expect(GLSL_RELIEVE).toContain('float relieveCrudo(vec2 xz)')
    expect(GLSL_RELIEVE).toMatch(/sueloEn\(vec2 xz\) \{\s*return conTerrazas\(xz, relieveCrudo\(xz\)\)/)
    expect(() => uniformsRelieve(hoja31, Array(MAX_TERRAZAS + 1).fill(terraza))).toThrow(/terrazas/)
  })

  test('donde el hito está en pie, su plataforma tapa el suelo: el fragmento del suelo se descarta (sin rampas de la malla)', () => {
    const U = uniformsRelieve(hoja31, [{ ...terraza, vida: [1, 0] }])
    expect(U.uTerrazaVida.value[0].toArray()).toEqual([1, 0])
    expect(GLSL_TERRAZAS_TAPADAS).toContain('bool bajoUnHito(vec2 xz)')
    expect(GLSL_TERRAZAS_TAPADAS).toContain('vivoEn(uTerrazaVida[i], epocaAqui(length(xz)))')
  })

  test('un hito anclado en una terraza apoya cada vértice en su plano; los demás, en el más alto de su ancla y su apoyo', () => {
    expect(GLSL_RELIEVE).toContain('float pisoDeHito(vec2 ancla, vec2 apoyo, vec2 xz)')
    expect(GLSL_RELIEVE).toContain('return max(sueloEn(ancla), sueloEn(apoyo));')
  })

  test('UNIFORMS_RELIEVE nombra todo lo que lee GLSL_RELIEVE: los hitos y los árboles lo copian entero', () => {
    const U = uniformsRelieve(hoja31, [terraza])
    expect([...UNIFORMS_RELIEVE].sort()).toEqual(Object.keys(U).filter((k) => k !== 'uTerrazaVida').sort())
  })

  test('acostada la ciudad (el hito escondido por la ola), el suelo de la terraza se dibuja: no queda un hueco', () => {
    // el hito sube con la ola desde su distancia a la plaza, corrida hasta 60 m por su azar (src/hitos/material.js)
    expect(GLSL_TERRAZAS_TAPADAS).toContain('smoothstep(0.0, 1.0, (uOla - length(m.xy) - 60.0) / uAnchoOla) > 0.99')
  })
})
