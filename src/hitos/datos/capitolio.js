import { rectanguloPx } from './marco.js'

// La manzana entera, de calle a calle, medida sobre el 1772 calzado (fuentes/derivados/1772/calzado.tif): la celda
// de los ejes de la referencia (tools/geo/referencias/1772-red.json), hasta el borde de la manzana roja del original
// (5,25–7 m hacia adentro de cada eje). Coincide con la línea de las manzanas vecinas del plano de 1936 (la Academia,
// el Palacio de Justicia): el conjunto, con sus jardines, llega a la calle, como hoy. Gira 1,56° respecto del damero.
// Antes era la huella del edificio rayado de 1936 (92 × 108 m en 8690, 7035), y en 1772 quedaban casas a los costados.
export const MANZANA = Object.freeze({ ancho: 131.4, fondo: 123.4 })
const marco = { x: 8683.3, y: 7022.0, eje: [0.9813, 0.1927] }
const planta = [rectanguloPx(marco, MANZANA.ancho, MANZANA.fondo)]
// El modelo está hecho sobre la huella nominal de 92 × 108 m, con una plataforma de 94 × 110 m que es lo más ancho
// (src/hitos/capitolio-modelo.js): se estira la plataforma hasta la manzana, así nada pasa a la calle (salvo la
// escalinata del Palacio Legislativo, que baja a la acera sur como en el original).
const escala = [MANZANA.ancho / 94, MANZANA.fondo / 110]
export const capitolio = Object.freeze({
  id: 'capitolio', nombre: 'Capitolio (Palacio Federal y Legislativo)', ...marco, nace: 1, muere: 0,
  planta, suprime: planta,
  patio: true, // claustro (1772–1843) y patio de la fuente (desde 1873): el modo a pie choca en la crujía y no en el patio
  fuente: 'Plano de Caracas de 1936 (recuadro «Palacio Federal»: cuatro alas alrededor de un jardín, con óvalo en el ala norte); ' +
    'plano de Mestre de 1889 (1 «Capitolio», 2 «Palacio Federal»); Wikipedia https://es.wikipedia.org/wiki/Palacio_Federal_Legislativo; ' +
    'Fundación Empresas Polar · Diccionario de Historia de Venezuela https://bibliofep.fundacionempresaspolar.org/; ' +
    'estudio por épocas aprobado en miraflores (capitolio.html), límites en specs/08-capitolio-por-epocas.md.',
  verificar: [
    '1772 y 1843 representan el Convento de las Concepciones (manzana completa, iglesia al norte orientada al este, claustro principal y huerta sur); alzados y daños posteriores a 1812 son interpretativos.',
    '1889 representa el conjunto de Luciano Urdaneta (1873–1877) con la bóveda elíptica achatada original, anterior a la sobrecúpula belga de Antonio Malaussena (montada en 1890–1891).',
    '1911 y 1936 llevan la sobrecúpula metálica de hierro y zinc con linterna calada (cotejada con una foto de hacia 1930). La sobrecúpula dorada de aluminio anodizado es de 1958 y no entra en los mapas hasta 1936.',
    'La manzana (131,4 × 123,4 m, centro 8683,3, 7022,0, 1,56° sobre el damero) se midió sobre el 1772 calzado y coincide con las manzanas vecinas de 1936; el modelo, hecho sobre 92 × 108 m, se estira a ella (40 % E–O, 12 % N–S), y sus proporciones son interpretativas.',
    'Las fotos de referencia del estudio no tienen licencia de reproducción verificada: orientan formas y no se publican.',
  ],
  partes: [
    { tipo: 'capitolio', anio: 1772, nace: 1, muere: 2, escala },
    { tipo: 'capitolio', anio: 1843, nace: 2, muere: 3, escala },
    // El cuerpo neoclásico es el mismo desde 1889; solo cambian la cúpula (1890–1891) y la altura de los chaguaramos.
    { tipo: 'capitolio', anio: 1889, componente: 'cuerpo', nace: 3, muere: 0, escala },
    { tipo: 'capitolio', anio: 1889, componente: 'cupula', nace: 3, muere: 4, escala },
    { tipo: 'capitolio', anio: 1911, componente: 'cupula', nace: 4, muere: 0, escala },
    { tipo: 'capitolio', anio: 1889, componente: 'palmas', nace: 3, muere: 4, escala },
    { tipo: 'capitolio', anio: 1911, componente: 'palmas', nace: 4, muere: 5, escala },
    { tipo: 'capitolio', anio: 1936, componente: 'palmas', nace: 5, muere: 0, escala },
  ],
})
