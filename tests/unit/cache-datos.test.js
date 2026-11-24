import { describe, it, expect, vi } from 'vitest'
import {
  CACHE_APP, CACHE_DATOS, huellasDelManifiesto, rutaEnElSitio, claveDeDato, claseDePedido, clavesQueSobran, crearServidor,
} from '../../src/cache-datos.js'

const raiz = 'https://caracas.city/'
const manifiesto = (sha = 'aaa') => ({ archivos: { 'public/datos/ciudad.pak': sha, 'public/plano/chico.webp': 'bbb', 'otra/cosa': 'ccc', 'public/datos/raro': 7 } })

describe('huellasDelManifiesto', () => {
  it('la ruta servida de cada archivo de public/, con su sha', () => {
    expect([...huellasDelManifiesto(manifiesto())]).toEqual([['datos/ciudad.pak', 'aaa'], ['plano/chico.webp', 'bbb']])
  })
  it('sin manifiesto o sin archivos, ninguna', () => {
    expect(huellasDelManifiesto(null).size).toBe(0)
    expect(huellasDelManifiesto({}).size).toBe(0)
  })
})

describe('rutaEnElSitio y claveDeDato', () => {
  it('la ruta dentro de la raíz, también si el sitio vive en una carpeta', () => {
    expect(rutaEnElSitio('https://caracas.city/datos/ciudad.pak?x=1', raiz)).toBe('datos/ciudad.pak')
    expect(rutaEnElSitio('https://grunch.github.io/caracas/plano/f/3_2.webp', 'https://grunch.github.io/caracas/')).toBe('plano/f/3_2.webp')
    expect(rutaEnElSitio('https://caracas.city/plano/a%20b.webp', raiz)).toBe('plano/a b.webp')
  })
  it('null para otro origen o fuera de la raíz', () => {
    expect(rutaEnElSitio('https://nominatim.openstreetmap.org/search', raiz)).toBe(null)
    expect(rutaEnElSitio('https://grunch.github.io/otro/x', 'https://grunch.github.io/caracas/')).toBe(null)
  })
  it('la clave lleva el sha: cambia cuando cambia el archivo', () => {
    expect(claveDeDato('datos/ciudad.pak', 'aaa', raiz)).toBe('https://caracas.city/datos/ciudad.pak?sha256=aaa')
    expect(claveDeDato('datos/ciudad.pak', 'zzz', raiz)).not.toBe(claveDeDato('datos/ciudad.pak', 'aaa', raiz))
  })
})

describe('claseDePedido', () => {
  const contexto = { raiz, huellas: huellasDelManifiesto(manifiesto()) }
  const de = (url, extra = {}) => claseDePedido({ url: new URL(url, raiz).href, ...extra }, contexto)
  it('clasifica la página, el manifiesto, el JS con hash y los datos del manifiesto', () => {
    expect(de('', { navegacion: true })).toBe('pagina')
    expect(de('edificios.html', { navegacion: true })).toBe('pagina')
    expect(de('datos/manifiesto.json')).toBe('manifiesto')
    expect(de('assets/main-Bc6wvkuy.js')).toBe('app')
    expect(de('datos/ciudad.pak')).toBe('dato')
  })
  it('lo demás lo atiende el navegador: otros métodos, otros orígenes y lo que el manifiesto no nombra', () => {
    expect(de('datos/ciudad.pak', { metodo: 'POST' })).toBe(null)
    expect(de('https://nominatim.openstreetmap.org/search?q=x')).toBe(null)
    expect(de('datos/desconocido.bin')).toBe(null)
    expect(de('sw.js')).toBe(null)
  })
})

describe('clavesQueSobran', () => {
  it('las claves cuyo sha ya no es el del manifiesto, o cuyo archivo ya no está', () => {
    const huellas = huellasDelManifiesto(manifiesto('nuevo'))
    const claves = [claveDeDato('datos/ciudad.pak', 'aaa', raiz), claveDeDato('datos/ciudad.pak', 'nuevo', raiz), claveDeDato('plano/chico.webp', 'bbb', raiz), claveDeDato('plano/viejo.webp', 'x', raiz)]
    expect(clavesQueSobran(claves, huellas, raiz)).toEqual([claves[0], claves[3]])
  })
})

/** Una CacheStorage de mentira, en memoria. */
function cachesFalsas() {
  const todas = new Map()
  return {
    todas,
    async open(nombre) {
      if (!todas.has(nombre)) todas.set(nombre, new Map())
      const m = todas.get(nombre)
      return {
        async match(clave) { return m.get(clave) },
        async put(clave, r) { m.set(clave, r) },
        async keys() { return [...m.keys()].map((url) => ({ url })) },
        async delete(clave) { return m.delete(clave) },
      }
    },
    async keys() { return [...todas.keys()] },
    async delete(nombre) { return todas.delete(nombre) },
  }
}
const respuesta = (cuerpo, ok = true) => ({ ok, cuerpo, clone() { return this }, async json() { return JSON.parse(cuerpo) } })
const pedido = (ruta, extra = {}) => ({ url: new URL(ruta, raiz).href, method: 'GET', mode: 'cors', ...extra })

/** Una red de mentira: `archivos` es lo que hay publicado ahora; anota cada pedido. */
function redFalsa(archivos) {
  const red = {
    archivos, pedidos: [], caida: false,
    pedir: vi.fn(async (p, opciones) => {
      const url = typeof p === 'string' ? p : p.url
      red.pedidos.push([url.replace(raiz, ''), opciones?.cache ?? null])
      if (red.caida) throw new Error('sin conexión')
      const ruta = url.replace(raiz, '')
      return ruta in red.archivos ? respuesta(red.archivos[ruta]) : respuesta('no está', false)
    }),
  }
  return red
}
const publicado = (sha) => ({
  '': '<html>', 'datos/manifiesto.json': JSON.stringify(manifiesto(sha)), 'datos/ciudad.pak': `pak ${sha}`,
  'plano/chico.webp': 'chico', 'assets/main-abc.js': 'js', 'datos/desconocido.bin': 'x',
})

describe('crearServidor', () => {
  it('un dato se baja una vez (revalidando) y después sale de la caché', async () => {
    const red = redFalsa(publicado('aaa'))
    const s = crearServidor({ caches: cachesFalsas(), pedir: red.pedir, raiz })
    expect((await s.responder(pedido('datos/ciudad.pak'))).cuerpo).toBe('pak aaa')
    expect((await s.responder(pedido('datos/ciudad.pak'))).cuerpo).toBe('pak aaa')
    expect(red.pedidos).toEqual([['datos/manifiesto.json', 'no-cache'], ['datos/ciudad.pak', 'no-cache']])
  })
  it('el JS con hash se guarda para siempre', async () => {
    const red = redFalsa(publicado('aaa'))
    const s = crearServidor({ caches: cachesFalsas(), pedir: red.pedir, raiz })
    await s.responder(pedido('assets/main-abc.js'))
    await s.responder(pedido('assets/main-abc.js'))
    expect(red.pedidos.filter(([u]) => u.startsWith('assets/'))).toHaveLength(1)
  })
  it('lo que no es suyo devuelve null y no se guarda', async () => {
    const red = redFalsa(publicado('aaa'))
    const caches = cachesFalsas()
    const s = crearServidor({ caches, pedir: red.pedir, raiz })
    expect(await s.responder(pedido('datos/desconocido.bin'))).toBe(null)
    expect(await s.responder({ url: 'https://nominatim.openstreetmap.org/search', method: 'GET', mode: 'cors' })).toBe(null)
    expect(caches.todas.get(CACHE_DATOS)?.size ?? 0).toBe(0)
  })
  it('si la caché no puede guardar (cuota llena), lo que bajó de la red llega igual (revisión de #178)', async () => {
    const red = redFalsa(publicado('aaa'))
    const caches = cachesFalsas()
    const abrir = caches.open.bind(caches)
    caches.open = async (nombre) => ({ ...(await abrir(nombre)), async put() { throw new DOMException('lleno', 'QuotaExceededError') } })
    const s = crearServidor({ caches, pedir: red.pedir, raiz })
    expect((await s.responder(pedido('', { mode: 'navigate' }))).cuerpo).toBe('<html>')
    expect((await s.responder(pedido('datos/ciudad.pak'))).cuerpo).toBe('pak aaa')
    expect((await s.responder(pedido('assets/main-abc.js'))).cuerpo).toBe('js')
  })
  it('una respuesta fallida no se guarda', async () => {
    const red = redFalsa({ ...publicado('aaa'), 'datos/ciudad.pak': undefined })
    delete red.archivos['datos/ciudad.pak']
    const caches = cachesFalsas()
    const s = crearServidor({ caches, pedir: red.pedir, raiz })
    expect((await s.responder(pedido('datos/ciudad.pak'))).ok).toBe(false)
    expect(caches.todas.get(CACHE_DATOS).size).toBe(0)
  })
  it('después de publicar datos nuevos, la visita siguiente baja solo lo que cambió y borra lo viejo', async () => {
    const red = redFalsa(publicado('aaa'))
    const caches = cachesFalsas()
    const s = crearServidor({ caches, pedir: red.pedir, raiz })
    await s.responder(pedido('', { mode: 'navigate' }))
    await s.responder(pedido('datos/ciudad.pak'))
    await s.responder(pedido('plano/chico.webp'))
    red.archivos = publicado('nuevo')
    red.pedidos.length = 0
    // otra visita: la navegación renueva el manifiesto
    expect((await s.responder(pedido('', { mode: 'navigate' }))).cuerpo).toBe('<html>')
    expect((await s.responder(pedido('datos/ciudad.pak'))).cuerpo).toBe('pak nuevo')
    expect((await s.responder(pedido('plano/chico.webp'))).cuerpo).toBe('chico')
    expect(red.pedidos.map(([u]) => u)).toEqual(['datos/manifiesto.json', '', 'datos/ciudad.pak'])
    await new Promise((ok) => setTimeout(ok))
    expect([...caches.todas.get(CACHE_DATOS).keys()].sort()).toEqual([claveDeDato('datos/ciudad.pak', 'nuevo', raiz), claveDeDato('plano/chico.webp', 'bbb', raiz)])
  })
  it('sin conexión, la página, el manifiesto y los datos salen de lo guardado', async () => {
    const red = redFalsa(publicado('aaa'))
    const s = crearServidor({ caches: cachesFalsas(), pedir: red.pedir, raiz })
    await s.responder(pedido('', { mode: 'navigate' }))
    await s.responder(pedido('datos/ciudad.pak'))
    red.caida = true
    expect((await s.responder(pedido('', { mode: 'navigate' }))).cuerpo).toBe('<html>')
    expect((await s.responder(pedido('datos/ciudad.pak'))).cuerpo).toBe('pak aaa')
    expect((await s.responder(pedido('datos/manifiesto.json'))).cuerpo).toContain('aaa')
  })
  it('sin conexión y sin nada guardado, la página falla como fallaría sin service worker', async () => {
    const red = redFalsa(publicado('aaa'))
    red.caida = true
    const s = crearServidor({ caches: cachesFalsas(), pedir: red.pedir, raiz })
    await expect(s.responder(pedido('', { mode: 'navigate' }))).rejects.toThrow('sin conexión')
    // y sin manifiesto no se guarda ningún dato
    expect(await s.responder(pedido('datos/ciudad.pak'))).toBe(null)
  })
  it('guarda lo que la página bajó antes de que el service worker la tomara, y lo demás lo deja', async () => {
    const red = redFalsa(publicado('aaa'))
    const caches = cachesFalsas()
    const s = crearServidor({ caches, pedir: red.pedir, raiz })
    const urls = ['datos/ciudad.pak', 'assets/main-abc.js', 'datos/desconocido.bin', 'https://nominatim.openstreetmap.org/search'].map((u) => new URL(u, raiz).href)
    expect(await s.guardarLoBajado(urls)).toBe(2)
    red.pedidos.length = 0
    // la visita siguiente ya no los pide
    expect((await s.responder(pedido('datos/ciudad.pak'))).cuerpo).toBe('pak aaa')
    expect((await s.responder(pedido('assets/main-abc.js'))).cuerpo).toBe('js')
    expect(red.pedidos).toEqual([])
  })
  it('si uno no se puede bajar, sigue con los demás', async () => {
    const red = redFalsa(publicado('aaa'))
    const s = crearServidor({ caches: cachesFalsas(), pedir: red.pedir, raiz })
    await s.huellas()
    const pedirDeVerdad = red.pedir.getMockImplementation()
    red.pedir.mockImplementation(async (p, o) => { if (String(p.url ?? p).includes('ciudad.pak')) throw new Error('se cortó'); return pedirDeVerdad(p, o) })
    expect(await s.guardarLoBajado(['datos/ciudad.pak', 'plano/chico.webp'].map((u) => new URL(u, raiz).href))).toBe(1)
  })
  it('al activarse borra las cachés de versiones anteriores y deja las suyas y las ajenas', async () => {
    const caches = cachesFalsas()
    for (const n of ['caracas-app-v0', 'caracas-datos-v0', CACHE_APP, CACHE_DATOS, 'otra-cosa']) await caches.open(n)
    await crearServidor({ caches, pedir: async () => respuesta('{}'), raiz }).borrarCachesViejas()
    expect((await caches.keys()).sort()).toEqual([CACHE_APP, CACHE_DATOS, 'otra-cosa'].sort())
  })
})
