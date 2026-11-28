/**
 * La iglesia de San Pablo, primer ermitaño (#246): la que estuvo donde después se hizo el Teatro Municipal, de
 * 1580 a su demolición en 1876. Va en 1772 y 1843 y muere cuando nace el teatro (1889). La composición sale de la
 * visita del obispo Martí de 1772 (por Otaduy) y de Gasparini, los dos citados en la tesis de Gois (UCV, 2007),
 * que reproduce el plano de 1757; el lugar, del plano de 1843. Las medidas son una proporción, no una mensura
 * (docs/san-pablo-integracion.md). El origen es el pie de la fachada, que mira al norte, a la plazuela.
 */
import { EJE_DAMERO, rectanguloPx } from './marco.js'

const GOIS = 'Tarím S. Gois C., «Aproximación histórica al patrimonio pictórico y escultórico colonial de la iglesia de San Pablo, primer ermitaño», trabajo de grado, Universidad Central de Venezuela, 2007, pp. 4–13 y 24: https://saber.ucv.ve/jspui/handle/10872/1862'
const SUR = [-EJE_DAMERO[1], EJE_DAMERO[0]]
const marco = { x: 8384, y: 7670, eje: SUR }
const NAVE = { largo: 41, ancho: 10 }
const MENOR_ANCHO = 6.5 // la «nave menos principal», al oeste: capillas, baptisterio y sacristía
const TORRE = { lado: MENOR_ANCHO, a: MENOR_ANCHO / 2, b: NAVE.ancho / 2 + MENOR_ANCHO / 2 }
const CUERPOS = [{ alto: 7, vanos: 'ventana' }, { alto: 5, vanos: 'arco' }, { alto: 4, vanos: 'arco' }]
const torre = (cuerpos, nace, muere) => ({ tipo: 'torre', ...TORRE, cuerpos: CUERPOS.slice(0, cuerpos), remate: { tipo: 'chapitel', alto: 2 }, nace, muere })
const largoMenor = NAVE.largo - TORRE.lado

const planta = [
  rectanguloPx(marco, NAVE.largo, NAVE.ancho, NAVE.largo / 2, 0),
  rectanguloPx(marco, NAVE.largo, MENOR_ANCHO, NAVE.largo / 2, TORRE.b),
]
const recinto = [rectanguloPx(marco, NAVE.largo, NAVE.ancho + MENOR_ANCHO, NAVE.largo / 2, MENOR_ANCHO / 2)]

export const sanPablo = Object.freeze({
  id: 'san-pablo', nombre: 'Iglesia de San Pablo', ...marco, nace: 1, muere: 3,
  planta, suprime: recinto, sinArboles: recinto, solarCompleto: true,
  partes: [
    // «de una nave», con la puerta principal al norte y una «media fachada de ladrillo»; Gasparini: fachada de
    // dos cuerpos con medias columnas, entablamento y frontispicio triangular
    { tipo: 'iglesia', ...NAVE, alto: 8, fachada: 'clasica' },
    // la capilla «casi tan larga como la nave», más corta por la torre y la sacristía de sus extremos
    { tipo: 'cuerpo', a: TORRE.lado + largoMenor / 2, b: TORRE.b, largo: largoMenor, ancho: MENOR_ANCHO, alto: 6, altoTecho: 1.8 },
    torre(3, 1, 2), // «una torre o campanario de tres cuerpos» (Martí, 1772)
    torre(2, 2, 3), // en 1812 «cayó la torre sobre el coro»; Gasparini la describe «maciza», de dos cuerpos
  ],
  fuente: `${GOIS} (visita de Martí de 1772 según Ernesto Otaduy, Las iglesias de la antigua Caracas, p. 38; Graziano Gasparini, Templos coloniales de Venezuela, p. 14; plano de la iglesia, el Hospital Real y el Hospicio de la Caridad de 1757; carta de Domingo Herrera sobre los daños de 1812); Manuel Landaeta Rosales, La antigua Calle del Comercio de Caracas (1907), pp. 13–14 (templo de 1580, demolido en 1876): https://upload.wikimedia.org/wikipedia/commons/2/2d/La_antigua_Calle_del_Comercio_de_Caracas_%28IA_laantiguacallede00land%29.pdf; lugar: recuadro del plano de Jesurún de 1843 (P «San Pablo»)`,
  verificar: [
    'Alturas sin fuente: ninguna está medida ni publicada. Gasparini solo dice que la torre era «maciza» y de dos cuerpos.',
    'Medidas de la planta (nave de 41 × 10 m y nave menor de 6,5 m): la proporción del plano de 1757 que reproduce Gois, puesta a escala con los 23 m de ancho del recuadro del plano de 1843. El plano de 1757 no trae escala legible en la reproducción: pueden errar un 20 %.',
    'Lugar: la esquina noreste del recuadro en blanco del plano de 1843 (calce de 12,4 m RMS), corrida 2 m para que el muro este quede sobre el borde de la manzana del mapa (U1772-0051) y no en la calle; la fachada, sobre la línea sur de la plazuela. El símbolo del plano de 1772 cae unos 25 m al sur (calce de 18,7 m RMS).',
    'El Hospital Real y el Hospicio de la Caridad, pegados a la torre por el oeste (después Cuartel de Artillería, demolido con el templo en 1876), no se modelan: el plano de 1757 da su distribución, pero sin escala. Tampoco el cementerio de detrás.',
    'En 1843 va reparada y con la torre de dos cuerpos. La carta de 1812 dice «todas las paredes desplomadas»; no se halló cuándo se reparó. La foto atribuida a Lessmann que reproduce Gois (sin fecha, siglo XIX) muestra la fachada y la torre en pie.',
    'La fachada es la «clásica» de la iglesia paramétrica (pilastras, entablamento, frontón, puerta de arco): se parece a lo que describe Gasparini, sin sus pináculos. En 1772 Martí solo dice «media fachada de ladrillo»: va la misma.',
    'La plaza con su fuente de piedra (1771–1845) y su pila de mármol (1847–1876) no se modela.',
  ],
})
