import { describe, test, expect } from 'vitest'
import { crearLienzo, MAT } from '../../src/hitos/lienzo.js'
import * as piezas from '../../src/hitos/piezas.js'
import { farol, estatuaEcuestre, puesto, tramoDeGaleria, portada } from '../../src/hitos/objetos.js'

/** Dibuja con `fn` en un hito en el origen y devuelve sus datos con la caja que lo envuelve. */
function dibujar(fn) {
  const lienzo = crearLienzo()
  fn(lienzo.hito({ origen: { x: 0, z: 0 } }))
  const d = lienzo.datos()
  const caja = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
  for (let i = 0; i < d.posiciones.length; i++) {
    caja.min[i % 3] = Math.min(caja.min[i % 3], d.posiciones[i])
    caja.max[i % 3] = Math.max(caja.max[i % 3], d.posiciones[i])
  }
  const materiales = new Set()
  for (let i = 2; i < d.hitos.length; i += 4) materiales.add(d.hitos[i])
  return { ...d, caja, materiales, vertices: lienzo.vertices, triangulos: lienzo.triangulos }
}
const cerca = (a, b, tol = 0.02) => a.every((x, i) => Math.abs(x - b[i]) <= tol)
const sinNaN = (d) => d.posiciones.every(Number.isFinite) && d.normales.every(Number.isFinite)

describe('piezas básicas', () => {
  test('caja: apoyada en el piso, del tamaño pedido', () => {
    const d = dibujar((p) => piezas.caja(p, { ancho: 4, alto: 3, fondo: 2 }))
    expect(cerca(d.caja.min, [-2, 0, -1])).toBe(true)
    expect(cerca(d.caja.max, [2, 3, 1])).toBe(true)
    expect(d.triangulos).toBe(12)
  })

  test('tronco ochavado: caras hacia los ejes, alto y radios pedidos', () => {
    const d = dibujar((p) => piezas.tronco(p, { radio: 2, radioArriba: 1, alto: 5, lados: 8 }))
    expect(d.caja.max[1]).toBeCloseTo(5)
    // con el giro de medio lado, el ancho entre caras es 2·r·cos(π/8)
    expect(d.caja.max[0]).toBeCloseTo(2 * Math.cos(Math.PI / 8), 2)
  })

  test('cúpula: media naranja del radio y el alto pedidos, sin pie', () => {
    const d = dibujar((p) => piezas.cupula(p.en(0, 10, 0), { radio: 3, alto: 4 }))
    expect(d.caja.min[1]).toBeCloseTo(10)
    expect(d.caja.max[1]).toBeCloseTo(14)
    expect([...d.hitos].filter((_, i) => i % 4 === 3).every((pie) => pie === 0)).toBe(true)
  })

  test('barra: va de un punto al otro', () => {
    const d = dibujar((p) => piezas.barra(p, [1, 1, 1], [1, 4, 5], { radio: 0.1 }))
    expect(cerca(d.caja.min, [0.9, 0.9, 0.9], 0.12)).toBe(true)
    expect(cerca(d.caja.max, [1.1, 4.1, 5.1], 0.12)).toBe(true)
    expect(dibujar((p) => piezas.barra(p, [0, 0, 0], [0, 0, 0], { radio: 1 })).vertices).toBe(0)
  })

  test.each([
    ['dos', 2, 8.9, 1], ['cuatro', 2, 8.9, 0], ['una', 2, 8.9, 1],
  ])('tejado a %s aguas: alto pedido, alero volado y material de teja', (tipo, alto, anchoConAlero, hastiales) => {
    const d = dibujar((p) => piezas.tejado(p.en(0, 6, 0), { largo: 20, ancho: 8, alto, tipo }))
    // el alero baja siguiendo la pendiente: pasa por el borde de la pared a la altura del pintor
    expect(d.caja.min[1]).toBeCloseTo(tipo === 'una' ? 6 : 6 - alto * (0.45 / 4))
    expect(d.caja.max[1]).toBeCloseTo(6 + alto)
    expect(d.caja.max[2] - d.caja.min[2]).toBeCloseTo(anchoConAlero)
    expect(d.materiales.has(MAT.TEJA)).toBe(true)
    expect(d.materiales.has(MAT.LISO)).toBe(hastiales === 1)
    expect(sinNaN(d)).toBe(true)
  })

  test('tejado a dos aguas: el hastial llega a la cumbrera y el faldón pasa por el borde de la pared (sin rendija)', () => {
    const d = dibujar((p) => piezas.tejado(p, { largo: 10, ancho: 8, alto: 2, alero: 0.5 }))
    let hastial = 0
    for (let i = 0; i < d.vertices; i++) if (d.hitos[i * 4 + 2] === MAT.LISO) hastial = Math.max(hastial, d.posiciones[i * 3 + 1])
    expect(hastial).toBeCloseTo(2)
    // el faldón va de (z = 0, y = 2) a (z = 4,5, y = −0,25): en z = 4 (la pared) vale 0
    expect(d.caja.min[1]).toBeCloseTo(-0.25)
    expect(2 + ((d.caja.min[1] - 2) / 4.5) * 4).toBeCloseTo(0)
  })

  test('tejado a cuatro aguas de planta cuadrada: pirámide (cumbrera de largo cero) sin NaN', () => {
    const d = dibujar((p) => piezas.tejado(p, { largo: 6, ancho: 6, alto: 3, tipo: 'cuatro' }))
    expect(d.caja.max[1]).toBeCloseTo(3)
    expect(d.posiciones.every(Number.isFinite)).toBe(true)
  })

  test('cuerpo: paredes y tejado encima', () => {
    const d = dibujar((p) => piezas.cuerpo(p, { largo: 12, ancho: 6, alto: 5, altoTecho: 2 }))
    expect(d.caja.max[1]).toBeCloseTo(7)
    expect(d.materiales.has(MAT.TEJA)).toBe(true)
  })

  test('arquería: muro del largo y alto pedidos, calado (menos área que el muro lleno)', () => {
    const d = dibujar((p) => piezas.arqueria(p, { largo: 12, alto: 5, arcos: 4, luz: 2, altoArco: 3.6, espesor: 0.5 }))
    expect(cerca(d.caja.min, [0, 0, 0])).toBe(true)
    expect(cerca(d.caja.max, [12, 5, 0.5])).toBe(true)
    // el frente (normal +z): su área es la del muro menos la de los vanos
    let frente = 0
    for (let t = 0; t < d.indices.length; t += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => [0, 1, 2].map((j) => d.posiciones[d.indices[t + k] * 3 + j]))
      if (d.normales[d.indices[t] * 3 + 2] > 0.9) frente += Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
    }
    expect(frente).toBeLessThan(12 * 5 - 4 * 2 * 2.6)
    expect(frente).toBeGreaterThan(12 * 5 - 4 * 2 * 3.6)
  })

  test('arquería: si la luz no entra en el tramo, avisa', () => {
    expect(() => dibujar((p) => piezas.arqueria(p, { largo: 6, alto: 5, arcos: 3, luz: 2, altoArco: 3 }))).toThrow(/luz/)
  })

  test('vano y disco: calcomanías apenas delante del muro; el disco lleva uv de −1 a 1', () => {
    const v = dibujar((p) => piezas.vano(p, { ancho: 1.2, alto: 2.4 }))
    expect(cerca(v.caja.min, [-0.6, 0, 0.06])).toBe(true)
    expect(cerca(v.caja.max, [0.6, 2.4, 0.06])).toBe(true)
    const r = dibujar((p) => piezas.disco(p, { radio: 0.8, mat: MAT.RELOJ }))
    expect(Math.max(...r.uvs)).toBeCloseTo(1, 1)
    expect(Math.min(...r.uvs)).toBeCloseTo(-1, 1)
    expect(r.materiales.has(MAT.RELOJ)).toBe(true)
  })

  test('frontón triangular y de volutas: del ancho y alto pedidos, hacia atrás del plano', () => {
    for (const f of [piezas.fronton, piezas.frontonDeVolutas]) {
      const d = dibujar((p) => f(p, { ancho: 10, alto: 4, fondo: 0.6 }))
      expect(d.caja.max[1]).toBeCloseTo(4, 1)
      expect(d.caja.max[0] - d.caja.min[0]).toBeCloseTo(10, 1)
      expect(d.caja.min[2]).toBeCloseTo(-0.6)
      expect(sinNaN(d)).toBe(true)
    }
  })

  test('columna y cornisa', () => {
    const c = dibujar((p) => piezas.columna(p, { radio: 0.3, alto: 5 }))
    expect(c.caja.max[1]).toBeCloseTo(5)
    const k = dibujar((p) => piezas.cornisa(p.en(0, 4, 0), { largo: 10, ancho: 6, vuelo: 0.3 }))
    expect(k.caja.max[0] - k.caja.min[0]).toBeCloseTo(10.6)
  })

  test('escalinata: baja hacia +z, un peldaño por contrahuella, maciza bajo tierra', () => {
    const d = dibujar((p) => piezas.escalinata(p, { ancho: 8, peldaños: 9, huella: 0.36, contrahuella: 0.17 }))
    expect(d.caja.max[1]).toBeCloseTo(-0.17)
    expect(d.caja.max[2]).toBeCloseTo(9 * 0.36)
    expect(d.caja.min[1]).toBeLessThan(-4)
    expect(d.triangulos).toBe(9 * 12)
  })

  test('verja: un paño con uv en metros y material de reja, partido en tramos', () => {
    const d = dibujar((p) => piezas.verja(p, { largo: 9, alto: 1.2 }))
    expect(d.materiales).toEqual(new Set([MAT.VERJA]))
    expect(Math.max(...d.uvs)).toBeCloseTo(9)
    expect(d.triangulos).toBe(6)
  })

  test('losa y zócalo: la losa en cuadros con uv local; el zócalo baja hasta el pie', () => {
    const l = dibujar((p) => piezas.losa(p.en(0, 0.25, 0), { ancho: 40, fondo: 20, celda: 4, mat: MAT.JARDIN, color: [20, 10, 0] }))
    expect(l.triangulos).toBe(10 * 5 * 2)
    expect([...l.colores.slice(0, 3)]).toEqual([20, 10, 0])
    expect(Math.min(...l.uvs)).toBeCloseTo(-20)
    const z = dibujar((p) => piezas.zocalo(p, { ancho: 40, fondo: 20, alto: 0.25 }))
    const pies = [...z.hitos].filter((_, i) => i % 4 === 3)
    expect(pies.filter((x) => x === 1).length).toBe(pies.length / 2)
  })
})

describe('objetos de plaza', () => {
  test('farol de pie: unos 4 m con la linterna, con vidrio que da luz', () => {
    const d = dibujar((p) => farol(p, {}))
    expect(d.caja.max[1]).toBeGreaterThan(3.8)
    expect(d.caja.max[1]).toBeLessThan(4.8)
    expect(d.materiales.has(MAT.LUZ)).toBe(true)
  })

  test('farol de cuatro brazos: más alto y más ancho que el de pie, con cinco linternas', () => {
    const uno = dibujar((p) => farol(p, {}))
    const cuatro = dibujar((p) => farol(p, { brazos: 4 }))
    expect(cuatro.caja.max[1]).toBeGreaterThan(uno.caja.max[1] + 1)
    expect(cuatro.caja.max[0] - cuatro.caja.min[0]).toBeGreaterThan(1.3)
    const luces = (d) => [...d.hitos].filter((m, i) => i % 4 === 2 && m === MAT.LUZ).length
    expect(luces(cuatro)).toBe(5 * luces(uno))
  })

  test('estatua ecuestre: pedestal de ~4 m y la estatua otro tanto; el caballo mira a +x', () => {
    const d = dibujar((p) => estatuaEcuestre(p, {}))
    expect(d.caja.max[1]).toBeGreaterThan(8.5)
    expect(d.caja.max[1]).toBeLessThan(10.2)
    // las manos del caballo, al aire, quedan delante del centro
    let adelante = 0
    for (let i = 0; i < d.posiciones.length; i += 3) if (d.posiciones[i + 1] > 8.4) adelante += d.posiciones[i]
    expect(adelante).toBeGreaterThan(0)
    expect(sinNaN(d)).toBe(true)
  })

  test('puesto de mercado: toldo de lona sobre postes', () => {
    const d = dibujar((p) => puesto(p, {}))
    expect(d.materiales.has(MAT.LONA)).toBe(true)
    expect(d.caja.max[1]).toBeCloseTo(2.75)
  })

  test('tramo de galería y portada: la portada es más alta que la galería', () => {
    const g = dibujar((p) => tramoDeGaleria(p, { largo: 11, arcos: 4 }))
    const m = dibujar((p) => portada(p, {}))
    const e = dibujar((p) => portada(p, { ancho: 6.4, fondo: 6.4, caras: 4 }))
    expect(g.caja.max[0] - g.caja.min[0]).toBeCloseTo(11.36, 1)
    expect(m.caja.max[1]).toBeGreaterThan(g.caja.max[1] + 2)
    expect(e.triangulos).toBeGreaterThan(m.triangulos)
    expect(sinNaN(g) && sinNaN(m) && sinNaN(e)).toBe(true)
  })
})
