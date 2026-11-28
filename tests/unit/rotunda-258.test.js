import { describe, expect, it } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { vivaEn } from '../../src/marcas.js'

const dato = id => MARCAS.find(m => m.id === id)
const FACSIMIL = 'https://web.archive.org/web/20241130142527/https://culturadigital.udp.cl/dev/wp-content/uploads/2019/06/LN_1936_04_12.pdf'

describe('cierre de #258: la transición de 1936 en La Rotunda', () => {
  it('la ficha del solar dice cuándo empezó la demolición y que no se sabe cuándo terminó', () => {
    const texto = FICHAS['solar-rotunda'].textos.find(([e]) => e === 5)[1]
    expect(texto).toMatch(/11 de abril de 1936/)
    expect(texto).toMatch(/plano/)
    const dudas = FICHAS['solar-rotunda'].dudas
    expect(dudas).toMatch(/marzo de 1936/)
    expect(dudas).toMatch(/no (consta|se sabe) cuándo terminó/)
  })

  it('la marca del solar cita el facsímil del periódico', () => {
    expect(dato('solar-rotunda').fuente).toContain(FACSIMIL)
    expect(dato('solar-rotunda').dudas).toMatch(/11-04-1936/)
  })

  it('la ficha de la cárcel avisa que siguió en pie hasta abril de 1936', () => {
    expect(FICHAS.rotunda.dudas).toMatch(/abril de 1936/)
  })

  it('no cambia ninguna vida: cárcel en 1889 y 1911, solar en 1936, plaza en 1946', () => {
    const vida = id => [1, 2, 3, 4, 5, 6].map(e => vivaEn({ muere: 0, ...dato(id) }, e))
    expect(vida('rotunda')).toEqual([false, false, true, true, false, false])
    expect(vida('solar-rotunda')).toEqual([false, false, false, false, true, false])
    expect(vida('concordia')).toEqual([false, false, false, false, false, true])
  })
})
