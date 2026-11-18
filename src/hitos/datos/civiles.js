/**
 * Los edificios civiles: palacios y la Universidad. Plantas: los recuadros rayados y rotulados del plano de
 * 1936; alzados: las imágenes de fuentes/imagenes cuando las hay (Casa Amarilla ~1875, fachada neogótica de
 * 1880, panorámica de ~1903). Lo demás va en `verificar`.
 */
import { EJE_DAMERO, rectanguloPx } from './marco.js'

const PLANO = 'Plano de Caracas de 1936'
const eje = EJE_DAMERO

const amarilla = { x: 8822, y: 6770, eje }
const AMARILLA = { ancho: 46, fondo: 54, pisos: 2, altoPiso: 5.2 }
const capitolio = { x: 8690, y: 7035, eje }
const CAPITOLIO = { ancho: 92, fondo: 108, crujia: 15, pisos: 2, altoPiso: 6 }
const universidad = { x: 8645, y: 7192, eje } // el medio del frente norte, sobre la calle
const UNIVERSIDAD = { largo: 96, frente: 12, fondo: 44 }
const miraflores = { x: 7958, y: 6360, eje }
const MIRAFLORES = { ancho: 56, fondo: 72, crujia: 13, pisos: 2, altoPiso: 5 }

export const civiles = Object.freeze([
  Object.freeze({
    id: 'casa-amarilla', nombre: 'Casa Amarilla', ...amarilla, nace: 3, muere: 0,
    planta: [rectanguloPx(amarilla, AMARILLA.ancho, AMARILLA.fondo)], suprime: [rectanguloPx(amarilla, AMARILLA.ancho, AMARILLA.fondo)],
    fuente: `${PLANO} (recuadro "Min. del Exterior", frente al lado oeste de la Plaza Bolívar); grabado de ~1875 (fuentes/imagenes)`,
    verificar: [
      'Palacio de esquina de dos pisos, con cornisa, balcones y remate central con escudo y asta: del grabado de ~1875 (fecha a verificar).',
      'El color amarillo es el del nombre; el grabado no tiene color.',
      'Va desde la época de 1889 con la fachada neoclásica; el edificio anterior del lugar no se modela.',
      'La galería de tres arcos del extremo izquierdo del grabado no se modela.',
    ],
    partes: [
      { tipo: 'palacio', ...AMARILLA, crujia: 11, cubierta: 'azotea', color: 0xecd58a, balcones: true },
      { tipo: 'remateConEscudo', a: AMARILLA.ancho / 2, h: AMARILLA.pisos * AMARILLA.altoPiso + 0.8, mira: [1, 0], color: 0xecd58a },
    ],
  }),
  Object.freeze({
    id: 'capitolio', nombre: 'Capitolio (Palacio Federal y Legislativo)', ...capitolio, nace: 3, muere: 0,
    planta: [rectanguloPx(capitolio, CAPITOLIO.ancho, CAPITOLIO.fondo)], suprime: [rectanguloPx(capitolio, CAPITOLIO.ancho, CAPITOLIO.fondo)],
    fuente: `${PLANO} (recuadro "Palacio Federal": cuatro alas alrededor de un jardín, con un óvalo en el ala norte)`,
    verificar: [
      'Sin imagen de referencia en fuentes/imagenes: alzado genérico de palacio de dos pisos con pabellones de esquina y pórticos.',
      'La cúpula va en el ala norte, donde el plano dibuja el óvalo; su forma (acá redonda) y su color dorado, a verificar con una foto.',
      'El plano de 1889 ya rotula el Capitolio: va desde esa época.',
      'El jardín del patio es el que dibuja el plano en el suelo; no se modela la fuente.',
    ],
    partes: [
      { tipo: 'palacio', ...CAPITOLIO, cubierta: 'azotea', pabellones: true },
      { tipo: 'cupula', a: 8, b: -(CAPITOLIO.fondo - CAPITOLIO.crujia) / 2, h: CAPITOLIO.pisos * CAPITOLIO.altoPiso, radio: 7, altoTambor: 3.5, alto: 6.5, lados: 16, cubierta: 0xc9a43c },
      { tipo: 'portico', a: 0, b: CAPITOLIO.fondo / 2, mira: [0, 1], ancho: 24, alto: 12, columnas: 8 },
      { tipo: 'portico', a: 0, b: -CAPITOLIO.fondo / 2, mira: [0, -1], ancho: 18, alto: 12, columnas: 6 },
    ],
  }),
  Object.freeze({
    id: 'universidad', nombre: 'Universidad Central (fachada neogótica)', ...universidad, nace: 3, muere: 0,
    planta: [rectanguloPx(universidad, UNIVERSIDAD.largo, UNIVERSIDAD.frente + UNIVERSIDAD.fondo, 0, (UNIVERSIDAD.frente + UNIVERSIDAD.fondo) / 2)],
    suprime: [rectanguloPx(universidad, UNIVERSIDAD.largo, UNIVERSIDAD.frente + UNIVERSIDAD.fondo, 0, (UNIVERSIDAD.frente + UNIVERSIDAD.fondo) / 2)],
    fuente: `${PLANO} (recuadro "Universidad Central", frente al Palacio Federal); foto de 1880 con la estatua de Guzmán Blanco (fuentes/imagenes)`,
    verificar: [
      'Que la fachada neogótica de la foto de 1880 sea la de la Universidad frente al Capitolio: identificación a verificar (la ficha de la foto la deja con signo de pregunta).',
      'Largo del frente y cuerpo de atrás: del recuadro del plano; los patios no se modelan.',
      'La estatua ecuestre de Guzmán Blanco de la foto no se modela: se derribó hacia 1889 (a verificar) y no cae en ninguna época.',
    ],
    partes: [
      { tipo: 'frenteNeogotico', a: 0, b: UNIVERSIDAD.frente / 2, mira: [0, -1], largo: UNIVERSIDAD.largo, fondo: UNIVERSIDAD.frente, alto: 9 },
      { tipo: 'cuerpo', a: 0, b: UNIVERSIDAD.frente + UNIVERSIDAD.fondo / 2, largo: UNIVERSIDAD.largo - 2, ancho: UNIVERSIDAD.fondo, alto: 8, techo: 'cuatro', altoTecho: 4 },
    ],
  }),
  Object.freeze({
    id: 'miraflores', nombre: 'Palacio de Miraflores', ...miraflores, nace: 4, muere: 0,
    planta: [rectanguloPx(miraflores, MIRAFLORES.ancho, MIRAFLORES.fondo)], suprime: [rectanguloPx(miraflores, MIRAFLORES.ancho, MIRAFLORES.fondo)],
    fuente: `${PLANO} (recuadro "Palacio Miraflores"); panorámica de ~1903 desde El Calvario (fuentes/imagenes)`,
    verificar: [
      'Palacio con mansardas sobre un basamento, en la panorámica de ~1903 (identificación a ojo).',
      'La planta del plano es más irregular que el rectángulo modelado; el basamento con muro de contención lo da solo el relieve.',
      'Va desde la época de 1911; si ya estaba en pie en 1889, a verificar.',
    ],
    partes: [{ tipo: 'palacio', ...MIRAFLORES, cubierta: 'mansarda', pabellones: true }],
  }),
])
