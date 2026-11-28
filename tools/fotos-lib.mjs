// Lógica pura del paso de fotos (la usa tools/fotos.mjs): qué imágenes de fuentes/imagenes/ puede mostrar el
// sitio y cómo queda su fila en public/datos/fotos.json. Formato en specs/02 y specs/05.
//
// Regla de derechos: una imagen se publica solo si su ficha.json ESTABLECE que es de dominio público
// (`dominio_publico: true`) o que tiene una licencia libre, y además dice de dónde sale (`url_fuente`), quién
// la hizo (`autor`, que puede ser «Autor desconocido» si así lo declara la fuente) y de cuándo es. Lo dudoso,
// lo que tiene derechos reservados y lo que la ficha marca con `publicar: false` no sale nunca de
// fuentes/imagenes/. Acá no se completa ni se supone nada: si la ficha no lo dice, la foto no es elegible.

/** Lado mayor (px) de la foto grande del visor y de la miniatura del panel. */
export const LADO_GRANDE = 1600
export const LADO_MINIATURA = 640

/** Licencias libres que el sitio acepta, tal como se escriben en `licencia` (al comienzo del texto). */
const LICENCIA_LIBRE = /^(CC0|CC BY(-SA)? \d)/i
const DERECHOS_RESERVADOS = /derechos reservados|rights reserved/i
const DOMINIO_PUBLICO = /^(public domain|dominio p[uú]blico)/i
const esUrl = (u) => typeof u === 'string' && /^https:\/\/\S+$/.test(u) && URL.canParse(u)
const esTexto = (t) => typeof t === 'string' && t.trim() !== ''

/** La fecha de la imagen tal como la escribe la ficha (texto), o null. El año representado no es la fecha. */
export function fechaDe(ficha) {
  if (esTexto(ficha.fecha)) return ficha.fecha.trim()
  if (Number.isInteger(ficha.año)) return String(ficha.año)
  return esTexto(ficha.año_aproximado) ? ficha.año_aproximado.trim() : null
}

/** ¿La ficha permite mostrar la imagen? Devuelve { elegible, motivos } con todo lo que falta. */
export function elegibilidad(ficha) {
  const motivos = []
  const licencia = esTexto(ficha.licencia) ? ficha.licencia.trim() : ''
  const libre = LICENCIA_LIBRE.test(licencia)
  if (ficha.publicar === false) motivos.push('marcada como no publicable (publicar: false)')
  if (DERECHOS_RESERVADOS.test(licencia)) motivos.push('derechos reservados')
  else if (!licencia) motivos.push('sin licencia declarada')
  else if (ficha.dominio_publico === false && !libre) motivos.push('no es de dominio público ni tiene licencia libre')
  else if (ficha.dominio_publico !== true && !libre) motivos.push('dominio público sin establecer (dudoso)')
  if (!esUrl(ficha.url_fuente)) motivos.push('sin página de la fuente (url_fuente)')
  if (!esTexto(ficha.autor) || /^a verificar/i.test(ficha.autor.trim())) motivos.push('sin autor establecido')
  if (!fechaDe(ficha)) motivos.push('sin fecha')
  if (!esTexto(ficha.pie) && !esTexto(ficha.titulo)) motivos.push('sin título')
  return { elegible: motivos.length === 0, motivos }
}

/** La licencia como se muestra en el sitio: corta y en español. */
export function licenciaVisible(licencia) {
  const texto = String(licencia ?? '').trim()
  if (DOMINIO_PUBLICO.test(texto)) return 'Dominio público'
  return texto.replace(/\s*\(.*$/, '')
}

/** Medidas de un derivado: el lado mayor queda en `lado` como mucho; una imagen chica no se agranda. */
export function medidasDerivadas(ancho, alto, lado) {
  const escala = Math.min(1, lado / Math.max(ancho, alto))
  return { w: Math.round(ancho * escala), h: Math.round(alto * escala) }
}

/** La fila de una foto en fotos.json. `medidas`: { ancho, alto } del original ya decodificado. */
export function entradaDeFoto(id, ficha, { ancho, alto }) {
  const grande = medidasDerivadas(ancho, alto, LADO_GRANDE)
  const chica = medidasDerivadas(ancho, alto, LADO_MINIATURA)
  return {
    id,
    titulo: (esTexto(ficha.pie) ? ficha.pie : ficha.titulo).trim(),
    autor: ficha.autor.trim(),
    fecha: fechaDe(ficha),
    año: ficha.año_representado ?? ficha.año ?? null,
    licencia: licenciaVisible(ficha.licencia),
    fuente: ficha.url_fuente,
    institucion: esTexto(ficha.institucion) ? ficha.institucion.trim() : null,
    epocas: [...(ficha.epocas ?? [])],
    marcas: [...ficha.marcas],
    w: grande.w, h: grande.h, mw: chica.w, mh: chica.h,
  }
}

const añoDe = (ficha) => ficha.año_representado ?? ficha.año ?? Infinity

const FALTA_ORIGINAL = 'falta el original (fuentes/imagenes/…/original.*)'

/**
 * De todas las fichas, cuáles se publican y cuáles no (con sus motivos). `lista`: [{ id, ficha, original }]
 * (`original`: nombre del archivo original, o null si no está); `marcas`: Set con los ids de src/marcas-datos.js.
 * Una marca desconocida es un error del dato: se avisa fuerte, no se ignora.
 */
export function armarManifiesto(lista, { marcas }) {
  const publicables = []
  const excluidas = []
  for (const { id, ficha, original } of lista) {
    const desconocidas = (ficha.marcas ?? []).filter((m) => !marcas.has(m))
    if (desconocidas.length) throw new Error(`fotos: ${id} nombra marcas que no existen: ${desconocidas.join(', ')}`)
    const { motivos } = elegibilidad(ficha)
    const faltas = [...motivos]
    if (!motivos.length && !(ficha.marcas ?? []).length) faltas.push('elegible, pero sin marca asignada (campo marcas)')
    if (!motivos.length && !original) faltas.push(FALTA_ORIGINAL)
    if (faltas.length) excluidas.push({ id, motivos: faltas })
    else publicables.push({ id, ficha, original })
  }
  const porAño = (a, b) => añoDe(a.ficha) - añoDe(b.ficha) || a.id.localeCompare(b.id)
  return { publicables: publicables.sort(porAño), excluidas: excluidas.sort((a, b) => a.id.localeCompare(b.id)) }
}

/**
 * Los id de las fotos que se publicarían si estuviera su original: tienen derechos claros y marca, y lo único
 * que les falta es el archivo, que no viaja en git. Con alguna así, el paso no debe escribir el manifiesto.
 */
export function publicablesSinOriginal({ excluidas }) {
  return excluidas.filter(({ motivos }) => motivos.length === 1 && motivos[0] === FALTA_ORIGINAL).map(({ id }) => id)
}

/** El informe de consola: qué entra y qué queda afuera, con el motivo. */
export function informe({ publicables, excluidas }) {
  const filas = [`${publicables.length} fotos publicables:`]
  for (const { id, ficha } of publicables) filas.push(`  + ${id} → ${ficha.marcas.join(', ')} · ${licenciaVisible(ficha.licencia)}`)
  filas.push(`${excluidas.length} excluidas:`)
  for (const { id, motivos } of excluidas) filas.push(`  - ${id}: ${motivos.join('; ')}`)
  return filas.join('\n')
}

/** Los originales que faltan solo se bajan de Wikimedia Commons, por https. */
export function descargable(url) {
  if (typeof url !== 'string') return false
  try {
    const u = new URL(url)
    return u.protocol === 'https:' && u.hostname === 'upload.wikimedia.org'
  } catch { return false }
}

/**
 * Ids del manifiesto que ya no tienen su ficha o su original entre `rutas` (las entradas del paso): se borró
 * una imagen después de publicarla, y las fechas de lo que queda no lo delatan.
 */
export function fotosSinOrigen(manifiesto, rutas) {
  const con = (id, patron) => rutas.some((r) => r.startsWith(`fuentes/imagenes/${id}/`) && patron.test(r.slice(r.lastIndexOf('/') + 1)))
  return (manifiesto?.fotos ?? []).map((f) => f.id).filter((id) => !con(id, /^ficha\.json$/) || !con(id, /^original\.[a-z0-9]+$/i))
}

/** Los archivos que tools/fotos.mjs escribe según el manifiesto (o ninguno si todavía no existe). */
export const salidasDeFotos = (manifiesto) =>
  (manifiesto?.fotos ?? []).flatMap((f) => [`public/fotos/${f.id}.webp`, `public/fotos/m/${f.id}.webp`])
