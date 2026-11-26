import {it,expect} from 'vitest'
import {suprimirArbolesDeHitos} from '../../src/hitos/suprimir-arboles.js'
it('conserva árboles y semillas anteriores y exteriores; retira solo los que ocupa el edificio desde su nacimiento',()=>{
 const datos={n:4,x:new Uint16Array([5,5,20,5]),y:new Uint16Array([5,5,20,5]),nace:new Uint16Array([1,3,1,0]),muere:new Uint16Array([0,0,0,2]),radio:new Float32Array([1,1,1,1])}
 const hitos=[{nace:3,muere:0,sinArboles:[[[0,0],[10,0],[10,10],[0,10]]]}]
 const r=suprimirArbolesDeHitos(datos,hitos)
 expect([...r.nace]).toEqual([1,7,1,0]);expect([...r.muere]).toEqual([3,7,0,2])
 expect([...datos.muere]).toEqual([0,0,0,2]);expect(r.x).toBe(datos.x);expect(r.radio).toBe(datos.radio)
 expect(suprimirArbolesDeHitos(datos,[])).toBe(datos)
})
