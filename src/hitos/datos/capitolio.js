import { EJE_DAMERO, rectanguloPx } from './marco.js'

// Centro de la manzana del recuadro «Palacio Federal» del plano de 1936.
const marco = { x: 8690, y: 7035, eje: EJE_DAMERO }
// Manzana completa: 92 m a lo largo del eje (E–O) y 108 m hacia el sur (N–S).
const planta = [rectanguloPx(marco, 92, 108)]
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
    'Se conservan el ancla (8690, 7035), el eje EJE_DAMERO y la huella nominal de 92 × 108 m; el calce fino y la supresión de casas de 1772 y 1843 deben verificarse contra los planos calzados.',
    'Las fotos de referencia del estudio no tienen licencia de reproducción verificada: orientan formas y no se publican.',
  ],
  partes: [
    { tipo: 'capitolio', anio: 1772, nace: 1, muere: 2 },
    { tipo: 'capitolio', anio: 1843, nace: 2, muere: 3 },
    // El cuerpo neoclásico es el mismo desde 1889; solo cambian la cúpula (1890–1891) y la altura de los chaguaramos.
    { tipo: 'capitolio', anio: 1889, componente: 'cuerpo', nace: 3, muere: 0 },
    { tipo: 'capitolio', anio: 1889, componente: 'cupula', nace: 3, muere: 4 },
    { tipo: 'capitolio', anio: 1911, componente: 'cupula', nace: 4, muere: 0 },
    { tipo: 'capitolio', anio: 1889, componente: 'palmas', nace: 3, muere: 4 },
    { tipo: 'capitolio', anio: 1911, componente: 'palmas', nace: 4, muere: 5 },
    { tipo: 'capitolio', anio: 1936, componente: 'palmas', nace: 5, muere: 0 },
  ],
})
