/**
 * ¿Está servido un dato pesado (fuera de git)? El servidor de Vite responde 200 con index.html para lo
 * que no existe (fallback de SPA), así que no alcanza con `ok`: hay que mirar el tipo de contenido.
 */
export function hayDato(page, url, tipo) {
  return page.evaluate(async ([u, t]) => {
    const r = await fetch(u)
    return r.ok && (r.headers.get('content-type') ?? '').includes(t)
  }, [url, tipo])
}
