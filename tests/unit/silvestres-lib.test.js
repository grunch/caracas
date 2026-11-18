import { describe, test, expect } from 'vitest'
import {
  azarDe, monteEnCrece, muereSilvestre, cercaDeOtro, arbolesSilvestres, CLASE,
} from '../../tools/silvestres-lib.mjs'
import { codificarArboles, desdeEnCrece } from '../../tools/arboles-lib.mjs'
import { decodificarArboles } from '../../src/arboles.js'

const comoArrayBuffer = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)

describe('arboles.bin con árboles silvestres', () => {
  test('ida y vuelta de nace, muere y silvestre en el cuarto u16 (nace + 8·muere + 64·silvestre)', () => {
    // Arrange
    const arboles = [
      { x: 10, y: 20, r: 8, nace: 3 }, // del plano: no muere
      { x: 30, y: 40, r: 6, nace: 0, muere: 2, silvestre: true },
      { x: 50, y: 60, r: 6, nace: 0, muere: 0, silvestre: true },
    ]
    // Act
    const buf = codificarArboles(arboles, 0.5)
    const d = decodificarArboles(comoArrayBuffer(buf))
    // Assert
    expect(buf.byteLength).toBe(24)
    expect(new DataView(comoArrayBuffer(buf)).getUint16(8 + 6, true)).toBe(0 + 8 * 2 + 64)
    expect([...d.nace]).toEqual([3, 0, 0])
    expect([...d.muere]).toEqual([0, 2, 0])
    expect([...d.silvestre]).toEqual([0, 1, 1])
  })

  test('rechaza una vida imposible: morir antes de nacer o épocas que no entran en 3 bits', () => {
    expect(() => codificarArboles([{ x: 1, y: 1, r: 5, nace: 3, muere: 2 }], 0.5)).toThrow(/vida/)
    expect(() => codificarArboles([{ x: 1, y: 1, r: 5, nace: 8 }], 0.5)).toThrow(/vida/)
  })
})

describe('crece.png: lo urbanizado (G) y el monte (B)', () => {
  // 2×1 celdas de 16 px, RGB: la primera edificada desde 2, urbanizada desde 1, monte 51/255
  const crece = { datos: new Uint8Array([170, 212, 51, 0, 0, 255]), cols: 2, rows: 1, canales: 3, celdaPx: 16, etapas: 6 }

  test('desdeEnCrece lee el canal que se le pide (R edificado, G urbanizado)', () => {
    expect(desdeEnCrece(crece, 3, 3)).toBe(2)
    expect(desdeEnCrece(crece, 3, 3, 1)).toBe(1)
    expect(desdeEnCrece(crece, 20, 3, 1)).toBe(Infinity)
  })

  test('monteEnCrece: la densidad 0–1 de la celda; fuera de la imagen, nada', () => {
    expect(monteEnCrece(crece, 3, 3)).toBeCloseTo(0.2, 5)
    expect(monteEnCrece(crece, 20, 3)).toBe(1)
    expect(monteEnCrece(crece, -1, 3)).toBe(0)
  })

  test('con una imagen de menos de 3 canales no hay monte', () => {
    expect(monteEnCrece({ ...crece, datos: new Uint8Array([170, 0]), canales: 1 }, 3, 3)).toBe(0)
  })
})

describe('muereSilvestre: hasta cuándo vive un árbol del monte', () => {
  test('donde la ciudad ya está en 1578 no hay monte', () => {
    expect(muereSilvestre({ urbano: 0, clase: CLASE.CERRO })).toBe(null)
  })
  test('muere cuando su lugar se urbaniza', () => {
    expect(muereSilvestre({ urbano: 3, clase: CLASE.EDIFICADO })).toBe(3)
  })
  test('fuera de la ciudad no muere nunca', () => {
    expect(muereSilvestre({ urbano: Infinity, clase: CLASE.CERRO })).toBe(0)
    expect(muereSilvestre({ urbano: Infinity, clase: CLASE.VERDE })).toBe(0)
  })
  test('lo que el plano de 1936 dibuja como sembradío, camino o casa suelta lo despeja en 1936', () => {
    for (const clase of [CLASE.CULTIVO, CLASE.CALLE, CLASE.PATIO, CLASE.EDIFICADO, CLASE.PUBLICO]) {
      expect(muereSilvestre({ urbano: Infinity, clase })).toBe(5)
    }
  })
  test('ni en el agua ni fuera del plano', () => {
    for (const clase of [CLASE.AGUA, CLASE.MARGEN, CLASE.DESCONOCIDO]) {
      expect(muereSilvestre({ urbano: Infinity, clase })).toBe(null)
      expect(muereSilvestre({ urbano: 2, clase })).toBe(null)
    }
  })
  test('sin la segmentación (clase desconocida de antemano) decide solo lo urbanizado', () => {
    expect(muereSilvestre({ urbano: 4, clase: undefined })).toBe(4)
    expect(muereSilvestre({ urbano: Infinity, clase: undefined })).toBe(0)
  })
})

describe('cercaDeOtro', () => {
  test('¿hay un árbol a menos de la distancia pedida?', () => {
    const cerca = cercaDeOtro([{ x: 100, y: 100 }, { x: 500, y: 100 }], 20)
    expect(cerca(110, 105)).toBe(true)
    expect(cerca(100, 121)).toBe(false)
    expect(cerca(481, 100)).toBe(true) // en la celda vecina de la grilla
    expect(cerca(300, 300)).toBe(false)
  })
})

describe('arbolesSilvestres', () => {
  const base = { ancho: 2000, alto: 1000, pasoPx: 20, semilla: 1578, radioPx: [3, 12], muere: () => 0, monte: () => 1 }

  test('azarDe es reproducible y uniforme en [0, 1)', () => {
    const [a, b] = [azarDe(7), azarDe(7)]
    const serie = Array.from({ length: 1000 }, () => a())
    expect(serie.slice(0, 5)).toEqual(Array.from({ length: 5 }, () => b()))
    expect(Math.min(...serie)).toBeGreaterThanOrEqual(0)
    expect(Math.max(...serie)).toBeLessThan(1)
    expect(serie.reduce((s, v) => s + v, 0) / 1000).toBeCloseTo(0.5, 1)
  })

  test('la misma semilla da los mismos árboles; otra, otros', () => {
    const a = arbolesSilvestres(base)
    expect(arbolesSilvestres(base)).toEqual(a)
    expect(arbolesSilvestres({ ...base, semilla: 2 })).not.toEqual(a)
  })

  test('con monte cerrado, un árbol por celda de la grilla, cada uno dentro de la suya y marcado silvestre', () => {
    const arboles = arbolesSilvestres(base)
    expect(arboles.length).toBe(100 * 50)
    for (const [k, a] of arboles.entries()) {
      const [j, i] = [k % 100, Math.floor(k / 100)]
      expect(Math.floor(a.x / 20)).toBe(j)
      expect(Math.floor(a.y / 20)).toBe(i)
      expect(a).toMatchObject({ nace: 0, muere: 0, silvestre: true })
      expect(a.r).toBeGreaterThanOrEqual(3)
      expect(a.r).toBeLessThanOrEqual(12)
    }
  })

  test('la densidad sigue al monte: sin monte no hay árboles y con poco, pocos', () => {
    // Arrange: mitad oeste con monte ralo, mitad este cerrado
    const monte = (x) => (x < 1000 ? 0.2 : 1)
    // Act
    const arboles = arbolesSilvestres({ ...base, monte })
    const oeste = arboles.filter((a) => a.x < 1000).length
    // Assert
    expect(arbolesSilvestres({ ...base, monte: () => 0 })).toEqual([])
    expect(arboles.length - oeste).toBe(2500)
    expect(oeste).toBeGreaterThan(2500 * 0.2 * 0.7)
    expect(oeste).toBeLessThan(2500 * 0.2 * 1.3)
  })

  test('cada árbol muere cuando dice su lugar, y donde no puede haber (null) no se planta', () => {
    const muere = (x, y) => (x < 500 ? null : y < 500 ? 2 : 0)
    const arboles = arbolesSilvestres({ ...base, muere })
    expect(arboles.some((a) => a.x < 500)).toBe(false)
    expect(arboles.filter((a) => a.y < 500).every((a) => a.muere === 2)).toBe(true)
    expect(arboles.filter((a) => a.y >= 500).every((a) => a.muere === 0)).toBe(true)
  })

  test('no pisa los árboles que ya están ni sale del marco', () => {
    const ocupado = (x) => x >= 1500
    const arboles = arbolesSilvestres({ ...base, ocupado, marco: [200, 100, 1800, 900] })
    expect(arboles.length).toBeGreaterThan(0)
    expect(arboles.every((a) => a.x >= 200 && a.x < 1500 && a.y >= 100 && a.y < 900)).toBe(true)
  })

  test('descartar un árbol no cambia los demás (el azar de cada celda es propio)', () => {
    const todos = arbolesSilvestres(base)
    const sinOeste = arbolesSilvestres({ ...base, muere: (x) => (x < 500 ? null : 0) })
    expect(sinOeste).toEqual(todos.filter((a) => a.x >= 500))
  })

  test('en el monte cerrado los árboles son más grandes que en el campo abierto', () => {
    const media = (v) => v.reduce((s, a) => s + a.r, 0) / v.length
    const ralo = arbolesSilvestres({ ...base, monte: () => 0.3 })
    expect(media(arbolesSilvestres(base))).toBeGreaterThan(media(ralo) + 0.5)
  })

  test('`ralo` baja la densidad lejos del centro sin tocar el monte', () => {
    const arboles = arbolesSilvestres({ ...base, ralo: (x) => (x < 1000 ? 1 : 0.25) })
    const este = arboles.filter((a) => a.x >= 1000).length
    expect(arboles.length - este).toBe(2500)
    expect(este).toBeGreaterThan(2500 * 0.25 * 0.7)
    expect(este).toBeLessThan(2500 * 0.25 * 1.3)
  })
})
