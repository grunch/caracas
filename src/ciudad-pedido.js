/**
 * Levantar las casas fuera del hilo de la página: `pedirCiudad` manda el pak a un worker
 * (src/ciudad-trabajador.js), que contesta con el paquete de geometría (src/ciudad.js) transferido sin copia.
 * Si no hay worker, o falla, las levanta acá mismo: la página se congela unos segundos, como antes, pero la
 * ciudad llega.
 */
import { extruirTechos, paqueteDeGeometria, transferiblesDe } from './ciudad.js'
import { crearCoords } from './coords.js'

/** El paquete de la ciudad entera, en este hilo. */
export const paqueteDeCiudad = (datos, plano) => paqueteDeGeometria(extruirTechos(datos, crearCoords(plano)))

/** Del lado del worker: atiende un pedido `{ datos, plano }` y contesta `{ paquete }` o `{ error }`. */
export function atenderPedido({ datos, plano }, responder) {
  try {
    const paquete = paqueteDeCiudad(datos, plano)
    responder({ paquete }, transferiblesDe(paquete))
  } catch (e) {
    responder({ error: e.message })
  }
}

/**
 * Del lado de la página: el paquete de la ciudad, por el worker que da `crearTrabajador()` (null: sin worker).
 * `avisar` recibe el motivo cuando hay que levantarla en este hilo.
 */
export function pedirCiudad({ datos, plano, crearTrabajador = null, avisar = (m) => console.warn(m) }) {
  const aMano = (motivo) => {
    if (motivo) avisar(`ciudad: las casas se levantan en el hilo de la página (${motivo})`)
    return paqueteDeCiudad(datos, plano)
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
      // un error del worker al levantar es de los datos: en este hilo fallaría igual
      if (data.error) mal(new Error(data.error)); else listo(data.paquete)
    }
    // el worker no cargó o se cayó (un navegador sin workers de módulo, una política que los bloquea)
    trabajador.onerror = (e) => { e.preventDefault?.(); respaldo(e.message || 'el worker no arrancó') }
    trabajador.postMessage({ datos, plano })
  })
}
