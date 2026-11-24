/**
 * Resolución adaptable: si mientras la vista se mueve los cuadros salen lentos, se dibuja con menos píxeles
 * por punto de pantalla; cuando la vista queda quieta, el último cuadro se rehace con todos. Así un equipo que
 * no llega (una pantalla de 4K, una GPU integrada, un teléfono) se mueve fluido y, quieto, se ve nítido.
 * Lógica pura: `main.js` le cuenta cada cuadro y aplica lo que devuelve con renderer.setPixelRatio.
 */

const LENTO_MS = 30 // la mediana de la ventana por encima de esto (menos de ~33 cuadros por segundo): bajar
const RAPIDO_MS = 20 // por debajo de esto (llega a los 60 por segundo de una pantalla común): probar a subir
const ESPERA_TRAS_BAJAR = 50 // ventanas que se espera antes de volver a probar la proporción que resultó lenta
const VENTANA = 12 // cuadros seguidos que se miran antes de decidir
const PASO = 0.25

const mediana = (ms) => [...ms].sort((a, b) => a - b)[ms.length >> 1]

/**
 * `maxima`: los píxeles por punto con que se dibuja normalmente; `minima`: el piso al que se puede bajar.
 * - `cuadro(ms)`: se dibujó un cuadro `ms` después del anterior, los dos seguidos (la vista se está moviendo).
 * - `quieta()`: la vista dejó de moverse.
 * Las dos devuelven la proporción que hay que poner, o null si no cambia.
 */
export function crearResolucionAdaptable({ maxima, minima = 1 }) {
  const piso = Math.min(maxima, minima)
  let enMovimiento = maxima // con cuántos píxeles se dibuja mientras la vista se mueve
  let puesta = maxima
  let ventana = []
  let lenta = Infinity // la proporción que resultó lenta: no se vuelve a probar hasta que pase la espera
  let espera = 0
  const poner = (valor) => {
    if (valor === puesta) return null
    puesta = valor
    return valor
  }
  return {
    cuadro(ms) {
      if (puesta !== enMovimiento) { ventana = []; return poner(enMovimiento) } // venía de estar quieta, a máxima
      ventana.push(ms)
      if (ventana.length < VENTANA) return null
      const m = mediana(ventana)
      ventana = []
      if (espera > 0 && --espera === 0) lenta = Infinity
      if (m > LENTO_MS && enMovimiento > piso) {
        // (no volver a subir enseguida: iría y vendría entre las dos proporciones)
        lenta = enMovimiento
        espera = ESPERA_TRAS_BAJAR
        enMovimiento = Math.max(piso, enMovimiento - PASO)
      } else if (m < RAPIDO_MS && enMovimiento < maxima && enMovimiento + PASO < lenta) {
        enMovimiento = Math.min(maxima, enMovimiento + PASO)
      }
      return poner(enMovimiento)
    },
    quieta() {
      ventana = []
      return poner(maxima)
    },
    get enMovimiento() { return enMovimiento },
    get puesta() { return puesta },
  }
}
