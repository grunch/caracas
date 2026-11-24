import { describe, it, expect, vi } from 'vitest'
import { registrarServiceWorker, avisarLoBajado } from '../../src/registrar-sw.js'

const contenedorFalso = (registros = []) => ({ register: vi.fn(async () => ({})), getRegistrations: vi.fn(async () => registros) })
const params = (q = '') => new URLSearchParams(q)

describe('registrarServiceWorker', () => {
  it('en el sitio construido registra sw.js, relativo a la página', async () => {
    const contenedor = contenedorFalso()
    expect(await registrarServiceWorker({ contenedor, construido: true, params: params() })).toBe('registrado')
    expect(contenedor.register).toHaveBeenCalledWith('sw.js')
  })
  it('en desarrollo no registra nada', async () => {
    const contenedor = contenedorFalso()
    expect(await registrarServiceWorker({ contenedor, construido: false, params: params() })).toBe('en desarrollo')
    expect(contenedor.register).not.toHaveBeenCalled()
  })
  it('sin soporte (un navegador viejo, http sin localhost) no hace nada', async () => {
    expect(await registrarServiceWorker({ contenedor: undefined, construido: true, params: params() })).toBe('sin soporte')
  })
  it('con ?sinsw da de baja los que hubiera y no registra', async () => {
    const registros = [{ unregister: vi.fn(async () => true) }, { unregister: vi.fn(async () => true) }]
    const contenedor = contenedorFalso(registros)
    expect(await registrarServiceWorker({ contenedor, construido: true, params: params('sinsw') })).toBe('dado de baja')
    for (const r of registros) expect(r.unregister).toHaveBeenCalled()
    expect(contenedor.register).not.toHaveBeenCalled()
  })
  it('si el registro falla, avisa y el sitio sigue', async () => {
    const avisar = vi.fn()
    const contenedor = { ...contenedorFalso(), register: async () => { throw new Error('bloqueado') } }
    expect(await registrarServiceWorker({ contenedor, construido: true, params: params(), avisar })).toBe('falló')
    expect(avisar).toHaveBeenCalledWith('service worker: bloqueado')
  })
  it('por omisión avisa en la consola', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await registrarServiceWorker({ contenedor: { register: async () => { throw new Error('x') } }, construido: true, params: params() })
    expect(aviso).toHaveBeenCalledWith('service worker: x')
    aviso.mockRestore()
  })
})

describe('avisarLoBajado', () => {
  it('le manda al service worker activo la lista, sin repetidos', async () => {
    const postMessage = vi.fn()
    expect(await avisarLoBajado({ ready: Promise.resolve({ active: { postMessage } }) }, ['a', 'b', 'a'])).toBe(true)
    expect(postMessage).toHaveBeenCalledWith({ guardar: ['a', 'b'] })
  })
  it('sin service worker activo no hace nada', async () => {
    expect(await avisarLoBajado(undefined, ['a'])).toBe(false)
    expect(await avisarLoBajado({ ready: Promise.resolve({ active: null }) }, ['a'])).toBe(false)
  })
})
