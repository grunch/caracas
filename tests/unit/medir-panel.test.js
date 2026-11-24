import { describe, it, expect } from 'vitest'
import { medianaDe, lineasDeMedicion, crearPanelDeMedicion } from '../../src/medir-panel.js'

const lectura = { llamadas: 144, triangulos: 4442237, pixeles: 1.5, lienzo: [1920, 1200], heapMB: 257, nivel: 4096, calidad: 'liviana' }

describe('lineasDeMedicion', () => {
  it('el tiempo por cuadro y los cuadros por segundo salen de la mediana', () => {
    expect(medianaDe([40, 8, 9])).toBe(9)
    expect(medianaDe([])).toBe(null)
    const lineas = lineasDeMedicion({ ms: [10, 10, 10, 50], ...lectura })
    expect(lineas[0]).toBe('10,0 ms por cuadro · 100 por segundo')
  })
  it('llamadas, triángulos, lienzo, píxeles, calidad, memoria y nivel del plano', () => {
    const lineas = lineasDeMedicion({ ms: [16.6], ...lectura })
    expect(lineas[1]).toBe('144 llamadas · 4,44 M de triángulos')
    expect(lineas[2]).toBe('1920 × 1200 px · 1,50 px por punto · calidad liviana')
    expect(lineas[3]).toBe('257 MB de JS · plano de 4096 px')
  })
  it('sin cuadros, sin el dato de la memoria (Safari, Firefox) y sin plano', () => {
    const lineas = lineasDeMedicion({ ms: [], llamadas: 0, triangulos: 0, pixeles: 1, lienzo: [390, 844] })
    expect(lineas[0]).toBe('sin cuadros todavía')
    expect(lineas[2]).toContain('calidad completa')
    expect(lineas[3]).toBe('memoria: el navegador no la dice')
  })
})

/** Un documento de mentira: lo justo para colgar un elemento y leer lo que se le escribió. */
function paginaFalsa() {
  const colgados = []
  const documento = { createElement: (etiqueta) => ({ etiqueta, style: {}, atributos: {}, textContent: '', setAttribute(k, v) { this.atributos[k] = v }, getAttribute(k) { return this.atributos[k] } }) }
  return { documento, colgados, contenedor: { appendChild: (e) => colgados.push(e) } }
}

describe('crearPanelDeMedicion', () => {
  it('cuelga un panel que no estorba (sin eventos, fuera del árbol de accesibilidad) y lo reescribe cada medio segundo', () => {
    const pagina = paginaFalsa()
    const medir = crearPanelDeMedicion({ ...pagina, leer: () => lectura })
    expect(pagina.colgados).toEqual([medir.panel])
    expect(medir.panel).toMatchObject({ etiqueta: 'pre', id: 'medir' })
    expect(medir.panel.style.pointerEvents).toBe('none')
    expect(medir.panel.getAttribute('aria-hidden')).toBe('true')
    medir.cuadro(0)
    expect(medir.panel.textContent).toContain('sin cuadros todavía')
    medir.cuadro(10)
    medir.cuadro(20)
    expect(medir.panel.textContent).toContain('sin cuadros todavía') // todavía no pasó medio segundo
    medir.cuadro(510)
    expect(medir.panel.textContent).toContain('10,0 ms por cuadro')
    expect(medir.panel.textContent.split('\n')).toHaveLength(4)
  })
  it('promedia solo los últimos 60 cuadros', () => {
    const medir = crearPanelDeMedicion({ ...paginaFalsa(), leer: () => lectura })
    let t = 0
    for (let i = 0; i < 30; i++) medir.cuadro((t += 100))
    for (let i = 0; i < 61; i++) medir.cuadro((t += 10))
    medir.cuadro((t += 600))
    expect(medir.panel.textContent).toContain('10,0 ms por cuadro')
  })
})
