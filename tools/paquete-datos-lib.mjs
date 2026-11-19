// Lógica pura del paquete de datos del sitio (tools/paquete-datos.mjs): qué archivos lleva, qué release de
// GitHub usar y cómo revisar lo que se baja, que es un dato no confiable hasta que coincide con el manifiesto.

export const ACTIVO = 'datos.tar.gz'
export const MANIFIESTO = 'public/datos/manifiesto.json'
export const PREFIJO = 'datos-'
const CARPETAS = ['public/datos', 'public/plano', 'public/fotos']

/** Una ruta relativa, con '/', dentro de alguna de las CARPETAS, sin segmentos vacíos, '.' ni '..'. */
export function rutaSegura(ruta) {
  if (typeof ruta !== 'string' || ruta.includes('\\')) return false
  const partes = ruta.split('/')
  if (partes.some((p) => p === '' || p === '.' || p === '..')) return false
  return partes.length > 2 && CARPETAS.includes(partes.slice(0, 2).join('/'))
}

const carpetaSegura = (ruta) => {
  const sin = ruta.replace(/\/$/, '')
  return sin === 'public' || CARPETAS.includes(sin) || rutaSegura(sin)
}

/** Los archivos que lleva el paquete: los del manifiesto (public/datos/manifiesto.json) y él mismo, ordenados. */
export function archivosDelPaquete(manifiesto) {
  const rutas = Object.keys(manifiesto?.archivos ?? {})
  if (!rutas.length) throw new Error('el manifiesto no trae archivos: corre antes npm run datos')
  const mala = rutas.find((r) => !rutaSegura(r))
  if (mala) throw new Error(`ruta fuera de las carpetas de datos en el manifiesto: ${mala}`)
  return [...new Set([...rutas, MANIFIESTO])].sort()
}

/** { etiqueta, url } del release de datos más nuevo (la API los lista del más nuevo al más viejo), o null. */
export function elegirRelease(releases) {
  for (const r of releases) {
    if (r.draft || !r.tag_name?.startsWith(PREFIJO)) continue
    const activo = r.assets?.find((a) => a.name === ACTIVO)
    if (activo) return { etiqueta: r.tag_name, url: activo.browser_download_url }
  }
  return null
}

/** Problemas del listado de `tar -tvzf` (GNU): solo valen archivos regulares y carpetas dentro de public/. */
export function revisarListado(listado) {
  const problemas = []
  for (const linea of listado.split('\n').filter(Boolean)) {
    const tipo = linea[0]
    const ruta = linea.split(/\s+/).slice(5).join(' ')
    if (tipo === '-' && rutaSegura(ruta)) continue
    if (tipo === 'd' && carpetaSegura(ruta)) continue
    problemas.push(tipo === '-' || tipo === 'd' ? `ruta no permitida: ${ruta}` : `tipo «${tipo}» no permitido: ${ruta}`)
  }
  return problemas
}

/** Los archivos del manifiesto que faltan o no tienen su sha256. */
export function sumasQueNoCoinciden(manifiesto, medidas) {
  return Object.entries(manifiesto.archivos).filter(([r, suma]) => medidas[r] !== suma).map(([r]) => r)
}

/** La etiqueta del release: la fecha UTC y el commit del código que generó los datos. */
export function etiquetaDeDatos(fecha, commit) {
  return `${PREFIJO}${fecha.toISOString().slice(0, 10)}-${commit.slice(0, 7)}`
}
