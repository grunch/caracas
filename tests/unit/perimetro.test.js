import {describe,it,expect} from 'vitest'
import {resolverPerimetro} from '../../src/manzanas/perimetro.js'

describe('resolverPerimetro',()=>{
 it('rechaza un lado que falta aunque el arreglo tenga cuatro posiciones',()=>{
  // every() se salta los huecos de un arreglo disperso: [96, , 96, 96] pasaba la validación
  // eslint-disable-next-line no-sparse-arrays
  expect(()=>resolverPerimetro({lados:[96,,96,96]})).toThrow(RangeError)
 })
 it('rechaza un ángulo que falta aunque el arreglo tenga cuatro posiciones',()=>{
  // eslint-disable-next-line no-sparse-arrays
  expect(()=>resolverPerimetro({angulos:[90,,90,90]})).toThrow(RangeError)
 })
 it('sigue aceptando un perímetro válido',()=>{
  expect(resolverPerimetro({lados:[96,96,96,96],angulos:[90,90,90,90]}).area).toBeCloseTo(9216,3)
 })
})
