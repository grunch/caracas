import { describe, test, expect } from 'vitest'
import { PerspectiveCamera, Scene } from 'three'
import { crearModoManejar, crearVehiculo, crearSonido } from '../../src/manejar-modo.js'
import { VEHICULOS } from '../../src/manejar.js'

/** Un AudioContext de mentira: anota qué se crea y qué se toca. */
function contextoFalso() {
  const anotado = []
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {} })
  const nodo = (tipo) => {
    const n = { tipo, frequency: param(), gain: param(), type: '', connect: (otro) => otro, start: () => anotado.push(`start:${tipo}:${n.type}`), stop: () => anotado.push(`stop:${tipo}`) }
    return n
  }
  return {
    anotado, sampleRate: 8000, currentTime: 0, destination: nodo('destino'),
    createOscillator: () => nodo('osc'), createGain: () => nodo('gain'), createBiquadFilter: () => nodo('filtro'),
    createBufferSource: () => nodo('ruido'), createBuffer: (c, n) => ({ getChannelData: () => new Float32Array(n) }),
    close: () => anotado.push('close'),
  }
}

const cuadrado = (x, y, lado) => [x, y, x + lado, y, x + lado, y + lado, x, y + lado]
const datos = { vertices: Float32Array.from(cuadrado(0, 0, 10)), techos: Uint32Array.from([0, 4, 0, 0]), vida: Uint32Array.from([1]) }

function armar(epocaInicial = 4) {
  const oyentes = {}
  let epoca = epocaInicial
  const ctx = contextoFalso()
  const cambios = []
  const años = []
  const pausas = []
  const camera = new PerspectiveCamera(35, 1, 5, 60000)
  const escena = new Scene()
  const modo = crearModoManejar({
    camera, escena, ventana: { addEventListener: (t, f) => { oyentes[t] = f } }, lienzo: { addEventListener: (t, f) => { oyentes[`lienzo:${t}`] = f } },
    cam: { now: { x: 5, z: 25, dist: 300, yaw: 0 }, pausar: (v) => pausas.push(v) },
    coords: { aMundo: (px, py) => ({ x: px, z: py }) }, suelo: () => 0, casas: () => datos, epoca: () => epoca,
    pedirCuadro: () => {}, cambiarEpoca: (d) => años.push(d), alCambiar: (dentro, v) => cambios.push([dentro, v?.id ?? null]),
    sonido: crearSonido(() => ctx),
  })
  const tecla = (tipo, code, target = null) => {
    const e = { code, target, repeat: false, prevenido: false, cortado: false, preventDefault() { this.prevenido = true }, stopImmediatePropagation() { this.cortado = true } }
    oyentes[tipo](e)
    return e
  }
  return { modo, camera, escena, ctx, cambios, años, pausas, tecla, ponerEpoca: (e) => { epoca = e } }
}

describe('crearVehiculo', () => {
  test('cada vehículo de la flota tiene su malla con sombra; los de tiro llevan su animal', () => {
    for (const v of VEHICULOS) {
      const g = crearVehiculo(v)
      expect(g.children.length, v.id).toBeGreaterThanOrEqual(4)
      expect(g.children.every((p) => p.castShadow)).toBe(true)
    }
  })
})

describe('crearModoManejar', () => {
  test('sube al vehículo de la época (1911: Ford T), pausa el mapa y la cámara va detrás', () => {
    const { modo, escena, cambios, pausas, camera } = armar(4)
    expect(modo.entrar()).toBe(true)
    expect(modo.vehiculo.id).toBe('ford-t')
    expect(escena.children.length).toBe(1)
    expect(cambios).toEqual([[true, 'ford-t']])
    expect(pausas).toEqual([true])
    expect(camera.position.z).toBeGreaterThan(modo.estado.z)
  })

  test('W acelera y el motor suena; contra la casa se detiene', () => {
    const { modo, tecla, ctx } = armar(4)
    modo.entrar()
    tecla('keydown', 'KeyW')
    for (let i = 0; i < 200; i++) modo.update(0.05)
    expect(ctx.anotado).toContain('start:osc:sawtooth')
    expect(modo.estado.z).toBeGreaterThan(10) // la casa ocupa z de 0 a 10
    expect(modo.estado.velocidad).toBe(0)
  })

  test('V cambia a la cabina (el vehículo no se ve); N cambia de vehículo; B toca la bocina; M apaga el sonido', () => {
    const { modo, tecla, ctx, cambios } = armar(4)
    modo.entrar()
    tecla('keydown', 'KeyV')
    expect(modo.vista).toBe('cabina')
    tecla('keydown', 'KeyN')
    expect(modo.vehiculo.id).toBe('carreta')
    expect(cambios.at(-1)).toEqual([true, 'carreta'])
    tecla('keydown', 'KeyB')
    expect(ctx.anotado.some((a) => a.startsWith('start:osc'))).toBe(true)
    const e = tecla('keydown', 'KeyM')
    expect(e.cortado).toBe(true) // la M no llega a «Nombres» del mapa
  })

  test('Q y E cambian el año; al cambiar la época, cambia al vehículo de ese año', () => {
    const { modo, tecla, años, ponerEpoca } = armar(4)
    modo.entrar()
    tecla('keydown', 'KeyQ')
    expect(años).toEqual([-1])
    ponerEpoca(2)
    modo.update(0.05)
    expect(modo.vehiculo.id).toBe('coche-de-caballos')
  })

  test('Esc vuelve al mapa: saca el vehículo, apaga el audio y devuelve la entrada a la cámara', () => {
    const { modo, tecla, escena, ctx, pausas, camera } = armar(4)
    modo.entrar()
    tecla('keydown', 'Escape')
    expect(modo.activo).toBe(false)
    expect(escena.children.length).toBe(0)
    expect(ctx.anotado).toContain('close')
    expect(pausas).toEqual([true, false])
    expect(camera.near).toBe(5)
  })

  test('los de tiro suenan con cascos al andar', () => {
    const { modo, tecla, ctx } = armar(2)
    modo.entrar()
    tecla('keydown', 'KeyW')
    for (let i = 0; i < 40; i++) modo.update(0.05)
    expect(ctx.anotado).toContain('start:ruido:')
  })
})

describe('crearModoManejar y los controles con foco', () => {
  test('Espacio sobre un botón con foco lo activa: el modo no se lo queda (el mismo criterio que a pie y en avión)', () => {
    const { modo, tecla } = armar(4)
    modo.entrar()
    const boton = { closest: (s) => (s.includes('button') ? {} : null) }
    expect(tecla('keydown', 'Space', boton)).toMatchObject({ prevenido: false, cortado: false })
  })
})
