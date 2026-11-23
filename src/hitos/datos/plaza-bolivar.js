/**
 * La Plaza Mayor / Plaza Bolívar a través del tiempo. Ubicación y tamaño: el recuadro de la plaza en el
 * plano de 1936, entre las esquinas Principal, La Torre, Las Monjas y Las Gradillas. Todo lo demás sale de
 * las imágenes de fuentes/imagenes (ver su README): el mercado de 1852 y las fotos de 1866 a ~1930.
 */
import { EJE_DAMERO, rectanguloPx } from './marco.js'

// el centro de la manzana de la plaza: el de las cuatro esquinas que la rodean en el plano (Principal, La Torre, Las Monjas
// y Las Gradillas, tools/geo/esquinas/1936-esquinas.json). En (8976, 6844) quedaba unos 6 m al este: Sur 0 angosta y Sur 2
// ancha frente a las manzanas de 1772, que se arman desde esos mismos cruces
const marco = { x: 8964.25, y: 6834.5, eje: EJE_DAMERO }
const ANCHO = 86 // m, de oeste a este
const FONDO = 82 // m, de norte a sur
const [W, D] = [ANCHO / 2, FONDO / 2]
const MERCADO = { nace: 1, muere: 3 } // épocas 1772 y 1843
const JARDIN = { nace: 3 } // de 1889 en adelante

/** Entradas: al medio de cada lado y en las esquinas del norte (a nivel); al sur, por las escalinatas. */
const ESCALINATAS = [[0, D, 0, 1, 12], [-(W - 7), D, 0, 1, 9], [W - 7, D, 0, 1, 9], [W, 0, 1, 0, 8], [-W, 0, -1, 0, 8]]
const HUECOS = {
  norte: [[0, 8], [-(W - 4), 8], [W - 4, 8]],
  sur: [[0, 12], [-(W - 7), 9], [W - 7, 9]],
  este: [[0, 8], [-(D - 4), 8]],
  oeste: [[0, 8], [-(D - 4), 8]],
}
const cuatro = ([a, b]) => [[a, b], [-a, b], [a, -b], [-a, -b]]

export const plazaBolivar = Object.freeze({
  id: 'plaza-bolivar',
  nombre: 'Plaza Bolívar',
  ...marco,
  nace: 1,
  muere: 0,
  planta: [rectanguloPx(marco, ANCHO, FONDO)],
  transitable: true, // la plaza se camina: en el modo a pie chocan sus piezas, no su planta (T33j.7a)
  suprime: [rectanguloPx(marco, ANCHO, FONDO)],
  fuente: 'Plano de Caracas de 1936 (recuadro "Plaza Bolívar"); grabado del mercado de 1852; fotos de 1866, 1874, ~1880, ~1900, 1910 y ~1930 (fuentes/imagenes)',
  verificar: [
    'Las épocas 1772 y 1843 muestran el mercado tal como lo dibuja el grabado de 1852; no hay imagen de 1772.',
    'El mercado se quitó hacia 1865 y la estatua se puso en 1874 (fechas de las fotos, a verificar): el cambio cae entre las épocas 1843 y 1889.',
    'Las galerías van con arcos a los dos lados; el grabado solo muestra el lado de la plaza.',
    'La estatua mira al sur (así se ve en las fotos de 1874 y ~1880 con la Catedral detrás); a verificar.',
    'La foto de 1874 muestra una verja baja alrededor del pedestal; en las de ~1880 y ~1900 ya no está: no se modela.',
    'La plaza real es una explanada a nivel, hundida respecto de la calle al norte (la foto de ~1930 mira hacia arriba de una escalinata); acá es plana solo en la mitad baja y las escalinatas quedan al sur.',
    'El piso en damero es de la foto de ~1900: va en las épocas 1911 y 1936.',
    'Posición y número de faroles: de las fotos (grandes de varios brazos en las entradas, de pie en los caminos), no de un plano.',
  ],
  partes: [
    // --- el mercado de la Plaza Mayor (grabado de 1852) ---
    { tipo: 'terraza', ...MERCADO, ancho: ANCHO, fondo: FONDO, piso: 'tierra' },
    { tipo: 'galeriasDeMercado', ...MERCADO, ancho: ANCHO, fondo: FONDO },
    { tipo: 'puestos', ...MERCADO, ancho: ANCHO - 20, fondo: FONDO - 22, filas: 9 },
    { tipo: 'escalinatas', ...MERCADO, en: [[0, D, 0, 1, 9]] },
    // --- la plaza ajardinada de Guzmán Blanco (fotos de 1874 a ~1930) ---
    { tipo: 'terraza', nace: 3, muere: 4, ancho: ANCHO, fondo: FONDO, piso: 'jardin' },
    { tipo: 'terraza', nace: 4, ancho: ANCHO, fondo: FONDO, piso: 'damero' },
    { tipo: 'verjaPerimetral', ...JARDIN, ancho: ANCHO, fondo: FONDO, huecos: HUECOS },
    { tipo: 'escalinatas', ...JARDIN, en: ESCALINATAS },
    { tipo: 'estatuaEcuestre', ...JARDIN, mira: [0, 1] },
    {
      tipo: 'faroles', ...JARDIN, brazos: 4,
      puntos: [
        [-7, D - 1], [7, D - 1], [-(W - 12.5), D - 1], [W - 12.5, D - 1], [-(W - 1.5), D - 1], [W - 1.5, D - 1],
        [-5, -(D - 1)], [5, -(D - 1)], [W - 1, -5], [W - 1, 5], [-(W - 1), -5], [-(W - 1), 5],
        [-(W - 1.5), -(D - 1.5)], [W - 1.5, -(D - 1.5)],
      ],
    },
    {
      tipo: 'faroles', ...JARDIN,
      puntos: [...cuatro([W * 0.42, D * 0.48]), ...cuatro([W * 0.72, D * 0.76]), ...cuatro([20, 3.4]), ...cuatro([3.4, 22]), ...cuatro([8, 8])],
    },
  ],
})
