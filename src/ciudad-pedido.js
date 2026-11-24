/**
 * Levantar las casas fuera del hilo de la página, por baldosas (src/baldosas.js): `pedirCiudad` reparte el
 * trabajo entre uno o más workers (src/ciudad-trabajador.js); cada uno levanta sus baldosas y las manda de a
 * una, con su geometría transferida sin copia. Con `primera` (la época con que abre el sitio), cada worker
 * hace dos pases: primero lo que se ve en esa época, después el resto.
 * Si no hay worker, o uno falla, su parte se levanta acá mismo, cediendo el hilo entre baldosa y baldosa.
 */
import { prepararCasas, extruirCasas, paqueteDeGeometria, transferiblesDe } from './ciudad.js'
import { repartirEnBaldosas, ordenarPorVida, seVeEntre } from './baldosas.js'
import { crearCoords } from './coords.js'

/**
 * Las baldosas de la parte `parte` de `de` (una de cada `de`, por cercanía a la plaza), de a una: los mensajes
 * `{ baldosa: { id, pase, paquete, tramos } }` y, al terminar cada pase, `{ finDePase }`. Una baldosa sin nada
 * que levantar en un pase no se manda.
 */
export function* partesDeCiudad({ datos, plano, primera = null, parte = 0, de = 1 }) {
  const preparado = prepararCasas(datos, crearCoords(plano))
  const mias = repartirEnBaldosas(preparado.casas).filter((_, k) => k % de === parte)
  const enLaPrimera = (t) => seVeEntre(t.nace, t.muere, primera, primera)
  const pases = primera === null ? [null] : [enLaPrimera, (t) => !enLaPrimera(t)]
  for (const [pase, quiere] of pases.entries()) {
    for (const { id, numeros } of mias) {
      const crudo = extruirCasas(preparado, { numeros, quiere })
      if (!crudo.indices.length) continue
      const { indices, tramos } = ordenarPorVida(crudo.indices, crudo.vidas)
      yield { baldosa: { id, pase, paquete: paqueteDeGeometria({ ...crudo, indices }), tramos } }
    }
    yield { finDePase: pase }
  }
}

/** Del lado del worker: atiende un pedido y contesta sus mensajes, `{ fin: true }` al terminar o `{ error }`. */
export function atenderPedido(pedido, responder) {
  try {
    for (const mensaje of partesDeCiudad(pedido)) {
      responder(mensaje, mensaje.baldosa ? transferiblesDe(mensaje.baldosa.paquete) : [])
    }
    responder({ fin: true })
  } catch (e) {
    responder({ error: e.message })
  }
}

const cederElHilo = () => new Promise((ok) => setTimeout(ok))

/**
 * Del lado de la página. `crearTrabajador()`: un worker nuevo (null: sin workers, todo en este hilo);
 * `cuantos`: entre cuántos se reparte. `alLlegar(baldosa)` recibe cada baldosa; `alTerminarPase(pase)` avisa
 * cuando todas las partes terminaron ese pase. La promesa se cumple cuando llegó la ciudad entera y falla si
 * los datos no sirven. `avisar` recibe el motivo cuando una parte se levanta en este hilo.
 */
export function pedirCiudad({
  datos, plano, primera = null, cuantos = 1, crearTrabajador = null,
  alLlegar, alTerminarPase = () => {}, avisar = (m) => console.warn(m), ceder = cederElHilo,
}) {
  const de = crearTrabajador ? Math.max(1, cuantos) : 1
  const terminaron = new Map() // pase → cuántas partes lo terminaron
  const finDePase = (pase) => {
    terminaron.set(pase, (terminaron.get(pase) ?? 0) + 1)
    if (terminaron.get(pase) === de) alTerminarPase(pase)
  }

  function unaParte(parte) {
    const pedido = { datos, plano, primera, parte, de }
    const llegaron = new Set() // lo que esta parte ya entregó: si el worker se cae a medias, no se repite
    const pasesHechos = new Set()
    const recibir = (mensaje) => {
      if (mensaje.baldosa) {
        const clave = `${mensaje.baldosa.id}|${mensaje.baldosa.pase}`
        if (!llegaron.has(clave)) { llegaron.add(clave); alLlegar(mensaje.baldosa) }
      } else if (mensaje.finDePase !== undefined && !pasesHechos.has(mensaje.finDePase)) {
        pasesHechos.add(mensaje.finDePase)
        finDePase(mensaje.finDePase)
      }
    }
    const aMano = async (motivo) => {
      if (motivo) avisar(`ciudad: las casas se levantan en el hilo de la página (${motivo})`)
      for (const mensaje of partesDeCiudad(pedido)) {
        recibir(mensaje)
        await ceder() // entre baldosa y baldosa, la página atiende a quien la toca
      }
    }
    if (!crearTrabajador) return aMano(null)
    return new Promise((listo, mal) => {
      let trabajador
      const respaldo = (motivo) => {
        trabajador?.terminate()
        aMano(motivo).then(listo, mal)
      }
      try {
        trabajador = crearTrabajador()
      } catch (e) {
        respaldo(e.message)
        return
      }
      trabajador.onmessage = ({ data }) => {
        if (data.fin) { trabajador.terminate(); listo() }
        // un error del worker al levantar es de los datos: en este hilo fallaría igual
        else if (data.error) { trabajador.terminate(); mal(new Error(data.error)) }
        else recibir(data)
      }
      // el worker no cargó o se cayó (un navegador sin workers de módulo, una política que los bloquea)
      trabajador.onerror = (e) => { e.preventDefault?.(); respaldo(e.message || 'el worker no arrancó') }
      trabajador.postMessage(pedido)
    })
  }
  return Promise.all(Array.from({ length: de }, (_, parte) => unaParte(parte))).then(() => {})
}
