/**
 * La iglesia de Nuestra Señora de las Mercedes (#244): el templo que se empezó en 1842 y se inauguró en 1857,
 * desde el primer plano que lo dibuja terminado (Mestre, 1889). La planta es su contorno en el plano de 1936
 * (docs/la-merced-georreferencia.json) y el volumen, la descripción del catálogo del IPC. Del convento y la
 * iglesia anteriores (1681–1812) no hay descripción: no se dibujan (docs/la-merced-integracion.md).
 * El origen es el pie de la fachada y el eje entra en la nave, hacia el norte.
 */
import { rectanguloPx } from './marco.js'

const IPC = 'IPC, Catálogo del Patrimonio Cultural Venezolano 2004-2007, municipio Libertador, «Lo construido», pp. 150–151: https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf'
const marco = { x: 9062, y: 5887, eje: [0.188, -0.982] }
const NAVES = { largo: 38, ancho: 23.7, anchoCentral: 13 }
const PRESBITERIO_M = 8 // la nave central sigue sola hasta la cabecera: las laterales acaban antes en el plano
const [ALTO_LATERAL, ALTO_CENTRAL] = [9, 13]
const ATRIO_M = 7 // el atrio que el plano dibuja delante de la fachada, hasta la calle
const LADO_TORRE = 5.6 // el ancho de una nave lateral (5,35 m) y un resalte
const torres = {
  lado: LADO_TORRE, a: LADO_TORRE / 2 - 0.1, b: [-1, 1].map((s) => s * (NAVES.ancho / 2 - LADO_TORRE / 2 + 0.1)),
  // «dos cuerpos, en el segundo de forma ochavada se ubican vanos con arcos de medio punto, rematando en una
  // cúpula de media naranja con linterna»: el segundo cuerpo es el tambor ochavado del remate
  cuerpos: [{ alto: 14, vanos: 'ventana' }], remate: { tipo: 'cupulin', alto: 8 },
}
const largoTotal = NAVES.largo + PRESBITERIO_M
const planta = [
  rectanguloPx(marco, NAVES.largo, NAVES.ancho, NAVES.largo / 2, 0),
  rectanguloPx(marco, PRESBITERIO_M, NAVES.anchoCentral, NAVES.largo + PRESBITERIO_M / 2, 0),
]
// el templo, su atrio y el camarín que sale 5 m al norte de la cabecera
const recinto = [rectanguloPx(marco, ATRIO_M + largoTotal + 5, NAVES.ancho + 0.6, (largoTotal + 5 - ATRIO_M) / 2, 0)]

export const laMerced = Object.freeze({
  id: 'las-mercedes', nombre: 'Iglesia de Las Mercedes', ...marco, nace: 3, muere: 0,
  planta, suprime: recinto, sinArboles: recinto, solarCompleto: true,
  partes: [
    { tipo: 'temploDeNaves', ...NAVES, altoLateral: ALTO_LATERAL, altoCentral: ALTO_CENTRAL, cubierta: 'teja', torres },
    { tipo: 'cuerpo', a: NAVES.largo + PRESBITERIO_M / 2, largo: PRESBITERIO_M, ancho: NAVES.anchoCentral, alto: ALTO_CENTRAL, altoTecho: NAVES.anchoCentral * 0.28 },
  ],
  fuente: `${IPC} (iglesia trasladada en 1681 y destruida en 1812; capilla provisional de 1813; templo actual empezado en 1842 e inaugurado en 1857; tres naves, fachada neoclásica de dos cuerpos y tres calles con frontis, dos torres campanario de dos cuerpos con el segundo ochavado y cúpula con linterna); contorno del plano DCN de 1936, contrastado con los de 1889 (templo IX), 1911 y 1946`,
  verificar: [
    'Alturas sin fuente: ninguna está medida ni publicada; salen de la proporción con el ancho leído del plano.',
    'Planta de 46 × 23,7 m con la nave central de 13 m: líneas del contorno del plano de 1936 (0,5 m por píxel), no mensura. El rótulo de la esquina («Las Mercedes») tapa parte del frente.',
    'En 1772 no se dibuja nada: el convento mercedario y su iglesia (en el lugar desde 1681, destruida en 1812) están documentados, pero no se halló ninguna descripción de su forma. El plano de 1772 pone ahí el símbolo de iglesia.',
    'En 1843 no se dibuja nada: el templo actual se había empezado en 1842 y no se inauguró hasta 1857; el plano de Jesurún deja un recuadro en blanco en el lugar. Tampoco se dibuja la capilla provisional de 1813.',
    'Las torres y la fachada son las que el IPC describe del templo de hoy: no se sabe si son todas de 1857. La Guía CCS dice que el terremoto de 1900 lo afectó «levemente»; no se halló qué se rehízo.',
    'Cubierta de teja y nave central más alta: la Guía CCS dice que la nave central es más alta y tiene bóvedas ojivales; el material de la cubierta no tiene fuente.',
    'El cementerio que la Guía CCS pone detrás del templo y las dependencias del convento (salida de los últimos religiosos en 1839) no se modelan: no se conoce su planta.',
  ],
})
