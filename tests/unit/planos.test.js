import { describe, test, expect } from 'vitest'
import { planoDeEpoca, rectHoja, nivelesAUsar, crearPlanosDeEpoca } from '../../src/planos.js'

const nivel = (año, archivo, lado) => ({ url: `plano/${año}/${archivo}.webp`, lado })
const PLANOS = [
  { año: 1772, recorte: [100, 200, 600, 700], niveles: [nivel(1772, 'chico', 2048), nivel(1772, 'medio', 4096)] },
  { año: 1843, recorte: [0, 0, 500, 400], niveles: [nivel(1843, 'chico', 2048), nivel(1843, 'medio', 4096)] },
  { año: 1911, recorte: [0, 0, 1000, 800], niveles: [nivel(1911, 'chico', 2048), nivel(1911, 'medio', 4096), nivel(1911, 'grande', 8192)] },
]
const HOJA = { ancho: 1000, alto: 1000 }

describe('planoDeEpoca', () => {
  test('la época con plano calzado usa el suyo', () => {
    expect(planoDeEpoca(1843, PLANOS).año).toBe(1843)
  })

  test('antes del primer plano calzado (1578, el esquema de Pimentel) se usa el más antiguo', () => {
    expect(planoDeEpoca(1578, PLANOS).año).toBe(1772)
  })

  test('1936 (o una época sin plano calzado después del primero) queda con el plano de 1936: null', () => {
    expect(planoDeEpoca(1936, PLANOS)).toBeNull()
    expect(planoDeEpoca(1850, PLANOS)).toBeNull()
  })

  test('sin índice o sin época, null', () => {
    expect(planoDeEpoca(1843, [])).toBeNull()
    expect(planoDeEpoca(undefined, PLANOS)).toBeNull()
  })
})

describe('rectHoja', () => {
  test('el recorte en píxeles pasa a coordenadas de la hoja normalizadas (y hacia abajo)', () => {
    expect(rectHoja([100, 200, 600, 700], { ancho: 1000, alto: 2000 })).toEqual([0.1, 0.1, 0.6, 0.35])
  })
})

describe('nivelesAUsar', () => {
  const niveles = PLANOS[2].niveles
  test('chico para el primer cuadro y después el más grande que admite la GPU', () => {
    expect(nivelesAUsar(niveles, { liviano: false, maxTextura: 16384 })).toEqual(['plano/1911/chico.webp', 'plano/1911/grande.webp'])
    expect(nivelesAUsar(niveles, { liviano: false, maxTextura: 4096 })).toEqual(['plano/1911/chico.webp', 'plano/1911/medio.webp'])
  })

  test('en equipos livianos, solo chico', () => {
    expect(nivelesAUsar(niveles, { liviano: true, maxTextura: 16384 })).toEqual(['plano/1911/chico.webp'])
  })

  test('si chico es el único nivel, no se repite', () => {
    expect(nivelesAUsar([niveles[0]], { liviano: false, maxTextura: 16384 })).toEqual(['plano/1911/chico.webp'])
  })
})

describe('crearPlanosDeEpoca', () => {
  const VACIO = 'vacío'
  const rect = () => ({ v: null, fromArray(a) { this.v = a } })
  const ranuras = () => ({ uPlanoDe: { value: VACIO }, uPlanoA: { value: VACIO }, uPlanoDeRect: { value: rect() }, uPlanoARect: { value: rect() } })
  const textura = (url) => ({ url, liberada: false, dispose() { this.liberada = true } })
  const esperar = () => new Promise((r) => setTimeout(r, 0))
  const crear = (extra = {}) => {
    const U = ranuras()
    const pedidos = []
    const cargar = (url) => new Promise((ok, mal) => pedidos.push({ url, ok: () => { const t = textura(url); ok(t); return t }, mal: () => mal(new Error('404')) }))
    const p = crearPlanosDeEpoca({ planos: PLANOS, hoja: HOJA, cargar, U, pedirCuadro: () => {}, vacio: VACIO, liviano: false, maxTextura: 16384, ...extra })
    const llega = async (url) => { pedidos.find((x) => x.url === url).ok(); await esperar() }
    return { U, p, pedidos, llega }
  }

  test('preparar baja el nivel chico y resuelve cuando llega', async () => {
    const { p, pedidos, llega } = crear()
    let listo = false
    p.preparar(1843).then(() => { listo = true })
    expect(pedidos.map((x) => x.url)).toEqual(['plano/1843/chico.webp'])
    await esperar()
    expect(listo).toBe(false)
    await llega('plano/1843/chico.webp')
    expect(listo).toBe(true)
  })

  test('usar pone las texturas de las dos épocas de la ola con su rectángulo; 1936 (null) queda vacío', async () => {
    const { U, p, llega } = crear()
    p.preparar(1843)
    await llega('plano/1843/chico.webp')
    p.usar(null, 1843)
    expect(U.uPlanoDe.value).toBe(VACIO)
    expect(U.uPlanoA.value.url).toBe('plano/1843/chico.webp')
    expect(U.uPlanoARect.value.v).toEqual([0, 0, 0.5, 0.4])
  })

  test('en uso, sube al nivel mejor y libera el chico después de reemplazarlo', async () => {
    const { U, p, pedidos, llega } = crear()
    p.preparar(1911)
    await llega('plano/1911/chico.webp')
    p.usar(1911, 1911)
    const chico = U.uPlanoA.value
    await esperar()
    expect(pedidos.map((x) => x.url)).toContain('plano/1911/grande.webp')
    await llega('plano/1911/grande.webp')
    expect(U.uPlanoA.value.url).toBe('plano/1911/grande.webp')
    expect(U.uPlanoDe.value.url).toBe('plano/1911/grande.webp')
    expect(chico.liberada).toBe(true)
  })

  test('una precarga baja solo el chico', async () => {
    const { p, pedidos, llega } = crear()
    p.preparar(1911)
    await llega('plano/1911/chico.webp')
    await esperar()
    expect(pedidos.map((x) => x.url)).toEqual(['plano/1911/chico.webp'])
  })

  test('lo que no está en uso ni precargado se libera', async () => {
    const { U, p, llega } = crear()
    p.preparar(1772)
    await llega('plano/1772/chico.webp')
    p.usar(1772, 1772)
    const t1772 = U.uPlanoA.value
    p.preparar(1843)
    await llega('plano/1843/chico.webp')
    p.usar(1772, 1843)
    p.preparar(1911)
    p.usar(1843, 1911)
    expect(t1772.liberada).toBe(true)
    expect(p.cargados).not.toContain(1772)
    expect(p.cargados).toEqual(expect.arrayContaining([1843, 1911]))
  })

  test('una textura que llega después de que su época fue descartada se libera enseguida', async () => {
    const { p, pedidos } = crear()
    p.preparar(1772)
    p.preparar(1843) // la precarga pasa a 1843: 1772 ya no hace falta
    expect(p.cargados).not.toContain(1772)
    const tarde = pedidos.find((x) => x.url === 'plano/1772/chico.webp').ok()
    await esperar()
    expect(tarde.liberada).toBe(true)
    expect(p.cargados).not.toContain(1772)
  })

  test('si el chico falla, la época queda con 1936 y se puede volver a pedir', async () => {
    const { U, p, pedidos } = crear()
    const listo = p.preparar(1843)
    pedidos[0].mal()
    await listo // no rechaza: la ola arranca igual, con 1936
    p.usar(1843, 1843)
    expect(U.uPlanoA.value).toBe(VACIO)
    p.preparar(1843)
    expect(pedidos.filter((x) => x.url === 'plano/1843/chico.webp')).toHaveLength(2)
  })
})
