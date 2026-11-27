import { describe, test, expect } from 'vitest'
import { Mesh } from 'three'
import { HITOS, validarHitos, construirHitos, geometriaHitos, crearHitos, suprimirTechos, zonasDeSupresion } from '../../src/hitos.js'
import { PARTES, parteDe, tramosSinHuecos, azarDe } from '../../src/hitos/partes.js'
import { rectanguloPx, METRO, EJE_DAMERO } from '../../src/hitos/datos/marco.js'
import { crearMaterialHitos, LEVANTE_M } from '../../src/hitos/material.js'
import { crearLienzo, MAT } from '../../src/hitos/lienzo.js'
import { crearCoords } from '../../src/coords.js'
import { crearMaterialCiudad } from '../../src/material.js'
import esquinas from '../../tools/geo/esquinas/1936-esquinas.json'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] } // public/datos/ciudad.json
const coords = crearCoords(PLANO)
const esquina = (nombre) => esquinas.find((e) => e.nombre === nombre).px
const hito = (id) => HITOS.find((h) => h.id === id)
const valido = { id: 'x', nombre: 'X', x: 100, y: 100, eje: [1, 0], nace: 1, muere: 0, fuente: 'plano', verificar: [], partes: [{ tipo: 'faroles', puntos: [[0, 0]] }] }

describe('las definiciones', () => {
  test('todas pasan la validación: ids únicos, dentro de la hoja, con fuente, épocas y partes conocidas', () => {
    expect(validarHitos(HITOS, PLANO)).toEqual([])
    expect(new Set(HITOS.map((h) => h.id)).size).toBe(HITOS.length)
  })

  test('cada hito dice de dónde sale y qué falta verificar', () => {
    for (const h of HITOS) {
      expect(h.fuente.length).toBeGreaterThan(10)
      expect(Array.isArray(h.verificar)).toBe(true)
    }
  })

  test('la Plaza Bolívar queda entre sus cuatro esquinas del plano de 1936', () => {
    const plaza = hito('plaza-bolivar')
    const cuatro = ['Principal', 'La Torre', 'Las Gradillas', 'Las Monjas'].map(esquina)
    const [cx, cy] = [0, 1].map((k) => cuatro.reduce((s, e) => s + e[k], 0) / 4)
    expect(Math.hypot(plaza.x - cx, plaza.y - cy) * METRO).toBeLessThan(15)
    // la planta entra en el cuadro de las esquinas (que están en el medio de las calles)
    const [xs, ys] = [cuatro.map((e) => e[0]), cuatro.map((e) => e[1])]
    for (const [x, y] of plaza.planta[0]) {
      expect(x).toBeGreaterThan(Math.min(...xs) - 5)
      expect(x).toBeLessThan(Math.max(...xs) + 5)
      expect(y).toBeGreaterThan(Math.min(...ys) - 5)
      expect(y).toBeLessThan(Math.max(...ys) + 5)
    }
  })

  test('el eje del damero es el de Principal a La Torre', () => {
    const [a, b] = [esquina('Principal'), esquina('La Torre')]
    const n = Math.hypot(b[0] - a[0], b[1] - a[1])
    expect(EJE_DAMERO[0]).toBeCloseTo((b[0] - a[0]) / n, 2)
    expect(EJE_DAMERO[1]).toBeCloseTo((b[1] - a[1]) / n, 2)
  })

  test('la plaza: mercado en 1772 y 1843, jardín con estatua desde 1889, nada en 1578', () => {
    const { partes, nace } = hito('plaza-bolivar')
    const vida = (tipo) => partes.filter((p) => p.tipo === tipo).map((p) => [p.nace ?? nace, p.muere ?? 0])
    expect(nace).toBe(1)
    expect(vida('galeriasDeMercado')).toEqual([[1, 3]])
    expect(vida('puestos')).toEqual([[1, 3]])
    expect(vida('estatuaEcuestre')).toEqual([[3, 0]])
    expect(vida('verjaPerimetral')).toEqual([[3, 0]])
    expect(vida('terraza')).toEqual([[1, 3], [3, 4], [4, 0]])
  })
})

describe('validarHitos', () => {
  test('acepta una definición mínima', () => {
    expect(validarHitos([valido], PLANO)).toEqual([])
  })
  test.each([
    ['id repetido', [valido, valido], /repetido/],
    ['fuera de la hoja', [{ ...valido, x: -5 }], /fuera de la hoja/],
    ['sin fuente', [{ ...valido, fuente: '' }], /sin fuente/],
    ['sin lista de verificar', [{ ...valido, verificar: undefined }], /verificar/],
    ['eje nulo', [{ ...valido, eje: [0, 0] }], /eje/],
    ['muere antes de nacer', [{ ...valido, nace: 3, muere: 2 }], /vida inválida/],
    ['época que no existe', [{ ...valido, nace: 7 }], /vida inválida/],
    ['parte desconocida', [{ ...valido, partes: [{ tipo: 'platillo' }] }], /desconocido/],
    ['parte con nombre heredado de Object', [{ ...valido, partes: [{ tipo: 'constructor' }] }], /desconocido/],
    ['parte con vida inválida', [{ ...valido, partes: [{ tipo: 'faroles', nace: 4, muere: 4 }] }], /parte 0: vida inválida/],
    ['sin partes', [{ ...valido, partes: [] }], /sin partes/],
    ['polígono fuera de la hoja', [{ ...valido, suprime: [[[0, 0], [10, 0], [10, 99999]]] }], /polígono/],
    ['sin nombre', [{ ...valido, nombre: '' }], /sin nombre/],
  ])('rechaza: %s', (_, hitos, problema) => {
    expect(validarHitos(hitos, PLANO).join('\n')).toMatch(problema)
  })
})

describe('construirHitos', () => {
  const datos = construirHitos(HITOS, coords)
  const n = datos.posiciones.length / 3

  test('una sola geometría con todos los atributos del mismo largo y sin NaN', () => {
    expect(n).toBeGreaterThan(1000)
    expect(datos.normales.length).toBe(n * 3)
    expect(datos.colores.length).toBe(n * 3)
    expect(datos.hitos.length).toBe(n * 4)
    expect(datos.vidas.length).toBe(n * 2)
    expect(datos.anclas.length).toBe(n * 4)
    expect(datos.uvs.length).toBe(n * 2)
    expect(datos.indices.length % 3).toBe(0)
    expect(Math.max(...datos.indices.slice(0, 3000))).toBeLessThan(n)
    for (const a of [datos.posiciones, datos.normales, datos.colores, datos.anclas, datos.uvs]) expect(a.every(Number.isFinite)).toBe(true)
  })

  test('presupuesto: pocos triángulos para un solo draw call', () => {
    expect(construirHitos(HITOS.filter(h=>h.nace<6),coords).indices.length / 3).toBeLessThan(570_000) // Rotunda/solar: +23.872; total anterior a 1946: 561.916.
    expect(datos.indices.length / 3).toBeLessThan(1_050_000) // Concordia: +4.332; total: 1.041.289.
  })

  test('cada hito ocupa un rango de vértices y queda cerca de su lugar en el plano', () => {
    expect(datos.rangos.map((r) => r.id)).toEqual(HITOS.map((h) => h.id))
    for (const { id, desde, hasta } of datos.rangos) {
      const { x, z } = coords.aMundo(hito(id).x, hito(id).y)
      expect(hasta).toBeGreaterThan(desde)
      for (let i = desde; i < hasta; i += 97) {
        const radio=Math.max(160,...(hito(id).suprime??[]).flat().map(([px,py])=>{const v=coords.aMundo(px,py);return Math.hypot(v.x-x,v.z-z)+5}))
        expect(Math.hypot(datos.posiciones[i * 3] - x, datos.posiciones[i * 3 + 2] - z)).toBeLessThan(radio)
        expect(datos.posiciones[i * 3 + 1]).toBeLessThan(90)
      }
    }
  })

  test('la vida de cada vértice es una de las de su hito (nace, muere)', () => {
    const { desde, hasta } = datos.rangos.find((r) => r.id === 'plaza-bolivar')
    const vidas = new Set()
    for (let i = desde; i < hasta; i++) vidas.add(`${datos.vidas[i * 2]},${datos.vidas[i * 2 + 1]}`)
    expect([...vidas].sort()).toEqual(['1,3', '3,0', '3,4', '4,0'])
  })

  test('el ancla de cada vértice es el origen de su hito, y la distancia a la plaza, la del hito', () => {
    for (const { id, desde } of datos.rangos) {
      const { x, z } = coords.aMundo(hito(id).x, hito(id).y)
      const sigueSuelo=id==='silencio-urbanizacion'||id.startsWith('silencio-plaza-')
      expect(datos.anclas[desde * 4]).toBeCloseTo(sigueSuelo?datos.posiciones[desde*3]:x, 3)
      expect(datos.anclas[desde * 4 + 1]).toBeCloseTo(sigueSuelo?datos.posiciones[desde*3+2]:z, 3)
      expect(datos.hitos[desde * 4]).toBeCloseTo(Math.hypot(x, z), 3)
    }
  })

  test('un plano a otra escala es un error (las medidas están en metros sobre el mosaico de 0,5 m/px)', () => {
    expect(() => construirHitos(HITOS, crearCoords({ ...PLANO, metro: 1 }))).toThrow(/m\/px/)
  })

  test('una parte de tipo desconocido es un error', () => {
    expect(() => construirHitos([{ ...valido, partes: [{ tipo: 'platillo' }] }], coords)).toThrow(/desconocido/)
    expect(() => construirHitos([{ ...valido, partes: [{ tipo: 'constructor' }] }], coords)).toThrow(/desconocido/)
    expect(parteDe('toString')).toBeUndefined()
    expect(parteDe('faroles')).toBe(PARTES.faroles)
  })
})

describe('las partes', () => {
  const dibujar = (tipo, medidas) => {
    const lienzo = crearLienzo()
    PARTES[tipo](lienzo.hito({ origen: { x: 0, z: 0 } }), medidas)
    return { ...lienzo.datos(), vertices: lienzo.vertices }
  }
  const materiales = (d) => new Set([...d.hitos].filter((_, i) => i % 4 === 2))

  test('tramosSinHuecos: parte un lado dejando las entradas', () => {
    expect(tramosSinHuecos(-10, 10, [[0, 4]])).toEqual([[-10, -2], [2, 10]])
    expect(tramosSinHuecos(-10, 10)).toEqual([[-10, 10]])
    expect(tramosSinHuecos(-10, 10, [[8, 2], [-9, 2]])).toEqual([[-8, 7], [9, 10]])
    expect(tramosSinHuecos(-10, 10, [[0, 30]])).toEqual([])
  })

  test('azarDe: determinista y entre 0 y 1', () => {
    const [a, b] = [azarDe(7), azarDe(7)]
    const serie = Array.from({ length: 50 }, () => a())
    expect(serie).toEqual(Array.from({ length: 50 }, () => b()))
    expect(serie.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(new Set(serie).size).toBeGreaterThan(40)
  })

  test('terraza: la losa sigue el terreno vértice a vértice y lleva su piso', () => {
    const jardin = dibujar('terraza', { ancho: 40, fondo: 40, piso: 'damero' })
    expect(materiales(jardin)).toEqual(new Set([MAT.JARDIN, MAT.SILLAR]))
    for (let i = 0; i < 20; i++) {
      expect(jardin.anclas[i * 4 + 2]).toBeCloseTo(jardin.posiciones[i * 3])
      expect(jardin.anclas[i * 4 + 3]).toBeCloseTo(jardin.posiciones[i * 3 + 2])
    }
    expect([...jardin.colores.slice(0, 3)]).toEqual([20, 20, 1])
    expect(materiales(dibujar('terraza', { ancho: 40, fondo: 40 })).has(MAT.TIERRA)).toBe(true)
    expect(() => dibujar('terraza', { ancho: 40, fondo: 40, piso: 'mármol' })).toThrow(/piso/)
  })

  test('verja perimetral: con huecos tiene menos paños que sin ellos, y no sale del perímetro', () => {
    const entera = dibujar('verjaPerimetral', { ancho: 40, fondo: 30 })
    const abierta = dibujar('verjaPerimetral', { ancho: 40, fondo: 30, huecos: { sur: [[0, 10]], este: [[0, 6]] } })
    expect(abierta.vertices).toBeLessThan(entera.vertices)
    for (let i = 0; i < entera.vertices; i++) {
      expect(Math.abs(entera.posiciones[i * 3])).toBeLessThanOrEqual(20.001)
      expect(Math.abs(entera.posiciones[i * 3 + 2])).toBeLessThanOrEqual(15.001)
    }
    // en el hueco del sur no hay reja
    for (let i = 0; i < abierta.vertices; i++) {
      const [x, z] = [abierta.posiciones[i * 3], abierta.posiciones[i * 3 + 2]]
      if (z > 14.9) expect(Math.abs(x)).toBeGreaterThanOrEqual(4.999)
    }
  })

  test('escalinatas, faroles y estatua: cada objeto se apoya en el terreno de su lugar', () => {
    const e = dibujar('escalinatas', { en: [[0, 20, 0, 1, 8]], peldaños: 5 })
    expect(Math.max(...[...e.posiciones].filter((_, i) => i % 3 === 2))).toBeCloseTo(20 + 5 * 0.36)
    expect([e.anclas[2], e.anclas[3]]).toEqual([0, 20])
    const f = dibujar('faroles', { puntos: [[5, 5], [-7, 3]] })
    const apoyos = new Set()
    for (let i = 0; i < f.vertices; i++) apoyos.add(`${f.anclas[i * 4 + 2]},${f.anclas[i * 4 + 3]}`)
    expect([...apoyos].sort()).toEqual(['-7,3', '5,5'])
    // la estatua mirando al sur (+b): las manos del caballo quedan hacia +z
    const s = dibujar('estatuaEcuestre', { mira: [0, 1] })
    let adelante = 0
    for (let i = 0; i < s.vertices; i++) if (s.posiciones[i * 3 + 1] > 8.6) adelante += s.posiciones[i * 3 + 2]
    expect(adelante).toBeGreaterThan(0)
  })

  test('galerías del mercado: rodean la plaza sin salirse y dejan el centro libre', () => {
    const g = dibujar('galeriasDeMercado', { ancho: 86, fondo: 82 })
    let cerca = Infinity
    for (let i = 0; i < g.vertices; i++) {
      const [x, z] = [Math.abs(g.posiciones[i * 3]), Math.abs(g.posiciones[i * 3 + 2])]
      expect(x).toBeLessThan(43)
      expect(z).toBeLessThan(41)
      cerca = Math.min(cerca, Math.max(x / 43, z / 41))
    }
    expect(cerca).toBeGreaterThan(0.75)
  })

  test('puestos: hileras de toldos, siempre los mismos, con el pasillo del medio libre', () => {
    const a = dibujar('puestos', { ancho: 60, fondo: 50 })
    const b = dibujar('puestos', { ancho: 60, fondo: 50 })
    expect(a.vertices).toBeGreaterThan(1000)
    expect([...a.posiciones.slice(0, 300)]).toEqual([...b.posiciones.slice(0, 300)])
    expect(materiales(a).has(MAT.LONA)).toBe(true)
    // el pasillo (6 m) queda libre de toldos enteros, no solo de sus centros
    for (let i = 0; i < a.vertices; i++) expect(Math.abs(a.posiciones[i * 3])).toBeGreaterThan(3)
    const justo = dibujar('puestos', { ancho: 10, fondo: 20, paso: 4, pasillo: 6, falta: 0 })
    for (let i = 0; i < justo.vertices; i++) expect(Math.abs(justo.posiciones[i * 3])).toBeGreaterThan(3)
    expect(() => dibujar('puestos', { ancho: 60, fondo: 50, paso: 0 })).toThrow(/paso/)
  })
})

describe('rectanguloPx', () => {
  test('pasa de metros del marco a píxeles del plano, con el giro del eje', () => {
    expect(rectanguloPx({ x: 100, y: 200, eje: [1, 0] }, 10, 4)).toEqual([[90, 196], [110, 196], [110, 204], [90, 204]])
    const girado = rectanguloPx({ x: 100, y: 200, eje: [0, 3] }, 10, 4, 5, 0)
    expect(girado.map(([x, y]) => [Math.round(x), Math.round(y)])).toEqual([[104, 200], [104, 220], [96, 220], [96, 200]])
  })
})

describe('la malla', () => {
  const { U } = crearMaterialCiudad({ plano: PLANO, metro: PLANO.metro, mapa: null })

  test('crearHitos arma una Mesh "hitos" con sus atributos y comparte los uniforms de la ciudad', () => {
    const malla = crearHitos({ coords, U })
    expect(malla).toBeInstanceOf(Mesh)
    expect(malla.name).toBe('hitos')
    expect(malla.frustumCulled).toBe(false)
    for (const a of ['position', 'normal', 'aColor', 'aHito', 'aVida', 'aAncla', 'aUv']) expect(malla.geometry.attributes[a]).toBeDefined()
    expect(malla.geometry.attributes.aAncla.itemSize).toBe(4)
    for (const k of ['uOla', 'uColor', 'uEpocaDe', 'uEpocaA', 'uOlaEpoca', 'tRelieve', 'uExageracion']) expect(malla.material.uniforms[k]).toBe(U[k])
    expect(malla.userData.rangos.map((r) => r.id)).toEqual(HITOS.map((h) => h.id))
  }, 15000) // Ensambla también los siete bloques; CI comparte CPU entre suites.

  test('definiciones inválidas: no arma la malla y dice por qué', () => {
    expect(() => crearHitos({ hitos: [{ ...valido, fuente: '' }], coords, U })).toThrow(/sin fuente/)
  })

  test('geometriaHitos: esfera envolvente calculada', () => {
    const g = geometriaHitos(construirHitos([valido], coords))
    expect(g.boundingSphere.radius).toBeGreaterThan(0)
  })

  test('el hito va apenas sobre su piso: el suelo de una terraza, al ras, no parpadea con sus patios (z-fighting)', () => {
    expect(LEVANTE_M).toBeGreaterThan(0.05); expect(LEVANTE_M).toBeLessThan(0.3)
    expect(crearMaterialHitos({ U }).vertexShader).toContain(`float y = piso + ${LEVANTE_M.toFixed(2)} + position.y * sube * vExiste;`)
    // los pies bajan al mismo suelo que la ciudad: con sus terrazas
    expect(crearMaterialHitos({ U }).uniforms.uTerrazaMedida).toBe(U.uTerrazaMedida)
  })

  test('el material: los dos shaders usan lo que comparten y cada material tiene su rama', () => {
    const m = crearMaterialHitos({ U })
    expect(m.vertexShader).toContain('vivoEn(aVida, epocaAqui(aHito.x))')
    // anclado en una terraza, cada vértice sobre su plano (src/relieve.js); si no, el más alto de su ancla y su apoyo
    expect(m.vertexShader).toContain('float piso = pisoDeHito(aAncla.xy, aAncla.zw, position.xz);')
    expect(m.uniforms.uTerrazaPendiente).toBe(U.uTerrazaPendiente)
    for (const v of Object.values(MAT)) if (v > 0) expect(m.fragmentShader).toContain(`es(${v.toFixed(1)})`)
    expect(() => crearMaterialHitos({ U: {} })).toThrow(/uniforms/)
  })
})

describe('la supresión de las casas genéricas', () => {
  test('un techo en medio de la Plaza Bolívar no vive mientras la plaza es hito (desde 1772)', () => {
    const plaza = hito('plaza-bolivar')
    const casa = rectanguloPx(plaza, 10, 10).flat()
    const lejos = rectanguloPx({ ...plaza, x: plaza.x + 2000 }, 10, 10).flat()
    const vida = suprimirTechos({
      vertices: new Float32Array([...casa, ...lejos]), techos: new Uint32Array([0, 4, 1, 0, 4, 4, 1, 0]), vida: new Uint32Array([0, 0]),
    }, zonasDeSupresion(HITOS))
    expect([...vida]).toEqual([0 + 8 * 1, 0]) // vivía desde 1578: muere al nacer el hito, en 1772
  })
})
