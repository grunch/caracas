import { describe, expect, it } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { nuevoCirco } from '../../src/hitos/datos/nuevo-circo.js'

const dato = id => MARCAS.find(m => m.id === id)

describe('cierre de #257: los dos circos', () => {
  it('la ficha del Metropolitano da 1945 como fecha mejor sustentada sin borrar la de 1942', () => {
    const dudas = FICHAS['circo-metropolitano'].dudas
    expect(dudas).toMatch(/19-04-1945/)
    expect(dudas).toMatch(/Salas/)
    expect(dudas).toMatch(/1942/)
    expect(dudas).toMatch(/sin (cotejar|consultar)/)
  })

  it('la marca del Metropolitano cita la página de FAC de 1945 y a Marín, y ya no lo da por pendiente', () => {
    const { fuente, dudas } = dato('circo-metropolitano')
    expect(fuente).toContain('https://fundaayc.com/2022/06/29/1945-deja-de-funcionar-y-es-demolido-el-circo-metropolitano-de-caracas/')
    expect(fuente).toContain('https://www.academia.edu/12565798/')
    expect(fuente).toContain('https://www.academia.edu/39601663/')
    expect(dudas).not.toMatch(/pendiente de integración/i)
  })

  it('en 1946 el texto del Metropolitano habla del solar vacío que dibuja el plano', () => {
    const textos = FICHAS['circo-metropolitano'].textos
    expect(textos.find(([e]) => e === 4)?.[1]).toMatch(/1896/)
    expect(FICHAS['circo-metropolitano'].dudas).toMatch(/plano de 1946/)
  })

  it('el Nuevo Circo de 1946 queda contrastado con el plano de 1946 y cita sus fuentes', () => {
    expect(nuevoCirco.verificar.join(' ')).not.toMatch(/1946 pendiente/)
    expect(nuevoCirco.verificar.join(' ')).toMatch(/plano de 1946/)
    expect(nuevoCirco.nace).toBe(5)
    expect(nuevoCirco.muere).toBe(0)
    const textos = FICHAS['nuevo-circo'].textos
    expect(textos.find(([e]) => e === 6)?.[1]).toMatch(/1946/)
    expect(FICHAS['nuevo-circo'].dudas).not.toMatch(/sin afirmar un levantamiento independiente/)
    expect(dato('nuevo-circo').fuente).toContain('https://archive.org/details/WCWdb_18051')
    expect(dato('nuevo-circo').fuente).toContain('https://camaradecaracas.com/')
  })

  it('la ficha del Nuevo Circo deja anotado que las fuentes difieren en el día de la inauguración', () => {
    expect(FICHAS['nuevo-circo'].dudas).toMatch(/25/)
    expect(FICHAS['nuevo-circo'].textos.find(([e]) => e === 5)?.[1]).toMatch(/26 de enero de 1919/)
  })
})
