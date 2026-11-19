/**
 * El «Acerca» (specs/01): qué estás viendo, cómo moverte, las épocas, las fuentes con sus licencias y los
 * créditos. Este módulo es la lógica pura: con las épocas de la línea de tiempo (datos/crece.json), los
 * créditos (datos/creditos.json, tools/creditos.mjs) y la tabla de controles (src/controles.js) arma lo que
 * muestra el panel (src/acerca-panel.js), como secciones de bloques de texto.
 *
 * Regla: lo que se dice acá tiene que ser cierto según el pipeline (tools/geo/README.md). Lo que el plano no
 * dibuja se nombra como reconstrucción, y de cada fuente se muestra la licencia que trae su ficha, sin
 * completarla: lo que está por verificar se dice así.
 */
import { pieDeEpoca } from './epocas.js'
import { controlesVisibles } from './controles.js'

export const REPOSITORIO = 'https://github.com/grunch/caracas'
export const INSPIRACION = 'https://baires.mormon.garden'

const esTexto = (t) => typeof t === 'string' && t.trim() !== ''

/** El enlace, solo si es http(s); si no, null (los datos son texto ajeno: nunca un `javascript:`). */
export function enlaceSeguro(url) {
  if (!esTexto(url) || !URL.canParse(url.trim())) return null
  const u = new URL(url.trim())
  return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
}

/** El sitio de un enlace, para nombrarlo: «Wikimedia Commons», «archive.org»… */
export function sitioDe(url) {
  const host = new URL(url).hostname.replace(/^www\./, '')
  return host === 'commons.wikimedia.org' ? 'Wikimedia Commons' : host
}

/** «1772», «1772 y 1843», «1772, 1843 y 1889». */
export function enumerar(cosas) {
  const lista = cosas.map(String)
  return lista.length < 2 ? lista.join('') : `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}`
}

/** 33921 → «33.921». */
export const conMiles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const fila = (f, campos) => (f && typeof f === 'object' && campos.every((c) => esTexto(f[c])) ? f : null)
const lista = (x, campos) => (Array.isArray(x) ? x.map((f) => fila(f, campos)).filter(Boolean) : [])

/**
 * Los créditos tal como llegan de datos/creditos.json, revisados: cada fila con sus textos obligatorios y
 * el enlace solo si es http(s). Si no es lo que se espera, null (el panel dice que no hay lista).
 */
export function validarCreditos(json) {
  if (!json || typeof json !== 'object') return null
  const conEnlace = (f) => ({ ...f, url: enlaceSeguro(f.url) })
  const creditos = {
    mapas: lista(json.mapas, ['titulo', 'licencia']).map(conEnlace),
    datos: lista(json.datos, ['titulo', 'licencia']).map(conEnlace),
    fotos: lista(json.fotos, ['titulo', 'autor', 'fecha', 'licencia']).map(conEnlace),
    programas: lista(json.programas, ['nombre']).map(conEnlace),
  }
  return creditos.mapas.length + creditos.datos.length + creditos.fotos.length + creditos.programas.length ? creditos : null
}

/** Pide y revisa los créditos; sin el archivo (la ciudad de demostración de CI), null. */
export async function leerCreditos(pedir, url = 'datos/creditos.json') {
  try {
    const r = await pedir(url)
    return r.ok ? validarCreditos(await r.json()) : null
  } catch {
    return null // no hay archivo, o no es JSON (el servidor de desarrollo responde con la página)
  }
}

/** Las épocas que se muestran: de `desde` a la última, cada una con su año y su plano. */
export const epocasVisibles = (epocas, desde) => (Array.isArray(epocas) ? epocas.slice(desde).filter((e) => Number.isInteger(e?.año) && esTexto(e.corto)) : [])

/**
 * «Qué estás viendo»: qué sale del plano y qué es reconstrucción. `años`: los de la línea de tiempo
 * anteriores al plano base (vacío si esta copia no la trae). Cada párrafo, `{ rotulo, texto }`.
 */
export function queEstasViendo(años = []) {
  const anteriores = años.length
    ? `La ciudad de ${enumerar(años)} no está dibujada de nuevo.`
    : 'La ciudad de los años anteriores no está dibujada de nuevo.'
  return [
    { rotulo: 'El plano', texto: 'La hoja es el plano «Caracas», a escala 1:5.000, que la Dirección de Cartografía Nacional restituyó de fotos aéreas tomadas en marzo de 1936. Son dos hojas escaneadas, enderezadas con su propia cuadrícula y unidas en una. Las dos no llegan a tocarse: en una franja de norte a sur, a poco más de una cuadra al este de la Plaza Bolívar (unos 20 m de ancho en el centro, más hacia el sur), el dibujo está rellenado y no es del original.' },
    { rotulo: 'Lo que sale del plano', texto: 'Un programa separa el dibujo por colores: lo edificado, los patios y solares, las calles, las plazas, el agua y la vegetación. De ahí salen las manzanas, el contorno de lo construido y los árboles de plazas y patios, que están donde el plano los pone. Los árboles del monte están puestos por regla. El relieve tampoco es del plano: es un modelo de elevación actual, sin los edificios y corregido con las cotas que el plano anota en las esquinas, y está exagerado 1,3 veces para que el valle se lea.' },
    { rotulo: 'Lo que es reconstrucción', texto: 'El plano dibuja lo edificado de cada manzana, no dónde termina una casa y empieza la otra. Los solares se trazan por regla (rectos, hacia la calle, de 9 a 14 m de frente), así que el número y el ancho de las casas son verosímiles, no documentados. Tampoco dice cómo eran: los pisos, las fachadas, los techos, las alas y los patios de cada casa se asignan con reglas por época y por distancia a la plaza, calibradas con pinturas, grabados y fotos de entonces. Ninguna casa común está medida ni retratada.' },
    { rotulo: 'Los edificios con nombre', texto: 'La Catedral, el Capitolio, el Panteón y otros edificios con cartel están modelados a mano: la planta sale del plano de 1936; las alturas y las formas, de fotos y pinturas de época. Lo que no se pudo comprobar queda anotado en su ficha como «por verificar».' },
    { rotulo: 'Los años anteriores', texto: `${anteriores} Cada plano viejo se calzó sobre el de 1936 siguiendo las calles, y de él se leyó qué estaba edificado. En cada año quedan en pie las casas de 1936 cuyo lugar ya estaba edificado en ese plano y en los que siguen, con el estilo de la época; lo demás se quita. Por eso las casas más viejas tienen la forma de los solares de 1936, y lo que se tumbó y se volvió a construir entre un plano y otro no se ve.` },
    { rotulo: 'La hoja de cada año', texto: 'Antes de 1936 la hoja muestra el plano base solo donde ya había ciudad, y sin sus letras ni sus cotas, que son de 1936. Alrededor queda papel en blanco con las laderas, el Guaire y las quebradas a pluma: ese dibujo lo hace este sitio con el relieve, no viene de un plano de época, y el curso de las aguas es el de 1936. El plano de cada año, tal como es, se mira aparte con «Ver el plano de…».' },
    { rotulo: 'El error', texto: 'El calce no es parejo. Los planos de 1889 y 1911 coinciden con el de 1936 con pocos metros de diferencia cerca de la Plaza Bolívar y con más hacia las orillas; los de 1772 y 1843, más viejos y menos precisos, se apartan entre 10 y 15 m en casi todas partes, y hasta unos 25 m en algún punto de control. A eso se suma el error del dibujo original. En el borde de la ciudad de cada año, que una casa aparezca en un plano o en el siguiente es una aproximación.' },
    { rotulo: 'Lo de hoy', texto: '«Ver lo de hoy» estampa en rojo las calles, las vías y las quebradas actuales, de OpenStreetMap. En los puntos de control coinciden con el plano de 1936 con menos de 10 m de diferencia.' },
    { rotulo: 'Los nombres y las fotos', texto: 'Cada nombre sale de un plano, y su ficha dice de cuál. Las fotos de las fichas son de dominio público o de licencia libre, con autor, fecha y fuente; donde no hay una imagen confiable, la ficha lo dice.' },
  ]
}

const sinHoja = (titulo) => titulo.replace(/\s*[—–-]\s*hoja \d+ de \d+\s*$/i, '')

/** El párrafo de una época: el pie de la línea de tiempo y, debajo, el plano del que sale. */
export function bloqueDeEpoca(e) {
  const plano = [esTexto(e.titulo) ? sinHoja(e.titulo.trim()) : null, esTexto(e.autor) ? e.autor.trim() : null]
  return {
    tipo: 'epoca', año: e.año, texto: pieDeEpoca(e), titulo: plano[0], autor: plano[1],
    casas: Number.isFinite(e.casas) ? `${conMiles(e.casas)} casas en pie en el modelo` : null,
  }
}

const usoDeMapa = (m) => {
  const años = Array.isArray(m.epocas) ? m.epocas.filter(Number.isInteger) : []
  if (m.base) return `Es el plano base${m.hojas > 1 ? `, en ${m.hojas} hojas` : ''}: de él salen la hoja, las manzanas y las casas.`
  return años.length ? `Calzado sobre el plano base: de él sale la ciudad de ${enumerar(años)}.` : 'Calzado sobre el plano base.'
}

const filaDeMapa = (m) => ({
  cabeza: Number.isInteger(m.año) ? String(m.año) : null, titulo: sinHoja(m.titulo),
  detalle: [m.autor, m.institucion].filter(esTexto).join(' · '), uso: usoDeMapa(m),
  licencia: m.licencia, porVerificar: m.porVerificar === true, url: m.url,
})
const filaDeDato = (d) => ({
  cabeza: null, titulo: d.titulo, detalle: [d.autor, d.institucion].filter(esTexto).join(' · '), uso: null,
  licencia: esTexto(d.atribucion) ? `${d.licencia} · Atribución: ${d.atribucion}` : d.licencia, porVerificar: d.porVerificar === true, url: d.url,
})
const filaDeFoto = (f) => ({
  cabeza: null, titulo: f.titulo, detalle: [`${f.autor}, ${f.fecha}`, f.institucion].filter(esTexto).join(' · '), uso: null,
  licencia: f.licencia, porVerificar: false, url: f.url,
})
const filaDePrograma = (p) => ({
  cabeza: null, titulo: [p.nombre, p.version].filter(esTexto).join(' '), detalle: 'Biblioteca de código que viaja en el sitio.', uso: null,
  licencia: esTexto(p.licencia) ? `Licencia ${p.licencia}` : 'Sin licencia declarada en el paquete.', porVerificar: !esTexto(p.licencia), url: p.url,
})

/** «Fuentes y licencias», desde los créditos ya validados (o null: esta copia no los trae). */
export function bloquesDeFuentes(creditos) {
  if (!creditos) {
    return [{
      tipo: 'p', clase: 'aviso', partes: ['Esta copia del sitio no trae la lista de fuentes (', { codigo: 'datos/creditos.json' },
        '). Las fichas de cada plano y de cada dato, con la licencia que declara su fuente, están en ', { texto: 'el repositorio', url: REPOSITORIO }, '.'],
    }]
  }
  const pendientes = [...creditos.mapas, ...creditos.datos].filter((x) => x.porVerificar === true).length
  const bloques = [{
    tipo: 'p', partes: ['De cada fuente se muestra la licencia que declara quien la publica, copiada de su ficha en el repositorio. Donde la fuente no declara ninguna, se dice así: no es una afirmación de que sea libre.' +
      (pendientes ? ' Lo marcado «por verificar» tiene los derechos en revisión.' : '')],
  }]
  const grupo = (titulo, filas, plegado = false) => { if (filas.length) bloques.push({ tipo: 'fuentes', titulo, filas, plegado }) }
  grupo('Los planos', creditos.mapas.map(filaDeMapa))
  grupo('Otros datos', creditos.datos.map(filaDeDato))
  grupo(`Las fotos de las fichas (${creditos.fotos.length})`, creditos.fotos.map(filaDeFoto), true)
  grupo('Programas', creditos.programas.map(filaDePrograma))
  bloques.push({ tipo: 'p', clase: 'nota', partes: ['Tipografía: las letras con serifa de tu equipo (Iowan Old Style, Palatino o Georgia). El sitio no descarga fuentes ni usa servicios de terceros, salvo el buscador cuando le pides una dirección de hoy.'] })
  return bloques
}

/**
 * Las secciones del panel. `epocas`: las de crece.json (o null); `desde`: la primera que se muestra;
 * `creditos`: lo de `validarCreditos` (o null); `acciones`: los ids de src/controles.js disponibles.
 */
export function seccionesDeAcerca({ epocas = null, desde = 0, creditos = null, acciones } = {}) {
  const visibles = epocasVisibles(epocas, desde)
  const anteriores = visibles.slice(0, -1).map((e) => e.año)
  const lasEpocas = visibles.length
    ? [
      { tipo: 'p', partes: [`La línea de tiempo pasa por ${visibles.length} años. El último, ${visibles.at(-1).año}, es el del plano base; los demás salen de planos más viejos calzados sobre él.`] },
      ...visibles.map(bloqueDeEpoca),
    ]
    : [{ tipo: 'p', clase: 'aviso', partes: ['Esta copia del sitio no trae la línea de tiempo: se ve solo la ciudad del plano base.'] }]
  return [
    { id: 'viendo', titulo: 'Qué estás viendo', bloques: queEstasViendo(anteriores).map(({ rotulo, texto }) => ({ tipo: 'p', partes: [{ rotulo }, texto] })) },
    {
      id: 'moverte', titulo: 'Cómo moverte', bloques: [
        { tipo: 'controles', grupos: controlesVisibles(acciones) },
        { tipo: 'p', clase: 'nota', partes: ['El buscador encuentra las esquinas y los lugares del plano sin salir del sitio. Solo para una dirección de hoy consulta Nominatim, el buscador de OpenStreetMap.'] },
      ],
    },
    { id: 'epocas', titulo: 'Las épocas', bloques: lasEpocas },
    { id: 'fuentes', titulo: 'Fuentes y licencias', bloques: bloquesDeFuentes(creditos) },
    {
      id: 'creditos', titulo: 'Créditos', bloques: [
        { tipo: 'p', partes: ['Este sitio está inspirado en ', { texto: 'baires.mormon.garden', url: INSPIRACION }, ', de @mormonnegro, que levantó así el Buenos Aires de 1867: de ahí vienen la idea y la manera de contarla. El código y los datos de Caracas se hicieron aparte.'] },
        { tipo: 'p', partes: ['Hecho con Claude, de Anthropic.'] },
        { tipo: 'p', partes: ['El código, las fichas de las fuentes y el método están en ', { texto: 'github.com/grunch/caracas', url: REPOSITORIO }, '.'] },
      ],
    },
  ]
}
