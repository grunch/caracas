// ¿Los datos publicados (el release datos-* más nuevo) siguen al día con el código? Lógica pura de `npm run
// datos:al-dia` (tools/paquete-datos.mjs): qué archivos versionados generan los datos y qué decir si cambiaron.

// lo que el pipeline genera o lee fuera de git: no se compara
const FUERA_DE_GIT = ['fuentes/derivados/', 'public/', 'original:', '.cache/']
// lo que el pipeline lee al arrancar (tools/datos.mjs, pasosCompletos) y no figura fijo en los pasos
const LEIDOS_AL_ARRANCAR = [/^fuentes\/(imagenes|datos|mapas)\/[^/]+\/ficha\.json$/, /^tools\/geo\/epocas\/.+\.json$/]

/** Las rutas versionadas que generan los datos: el código y las entradas de cada paso (tools/datos-pasos.mjs). */
export function rutasQueGeneranDatos(pasos) {
  const rutas = pasos.flatMap((p) => [...(p.codigo ?? []), ...(p.entradas ?? [])])
  return [...new Set(rutas)].filter((r) => !FUERA_DE_GIT.some((x) => r.startsWith(x))).sort()
}

/** De los archivos cambiados, los que generan datos (`generan`: lo de `rutasQueGeneranDatos`). */
export function cambiosQueTocanDatos(cambiados, generan) {
  const fijas = new Set(generan)
  return cambiados.filter((r) => fijas.has(r) || LEIDOS_AL_ARRANCAR.some((x) => x.test(r)))
}

/** El aviso para el CI, o null si los datos siguen al día. */
export function avisoDeDatos({ etiqueta, cambios }) {
  if (!cambios.length) return null
  const cuantos = cambios.length === 1 ? '1 archivo que genera' : `${cambios.length} archivos que generan`
  return {
    titulo: 'Los datos publicados quedaron viejos',
    texto: `Desde el release ${etiqueta} cambiaron ${cuantos} los datos del sitio: producción los va a mostrar como ` +
      'estaban hasta que se regeneren y se publiquen (npm run datos && npm run datos:publicar).',
    archivos: [...cambios].sort(),
  }
}
