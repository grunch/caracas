import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { ACCIONES, CON_RATON, CON_DEDOS, EN_PANTALLA, accionDeTecla, controlesVisibles } from '../../src/controles.js'

const en = (selectores) => ({ closest: (s) => (selectores.some((x) => s.split(',').map((y) => y.trim()).includes(x)) ? {} : null) })
const tecla = (props, target = en([])) => ({ repeat: false, ctrlKey: false, metaKey: false, altKey: false, target, ...props })

describe('ACCIONES', () => {
  it('cada acción tiene id único, tecla visible, botón y explicación, y alguna forma de reconocer la tecla', () => {
    expect(new Set(ACCIONES.map((a) => a.id)).size).toBe(ACCIONES.length)
    for (const a of ACCIONES) {
      expect(a.tecla && a.boton && a.que, a.id).toBeTruthy()
      expect(a.codigo ?? a.letra, a.id).toBeTruthy()
    }
  })

  it('ninguna tecla sirve para dos acciones', () => {
    const codigos = ACCIONES.flatMap((a) => [a.codigo, a.letra].filter(Boolean))
    expect(new Set(codigos).size).toBe(codigos.length)
  })
})

describe('accionDeTecla', () => {
  it('reconoce cada atajo por su tecla física o por su carácter', () => {
    expect(accionDeTecla(tecla({ code: 'Space', key: ' ' }))?.id).toBe('levantar')
    expect(accionDeTecla(tecla({ code: 'KeyC', key: 'c' }))?.id).toBe('color')
    expect(accionDeTecla(tecla({ code: 'KeyH', key: 'h' }))?.id).toBe('hoy')
    expect(accionDeTecla(tecla({ code: 'KeyM', key: 'm' }))?.id).toBe('nombres')
    expect(accionDeTecla(tecla({ code: 'KeyP', key: 'p' }))?.id).toBe('plano')
    expect(accionDeTecla(tecla({ code: 'Digit7', key: '/', shiftKey: true }))?.id).toBe('buscar') // teclado español
    expect(accionDeTecla(tecla({ code: 'Minus', key: '?', shiftKey: true }))?.id).toBe('acerca')
    expect(accionDeTecla(tecla({ code: 'F1', key: 'F1' }))?.id).toBe('acerca')
  })

  it('el carácter manda sobre la tecla física: en AZERTY «?» sale de la tecla que acá es la M', () => {
    const azerty = { code: 'KeyM', key: '?', shiftKey: true }
    expect(accionDeTecla(tecla(azerty))?.id).toBe('acerca')
    expect(accionDeTecla(tecla(azerty, en(['button'])))?.id).toBe('acerca') // y vale con el foco en un botón
    expect(accionDeTecla(tecla({ code: 'KeyM', key: 'm' }))?.id).toBe('nombres')
  })

  it('no hay atajo para una tecla cualquiera', () => {
    expect(accionDeTecla(tecla({ code: 'KeyZ', key: 'z' }))).toBeNull()
  })

  it('no hay atajos mientras se escribe en un campo', () => {
    for (const campo of ['input', 'textarea', 'select', '[contenteditable]']) {
      expect(accionDeTecla(tecla({ code: 'KeyC', key: 'c' }, en([campo]))), campo).toBeNull()
      expect(accionDeTecla(tecla({ code: 'Slash', key: '/' }, en([campo]))), campo).toBeNull()
    }
  })

  it('con el foco en un botón, Espacio y las letras son del botón; «/», «?» y F1 siguen valiendo', () => {
    const boton = en(['button'])
    expect(accionDeTecla(tecla({ code: 'Space', key: ' ' }, boton))).toBeNull()
    expect(accionDeTecla(tecla({ code: 'KeyH', key: 'h' }, en(['a'])))).toBeNull()
    expect(accionDeTecla(tecla({ code: 'Slash', key: '/' }, boton))?.id).toBe('buscar')
    expect(accionDeTecla(tecla({ code: 'F1', key: 'F1' }, boton))?.id).toBe('acerca')
  })

  it('no dispara con Ctrl, Alt o Meta (Ctrl+C copia), ni con la tecla sostenida', () => {
    const c = { code: 'KeyC', key: 'c' }
    expect(accionDeTecla(tecla({ ...c, ctrlKey: true }))).toBeNull()
    expect(accionDeTecla(tecla({ ...c, metaKey: true }))).toBeNull()
    expect(accionDeTecla(tecla({ ...c, altKey: true }))).toBeNull()
    expect(accionDeTecla(tecla({ ...c, repeat: true }))).toBeNull()
  })

  it('ignora las acciones que hoy no tienen quien las atienda', () => {
    expect(accionDeTecla(tecla({ code: 'KeyP', key: 'p' }), ['color', 'hoy'])).toBeNull()
    expect(accionDeTecla(tecla({ code: 'KeyC', key: 'c' }), ['color', 'hoy'])?.id).toBe('color')
  })

  it('aguanta un evento sin destino', () => {
    expect(accionDeTecla({ code: 'KeyC', key: 'c', target: null })?.id).toBe('color')
  })
})

describe('controlesVisibles', () => {
  it('arma los grupos de la ayuda: ratón, dedos, pantalla y los botones con su tecla', () => {
    // Act
    const grupos = controlesVisibles()
    // Assert
    expect(grupos.map((g) => g.titulo)).toEqual(['Con el ratón', 'Con los dedos', 'En la pantalla', 'Botones y teclas'])
    expect(grupos[0].filas).toBe(CON_RATON)
    expect(grupos[1]).toMatchObject({ tactil: true, filas: CON_DEDOS })
    expect(grupos[2].filas).toBe(EN_PANTALLA)
    expect(grupos[3].filas.map((f) => f.tecla)).toEqual(ACCIONES.map((a) => a.tecla))
    for (const f of grupos.flatMap((g) => g.filas)) expect(f.como && f.que).toBeTruthy()
  })

  it('muestra solo las acciones disponibles', () => {
    const teclas = controlesVisibles(['color', 'acerca']).at(-1).filas.map((f) => f.tecla)
    expect(teclas).toEqual(['C', '? o F1'])
  })
})

describe('la tabla y el visor', () => {
  const principal = readFileSync(path.resolve(import.meta.dirname, '../../src/main.js'), 'utf8')
  const hacer = principal.slice(principal.indexOf('const HACER = {'), principal.indexOf('}\n', principal.indexOf('const HACER = {')))

  it('src/main.js atiende las acciones con la tabla, y no conoce ninguna que no esté en ella', () => {
    const atendidas = [...hacer.matchAll(/^\s+([a-z]+): \(\) =>/gm)].map((m) => m[1])
    expect(atendidas.length).toBeGreaterThan(4)
    for (const id of atendidas) expect(ACCIONES.map((a) => a.id), id).toContain(id)
    expect(principal).toMatch(/accionDeTecla\(e, Object\.keys\(HACER\)\)/)
    expect(principal).toMatch(/acciones: Object\.keys\(HACER\)/) // la ayuda muestra las mismas
  })

  it('no quedan atajos escritos a mano en el visor ni en el buscador', () => {
    const buscador = readFileSync(path.resolve(import.meta.dirname, '../../src/buscador/interfaz.js'), 'utf8')
    expect(principal).not.toMatch(/e\.code === 'Key/)
    expect(buscador).not.toMatch(/e\.key === '\/'/)
  })
})
