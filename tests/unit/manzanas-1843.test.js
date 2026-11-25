import {it,expect} from 'vitest'
import {integrarManzanas1843} from '../../tools/manzanas-1843-lib.mjs'
import {arbolesParaManzanas} from '../../tools/manzanas-arboles-lib.mjs'
const datos=()=>({vertices:[0,0,20,0,20,20,0,20],techos:[[0,4,2,0,123],[0,4,1,1,456],[0,4,1,0,789]],vida:[[1,2],[0,0],[2,3]],historia:[[32,32,32,32,32,32],[16,16,17,18,19,20],[16,16,16,16,16,16]],paletas:[5,0,0],vuelos:[0,255,0],marcos:[[0,0,0,1,0,20,20,0,5,0,1],[1,0,0,1,0,20,20,0,5,1,1]],alas:[[2,0,0,20,5],[2,0,0,20,6]]})
const firmas=(d,e)=>d.vida.flatMap(([n,f],i)=>n<=e&&(!f||e<f)?[JSON.stringify([d.techos[i],d.historia[i][e],d.paletas[i],d.vuelos[i],d.marcos.find(m=>m[0]===i)?.slice(1)])]:[]).sort()
it('1843 hereda sin regenerar las casas de 1772 y sustituye solo su intervalo temporal',()=>{
 const d=datos(),antes=structuredClone(d),{ciudad:c,informe}=integrarManzanas1843(d,[])
 expect(d).toEqual(antes);expect(c.vida[0]).toEqual([1,3]);expect(c.techos[0]).toEqual(d.techos[0]);expect(c.marcos[0]).toEqual(d.marcos[0]);expect(c.alas).toEqual(d.alas)
 for(const e of [0,1,3,4,5])expect(firmas(c,e)).toEqual(firmas(d,e))
 expect(firmas(c,2)).toEqual(firmas(d,1).filter(s=>JSON.parse(s)[2]>0));expect(informe.casasHeredadas).toBe(1)
 expect(c.vida.every(v=>!v[1]||v[0]<v[1])).toBe(true)
})
it('las nuevas manzanas nacen en 1843 con paleta, alas y marco del mismo generador',()=>{
 const casa={huella:[[100,0],[120,0],[120,20],[100,20]],pisos:1,semilla:42,paleta:8,marco:[100,0,1,0,20,20,0,5],alas:[[2,0,0,20,5]]}
 const {ciudad:c,informe}=integrarManzanas1843(datos(),[{id:'N',casas:[casa],arboles:[{x:110,y:15,r:2,nace:2,muere:3}]}])
 const i=c.techos.findIndex(t=>t[4]===42);expect(c.vida[i]).toEqual([2,3]);expect(c.paletas[i]).toBe(8);expect(c.historia[i][2]).toBe(16);expect(informe.casasNuevas).toBe(1)
 expect(informe.manzanas[0].casas).toBeUndefined();expect(c.marcos.find(m=>m[0]===i).slice(1,9)).toEqual(casa.marco)
})
it('los árboles de 1843 sustituyen los antiguos sin cambiar las otras épocas',()=>{
 const original={x:10,y:10,r:3,nace:0,muere:0},heredado={x:20,y:20,r:2,nace:1,muere:2},nuevo={...heredado,nace:2,muere:3}
 const m={poligono:[[0,0],[100,0],[100,100],[0,100]],arboles:[nuevo]}
 const r=arbolesParaManzanas([original,heredado],[],[m],{epoca:2})
 for(const e of [0,1,3,4,5]){const vivos=as=>as.filter(a=>a.nace<=e&&(!a.muere||e<a.muere)).map(({x,y,r})=>[x,y,r]);expect(vivos(r)).toEqual(vivos([original,heredado]))}
 expect(r.filter(a=>a.nace<=2&&(!a.muere||2<a.muere))).toEqual([nuevo])
})
