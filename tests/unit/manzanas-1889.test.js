import {it,expect} from 'vitest'
import {integrarManzanasEpoca} from '../../tools/manzanas-1843-lib.mjs'
it('1889 prolonga las dos generaciones y conserva todas las otras épocas',()=>{
 const d={vertices:[0,0,20,0,20,20,0,20],techos:[[0,4,1,0,11],[0,4,2,0,22],[0,4,1,0,33]],vida:[[1,3],[2,3],[0,0]],historia:[[16,16,16,17,18,19],[32,32,32,33,34,35],[16,17,18,19,20,21]],paletas:[1,2,0],vuelos:[0,0,255],marcos:[],alas:[]}
 const firma=(d,e)=>d.vida.flatMap(([n,f],i)=>n<=e&&(!f||e<f)?[JSON.stringify([d.techos[i],d.historia[i][e],d.paletas[i],d.vuelos[i]])]:[]).sort()
 const original=structuredClone(d),{ciudad:c,informe}=integrarManzanasEpoca(d,[],3)
 expect(d).toEqual(original);expect(c.vida.slice(0,2)).toEqual([[1,4],[2,4]])
 expect(c.historia.slice(0,2).map(h=>h[3])).toEqual([16,32]);expect(informe.casasHeredadas).toBe(2)
 for(const e of [0,1,2,4,5])expect(firma(c,e)).toEqual(firma(d,e))
 expect(firma(c,3)).toEqual(firma(d,2).filter(s=>JSON.parse(s)[2]>0))
})
