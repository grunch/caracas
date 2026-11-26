import {describe,it,expect} from 'vitest'
import {Box3} from 'three'
import {crearTeatroMunicipal} from '../../src/hitos/teatro-municipal-modelo.js'
import {teatroMunicipal} from '../../src/hitos/datos/teatro-municipal.js'
import {parteDe} from '../../src/hitos/partes.js'

describe('Teatro Municipal histórico',()=>{
  it('nace en 1889 y comparte una sola parte hasta 1936',()=>{
    expect(teatroMunicipal.nace).toBe(3)
    expect(teatroMunicipal.muere).toBe(0)
    expect(teatroMunicipal.partes).toHaveLength(1)
    expect(parteDe(teatroMunicipal.partes[0].tipo)).toBeTypeOf('function')
    expect(()=>crearTeatroMunicipal({anio:1843})).toThrow(RangeError)
  })
  it('conserva dimensiones y geometría finita entre fechas sin reconstruir fachadas diferentes',()=>{
    const firmas=[]
    for(const anio of [1889,1911,1936]){
      const {edificio,cubiertas}=crearTeatroMunicipal({anio,nivelDetalle:'ciudad'})
      const limites=new Box3().setFromObject(edificio)
      expect(limites.min.z).toBeLessThan(-29)
      expect(limites.max.y).toBeGreaterThan(23)
      expect(limites.max.x-limites.min.x).toBeLessThan(40)
      expect(cubiertas.parent).toBe(edificio)
      let vertices=0
      edificio.traverse(o=>{if(o.isMesh){const p=o.geometry.attributes.position;vertices+=p.count;expect([...p.array].every(Number.isFinite)).toBe(true);o.geometry.dispose();o.material.dispose()}})
      firmas.push(vertices)
    }
    expect(new Set(firmas).size).toBe(1)
    expect(firmas[0]).toBeLessThan(150000)
  })
})

import {MARCAS} from '../../src/marcas-datos.js'
import {normalizarMarcas} from '../../src/marcas.js'
import {HITOS} from '../../src/hitos.js'
import {seccionesDeEdificios} from '../../src/vitrina.js'
import {FICHAS} from '../../src/fichas-datos.js'
it('la marca conserva San Pablo, pero el catálogo abre el teatro en 1889',()=>{
  const marcas=normalizarMarcas(MARCAS,{hitos:HITOS,coords:{aMundo:(x,y)=>({x,z:y})}})
  expect(marcas.find(m=>m.id==='teatro-municipal').nace).toBe(1)
  const teatro=seccionesDeEdificios(marcas,FICHAS).find(m=>m.id==='teatro-municipal')
  expect(teatro?.epoca).toBe(3)
  expect(teatro?.texto).toContain('1881')
})

import {suprimirTechos,zonasDeSupresion} from '../../src/hitos/suprimir.js'
import {rectanguloPx} from '../../src/hitos/datos/marco.js'
it('retira las casas del teatro desde 1889 conservando sus épocas anteriores',()=>{
  const vertices=new Float32Array(rectanguloPx(teatroMunicipal,8,8).flat())
  const casa={vertices,techos:new Uint32Array([0,4,1,0]),vida:new Uint32Array([1])}
  const salida=suprimirTechos(casa,zonasDeSupresion([teatroMunicipal]))
  expect(salida[0]).toBe(1+8*3)
  expect(casa.vida[0]).toBe(1)
})
