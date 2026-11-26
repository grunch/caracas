import { describe, it, expect, vi } from 'vitest'
import { datosDeHitos, atenderHitos, pedirHitos } from '../../src/hitos-pedido.js'
import { METRO } from '../../src/hitos/datos/marco.js'

const plano = { ancho: 18600, alto: 14800, metro: METRO, plaza: [8968.2, 6839] }
const referencia = datosDeHitos(plano)

function trabajadorFalso(conducta) {
  const t = { terminado: false, terminate() { t.terminado = true }, postMessage(p) { t.pedido = p; queueMicrotask(() => conducta(t, p)) } }
  return t
}

// cada test construye los hitos enteros una o dos veces (segundos en una máquina lenta, como la del CI)
describe('los hitos fuera del hilo de la página', { timeout: 60_000 }, () => {
  it('datosDeHitos arma los arrays de todos los hitos, con sus rangos', () => {
    expect(referencia.posiciones.length).toBeGreaterThan(1000)
    expect(referencia.rangos.length).toBeGreaterThan(10)
  })
  it('el worker contesta los datos y transfiere los búferes de sus arrays', () => {
    const responder = vi.fn()
    atenderHitos({ plano }, responder)
    const [mensaje, transferir] = responder.mock.calls[0]
    expect(mensaje.datos.rangos).toEqual(referencia.rangos)
    expect(transferir.length).toBeGreaterThanOrEqual(8)
    for (const b of transferir) expect(b).toBeInstanceOf(ArrayBuffer)
    expect(new Set(transferir).size).toBe(transferir.length)
  })
  it('si el plano no es el de los hitos, el worker contesta el error', () => {
    const responder = vi.fn()
    atenderHitos({ plano: { ...plano, metro: 1 } }, responder)
    expect(responder).toHaveBeenCalledWith({ error: expect.stringMatching(/hitos/) })
  })
  it('pedirHitos usa el worker y lo termina', async () => {
    let creado
    const datos = await pedirHitos({ plano, crearTrabajador: () => (creado = trabajadorFalso((t, p) => atenderHitos(p, (m) => t.onmessage({ data: m })))) })
    expect(creado.pedido).toEqual({ plano })
    expect(creado.terminado).toBe(true)
    expect(datos.posiciones).toEqual(referencia.posiciones)
  })
  it('sin worker los construye acá, sin avisar', async () => {
    const avisar = vi.fn()
    expect((await pedirHitos({ plano, avisar })).indices).toEqual(referencia.indices)
    expect(avisar).not.toHaveBeenCalled()
  })
  it('si el worker no arranca o no se puede crear, los construye acá y avisa', async () => {
    const avisar = vi.fn()
    await pedirHitos({ plano, crearTrabajador: () => trabajadorFalso((t) => t.onerror({ preventDefault() {} })), avisar })
    await pedirHitos({ plano, crearTrabajador: () => { throw new Error('bloqueado') }, avisar })
    expect(avisar.mock.calls.map(([m]) => m)).toEqual([expect.stringContaining('el worker no arrancó'), expect.stringContaining('bloqueado')])
  })
  it('un error de los datos falla, con worker o sin él', async () => {
    await expect(pedirHitos({ plano, crearTrabajador: () => trabajadorFalso((t) => t.onmessage({ data: { error: 'roto' } })) })).rejects.toThrow('roto')
    await expect(pedirHitos({ plano: { ...plano, metro: 1 } })).rejects.toThrow(/hitos/)
    await expect(pedirHitos({ plano: { ...plano, metro: 1 }, crearTrabajador: () => { throw new Error('x') }, avisar() {} })).rejects.toThrow(/hitos/)
  })
  it('por omisión avisa en la consola', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await pedirHitos({ plano, crearTrabajador: () => { throw new Error('x') } })
    expect(aviso).toHaveBeenCalled()
    aviso.mockRestore()
  })
})

it('El Silencio se construye aparte: ninguna carga de1945 en el arranque histórico',()=>{
 expect(referencia.rangos.some(r=>r.id.startsWith('silencio-'))).toBe(false)
 const futuro=datosDeHitos(plano,true)
 expect(futuro.rangos).toHaveLength(10)
 expect(futuro.rangos.every(r=>r.id.startsWith('silencio-'))).toBe(true)
 expect(futuro.indices.length/3).toBeLessThan(500_000)
},15000)
