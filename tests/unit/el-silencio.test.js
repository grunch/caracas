import {describe,it,expect} from 'vitest'
import {conElSilencio,EPOCA_SILENCIO,planoBaseDe} from '../../src/el-silencio-epoca.js'
import {silencio} from '../../src/hitos/datos/el-silencio.js'
import {suprimirTechos,zonasDeSupresion} from '../../src/hitos/suprimir.js'
import {visibleEn} from '../../src/epocas.js'

describe('El Silencio georreferenciado',()=>{
 it('añade una época de 1946 sin cambiar índices ni metadatos originales',()=>{
  const originales=[1578,1772,1843,1889,1911,1936].map(año=>({año,corto:'plano original'}))
  const epocas=conElSilencio(originales)
  expect(epocas.slice(0,6)).toEqual(originales);expect(originales).toHaveLength(6)
  expect(epocas[EPOCA_SILENCIO]).toMatchObject({año:1946,base:1936,plano:'1950-archiveorg-plano-de-caracas-dcn'})
  expect(conElSilencio([{año:1772}])).toEqual([{año:1772}])
 })
 it('1946 abre su propio plano y las vistas parciales siguen usando la base',()=>{
  const originales=[1578,1772,1843,1889,1911,1936].map(año=>({año,titulo:`Plano de ${año}`,autor:`autor ${año}`,fuente:`fuente ${año}`}))
  const epocas=conElSilencio(originales)
  expect(planoBaseDe(epocas,epocas[EPOCA_SILENCIO])).toBe(epocas[EPOCA_SILENCIO])
  expect(planoBaseDe(epocas,epocas[2])).toBe(originales[2])
  expect(planoBaseDe([],{año:1945,base:1936,parcial:true})).toMatchObject({año:1936})
  expect(planoBaseDe(epocas,undefined)).toBeUndefined()
 })
 it('registra siete bloques y plazas, posteriores a1936',()=>{
  expect(silencio.filter(h=>h.id.startsWith('silencio-bloque-'))).toHaveLength(7)
  for(const h of silencio){expect(h.nace).toBe(6);expect(h.x).toBeGreaterThan(7400);expect(h.x).toBeLessThan(8250);expect(h.y).toBeGreaterThan(6900);expect(h.y).toBeLessThan(7900)}
 })
 it('retira las casas ocupadas únicamente desde1945 y conserva los vecinos',()=>{
  const h=silencio.find(h=>h.id==='silencio-bloque-7'),c=[h.x,h.y]
  const vertices=new Float32Array([c[0]-2,c[1]-2,c[0]+2,c[1]-2,c[0]+2,c[1]+2,c[0]-2,c[1]+2,9000,6000,9010,6000,9010,6010,9000,6010])
  const vida=suprimirTechos({vertices,techos:new Uint32Array([0,4,0,0,4,4,0,0]),vida:new Uint32Array([1,1])},zonasDeSupresion(silencio))
  expect(vida[0]).toBe(1+8*6);expect(vida[1]).toBe(1)
  for(let e=1;e<=5;e++)expect(visibleEn(vida[0]%8,Math.floor(vida[0]/8),e)).toBe(true)
  expect(visibleEn(1,6,6)).toBe(false)
 })
})

it('los edificios siguen las parcelas: sólo balcones y molduras sobresalen hasta1,5m',async()=>{
 const {PLANTAS_SILENCIO}=await import('../../src/hitos/datos/el-silencio-plantas.js')
 const {crearBloqueSilencio}=await import('../../src/hitos/el-silencio-modelo.js')
 const {puntoEnPoligono}=await import('../../src/hitos/suprimir.js')
 const distancia=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz)}
 const {Vector3}=await import('three');const v=new Vector3()
 for(const [id,plantas] of Object.entries(PLANTAS_SILENCIO)){
  const g=crearBloqueSilencio(plantas);g.updateMatrixWorld(true)
  const exterior=plantas.plantas[0].exterior
  let peor=0
  g.traverse(o=>{if(!o.isMesh)return;const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++){
   v.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);if(v.y<4)continue;const p=[v.x,v.z];if(puntoEnPoligono(p,exterior))continue;
   peor=Math.max(peor,Math.min(...exterior.map((a,i)=>distancia(p,a,exterior[(i+1)%exterior.length]))))
  }})
  expect(peor,`bloque ${id}`).toBeLessThan(1.5)
  const geos=new Set(),mats=new Set();g.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)mats.add(o.material)});geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose())
 }
},15000)

it('una sustitución de solar completo retira también la casa que cruza poco el borde',()=>{
 const d={vertices:new Float32Array([-9,1,1,1,1,9,-9,9]),techos:new Uint32Array([0,4,0,0]),vida:new Uint32Array([1])}
 const z={poligono:[[0,0],[10,0],[10,10],[0,10]],desde:6,hasta:0}
 expect(suprimirTechos(d,[z])[0]).toBe(1)
 expect(suprimirTechos(d,[{...z,solarCompleto:true}])[0]).toBe(49)
})

it('una sustitución de solar completo conserva la casa que solo toca el borde o un vértice del recinto',()=>{
 const z={poligono:[[0,0],[10,0],[10,10],[0,10]],desde:6,hasta:0,solarCompleto:true}
 const techo=(anillo)=>({vertices:new Float32Array(anillo.flat()),techos:new Uint32Array([0,anillo.length,0,0]),vida:new Uint32Array([1])})
 expect(suprimirTechos(techo([[-10,0],[0,0],[0,10],[-10,10]]),[z])[0]).toBe(1)
 expect(suprimirTechos(techo([[-10,-10],[0,-10],[0,0],[-10,0]]),[z])[0]).toBe(1)
 expect(suprimirTechos(techo([[0,0],[5,0],[5,10],[0,10]]),[z])[0]).toBe(49)
})
