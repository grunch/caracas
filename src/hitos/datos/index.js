import { hijosDios } from './hijos-dios.js'
import { rotundaYConcordia } from './rotunda.js'
import { sanAgustin } from './san-agustin.js'
import { metropolitano } from './metropolitano.js'
import { cementerioSur } from './cementerio-sur.js'
import { poligonosConVida } from './fases-geometricas.js'
import { plazaBolivar } from './plaza-bolivar.js'
import { catedral } from './catedral.js'
import { iglesias } from './iglesias.js'
import { panteon } from './panteon.js'
import { silencio } from './el-silencio.js'
import { nuevoCirco } from './nuevo-circo.js'
import { civiles } from './civiles.js'
import { puentesGuaire } from './puentes-guaire.js'
import { templosParroquiales } from './templos-parroquiales.js'
import { candelaria } from './candelaria.js'
import { laMerced } from './la-merced.js'
import { sanPablo } from './san-pablo.js'
import { conventoSanFrancisco } from './convento-san-francisco.js'
import { palacioMunicipal } from './palacio-municipal.js'

/** Datos de hitos sin los constructores de geometría; lo usa el hilo principal para áreas y marcas. */
export const HITOS = Object.freeze([
  plazaBolivar, catedral, ...iglesias, panteon, ...civiles, ...silencio, nuevoCirco,
  metropolitano, ...rotundaYConcordia, sanAgustin, hijosDios, cementerioSur, ...puentesGuaire,
  ...templosParroquiales, candelaria, laMerced, sanPablo, // al final: cada hito lleva de semilla su lugar en la lista
  conventoSanFrancisco,
  palacioMunicipal,
])

/** Campos geométricos que consume el worker, sin fichas y huellas de colisión. */
export const HITOS_GEOMETRIA = Object.freeze(HITOS.map(({ id, x, y, eje, nace, muere, partes }) => ({ id, x, y, eje, nace, muere, partes })))


