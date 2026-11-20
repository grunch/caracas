import { describe, test, expect } from 'vitest'
import { rutasQueGeneranDatos, cambiosQueTocanDatos, avisoDeDatos } from '../../tools/datos-al-dia-lib.mjs'
import { PASOS } from '../../tools/datos-pasos.mjs'

const PASOS_DE_PRUEBA = [
  { id: 'a', codigo: ['tools/geo/vectorizar.py', 'src/ciudad.js'], entradas: ['fuentes/derivados/1936/mosaico.json', 'tools/geo/cuadras-1772.json', 'original:1772-x'] },
  { id: 'b', codigo: [], entradas: ['public/datos/crece.json', 'package.json'] },
  { id: 'c', entradas: ['tools/geo/cuadras-1772.json'] },
]

describe('rutasQueGeneranDatos', () => {
  test('junta el código y las entradas que están en git, sin repetir y en orden', () => {
    expect(rutasQueGeneranDatos(PASOS_DE_PRUEBA)).toEqual(['package.json', 'src/ciudad.js', 'tools/geo/cuadras-1772.json', 'tools/geo/vectorizar.py'])
  })

  test('deja fuera lo generado y los escaneos originales, que no están en git', () => {
    const rutas = rutasQueGeneranDatos(PASOS_DE_PRUEBA)
    expect(rutas.some((r) => r.startsWith('fuentes/derivados/') || r.startsWith('public/') || r.startsWith('original:'))).toBe(false)
  })

  test('con los pasos reales incluye lo que cambiaron T33g y T33h', () => {
    const rutas = rutasQueGeneranDatos(PASOS)
    for (const r of ['tools/geo/vectorizar.py', 'tools/geo/huellas.py', 'tools/geo/calles_nuevas.py', 'tools/geo/calles-historicas.json', 'tools/empacar-lib.mjs']) {
      expect(rutas).toContain(r)
    }
    expect(rutas).not.toContain('src/acerca.js')
  })
})

describe('cambiosQueTocanDatos', () => {
  const generan = ['src/ciudad.js', 'tools/geo/vectorizar.py']

  test('se queda con los archivos cambiados que generan datos', () => {
    expect(cambiosQueTocanDatos(['src/acerca.js', 'tools/geo/vectorizar.py', 'README.md'], generan)).toEqual(['tools/geo/vectorizar.py'])
  })

  test('cuenta las fichas y los datos de fuentes/ que el pipeline lee al arrancar', () => {
    const cambiados = ['fuentes/imagenes/plaza/ficha.json', 'fuentes/datos/osm-hoy/ficha.json', 'fuentes/mapas/1889-bnf-mestre/ficha.json',
      'tools/geo/epocas/epocas.json', 'fuentes/CATALOGO.md', 'fuentes/mapas/1889-bnf-mestre/vista.jpg']
    expect(cambiosQueTocanDatos(cambiados, generan)).toEqual(cambiados.slice(0, 4))
  })

  test('los tests del pipeline y la documentación de fuentes/ no cuentan', () => {
    const cambiados = ['tools/geo/tests/test_huellas.py', 'fuentes/imagenes/README.md', 'fuentes/datos/README.md', 'tools/geo/epocas/README.md']
    expect(cambiosQueTocanDatos(cambiados, generan)).toEqual([])
  })
})

describe('avisoDeDatos', () => {
  test('sin cambios no hay aviso', () => {
    expect(avisoDeDatos({ etiqueta: 'datos-2026-11-20-361aa0d', cambios: [] })).toBeNull()
  })

  test('con cambios nombra el release, los archivos y qué correr', () => {
    const aviso = avisoDeDatos({ etiqueta: 'datos-2026-11-20-361aa0d', cambios: ['tools/geo/vectorizar.py', 'src/ciudad.js'] })
    expect(aviso.titulo).toBe('Los datos publicados quedaron viejos')
    expect(aviso.texto).toContain('datos-2026-11-20-361aa0d')
    expect(aviso.texto).toContain('2 archivos')
    expect(aviso.texto).toContain('npm run datos && npm run datos:publicar')
    expect(aviso.archivos).toEqual(['src/ciudad.js', 'tools/geo/vectorizar.py'])
  })

  test('un solo archivo va en singular', () => {
    expect(avisoDeDatos({ etiqueta: 'datos-x', cambios: ['src/ciudad.js'] }).texto).toContain('1 archivo que')
  })
})
