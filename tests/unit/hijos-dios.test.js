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
it('el recinto sigue la ladera en cada vértice, sin enterrar su campo occidental',()=>{
 const d=construirHitos([h()],coords)
 for(let i=0;i<d.posiciones.length/3;i++){
  expect(d.anclas[i*4]).toBeCloseTo(d.posiciones[i*3],3)
  expect(d.anclas[i*4+1]).toBeCloseTo(d.posiciones[i*3+2],3)
 }
})
it('la subdivisión conserva área y limita las caras del suelo a cuatro metros',async()=>{
 const {subdividirRecinto}=await import('../../src/hitos/hijos-dios.js')
 const {BufferGeometry,Float32BufferAttribute,Vector3}=await import('three')
 const g=new BufferGeometry().setAttribute('position',new Float32BufferAttribute([0,.12,0,10,.12,0,0,.12,10],3));g.computeVertexNormals()
 const sub=subdividirRecinto(g),p=sub.attributes.position;let area=0
 for(let i=0;i<p.count;i+=3){
  const [a,b,c]=[0,1,2].map(k=>new Vector3().fromBufferAttribute(p,i+k))
  expect(Math.max(a.distanceTo(b),b.distanceTo(c),c.distanceTo(a))).toBeLessThanOrEqual(4.00001)
  area+=b.clone().sub(a).cross(c.clone().sub(a)).length()/2
 }
 expect(area).toBeCloseTo(50,4);sub.dispose();g.dispose()
})
