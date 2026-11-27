import { BufferAttribute, BufferGeometry, Mesh } from 'three'
import { crearMaterialHitos, crearMaterialSombraHitos } from './material.js'

function geometriaHitos({ posiciones, normales, colores, hitos, vidas, anclas, uvs, indices }) {
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(posiciones, 3))
  g.setAttribute('normal', new BufferAttribute(normales, 3))
  g.setAttribute('aColor', new BufferAttribute(colores, 3))
  g.setAttribute('aHito', new BufferAttribute(hitos, 4))
  g.setAttribute('aVida', new BufferAttribute(vidas, 2))
  g.setAttribute('aAncla', new BufferAttribute(anclas, 4))
  g.setAttribute('aUv', new BufferAttribute(uvs, 2))
  g.setIndex(new BufferAttribute(indices, 1))
  g.computeBoundingSphere()
  return g
}

/** Crea la malla de los arrays recibidos del worker, sin cargar los constructores geométricos. */
export function crearMallaHitos({ datos, U }) {
  const malla = new Mesh(geometriaHitos(datos), crearMaterialHitos({ U }))
  malla.customDepthMaterial = crearMaterialSombraHitos(malla.material)
  malla.castShadow = true
  malla.frustumCulled = false
  malla.name = 'hitos'
  malla.userData.rangos = datos.rangos
  return malla
}
