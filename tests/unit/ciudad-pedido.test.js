import { describe, it, expect, vi } from 'vitest'
import { paqueteDeCiudad, atenderPedido, pedirCiudad } from '../../src/ciudad-pedido.js'
import { empacarTecho, transferiblesDe } from '../../src/ciudad.js'

const plano = { ancho: 200, alto: 200, metro: 0.5, plaza: [100, 100] }
/** Dos casas de 10 × 24 m, en píxeles del plano. */
const datos = {
  vertices: new Float32Array([0, 0, 20, 0, 20, 48, 0, 48, 20, 0, 40, 0, 40, 48, 20, 48]),
  techos: new Uint32Array([0, 4, empacarTecho({ pisos: 1, estilo: 0 }), 5, 4, 4, empacarTecho({ pisos: 2, estilo: 1 }), 6]),
  vida: new Uint32Array([1, 1]),
}

/** Un worker de mentira: contesta lo que diga `conducta` cuando le llega el pedido. */
function trabajadorFalso(conducta) {
  const t = {
    terminado: false,
    terminate() { t.terminado = true },
    postMessage(pedido) { t.pedido = pedido; queueMicrotask(() => conducta(t, pedido)) },
  }
  return t
}

describe('paqueteDeCiudad', () => {
  it('levanta las casas del pak con las coordenadas del plano', () => {
    const p = paqueteDeCiudad(datos, plano)
    expect(p.atributos.position.length).toBeGreaterThan(0)
    expect(p.atributos.position.length / 3).toBe(p.atributos.aVida.length / 2)
    expect(p.esfera.radio).toBeGreaterThan(5)
  })
})

describe('atenderPedido (del lado del worker)', () => {
  it('contesta el paquete y transfiere sus búferes', () => {
    const responder = vi.fn()
    atenderPedido({ datos, plano }, responder)
    const [mensaje, transferir] = responder.mock.calls[0]
    expect(mensaje.paquete.atributos.position).toEqual(paqueteDeCiudad(datos, plano).atributos.position)
    expect(transferir).toEqual(transferiblesDe(mensaje.paquete))
  })
  it('si los datos no sirven, contesta el error en vez de caerse', () => {
    const responder = vi.fn()
    atenderPedido({ datos, plano: { ...plano, metro: 0 } }, responder)
    expect(responder).toHaveBeenCalledWith({ error: expect.stringMatching(/metro/) })
  })
})

describe('pedirCiudad (del lado de la página)', () => {
  it('manda el pak al worker, devuelve su paquete y lo termina', async () => {
    let creado = null
    const crearTrabajador = () => (creado = trabajadorFalso((t, pedido) => atenderPedido(pedido, (m) => t.onmessage({ data: m }))))
    const p = await pedirCiudad({ datos, plano, crearTrabajador })
    expect(creado.pedido).toEqual({ datos, plano })
    expect(p.atributos.position).toEqual(paqueteDeCiudad(datos, plano).atributos.position)
    expect(creado.terminado).toBe(true)
  })
  it('sin worker, las levanta en este hilo sin avisar', async () => {
    const avisar = vi.fn()
    const p = await pedirCiudad({ datos, plano, avisar })
    expect(p.atributos.position.length).toBeGreaterThan(0)
    expect(avisar).not.toHaveBeenCalled()
  })
  it('si el worker no arranca, las levanta en este hilo y avisa por qué', async () => {
    const avisar = vi.fn()
    let creado = null
    const crearTrabajador = () => (creado = trabajadorFalso((t) => t.onerror({ message: 'no cargó', preventDefault() {} })))
    const p = await pedirCiudad({ datos, plano, crearTrabajador, avisar })
    expect(p.atributos.position.length).toBeGreaterThan(0)
    expect(avisar).toHaveBeenCalledWith(expect.stringContaining('no cargó'))
    expect(creado.terminado).toBe(true)
  })
  it('si no se puede ni crear el worker, también', async () => {
    const avisar = vi.fn()
    const p = await pedirCiudad({ datos, plano, crearTrabajador: () => { throw new Error('bloqueado') }, avisar })
    expect(p.atributos.position.length).toBeGreaterThan(0)
    expect(avisar).toHaveBeenCalledWith(expect.stringContaining('bloqueado'))
  })
  it('un error del worker sin mensaje igual cae al respaldo', async () => {
    const avisar = vi.fn()
    await pedirCiudad({ datos, plano, crearTrabajador: () => trabajadorFalso((t) => t.onerror({})), avisar })
    expect(avisar).toHaveBeenCalledWith(expect.stringContaining('el worker no arrancó'))
  })
  it('si el worker dice que los datos no sirven, falla (en este hilo fallaría igual)', async () => {
    const crearTrabajador = () => trabajadorFalso((t) => t.onmessage({ data: { error: 'pak roto' } }))
    await expect(pedirCiudad({ datos, plano, crearTrabajador })).rejects.toThrow('pak roto')
  })
  it('sin worker y con datos que no sirven, falla', async () => {
    await expect(pedirCiudad({ datos, plano: { ...plano, metro: 0 } })).rejects.toThrow(/metro/)
    const crearTrabajador = () => { throw new Error('bloqueado') }
    await expect(pedirCiudad({ datos, plano: { ...plano, metro: 0 }, crearTrabajador, avisar() {} })).rejects.toThrow(/metro/)
  })
})
