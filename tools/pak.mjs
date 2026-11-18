// Escritor del contenedor .pak (el lector está en src/pak.js).
import { gzipSync, constants } from 'node:zlib'

/** partes: { nombre: { datos: TypedArray, registro: bytes por registro } } → Buffer gzip */
export function codificarPak(partes) {
  const cabecera = []
  const cuerpos = []
  for (const [nombre, { datos, registro }] of Object.entries(partes)) {
    const bytes = new Uint8Array(datos.buffer, datos.byteOffset, datos.byteLength)
    if (!(registro > 0) || bytes.length % registro !== 0) {
      throw new Error(`pak: ${nombre} mide ${bytes.length} bytes, no es múltiplo del registro ${registro}`)
    }
    cabecera.push({ nombre, bytes: bytes.length, registro })
    cuerpos.push(mezclar(bytes, registro))
  }
  const json = Buffer.from(JSON.stringify({ partes: cabecera }), 'utf8')
  const largo = Buffer.alloc(4)
  largo.writeUInt32LE(json.length, 0)
  return gzipSync(Buffer.concat([largo, json, ...cuerpos]), { level: constants.Z_BEST_COMPRESSION })
}

function mezclar(entrada, registro) {
  const cuantos = entrada.length / registro
  const salida = new Uint8Array(entrada.length)
  for (let k = 0; k < cuantos; k++) {
    for (let b = 0; b < registro; b++) salida[b * cuantos + k] = entrada[k * registro + b]
  }
  return salida
}
