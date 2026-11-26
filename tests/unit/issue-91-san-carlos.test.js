import { it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
const coords = crearCoords({ ancho:18600, alto:14800, metro:0.5, plaza:[8968.2,6839] })
const m = normalizarMarcas(MARCAS, { hitos:HITOS, coords }).find(m => m.id === 'san-carlos')
const texto = e => contenidoDeFicha({marca:m, ficha:FICHAS[m.id], epoca:e}).parrafos.filter(p => p.rige).map(p => p.texto).join(' ')
it('muestra el cuartel desde 1843, sin inventar obras en 1772 (#91)', () => {
 expect(vivaEn(m,0)).toBe(false); expect(vivaEn(m,1)).toBe(false)
 for(let e=2;e<=6;e++) expect(vivaEn(m,e)).toBe(true)
 expect(nombreEn(m,2).nombre).toBe('Cuartel Veterano')
 expect(nombreEn(m,3).nombre).toBe('Cuartel San Carlos')
})
it('cita la construcción documentada y el plano de 1843 (#91)', () => {
 expect(texto(2)).toMatch(/1785.*1790/)
 expect(texto(2)).toContain('Cuartel Veterano')
 expect(texto(3)).toContain('1889')
})
