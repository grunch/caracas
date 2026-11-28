import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { MARCAS_PUENTES_CRUCES, FICHAS_PUENTES_CRUCES } from '../../src/puentes-cruces-datos.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { normalizarMarcas, validarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { validarFichas, contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'

const PLANO = { ancho: 18600, alto: 14800 }
const coords = crearCoords({ ...PLANO, metro: 0.5, plaza: [8968.2, 6839] })
const EPOCAS = [1, 2, 3, 4, 5, 6]
const CRUCES = ['puente-dolores', 'puente-restaurador', 'puente-19-diciembre', 'puente-ayacucho']
const CALCE = JSON.parse(readFileSync(new URL('../../docs/puentes-guaire-calce.json', import.meta.url), 'utf8'))

const marcas = normalizarMarcas(MARCAS_PUENTES_CRUCES, { coords })
const marca = (id) => marcas.find((m) => m.id === id)
const fila = (id) => MARCAS_PUENTES_CRUCES.find((m) => m.id === id)
const vida = (id) => EPOCAS.map((e) => vivaEn(marca(id), e))
const nombres = (id) => EPOCAS.filter((e) => vivaEn(marca(id), e)).map((e) => nombreEn(marca(id), e).nombre)
const metros = ([ax, ay], [bx, by]) => Math.hypot(ax - bx, ay - by) * 0.5

describe('las marcas de los cruces del Guaire', () => {
  it('son cuatro filas válidas contra la hoja de 1936, inmutables y con fuente enlazada', () => {
    // Arrange
    const ids = MARCAS_PUENTES_CRUCES.map((m) => m.id)

    // Act
    const problemas = validarMarcas(MARCAS_PUENTES_CRUCES, { plano: PLANO })

    // Assert
    expect(ids).toEqual(CRUCES)
    expect(problemas).toEqual([])
    expect(Object.isFrozen(MARCAS_PUENTES_CRUCES)).toBe(true)
    for (const m of MARCAS_PUENTES_CRUCES) {
      expect(Object.isFrozen(m), m.id).toBe(true)
      expect(m.fuente, m.id).toMatch(/https:\/\/\S+/)
    }
  })

  it('Dolores, Restaurador y 19 de Diciembre figuran desde 1911; Ayacucho, desde 1936', () => {
    expect(vida('puente-dolores')).toEqual([false, false, false, true, true, true])
    expect(vida('puente-restaurador')).toEqual([false, false, false, true, true, true])
    expect(vida('puente-19-diciembre')).toEqual([false, false, false, true, true, true])
    expect(vida('puente-ayacucho')).toEqual([false, false, false, false, true, true])
  })

  it('cada nombre es el que rotula el plano de su época', () => {
    expect(nombres('puente-dolores')).toEqual(['Puente Dolores', 'Puente Dolores', 'Puente Soublette'])
    expect(nombres('puente-restaurador')).toEqual(['Puente Restaurador', 'Puente Restaurador', 'Puente Restaurador'])
    expect(nombres('puente-ayacucho')).toEqual(['Puente Ayacucho', 'Puente Ayacucho'])
  })

  it('el 19 de Diciembre no recibe en 1911 el nombre que le dan los planos de 1936 y 1946', () => {
    expect(nombres('puente-19-diciembre')).toEqual(['Puente 19 de Diciembre', 'Puente 9 de Diciembre', 'Puente 9 de Diciembre'])
    expect(fila('puente-19-diciembre').fuente).toMatch(/1936[^;]*«Puente 9 de Diciembre»/)
  })

  it('las estructuras sin resolver después de 1911 llevan la duda escrita, sin afirmar una fecha de reemplazo', () => {
    for (const id of ['puente-dolores', 'puente-restaurador', 'puente-19-diciembre']) {
      expect(fila(id).dudas, id).toMatch(/1946/)
      expect(FICHAS_PUENTES_CRUCES[id].dudas, id).toMatch(/a partir de 1940/)
    }
    expect(fila('puente-dolores').dudas).toMatch(/1935/)
  })
})

describe('los cruces en el sitio', () => {
  it('las cuatro marcas y sus fichas están entre las del mapa, una sola vez', () => {
    for (const id of CRUCES) {
      expect(MARCAS.filter((m) => m.id === id), id).toEqual([fila(id)])
      expect(FICHAS[id], id).toBe(FICHAS_PUENTES_CRUCES[id])
    }
  })
})

describe('las fichas de los cruces del Guaire', () => {
  it('son válidas contra sus marcas y tienen un texto por cada época en que cambia lo documentado', () => {
    expect(validarFichas(FICHAS_PUENTES_CRUCES, MARCAS_PUENTES_CRUCES)).toEqual([])
    expect(Object.keys(FICHAS_PUENTES_CRUCES)).toEqual(CRUCES)
    expect(FICHAS_PUENTES_CRUCES['puente-dolores'].textos.map(([e]) => e)).toEqual([4, 5, 6])
    expect(FICHAS_PUENTES_CRUCES['puente-restaurador'].textos.map(([e]) => e)).toEqual([4, 5, 6])
    expect(FICHAS_PUENTES_CRUCES['puente-19-diciembre'].textos.map(([e]) => e)).toEqual([4, 5])
    expect(FICHAS_PUENTES_CRUCES['puente-ayacucho'].textos.map(([e]) => e)).toEqual([5])
  })

  it('llevan las medidas y fechas documentadas de cada estructura', () => {
    const texto = (id, e) => FICHAS_PUENTES_CRUCES[id].textos.find(([desde]) => desde === e)[1]
    expect(texto('puente-dolores', 4)).toMatch(/60 m/)
    expect(texto('puente-dolores', 5)).toMatch(/1916/)
    expect(texto('puente-dolores', 6)).toMatch(/Soublette/)
    expect(texto('puente-restaurador', 4)).toMatch(/11 de junio de 1905/)
    expect(texto('puente-restaurador', 4)).toMatch(/100,50 m/)
    expect(texto('puente-restaurador', 5)).toMatch(/1932/)
    expect(texto('puente-19-diciembre', 4)).toMatch(/30 m/)
    expect(texto('puente-ayacucho', 5)).toMatch(/1924/)
  })

  it('cada ficha cita su fuente con enlace en lo que queda por verificar', () => {
    for (const id of CRUCES) expect(FICHAS_PUENTES_CRUCES[id].dudas, id).toMatch(/https:\/\/\S+/)
  })

  it('la ficha de cada cruce dice si figura o no en cada época', () => {
    const cuando = (id, epoca) => contenidoDeFicha({ marca: marca(id), ficha: FICHAS_PUENTES_CRUCES[id], fotos: [], epoca }).cuando
    expect(cuando('puente-ayacucho', 4)).toMatch(/Todavía no figura en 1911: aparece en 1936/)
    expect(cuando('puente-dolores', 3)).toMatch(/Todavía no figura en 1889: aparece en 1911/)
    expect(cuando('puente-19-diciembre', 6)).toBe('Hacia 1946')
  })
})

describe('el calce de los cruces (docs/puentes-guaire-calce.json)', () => {
  const unitario = ([x, y]) => Math.abs(Math.hypot(x, y) - 1) < 0.01
  const dentro = ([x, y]) => x >= 0 && y >= 0 && x <= PLANO.ancho && y <= PLANO.alto

  it('trae los cuatro cruces en los tres planos, con su fuente y su error', () => {
    for (const año of ['1911', '1936', '1946']) {
      expect(CALCE.planos[año].url, año).toMatch(/^https:\/\//)
      expect(CALCE.planos[año].calce, año).toBeTruthy()
    }
    for (const id of CRUCES) {
      for (const año of ['1911', '1936', '1946']) expect(CALCE[id][año].dibuja, `${id} ${año}`).toBeTruthy()
      expect(unitario(CALCE[id].adoptado.eje.direccion), id).toBe(true)
      expect(dentro(CALCE[id].adoptado.centro.mosaico), id).toBe(true)
      expect(CALCE[id].adoptado.error_m, id).toBeGreaterThan(0)
    }
  })

  it('lo que el plano no marca queda sin medir, con el motivo, y no se rellena', () => {
    for (const id of ['puente-19-diciembre', 'puente-ayacucho']) {
      expect(CALCE[id].adoptado.cabeza_norte, id).toBeNull()
      expect(CALCE[id].adoptado.cabeza_sur, id).toBeNull()
      expect(CALCE[id].adoptado.sin_medir, id).toMatch(/cabezas/)
    }
    expect(CALCE['puente-ayacucho']['1911'].cabeza_norte).toBeNull()
  })

  it('cada cabeza medida trae el píxel del mosaico y, en los planos calzados, el del escaneo original', () => {
    for (const id of ['puente-dolores', 'puente-restaurador', 'puente-19-diciembre']) {
      for (const cabeza of ['cabeza_norte', 'cabeza_sur']) {
        const c = CALCE[id]['1911'][cabeza]
        expect(dentro(c.mosaico), `${id} ${cabeza}`).toBe(true)
        expect(c.original, `${id} ${cabeza}`).toHaveLength(2)
      }
    }
  })

  it('las cabezas del Restaurador salen del centro de la plazoleta y del largo documentado de 100,50 m', () => {
    const { cabeza_norte: norte, cabeza_sur: sur, centro, largo_m: largo } = CALCE['puente-restaurador'].adoptado
    expect(largo).toBe(100.5)
    expect(metros(norte.mosaico, sur.mosaico)).toBeCloseTo(100.5, 0)
    expect(metros(norte.mosaico, centro.mosaico)).toBeCloseTo(50.25, 0)
  })

  it('las cabezas de Dolores son las del símbolo de 1936 y quedan sobre el eje adoptado', () => {
    const { cabeza_norte: norte, cabeza_sur: sur, eje } = CALCE['puente-dolores'].adoptado
    const [dx, dy] = [sur.mosaico[0] - norte.mosaico[0], sur.mosaico[1] - norte.mosaico[1]]
    const largo = Math.hypot(dx, dy)
    expect(norte.mosaico).toEqual(CALCE['puente-dolores']['1936'].cabeza_norte.mosaico)
    expect(dx / largo).toBeCloseTo(eje.direccion[0], 2)
    expect(dy / largo).toBeCloseTo(eje.direccion[1], 2)
  })

  it('cada marca cae sobre el centro adoptado de su cruce (a menos de 1 m)', () => {
    for (const id of CRUCES) {
      const { x, y } = fila(id)
      expect(metros([x, y], CALCE[id].adoptado.centro.mosaico), id).toBeLessThan(1)
    }
  })
})
