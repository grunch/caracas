import { describe, test, expect } from 'vitest'
import { BoxGeometry } from 'three'
import { crearLienzo, matrizDeMarco, lineal, MAT } from '../../src/hitos/lienzo.js'

const cubo = () => new BoxGeometry(2, 2, 2).translate(0, 1, 0) // apoyado en y = 0
const de = (array, i, n) => [...array.slice(i * n, i * n + n)].map((x) => Math.round(x * 1000) / 1000)

describe('matrizDeMarco', () => {
  test('x local cae sobre el eje y z local a su derecha (al sur si el eje mira al este)', () => {
    const m = matrizDeMarco({ x: 10, z: 20 }, [0, 2]) // eje hacia +z (sur), sin normalizar
    const e = m.elements
    expect([e[0], e[1], e[2]].map(Math.round)).toEqual([0, 0, 1])
    expect([e[8], e[9], e[10]].map(Math.round)).toEqual([-1, 0, 0])
    expect([e[12], e[13], e[14]]).toEqual([10, 0, 20])
  })
  test('rechaza el eje nulo', () => {
    expect(() => matrizDeMarco({ x: 0, z: 0 }, [0, 0])).toThrow(/eje/)
  })
})

describe('lineal', () => {
  test('pasa el color sRGB a lineal y deja pasar los parámetros en array', () => {
    expect(lineal(0xffffff)).toEqual([1, 1, 1])
    expect(lineal(0x808080)[0]).toBeCloseTo(0.2159, 3)
    expect(lineal([43, 41, 1])).toEqual([43, 41, 1])
    // el color cacheado es de todos: no se puede cambiar
    expect(Object.isFrozen(lineal(0xffffff))).toBe(true)
  })
})

describe('crearLienzo', () => {
  test('un cubo: 24 vértices con todos sus atributos del mismo largo', () => {
    // Arrange
    const lienzo = crearLienzo()
    const p = lienzo.hito({ origen: { x: 30, z: 40 }, nace: 1, muere: 3, semilla: 5 })
    // Act
    p.geo(cubo(), { color: 0xffffff, mat: MAT.TEJA })
    const d = lienzo.datos()
    // Assert
    expect(lienzo.vertices).toBe(24)
    expect(lienzo.triangulos).toBe(12)
    expect(d.posiciones.length).toBe(24 * 3)
    expect(d.normales.length).toBe(24 * 3)
    expect(d.colores.length).toBe(24 * 3)
    expect(d.hitos.length).toBe(24 * 4)
    expect(d.vidas.length).toBe(24 * 2)
    expect(d.anclas.length).toBe(24 * 4)
    expect(d.uvs.length).toBe(24 * 2)
    expect(d.indices.length).toBe(36)
    expect(Math.max(...d.indices)).toBe(23)
  })

  test('cada vértice lleva la distancia de su hito a la plaza, la semilla, el material, la vida y el ancla', () => {
    const lienzo = crearLienzo()
    lienzo.hito({ origen: { x: 30, z: 40 }, nace: 1, muere: 3, semilla: 5 }).geo(cubo(), { mat: MAT.TEJA })
    const d = lienzo.datos()
    for (let i = 0; i < 24; i++) {
      expect(de(d.hitos, i, 4).slice(0, 3)).toEqual([50, 5, MAT.TEJA])
      expect(de(d.vidas, i, 2)).toEqual([1, 3])
      expect(de(d.anclas, i, 4)).toEqual([30, 40, 30, 40])
    }
  })

  test('los vértices del pie (y = 0) se marcan para bajar al terreno; los de arriba, no; "flota" los suelta', () => {
    const lienzo = crearLienzo()
    const p = lienzo.hito({ origen: { x: 0, z: 0 } })
    p.geo(cubo())
    p.geo(cubo(), { flota: true })
    const d = lienzo.datos()
    const pies = (desde) => Array.from({ length: 24 }, (_, i) => [d.posiciones[(desde + i) * 3 + 1], d.hitos[(desde + i) * 4 + 3]])
    expect(pies(0).every(([y, pie]) => pie === (y < 0.01 ? 1 : 0))).toBe(true)
    expect(pies(0).some(([, pie]) => pie === 1)).toBe(true)
    expect(pies(24).every(([, pie]) => pie === 0)).toBe(true)
  })

  test('en() corre y gira el marco; mirando() pone el frente (+z) hacia donde se le dice', () => {
    const lienzo = crearLienzo()
    const p = lienzo.hito({ origen: { x: 100, z: 0 } })
    const punta = new BoxGeometry(0.2, 0.2, 0.2).translate(0, 5, 3) // un punto delante (+z)
    p.mirando(10, 0, 0, 1, 0).geo(punta.clone())
    p.en(0, 2, 0, Math.PI).geo(punta)
    const d = lienzo.datos()
    const centro = (desde) => [0, 1, 2].map((c) => {
      let s = 0
      for (let i = desde; i < desde + 24; i++) s += d.posiciones[i * 3 + c]
      return Math.round((s / 24) * 100) / 100
    })
    expect(centro(0)).toEqual([113, 5, 0]) // 100 + 10 + 3 hacia +x
    expect(centro(24)).toEqual([100, 7, -3]) // media vuelta: el frente queda hacia −z
  })

  test('apoyado() fija el apoyo en el origen del pintor; siguiendo(), en cada vértice', () => {
    const lienzo = crearLienzo()
    const p = lienzo.hito({ origen: { x: 0, z: 0 } })
    p.en(8, 0, -6).apoyado().geo(cubo())
    p.en(20, 0, 0).siguiendo().geo(cubo())
    const d = lienzo.datos()
    for (let i = 0; i < 24; i++) expect(de(d.anclas, i, 4)).toEqual([0, 0, 8, -6])
    for (let i = 24; i < 48; i++) {
      expect(de(d.anclas, i, 4)).toEqual([0, 0, ...[d.posiciones[i * 3], d.posiciones[i * 3 + 2]].map((x) => Math.round(x * 1000) / 1000)])
    }
  })

  test('escalado() agranda parejo desde el origen del pintor', () => {
    const lienzo = crearLienzo()
    lienzo.hito({ origen: { x: 0, z: 0 } }).en(0, 10, 0).escalado(2).geo(cubo(), { flota: true })
    const ys = [...lienzo.datos().posiciones].filter((_, i) => i % 3 === 1)
    expect([Math.min(...ys), Math.max(...ys)]).toEqual([10, 14])
  })

  test('con() cambia la vida solo de lo que se dibuje con ese pintor', () => {
    const lienzo = crearLienzo()
    const p = lienzo.hito({ origen: { x: 0, z: 0 }, nace: 1 })
    p.con({ nace: 3, muere: 4 }).geo(cubo())
    p.con({}).geo(cubo())
    p.con({ nace: null, muere: undefined }).geo(cubo()) // null y undefined heredan, como en validarHitos
    p.con({ nace: 0 }).geo(cubo()) // el 0 explícito vale
    const d = lienzo.datos()
    expect(de(d.vidas, 0, 2)).toEqual([3, 4])
    expect(de(d.vidas, 24, 2)).toEqual([1, 0])
    expect(de(d.vidas, 48, 2)).toEqual([1, 0])
    expect(de(d.vidas, 72, 2)).toEqual([0, 0])
  })

  test('una geometría sin normales es un error', () => {
    const g = cubo()
    g.deleteAttribute('normal')
    expect(() => crearLienzo().hito({ origen: { x: 0, z: 0 } }).geo(g)).toThrow(/normal/)
  })
})
