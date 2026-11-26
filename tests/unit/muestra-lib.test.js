import { describe, test, expect } from 'vitest'
import {
  cajaDeMuestra, recortarCiudad, recortarArboles, teselasEnCaja, nivelesDeMuestra, planDeMuestra, LADO_M, SUSTITUTOS,
} from '../../tools/muestra-lib.mjs'

const plano = { ancho: 18600, alto: 14800, metro: 0.5, plaza: [9000, 7000] }

describe('cajaDeMuestra', () => {
  test('1 km² alrededor de la plaza, en píxeles del plano', () => {
    expect(LADO_M).toBe(1000)
    expect(cajaDeMuestra(plano)).toEqual([8000, 6000, 10000, 8000])
  })

  test('no sale de la hoja', () => {
    expect(cajaDeMuestra({ ...plano, plaza: [300, 14700] })).toEqual([0, 13700, 1300, 14800])
  })
})

describe('recortarCiudad', () => {
  // tres techos cuadrados de 10 px: el 0 y el 2 dentro de la caja, el 1 afuera; el 2 es casa de patio
  const cuadrado = (x, y) => [x, y, x + 10, y, x + 10, y + 10, x, y + 10]
  const partes = {
    vertices: Float32Array.from([...cuadrado(100, 100), ...cuadrado(900, 900), ...cuadrado(150, 120)]),
    techos: Uint32Array.from([0, 4, 7, 11, 4, 4, 8, 22, 8, 4, 9, 33]),
    vida: Uint32Array.from([1, 2, 3]),
    historia: Uint8Array.from([16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 17, 17, 18, 18, 18, 18, 18, 18]),
    marcos: Float32Array.from([1, 0, 0, 1, 0, 5, 5, 0, 3, 0, 2, 2, 150, 120, 1, 0, 10, 10, 1, 3, 2, 2]),
    alas: Float32Array.from([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 2, 0, 0, 1, 1, 3, 0, 0, 2, 2]),
  }

  test('quedan los techos con el centro dentro de la caja, con sus vértices, su vida y su historia', () => {
    // Act
    const r = recortarCiudad(partes, [0, 0, 500, 500])

    // Assert
    expect([...r.techos]).toEqual([0, 4, 7, 11, 4, 4, 9, 33])
    expect([...r.vertices]).toEqual([...cuadrado(100, 100), ...cuadrado(150, 120)])
    expect([...r.vida]).toEqual([1, 3])
    expect([...r.historia]).toEqual([16, 16, 16, 16, 16, 16, 18, 18, 18, 18, 18, 18])
  })

  test('las paletas de los techos que quedan, para que la muestra pinte las casas nuevas', () => {
    const r = recortarCiudad({ ...partes, paletas: Uint8Array.from([23, 5, 36]) }, [0, 0, 500, 500])
    expect([...r.paletas]).toEqual([23, 36])
    expect(recortarCiudad(partes, [0, 0, 500, 500]).paletas).toBeUndefined()
  })

  test('los vuelos de los techos que quedan (T33j.6f)', () => {
    const r = recortarCiudad({ ...partes, vuelos: Uint8Array.from([30, 255, 12]) }, [0, 0, 500, 500])
    expect([...r.vuelos]).toEqual([30, 12])
    expect(recortarCiudad(partes, [0, 0, 500, 500]).vuelos).toBeUndefined()
  })

  test('los marcos de los techos que quedan, con el techo y sus alas renumerados', () => {
    const r = recortarCiudad(partes, [0, 0, 500, 500])
    // el marco del techo 2 (ahora 1) tenía las alas 2 y 3: ahora son las 0 y 1
    expect([...r.marcos]).toEqual([1, 150, 120, 1, 0, 10, 10, 1, 3, 0, 2])
    expect([...r.alas]).toEqual([2, 0, 0, 1, 1, 3, 0, 0, 2, 2])
  })

  test('sin partes opcionales, recorta lo que hay', () => {
    const r = recortarCiudad({ vertices: partes.vertices, techos: partes.techos }, [800, 800, 1000, 1000])
    expect([...r.techos]).toEqual([0, 4, 8, 22])
    expect(Object.keys(r).sort()).toEqual(['techos', 'vertices'])
  })

  test('no toca las partes originales', () => {
    const antes = [...partes.techos]
    recortarCiudad(partes, [0, 0, 500, 500])
    expect([...partes.techos]).toEqual(antes)
  })
})

describe('recortarArboles', () => {
  test('quedan los árboles (8 bytes: x, y, radio, vida en Uint16 LE) dentro de la caja', () => {
    // Arrange
    const datos = new Uint8Array(24)
    const v = new DataView(datos.buffer)
    ;[[10, 10, 5, 1], [700, 10, 6, 2], [20, 30, 7, 3]].forEach((a, k) => a.forEach((n, i) => v.setUint16(k * 8 + i * 2, n, true)))

    // Act
    const r = recortarArboles(datos, [0, 0, 100, 100])

    // Assert
    const w = new DataView(r.buffer, r.byteOffset, r.byteLength)
    expect(r.length).toBe(16)
    expect([0, 1, 2, 3].map((i) => w.getUint16(8 + i * 2, true))).toEqual([20, 30, 7, 3])
  })
})

describe('teselasEnCaja', () => {
  test('las teselas finas que tocan la caja', () => {
    const laminas = { ancho: 18600, alto: 14800, tesela: 3072, cols: 7, rows: 5 }
    expect(teselasEnCaja(laminas, [8000, 6000, 10000, 8000])).toEqual(['2-1', '3-1', '2-2', '3-2'])
  })
})

describe('nivelesDeMuestra', () => {
  test('de cada plano de época queda solo el chico', () => {
    const epocas = { planos: [{ año: 1843, niveles: [{ url: 'plano/1843/chico.webp', lado: 2048 }, { url: 'plano/1843/medio.webp', lado: 4096 }] }] }
    expect(nivelesDeMuestra(epocas)).toEqual({ planos: [{ año: 1843, niveles: [{ url: 'plano/1843/chico.webp', lado: 2048 }] }] })
  })

  test('las texturas grandes se reemplazan por las de 2048 o 4096 que ya existen', () => {
    expect(SUSTITUTOS).toEqual({
      'public/plano/medio.webp': 'public/plano/medio-4k.webp',
      'public/plano/suelo.webp': 'public/plano/suelo-2k.webp',
      'public/plano/rotulos.webp': 'public/plano/rotulos-2k.webp',
    })
  })
})

describe('planDeMuestra', () => {
  test('qué se hace con cada archivo de los datos: recortar, copiar, sustituir o dejar afuera', () => {
    // Arrange
    const archivos = [
      'public/datos/ciudad.pak', 'public/datos/arboles.bin', 'public/datos/relieve.bin', 'public/datos/crece.json',
      'public/plano/medio.webp', 'public/plano/medio-4k.webp', 'public/plano/f/2-1.webp', 'public/plano/f/0-0.webp',
      'public/plano/epocas.json', 'public/plano/1843/chico.webp', 'public/plano/1843/medio.webp', 'public/fotos/m/una.webp',
    ]

    // Act
    const plan = planDeMuestra(archivos, ['2-1'])

    // Assert
    expect(plan).toEqual([
      { destino: 'public/datos/ciudad.pak', hacer: 'recortar-ciudad', origen: 'public/datos/ciudad.pak' },
      { destino: 'public/datos/arboles.bin', hacer: 'recortar-arboles', origen: 'public/datos/arboles.bin' },
      { destino: 'public/datos/relieve.bin', hacer: 'copiar', origen: 'public/datos/relieve.bin' },
      { destino: 'public/datos/crece.json', hacer: 'copiar', origen: 'public/datos/crece.json' },
      { destino: 'public/plano/medio.webp', hacer: 'copiar', origen: 'public/plano/medio-4k.webp' },
      { destino: 'public/plano/medio-4k.webp', hacer: 'copiar', origen: 'public/plano/medio-4k.webp' },
      { destino: 'public/plano/f/2-1.webp', hacer: 'copiar', origen: 'public/plano/f/2-1.webp' },
      { destino: 'public/plano/epocas.json', hacer: 'epocas', origen: 'public/plano/epocas.json' },
      { destino: 'public/plano/1843/chico.webp', hacer: 'copiar', origen: 'public/plano/1843/chico.webp' },
      { destino: 'public/fotos/m/una.webp', hacer: 'copiar', origen: 'public/fotos/m/una.webp' },
    ])
  })

  test('el manifiesto no va en el plan: la muestra escribe el suyo', () => {
    expect(planDeMuestra(['public/datos/manifiesto.json'], [])).toEqual([])
  })
})

test('la muestra conserva el campo de crecimiento1946 necesario para entrar en la época',()=>{
  const campo='public/plano/1946/crece.png'
  expect(planDeMuestra([campo,'public/plano/1946/medio.webp'],[])).toEqual([{destino:campo,hacer:'copiar',origen:campo}])
})
