import {metropolitano} from './datos/metropolitano.js'
/**
 * Las plantas y zonas de supresión de los hitos modelados a mano (src/hitos/datos), con su vida: las usa el modo a
 * pie para chocar con lo que se ve (src/a-pie.js, T33j.7b) y las puertas de las fases 4 a 7 de 1772
 * (tools/hitos-planta.mjs). Sin efectos.
 */
import { ShapeUtils, Vector2 } from 'three'
import { silencio, pixelSilencio } from './datos/el-silencio.js'
import { PLANTAS_SILENCIO } from './datos/el-silencio-plantas.js'
import { catedral } from './datos/catedral.js'
import { iglesias } from './datos/iglesias.js'
import {nuevoCirco} from './datos/nuevo-circo.js'
import { civiles } from './datos/civiles.js'
import { panteon } from './datos/panteon.js'
import { plazaBolivar } from './datos/plaza-bolivar.js'

// Triángulos de las crujías de planta baja: conservan los huecos reales y el
// retiro comercial de 2,6 m que deja las galerías abiertas al peatón.
const bloquesSilencio = silencio.filter(h => h.id.startsWith('silencio-bloque-')).map(h => ({
  ...h,
  planta: PLANTAS_SILENCIO[h.partes[0].id].comercio.flatMap(({ exterior, patios }) => {
    const puntos = [...exterior, ...patios.flat()]
    const vectores = ps => ps.map(([x,y]) => new Vector2(x,y))
    return ShapeUtils.triangulateShape(vectores(exterior), patios.map(vectores))
      .map(t => t.map(i => pixelSilencio(puntos[i])))
  }),
}))

export const hitosConPlanta = () => [catedral, ...iglesias, ...civiles, panteon, plazaBolivar, ...bloquesSilencio, nuevoCirco, metropolitano]
  .filter((h) => h.planta)
  .map(({ id, nace, muere, planta, suprime, transitable, patio }) => ({
    id, nace, muere, planta, suprime: suprime ?? [], ...(transitable ? { transitable } : {}), ...(patio ? { patio } : {}),
  }))
