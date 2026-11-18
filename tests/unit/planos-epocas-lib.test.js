import { describe, test, expect } from 'vitest'
import { nivelesEpoca, indicePlanos, salidasPlanosEpocas, PAPEL, rellenarTransparente } from '../../tools/planos-epocas-lib.mjs'

describe('nivelesEpoca', () => {
  test('chico y medio siempre; grande (8192) solo si el recorte es más grande que eso', () => {
    expect(nivelesEpoca(13498, 10582)).toEqual([
      { archivo: 'chico.webp', lado: 2048 }, { archivo: 'medio.webp', lado: 4096 }, { archivo: 'grande.webp', lado: 8192 },
    ])
    expect(nivelesEpoca(5547, 4890).map((n) => n.archivo)).toEqual(['chico.webp', 'medio.webp'])
  })

  test('un recorte chico se queda con chico (no se agranda)', () => {
    expect(nivelesEpoca(1500, 900).map((n) => n.archivo)).toEqual(['chico.webp'])
  })

  test('rechaza medidas inválidas', () => {
    expect(() => nivelesEpoca(0, 10)).toThrow(/medidas/)
  })
})

const calzados = [
  { año: 1843, plano: '1843-jesurun', recorte: [6114, 4265, 11661, 9155] },
  { año: 1772, plano: '1772-exato', recorte: [6526, 4130, 11505, 9702] },
]

describe('indicePlanos', () => {
  test('una entrada por año, ordenadas, con el recorte y las texturas que se generan', () => {
    const i = indicePlanos(calzados)
    expect(i.planos.map((p) => p.año)).toEqual([1772, 1843])
    expect(i.planos[1]).toEqual({
      año: 1843, plano: '1843-jesurun', recorte: [6114, 4265, 11661, 9155],
      niveles: [{ url: 'plano/1843/chico.webp', lado: 2048 }, { url: 'plano/1843/medio.webp', lado: 4096 }],
    })
  })

  test('sin planos calzados, el índice queda vacío (el visor sigue con 1936)', () => {
    expect(indicePlanos([])).toEqual({ planos: [] })
  })

  test('un recorte inválido es un error claro', () => {
    expect(() => indicePlanos([{ año: 1800, plano: 'x', recorte: [10, 10, 5, 20] }])).toThrow(/1800/)
  })
})

describe('salidasPlanosEpocas', () => {
  test('el índice y las texturas de cada año, en public/', () => {
    expect(salidasPlanosEpocas(calzados)).toEqual([
      'public/plano/epocas.json',
      'public/plano/1772/chico.webp', 'public/plano/1772/medio.webp',
      'public/plano/1843/chico.webp', 'public/plano/1843/medio.webp',
    ])
  })
})

test('el papel de relleno bajo el alfa es un color claro (no deja borde negro al filtrar)', () => {
  expect(PAPEL.r + PAPEL.g + PAPEL.b).toBeGreaterThan(600)
})

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { leerCalzados } from '../../tools/planos-epocas.mjs'

describe('leerCalzados', () => {
  test('lee el calzado.json de cada carpeta de año; ignora las que no tienen calce y las que no son años', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'calzados-'))
    try {
      for (const c of ['1843', '1578', '1936', 'epocas']) await mkdir(path.join(dir, c))
      await writeFile(path.join(dir, '1843', 'calzado.json'), JSON.stringify(calzados[0]))
      await writeFile(path.join(dir, 'epocas', 'calzado.json'), '{}')
      expect(await leerCalzados(dir)).toEqual([calzados[0]])
    } finally {
      await rm(dir, { recursive: true })
    }
  })

  test('sin carpeta de derivados, ninguno', async () => {
    expect(await leerCalzados('/no/existe')).toEqual([])
  })
})

describe('rellenarTransparente', () => {
  test('pone papel en el RGB de los píxeles con alfa 0 y deja intactos los demás (sin mutar la entrada)', () => {
    const rgba = new Uint8Array([10, 20, 30, 255, 0, 0, 0, 0, 50, 60, 70, 128])
    const r = rellenarTransparente(rgba)
    expect([...r]).toEqual([10, 20, 30, 255, PAPEL.r, PAPEL.g, PAPEL.b, 0, 50, 60, 70, 128])
    expect([...rgba.slice(4, 8)]).toEqual([0, 0, 0, 0])
  })
})
