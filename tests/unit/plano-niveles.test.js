import { describe, it, expect, vi } from 'vitest'
import { NIVELES, NIVEL_CHICO, NIVEL_4K, nivelNecesario, crearPlanoPorNiveles } from '../../src/plano-niveles.js'

describe('nivelNecesario', () => {
  // la hoja de Caracas (9300 m de ancho) en una ventana de 1080 px de alto, con la cámara de 35°
  const vista = { altoPx: 1080, fov: 35, anchoHoja: 9300 }
  const de = (dist, extra = {}) => NIVELES[nivelNecesario({ ...vista, dist, ...extra })].url

  it('desde arriba, con la hoja entera a la vista, alcanza el chico', () => {
    expect(de(17670)).toBe('plano/chico.webp')
    expect(de(9000)).toBe('plano/chico.webp')
  })
  it('al acercarse pide el de 4096 y, más cerca, el de 8192', () => {
    expect(de(5000)).toBe('plano/medio-4k.webp')
    expect(de(2500)).toBe('plano/medio.webp')
  })
  it('más cerca que las teselas finas, el general solo hace de fondo: 4096', () => {
    expect(de(1500, { distTeselas: 2000 })).toBe('plano/medio-4k.webp')
    expect(de(1500)).toBe('plano/medio.webp') // sin teselas, el de 8192
    expect(de(2500, { distTeselas: 2000 })).toBe('plano/medio.webp')
  })
  it('un equipo liviano o una GPU sin texturas de 8192 no pasan de 4096', () => {
    expect(de(2500, { liviano: true })).toBe('plano/medio-4k.webp')
    expect(de(2500, { maxTextura: 4096 })).toBe('plano/medio-4k.webp')
    expect(de(2500, { maxTextura: 2048 })).toBe('plano/chico.webp')
  })
  it('con más píxeles en pantalla hace falta antes', () => {
    expect(de(5000, { altoPx: 2160 })).toBe('plano/medio.webp')
    expect(de(9000, { altoPx: 2160 })).toBe('plano/medio-4k.webp')
  })
  it('nunca menos que el chico', () => {
    expect(nivelNecesario({ ...vista, dist: 1e6 })).toBe(NIVEL_CHICO)
    expect(NIVELES[NIVEL_4K].lado).toBe(4096)
  })
})

describe('crearPlanoPorNiveles', () => {
  const textura = (url) => ({ url, dispose: vi.fn() })
  it('pide un nivel una sola vez y no baja nunca', async () => {
    const cargar = vi.fn(async (url) => textura(url))
    const poner = vi.fn()
    const subidas = []
    const plano = crearPlanoPorNiveles({ cargar, poner, alSubir: (n) => subidas.push(n) })
    await plano.pedir(1)
    expect(plano.pedir(1)).toBe(null)
    expect(plano.pedir(0)).toBe(null)
    await plano.pedir(3)
    expect(cargar.mock.calls.map(([u]) => u)).toEqual(['plano/chico.webp', 'plano/medio.webp'])
    expect(poner.mock.calls.map(([t, n]) => [t.url, n])).toEqual([['plano/chico.webp', 1], ['plano/medio.webp', 3]])
    expect(plano.puesto).toBe(3)
    expect(subidas).toEqual([1, 3])
  })
  it('si un nivel más bajo llega después de uno más alto, se descarta', async () => {
    const pendientes = []
    const cargar = (url) => new Promise((ok) => pendientes.push(() => ok(textura(url))))
    const poner = vi.fn()
    const plano = crearPlanoPorNiveles({ cargar, poner })
    const lento = plano.pedir(1)
    const rapido = plano.pedir(2)
    pendientes[1]()
    await rapido
    pendientes[0]()
    await lento
    expect(poner).toHaveBeenCalledTimes(1)
    expect(poner.mock.calls[0][1]).toBe(2)
  })
  it('si falla, avisa y no insiste con ese nivel; uno más alto sí se puede pedir', async () => {
    const avisar = vi.fn()
    let falla = true
    const cargar = async (url) => { if (falla) throw new Error('red'); return textura(url) }
    const poner = vi.fn()
    const plano = crearPlanoPorNiveles({ cargar, poner, avisar })
    await expect(plano.pedir(2)).rejects.toThrow('red')
    expect(avisar).toHaveBeenCalledWith('plano: no se pudo cargar plano/medio-4k.webp')
    expect(plano.pedir(2)).toBe(null)
    expect(plano.puesto).toBe(-1)
    falla = false
    await plano.pedir(3)
    expect(plano.puesto).toBe(3)
  })
  it('resuelto: el nivel más alto cuyo pedido ya terminó, haya llegado o fallado (revisión de #177)', async () => {
    // si chico.webp falla, el general no puede quedar clavado en 1024: el ciclo de render mira `resuelto`
    const cargar = async (url) => { if (url.includes('chico')) throw new Error('red'); return textura(url) }
    const plano = crearPlanoPorNiveles({ cargar, poner: vi.fn(), avisar: () => {} })
    expect(plano.resuelto).toBe(-1)
    await plano.pedir(0)
    expect(plano.resuelto).toBe(0)
    const enCamino = plano.pedir(1)
    expect(plano.resuelto).toBe(0) // pedido, todavía sin respuesta
    await expect(enCamino).rejects.toThrow('red')
    expect(plano.resuelto).toBe(1)
    expect(plano.puesto).toBe(0)
  })
  it('por omisión avisa en la consola', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plano = crearPlanoPorNiveles({ cargar: async () => { throw new Error('x') }, poner() {} })
    await expect(plano.pedir(1)).rejects.toThrow('x')
    expect(aviso).toHaveBeenCalled()
    aviso.mockRestore()
  })
})
