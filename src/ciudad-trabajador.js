/** El worker que levanta las casas (src/ciudad-pedido.js): recibe el pak y contesta con la geometría. */
import { atenderPedido } from './ciudad-pedido.js'

self.onmessage = ({ data }) => atenderPedido(data, (mensaje, transferir = []) => self.postMessage(mensaje, transferir))
