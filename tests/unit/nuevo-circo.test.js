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
 expect(plantas).toHaveLength(1)
 const rejilla=rejillaDeCasas(vacio,5,coords.aMundo,plantas)
 expect(choca(rejilla,c.x,c.z)).toBe(false)
 const sector=plantas[0].planta[0]
 const centro=sector.reduce((a,p)=>[a[0]+p[0]/sector.length,a[1]+p[1]/sector.length],[0,0])
 const pared=coords.aMundo(...centro)
 expect(choca(rejilla,pared.x,pared.z)).toBe(true)
 const fuera={vertices:new Float32Array(rectanguloPx(h,8,8,100,0).flat()),techos:new Uint32Array([0,4,1,0]),vida:new Uint32Array([1])}
 expect(suprimirTechos(fuera,zonasDeSupresion([h]))[0]).toBe(1)
 // La terraza incluye los accesos, pero no se convierte en reserva rectangular.
 expect(h.terraza).toEqual({ancho:88,fondo:93});expect(h.suprime).toHaveLength(2)
})

it('la terraza cubre la portada completa y el pavimento coincide con ella',async()=>{
 const h=HITOS.find(h=>h.id==='nuevo-circo'),n=Math.hypot(...h.eje),[ux,uy]=h.eje.map(v=>v/n)
 for(const [x,y] of h.suprime[1]){
  const a=((x-h.x)*ux+(y-h.y)*uy)*.5,b=(-(x-h.x)*uy+(y-h.y)*ux)*.5
  expect(Math.abs(a)).toBeLessThanOrEqual(h.terraza.ancho/2+1e-8)
  expect(Math.abs(b)).toBeLessThanOrEqual(h.terraza.fondo/2+1e-8)
 }
 const {crearNuevoCirco}=await import('../../src/hitos/nuevo-circo-modelo.js')
 const {Box3}=await import('three'),{edificio}=crearNuevoCirco()
 // El pavimento es la única malla con este material del taller.
 let pavimento;edificio.traverse(o=>{if(o.isMesh&&o.material.color.getHex()===0xc7b99a)pavimento=o})
 expect(pavimento).toBeDefined();edificio.updateMatrixWorld(true)
 const caja=new Box3().setFromObject(pavimento)
 expect(caja.max.x-caja.min.x).toBeCloseTo(h.terraza.ancho,4)
 expect(caja.max.z-caja.min.z).toBeCloseTo(h.terraza.fondo,4)
 edificio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}})
})
