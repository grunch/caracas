import { expect, test } from 'vitest'
import { HITOS, construirHitos } from '../../src/hitos.js'
import { crearCoords } from '../../src/coords.js'

const hito = HITOS.find(h => h.id === 'miraflores')
const coords = crearCoords({ ancho: 18600, alto: 14800, metro: .5, plaza: [8968.2, 6839] })

test('Miraflores sustituye el palacio genérico desde 1911 en su ubicación del plano', () => {
  expect(hito.partes.map(p => p.tipo)).toEqual(['miraflores'])
  expect([hito.x, hito.y, hito.nace, hito.muere]).toEqual([7958, 6360, 4, 0])
})

test('el modelo integrado conserva vida, ancla, normales y colores finitos en una sola geometría', () => {
  const datos = construirHitos([hito], coords)
  const origen = coords.aMundo(hito.x, hito.y)
  expect(datos.rangos).toHaveLength(1)
  expect(datos.vidas.every((v, i) => v === (i % 2 ? 0 : 4))).toBe(true)
  for (const valores of [datos.posiciones, datos.normales, datos.colores]) expect(valores.every(Number.isFinite)).toBe(true)
  expect(datos.anclas.every((v, i) => Math.abs(v - (i % 2 ? origen.z : origen.x)) < .001)).toBe(true)
  expect(datos.posiciones.length / 3).toBeLessThan(600000)
})

test('los cuatro accesos y las marquesinas caben dentro de la zona que suprime casas', async () => {
  const { crearPalacio } = await import('../../src/hitos/miraflores-modelo.js')
  const { Box3 } = await import('three')
  const { palacio, cubiertas } = crearPalacio()
  const accesos = palacio.children.filter(o => o.userData.tipo === 'acceso')
  expect(accesos.map(o => o.name)).toEqual(['Acceso frontal izquierdo', 'Acceso frontal derecho', 'Acceso lateral posterior', 'Puerta Dorada'])
  expect(cubiertas.children.filter(o => o.name.startsWith('Marquesina '))).toHaveLength(4)
  const caja = new Box3().setFromObject(palacio)
  expect(caja.min.x).toBeGreaterThanOrEqual(-32)
  expect(caja.max.x).toBeLessThanOrEqual(32)
  expect(caja.min.z).toBeGreaterThanOrEqual(-28)
  expect(caja.max.z).toBeLessThanOrEqual(28)
  const geometrias = new Set(), materiales = new Set()
  palacio.traverse(o => { if (o.isMesh) { geometrias.add(o.geometry); materiales.add(o.material) } })
  geometrias.forEach(g => g.dispose())
  materiales.forEach(m => m.dispose())
})
