/**
 * La bienvenida y el panel «Acerca» (specs/01): dos diálogos modales sobre la vista. Qué dicen lo deciden
 * src/intro.js y src/acerca.js; acá solo se arma el DOM y se atienden el teclado, el foco y los toques.
 * Estilos en src/acerca.css. Nada se escribe con innerHTML: los textos que vienen de datos (épocas, fichas
 * de las fuentes) van siempre como texto, y los enlaces, revisados (http o https) y con rel="noopener".
 */
import { TEXTO_INTRO } from './intro.js'
import { seccionesDeAcerca, enlaceSeguro, sitioDe, AUTOR } from './acerca.js'
import './acerca.css'

const ENFOCABLES = 'button, a[href], summary, [tabindex="0"]'
const AIRE_SECCION_PX = 48 // cuánto antes de llegar arriba una sección ya cuenta como la que se lee

function crear(etiqueta, props = {}, ...hijos) {
  const { clase, attrs = {}, ...resto } = props
  const e = Object.assign(document.createElement(etiqueta), resto)
  if (clase) e.className = clase
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v)
  e.append(...hijos.filter((h) => h !== null && h !== ''))
  return e
}

/** Un enlace hacia afuera, o su texto solo si la dirección no es http(s). */
function enlace(texto, url) {
  const href = enlaceSeguro(url)
  return href ? crear('a', { href, target: '_blank', rel: 'noopener', textContent: texto }) : texto
}

/** Un trozo de párrafo: texto, `{ rotulo }`, `{ codigo }` o `{ texto, url }`. */
function parte(p) {
  if (typeof p === 'string') return p
  if (p.rotulo) return crear('b', { clase: 'rotulo', textContent: p.rotulo })
  if (p.codigo) return crear('code', { textContent: p.codigo })
  return enlace(p.texto, p.url)
}

function filaDeFuente(f) {
  const licencia = crear('span', { clase: f.porVerificar ? 'lic verificar' : 'lic' },
    f.porVerificar ? crear('b', { clase: 'marca-verificar', textContent: 'por verificar' }) : null, f.porVerificar ? ' ' : null, f.licencia)
  const fuente = enlaceSeguro(f.url)
  return crear('li', {},
    crear('span', { clase: 'titulo' }, f.cabeza ? crear('b', { clase: 'año', textContent: f.cabeza }) : null, crear('cite', { textContent: f.titulo })),
    f.detalle ? crear('span', { clase: 'detalle', textContent: f.detalle }) : null,
    f.uso ? crear('span', { clase: 'uso', textContent: f.uso }) : null,
    licencia,
    fuente ? crear('span', { clase: 'ir' }, enlace(`Ver en ${sitioDe(fuente)} ↗`, fuente)) : null)
}

function bloque(b) {
  if (b.tipo === 'p') return [crear('p', { clase: b.clase ?? '' }, ...b.partes.map(parte))]
  if (b.tipo === 'epoca') {
    const plano = [b.titulo ? crear('cite', { textContent: b.titulo }) : null, b.autor, b.casas].filter(Boolean)
    return [crear('div', { clase: 'epoca' },
      crear('h4', { textContent: String(b.año) }),
      crear('p', { textContent: b.texto }),
      plano.length ? crear('p', { clase: 'plano' }, ...plano.flatMap((x, i) => (i ? [' · ', x] : [x]))) : null)]
  }
  if (b.tipo === 'controles') {
    return b.grupos.map((g) => crear('div', { clase: g.tactil ? 'controles tactil' : 'controles' },
      crear('h4', { textContent: g.titulo }),
      crear('dl', {}, ...g.filas.flatMap((f) => [
        crear('dt', {}, f.como, f.tecla ? crear('kbd', { textContent: f.tecla }) : null),
        crear('dd', { textContent: f.que }),
      ]))))
  }
  if (b.tipo === 'pasos') {
    return [crear('h4', { textContent: b.titulo }), crear('ol', { clase: 'pasos' }, ...b.pasos.map((partes) => crear('li', {}, ...partes.map(parte))))]
  }
  if (b.tipo === 'fuentes') {
    const filas = crear('ul', { clase: 'fuentes' }, ...b.filas.map(filaDeFuente))
    if (b.plegado) return [crear('details', {}, crear('summary', { textContent: b.titulo }), filas)]
    return [crear('h4', { textContent: b.titulo }), filas]
  }
  return []
}

/**
 * `boton`: el «?» que abre el panel. `mostrarIntro`: si arranca con la bienvenida (src/intro.js);
 * `alCerrarIntro()`: la bienvenida se cerró (para recordarlo); `alVerCrecer()`: pidieron ver crecer la ciudad.
 * `pedirEpocas()` y `pedirCreditos()`: promesas con las épocas de crece.json y los créditos validados (o null);
 * se piden la primera vez que se abre el panel. `desde`: la primera época que se muestra; `acciones`: los
 * controles disponibles; `commit`: la versión que corre (`bloqueDeVersion`). Crea `#intro` y `#acerca` al final de `raiz`.
 */
export function crearAcerca({
  raiz = document.body, boton = null, mostrarIntro = false, alCerrarIntro = () => {}, alVerCrecer = () => {},
  pedirEpocas = async () => null, pedirCreditos = async () => null, desde = 0, acciones, commit = null,
}) {
  const estado = { intro: false, abierta: false, volverA: null, volverDeIntro: null, datos: null, pedido: null }

  // --- la bienvenida ---
  const crecer = crear('button', { clase: 'principal', type: 'button', textContent: TEXTO_INTRO.crecer })
  const entrar = crear('button', { type: 'button', textContent: TEXTO_INTRO.entrar })
  const mas = crear('button', { clase: 'enlace', type: 'button', textContent: TEXTO_INTRO.mas })
  const hojaIntro = crear('div', { clase: 'hoja', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'intro-t', 'aria-describedby': 'intro-d' } },
    crear('h2', { id: 'intro-t', textContent: TEXTO_INTRO.titulo }),
    crear('p', { clase: 'bajada', textContent: TEXTO_INTRO.bajada }),
    crear('p', { clase: 'firma' }, 'Hecho por ', enlace(AUTOR.usuario, AUTOR.url)),
    crear('div', { id: 'intro-d' }, ...TEXTO_INTRO.parrafos.map((t) => crear('p', { textContent: t }))),
    crear('p', { clase: 'como raton', textContent: TEXTO_INTRO.conRaton }),
    crear('p', { clase: 'como dedos', textContent: TEXTO_INTRO.conDedos }),
    crear('div', { clase: 'acciones' }, mas, entrar, crecer))
  const intro = crear('div', { id: 'intro' }, hojaIntro)
  crecer.addEventListener('click', () => { cerrarIntro(); alVerCrecer() })
  entrar.addEventListener('click', () => cerrarIntro())
  mas.addEventListener('click', () => { cerrarIntro(); abrir() })
  intro.addEventListener('click', (e) => { if (e.target === intro) cerrarIntro() })

  // --- el panel ---
  const indice = crear('nav', { attrs: { 'aria-label': 'Secciones' } })
  const cuerpo = crear('div', { clase: 'cuerpo', tabIndex: 0, attrs: { role: 'group', 'aria-label': 'Acerca de este sitio' } })
  const cerrarB = crear('button', { clase: 'x', type: 'button', textContent: '×', attrs: { 'aria-label': 'Cerrar' } })
  const titulo = crear('h2', { id: 'acerca-t', tabIndex: -1, textContent: TEXTO_INTRO.titulo })
  const hoja = crear('div', { clase: 'hoja', attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'acerca-t' } },
    crear('div', { clase: 'cabeza' }, titulo, crear('p', { clase: 'bajada', textContent: TEXTO_INTRO.bajada })),
    indice, cuerpo, cerrarB)
  const acerca = crear('div', { id: 'acerca' }, hoja)
  cerrarB.addEventListener('click', () => cerrar())
  acerca.addEventListener('click', (e) => { if (e.target === acerca) cerrar() })
  cuerpo.addEventListener('scroll', () => marcarSeccion(), { passive: true })
  raiz.append(intro, acerca)
  boton?.addEventListener('click', () => (estado.abierta ? cerrar() : abrir()))

  /** Con un diálogo abierto, lo de atrás queda inerte: ni el foco ni el lector de pantalla salen de él. */
  function aislar() {
    const modal = estado.intro || estado.abierta
    for (const e of raiz.children ?? []) if (e !== intro && e !== acerca) e.inert = modal
  }

  let secciones = []
  function dibujar() {
    const modelo = seccionesDeAcerca({ ...(estado.datos ?? {}), desde, acciones, commit })
    secciones = modelo.map((s) => {
      const cabeza = crear('h3', { id: `acerca-${s.id}`, tabIndex: -1, textContent: s.titulo })
      const cargando = !estado.datos && (s.id === 'epocas' || s.id === 'fuentes')
      const nodo = crear('section', { attrs: { 'aria-labelledby': cabeza.id } }, cabeza,
        ...(cargando ? [crear('p', { clase: 'aviso', textContent: 'Cargando…' })] : s.bloques.flatMap(bloque)))
      const ir = crear('button', { type: 'button', textContent: s.titulo })
      ir.addEventListener('click', () => irA(s.id))
      return { id: s.id, nodo, cabeza, ir }
    })
    indice.replaceChildren(...secciones.map((s) => s.ir))
    cuerpo.replaceChildren(...secciones.map((s) => s.nodo))
    marcarSeccion()
  }

  function marcar(actual) {
    for (const s of secciones) {
      if (s === actual) s.ir.setAttribute('aria-current', 'true'); else s.ir.removeAttribute('aria-current')
    }
    // en el teléfono el índice es una fila que se desliza: la sección que se lee queda a la vista
    const { offsetLeft: x, offsetWidth: ancho } = actual.ir
    if (x < indice.scrollLeft || x + ancho > indice.scrollLeft + indice.clientWidth) indice.scrollLeft = Math.max(0, x - 12)
  }

  /** La sección que se está leyendo queda marcada en el índice (la última, al llegar al fondo). */
  function marcarSeccion() {
    const tope = cuerpo.scrollTop + AIRE_SECCION_PX
    const alFondo = cuerpo.scrollTop > 0 && cuerpo.scrollTop + cuerpo.clientHeight >= cuerpo.scrollHeight - 2
    let actual = secciones[0]
    for (const s of secciones) if (alFondo || s.nodo.offsetTop - cuerpo.offsetTop <= tope) actual = s
    marcar(actual)
  }

  const seccionActual = () => secciones.find((s) => s.ir.getAttribute('aria-current') === 'true')?.id ?? null

  /** Lleva la lectura a una sección, sin tocar el foco. */
  function desplazarA(id) {
    const s = secciones.find((x) => x.id === id)
    if (!s) return null
    cuerpo.scrollTop = Math.max(0, s.nodo.offsetTop - cuerpo.offsetTop)
    marcar(s)
    return s
  }

  /** Va a una sección: la lectura y el foco (en su título). */
  function irA(id) {
    const s = desplazarA(id)
    s?.cabeza.focus({ preventScroll: true })
    return s !== null
  }

  /**
   * Llegaron los datos: se dibuja de nuevo. Con el panel abierto, la lectura sigue en su sección y el foco
   * solo se mueve si lo que lo tenía se reemplazó (va a su reemplazo: el mismo botón del índice o el mismo
   * título); con el panel ya cerrado, no se toca ni la lectura ni el foco.
   */
  function ponerDatos(datos) {
    const foco = document.activeElement
    const lectura = seccionActual()
    const deIndice = secciones.find((s) => s.ir === foco)?.id
    const deTitulo = secciones.find((s) => s.cabeza === foco)?.id
    const deCuerpo = cuerpo.contains(foco) && foco !== cuerpo
    estado.datos = datos
    dibujar()
    if (!estado.abierta) return
    if (lectura && lectura !== secciones[0].id) desplazarA(lectura)
    const nueva = secciones.find((s) => s.id === (deIndice ?? deTitulo))
    if (deIndice) nueva.ir.focus({ preventScroll: true })
    else if (deTitulo) nueva.cabeza.focus({ preventScroll: true })
    else if (deCuerpo) titulo.focus({ preventScroll: true }) // un enlace o un control del texto viejo
  }

  /** Abre el panel (en una sección, si se pide). Los datos se piden la primera vez. */
  function abrir(seccion = null) {
    if (estado.intro) cerrarIntro()
    if (!estado.abierta) estado.volverA = document.activeElement
    estado.abierta = true
    aislar()
    estado.pedido ??= Promise.all([pedirEpocas().catch(() => null), pedirCreditos().catch(() => null)])
      .then(([epocas, creditos]) => ponerDatos({ epocas, creditos }))
    dibujar()
    acerca.classList.add('ver')
    document.body.classList.add('acerca')
    boton?.setAttribute('aria-expanded', 'true')
    cuerpo.scrollTop = 0
    if (!seccion || !irA(seccion)) titulo.focus({ preventScroll: true })
    return estado.pedido
  }

  function cerrar() {
    if (!estado.abierta) return
    estado.abierta = false
    aislar() // antes de devolver el foco: un elemento inerte no lo recibe
    acerca.classList.remove('ver')
    document.body.classList.remove('acerca')
    boton?.setAttribute('aria-expanded', 'false')
    const { volverA } = estado
    estado.volverA = null
    if (volverA?.isConnected && volverA !== document.body) volverA.focus({ preventScroll: true }); else boton?.focus({ preventScroll: true })
  }

  function abrirIntro() {
    if (estado.abierta) cerrar()
    if (!estado.intro) estado.volverDeIntro = document.activeElement
    estado.intro = true
    aislar()
    intro.classList.add('ver')
    document.body.classList.add('intro')
    crecer.focus({ preventScroll: true })
  }

  function cerrarIntro() {
    if (!estado.intro) return
    estado.intro = false
    aislar()
    intro.classList.remove('ver')
    document.body.classList.remove('intro')
    // el foco vuelve a donde estaba; en la primera visita no estaba en ningún control: queda en la página
    const { volverDeIntro } = estado
    estado.volverDeIntro = null
    if (volverDeIntro?.isConnected && volverDeIntro !== document.body) volverDeIntro.focus({ preventScroll: true })
    else if (intro.contains(document.activeElement)) document.activeElement.blur?.()
    alCerrarIntro()
  }

  /** Tab no sale del diálogo abierto. */
  function atraparFoco(e, dialogo) {
    const focos = [...dialogo.querySelectorAll(ENFOCABLES)].filter((el) => el.offsetParent !== null)
    const i = focos.indexOf(document.activeElement)
    const proximo = e.shiftKey ? (i <= 0 ? focos.length - 1 : i - 1) : (i === focos.length - 1 ? 0 : i + 1)
    e.preventDefault()
    focos[proximo]?.focus()
  }

  // Los dos diálogos son modales: con uno abierto, ninguna tecla llega a los atajos de atrás ni a los otros
  // paneles (por eso este oyente se registra antes que los de ellos, y corta también a los de window).
  addEventListener('keydown', (e) => {
    const dialogo = estado.intro ? intro : estado.abierta ? acerca : null
    if (!dialogo) return
    if (e.key === 'Escape') {
      e.preventDefault()
      if (estado.intro) cerrarIntro(); else cerrar()
    } else if (e.key === 'Tab') atraparFoco(e, dialogo)
    e.stopImmediatePropagation()
  }, { capture: true })

  if (mostrarIntro) abrirIntro()

  return {
    abrir, cerrar, abrirIntro, cerrarIntro, irA,
    get abierta() { return estado.abierta },
    get intro() { return estado.intro },
    get seccion() { return seccionActual() },
    get listo() { return estado.datos !== null },
  }
}
