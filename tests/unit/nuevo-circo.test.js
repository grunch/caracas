import {describe,it,expect} from 'vitest'
import {HITOS,construirHitos} from '../../src/hitos.js'
import {crearCoords} from '../../src/coords.js'
import {zonasDeSupresion,suprimirTechos} from '../../src/hitos/suprimir.js'
import {rectanguloPx} from '../../src/hitos/datos/marco.js'
const coords=crearCoords({ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]})
describe('Nuevo Circo instalado',()=>{
 it('se registra desde 1936 sin duplicar fases y conserva el ruedo abierto',()=>{
  const h=HITOS.find(h=>h.id==='nuevo-circo')
  expect(h).toBeDefined();expect(h.nace).toBe(5);expect(h.muere).toBe(0);expect(h.partes).toHaveLength(1)
  const d=construirHitos([h],coords)
  expect(d.posiciones.length).toBeGreaterThan(0);expect([...d.posiciones].every(Number.isFinite)).toBe(true)
  for(let i=0;i<d.vidas.length;i+=2){expect(d.vidas[i]).toBe(5);expect(d.vidas[i+1]).toBe(0)}
  expect(d.indices.length/3).toBeLessThan(65000)
 })
 it('retira casas del solar solo desde 1936',()=>{
  const h=HITOS.find(h=>h.id==='nuevo-circo');expect(h).toBeDefined()
  const casa={vertices:new Float32Array(rectanguloPx(h,8,8).flat()),techos:new Uint32Array([0,4,1,0]),vida:new Uint32Array([1])}
  expect(suprimirTechos(casa,zonasDeSupresion([h]))[0]).toBe(1+8*5)
  expect(casa.vida[0]).toBe(1)
 })
})

import {rejillaDeCasas,choca} from '../../src/a-pie.js'
import {hitosConPlanta} from '../../src/hitos/plantas.js'
it('el ruedo es transitable y la reserva no borra vecinos fuera del solar',()=>{
 const h=HITOS.find(h=>h.id==='nuevo-circo'),vacio={vertices:new Float32Array(),techos:new Uint32Array()}
 const c=coords.aMundo(h.x,h.y),plantas=hitosConPlanta().filter(p=>p.id===h.id)
 expect(choca(rejillaDeCasas(vacio,5,coords.aMundo,plantas),c.x,c.z)).toBe(false)
 const fuera={vertices:new Float32Array(rectanguloPx(h,8,8,100,0).flat()),techos:new Uint32Array([0,4,1,0]),vida:new Uint32Array([1])}
 expect(suprimirTechos(fuera,zonasDeSupresion([h]))[0]).toBe(1)
 // La terraza queda dentro de la corona, no vacía las esquinas de una manzana.
 expect(Math.hypot(h.terraza.ancho/2,h.terraza.fondo/2)).toBeLessThan(44)
})
