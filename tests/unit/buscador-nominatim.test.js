import { describe, test, expect } from 'vitest'
import { urlBusqueda, leerRespuesta, crearGeocodificador, ErrorDeBusqueda, NOMINATIM, CAJA_CARACAS, INTERVALO_MS } from '../../src/buscador/nominatim.js'

const URDANETA = { lat: '10.5075', lon: '-66.9120', name: 'Avenida Urdaneta', display_name: 'Avenida Urdaneta, Parroquia Catedral, Caracas, Distrito Capital, 1010, Venezuela' }

/** Reloj y red de mentira: `esperar` adelanta el reloj; `pedir` anota la hora de cada pedido. */
function mundo(respuestas = () => [URDANETA]) {
  const m = { t: 0, pedidos: [], esperas: [] }
  m.ahora = () => m.t
  m.esperar = (ms) => { m.esperas.push(ms); m.t += ms; return Promise.resolve() }
  m.pedir = async (url, opciones) => {
    m.pedidos.push({ url, opciones, t: m.t })
    const r = respuestas(url)
    if (r instanceof Error) throw r
    return r.ok === undefined ? { ok: true, status: 200, json: async () => r } : r
  }
  return m
}

describe('urlBusqueda', () => {
  const u = new URL(urlBusqueda('  Avenida Urdaneta & Fuerzas Armadas  '))

  test('va a Nominatim, en jsonv2, acotada a Caracas y con pocos resultados', () => {
    expect(u.origin + u.pathname).toBe(NOMINATIM)
    expect(u.searchParams.get('format')).toBe('jsonv2')
    expect(u.searchParams.get('bounded')).toBe('1')
    expect(u.searchParams.get('countrycodes')).toBe('ve')
    expect(u.searchParams.get('accept-language')).toBe('es')
    expect(Number(u.searchParams.get('limit'))).toBeLessThanOrEqual(5)
    expect(u.searchParams.get('viewbox')).toBe([CAJA_CARACAS.oeste, CAJA_CARACAS.norte, CAJA_CARACAS.este, CAJA_CARACAS.sur].join(','))
  })

  test('la consulta va escapada y recortada, y no se manda nada más', () => {
    expect(u.searchParams.get('q')).toBe('Avenida Urdaneta & Fuerzas Armadas')
    expect([...u.searchParams.keys()].sort()).toEqual(['accept-language', 'bounded', 'countrycodes', 'format', 'limit', 'q', 'viewbox'])
    expect(new URL(urlBusqueda('x'.repeat(5000))).searchParams.get('q')).toHaveLength(200)
  })
})

describe('leerRespuesta', () => {
  test('saca nombre, contexto y coordenadas numéricas', () => {
    expect(leerRespuesta([URDANETA])).toEqual([{ nombre: 'Avenida Urdaneta', contexto: 'Parroquia Catedral, Caracas', lat: 10.5075, lon: -66.912 }])
  })

  test('sin "name", el nombre es el principio de display_name', () => {
    const [l] = leerRespuesta([{ lat: 10.5, lon: -66.9, display_name: 'Esquina X, Caracas, Venezuela' }])
    expect(l).toMatchObject({ nombre: 'Esquina X', contexto: 'Caracas, Venezuela' })
  })

  test('descarta lo que no trae coordenadas válidas o nombre', () => {
    expect(leerRespuesta([
      { ...URDANETA, lat: 'abc' }, { ...URDANETA, lon: null }, { ...URDANETA, lat: '95' }, { ...URDANETA, lon: '1e999' },
      { lat: '10.5', lon: '-66.9' }, { ...URDANETA, lat: '10.5; alert(1)' }, null, 'texto', { ...URDANETA, name: 7, display_name: {} },
    ])).toEqual([])
  })

  test('lo que no es una lista no es una respuesta', () => {
    expect(() => leerRespuesta({ error: 'x' })).toThrow(ErrorDeBusqueda)
    expect(() => leerRespuesta(null)).toThrow(ErrorDeBusqueda)
  })

  test('recorta nombres larguísimos, quita caracteres de control y limita la cantidad', () => {
    const [l] = leerRespuesta([{ ...URDANETA, name: `A\u0000B\n${'x'.repeat(500)}` }])
    expect(l.nombre.length).toBeLessThanOrEqual(80)
    expect(l.nombre.startsWith('AB x')).toBe(true)
    expect(leerRespuesta(Array.from({ length: 40 }, () => URDANETA))).toHaveLength(5)
  })

  test('el marcado se queda como texto: no se interpreta ni se limpia acá', () => {
    expect(leerRespuesta([{ ...URDANETA, name: '<img src=x onerror=alert(1)>' }])[0].nombre).toBe('<img src=x onerror=alert(1)>')
  })
})

describe('crearGeocodificador', () => {
  test('pide a Nominatim sin credenciales y devuelve los lugares', async () => {
    const m = mundo()
    const geo = crearGeocodificador(m)
    expect(await geo.buscar('Avenida Urdaneta')).toEqual(leerRespuesta([URDANETA]))
    expect(m.pedidos).toHaveLength(1)
    expect(m.pedidos[0].url).toBe(urlBusqueda('Avenida Urdaneta'))
    expect(m.pedidos[0].opciones.credentials).toBe('omit')
    expect(Object.keys(m.pedidos[0].opciones.headers ?? {})).toEqual(['Accept'])
  })

  test('la misma consulta no se pide dos veces', async () => {
    const m = mundo()
    const geo = crearGeocodificador(m)
    await geo.buscar('Avenida Urdaneta')
    await geo.buscar('  avenida urdaneta ')
    expect(m.pedidos).toHaveLength(1)
  })

  test('nunca más de un pedido por segundo: el segundo espera lo que falta', async () => {
    const m = mundo()
    const geo = crearGeocodificador(m)
    await geo.buscar('uno')
    m.t += 300
    await geo.buscar('dos')
    expect(m.esperas).toEqual([INTERVALO_MS - 300])
    expect(m.pedidos[1].t - m.pedidos[0].t).toBeGreaterThanOrEqual(INTERVALO_MS)
    m.t += 5000
    await geo.buscar('tres')
    expect(m.esperas).toHaveLength(1)
  })

  test('si se busca otra cosa mientras una espera su turno, la vieja se descarta sin pedirla', async () => {
    const m = mundo()
    const geo = crearGeocodificador(m)
    await geo.buscar('uno')
    const [vieja, nueva] = [geo.buscar('dos'), geo.buscar('tres')]
    await expect(vieja).rejects.toMatchObject({ motivo: 'reemplazada' })
    await nueva
    expect(m.pedidos.map((p) => new URL(p.url).searchParams.get('q'))).toEqual(['uno', 'tres'])
    for (let i = 1; i < m.pedidos.length; i++) expect(m.pedidos[i].t - m.pedidos[i - 1].t).toBeGreaterThanOrEqual(INTERVALO_MS)
  })

  test('una búsqueda ya guardada también descarta la que esperaba su turno', async () => {
    const m = mundo()
    const geo = crearGeocodificador(m)
    await geo.buscar('uno')
    const vieja = geo.buscar('dos')
    expect(await geo.buscar('uno')).toHaveLength(1)
    await expect(vieja).rejects.toMatchObject({ motivo: 'reemplazada' })
    expect(m.pedidos).toHaveLength(1)
  })

  test('la red caída, un error del servicio y una respuesta rota se distinguen', async () => {
    await expect(crearGeocodificador(mundo(() => new TypeError('Failed to fetch'))).buscar('x')).rejects.toMatchObject({ motivo: 'red' })
    await expect(crearGeocodificador(mundo(() => ({ ok: false, status: 503 }))).buscar('x')).rejects.toMatchObject({ motivo: 'servicio' })
    await expect(crearGeocodificador(mundo(() => ({ ok: false, status: 429 }))).buscar('x')).rejects.toMatchObject({ motivo: 'limite' })
    const rota = { ok: true, status: 200, json: async () => { throw new SyntaxError('Unexpected token <') } }
    await expect(crearGeocodificador(mundo(() => rota)).buscar('x')).rejects.toMatchObject({ motivo: 'respuesta' })
    await expect(crearGeocodificador(mundo(() => ({ error: 'no' }))).buscar('x')).rejects.toMatchObject({ motivo: 'respuesta' })
  })

  test('un fallo no queda guardado: se puede reintentar', async () => {
    let falla = true
    const m = mundo(() => (falla ? new TypeError('sin red') : [URDANETA]))
    const geo = crearGeocodificador(m)
    await expect(geo.buscar('x')).rejects.toBeInstanceOf(ErrorDeBusqueda)
    falla = false
    expect(await geo.buscar('x')).toHaveLength(1)
  })

  test('una consulta vacía no sale a la red', async () => {
    const m = mundo()
    expect(await crearGeocodificador(m).buscar('   ')).toEqual([])
    expect(m.pedidos).toEqual([])
  })
})
