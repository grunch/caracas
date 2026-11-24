/**
 * Una máscara del plano (la de suelo, la de rótulos) en dos tamaños: la chica, de 2048, mientras alcanza el
 * plano chico, y la completa cuando la vista se acerca (src/plano-niveles.js). Lo que está puesto y lo que
 * está pedido se llevan por separado: una chica que llega cuando ya se pidió la completa se pone igual, porque
 * hasta que la completa llegue (o si falla) es lo único que hay; solo se descarta si la completa ya está puesta.
 */
const TAMAÑOS = Object.freeze({ chica: 1, completa: 2 })

/**
 * `cargar(url)`: la promesa de la textura; `poner(textura)`: la pone en su uniforme. `pedir()` pide la del
 * tamaño de ahora, una sola vez (si falla, se puede volver a pedir); `mejorar()` pasa a la completa y, si
 * alguien ya había pedido la máscara, la pide.
 */
export function crearMascara({ nombre, chica, completa, cargar, poner, avisar = (m) => console.warn(m) }) {
  const url = { chica, completa }
  const pedida = { chica: null, completa: null }
  let quiere = 'chica'
  let puesta = 0
  function pedir() {
    const tamaño = quiere
    pedida[tamaño] ??= cargar(url[tamaño]).then((textura) => {
      if (TAMAÑOS[tamaño] > puesta) { puesta = TAMAÑOS[tamaño]; poner(textura) } else textura.dispose?.()
    }).catch((e) => {
      pedida[tamaño] = null
      avisar(`${nombre}: ${e.message}`)
    })
  }
  return {
    pedir,
    mejorar() {
      if (quiere === 'completa') return
      quiere = 'completa'
      if (pedida.chica || puesta) pedir()
    },
  }
}
