import { rectanguloPx } from './marco.js'

// Huella interpretativa ajustada del polígono de pabellones del plano Mestre 1889 al mosaico común de 1936.
// Centro aproximado (9796, 4503), eje transversal este-noreste y dimensión nominal 100 × 270 m.
const marco = { x: 9796, y: 4503, eje: [0.963, 0.269] }
const recinto = [rectanguloPx(marco, 100, 270)]

export const hospitalVargas = Object.freeze({
  id: 'hospital-vargas', nombre: 'Hospital Vargas', ...marco, nace: 3, muere: 0,
  planta: recinto, suprime: recinto, sinArboles: recinto, solarCompleto: true,
  partes: [
    { tipo: 'hospitalVargas', anio: 1889, nace: 3, muere: 4 },
    { tipo: 'hospitalVargas', anio: 1911, nace: 4, muere: 5 },
    { tipo: 'hospitalVargas', anio: 1936, nace: 5, muere: 0 },
  ],
  fuente: 'Plano topográfico de Caracas de Vicente S. Mestre (1889), n.º 43 «Hospital Vargas», raster BnF vía Wikimedia Commons, dominio público; calce TPS del proyecto (1889→1936), 479 GCP, RMS LOO 7,64 m; Guía de Caracas: https://guiaccs.com/obras/hospital-vargas/; Roger Escalona, Sociedad Venezolana de Historia de la Medicina (2006): https://revista.svhm.org.ve/ediciones/2006/1-2/art-3; El Cojo Ilustrado (1-1-1892), p. 12: https://www.libroria.com/museo/obras/El%20Cojo%20Ilustrado/1892/pdf/CI_18920101.pdf; Caracas en 450, Fundación Empresas Polar/Banesco: https://banesco-prod-2019.s3.amazonaws.com/wp-content/uploads/Caracas-en-450.pdf',
  verificar: [
    'Centro y contorno nominal de 100 × 270 m interpretados al trasladar la planta dibujada por Mestre al lienzo común. El error de calce local del proyecto es RMS LOO 7,64 m; no es una mensura catastral.',
    'El plano de 1889 dibuja dos alas de pabellones y un núcleo central mientras las obras seguían en curso; los volúmenes esquemáticos representan esa planta documentada, no afirman que todo el conjunto estuviera terminado o atendiendo pacientes.',
    'La Guía de Caracas describe orientación norte-sur, acceso oeste, alas de hombres y mujeres y cinco salas por fila separadas por jardines. Las medidas, vanos y galerías del modelo son aproximaciones.',
    'El Cojo Ilustrado de 1892 muestra una galería hospitalaria, no una elevación completa del exterior. La distribución exacta de las galerías se generaliza.',
    'La fuente de Caracas en 450 fecha desde 1930 la sustitución de cubiertas ojivales de madera por platabandas. La época 1936 aplica cubierta plana; no se dibujan ampliaciones de 1939 porque las fuentes consultadas no permiten ubicarlas dentro del solar.',
    'No se copian imágenes con derechos no verificados. El grabado de 1892 y las fotografías se enlazan como referencias; el plano de Mestre es de dominio público.',
  ],
})
