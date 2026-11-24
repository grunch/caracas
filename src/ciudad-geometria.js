/**
 * La geometría de las casas para three.js, a partir del paquete que arma src/ciudad.js (paqueteDeGeometria):
 * en la página, con lo que llega del worker, o directo cuando no hay worker.
 */
import { BufferGeometry, BufferAttribute, Sphere, Vector3 } from 'three'
import { ATRIBUTOS, extruirTechos, paqueteDeGeometria } from './ciudad.js'

/** Para onUpload: el arreglo ya está en la GPU y three.js no lo vuelve a leer (`count` queda guardado aparte). */
function soltarArreglo() { this.array = null }

/**
 * `soltar`: que cada atributo suelte su arreglo de JS al subirlo a la GPU (la geometría queda solo allá: no
 * se puede clonar ni leer después; si el contexto de WebGL se pierde, la página se recarga).
 */
export function geometriaDePaquete({ atributos, indices, esfera }, { soltar = false } = {}) {
  const g = new BufferGeometry()
  for (const [nombre, { n, normalizado }] of Object.entries(ATRIBUTOS)) {
    g.setAttribute(nombre, new BufferAttribute(atributos[nombre], n, Boolean(normalizado)))
  }
  g.setIndex(new BufferAttribute(indices, 1))
  if (soltar) for (const atributo of [...Object.values(g.attributes), g.index]) atributo.onUpload(soltarArreglo)
  // la esfera ya viene calculada: recorrer millones de vértices en la página es una tarea larga
  g.boundingSphere = new Sphere(new Vector3(...esfera.centro), esfera.radio)
  return g
}

/** La ciudad entera de una vez, en este hilo (los tests, y el respaldo si no hay worker). */
export const geometriaCiudad = (datos, coords) => geometriaDePaquete(paqueteDeGeometria(extruirTechos(datos, coords)))
