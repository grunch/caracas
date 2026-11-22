import { crearCasaAmarilla } from './casa-amarilla-modelo.js'
import { MAT } from './lienzo.js'

/** Frente +Z del estudio → +a (este/plaza); +X → −b (norte).
 * El origen sigue siendo el centro del solar. Vida, tinta y relieve los aporta el lienzo.
 */
export function casaAmarilla(p, { anio, componente = 'todo' }) {
  const { edificio, cubiertas } = crearCasaAmarilla({ anio })
  const q = p.en(0, 0, 0, Math.PI / 2)
  const geometrias = new Set(), materiales = new Set()
  const bandera = edificio.getObjectByName('Bandera de Venezuela')
  const pertenece = (objeto, grupo) => {
    for (let padre = objeto; padre; padre = padre.parent) if (padre === grupo) return true
    return false
  }
  edificio.updateMatrixWorld(true)
  try {
    edificio.traverse(objeto => {
      if (!objeto.isMesh) return
      geometrias.add(objeto.geometry)
      materiales.add(objeto.material)
      const esCubierta = pertenece(objeto, cubiertas), esBandera = pertenece(objeto, bandera)
      if (componente === 'cuerpo' && (esCubierta || esBandera)) return
      if (componente === 'cubiertas' && !esCubierta) return
      if (componente === 'bandera' && !esBandera) return
      q.geo(objeto.geometry.clone().applyMatrix4(objeto.matrixWorld), {
        color: objeto.material.color.toArray(), mat: MAT.LISO,
      })
    })
  } finally {
    geometrias.forEach(g => g.dispose())
    materiales.forEach(m => m.dispose())
  }
}
