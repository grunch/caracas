/**
 * La caché del service worker (src/sw.js), en lógica pura para poder probarla:
 * - el JS y el CSS que construye Vite llevan un hash en el nombre: se guardan y no se vuelven a pedir;
 * - los datos (datos/, plano/, fotos/) no llevan hash, pero datos/manifiesto.json trae el sha256 de cada
 *   uno: se guardan con ese sha en la clave, así un archivo solo se vuelve a bajar cuando cambió, y un
 *   `datos:publicar` nunca deja a nadie con datos viejos;
 * - la página y el manifiesto se piden siempre a la red (son chicos) y la copia guardada solo sirve sin conexión.
 * GitHub Pages sirve todo con diez minutos de caché: sin esto, quien vuelve al rato revalida cada archivo.
 */

export const CACHE_APP = 'caracas-app-v1'
export const CACHE_DATOS = 'caracas-datos-v1'
export const RUTA_MANIFIESTO = 'datos/manifiesto.json'
const PREFIJO_PUBLICO = 'public/'

/** El manifiesto ({ archivos: { 'public/datos/x': sha256 } }) → Map de la ruta servida ('datos/x') a su sha. */
export function huellasDelManifiesto(manifiesto) {
  const huellas = new Map()
  for (const [ruta, sha] of Object.entries(manifiesto?.archivos ?? {})) {
    if (typeof sha === 'string' && ruta.startsWith(PREFIJO_PUBLICO)) huellas.set(ruta.slice(PREFIJO_PUBLICO.length), sha)
  }
  return huellas
}

/** La ruta de un pedido dentro del sitio ('datos/ciudad.pak'), o null si es de otro origen o de fuera de la raíz. */
export function rutaEnElSitio(url, raiz) {
  const [u, r] = [new URL(url), new URL(raiz)]
  if (u.origin !== r.origin || !u.pathname.startsWith(r.pathname)) return null
  return decodeURIComponent(u.pathname.slice(r.pathname.length))
}

/** La clave con que se guarda un dato: su URL con el sha del manifiesto. */
export const claveDeDato = (ruta, sha, raiz) => new URL(`${ruta}?sha256=${sha}`, raiz).href

/**
 * Qué hacer con un pedido: 'pagina' (red primero), 'manifiesto' (red primero, y renueva las huellas), 'app'
 * (guardado para siempre: lleva hash), 'dato' (guardado por su sha) o null (el navegador lo atiende solo).
 */
export function claseDePedido({ url, metodo = 'GET', navegacion = false }, { raiz, huellas }) {
  if (metodo !== 'GET') return null
  const ruta = rutaEnElSitio(url, raiz)
  if (ruta === null) return null
  if (navegacion) return 'pagina'
  if (ruta === RUTA_MANIFIESTO) return 'manifiesto'
  if (ruta.startsWith('assets/')) return 'app'
  if (huellas.has(ruta)) return 'dato'
  return null
}

/** De las claves guardadas en la caché de datos, las que ya no corresponden a ningún archivo del manifiesto. */
export function clavesQueSobran(claves, huellas, raiz) {
  const vigentes = new Set([...huellas].map(([ruta, sha]) => claveDeDato(ruta, sha, raiz)))
  return claves.filter((clave) => !vigentes.has(clave))
}

/** El sha256 de los bytes de una respuesta, en hexadecimal (la respuesta queda sin leer). */
export async function sha256Hex(respuesta) {
  const bytes = await respuesta.clone().arrayBuffer()
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * El que atiende los pedidos. `caches`: la CacheStorage; `pedir`: fetch; `raiz`: el alcance del service worker;
 * `huellaDe(respuesta)`: el sha256 de sus bytes (para no guardar un dato bajo un sha que no es el suyo).
 * `responder(pedido)` devuelve la promesa de la respuesta, o null si ese pedido no es asunto suyo.
 */
export function crearServidor({ caches, pedir, raiz, huellaDe = sha256Hex }) {
  let huellasPedidas = null

  // si no se puede guardar o leer (la cuota llena, el almacenamiento bloqueado), lo bajado se entrega igual
  // y lo guardado cuenta como que no está
  const guardar = async (nombre, clave, respuesta) => {
    if (respuesta.ok) await caches.open(nombre).then((cache) => cache.put(clave, respuesta.clone())).catch(() => {})
    return respuesta
  }
  const guardado = (nombre, clave) => caches.open(nombre).then((cache) => cache.match(clave)).catch(() => undefined)

  /**
   * Un dato se guarda bajo el sha del manifiesto solo si sus bytes son esos: durante una publicación a medias
   * (o con la CDN sirviendo todavía el de antes) llega el archivo viejo, que se entrega pero no se guarda, y se
   * vuelve a pedir la próxima vez.
   */
  async function guardarDato(clave, respuesta, sha) {
    if (!respuesta.ok) return respuesta
    const coincide = await huellaDe(respuesta).then((h) => h === sha, () => false)
    return coincide ? guardar(CACHE_DATOS, clave, respuesta) : respuesta
  }
  async function datoGuardadoPrimero(pedido, ruta, huellas) {
    const sha = huellas.get(ruta)
    const clave = claveDeDato(ruta, sha, raiz)
    return (await guardado(CACHE_DATOS, clave)) ?? guardarDato(clave, await pedir(pedido, { cache: 'no-cache' }), sha)
  }

  /** De la red, y se guarda; si la red falla, lo guardado. */
  async function redPrimero(pedido, clave) {
    try {
      return await guardar(CACHE_APP, clave, await pedir(pedido, { cache: 'no-cache' }))
    } catch (e) {
      const copia = await guardado(CACHE_APP, clave)
      if (copia) return copia
      throw e
    }
  }

  /** Lo guardado; si no está, de la red (revalidando: la caché HTTP puede tener el de antes) y se guarda. */
  async function guardadoPrimero(nombre, pedido, clave, opciones) {
    return (await guardado(nombre, clave)) ?? guardar(nombre, clave, await pedir(pedido, opciones))
  }

  async function leerHuellas() {
    const url = new URL(RUTA_MANIFIESTO, raiz).href
    try {
      const huellas = huellasDelManifiesto(await (await redPrimero(url, url)).clone().json())
      limpiar(huellas).catch(() => {})
      return huellas
    } catch {
      return new Map() // sin manifiesto (una copia sin datos): no se guarda ningún dato
    }
  }

  /** Borra de la caché de datos lo que el manifiesto ya no nombra con ese sha. */
  async function limpiar(huellas) {
    const cache = await caches.open(CACHE_DATOS)
    const claves = (await cache.keys()).map((p) => p.url)
    await Promise.all(clavesQueSobran(claves, huellas, raiz).map((clave) => cache.delete(clave)))
  }

  return {
    /** Las huellas de ahora (se piden una vez; `renovar` las pide de nuevo). */
    huellas({ renovar = false } = {}) {
      if (renovar || !huellasPedidas) huellasPedidas = leerHuellas()
      return huellasPedidas
    },
    async responder(pedido) {
      const { url, method: metodo, mode } = pedido
      const navegacion = mode === 'navigate'
      // cada visita vuelve a mirar el manifiesto: ahí se entera de los datos nuevos
      const huellas = await this.huellas({ renovar: navegacion })
      const clase = claseDePedido({ url, metodo, navegacion }, { raiz, huellas })
      if (clase === 'pagina') return redPrimero(pedido, url)
      if (clase === 'manifiesto') return redPrimero(pedido, url)
      if (clase === 'app') return guardadoPrimero(CACHE_APP, pedido, url)
      if (clase === 'dato') return datoGuardadoPrimero(pedido, rutaEnElSitio(url, raiz), huellas)
      return null
    },
    /**
     * Guarda lo que la página ya bajó en esta visita (`urls`): en la primera, el service worker toma la página
     * cuando los pedidos grandes ya salieron, y sin esto recién los guardaría en la visita siguiente. El
     * navegador los tiene recién bajados en su caché HTTP: volver a pedirlos casi no cuesta red.
     */
    async guardarLoBajado(urls) {
      const huellas = await this.huellas()
      let guardados = 0
      for (const url of urls) {
        const clase = claseDePedido({ url }, { raiz, huellas })
        try {
          if (clase === 'app') await guardadoPrimero(CACHE_APP, url, url)
          else if (clase === 'dato') await datoGuardadoPrimero(url, rutaEnElSitio(url, raiz), huellas)
          else continue
          guardados++
        } catch { /* se guardará cuando se vuelva a pedir */ }
      }
      return guardados
    },
    /** Al activarse una versión nueva del service worker: fuera las cachés de versiones anteriores. */
    async borrarCachesViejas() {
      const nombres = await caches.keys()
      await Promise.all(nombres.filter((n) => n.startsWith('caracas-') && n !== CACHE_APP && n !== CACHE_DATOS).map((n) => caches.delete(n)))
    },
  }
}
