import {it,expect} from 'vitest'
import completas from '../../src/manzanas/epocas-completas.json'
import {PASOS} from '../../tools/datos-pasos.mjs'
import {integrarManzanasEpoca} from '../../tools/manzanas-1843-lib.mjs'
import {arbolesParaManzanas} from '../../tools/manzanas-arboles-lib.mjs'
it('1946 usa el generador completo y conserva los árboles de expansión fuera de sus solares',()=>{
 expect(completas).toContain(1946)
 const p=PASOS.find(p=>p.id==='retiro-1946')
 expect(p.cmd()).toContain('tools/manzanas-modernas.mjs')
 expect(p.entradas).toContain('fuentes/derivados/1946/arboles-base.bin')
 expect(p.entradas).toContain('fuentes/derivados/retiro1936/manzanas-1936-informe.json')
})
it('la última época prolonga las casas sin inventar una séptima historia ni registros futuros',()=>{
 const d={vertices:[0,0,20,0,20,20,0,20],techos:[[0,4,1,0,11],[0,4,2,0,22]],vida:[[3,6],[0,0]],historia:[Array(6).fill(16),Array(6).fill(32)],paletas:[1,0],vuelos:[0,255],marcos:[],alas:[]}
 const {ciudad:c}=integrarManzanasEpoca(d,[],6)
 expect(c.vida).toEqual([[3,0],[0,6]])
 expect(c.historia).toEqual(d.historia)
 expect(d.vida).toEqual([[3,6],[0,0]])
 const m={poligono:[[0,0],[20,0],[20,20],[0,20]],arboles:[{x:7,y:7,r:2,nace:6,muere:0}]}
 const fuera={x:40,y:40,r:2,nace:6,muere:0}
 const r=arbolesParaManzanas([{x:5,y:5,r:2,nace:1,muere:0},fuera],[],[m],{epoca:6})
 expect(r).toEqual([{x:5,y:5,r:2,nace:1,muere:6},fuera,...m.arboles])
 expect(r.every(a=>a.nace<7)).toBe(true)
})
