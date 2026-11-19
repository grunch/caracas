import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { PerspectiveCamera } from 'three'
import { crearCapaMarcas } from '../../src/marcas-capa.js'
import { normalizarMarcas } from '../../src/marcas.js'
import { crearCoords } from '../../src/coords.js'

/** Un DOM mínimo: lo justo que usa la capa (clases, estilos, hijos, eventos y medidas). */
function elementoFalso(etiqueta) {
  const clases = new Set()
  const oyentes = {}
  const e = {
    etiqueta, hijos: [], dataset: {}, atributos: {}, textContent: '', hidden: false, enfocado: false,
    style: { transform: '', props: {}, setProperty(k, v) { this.props[k] = v } },
    classList: {
      add: (...c) => c.forEach((x) => clases.add(x)),
      remove: (...c) => c.forEach((x) => clases.delete(x)),
      toggle: (c, si) => (si ? clases.add(c) : clases.delete(c)),
      contains: (c) => clases.has(c),
    },
    set className(v) { clases.clear(); for (const c of String(v).split(' ').filter(Boolean)) clases.add(c) },
    get className() { return [...clases].join(' ') },
    append(...h) { e.hijos.push(...h) },
    appendChild(h) { e.hijos.push(h); return h },
    setAttribute(k, v) { e.atributos[k] = v },
    addEventListener(tipo, f) { oyentes[tipo] = f },
    emitir(tipo) { oyentes[tipo]?.({}) },
    matches: (sel) => sel === ':focus-visible' && e.enfocado,
    // el cartel mide según su texto: 7 px por letra
    get offsetWidth() { return e.medidaAbierta?.ancho ?? 16 + 7 * (e.hijos[0]?.textContent.length ?? 0) },
    get offsetHeight() { return e.medidaAbierta?.alto ?? 22 },
  }
  return e
}

const coords = crearCoords({ ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] })
const marcas = normalizarMarcas([
  { id: 'plaza', nombres: [[1, 'Plaza Mayor', 'El mercado.'], [3, 'Plaza Bolívar']], x: 8968.2, y: 6839, nace: 1, nivel: 1, fuente: 'f' },
  { id: 'teatro', nombre: 'Teatro', x: 8968.2 + 300, y: 6839, nace: 3, nivel: 2, alto: 20, fuente: 'f' },
], { coords })

function camara() {
  const c = new PerspectiveCamera(35, 2, 5, 60000)
  c.position.set(0, 500, 500)
  c.lookAt(0, 0, 0)
  c.updateMatrixWorld()
  return c
}
const epoca = (e) => ({ de: e, a: e, ola: 9000, ancho: 260 })

describe('la capa de marcas', () => {
  let contenedor
  let avisos
  let capa
  beforeEach(() => {
    vi.stubGlobal('document', { createElement: elementoFalso })
    contenedor = elementoFalso('div')
    avisos = { abiertas: [], sobre: [] }
    capa = crearCapaMarcas({
      contenedor, marcas, tamaño: () => ({ ancho: 1000, alto: 500 }),
      alAbrir: (m) => avisos.abiertas.push(m.id), alSobre: (m) => avisos.sobre.push(m?.id ?? null),
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  const dibujar = (e, extra = {}) => capa.dibujar({ camera: camara(), dist: 700, epoca: epoca(e), sube: () => 1, ...extra })
  const raizDe = (id) => contenedor.hijos.find((h) => h.dataset.id === id)
  const botonDe = (id) => raizDe(id).hijos[0]

  test('pone un botón por marca visible, con su nombre, en su lugar, y devuelve las cajas de los carteles', () => {
    const cajas = dibujar(5)
    expect(capa.visibles.map((v) => v.nombre).sort()).toEqual(['Plaza Bolívar', 'Teatro'])
    expect(cajas).toHaveLength(2)
    const plaza = raizDe('plaza')
    expect(plaza.classList.contains('ver')).toBe(true)
    expect(plaza.classList.contains('n1')).toBe(true)
    expect(plaza.style.transform).toBe('translate(500.0px,250.0px)')
    expect(botonDe('plaza').hijos[0].textContent).toBe('Plaza Bolívar')
    // la caja usa la medida real del cartel: 16 + 7 × 13 letras de ancho
    const caja = cajas.find((c) => Math.abs((c.x0 + c.x1) / 2 - 500) < 1)
    expect(caja.x1 - caja.x0).toBe(16 + 7 * 'Plaza Bolívar'.length)
  })

  test('al cambiar la época cambia el nombre y se esconden las marcas que todavía no existen', () => {
    dibujar(5)
    dibujar(1)
    expect(capa.visibles.map((v) => v.nombre)).toEqual(['Plaza Mayor'])
    expect(botonDe('plaza').hijos[0].textContent).toBe('Plaza Mayor')
    expect(botonDe('plaza').hijos[1].textContent).toBe('El mercado.')
    expect(raizDe('plaza').classList.contains('con-nota')).toBe(true)
    expect(raizDe('teatro').classList.contains('ver')).toBe(false)
  })

  test('la marca que llega con la ola de su época, todavía a medio aparecer, se anuncia', () => {
    dibujar(2)
    // la ola de 1843 → 1889 pasa justo por el teatro (a 150 m de la plaza)
    capa.dibujar({ camera: camara(), dist: 700, epoca: { de: 2, a: 3, ola: 325, ancho: 260 }, sube: () => 1 })
    const teatro = raizDe('teatro')
    expect(teatro.classList.contains('nueva')).toBe(true)
    expect(Number(teatro.style.props['--o'])).toBeGreaterThan(0)
    expect(Number(teatro.style.props['--o'])).toBeLessThan(1)
    teatro.emitir('animationend')
    expect(teatro.classList.contains('nueva')).toBe(false)
  })

  test('el mouse sobre un cartel vela las demás y avisa; al salir, se quita', () => {
    dibujar(5)
    botonDe('teatro').emitir('pointerenter')
    expect(capa.sobre).toBe('teatro')
    expect(contenedor.classList.contains('velo')).toBe(true)
    expect(raizDe('teatro').classList.contains('sobre')).toBe(true)
    botonDe('teatro').emitir('pointerleave')
    expect(capa.sobre).toBe(null)
    expect(contenedor.classList.contains('velo')).toBe(false)
    expect(avisos.sobre).toEqual(['teatro', null])
  })

  test('el foco del teclado sostiene el velo aunque el mouse salga; el foco de un click, no', () => {
    dibujar(5)
    const boton = botonDe('plaza')
    boton.emitir('focus') // foco que dejó un click: no es :focus-visible
    expect(capa.sobre).toBe(null)
    boton.enfocado = true
    boton.emitir('focus')
    boton.emitir('pointerleave')
    expect(capa.sobre).toBe('plaza')
    boton.emitir('blur')
    expect(capa.sobre).toBe(null)
  })

  test('el click abre la marca (con su nota) y avisa; otro click en la misma la cierra', () => {
    dibujar(5)
    botonDe('plaza').emitir('click')
    expect(capa.abierta).toBe('plaza')
    expect(raizDe('plaza').classList.contains('abierta')).toBe(true)
    botonDe('teatro').emitir('click')
    expect(capa.abierta).toBe('teatro')
    expect(raizDe('plaza').classList.contains('abierta')).toBe(false)
    botonDe('teatro').emitir('click')
    expect(capa.abierta).toBe(null)
    expect(avisos.abiertas).toEqual(['plaza', 'teatro', 'teatro'])
    expect(capa.abrir('no-existe')).toBe(false)
  })

  test('cerrar() cierra el cartel abierto sin avisar (lo usa la ficha al cerrarse)', () => {
    dibujar(5)
    botonDe('plaza').emitir('click')
    capa.cerrar()
    expect(capa.abierta).toBe(null)
    expect(raizDe('plaza').classList.contains('abierta')).toBe(false)
    expect(avisos.abiertas).toEqual(['plaza'])
    capa.cerrar() // sin nada abierto no hace nada
    expect(capa.abierta).toBe(null)
  })

  test('la caja de una marca abierta es la de su cartel abierto (con la nota), y es la que se reserva', () => {
    // Arrange: en 1772 la plaza tiene nota
    const [cerrada] = dibujar(1)
    botonDe('plaza').emitir('click')
    botonDe('plaza').medidaAbierta = { ancho: 240, alto: 58 }
    // Act
    const [abierta] = dibujar(1)
    // Assert
    expect(cerrada.x1 - cerrada.x0).toBe(16 + 7 * 'Plaza Mayor'.length)
    expect([abierta.x1 - abierta.x0, abierta.y1 - abierta.y0]).toEqual([240, 58])
  })

  test('abrir(id) una marca que todavía no se dibujó nunca: cuando aparece, aparece abierta', () => {
    // Arrange: en 1772 el teatro no existe; su cartel no se creó
    dibujar(1)
    expect(raizDe('teatro')).toBeUndefined()
    // Act
    expect(capa.abrir('teatro')).toBe(true)
    dibujar(5)
    // Assert
    expect(capa.abierta).toBe('teatro')
    expect(raizDe('teatro').classList.contains('abierta')).toBe(true)
  })

  test('una marca abierta o con el mouse encima que deja de verse suelta su estado', () => {
    dibujar(5)
    botonDe('teatro').emitir('pointerenter')
    botonDe('teatro').emitir('click')
    dibujar(1) // en 1772 no hay teatro
    expect(capa.abierta).toBe(null)
    expect(capa.sobre).toBe(null)
    expect(contenedor.classList.contains('velo')).toBe(false)
  })

  test('mostrar(false) apaga la capa: no dibuja nada ni reserva cajas; mostrar(true) la vuelve a prender', () => {
    dibujar(5)
    capa.mostrar(false)
    expect(contenedor.hidden).toBe(true)
    expect(capa.prendida).toBe(false)
    expect(capa.visibles).toEqual([])
    expect(raizDe('plaza').classList.contains('ver')).toBe(false)
    expect(dibujar(5)).toEqual([])
    capa.mostrar(true)
    expect(contenedor.hidden).toBe(false)
    expect(dibujar(5)).toHaveLength(2)
    expect(capa.nivel).toBe(3)
  })
})
