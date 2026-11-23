// La rejilla de colisión del modo a pie (src/a-pie.js) armada como en el visor (src/main.js y src/a-pie-modo.js): las
// casas con la vida que dejan los hitos (suprimirTechos: donde hay un hito modelado a mano, la casa genérica no nace)
// y las plantas de los hitos en pie (T33j.7b).
// La usa tools/choca-a-pie.mjs para la puerta de la fase 7 de 1772.
import { rejillaDeCasas } from '../src/a-pie.js'
import { HITOS, suprimirTechos, zonasDeSupresion } from '../src/hitos.js'
import { hitosConPlanta } from '../src/hitos/plantas.js'

export function rejillaComoElVisor(datos, epoca, aMundo) {
  return rejillaDeCasas({ ...datos, vida: suprimirTechos(datos, zonasDeSupresion(HITOS)) }, epoca, aMundo, hitosConPlanta())
}
