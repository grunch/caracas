// Lógica pura del paquete de datos del sitio (tools/paquete-datos.mjs): qué archivos lleva, qué release de
// GitHub usar y cómo revisar lo que se baja, que es un dato no confiable hasta que coincide con el manifiesto.

export const ACTIVO = 'datos.tar.gz'
export const ACTIVO_MUESTRA = 'muestra.tar.gz' // el recorte de 1 km² para los E2E del CI (tools/muestra-lib.mjs)
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

/**
 * { etiqueta, url } del release de datos publicado más recientemente que trae `activo` (el paquete entero o la
 * muestra), o null. No se fía del orden de la API.
 */
export function elegirRelease(releases, activo = ACTIVO) {
  let elegido = null
  for (const r of releases) {
    if (r.draft || !r.tag_name?.startsWith(PREFIJO) || !r.published_at) continue
    const encontrado = r.assets?.find((a) => a.name === activo)
    if (encontrado && (!elegido || r.published_at > elegido.publicado)) {
      elegido = { etiqueta: r.tag_name, url: encontrado.browser_download_url, publicado: r.published_at }
    }
  }
  return elegido && { etiqueta: elegido.etiqueta, url: elegido.url }
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

/**
 * Lanza si el manifiesto es el de la muestra (tools/muestra.mjs: trae su `caja`): después de
 * `npm run datos:bajar -- --muestra`, public/ tiene 1 km² que coincide con su manifiesto, y publicarlo
 * daría un release con la muestra anunciada como los datos completos.
 */
export function exigirCompleto(manifiesto) {
  if (manifiesto?.caja) {
    throw new Error('public/ tiene la muestra (1 km² para los E2E), no los datos completos: bájalos con npm run datos:bajar o regéneralos con npm run datos')
  }
}

/**
 * Lo que se le pasa a `gh` para desplegar Pages después de publicar un release de datos. Va sobre main
 * porque el entorno github-pages solo acepta main: un workflow que arranca por el release corre sobre la
 * etiqueta y se rechaza.
 */
export const argsDeDespliegue = (repo) => ['workflow', 'run', 'pages.yml', '--ref', 'main', '--repo', repo]
