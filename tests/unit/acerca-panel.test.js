import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { crearAcerca } from '../../src/acerca-panel.js'
import { TEXTO_INTRO } from '../../src/intro.js'
import { validarCreditos } from '../../src/acerca.js'

/** Un DOM mínimo: lo justo que usan la bienvenida y el panel (árbol, clases, atributos, eventos y foco). */
function crearDom() {
  const doc = { activeElement: null, body: null }
  const elemento = (etiqueta) => {
    const clases = new Set()
    const oyentes = {}
    const e = {
      etiqueta, hijos: [], padre: null, atributos: {}, scrollTop: 0, scrollLeft: 0, offsetTop: 0, offsetLeft: 0, offsetWidth: 0, clientWidth: 0, clientHeight: 0, scrollHeight: 0,
      classList: {
        add: (...c) => c.forEach((x) => clases.add(x)),
        remove: (...c) => c.forEach((x) => clases.delete(x)),
        contains: (c) => clases.has(c),
      },
      set className(v) { clases.clear(); for (const c of String(v).split(' ').filter(Boolean)) clases.add(c) },
      get className() { return [...clases].join(' ') },
      set textContent(v) { e.hijos = [String(v)] },
      get textContent() { return e.hijos.map((h) => (typeof h === 'string' ? h : h.textContent)).join('') },
      adoptar(hs) { for (const h of hs) if (typeof h !== 'string') h.padre = e; return hs },
      append(...hs) { e.hijos.push(...e.adoptar(hs)) },
      // lo que se dibuja de nuevo queda «maquetado»: un hijo cada 500 px (las secciones del panel, a lo alto)
      replaceChildren(...hs) {
        for (const h of e.hijos) if (typeof h !== 'string') h.padre = null
        e.hijos = e.adoptar(hs)
        hs.forEach((h, i) => { if (typeof h !== 'string') h.offsetTop = i * 500 })
      },
      setAttribute(k, v) { e.atributos[k] = String(v) },
      getAttribute(k) { return e.atributos[k] ?? null },
      removeAttribute(k) { delete e.atributos[k] },
      addEventListener(tipo, f) { (oyentes[tipo] ??= []).push(f) },
      emitir(tipo, ev = {}) { for (const f of oyentes[tipo] ?? []) f({ target: e, ...ev }) },
      contains(otro) { for (let n = otro; n; n = n.padre) if (n === e) return true; return false },
      get isConnected() { return doc.body.contains(e) },
      // «visible» como en el navegador: conectado y sin un antepasado oculto por las hojas de estilo
      get offsetParent() {
        if (!e.isConnected) return null
        for (let n = e; n; n = n.padre) if ((n.atributos.id === 'intro' || n.atributos.id === 'acerca' || n.id === 'intro' || n.id === 'acerca') && !n.classList.contains('ver')) return null
        return doc.body
      },
      focus() { doc.activeElement = e },
      blur() { if (doc.activeElement === e) doc.activeElement = doc.body },
      get children() { return e.hijos.filter((h) => typeof h !== 'string') },
      todos() { return e.hijos.filter((h) => typeof h !== 'string').flatMap((h) => [h, ...h.todos()]) },
      // solo el selector de enfocables del panel
      querySelectorAll() {
        return e.todos().filter((h) => h.etiqueta === 'button' || h.etiqueta === 'summary' || (h.etiqueta === 'a' && h.href) || h.tabIndex === 0)
      },
      porEtiqueta(t) { return e.todos().filter((h) => h.etiqueta === t) },
      porClase(c) { return e.todos().filter((h) => h.classList.contains(c)) },
    }
    return e
  }
  doc.createElement = elemento
  doc.body = elemento('body')
  doc.activeElement = doc.body
  return doc
}

const EPOCAS = [
  { año: 1578, corto: 'esquema de Pimentel (1578)' },
  { año: 1772, corto: 'Exato mapa (1772)', titulo: '"Exato mapa"', autor: 'Juan Vicente Bolívar', casas: 1968 },
  { año: 1936, corto: 'plano del DCN (1936)', titulo: 'Caracas. No. 7 — hoja 1 de 2', autor: 'DCN', casas: 33921 },
]
const CREDITOS = validarCreditos({
  mapas: [
    { id: 'exato', año: 1772, titulo: '"Exato mapa"', hojas: 1, autor: 'Juan Vicente Bolívar', institucion: 'AGI', url: 'https://pares.cultura.gob.es/x', licencia: 'Dominio público', porVerificar: false, base: false, epocas: [1772] },
    { id: 'dcn', año: 1936, titulo: 'Caracas. No. 7', hojas: 2, autor: 'DCN', institucion: 'Alberta', url: 'https://archive.org/details/WCWdb_18053', licencia: 'Sin licencia declarada en la fuente; derechos por verificar.', porVerificar: true, base: true, epocas: [1936] },
  ],
  datos: [{ id: 'mal', titulo: '<img src=x onerror=alert(1)>', licencia: 'ODbL', url: 'javascript:alert(1)' }],
  fotos: [{ id: 'a', titulo: 'La plaza.', autor: 'Autor desconocido', fecha: '1910', licencia: 'Dominio público', url: 'https://commons.wikimedia.org/wiki/File:A.jpg' }],
  programas: [{ nombre: 'three', version: '0.187.0', licencia: 'MIT', url: 'https://threejs.org/' }],
})

describe('la bienvenida y el panel «Acerca»', () => {
  let doc
  let oyentes
  let boton
  let avisos
  const tecla = (key, extra = {}) => {
    const ev = { key, target: doc.activeElement, cortado: false, prevenido: false, stopImmediatePropagation() { ev.cortado = true }, preventDefault() { ev.prevenido = true }, ...extra }
    for (const f of oyentes.keydown ?? []) f(ev)
    return ev
  }
  const intro = () => doc.body.hijos.find((h) => h.id === 'intro')
  const panel = () => doc.body.hijos.find((h) => h.id === 'acerca')
  const botonDe = (raiz, texto) => raiz.porEtiqueta('button').find((b) => b.textContent === texto)
  const armar = (opciones = {}) => crearAcerca({
    boton, desde: 1, pedirEpocas: async () => EPOCAS, pedirCreditos: async () => CREDITOS,
    alCerrarIntro: () => avisos.push('intro-cerrada'), alVerCrecer: () => avisos.push('ver-crecer'), ...opciones,
  })

  beforeEach(() => {
    doc = crearDom()
    oyentes = {}
    avisos = []
    vi.stubGlobal('document', doc)
    vi.stubGlobal('addEventListener', (tipo, f, opciones) => { (oyentes[tipo] ??= []).push(f); oyentes[`${tipo}:opciones`] = opciones })
    boton = doc.createElement('button')
    doc.body.append(boton)
  })
  afterEach(() => vi.unstubAllGlobals())

  describe('la bienvenida', () => {
    test('si toca, se muestra al arrancar: diálogo modal con el título, el texto y el foco en «Ver crecer la ciudad»', () => {
      // Act
      const acerca = armar({ mostrarIntro: true })
      // Assert
      expect(acerca.intro).toBe(true)
      expect(intro().classList.contains('ver')).toBe(true)
      expect(doc.body.classList.contains('intro')).toBe(true)
      const dialogo = intro().hijos[0]
      expect(dialogo.atributos).toMatchObject({ role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'intro-t', 'aria-describedby': 'intro-d' })
      expect(intro().porEtiqueta('h2')[0].textContent).toBe(TEXTO_INTRO.titulo)
      expect(intro().textContent).toContain(TEXTO_INTRO.parrafos[1])
      expect(doc.activeElement.textContent).toBe('Ver crecer la ciudad')
    })

    test('si no toca, no se muestra ni se lleva el foco', () => {
      const acerca = armar({ mostrarIntro: false })
      expect(acerca.intro).toBe(false)
      expect(intro().classList.contains('ver')).toBe(false)
      expect(doc.activeElement).toBe(doc.body)
    })

    test('«Entrar» la cierra y avisa (para recordar que ya se vio); el foco no queda en un botón oculto', () => {
      const acerca = armar({ mostrarIntro: true })
      botonDe(intro(), 'Entrar').emitir('click')
      expect(acerca.intro).toBe(false)
      expect(intro().classList.contains('ver')).toBe(false)
      expect(doc.body.classList.contains('intro')).toBe(false)
      expect(avisos).toEqual(['intro-cerrada'])
      expect(doc.activeElement).toBe(doc.body)
    })

    test('«Ver crecer la ciudad» la cierra y pide el recorrido', () => {
      const acerca = armar({ mostrarIntro: true })
      botonDe(intro(), 'Ver crecer la ciudad').emitir('click')
      expect(acerca.intro).toBe(false)
      expect(avisos).toEqual(['intro-cerrada', 'ver-crecer'])
    })

    test('Escape la cierra, y esa tecla no llega a nadie más', () => {
      const acerca = armar({ mostrarIntro: true })
      const ev = tecla('Escape')
      expect(acerca.intro).toBe(false)
      expect(ev).toMatchObject({ cortado: true, prevenido: true })
      expect(avisos).toEqual(['intro-cerrada'])
    })

    test('un click fuera de la hoja la cierra; uno adentro, no', () => {
      const acerca = armar({ mostrarIntro: true })
      intro().emitir('click', { target: intro().hijos[0] })
      expect(acerca.intro).toBe(true)
      intro().emitir('click')
      expect(acerca.intro).toBe(false)
    })

    test('es modal: con ella abierta ninguna tecla llega a los atajos de atrás, y Tab da la vuelta entre sus botones', () => {
      armar({ mostrarIntro: true })
      expect(oyentes['keydown:opciones']).toEqual({ capture: true })
      expect(tecla('c').cortado).toBe(true)
      expect(tecla(' ').cortado).toBe(true)
      const orden = []
      for (let i = 0; i < 3; i++) { expect(tecla('Tab').prevenido).toBe(true); orden.push(doc.activeElement.textContent) }
      expect(orden).toEqual([TEXTO_INTRO.mas, 'Entrar', 'Ver crecer la ciudad'])
      tecla('Tab', { shiftKey: true })
      expect(doc.activeElement.textContent).toBe('Entrar')
    })

    test('cerrada, las teclas pasan de largo', () => {
      armar({ mostrarIntro: false })
      expect(tecla('c')).toMatchObject({ cortado: false, prevenido: false })
      expect(tecla('Escape').cortado).toBe(false)
    })

    test('el enlace de la bienvenida la cierra y abre el panel', async () => {
      const acerca = armar({ mostrarIntro: true })
      botonDe(intro(), TEXTO_INTRO.mas).emitir('click')
      expect(acerca.intro).toBe(false)
      expect(acerca.abierta).toBe(true)
      expect(avisos).toEqual(['intro-cerrada'])
    })

    test('se puede volver a abrir (?intro, o desde código)', () => {
      const acerca = armar()
      acerca.abrirIntro()
      expect(acerca.intro).toBe(true)
      acerca.cerrarIntro()
      acerca.cerrarIntro() // la segunda no avisa de nuevo
      expect(avisos).toEqual(['intro-cerrada'])
    })
  })

  describe('el panel', () => {
    test('el «?» lo abre: diálogo modal con las cinco secciones y el foco en el título', async () => {
      // Arrange
      const acerca = armar()
      // Act
      boton.emitir('click')
      await acerca.abrir()
      // Assert
      expect(acerca.abierta).toBe(true)
      expect(panel().classList.contains('ver')).toBe(true)
      expect(doc.body.classList.contains('acerca')).toBe(true)
      expect(boton.atributos['aria-expanded']).toBe('true')
      expect(panel().hijos[0].atributos).toMatchObject({ role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'acerca-t' })
      expect(panel().porEtiqueta('h3').map((h) => h.textContent)).toEqual(['Qué estás viendo', 'Cómo moverte', 'Las épocas', 'Fuentes y licencias', 'Créditos'])
      expect(panel().porEtiqueta('nav')[0].hijos.map((b) => b.textContent)).toEqual(['Qué estás viendo', 'Cómo moverte', 'Las épocas', 'Fuentes y licencias', 'Créditos'])
      expect(doc.activeElement.id).toBe('acerca-t')
    })

    test('mientras llegan los datos dice «Cargando…»; después muestra las épocas y las fuentes', async () => {
      const acerca = armar()
      const pedido = acerca.abrir()
      expect(acerca.listo).toBe(false)
      expect(panel().porClase('aviso').map((p) => p.textContent)).toEqual(['Cargando…', 'Cargando…'])
      await pedido
      expect(acerca.listo).toBe(true)
      expect(panel().porClase('epoca').map((e) => e.porEtiqueta('h4')[0].textContent)).toEqual(['1772', '1936'])
      expect(panel().porClase('fuentes')).toHaveLength(4)
    })

    test('los datos se piden una sola vez, la primera que se abre', async () => {
      const pedirCreditos = vi.fn(async () => CREDITOS)
      const acerca = armar({ pedirCreditos })
      expect(pedirCreditos).not.toHaveBeenCalled()
      await acerca.abrir()
      acerca.cerrar()
      await acerca.abrir()
      expect(pedirCreditos).toHaveBeenCalledTimes(1)
    })

    test('lo que está por verificar lleva su marca y su texto, y nada más', async () => {
      const acerca = armar()
      await acerca.abrir()
      const pendientes = panel().porClase('verificar')
      expect(pendientes).toHaveLength(1)
      expect(pendientes[0].textContent).toBe('por verificar Sin licencia declarada en la fuente; derechos por verificar.')
      expect(panel().porClase('lic').map((l) => l.textContent)).toContain('Dominio público')
    })

    test('los textos de los datos van como texto y un enlace que no es http(s) no se enlaza', async () => {
      const acerca = armar()
      await acerca.abrir()
      const enlaces = panel().porEtiqueta('a')
      expect(panel().porEtiqueta('img')).toEqual([])
      expect(panel().textContent).toContain('<img src=x onerror=alert(1)>')
      for (const a of enlaces) {
        expect(a.href).toMatch(/^https:\/\//)
        expect(a).toMatchObject({ target: '_blank', rel: 'noopener' })
      }
      expect(enlaces.map((a) => a.href)).not.toContain('javascript:alert(1)')
      expect(enlaces.map((a) => a.textContent)).toContain('Ver en archive.org ↗')
    })

    test('las fotos van plegadas en un <details>', async () => {
      const acerca = armar()
      await acerca.abrir()
      const [plegado] = panel().porEtiqueta('details')
      expect(plegado.porEtiqueta('summary')[0].textContent).toBe('Las fotos de las fichas (1)')
      expect(plegado.porEtiqueta('li')).toHaveLength(1)
    })

    test('los controles salen con su tecla', async () => {
      const acerca = armar({ acciones: ['color', 'acerca'] })
      await acerca.abrir()
      expect(panel().porEtiqueta('kbd').map((k) => k.textContent)).toEqual(['C', '? o F1'])
    })

    test('sin línea de tiempo ni créditos (la demo de CI), o si el pedido falla, lo dice y sigue andando', async () => {
      const acerca = armar({ pedirEpocas: async () => { throw new Error('404') }, pedirCreditos: async () => null })
      await acerca.abrir()
      expect(acerca.listo).toBe(true)
      const avisosDelPanel = panel().porClase('aviso').map((p) => p.textContent).join(' ')
      expect(avisosDelPanel).toMatch(/no trae la línea de tiempo/)
      expect(avisosDelPanel).toMatch(/no trae la lista de fuentes/)
      expect(panel().porEtiqueta('h3')).toHaveLength(5)
    })

    test('Escape lo cierra y el foco vuelve a donde estaba', async () => {
      const acerca = armar()
      boton.focus()
      await acerca.abrir()
      const ev = tecla('Escape')
      expect(acerca.abierta).toBe(false)
      expect(panel().classList.contains('ver')).toBe(false)
      expect(doc.body.classList.contains('acerca')).toBe(false)
      expect(boton.atributos['aria-expanded']).toBe('false')
      expect(ev).toMatchObject({ cortado: true, prevenido: true })
      expect(doc.activeElement).toBe(boton)
    })

    test('abierto desde el teclado (sin foco en nada), al cerrar el foco va al «?»', async () => {
      const acerca = armar()
      await acerca.abrir()
      panel().porClase('x')[0].emitir('click')
      expect(acerca.abierta).toBe(false)
      expect(doc.activeElement).toBe(boton)
    })

    test('el «?» también lo cierra, y un click fuera de la hoja', async () => {
      const acerca = armar()
      boton.emitir('click')
      expect(acerca.abierta).toBe(true)
      boton.emitir('click')
      expect(acerca.abierta).toBe(false)
      await acerca.abrir()
      panel().emitir('click', { target: panel().hijos[0] })
      expect(acerca.abierta).toBe(true)
      panel().emitir('click')
      expect(acerca.abierta).toBe(false)
    })

    test('es modal: Tab no sale del panel y las demás teclas no llegan a los atajos', async () => {
      const acerca = armar()
      await acerca.abrir()
      expect(tecla('h').cortado).toBe(true)
      const vistos = new Set()
      for (let i = 0; i < 40; i++) { tecla('Tab'); vistos.add(doc.activeElement) }
      for (const e of vistos) expect(panel().contains(e)).toBe(true)
      expect(vistos.has(panel().porClase('x')[0])).toBe(true)
      expect(vistos.has(boton)).toBe(false)
    })

    test('el índice lleva a cada sección: mueve la lectura, enfoca su título y la marca', async () => {
      // Arrange
      const acerca = armar()
      await acerca.abrir()
      const cuerpo = panel().porClase('cuerpo')[0]
      // Act
      botonDe(panel().porEtiqueta('nav')[0], 'Fuentes y licencias').emitir('click')
      // Assert
      expect(cuerpo.scrollTop).toBe(1500)
      expect(doc.activeElement.id).toBe('acerca-fuentes')
      expect(acerca.seccion).toBe('fuentes')
      expect(acerca.irA('no-existe')).toBe(false)
    })

    test('al leer, el índice marca la sección que está arriba; al llegar al fondo, la última', async () => {
      const acerca = armar()
      await acerca.abrir()
      const cuerpo = panel().porClase('cuerpo')[0]
      Object.assign(cuerpo, { clientHeight: 600, scrollHeight: 2300 })
      expect(acerca.seccion).toBe('viendo')
      cuerpo.scrollTop = 980
      cuerpo.emitir('scroll')
      expect(acerca.seccion).toBe('epocas')
      cuerpo.scrollTop = 1700
      cuerpo.emitir('scroll')
      expect(acerca.seccion).toBe('creditos')
    })

    test('abrir en una sección va directo a ella', async () => {
      const acerca = armar()
      acerca.abrir('fuentes')
      expect(doc.activeElement.id).toBe('acerca-fuentes')
      expect(acerca.seccion).toBe('fuentes')
    })

    test('si los datos llegan mientras se lee otra sección, la lectura sigue ahí', async () => {
      const acerca = armar()
      const pedido = acerca.abrir('creditos')
      await pedido
      expect(acerca.seccion).toBe('creditos')
      expect(doc.activeElement.id).toBe('acerca-creditos')
    })

    test('con un diálogo abierto lo de atrás queda inerte, y deja de estarlo al cerrar (también al pasar de uno a otro)', async () => {
      const acerca = armar({ mostrarIntro: true })
      expect(boton.inert).toBe(true)
      expect([intro().inert, panel().inert]).toEqual([undefined, undefined])
      botonDe(intro(), TEXTO_INTRO.mas).emitir('click') // de la bienvenida al panel
      expect(boton.inert).toBe(true)
      acerca.cerrar()
      expect(boton.inert).toBe(false)
      expect(doc.activeElement).toBe(boton)
    })

    test('abrir el panel cierra la bienvenida, y abrir la bienvenida cierra el panel: nunca los dos', async () => {
      const acerca = armar({ mostrarIntro: true })
      await acerca.abrir()
      expect([acerca.intro, acerca.abierta]).toEqual([false, true])
      acerca.abrirIntro()
      expect([acerca.intro, acerca.abierta]).toEqual([true, false])
    })
  })
})
