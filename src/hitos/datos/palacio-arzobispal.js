import { EJE_DAMERO, rectanguloPx } from './marco.js'

// El centro del palacio: la esquina suroeste de la manzana de la Catedral, entre su cuerpo sur y Las Gradillas.
// El plano de 1936 no rotula el palacio: la fachada va sobre la línea de la de la Catedral (a = 0 en su marco) y el
// lado sur, sobre el borde de la manzana frente a la calle de Gradillas a San Jacinto. Equivale a a = 18, b = 55 m
// del marco de la Catedral (9079, 6803).
const marco = { x: 9096, y: 6917.5, eje: EJE_DAMERO }
// 36,6 m de fondo (a, este–oeste) más los balcones sobre la plaza, y 34,6 m de fachada (b, norte–sur).
const planta = [rectanguloPx(marco, 38.6, 35.8, -0.6, 0.35)]
export const palacioArzobispal = Object.freeze({
  id: 'palacio-arzobispal', nombre: 'Palacio Arzobispal', ...marco, nace: 1, muere: 0,
  planta, suprime: planta,
  fuente: 'Plano de Caracas de 1936 (la manzana de la «Iglesia Catedral», al sur de su cuerpo bajo, en la esquina de Las Gradillas); ' +
    'IAM Venezuela / Catálogo IPC https://iamvenezuela.org/2016/06/palacio-arzobispal/ (seis vanos por nivel, dos accesos, patios con galerías, ' +
    'reforma guzmancista y restauración de 1979–1980); Arquidiócesis de Caracas https://arquidiocesiscaracas.com/fundacion/ (erección en 1803); ' +
    'postal de Bernardo Roswaag n.º 98 (hacia 1920, datación de un sitio secundario); estudio por épocas de miraflores (palacio-arzobispal.html), ' +
    'límites en specs/08-palacio-arzobispal-por-epocas.md.',
  verificar: [
    'Huella nominal de 34 × 36 m y cornisa de ~9,5 m: decisiones de modelado, sin levantamiento. El calce en la esquina de Las Gradillas sale del borde de la manzana del plano de 1936, que no rotula el palacio.',
    '1772 y 1843 comparten una hipótesis colonial (dos plantas, vanos adintelados, alero de tejas): no hay alzado colonial ni linderos acotados; los seis ejes y los dos patios se proyectan hacia atrás.',
    'Desde 1889 se usa la envolvente posterior a la reforma de 1876–1877 (arcos rebajados, bandas, cornisa y pretil de recuadros), leída en la postal Roswaag de hacia 1920: su aplicación a 1889 y a 1936 es una hipótesis de continuidad.',
    'La fachada lateral sobre la calle del sur, la medianera ciega hacia la Catedral, los dos patios y las cubiertas son interpretativos. El edificio municipal vecino queda fuera.',
    'Colores no verificados: no se usa el amarillo ni el blanco de las fotos posteriores a la restauración de 1979–1980.',
    'Las referencias del estudio (postal y fotos) no se copian ni se publican: orientan formas.',
  ],
  partes: [
    // Los patios son iguales en todas las fechas; la envolvente (fachadas, muros y cubiertas) cambia en 1876–1877.
    { tipo: 'palacioArzobispal', anio: 1772, componente: 'comun', nace: 1, muere: 0 },
    { tipo: 'palacioArzobispal', anio: 1772, componente: 'epoca', nace: 1, muere: 3 },
    { tipo: 'palacioArzobispal', anio: 1889, componente: 'epoca', nace: 3, muere: 0 },
  ],
})
