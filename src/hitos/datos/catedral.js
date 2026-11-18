/**
 * La Catedral, en la esquina de La Torre. Planta: el recuadro blanco "Iglesia Catedral" del plano de 1936
 * (la costura del mosaico tapa su cabecera). Alzado: la foto de 1866, el grabado de 1867 y las fotos de 1874
 * y 1910 (fuentes/imagenes): la fachada mira al oeste, a la plaza, con la torre a su izquierda (al norte).
 */
import { EJE_DAMERO, rectanguloPx } from './marco.js'

// el origen: el pie de la fachada, en el medio del frente de la nave; el eje entra en la nave, hacia el este
const marco = { x: 9079, y: 6803, eje: EJE_DAMERO }
const NAVE = { largo: 78, ancho: 27, alto: 10.5, altoTecho: 6 }
const ALA = { largo: 46, ancho: 14.5, alto: 8 } // el cuerpo bajo al sur de la nave, sobre la plaza
const TORRE = 7
const [N, S] = [-NAVE.ancho / 2, NAVE.ancho / 2]
const AL_OESTE = [-1, 0]

export const catedral = Object.freeze({
  id: 'catedral',
  nombre: 'Catedral de Caracas',
  ...marco,
  nace: 1,
  muere: 0,
  planta: [rectanguloPx(marco, NAVE.largo, NAVE.ancho, NAVE.largo / 2, 0), rectanguloPx(marco, ALA.largo, ALA.ancho, ALA.largo / 2, S + ALA.ancho / 2)],
  suprime: [rectanguloPx(marco, NAVE.largo + 2, NAVE.ancho + 2, NAVE.largo / 2, 0), rectanguloPx(marco, ALA.largo, ALA.ancho + 1, ALA.largo / 2, S + ALA.ancho / 2)],
  fuente: 'Plano de Caracas de 1936 (recuadro "Iglesia Catedral"); foto de 1866, grabado de 1867 y fotos de 1874 y 1910 (fuentes/imagenes)',
  verificar: [
    'El largo de la nave (78 m): la costura del mosaico de 1936 tapa la cabecera.',
    'Alturas a ojo desde las fotos: muro de la nave ~10 m, fachada ~17 m, torre ~34 m con la figura (unas tres veces el muro).',
    'Va desde la época de 1772 con el aspecto de las imágenes de 1866–1874; no hay imagen del siglo XVIII, y en 1578 había otra iglesia en el lugar (no se modela).',
    'El muro blanco largo de la foto de 1866 y el grabado de 1867 seguía por el lado este de la plaza hasta Gradillas; acá solo va el cuerpo que dibuja el plano de 1936 al sur de la nave.',
    'La figura sobre el cupulín se ve en las fotos de 1866 y ~1880; en qué épocas estuvo, a verificar.',
  ],
  partes: [
    { tipo: 'cuerpo', a: NAVE.largo / 2, ...NAVE, ventanas: { n: 7, y: 6, alto: 2.4 } },
    { tipo: 'cupula', a: NAVE.largo * 0.55, h: NAVE.alto + NAVE.altoTecho - 0.6, radio: 1.7, altoTambor: 1.6, alto: 1.5, lados: 8 }, // el lucernario
    { tipo: 'fachadaBarroca', a: 0, b: (N + TORRE + S) / 2, mira: AL_OESTE, ancho: NAVE.ancho - TORRE, alto1: 7.5, alto2: 5, altoFronton: 5 },
    {
      tipo: 'torre', a: TORRE / 2 - 0.3, b: N + TORRE / 2, lado: TORRE,
      cuerpos: [{ alto: 12.5, vanos: 'apilados' }, { alto: 8, vanos: 'reloj', balcon: true }, { alto: 6, lado: 6, vanos: 'arco' }],
      remate: { tipo: 'cupulin', alto: 6, figura: true },
    },
    // el cuerpo del sur: muro blanco casi ciego hacia la plaza, con portada de frontón y ventanas de balcón
    { tipo: 'cuerpo', a: ALA.largo / 2, b: S + ALA.ancho / 2, ...ALA, techo: 'cuatro', altoTecho: 3.4 },
    { tipo: 'portadaLateral', a: 0, b: S + 3.4, mira: AL_OESTE },
    { tipo: 'ventanas', a: 0, b: S + 10.2, mira: AL_OESTE, largo: 8, n: 2, y: 4.3, alto: 2, arco: false, balcon: true },
    { tipo: 'ventanas', a: ALA.largo / 2, b: S + ALA.ancho, mira: [0, 1], largo: ALA.largo * 0.8, n: 4, y: 4.3, alto: 2, arco: false, balcon: true },
  ],
})
