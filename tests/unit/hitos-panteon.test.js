import { expect, test } from 'vitest'
import { HITOS, construirHitos, validarHitos, zonasDeSupresion, suprimirTechos } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'

const plano = { ancho: 18600, alto: 14800, metro: .5, plaza: [8968.2, 6839] }
const coords = crearCoords(plano)
const hito = HITOS.find(h => h.id === 'panteon')

test('La Trinidad nace en 1843 y cada reforma ocupa solo su época', () => {
  expect(hito.nace).toBe(2)
  expect(hito.partes.map(({ tipo, anio, nace, muere }) => [tipo, anio, nace, muere])).toEqual([
    ['panteon', 1843, 2, 3], ['panteon', 1889, 3, 4], ['panteon', 1911, 4, 5], ['panteon', 1936, 5, 0],
  ])
  expect(validarHitos([hito], plano)).toEqual([])
})

test('El lienzo conserva cuatro vidas disjuntas, fachada al sur y ancla común para el relieve', () => {
  const datos = construirHitos([hito], coords)
  expect(datos.indices.length / 3).toBeLessThan(55_000) // límite conjunto de las cuatro variantes
  const vidas = new Set(), alturas = new Map()
  const origen = coords.aMundo(hito.x, hito.y)
  const norma = Math.hypot(...hito.eje), [ex, ez] = hito.eje.map(v => v / norma)
  let minimo = Infinity, maximo = -Infinity, lateral = 0, errorAncla = 0
  for (let i = 0; i < datos.vidas.length / 2; i++) {
    const nace = datos.vidas[i * 2], muere = datos.vidas[i * 2 + 1]
    vidas.add(`${nace}:${muere}`)
    const x = datos.posiciones[i * 3] - origen.x, y = datos.posiciones[i * 3 + 1], z = datos.posiciones[i * 3 + 2] - origen.z
    alturas.set(nace, Math.max(alturas.get(nace) ?? 0, y))
    const a = x * ex + z * ez, b = -x * ez + z * ex
    minimo = Math.min(minimo, a); maximo = Math.max(maximo, a)
    lateral = Math.max(lateral, Math.abs(b))
    errorAncla = Math.max(errorAncla, Math.abs(datos.anclas[i * 4] - origen.x), Math.abs(datos.anclas[i * 4 + 1] - origen.z))
  }
  expect(minimo).toBeGreaterThanOrEqual(-5.01)
  expect(maximo).toBeLessThanOrEqual(57.01)
  expect(lateral).toBeLessThanOrEqual(13.01)
  expect(errorAncla).toBeLessThan(.001)
  expect([...vidas]).toEqual(['2:3', '3:4', '4:5', '5:0'])
  expect(alturas.get(2)).toBeLessThan(20)
  expect(alturas.get(3)).toBeGreaterThan(30)
  expect(alturas.get(5)).toBeGreaterThan(45)
  expect(minimo).toBeLessThan(-3) // escalera delante del origen, hacia el sur
  expect(maximo).toBeGreaterThan(54) // nave hacia el norte, no reflejada
  expect(datos.posiciones.every(Number.isFinite)).toBe(true)
  expect(datos.normales.every(Number.isFinite)).toBe(true)
})


test('La supresión quita casas del solar desde 1843 pero preserva las épocas anteriores', () => {
  const zonas = zonasDeSupresion([hito])
  expect(zonas[0]).toMatchObject({ desde: 2, hasta: 0 })
  const casa = { vertices: new Float32Array(hito.planta[0].flat()), techos: new Uint32Array([0, 4, 1, 0]), vida: new Uint32Array([1]) }
  expect([...suprimirTechos(casa, zonas)]).toEqual([1 + 8 * 2])
  expect([...casa.vida]).toEqual([1])
})
