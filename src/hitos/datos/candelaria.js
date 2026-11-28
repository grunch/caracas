/**
 * La iglesia de Nuestra Señora de la Candelaria (#243), por etapas. La planta es su contorno en el plano de 1936
 * (docs/candelaria-georreferencia.json): Landaeta Rosales dice que tras el terremoto de 1812 se reedificó
 * «siempre sobre el mismo plan de cuando se construyó». Cada etapa sale de lo que él cuenta, con la visita del
 * obispo Martí de 1772 transcrita; lo que no tiene fuente no se dibuja y queda en `verificar`
 * (docs/candelaria-integracion.md). El origen es el pie de la fachada y el eje entra en la nave, hacia el este.
 */
import { rectanguloPx } from './marco.js'

const LANDAETA = 'Manuel Landaeta Rosales, La iglesia y plaza de la Candelaria de Caracas (1908): https://archive.org/details/laiglesiayplazad00land'
const marco = { x: 11184, y: 6990.8, eje: [0.993, 0.118] }
const NAVES = { largo: 51, ancho: 25 }
const SACRISTIA_M = 9 // el cuerpo de atrás, «tras de ellas [las capillas] está la sacristía»: se reserva, no se modela
// «A un lado de la nave de la Epístola y contigua á la fachada»: al sur, donde el contorno sale del muro
const TORRE = { lado: 7, a: 3.75, b: 14.7 }
const ANEXO_TORRE = { largo: 13.5, fondo: 5.7 } // el saliente escalonado del plano: la torre y lo que tiene pegado
const ALTO = 10
const ALTO_TECHO = 4.5 // un tejado bajo: con la pendiente por omisión, una nave de 25 m de ancho subiría 7 m
const CUERPOS = [{ alto: 8, vanos: 'ventana' }, { alto: 5, vanos: 'arco' }, { alto: 4.5, vanos: 'arco' }]
const torre = (cuerpos, nace, muere) => ({ tipo: 'torre', ...TORRE, cuerpos: CUERPOS.slice(0, cuerpos), remate: { tipo: 'chapitel', alto: 3 }, nace, muere })

const planta = [
  rectanguloPx(marco, NAVES.largo, NAVES.ancho, NAVES.largo / 2, 0),
  rectanguloPx(marco, TORRE.lado, TORRE.lado, TORRE.a, TORRE.b),
]
const recinto = [
  rectanguloPx(marco, NAVES.largo + SACRISTIA_M, NAVES.ancho, (NAVES.largo + SACRISTIA_M) / 2, 0),
  rectanguloPx(marco, ANEXO_TORRE.largo, ANEXO_TORRE.fondo, ANEXO_TORRE.largo / 2, NAVES.ancho / 2 + ANEXO_TORRE.fondo / 2),
]

export const candelaria = Object.freeze({
  id: 'candelaria', nombre: 'Iglesia de La Candelaria', ...marco, nace: 1, muere: 0,
  planta, suprime: recinto, sinArboles: recinto, solarCompleto: true,
  partes: [
    // 1772: tres naves bajo un tejado, fachada de ladrillo con tres puertas al oeste (Martí). De su adorno no
    // se sabe nada: va lisa.
    { tipo: 'iglesia', ...NAVES, alto: ALTO, altoTecho: ALTO_TECHO, fachada: 'lisa', puertas: 3, nace: 1, muere: 2 },
    // 1843: la fachada cayó en 1812 y la nueva no se empezó hasta 1860. Va el cuerpo con un muro de cierre,
    // sin frente ni puertas: no hay fuente para dibujarle uno.
    { tipo: 'iglesia', ...NAVES, alto: ALTO, altoTecho: ALTO_TECHO, fachada: 'ninguna', nace: 2, muere: 3 },
    torre(3, 1, 2), // «una torre ó campanario de tres cuerpos» (Martí, 1772)
    torre(2, 2, 4), // en 1812 «el cuerpo tercero de la torre» vino a tierra; se subió entre 1889 y 1900
    // 1889: la fachada que se levantó de 1860 a 1872, «una de las más altas de los templos de Caracas», sobre
    // los techos viejos
    { tipo: 'iglesia', ...NAVES, alto: ALTO, altoTecho: ALTO_TECHO, fachada: 'clasica', altoFachada: 15, puertas: 3, nace: 3, muere: 4 },
    // desde 1911: tras el terremoto de 1900 se levantan los techos «para que tengan luz y concuerden con la fachada»
    { tipo: 'temploDeNaves', ...NAVES, altoLateral: ALTO, altoCentral: 15, cubierta: 'teja', pantalla: true, nace: 4, muere: 0 },
    torre(3, 4, 0), // 1889–1900: «se aumentó la altura del campanario y se techó de nuevo»
  ],
  fuente: `${LANDAETA} (pp. 8–15: acta de la visita de Martí del 17-5-1772, daños de 1812, fachada de 1860–1872, campanario de 1889–1900, reconstrucción desde 1901); contorno del plano DCN de 1936, contrastado con los de 1889, 1911 y 1946`,
  verificar: [
    'Alturas sin fuente: ninguna está medida ni publicada; salen de la proporción con el ancho leído del plano. Landaeta solo dice que la fachada de 1872 es «una de las más altas de los templos de Caracas».',
    'Planta de 51 × 25 m con la torre de 7 m al sur de la fachada: lados del contorno del plano de 1936 (0,5 m por píxel), no mensura; el rótulo tapa el muro sur. Se usa en todas las épocas porque Landaeta dice que se reedificó «sobre el mismo plan»; el plano de 1772 solo pone el símbolo de iglesia y el de 1843, un bloque.',
    'En 1843 no se sabe cuánto de la reedificación estaba hecho: el templo cayó en parte en 1812 y la fachada nueva no se empezó hasta 1860. Va el cuerpo entero con un muro de cierre al oeste, sin fachada ni puertas, y la torre de dos cuerpos.',
    'La torre tiene dos cuerpos también en 1889: se subió «de 1889 a 1900», sin año. El remate (chapitel de teja) es una interpretación de «se techó de nuevo».',
    'Desde 1911 va terminada, con la nave central más alta: en noviembre de 1908 solo estaba casi listo el techo de la nave central y el templo seguía «en ruinas». No se halló la fecha en que acabó la obra ni una vista fechada del resultado.',
    'El adorno de las fachadas (pilastras, frontón) es el de la iglesia paramétrica: de la de Hurtado Manrique solo se saben las tres puertas y el balcón central de 1880, que no se dibuja.',
    'El cementerio cercado del lado del Evangelio (al norte, en uso hasta 1825) y la sacristía «con algunas piezas altas» no se modelan: no se conoce su tamaño. La sacristía queda dentro de la reserva.',
  ],
})
