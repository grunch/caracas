/**
 * Las plantas y zonas de supresión de los hitos modelados a mano (src/hitos/datos), con su vida: las usa el modo a
 * pie para chocar con lo que se ve (src/a-pie.js, T33j.7b) y las puertas de las fases 4 a 7 de 1772
 * (tools/hitos-planta.mjs). Sin efectos.
 */
import { catedral } from './datos/catedral.js'
import { iglesias } from './datos/iglesias.js'
import { civiles } from './datos/civiles.js'
import { panteon } from './datos/panteon.js'
import { plazaBolivar } from './datos/plaza-bolivar.js'

export const hitosConPlanta = () => [catedral, ...iglesias, ...civiles, panteon, plazaBolivar]
  .filter((h) => h.planta)
  .map(({ id, nace, muere, planta, suprime, transitable }) => ({ id, nace, muere, planta, suprime: suprime ?? [], ...(transitable ? { transitable } : {}) }))
