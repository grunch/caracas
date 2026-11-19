import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { crearFichas, engancharFichas } from '../../src/ficha-panel.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { crearCoords } from '../../src/coords.js'

/** Un DOM mínimo: lo justo que usa el panel (árbol, clases, atributos, eventos y foco). */
function crearDom() {
  const doc = { activeElement: null, body: null }
  const elemento = (etiqueta) => {
    const clases = new Set()
    const oyentes = {}
    const e = {
      etiqueta, hijos: [], padre: null, dataset: {}, atributos: {}, style: {}, scrollTop: 0,
      classList: {
        add: (...c) => c.forEach((x) => clases.add(x)),
        remove: (...c) => c.forEach((x) => clases.delete(x)),
        toggle: (c, si) => (si ? clases.add(c) : clases.delete(c)),
        contains: (c) => clases.has(c),
      },
      set className(v) { clases.clear(); for (const c of String(v).split(' ').filter(Boolean)) clases.add(c) },
      get className() { return [...clases].join(' ') },
      set textContent(v) { e.hijos = [String(v)] },
      get textContent() { return e.hijos.map((h) => (typeof h === 'string' ? h : h.textContent)).join('') },
      adoptar(hs) { for (const h of hs) if (typeof h !== 'string') h.padre = e; return hs },
      append(...hs) { e.hijos.push(...e.adoptar(hs)) },
      prepend(...hs) { e.hijos.unshift(...e.adoptar(hs)) },
      replaceChildren(...hs) { for (const h of e.hijos) if (typeof h !== 'string') h.padre = null; e.hijos = e.adoptar(hs) },
      setAttribute(k, v) { e.atributos[k] = String(v) },
      removeAttribute(k) { delete e.atributos[k]; delete e[k] },
      addEventListener(tipo, f) { (oyentes[tipo] ??= []).push(f) },
      emitir(tipo, ev = {}) { for (const f of oyentes[tipo] ?? []) f({ target: e, ...ev }) },
      contains(otro) { for (let n = otro; n; n = n.padre) if (n === e) return true; return false },
      get isConnected() { return doc.body.contains(e) },
      get offsetParent() { return e.isConnected ? doc.body : null },
      focus() { doc.activeElement = e },
      todos() { return e.hijos.filter((h) => typeof h !== 'string').flatMap((h) => [h, ...h.todos()]) },
      // solo los selectores que usa el panel
      querySelectorAll(sel) {
        const etiquetas = sel.split(',').map((s) => s.trim().replace(/\[.*$/, ''))
        return e.todos().filter((h) => etiquetas.includes(h.etiqueta) && (h.etiqueta !== 'a' || h.href))
      },
      porClase(c) { return e.todos().filter((h) => h.classList.contains(c)) },
    }
    return e
  }
  doc.createElement = elemento
  doc.body = elemento('body')
  doc.querySelector = () => doc.marcaEnfocable ?? null
  return doc
}

const coords = crearCoords({ ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] })
const marcas = normalizarMarcas([
  { id: 'plaza', nombres: [[1, 'Plaza Mayor', 'El mercado.'], [3, 'Plaza Bolívar']], x: 8968.2, y: 6839, nace: 1, nivel: 1, fuente: 'plano de 1936' },
  { id: 'teatro', nombre: 'Teatro', x: 9300, y: 6839, nace: 3, nivel: 2, fuente: 'plano de 1889' },
], { coords })
const foto = (id, epocas, año) => ({
  id, titulo: `Foto ${id}`, autor: 'Autor desconocido', fecha: String(año), año, licencia: 'Dominio público',
  fuente: `https://commons.wikimedia.org/wiki/File:${id}.jpg`, institucion: 'Archivo', epocas, marcas: ['plaza'], w: 1600, h: 900, mw: 640, mh: 360,
})
const FOTOS = [foto('mercado', [2], 1852), foto('estatua', [3], 1880), foto('damero', [4, 5], 1910)]
const FICHAS = { plaza: { textos: [[1, 'Era el mercado.'], [3, 'Se hizo jardín.']], hoy: 'la plaza.', dudas: 'La fecha.' } }

describe('el panel de la ficha y el visor de fotos', () => {
  let doc
  let oyentes
  let epoca
  let cerradas
  let fichas
  const tecla = (key, extra = {}) => {
    const ev = { key, target: doc.activeElement ?? doc.body, detenido: false, prevenido: false, stopPropagation() { ev.detenido = true }, preventDefault() { ev.prevenido = true }, ...extra }
    for (const f of oyentes.keydown ?? []) f(ev)
    return ev
  }
  const panel = () => doc.body.hijos[0]
  const visor = () => doc.body.hijos[1]
  const titulo = () => panel().todos().find((h) => h.etiqueta === 'h2')
  const figuras = () => panel().todos().filter((h) => h.etiqueta === 'figure')
  const pie = () => visor().porClase('pie')[0]

  beforeEach(() => {
    doc = crearDom()
    oyentes = {}
    vi.stubGlobal('document', doc)
    vi.stubGlobal('CSS', { escape: (s) => s })
    vi.stubGlobal('addEventListener', (tipo, f) => { (oyentes[tipo] ??= []).push(f) })
    epoca = 3
    cerradas = []
    fichas = crearFichas({ marcas, fichas: FICHAS, epocaEn: () => epoca, alCerrar: (id) => cerradas.push(id) })
    fichas.ponerFotos(FOTOS)
  })
  afterEach(() => vi.unstubAllGlobals())

  test('abrir muestra el nombre de la época, la fecha, el texto y las fotos con su crédito, y lleva el foco al título', () => {
    // Act
    expect(fichas.abrir('plaza')).toBe(true)
    // Assert
    expect(fichas.abierta).toBe('plaza')
    expect(panel().classList.contains('ver')).toBe(true)
    expect(doc.body.classList.contains('ficha')).toBe(true)
    expect(titulo().textContent).toBe('Plaza Bolívar')
    expect(panel().porClase('era')[0].textContent).toBe('Hacia 1889')
    expect(doc.activeElement).toBe(titulo())
    expect(panel().atributos).toMatchObject({ role: 'dialog', 'aria-labelledby': 'ficha-titulo' })
    expect(panel().porClase('rige').map((h) => h.textContent)).toEqual(['desde 1889Plaza Bolívar', '1889Se hizo jardín.'])
    expect(panel().porClase('hoyes')[0].textContent).toBe('Hoy · la plaza.')
    expect(panel().porClase('dudas')[0].textContent).toBe('Por verificar · La fecha.')
    expect(panel().porClase('fuente')[0].textContent).toBe('Fuente del nombre · plano de 1936')
    expect(figuras().length).toBe(3)
    const [principal] = figuras()
    expect(principal.textContent).toBe('Foto estatua Autor desconocido, 1880.de esta época · Dominio público · Wikimedia Commons ↗')
    const img = principal.todos().find((h) => h.etiqueta === 'img')
    expect(img).toMatchObject({ src: 'fotos/m/estatua.webp', loading: 'lazy', width: 640, height: 360, alt: 'Foto estatua' })
    expect(principal.todos().find((h) => h.etiqueta === 'a')).toMatchObject({ href: 'https://commons.wikimedia.org/wiki/File:estatua.jpg', rel: 'noopener', target: '_blank' })
  })

  test('una marca que no existe no abre nada; sin fotos lo dice', () => {
    expect(fichas.abrir('nadie')).toBe(false)
    expect(fichas.abierta).toBe(null)
    fichas.abrir('teatro')
    expect(figuras().length).toBe(0)
    expect(panel().porClase('sinfoto')[0].textContent).toBe('Sin imagen de época confiable de este lugar.')
  })

  test('actualizar() rehace la ficha cuando cambia la época del lugar, y solo entonces', () => {
    fichas.abrir('plaza')
    const antes = fichas.contenido
    fichas.actualizar()
    expect(fichas.contenido).toBe(antes)

    epoca = 1.2 // la ola todavía no llegó: rige 1772
    fichas.actualizar()
    expect(fichas.epoca).toBe(1)
    expect(titulo().textContent).toBe('Plaza Mayor')
    expect(panel().porClase('aviso')[0].textContent).toMatch(/No hay imagen de esta época/)
    expect(panel().porClase('de-epoca')).toEqual([])
  })

  test('una foto que no carga no deja un hueco', () => {
    fichas.abrir('plaza')
    const [fig] = figuras()
    fig.todos().find((h) => h.etiqueta === 'img').emitir('error')
    expect(fig.classList.contains('rota')).toBe(true)
  })

  test('el manifiesto se filtra: una fila sin crédito completo no llega al panel', () => {
    const { autor, ...sinAutor } = FOTOS[0]
    fichas.ponerFotos([sinAutor, FOTOS[1]])
    fichas.abrir('plaza')
    expect(fichas.fotos.map((f) => f.id)).toEqual(['estatua'])
    expect(figuras().length).toBe(1)
  })

  test('el visor: abre la foto grande con su pie, las flechas dan la vuelta y Escape lo cierra antes que a la ficha', () => {
    fichas.abrir('plaza')
    const miniatura = figuras()[0].todos().find((h) => h.etiqueta === 'button')
    miniatura.focus()
    miniatura.emitir('click')
    expect(fichas.visor).toEqual({ indice: 0, id: 'estatua', total: 3 })
    expect(visor().classList.contains('ver')).toBe(true)
    expect(visor().atributos['aria-modal']).toBe('true')
    const imagen = visor().todos().find((h) => h.etiqueta === 'img')
    expect(imagen).toMatchObject({ src: 'fotos/estatua.webp', width: 1600, height: 900, alt: 'Foto estatua' })
    expect(pie().textContent).toBe('1 de 3Foto estatua Autor desconocido, 1880.Dominio público · Archivo · Ver en Wikimedia Commons ↗')
    expect(doc.activeElement.atributos['aria-label']).toBe('Cerrar la foto')

    expect(tecla('ArrowLeft').detenido).toBe(true)
    expect(fichas.visor.id).toBe('damero')
    tecla('ArrowRight')
    tecla('ArrowRight')
    expect(fichas.visor.id).toBe('mercado')
    visor().porClase('sig')[0].emitir('click')
    visor().porClase('ant')[0].emitir('click')
    expect(fichas.visor.id).toBe('mercado')
    expect(tecla('a').detenido).toBe(false) // las demás teclas siguen su camino

    tecla('Escape')
    expect(fichas.visor).toBe(null)
    expect(fichas.abierta).toBe('plaza')
    expect(doc.activeElement).toBe(miniatura)
    expect(imagen.src).toBeUndefined()
    tecla('Escape')
    expect(fichas.abierta).toBe(null)
  })

  test('Tab no sale del visor; deslizar la foto pasa a la otra; tocar el fondo lo cierra', () => {
    fichas.abrir('plaza')
    fichas.verFoto(0)
    const focos = visor().querySelectorAll('button, a[href]')
    expect(focos.length).toBe(4)
    focos.at(-1).focus()
    expect(tecla('Tab').prevenido).toBe(true)
    expect(doc.activeElement).toBe(focos[0])
    tecla('Tab', { shiftKey: true })
    expect(doc.activeElement).toBe(focos.at(-1))

    const imagen = visor().todos().find((h) => h.etiqueta === 'img')
    imagen.emitir('pointerdown', { clientX: 300 })
    imagen.emitir('pointerup', { clientX: 200 })
    expect(fichas.visor.indice).toBe(1)
    imagen.emitir('pointerdown', { clientX: 200 })
    imagen.emitir('pointerup', { clientX: 220 }) // un toque, no un deslizamiento
    expect(fichas.visor.indice).toBe(1)
    imagen.emitir('pointerdown', { clientX: 100 })
    imagen.emitir('pointercancel')
    imagen.emitir('pointerup', { clientX: 400 })
    expect(fichas.visor.indice).toBe(1)

    visor().emitir('click', { target: imagen })
    expect(fichas.visor).not.toBe(null)
    visor().emitir('click')
    expect(fichas.visor).toBe(null)
    expect(fichas.verFoto(9)).toBe(false)
  })

  test('si la época cambia con el visor abierto, el visor sigue con sus fotos y al cerrarse el foco va al título', () => {
    fichas.abrir('plaza')
    figuras()[0].todos().find((h) => h.etiqueta === 'button').focus()
    fichas.verFoto(0)
    epoca = 5
    fichas.actualizar()
    expect(fichas.visor.id).toBe('estatua')
    fichas.cerrarFoto()
    expect(doc.activeElement).toBe(titulo())
  })

  test('cerrar avisa, quita la clase del cuerpo y devuelve el foco al cartel de la marca', () => {
    doc.marcaEnfocable = doc.createElement('button')
    fichas.abrir('plaza')
    panel().porClase('x')[0].emitir('click')
    expect(fichas.abierta).toBe(null)
    expect(cerradas).toEqual(['plaza'])
    expect(panel().classList.contains('ver')).toBe(false)
    expect(doc.body.classList.contains('ficha')).toBe(false)
    expect(doc.activeElement).toBe(doc.marcaEnfocable)
    fichas.cerrar() // cerrada, no hace nada
    expect(cerradas).toEqual(['plaza'])
  })

  test('Escape en un campo de texto (el buscador) no cierra la ficha', () => {
    fichas.abrir('plaza')
    const campo = { closest: (sel) => (sel.includes('input') ? campo : null) }
    expect(tecla('Escape', { target: campo }).detenido).toBe(false)
    expect(fichas.abierta).toBe('plaza')
    expect(tecla('Escape').detenido).toBe(true)
    expect(fichas.abierta).toBe(null)
  })

  test('engancharFichas: la ficha se abre con el evento de la marca, se cierra al cerrar su cartel y lee las fotos', async () => {
    const capa = { marcas, abierta: null, cerrar: vi.fn(() => { capa.abierta = null }) }
    const U = { uEpocaDe: { value: 3 }, uEpocaA: { value: 3 }, uOlaEpoca: { value: 9000 }, uAnchoOla: { value: 260 } }
    const respuesta = { ok: true, headers: { get: () => 'application/json' }, json: async () => ({ fotos: FOTOS }) }
    const enganchadas = engancharFichas({ capa, U, pedir: async () => respuesta })
    await vi.waitFor(() => expect(enganchadas.fotos.length).toBe(3))

    capa.abierta = 'plaza'
    for (const f of oyentes.abrirmarca) f({ detail: marcas[0] })
    expect(enganchadas.abierta).toBe('plaza')
    expect(enganchadas.epoca).toBe(3)
    // la × cierra también el cartel de la marca
    enganchadas.cerrar()
    expect(capa.cerrar).toHaveBeenCalledTimes(1)
    // tocar de nuevo el cartel abierto lo cierra (la capa ya lo dejó en null): la ficha se va con él
    capa.abierta = 'plaza'
    for (const f of oyentes.abrirmarca) f({ detail: marcas[0] })
    capa.abierta = null
    for (const f of oyentes.abrirmarca) f({ detail: marcas[0] })
    expect(enganchadas.abierta).toBe(null)
    expect(capa.cerrar).toHaveBeenCalledTimes(1)
  })
})
