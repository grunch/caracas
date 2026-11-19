import { describe, test, expect } from 'vitest'
import { encajar, acercarEn, mover, acotar, imagenesDelPlano, creditoDe, ZOOM_MAX, MARGEN_PX } from '../../src/visor-plano.js'

const imagen = { ancho: 2000, alto: 1000 }
const vista = { ancho: 1000, alto: 800 }

describe('encajar: el plano entero dentro del panel, centrado', () => {
  test('una imagen apaisada se ajusta al ancho y queda centrada en el alto', () => {
    // Arrange / Act
    const e = encajar(imagen, vista)
    // Assert
    expect(e.k).toBeCloseTo(0.5)
    expect(e.x).toBeCloseTo(0)
    expect(e.y).toBeCloseTo((800 - 500) / 2)
  })

  test('una imagen vertical se ajusta al alto', () => {
    const e = encajar({ ancho: 500, alto: 1600 }, vista)
    expect(e.k).toBeCloseTo(0.5)
    expect(e.x).toBeCloseTo((1000 - 250) / 2)
    expect(e.y).toBeCloseTo(0)
  })

  test('una imagen chica no se agranda más que a su tamaño', () => {
    expect(encajar({ ancho: 200, alto: 100 }, vista)).toEqual({ k: 1, x: 400, y: 350 })
  })

  test('sin medidas (la imagen todavía no llegó) no hay nada que encajar', () => {
    expect(encajar({ ancho: 0, alto: 0 }, vista)).toEqual({ k: 1, x: 0, y: 0 })
  })
})

describe('acercarEn: el zoom deja quieto el punto bajo el cursor', () => {
  test('el punto de la imagen que estaba bajo el cursor sigue ahí', () => {
    const antes = { k: 0.5, x: 0, y: 150 }
    const despues = acercarEn(antes, 2, { x: 300, y: 400 }, { min: 0.1, max: 8 })
    expect(despues.k).toBe(1)
    const enImagen = (e) => [(300 - e.x) / e.k, (400 - e.y) / e.k]
    expect(enImagen(despues)[0]).toBeCloseTo(enImagen(antes)[0])
    expect(enImagen(despues)[1]).toBeCloseTo(enImagen(antes)[1])
  })

  test('no pasa de los límites, y en el límite no se corre', () => {
    const e = { k: 8, x: -100, y: -50 }
    expect(acercarEn(e, 2, { x: 10, y: 10 }, { min: 0.1, max: 8 })).toEqual(e)
    expect(acercarEn({ k: 0.2, x: 0, y: 0 }, 0.1, { x: 0, y: 0 }, { min: 0.1, max: 8 }).k).toBe(0.1)
  })

  test('no cambia el estado que recibe', () => {
    const e = Object.freeze({ k: 1, x: 0, y: 0 })
    expect(() => acercarEn(e, 1.5, { x: 5, y: 5 }, { min: 0.1, max: 8 })).not.toThrow()
    expect(e).toEqual({ k: 1, x: 0, y: 0 })
  })
})

describe('mover y acotar: el plano no se pierde fuera del panel', () => {
  test('mover corre el plano sin tocar el zoom', () => {
    expect(mover({ k: 2, x: 10, y: 20 }, 5, -7)).toEqual({ k: 2, x: 15, y: 13 })
  })

  test('siempre queda un margen del plano a la vista, por los cuatro lados', () => {
    const k = 1
    expect(acotar({ k, x: 5000, y: 0 }, imagen, vista).x).toBe(vista.ancho - MARGEN_PX)
    expect(acotar({ k, x: -5000, y: 0 }, imagen, vista).x).toBe(MARGEN_PX - imagen.ancho * k)
    expect(acotar({ k, x: 0, y: 5000 }, imagen, vista).y).toBe(vista.alto - MARGEN_PX)
    expect(acotar({ k, x: 0, y: -5000 }, imagen, vista).y).toBe(MARGEN_PX - imagen.alto * k)
  })

  test('lo que ya está a la vista no se toca', () => {
    const e = { k: 0.5, x: 0, y: 150 }
    expect(acotar(e, imagen, vista)).toEqual(e)
  })
})

describe('imagenesDelPlano: qué se baja para ver el plano de una época', () => {
  const indice = [
    { año: 1772, niveles: [{ url: 'plano/1772/chico.webp', lado: 2048 }, { url: 'plano/1772/medio.webp', lado: 4096 }] },
    { año: 1889, niveles: [{ url: 'plano/1889/chico.webp', lado: 2048 }, { url: 'plano/1889/medio.webp', lado: 4096 }, { url: 'plano/1889/grande.webp', lado: 8192 }] },
  ]
  const base = ['plano/chico.webp', 'plano/medio.webp']
  const añoBase = 1936

  test('el plano calzado de la época: el chico primero y después el mejor', () => {
    expect(imagenesDelPlano(1772, indice, { base, añoBase })).toEqual({ urls: ['plano/1772/chico.webp', 'plano/1772/medio.webp'], calzado: true })
    expect(imagenesDelPlano(1889, indice, { base, añoBase }).urls).toEqual(['plano/1889/chico.webp', 'plano/1889/grande.webp'])
  })

  test('en equipos livianos, el mejor no pasa de 4096 px', () => {
    expect(imagenesDelPlano(1889, indice, { base, añoBase, liviano: true }).urls).toEqual(['plano/1889/chico.webp', 'plano/1889/medio.webp'])
  })

  test('la época sin plano calzado (1936) muestra la hoja base, que es su plano', () => {
    expect(imagenesDelPlano(1936, indice, { base, añoBase })).toEqual({ urls: base, calzado: false })
    expect(imagenesDelPlano(1936, [], { base, añoBase })).toEqual({ urls: base, calzado: false })
  })

  test('un año sin plano no toma el de otro: cada año muestra el suyo o ninguno', () => {
    expect(imagenesDelPlano(1578, indice, { base, añoBase })).toBeNull()
    expect(imagenesDelPlano(1772, [], { base, añoBase })).toBeNull() // el índice no llegó: no se muestra la hoja de 1936 como si fuera de 1772
  })

  test('un plano con un solo nivel no se pide dos veces', () => {
    const uno = [{ año: 1843, niveles: [{ url: 'a.webp', lado: 2048 }] }]
    expect(imagenesDelPlano(1843, uno, { base, añoBase }).urls).toEqual(['a.webp'])
  })
})

describe('creditoDe: título, autor, año, fuente y licencia, tal como vienen de la ficha', () => {
  const epoca = {
    año: 1889, titulo: 'Plano topografico de la ciudad de Caracas', autor: 'Vicente S. Mestre (1858-1919)',
    fuente: 'Bibliothèque nationale de France (copia en Wikimedia Commons) · https://commons.wikimedia.org/wiki/File:Plano.jpg',
    licencia: 'Public domain (Wikimedia Commons)',
  }

  test('separa el nombre de la fuente de su dirección', () => {
    expect(creditoDe(epoca)).toEqual({
      titulo: 'Plano topografico de la ciudad de Caracas', autor: 'Vicente S. Mestre (1858-1919)', año: '1889',
      fuente: 'Bibliothèque nationale de France (copia en Wikimedia Commons)', enlace: 'https://commons.wikimedia.org/wiki/File:Plano.jpg',
      licencia: 'Public domain (Wikimedia Commons)',
    })
  })

  test('sin dirección, la fuente va entera y no hay enlace', () => {
    const c = creditoDe({ ...epoca, fuente: 'Archivo General de Indias' })
    expect(c.fuente).toBe('Archivo General de Indias')
    expect(c.enlace).toBeNull()
  })

  test('solo enlaza direcciones http(s): lo demás queda como texto', () => {
    const c = creditoDe({ ...epoca, fuente: 'Algo · javascript:alert(1)' })
    expect(c.enlace).toBeNull()
    expect(c.fuente).toBe('Algo · javascript:alert(1)')
  })

  test('lo que la ficha no trae se dice, no se inventa', () => {
    const c = creditoDe({ año: 1843 })
    expect(c).toEqual({ titulo: 'Plano de 1843', autor: 'autor sin identificar', año: '1843', fuente: 'fuente sin registrar', enlace: null, licencia: 'licencia sin declarar' })
  })
})

describe('límites', () => {
  test('el zoom llega bastante más allá del tamaño de la imagen chica (el nivel mejor tiene hasta 4× más píxeles)', () => {
    expect(ZOOM_MAX).toBeGreaterThanOrEqual(4)
  })
})
