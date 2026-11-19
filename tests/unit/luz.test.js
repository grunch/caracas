import { describe, test, expect } from 'vitest'
import {
  SOL, vectorSol, baseDeLuz, huellaDeVista, ajustarSombra, alcanceDeSombras, esRenderPorSoftware, ajustesDeAcabado,
  profundidadCruda, saltoDeProfundidad,
} from '../../src/luz.js'

const punto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const largo = (a) => Math.hypot(...a)

describe('el sol', () => {
  test('es un vector unitario hacia el sol: bajo (35° a 40°) y desde el suroeste', () => {
    const s = vectorSol()
    expect(largo(s)).toBeCloseTo(1, 9)
    expect(SOL.elevacion).toBeGreaterThanOrEqual(35)
    expect(SOL.elevacion).toBeLessThanOrEqual(40)
    expect(s[1]).toBeCloseTo(Math.sin((SOL.elevacion * Math.PI) / 180), 9)
    expect(s[0]).toBeLessThan(0) // desde el oeste (x crece al este)
    expect(s[2]).toBeGreaterThan(0) // y desde el sur (z crece al sur)
  })

  test('el azimut se mide desde el norte en el sentido del reloj', () => {
    expect(vectorSol({ azimut: 0, elevacion: 0 })).toEqual([0, 0, -1].map((v) => expect.closeTo(v, 9)))
    expect(vectorSol({ azimut: 90, elevacion: 0 })).toEqual([1, 0, 0].map((v) => expect.closeTo(v, 9)))
    expect(vectorSol({ azimut: 180, elevacion: 90 })).toEqual([0, 1, 0].map((v) => expect.closeTo(v, 9)))
  })

  test('va en diagonal a la cuadrícula: hay sombra en las calles de norte a sur y en las de este a oeste', () => {
    const [x, , z] = vectorSol()
    expect(Math.abs(x)).toBeGreaterThan(0.3)
    expect(Math.abs(z)).toBeGreaterThan(0.3)
  })

  test('los ejes de la luz son ortonormales, con z hacia el sol', () => {
    const b = baseDeLuz(vectorSol())
    for (const e of [b.x, b.y, b.z]) expect(largo(e)).toBeCloseTo(1, 9)
    expect(punto(b.x, b.y)).toBeCloseTo(0, 9)
    expect(punto(b.x, b.z)).toBeCloseTo(0, 9)
    expect(punto(b.y, b.z)).toBeCloseTo(0, 9)
    expect(b.z).toEqual(vectorSol().map((v) => expect.closeTo(v, 9)))
    expect(b.x[1]).toBeCloseTo(0, 9) // x horizontal: la sombra no gira
  })
})

describe('la huella de la vista', () => {
  // una cámara a 100 m de altura mirando recto hacia abajo (el norte arriba en la pantalla)
  const cenital = { ojo: [0, 100, 0], derecha: [1, 0, 0], arriba: [0, 0, -1], adelante: [0, -1, 0], fov: 90, aspecto: 2, ySuelo: 0, bajo: 0, alto: 50, alcance: 5000 }

  test('mirando hacia abajo, es el rectángulo que la pantalla corta en el suelo y el mismo, más chico, sobre los techos', () => {
    const p = huellaDeVista(cenital)
    expect(p).toHaveLength(8)
    const suelo = p.filter((q) => Math.abs(q[1]) < 1e-9)
    const techos = p.filter((q) => Math.abs(q[1] - 50) < 1e-9)
    expect(suelo).toHaveLength(4)
    expect(techos).toHaveLength(4)
    expect(Math.max(...suelo.map((q) => q[0]))).toBeCloseTo(200, 6) // tan(45°) × 2 de aspecto × 100 m
    expect(Math.max(...suelo.map((q) => q[2]))).toBeCloseTo(100, 6)
    expect(Math.max(...techos.map((q) => q[0]))).toBeCloseTo(100, 6)
  })

  test('los rayos que van al horizonte se cortan en el alcance', () => {
    const rasante = { ...cenital, ojo: [0, 10, 0], arriba: [0, 1, 0], adelante: [0, 0, -1], fov: 40, alcance: 600 }
    const p = huellaDeVista(rasante)
    for (const q of p) expect(Math.hypot(q[0], q[1] - 10, q[2])).toBeLessThanOrEqual(600 + 1e-6)
    // los de arriba de la pantalla no tocan el suelo: llegan justo hasta el alcance
    expect(Math.max(...p.map((q) => Math.hypot(q[0], q[1] - 10, q[2])))).toBeCloseTo(600, 6)
  })

  test('una cámara por debajo del plano de los techos no rompe nada (el rayo no sale hacia atrás)', () => {
    const p = huellaDeVista({ ...cenital, ojo: [0, 20, 0] })
    for (const q of p) for (const v of q) expect(Number.isFinite(v)).toBe(true)
    expect(p.filter((q) => q[1] === 20)).toHaveLength(4) // los cuatro del plano alto se quedan en el ojo
  })

  test('el alcance de las sombras crece con la distancia, entre un piso y un techo', () => {
    expect(alcanceDeSombras(10)).toBe(500)
    expect(alcanceDeSombras(500)).toBe(4000)
    expect(alcanceDeSombras(9000)).toBe(14000)
  })
})

describe('la caja del mapa de sombras', () => {
  const sol = vectorSol()
  const cuadrado = (cx, cz, r) => [[cx - r, 0, cz - r], [cx + r, 0, cz - r], [cx + r, 0, cz + r], [cx - r, 0, cz + r]]
  const aLuz = (p, base) => [punto(p, base.x), punto(p, base.y), punto(p, base.z)]
  const opciones = { sol, tamaño: 1024, yMin: -50, yMax: 200 }

  test('cubre todos los puntos de la vista, en x, y y profundidad', () => {
    const puntos = [...cuadrado(300, -200, 150), [300, 60, -200]]
    const c = ajustarSombra({ ...opciones, puntos })
    for (const p of puntos) {
      const [x, y, z] = aLuz(p, c.base)
      expect(x).toBeGreaterThan(c.izquierda)
      expect(x).toBeLessThan(c.derecha)
      expect(y).toBeGreaterThan(c.abajo)
      expect(y).toBeLessThan(c.arriba)
      expect(-z).toBeGreaterThan(c.cerca) // la cámara de sombras mira hacia −z
      expect(-z).toBeLessThan(c.lejos)
    }
  })

  test('la profundidad alcanza a todo lo que pueda tirar sombra dentro de la caja (de yMin a yMax)', () => {
    const c = ajustarSombra({ ...opciones, puntos: cuadrado(0, 0, 100) })
    for (const lx of [c.izquierda, c.derecha]) {
      for (const ly of [c.abajo, c.arriba]) {
        for (const y of [opciones.yMin, opciones.yMax]) {
          // el punto del mundo a altura y sobre el rayo de luz que pasa por (lx, ly)
          const t = (y - lx * c.base.x[1] - ly * c.base.y[1]) / c.base.z[1]
          expect(-t).toBeGreaterThan(c.cerca)
          expect(-t).toBeLessThan(c.lejos)
        }
      }
    }
  })

  test('con un mapa chico (texeles enormes) correr el centro a la grilla no deja ningún punto afuera', () => {
    // sin margen, y con el centro a medio texel de la grilla: lo peor que puede pasar
    for (const tamaño of [16, 64, 256]) {
      for (const corrimiento of [0, 13.7, 32.1, 101.9, 517.3]) {
        const puntos = cuadrado(corrimiento, -corrimiento, 8000)
        const c = ajustarSombra({ ...opciones, tamaño, margen: 0, puntos })
        for (const p of puntos) {
          const [x, y] = aLuz(p, c.base)
          expect(x).toBeGreaterThanOrEqual(c.izquierda)
          expect(x).toBeLessThanOrEqual(c.derecha)
          expect(y).toBeGreaterThanOrEqual(c.abajo)
          expect(y).toBeLessThanOrEqual(c.arriba)
        }
      }
    }
  })

  test('es cuadrada y su texel es el lado sobre el tamaño del mapa', () => {
    const c = ajustarSombra({ ...opciones, puntos: cuadrado(0, 0, 400) })
    expect(c.derecha - c.izquierda).toBeCloseTo(c.lado, 9)
    expect(c.arriba - c.abajo).toBeCloseTo(c.lado, 9)
    expect(c.texel).toBeCloseTo(c.lado / 1024, 12)
  })

  test('al mover la cámara un poco, la caja se corre de a texeles enteros y no cambia de tamaño (la sombra no titila)', () => {
    const a = ajustarSombra({ ...opciones, puntos: cuadrado(0, 0, 400) })
    const b = ajustarSombra({ ...opciones, puntos: cuadrado(3.37, -1.21, 400) })
    expect(b.lado).toBe(a.lado)
    for (const k of ['izquierda', 'abajo']) {
      const pasos = (b[k] - a[k]) / a.texel
      expect(Math.abs(pasos - Math.round(pasos))).toBeLessThan(1e-6)
    }
  })

  test('el lado sale de una escala fija: un zoom mínimo no cambia el texel', () => {
    const a = ajustarSombra({ ...opciones, puntos: cuadrado(0, 0, 400) })
    const b = ajustarSombra({ ...opciones, puntos: cuadrado(0, 0, 401) })
    const c = ajustarSombra({ ...opciones, puntos: cuadrado(0, 0, 1600) })
    expect(b.lado).toBe(a.lado)
    expect(c.lado).toBeGreaterThan(3 * a.lado)
  })

  test('no se sale de la hoja: una vista de todo el valle no gasta texeles fuera del plano', () => {
    const limite = { x0: -500, z0: -400, x1: 500, z1: 400 }
    const lejos = ajustarSombra({ ...opciones, puntos: cuadrado(0, 0, 20000), limite })
    const sinLimite = ajustarSombra({ ...opciones, puntos: cuadrado(0, 0, 20000) })
    expect(lejos.lado).toBeLessThan(sinLimite.lado / 8)
    // y lo que se ve de la hoja sigue adentro
    for (const p of cuadrado(0, 0, 390)) {
      const [x, y] = aLuz(p, lejos.base)
      expect(x).toBeGreaterThan(lejos.izquierda)
      expect(x).toBeLessThan(lejos.derecha)
      expect(y).toBeGreaterThan(lejos.abajo)
      expect(y).toBeLessThan(lejos.arriba)
    }
  })

  test('una vista que mira fuera de la hoja queda con la caja de la hoja (números finitos)', () => {
    const c = ajustarSombra({ ...opciones, puntos: cuadrado(90000, 90000, 100), limite: { x0: -500, z0: -400, x1: 500, z1: 400 } })
    for (const k of ['izquierda', 'derecha', 'abajo', 'arriba', 'cerca', 'lejos', 'texel']) expect(Number.isFinite(c[k])).toBe(true)
    expect(c.lado).toBeLessThan(4000)
  })
})

describe('qué se prende del acabado', () => {
  const con = (q, o = {}) => ajustesDeAcabado({ params: new URLSearchParams(q), ...o })

  test('por omisión: sombras de 4096, contorno y grano', () => {
    expect(con('')).toEqual({ sombras: 4096, contorno: true, grano: true })
  })

  test('en modo liviano el mapa de sombras es de 2048', () => {
    expect(con('', { liviano: true }).sombras).toBe(2048)
  })

  test('con render por software no hay sombras, salvo que la página las pida (así se prueban en CI)', () => {
    expect(con('', { software: true })).toEqual({ sombras: 0, contorno: true, grano: true })
    expect(con('sombras=512', { software: true }).sombras).toBe(512)
  })

  test('los parámetros apagan cada cosa', () => {
    expect(con('sombras=0').sombras).toBe(0)
    expect(con('contorno=0').contorno).toBe(false)
    expect(con('grano=0').grano).toBe(false)
  })

  test('el tamaño pedido se acota a lo que la GPU admite; lo que no es un número apaga las sombras', () => {
    expect(con('sombras=100').sombras).toBe(256)
    expect(con('sombras=99999', { maxTextura: 16384 }).sombras).toBe(8192)
    expect(con('sombras=8192', { maxTextura: 4096 }).sombras).toBe(4096)
    expect(con('sombras=si').sombras).toBe(0)
  })

  test('reconoce el render por software por el nombre del renderer', () => {
    expect(esRenderPorSoftware('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)')).toBe(true)
    expect(esRenderPorSoftware('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true)
    expect(esRenderPorSoftware('ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 2060/PCIe/SSE2, OpenGL ES 3.2)')).toBe(false)
    expect(esRenderPorSoftware(null)).toBe(false)
  })
})

describe('el contorno por profundidad', () => {
  const camara = { cerca: 5, lejos: 60000, radPorPixel: (2 * Math.tan((35 * Math.PI) / 360)) / 1000 }
  const cruda = (z) => profundidadCruda(z, camara.cerca, camara.lejos)

  test('la profundidad cruda va de 0 en el plano cercano a 1 en el lejano', () => {
    expect(cruda(5)).toBeCloseTo(0, 12)
    expect(cruda(60000)).toBeCloseTo(1, 12)
    expect(cruda(100)).toBeGreaterThan(cruda(50))
  })

  test('sobre un plano da cero, por más rasante que se lo mire', () => {
    // un plano visto de costado: en la pantalla, 1/z es lineal; tres píxeles seguidos
    const inversa = [1 / 80, 1 / 100, 2 / 100 - 1 / 80] // 1/z en progresión aritmética
    const [antes, centro, despues] = inversa.map((i) => cruda(1 / i))
    expect(Math.abs(saltoDeProfundidad({ antes, centro, despues }, camara))).toBeLessThan(1e-6)
  })

  test('en un escalón da su alto en píxeles: positivo en el píxel de adelante, negativo en el de atrás', () => {
    const pixel = 100 * camara.radPorPixel // lo que mide un píxel a 100 m
    // una silueta: a 100 m, y detrás algo 3 m más lejos
    const adelante = saltoDeProfundidad({ antes: cruda(100), centro: cruda(100), despues: cruda(103) }, camara)
    const atras = saltoDeProfundidad({ antes: cruda(100), centro: cruda(103), despues: cruda(103) }, camara)
    expect(adelante).toBeGreaterThan(0)
    expect(atras).toBeLessThan(0)
    expect(adelante).toBeCloseTo(3 / pixel, -1) // ~48 píxeles, con la curvatura de 1/z
    expect(adelante).toBeGreaterThan(20)
  })

  test('una arista saliente (una cumbrera, una esquina) da positivo y chico; una entrante, negativo', () => {
    const pixel = 100 * camara.radPorPixel
    // dos planos que se alejan un píxel de profundidad por píxel de pantalla a cada lado del centro
    const saliente = saltoDeProfundidad({ antes: cruda(100 + pixel), centro: cruda(100), despues: cruda(100 + pixel) }, camara)
    const entrante = saltoDeProfundidad({ antes: cruda(100 - pixel), centro: cruda(100), despues: cruda(100 - pixel) }, camara)
    expect(saliente).toBeCloseTo(2, 1)
    expect(entrante).toBeCloseTo(-2, 1)
  })
})
