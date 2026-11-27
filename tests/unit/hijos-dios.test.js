import {it,expect} from 'vitest'
import {HITOS,construirHitos,validarHitos} from '../../src/hitos.js'
import {crearCoords} from '../../src/coords.js'
import {zonasDeSupresion,puntoEnPoligono} from '../../src/hitos/suprimir.js'
const plano={ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]},coords=crearCoords(plano)
const h=()=>HITOS.find(h=>h.id==='hijos-de-dios')
it('el cementerio cerrado conserva su modelo de1889 a1946, sin adelantarlo a1843',()=>{
 expect(h()).toBeDefined();expect([h().nace,h().muere]).toEqual([3,0]);expect(validarHitos([h()],plano)).toEqual([])
 const d=construirHitos([h()],coords);expect(d.posiciones.length).toBeGreaterThan(0);expect(d.posiciones.every(Number.isFinite)).toBe(true)
 for(let i=0;i<d.vidas.length;i+=2)expect([...d.vidas.slice(i,i+2)]).toEqual([3,0])
})
it('la reserva sigue los tres campos y excluye entrante, calle y seminario',()=>{
 expect(h()).toBeDefined();const z=zonasDeSupresion([h()]);const dentro=p=>z.some(s=>puntoEnPoligono(p,s.poligono))
 for(const p of [[8530,3640],[8635,3680],[8730,3730]])expect(dentro(p)).toBe(true)
 for(const p of [[8778,3680],[8620,3780],[8570,3870],[8520,3530]])expect(dentro(p)).toBe(false)
})
it('la marca enlaza con el modelo existente en lugar de conservar una posición aislada',async()=>{
 const {MARCAS}=await import('../../src/marcas-datos.js');const m=MARCAS.find(m=>m.id==='hijos-de-dios')
 expect(m.hito).toBe('hijos-de-dios');expect(m.x).toBeUndefined();expect(m.y).toBeUndefined()
})
