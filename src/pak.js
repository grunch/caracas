/**
 * Lector del contenedor .pak (ver specs/02): u32 LE n · cabecera JSON de n bytes ·
 * partes con "byte shuffle" por registro. Recibe el buffer YA descomprimido.
 */
export function decodificarPak(buffer, tipos) {
  if (buffer.byteLength < 4) throw new Error('pak: buffer truncado (sin cabecera)')
  const n = new DataView(buffer).getUint32(0, true)
  if (4 + n > buffer.byteLength) throw new Error('pak: buffer truncado (cabecera incompleta)')
  const { partes } = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, n)))
  const salida = {}
  let desde = 4 + n
  for (const { nombre, bytes, registro } of partes) {
    const Tipo = tipos[nombre]
    if (!Tipo) throw new Error(`pak: parte sin tipo conocido: ${nombre}`)
    if (!(registro > 0) || bytes % registro !== 0 || bytes % Tipo.BYTES_PER_ELEMENT !== 0) {
      throw new Error(`pak: ${nombre} tiene un registro inválido (${bytes} bytes, registro ${registro})`)
    }
    if (desde + bytes > buffer.byteLength) throw new Error(`pak: buffer truncado en la parte ${nombre}`)
    salida[nombre] = new Tipo(desordenar(new Uint8Array(buffer, desde, bytes), registro).buffer)
    desde += bytes
  }
  return salida
}

/** Deshace el shuffle: en el archivo van todos los bytes 0 de cada registro, luego los 1… */
function desordenar(entrada, registro) {
  const cuantos = entrada.length / registro
  const salida = new Uint8Array(entrada.length)
  for (let b = 0; b < registro; b++) {
    const base = b * cuantos
    for (let k = 0; k < cuantos; k++) salida[k * registro + b] = entrada[base + k]
  }
  return salida
}

/** Descarga y decodifica un .pak gzip en el navegador. */
export async function cargarPak(url, tipos) {
  if (typeof DecompressionStream !== 'function') throw new Error('sin DecompressionStream')
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  const crudo = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  return decodificarPak(crudo, tipos)
}
