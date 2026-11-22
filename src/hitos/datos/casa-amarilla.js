import { EJE_DAMERO, rectanguloPx } from './marco.js'

// Centro heredado del rótulo «Min. del Exterior» del plano de 1936.
const marco = { x: 8822, y: 6770, eje: EJE_DAMERO }
// La fachada de 46 m corre norte-sur; la profundidad de 54 m, este-oeste.
// Incluye plataforma y vuelos. El cuarto de manzana es el solar, no superficie edificada.
const planta = [rectanguloPx(marco, 57, 50)]
export const casaAmarilla = Object.freeze({
  id: 'casa-amarilla', nombre: 'Casa Amarilla', ...marco, nace: 1, muere: 0,
  planta, suprime: planta,
  fuente: 'Plano de Caracas de 1936 (Min. del Exterior); Bolet, 1870; litografía de H. Neun (fecha por verificar); Wikipedia https://es.wikipedia.org/wiki/Casa_Amarilla_de_Caracas; Fundación Empresas Polar https://bibliofep.fundacionempresaspolar.org/dhv/entradas/c/casa-amarilla/; IAM/IPC https://iamvenezuela.org/2016/07/casa-amarilla/.',
  verificar: [
    'Ayuntamiento terminado en 1750, contiguo a la cárcel: dos inmuebles en 1772; el alzado, los dos patios y la casamata son interpretativos.',
    'La reunión de los edificios se inaugura en 1842. Para 1843 se interpreta retrospectivamente la silueta de la pintura de Bolet de 1870.',
    'Desde 1889 se modelan la reforma de 1874 y el amarillo de 1877: puerta lateral única, balcón de tres vanos arqueados, talla y bandera de siete estrellas según época.',
    'En 1936 se conserva parte del tejado: la localización de la platabanda posterior es hipotética. No se incluye la ampliación de 1938.',
    'Medidas nominales, sin levantamiento: 46 m de fachada y 54 m de profundidad. Se mantiene el centro del hito anterior; linderos coloniales y posición fina por cotejar.',
    'Las fotos modernas precisan formas, no datan cada adorno. Relieves, escudo y placa simplificados; referencias aportadas sin licencia de reproducción verificada, no se publican.',
  ],
  partes: [
    { tipo: 'casaAmarilla', anio: 1772, nace: 1, muere: 2 },
    { tipo: 'casaAmarilla', anio: 1843, nace: 2, muere: 3 },
    // Envolvente compartida desde 1889; solo se reemplazan cubiertas y enseña.
    { tipo: 'casaAmarilla', anio: 1889, componente: 'cuerpo', nace: 3, muere: 0 },
    { tipo: 'casaAmarilla', anio: 1889, componente: 'cubiertas', nace: 3, muere: 5 },
    { tipo: 'casaAmarilla', anio: 1936, componente: 'cubiertas', nace: 5, muere: 0 },
    { tipo: 'casaAmarilla', anio: 1889, componente: 'bandera', nace: 3, muere: 4 },
    { tipo: 'casaAmarilla', anio: 1911, componente: 'bandera', nace: 4, muere: 5 },
    { tipo: 'casaAmarilla', anio: 1936, componente: 'bandera', nace: 5, muere: 0 },
  ],
})
