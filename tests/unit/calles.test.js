import { describe, test, expect, vi, afterEach } from 'vitest'
import { PerspectiveCamera } from 'three'
import {
  decodificarCalles, indexarTramos, anguloLegible, crearGrilla, celdasEtiqueta, crearMedidor, crearRotulos,
  opacidadPorDistancia, cargarCalles, BYTES_TRAMO, MAX_ETIQUETAS,
} from '../../src/calles.js'
import { crearCoords } from '../../src/coords.js'

// plano de 1936: 0,5 m por píxel, plaza en (1000, 1000) → el mundo en metros con la plaza en el origen
const coords = crearCoords({ ancho: 20000, alto: 20000, metro: 0.5, plaza: [1000, 1000] })

/** Un calles.bin en memoria: cada tramo [x, y, dx, dy, nombre, largo] con dx/dy en −1…1. */
function binario(tramos) {
  const v = new DataView(new ArrayBuffer(tramos.length * BYTES_TRAMO))
  tramos.forEach(([x, y, dx, dy, nombre, largo], i) => {
    const o = i * BYTES_TRAMO
    v.setUint16(o, x, true)
    v.setUint16(o + 2, y, true)
    v.setUint16(o + 4, Math.round(dx * 32767 + 32768), true)
    v.setUint16(o + 6, Math.round(dy * 32767 + 32768), true)
    v.setUint16(o + 8, nombre, true)
    v.setUint16(o + 10, largo, true)
  })
  return v.buffer
}

describe('decodificar calles.bin + calles.json', () => {
  test('lee punto medio, dirección unitaria, nombre y largo de cada tramo', () => {
    // Arrange
    const buf = binario([[1200, 900, 1, 0, 1, 180], [1000, 1000, 0, -1, 0, 40]])
    // Act
    const tramos = decodificarCalles(buf, ['Avenida Urdaneta', 'Avenida Baralt'])
    // Assert
    expect(tramos).toHaveLength(2)
    expect(tramos[0]).toMatchObject({ x: 1200, y: 900, nombre: 'Avenida Baralt', largo: 180 })
    expect(tramos[0].dx).toBeCloseTo(1, 4)
    expect(tramos[0].dy).toBeCloseTo(0, 4)
    expect(tramos[1].dy).toBeCloseTo(-1, 4)
    expect(Object.isFrozen(tramos)).toBe(true)
  })

  test('los extremos de la codificación son −1 y +1', () => {
    const v = new DataView(new ArrayBuffer(BYTES_TRAMO))
    v.setUint16(4, 1, true) // (1 − 32768) / 32767 = −1
    v.setUint16(6, 65535, true) // (65535 − 32768) / 32767 = +1
    const [t] = decodificarCalles(v.buffer, ['x'])
    expect(t.dx).toBe(-1)
    expect(t.dy).toBe(1)
  })

  test('rechaza un archivo que no es múltiplo de 12 bytes', () => {
    expect(() => decodificarCalles(new ArrayBuffer(13), ['x'])).toThrow(/12/)
  })

  test('rechaza un índice de nombre fuera de calles.json', () => {
    expect(() => decodificarCalles(binario([[0, 0, 1, 0, 5, 30]]), ['a', 'b'])).toThrow(/nombre/)
  })

  test('rechaza nombres que no son una lista de textos', () => {
    expect(() => decodificarCalles(binario([[0, 0, 1, 0, 0, 30]]), { 0: 'a' })).toThrow(/calles\.json/)
  })
})

describe('índice espacial de tramos', () => {
  const tramos = decodificarCalles(binario([
    [1000, 1000, 1, 0, 0, 200], // en la plaza
    [1400, 1000, 1, 0, 1, 150], // 200 m al este
    [9000, 9000, 1, 0, 2, 100], // a (4000, 4000) m
    [1010, 1010, 0, -1, 3, 30], // en la plaza, cortito
  ]), ['A', 'B', 'C', 'D'])

  test('pasa los tramos a metros del mundo, con la dirección en x/z', () => {
    const { tramos: t } = indexarTramos(tramos, coords)
    expect(t[1]).toMatchObject({ x: 200, z: 0, nombre: 'B', largo: 150 })
    expect(t[3].dz).toBeCloseTo(-1, 4)
  })

  test('devuelve los de cerca en el orden del archivo (los más largos primero)', () => {
    // Arrange
    const indice = indexarTramos(tramos, coords, 300)
    // Act
    const cerca = indice.cerca(0, 0, 400)
    // Assert
    expect(cerca.map((t) => t.nombre)).toEqual(['A', 'B', 'D'])
  })

  test('no devuelve los que caen lejos', () => {
    const indice = indexarTramos(tramos, coords, 300)
    expect(indice.cerca(0, 0, 100).map((t) => t.nombre)).toEqual(['A', 'D'])
    expect(indice.cerca(2000, 2000, 100)).toEqual([])
  })
})

describe('ángulo legible', () => {
  test('el texto nunca queda de cabeza: hacia la izquierda se lee hacia la derecha', () => {
    expect(anguloLegible(-1, 0)).toBeCloseTo(0, 6)
    expect(anguloLegible(1, 0)).toBeCloseTo(0, 6)
  })

  test('una calle vertical se lee de abajo hacia arriba', () => {
    expect(anguloLegible(0, 1)).toBeCloseTo(-Math.PI / 2, 6)
    expect(anguloLegible(0, -1)).toBeCloseTo(-Math.PI / 2, 6)
  })

  test('las diagonales quedan entre −90° y +90°', () => {
    expect(anguloLegible(-1, -1)).toBeCloseTo(Math.PI / 4, 6)
    expect(anguloLegible(-1, 1)).toBeCloseTo(-Math.PI / 4, 6)
    expect(anguloLegible(1, 1)).toBeCloseTo(Math.PI / 4, 6)
  })
})

describe('grilla anticolisión', () => {
  test('una etiqueta horizontal ocupa las celdas de 13 px que cruza', () => {
    const celdas = celdasEtiqueta({ cx: 100, cy: 50, angulo: 0, ancho: 60, alto: 12 }, 13, 200, 100)
    // de x = 70 a 130 → columnas 5…10; de y = 44 a 56 → filas 3…4
    const columnas = new Set(celdas.map((c) => c % Math.ceil(200 / 13)))
    expect(Math.min(...columnas)).toBe(5)
    expect(Math.max(...columnas)).toBe(10)
  })

  test('una etiqueta que se sale de la pantalla no tiene lugar', () => {
    expect(celdasEtiqueta({ cx: 5, cy: 50, angulo: 0, ancho: 60, alto: 12 }, 13, 200, 100)).toBeNull()
  })

  test('la segunda etiqueta encima de la primera no entra; una lejana sí', () => {
    // Arrange
    const grilla = crearGrilla(400, 300, 13)
    const a = celdasEtiqueta({ cx: 100, cy: 100, angulo: 0, ancho: 80, alto: 12 }, 13, 400, 300)
    const b = celdasEtiqueta({ cx: 110, cy: 104, angulo: 0.2, ancho: 80, alto: 12 }, 13, 400, 300)
    const c = celdasEtiqueta({ cx: 300, cy: 250, angulo: 0, ancho: 80, alto: 12 }, 13, 400, 300)
    // Act · Assert
    expect(grilla.ocupar(a)).toBe(true)
    expect(grilla.ocupar(b)).toBe(false)
    expect(grilla.ocupar(c)).toBe(true)
    grilla.vaciar()
    expect(grilla.ocupar(b)).toBe(true)
  })
})

describe('medición de texto cacheada', () => {
  test('mide cada nombre una sola vez por fuente', () => {
    // Arrange
    let llamadas = 0
    const ctx = { font: '', measureText: (s) => { llamadas++; return { width: s.length * 7 } } }
    const medir = crearMedidor(ctx)
    // Act
    medir('Avenida Urdaneta', 'italic 13px serif')
    medir('Avenida Urdaneta', 'italic 13px serif')
    const w = medir('Avenida Urdaneta', 'italic 14px serif')
    // Assert
    expect(llamadas).toBe(2)
    expect(w).toBe(16 * 7)
  })
})

describe('opacidad según la distancia de la cámara', () => {
  test('cero fuera de la banda, uno en el medio y transiciones suaves en los bordes', () => {
    const banda = { min: 300, max: 3600, borde: 0.15 }
    expect(opacidadPorDistancia(100, banda)).toBe(0)
    expect(opacidadPorDistancia(5000, banda)).toBe(0)
    expect(opacidadPorDistancia(1500, banda)).toBe(1)
    const cerca = opacidadPorDistancia(310, banda)
    expect(cerca).toBeGreaterThan(0)
    expect(cerca).toBeLessThan(1)
    expect(opacidadPorDistancia(3550, banda)).toBeLessThan(1)
  })
})

/** Contexto 2D falso: registra lo que se escribe. */
function lienzoFalso() {
  const escritos = []
  let limpiezas = 0
  let rotacion = 0
  const ctx = {
    font: '', globalAlpha: 1, lineWidth: 1, fillStyle: '', strokeStyle: '', textAlign: '', textBaseline: '', lineJoin: '',
    measureText: (s) => ({ width: s.length * 6 }),
    setTransform: () => { rotacion = 0 },
    clearRect: () => { limpiezas++ },
    save: () => {}, restore: () => { rotacion = 0 }, translate: () => {},
    rotate: (a) => { rotacion = a },
    strokeText: () => {},
    fillText: (s) => escritos.push({ s, rotacion }),
  }
  const lienzo = { width: 0, height: 0, getContext: () => ctx }
  return { lienzo, escritos, limpiezas: () => limpiezas }
}

/** Cámara mirando la plaza desde arriba a `dist` metros (como la de src/camara.js con pitch alto). */
function camaraArriba(dist) {
  const cam = new PerspectiveCamera(35, 800 / 600, 5, 60000)
  cam.position.set(0, dist, 0.001)
  cam.lookAt(0, 0, 0)
  cam.updateMatrixWorld()
  return cam
}

describe('rótulos sobre la vista', () => {
  const nombres = ['Avenida Urdaneta', 'Calle Larguísima De Nombre Interminable Que No Entra', 'Norte 4']
  const tramos = decodificarCalles(binario([
    [1000, 1000, 1, 0, 0, 200], // horizontal en la plaza
    [1000, 1400, 1, 0, 1, 25], // corto con nombre larguísimo: no entra
    [1600, 1000, 0, -1, 2, 200], // vertical, 300 m al este
  ]), nombres)
  const indice = indexarTramos(tramos, coords)
  const tamaño = () => ({ ancho: 800, alto: 600, dpr: 1 })

  test('dibuja las calles que entran, alineadas y legibles', () => {
    // Arrange
    const { lienzo, escritos } = lienzoFalso()
    const rotulos = crearRotulos({ lienzo, indice, tamaño })
    // Act
    const n = rotulos.dibujar({ camera: camaraArriba(800), dist: 800, x: 0, z: 0, opacidad: 1 })
    // Assert
    expect(n).toBe(2)
    expect(rotulos.cuantas).toBe(2)
    const porNombre = Object.fromEntries(escritos.map((e) => [e.s, e.rotacion]))
    expect(porNombre['Avenida Urdaneta']).toBeCloseTo(0, 2)
    expect(Math.abs(porNombre['Norte 4'])).toBeCloseTo(Math.PI / 2, 2)
    expect(porNombre[nombres[1]]).toBeUndefined()
  })

  test('con la cámara fuera de la banda de distancias no dibuja nada y limpia', () => {
    const { lienzo, escritos, limpiezas } = lienzoFalso()
    const rotulos = crearRotulos({ lienzo, indice, tamaño })
    expect(rotulos.dibujar({ camera: camaraArriba(8000), dist: 8000, x: 0, z: 0, opacidad: 1 })).toBe(0)
    expect(escritos).toEqual([])
    expect(limpiezas()).toBeGreaterThan(0)
  })

  test('con opacidad cero (lo de hoy apagado) limpia y no dibuja', () => {
    const { lienzo, escritos } = lienzoFalso()
    const rotulos = crearRotulos({ lienzo, indice, tamaño })
    rotulos.dibujar({ camera: camaraArriba(800), dist: 800, x: 0, z: 0, opacidad: 1 })
    escritos.length = 0
    expect(rotulos.dibujar({ camera: camaraArriba(800), dist: 800, x: 0, z: 0, opacidad: 0 })).toBe(0)
    expect(escritos).toEqual([])
    rotulos.limpiar()
    expect(rotulos.cuantas).toBe(0)
  })

  test('el lienzo toma el tamaño de la vista por el devicePixelRatio (máximo 2)', () => {
    const { lienzo } = lienzoFalso()
    const rotulos = crearRotulos({ lienzo, indice, tamaño: () => ({ ancho: 800, alto: 600, dpr: 3 }) })
    rotulos.dibujar({ camera: camaraArriba(800), dist: 800, x: 0, z: 0, opacidad: 1 })
    expect([lienzo.width, lienzo.height]).toEqual([1600, 1200])
  })

  test('no pasa del máximo de etiquetas por cuadro', () => {
    // Arrange: una cuadrícula densa de calles con nombres distintos
    const filas = []
    const muchos = []
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 12; j++) {
        muchos.push(`C${i}-${j}`)
        filas.push([200 + i * 90, 400 + j * 100, 1, 0, muchos.length - 1, 40])
      }
    }
    const denso = indexarTramos(decodificarCalles(binario(filas), muchos), coords)
    const { lienzo } = lienzoFalso()
    const rotulos = crearRotulos({ lienzo, indice: denso, tamaño: () => ({ ancho: 4000, alto: 3000, dpr: 1 }) })
    // Act
    const cam = camaraArriba(2000)
    cam.position.set(500, 2000, 0.001)
    cam.lookAt(500, 0, 0)
    cam.updateMatrixWorld()
    const n = rotulos.dibujar({ camera: cam, dist: 2000, x: 500, z: 0, opacidad: 1 })
    // Assert: entrarían varios cientos; se corta en el máximo
    expect(n).toBe(MAX_ETIQUETAS)
  })

  test('apoya la etiqueta en la altura del suelo', () => {
    const { lienzo } = lienzoFalso()
    const alturas = []
    const rotulos = crearRotulos({ lienzo, indice, tamaño, altura: (x, z) => { alturas.push([x, z]); return 0 } })
    rotulos.dibujar({ camera: camaraArriba(800), dist: 800, x: 0, z: 0, opacidad: 1 })
    expect(alturas.length).toBeGreaterThan(0)
  })
})

describe('carga de calles.bin + calles.json', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('baja los dos archivos y devuelve el índice', async () => {
    // Arrange
    const buf = binario([[1000, 1000, 1, 0, 0, 100]])
    vi.stubGlobal('fetch', async (url) => ({
      ok: true, status: 200,
      arrayBuffer: async () => buf,
      json: async () => (url.endsWith('.json') ? ['Avenida Urdaneta'] : null),
    }))
    // Act
    const indice = await cargarCalles('datos/', coords)
    // Assert
    expect(indice.cerca(0, 0, 10).map((t) => t.nombre)).toEqual(['Avenida Urdaneta'])
  })

  test('si falta un archivo, avisa cuál', async () => {
    vi.stubGlobal('fetch', async (url) => ({ ok: !url.endsWith('.bin'), status: 404, json: async () => [] }))
    await expect(cargarCalles('datos/', coords)).rejects.toThrow(/calles\.bin: 404/)
  })
})
