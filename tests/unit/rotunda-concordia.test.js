import {it,expect} from 'vitest'
import {HITOS,construirHitos,validarHitos} from '../../src/hitos.js'
import {crearCoords} from '../../src/coords.js'
import {zonasDeSupresion,puntoEnPoligono} from '../../src/hitos/suprimir.js'
import {hitosConPlanta} from '../../src/hitos/plantas.js'
import {rejillaDeCasas,choca} from '../../src/a-pie.js'
const plano={ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]},coords=crearCoords(plano)
const h=id=>HITOS.find(h=>h.id===id)
it('cárcel, solar de1936 y plaza de1946 tienen vidas excluyentes',()=>{
 for(const [id,nace,muere] of [['rotunda',3,5],['solar-rotunda',5,6],['concordia',6,0]]){
  const v=h(id);expect(v).toBeDefined();expect([v.nace,v.muere]).toEqual([nace,muere]);expect(validarHitos([v],plano)).toEqual([])
  const d=construirHitos([v],coords);expect(d.posiciones.every(Number.isFinite)).toBe(true)
  for(let i=0;i<d.vidas.length;i+=2)expect([...d.vidas.slice(i,i+2)]).toEqual([nace,muere])
 }
})
it('la cárcel no reserva el cuartel norte ni el inmueble oriental; la plaza sí ocupa la franja norte en1946',()=>{
 const tiene=(id,p)=>zonasDeSupresion([h(id)]).some(z=>puntoEnPoligono(p,z.poligono))
 expect(tiene('rotunda',[8588,8504])).toBe(true)
 expect(tiene('rotunda',[8620,8380])).toBe(false)
 expect(tiene('concordia',[8620,8380])).toBe(true)
 for(const id of ['rotunda','solar-rotunda','concordia'])expect(tiene(id,[8730,8500])).toBe(false)
})
it('el solar de1936 y los paseos de1946 son transitables; el templete y la cárcel colisionan',()=>{
 const vacio={vertices:[],techos:[]},plantas=hitosConPlanta()
 const a=coords.aMundo(8588,8504),templo=coords.aMundo(8602,8465)
 for(const e of [3,4])expect(choca(rejillaDeCasas(vacio,e,coords.aMundo,plantas),a.x,a.z)).toBe(true)
 expect(choca(rejillaDeCasas(vacio,5,coords.aMundo,plantas),a.x,a.z)).toBe(false)
 expect(choca(rejillaDeCasas(vacio,6,coords.aMundo,plantas),templo.x,templo.z)).toBe(true)
 const paseo=coords.aMundo(8558,8510);expect(choca(rejillaDeCasas(vacio,6,coords.aMundo,plantas),paseo.x,paseo.z)).toBe(false)
})
