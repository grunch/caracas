import { describe, test, expect } from 'vitest'
import { crearMenuRecorrer } from '../../src/recorrer.js'

/** Un elemento mínimo: clases, atributos, oyentes y lo que contiene. */
function elemento(hijos = []) {
  const clases = new Set(), atributos = {}, oyentes = {}
  const yo = {
    classList: { toggle: (c, si) => { if (si) clases.add(c); else clases.delete(c) }, contains: (c) => clases.has(c) },
    setAttribute: (k, v) => { atributos[k] = v },
    getAttribute: (k) => atributos[k],
    addEventListener: (tipo, f) => { (oyentes[tipo] ??= []).push(f) },
    disparar: (tipo, e = {}) => (oyentes[tipo] ?? []).forEach((f) => f({ stopPropagation() {}, ...e })),
    contains: (otro) => otro === yo || hijos.includes(otro),
    enfocado: false,
    focus() { yo.enfocado = true },
  }
  return yo
}

describe('el menú «Recorrer»', () => {
  const armar = () => {
    const boton = elemento(), modo = elemento(), afuera = elemento()
    const grupo = elemento([boton, modo]), documento = elemento()
    const menu = crearMenuRecorrer({ grupo, boton, documento })
    return { boton, modo, afuera, grupo, documento, menu }
  }

  test('el botón abre y cierra el menú, y lo dice en aria-expanded', () => {
    const { boton, grupo, menu } = armar()
    boton.disparar('click')
    expect(menu.abierto).toBe(true)
    expect(grupo.classList.contains('abierto')).toBe(true)
    expect(boton.getAttribute('aria-expanded')).toBe('true')
    boton.disparar('click')
    expect(menu.abierto).toBe(false)
    expect(boton.getAttribute('aria-expanded')).toBe('false')
  })

  test('tocar afuera lo cierra; tocar un modo, no (el modo lo cierra al entrar)', () => {
    const { boton, modo, afuera, documento, menu } = armar()
    boton.disparar('click')
    documento.disparar('pointerdown', { target: modo })
    expect(menu.abierto).toBe(true)
    documento.disparar('pointerdown', { target: afuera })
    expect(menu.abierto).toBe(false)
  })

  test('Esc lo cierra y devuelve el foco al botón; con el menú cerrado, Esc es de otros (los modos)', () => {
    const { boton, documento, menu } = armar()
    let detenido = false
    documento.disparar('keydown', { key: 'Escape', stopPropagation: () => { detenido = true } })
    expect(detenido).toBe(false)
    boton.disparar('click')
    documento.disparar('keydown', { key: 'Escape', stopPropagation: () => { detenido = true } })
    expect(menu.abierto).toBe(false)
    expect(detenido).toBe(true)
    expect(boton.enfocado).toBe(true)
  })

  test('cerrar() lo cierra desde afuera (al entrar a un modo)', () => {
    const { boton, menu } = armar()
    boton.disparar('click')
    menu.cerrar()
    expect(menu.abierto).toBe(false)
  })
})
