import { describe, test, expect } from 'vitest'
import {
  rutaSegura, archivosDelPaquete, elegirRelease, revisarListado, sumasQueNoCoinciden, etiquetaDeDatos,
  ACTIVO, MANIFIESTO,
} from '../../tools/paquete-datos-lib.mjs'

const manifiesto = {
  conteos: { techos: 3 },
  archivos: { 'public/plano/f/0/0.webp': 'bb', 'public/datos/ciudad.pak': 'aa' },
}

describe('rutaSegura', () => {
  test('acepta los archivos de public/datos, public/plano y public/fotos', () => {
    expect(rutaSegura('public/datos/ciudad.pak')).toBe(true)
    expect(rutaSegura('public/plano/f/3/1-2.webp')).toBe(true)
    expect(rutaSegura('public/fotos/m/una.webp')).toBe(true)
  })

  test('rechaza lo que sale de esas carpetas o se disfraza', () => {
    for (const r of ['../x', '/etc/passwd', 'public/datos/../../x', 'src/main.js', 'public/datos',
      'public\\datos\\x', 'public/datos/./x', 'public//datos/x', 'public/datos/x/', '', 42]) {
      expect(rutaSegura(r), String(r)).toBe(false)
    }
  })
})

describe('archivosDelPaquete', () => {
  test('los archivos del manifiesto, ordenados, más el propio manifiesto', () => {
    // Act
    const archivos = archivosDelPaquete(manifiesto)

    // Assert
    expect(archivos).toEqual(['public/datos/ciudad.pak', 'public/datos/manifiesto.json', 'public/plano/f/0/0.webp'])
  })

  test('falla nombrando la ruta si el manifiesto trae una que no es segura', () => {
    expect(() => archivosDelPaquete({ archivos: { '../fuera': 'aa' } })).toThrow('../fuera')
  })

  test('falla si no hay archivos', () => {
    expect(() => archivosDelPaquete({})).toThrow(/manifiesto/)
  })
})

describe('elegirRelease', () => {
  const activo = (url) => ({ name: ACTIVO, browser_download_url: url })

  test('el release de datos más nuevo que trae el paquete', () => {
    // Arrange: la API devuelve los releases del más nuevo al más viejo
    const releases = [
      { tag_name: 'v1.0', draft: false, assets: [activo('v')] },
      { tag_name: 'datos-2026-11-20', draft: true, assets: [activo('borrador')] },
      { tag_name: 'datos-2026-11-19', draft: false, assets: [{ name: 'otra.zip' }] },
      { tag_name: 'datos-2026-11-18', draft: false, assets: [activo('bueno')] },
      { tag_name: 'datos-2026-11-01', draft: false, assets: [activo('viejo')] },
    ]

    // Act
    const elegido = elegirRelease(releases)

    // Assert
    expect(elegido).toEqual({ etiqueta: 'datos-2026-11-18', url: 'bueno' })
  })

  test('null si no hay ninguno', () => {
    expect(elegirRelease([])).toBeNull()
    expect(elegirRelease([{ tag_name: 'v1', draft: false, assets: [activo('x')] }])).toBeNull()
  })
})

describe('revisarListado', () => {
  // líneas de `tar -tvzf` (GNU tar)
  const linea = (tipo, ruta) => `${tipo}rw-r--r-- yo/yo 1234 2026-11-19 10:00 ${ruta}`

  test('sin problemas: solo archivos regulares y carpetas dentro de public/', () => {
    const listado = [linea('d', 'public/datos/'), linea('-', 'public/datos/ciudad.pak'), linea('-', 'public/plano/f/0/0.webp')]
    expect(revisarListado(listado.join('\n'))).toEqual([])
  })

  test('señala enlaces, rutas que escapan y tipos raros', () => {
    // Arrange
    const listado = [
      linea('-', 'public/datos/ciudad.pak'),
      linea('l', 'public/datos/x -> /etc/passwd'),
      linea('-', '../fuera.js'),
      linea('h', 'public/datos/y link to public/datos/ciudad.pak'),
      linea('-', 'src/main.js'),
    ].join('\n')

    // Act
    const problemas = revisarListado(listado)

    // Assert
    expect(problemas).toHaveLength(4)
    expect(problemas.join(' ')).toMatch(/fuera\.js/)
    expect(problemas.join(' ')).toMatch(/src\/main\.js/)
  })

  test('acepta rutas con espacios', () => {
    expect(revisarListado(linea('-', 'public/fotos/una foto.webp'))).toEqual([])
  })
})

describe('sumasQueNoCoinciden', () => {
  test('nombra los archivos que faltan o cuyo sha256 no es el del manifiesto', () => {
    // Arrange
    const medidas = { 'public/datos/ciudad.pak': 'aa', 'public/plano/f/0/0.webp': 'cc' }

    // Act / Assert
    expect(sumasQueNoCoinciden(manifiesto, medidas)).toEqual(['public/plano/f/0/0.webp'])
    expect(sumasQueNoCoinciden(manifiesto, { 'public/datos/ciudad.pak': 'aa' })).toEqual(['public/plano/f/0/0.webp'])
    expect(sumasQueNoCoinciden(manifiesto, { ...medidas, 'public/plano/f/0/0.webp': 'bb' })).toEqual([])
  })
})

describe('etiquetaDeDatos', () => {
  test('la fecha (UTC) y el commit del que salen los datos', () => {
    expect(etiquetaDeDatos(new Date('2026-11-19T23:30:00Z'), 'abc1234def')).toBe('datos-2026-11-19-abc1234')
  })
})

test('el paquete y el manifiesto tienen nombre fijo', () => {
  expect(ACTIVO).toBe('datos.tar.gz')
  expect(MANIFIESTO).toBe('public/datos/manifiesto.json')
})
