import { describe, expect, it } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { nuevoCirco } from '../../src/hitos/datos/nuevo-circo.js'

const dato = id => MARCAS.find(m => m.id === id)

describe('cierre de #257: los dos circos', () => {
  it('la ficha del Metropolitano anota 1945 y 1942 y dice que Marín, Salas y Cilento van de segunda mano', () => {
    const dudas = FICHAS['circo-metropolitano'].dudas
    expect(dudas).toMatch(/19-04-1945/)
    expect(dudas).toMatch(/Salas/)
    expect(dudas).toMatch(/1942/)
    expect(dudas).toMatch(/segunda mano/)
    expect(dudas).toMatch(/ni Marín, ni Salas, ni Cilento se leyeron/)
    expect(dudas).not.toMatch(/mejor sustentada/)
    expect(dudas).toMatch(/no es una fecha comprobada/)
  })

  it('la marca del Metropolitano cita la página de FAC de 1945 y a Marín, y ya no lo da por pendiente', () => {
    const { fuente, dudas } = dato('circo-metropolitano')
    expect(fuente).toContain('https://fundaayc.com/2022/06/29/1945-deja-de-funcionar-y-es-demolido-el-circo-metropolitano-de-caracas/')
    expect(fuente).toContain('https://www.academia.edu/12565798/')
    expect(fuente).toContain('https://www.academia.edu/39601663/')
    expect(dudas).not.toMatch(/pendiente de integración/i)
    expect(fuente).toMatch(/segunda mano/)
    expect(dudas).toMatch(/segunda mano/)
  })

  it('el Metropolitano no tiene texto de 1946 (ya no existe); el solar vacío del plano va en sus dudas', () => {
    const textos = FICHAS['circo-metropolitano'].textos
    expect(textos.find(([e]) => e === 4)?.[1]).toMatch(/1896/)
    expect(textos.find(([e]) => e === 6)).toBeUndefined()
    expect(dato('circo-metropolitano').muere).toBe(6)
    expect(FICHAS['circo-metropolitano'].dudas).toMatch(/a ojo, el plano de 1946 dibuja vacío el solar/)
  })

  it('el Nuevo Circo de 1946 queda contrastado con el plano de 1946 y cita sus fuentes', () => {
    expect(nuevoCirco.verificar.join(' ')).not.toMatch(/1946 pendiente/)
    expect(nuevoCirco.verificar.join(' ')).toMatch(/plano de 1946/)
    // lo que mide la guía: el centro cabe en el error del calce; los diámetros solo solapan en parte
    expect(nuevoCirco.verificar.join(' ')).toMatch(/91 a 98 m frente a 88–94 m/)
    expect(nuevoCirco.verificar.join(' ')).toMatch(/solapan solo en parte/)
    expect(nuevoCirco.nace).toBe(5)
    expect(nuevoCirco.muere).toBe(0)
    const textos = FICHAS['nuevo-circo'].textos
    expect(textos.find(([e]) => e === 6)?.[1]).toMatch(/1946/)
    expect(textos.find(([e]) => e === 6)?.[1]).toMatch(/a ojo/)
    expect(textos.find(([e]) => e === 6)?.[1]).toMatch(/No dibuja el cuerpo en cuña del sureste/)
    expect(textos.find(([e]) => e === 6)?.[1]).not.toMatch(/el mismo solar y con la misma portada/)
    expect(FICHAS['nuevo-circo'].dudas).not.toMatch(/sin afirmar un levantamiento independiente/)
    expect(dato('nuevo-circo').fuente).toContain('https://archive.org/details/WCWdb_18051')
    expect(dato('nuevo-circo').fuente).toContain('https://camaradecaracas.com/')
  })

  it('la ficha del Nuevo Circo deja anotado que las fuentes difieren en el día de la inauguración', () => {
    expect(FICHAS['nuevo-circo'].dudas).toMatch(/25/)
    expect(FICHAS['nuevo-circo'].textos.find(([e]) => e === 5)?.[1]).toMatch(/26 de enero de 1919/)
  })
})
