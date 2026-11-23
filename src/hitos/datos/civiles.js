/**
 * Los edificios civiles: palacios y la Universidad. Plantas: los recuadros rayados y rotulados del plano de
 * 1936; alzados: las imágenes de fuentes/imagenes cuando las hay (Casa Amarilla ~1875, fachada neogótica de
 * 1880, panorámica de ~1903). Lo demás va en `verificar`.
 */
import { casaAmarilla } from './casa-amarilla.js'
import { capitolio } from './capitolio.js'
import { palacioArzobispal } from './palacio-arzobispal.js'
import { EJE_DAMERO, rectanguloPx } from './marco.js'

const PLANO = 'Plano de Caracas de 1936'
const eje = EJE_DAMERO

const universidad = { x: 8645, y: 7192, eje } // el medio del frente norte, sobre la calle
const UNIVERSIDAD = { largo: 96, frente: 12, fondo: 44 }
const miraflores = { x: 7958, y: 6360, eje }
const MIRAFLORES = { ancho: 64, fondo: 56 } // incluye explanada, escaleras y marquesinas

export const civiles = Object.freeze([
  casaAmarilla,
  capitolio,
  palacioArzobispal,
  Object.freeze({
    id: 'universidad', nombre: 'Universidad Central (fachada neogótica)', ...universidad, nace: 3, muere: 0,
    planta: [rectanguloPx(universidad, UNIVERSIDAD.largo, UNIVERSIDAD.frente + UNIVERSIDAD.fondo, 0, (UNIVERSIDAD.frente + UNIVERSIDAD.fondo) / 2)],
    suprime: [rectanguloPx(universidad, UNIVERSIDAD.largo, UNIVERSIDAD.frente + UNIVERSIDAD.fondo, 0, (UNIVERSIDAD.frente + UNIVERSIDAD.fondo) / 2)],
    fuente: `${PLANO} (recuadro "Universidad Central", frente al Palacio Federal); foto de 1880 con la estatua de Guzmán Blanco (fuentes/imagenes)`,
    verificar: [
      'Que la fachada neogótica de la foto de 1880 sea la de la Universidad frente al Capitolio: identificación a verificar (la ficha de la foto la deja con signo de pregunta).',
      'Largo del frente y cuerpo de atrás: del recuadro del plano; los patios no se modelan.',
      'La estatua ecuestre de Guzmán Blanco de la foto no se modela: se derribó hacia 1889 (a verificar) y no cae en ninguna época.',
    ],
    partes: [
      { tipo: 'frenteNeogotico', a: 0, b: UNIVERSIDAD.frente / 2, mira: [0, -1], largo: UNIVERSIDAD.largo, fondo: UNIVERSIDAD.frente, alto: 9 },
      { tipo: 'cuerpo', a: 0, b: UNIVERSIDAD.frente + UNIVERSIDAD.fondo / 2, largo: UNIVERSIDAD.largo - 2, ancho: UNIVERSIDAD.fondo, alto: 8, techo: 'cuatro', altoTecho: 4 },
    ],
  }),
  Object.freeze({
    id: 'miraflores', nombre: 'Palacio de Miraflores', ...miraflores, nace: 4, muere: 0,
    planta: [rectanguloPx(miraflores, MIRAFLORES.ancho, MIRAFLORES.fondo)], suprime: [rectanguloPx(miraflores, MIRAFLORES.ancho, MIRAFLORES.fondo)],
    fuente: `${PLANO} (recuadro "Palacio Miraflores"); panorámica de ~1903 desde El Calvario (fuentes/imagenes); estudio aprobado en miraflores, referencias y límites en specs/08-miraflores.md`,
    verificar: [
      'Modelo procedural aprobado: cuatro accesos, patio con arcadas y fuente, mansarda central y pabellones; medidas aproximadas.',
      'Se conserva el centro y eje del hito anterior; posición fina y orientación contra levantamiento pendientes de verificar.',
      'Pendientes buhardillas, terrazas interiores, cuerpos posteriores asimétricos y ornamentación; no representa interiores transitables.',
      'La planta del plano es más irregular que el rectángulo modelado; el basamento con muro de contención lo da solo el relieve.',
      'Va desde la época de 1911; si ya estaba en pie en 1889, a verificar.',
    ],
    partes: [{ tipo: 'miraflores' }],
  }),
])
