/**
 * Registra el service worker (src/sw.js), que guarda el JS y los datos para la segunda visita. Solo en el
 * sitio construido: en desarrollo los módulos cambian sin cambiar de nombre. `?sinsw` no lo registra, da de
 * baja el que hubiera y borra sus cachés (para descartarlo cuando algo se ve viejo). Dar de baja no suelta la
 * página que el worker ya controla: si la controla, se recarga una vez (con `?sinsw=recargado`, que no vuelve a
 * recargar) y esa vuelta ya llega sin él. Devuelve qué hizo.
 */
/**
 * Le pasa al service worker activo la lista de lo que la página ya bajó (`urls`), para que lo guarde: en la
 * primera visita los pedidos grandes salen antes de que él tome la página.
 */
export async function avisarLoBajado(contenedor, urls) {
  const registro = await contenedor?.ready
  if (!registro?.active) return false
  registro.active.postMessage({ guardar: [...new Set(urls)] })
  return true
}

export async function registrarServiceWorker({
  contenedor, construido, params, avisar = (m) => console.warn(m),
  cachesDelSitio = globalThis.caches, recargar = recargarSinWorker,
}) {
  if (!contenedor) return 'sin soporte'
  if (params.has('sinsw')) {
    const registros = await contenedor.getRegistrations()
    await Promise.all(registros.map((r) => r.unregister()))
    try {
      const nombres = await cachesDelSitio.keys()
      await Promise.all(nombres.filter((n) => n.startsWith('caracas-')).map((n) => cachesDelSitio.delete(n)))
    } catch { /* sin acceso a la caché: lo guardado se ignora igual, porque ya no hay worker que lo sirva */ }
    if (contenedor.controller && params.get('sinsw') !== 'recargado') {
      recargar()
      return 'recargando'
    }
    return 'dado de baja'
  }
  if (!construido) return 'en desarrollo'
  try {
    await contenedor.register('sw.js')
    return 'registrado'
  } catch (e) {
    avisar(`service worker: ${e.message}`) // sin él, el sitio anda igual
    return 'falló'
  }
}

/** Vuelve a pedir la página con la marca `?sinsw=recargado`: el worker dado de baja ya no la atiende. */
function recargarSinWorker() {
  const url = new URL(location.href)
  url.searchParams.set('sinsw', 'recargado')
  location.replace(url.href)
}
