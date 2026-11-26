import { it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
const coords = crearCoords({ ancho:18600, alto:14800, metro:0.5, plaza:[8968.2,6839] })
const m = normalizarMarcas(MARCAS, { hitos:HITOS, coords }).find(m => m.id === 'hospital-vargas')
const texto = e => contenidoDeFicha({marca:m, ficha:FICHAS[m.id], epoca:e}).parrafos.filter(p => p.rige).map(p => p.texto).join(' ')
it('distingue el hospital en obras de su funcionamiento posterior (#92)', () => {
 expect(vivaEn(m,2)).toBe(false);expect(vivaEn(m,3)).toBe(true)
 expect(nombreEn(m,3).nombre).toBe('Hospital Vargas (en construcción)')
 for(let e=4;e<=6;e++) {expect(nombreEn(m,e).nombre).toBe('Hospital Vargas');expect(texto(e)).toContain('1891')}
 expect(texto(3)).toContain('1888');expect(texto(3)).toContain('43')
})
