/**
 * Lector del contenedor .pak (ver specs/02): u32 LE n · cabecera JSON de n bytes ·
 * partes con "byte shuffle" por registro. Recibe el buffer YA descomprimido.
 */
/**
 * `avisar` recibe un mensaje por cada parte que el visor no conoce: se saltea en vez de fallar, para que
 * datos generados por una versión más nueva del pipeline no dejen al visor sin ciudad.
 */
export function decodificarPak(buffer, tipos, avisar = (m) => console.warn(m)) {
  if (buffer.byteLength < 4) throw new Error('pak: buffer truncado (sin cabecera)')
  const n = new DataView(buffer).getUint32(0, true)
  if (4 + n > buffer.byteLength) throw new Error('pak: buffer truncado (cabecera incompleta)')
  const { partes } = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, n)))
  const salida = {}
  let desde = 4 + n
  for (const { nombre, bytes, registro } of partes) {
    const Tipo = tipos[nombre]
    if (!Tipo) {
      if (desde + bytes > buffer.byteLength) throw new Error(`pak: buffer truncado en la parte ${nombre}`)
      avisar(`pak: se saltea la parte "${nombre}", que este visor no conoce`)
      desde += bytes
      continue
    }
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

/** Descarga y decodifica un .pak gzip en el navegador. `pedir(url)`: con qué se pide (por omisión, fetch). */
export async function cargarPak(url, tipos, pedir = (u) => fetch(u)) {
  if (typeof DecompressionStream !== 'function') throw new Error('sin DecompressionStream')
  const r = await pedir(url)
  if (!r.ok) throw new Error(`${url}: ${r.status}`)
  const crudo = await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
  return decodificarPak(crudo, tipos)
}
