import { describe, test, expect } from 'vitest'
import { gunzipSync } from 'node:zlib'
import { codificarPak } from '../../tools/pak.mjs'
import { decodificarPak } from '../../src/pak.js'

/** ArrayBuffer propio y del tamaño exacto (el .buffer de un Buffer de Node puede ser el pool compartido). */
const descomprimir = (gz) => new Uint8Array(gunzipSync(gz)).buffer

const TIPOS = { manzanas: Float32Array, techos: Uint16Array }

describe('pak', () => {
  test('ida y vuelta conserva cada parte con su tipo', () => {
    const partes = {
      manzanas: { datos: new Float32Array([1.5, -2.25, 3, 4, 5.5, 6]), registro: 12 },
      techos: { datos: new Uint16Array([1, 2, 3, 4, 65535, 0, 7, 8]), registro: 8 },
    }
    const gz = codificarPak(partes)
    const salida = decodificarPak(descomprimir(gz), TIPOS)
    expect(Array.from(salida.manzanas)).toEqual([1.5, -2.25, 3, 4, 5.5, 6])
    expect(salida.techos).toBeInstanceOf(Uint16Array)
    expect(Array.from(salida.techos)).toEqual([1, 2, 3, 4, 65535, 0, 7, 8])
  })

  test('la cabecera describe las partes', () => {
    const gz = codificarPak({ techos: { datos: new Uint16Array(8), registro: 16 } })
    const crudo = gunzipSync(gz)
    const n = crudo.readUInt32LE(0)
    const cab = JSON.parse(crudo.subarray(4, 4 + n).toString('utf8'))
    expect(cab.partes).toEqual([{ nombre: 'techos', bytes: 16, registro: 16 }])
  })

  test('rechaza partes cuyo tamaño no es múltiplo del registro', () => {
    expect(() => codificarPak({ techos: { datos: new Uint16Array(3), registro: 4 } })).toThrow(/registro/)
  })

  test('rechaza partes sin tipo conocido al decodificar', () => {
    const gz = codificarPak({ raro: { datos: new Uint8Array(4), registro: 4 } })
    expect(() => decodificarPak(descomprimir(gz), TIPOS)).toThrow(/raro/)
  })
})

describe('pak: bytes exactos y bordes', () => {
  const crudoDe = (gz) => new Uint8Array(gunzipSync(gz)).buffer

  test('el shuffle deja los bytes como dice el spec', () => {
    const crudo = new Uint8Array(crudoDe(codificarPak({ techos: { datos: new Uint16Array([0x0201, 0x0403]), registro: 2 } })))
    expect(Array.from(crudo.slice(-4))).toEqual([0x01, 0x03, 0x02, 0x04])
  })

  test('una primera parte de tamaño impar no desalinea la siguiente', () => {
    const gz = codificarPak({ raro: { datos: new Uint8Array([9, 8, 7]), registro: 3 }, manzanas: { datos: new Float32Array([1.25]), registro: 4 } })
    const salida = decodificarPak(crudoDe(gz), { raro: Uint8Array, manzanas: Float32Array })
    expect(Array.from(salida.manzanas)).toEqual([1.25])
  })

  test('falla claro con un buffer truncado', () => {
    const crudo = crudoDe(codificarPak({ techos: { datos: new Uint16Array(8), registro: 16 } }))
    expect(() => decodificarPak(crudo.slice(0, crudo.byteLength - 4), TIPOS)).toThrow(/truncado/)
  })

  test('falla claro con un registro inválido en la cabecera', () => {
    const json = Buffer.from(JSON.stringify({ partes: [{ nombre: 'techos', bytes: 4, registro: 0 }] }))
    const b = Buffer.concat([Buffer.from(Uint32Array.of(json.length).buffer), json, Buffer.alloc(4)])
    expect(() => decodificarPak(new Uint8Array(b).buffer, TIPOS)).toThrow(/registro/)
  })
})
