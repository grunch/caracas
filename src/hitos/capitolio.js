import { crearCapitolio } from './capitolio-modelo.js'
import { MAT } from './lienzo.js'

const CUPULA = 'Cúpula del Salón Elíptico'
const PALMAS = 'Chaguaramos del patio'

/** Lleva el estudio del Convento de las Concepciones / Capitolio al lienzo común de hitos.
 * Ejes del modelo: +X este, +Y arriba, +Z sur, origen al centro de la manzana de 92 × 108 m: es el mismo
 * marco del hito (eje = EJE_DAMERO, +a este, +b sur), así que no hay giro ni desplazamiento.
 * `componente` separa lo que cambia entre 1889, 1911 y 1936 (la cúpula y los chaguaramos) del cuerpo
 * neoclásico, que se dibuja una sola vez. Vida, tinta, relieve y sombras los aporta el lienzo.
 */
export function capitolio(p, { anio, componente = 'todo' }) {
  const { edificio } = crearCapitolio({ anio, nivelDetalle: 'ciudad' })
  const cupula = edificio.getObjectByName(CUPULA), palmas = edificio.getObjectByName(PALMAS)
  // Sin estos grupos, el cuerpo se tragaría la cúpula y las palmas y quedarían duplicadas entre épocas.
  if (componente !== 'todo' && (!cupula || !palmas)) throw new Error(`capitolio: el modelo no tiene el grupo «${cupula ? PALMAS : CUPULA}»`)
  const geometrias = new Set(), materiales = new Set()
  const pertenece = (objeto, grupo) => {
    for (let padre = objeto; grupo && padre; padre = padre.parent) if (padre === grupo) return true
    return false
  }
  const entra = (objeto) => {
    if (componente === 'todo') return true
    const esCupula = pertenece(objeto, cupula), esPalma = pertenece(objeto, palmas)
    if (componente === 'cupula') return esCupula
    if (componente === 'palmas') return esPalma
    if (componente === 'cuerpo') return !esCupula && !esPalma
    throw new RangeError(`componente desconocido del Capitolio: ${componente}`)
  }
  edificio.updateMatrixWorld(true)
  try {
    edificio.traverse(objeto => {
      if (!objeto.isMesh) return
      geometrias.add(objeto.geometry)
      materiales.add(objeto.material)
      if (!entra(objeto)) return
      p.geo(objeto.geometry.clone().applyMatrix4(objeto.matrixWorld), {
        color: objeto.material.color.toArray(), // Three.js guarda el color en lineal
        mat: MAT.LISO,
      })
    })
  } finally {
    geometrias.forEach(g => g.dispose())
    materiales.forEach(m => m.dispose())
  }
}
