import {it,expect} from 'vitest'
import {MARCAS} from '../../src/marcas-datos.js'
import {normalizarMarcas,nombreEn,vivaEn} from '../../src/marcas.js'
import {crearCoords} from '../../src/coords.js'
import {FICHAS} from '../../src/fichas-datos.js'
it('el cruce Sur 7 aparece como Constitución en 1889 y Sucre desde 1911',()=>{
 const [m]=normalizarMarcas(MARCAS.filter(m=>m.id==='puente-sucre'),{coords:crearCoords({ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]})})
 expect([1,2,3,4,5,6].map(e=>vivaEn(m,e))).toEqual([false,false,true,true,true,true])
 expect(nombreEn(m,3).nombre).toBe('Puente Constitución')
 expect(nombreEn(m,4).nombre).toBe('Puente Sucre')
 expect(nombreEn(m,5).nombre).toBe('Puente Sucre')
})
it('las fichas separan sustitución estructural de desaparición del cruce',()=>{
 expect(FICHAS['puente-sucre'].textos.map(([e])=>e)).toEqual([3,4,5])
 expect(FICHAS['puente-hierro'].textos.map(([e])=>e)).toEqual([3,6])
 expect(FICHAS['puente-hierro'].textos[1][1]).toMatch(/1937/)
})
