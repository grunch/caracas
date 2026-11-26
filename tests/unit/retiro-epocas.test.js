import {it,expect} from 'vitest'
import {integrarManzanasEpoca} from '../../tools/manzanas-1843-lib.mjs'
import epocas from '../../src/manzanas/epocas-retiro.json'
it('extiende la vivienda retraída exacta y conserva los intervalos posteriores',()=>{
 const d={vertices:[0,0,1,0,1,1],techos:[[0,3,1,0,7],[0,3,2,0,8]],vida:[[1,2],[2,0]],historia:[Array(6).fill(16),Array(6).fill(32)],paletas:[1,2],vuelos:[0,0],marcos:[],alas:[]}
 const {ciudad}=integrarManzanasEpoca(d,[],2)
 expect(ciudad.techos).toEqual(d.techos);expect(ciudad.vertices).toEqual(d.vertices)
 expect(ciudad.vida).toEqual([[1,3],[3,0]]);expect(d.vida).toEqual([[1,2],[2,0]])
})
it('habilita épocas consecutivas desde 1772, incluida 1843',()=>{
 expect(epocas.length).toBeGreaterThanOrEqual(2)
 expect(epocas).toEqual([1772,1843,1889,1911,1936,1946].slice(0,epocas.length))
})
