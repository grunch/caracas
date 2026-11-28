/**
 * El cruce del Guaire al término de la calle Sur 7 (issue #272): el Puente Constitución (Juan Hurtado Manrique,
 * 1880–1881), que la crecida de octubre de 1892 destruyó, y el Puente Sucre metálico (José María Ortega Martínez,
 * 1895), que lo sustituyó en el mismo paso. Desde 1925 o 1930 hay ahí un puente de concreto, sin alzado: en 1936 y
 * 1946 el cruce sigue en la marca y no se dibuja ni se reserva nada.
 *
 * El calce, con sus píxeles, sus fuentes y lo que es interpretativo: docs/puente-sucre-integracion.md.
 */
import { METRO, rectanguloPx } from './marco.js'
import { marcoDeCabezas } from '../rasante.js'

const SILVA = 'https://saber.ucv.ve/ojs/index.php/rev_tc/article/view/2916'
const FAC = 'https://fundaayc.com/2023/10/15/sabia-usted-107/'

/** La luz del Puente Sucre: «una armadura superior tipo bowstring, de sesenta metros» (Silva Contreras, p. 34). */
const LUZ_SUCRE_M = 60
// El eje de la calzada del plano de 1936 entre y = 9340 y 9460 px, releído para este cruce: el medio de sus dos
// bordes pasa por (9718,0, 9340) y (9703,4, 9460). El del primer calce (docs/puentes-guaire-calce.md) se midió
// sobre un tramo más largo de la calle, que tuerce, y a la altura de la cabeza norte quedaba 2 m al oeste.
const MEDIO_CALZADA_1936 = Object.freeze([Object.freeze([9718, 9340]), Object.freeze([9703.4, 9460])])
const deriva = MEDIO_CALZADA_1936[0].map((c, k) => MEDIO_CALZADA_1936[1][k] - c)
const EJE_1936 = Object.freeze({ punto: MEDIO_CALZADA_1936[0], direccion: Object.freeze(deriva.map((c) => c / Math.hypot(...deriva))) })
/** El medio de los dos pedestales del norte en el plano de Razetti (1911), ya calzado sobre el mosaico. */
const PEDESTALES_NORTE_1911 = Object.freeze([9703, 9376])
// La cabeza norte: esos pedestales llevados al eje de 1936 (la calzada de Razetti queda 5 m al oeste: error de su
// calce). La sur: a la luz documentada. Razetti dibuja los pedestales del sur a 48 m: su símbolo no está a escala.
const CABEZA_NORTE = Object.freeze([9713.5, 9377.3])
const CABEZA_SUR = Object.freeze(CABEZA_NORTE.map((c, k) => c + (LUZ_SUCRE_M / METRO) * EJE_1936.direccion[k]))

export const CALCE_SUR7 = Object.freeze({
  cabezas: Object.freeze([CABEZA_NORTE, CABEZA_SUR]),
  eje1936: EJE_1936,
  pedestalesNorte1911: PEDESTALES_NORTE_1911,
  /** El símbolo a escala del Constitución en el plano de Mestre (1889): da su largo (60,7 m), no su lugar. */
  cabezasMestre1889: Object.freeze([Object.freeze([9720.5, 9338.5]), Object.freeze([9699, 9458])]),
  errorM: 7, // RMS del calce de Razetti (6,71 m) y lectura a ojo (±1 m)
})

const marco = marcoDeCabezas(CALCE_SUR7.cabezas)
const ANCHO_TABLERO_M = 8 // el del Sucre, nominal del estudio; el Constitución mide 6,76 m y la calzada de 1936, unos 7,3 m
/** El cauce se abre 12 m a cada lado del tablero, como en el Puente de Hierro: deja ver la estructura desde la orilla. */
const ANCHO_CAUCE_M = ANCHO_TABLERO_M + 24
const TRAS_ESTRIBO_M = 1 // el lecho arranca detrás del estribo, que queda asomado en la orilla
const vano = Object.freeze([-marco.largo / 2 - TRAS_ESTRIBO_M, marco.largo / 2 + TRAS_ESTRIBO_M])
// El río sobre el eje, de la orilla norte a la sur: las dos líneas del cauce del plano de 1936 (y = 9422 y 9445 px),
// que es el que el suelo de la ciudad pinta en todas las épocas. En metros desde el centro.
const RIO_1936_Y_PX = Object.freeze([9422, 9445])
const AGUA = Object.freeze(RIO_1936_Y_PX.map((y) => ((y - marco.y) * METRO) / marco.eje[1]))
const franja = (tramo, ancho, b = 0) => rectanguloPx(marco, tramo[1] - tramo[0], ancho, (tramo[0] + tramo[1]) / 2, b)
const cauce = Object.freeze([Object.freeze({ nace: 3, muere: 5, poligono: franja(vano, ANCHO_CAUCE_M) })])
// Los árboles se retiran de la huella y de los accesos, como en el Puente de Hierro: a los lados del cauce, lo que
// mide una copa grande; en cada acceso, la calzada hasta 12 m más allá de la cabeza. Al norte la calle del sitio es
// el pasillo entre las manzanas, que queda al oeste del eje: la franja no entra en el lote del este.
const MARGEN_COPA_M = 9.5
const ACCESO_M = 12
const ANCHO_CALZADA_M = ANCHO_TABLERO_M + 2
const PASILLO_NORTE = Object.freeze({ ancho: 6, centro: 3.5 }) // de 0,5 a 6,5 m al oeste del eje
const sinArboles = Object.freeze([
  Object.freeze({ nace: 3, muere: 5, poligono: franja(vano, ANCHO_CAUCE_M + 2 * MARGEN_COPA_M) }),
  Object.freeze({ nace: 3, muere: 5, poligono: franja([vano[0] - ACCESO_M, vano[0]], PASILLO_NORTE.ancho, PASILLO_NORTE.centro) }),
  Object.freeze({ nace: 3, muere: 5, poligono: franja([vano[1], vano[1] + ACCESO_M], ANCHO_CALZADA_M) }),
])
// Cada estructura dibuja todo lo suyo (tablero, estribos, apoyos y lecho): no comparten nada más que el cauce.
// Las dos van de cabeza a cabeza: 60 m es la luz documentada del Sucre; el Constitución medía lo mismo (el estudio
// le da 59,56 m, sin fuente localizada, y el símbolo de Mestre, 60,7 m).
const parte = { tipo: 'puente', id: 'sucre', largo: marco.largo, vano, anchoCauce: ANCHO_CAUCE_M, agua: AGUA }

export const puenteSucre = Object.freeze({
  id: 'puente-sucre', nombre: 'Puente Constitución / Puente Sucre', x: marco.x, y: marco.y, eje: marco.eje,
  // 1889 y 1911: el puente de concreto que lo reemplazó antes de 1936 no tiene alzado; no se dibuja ni se reserva
  nace: 3, muere: 5,
  largo: marco.largo, cabezas: CALCE_SUR7.cabezas,
  // Sin planta: no es un obstáculo, se cruza. La reserva de casas es solo el cauce abierto bajo el tablero.
  planta: Object.freeze([]),
  suprimePorEpoca: cauce, sinArbolesPorEpoca: sinArboles, sueloPropioPorEpoca: cauce,
  partes: Object.freeze([
    Object.freeze({ ...parte, anio: 1889, nace: 3, muere: 4 }), // Constitución
    Object.freeze({ ...parte, anio: 1911, nace: 4, muere: 5 }), // Sucre metálico
  ]),
  fuente: `Silva Contreras, Tecnología y Construcción 20-II (2004), pp. 34–35 y nota 11: ${SILVA}; planos de Mestre (1889), Razetti (1911) y DCN (1936): docs/puente-sucre-integracion.md; FAC: ${FAC}; estudio de Miraflores (grunch/miraflores, docs/puentes-guaire/sucre.md)`,
  // El detalle de cada punto, con sus medidas: docs/puente-sucre-integracion.md.
  verificar: Object.freeze([
    'Un solo paso para las dos estructuras: que el Sucre reusara las cabezas del Constitución es una inferencia.',
    'Cabeza norte: pedestales de Razetti (1911) sobre el eje de la calzada de 1936. Cabeza sur: a 60 m, la luz documentada del Sucre.',
    'El símbolo de Mestre (1889) queda 19 m al norte, sobre una manzana del sitio que Mestre no dibuja: da el largo, no el lugar.',
    'Constitución: ancho, dos apoyos y detalle son del estudio, sin fuente localizada. Sucre: ancho, altura de la armadura y paneles, nominales.',
    'Lecho interpretativo; la franja de agua es el río del plano de 1936.',
    'Entre 1892 y 1895 no hubo puente. El de concreto (1925 o 1930) no tiene alzado: en 1936 y 1946 no se dibuja.',
  ]),
})
