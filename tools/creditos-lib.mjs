// Lógica pura del paso de créditos (la usa tools/creditos.mjs): de las fichas de las fuentes que el sitio
// usa de verdad sale public/datos/creditos.json, la lista de «Fuentes y licencias» del panel «Acerca»
// (src/acerca.js). Formato en specs/02.
//
// Regla de derechos: acá no se interpreta ni se completa nada. La licencia que se muestra es la que la ficha
// declara, con sus palabras; si la ficha no declara ninguna, o deja el dominio público en duda, se dice eso,
// en palabras neutras, y la fila queda marcada `porVerificar`. Nunca se escribe una licencia que la ficha no trae.

/** Lo que se muestra cuando la ficha no declara licencia. */
export const SIN_LICENCIA = 'Sin licencia declarada en la fuente; derechos por verificar.'
/** Lo que se agrega cuando la ficha trae un texto de licencia pero no da por establecido el dominio público. */
export const DOMINIO_SIN_ESTABLECER = 'Dominio público sin establecer; derechos por verificar.'

const esTexto = (t) => typeof t === 'string' && t.trim() !== ''
const texto = (t) => (esTexto(t) ? t.trim() : null)
const enlace = (u) => (esTexto(u) && /^https?:\/\/\S+$/.test(u.trim()) && URL.canParse(u.trim()) ? u.trim() : null)

/**
 * Los derechos de una ficha tal como se muestran: `{ licencia, porVerificar }`. «Public domain» se pone en
 * español y el resto del texto queda como lo escribió la ficha. `dominio_publico: false` con licencia (ODbL,
 * Copernicus) no es una duda: es un dato con dueño y condiciones declaradas.
 */
export function derechosDeFicha(ficha) {
  if (!esTexto(ficha.licencia)) return { licencia: SIN_LICENCIA, porVerificar: true }
  const licencia = ficha.licencia.trim().replace(/^public domain\b/i, 'Dominio público')
  const dudoso = ficha.dominio_publico !== true && ficha.dominio_publico !== false
  if (!dudoso) return { licencia, porVerificar: false }
  return { licencia: `${licencia.replace(/\.$/, '')}. ${DOMINIO_SIN_ESTABLECER}`, porVerificar: true }
}

/** Lo que comparten los títulos de las hojas de un mismo plano, sin el «— hoja 1 de 2» del final. */
export function tituloComun(titulos) {
  const [primero, ...resto] = titulos
  let n = primero.length
  for (const t of resto) {
    let i = 0
    while (i < n && i < t.length && t[i] === primero[i]) i++
    n = i
  }
  const comun = primero.slice(0, n).replace(/[\s—–·,;:(-]*(hoja)?\s*$/i, '')
  return comun.length >= primero.length / 2 ? comun : primero
}

/**
 * Los planos que el sitio usa, agrupados: `{ ids, epocas, base }`. `epocas`: las de crece.json (cada una con
 * `año` y `plano`, la carpeta de fuentes/mapas/); `desde`: la primera que se muestra (src/epocas.js);
 * `base`: las carpetas de las hojas del plano base (tools/geo/mosaico-1936.json). Las hojas del plano base
 * van juntas; los demás planos, uno por fila, en el orden de la línea de tiempo.
 */
export function mapasUsados({ epocas, desde, base }) {
  const deBase = new Set(base)
  const grupos = []
  let grupoBase = null
  for (const { año, plano } of epocas.slice(desde)) {
    if (deBase.has(plano)) {
      if (!grupoBase) grupos.push(grupoBase = { ids: [...base], epocas: [], base: true })
      grupoBase.epocas.push(año)
    } else {
      const ya = grupos.find((g) => !g.base && g.ids[0] === plano)
      if (ya) ya.epocas.push(año); else grupos.push({ ids: [plano], epocas: [año], base: false })
    }
  }
  if (!grupoBase && base.length) grupos.push({ ids: [...base], epocas: [], base: true })
  return grupos
}

/** La fila de un plano (o de las hojas de un plano). `fichas`: { carpeta: ficha.json }. */
export function entradaDeMapa({ ids, epocas, base }, fichas) {
  const delGrupo = ids.map((id) => {
    if (!fichas[id]) throw new Error(`créditos: falta fuentes/mapas/${id}/ficha.json`)
    return fichas[id]
  })
  const [ficha] = delGrupo
  const derechos = derechosDeFicha(ficha)
  if (delGrupo.some((f) => derechosDeFicha(f).licencia !== derechos.licencia)) {
    throw new Error(`créditos: las hojas ${ids.join(', ')} no declaran los mismos derechos`)
  }
  return {
    id: ids[0],
    año: ficha.año ?? ficha.año_representado ?? null,
    titulo: tituloComun(delGrupo.map((f) => f.titulo.trim())),
    hojas: ids.length,
    autor: texto(ficha.autor),
    institucion: texto(ficha.institucion),
    url: enlace(ficha.url_fuente),
    ...derechos,
    base,
    epocas: [...epocas],
  }
}

/** La fila de un dato que no es un plano (fuentes/datos/<id>/ficha.json). */
export function entradaDeDato(id, ficha) {
  const derechos = derechosDeFicha(ficha)
  const atribucion = texto(ficha.atribucion_requerida)
  return {
    id,
    titulo: ficha.titulo.trim(),
    tipo: texto(ficha.tipo),
    autor: texto(ficha.autor),
    institucion: texto(ficha.institucion),
    url: enlace(ficha.url_fuente) ?? enlace(ficha.url_descarga),
    ...derechos,
    atribucion: atribucion && atribucion !== derechos.licencia ? atribucion : null,
  }
}

/** La fila de una foto de las fichas, desde su fila de public/datos/fotos.json (tools/fotos-lib.mjs). */
export const entradaDeFoto = (foto) => ({
  id: foto.id, titulo: foto.titulo, autor: foto.autor, fecha: foto.fecha, licencia: foto.licencia,
  url: enlace(foto.fuente), institucion: texto(foto.institucion),
})

/** La fila de una biblioteca que viaja en el sitio, desde su package.json. */
export const entradaDePrograma = (paquete) => ({
  nombre: paquete.name, version: paquete.version, licencia: texto(paquete.license), url: enlace(paquete.homepage),
})

/**
 * public/datos/creditos.json. `fichasMapas` y `fichasDatos`: { carpeta: ficha }; `fotos`: las de fotos.json;
 * `paquetes`: los package.json de las dependencias del sitio. Sin fechas ni rutas: la misma entrada da los
 * mismos bytes.
 */
export function armarCreditos({ epocas, desde, base, fichasMapas, fichasDatos, fotos, paquetes }) {
  const mapas = mapasUsados({ epocas, desde, base }).map((g) => entradaDeMapa(g, fichasMapas))
  return {
    mapas: mapas.sort((a, b) => (a.año ?? Infinity) - (b.año ?? Infinity) || a.id.localeCompare(b.id)),
    datos: Object.keys(fichasDatos).sort().map((id) => entradaDeDato(id, fichasDatos[id])),
    fotos: fotos.map(entradaDeFoto),
    programas: paquetes.map(entradaDePrograma),
  }
}

/**
 * Lo acreditado en `creditos` (el creditos.json ya escrito, o null) cuya ficha ya no está entre `rutas` (las
 * entradas del paso): se quitó una fuente, y las fechas de las que quedan no lo delatan. Si devuelve algo, el
 * paso se rehace.
 */
export function creditosSinOrigen(creditos, rutas) {
  const falta = (carpeta) => ({ id }) => !rutas.includes(`fuentes/${carpeta}/${id}/ficha.json`)
  return [...(creditos?.mapas ?? []).filter(falta('mapas')), ...(creditos?.datos ?? []).filter(falta('datos'))].map((x) => x.id)
}

/** Los package.json instalados de las dependencias del sitio: de ahí salen la versión y la licencia. */
export const paquetesDeCreditos = (paquete) => Object.keys(paquete?.dependencies ?? {}).sort().map((n) => `node_modules/${n}/package.json`)

/** Las fichas de planos que lee el paso (sus entradas en tools/datos.mjs). */
export const fichasDeCreditos = (uso) => mapasUsados(uso).flatMap((g) => g.ids).map((id) => `fuentes/mapas/${id}/ficha.json`)
