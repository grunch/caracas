/**
 * El service worker: guarda el JS (con hash) y los datos (por su sha256 del manifiesto) para que la segunda
 * visita no baje ni revalide lo que no cambió. La lógica está en src/cache-datos.js. Lo registra src/main.js,
 * solo en el sitio construido.
 */
import { crearServidor } from './cache-datos.js'

const servidor = crearServidor({ caches, pedir: (pedido, opciones) => fetch(pedido, opciones), raiz: self.registration.scope })

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(servidor.borrarCachesViejas().then(() => self.clients.claim())))
// la página avisa lo que ya bajó antes de que este service worker la tomara (src/registrar-sw.js)
self.addEventListener('message', (e) => { if (Array.isArray(e.data?.guardar)) e.waitUntil(servidor.guardarLoBajado(e.data.guardar)) })
self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope) || request.headers.has('range')) return
  e.respondWith(servidor.responder(request).then((r) => r ?? fetch(request)))
})
