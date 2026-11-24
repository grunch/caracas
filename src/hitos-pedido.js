/**
 * Construir los hitos fuera del hilo de la página: son decenas de edificios modelados pieza por pieza y arman
 * casi un millón de vértices, lo que al arrancar congelaba la página más de un segundo y medio.
 * `pedirHitos` se lo pide a un worker (src/hitos-trabajador.js), que contesta los arrays de construirHitos
 * transferidos sin copia. Si no hay worker, o falla, se construyen acá.
 */
import { HITOS, construirHitos } from './hitos.js'
import { crearCoords } from './coords.js'

/** Los arrays de los hitos, en este hilo. */
export const datosDeHitos = (plano) => construirHitos(HITOS, crearCoords(plano))

/** Los búferes de los arrays tipados de unos datos, para transferirlos. */
const transferibles = (datos) => Object.values(datos).filter((v) => ArrayBuffer.isView(v)).map((v) => v.buffer)

/** Del lado del worker: contesta `{ datos }` o `{ error }`. */
export function atenderHitos({ plano }, responder) {
  try {
    const datos = datosDeHitos(plano)
    responder({ datos }, transferibles(datos))
  } catch (e) {
    responder({ error: e.message })
  }
}

/** Del lado de la página: la promesa de los arrays de los hitos. `crearTrabajador()`: un worker nuevo, o null. */
export function pedirHitos({ plano, crearTrabajador = null, avisar = (m) => console.warn(m) }) {
  const aMano = (motivo) => {
    if (motivo) avisar(`hitos: se construyen en el hilo de la página (${motivo})`)
    return datosDeHitos(plano)
  }
  if (!crearTrabajador) return Promise.resolve().then(() => aMano(null))
  return new Promise((listo, mal) => {
    let trabajador
    const respaldo = (motivo) => {
      trabajador?.terminate()
      try { listo(aMano(motivo)) } catch (e) { mal(e) }
    }
    try {
      trabajador = crearTrabajador()
    } catch (e) {
      respaldo(e.message)
      return
    }
    trabajador.onmessage = ({ data }) => {
      trabajador.terminate()
      if (data.error) mal(new Error(data.error)); else listo(data.datos)
    }
    trabajador.onerror = (e) => { e.preventDefault?.(); respaldo(e.message || 'el worker no arrancó') }
    trabajador.postMessage({ plano })
  })
}
