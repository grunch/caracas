import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { crearVisorDePlano } from '../../src/visor-plano-panel.js'
import { ZOOM_MAX } from '../../src/visor-plano.js'

/** Un DOM mínimo: lo justo que usa el panel (hijos, atributos, clases, estilos, eventos, <dialog>). */
function elementoFalso(etiqueta) {
  const oyentes = {}
  const clases = new Set()
  const e = {
    etiqueta, hijos: [], atributos: {}, style: {}, textContent: '', hidden: false, open: false, enfocado: false,
    clientWidth: 1000, clientHeight: 800,
    classList: { add: (c) => clases.add(c), remove: (c) => clases.delete(c), contains: (c) => clases.has(c) },
    append(...h) { e.hijos.push(...h) },
    replaceChildren(...h) { e.hijos = h },
    setAttribute(k, v) { e.atributos[k] = String(v) },
    addEventListener(tipo, f) { (oyentes[tipo] ??= []).push(f) },
    emitir(tipo, ev = {}) {
      const evento = { target: e, preventDefault: vi.fn(), stopPropagation: vi.fn(), ...ev }
      for (const f of oyentes[tipo] ?? []) f(evento)
      return evento
    },
    closest: (sel) => (sel.split(',').map((s) => s.trim()).includes(etiqueta) ? e : null),
    focus() { e.enfocado = true },
    showModal() { e.open = true },
    close() { e.open = false; e.emitir('close') },
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setPointerCapture: vi.fn(),
    /** Todo el texto de adentro, para leer el pie. */
    get texto() { return e.textContent + e.hijos.map((h) => (typeof h === 'string' ? h : h.texto)).join('') },
    buscar(pred) {
      for (const h of e.hijos) {
        if (typeof h === 'string') continue
        if (pred(h)) return h
        const adentro = h.buscar(pred)
        if (adentro) return adentro
      }
      return null
    },
  }
  return e
}

const EPOCA = {
  año: 1772, titulo: 'Exato mapa', autor: 'J. V. Bolívar',
  fuente: 'Archivo General de Indias · https://example.org/exato', licencia: 'Dominio público',
}
const INDICE = [{ año: 1772, niveles: [{ url: 'plano/1772/chico.webp', lado: 2048 }, { url: 'plano/1772/medio.webp', lado: 4096 }] }]

describe('el panel del visor del plano de la época', () => {
  let cuerpo
  let contenedor
  let imagenes
  let fallan
  const cuadros = () => new Promise((r) => setTimeout(r, 0))

  beforeEach(() => {
    cuerpo = elementoFalso('body')
    contenedor = elementoFalso('div')
    imagenes = []
    fallan = new Set()
    vi.stubGlobal('document', { createElement: elementoFalso, body: cuerpo })
    vi.stubGlobal('addEventListener', vi.fn())
    vi.stubGlobal('Image', class {
      set src(url) {
        this.url = url
        imagenes.push(url)
        queueMicrotask(() => {
          if (fallan.has(url)) return this.onerror()
          Object.assign(this, { naturalWidth: 2000, naturalHeight: 1000 })
          this.onload()
        })
      }
      get src() { return this.url }
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  const crearVisor = (extra = {}) => crearVisorDePlano({
    contenedor, indice: () => Promise.resolve(INDICE), base: ['plano/chico.webp', 'plano/medio.webp'], añoBase: 1936, ...extra,
  })
  const dialogo = () => cuerpo.hijos[0]
  const parte = (clase) => dialogo().buscar((h) => h.className === clase)
  const img = () => dialogo().buscar((h) => h.etiqueta === 'img')

  test('el botón va en el panel de la línea de tiempo y nombra el año elegido', () => {
    const visor = crearVisor()
    expect(contenedor.hijos).toEqual([visor.boton])
    expect(visor.boton.hidden).toBe(true)
    visor.elegir(EPOCA)
    expect(visor.boton.hidden).toBe(false)
    expect(visor.boton.textContent).toBe('Ver el plano de 1772')
    expect(visor.boton.title).toContain('(P)')
    expect(visor.boton.atributos['aria-haspopup']).toBe('dialog')
    expect(visor.boton.atributos['aria-expanded']).toBe('false')
    visor.elegir(null)
    expect(visor.boton.hidden).toBe(true)
  })

  test('sin época elegida no abre nada', () => {
    const visor = crearVisor()
    visor.abrir()
    expect(cuerpo.hijos).toEqual([])
    expect(visor.abierto).toBe(false)
  })

  test('al abrir: un diálogo modal con título, autor, año, fuente enlazada y licencia; la imagen chica y después la mejor', async () => {
    const visor = crearVisor()
    visor.elegir(EPOCA)
    visor.boton.emitir('click')
    expect(dialogo().etiqueta).toBe('dialog')
    expect(dialogo().open).toBe(true)
    expect(visor.abierto).toBe(true)
    expect(visor.boton.atributos['aria-expanded']).toBe('true')
    const titulo = dialogo().buscar((h) => h.etiqueta === 'h2')
    expect(titulo.textContent).toBe('Exato mapa')
    expect(dialogo().atributos['aria-labelledby']).toBe(titulo.id)
    expect(parte('autor').textContent).toBe('J. V. Bolívar · 1772')
    const enlace = parte('fuente').buscar((h) => h.etiqueta === 'a')
    expect(enlace.href).toBe('https://example.org/exato')
    expect(enlace.rel).toContain('noopener')
    expect(parte('fuente').texto).toBe('Fuente: Archivo General de Indias · Licencia: Dominio público')
    expect(parte('lienzo').enfocado).toBe(true)
    expect(parte('aviso').textContent).toBe('Abriendo el plano de 1772…')

    await cuadros()
    expect(imagenes).toEqual(['plano/1772/chico.webp', 'plano/1772/medio.webp'])
    expect(img().src).toBe('plano/1772/medio.webp')
    expect(img().alt).toBe('Exato mapa (1772)')
    expect(img().style.width).toBe('2000px') // la mejor ocupa el rectángulo de la chica: no se mueve nada
    expect(parte('aviso').textContent).toBe('')
    expect(parte('nota').textContent).toContain('calzado sobre la hoja de 1936')
    // entero y centrado: 2000 × 1000 en 1000 × 800
    expect(visor.estado).toEqual({ k: 0.5, x: 0, y: 150 })
    expect(img().style.transform).toBe('translate(0px, 150px) scale(0.5)')
  })

  test('la rueda, los botones y el teclado acercan y mueven; 0 lo vuelve entero; las teclas no salen del visor', async () => {
    const visor = crearVisor()
    visor.elegir(EPOCA)
    visor.abrir()
    await cuadros()
    const lienzo = parte('lienzo')

    const rueda = lienzo.emitir('wheel', { deltaY: -400, clientX: 500, clientY: 400 })
    expect(rueda.preventDefault).toHaveBeenCalled()
    expect(visor.estado.k).toBeGreaterThan(0.5)
    dialogo().emitir('keydown', { key: '0', target: lienzo })
    expect(visor.estado).toEqual({ k: 0.5, x: 0, y: 150 })

    const [menos, mas, entero] = parte('zoom').hijos
    mas.emitir('click')
    expect(visor.estado.k).toBeCloseTo(0.7)
    menos.emitir('click')
    expect(visor.estado.k).toBeCloseTo(0.5)
    for (let i = 0; i < 20; i++) mas.emitir('click')
    expect(visor.estado.k).toBe(ZOOM_MAX)
    entero.emitir('click')
    expect(visor.estado.k).toBe(0.5)

    const tecla = dialogo().emitir('keydown', { key: 'ArrowLeft', target: lienzo })
    expect(tecla.stopPropagation).toHaveBeenCalled() // C, H, M y Espacio no llegan a la ciudad
    expect(tecla.preventDefault).toHaveBeenCalled()
    expect(visor.estado.x).toBe(70)
    dialogo().emitir('keydown', { key: 'ArrowDown', target: lienzo })
    expect(visor.estado.y).toBe(80)
    dialogo().emitir('keydown', { key: '+', target: lienzo })
    expect(visor.estado.k).toBeCloseTo(0.7)
    dialogo().emitir('keydown', { key: '-', target: lienzo })
    expect(visor.estado.k).toBeCloseTo(0.5)
    const otra = dialogo().emitir('keydown', { key: 'c', target: lienzo })
    expect(otra.stopPropagation).toHaveBeenCalled()
    expect(otra.preventDefault).not.toHaveBeenCalled()
    // en un botón del visor las teclas son del botón
    const antes = visor.estado
    dialogo().emitir('keydown', { key: 'ArrowLeft', target: mas })
    expect(visor.estado).toBe(antes)

    lienzo.emitir('dblclick', { clientX: 500, clientY: 400 })
    expect(visor.estado.k).toBeCloseTo(1)
  })

  test('se arrastra con un puntero y se pellizca con dos', async () => {
    const visor = crearVisor()
    visor.elegir(EPOCA)
    visor.abrir()
    await cuadros()
    const lienzo = parte('lienzo')

    lienzo.emitir('pointerdown', { button: 0, pointerId: 1, clientX: 100, clientY: 100 })
    expect(lienzo.classList.contains('arrastrando')).toBe(true)
    lienzo.emitir('pointermove', { pointerId: 1, clientX: 130, clientY: 90 })
    expect(visor.estado).toEqual({ k: 0.5, x: 30, y: 140 })
    lienzo.emitir('pointermove', { pointerId: 9, clientX: 0, clientY: 0 }) // un puntero que no bajó acá
    expect(visor.estado).toEqual({ k: 0.5, x: 30, y: 140 })

    lienzo.emitir('pointerdown', { button: 0, pointerId: 2, clientX: 230, clientY: 90 })
    lienzo.emitir('pointermove', { pointerId: 2, clientX: 330, clientY: 90 }) // de 100 px a 200 px de separación
    expect(visor.estado.k).toBeCloseTo(1)
    lienzo.emitir('pointerup', { pointerId: 2 })
    expect(lienzo.classList.contains('arrastrando')).toBe(true)
    lienzo.emitir('pointercancel', { pointerId: 1 })
    expect(lienzo.classList.contains('arrastrando')).toBe(false)

    const k = visor.estado.k
    lienzo.emitir('pointerdown', { button: 2, pointerId: 3, clientX: 0, clientY: 0 }) // el botón derecho no arrastra
    lienzo.emitir('pointermove', { pointerId: 3, clientX: 50, clientY: 50 })
    expect(visor.estado.k).toBe(k)
  })

  test('× y un click en el telón lo cierran; abrirlo dos veces no arma otro', async () => {
    const visor = crearVisor()
    visor.elegir(EPOCA)
    visor.abrir()
    visor.abrir()
    expect(cuerpo.hijos).toHaveLength(1)
    parte('cerrar').emitir('click')
    expect(visor.abierto).toBe(false)
    expect(visor.boton.atributos['aria-expanded']).toBe('false')
    visor.abrir()
    expect(cuerpo.hijos).toHaveLength(1)
    dialogo().emitir('click', { target: parte('lienzo') }) // adentro: no cierra
    expect(visor.abierto).toBe(true)
    dialogo().emitir('click', { target: dialogo() })
    expect(visor.abierto).toBe(false)
    visor.cerrar() // cerrado: no hace nada
    await cuadros()
  })

  test('1936 muestra la hoja base; sin fuente con dirección, el crédito va como texto', async () => {
    const visor = crearVisor()
    visor.elegir({ año: 1936, titulo: 'Caracas. No. 7', autor: 'MOP', fuente: 'Internet Archive', licencia: 'sin licencia declarada' })
    visor.abrir()
    await cuadros()
    expect(imagenes).toEqual(['plano/chico.webp', 'plano/medio.webp'])
    expect(parte('nota').textContent).toBe('Es la hoja sobre la que está levantada la ciudad.')
    expect(parte('fuente').buscar((h) => h.etiqueta === 'a')).toBeNull()
    expect(parte('fuente').texto).toBe('Fuente: Internet Archive · Licencia: sin licencia declarada')
  })

  test('si el índice no llega o la imagen falla, lo dice y no muestra el plano de otro año', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const visor = crearVisor({ indice: () => Promise.reject(new Error('404')) })
    visor.elegir(EPOCA)
    visor.abrir()
    await cuadros()
    expect(imagenes).toEqual([])
    expect(parte('aviso').textContent).toBe('No se pudo abrir el plano de 1772. Ciérralo y prueba de nuevo.')
    expect(img().hidden).toBe(true)
    visor.cerrar()

    fallan.add('plano/chico.webp')
    visor.elegir({ año: 1936 })
    visor.abrir()
    await cuadros()
    expect(parte('aviso').textContent).toBe('No se pudo abrir el plano de 1936. Ciérralo y prueba de nuevo.')
    expect(aviso).toHaveBeenCalledTimes(2)
    aviso.mockRestore()
  })

  test('si falla solo la imagen mejor, queda la chica a la vista', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    fallan.add('plano/1772/medio.webp')
    const visor = crearVisor()
    visor.elegir(EPOCA)
    visor.abrir()
    await cuadros()
    expect(img().src).toBe('plano/1772/chico.webp')
    expect(img().hidden).toBe(false)
    expect(parte('aviso').textContent).toBe('')
    aviso.mockRestore()
  })

  test('lo que llega después de cerrar no toca el panel', async () => {
    const visor = crearVisor()
    visor.elegir(EPOCA)
    visor.abrir()
    visor.cerrar()
    await cuadros()
    expect(img().hidden).toBe(true)
    expect(img().src).toBeUndefined()
  })

  test('en equipos livianos la imagen mejor no pasa de 4096 px', async () => {
    const indice = [{ año: 1772, niveles: [{ url: 'c.webp', lado: 2048 }, { url: 'm.webp', lado: 4096 }, { url: 'g.webp', lado: 8192 }] }]
    const visor = crearVisor({ indice: () => Promise.resolve(indice), liviano: true })
    visor.elegir(EPOCA)
    visor.abrir()
    await cuadros()
    expect(imagenes).toEqual(['c.webp', 'm.webp'])
  })
})
