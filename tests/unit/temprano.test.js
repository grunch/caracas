import { describe, it, expect, vi } from 'vitest'
import { pedirDato } from '../../src/temprano.js'

describe('pedirDato', () => {
  it('usa el pedido temprano una sola vez; después pide de nuevo', async () => {
    const tempranos = { 'datos/ciudad.pak': Promise.resolve('temprano') }
    const pedir = vi.fn(async () => 'nuevo')
    expect(await pedirDato('datos/ciudad.pak', { tempranos, pedir })).toBe('temprano')
    expect(pedir).not.toHaveBeenCalled()
    expect(await pedirDato('datos/ciudad.pak', { tempranos, pedir })).toBe('nuevo')
    expect(pedir).toHaveBeenCalledWith('datos/ciudad.pak')
  })
  it('sin pedido temprano (o sin la tabla), pide ahora', async () => {
    const pedir = vi.fn(async (u) => `nuevo ${u}`)
    expect(await pedirDato('datos/relieve.bin', { tempranos: {}, pedir })).toBe('nuevo datos/relieve.bin')
    expect(await pedirDato('datos/relieve.bin', { tempranos: undefined, pedir })).toBe('nuevo datos/relieve.bin')
  })
  it('si el pedido temprano falló, lo intenta de nuevo', async () => {
    const fallido = Promise.reject(new Error('red'))
    const pedir = vi.fn(async () => 'nuevo')
    expect(await pedirDato('datos/crece.json', { tempranos: { 'datos/crece.json': fallido }, pedir })).toBe('nuevo')
  })
  it('si el servidor respondió con un error pasajero (5xx), pide una vez más (revisión de #177)', async () => {
    // fetch no rechaza ante un 503: la respuesta llega con su estado y hay que mirarlo
    const tempranos = { 'datos/ciudad.json': Promise.resolve({ ok: false, status: 503 }) }
    const pedir = vi.fn(async () => ({ ok: true, status: 200 }))
    expect(await pedirDato('datos/ciudad.json', { tempranos, pedir })).toEqual({ ok: true, status: 200 })
    expect(pedir).toHaveBeenCalledTimes(1)
  })
  it('un 4xx no se reintenta: lo que no está no va a aparecer', async () => {
    const no = { ok: false, status: 404 }
    const pedir = vi.fn()
    expect(await pedirDato('datos/crece.json', { tempranos: { 'datos/crece.json': Promise.resolve(no) }, pedir })).toBe(no)
    expect(pedir).not.toHaveBeenCalled()
  })
  it('por omisión mira la tabla global y pide con fetch', async () => {
    globalThis.__temprano = { a: Promise.resolve('de la tabla') }
    expect(await pedirDato('a')).toBe('de la tabla')
    delete globalThis.__temprano
    const fetchFalso = vi.fn(async () => 'con fetch')
    vi.stubGlobal('fetch', fetchFalso)
    expect(await pedirDato('b')).toBe('con fetch')
    vi.unstubAllGlobals()
  })
})
