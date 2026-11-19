import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { CLAVE_INTRO, TEXTO_INTRO, debeMostrarIntro, recordarIntro } from '../../src/intro.js'
import { PRIMERA_EPOCA } from '../../src/epocas.js'

const params = (consulta = '') => new URLSearchParams(consulta)
function almacenDe(inicial = {}) {
  const datos = new Map(Object.entries(inicial))
  const almacen = { getItem: (k) => (datos.has(k) ? datos.get(k) : null), setItem: (k, v) => { datos.set(k, String(v)) } }
  return Object.assign(() => almacen, { datos })
}
const roto = () => { throw new Error('SecurityError: el almacenamiento está bloqueado') }

describe('debeMostrarIntro', () => {
  it('se muestra la primera vez', () => {
    expect(debeMostrarIntro(params(), almacenDe())).toBe(true)
  })

  it('no se muestra si ya se vio', () => {
    expect(debeMostrarIntro(params(), almacenDe({ [CLAVE_INTRO]: '1' }))).toBe(false)
  })

  it('?intro la fuerza aunque ya se haya visto, y gana sobre ?sinintro', () => {
    expect(debeMostrarIntro(params('intro'), almacenDe({ [CLAVE_INTRO]: '1' }))).toBe(true)
    expect(debeMostrarIntro(params('intro&sinintro'), almacenDe())).toBe(true)
  })

  it('?sinintro y ?capture la saltean: los tests y las capturas no la ven', () => {
    expect(debeMostrarIntro(params('sinintro'), almacenDe())).toBe(false)
    expect(debeMostrarIntro(params('capture'), almacenDe())).toBe(false)
    expect(debeMostrarIntro(params('sinintro&capture&hoy'), almacenDe())).toBe(false)
  })

  it('si el almacenamiento falla (modo privado, cookies bloqueadas), se muestra', () => {
    expect(debeMostrarIntro(params(), roto)).toBe(true)
    expect(debeMostrarIntro(params(), () => ({ getItem: roto }))).toBe(true)
  })
})

describe('recordarIntro', () => {
  it('anota que se vio, y la próxima vez no se muestra', () => {
    // Arrange
    const almacen = almacenDe()
    // Act
    const pudo = recordarIntro(almacen)
    // Assert
    expect(pudo).toBe(true)
    expect(almacen.datos.get(CLAVE_INTRO)).toBe('1')
    expect(debeMostrarIntro(params(), almacen)).toBe(false)
  })

  it('si no se puede anotar (cuota llena, almacenamiento bloqueado), no rompe nada', () => {
    expect(recordarIntro(roto)).toBe(false)
    expect(recordarIntro(() => ({ setItem: roto }))).toBe(false)
  })
})

describe('TEXTO_INTRO', () => {
  const { epocas } = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '../../tools/geo/epocas/epocas.json'), 'utf8'))
  const años = epocas.slice(PRIMERA_EPOCA).map((e) => e.año)

  it('el título va del primer año al último de la línea de tiempo, y es el de la página', () => {
    expect(TEXTO_INTRO.titulo).toBe(`Caracas, de ${años[0]} a ${años.at(-1)}`)
    const pagina = readFileSync(path.resolve(import.meta.dirname, '../../index.html'), 'utf8')
    expect(pagina).toContain(`<title>${TEXTO_INTRO.titulo}</title>`)
    expect(pagina).toContain(`<meta property="og:title" content="${TEXTO_INTRO.titulo}">`)
  })

  it('nombra todos los años de la línea de tiempo, y ninguno que no se muestre', () => {
    const texto = TEXTO_INTRO.parrafos.join(' ')
    for (const año of años) expect(texto, String(año)).toContain(String(año))
    expect(texto).not.toContain(String(epocas[0].año)) // 1578 quedó fuera (T23b)
  })

  it('es breve y dice qué es reconstrucción', () => {
    expect(TEXTO_INTRO.parrafos).toHaveLength(2)
    expect(TEXTO_INTRO.parrafos.join(' ').length).toBeLessThan(700)
    expect(TEXTO_INTRO.parrafos[1]).toMatch(/reconstrucción/)
  })

  it('habla de tú (tuteo venezolano), no de vos', () => {
    const todo = Object.values(TEXTO_INTRO).flat().join(' ')
    expect(todo).toMatch(/Arrastra\b/)
    expect(todo).not.toMatch(/arrastrá|tocá|podés|acercate\b|mirá/i)
  })
})
