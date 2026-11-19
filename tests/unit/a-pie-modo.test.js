import { describe, test, expect } from 'vitest'
import { PerspectiveCamera } from 'three'
import { crearModoAPie } from '../../src/a-pie-modo.js'

const cuadrado = (x, y, lado) => [x, y, x + lado, y, x + lado, y + lado, x, y + lado]
const datos = { vertices: Float32Array.from(cuadrado(0, 0, 10)), techos: Uint32Array.from([0, 4, 0, 0]), vida: Uint32Array.from([1]) }

function armar({ conCasas = true, dist = 300, x = 5, z = 20 } = {}) {
  const oyentes = {}
  const de = () => ({ addEventListener: (t, f) => { oyentes[t] = f }, setPointerCapture() {}, getBoundingClientRect: () => ({ width: 800, height: 600 }) })
  const ventana = de()
  const lienzo = { ...de(), addEventListener: (t, f) => { oyentes[`lienzo:${t}`] = f } }
  const pausas = []
  const cambios = []
  const camera = new PerspectiveCamera(35, 1, 5, 60000)
  const modo = crearModoAPie({
    camera, lienzo, ventana,
    cam: { now: { x, z, dist, yaw: 0 }, pausar: (v) => pausas.push(v) },
    coords: { aMundo: (px, py) => ({ x: px, z: py }) },
    suelo: () => 100, casas: () => (conCasas ? datos : null), epoca: () => 1, pedirCuadro: () => {},
    alCambiar: (v) => cambios.push(v),
  })
  const tecla = (tipo, code) => {
    const e = { code, target: null, prevenido: false, cortado: false, preventDefault() { this.prevenido = true }, stopImmediatePropagation() { this.cortado = true } }
    oyentes[tipo](e)
    return e
  }
  return { modo, camera, pausas, cambios, tecla, oyentes }
}

describe('crearModoAPie', () => {
  test('al entrar baja a la calle a la altura de los ojos, pausa el mapa y acerca el plano cercano de la cámara', () => {
    // Arrange
    const { modo, camera, pausas, cambios } = armar()

    // Act
    expect(modo.entrar()).toBe(true)

    // Assert
    expect(modo.activo).toBe(true)
    expect(modo.estado).toMatchObject({ x: 5, z: 20 })
    expect(camera.position.y).toBeCloseTo(101.6)
    expect(camera.near).toBe(0.1)
    expect(pausas).toEqual([true])
    expect(cambios).toEqual([true])
  })

  test('sin las casas todavía, no entra', () => {
    const { modo } = armar({ conCasas: false })
    expect(modo.entrar()).toBe(false)
    expect(modo.activo).toBe(false)
  })

  test('W camina hacia adelante y la casa lo detiene; las teclas no llegan a los atajos del mapa', () => {
    // Arrange: a 10 m al sur de la casa (que ocupa z de 0 a 10), mirando al norte
    const { modo, tecla } = armar()
    modo.entrar()

    // Act
    const e = tecla('keydown', 'KeyW')
    for (let i = 0; i < 400; i++) modo.update(0.02)

    // Assert
    expect(e).toMatchObject({ prevenido: true, cortado: true })
    expect(modo.estado.z).toBeGreaterThan(10)
    expect(modo.estado.z).toBeLessThan(11)
    tecla('keyup', 'KeyW')
    const quieto = modo.estado.z
    modo.update(1)
    expect(modo.estado.z).toBe(quieto)
  })

  test('Esc vuelve al mapa: la cámara recupera su plano cercano y el mapa su entrada', () => {
    const { modo, camera, pausas, cambios, tecla } = armar()
    modo.entrar()
    tecla('keydown', 'Escape')
    expect(modo.activo).toBe(false)
    expect(camera.near).toBe(5)
    expect(pausas).toEqual([true, false])
    expect(cambios).toEqual([true, false])
  })

  test('fuera del modo las teclas pasan de largo', () => {
    const { tecla } = armar()
    expect(tecla('keydown', 'KeyW')).toMatchObject({ prevenido: false, cortado: false })
  })

  test('arrastrar con el ratón mira alrededor', () => {
    const { modo, oyentes } = armar()
    modo.entrar()
    oyentes['lienzo:pointerdown']({ pointerId: 1, pointerType: 'mouse', clientX: 600, clientY: 300 })
    oyentes['lienzo:pointermove']({ pointerId: 1, clientX: 700, clientY: 250 })
    expect(modo.estado.rumbo).toBeGreaterThan(0)
    expect(modo.estado.mirada).toBeGreaterThan(0)
  })

  test('con los dedos, el de la mitad izquierda camina como un joystick', () => {
    const { modo, oyentes } = armar()
    modo.entrar()
    oyentes['lienzo:pointerdown']({ pointerId: 7, pointerType: 'touch', clientX: 100, clientY: 400 })
    oyentes['lienzo:pointermove']({ pointerId: 7, clientX: 100, clientY: 340 })
    modo.update(1)
    expect(modo.estado.z).toBeLessThan(20)
  })
})
