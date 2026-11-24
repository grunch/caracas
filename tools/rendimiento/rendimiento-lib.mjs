/**
 * La parte pura de la medición de rendimiento (tests/e2e/medir-rendimiento.mjs, specs/10-rendimiento.md):
 * resumir los pedidos de red, las tareas largas y los tiempos de cuadro, y compararlos con el presupuesto
 * (tools/rendimiento/presupuesto.json).
 */

/** El valor que deja debajo la fracción `p` (0..1) de la muestra; null si no hay muestra. */
export function percentil(muestra, p) {
  if (!muestra.length) return null
  const orden = [...muestra].sort((a, b) => a - b)
  return orden[Math.min(orden.length - 1, Math.max(0, Math.ceil(p * orden.length) - 1))]
}

export const mediana = (muestra) => percentil(muestra, 0.5)

/**
 * Los pedidos terminados: cuántos, cuántos bytes viajaron y los más pesados primero. `raiz` se quita de
 * cada URL para que el informe no dependa de dónde se sirvió el sitio.
 */
export function resumirPedidos(pedidos, raiz = '', cuantosMayores = 8) {
  const hechos = pedidos.filter((p) => Number.isFinite(p.bytes))
  const mayores = [...hechos].sort((a, b) => b.bytes - a.bytes).slice(0, cuantosMayores)
    .map((p) => ({ url: p.url.startsWith(raiz) ? p.url.slice(raiz.length) : p.url, bytes: p.bytes }))
  return { cuantos: hechos.length, bytes: hechos.reduce((s, p) => s + p.bytes, 0), mayores }
}

/** Las tareas largas del hilo principal ([inicio, duración] en ms): cuántas, cuánto suman y la mayor. */
export function resumirTareas(largas) {
  const duraciones = largas.map(([, d]) => d)
  return { cuantas: largas.length, sumaMs: duraciones.reduce((s, d) => s + d, 0), mayorMs: duraciones.length ? Math.max(...duraciones) : 0 }
}

/** Lo que el presupuesto mira, sacado de la medición entera (lo que no se midió queda en null). */
export function valoresDelPresupuesto(medicion) {
  const centro = medicion.cuadro?.centro ?? null
  return {
    casasMs: medicion.hitos?.casas ?? null,
    tareaMasLargaMs: medicion.tareas?.mayorMs ?? null,
    bytesAlAbrir: medicion.pedidos?.bytes ?? null,
    heapMB: medicion.memoria?.heapMB ?? null,
    triangulosCentro: centro?.triangulos ?? null,
    msPorCuadroCentro: centro?.medianaMs ?? null,
  }
}

/**
 * Cada tope del presupuesto contra la medición: `pasa` es null si ese valor no se midió (por ejemplo, el
 * tiempo de cuadro sin la GPU del equipo). Un tope que la medición no conoce se informa igual.
 */
export function compararConPresupuesto(medicion, presupuesto) {
  const valores = valoresDelPresupuesto(medicion)
  return Object.entries(presupuesto.topes).map(([clave, tope]) => {
    const valor = valores[clave] ?? null
    return { clave, valor, tope, pasa: valor === null ? null : valor <= tope }
  })
}

/** El informe en texto: una línea por tope, con «pasa», «NO PASA» o «sin medir». */
export function informeDelPresupuesto(filas) {
  const estado = (f) => (f.pasa === null ? 'sin medir' : f.pasa ? 'pasa' : 'NO PASA')
  return filas.map((f) => `${f.clave}: ${f.valor ?? '—'} (tope ${f.tope}) · ${estado(f)}`).join('\n')
}

/**
 * Los grupos de JS del build, para su presupuesto. `archivos`: [{ ruta (dentro de dist), gzip (bytes) }];
 * `html`: el index.html construido. Devuelve kB con gzip: `jsAlAbrirKB` (lo que index.html carga o
 * precarga), `trabajadoresKB` (los workers) y `servicioKB` (el service worker).
 */
export function tamanosDelBuild(archivos, html) {
  const alAbrir = new Set([...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1]))
  const kB = (filtro) => +(archivos.filter(filtro).reduce((s, a) => s + a.gzip, 0) / 1024).toFixed(1)
  return {
    jsAlAbrirKB: kB((a) => alAbrir.has(a.ruta)),
    trabajadoresKB: kB((a) => /-trabajador-[^/]*\.js$/.test(a.ruta)),
    servicioKB: kB((a) => a.ruta === 'sw.js'),
  }
}

/** Cada tope del build contra lo medido: [{ clave, valor, tope, pasa }]; un tope sin medida no pasa. */
export function compararBuild(tamanos, topes) {
  return Object.entries(topes).map(([clave, tope]) => {
    const valor = tamanos[clave] ?? null
    return { clave, valor, tope, pasa: valor !== null && valor <= tope }
  })
}
