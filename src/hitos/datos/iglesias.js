/**
 * Las otras iglesias que hacen el perfil de la ciudad (panorámica de ~1903): iglesias paramétricas, más
 * sencillas que la Catedral. Cada una está donde el plano de 1936 la rotula; el origen es el pie de la
 * fachada y el eje entra en la nave. Lo que no sale del plano o de una imagen va en `verificar`.
 */
import { EJE_DAMERO, rectanguloPx } from './marco.js'

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
  iglesiaEn({
    id: 'san-francisco', nombre: 'Iglesia de San Francisco', rotulo: 'Iglesia San Francisco', x: 8768, y: 7198, eje: SUR, nace: 1,
    largo: 62, ancho: 19, alto: 11, fachada: 'clasica', torres: { n: 1, ...campanario(4.6, 11, { tipo: 'chapitel', alto: 2.4 }) },
    verificar: [
      'La fachada mira al norte (la calle entre San Francisco y La Bolsa); el campanario, de un lado, a verificar con una foto.',
      'El esquema de Pimentel (1578) ya nombra San Francisco; acá va desde la época de 1772.',
    ],
  }),
  iglesiaEn({
    id: 'altagracia', nombre: 'Iglesia de Altagracia', rotulo: 'Iglesia Altagracia', x: 8742, y: 6218, eje: ESTE, nace: 1,
    largo: 56, ancho: 22, alto: 11, fachada: 'clasica', torres: { n: 1, ...campanario(5.5, 12, { tipo: 'cupula', alto: 3.2 }) },
    verificar: ['Orientación (fachada al oeste, sobre la calle de la esquina de Altagracia) leída del recuadro del plano; a verificar.', 'Desde qué época, a verificar: va desde 1772.'],
  }),
  iglesiaEn({
    id: 'santa-capilla', nombre: 'Santa Capilla', rotulo: 'Iglesia Santa Capilla', x: 8973, y: 6467, eje: SUR, nace: 3,
    largo: 50, ancho: 22, alto: 12, altoTecho: 8, fachada: 'neogotica', teja: 0x4b4f55,
    torres: { n: 1, centrada: true, lado: 6, cuerpos: [{ alto: 21, vanos: 'ventana' }, { alto: 7, vanos: 'arco' }], remate: { tipo: 'aguja', alto: 14 } },
    verificar: ['La aguja neogótica es la que se ve en la panorámica de ~1903 (identificación a ojo).', 'Va desde la época de 1889 (obra de tiempos de Guzmán Blanco; fecha a verificar).'],
  }),
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
  iglesiaEn({
    id: 'panteon', nombre: 'Panteón Nacional', rotulo: 'Panteón Nacional', x: 9395, y: 5305, eje: NORTE_ALTO, nace: 3,
    largo: 55, ancho: 23, alto: 13, altoTecho: 7, fachada: 'neogotica',
    torres: { n: 2, lado: 5.5, cuerpos: [{ alto: 14, vanos: 'ventana' }, { alto: 5.5, vanos: 'arco' }], remate: { tipo: 'aguja', alto: 9 } },
    verificar: [
      'Iglesia de dos torres en la panorámica de ~1903 (identificación a ojo).',
      'Antes fue la iglesia de la Trinidad, y hacia 1930 se rehízo la fachada (el plano de 1936 dibuja tres torres): acá va con dos torres en las tres épocas, desde 1889.',
    ],
  }),
])
