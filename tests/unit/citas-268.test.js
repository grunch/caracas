// Citas de la Plaza Bolívar y de la Trinidad / Panteón, según la matriz de docs/issue-268-trinidad-plaza.md.
import { describe, it, expect } from 'vitest'
import { MARCAS } from '../../src/marcas-datos.js'
import { FICHAS } from '../../src/fichas-datos.js'
import { plazaBolivar } from '../../src/hitos/datos/plaza-bolivar.js'
import { panteon } from '../../src/hitos/datos/panteon.js'

const marca = (id) => MARCAS.find((m) => m.id === id)
const textoDe = (id, epoca) => FICHAS[id].textos.find(([e]) => e === epoca)[1]

describe('la estatua ecuestre de la Plaza Bolívar', () => {
  it('la ficha de 1889 da la fecha documentada de la inauguración, no la de las fotos', () => {
    const texto = textoDe('plaza-bolivar', 3)

    expect(texto).toMatch(/inaugurada el 7 de noviembre de 1874/)
    expect(texto).not.toMatch(/las fotos fechan/)
  })

  it('la marca cita la página 13 de Landaeta Rosales, la de la inauguración', () => {
    expect(marca('plaza-bolivar').fuente).toMatch(/Landaeta Rosales[^;]*pp\. 12 y 13/)
  })

  it('el hito da el decreto y la inauguración con su fuente, y deja a verificar solo el retiro del mercado', () => {
    const notas = plazaBolivar.verificar.join(' ')

    expect(notas).toMatch(/18 de noviembre de 1872/)
    expect(notas).toMatch(/7 de noviembre de 1874/)
    expect(notas).toMatch(/Landaeta Rosales[^.]*p\. 13/)
    expect(notas).not.toMatch(/la estatua se puso en 1874 \(fechas de las fotos/)
    expect(plazaBolivar.verificar.find((n) => /hacia 1865/.test(n))).toMatch(/a verificar/)
  })
})

describe('la plaza en 1772', () => {
  it('la marca declara que el plano de 1772 no rotula la plaza', () => {
    const dudas = marca('plaza-bolivar').dudas

    expect(dudas).toMatch(/plano de 1772 no rotula la plaza/)
    expect(dudas).toMatch(/de Catedral/)
  })

  it('el hito menciona lo que el plano de 1772 dibuja, en vez de decir que no hay imagen', () => {
    const notas = plazaBolivar.verificar.join(' ')

    expect(notas).not.toMatch(/no hay imagen de 1772/)
    expect(notas).toMatch(/no hay vista de 1772/)
    expect(notas).toMatch(/sin leyenda que los explique/)
  })
})

describe('la apertura de la Trinidad', () => {
  it.each([
    ['la marca', () => marca('panteon').dudas],
    ['el hito', () => panteon.verificar.join(' ')],
  ])('%s da las dos fechas, 1781 y 1783, sin elegir una', (_, leer) => {
    const texto = leer()

    expect(texto).toMatch(/1781 según unas fuentes/)
    expect(texto).toMatch(/bendecida en 1783 según otras/)
  })

  it('la marca cita las tres fuentes de esas fechas', () => {
    const { fuente } = marca('panteon')

    expect(fuente).toContain('https://fundaayc.com/2019/12/15/algo-mas-sobre-la-postal-no-191/')
    expect(fuente).toContain('https://iamvenezuela.com/2016/05/panteon-nacional/')
    expect(fuente).toContain('https://camaradecaracas.com/la-camara-caracas-y-sus-historias/cronicas-de-la-ciudad/biografia-del-panteon-nacional/')
  })
})

describe('la fecha de la foto de Lessmann del Panteón', () => {
  it.each([
    ['la marca', () => marca('panteon').fuente],
    ['el hito', () => panteon.fuente],
  ])('%s la cita como la da El Archivo, «ca. 1885», y no con un rango', (_, leer) => {
    const fuente = leer()

    expect(fuente).toMatch(/Lessmann[^;]*ca\. 1885/)
    expect(fuente).not.toMatch(/1885–1900/)
  })
})
