/**
 * Los datos que el visor necesita sí o sí (el plano, el pak de casas, el relieve, las épocas) se piden desde
 * un script chico en index.html, antes de que el JS del visor se baje y corra: así viajan a la vez que él.
 * `pedirDato(url)` devuelve ese pedido si existe (una sola vez: una respuesta no se puede leer dos veces) y,
 * si no, hace el pedido ahora.
 */
export function pedirDato(url, { tempranos = globalThis.__temprano, pedir = (u) => fetch(u) } = {}) {
  const temprano = tempranos?.[url]
  if (!temprano) return pedir(url)
  delete tempranos[url]
  // si el pedido temprano falló (se cortó la red) o el servidor dio un error pasajero (5xx: fetch no rechaza
  // ante esos), se intenta una vez más; un 4xx queda como está
  return temprano.then((r) => (r?.status >= 500 ? pedir(url) : r), () => pedir(url))
}
