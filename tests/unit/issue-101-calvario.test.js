import { it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
const coords = crearCoords({ ancho:18600, alto:14800, metro:0.5, plaza:[8968.2,6839] })
const m = normalizarMarcas(MARCAS, { hitos:HITOS, coords }).find(m => m.id === 'arco-federacion')
const texto = e => contenidoDeFicha({marca:m, ficha:FICHAS[m.id], epoca:e}).parrafos.filter(p => p.rige).map(p => p.texto).join(' ')
it('separa el arco de 1895 del paseo de 1873 (#101)', () => {
 expect(m).toBeDefined()
 for(let e=0;e<4;e++) expect(vivaEn(m,e)).toBe(false)
 for(let e=4;e<=6;e++) expect(vivaEn(m,e)).toBe(true)
 expect(texto(4)).toContain('1895')
 const paseo=normalizarMarcas(MARCAS,{hitos:HITOS,coords}).find(m=>m.id==='calvario')
 const texto1889=contenidoDeFicha({marca:paseo,ficha:FICHAS.calvario,epoca:3}).parrafos.filter(p=>p.rige).map(p=>p.texto).join(' ')
 expect(texto1889).toContain('1873');expect(texto1889).not.toMatch(/arco/i)
 expect(vivaEn(paseo,1)).toBe(true)
})
