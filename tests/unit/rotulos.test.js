import { describe, test, expect } from 'vitest'
import sharp from 'sharp'
import { achicarPorMaximo, generarRotulos, codificarRotulos, MARGEN_PX } from '../../tools/rotulos-lib.mjs'

/** Máscara de `ancho × alto` con 255 en los píxeles dados. */
function mascara(ancho, alto, prendidos) {
  const datos = new Uint8Array(ancho * alto)
  for (const [x, y] of prendidos) datos[y * ancho + x] = 255
  return { datos, ancho, alto }
}
const filas = ({ data, width, height }) => Array.from({ length: height }, (_, y) => Array.from(data.subarray(y * width, (y + 1) * width)))

describe('achicarPorMaximo', () => {
  test('una celda vale 255 si alguno de sus píxeles es rótulo: un trazo fino no se diluye', () => {
    // Arrange: 8×8 con un solo píxel prendido
    const m = mascara(8, 8, [[5, 2]])
    // Act
    const chica = achicarPorMaximo(m, 4)
    // Assert: celdas de 2×2; el píxel (5, 2) cae en la celda (2, 1)
    expect([chica.width, chica.height]).toEqual([4, 4])
    expect(filas(chica)).toEqual([[0, 0, 0, 0], [0, 0, 255, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
  })

  test('el lado mayor queda en `lado` y el otro guarda la proporción', () => {
    const chica = achicarPorMaximo(mascara(186, 148, []), 40)
    expect([chica.width, chica.height]).toEqual([40, 32])
  })

  test('si la máscara ya es más chica que `lado`, no se agranda', () => {
    const chica = achicarPorMaximo(mascara(6, 4, [[5, 3]]), 4096)
    expect([chica.width, chica.height]).toEqual([6, 4])
    expect(chica.data[3 * 6 + 5]).toBe(255)
  })

  test('no modifica la entrada', () => {
    const m = mascara(8, 8, [[0, 0]])
    const copia = Uint8Array.from(m.datos)
    achicarPorMaximo(m, 2)
    expect(m.datos).toEqual(copia)
  })

  test.each([
    ['datos que no alcanzan', { datos: new Uint8Array(10), ancho: 8, alto: 8 }, 4],
    ['un ancho que no es entero', { datos: new Uint8Array(64), ancho: 8.5, alto: 8 }, 4],
    ['un lado inválido', { datos: new Uint8Array(64), ancho: 8, alto: 8 }, 0],
  ])('rechaza %s', (_, m, lado) => {
    expect(() => achicarPorMaximo(m, lado)).toThrow(/rótulos/)
  })
})

describe('achicarPorMaximo con margen', () => {
  test('un rótulo al borde de su celda prende también la vecina: el borde difuminado de la tinta queda tapado', () => {
    // celdas de 8×8; el píxel (8, 12) está en la celda (1, 1), pegado a la celda (0, 1)
    const chica = achicarPorMaximo(mascara(32, 32, [[8, 12]]), 4, 2)
    expect(filas(chica)).toEqual([[0, 0, 0, 0], [255, 255, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
  })

  test('en el centro de su celda, el margen no la saca de ahí', () => {
    const chica = achicarPorMaximo(mascara(32, 32, [[20, 12]]), 4, 2)
    expect(filas(chica)).toEqual([[0, 0, 0, 0], [0, 0, 255, 0], [0, 0, 0, 0], [0, 0, 0, 0]])
  })

  test('en la esquina de la imagen el margen no se sale ni da la vuelta', () => {
    const chica = achicarPorMaximo(mascara(8, 8, [[0, 0], [7, 7]]), 4, 2)
    expect(filas(chica)).toEqual([[255, 255, 0, 0], [255, 255, 0, 0], [0, 0, 255, 255], [0, 0, 255, 255]])
  })

  test.each([[-1], [0.5]])('rechaza un margen inválido (%s)', (margen) => {
    expect(() => achicarPorMaximo(mascara(8, 8, []), 4, margen)).toThrow(/margen/)
  })
})

describe('generarRotulos y codificarRotulos', () => {
  test('la textura cubre el rótulo con su margen', () => {
    expect(MARGEN_PX).toBe(2)
    // celdas de 4×4; el píxel (8, 8) es la esquina de la celda (2, 2): con 2 px de margen toca las cuatro
    const t = generarRotulos(mascara(32, 32, [[8, 8]]), 8)
    expect([t.width, t.height]).toEqual([8, 8])
    const prendidas = filas(t).flatMap((fila, y) => fila.flatMap((v, x) => (v ? [[x, y]] : [])))
    expect(prendidas).toEqual([[1, 1], [2, 1], [1, 2], [2, 2]])
  })

  test('el WebP es sin pérdida: vuelve exactamente la misma cobertura', async () => {
    const t = generarRotulos(mascara(32, 32, [[5, 6], [25, 18]]), 8)
    const webp = await codificarRotulos(t)
    const { data, info } = await sharp(webp).extractChannel(0).raw().toBuffer({ resolveWithObject: true })
    expect([info.width, info.height]).toEqual([8, 8])
    expect(Array.from(data)).toEqual(Array.from(t.data))
  })
})
