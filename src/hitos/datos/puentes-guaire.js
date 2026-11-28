/**
 * Los puentes del Guaire (issue #272). Cada uno se ubica por sus dos cabezas, medidas en el mosaico de 1936
 * (docs/puentes-guaire-calce.md y .json: píxeles, transformación, error y fuente); la marca vieja era un ancla
 * aproximada. La estructura es la del estudio de Miraflores (src/hitos/puentes-guaire-modelo.js) y solo se dibuja
 * en las épocas en que ese estudio tiene alzado.
 */
import { rectanguloPx } from './marco.js'
import { marcoDeCabezas } from '../rasante.js'

const SILVA = 'https://www.academia.edu/8853323/tradici%C3%B3n_acad%C3%A9mica_y_la_imagen_del_dise%C3%B1o_estructural'
const FAC = 'https://fundaayc.com/2023/10/15/sabia-usted-107/'

/**
 * Puente de Hierro (Regeneración, 1875), prolongación de la calle Sur 5. Cabezas norte y sur en píxeles del
 * mosaico: el eje es el de la calzada del plano de 1936; el centro, el del puente en los planos de 1889 y 1911
 * (coinciden a menos de 1 m sobre el eje); el largo, el del símbolo a escala de Mestre (1889).
 */
export const CALCE_HIERRO = Object.freeze({
  cabezas: Object.freeze([Object.freeze([9447.5, 9364.8]), Object.freeze([9430.3, 9518.7])]),
  errorM: 8, // RMS del calce de Mestre (7,64 m) y lectura a ojo (±1 m)
})

const marco = marcoDeCabezas(CALCE_HIERRO.cabezas)
const ANCHO_TABLERO_M = 7 // nominal del estudio; la calzada del plano de 1936 mide unos 8 m
/** El cauce se abre 12 m a cada lado del tablero: deja ver los apoyos desde la orilla. */
const ANCHO_CAUCE_M = ANCHO_TABLERO_M + 24
const TRAS_ESTRIBO_M = 1 // el lecho arranca detrás del estribo, que queda asomado en la orilla
const vanoEntero = Object.freeze([-marco.largo / 2 - TRAS_ESTRIBO_M, marco.largo / 2 + TRAS_ESTRIBO_M])
// En 1936 el plano dibuja dos edificaciones pegadas al borde este de la calzada, de 16 a 38 m al norte del centro:
// se conservan. Ese tramo va a ras del terreno (el lecho arranca 12 m al norte del centro), con su propio suelo
// bajo el tablero, apenas más ancho que él.
const vano1936 = Object.freeze([-12, vanoEntero[1]])
const aRas1936 = Object.freeze([vanoEntero[0], vano1936[0]])
const ANCHO_RAS_M = ANCHO_TABLERO_M + 2
// El río sobre el eje del puente, de la orilla norte a la sur, en metros desde el centro: las dos líneas del cauce
// del plano de 1936 (y = 9447 y 9458 px), que es el que el suelo de la ciudad pinta en todas estas épocas.
const AGUA = Object.freeze([2.6, 8.1])
const franja = (tramo, ancho) => rectanguloPx(marco, tramo[1] - tramo[0], ancho, (tramo[0] + tramo[1]) / 2, 0)
// En 1936 hay una manzana al oeste cuyo borde queda a unos 12 m del eje: el cauce se angosta a 11 m por lado
// para no pisarla (ningún hito va encima de una manzana), con el talud más corto.
const ANCHO_CAUCE_1936_M = 22
const TALUD_1936_M = 6.5
const cauces = Object.freeze([
  Object.freeze({ nace: 3, muere: 5, poligono: franja(vanoEntero, ANCHO_CAUCE_M) }),
  Object.freeze({ nace: 5, muere: 6, poligono: franja(vano1936, ANCHO_CAUCE_1936_M) }),
])
// Los árboles se retiran de la huella y de los accesos, no solo del cauce: una copa plantada al borde tapa el
// tablero. A los lados del cauce, lo que mide una copa grande; en cada acceso, la calzada y 12 m más allá de la
// cabeza. En 1936 el margen es de 3 m y, junto al tramo a ras, solo la calzada: los árboles de los patios
// vecinos son ajenos.
const MARGEN_COPA_M = 9.5
const MARGEN_COPA_1936_M = 3
const ACCESO_M = 12
const calzada = Object.freeze([vanoEntero[0] - ACCESO_M, vanoEntero[1] + ACCESO_M])
const sinArboles = Object.freeze([
  Object.freeze({ nace: 3, muere: 5, poligono: franja(vanoEntero, ANCHO_CAUCE_M + 2 * MARGEN_COPA_M) }),
  Object.freeze({ nace: 5, muere: 6, poligono: franja(vano1936, ANCHO_CAUCE_1936_M + 2 * MARGEN_COPA_1936_M) }),
  Object.freeze({ nace: 3, muere: 6, poligono: franja(calzada, ANCHO_RAS_M) }),
])
const parte = { tipo: 'puente', id: 'hierro', largo: marco.largo }
const cauce = { ...parte, capa: 'cauce', anchoCauce: ANCHO_CAUCE_M, agua: AGUA }

export const puenteHierro = Object.freeze({
  id: 'puente-hierro', nombre: 'Puente de Hierro (Regeneración)', x: marco.x, y: marco.y, eje: marco.eje,
  // 1889, 1911 y 1936: en 1937 lo sustituyó otro puente, sin alzado restituido; en 1946 no se dibuja ni se reserva
  nace: 3, muere: 6,
  largo: marco.largo, cabezas: CALCE_HIERRO.cabezas,
  // Sin planta: no es un obstáculo, se cruza. La reserva de casas es solo el cauce abierto bajo el tablero.
  planta: Object.freeze([]),
  suprimePorEpoca: cauces, sinArbolesPorEpoca: sinArboles,
  // El suelo de la ciudad se abre en el cauce y, en 1936, también bajo el tramo a ras.
  sueloPropioPorEpoca: Object.freeze([...cauces, Object.freeze({ nace: 5, muere: 6, poligono: franja(aRas1936, ANCHO_RAS_M) })]),
  // La estructura es una sola de 1889 a 1936; el cauce (lecho y pilas a la vista) cambia en 1936.
  partes: Object.freeze([
    Object.freeze({ ...parte, capa: 'estructura', anio: 1889, nace: 3, muere: 6 }),
    Object.freeze({ ...cauce, anio: 1889, nace: 3, muere: 5, vano: vanoEntero }),
    Object.freeze({ ...cauce, anio: 1936, nace: 5, muere: 6, vano: vano1936, anchoCauce: ANCHO_CAUCE_1936_M, taludAncho: TALUD_1936_M, aRas: aRas1936, anchoRas: ANCHO_RAS_M }),
  ]),
  fuente: `Planos de Mestre (1889), Razetti (1911) y DCN (1936), calzados: docs/puentes-guaire-calce.md; Silva Contreras, Tecnología y Construcción 20-II (2004), pp. 32–34 y 40: ${SILVA}; FAC (inauguración en 1875, sustitución en 1937): ${FAC}; estudio de Miraflores (grunch/miraflores, docs/puentes-guaire/hierro.md)`,
  verificar: Object.freeze([
    'Eje: la calzada del plano de 1936. Centro: el del puente en Mestre (1889) y en Razetti (1911), que sobre ese eje coinciden a menos de 1 m. El símbolo de Mestre queda de 5 a 13 m al oeste del eje: se toma como error de su calce (RMS 7,64 m), no como otra posición.',
    'Largo de 77,4 m: el del símbolo de Mestre, que en el Puente Constitución da 60,7 m contra 59,56 m del estudio. Los pedestales de Razetti quedan a 95,5 m, pero ese plano da 48 m para el Sucre de 60 m: no se usa para el largo. El estudio traía 90 m nominales; ninguna fuente consultada da el largo.',
    'Ancho (7 m), altura del tablero sobre el lecho (5 m), espesores y colores: nominales del estudio de Miraflores. Nueve apoyos intermedios, vigas inferiores, columnas y barandas: Silva Contreras y grabado histórico.',
    'Lecho interpretativo: el relieve (Copernicus GLO-30) no trae el cauce del Guaire. Se abre un cuenco de 5 m bajo el tablero, de cabeza a cabeza; ni su forma ni su fondo son medidos. La franja de agua va donde el plano de 1936 dibuja el río sobre el eje.',
    'En 1936 el tramo norte va a ras del terreno para conservar dos edificaciones del plano pegadas a la calzada; ahí las pilas no se ven. El cauce se angosta a 22 m para no pisar la manzana del oeste.',
    'En 1946 el cruce existe (puente sustituto de 1937) pero no tiene alzado: no se dibuja ni se reserva.',
  ]),
})

export const puentesGuaire = Object.freeze([puenteHierro])
