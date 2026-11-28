import {describe,it,expect} from 'vitest'
import {separarRetiradas,devolverManzanas,ocupadasParaAmpliar,zonasDeArbolado,resumenDeDevueltas} from '../../tools/hitos-manzanas-lib.mjs'
import {arbolesParaManzanas} from '../../tools/manzanas-arboles-lib.mjs'

// #257: en 1946 quedaba un hueco donde estuvo el Circo Metropolitano. La manzana que el circo retiró en 1911 y 1936
// (specs/13, R13: «en las épocas en que el hito está en pie») no volvía cuando el circo dejó de estar.
const cuadro=(x,y,l=100)=>[[x,y],[x+l,y],[x+l,y+l],[x,y+l]]
const manzana=(id,x,y,extra={})=>({id,referencia:id.slice(0,-3),poligono:cuadro(x,y),limite:cuadro(x+1,y+1,98),huecos:[],areaM2:2500,areaDespuesM2:2401,
 reservas:[],distancia:300,cantidadCasas:12,semilla:`1843-${id}`,arboles:[{x:x+50,y:y+50,r:2,nace:3,muere:4}],arbolesObjetivo:1,estado:'integrada',nuevas:12,...extra})
const retira=(id,hito)=>({id,retirar:true,ocupacion:.51,motivo:'ocupa la mayor parte',hitos:[{hito,clase:'grande'}]})
const queda=id=>({id,retirar:false,ocupacion:0,hitos:[]})

describe('la manzana que un hito retiró vuelve cuando el hito ya no está (specs/13, R13; #257)',()=>{
 it('el registro de una retirada guarda la manzana entera, sin sus casas, para poder devolverla',()=>{
  // Arrange
  const m=manzana('U1843-0224-A0',0,0,{casas:[{huella:cuadro(0,0,10)}]})
  // Act
  const {retiradas:[r]}=separarRetiradas([m],[retira(m.id,'circo-metropolitano')],4)
  // Assert
  const {casas,...sinCasas}=m
  expect(r.manzana).toEqual(sinCasas)
  expect(r).toMatchObject({id:m.id,poligono:m.poligono,limite:m.limite,areaM2:2401,epoca:4,hitos:['circo-metropolitano']})
 })
 it('vuelve entera, sin casas ni árboles inventados, si ningún hito la sigue retirando',()=>{
  // Arrange: retirada en 1911 y 1936 por el circo; en 1946 ya nadie la retira
  const m=manzana('U1843-0224-A0',0,0)
  const {retiradas}=separarRetiradas([m],[retira(m.id,'circo-metropolitano')],5),antes=structuredClone(retiradas)
  // Act
  const {siguen,vuelven}=devolverManzanas(retiradas,[queda(m.id)],6)
  // Assert
  expect(retiradas).toEqual(antes)
  expect(siguen).toEqual([])
  expect(vuelven).toEqual([{...m,arboles:[],arbolesObjetivo:0,cantidadCasas:0,nuevas:0,estado:'devuelta',
   devuelta:{epoca:6,retiradaHasta:5,hitos:['circo-metropolitano']}}])
 })
 it('no vuelve donde un hito posterior ocupa el mismo sitio: sigue retirada, ahora por él, y conserva la manzana',()=>{
  const m=manzana('A-A0',0,0),{retiradas}=separarRetiradas([m],[retira(m.id,'circo-metropolitano')],5)
  const {siguen,vuelven}=devolverManzanas(retiradas,[retira(m.id,'teatro-posterior')],6)
  expect(vuelven).toEqual([])
  expect(siguen).toHaveLength(1)
  expect(siguen[0]).toMatchObject({id:m.id,epoca:6,hitos:['teatro-posterior'],manzana:m})
 })
 it('de varias retiradas vuelven solo las que quedaron libres, y la que vuelve puede retirarse y volver otra vez',()=>{
  const ms=[manzana('A-A0',0,0),manzana('B-A0',200,0)]
  const en4=separarRetiradas(ms,[retira('A-A0','circo-metropolitano'),retira('B-A0','hospital-vargas')],4).retiradas
  const en5=devolverManzanas(en4,[queda('A-A0'),retira('B-A0','hospital-vargas')],5)
  expect(en5.vuelven.map(m=>m.id)).toEqual(['A-A0'])
  expect(en5.siguen.map(m=>m.id)).toEqual(['B-A0'])
  // la devuelta es una manzana heredada más: otro hito puede retirarla después y, al irse, vuelve igual
  const en6=separarRetiradas(en5.vuelven,[retira('A-A0','otro-hito')],6).retiradas
  expect(devolverManzanas(en6,[queda('A-A0')],6).vuelven[0]).toMatchObject({id:'A-A0',estado:'devuelta',nuevas:0,arboles:[]})
 })
 it('un registro viejo, sin la manzana entera, vuelve con su contorno y su área',()=>{
  const viejo={id:'U1843-0224-A0',poligono:cuadro(0,0),limite:cuadro(1,1,98),huecos:[],areaM2:1365,epoca:5,ocupacion:.51,motivo:'ocupa la mayor parte',hitos:['circo-metropolitano']}
  const {vuelven}=devolverManzanas([viejo],[queda(viejo.id)],6)
  expect(vuelven).toEqual([{id:viejo.id,poligono:viejo.poligono,limite:viejo.limite,huecos:[],areaM2:1365,arboles:[],arbolesObjetivo:0,cantidadCasas:0,nuevas:0,
   estado:'devuelta',devuelta:{epoca:6,retiradaHasta:5,hitos:['circo-metropolitano']}}])
 })
 it('las decisiones tienen que ser las de esas retiradas',()=>{
  const {retiradas}=separarRetiradas([manzana('A-A0',0,0)],[retira('A-A0','x')],5)
  expect(()=>devolverManzanas(retiradas,[queda('Z')],6)).toThrow(/A-A0/)
  expect(()=>devolverManzanas(retiradas,[],6)).toThrow(/decisiones/)
 })
 it('el suelo de la devuelta está ocupado al ampliar: el plano de la época no levanta otra manzana encima',()=>{
  const devuelta={...manzana('A-A0',0,0),estado:'devuelta'}
  const ocupadas=ocupadasParaAmpliar({quedan:[manzana('B-A0',200,0)],retiradas:[]},[],[devuelta])
  expect(ocupadas.map(m=>m.id)).toEqual(['B-A0','A-A0'])
  expect(ocupadas[1]).toEqual({id:'A-A0',poligono:devuelta.poligono,limite:devuelta.limite,huecos:[]})
 })
 it('en la devuelta no se plantan árboles generados ni se quitan los que dibuja el plano',()=>{
  // Arrange: un árbol del plano en el solar que vuelve y otro en una manzana con casas
  const devuelta={...manzana('A-A0',0,0),arboles:[],estado:'devuelta'},comun=manzana('B-A0',200,0,{arboles:[{x:250,y:50,r:2,nace:6,muere:0}]})
  const delPlano=[{x:50,y:50,r:2,nace:6,muere:0},{x:260,y:60,r:2,nace:6,muere:0}]
  // Act
  const zonas=zonasDeArbolado([comun,devuelta],[])
  const r=arbolesParaManzanas(delPlano,[],zonas,{epoca:6})
  // Assert
  expect(zonas.map(z=>z.id)).toEqual(['B-A0'])
  expect(r.map(a=>[a.x,a.y])).toEqual([[50,50],[250,50]])
 })
 it('las retiradas de la época siguen siendo zonas sin árboles',()=>{
  const zonas=zonasDeArbolado([manzana('B-A0',200,0)],[{id:'C',limite:cuadro(400,0),huecos:[]}])
  expect(zonas.map(z=>[z.id,z.arboles.length])).toEqual([['B-A0',1],['C',0]])
 })
 it('el resumen dice qué manzanas volvieron y qué hito las tenía retiradas',()=>{
  const {retiradas}=separarRetiradas([manzana('A-A0',0,0)],[retira('A-A0','circo-metropolitano')],5)
  expect(resumenDeDevueltas(devolverManzanas(retiradas,[queda('A-A0')],6).vuelven)).toEqual({'circo-metropolitano':['A-A0']})
  expect(resumenDeDevueltas([])).toEqual({})
 })
})
