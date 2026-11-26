import {describe,it,expect} from 'vitest'
import {MARCAS} from '../../src/marcas-datos.js'
import {FICHAS} from '../../src/fichas-datos.js'
import {vivaEn} from '../../src/marcas.js'
const marca=id=>({muere:0,...MARCAS.find(m=>m.id===id)})
describe('presencia física de los hallazgos prioritarios',()=>{
 it('Metropolitano existe en 1911/1936 y no antes de 1896 ni en 1946',()=>{
  expect([1,2,3,4,5,6].map(e=>vivaEn(marca('circo-metropolitano'),e))).toEqual([false,false,false,true,true,false])
  expect(FICHAS['circo-metropolitano'].dudas).toMatch(/1942.*1945/)
 })
 it('Hijos de Dios conserva sus estructuras después de dejar de recibir entierros',()=>{
  expect([1,2,3,4,5,6].map(e=>vivaEn(marca('hijos-de-dios'),e))).toEqual([false,false,true,true,true,true])
  expect(FICHAS['hijos-de-dios'].textos[0][1]).toMatch(/cerrado|clausurado/)
 })
 it('Nuevo Circo no sustituye al Metropolitano ni aparece antes de 1919',()=>{
  expect([4,5,6].map(e=>vivaEn(marca('nuevo-circo'),e))).toEqual([false,true,true])
 })
})

it('en 1843 la plaza tiene nombre oficial de Bolívar sin anticipar el jardín de 1874',()=>{
 const nombres=marca('plaza-bolivar').nombres
 expect(nombres.find(([e])=>e===2)?.[1]).toBe('Plaza Bolívar')
 expect(nombres.find(([e])=>e===2)?.[2]).toMatch(/mercado/)
})

import {nombresPorEpoca} from '../../src/fichas.js'
it('agrupa notas sucesivas del mismo nombre, sin fusionar nombres que regresan después de otro',()=>{
 const m={nace:1,muere:0,nombres:[{desde:1,nombre:'A'},{desde:2,nombre:'A'},{desde:3,nombre:'B'},{desde:4,nombre:'A'}]}
 expect(nombresPorEpoca(m,2)).toEqual([
  {nombre:'A',periodo:'1772–1843',rige:true},{nombre:'B',periodo:'1889',rige:false},{nombre:'A',periodo:'desde 1911',rige:false},
 ])
})
