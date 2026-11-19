import { crearPalacio } from './miraflores-modelo.js'
import { MAT } from './lienzo.js'

/** Convierte el modelo aprobado al lienzo común: una malla, épocas, tinta, relieve y sombras. */
export function miraflores(p) {
  const { palacio } = crearPalacio()
  palacio.updateMatrixWorld(true)
  const geometrias = new Set()
  const materiales = new Set()
  try {
    palacio.traverse(objeto => {
      if (!objeto.isMesh) return
      geometrias.add(objeto.geometry)
      materiales.add(objeto.material)
      // applyMatrix4 transforma también las normales de las piezas escaladas.
      const geometria = objeto.geometry.clone().applyMatrix4(objeto.matrixWorld)
      p.geo(geometria, {
        color: objeto.material.color.toArray(), // Three ya almacena color lineal.
        mat: MAT.LISO,
      })
    })
  } finally {
    for (const geometria of geometrias) geometria.dispose()
    for (const material of materiales) material.dispose()
  }
}
