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
