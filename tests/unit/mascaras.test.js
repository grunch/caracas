import { describe, it, expect, vi } from 'vitest'
import { crearMascara } from '../../src/mascaras.js'

/** Una máscara con cargas que se resuelven a mano: `llegar(url)` y `fallar(url)`. */
function montar() {
  const pendientes = new Map()
  const puestas = []
  const avisar = vi.fn()
  const cargar = vi.fn((url) => new Promise((ok, mal) => pendientes.set(url, { ok, mal })))
  const mascara = crearMascara({ nombre: 'suelo', chica: 'suelo-2k.webp', completa: 'suelo.webp', cargar, poner: (t) => puestas.push(t.url), avisar })
  const textura = (url) => ({ url, dispose: vi.fn() })
  const asentar = () => new Promise((ok) => setTimeout(ok))
  return {
    mascara, cargar, puestas, avisar,
    async llegar(url) { const t = textura(url); pendientes.get(url).ok(t); await asentar(); return t },
    async fallar(url) { pendientes.get(url).mal(new Error('se cortó')); await asentar() },
  }
}

describe('crearMascara', () => {
  it('pide la chica una sola vez y la pone al llegar', async () => {
    const m = montar()
    m.mascara.pedir()
    m.mascara.pedir()
    expect(m.cargar.mock.calls).toEqual([['suelo-2k.webp']])
    await m.llegar('suelo-2k.webp')
    expect(m.puestas).toEqual(['suelo-2k.webp'])
  })
  it('al mejorar pide la completa, que reemplaza a la chica', async () => {
    const m = montar()
    m.mascara.pedir()
    await m.llegar('suelo-2k.webp')
    m.mascara.mejorar()
    m.mascara.mejorar()
    expect(m.cargar.mock.calls).toEqual([['suelo-2k.webp'], ['suelo.webp']])
    await m.llegar('suelo.webp')
    expect(m.puestas).toEqual(['suelo-2k.webp', 'suelo.webp'])
  })
  it('si se mejora mientras baja la chica, la chica igual se pone al llegar: hasta que llegue la completa, es lo que hay', async () => {
    const m = montar()
    m.mascara.pedir()
    m.mascara.mejorar()
    await m.llegar('suelo-2k.webp')
    expect(m.puestas).toEqual(['suelo-2k.webp'])
    await m.llegar('suelo.webp')
    expect(m.puestas).toEqual(['suelo-2k.webp', 'suelo.webp'])
  })
  it('si la completa falla, la chica que llegó (antes o después) queda puesta', async () => {
    const m = montar()
    m.mascara.pedir()
    m.mascara.mejorar()
    await m.fallar('suelo.webp')
    await m.llegar('suelo-2k.webp')
    expect(m.puestas).toEqual(['suelo-2k.webp'])
    expect(m.avisar).toHaveBeenCalledWith('suelo: se cortó')
  })
  it('una chica que llega después de la completa se descarta', async () => {
    const m = montar()
    m.mascara.pedir()
    m.mascara.mejorar()
    await m.llegar('suelo.webp')
    const tardia = await m.llegar('suelo-2k.webp')
    expect(m.puestas).toEqual(['suelo.webp'])
    expect(tardia.dispose).toHaveBeenCalled()
  })
  it('mejorar antes de que nadie la pida no baja nada; cuando la pidan, será la completa', () => {
    const m = montar()
    m.mascara.mejorar()
    expect(m.cargar).not.toHaveBeenCalled()
    m.mascara.pedir()
    expect(m.cargar.mock.calls).toEqual([['suelo.webp']])
  })
  it('la que falla se puede volver a pedir', async () => {
    const m = montar()
    m.mascara.pedir()
    await m.fallar('suelo-2k.webp')
    m.mascara.pedir()
    expect(m.cargar).toHaveBeenCalledTimes(2)
    await m.llegar('suelo-2k.webp')
    expect(m.puestas).toEqual(['suelo-2k.webp'])
  })
  it('por omisión avisa en la consola', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const mascara = crearMascara({ nombre: 'suelo', chica: 'a', completa: 'b', cargar: async () => { throw new Error('x') }, poner() {} })
    mascara.pedir()
    await new Promise((ok) => setTimeout(ok))
    expect(aviso).toHaveBeenCalledWith('suelo: x')
    aviso.mockRestore()
  })
})
