/**
 * El convento de San Francisco antes de ser la Universidad (#254): la columna de claustros pegada al costado oeste
 * de la iglesia, en 1772 y 1843. Muere cuando nace el hito de la Universidad (1889), que no se toca.
 *
 * Ningún plano de 1772 ni de 1843 dibuja el interior de la cuadra, y no se halló una descripción cotejada del
 * convento colonial. La planta es una lectura hacia atrás: los tres patios en fila que dibuja el plano de Mestre
 * de 1889, con las medidas del levantamiento del edificio de hoy (docs/convento-san-francisco-integracion.md).
 * El marco es el de la Universidad: el origen, el medio de su frente norte; +a al este, +b al sur.
 */
import { EJE_DAMERO, rectanguloPx } from './marco.js'

const GUIACCS = 'planta del Palacio de las Academias en la guía de arquitectura de Caracas (Iván González Viso, María Isabel Peña y Federico Vegas; ficha firmada IGV): https://guiaccs.com/obras/palacio-de-las-academias/'
const BRICENO = 'Leopoldo Briceño-Iragorry, «El Paraninfo del Palacio de las Academias. Personajes», Gaceta Médica de Caracas 109(3), 2001: https://ve.scielo.org/scielo.php?pid=S0367-47622001000300011&script=sci_arttext'
const WIKIPEDIA = 'https://es.wikipedia.org/wiki/Palacio_de_las_Academias'

const marco = { x: 8645, y: 7192, eje: EJE_DAMERO }
// La columna de claustros: del muro oeste de la nave de la iglesia (a = 50) 32,3 m hacia el oeste, y 97 m de fondo.
export const COLUMNA = Object.freeze({ a0: 17.7, a1: 50, b0: 0, b1: 97 })
const CORREDOR = 3.4 // el ancho de los corredores que bordean cada patio por el este y el oeste
// Las crujías que cruzan la columna de este a oeste, con los corredores de sus lados: [desde, hasta] en b
const FRENTE = [0, 10], ENTRE_NORTE_Y_MEDIO = [35, 47], ENTRE_MEDIO_Y_SUR = [71.5, 82.5], FONDO = [90, 97]
const [PATIO_A0, PATIO_A1] = [COLUMNA.a0 + CORREDOR, COLUMNA.a1 - CORREDOR]
/** Los tres patios, de norte a sur: lo que queda abierto entre las crujías y los corredores. */
export const PATIOS = Object.freeze([
  [FRENTE[1], ENTRE_NORTE_Y_MEDIO[0]], [ENTRE_NORTE_Y_MEDIO[1], ENTRE_MEDIO_Y_SUR[0]], [ENTRE_MEDIO_Y_SUR[1], FONDO[0]],
].map(([b0, b1]) => Object.freeze({ a0: PATIO_A0, a1: PATIO_A1, b0, b1 })))

const ALTO_CRUJIA = 5 // un piso; sin fuente (ver `verificar`)
const ALTO_CORREDOR = 3.2
const ancho = COLUMNA.a1 - COLUMNA.a0
const centroA = (COLUMNA.a0 + COLUMNA.a1) / 2

/** Una crujía de lado a lado de la columna, de b0 a b1: su rectángulo de colisión y su cuerpo con tejado a dos aguas. */
const crujia = ([b0, b1], vida = {}) => ({
  planta: [rectanguloPx(marco, ancho, b1 - b0, centroA, (b0 + b1) / 2)],
  partes: [{ tipo: 'cuerpo', a: centroA, b: (b0 + b1) / 2, largo: ancho, ancho: b1 - b0, alto: ALTO_CRUJIA, altoTecho: 2, ...vida }],
})
/** Los dos corredores que cierran un patio por el este y el oeste, de b0 a b1, con la cumbrera de norte a sur. */
const corredores = ({ b0, b1 }, vida = {}) => {
  const lados = [COLUMNA.a0 + CORREDOR / 2, COLUMNA.a1 - CORREDOR / 2]
  return {
    planta: lados.map((a) => rectanguloPx(marco, CORREDOR, b1 - b0, a, (b0 + b1) / 2)),
    partes: lados.map((a) => ({ tipo: 'cuerpo', a, b: (b0 + b1) / 2, giro: Math.PI / 2, largo: b1 - b0, ancho: CORREDOR, alto: ALTO_CORREDOR, altoTecho: 0.9, ...vida })),
  }
}

// 1772: el frente y el claustro del norte. Desde 1843, además, los otros dos patios (ver `verificar`).
const DESDE_1843 = { nace: 2 }
const norte = [crujia(FRENTE), corredores(PATIOS[0]), crujia(ENTRE_NORTE_Y_MEDIO)]
const atras = [corredores(PATIOS[1], DESDE_1843), crujia(ENTRE_MEDIO_Y_SUR, DESDE_1843), corredores(PATIOS[2], DESDE_1843), crujia(FONDO, DESDE_1843)]
const recinto = [rectanguloPx(marco, ancho, COLUMNA.b1 - COLUMNA.b0, centroA, (COLUMNA.b0 + COLUMNA.b1) / 2)]

export const conventoSanFrancisco = Object.freeze({
  id: 'convento-san-francisco', nombre: 'Convento de San Francisco', ...marco, nace: 1, muere: 3,
  planta: norte.flatMap((p) => p.planta),
  plantaPorEpoca: [{ nace: 2, poligonos: atras.flatMap((p) => p.planta) }],
  suprime: recinto, sinArboles: recinto, solarCompleto: true,
  partes: [...norte, ...atras].flatMap((p) => p.partes),
  fuente: `Plano de Mestre de 1889 (3 «Universidad»: tres patios en fila de norte a sur, junto a la iglesia, VII); ${GUIACCS} (medidas de la columna de claustros, leídas de su escala gráfica); plano DCN de 1936 («Universidad Central», dos patios en fila junto a la «Iglesia San Francisco»); plano de Jesurún de 1843 (plazuela en blanco delante); litografía de hacia 1845 (fuentes/imagenes/1845-commons-iglesia-de-san-francisco: el frente del convento, con tejado, más bajo que la iglesia); cronología: ${BRICENO}; ${WIKIPEDIA} (sin citas para la parte de atrás terminada en 1794 ni para los daños de 1812)`,
  verificar: [
    'Planta hacia atrás, no de época: ni el plano de 1772 ni el de 1843 dibujan el interior de la cuadra. Los tres patios en fila son los del plano de Mestre de 1889 y sus medidas, las del levantamiento del edificio de hoy (hasta 2 m de error de lectura en los 97 m del fondo). No se sabe cuánto de esa planta es colonial.',
    'Mestre dibuja la Universidad de 65 m de ancho; el levantamiento de hoy y Razetti (1911) dan la columna de unos 32 m que va acá. Lo que hubiera al oeste no tiene fuente: queda el solar vacío que ya reservaba la Universidad.',
    'En 1772 solo van el frente y el claustro del norte: Wikipedia dice, sin cita, que la parte posterior se terminó en 1794. Que esa parte sean los dos patios de atrás es una lectura de este modelo. Su solar queda reservado y vacío.',
    'En 1843 va completo y techado. Del terremoto de 1812 solo se halló que «buena parte» quedó destruida (Wikipedia, sin cita), no cuándo se rehízo; en 1838 y 1844 estaba en uso (Briceño-Iragorry) y la litografía de hacia 1845 muestra el frente en pie.',
    'Alturas sin fuente (5 m las crujías, 3,2 m los corredores) y un solo piso por decisión: Wikipedia atribuye la segunda planta a la reforma de 1876, la guía de arquitectura dice que se mantuvo la altura y la litografía no lo resuelve.',
    'Los corredores van como cuerpos cerrados: de las arquerías no hay descripción ni vista fechada. Sin puertas, ventanas ni la portería de la litografía.',
    'El frente va en la línea del de la Universidad; el hito de la iglesia tiene su fachada 8 m más al norte, y en el levantamiento de hoy están a ras. No se movió ninguno.',
    'La plazuela que el plano de 1843 deja en blanco delante no se abre: siguen ahí las casas genéricas.',
  ],
})
