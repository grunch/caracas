import {describe,it,expect} from 'vitest'
import {paraMedir,separarRetiradas,casaEnZonas,zonasSinArboles,resumenDeRetiradas,tablaMd} from '../../tools/hitos-manzanas-lib.mjs'
import {integrarManzanasEpoca} from '../../tools/manzanas-1843-lib.mjs'
import {arbolesParaManzanas} from '../../tools/manzanas-arboles-lib.mjs'

const cuadro=(x,y,l=100)=>[[x,y],[x+l,y],[x+l,y+l],[x,y+l]]
const manzana=(id,x,y,extra={})=>({id,poligono:cuadro(x,y),limite:cuadro(x,y),huecos:[],areaM2:2500,casas:[{huella:cuadro(x,y,10)}],arboles:[{x:x+50,y:y+50,r:2}],reservas:[],...extra})

describe('la regla «ningún hito sobre una manzana» en el pipeline (specs/13, R13)',()=>{
 it('a medir solo viaja el contorno de cada manzana',()=>{
  // Arrange
  const m=manzana('A',0,0)
  // Act
  const [ligera]=paraMedir([m])
  // Assert
  expect(ligera).toEqual({id:'A',poligono:m.poligono,limite:m.limite,huecos:[]})
 })
 it('separa las manzanas que se retiran de las que quedan, sin tocar la entrada',()=>{
  const ms=[manzana('A',0,0),manzana('B',200,0),manzana('C',400,0)],antes=structuredClone(ms)
  const decisiones=[{id:'A',retirar:false,ocupacion:0,hitos:[]},
   {id:'B',retirar:true,ocupacion:.82,motivo:'ocupa la mayor parte',hitos:[{hito:'hospital-vargas',clase:'grande'}]},
   {id:'C',retirar:false,ocupacion:.2,hitos:[{hito:'catedral',clase:'chico'}]}]
  const {quedan,retiradas}=separarRetiradas(ms,decisiones,5)
  expect(ms).toEqual(antes)
  expect(quedan).toEqual([ms[0],ms[2]])
  expect(retiradas).toEqual([{id:'B',poligono:ms[1].poligono,limite:ms[1].limite,huecos:[],areaM2:2500,epoca:5,
   ocupacion:.82,motivo:'ocupa la mayor parte',hitos:['hospital-vargas']}])
 })
 it('una decisión que no corresponde a la manzana es un error, no un descarte callado',()=>{
  expect(()=>separarRetiradas([manzana('A',0,0)],[{id:'Z',retirar:true,hitos:[]}],5)).toThrow(/A/)
  expect(()=>separarRetiradas([manzana('A',0,0)],[],5)).toThrow(/decisiones/)
 })
 it('una casa está en una zona retirada si la mayor parte de ella cae dentro, aunque comparta el borde',()=>{
  const zonas=[{limite:cuadro(0,0),huecos:[cuadro(40,40,20)]},{poligono:cuadro(500,500)}]
  expect(casaEnZonas(cuadro(0,0,30),zonas)).toBe(true) // esquina de la manzana: dos lados sobre el límite
  expect(casaEnZonas(cuadro(90,0,30),zonas)).toBe(false) // solo un tercio adentro
  expect(casaEnZonas(cuadro(42,42,10),zonas)).toBe(false) // en el hueco
  expect(casaEnZonas(cuadro(520,520,10),zonas)).toBe(true) // sin límite vale el cuadro del plan
  expect(casaEnZonas(cuadro(300,300,10),zonas)).toBe(false)
  expect(casaEnZonas(cuadro(0,0,30),[])).toBe(false)
 })
 it('las casas heredadas de una manzana retirada no pasan a la época; las demás sí',()=>{
  // Arrange: dos casas generadas en 1889 (época 3) que terminan en 1911; el hito nace en 1911 sobre la primera
  const d={vertices:[...cuadro(0,0,20).flat(),...cuadro(300,0,20).flat()],techos:[[0,4,1,0,1],[4,4,1,0,2]],vida:[[3,4],[3,4]],
   historia:[Array(6).fill(16),Array(6).fill(16)],paletas:[5,5],vuelos:[0,0],marcos:[],alas:[]}
  const antes=structuredClone(d)
  // Act
  const {ciudad,informe}=integrarManzanasEpoca(d,[],4,{retiradas:[{limite:cuadro(0,0),huecos:[]}]})
  // Assert
  expect(d).toEqual(antes)
  expect(ciudad.vida).toEqual([[3,4],[3,5]])
  expect(informe.casasHeredadas).toBe(1)
  expect(informe.casasRetiradasPorHito).toBe(1)
 })
 it('sin manzanas retiradas hereda como siempre',()=>{
  const d={vertices:cuadro(0,0,20).flat(),techos:[[0,4,1,0,1]],vida:[[3,4]],historia:[Array(6).fill(16)],paletas:[5],vuelos:[0],marcos:[],alas:[]}
  const {ciudad,informe}=integrarManzanasEpoca(d,[],4)
  expect(ciudad.vida).toEqual([[3,5]])
  expect(informe.casasRetiradasPorHito).toBe(0)
 })
 it('la zona de una manzana retirada queda sin árboles en esa época y los conserva en las demás',()=>{
  const viejo={x:50,y:50,r:2,nace:3,muere:0},afuera={x:900,y:900,r:2,nace:3,muere:0}
  const zonas=zonasSinArboles([{id:'B',limite:cuadro(0,0),huecos:[]}])
  const r=arbolesParaManzanas([viejo,afuera],[],zonas,{epoca:5})
  const vivosEn=e=>r.filter(a=>a.nace<=e&&(!a.muere||e<a.muere)).map(a=>[a.x,a.y])
  expect(zonas).toEqual([{id:'B',limite:cuadro(0,0),huecos:[],arboles:[]}])
  expect(vivosEn(5)).toEqual([[900,900]])
  expect(vivosEn(4)).toEqual([[50,50],[900,900]])
  expect(vivosEn(6).sort()).toEqual([[50,50],[900,900]])
 })
 it('el resumen dice qué manzanas se retiraron y por qué hito',()=>{
  const retiradas=[{id:'B',hitos:['hospital-vargas'],ocupacion:.82,areaM2:1169,motivo:'ocupa la mayor parte'},
   {id:'D',hitos:['silencio-bloque-6','silencio-bloque-7'],ocupacion:.77,areaM2:2164,motivo:'ocupa la mayor parte'}]
  expect(resumenDeRetiradas(retiradas)).toEqual({'hospital-vargas':['B'],'silencio-bloque-6':['D'],'silencio-bloque-7':['D']})
  expect(resumenDeRetiradas([])).toEqual({})
 })
 it('la tabla en Markdown lleva una fila por cruce, ordenada por época, hito y manzana',()=>{
  const fila=(extra)=>({epoca:5,año:1936,hito:'hospital-vargas',manzana:'M5-1088-A0',areaManzanaM2:15006.4,areaHuellaM2:9092,areaRecintoM2:27000,
   manzanaBajoHuella:.12,manzanaBajoRecinto:.354,huellaEnManzana:.2,recintoEnManzana:.2,manzanasDelHito:13,clase:'grande',ocupacionManzana:.354,decision:'retirar',...extra})
  const md=tablaMd([fila({}),fila({epoca:1,año:1772,hito:'catedral',manzana:'U1772-0094',clase:'chico',decision:'conservar'})])
  const lineas=md.split('\n')
  expect(lineas[0]).toMatch(/^\| Época \| Hito \| Manzana \|/)
  expect(lineas[2]).toMatch(/^\| 1772 \| catedral \| U1772-0094 \|/)
  expect(lineas[3]).toBe('| 1936 | hospital-vargas | M5-1088-A0 | 15.006 | 9.092 | 27.000 | 12 % | 35 % | 20 % | 20 % | 35 % | grande | **retirar** |')
 })
})
