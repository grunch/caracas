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
})
