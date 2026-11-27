import {describe,expect,test} from 'vitest'
import {HITOS,construirHitos,suprimirTechos,validarHitos,zonasDeSupresion} from '../../src/hitos.js'
import {hitosConPlanta} from '../../src/hitos/plantas.js'
import {rejillaDeCasas,choca} from '../../src/a-pie.js'
import {glslSuelosPropios} from '../../src/hitos/suelos-propios.js'
import {cementerioSur} from '../../src/hitos/datos/cementerio-sur.js'
import {parteDe} from '../../src/hitos/partes.js'
import {crearCoords} from '../../src/coords.js'
import {recortarTramo} from '../../src/hitos/cementerio-sur.js'

const plano={ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]}
const coords=crearCoords(plano)

describe('Cementerio General del Sur',()=>{
 test('recorta las vías en el perímetro irregular del recinto',()=>{
  const poligono=[[0,0],[10,0],[10,10],[6,10],[6,4],[4,4],[4,10],[0,10]]
  const tramos=recortarTramo([-2,5],[12,5],poligono)
  expect(tramos).toHaveLength(2)
  expect(tramos).toEqual([[[0,5],[4,5]],[[6,5],[10,5]]])
 })

 test('presenta dos fases con distinto nivel de certeza y conserva su cronología',()=>{
  expect(cementerioSur.nace).toBe(3)
  expect(cementerioSur.partes.map(({fase,nace,muere})=>[fase,nace,muere])).toEqual([['inicial',3,5],['ampliado',5,0]])
  expect(validarHitos([cementerioSur],plano)).toEqual([])
  expect(parteDe('cementerio-sur')).toBeTypeOf('function')
 })

 test('las reservas y el suelo cambian en 1936, no antes',()=>{
  const zonas=zonasDeSupresion([cementerioSur])
  expect(zonas.map(z=>[z.desde,z.hasta])).toEqual([[3,5],[5,0]])
  const vertices=new Float32Array([6300,12500,6308,12500,6308,12508,6300,12508])
  const techos=new Uint32Array([0,4,0,0])
  expect(suprimirTechos({vertices,techos,vida:new Uint32Array([5])},zonas)[0]).toBe(63)
  const shader=glslSuelosPropios(plano,.5)
  expect(shader).toContain('vivoEn(vec2(3.00000,5.00000)')
  expect(shader).toContain('vivoEn(vec2(5.00000,0.00000)')
 })

 test('las colisiones usan el perímetro de su fase',()=>{
  const plantas=hitosConPlanta().filter(h=>h.id==='cementerio-sur')
  expect(plantas.map(h=>[h.nace,h.muere,h.planta.length])).toEqual([[3,5,1],[5,0,1]])
  const r=rejillaDeCasas({vertices:new Float32Array(),techos:new Uint32Array()},4,(x,y)=>({x,z:y}),plantas)
  expect(choca(r,7100+2*300,12500+2*100)).toBe(false)
  const s=rejillaDeCasas({vertices:new Float32Array(),techos:new Uint32Array()},5,(x,y)=>({x,z:y}),plantas)
  expect(choca(s,7100+2*300,12500+2*100)).toBe(true)
 })

 test('construye malla finita y conserva fases de los vértices',()=>{
  const resultado=construirHitos([cementerioSur],coords),r=resultado.rangos.find(x=>x.id==='cementerio-sur')
  expect(r.hasta-r.desde).toBeGreaterThan(5000)
  const anclas=new Set()
  for(let i=r.desde;i<r.hasta;i++)anclas.add(`${resultado.anclas[4*i]},${resultado.anclas[4*i+1]}`)
  expect(anclas.size).toBeGreaterThan(100)
  for(const v of resultado.posiciones)expect(Number.isFinite(v)).toBe(true)
  const vidas=new Set()
  for(let i=r.desde;i<r.hasta;i++){const nace=resultado.vidas[2*i],muere=resultado.vidas[2*i+1];vidas.add(`${nace}/${muere}`)}
  expect(vidas).toEqual(new Set(['3/5','5/0']))
 })
})
