import { describe, it, expect, vi } from 'vitest'
import { registrarServiceWorker, avisarLoBajado } from '../../src/registrar-sw.js'

const contenedorFalso = (registros = []) => ({ register: vi.fn(async () => ({})), getRegistrations: vi.fn(async () => registros) })
const params = (q = '') => new URLSearchParams(q)
const ALCANCE = 'https://grunch.github.io/caracas/'
const sinCaches = { keys: async () => [], delete: async () => true }

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
  it('con ?sinsw da de baja el de este sitio y no registra', async () => {
    const registros = [{ scope: ALCANCE, unregister: vi.fn(async () => true) }]
    const contenedor = contenedorFalso(registros)
    expect(await registrarServiceWorker({ contenedor, construido: true, params: params('sinsw'), alcance: ALCANCE, cachesDelSitio: sinCaches })).toBe('dado de baja')
    for (const r of registros) expect(r.unregister).toHaveBeenCalled()
    expect(contenedor.register).not.toHaveBeenCalled()
  })
  it('con ?sinsw deja en paz el worker de otro proyecto del mismo dominio (revisión de #178)', async () => {
    // en GitHub Pages, /caracas/ y /otro/ comparten origen: getRegistrations() devuelve los dos
    const nuestro = { scope: ALCANCE, unregister: vi.fn(async () => true) }
    const ajeno = { scope: 'https://grunch.github.io/otro/', unregister: vi.fn(async () => true) }
    const contenedor = contenedorFalso([nuestro, ajeno])
    await registrarServiceWorker({ contenedor, construido: true, params: params('sinsw'), alcance: ALCANCE, cachesDelSitio: sinCaches })
    expect(nuestro.unregister).toHaveBeenCalled()
    expect(ajeno.unregister).not.toHaveBeenCalled()
  })
  it('con ?sinsw y la página todavía en manos de un worker: borra sus cachés y recarga una vez, ya sin él (revisión de #178)', async () => {
    const contenedor = { ...contenedorFalso([{ scope: ALCANCE, unregister: vi.fn(async () => true) }]), controller: {} }
    const borradas = []
    const cachesDelSitio = { keys: async () => ['caracas-app-v1', 'caracas-datos-v1', 'otra'], delete: async (n) => borradas.push(n) }
    const recargar = vi.fn()
    expect(await registrarServiceWorker({ contenedor, construido: true, params: params('sinsw'), alcance: ALCANCE, cachesDelSitio, recargar })).toBe('recargando')
    expect(borradas).toEqual(['caracas-app-v1', 'caracas-datos-v1'])
    expect(recargar).toHaveBeenCalledTimes(1)
    // la vuelta ya trae la marca: no recarga de nuevo aunque algo siga controlando
    recargar.mockClear()
    expect(await registrarServiceWorker({ contenedor, construido: true, params: params('sinsw=recargado'), alcance: ALCANCE, cachesDelSitio, recargar })).toBe('dado de baja')
    expect(recargar).not.toHaveBeenCalled()
  })
  it('con ?sinsw y ningún worker controlando, no recarga', async () => {
    const recargar = vi.fn()
    const cachesDelSitio = { keys: async () => [], delete: async () => true }
    expect(await registrarServiceWorker({ contenedor: contenedorFalso(), construido: true, params: params('sinsw'), alcance: ALCANCE, cachesDelSitio, recargar })).toBe('dado de baja')
    expect(recargar).not.toHaveBeenCalled()
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
