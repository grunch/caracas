import { METRO } from './marco.js'

// La manzana entera, de calle a calle: la celda de los ejes de la referencia (tools/geo/referencias/1772-red.json:
// X1772-0043, -0060, -0059 y -0042) metida media banda de cada calle (1772-calles-1936.json: 4,0 m al norte, 5,59 m
// en las otras tres). No es un rectángulo: el lado norte (123,5 m) es 7,6 m más corto que el sur (131,1 m), y el oeste
// gira 3,5° respecto del este. Esquinas NO, NE, SE, SO en px del plano. Con el rectángulo de 131,4 × 123,4 m de antes,
// la esquina noroeste quedaba sobre el eje de la calle oeste.
const ESQUINAS_PX = [[8590.7, 6875.2], [8833.6, 6919.9], [8789.0, 7168.8], [8531.6, 7118.3]]
const marco = { x: 8686.2, y: 7020.6, eje: [0.9824, 0.1868] } // el centro de la manzana; el eje, el de sus lados norte y sur
const planta = [ESQUINAS_PX]
// Las esquinas en metros en el marco del hito (+a a lo largo del eje, al este; +b a su derecha, al sur): el modelo,
// hecho sobre una plataforma de 95 × 111 m (src/hitos/capitolio-modelo.js), se lleva a ellas (src/hitos/capitolio.js),
// así cada fachada sigue su calle y nada pasa a ella (salvo la escalinata del Palacio Legislativo, que baja a la acera
// sur como en el original).
const esquinas = ESQUINAS_PX.map(([px, py]) => {
  const n = Math.hypot(marco.eje[0], marco.eje[1])
  const [ux, uy, dx, dy] = [marco.eje[0] / n, marco.eje[1] / n, px - marco.x, py - marco.y]
  return [(dx * ux + dy * uy) * METRO, (-dx * uy + dy * ux) * METRO]
})
// la terraza del relieve es un rectángulo en el marco: el inscrito en la manzana (uno que la cubriera se metería en
// las calles y se vería su piso). En las puntas del trapecio queda fuera hasta ~6 m, con la pendiente de la manzana
// (6 m en 130 m), unos 0,3 m bajo el muro
export const MANZANA = Object.freeze({
  ancho: 2 * Math.min(...esquinas.map(([a]) => Math.abs(a))), fondo: 2 * Math.min(...esquinas.map(([, b]) => Math.abs(b))),
})
export const capitolio = Object.freeze({
  id: 'capitolio', nombre: 'Capitolio (Palacio Federal y Legislativo)', ...marco, nace: 1, muere: 0,
  planta, suprime: planta,
  terraza: MANZANA, // la manzana en pendiente (hasta 6 m): el suelo queda plano a la altura de su piso (src/relieve.js)
  patio: true, // claustro (1772–1843) y patio de la fuente (desde 1873): el modo a pie choca en la crujía y no en el patio
  fuente: 'Plano de Caracas de 1936 (recuadro «Palacio Federal»: cuatro alas alrededor de un jardín, con óvalo en el ala norte); ' +
    'plano de Mestre de 1889 (1 «Capitolio», 2 «Palacio Federal»); Wikipedia https://es.wikipedia.org/wiki/Palacio_Federal_Legislativo; ' +
    'Fundación Empresas Polar · Diccionario de Historia de Venezuela https://bibliofep.fundacionempresaspolar.org/; ' +
    'estudio por épocas aprobado en miraflores (capitolio.html), límites en specs/08-capitolio-por-epocas.md.',
  verificar: [
    '1772 y 1843 representan el Convento de las Concepciones (manzana completa, iglesia al norte orientada al este, claustro principal y huerta sur); alzados y daños posteriores a 1812 son interpretativos.',
    '1889 representa el conjunto de Luciano Urdaneta (1873–1877) con la bóveda elíptica achatada original, anterior a la sobrecúpula belga de Antonio Malaussena (montada en 1890–1891).',
    '1911 y 1936 llevan la sobrecúpula metálica de hierro y zinc con linterna calada (cotejada con una foto de hacia 1930). La sobrecúpula dorada de aluminio anodizado es de 1958 y no entra en los mapas hasta 1936.',
    'La manzana es la celda de los ejes de la referencia de 1772 menos media banda de cada calle (lados de 123,5 a 131,1 m, centro 8686,2, 7020,6); el modelo, hecho sobre 92 × 108 m, se lleva a sus cuatro esquinas, y sus proporciones son interpretativas.',
    'Las fotos de referencia del estudio no tienen licencia de reproducción verificada: orientan formas y no se publican.',
  ],
  partes: [
    { tipo: 'capitolio', anio: 1772, nace: 1, muere: 2, esquinas },
    { tipo: 'capitolio', anio: 1843, nace: 2, muere: 3, esquinas },
    // El cuerpo neoclásico es el mismo desde 1889; solo cambian la cúpula (1890–1891) y la altura de los chaguaramos.
    { tipo: 'capitolio', anio: 1889, componente: 'cuerpo', nace: 3, muere: 0, esquinas },
    { tipo: 'capitolio', anio: 1889, componente: 'cupula', nace: 3, muere: 4, esquinas },
    { tipo: 'capitolio', anio: 1911, componente: 'cupula', nace: 4, muere: 0, esquinas },
    { tipo: 'capitolio', anio: 1889, componente: 'palmas', nace: 3, muere: 4, esquinas },
    { tipo: 'capitolio', anio: 1911, componente: 'palmas', nace: 4, muere: 5, esquinas },
    { tipo: 'capitolio', anio: 1936, componente: 'palmas', nace: 5, muere: 0, esquinas },
  ],
})
