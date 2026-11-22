// Las plantas y zonas de supresión de los hitos modelados a mano (src/hitos/datos), con su vida, en JSON: las lee
// la puerta de la fase 4 de 1772 (tools/geo/cierre_fase4.py) para medir los dobles edificios. Sin efectos.
import { catedral } from '../src/hitos/datos/catedral.js'
import { iglesias } from '../src/hitos/datos/iglesias.js'
import { civiles } from '../src/hitos/datos/civiles.js'
import { panteon } from '../src/hitos/datos/panteon.js'
import { plazaBolivar } from '../src/hitos/datos/plaza-bolivar.js'

export const hitosConPlanta = () => [catedral, ...iglesias, ...civiles, panteon, plazaBolivar]
  .filter((h) => h.planta)
  .map(({ id, nace, muere, planta, suprime }) => ({ id, nace, muere, planta, suprime: suprime ?? [] }))

if (import.meta.url === `file://${process.argv[1]}`) console.log(JSON.stringify(hitosConPlanta()))
