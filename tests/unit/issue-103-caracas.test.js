import { it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
const coords = crearCoords({ ancho:18600, alto:14800, metro:0.5, plaza:[8968.2,6839] })
const m = normalizarMarcas(MARCAS, { hitos:HITOS, coords }).find(m => m.id === 'hotel-majestic')
const texto = e => contenidoDeFicha({marca:m, ficha:FICHAS[m.id], epoca:e}).parrafos.filter(p => p.rige).map(p => p.texto).join(' ')
it('añade Majestic en1936 y1946, sin adelantar su apertura de1930 (#103)', () => {
 expect(m).toBeDefined()
 for(let e=0;e<5;e++) expect(vivaEn(m,e)).toBe(false)
 for(let e=5;e<=6;e++) expect(vivaEn(m,e)).toBe(true)
 expect(texto(5)).toContain('1930');expect(texto(6)).toContain('1949')
})
it('sitúa San Bernardino en1946 y conserva El Paraíso desde1911 (#103)', () => {
 const ms=normalizarMarcas(MARCAS,{hitos:HITOS,coords})
 const san=ms.find(m=>m.id==='san-bernardino');expect(san).toBeDefined()
 for(let e=0;e<6;e++) expect(vivaEn(san,e)).toBe(false)
 expect(vivaEn(san,6)).toBe(true)
 expect(vivaEn(ms.find(m=>m.id==='el-paraiso'),4)).toBe(true)
 expect(MARCAS.some(m=>JSON.stringify(m.nombres??m.nombre).includes('Avenida Urdaneta'))).toBe(false)
})
