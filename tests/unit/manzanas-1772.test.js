import {describe,it,expect} from 'vitest'
import {cantidadPorDistancia,integrarManzanas1772,seleccionarManzanas1772} from '../../tools/manzanas-1772-lib.mjs'

describe('manzanas coloniales de 1772',()=>{
 it('gradiente fuera del entorno reducido y semillas reproducibles',()=>{
  for(const id of ['U1','U2','U3'])expect(cantidadPorDistancia(300,id)).toBeGreaterThan(cantidadPorDistancia(1000,id))
  expect(cantidadPorDistancia(100,'U1')).toBe(cantidadPorDistancia(100,'U1'))
  expect(new Set(Array.from({length:20},(_,i)=>cantidadPorDistancia(300,`U${i}`))).size).toBeGreaterThan(1)
 })
 it('reduce un 30 % las casas del entorno inmediato de Plaza Mayor',()=>{
  expect(cantidadPorDistancia(117,'U1772-0080')).toBe(14)
  expect(cantidadPorDistancia(166,'U1772-0205')).toBe(14)
  expect(cantidadPorDistancia(167,'U1772-0095')).toBe(15)
  expect(cantidadPorDistancia(253,'U1772-0079')).toBe(29)
 })
 it('selecciona solo manzanas continuas aprobadas y respeta terrenos libres e hitos',()=>{
  const red={nodos:[{id:'a',mosaico:[0,0]},{id:'b',mosaico:[200,0]},{id:'c',mosaico:[200,200]},{id:'d',mosaico:[0,200]}]}
  const unidad={id:'U1',estado:'aprobada',ocupacion:'continua',nodos:['a','b','c','d']}
  const opciones={red,unidades:[unidad],plaza:[0,0],metro:.5,hitos:[]}
  const m=seleccionarManzanas1772(opciones);expect(m.manzanas).toHaveLength(1);expect(m.manzanas[0].poligono[0]).toEqual([6,6])
  expect(seleccionarManzanas1772({...opciones,unidades:[{...unidad,ocupacion:'plaza'}]}).manzanas).toHaveLength(0)
  expect(seleccionarManzanas1772({...opciones,hitos:[{nace:1,muere:0,planta:[[[50,50],[90,50],[90,90],[50,90]]]}]}).manzanas).toHaveLength(0)
 })
 it('reserva la planta de un hito activo cuando hitosConPlanta le da suprime vacío',()=>{
  const red={nodos:[{id:'a',mosaico:[0,0]},{id:'b',mosaico:[200,0]},{id:'c',mosaico:[200,200]},{id:'d',mosaico:[0,200]}]}
  const unidad={id:'U1',estado:'aprobada',ocupacion:'continua',nodos:['a','b','c','d']}
  const hito={id:'h',nace:1,muere:0,planta:[[[50,50],[90,50],[90,90],[50,90]]],suprime:[]}
  expect(seleccionarManzanas1772({red,unidades:[unidad],plaza:[0,0],metro:.5,hitos:[hito]}).manzanas).toHaveLength(0)
 })
 it('reemplaza solo 1772 sin mutar entradas ni perder la vida anterior y posterior',()=>{
  const datos={vertices:[10,10,30,10,30,30,10,30],techos:[[0,4,1,0,123]],vida:[[0,0]],historia:[[16,16,17,18,19,20]],vuelos:[0],marcos:[],alas:[]}
  const original=structuredClone(datos)
  const m={id:'U1',poligono:[[6,6],[194,6],[194,194],[6,194]],cantidadCasas:8,distancia:100}
  const {ciudad,informe}=integrarManzanas1772(datos,[m],{metro:.5})
  expect(datos).toEqual(original);expect(informe.casasNuevas).toBe(8)
  for(const e of [0,2,3,4,5]){const vivos=ciudad.vida.map((v,i)=>v[0]<=e&&(!v[1]||e<v[1])?i:-1).filter(i=>i>=0);expect(vivos).toHaveLength(1);expect(ciudad.historia[vivos[0]]).toEqual(original.historia[0])}
  expect(ciudad.vida.filter(v=>v[0]<=1&&(!v[1]||1<v[1]))).toHaveLength(8)
 })
})

it('árboles: el reemplazo conserva 1578 y 1843–1936',async()=>{
 const {arbolesParaManzanas}=await import('../../tools/manzanas-arboles-lib.mjs')
 const a={x:10,y:10,r:3,nace:0,muere:0},nuevo={x:20,y:20,r:2,nace:1,muere:2}
 const s=arbolesParaManzanas([a],[nuevo],[{poligono:[[0,0],[100,0],[100,100],[0,100]]}])
 for(const e of [0,2,3,4,5])expect(s.filter(v=>v.nace<=e&&(!v.muere||e<v.muere)).map(({x,y,r})=>[x,y,r])).toEqual([[10,10,3]])
 expect(s.filter(v=>v.nace<=1&&(!v.muere||1<v.muere))).toEqual([nuevo])
})
it('manzana oblicua: solares contenidos, fachadas orientadas y geometría nativa finita',async()=>{
 const {casasDeManzana}=await import('../../tools/manzanas-1772-lib.mjs')
 const {partesDeCiudad}=await import('../../tools/empacar-lib.mjs')
 const {crearCoords}=await import('../../src/coords.js')
 const {extruirTechos}=await import('../../src/ciudad.js')
 const {areaConSigno,recortarConvexo}=await import('../../src/poligono.js')
 const m={id:'oblicua',poligono:[[0,0],[240,20],[260,260],[30,240]],cantidadCasas:26,distancia:150}
 for(const c of casasDeManzana(m,{metro:.5}))expect(Math.abs(areaConSigno(recortarConvexo(c.huella,m.poligono)))).toBeCloseTo(Math.abs(areaConSigno(c.huella)),5)
 const base={vertices:[],techos:[],vida:[],historia:[],vuelos:[],marcos:[],alas:[]}
 const {ciudad}=integrarManzanas1772(base,[m],{metro:.5})
 const datos=Object.fromEntries(Object.entries(partesDeCiudad(ciudad)).map(([k,v])=>[k,v.datos]))
 const g=extruirTechos(datos,crearCoords({ancho:1000,alto:1000,metro:.5,plaza:[0,0]}))
 expect(g.posiciones.every(Number.isFinite)).toBe(true);expect(g.indices.length).toBeGreaterThan(0)
 for(let i=0;i<g.vidas.length;i+=2){expect(g.vidas[i]).toBe(1);expect(g.vidas[i+1]).toBe(2)}
 // Las bases de los muros (y = 0) caen dentro de la manzana oblicua una vez de vuelta en píxeles: el paso
 // al marco nativo no las saca del contorno. Los aleros quedan fuera de esta cuenta a propósito.
 const coords=crearCoords({ancho:1000,alto:1000,metro:.5,plaza:[0,0]})
 // Tolerancia de 1 cm: las posiciones son Float32 y una esquina sobre el lindero cae a milímetros de él.
 const TOLERANCIA_PX=.01/.5
 const dentro=([x,y])=>m.poligono.every((a,i)=>{const b=m.poligono[(i+1)%4];return ((b[0]-a[0])*(y-a[1])-(b[1]-a[1])*(x-a[0]))/Math.hypot(b[0]-a[0],b[1]-a[1])>=-TOLERANCIA_PX})
 let bases=0
 for(let i=0;i<g.posiciones.length;i+=3){
  if(Math.abs(g.posiciones[i+1])>1e-6)continue
  const {px,py}=coords.aPixel(g.posiciones[i],g.posiciones[i+2]);bases++
  expect(dentro([px,py]),`base (${px.toFixed(2)}, ${py.toFixed(2)})`).toBe(true)
 }
 expect(bases).toBeGreaterThan(0)
})
