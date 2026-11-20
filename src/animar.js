/** Un paso de `valor` hacia `objetivo`, de a lo sumo `paso`, sin pasarse. */
export function acercar(valor, objetivo, paso) {
  return objetivo > valor ? Math.min(objetivo, valor + paso) : Math.max(objetivo, valor - paso)
}

const PASO_MAXIMO_S = 0.1 // con GPU: al volver a una pestaña dormida la animación no salta
const PASO_MAXIMO_SOFTWARE_S = 1 // dibujando la CPU (SwiftShader en CI) un cuadro tarda segundos

/**
 * Cuánto avanzan las animaciones en un cuadro que tardó `dt` segundos. Con render por software el tope
 * es más alto: si no, una animación de 1,2 s necesitaría 12 cuadros de varios segundos cada uno. El primer
 * cuadro puede llegar con una hora anterior a la del arranque: nunca se retrocede.
 */
export function pasoDeCuadro(dt, software) {
  return Math.min(Math.max(0, dt), software ? PASO_MAXIMO_SOFTWARE_S : PASO_MAXIMO_S)
}
