/**
 * Dos cruces del Guaire hacia El Paraíso (issue #272): el Puente Dolores (Manuel Felipe Herrera Tovar, 1897), al
 * final de la calle Sur 4, y el Puente Restaurador (Rafael Núñez Cáceres, 1905), en la avenida Sur. Se dibujan solo
 * en 1911: el estudio de Miraflores restituye la estructura de ese año y no las reformas posteriores (las pilas de
 * concreto de Dolores, de 1916; las reparaciones del Restaurador, de 1932). En 1936 y 1946 el cruce sigue en la
 * marca y no se dibuja ni se reserva nada.
 *
 * El calce, con sus píxeles, sus fuentes y lo que es interpretativo: docs/puentes-cruces-integracion.md.
 */
import { METRO, rectanguloPx } from './marco.js'
import { marcoDeCabezas } from '../rasante.js'

const SILVA = 'https://saber.ucv.ve/ojs/index.php/rev_tc/article/view/2916'
const FAC = 'https://fundaayc.com/2023/10/15/sabia-usted-107/'

const congelar = (puntos) => Object.freeze(puntos.map((p) => Object.freeze(p)))
const direccionDe = ([[ax, ay], [bx, by]]) => { const n = Math.hypot(bx - ax, by - ay); return Object.freeze([(bx - ax) / n, (by - ay) / n]) }
/** Las dos cabezas de un puente de `largo` metros centrado en `centro`, sobre `direccion` (unitaria, de norte a sur). */
const cabezasDe = (centro, direccion, largo) => congelar([-1, 1].map((s) => centro.map((c, k) => c + (s * largo * direccion[k]) / (2 * METRO))))

/** «Sesenta metros de luz sin apoyos intermedios» (El Cojo Ilustrado, 1-2-1898, en Silva Contreras, p. 37). */
const LUZ_DOLORES_M = 60
// El medio de los dos bordes del símbolo del puente en el plano de 1936, leído en y = 10100 y 10170 px. La calle
// Sur 4 llega a la cabeza norte por esa misma recta (en y = 10063 su medio queda a 0,4 m).
const MEDIO_DOLORES_1936 = congelar([[7912.25, 10100], [7898, 10170]])
const DIRECCION_DOLORES = direccionDe(MEDIO_DOLORES_1936)
/** El símbolo de 1936, de aleta a aleta: 43,6 m. Da el centro del puente, no su largo (60 m documentados). */
const SIMBOLO_DOLORES_1936 = congelar([[7915, 10079], [7901, 10165]])
const CENTRO_DOLORES = Object.freeze([7908, 10122])

export const CALCE_DOLORES = Object.freeze({
  cabezas: cabezasDe(CENTRO_DOLORES, DIRECCION_DOLORES, LUZ_DOLORES_M),
  medioCalzada1936: MEDIO_DOLORES_1936,
  simbolo1936: SIMBOLO_DOLORES_1936,
  errorM: 8, // a lo largo del eje: lo que el símbolo es más corto que el puente, por lado; de través, 1 m
})

/** «100,50 m de largo por 8 de ancho» (MOP, Memoria de 1905, en Silva Contreras, nota 14). */
const LARGO_RESTAURADOR_M = 100.5
// El medio de los dos bordes de la calzada del plano de 1936, leído en y = 9785 y 10020 px, a los dos lados de la
// plazoleta: las cabezas quedan a menos de 1 m de esa recta.
const MEDIO_RESTAURADOR_1936 = congelar([[8520.5, 9785], [8473, 10020]])
/** El centro de la plazoleta circular del plano de 1936; la Memoria de 1905 la pone «en el centro» del puente. */
const CENTRO_RESTAURADOR = Object.freeze([8500.5, 9879.5])
const DIRECCION_RESTAURADOR = direccionDe([[0, 0], [-0.203, 0.979]]) // la del calce (docs/puentes-guaire-calce.json)

export const CALCE_RESTAURADOR = Object.freeze({
  cabezas: cabezasDe(CENTRO_RESTAURADOR, DIRECCION_RESTAURADOR, LARGO_RESTAURADOR_M),
  medioCalzada1936: MEDIO_RESTAURADOR_1936,
  errorM: 3,
})

const ANCHO_TABLERO_M = 8 // documentado en los dos puentes
/** El cauce se abre 12 m a cada lado del tablero, como en los demás puentes: deja ver la estructura desde la orilla. */
const ANCHO_CAUCE_M = ANCHO_TABLERO_M + 24
const TRAS_ESTRIBO_M = 1 // el lecho arranca detrás del estribo, que queda asomado en la orilla
// Los árboles se retiran de una franja medida desde el tablero, no desde el cauce: lo que mide una copa grande a
// cada lado (ninguna llega a taparlo) y, a lo largo, hasta 12 m más allá de cada cabeza. Más angosta que en los
// otros puentes a propósito: un árbol retirado no vuelve en 1936, cuando acá ya no hay puente dibujado.
const MARGEN_COPA_M = 9.5
const ACCESO_M = 12
const ANCHO_SIN_ARBOLES_M = ANCHO_TABLERO_M + 2 * MARGEN_COPA_M
const EPOCA_1911 = 4

/**
 * Un cruce que solo tiene alzado en 1911. `agua` = [desde, hasta], el río del plano de 1936 sobre el eje, en metros
 * desde el centro; `sesgoAgua`, cuánto se corre hacia el sur por cada metro al oeste (el río cruza en diagonal).
 */
function cruce1911({ id, nombre, modelo, calce, anchoCauce = ANCHO_CAUCE_M, agua, sesgoAgua, fuente, verificar }) {
  const marco = marcoDeCabezas(calce.cabezas)
  const vano = Object.freeze([-marco.largo / 2 - TRAS_ESTRIBO_M, marco.largo / 2 + TRAS_ESTRIBO_M])
  const franja = (tramo, ancho) => rectanguloPx(marco, tramo[1] - tramo[0], ancho, (tramo[0] + tramo[1]) / 2, 0)
  const vida = { nace: EPOCA_1911, muere: EPOCA_1911 + 1 }
  const cauce = Object.freeze([Object.freeze({ ...vida, poligono: franja(vano, anchoCauce) })])
  const sinArboles = Object.freeze([Object.freeze({ ...vida, poligono: franja([vano[0] - ACCESO_M, vano[1] + ACCESO_M], ANCHO_SIN_ARBOLES_M) })])
  return Object.freeze({
    id, nombre, x: marco.x, y: marco.y, eje: marco.eje, ...vida, largo: marco.largo, cabezas: calce.cabezas,
    // Sin planta: no es un obstáculo, se cruza. La reserva de casas es solo el cauce abierto bajo el tablero.
    planta: Object.freeze([]),
    suprimePorEpoca: cauce, sinArbolesPorEpoca: sinArboles, sueloPropioPorEpoca: cauce,
    partes: Object.freeze([Object.freeze({ tipo: 'puente', id: modelo, anio: 1911, ...vida, largo: marco.largo, vano, anchoCauce, agua: Object.freeze(agua), sesgoAgua })]),
    fuente, verificar: Object.freeze(verificar),
  })
}

export const puenteDolores = cruce1911({
  id: 'puente-dolores', nombre: 'Puente Dolores', modelo: 'dolores', calce: CALCE_DOLORES,
  // el río de 1936 a 16 m del eje: de 10,0 a 19,8 m al este y de 2,5 a 14,5 m al oeste
  agua: [6.2, 17.2], sesgoAgua: -0.2,
  fuente: `Silva Contreras, Tecnología y Construcción 20-II (2004), pp. 36–37 y nota 13: ${SILVA}; planos de Razetti (1911) y DCN (1936): docs/puentes-cruces-integracion.md; FAC: ${FAC}; estudio de Miraflores (grunch/miraflores, docs/puentes-guaire/dolores.md)`,
  verificar: [
    'Largo: 60 m, la luz documentada. El símbolo del plano de 1936 mide 43,6 m: da el centro, no el largo.',
    'Centro: el del símbolo de 1936. Es el del puente tanto si el símbolo es una convención como si fuera el tramo de 40 m entre las pilas de 1916, que estaban a 10 m de cada extremo. Error a lo largo del eje: hasta 8 m.',
    'El plano de 1911 dibuja el cruce 78 m al norte y 20 m al este, más que el error de su calce: no se usa para el lugar.',
    'Ancho (8 m) y altura sobre el río (5 m): documentados. Altura de la armadura (7 m), doce paneles, arriostramiento y colores: del estudio, según fotografía.',
    'Lecho interpretativo: un cuenco de 5 m bajo el tablero; la franja de agua es el río del plano de 1936, que cruza al sesgo.',
    'En 1936 el plano todavía dibuja el puente (FAC lo da por demolido en 1935), ya con las dos pilas de concreto de 1916: esa variante no tiene alzado y no se dibuja. En 1946 el cruce es el «Puente Soublette», sin estructura documentada.',
  ],
})

export const puenteRestaurador = cruce1911({
  id: 'puente-restaurador', nombre: 'Puente Restaurador', modelo: 'restaurador', calce: CALCE_RESTAURADOR,
  // 10 m a cada lado del tablero y no 12: a 14,6 m del eje, del lado este, hay un árbol que dibuja el plano de 1936 y
  // vive en todas las épocas; el cauce no llega hasta él
  anchoCauce: ANCHO_TABLERO_M + 20,
  // el río de 1936 a 16 m del eje: de −24,8 a −8,0 m al este y de −3,5 a 13,5 m a 12 m al oeste
  agua: [-12.7, 4.3], sesgoAgua: 0.76,
  fuente: `Silva Contreras, Tecnología y Construcción 20-II (2004), pp. 37–38 y nota 14: ${SILVA}; planos de Razetti (1911) y DCN (1936): docs/puentes-cruces-integracion.md; FAC: ${FAC}; estudio de Miraflores (grunch/miraflores, docs/puentes-guaire/restaurador.md)`,
  verificar: [
    'Cabezas derivadas, no leídas: el centro de la plazoleta del plano de 1936, el eje de su calzada y el largo documentado (100,50 m). Ningún plano las marca con un calce fiable. Error: 3 m.',
    'El plano de 1911 dibuja el cruce 23 m al norte y 17 m al este y no dibuja la plazoleta: no se usa para el lugar.',
    'Largo (100,50 m), ancho (8 m), plazoleta en el centro y veinte postes para faroles: documentados. Radio de la plazoleta (6,5 m; el plano de 1936 la dibuja de 14,5 m de diámetro), ocho apoyos, altura (5 m) y ornamentación: del estudio.',
    'Lecho interpretativo: un cuenco de 5 m de cabeza a cabeza; la franja de agua es el río del plano de 1936, que cruza al sesgo.',
    'En 1936 el plano dibuja la plazoleta del puente de 1905, reparado en 1932: el estudio no restituye esa etapa y no se dibuja. En 1946 la calzada mide el triple y no consta la estructura.',
  ],
})

/** De oeste a este. */
export const puentesDoloresRestaurador = Object.freeze([puenteDolores, puenteRestaurador])
