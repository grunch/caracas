/**
 * La respuesta del buscador, en prosa: dónde queda lo que se buscó (respecto del hito más cercano o de la
 * Plaza Bolívar) y qué había ahí en la época elegida. Solo dice lo que los datos sostienen: la vecindad de
 * las esquinas sale del diccionario; "edificada" y "ciudad", de plano/crece.png (R y G, specs/02); la vida
 * de los hitos, de sus definiciones. Puro: recibe todo en `ctx`.
 *
 *   ctx = { indice, epoca (índice o null), primera (la primera época que se muestra), epocas ([{ año }] o null),
 *           etapas(px) → { edificado, urbanizado } | null }
 */
import { vivo } from '../epocas.js'

const CUADRA_M = 130 // la cuadra del damero del centro, de eje a eje de calle
const RADIO_HITO_M = 150 // más lejos que esto, el hito ya no sirve de referencia
const JUNTO_M = 45
const EN_LA_ESQUINA_M = 35
const EN_LA_CUADRA_M = 30
const RUMBOS = Object.freeze(['este', 'sureste', 'sur', 'suroeste', 'oeste', 'noroeste', 'norte', 'noreste'])

/** El rumbo (de ocho) de un desplazamiento en píxeles: x al este, y al sur. */
export const rumbo = (dx, dy) => RUMBOS[((Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) % 8) + 8) % 8]

const km = (m) => `${(m / 1000).toFixed(1).replace('.', ',')} km`

/** "junto a", "a media cuadra", "a 3 cuadras", "a 1,2 km": como se dice una distancia en la calle. */
export function aQueDistancia(m) {
  if (m < JUNTO_M) return 'junto'
  if (m < 95) return 'a media cuadra'
  if (m < 1.5 * CUADRA_M) return 'a una cuadra'
  if (m < 1000) return `a ${Math.round(m / CUADRA_M)} cuadras`
  return `a ${km(m)}`
}

const de = (nombre) => (nombre.startsWith('el ') ? `del ${nombre.slice(3)}` : `de ${nombre}`)
const a = (nombre) => (nombre.startsWith('el ') ? `al ${nombre.slice(3)}` : `a ${nombre}`)
const lista = (nombres) => (nombres.length < 2 ? nombres.join('') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`)
const año = (ctx, i) => ctx.epocas?.[i]?.año
/** La época de la que se habla: la elegida o, sin línea de tiempo, la última. */
const epocaDe = (ctx) => (ctx.epocas?.length ? Math.min(ctx.epocas.length - 1, Math.max(0, ctx.epoca ?? ctx.epocas.length - 1)) : null)

/**
 * Dónde queda `px` respecto de `lugar` (que en esa época puede no existir todavía), en dos partes:
 * { junto, distancia: 'a una cuadra', hacia: 'al norte de la Catedral' }.
 */
function partes(px, lugar, ctx) {
  const m = ctx.indice.metros({ px }, lugar)
  const e = epocaDe(ctx)
  const nombre = lugar.corto ?? lugar.nombre
  const existe = e === null || vivo(lugar.nace, lugar.muere, e) >= 0.5
  const sitio = existe ? nombre : `donde después se levantó ${nombre}`
  if (m < JUNTO_M) return { junto: true, distancia: 'junto', hacia: existe ? a(sitio) : `a ${sitio}` }
  return { junto: false, distancia: aQueDistancia(m), hacia: `al ${rumbo(px[0] - lugar.px[0], px[1] - lugar.px[1])} ${existe ? de(sitio) : `de ${sitio}`}` }
}

/** "a una cuadra al norte de la Catedral", "junto a la Santa Capilla". */
const respectoDe = (px, lugar, ctx) => { const p = partes(px, lugar, ctx); return `${p.distancia} ${p.hacia}` }

/** El hito a menos de 150 m, si hay; si no, la plaza (el primer lugar del índice que se llame así, o el origen). */
function referencia(px, ctx, excepto = null) {
  const cerca = ctx.indice.lugares
    .filter((l) => l !== excepto)
    .map((l) => ({ l, m: ctx.indice.metros({ px }, l) }))
    .filter((c) => c.m <= RADIO_HITO_M)
    .sort((p, q) => p.m - q.m)[0]
  return cerca?.l ?? { nombre: 'la Plaza Bolívar', corto: 'la Plaza Bolívar', px: ctx.indice.plaza, nace: 0, muere: 0 }
}

const queda = (px, ctx, excepto) => `Queda ${respectoDe(px, referencia(px, ctx, excepto), ctx)}.`

/**
 * Qué había en ese punto en la época elegida. `etapas`: desde qué época está edificado y urbanizado
 * (índices de época; Infinity = nunca). "Edificado" en crece.png es "edificado desde entonces sin
 * interrupción": sirve para afirmar que había casas, no para negarlo; el "desde cuándo" sale de lo
 * urbanizado, que no retrocede. Lo anterior a `ctx.primera` (la primera época que se muestra) no se cuenta.
 * `o`: la terminación del adjetivo ("edificada" / "edificado").
 */
export function fraseEpoca(etapas, ctx, o = 'a') {
  const e = epocaDe(ctx)
  if (!etapas || e === null) return ''
  const urbanizado = Math.max(etapas.urbanizado, ctx.primera ?? 0)
  const en = `En ${año(ctx, e)}`
  if (!Number.isFinite(urbanizado)) return `${en} esto no era ciudad, y los planos no lo muestran como ciudad ni siquiera en ${año(ctx, ctx.epocas.length - 1)}.`
  if (urbanizado > e) return `${en} esto todavía era campo: la ciudad llega aquí en el plano de ${año(ctx, urbanizado)}.`
  const desde = urbanizado < e ? ` Es ciudad desde el plano de ${año(ctx, urbanizado)}.` : ''
  return `${en} ya ${etapas.edificado <= e ? `estaba edificad${o}` : 'era parte de la ciudad'}.${desde}`
}

function fraseVida(lugar, ctx) {
  const e = epocaDe(ctx)
  if (e === null) return ''
  if (vivo(lugar.nace, lugar.muere, e) >= 0.5) return `En ${año(ctx, e)} ya existía.`
  if (lugar.muere > 0 && e >= lugar.muere) return `En ${año(ctx, e)} ya no existía.`
  return `En ${año(ctx, e)} todavía no existía: en esta reconstrucción aparece desde ${año(ctx, lugar.nace)}.`
}

const juntar = (...frases) => frases.filter(Boolean).join(' ')
const dudosa = (...esquinas) => {
  const dudosas = esquinas.filter((e) => !e.verificado).map((e) => `«${e.nombre}»`)
  return dudosas.length ? `La lectura de ${lista(dudosas)} en el plano es dudosa.` : ''
}
const cuadrasDesde = (esquina, ctx) => {
  const vecinas = ctx.indice.vecinas(esquina).map((v) => v.nombre)
  return vecinas.length ? `De aquí sale${vecinas.length > 1 ? 'n cuadras' : ' una cuadra'} a ${lista(vecinas)}.` : ''
}

function cuadra(r, ctx) {
  const titulo = `De ${r.a.nombre} a ${r.b.nombre}`
  if (!r.adyacentes) {
    const vecinas = ctx.indice.vecinas(r.a).map((v) => v.nombre)
    return {
      titulo, px: r.px, vista: r.largo,
      texto: juntar(
        `${r.a.nombre} y ${r.b.nombre} no son esquinas vecinas en el plano de 1936: las separan ${r.largo < 1000 ? `unos ${Math.round(r.largo / 10) * 10} m` : km(r.largo)}, más de una cuadra.`,
        'Te marco el punto medio.',
        vecinas.length ? `De ${r.a.nombre} sale${vecinas.length > 1 ? 'n cuadras' : ' una cuadra'} a ${lista(vecinas)}.` : '',
        dudosa(r.a, r.b)),
    }
  }
  const ref = referencia(r.px, ctx)
  const p = partes(r.px, ref, ctx)
  const donde = !ctx.indice.lugares.includes(ref) ? queda(r.px, ctx)
    : `La cuadra ${p.junto ? `que pasa junto ${p.hacia}` : p.hacia}.`
  return {
    titulo, px: r.px, vista: r.largo,
    texto: juntar(
      donde,
      `Va hacia el ${r.hacia}, unos ${Math.round(r.largo / 5) * 5} m.`,
      r.numero ? `El n.º ${r.numero} está en esta cuadra; el plano no dice en qué puerta.` : '',
      dudosa(r.a, r.b),
      fraseEpoca(ctx.etapas?.(r.px), ctx, 'a')),
  }
}

function esquina(r, ctx) {
  const otras = r.otras.length
  return {
    titulo: `Esquina de ${r.esquina.nombre}`, px: r.px, vista: 0,
    texto: juntar(
      queda(r.px, ctx),
      cuadrasDesde(r.esquina, ctx),
      otras ? `En el plano hay ${otras === 1 ? 'otra esquina' : `otras ${otras} esquinas`} con este nombre.` : '',
      dudosa(r.esquina),
      fraseEpoca(ctx.etapas?.(r.px), ctx, 'a')),
  }
}

function lugar(r, ctx) {
  const esLaPlaza = ctx.indice.metros({ px: r.px }, { px: ctx.indice.plaza }) < JUNTO_M
  return {
    titulo: r.lugar.nombre, px: r.px, vista: 0,
    texto: juntar(esLaPlaza ? '' : queda(r.px, ctx, r.lugar), fraseVida(r.lugar, ctx)),
  }
}

/** La cuadra (dos esquinas vecinas) sobre la que cae el punto, o la esquina que tiene al lado. */
function enElDiccionario(px, ctx) {
  const { indice } = ctx
  const [cercana] = indice.esquinas.map((e) => ({ e, m: indice.metros({ px }, e) })).sort((p, q) => p.m - q.m)
  if (cercana && cercana.m <= EN_LA_ESQUINA_M) return `Hoy queda en la esquina de ${cercana.e.nombre}.`
  let mejor = null
  for (const p of indice.esquinas) {
    for (const q of indice.vecinas(p)) {
      if (q.id < p.id) continue
      const [ux, uy] = [q.px[0] - p.px[0], q.px[1] - p.px[1]]
      const t = ((px[0] - p.px[0]) * ux + (px[1] - p.px[1]) * uy) / (ux * ux + uy * uy)
      if (t < 0 || t > 1) continue
      const m = Math.hypot(px[0] - (p.px[0] + t * ux), px[1] - (p.px[1] + t * uy)) * indice.metro
      if (m <= EN_LA_CUADRA_M && (!mejor || m < mejor.m)) mejor = { p, q, m }
    }
  }
  if (!mejor) return ''
  // como se diría en la calle: desde la esquina más cercana a la plaza
  const [desde, hasta] = [mejor.p, mejor.q].sort((p, q) => p.aLaPlaza - q.aLaPlaza)
  return `Hoy queda en la cuadra de ${desde.nombre} a ${hasta.nombre}.`
}

function moderna(r, ctx) {
  const titulo = r.nombre
  if (!r.px) {
    return { titulo, px: null, vista: 0, osm: true, texto: 'No pude ubicarlo sobre el plano.' }
  }
  if (!r.dentro) {
    const plaza = { nombre: 'la Plaza Bolívar', px: ctx.indice.plaza, nace: 0, muere: 0 }
    return { titulo, px: null, vista: 0, osm: true, texto: `Queda fuera del plano de 1936: ${respectoDe(r.px, plaza, { ...ctx, epocas: null })}.` }
  }
  return {
    titulo, px: r.px, vista: 0, osm: true,
    texto: juntar(enElDiccionario(r.px, ctx) || queda(r.px, ctx), fraseEpoca(ctx.etapas?.(r.px), ctx, 'o')),
  }
}

const POR_TIPO = Object.freeze({ cuadra, esquina, lugar, moderna })

/**
 * La respuesta a un resultado de `resolver` (o a un lugar de Nominatim ya pasado a píxeles:
 * { tipo: 'moderna', nombre, px, dentro }): `{ titulo, texto, px (o null si no hay dónde clavar el alfiler),
 * vista (metros que tienen que entrar en la vista; 0 = un punto), osm }`.
 */
export function responder(resultado, ctx) {
  const armar = POR_TIPO[resultado?.tipo]
  if (!armar) throw new Error(`buscador: no hay respuesta para un resultado de tipo "${resultado?.tipo}"`)
  return { osm: false, ...armar(resultado, ctx) }
}

/** La línea chica de cada sugerencia: qué es y por dónde queda. */
export function pista(sugerencia, ctx) {
  const r = sugerencia.resultado
  if (r.tipo === 'cuadra') return `cuadra hacia el ${r.hacia}, ${Math.round(r.largo / 5) * 5} m`
  const plaza = { nombre: 'la plaza', px: ctx.indice.plaza, nace: 0, muere: 0 }
  const donde = respectoDe(r.px, plaza, { ...ctx, epocas: null })
  return `${r.tipo === 'lugar' ? 'lugar' : 'esquina'}, ${donde}`
}

/** Lo que se dice cuando no hay nada que mostrar. `parcial`: de `resolver` ("de X a Y" con un lado conocido). */
export function noEncontre(texto, parcial = null) {
  return juntar(
    `No encontré «${texto}».`,
    parcial ? `Conozco la esquina de ${parcial.conocida.nombre}, pero no «${parcial.desconocida}».` : '',
    'Prueba con dos esquinas («De La Torre a Veroes»), con una sola («Gradillas») o con una dirección de hoy («Avenida Urdaneta»).')
}

/** El aviso amable para cada motivo de ErrorDeBusqueda (src/buscador/nominatim.js). */
export function avisoDeError(motivo) {
  if (motivo === 'limite') return 'El servicio de direcciones de hoy está ocupado. Espera un momento y vuelve a intentarlo.'
  if (motivo === 'red') return 'No pude consultar las direcciones de hoy: revisa tu conexión y vuelve a intentarlo. Las esquinas del plano se buscan sin conexión.'
  return 'El servicio de direcciones de hoy no respondió bien. Vuelve a intentarlo en un momento; las esquinas del plano se buscan igual.'
}
