/**
 * Direcciones de hoy: Nominatim (OpenStreetMap), el único servicio externo del sitio. Reglas de uso
 * (https://operations.osmfoundation.org/policies/nominatim/): a lo sumo un pedido por segundo, solo cuando
 * la persona manda a buscar (nunca por tecla), resultados guardados y atribución a la vista. Se manda la
 * consulta y nada más: sin credenciales ni datos de quien busca; el User-Agent y el Referer los pone el
 * navegador. La respuesta es un dato no confiable: se validan los números y los textos salen como texto.
 */
export const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
/** El valle de Caracas con holgura: más grande que la hoja, para poder decir "queda fuera del plano". */
export const CAJA_CARACAS = Object.freeze({ oeste: -67.08, norte: 10.58, este: -66.74, sur: 10.38 })
export const INTERVALO_MS = 1000
const PLAZO_MS = 8000
const MAX_CONSULTA = 200
const MAX_RESULTADOS = 5
const MAX_NOMBRE = 80

/** motivo: 'red' | 'servicio' | 'limite' | 'respuesta' | 'reemplazada'. */
export class ErrorDeBusqueda extends Error {
  constructor(motivo, detalle = '') {
    super(`buscador: ${motivo}${detalle ? ` (${detalle})` : ''}`)
    this.name = 'ErrorDeBusqueda'
    this.motivo = motivo
  }
}

export function urlBusqueda(texto) {
  const u = new URL(NOMINATIM)
  const { oeste, norte, este, sur } = CAJA_CARACAS
  u.search = new URLSearchParams({
    q: String(texto).trim().slice(0, MAX_CONSULTA),
    format: 'jsonv2',
    viewbox: [oeste, norte, este, sur].join(','),
    bounded: '1',
    countrycodes: 've',
    'accept-language': 'es',
    limit: String(MAX_RESULTADOS),
  }).toString()
  return u.toString()
}

const NUMERO = /^-?\d{1,3}(?:\.\d+)?$/
const numero = (v, tope) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && NUMERO.test(v) ? Number(v) : NaN
  return Number.isFinite(n) && Math.abs(n) <= tope ? n : null
}
const texto = (v) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, (c) => (c === '\n' || c === '\t' ? ' ' : '')).trim() : '')
const recortar = (s) => (s.length > MAX_NOMBRE ? `${s.slice(0, MAX_NOMBRE - 1)}…` : s)

/** La respuesta de Nominatim → [{ nombre, contexto, lat, lon }], solo lo que trae nombre y coordenadas válidas. */
export function leerRespuesta(json) {
  if (!Array.isArray(json)) throw new ErrorDeBusqueda('respuesta', 'no es una lista')
  return json.flatMap((r) => {
    const [lat, lon] = [numero(r?.lat, 90), numero(r?.lon, 180)]
    const partes = texto(r?.display_name).split(',').map((p) => p.trim()).filter(Boolean)
    const nombre = texto(r?.name) || partes[0] || ''
    if (lat === null || lon === null || !nombre) return []
    const contexto = partes.filter((p) => p !== nombre).slice(0, 2).join(', ')
    return [{ nombre: recortar(nombre), contexto: recortar(contexto), lat, lon }]
  }).slice(0, MAX_RESULTADOS)
}

/**
 * `buscar(texto)` → lugares. `pedir` es fetch; `ahora` y `esperar`, el reloj (se cambian en los tests).
 * Los pedidos salen de a uno y separados por `intervalo`; si llega otra búsqueda mientras una espera su
 * turno, la vieja se descarta (motivo 'reemplazada') sin llegar a la red.
 */
export function crearGeocodificador({
  pedir = (...a) => fetch(...a), ahora = Date.now, esperar = (ms) => new Promise((ok) => setTimeout(ok, ms)),
  intervalo = INTERVALO_MS, plazo = PLAZO_MS,
} = {}) {
  const guardadas = new Map()
  let turno = Promise.resolve()
  let ultimoPedido = -Infinity
  let ultimaBusqueda = 0

  async function consultar(q) {
    let r
    try {
      r = await pedir(urlBusqueda(q), {
        headers: { Accept: 'application/json' }, credentials: 'omit', signal: globalThis.AbortSignal?.timeout?.(plazo),
      })
    } catch (e) {
      throw new ErrorDeBusqueda('red', e?.message)
    }
    if (!r.ok) throw new ErrorDeBusqueda(r.status === 429 ? 'limite' : 'servicio', String(r.status))
    let json
    try {
      json = await r.json()
    } catch (e) {
      throw new ErrorDeBusqueda('respuesta', e?.message)
    }
    return leerRespuesta(json)
  }

  function buscar(consulta) {
    const q = String(consulta ?? '').trim().slice(0, MAX_CONSULTA)
    if (!q) return Promise.resolve([])
    const llave = q.toLowerCase()
    if (guardadas.has(llave)) return Promise.resolve(guardadas.get(llave))
    const esta = ++ultimaBusqueda
    const resultado = turno.then(async () => {
      if (esta !== ultimaBusqueda) throw new ErrorDeBusqueda('reemplazada')
      const falta = ultimoPedido + intervalo - ahora()
      if (falta > 0) await esperar(falta)
      if (esta !== ultimaBusqueda) throw new ErrorDeBusqueda('reemplazada')
      ultimoPedido = ahora()
      const lugares = await consultar(q)
      guardadas.set(llave, lugares)
      return lugares
    })
    turno = resultado.catch(() => {})
    return resultado
  }

  return Object.freeze({ buscar })
}
