import { describe, it, expect, vi } from 'vitest'
import { partesDeCiudad, atenderPedido, pedirCiudad } from '../../src/ciudad-pedido.js'
import { empacarTecho, extruirTechos, transferiblesDe } from '../../src/ciudad.js'
import { crearCoords } from '../../src/coords.js'
import { seVeEntre } from '../../src/baldosas.js'

const plano = { ancho: 8000, alto: 8000, metro: 0.5, plaza: [4000, 4000] }
/** Una casa de 10 × 24 m con la esquina en (x, z) metros de la plaza. */
const casa = (x, z) => [x, z, x + 10, z, x + 10, z + 24, x, z + 24].map((m) => m / plano.metro + 4000)
// tres casas junto a la plaza (una baldosa) y una a 1,5 km (otra); la segunda muere en la época 3 y la tercera nace en la 4
const datos = {
  vertices: new Float32Array([...casa(0, 0), ...casa(10, 0), ...casa(20, 0), ...casa(1500, 40)]),
  techos: new Uint32Array([0, 1, 2, 3].flatMap((k) => [k * 4, 4, empacarTecho({ pisos: 1, estilo: 0 }), 5 + k])),
  vida: new Uint32Array([1, 1 + 8 * 3, 4, 1]),
}
const verticesDe = (mensajes) => mensajes.filter((m) => m.baldosa).reduce((s, m) => s + m.baldosa.paquete.atributos.position.length / 3, 0)
const enteros = extruirTechos(datos, crearCoords(plano)).posiciones.length / 3

/** Un worker de mentira: `conducta(t, pedido)` decide qué contesta cuando le llega el pedido. */
function trabajadorFalso(conducta) {
  const t = {
    terminado: false,
    terminate() { t.terminado = true },
    postMessage(pedido) { t.pedido = pedido; queueMicrotask(() => conducta(t, pedido)) },
  }
  return t
}
/** El worker de verdad, sin hilo: atiende el pedido y contesta por onmessage. */
const trabajadorQueAtiende = () => trabajadorFalso((t, pedido) => atenderPedido(pedido, (m) => t.terminado || t.onmessage({ data: m })))
const sinCeder = () => Promise.resolve()

describe('partesDeCiudad', () => {
  it('sin época primera: un pase, una baldosa por mensaje, las de la plaza primero, y toda la ciudad', () => {
    const mensajes = [...partesDeCiudad({ datos, plano })]
    expect(mensajes.map((m) => (m.baldosa ? `${m.baldosa.id}|${m.baldosa.pase}` : `fin ${m.finDePase}`))).toEqual(['0,0|0', '2,0|0', 'fin 0'])
    expect(verticesDe(mensajes)).toBe(enteros)
  })
  it('con época primera: primero lo que se ve en ella, después el resto; entre los dos pases, toda la ciudad', () => {
    const mensajes = [...partesDeCiudad({ datos, plano, primera: 1 })]
    expect(mensajes.map((m) => (m.baldosa ? `${m.baldosa.id}|${m.baldosa.pase}` : `fin ${m.finDePase}`))).toEqual(['0,0|0', '2,0|0', 'fin 0', '0,0|1', 'fin 1'])
    expect(verticesDe(mensajes)).toBe(enteros)
    for (const { baldosa } of mensajes.filter((m) => m.baldosa)) {
      for (const t of baldosa.tramos) expect(seVeEntre(t.nace, t.muere, 1, 1)).toBe(baldosa.pase === 0)
    }
  })
  it('cada baldosa trae sus tramos de vida, que cubren todos sus índices', () => {
    const [{ baldosa }] = [...partesDeCiudad({ datos, plano })]
    // la primera casa se parte en la época 3, cuando muere su vecina (cambia dónde puede volar su alero)
    expect(baldosa.tramos.map((t) => [t.nace, t.muere])).toEqual([[3, 0], [4, 0], [1, 3]])
    expect(baldosa.tramos.reduce((s, t) => s + t.cuantos, 0)).toBe(baldosa.paquete.indices.length)
    expect(baldosa.paquete.esfera.radio).toBeGreaterThan(5)
  })
  it('repartida en partes, cada baldosa le toca a una sola', () => {
    const partes = [0, 1].map((parte) => [...partesDeCiudad({ datos, plano, parte, de: 2 })])
    expect(partes.map((p) => p.filter((m) => m.baldosa).map((m) => m.baldosa.id))).toEqual([['0,0'], ['2,0']])
    expect(verticesDe(partes.flat())).toBe(enteros)
  })
})

describe('atenderPedido (del lado del worker)', () => {
  it('contesta cada baldosa transfiriendo sus búferes, los fines de pase y el fin', () => {
    const responder = vi.fn()
    atenderPedido({ datos, plano }, responder)
    const llamadas = responder.mock.calls
    expect(llamadas).toHaveLength(4)
    expect(llamadas[0][1]).toEqual(transferiblesDe(llamadas[0][0].baldosa.paquete))
    expect(llamadas[2]).toEqual([{ finDePase: 0 }, []])
    expect(llamadas[3]).toEqual([{ fin: true }])
  })
  it('si los datos no sirven, contesta el error en vez de caerse', () => {
    const responder = vi.fn()
    atenderPedido({ datos, plano: { ...plano, metro: 0 } }, responder)
    expect(responder).toHaveBeenCalledWith({ error: expect.stringMatching(/metro/) })
  })
})

describe('pedirCiudad (del lado de la página)', () => {
  it('reparte el pak entre los workers, entrega cada baldosa y los termina', async () => {
    const creados = []
    const llegadas = []
    const pases = []
    await pedirCiudad({
      datos, plano, primera: 1, cuantos: 2, crearTrabajador: () => { creados.push(trabajadorQueAtiende()); return creados.at(-1) },
      alLlegar: (b) => llegadas.push(b), alTerminarPase: (p) => pases.push(p),
    })
    expect(creados.map((t) => t.pedido)).toEqual([{ datos, plano, primera: 1, parte: 0, de: 2 }, { datos, plano, primera: 1, parte: 1, de: 2 }])
    expect(creados.every((t) => t.terminado)).toBe(true)
    expect(llegadas.map((b) => `${b.id}|${b.pase}`).sort()).toEqual(['0,0|0', '0,0|1', '2,0|0'])
    expect(verticesDe(llegadas.map((baldosa) => ({ baldosa })))).toBe(enteros)
    expect(pases).toEqual([0, 1]) // cada pase, una vez, cuando lo terminaron todas las partes
  })
  it('sin workers, todo en este hilo y sin avisar, cediendo entre baldosa y baldosa', async () => {
    const avisar = vi.fn()
    const ceder = vi.fn(sinCeder)
    const llegadas = []
    await pedirCiudad({ datos, plano, cuantos: 4, alLlegar: (b) => llegadas.push(b), avisar, ceder })
    expect(llegadas.map((b) => b.id)).toEqual(['0,0', '2,0'])
    expect(avisar).not.toHaveBeenCalled()
    expect(ceder).toHaveBeenCalledTimes(3)
  })
  it('si un worker no arranca, su parte se levanta en este hilo y avisa por qué', async () => {
    const avisar = vi.fn()
    const llegadas = []
    let n = 0
    const crearTrabajador = () => (n++ === 0 ? trabajadorQueAtiende() : trabajadorFalso((t) => t.onerror({ message: 'no cargó', preventDefault() {} })))
    await pedirCiudad({ datos, plano, cuantos: 2, crearTrabajador, alLlegar: (b) => llegadas.push(b), avisar, ceder: sinCeder })
    expect(llegadas.map((b) => b.id).sort()).toEqual(['0,0', '2,0'])
    expect(avisar).toHaveBeenCalledTimes(1)
    expect(avisar).toHaveBeenCalledWith(expect.stringContaining('no cargó'))
  })
  it('si se cae a medias, lo que ya había entregado no se repite', async () => {
    const llegadas = []
    const pases = []
    // entrega la primera baldosa y se cae
    const crearTrabajador = () => trabajadorFalso((t, pedido) => {
      const [primero] = [...partesDeCiudad(pedido)]
      t.onmessage({ data: primero })
      t.onerror({})
    })
    const avisar = vi.fn()
    await pedirCiudad({ datos, plano, crearTrabajador, alLlegar: (b) => llegadas.push(b), alTerminarPase: (p) => pases.push(p), avisar, ceder: sinCeder })
    expect(llegadas.map((b) => b.id)).toEqual(['0,0', '2,0'])
    expect(pases).toEqual([0])
    expect(avisar).toHaveBeenCalledWith(expect.stringContaining('el worker no arrancó'))
  })
  it('si no se puede ni crear el worker, también cae al respaldo', async () => {
    const avisar = vi.fn()
    const llegadas = []
    await pedirCiudad({ datos, plano, crearTrabajador: () => { throw new Error('bloqueado') }, alLlegar: (b) => llegadas.push(b), avisar, ceder: sinCeder })
    expect(llegadas).toHaveLength(2)
    expect(avisar).toHaveBeenCalledWith(expect.stringContaining('bloqueado'))
  })
  it('si el worker dice que los datos no sirven, falla (en este hilo fallaría igual)', async () => {
    const crearTrabajador = () => trabajadorFalso((t) => t.onmessage({ data: { error: 'pak roto' } }))
    await expect(pedirCiudad({ datos, plano, crearTrabajador, alLlegar() {} })).rejects.toThrow('pak roto')
  })
  it('sin workers y con datos que no sirven, falla', async () => {
    await expect(pedirCiudad({ datos, plano: { ...plano, metro: 0 }, alLlegar() {} })).rejects.toThrow(/metro/)
    const crearTrabajador = () => { throw new Error('bloqueado') }
    await expect(pedirCiudad({ datos, plano: { ...plano, metro: 0 }, crearTrabajador, alLlegar() {}, avisar() {} })).rejects.toThrow(/metro/)
  })
  it('por omisión cede el hilo con un temporizador', async () => {
    const llegadas = []
    await pedirCiudad({ datos, plano, alLlegar: (b) => llegadas.push(b) })
    expect(llegadas).toHaveLength(2)
  })
})
