import { describe, test, expect } from 'vitest'
import { PerspectiveCamera, Matrix4 } from 'three'
import {
  normalizarMarcas, validarMarcas, vivaEn, nombreEn, presenciaEn, nivelPorDistancia, DIST_NIVEL,
  aPantalla, cajaDe, seTapan, despejar, calcularMarcas, distanciaDeVuelo, DIST_VUELO_M, HILO_PX,
} from '../../src/marcas.js'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'
import { PRIMERA_EPOCA, SIN_LINEA_DE_TIEMPO } from '../../src/epocas.js'

const PLANO = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [8968.2, 6839] }
const coords = crearCoords(PLANO)
const HITOS_DE_PRUEBA = [{ id: 'capitolio', x: 8690, y: 7035, nace: 3, muere: 0 }]
const fila = (extra = {}) => ({ id: 'a', nombre: 'A', x: 9000, y: 6800, nace: 1, nivel: 2, fuente: 'prueba', ...extra })
const normalizar = (filas, hitos = HITOS_DE_PRUEBA) => normalizarMarcas(filas, { hitos, coords })

describe('normalizarMarcas', () => {
  test('pasa los píxeles del plano a metros del mundo, con la plaza en el origen', () => {
    const [m] = normalizar([fila({ x: 8968.2 + 200, y: 6839 - 100 })])
    expect(m.x).toBeCloseTo(100)
    expect(m.z).toBeCloseTo(-50)
  })

  test('una marca de un hito toma de él la posición y, si no trae la suya, la época en que nace', () => {
    const [m] = normalizar([{ id: 'c', nombre: 'Capitolio', hito: 'capitolio', nivel: 1, fuente: 'f' }])
    expect([m.px, m.py, m.nace]).toEqual([8690, 7035, 3])
  })

  test('la marca puede nacer antes que su hito (el convento que hubo antes en el lugar)', () => {
    const [m] = normalizar([{ id: 'c', hito: 'capitolio', nace: 1, nombres: [[1, 'Convento'], [3, 'Capitolio']], nivel: 1, fuente: 'f' }])
    expect(m.nace).toBe(1)
    expect(m.nombres.map((n) => n.nombre)).toEqual(['Convento', 'Capitolio'])
  })

  test('un nombre solo vale desde que la marca nace; muere = 0 es "sigue en pie"', () => {
    const [m] = normalizar([fila({ nace: 2, nota: 'una nota' })])
    expect(m.nombres).toEqual([{ desde: 2, nombre: 'A', nota: 'una nota' }])
    expect(m.muere).toBe(0)
  })

  test('falla con un hito desconocido y no modifica las filas', () => {
    const filas = Object.freeze([Object.freeze(fila())])
    expect(() => normalizar(filas)).not.toThrow()
    expect(() => normalizar([{ id: 'x', nombre: 'X', hito: 'no-existe', nivel: 1, fuente: 'f' }])).toThrow(/no-existe/)
  })
})

describe('validarMarcas', () => {
  const validar = (filas) => validarMarcas(filas, { hitos: HITOS_DE_PRUEBA, plano: PLANO })

  test('una fila bien formada no tiene problemas', () => {
    expect(validar([fila()])).toEqual([])
  })

  test.each([
    ['id repetido', [fila(), fila()], /repetido/],
    ['sin fuente', [fila({ fuente: '' })], /fuente/],
    ['nivel fuera de 1 a 3', [fila({ nivel: 4 })], /nivel/],
    ['fuera de la hoja', [fila({ x: -5 })], /fuera de la hoja/],
    ['nace antes de la primera época que se muestra', [fila({ nace: 0 })], /vida/],
    ['muere antes de nacer', [fila({ nace: 3, muere: 2 })], /vida/],
    ['sin nombre', [fila({ nombre: '' })], /nombre/],
    ['nombres desordenados', [fila({ nombre: undefined, nombres: [[3, 'B'], [1, 'A']] })], /nombres/],
    ['el primer nombre empieza después de nacer', [fila({ nombre: undefined, nombres: [[2, 'B']] })], /nombres/],
    ['hito desconocido', [{ id: 'h', nombre: 'H', hito: 'nada', nivel: 1, fuente: 'f' }], /hito/],
  ])('detecta: %s', (_, filas, patron) => {
    expect(validar(filas).join('\n')).toMatch(patron)
  })
})

describe('las marcas de Caracas (src/marcas-datos.js)', () => {
  test('son válidas contra la hoja de 1936 y los hitos modelados', () => {
    expect(validarMarcas(MARCAS, { hitos: HITOS, plano: PLANO })).toEqual([])
  })

  test('hay entre 40 y 60, y todas las épocas tienen marcas de los tres niveles', () => {
    expect(MARCAS.length).toBeGreaterThanOrEqual(40)
    expect(MARCAS.length).toBeLessThanOrEqual(60)
    const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
    for (let e = PRIMERA_EPOCA; e <= 5; e++) {
      const vivas = marcas.filter((m) => vivaEn(m, e))
      expect(vivas.length, `época ${e}`).toBeGreaterThanOrEqual(12)
      expect(new Set(vivas.map((m) => m.nivel)), `época ${e}`).toEqual(new Set([1, 2, 3]))
    }
  })

  test('la plaza es Plaza Mayor hasta 1843 y Plaza Bolívar desde 1889; los conventos dan paso al Capitolio y la Universidad', () => {
    const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
    const nombre = (id, e) => nombreEn(marcas.find((m) => m.id === id), e)?.nombre
    expect([1, 2, 3, 5].map((e) => nombre('plaza-bolivar', e))).toEqual(['Plaza Mayor', 'Plaza Mayor', 'Plaza Bolívar', 'Plaza Bolívar'])
    expect([2, 3].map((e) => nombre('capitolio', e))).toEqual(['Convento de las Concepciones', 'Capitolio'])
    expect([2, 3].map((e) => nombre('universidad', e))).toEqual(['Convento de San Francisco', 'Universidad'])
  })

  describe('cotejo con la leyenda del plano de Jesurún de 1843 (T81, specs/auditoria-1843)', () => {
    // las que la leyenda nombra con lectura segura (specs/auditoria-1843/cotejo-leyenda.md)
    const COTEJADAS = [
      'guaire', 'calvario', 'catuche', 'caroata', 'anauco', 'catedral', 'palacio-arzobispal', 'capitolio',
      'san-francisco', 'santa-capilla', 'altagracia', 'carmelitas', 'san-jacinto', 'teatro-municipal',
      'la-pastora', 'panteon', 'santa-rosalia', 'candelaria', 'las-mercedes',
    ]
    const dice1843SinCotejar = (texto = '') => /(sin cotejar|no se cotej)[^.]*1843|1843[^.]*(sin cotejar|no se cotej)/.test(texto)
    const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
    const de = (id) => marcas.find((m) => m.id === id)

    test('cada marca cotejada cita la leyenda de 1843 en su fuente y vive en 1843', () => {
      for (const id of COTEJADAS) {
        expect(de(id).fuente, id).toMatch(/leyenda del plano de Jesurún de 1843 \(\S+ «[^»]+»\)/)
        expect(vivaEn(de(id), 2), id).toBe(true)
      }
    })

    test('ninguna marca ni ficha de 1843 cotejada conserva «sin cotejar» para 1843', () => {
      const cotejadas = marcas.filter((m) => vivaEn(m, 2) && m.fuente.includes('Jesurún'))
      expect(cotejadas.map((m) => m.id).sort()).toEqual([...COTEJADAS].sort())
      for (const m of cotejadas) {
        expect(dice1843SinCotejar(m.dudas), `marca ${m.id}: ${m.dudas}`).toBe(false)
        expect(dice1843SinCotejar(FICHAS[m.id]?.dudas), `ficha ${m.id}: ${FICHAS[m.id]?.dudas}`).toBe(false)
      }
    })

    test('Santa Rosalía, Candelaria y La Merced, que la leyenda nombra, nacen en 1843', () => {
      expect(['santa-rosalia', 'candelaria', 'las-mercedes'].map((id) => de(id).nace)).toEqual([2, 2, 2])
      expect([2, 3, 5].map((e) => nombreEn(de('las-mercedes'), e).nombre)).toEqual(['La Merced', 'Las Mercedes', 'Las Mercedes'])
    })
  })

  test('sin línea de tiempo se ve la ciudad final: lo que murió no tiene marca', () => {
    const marcas = normalizarMarcas(MARCAS, { hitos: HITOS, coords })
    const finales = marcas.filter((m) => vivaEn(m, SIN_LINEA_DE_TIEMPO))
    expect(finales.every((m) => m.muere === 0)).toBe(true)
    expect(finales.length).toBeGreaterThan(30)
  })
})

describe('vida y nombre por época', () => {
  const [marca] = normalizar([fila({ nace: 1, muere: 5, nombre: undefined, nombres: [[1, 'Plaza Mayor'], [3, 'Plaza Bolívar', 'Con la estatua.']] })])

  test('vivaEn sigue la convención de las casas: nace ≤ e < muere', () => {
    expect([0, 1, 4, 5].map((e) => vivaEn(marca, e))).toEqual([false, true, true, false])
  })

  test('nombreEn da el último nombre que ya rige', () => {
    expect(nombreEn(marca, 1).nombre).toBe('Plaza Mayor')
    expect(nombreEn(marca, 2).nombre).toBe('Plaza Mayor')
    expect(nombreEn(marca, 3)).toEqual({ desde: 3, nombre: 'Plaza Bolívar', nota: 'Con la estatua.' })
  })

  test('en plena ola el nombre cambia a mitad de camino entre dos épocas, como nacen las casas', () => {
    expect(nombreEn(marca, 2.4).nombre).toBe('Plaza Mayor')
    expect(nombreEn(marca, 2.5).nombre).toBe('Plaza Bolívar')
  })

  test('presenciaEn sube al nacer y baja al morir, entre 0 y 1', () => {
    expect(presenciaEn(marca, 0.4)).toBe(0)
    expect(presenciaEn(marca, 0.75)).toBeCloseTo(0.5)
    expect(presenciaEn(marca, 3)).toBe(1)
    expect(presenciaEn(marca, 4.75)).toBeCloseTo(0.5)
    expect(presenciaEn(marca, 5)).toBe(0)
  })
})

describe('nivelPorDistancia', () => {
  test('de lejos solo el nivel 1; al acercarse entran el 2 y el 3', () => {
    expect(nivelPorDistancia(DIST_NIVEL[2] * 1.5)).toBe(1)
    expect(nivelPorDistancia(DIST_NIVEL[2] * 0.9)).toBe(2)
    expect(nivelPorDistancia(DIST_NIVEL[3] * 0.9)).toBe(3)
  })

  test('con histéresis: cerca del umbral se queda en el nivel que ya tenía (no parpadea)', () => {
    const justoAfuera = DIST_NIVEL[3] * 1.03
    const justoAdentro = DIST_NIVEL[3] * 0.97
    expect(nivelPorDistancia(justoAfuera, 3)).toBe(3)
    expect(nivelPorDistancia(justoAfuera, 2)).toBe(2)
    expect(nivelPorDistancia(justoAdentro, 2)).toBe(2)
    expect(nivelPorDistancia(DIST_NIVEL[3] * 0.8, 2)).toBe(3)
    expect(nivelPorDistancia(DIST_NIVEL[3] * 1.2, 3)).toBe(2)
  })
})

describe('distanciaDeVuelo', () => {
  test('al tocar una marca la cámara se acerca hasta la distancia de su nivel', () => {
    expect(distanciaDeVuelo(3, { ahora: 3000, destino: 3000 })).toBe(DIST_VUELO_M[3])
    expect(distanciaDeVuelo(1, { ahora: 3000, destino: 3000 })).toBe(DIST_VUELO_M[1])
  })

  test('nunca se aleja: ni de donde está la cámara ni de adonde ya iba', () => {
    // ya está más cerca que el límite del nivel
    expect(distanciaDeVuelo(1, { ahora: 300, destino: 300 })).toBe(300)
    // en pleno alejamiento (está a 1000 y va hacia 2000): se queda en 1000
    expect(distanciaDeVuelo(1, { ahora: 1000, destino: 2000 })).toBe(1000)
    // en pleno acercamiento (está a 2000 y va hacia 200): lo conserva
    expect(distanciaDeVuelo(1, { ahora: 2000, destino: 200 })).toBe(200)
  })
})

/** La matriz de una cámara de three que mira al origen desde el sur y arriba. */
function matrizDeCamara(posicion = [0, 500, 500], mira = [0, 0, 0]) {
  const c = new PerspectiveCamera(35, 2, 5, 60000)
  c.position.set(...posicion)
  c.lookAt(...mira)
  c.updateMatrixWorld()
  return new Matrix4().multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse).elements
}

describe('aPantalla', () => {
  const m = matrizDeCamara()

  test('lo que mira la cámara cae en el centro de la vista', () => {
    const p = aPantalla(m, 0, 0, 0, 1000, 500)
    expect(p.x).toBeCloseTo(500)
    expect(p.y).toBeCloseTo(250)
    expect(p.visible).toBe(true)
  })

  test('más alto en el mundo es más arriba en la pantalla; al este, a la derecha', () => {
    expect(aPantalla(m, 0, 30, 0, 1000, 500).y).toBeLessThan(250)
    expect(aPantalla(m, 50, 0, 0, 1000, 500).x).toBeGreaterThan(500)
  })

  test('lo que queda detrás de la cámara o fuera de la vista no es visible', () => {
    expect(aPantalla(m, 0, 0, 5000, 1000, 500).visible).toBe(false)
    expect(aPantalla(m, 5000, 0, 0, 1000, 500).visible).toBe(false)
  })
})

describe('cajas y despeje', () => {
  test('el cartel va centrado sobre el punto, al final del hilo', () => {
    expect(cajaDe({ x: 100, y: 200 }, { ancho: 60, alto: 20 })).toEqual({ x0: 70, y0: 200 - HILO_PX - 20, x1: 130, y1: 200 - HILO_PX })
  })

  const candidata = (id, x, y, extra = {}) => ({ id, nivel: 2, x, y, caja: cajaDe({ x, y }, { ancho: 60, alto: 20 }), ...extra })

  test('dos carteles se tapan si sus cajas se tocan (con margen) o si uno cae sobre el punto del otro', () => {
    expect(seTapan(candidata('a', 100, 100), candidata('b', 130, 100))).toBe(true)
    expect(seTapan(candidata('a', 100, 100), candidata('b', 100 + 60 + 20, 100))).toBe(false)
    // b está justo debajo: su cartel pisa el punto de a
    expect(seTapan(candidata('a', 100, 100), candidata('b', 100, 100 + HILO_PX + 10))).toBe(true)
  })

  test('gana el nivel más importante; a igual nivel, el orden de la lista', () => {
    const c = [candidata('tercero', 100, 100, { nivel: 3 }), candidata('primero', 110, 100, { nivel: 1 }), candidata('otro', 400, 100, { nivel: 3 })]
    expect(despejar(c).map((x) => x.id)).toEqual(['primero', 'otro'])
    const iguales = [candidata('a', 100, 100), candidata('b', 110, 100)]
    expect(despejar(iguales).map((x) => x.id)).toEqual(['a'])
  })

  test('es estable: entre dos del mismo nivel que chocan, sigue la que ya estaba puesta', () => {
    const iguales = [candidata('a', 100, 100), candidata('b', 110, 100)]
    expect(despejar(iguales, { previas: new Set(['b']) }).map((x) => x.id)).toEqual(['b'])
    // pero una de más nivel la desplaza igual
    const conGrande = [candidata('a', 100, 100, { nivel: 1 }), candidata('b', 110, 100)]
    expect(despejar(conGrande, { previas: new Set(['b']) }).map((x) => x.id)).toEqual(['a'])
  })

  test('la marca abierta va primero, sea del nivel que sea: su cartel con la nota no se tapa', () => {
    const c = [candidata('grande', 100, 100, { nivel: 1 }), candidata('abierta', 110, 100, { nivel: 3 })]
    expect(despejar(c, { primera: 'abierta' }).map((x) => x.id)).toEqual(['abierta'])
  })

  test('no modifica la lista de candidatas', () => {
    const c = Object.freeze([candidata('b', 110, 100, { nivel: 3 }), candidata('a', 100, 100, { nivel: 1 })])
    despejar(c)
    expect(c.map((x) => x.id)).toEqual(['b', 'a'])
  })
})

describe('calcularMarcas', () => {
  const marcas = normalizar([
    fila({ id: 'plaza', nombre: undefined, nombres: [[1, 'Plaza Mayor'], [3, 'Plaza Bolívar']], x: 8968.2, y: 6839, nivel: 1 }),
    fila({ id: 'teatro', nombre: 'Teatro', x: 8968.2 + 300, y: 6839, nace: 3, nivel: 2, alto: 20 }),
    fila({ id: 'esquina', nombre: 'Esquina', x: 8968.2 - 300, y: 6839, nace: 1, nivel: 3 }),
    fila({ id: 'lejos', nombre: 'Lejos', x: 100, y: 100, nace: 1, nivel: 1 }),
  ])
  const base = {
    matriz: matrizDeCamara(), vista: { ancho: 1000, alto: 500 }, dist: 700,
    epoca: { de: 5, a: 5, ola: 9000, ancho: 260 }, medir: () => ({ ancho: 60, alto: 20 }),
  }

  test('con todo a la vista y de cerca, salen las tres marcas vivas con su nombre de la época', () => {
    const r = calcularMarcas(marcas, base)
    expect(r.nivel).toBe(3)
    expect(r.visibles.map((v) => [v.id, v.nombre]).sort()).toEqual([['esquina', 'Esquina'], ['plaza', 'Plaza Bolívar'], ['teatro', 'Teatro']])
    expect(r.visibles.every((v) => v.opacidad === 1)).toBe(true)
  })

  test('en 1772 el teatro no existe y la plaza es la Plaza Mayor', () => {
    const r = calcularMarcas(marcas, { ...base, epoca: { de: 1, a: 1, ola: 9000, ancho: 260 } })
    expect(r.visibles.map((v) => [v.id, v.nombre]).sort()).toEqual([['esquina', 'Esquina'], ['plaza', 'Plaza Mayor']])
  })

  test('las marcas cambian con la ola de la época: detrás del frente rige la nueva, delante la vieja', () => {
    // la ola de 1843 → 1889 va por los 100 m: llegó a la plaza (0 m), no al teatro (150 m)
    const r = calcularMarcas(marcas, { ...base, epoca: { de: 2, a: 3, ola: 100, ancho: 10 } })
    expect(r.visibles.map((v) => [v.id, v.nombre]).sort()).toEqual([['esquina', 'Esquina'], ['plaza', 'Plaza Bolívar']])
  })

  test('de lejos solo quedan las de nivel 1', () => {
    const r = calcularMarcas(marcas, { ...base, dist: DIST_NIVEL[2] * 2 })
    expect(r.visibles.map((v) => v.id)).toEqual(['plaza'])
  })

  test('el punto sube con el terreno y con el edificio levantado; acostada la ciudad, queda en el suelo', () => {
    const y = (extra) => calcularMarcas(marcas, { ...base, ...extra }).visibles.find((v) => v.id === 'teatro').y
    const acostada = y({ sube: () => 0 })
    expect(y({ sube: () => 1 })).toBeLessThan(acostada)
    expect(y({ sube: () => 0, altura: () => 40 })).toBeLessThan(acostada)
  })

  test('cada visible trae su caja, y las cajas no se pisan', () => {
    const r = calcularMarcas(marcas, { ...base, medir: () => ({ ancho: 600, alto: 20 }) })
    expect(r.visibles.map((v) => v.id)).toEqual(['plaza'])
    expect(r.visibles[0].caja).toEqual(cajaDe(r.visibles[0], { ancho: 600, alto: 20 }))
  })

  test('la marca abierta se mide abierta (con su nota) y desplaza a las que su cartel tapa', () => {
    // Arrange: cerrados, los tres carteles de 60 px entran; abierto, el de la esquina mide 400 px
    const medir = (nombre, nivel, abierta) => (abierta ? { ancho: 400, alto: 60 } : { ancho: 60, alto: 20 })
    // Act
    const r = calcularMarcas(marcas, { ...base, medir, abierta: 'esquina' })
    // Assert: queda ella, con su caja grande, y el teatro (lejos); la plaza, aunque es de nivel 1, cede
    const esquina = r.visibles.find((v) => v.id === 'esquina')
    expect(esquina.caja.x1 - esquina.caja.x0).toBeCloseTo(400)
    expect(r.visibles.map((v) => v.id).sort()).toEqual(['esquina', 'teatro'])
  })

  test('recuerda el nivel anterior (histéresis) y las marcas que ya estaban', () => {
    const r = calcularMarcas(marcas, { ...base, dist: DIST_NIVEL[3] * 1.03, nivelPrevio: 3 })
    expect(r.nivel).toBe(3)
  })
})
