/** El worker que construye los hitos (src/hitos-pedido.js). */
import { atenderHitos } from './hitos-pedido.js'

self.onmessage = ({ data }) => atenderHitos(data, (mensaje, transferir = []) => self.postMessage(mensaje, transferir))
