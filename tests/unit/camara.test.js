import { describe, test, expect } from 'vitest'
import { PerspectiveCamera } from 'three'
import { crearCamara } from '../../src/camara.js'

const lienzo = { addEventListener() {}, setPointerCapture() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }) }
const hoja = { x0: -1000, z0: -1000, ancho: 2000, alto: 2000 }

describe('crearCamara', () => {
  test('jump() pide cuadros: con el render quieto, si no, la vista no cambiaría', () => {
    const pedidos = []
    const cam = crearCamara(new PerspectiveCamera(), lienzo, { pedirCuadro: (n) => pedidos.push(n), hoja })
    pedidos.length = 0
    cam.jump({ x: 100, z: 50, dist: 600 })
    expect(pedidos.length).toBeGreaterThan(0)
    expect(cam.now).toMatchObject({ x: 100, z: 50, dist: 600 })
  })

  test('volar() cambia el destino sin saltar: la cámara llega animada, dentro de la hoja y de los límites', () => {
    // Arrange
    const pedidos = []
    const cam = crearCamara(new PerspectiveCamera(), lienzo, { pedirCuadro: (n) => pedidos.push(n), hoja })
    cam.jump({ x: 0, z: 0, dist: 2000 })
    pedidos.length = 0
    // Act
    cam.volar({ x: 5000, z: 50, dist: 1 })
    // Assert: el destino queda acotado; la vista todavía no se movió y hay cuadros pedidos
    expect(cam.goal).toMatchObject({ x: 1000, z: 50, dist: 40 })
    expect(cam.now).toMatchObject({ x: 0, z: 0, dist: 2000 })
    expect(pedidos.length).toBeGreaterThan(0)
    // y al avanzar el tiempo se acerca
    expect(cam.update(0.1)).toBe(true)
    expect(cam.now.x).toBeGreaterThan(0)
    for (let i = 0; i < 200; i++) cam.update(0.1)
    expect(cam.now.x).toBeCloseTo(1000, 1)
  })
})
