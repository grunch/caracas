import { describe, test, expect } from 'vitest'
import { PerspectiveCamera, Scene } from 'three'
import { crearModoManejar, crearVehiculo, crearSonido } from '../../src/manejar-modo.js'
import { VEHICULOS } from '../../src/manejar.js'
import { repartoDeSombra } from '../../src/acabado.js'
import { ACCIONES } from '../../src/controles.js'

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

function armar(epocaInicial = 4, ahora = { x: 5, z: 25, dist: 300, yaw: 0 }) {
  const oyentes = {}
  let epoca = epocaInicial
  const ctx = contextoFalso()
  const cambios = []
  const años = []
  const pausas = []
  const camera = new PerspectiveCamera(35, 1, 5, 60000)
  const escena = new Scene()
  const sonido = crearSonido(() => ctx)
  const modo = crearModoManejar({
    camera, escena, ventana: { addEventListener: (t, f) => { oyentes[t] = f } }, lienzo: { addEventListener: (t, f) => { oyentes[`lienzo:${t}`] = f } },
    cam: { now: ahora, pausar: (v) => pausas.push(v) },
    coords: { aMundo: (px, py) => ({ x: px, z: py }) }, suelo: () => 0, casas: () => datos, epoca: () => epoca,
    pedirCuadro: () => {}, cambiarEpoca: (d) => años.push(d), alCambiar: (dentro, v) => cambios.push([dentro, v?.id ?? null]),
    sonido,
  })
  const tecla = (tipo, code, target = null) => {
    const e = { code, target, repeat: false, prevenido: false, cortado: false, preventDefault() { this.prevenido = true }, stopImmediatePropagation() { this.cortado = true } }
    oyentes[tipo](e)
    return e
  }
  return { modo, camera, escena, ctx, sonido, cambios, años, pausas, tecla, ponerEpoca: (e) => { epoca = e } }
}

describe('crearVehiculo', () => {
  test('cada vehículo de la flota tiene su malla con sombra; los de tiro llevan su animal', () => {
    for (const v of VEHICULOS) {
      const g = crearVehiculo(v)
      expect(g.children.length, v.id).toBeGreaterThanOrEqual(4)
      expect(g.children.every((p) => p.castShadow)).toBe(true)
    }
  })

  test('tira sombra en el mapa de sombras propio (src/acabado.js): cada pieza con su customDepthMaterial', () => {
    for (const v of VEHICULOS) {
      const g = crearVehiculo(v)
      expect(g.children.every((p) => p.customDepthMaterial), v.id).toBe(true)
      expect(repartoDeSombra([g]).tiran.length, v.id).toBe(g.children.length)
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

  test('V cambia a la cabina (el vehículo no se ve); N cambia de vehículo; B toca la bocina; O apaga el sonido', () => {
    const { modo, tecla, ctx, cambios, sonido } = armar(4)
    modo.entrar()
    tecla('keydown', 'KeyV')
    expect(modo.vista).toBe('cabina')
    tecla('keydown', 'KeyN')
    expect(modo.vehiculo.id).toBe('carreta')
    expect(cambios.at(-1)).toEqual([true, 'carreta'])
    tecla('keydown', 'KeyB')
    expect(ctx.anotado.some((a) => a.startsWith('start:osc'))).toBe(true)
    expect(tecla('keydown', 'KeyO').cortado).toBe(true)
    expect(sonido.prendido).toBe(false)
  })

  test('los atajos del mapa con letra (C, H, M, P) no son del modo: siguen andando (src/controles.js)', () => {
    const { modo, tecla } = armar(4)
    modo.entrar()
    for (const a of ACCIONES.filter((x) => x.codigo?.startsWith('Key'))) {
      expect(tecla('keydown', a.codigo), a.codigo).toMatchObject({ prevenido: false, cortado: false })
    }
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

describe('crearModoManejar y la memoria de la GPU', () => {
  const espiar = (malla) => {
    const piezas = malla.children.map((p) => ({ geometria: 0, material: 0, p }))
    for (const x of piezas) {
      x.p.geometry.addEventListener('dispose', () => { x.geometria++ })
      x.p.material.addEventListener('dispose', () => { x.material++ })
    }
    return piezas
  }

  test('el vehículo que se saca (N, otra época o Esc) suelta sus geometrías; los materiales compartidos quedan', () => {
    // Arrange
    const { modo, tecla, escena, ponerEpoca } = armar(4)
    modo.entrar()
    const primero = espiar(escena.children[0])
    // Act: N cambia de vehículo
    tecla('keydown', 'KeyN')
    // Assert
    expect(primero.every((x) => x.geometria === 1)).toBe(true)
    expect(primero.every((x) => x.material === 0)).toBe(true)
    // Act: otra época cambia de vehículo
    const segundo = espiar(escena.children[0])
    ponerEpoca(2)
    modo.update(0.05)
    expect(segundo.every((x) => x.geometria === 1)).toBe(true)
    // Act: Esc se baja
    const tercero = espiar(escena.children[0])
    tecla('keydown', 'Escape')
    expect(tercero.every((x) => x.geometria === 1)).toBe(true)
    expect(escena.children.length).toBe(0)
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

describe('la huella del vehículo al subir y al cambiar de época', () => {
  // la casa de prueba ocupa x, z entre 0 y 10; la cola del vehículo (rumbo 0: mira a −z) queda hacia +z
  const colaAdentro = ({ x, z }, v) => x > 0 && x < 10 && z + v.largo / 2 > 0

  test('al subir, el Ford V8 de punta a la casa no queda con la cola adentro', () => {
    // Arrange: 1936; el mapa mira a 1,5 m de la casa
    const { modo } = armar(5, { x: 5, z: -1.5, dist: 300, yaw: 0 })
    // Act
    modo.entrar()
    // Assert
    expect(modo.vehiculo.id).toBe('ford-v8')
    expect(colaAdentro(modo.estado, modo.vehiculo)).toBe(false)
  })

  test('al cambiar de época a un vehículo más largo que no cabe donde estaba, lo corre a la calle libre', () => {
    // Arrange: el Ford T (3,4 m) cabe a 2 m de la casa
    const { modo, ponerEpoca } = armar(4, { x: 5, z: -2, dist: 300, yaw: 0 })
    modo.entrar()
    expect(modo.estado.z).toBe(-2)
    // Act: el año del Ford V8 (4,3 m)
    ponerEpoca(5)
    modo.update(0)
    // Assert
    expect(modo.vehiculo.id).toBe('ford-v8')
    expect(colaAdentro(modo.estado, modo.vehiculo)).toBe(false)
  })
})
