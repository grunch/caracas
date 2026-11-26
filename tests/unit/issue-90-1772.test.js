import { it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
const coords = crearCoords({ ancho:18600, alto:14800, metro:0.5, plaza:[8968.2,6839] })
const m = normalizarMarcas(MARCAS, { hitos:HITOS, coords }).find(m => m.id === 'las-mercedes')
const texto = e => contenidoDeFicha({marca:m, ficha:FICHAS[m.id], epoca:e}).parrafos.filter(p => p.rige).map(p => p.texto).join(' ')
it('documenta la presencia en 1772 y conserva la transición posterior (#90)', () => {
 expect(vivaEn(m,0)).toBe(false)
 for (let e=1;e<=6;e++) expect(vivaEn(m,e)).toBe(true)
 expect(m.nace).toBe(1)
})
it('ofrece una ficha histórica propia para cada etapa (#90)', () => { expect(texto(1)).toMatch(/1772/); expect(texto(2)).toMatch(/1839/) })
