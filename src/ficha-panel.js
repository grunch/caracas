/**
 * El panel de la ficha y el visor de fotos (specs/01 y specs/05). Todo lo que se muestra lo decide
 * src/fichas.js (`contenidoDeFicha`); acá solo se arma el DOM y se atienden el teclado, el foco y los toques.
 * El panel es un diálogo no modal (al costado; en pantallas angostas, una hoja desde abajo); el visor, uno
 * modal a pantalla completa. Estilos en src/fichas.css. Nada se escribe con innerHTML: los textos y los
 * créditos vienen de datos y van siempre como texto.
 */
import { contenidoDeFicha, creditoDeFoto, epocaDeFicha, leerFotos, nombreDeFuente, validarFotos } from './fichas.js'
import { FICHAS } from './fichas-datos.js'
import { epocaAqui } from './epocas.js'
import './fichas.css'

const SIN_FOTO = 'Sin imagen de época confiable de este lugar.'
const DE_OTROS_AÑOS = 'No hay imagen de esta época: las que siguen son de otros años.'
const DESLIZ_PX = 44 // cuánto hay que arrastrar la foto del visor para pasar a la otra

function crear(etiqueta, props = {}, ...hijos) {
  const { clase, attrs = {}, ...resto } = props
  const e = Object.assign(document.createElement(etiqueta), resto)
  if (clase) e.className = clase
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  e.append(...hijos.filter((h) => h !== null && h !== ''))
  return e
}

const enlaceAFuente = (foto, texto) => crear('a', { href: foto.fuente, target: '_blank', rel: 'noopener', textContent: texto })

/** El pie de una foto: qué es, quién y cuándo; debajo, la licencia y el enlace a la fuente. */
function pieDeFoto(foto, { marcarEpoca = false } = {}) {
  const licencia = crear('span', { clase: 'lic' }, `${foto.licencia} · `, enlaceAFuente(foto, `${nombreDeFuente(foto.fuente)} ↗`))
  if (marcarEpoca && foto.deEpoca) licencia.prepend(crear('span', { clase: 'de-epoca', textContent: 'de esta época' }), ' · ')
  return [crear('b', { textContent: foto.titulo }), ' ', crear('i', { textContent: `${creditoDeFoto(foto)}.` }), licencia]
}

/**
 * `marcas`: las de normalizarMarcas; `fichas`: los textos (src/fichas-datos.js); `epocaEn(marca)`: la época
 * (puede ser fraccionaria, en plena ola) que rige en el lugar; `alCerrar(id)`: se cerró la ficha de esa marca.
 * Crea `<aside id="ficha">` y `<div id="visor">` al final de `raiz`.
 */
export function crearFichas({ raiz = document.body, marcas, fichas = {}, epocaEn = () => NaN, alCerrar = () => {}, base = 'fotos/' }) {
  const estado = { marca: null, epoca: null, contenido: null, fotos: [], visor: null }

  // --- el panel ---
  const titulo = crear('h2', { id: 'ficha-titulo', tabIndex: -1 })
  const era = crear('p', { clase: 'era' })
  const cabeza = crear('div', { clase: 'cabeza', attrs: { 'aria-live': 'polite' } }, titulo, era)
  const cuerpo = crear('div', { clase: 'cuerpo', tabIndex: 0, attrs: { role: 'group', 'aria-label': 'Texto y fotos del lugar' } })
  const cerrarB = crear('button', { clase: 'x', type: 'button', textContent: '×', attrs: { 'aria-label': 'Cerrar la ficha' } })
  const panel = crear('aside', { id: 'ficha', attrs: { role: 'dialog', 'aria-labelledby': 'ficha-titulo' } }, cabeza, cuerpo, cerrarB)
  cerrarB.addEventListener('click', () => cerrar())

  // --- el visor ---
  const imagen = crear('img', { alt: '', decoding: 'async' })
  const pie = crear('p', { clase: 'pie', attrs: { 'aria-live': 'polite' } })
  const visorX = crear('button', { clase: 'x', type: 'button', textContent: '×', attrs: { 'aria-label': 'Cerrar la foto' } })
  const anterior = crear('button', { clase: 'ant', type: 'button', textContent: '‹', attrs: { 'aria-label': 'Foto anterior' } })
  const siguiente = crear('button', { clase: 'sig', type: 'button', textContent: '›', attrs: { 'aria-label': 'Foto siguiente' } })
  const visor = crear('div', { id: 'visor', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Foto ampliada' } }, imagen, pie, visorX, anterior, siguiente)
  visorX.addEventListener('click', () => cerrarFoto())
  anterior.addEventListener('click', () => pasarFoto(-1))
  siguiente.addEventListener('click', () => pasarFoto(1))
  visor.addEventListener('click', (e) => { if (e.target === visor) cerrarFoto() })
  let toque = null
  imagen.addEventListener('pointerdown', (e) => { toque = e.clientX })
  imagen.addEventListener('pointerup', (e) => {
    const dx = toque === null ? 0 : e.clientX - toque
    toque = null
    if (Math.abs(dx) > DESLIZ_PX) pasarFoto(dx < 0 ? 1 : -1)
  })
  imagen.addEventListener('pointercancel', () => { toque = null })
  imagen.draggable = false
  raiz.append(panel, visor)

  function figura(foto, indice, marcarEpoca) {
    const img = crear('img', { alt: foto.titulo, loading: 'lazy', decoding: 'async', width: foto.mw, height: foto.mh, src: `${base}m/${foto.id}.webp` })
    const boton = crear('button', { type: 'button', attrs: { 'aria-label': `Agrandar la imagen: ${foto.titulo}` } }, img)
    boton.dataset.foto = foto.id
    boton.addEventListener('click', () => verFoto(indice))
    const fig = crear('figure', {}, boton, crear('figcaption', {}, ...pieDeFoto(foto, { marcarEpoca })))
    img.addEventListener('error', () => fig.classList.add('rota')) // sin el archivo, la foto no deja un hueco
    return fig
  }

  function dibujar() {
    const c = estado.contenido
    titulo.textContent = c.titulo
    era.textContent = c.cuando
    panel.classList.toggle('ausente', !c.existe)
    const [principal, ...demas] = c.fotos
    const texto = crear('div', { clase: 'texto' },
      ...c.parrafos.map((p) => crear('p', { clase: p.rige ? 'epoca rige' : 'epoca' }, c.parrafos.length > 1 ? crear('b', { textContent: String(p.año) }) : null, p.texto)),
      c.hoy ? crear('p', { clase: 'hoyes' }, crear('b', { textContent: 'Hoy' }), ` · ${c.hoy}`) : null,
      c.dudas ? crear('p', { clase: 'dudas' }, crear('b', { textContent: 'Por verificar' }), ` · ${c.dudas}`) : null)
    cuerpo.replaceChildren(...[
      principal && !c.hayDeEpoca ? crear('p', { clase: 'aviso', textContent: DE_OTROS_AÑOS }) : null,
      crear('div', { clase: 'fotos una' }, principal ? figura(principal, 0, c.hayDeEpoca) : null),
      c.nombres.length ? crear('ul', { clase: 'nombres', attrs: { 'aria-label': 'Los nombres del lugar en la línea de tiempo' } },
        ...c.nombres.map((n) => crear('li', { clase: n.rige ? 'rige' : '' }, crear('time', { textContent: n.periodo }), crear('span', { textContent: n.nombre })))) : null,
      texto,
      crear('div', { clase: 'fotos mas' }, ...demas.map((f, i) => figura(f, i + 1, c.hayDeEpoca))),
      principal ? null : crear('p', { clase: 'sinfoto', textContent: SIN_FOTO }),
      c.fuente ? crear('p', { clase: 'fuente' }, crear('b', { textContent: 'Fuente del nombre' }), ` · ${c.fuente}`) : null,
    ].filter(Boolean))
  }

  function componer() {
    estado.contenido = contenidoDeFicha({ marca: estado.marca, ficha: fichas[estado.marca.id], fotos: estado.fotos, epoca: estado.epoca })
    const focoAdentro = cuerpo.contains(document.activeElement) && document.activeElement !== cuerpo
    dibujar()
    if (focoAdentro) titulo.focus({ preventScroll: true }) // el botón que tenía el foco ya no existe
  }

  /** Abre la ficha de una marca (objeto o id). `foco: false` deja el foco donde está. */
  function abrir(marcaOId, { foco = true } = {}) {
    const marca = typeof marcaOId === 'string' ? marcas.find((m) => m.id === marcaOId) : marcaOId
    if (!marca) return false
    estado.marca = marca
    estado.epoca = epocaDeFicha(epocaEn(marca))
    componer()
    cuerpo.scrollTop = 0
    panel.classList.add('ver')
    document.body.classList.add('ficha')
    if (foco) titulo.focus({ preventScroll: true })
    return true
  }

  function cerrar() {
    if (!estado.marca) return
    const id = estado.marca.id
    const teniaFoco = panel.contains(document.activeElement)
    cerrarFoto()
    estado.marca = estado.contenido = null
    panel.classList.remove('ver')
    document.body.classList.remove('ficha')
    alCerrar(id)
    // el foco vuelve al cartel de la marca, si sigue a la vista
    if (teniaFoco) document.querySelector(`#marcas .marca.ver[data-id="${CSS.escape(id)}"] .tag`)?.focus({ preventScroll: true })
  }

  /** Cada cuadro: si la época del lugar cambió con la ficha abierta, se vuelve a armar (nombre, texto, fotos). */
  function actualizar() {
    if (!estado.marca) return
    const epoca = epocaDeFicha(epocaEn(estado.marca))
    if (epoca === estado.epoca) return
    estado.epoca = epoca
    componer()
  }

  function ponerFotos(lista) {
    estado.fotos = validarFotos(lista)
    if (estado.marca) componer()
  }

  // --- el visor: la lista es la de la ficha en el momento de abrirlo ---
  function mostrarFoto() {
    const { fotos, indice } = estado.visor
    const foto = fotos[indice]
    imagen.src = `${base}${foto.id}.webp`
    imagen.alt = foto.titulo
    imagen.width = foto.w
    imagen.height = foto.h
    const institucion = foto.institucion ? `${foto.institucion} · ` : ''
    pie.replaceChildren(
      crear('span', { clase: 'cuenta', textContent: `${indice + 1} de ${fotos.length}` }),
      crear('b', { textContent: foto.titulo }), ' ', crear('i', { textContent: `${creditoDeFoto(foto)}.` }),
      crear('span', { clase: 'lic' }, `${foto.licencia} · ${institucion}`, enlaceAFuente(foto, `Ver en ${nombreDeFuente(foto.fuente)} ↗`)))
  }

  function verFoto(indice) {
    const fotos = estado.contenido?.fotos ?? []
    if (!fotos[indice]) return false
    estado.visor = { fotos, indice, volverA: document.activeElement }
    visor.classList.toggle('una', fotos.length === 1)
    mostrarFoto()
    visor.classList.add('ver')
    visorX.focus({ preventScroll: true })
    return true
  }

  function pasarFoto(paso) {
    if (!estado.visor) return
    const n = estado.visor.fotos.length
    estado.visor.indice = (estado.visor.indice + paso + n) % n
    mostrarFoto()
  }

  function cerrarFoto() {
    if (!estado.visor) return
    const { volverA } = estado.visor
    estado.visor = null
    visor.classList.remove('ver')
    imagen.removeAttribute('src')
    if (volverA?.isConnected) volverA.focus({ preventScroll: true }); else titulo.focus({ preventScroll: true })
  }

  /** Tab no sale del visor mientras está abierto. */
  function atraparFoco(e) {
    const focos = [...visor.querySelectorAll('button, a[href]')].filter((el) => el.offsetParent !== null)
    const i = focos.indexOf(document.activeElement)
    const proximo = e.shiftKey ? (i <= 0 ? focos.length - 1 : i - 1) : (i === focos.length - 1 ? 0 : i + 1)
    e.preventDefault()
    focos[proximo]?.focus()
  }

  addEventListener('keydown', (e) => {
    if (estado.visor) {
      if (e.key === 'Escape') cerrarFoto()
      else if (e.key === 'ArrowLeft') pasarFoto(-1)
      else if (e.key === 'ArrowRight') pasarFoto(1)
      else if (e.key === 'Tab') atraparFoco(e)
      // el visor es modal: ninguna tecla llega a los atajos de atrás («/» del buscador, C, H, M)
      e.stopPropagation()
      return
    }
    // Escape cierra lo de más arriba y nada más (el buscador tiene el suyo); en un campo de texto no es para la
    // ficha, y dentro de un diálogo modal abierto (el visor del plano) es de ese diálogo
    if (e.key !== 'Escape' || !estado.marca || e.target.closest?.('input, textarea, select, [contenteditable], dialog[open]')) return
    cerrar()
    e.stopPropagation()
  }, { capture: true })

  return {
    abrir, cerrar, actualizar, ponerFotos, verFoto, pasarFoto, cerrarFoto,
    get abierta() { return estado.marca?.id ?? null },
    get epoca() { return estado.marca ? estado.epoca : null },
    get contenido() { return estado.contenido },
    get fotos() { return estado.fotos },
    get visor() { return estado.visor ? { indice: estado.visor.indice, id: estado.visor.fotos[estado.visor.indice].id, total: estado.visor.fotos.length } : null },
  }
}

/**
 * Las fichas enganchadas al visor: se abren al abrir una marca (evento `abrirmarca`, src/main.js) y se
 * cierran con ella; la época de cada lugar es la de la ola (los uniforms `U` de la ciudad), como en las marcas.
 * Las fotos llegan después, si hay manifiesto (datos/fotos.json): sin él, las fichas son solo texto.
 */
export function engancharFichas({ capa, U, pedir = (url) => fetch(url) }) {
  const fichas = crearFichas({
    marcas: capa.marcas, fichas: FICHAS,
    epocaEn: (m) => epocaAqui({ de: U.uEpocaDe.value, a: U.uEpocaA.value, ola: U.uOlaEpoca.value, ancho: U.uAnchoOla.value }, Math.hypot(m.x, m.z)),
    alCerrar: (id) => { if (capa.abierta === id) capa.cerrar() },
  })
  // el evento que lanza el visor al abrir una marca; tocar de nuevo el cartel abierto lo cierra, y con él la ficha
  addEventListener('abrirmarca', ({ detail: marca }) => (capa.abierta === marca.id ? fichas.abrir(marca) : fichas.cerrar()))
  leerFotos(pedir).then(fichas.ponerFotos)
  return fichas
}
