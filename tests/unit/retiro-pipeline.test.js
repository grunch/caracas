import {it,expect} from 'vitest'
import epocas from '../../src/manzanas/epocas-retiro.json'
import {PASOS} from '../../tools/datos-pasos.mjs'
it('el retiro usa ciudad y árboles base independientes, sin ciclos ni productores duplicados',()=>{
 const producidos=new Map()
 for(const [i,p] of PASOS.entries())for(const s of p.salidas??[]){expect(producidos.has(s),s).toBe(false);producidos.set(s,i)}
 for(const [i,p] of PASOS.entries())for(const e of p.entradas??[])if(producidos.has(e))expect(producidos.get(e),`${p.id}: ${e}`).toBeLessThan(i)
 const retiro=PASOS.find(p=>p.id==='retiro-1772'),empacar=PASOS.find(p=>p.id==='empacar')
 expect(retiro.entradas).toContain('fuentes/derivados/retiro1772/base-arboles.bin')
 expect(empacar.entradas).toContain(`fuentes/derivados/retiro${epocas.at(-1)}/ciudad.json`)
 expect(PASOS.find(p=>p.id==='suelo-manzanas').entradas).toContain('fuentes/derivados/retiro1772/manzanas-1772-informe.json')
})
it('los contornos del piloto corresponden al metro adicional del generador',async()=>{
 const {PILOTO_COLONIAL}=await import('../../src/detalle-colonial-plan.js')
 const {retraerCuadra}=await import('../../tools/manzanas-1772-lib.mjs')
 for(const m of PILOTO_COLONIAL){
  const esperado=retraerCuadra(m.poligono,2) // mosaico: 0,5 m por píxel
  expect(m.contornos[0].vida).toEqual([1,Math.min(4,epocas.length+1)])
  m.contornos[0].poligono.forEach((v,i)=>v.forEach((x,k)=>expect(x).toBeCloseTo(esperado[i][k],2)))
 }
})
it('los árboles adicionales de 1946 pasan por el retiro antes de publicarse',()=>{
 const mapa=PASOS.find(p=>p.id==='mapa-1946'),retiro=PASOS.find(p=>p.id==='retiro-1946'),publicar=PASOS.find(p=>p.id==='arboles-1946')
 expect(mapa.salidas).toContain('fuentes/derivados/1946/arboles-base.bin')
 expect(retiro.entradas).toContain('fuentes/derivados/1946/arboles-base.bin')
 expect(retiro.salidas).toContain('fuentes/derivados/retiro1946/arboles-1946.bin')
 expect(publicar.entradas).toContain('fuentes/derivados/retiro1946/arboles-1946.bin')
 expect(publicar.salidas).toEqual(['public/datos/arboles-1946.bin'])
})
