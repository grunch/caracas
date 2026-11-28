/**
 * El Palacio Municipal, en la esquina de Las Monjas, lado sur de la Plaza Bolívar (#252): el solar del Seminario
 * de Santa Rosa y de la Universidad, que los planos nombran distinto en cada época. La planta es el recuadro
 * rayado «Palacio de Justicia» del plano DCN de 1936, con su patio (docs/palacio-municipal-georreferencia.json);
 * el volumen, el que el catálogo del IPC describe del edificio reformado por Chataing en 1904–1906. Antes de
 * 1911 no hay alzado ni planta de época: no se dibuja (docs/palacio-municipal-integracion.md).
 */
import { rectanguloPx } from './marco.js'

// El pie del frente sobre la plaza, en su medio, y la dirección de ese frente (de oeste a este). El recuadro del
// plano es un cuadrilátero algo torcido (el frente gira 14° y el fondo 11°); va el rectángulo medio, a menos de
// 2,5 m de cada esquina, con centro en (8883,5, 7014). El hito se ancla al frente y no al centro porque el terreno
// baja unos 3 m hacia el sur: anclado al centro, la planta baja del frente quedaba medio enterrada.
const marco = { x: 8900, y: 6940.84, eje: [0.9755, 0.22] }
/** El centro del recuadro, en píxeles del plano: ahí va el punto de la marca. */
export const CENTRO_PALACIO_MUNICIPAL = Object.freeze([8883.5, 7014])

/** Medidas leídas del plano de 1936 (0,5 m por píxel): el recuadro y su patio (a, b desde el centro del recuadro), en la mitad norte. */
export const MEDIDAS_PALACIO_MUNICIPAL = Object.freeze({
  ancho: 45.5, fondo: 75,
  patio: Object.freeze({ ancho: 21.9, fondo: 19.4, a: 0.8, b: -14.4 }),
})

const { ancho: ANCHO, fondo: FONDO, patio: PATIO } = MEDIDAS_PALACIO_MUNICIPAL
const B = FONDO / 2 // del pie del frente al centro de la planta
const solar = [rectanguloPx(marco, ANCHO, FONDO, 0, B)]
// La colisión del modo a pie: los cuatro cuerpos, con el patio de verdad abierto (el `patio` genérico de a-pie.js
// abriría todo el interior a 8 m de los muros, cuerpo de atrás incluido).
const [x0, x1, z0, z1] = [PATIO.a - PATIO.ancho / 2, PATIO.a + PATIO.ancho / 2, PATIO.b - PATIO.fondo / 2, PATIO.b + PATIO.fondo / 2]
const cuerpos = [
  rectanguloPx(marco, ANCHO, z0 + FONDO / 2, 0, B + (z0 - FONDO / 2) / 2), // norte, sobre la plaza
  rectanguloPx(marco, ANCHO, FONDO / 2 - z1, 0, B + (z1 + FONDO / 2) / 2), // sur, el cuerpo de atrás
  rectanguloPx(marco, x0 + ANCHO / 2, PATIO.fondo, (x0 - ANCHO / 2) / 2, B + PATIO.b), // oeste, sobre Sur 2
  rectanguloPx(marco, ANCHO / 2 - x1, PATIO.fondo, (x1 + ANCHO / 2) / 2, B + PATIO.b), // este
]
const IAM = 'https://iamvenezuela.org/2016/07/palacio-municipal-sede-de-la-alcaldia-del-municipio-libertador/'
const GUIA = 'https://guiaccs.com/en/obras/municipal-palace-of-caracas/'

export const palacioMunicipal = Object.freeze({
  id: 'palacio-municipal', nombre: 'Palacio Municipal (antiguo Seminario de Santa Rosa)', ...marco, nace: 4, muere: 0,
  planta: cuerpos, suprime: solar, sinArboles: solar,
  partes: [{ tipo: 'palacioMunicipal', ...MEDIDAS_PALACIO_MUNICIPAL, b: B, pisos: 2, altoPiso: 5 }],
  fuente: `Plano DCN de 1936 (recuadro rayado «Palacio de Justicia», con su patio), contrastado con el de 1946; ` +
    `Catálogo del Patrimonio Cultural Venezolano 2004–2007 del IPC, citado por IAM Venezuela (${IAM}): seminario terminado en 1696, ` +
    'Palacio de Justicia en 1872, pabellón occidental en 1881, reforma de Alejandro Chataing en 1904–1906; planta rectangular de esquina, ' +
    'patio central con fuente, corredores con columnas en planta baja y alta, frente de tres cuerpos con frontón triangular al centro y ' +
    `frontones curvos a los lados; Guía de Arquitectura y Paisaje de Caracas (${GUIA}): Hurtado Manrique en 1872, Chataing en 1906, ventanas ` +
    'bajas de arco y altas con balcón. Leyendas de los planos de 1843, 1889 y 1911 en docs/palacio-municipal-integracion.md.',
  verificar: [
    'Alturas sin fuente: ninguna altura está medida ni publicada. Los dos pisos son los del IPC («planta baja y planta alta»); los 5 m por piso, una proporción.',
    'Planta de 45,5 × 75 m: el rectángulo medio del recuadro del plano de 1936 (un cuadrilátero de lados 44,9, 74,0, 46,4 y 76,3 m), no una mensura. Cada esquina queda a menos de 2,5 m de la leída.',
    'Antes de 1911 no se dibuja. Del seminario y la universidad (1772, 1843) no se halló alzado ni planta: el plano de 1772 dibuja la cuadra entera y el de 1843, tres solares en blanco. Del edificio de 1872 (Hurtado Manrique) y su pabellón de 1881, en pie en 1889, tampoco se halló descripción ni vista fechada.',
    'La capilla de Santa Rosa no va como volumen aparte: las fuentes dicen que la reforma la integró al edificio (ala oeste, según la leyenda de 1843, que pone la «Cap. de la Universidad» en el solar de la esquina), sin dar su planta.',
    'El frente es el que el IPC describe del edificio actual; se da por el de Chataing (1906) sin vista fechada que lo pruebe. Que mira a la plaza sale de una foto de 2012 (Commons, Omerta-ve, CC BY-SA 3.0), no de una fuente de época.',
    'El cuerpo de atrás (los 42 m al sur del patio, donde el plano de 1911 pone el Cuartel de Policía) va como envolvente de la misma altura: no tiene fuente. Los patios chicos que el plano de 1936 dibuja ahí no se modelan.',
    'Vanos, columnas, balcones, cornisa y pretil: interpretativos, en el número y lugar que piden las descripciones. Color: la cal de los demás hitos, sin fuente.',
    'El lado este y el sur van ciegos (medianeras); el plano de 1936 deja una franja en blanco al este del cuerpo de atrás que no se modela.',
  ],
})
