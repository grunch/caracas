import {it,expect} from 'vitest'
import {PASOS} from '../../tools/datos-pasos.mjs'
it('el retiro usa ciudad y árboles base independientes, sin ciclos ni productores duplicados',()=>{
 const producidos=new Map()
 for(const [i,p] of PASOS.entries())for(const s of p.salidas??[]){expect(producidos.has(s),s).toBe(false);producidos.set(s,i)}
 for(const [i,p] of PASOS.entries())for(const e of p.entradas??[])if(producidos.has(e))expect(producidos.get(e),`${p.id}: ${e}`).toBeLessThan(i)
 const retiro=PASOS.find(p=>p.id==='retiro-1772'),empacar=PASOS.find(p=>p.id==='empacar')
 expect(retiro.entradas).toContain('fuentes/derivados/retiro1772/base-arboles.bin')
 expect(empacar.entradas).toContain('fuentes/derivados/retiro1772/ciudad.json')
 expect(PASOS.find(p=>p.id==='suelo-manzanas').entradas).toContain('fuentes/derivados/retiro1772/manzanas-1772-informe.json')
})
it('los contornos del piloto corresponden al metro adicional del generador',async()=>{
 const {PILOTO_COLONIAL}=await import('../../src/detalle-colonial-plan.js')
 const {retraerCuadra}=await import('../../tools/manzanas-1772-lib.mjs')
 for(const m of PILOTO_COLONIAL){
  const esperado=retraerCuadra(m.poligono,2) // mosaico: 0,5 m por píxel
  expect(m.contornos[0].vida).toEqual([1,2])
  m.contornos[0].poligono.forEach((v,i)=>v.forEach((x,k)=>expect(x).toBeCloseTo(esperado[i][k],2)))
 }
})
