/**
 * Las otras iglesias que hacen el perfil de la ciudad (panorámica de ~1903): iglesias paramétricas, más
 * sencillas que la Catedral. Cada una está donde el plano de 1936 la rotula; el origen es el pie de la
 * fachada y el eje entra en la nave. Lo que no sale del plano o de una imagen va en `verificar`.
 */
import { EJE_DAMERO, rectanguloPx } from './marco.js'
import { sanFrancisco } from './san-francisco.js'
import { santaCapilla } from './santa-capilla.js'

const [ESTE, SUR] = [EJE_DAMERO, [-EJE_DAMERO[1], EJE_DAMERO[0]]]
const NORTE_ALTO = [0.118, -0.993] // el damero de La Pastora y del Panteón, apenas menos girado (sus torres en el plano)
const PLANO = 'Plano de Caracas de 1936'
const A_OJO = 'Medidas de la planta tomadas del recuadro del plano; alturas a ojo, sin foto de frente.'

/** Arma la definición: la planta y la zona de supresión son el rectángulo de la nave. */
function iglesiaEn({ id, nombre, x, y, eje, nace, rotulo, verificar, ...medidas }) {
  const marco = { x, y, eje }
  const planta = [rectanguloPx(marco, medidas.largo, medidas.ancho, medidas.largo / 2, 0)]
  return Object.freeze({
    id, nombre, ...marco, nace, muere: 0, planta, suprime: planta,
    fuente: `${PLANO} (rótulo "${rotulo}")`, verificar: [A_OJO, ...verificar],
    partes: [{ tipo: 'iglesia', ...medidas }],
  })
}

const campanario = (lado, alto, remate) => ({ lado, cuerpos: [{ alto, vanos: 'ventana' }, { alto: lado * 0.9, vanos: 'arco' }], remate })

export const iglesias = Object.freeze([
  sanFrancisco, // el estudio por épocas: specs/08-san-francisco-por-epocas.md
  iglesiaEn({
    id: 'altagracia', nombre: 'Iglesia de Altagracia', rotulo: 'Iglesia Altagracia', x: 8742, y: 6218, eje: ESTE, nace: 1,
    largo: 56, ancho: 22, alto: 11, fachada: 'clasica', torres: { n: 1, ...campanario(5.5, 12, { tipo: 'cupula', alto: 3.2 }) },
    verificar: ['Orientación (fachada al oeste, sobre la calle de la esquina de Altagracia) leída del recuadro del plano; a verificar.', 'Desde qué época, a verificar: va desde 1772.'],
  }),
  santaCapilla, // por etapas desde 1883, con la fachada al oeste: docs/santa-capilla-integracion.md (San Mauricio, su antecesora, va al final de HITOS)
  iglesiaEn({
    id: 'santa-teresa', nombre: 'Basílica de Santa Teresa', rotulo: 'Iglesia Santa Teresa', x: 8762, y: 7775, eje: ESTE, nace: 3,
    largo: 64, ancho: 30, alto: 14, fachada: 'clasica', dosFachadas: true, cupula: { a: 32, radio: 7 },
    verificar: [
      'Iglesia blanca de cúpula junto al teatro en la foto de 1880 desde El Calvario (identificación a verificar).',
      'Dos fachadas (al este y al oeste) y cúpula al centro: de lo que se recuerda del edificio, no de una imagen de frente.',
    ],
  }),
  iglesiaEn({
    id: 'la-pastora', nombre: 'Iglesia de La Pastora', rotulo: 'Iglesia La Pastora', x: 8113, y: 4866, eje: NORTE_ALTO, nace: 1,
    largo: 40, ancho: 25, alto: 10, fachada: 'clasica', torres: { n: 2, ...campanario(5.5, 10, { tipo: 'cupula', alto: 3.2 }) },
    verificar: ['Dos torres con cúpula hacia la plaza, al sur: del plano (dos círculos) y de la foto de 1892.', 'Desde qué época, a verificar: va desde 1772.'],
  }),
])
