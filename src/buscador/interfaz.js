/**
 * El buscador en pantalla: la caja con sus sugerencias (combobox de ARIA: flechas, Enter, Escape; "/" la
 * enfoca), el aviso cuando no hay nada y el alfiler con su cartel sobre el plano. La lógica está en
 * src/buscador.js (qué se escribió), prosa.js (qué se responde) y nominatim.js (direcciones de hoy, solo
 * al mandar a buscar). Todo lo que viene de afuera se escribe con textContent.
 */
import './buscador.css'
import { Vector3 } from 'three'
import { indexarEsquinas, resolver, sugerir } from '../buscador.js'
import { lugaresDe } from './lugares.js'
import { responder, pista, noEncontre, avisoDeError } from './prosa.js'
import { crearGeocodificador } from './nominatim.js'
import { crearGeo, elegirLugar } from './geo.js'
import { cargarCrece } from './crece.js'
import { PRIMERA_EPOCA } from '../epocas.js'

const MAX_SUGERENCIAS = 7
const MIN_MODERNA = 3 // letras: con menos no se molesta a Nominatim
const VISTA = Object.freeze({ punto: 420, porMetro: 3.2, max: 2600, pitch: 0.95 }) // distancia de cámara (m) al llegar
const ESPERA_EPOCAS_MS = 1500 // lo que la respuesta espera a los datos de las épocas antes de salir sin ellos
const COPYRIGHT_OSM = 'https://www.openstreetmap.org/copyright'

const crear = (etiqueta, props = {}, atributos = {}) => {
  const e = Object.assign(document.createElement(etiqueta), props)
  for (const [k, v] of Object.entries(atributos)) e.setAttribute(k, v)
  return e
}

/** Un bloque título + prosa + atribución, que se rellena con una respuesta de prosa.js. */
function crearRespuesta() {
  const titulo = crear('h2', { className: 'titulo' })
  const texto = crear('p', { className: 'texto' })
  const fuente = crear('p', { className: 'fuente', hidden: true })
  fuente.append('Dirección de hoy: ', crear('a', { href: COPYRIGHT_OSM, target: '_blank', rel: 'noopener', textContent: '© OpenStreetMap' }))
  return {
    nodos: [titulo, texto, fuente],
    poner(r) {
      titulo.textContent = r.titulo ?? ''
      titulo.hidden = !r.titulo
      texto.textContent = r.texto
      fuente.hidden = !r.osm
    },
  }
}

/**
 * `formulario`: el <form id="buscar"> vacío de index.html. `plano`: ciudad.json. `suelo(x, z)`: la altura
 * del terreno tal como se dibuja. `epoca()`: el índice de la época elegida (o null). `animar`: volar hasta
 * el resultado (si no, salto). Devuelve { buscar, sugerir, limpiar, dibujar, listo, resultado, indice }.
 */
export function crearBuscador({ formulario, plano, coords, camera, cam, suelo, pedirCuadro, hitos = [], epoca = () => null, animar = true, geocodificador = crearGeocodificador() }) {
  const opcionesIndice = { metro: plano.metro, plaza: plano.plaza, lugares: lugaresDe(hitos) }
  let indice = indexarEsquinas([], opcionesIndice)
  let geo = null
  let crece = null
  let crecePedido = null
  let sugerencias = []
  let activa = -1
  let actual = null // { resultado, respuesta, mundo: { x, z }, extremos }
  let epocaPintada = null
  let pedido = 0

  // --- los datos: el diccionario de esquinas y el calce a WGS84 van en un trozo aparte del bundle ---
  const listo = Promise.all([
    import('../../tools/geo/esquinas/1936-esquinas.json').then((m) => { indice = indexarEsquinas(m.default, opcionesIndice) })
      .catch((e) => console.warn(`buscador: sin diccionario de esquinas (${e.message})`)),
    import('../../tools/geo/gcp/1936-wgs84.json').then((m) => { geo = crearGeo({ transformacion: m.default.transformacion, plano }) })
      .catch((e) => console.warn(`buscador: sin calce a WGS84 (${e.message})`)),
  ]).then(() => true)
  // las épocas (crece.json + crece.png) se piden al primer uso; si tardan, la respuesta sale sin años y se completa al llegar
  const pedirCrece = () => (crecePedido ??= cargarCrece({ metro: plano.metro }).then((c) => {
    crece = c
    if (actual) { pintar(); pedirCuadro(2) }
  }))
  const contexto = () => ({ indice, epoca: epoca(), primera: PRIMERA_EPOCA, epocas: crece?.epocas ?? null, etapas: crece ? (px) => crece.etapas(px) : null })

  // --- la caja ---
  const campo = crear('input', { type: 'search', id: 'buscar-campo', placeholder: 'Busca: de La Torre a Veroes', maxLength: 200 }, {
    role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': 'buscar-lista',
    'aria-label': 'Buscar una esquina, una cuadra entre dos esquinas o una dirección de hoy',
    autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search',
  })
  const borrar = crear('button', { type: 'button', className: 'x', textContent: '×', hidden: true, title: 'Borrar' }, { 'aria-label': 'Borrar la búsqueda' })
  const ir = crear('button', { type: 'submit', className: 'ir', textContent: 'Buscar' })
  const lista = crear('ul', { id: 'buscar-lista', className: 'panel bajo', hidden: true }, { role: 'listbox', 'aria-label': 'Sugerencias' })
  const aviso = crear('div', { id: 'buscar-aviso', className: 'panel bajo respuesta', hidden: true }, { role: 'status', 'aria-live': 'polite' })
  const enAviso = crearRespuesta()
  aviso.append(...enAviso.nodos)
  formulario.classList.add('panel')
  formulario.replaceChildren(campo, borrar, ir, lista, aviso)
  formulario.hidden = false

  // --- el alfiler ---
  const raiz = crear('div', { id: 'hallazgo', hidden: true })
  const tramo = crear('div', { className: 'tramo', hidden: true })
  const cartel = crear('section', { className: 'panel cartel respuesta' }, { role: 'status', 'aria-live': 'polite' })
  const enCartel = crearRespuesta()
  const quitar = crear('button', { type: 'button', className: 'x', textContent: '×', title: 'Quitar' }, { 'aria-label': 'Quitar el alfiler' })
  cartel.append(...enCartel.nodos, quitar)
  raiz.append(tramo, crear('div', { className: 'punto' }), crear('div', { className: 'hilo' }), cartel)
  formulario.after(raiz)

  function avisar(respuesta, moderna = false) {
    enAviso.poner(respuesta)
    aviso.classList.toggle('moderna', moderna)
    aviso.hidden = false
  }

  function cerrarLista() {
    sugerencias = []
    activa = -1
    lista.hidden = true
    lista.replaceChildren()
    campo.setAttribute('aria-expanded', 'false')
    campo.removeAttribute('aria-activedescendant')
  }

  function activar(i) {
    activa = i
    ;[...lista.children].forEach((li, k) => li.setAttribute('aria-selected', String(k === i)))
    if (i < 0) return campo.removeAttribute('aria-activedescendant')
    campo.setAttribute('aria-activedescendant', lista.children[i].id)
    lista.children[i].scrollIntoView({ block: 'nearest' })
  }

  function abrirLista() {
    sugerencias = sugerir(indice, campo.value, MAX_SUGERENCIAS)
    if (!sugerencias.length) return cerrarLista()
    const ctx = contexto()
    lista.replaceChildren(...sugerencias.map((s, i) => {
      const li = crear('li', { id: `buscar-opcion-${i}` }, { role: 'option', 'aria-selected': 'false' })
      li.append(crear('span', { className: 'nombre', textContent: s.texto }), crear('span', { className: 'pista', textContent: pista(s, ctx) }))
      li.addEventListener('pointerdown', (e) => e.preventDefault()) // que el campo no pierda el foco
      li.addEventListener('click', () => elegir(s))
      return li
    }))
    activa = -1
    lista.hidden = false
    aviso.hidden = true
    campo.setAttribute('aria-expanded', 'true')
    campo.removeAttribute('aria-activedescendant')
  }

  /** Quita el alfiler y los avisos. */
  function limpiar() {
    pedido++
    actual = null
    raiz.hidden = true
    aviso.hidden = true
    pedirCuadro(2)
  }

  function volar({ x, z }, metros) {
    const vista = { x, z, dist: Math.min(VISTA.max, Math.max(VISTA.punto, metros * VISTA.porMetro)), pitch: VISTA.pitch }
    if (!animar || matchMedia('(prefers-reduced-motion: reduce)').matches) return cam.jump(vista)
    Object.assign(cam.goal, vista) // la cámara persigue su objetivo: llega volando
    pedirCuadro(3)
  }

  function pintar() {
    epocaPintada = epoca()
    actual.respuesta = responder(actual.resultado, contexto())
    enCartel.poner(actual.respuesta)
    raiz.classList.toggle('moderna', actual.resultado.tipo === 'moderna')
    raiz.hidden = false
    actual.ancho = cartel.offsetWidth
  }

  /** Muestra un resultado ya resuelto: el alfiler si tiene dónde, el aviso si no. */
  async function mostrar(resultado) {
    const esta = ++pedido
    await Promise.race([pedirCrece(), new Promise((ok) => setTimeout(ok, ESPERA_EPOCAS_MS))])
    if (esta !== pedido) return null
    const respuesta = responder(resultado, contexto())
    cerrarLista()
    if (!respuesta.px) {
      actual = null
      raiz.hidden = true
      avisar(respuesta, true)
      return { ...respuesta, tipo: resultado.tipo }
    }
    const aMundo = ([px, py]) => coords.aMundo(px, py)
    actual = {
      resultado, mundo: aMundo(respuesta.px),
      extremos: resultado.tipo === 'cuadra' ? [aMundo(resultado.a.px), aMundo(resultado.b.px)] : null,
    }
    aviso.hidden = true
    pintar()
    volar(actual.mundo, respuesta.vista)
    dibujar() // ya en su sitio, sin esperar al próximo cuadro
    return { ...actual.respuesta, tipo: resultado.tipo }
  }

  /** Una dirección de hoy: Nominatim → píxel del plano → respuesta (o el aviso de que no está, o del error). */
  async function buscarModerna({ texto, parcial }) {
    const nada = () => { const r = { tipo: 'nada', titulo: '', texto: noEncontre(texto, parcial), px: null, osm: false }; avisar(r); return r }
    // antes que nada: lo que estuviera pendiente o a la vista ya no vale (tampoco si esta consulta no sale a la red)
    const esta = ++pedido
    actual = null
    raiz.hidden = true
    if (!geo || texto.length < MIN_MODERNA) return nada()
    avisar({ titulo: '', texto: `Buscando «${texto}» entre las direcciones de hoy…`, osm: false })
    let lugares
    try {
      lugares = await geocodificador.buscar(texto)
    } catch (e) {
      if (esta !== pedido || e.motivo === 'reemplazada') return null
      const r = { tipo: 'error', titulo: '', texto: avisoDeError(e.motivo), px: null, osm: false }
      avisar(r)
      return r
    }
    if (esta !== pedido) return null
    const elegido = elegirLugar(lugares, geo)
    return elegido ? mostrar(elegido) : nada()
  }

  /** Lo que pasa al mandar a buscar: primero el diccionario; si no está ahí, las direcciones de hoy. */
  async function buscar(texto = campo.value) {
    await listo
    campo.value = texto
    borrar.hidden = !texto
    const posibles = sugerir(indice, texto, 2)
    cerrarLista()
    const r = resolver(indice, texto)
    if (r.tipo === 'vacia') { limpiar(); return null }
    if (r.tipo !== 'moderna') return mostrar(r)
    // lo escrito no alcanza, pero solo puede ser una cosa: esa
    return posibles.length === 1 ? elegir(posibles[0]) : buscarModerna(r)
  }

  function elegir(sugerencia) {
    campo.value = sugerencia.texto
    borrar.hidden = false
    if (matchMedia('(pointer: coarse)').matches) campo.blur() // en el teléfono, que el teclado deje ver el plano
    return mostrar(sugerencia.resultado)
  }

  campo.addEventListener('input', () => {
    borrar.hidden = !campo.value
    abrirLista()
  })
  campo.addEventListener('focus', () => { pedirCrece(); if (campo.value && !actual) abrirLista() })
  campo.addEventListener('blur', cerrarLista)
  campo.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (lista.hidden) return abrirLista()
      const n = sugerencias.length
      activar(e.key === 'ArrowDown' ? (activa + 1) % n : (activa - 1 + (activa < 0 ? n + 1 : n)) % n)
    } else if (e.key === 'Enter' && activa >= 0) {
      e.preventDefault()
      elegir(sugerencias[activa])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (!lista.hidden) return cerrarLista()
      limpiar()
      campo.blur()
    }
  })
  formulario.addEventListener('submit', (e) => { e.preventDefault(); buscar() })
  borrar.addEventListener('click', () => { campo.value = ''; borrar.hidden = true; cerrarLista(); limpiar(); campo.focus() })
  quitar.addEventListener('click', limpiar)
  addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
    if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      campo.focus()
      campo.select()
    } else if (e.key === 'Escape' && (actual || !aviso.hidden)) limpiar()
  })
  addEventListener('resize', () => { if (actual) actual.ancho = cartel.offsetWidth })

  const v = new Vector3()
  /** En pantalla (píxeles CSS) un punto del suelo, o null si queda detrás de la cámara. */
  const proyectar = ({ x, z }) => {
    v.set(x, suelo(x, z), z).project(camera)
    return v.z > -1 && v.z < 1 ? [((v.x + 1) / 2) * innerWidth, ((1 - v.y) / 2) * innerHeight] : null
  }

  /** Cada cuadro dibujado: el alfiler sigue a su punto del terreno, y la prosa, a la época elegida. */
  function dibujar() {
    if (!actual) return
    if (epoca() !== epocaPintada) pintar()
    const p = proyectar(actual.mundo)
    const fuera = !p || p[0] < -40 || p[1] < -40 || p[0] > innerWidth + 40 || p[1] > innerHeight + 40
    raiz.style.visibility = fuera ? 'hidden' : ''
    if (fuera) return
    raiz.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`
    const mitad = actual.ancho / 2 + 10
    const centro = Math.min(Math.max(p[0], mitad), Math.max(mitad, innerWidth - mitad))
    cartel.style.setProperty('--desvio', `${(centro - p[0]).toFixed(1)}px`)
    const [a, b] = (actual.extremos ?? []).map(proyectar)
    tramo.hidden = !(a && b)
    if (a && b) {
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]]
      tramo.style.width = `${Math.hypot(dx, dy).toFixed(1)}px`
      tramo.style.transform = `translate(${(a[0] - p[0]).toFixed(1)}px,${(a[1] - p[1]).toFixed(1)}px) rotate(${Math.atan2(dy, dx).toFixed(4)}rad)`
    }
  }

  return {
    buscar, limpiar, dibujar, listo,
    sugerir: (texto, max = MAX_SUGERENCIAS) => sugerir(indice, texto, max),
    get indice() { return indice },
    get resultado() { return actual && { ...actual.respuesta, tipo: actual.resultado.tipo, mundo: actual.mundo } },
  }
}
