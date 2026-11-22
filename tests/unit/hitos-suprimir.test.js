import { describe, test, expect } from 'vitest'
import { puntoEnPoligono, seSolapan, suprimirTechos, zonasDeSupresion, vidaSinHito, NUNCA } from '../../src/hitos/suprimir.js'
import { SIN_LINEA_DE_TIEMPO } from '../../src/epocas.js'

const cuadrado = (x, y, lado) => [[x, y], [x + lado, y], [x + lado, y + lado], [x, y + lado]]

/** vivoEn del shader (src/shader/epocas.js), en JS: cuánto está en pie una vida empacada en la época e. */
function vivoEn(vida, e) {
  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
  const [nace, muere] = [vida % 8, Math.floor(vida / 8)]
  const nacio = suave(nace - 0.5, nace, e)
  return muere < 0.5 ? nacio : nacio * (1 - suave(muere - 0.5, muere, e))
}

/** Un techo por anillo: vertices planos y techos de a 4 (inicio, cuántos, empacado, semilla). */
function ciudadDe(anillos, vida = null) {
  const vertices = anillos.flat(2)
  let inicio = 0
  const techos = anillos.flatMap((a) => { const t = [inicio, a.length, 1, 0]; inicio += a.length; return t })
  return { vertices: new Float32Array(vertices), techos: new Uint32Array(techos), vida: vida && new Uint32Array(vida) }
}

describe('puntoEnPoligono', () => {
  test('distingue adentro de afuera, también en un polígono cóncavo', () => {
    const ele = [[0, 0], [10, 0], [10, 4], [4, 4], [4, 10], [0, 10]]
    expect(puntoEnPoligono([2, 8], ele)).toBe(true)
    expect(puntoEnPoligono([8, 2], ele)).toBe(true)
    expect(puntoEnPoligono([8, 8], ele)).toBe(false)
    expect(puntoEnPoligono([-1, 5], ele)).toBe(false)
  })
})

describe('seSolapan', () => {
  test('se pisan si uno contiene un vértice del otro', () => {
    expect(seSolapan(cuadrado(0, 0, 10), cuadrado(8, 8, 10))).toBe(true)
  })
  test('se pisan en cruz, sin vértices adentro', () => {
    expect(seSolapan([[4, -5], [6, -5], [6, 15], [4, 15]], [[-5, 4], [15, 4], [15, 6], [-5, 6]])).toBe(true)
  })
  test('uno dentro del otro también cuenta', () => {
    expect(seSolapan(cuadrado(0, 0, 100), cuadrado(40, 40, 5))).toBe(true)
    expect(seSolapan(cuadrado(40, 40, 5), cuadrado(0, 0, 100))).toBe(true)
  })
  test('calcados uno sobre el otro (mismos vértices) se pisan', () => {
    const triangulo = [[100, 100], [110, 110], [90, 110]]
    expect(seSolapan(triangulo, triangulo.map((v) => [...v]))).toBe(true)
  })
  test('una huella cóncava no pisa lo que cae en su hueco, aunque su centro quede ahí', () => {
    const ce = [[0, 0], [10, 0], [10, 2], [2, 2], [2, 8], [10, 8], [10, 10], [0, 10]]
    const enElHueco = [[5, 4], [6, 4], [6, 6], [5, 6]]
    expect(seSolapan(ce, enElHueco)).toBe(false)
    expect(seSolapan(enElHueco, ce)).toBe(false)
  })
  test('separados no se pisan', () => {
    expect(seSolapan(cuadrado(0, 0, 10), cuadrado(11, 0, 10))).toBe(false)
  })
})

describe('vidaSinHito', () => {
  test('hito de siempre (desde 0): la casa no nace nunca', () => {
    expect(vidaSinHito(0, 0, 0)).toBe(NUNCA)
    expect(vidaSinHito(2 + 8 * 4, 0, 0)).toBe(NUNCA)
  })
  test('la casa que estaba antes del hito vive hasta que el hito nace', () => {
    expect(vidaSinHito(1, 3, 0)).toBe(1 + 8 * 3)
    // y si ya moría antes, conserva su muerte
    expect(vidaSinHito(1 + 8 * 2, 3, 0)).toBe(1 + 8 * 2)
  })
  test('la casa que nace con el hito en pie espera a que el hito se vaya', () => {
    expect(vidaSinHito(2, 1, 3)).toBe(3)
    expect(vidaSinHito(4, 1, 3)).toBe(4)
  })
  test('si para cuando el hito se va la casa ya habría muerto, no nace nunca', () => {
    expect(vidaSinHito(1 + 8 * 3, 1, 3)).toBe(NUNCA)
  })
})

describe('NUNCA', () => {
  test('no está en pie en ninguna época, tampoco sin línea de tiempo (época 99)', () => {
    for (const e of [0, 1, 2, 3, 4, 5, SIN_LINEA_DE_TIEMPO]) expect(vivoEn(NUNCA, e)).toBe(0)
  })
  test('sin línea de tiempo se ve la ciudad final: la casa que el hito reemplazó no está, la que vuelve cuando el hito se va, sí', () => {
    expect(vivoEn(vidaSinHito(1, 3, 0), SIN_LINEA_DE_TIEMPO)).toBe(0)
    expect(vivoEn(vidaSinHito(2, 1, 3), SIN_LINEA_DE_TIEMPO)).toBe(1)
  })
})

describe('suprimirTechos', () => {
  const zona = { poligono: cuadrado(100, 100, 50), desde: 0, hasta: 0 }

  test('apaga solo los techos que pisan la zona y no toca el array original', () => {
    // Arrange
    const ciudad = ciudadDe([cuadrado(110, 110, 10), cuadrado(300, 300, 10), cuadrado(145, 145, 10)], [0, 0, 2])
    // Act
    const vida = suprimirTechos(ciudad, [zona])
    // Assert
    expect([...vida]).toEqual([NUNCA, 0, NUNCA])
    expect([...ciudad.vida]).toEqual([0, 0, 2])
  })

  test('sin el array de vida (ciudad de demostración) todos vivían siempre', () => {
    const vida = suprimirTechos(ciudadDe([cuadrado(110, 110, 10), cuadrado(300, 300, 10)]), [zona])
    expect([...vida]).toEqual([NUNCA, 0])
  })

  test('sin zonas devuelve una copia igual', () => {
    const ciudad = ciudadDe([cuadrado(110, 110, 10)], [3])
    const vida = suprimirTechos(ciudad, [])
    expect([...vida]).toEqual([3])
    expect(vida).not.toBe(ciudad.vida)
  })

  test('un hito que nace tarde deja vivir a la casa hasta entonces', () => {
    const vida = suprimirTechos(ciudadDe([cuadrado(110, 110, 10)], [1]), [{ ...zona, desde: 3 }])
    expect([...vida]).toEqual([1 + 8 * 3])
  })
})

describe('zonasDeSupresion', () => {
  test('junta los polígonos de cada hito con sus épocas', () => {
    const zonas = zonasDeSupresion([
      { nace: 1, muere: 0, suprime: [cuadrado(0, 0, 5), cuadrado(9, 9, 5)] },
      { nace: 3, muere: 5, suprime: [cuadrado(20, 20, 5)] },
      { nace: 0 },
    ])
    expect(zonas.map((z) => [z.desde, z.hasta])).toEqual([[1, 0], [1, 0], [3, 5]])
    expect(zonas[2].poligono).toEqual(cuadrado(20, 20, 5))
  })
})

describe('los solares junto a un hito no borran fachadas', () => {
  const casaConSolar = () => ({
    vertices: new Float32Array([0,0,10,0,10,40,0,40]),
    techos: new Uint32Array([0,4,1,3]), vida: new Uint32Array([1]),
    marcos: new Float32Array([0,0,0,1,0,10,40,0,8,0,2]),
    alas: new Float32Array([2,0,0,10,8, 1,0,8,10,40]),
    historia: new Uint8Array([16,16,16,16,16,16]),
  })
  test('conserva la casa si solo su solar toca el monumento', () => {
    const vida = suprimirTechos(casaConSolar(), [{ poligono: cuadrado(2,30,5), desde:1, hasta:0 }])
    expect([...vida]).toEqual([1])
  })
  test('sigue suprimiendo una crujía que invade el monumento', () => {
    const vida = suprimirTechos(casaConSolar(), [{ poligono: cuadrado(2,2,5), desde:1, hasta:0 }])
    expect([...vida]).toEqual([NUNCA])
  })
  test('si después se construye sobre el solar, suprime desde esa época', () => {
    const ciudad = casaConSolar()
    ciudad.historia[4] = ciudad.historia[5] = 4 + 16 * 3
    const vida = suprimirTechos(ciudad, [{ poligono: cuadrado(2,30,5), desde:1, hasta:0 }])
    expect([...vida]).toEqual([1 + 8 * 4])
  })
})

describe('suprimirTechos: solo lo que el hito pisa de verdad (sin vacíos artificiales)', () => {
  const zonas = [{ poligono: cuadrado(100, 100, 40), desde: 1, hasta: 0 }]
  test('una casa que apenas roza la zona del hito sigue en pie', () => {
    const roza = cuadrado(90, 100, 20)          // un cuarto adentro de la zona: no
    const casi = [[60, 100], [104, 100], [104, 120], [60, 120]]   // menos del 10 % adentro
    const vida = suprimirTechos(ciudadDe([casi, roza], [1, 1]), zonas)
    expect(vida[0]).toBe(1)
  })
  test('una casa con buena parte bajo el hito se suprime mientras él está en pie', () => {
    const mitad = cuadrado(120, 100, 20)        // entera adentro
    const vida = suprimirTechos(ciudadDe([mitad], [1]), zonas)
    expect(vida[0]).not.toBe(1)
  })
})
