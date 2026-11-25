import {describe,it,expect} from 'vitest'
import {cantidadPorDistancia,integrarManzanas1772,seleccionarManzanas1772} from '../../tools/manzanas-1772-lib.mjs'

describe('manzanas coloniales de 1772',()=>{
 it('gradiente fuera del entorno reducido y semillas reproducibles',()=>{
  for(const id of ['U1','U2','U3'])expect(cantidadPorDistancia(300,id)).toBeGreaterThan(cantidadPorDistancia(1000,id))
  expect(cantidadPorDistancia(100,'U1')).toBe(cantidadPorDistancia(100,'U1'))
  expect(new Set(Array.from({length:20},(_,i)=>cantidadPorDistancia(300,`U${i}`))).size).toBeGreaterThan(1)
 })
 it('aplica otro 40 % sobre las dos reducciones anteriores junto a Plaza Mayor',()=>{
  expect(cantidadPorDistancia(117,'U1772-0080')).toBe(8)
  expect(cantidadPorDistancia(166,'U1772-0205')).toBe(8)
  expect(cantidadPorDistancia(167,'U1772-0095')).toBe(9)
  expect(cantidadPorDistancia(253,'U1772-0079')).toBe(29)
 })
 it('selecciona unidades aprobadas, excluye plazas y reserva los hitos',()=>{
  const red={nodos:[{id:'a',mosaico:[0,0]},{id:'b',mosaico:[200,0]},{id:'c',mosaico:[200,200]},{id:'d',mosaico:[0,200]}]}
  const unidad={id:'U1',estado:'aprobada',ocupacion:'continua',nodos:['a','b','c','d']}
  const opciones={red,unidades:[unidad],plaza:[0,0],metro:.5,hitos:[]}
  const m=seleccionarManzanas1772(opciones);expect(m.manzanas).toHaveLength(1);expect(m.manzanas[0].poligono[0]).toEqual([6,6])
  expect(seleccionarManzanas1772({...opciones,unidades:[{...unidad,ocupacion:'plaza'}]}).manzanas).toHaveLength(0)
  expect(seleccionarManzanas1772({...opciones,hitos:[{nace:1,muere:0,planta:[[[50,50],[90,50],[90,90],[50,90]]]}]}).manzanas).toHaveLength(1)
 })
 it('reserva la planta de un hito activo cuando hitosConPlanta le da suprime vacío',()=>{
  const red={nodos:[{id:'a',mosaico:[0,0]},{id:'b',mosaico:[200,0]},{id:'c',mosaico:[200,200]},{id:'d',mosaico:[0,200]}]}
  const unidad={id:'U1',estado:'aprobada',ocupacion:'continua',nodos:['a','b','c','d']}
  const hito={id:'h',nace:1,muere:0,planta:[[[50,50],[90,50],[90,90],[50,90]]],suprime:[]}
  expect(seleccionarManzanas1772({red,unidades:[unidad],plaza:[0,0],metro:.5,hitos:[hito]}).manzanas[0].reservas).toEqual([{id:'h',poligono:hito.planta[0]}])
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

it('integra conjuntos especiales con hitos, pero nunca rellena la plaza',()=>{
 const red={nodos:[{id:'a',mosaico:[0,0]},{id:'b',mosaico:[200,0]},{id:'c',mosaico:[200,200]},{id:'d',mosaico:[0,200]}]}
 const unidad={id:'U1',estado:'aprobada',ocupacion:'conjunto_especial',nodos:['a','b','c','d']}
 const hito={id:'palacio',nace:1,planta:[[[10,10],[70,10],[70,70],[10,70]]]}
 const o={red,unidades:[unidad],plaza:[0,0],metro:.5,hitos:[hito]}
 expect(seleccionarManzanas1772(o).manzanas).toHaveLength(1)
 expect(seleccionarManzanas1772({...o,unidades:[{...unidad,ocupacion:'plaza'}]}).manzanas).toHaveLength(0)
 expect(seleccionarManzanas1772({...o,hitos:[{...hito,nace:3}]}).manzanas).toHaveLength(0)
})
it('reparcela junto a un edificio sin invadir su planta ni moverlo',async()=>{
 const {casasDeManzana}=await import('../../tools/manzanas-1772-lib.mjs')
 const {recortarConvexo,areaConSigno}=await import('../../src/poligono.js')
 const reserva={id:'palacio',poligono:[[0,0],[80,0],[80,100],[0,100]]}
 const m={id:'reserva',poligono:[[0,0],[200,0],[200,200],[0,200]],cantidadCasas:9,distancia:100,reservas:[reserva]}
 const antes=structuredClone(m),casas=casasDeManzana(m,{metro:.5})
 expect(casas.length).toBeGreaterThan(0);expect(m).toEqual(antes)
 for(const c of casas)expect(Math.abs(areaConSigno(recortarConvexo(c.huella,reserva.poligono)))).toBeLessThan(.01)
 expect(casas.some(c=>c.huella.some(p=>Math.abs(p[0]-80)<.01||Math.abs(p[1]-100)<.01))).toBe(true)
})
it('los tejados nativos de una cuadra oblicua tampoco invaden dos reservas',async()=>{
 const {areaConSigno,recortarConvexo}=await import('../../src/poligono.js')
 const {partesDeCiudad}=await import('../../tools/empacar-lib.mjs')
 const {crearCoords}=await import('../../src/coords.js')
 const {extruirTechos}=await import('../../src/ciudad.js')
 const reservas=[{id:'iglesia',poligono:[[0,0],[80,8],[90,100],[10,92]]},{id:'palacio',poligono:[[130,140],[240,150],[250,250],[140,240]]}]
 const m={id:'oblicua-reservada',poligono:[[0,0],[240,20],[260,260],[30,240]],cantidadCasas:20,distancia:100,reservas}
 const {ciudad,informe}=integrarManzanas1772({vertices:[],techos:[],vida:[],historia:[],vuelos:[],marcos:[],alas:[]},[m],{metro:.5})
 expect(informe.casasNuevas).toBeGreaterThan(0)
 const datos=Object.fromEntries(Object.entries(partesDeCiudad(ciudad)).map(([k,v])=>[k,v.datos]))
 const coords=crearCoords({ancho:1000,alto:1000,metro:.5,plaza:[0,0]}),g=extruirTechos(datos,coords)
 for(let i=0;i<g.indices.length;i+=3){
  const p=Array.from(g.indices.slice(i,i+3),k=>{const q=coords.aPixel(g.posiciones[k*3],g.posiciones[k*3+2]);return[q.px,q.py]})
  for(const r of reservas)expect(Math.abs(areaConSigno(recortarConvexo(p,r.poligono)))).toBeLessThan(.02)
 }
})
it('cobertura total: sustituye también una casa previa sin correspondencia aprobada',()=>{
 const datos={vertices:[300,300,320,300,320,320,300,320],techos:[[0,4,1,0,123]],vida:[[0,0]],historia:[[16,16,17,18,19,20]],vuelos:[0],marcos:[],alas:[]}
 const {ciudad}=integrarManzanas1772(datos,[],{metro:.5,reemplazarTodo:true})
 expect(ciudad.vida.some(v=>v[0]<=1&&(!v[1]||v[1]>1))).toBe(false)
 expect(ciudad.vida).toEqual([[0,1],[2,0]])
})
it('cobertura total incluye unidades parciales y pendientes con contorno, pero no plazas',()=>{
 const red={nodos:[{id:'a',mosaico:[0,0]},{id:'b',mosaico:[200,0]},{id:'c',mosaico:[200,200]},{id:'d',mosaico:[0,200]}]}
 const u={id:'U',estado:'pendiente',ocupacion:'parcial',nodos:['a','b','c','d']}
 expect(seleccionarManzanas1772({red,unidades:[u],plaza:[0,0],metro:.5,todas:true}).manzanas).toHaveLength(1)
})

it('conserva todos los vértices de un solar irregular recortado',()=>{
 const c={huella:[[0,0],[40,0],[40,20],[20,20],[20,40],[0,40]],paleta:1,pisos:1,semilla:1,marco:[0,0,1,0,40,40,0,5],alas:[[2,0,0,40,5]]}
 const {ciudad}=integrarManzanas1772({vertices:[],techos:[],vida:[],historia:[],marcos:[],alas:[]},[{id:'irregular',casas:[c]}],{reemplazarTodo:true})
 expect(ciudad.techos[0][1]).toBe(6)
 expect(ciudad.vertices).toEqual(c.huella.flat())
})
