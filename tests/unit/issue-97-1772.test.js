import { it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
const coords = crearCoords({ ancho:18600, alto:14800, metro:0.5, plaza:[8968.2,6839] })
const m = normalizarMarcas(MARCAS, { hitos:HITOS, coords }).find(m => m.id === 'teatro-municipal')
const texto = e => contenidoDeFicha({marca:m, ficha:FICHAS[m.id], epoca:e}).parrafos.filter(p => p.rige).map(p => p.texto).join(' ')
it('documenta la presencia en 1772 y conserva la transición posterior (#97)', () => {
 expect(vivaEn(m,0)).toBe(false)
 for (let e=1;e<=6;e++) expect(vivaEn(m,e)).toBe(true)
 expect(nombreEn(m,1).nombre).toBe('Iglesia y plaza de San Pablo'); expect(nombreEn(m,2).nombre).toBe('Iglesia y plaza de San Pablo'); expect(nombreEn(m,3).nombre).toBe('Teatro Municipal'); expect(HITOS.find(h => h.id === 'teatro-municipal').nace).toBe(3)
})
it('ofrece una ficha histórica propia para cada etapa (#97)', () => { expect(texto(1)).toMatch(/colonial/); expect(texto(3)).toMatch(/1876/) })
