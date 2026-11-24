/**
 * Registra el service worker (src/sw.js), que guarda el JS y los datos para la segunda visita. Solo en el
 * sitio construido: en desarrollo los módulos cambian sin cambiar de nombre. `?sinsw` no lo registra y da de
 * baja el que hubiera (para descartarlo cuando algo se ve viejo). Devuelve qué hizo.
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

export async function registrarServiceWorker({ contenedor, construido, params, avisar = (m) => console.warn(m) }) {
  if (!contenedor) return 'sin soporte'
  if (params.has('sinsw')) {
    const registros = await contenedor.getRegistrations()
    await Promise.all(registros.map((r) => r.unregister()))
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
