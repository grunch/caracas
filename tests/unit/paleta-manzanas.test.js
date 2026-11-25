import {it,expect} from 'vitest'
import {PERFIL_COLONIAL} from '../../src/manzanas/plan.js'
import {codificarPaleta} from '../../src/manzanas/paleta.js'
import {partesDeCiudad} from '../../tools/empacar-lib.mjs'
import {extruirTechos,paqueteDeGeometria} from '../../src/ciudad.js'
import {crearCoords} from '../../src/coords.js'
it('conserva las 36 combinaciones de colores del prototipo hasta la GPU',()=>{
 for(let muro=0;muro<6;muro++)for(let teja=0;teja<6;teja++){
  const codigo=codificarPaleta(PERFIL_COLONIAL.muros[muro],PERFIL_COLONIAL.tejas[teja])
  expect(codigo).toBe(1+muro*6+teja)
  const raw={vertices:[0,0,40,0,40,40,0,40],techos:[[0,4,1,0,123]],paletas:[codigo]}
  const datos=Object.fromEntries(Object.entries(partesDeCiudad(raw)).map(([k,v])=>[k,v.datos]))
  expect(datos.paletas[0]).toBe(codigo)
  const g=paqueteDeGeometria(extruirTechos(datos,crearCoords({ancho:100,alto:100,metro:.5,plaza:[0,0]})))
  expect(g.atributos.aInfo[2]).toBe(codigo*256)
 }
})
it('rechaza paletas inválidas sin truncarlas al empacar',()=>{
 expect(()=>partesDeCiudad({vertices:[0,0,1,0,1,1],techos:[[0,3,1,0,1]],paletas:[37]})).toThrow(/paleta/)
})
