import {it,expect} from 'vitest'
import {HITOS,construirHitos} from '../../src/hitos.js'
import {crearCoords} from '../../src/coords.js'
import {rejillaDeCasas,choca} from '../../src/a-pie.js'
import {hitosConPlanta} from '../../src/hitos/plantas.js'
import {zonasDeSupresion,suprimirTechos} from '../../src/hitos/suprimir.js'
import {rectanguloPx} from '../../src/hitos/datos/marco.js'
const coords=crearCoords({ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]})
const hito=()=>HITOS.find(h=>h.id==='circo-metropolitano')
it('el Metropolitano vive solo en 1911 y 1936 y no reemplaza al Nuevo Circo',()=>{
 const h=hito();expect(h).toBeDefined();expect([h.nace,h.muere]).toEqual([4,6])
 expect(HITOS.find(h=>h.id==='nuevo-circo')).toBeDefined()
 const d=construirHitos([h],coords)
 expect(d.indices.length).toBeGreaterThan(0);expect(d.indices.length/3).toBeLessThan(24000)
 expect([...d.posiciones].every(Number.isFinite)).toBe(true)
 for(let i=0;i<d.vidas.length;i+=2)expect([...d.vidas.slice(i,i+2)]).toEqual([4,6])
})
it('el ruedo se puede caminar pero las gradas colisionan solo durante su vida',()=>{
 const h=hito();expect(h).toBeDefined()
 const plantas=hitosConPlanta().filter(p=>p.id===h.id),vacio={vertices:new Float32Array(),techos:new Uint32Array()}
 expect(plantas).toHaveLength(1)
 const c=coords.aMundo(h.x,h.y),sector=h.planta[0]
 const p=sector.reduce((s,v)=>[s[0]+v[0]/4,s[1]+v[1]/4],[0,0]),pared=coords.aMundo(...p)
 for(const e of [1,2,3,4,5,6]){
  const r=rejillaDeCasas(vacio,e,coords.aMundo,plantas)
  expect(choca(r,c.x,c.z)).toBe(false)
  expect(choca(r,pared.x,pared.z)).toBe(e===4||e===5)
 }
})
it('reserva el solar sin borrar casas vecinas ni impedir casas nacidas después',()=>{
 const h=hito();expect(h).toBeDefined()
 const casa=(a,vida)=>({vertices:new Float32Array(rectanguloPx(h,4,4,a,0).flat()),techos:new Uint32Array([0,4,1,0]),vida:new Uint32Array([vida])})
 const z=zonasDeSupresion([h])
 expect(suprimirTechos(casa(0,1),z)[0]).toBe(1+8*4)
 expect(suprimirTechos(casa(0,6),z)[0]).toBe(6)
 expect(suprimirTechos(casa(65,1),z)[0]).toBe(1)
})
it('la arena queda sobre el pavimento para evitar superficies coplanares',async()=>{
 const {crearMetropolitano}=await import('../../src/hitos/metropolitano-modelo.js')
 const {Box3}=await import('three'),{edificio}=crearMetropolitano();edificio.updateMatrixWorld(true)
 let arena,suelo;edificio.traverse(o=>{if(!o.isMesh)return;const c=o.material.color.getHex();if(c===0xc4a67b)arena=new Box3().setFromObject(o);if(c===0xc7b99a)suelo=new Box3().setFromObject(o)})
 expect(arena.min.y).toBeGreaterThan(0);expect(arena.max.y-suelo.max.y).toBeGreaterThan(.04)
 edificio.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}})
})
