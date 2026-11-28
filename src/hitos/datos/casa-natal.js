/**
 * La Casa Natal del Libertador (issue #247), entre las esquinas de San Jacinto y Traposos. El solar mide lo que
 * publica el Diccionario de Historia de Venezuela (22,40 × 60,50 m) y está puesto donde el plano de 1936 raya
 * la «Casa Natal» (docs/casa-natal-georreferencia.json). La fachada cambia con las épocas según Landaeta
 * Rosales (1912); el volumen, no: es de un piso en todas. Lo que no tiene fuente queda en `verificar`
 * (docs/casa-natal-integracion.md). El origen es el medio de la fachada y el eje entra al solar, hacia el oeste;
 * b > 0 es el norte. No tiene constructor propio: se arma con las partes `cuerpo` y `ventanas` de src/hitos/partes.js.
 */
import { rectanguloPx } from './marco.js'

// los tonos de src/hitos/piezas.js que usa (este módulo lo carga también el hilo principal, sin three.js)
const TONO = Object.freeze({ TEJA_VIEJA: 0x7d4a36, PIEDRA: 0x8a8378, PIEDRA_CLARA: 0xbdb6a6 })

const marco = { x: 9262.6, y: 7168.2, eje: [-0.9786, -0.2055] }

/** El solar, en metros (Fuentes Carvallo, DHV). */
export const SOLAR = Object.freeze({ frente: 22.4, fondo: 60.5 })

/** Los dos patios que nombra el IPC, centrados en los blancos que el plano de 1936 deja dentro del rayado. */
export const PATIOS = Object.freeze([
  Object.freeze({ a: 16.1, b: 2.3, largo: 10, ancho: 9 }), // el principal, detrás del zaguán
  Object.freeze({ a: 39.5, b: -0.5, largo: 9, ancho: 7 }), // el de servicio
])

const ALERO = 0.45
const medio = SOLAR.frente / 2
const [p1, p2] = PATIOS
const borde = (p) => ({ a0: p.a - p.largo / 2, a1: p.a + p.largo / 2, b0: p.b - p.ancho / 2, b1: p.b + p.ancho / 2 })
const [r1, r2] = [borde(p1), borde(p2)]

/**
 * Lo techado: las crujías que quedan al quitar los patios. `cumbrera: 'b'` corre paralela a la calle (con alero
 * a la calle y a los patios); `'a'`, a lo largo del solar, sin alero (da a la medianera y al patio).
 */
export const CUERPOS = Object.freeze([
  { a0: 0, a1: r1.a0, b0: -medio, b1: medio, alto: 5, cumbrera: 'b' }, // la crujía de la calle: sala, zaguán y corredor
  { a0: r1.a0, a1: r1.a1, b0: -medio, b1: r1.b0, alto: 4.6, cumbrera: 'a' },
  { a0: r1.a0, a1: r1.a1, b0: r1.b1, b1: medio, alto: 4.6, cumbrera: 'a' },
  { a0: r1.a1, a1: r2.a0, b0: -medio, b1: medio, alto: 4.6, cumbrera: 'b' }, // entre los dos patios
  { a0: r2.a0, a1: r2.a1, b0: -medio, b1: r2.b0, alto: 4.2, cumbrera: 'a' },
  { a0: r2.a0, a1: r2.a1, b0: r2.b1, b1: medio, alto: 4.2, cumbrera: 'a' },
  { a0: r2.a1, a1: SOLAR.fondo - ALERO, b0: -medio, b1: medio, alto: 4.2, cumbrera: 'b' }, // el fondo: el alero no pasa del lindero
].map(Object.freeze))

/** Las fachadas: desde qué época y hasta cuál (0: sigue en pie). */
export const FASES = Object.freeze({
  colonial: Object.freeze({ nace: 1, muere: 2 }), // 1772: ventanas voladas con reja de madera torneada
  republicana: Object.freeze({ nace: 2, muere: 4 }), // 1843 y 1889: sin las rejas de madera (las de hierro no se dibujan)
  comercio: Object.freeze({ nace: 4, muere: 5 }), // 1911: la sala del sur, con puertas de comercio
  restaurada: Object.freeze({ nace: 5, muere: 0 }), // 1936 y 1946: la reconstrucción de 1916–1921
})

// De sur a norte, como en la lámina de Landaeta (1912): tres vanos de la sala, el portón y una ventana.
const SALA = Object.freeze({ b: -5, largo: 10.2, n: 3 }) // centros en b = −8,4, −5 y −1,6
const PORTON = Object.freeze({ b: 2.6, ancho: 2, alto: 3.4 })
const VENTANA_NORTE_B = 7.2
const VENTANA = Object.freeze({ ancho: 1.3, alto: 2.5, y: 0.95 })
const PUERTA = Object.freeze({ ancho: 1.6, alto: 3 })
const GROSOR_FORRO = 0.14
const GROSOR_PORTADA = 0.2
const A_LA_CALLE = Object.freeze([-1, 0])

/** Los vanos de una fase, de sur a norte: [{ tipo: 'ventana' | 'puerta' | 'porton', b }]. */
export function vanosDeFachada(fase) {
  if (!Object.hasOwn(FASES, fase)) throw new Error(`casa natal: fase desconocida "${fase}"`)
  const sala = fase === 'comercio' ? 'puerta' : 'ventana'
  const centros = Array.from({ length: SALA.n }, (_, i) => SALA.b - SALA.largo / 2 + ((i + 0.5) / SALA.n) * SALA.largo)
  return [...centros.map((b) => ({ tipo: sala, b })), { tipo: 'porton', b: PORTON.b }, { tipo: 'ventana', b: VENTANA_NORTE_B }]
}

/** Las partes de la fachada de una fase, sobre el plano de la calle (a = 0) o delante del forro de piedra. */
function fachada(fase) {
  vanosDeFachada(fase) // valida la fase
  const vida = FASES[fase]
  const restaurada = fase === 'restaurada'
  const a = restaurada ? -GROSOR_FORRO : 0
  const hilera = (medidas) => ({ tipo: 'ventanas', pieza: 'fachada', fase, a, mira: A_LA_CALLE, arco: false, ...medidas, ...vida })
  const ventana = { ...VENTANA, balcon: fase === 'colonial' }
  const forro = (medidas) => ({ tipo: 'cuerpo', pieza: 'fachada', fase, b: 0, giro: Math.PI / 2, techo: 'plano', ...medidas, ...vida })
  return [
    ...(restaurada ? [
      // el forro de piedra clara de 1921 (mármol que imita sillares), delante del muro encalado
      forro({ a: -GROSOR_FORRO / 2, largo: SOLAR.frente, ancho: GROSOR_FORRO, alto: CUERPOS[0].alto, color: TONO.PIEDRA_CLARA }),
      // la portada de piedra: un marco que sobresale alrededor del portón (el escudo no se dibuja)
      forro({ a: a - GROSOR_PORTADA / 2, b: PORTON.b, largo: PORTON.ancho + 1.1, ancho: GROSOR_PORTADA, alto: PORTON.alto + 0.45, color: TONO.PIEDRA }),
    ] : []),
    // la sala del sur: tres ventanas o, reformada para comercio, tres puertas hasta el piso
    fase === 'comercio' ? hilera({ ...SALA, ...PUERTA, y: 0 }) : hilera({ ...SALA, ...ventana }),
    hilera({ a: restaurada ? a - GROSOR_PORTADA : a, b: PORTON.b, largo: PORTON.ancho, n: 1, y: 0, ancho: PORTON.ancho, alto: PORTON.alto }),
    hilera({ b: VENTANA_NORTE_B, largo: VENTANA.ancho, n: 1, ...ventana }),
  ]
}

/** Las crujías: una parte `cuerpo` por cada una, con su tejado de teja. */
const cuerpos = CUERPOS.map(({ a0, a1, b0, b1, alto, cumbrera }) => {
  const [la, lb] = [a1 - a0, b1 - b0]
  const comun = { tipo: 'cuerpo', pieza: 'cuerpos', a: (a0 + a1) / 2, b: (b0 + b1) / 2, alto, teja: TONO.TEJA_VIEJA }
  // paralela a la calle, con alero a la calle y a los patios; a lo largo del solar, sin alero (medianera y patio)
  return cumbrera === 'b'
    ? { ...comun, giro: Math.PI / 2, largo: lb, ancho: la, altoTecho: 2.2 }
    : { ...comun, largo: la, ancho: lb, altoTecho: 1.1, alero: 0 }
})

const solar = [rectanguloPx(marco, SOLAR.fondo, SOLAR.frente, SOLAR.fondo / 2, 0)]
const techado = CUERPOS.map(({ a0, a1, b0, b1 }) => rectanguloPx(marco, a1 - a0, b1 - b0, (a0 + a1) / 2, (b0 + b1) / 2))

const DHV = 'Rafael Fuentes Carvallo, «Casa Natal del Libertador», Diccionario de Historia de Venezuela, Fundación Empresas Polar: https://bibliofep.fundacionempresaspolar.org/dhv/entradas/c/casa-natal-del-libertador/'
const LANDAETA = 'Manuel Landaeta Rosales, «La casa donde nació el Libertador en 1783», Caracas, Emp. El Cojo, 1912: https://archive.org/details/lacasadondenacie00land'
const IPC = 'IPC, Catálogo del Patrimonio Cultural Venezolano 2004-2007, municipio Libertador, «Lo construido», p. 46: https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf'

export const casaNatal = Object.freeze({
  id: 'casa-natal', nombre: 'Casa Natal del Libertador', ...marco, nace: 1, muere: 0,
  // sin solarCompleto: entre medianeras, la casa vecina que apenas roza el solar sigue en pie (src/hitos/suprimir.js)
  planta: techado, suprime: solar, sinArboles: solar,
  partes: [...cuerpos, ...Object.keys(FASES).flatMap(fachada)],
  fuente: `${DHV} (solar de 22,40 × 60,50 m; daños de 1812 y supresión del piso alto; reconstrucción decretada en 1916 e inaugurada el 5-7-1921); ${LANDAETA} (portón y cuatro ventanas, tres en la sala del sur; rejas de madera y después de hierro; puertas de comercio; lámina de la fachada); ${IPC} (un solo nivel, zaguán y dos patios, fachada de 1921 con mármol); rayado «Casa Natal» del plano DCN de 1936, contrastado con el de 1946`,
  verificar: [
    'Alturas sin fuente: ninguna está medida ni publicada. Va un piso de 5 m a la calle y 4,2 a 4,6 m adentro, con tejado bajo.',
    'El piso alto anterior a 1812 no se dibuja: Landaeta dice que la casa «era de alto interiormente» y el DHV, que Juan Vicente Bolívar y Ponte le hizo un piso alto, pero ninguno dice dónde estaba ni desde cuándo. En 1772 va de un piso, como en la lámina de 1912.',
    'Solar de 22,40 × 60,50 m (DHV), ubicado sobre el rayado del plano de 1936: allí el ancho leído da 21,9 m y el fondo unos 60 m. El plano de 1946 dibuja un contorno 3 m más ancho. La línea de fachada sale del plano de 1946, porque en el mosaico de 1936 la costura de las hojas tapa la calle.',
    'Zaguán y dos patios según el IPC, que describe la casa restaurada. Los patios van donde el plano de 1936 deja blancos; su tamaño es interpretativo y no se sabe cómo eran antes de 1916. Los corredores no se dibujan: quedan dentro de las crujías.',
    'Fachada de 1772: la de la lámina de Landaeta (1912), que por su texto parece salir del cuadro que Néstor Hernández pintó en 1883 para mostrarla «con la forma que tenía entonces»: es una reconstrucción hecha cien años después.',
    'Fachada de 1843 y 1889: las mismas ventanas sin las rejas de madera. Las de hierro «que se le pusieron después del terremoto» (Landaeta) no se dibujan, y la lámina del Papel Periódico Ilustrado de 1883 que él cita no se consultó.',
    'Fachada de 1911: Landaeta no fecha el cambio de las tres ventanas del sur por puertas; ocurrió entre 1883 y 1912. En 1889 se dibuja todavía con ventanas, sin prueba.',
    'Fachada de 1936 y 1946: muros forrados de mármol que imita sillares y portada de piedra con el escudo (Guía CCS: https://guiaccs.com/en/obras/birthplace-of-libertador-simon-bolivar/). Va un forro liso de piedra clara y el marco de la portada; el escudo y las rejas no se dibujan. El número de ventanas se toma de fotos de 1967 y de 2013, no de una vista de la época.',
    'No se modelan el Museo Bolivariano ni la Sociedad Bolivariana, vecinos posteriores a 1946, ni la casa de dos pisos que la lámina muestra al norte.',
  ],
})
