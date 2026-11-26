import {it,expect} from 'vitest'
import {integrarManzanasEpoca} from '../../tools/manzanas-1843-lib.mjs'
it('1911 conserva las casas de 1889 exactamente y no cambia las otras seis épocas',()=>{
 const d={vertices:[0,0,20,0,20,20,0,20],techos:[[0,4,1,0,11],[0,4,2,0,22]],vida:[[3,4],[0,0]],historia:[Array(7).fill(16),Array(7).fill(32)],paletas:[1,0],vuelos:[0,255],marcos:[],alas:[]}
 const firma=(d,e)=>d.vida.flatMap(([n,f],i)=>n<=e&&(!f||e<f)?[JSON.stringify([d.techos[i],d.historia[i][e],d.paletas[i],d.vuelos[i]])]:[]).sort()
 const original=structuredClone(d),{ciudad:c}=integrarManzanasEpoca(d,[],4)
 expect(d).toEqual(original)
 for(const e of [0,1,2,3,5,6])expect(firma(c,e)).toEqual(firma(d,e))
 expect(firma(c,4)).toEqual(firma(d,3).filter(s=>JSON.parse(s)[2]>0))
})
