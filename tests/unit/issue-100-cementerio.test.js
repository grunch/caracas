import { it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
const coords = crearCoords({ ancho:18600, alto:14800, metro:0.5, plaza:[8968.2,6839] })
const m = normalizarMarcas(MARCAS, { hitos:HITOS, coords }).find(m => m.id === 'cementerio-sur')
const texto = e => contenidoDeFicha({marca:m, ficha:FICHAS[m.id], epoca:e}).parrafos.filter(p => p.rige).map(p => p.texto).join(' ')
it('sitúa el Cementerio General del Sur dentro del plano desde 1889 (#100)', () => {
 expect(m).toBeDefined()
 for(let e=0;e<3;e++) expect(vivaEn(m,e)).toBe(false)
 for(let e=3;e<=6;e++) expect(vivaEn(m,e)).toBe(true)
 const dato=MARCAS.find(m=>m.id==='cementerio-sur')
 expect(dato.x).toBe(7100); expect(dato.y).toBe(12500)
 expect(nombreEn(m,3).nombre).toBe('Cementerio General del Sur')
 expect(texto(3)).toContain('1876')
})
