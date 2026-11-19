import { describe, test, expect } from 'vitest'
import { PerspectiveCamera, Scene } from 'three'
import { crearModoVolar, crearAvion } from '../../src/volar-modo.js'

const hoja = { x0: -5000, z0: -5000, ancho: 10000, alto: 10000 }

function armar() {
  const oyentes = {}
  const ventana = { addEventListener: (t, f) => { oyentes[t] = f } }
  const lienzo = { addEventListener: (t, f) => { oyentes[`lienzo:${t}`] = f } }
  const pausas = []
  const años = []
  const cambios = []
  const camera = new PerspectiveCamera(35, 1, 5, 60000)
  const escena = new Scene()
  const modo = crearModoVolar({
    camera, lienzo, ventana, escena, hoja,
    cam: { now: { x: 0, z: 0, dist: 1000, yaw: 0 }, pausar: (v) => pausas.push(v) },
    suelo: () => 50, pedirCuadro: () => {}, cambiarEpoca: (d) => años.push(d), alCambiar: (v) => cambios.push(v),
  })
  const tecla = (tipo, code, extra = {}) => {
    const e = { code, target: null, repeat: false, prevenido: false, cortado: false, preventDefault() { this.prevenido = true }, stopImmediatePropagation() { this.cortado = true }, ...extra }
    oyentes[tipo](e)
    return e
  }
  return { modo, camera, escena, pausas, años, cambios, tecla, oyentes }
}

describe('crearAvion', () => {
  test('es un grupo de piezas que tiran sombra, oculto hasta que se vuela', () => {
    const avion = crearAvion()
    expect(avion.children.length).toBeGreaterThanOrEqual(4)
    expect(avion.children.every((p) => p.castShadow)).toBe(true)
    expect(avion.visible).toBe(false)
  })
})

describe('crearModoVolar', () => {
  test('al entrar despega a 300 m del suelo, muestra el avión, pausa el mapa y la cámara lo sigue de atrás', () => {
    const { modo, camera, pausas, cambios } = armar()
    modo.entrar()
    expect(modo.activo).toBe(true)
    expect(modo.altura).toBe(300)
    expect(modo.avion.visible).toBe(true)
    expect(camera.position.z).toBeGreaterThan(modo.estado.z)
    expect(pausas).toEqual([true])
    expect(cambios).toEqual([true])
  })

  test('vuela solo hacia adelante; D gira a la derecha; W sube', () => {
    const { modo, tecla } = armar()
    modo.entrar()
    modo.update(1)
    expect(modo.estado.z).toBeLessThan(0)
    tecla('keydown', 'KeyD')
    tecla('keydown', 'KeyW')
    modo.update(1)
    expect(modo.estado.rumbo).toBeGreaterThan(0)
    expect(modo.altura).toBeGreaterThan(300)
  })

  test('Q y E cambian el año (una vez por toque) y no llegan a los atajos del mapa', () => {
    const { modo, años, tecla } = armar()
    modo.entrar()
    const e = tecla('keydown', 'KeyE')
    tecla('keydown', 'KeyE', { repeat: true })
    tecla('keydown', 'KeyQ')
    expect(años).toEqual([1, -1])
    expect(e).toMatchObject({ prevenido: true, cortado: true })
  })

  test('Esc vuelve al mapa: esconde el avión y devuelve la entrada a la cámara', () => {
    const { modo, pausas, cambios, tecla, camera } = armar()
    modo.entrar()
    tecla('keydown', 'Escape')
    expect(modo.activo).toBe(false)
    expect(modo.avion.visible).toBe(false)
    expect(camera.fov).toBe(35)
    expect(pausas).toEqual([true, false])
    expect(cambios).toEqual([true, false])
  })

  test('con un dedo, el joystick gira y sube', () => {
    const { modo, oyentes } = armar()
    modo.entrar()
    oyentes['lienzo:pointerdown']({ pointerId: 3, pointerType: 'touch', clientX: 200, clientY: 300 })
    oyentes['lienzo:pointermove']({ pointerId: 3, clientX: 252, clientY: 248 })
    modo.update(1)
    expect(modo.estado.rumbo).toBeGreaterThan(0)
    expect(modo.altura).toBeGreaterThan(300)
  })

  test('fuera del modo no hace nada', () => {
    const { modo, tecla } = armar()
    expect(tecla('keydown', 'KeyE')).toMatchObject({ prevenido: false })
    expect(modo.update(1)).toBe(false)
  })
})
