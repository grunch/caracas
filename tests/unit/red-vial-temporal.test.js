import {describe,it,expect} from 'vitest'
import {validarRedVial,redDeEpoca,importarReferencias} from '../../tools/red-vial-lib.mjs'
const registro=()=>({version:1,sistema:'mosaico-1936-px',fuentes:{p:{tipo:'historica',anios:[1772,1936],url:'https://ejemplo.org/plano'}},tramos:[{id:'calle',etapas:[{anio:1772,estado:'existente',puntos:[[1,2],[3,4]],ancho_m:null,error_m:3,fuentes:['p']}]}]})
describe('red temporal sin heredar geometría actual',()=>{
 it('solo emite etapas existentes y explicitas, sin convertir desconocido en ausencia',()=>{
  expect(redDeEpoca(registro(),1772).tramos).toHaveLength(1)
  expect(redDeEpoca(registro(),1843).tramos).toHaveLength(0)
  expect(redDeEpoca(registro(),1843).pendientes).toEqual(['calle'])
 })
 it('no emite proyectos aunque tengan geometría',()=>{
  const r=registro();r.tramos[0].etapas[0].estado='proyecto';expect(redDeEpoca(r,1772).tramos).toHaveLength(0)
 })
 it('rechaza un documento actual como única prueba histórica',()=>{
  const r=registro();r.fuentes.p.tipo='actual';expect(()=>validarRedVial(r)).toThrow(/histórica/)
 })
 it('rechaza época anterior a la apertura de la estructura moderna',()=>{
  const r=registro();r.tramos[0].desde=1953;expect(()=>validarRedVial(r)).toThrow(/apertura/)
 })
 it('detecta duplicados, años ambiguos, puntos inválidos y fuentes ausentes',()=>{
  for(const cambiar of [r=>r.tramos.push(structuredClone(r.tramos[0])),r=>r.tramos[0].etapas.push(structuredClone(r.tramos[0].etapas[0])),r=>r.tramos[0].etapas[0].anio=1800,r=>r.tramos[0].etapas[0].puntos[0]=[NaN,2],r=>r.tramos[0].etapas[0].fuentes=['x'],r=>r.tramos[0].etapas[0].ancho_m=-1]){const r=registro();cambiar(r);expect(()=>validarRedVial(r)).toThrow();}
 })
 it('no modifica ni devuelve las coordenadas originales por referencia',()=>{
  const r=registro(),antes=structuredClone(r),salida=redDeEpoca(r,1772);salida.tramos[0].puntos[0][0]=99;expect(r).toEqual(antes)
 })
 it('conserva los 11 trazados y la red de 1772, sin exportar sectores no medibles',()=>{
  const r=importarReferencias({tramos:[{tramo:'a',puntos:[[0,0],[1,1]],medible:true,banda_m:5},{tramo:'b',puntos:[[1,1],[2,2]],medible:false,banda_m:9}]},{tramos:[{id:'c',anclajes:[[3,3],[4,4]],nota:'Visible en ambos planos'}]})
  expect(redDeEpoca(r,1772).tramos.map(t=>t.tramo)).toEqual(['a','recuperado:c'])
  expect(redDeEpoca(r,1936).tramos.map(t=>t.tramo)).toEqual(['recuperado:c'])
  expect(redDeEpoca(r,1843).tramos).toHaveLength(0)
 })
})

import {registroDelProyecto} from '../../tools/red-vial.mjs'
it('audita las referencias reales sin extrapolar a las épocas sin evidencia',async()=>{
 const red=await registroDelProyecto()
 const antigua=redDeEpoca(red,1772),base=redDeEpoca(red,1936)
 expect(base.tramos).toHaveLength(11)
 expect(base.tramos.every(t=>t.tramo.startsWith('recuperado:')&&t.procedencia.original)).toBe(true)
 expect(antigua.tramos.length).toBeGreaterThan(400)
 for(const anio of [1843,1889,1911,1946]){
  const salida=redDeEpoca(red,anio)
  expect(salida.tramos).toHaveLength(0)
  expect(salida.ausentes).toHaveLength(6)
  expect(salida.pendientes.length).toBeGreaterThan(400)
 }
})
