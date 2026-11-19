/**
 * El panel del visor del plano de cada época (T25b): un <dialog> modal con el plano viejo en 2D (se
 * arrastra y se acerca) y su crédito. El botón «Ver el plano de <año>» va en el panel de la línea de
 * tiempo. La lógica pura está en src/visor-plano.js.
 */
import { encajar, acercarEn, mover, acotar, imagenesDelPlano, creditoDe, ZOOM_MAX } from './visor-plano.js'

const PASO_TECLA_PX = 70
const ZOOM_TECLA = 1.4
const ZOOM_POR_PIXEL_DE_RUEDA = 0.0016

const crear = (etiqueta, props = {}, ...hijos) => {
  const e = Object.assign(document.createElement(etiqueta), props)
  e.append(...hijos)
  return e
}

/**
 * `contenedor`: donde va el botón (el panel de la línea de tiempo). `indice()`: promesa de los planos
 * calzados (plano/epocas.json → planos); se pide la primera vez que se abre. `base`: las URLs de la hoja
 * base y `añoBase`, su año. Devuelve { elegir(epoca), abrir(), cerrar(), abierto, boton }.
 */
export function crearVisorDePlano({ contenedor, indice, base, añoBase, liviano = false }) {
  const boton = crear('button', { type: 'button', id: 'ver-plano', className: 'ver-plano', hidden: true })
  boton.addEventListener('click', () => abrir())
  contenedor.append(boton)

  let epoca = null
  let dialogo = null // se arma la primera vez que se abre
  let partes = null
  let planos = null
  let estado = { k: 1, x: 0, y: 0 }
  let imagen = { ancho: 0, alto: 0 }
  let pedido = 0 // cada apertura invalida las cargas de la anterior

  const vista = () => ({ ancho: partes.lienzo.clientWidth, alto: partes.lienzo.clientHeight })
  const limites = () => ({ min: Math.min(1, encajar(imagen, vista()).k) * 0.6, max: ZOOM_MAX })
  function poner(nuevo) {
    estado = acotar(nuevo, { ancho: imagen.ancho, alto: imagen.alto }, vista())
    partes.img.style.transform = `translate(${estado.x}px, ${estado.y}px) scale(${estado.k})`
  }
  const centro = () => ({ x: vista().ancho / 2, y: vista().alto / 2 })
  const acercar = (factor, en = centro()) => poner(acercarEn(estado, factor, en, limites()))

  function armar() {
    const img = crear('img', { alt: '', draggable: false })
    const aviso = crear('p', { className: 'aviso' })
    aviso.setAttribute('role', 'status')
    const lienzo = crear('div', { className: 'lienzo', tabIndex: 0 }, img, aviso)
    lienzo.setAttribute('role', 'group')
    lienzo.setAttribute('aria-label', 'El plano. Arrástralo para moverlo; acércalo con la rueda o con las teclas más y menos.')
    const titulo = crear('h2', { id: 'visor-plano-titulo' })
    const autor = crear('p', { className: 'autor' })
    const fuente = crear('p', { className: 'fuente' })
    const nota = crear('p', { className: 'nota' })
    const cerrarB = crear('button', { type: 'button', className: 'cerrar', textContent: '×', title: 'Cerrar (Esc)' })
    cerrarB.setAttribute('aria-label', 'Cerrar el plano')
    const menos = crear('button', { type: 'button', textContent: '−', title: 'Alejar (−)' })
    menos.setAttribute('aria-label', 'Alejar')
    const mas = crear('button', { type: 'button', textContent: '+', title: 'Acercar (+)' })
    mas.setAttribute('aria-label', 'Acercar')
    const entero = crear('button', { type: 'button', textContent: 'Entero', title: 'Ver el plano entero (0)' })
    const zoom = crear('div', { className: 'zoom' }, menos, mas, entero)
    zoom.setAttribute('role', 'group')
    zoom.setAttribute('aria-label', 'Acercar el plano')
    dialogo = crear('dialog', { id: 'visor-plano' }, lienzo, zoom, cerrarB, crear('div', { className: 'pie' }, titulo, autor, fuente, nota))
    dialogo.setAttribute('aria-labelledby', titulo.id)
    partes = { img, aviso, lienzo, titulo, autor, fuente, nota }
    document.body.append(dialogo)

    cerrarB.addEventListener('click', () => cerrar())
    menos.addEventListener('click', () => acercar(1 / ZOOM_TECLA))
    mas.addEventListener('click', () => acercar(ZOOM_TECLA))
    entero.addEventListener('click', () => poner(encajar(imagen, vista())))
    // un click en el telón (fuera del panel) cierra
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) cerrar() })
    // «close» llega en una tarea aparte: si para entonces se volvió a abrir, no toca la apertura nueva
    dialogo.addEventListener('close', () => {
      if (dialogo.open) return
      pedido++
      boton.setAttribute('aria-expanded', 'false')
    })
    // el teclado del visor no llega a la ciudad (C, H, M, Espacio…); Escape lo cierra el propio <dialog>
    dialogo.addEventListener('keydown', (e) => {
      e.stopPropagation()
      if (e.target.closest('button, a')) return
      const flechas = { ArrowLeft: [PASO_TECLA_PX, 0], ArrowRight: [-PASO_TECLA_PX, 0], ArrowUp: [0, PASO_TECLA_PX], ArrowDown: [0, -PASO_TECLA_PX] }
      if (flechas[e.key]) poner(mover(estado, ...flechas[e.key]))
      else if (e.key === '+' || e.key === '=') acercar(ZOOM_TECLA)
      else if (e.key === '-') acercar(1 / ZOOM_TECLA)
      else if (e.key === '0') poner(encajar(imagen, vista()))
      else return
      e.preventDefault()
    })
    for (const tipo of ['keyup', 'wheel', 'pointerdown']) dialogo.addEventListener(tipo, (e) => e.stopPropagation())

    // arrastrar con un puntero; con dos, pellizcar
    const punteros = new Map()
    const enLienzo = (e) => { const r = lienzo.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top } }
    const separacion = () => { const [a, b] = [...punteros.values()]; return Math.hypot(a.x - b.x, a.y - b.y) }
    const medio = () => { const [a, b] = [...punteros.values()]; return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } }
    lienzo.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return
      punteros.set(e.pointerId, enLienzo(e))
      lienzo.setPointerCapture(e.pointerId)
      lienzo.classList.add('arrastrando')
    })
    lienzo.addEventListener('pointermove', (e) => {
      const antes = punteros.get(e.pointerId)
      if (!antes) return
      const ahora = enLienzo(e)
      if (punteros.size === 1) {
        punteros.set(e.pointerId, ahora)
        return poner(mover(estado, ahora.x - antes.x, ahora.y - antes.y))
      }
      // el punto del plano que estaba entre los dos dedos sigue entre los dos dedos: se corre con ellos y se acerca ahí
      const d0 = separacion()
      const medio0 = medio()
      punteros.set(e.pointerId, ahora)
      const medio1 = medio()
      const corrido = mover(estado, medio1.x - medio0.x, medio1.y - medio0.y)
      poner(d0 > 0 ? acercarEn(corrido, separacion() / d0, medio1, limites()) : corrido)
    })
    const soltar = (e) => {
      punteros.delete(e.pointerId)
      if (!punteros.size) lienzo.classList.remove('arrastrando')
    }
    lienzo.addEventListener('pointerup', soltar)
    lienzo.addEventListener('pointercancel', soltar)
    lienzo.addEventListener('wheel', (e) => {
      e.preventDefault()
      acercar(Math.exp(-e.deltaY * ZOOM_POR_PIXEL_DE_RUEDA), enLienzo(e))
    }, { passive: false })
    lienzo.addEventListener('dblclick', (e) => acercar(2, enLienzo(e)))
    addEventListener('resize', () => { if (dialogo.open) poner(estado) })
  }

  function rotular(epoca) {
    const c = creditoDe(epoca)
    partes.titulo.textContent = c.titulo
    partes.autor.textContent = `${c.autor} · ${c.año}`
    const enlace = c.enlace ? crear('a', { href: c.enlace, target: '_blank', rel: 'noopener noreferrer', textContent: c.fuente }) : c.fuente
    partes.fuente.replaceChildren('Fuente: ', enlace, ` · Licencia: ${c.licencia}`)
    partes.img.alt = `${c.titulo} (${c.año})`
  }

  const cargarImagen = (url) => new Promise((ok, mal) => {
    const i = new Image()
    i.onload = () => ok(i)
    i.onerror = () => mal(new Error(`no se pudo cargar ${url}`))
    i.src = url
  })

  /** La imagen de la época con que se abrió (la elegida puede cambiar mientras tanto: el ▶ sigue andando). */
  async function mostrar(epoca) {
    const mio = ++pedido
    const vigente = () => mio === pedido && dialogo.open
    const { img, aviso, nota } = partes
    img.hidden = true
    nota.textContent = ''
    aviso.textContent = `Abriendo el plano de ${epoca.año}…`
    try {
      // sin índice solo se puede ver la hoja base; si falló no se guarda: la próxima apertura lo vuelve a pedir
      const lista = planos ?? await indice().then((p) => (planos = p)).catch((e) => { console.warn(`visor del plano: sin índice (${e.message})`); return [] })
      if (!vigente()) return
      const que = imagenesDelPlano(epoca.año, lista, { base, añoBase, liviano })
      if (!que) throw new Error(`no hay plano de ${epoca.año}`)
      nota.textContent = que.calzado
        ? `Aquí está calzado sobre la hoja de ${añoBase} (estirado para coincidir con ella); el original, sin tocar, está en la fuente.`
        : 'Es la hoja sobre la que está levantada la ciudad.'
      const chica = await cargarImagen(que.urls[0])
      if (!vigente()) return
      imagen = { ancho: chica.naturalWidth, alto: chica.naturalHeight }
      Object.assign(img.style, { width: `${imagen.ancho}px`, height: `${imagen.alto}px` })
      img.src = chica.src
      img.hidden = false
      aviso.textContent = ''
      poner(encajar(imagen, vista()))
      if (!que.urls[1]) return
      // la mejor reemplaza a la chica sin mover nada: ocupa el mismo rectángulo
      const mejor = await cargarImagen(que.urls[1])
      if (vigente()) img.src = mejor.src
    } catch (e) {
      if (!vigente()) return
      if (img.hidden) aviso.textContent = `No se pudo abrir el plano de ${epoca.año}. Ciérralo y prueba de nuevo.`
      console.warn(`visor del plano: ${e.message}`)
    }
  }

  function abrir() {
    if (!epoca || dialogo?.open) return
    if (!dialogo) armar()
    const abierta = epoca // el crédito y la imagen, de la misma época
    rotular(abierta)
    dialogo.showModal()
    boton.setAttribute('aria-expanded', 'true')
    partes.lienzo.focus()
    mostrar(abierta)
  }
  function cerrar() { if (dialogo?.open) dialogo.close() }

  return {
    /** La época elegida en la línea de tiempo (una entrada de datos/crece.json): el botón la nombra. */
    elegir(nueva) {
      epoca = nueva
      boton.hidden = !nueva
      if (!nueva) return
      boton.textContent = `Ver el plano de ${nueva.año}`
      boton.title = `Ver el plano de ${nueva.año}, aparte (P)`
      boton.setAttribute('aria-haspopup', 'dialog')
      boton.setAttribute('aria-expanded', String(Boolean(dialogo?.open)))
    },
    abrir, cerrar, boton,
    get abierto() { return Boolean(dialogo?.open) },
    get estado() { return estado },
  }
}
