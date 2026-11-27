/** Solicita al worker los arrays de edificios; deja la construcción en la página como respaldo diferido. */
export function pedirHitos({ plano, soloSilencio = false, crearTrabajador = null, avisar = (m) => console.warn(m) }) {
  const aMano = async (motivo) => {
    if (motivo) avisar(`hitos: se construyen en el hilo de la página (${motivo})`)
    const { datosDeHitos } = await import('./hitos-pedido.js')
    return datosDeHitos(plano, soloSilencio)
  }
  if (!crearTrabajador) return aMano(null)
  return new Promise((listo, mal) => {
    let trabajador
    const respaldo = (motivo) => {
      trabajador?.terminate()
      aMano(motivo).then(listo, mal)
    }
    try { trabajador = crearTrabajador() } catch (e) { respaldo(e.message); return }
    trabajador.onmessage = ({ data }) => {
      trabajador.terminate()
      if (data.error) mal(new Error(data.error)); else listo(data.datos)
    }
    trabajador.onerror = (e) => { e.preventDefault?.(); respaldo(e.message || 'el worker no arrancó') }
    trabajador.postMessage(soloSilencio ? { plano, soloSilencio: true } : { plano })
  })
}
