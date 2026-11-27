/**
 * Las fichas: lo que se sabe de cada lugar marcado, por época (specs/05). Este módulo es la lógica pura: con
 * una marca (src/marcas.js), su texto (src/fichas-datos.js), las fotos del manifiesto (datos/fotos.json,
 * tools/fotos.mjs) y la época elegida, arma lo que muestra el panel (src/ficha-panel.js).
 *
 * Fila del manifiesto de fotos: { id, titulo, autor, fecha, año, licencia, fuente, institucion, epocas: [índices],
 *   marcas: [ids], w, h, mw, mh } → fotos/<id>.webp (w × h) y fotos/m/<id>.webp (mw × mh).
 */
import { vivaEn } from './marcas.js'
import { PRIMERA_EPOCA } from './epocas.js'

/** El año de cada época (índices de src/epocas.js); con la línea de tiempo cargada mandan los de crece.json. */
export const AÑOS_DE_EPOCA = Object.freeze([1578, 1772, 1843, 1889, 1911, 1936, 1946])
const ULTIMA_EPOCA = 6

/** La época (entera) que muestra la ficha a partir de la que rige en el lugar, que en plena ola es fraccionaria. */
export function epocaDeFicha(valor) {
  if (!Number.isFinite(valor)) return ULTIMA_EPOCA
  return Math.min(ULTIMA_EPOCA, Math.max(PRIMERA_EPOCA, Math.round(valor)))
}

const ultimaDe = (marca) => (marca.muere === 0 ? ULTIMA_EPOCA : marca.muere - 1)

/** «1772–1843», «1911» o «desde 1889» (si llega al final de la línea de tiempo y antes hubo otra cosa). */
function periodo(desde, hasta, años, abierto) {
  if (abierto && desde > PRIMERA_EPOCA) return `desde ${años[desde]}`
  return desde === hasta ? String(años[desde]) : `${años[desde]}–${años[hasta]}`
}

/** Los nombres que tuvo el lugar, con los años de la línea de tiempo en que rigió cada uno. */
export function nombresPorEpoca(marca, epoca, años = AÑOS_DE_EPOCA) {
  const fin = ultimaDe(marca)
  const tramos = marca.nombres.map((n, i) => ({
    nombre: n.nombre, desde: Math.max(n.desde, marca.nace),
    hasta: Math.min(fin, i + 1 < marca.nombres.length ? marca.nombres[i + 1].desde - 1 : fin),
  })).filter((t) => t.desde <= t.hasta) // un nombre que dejó de regir antes de que la marca naciera no cuenta
  // Las notas pueden cambiar sin que cambie el nombre (mercado/jardín de Plaza Bolívar).
  // Solo se unen períodos contiguos; un nombre que regresa después de otro sigue separado.
  const continuos = []
  for (const tramo of tramos) {
    const anterior = continuos.at(-1)
    if (anterior?.nombre === tramo.nombre && anterior.hasta + 1 === tramo.desde) {
      continuos[continuos.length - 1] = { ...anterior, hasta: tramo.hasta }
    } else continuos.push({ ...tramo })
  }
  return continuos.map(({ nombre, desde, hasta }) => {
    const abierto = hasta === ULTIMA_EPOCA && marca.muere === 0
    return { nombre, periodo: periodo(desde, hasta, años, abierto), rige: vivaEn(marca, epoca) && epoca >= desde && epoca <= hasta }
  })
}

/** Los párrafos de la ficha: los propios o, si no hay, las notas de la marca (una por nombre, sin repetir). */
function parrafosDe(marca, ficha) {
  if (ficha?.textos?.length) return ficha.textos.map(([desde, texto]) => ({ desde, texto }))
  const vistas = new Set()
  return marca.nombres.filter((n) => n.nota && !vistas.has(n.nota) && vistas.add(n.nota))
    .map((n) => ({ desde: Math.max(n.desde, marca.nace), texto: n.nota }))
}

/**
 * Todo lo que muestra la ficha de una marca en una época (entera):
 *   { id, epoca, año, existe, titulo, cuando, nombres: [{ nombre, periodo, rige }], parrafos: [{ año, texto, rige }],
 *     hoy, dudas, fuente, fotos: [{ …foto, deEpoca }], hayDeEpoca }
 * Las fotos «de esta época» van primero; el párrafo que rige es el último que empieza en la época o antes, y
 * también va primero.
 */
export function contenidoDeFicha({ marca, ficha, fotos = [], epoca, años = AÑOS_DE_EPOCA }) {
  const existe = vivaEn(marca, epoca)
  const nombres = nombresPorEpoca(marca, epoca, años)
  const rige = nombres.find((n) => n.rige)
  const todavia = epoca < marca.nace
  let cuando = `Hacia ${años[epoca]}`
  if (!existe) {
    cuando = todavia ? `Todavía no figura en ${años[epoca]}: aparece en ${años[marca.nace]}`
      : `Ya no figura en ${años[epoca]}: estuvo hasta ${años[ultimaDe(marca)]}`
  }
  const parrafos = parrafosDe(marca, ficha)
  const actual = parrafos.findLast((p) => p.desde <= epoca) ?? null
  const propias = fotos.filter((f) => f.marcas.includes(marca.id)).map((f) => ({ ...f, deEpoca: f.epocas.includes(epoca) }))
  return {
    id: marca.id, epoca, año: años[epoca], existe,
    titulo: (rige ?? (todavia ? nombres[0] : nombres.at(-1))).nombre,
    cuando,
    nombres: nombres.length > 1 ? nombres : [],
    // el que rige va primero (es lo que se lee al abrir la ficha); después los demás, en orden
    parrafos: [...parrafos.filter((p) => p === actual), ...parrafos.filter((p) => p !== actual)]
      .map((p) => ({ año: años[p.desde], texto: p.texto, rige: p === actual })),
    hoy: ficha?.hoy ?? '', dudas: ficha?.dudas ?? '', fuente: marca.fuente ?? '',
    fotos: [...propias.filter((f) => f.deEpoca), ...propias.filter((f) => !f.deEpoca)],
    hayDeEpoca: propias.some((f) => f.deEpoca),
  }
}

/** Las fotos de cada marca: Map id de marca → [foto]. */
export function fotosPorMarca(fotos) {
  const porMarca = new Map()
  for (const f of fotos) for (const id of f.marcas) porMarca.set(id, [...(porMarca.get(id) ?? []), f])
  return porMarca
}

const texto = (t) => typeof t === 'string' && t.trim() !== ''
const medida = (n) => Number.isInteger(n) && n > 0
const fotoCompleta = (f) => Boolean(f) && typeof f.id === 'string' && /^[a-z0-9][a-z0-9-]*$/.test(f.id) &&
  [f.titulo, f.autor, f.fecha, f.licencia].every(texto) && /^https:\/\/\S+$/.test(f.fuente ?? '') && URL.canParse(f.fuente) &&
  Array.isArray(f.marcas) && Array.isArray(f.epocas) && [f.w, f.h, f.mw, f.mh].every(medida)

/**
 * Las filas del manifiesto que se pueden mostrar: el sitio no enseña una foto sin su crédito completo (autor,
 * fecha, licencia y enlace a la fuente), venga el manifiesto de donde venga.
 */
export const validarFotos = (fotos) => (Array.isArray(fotos) ? fotos.filter(fotoCompleta) : [])

/** Lee datos/fotos.json; sin manifiesto (la ciudad de demostración, o antes de correr tools/fotos.mjs) no hay fotos. */
export async function leerFotos(pedir, url = 'datos/fotos.json') {
  try {
    const r = await pedir(url)
    // el servidor de desarrollo responde index.html por lo que no existe: se mira el tipo
    if (!r.ok || !(r.headers.get('content-type') ?? '').includes('json')) return []
    return validarFotos((await r.json()).fotos)
  } catch { return [] }
}

/** «Autor, fecha», como va al pie de cada foto. */
export const creditoDeFoto = (foto) => `${foto.autor}, ${foto.fecha}`

/** Cómo se nombra la fuente en el enlace: el sitio de donde sale. */
export function nombreDeFuente(url) {
  const host = new URL(url).hostname.replace(/^www\./, '')
  return host === 'commons.wikimedia.org' ? 'Wikimedia Commons' : host
}

/**
 * Revisa los textos (src/fichas-datos.js) contra las filas de marcas y los hitos: cada ficha es de una marca
 * que existe, con textos no vacíos, en orden y dentro de la vida de la marca. Devuelve la lista de problemas.
 */
export function validarFichas(fichas, filas, hitos = []) {
  const problemas = []
  const porId = new Map(filas.map((f) => [f.id, f]))
  const hitoDe = new Map(hitos.map((h) => [h.id, h]))
  for (const [id, ficha] of Object.entries(fichas)) {
    const fila = porId.get(id)
    if (!fila) { problemas.push(`${id}: marca desconocida`); continue }
    const nace = fila.nace ?? hitoDe.get(fila.hito)?.nace ?? PRIMERA_EPOCA
    const fin = fila.muere ? fila.muere - 1 : ULTIMA_EPOCA
    const textos = ficha.textos ?? []
    if (textos.some(([, t]) => !texto(t))) problemas.push(`${id}: texto vacío`)
    if (textos.some(([desde], i) => !Number.isInteger(desde) || (i > 0 && desde <= textos[i - 1][0]))) problemas.push(`${id}: textos desordenados`)
    if (textos.some(([desde]) => desde < nace || desde > fin)) problemas.push(`${id}: texto fuera de la vida de la marca (${nace}–${fin})`)
    for (const campo of ['hoy', 'dudas']) if (campo in ficha && !texto(ficha[campo])) problemas.push(`${id}: ${campo} vacío`)
  }
  return problemas
}
