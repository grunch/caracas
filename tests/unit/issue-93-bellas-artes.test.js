import { it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { HITOS } from '../../src/hitos.js'
import { normalizarMarcas, nombreEn, vivaEn } from '../../src/marcas.js'
import { contenidoDeFicha } from '../../src/fichas.js'
import { crearCoords } from '../../src/coords.js'
const coords = crearCoords({ ancho:18600, alto:14800, metro:0.5, plaza:[8968.2,6839] })
const m = normalizarMarcas(MARCAS, { hitos:HITOS, coords }).find(m => m.id === 'bellas-artes')
const texto = e => contenidoDeFicha({marca:m, ficha:FICHAS[m.id], epoca:e}).parrafos.filter(p => p.rige).map(p => p.texto).join(' ')
it('conserva la sede dibujada en 1936 sin darla por inaugurada (#93)', () => {
 expect(vivaEn(m,4)).toBe(false);expect(vivaEn(m,5)).toBe(true)
 expect(nombreEn(m,5).nombre).toBe('Museo de Bellas Artes (sin inaugurar)')
 expect(nombreEn(m,6).nombre).toBe('Museo de Bellas Artes')
 expect(texto(5)).toContain('1936');expect(texto(5)).toContain('1938')
 expect(texto(6)).toContain('20 de febrero de 1938')
})
