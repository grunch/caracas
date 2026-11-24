/**
 * La geometría de las casas para three.js, a partir del paquete que arma src/ciudad.js (paqueteDeGeometria):
 * en la página, con lo que llega del worker, o directo cuando no hay worker.
 */
import { BufferGeometry, BufferAttribute, Sphere, Vector3 } from 'three'
import { ATRIBUTOS, extruirTechos, paqueteDeGeometria } from './ciudad.js'

export function geometriaDePaquete({ atributos, indices, esfera }) {
  const g = new BufferGeometry()
  for (const [nombre, { n, normalizado }] of Object.entries(ATRIBUTOS)) {
    g.setAttribute(nombre, new BufferAttribute(atributos[nombre], n, Boolean(normalizado)))
  }
  g.setIndex(new BufferAttribute(indices, 1))
  // la esfera ya viene calculada: recorrer millones de vértices en la página es una tarea larga
  g.boundingSphere = new Sphere(new Vector3(...esfera.centro), esfera.radio)
  return g
}

/** La ciudad entera de una vez, en este hilo (los tests, y el respaldo si no hay worker). */
export const geometriaCiudad = (datos, coords) => geometriaDePaquete(paqueteDeGeometria(extruirTechos(datos, coords)))
