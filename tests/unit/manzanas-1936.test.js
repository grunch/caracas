import {it,expect} from 'vitest'
import completas from '../../src/manzanas/epocas-completas.json'
import {PASOS} from '../../tools/datos-pasos.mjs'
it('1936 hereda las manzanas de 1911 y genera su expansión con el mismo modelo',()=>{
 expect(completas).toContain(1936)
 const paso=PASOS.find(p=>p.id==='retiro-1936')
 expect(paso.cmd()).toContain('tools/manzanas-modernas.mjs')
 expect(paso.entradas).toContain('fuentes/derivados/retiro1911/manzanas-1911-informe.json')
})
