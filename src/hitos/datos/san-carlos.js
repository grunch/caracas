/**
 * Cuartel San Carlos (#248). La planta es su contorno en el plano DCN de 1936, contrastado con el de 1946
 * (docs/san-carlos-georreferencia.json); las fases salen de las fuentes escritas (docs/san-carlos-integracion.md).
 * El origen es el medio de la fachada sur y el eje entra en el edificio: a = metros hacia el norte, b = metros
 * a la derecha (hacia el este). Lo que no tiene fuente no se dibuja y queda en `verificar`.
 */
import { rectanguloPx } from './marco.js'

const marco = { x: 9138.5, y: 5065.25, eje: [0.4983, -0.867] }
const FRENTE_M = 72.4 // el lado sur del contorno
const MEDIO = FRENTE_M / 2
export const CUADRO_M = 77 // hasta el muro norte de la crujía que cierra el patio: el cuadro anterior a 1900
export const LARGO_M = 98.3 // con las naves prolongadas, el lado oeste del contorno de 1936

/** Los cuerpos que el plano de 1936 rellena como edificados, en metros del marco: [a0, a1, b0, b1]. */
export const CUERPOS_SAN_CARLOS = Object.freeze({
  // el cuadro alrededor del patio central
  cuadro: Object.freeze([
    [0, 13, -MEDIO, MEDIO], // frente sur, con la entrada
    [13, 61.3, 27.8, MEDIO], // nave este
    [13, 61.3, -MEDIO, -20], // nave oeste
    [13, 61.3, -17.5, -5.8], // cuerpo entre la nave oeste y el patio (el plano los separa con una tira en blanco)
    [61.3, CUADRO_M, -MEDIO, MEDIO], // crujía norte del patio
  ]),
  // lo que el plano dibuja al norte del cuadro: las naves prolongadas y lo que cierra el traspatio
  prolongacion: Object.freeze([
    [CUADRO_M, LARGO_M, 27.8, MEDIO], // prolongación de la nave este
    [CUADRO_M, LARGO_M, -MEDIO, -20.3], // prolongación de la nave oeste
    [91.5, LARGO_M, -20.3, 27.8], // fondo norte
    [79.4, 91.5, 2.5, 27.8], // cuerpo al este del traspatio
  ]),
})

export const ALTO_MURO_M = 6.5 // estimado sobre fotos de 2008, sin medida
export const ALTO_TECHO_MAX_M = 3
const PUERTA = { ancho: 3, alto: 4.2 }

/** Un cuerpo del plano como parte 'cuerpo': un piso de muro encalado con tejado a dos aguas a lo largo. */
function parteDe([a0, a1, b0, b1], vida) {
  const [da, db] = [a1 - a0, b1 - b0]
  const alLargoDeA = da >= db
  const [largo, ancho] = alLargoDeA ? [da, db] : [db, da]
  return {
    tipo: 'cuerpo', a: (a0 + a1) / 2, b: (b0 + b1) / 2, giro: alLargoDeA ? 0 : Math.PI / 2,
    largo, ancho, alto: ALTO_MURO_M, techo: 'dos', altoTecho: Math.min(ancho * 0.3, ALTO_TECHO_MAX_M), teja: 0x7d4a36, ...vida,
  }
}

const rect = ([a0, a1, b0, b1]) => rectanguloPx(marco, a1 - a0, b1 - b0, (a0 + a1) / 2, (b0 + b1) / 2)
// Lo que el hito reserva (sin casas ni árboles) es el recinto documentado de cada época: en 1889, el cuadro; desde
// 1911, el contorno completo. Con el contorno completo desde 1889 se reservaba suelo que el cuartel aún no ocupaba.
const cuadro = rect([0, CUADRO_M, -MEDIO, MEDIO])
const solar = rect([0, LARGO_M, -MEDIO, MEDIO])
const RESERVAS = [{ nace: 3, muere: 4, poligono: cuadro }, { nace: 4, muere: 0, poligono: solar }]

const FLORES = 'Mariana Flores, «Cuartel San Carlos. Yacimiento veterano», Memorias 4(7), 2007: https://dialnet.unirioja.es/descarga/articulo/2321930.pdf'
const GUIA = 'Fermín de la Rueda, ficha 53 «Cuartel San Carlos», CCS Guía de arquitectura: https://guiaccs.com/obras/cuartel-san-carlos-2/'

export const sanCarlos = Object.freeze({
  // Nace en 1889: en 1843 estaba en ruinas desde 1812 y en reparación desde 1839 (Flores, que cita a Liendo,
  // 2001), y no se sabe qué quedaba en pie. En esa época el hito no existe; la marca y la ficha lo dicen.
  id: 'san-carlos', nombre: 'Cuartel San Carlos', ...marco, nace: 3, muere: 0,
  // cada etapa lleva su recinto: es lo que mide la regla de hitos y manzanas (R13, src/hitos/plantas.js)
  plantaPorEpoca: [
    { nace: 3, poligonos: CUERPOS_SAN_CARLOS.cuadro.map(rect), suprime: [cuadro] },
    { nace: 4, poligonos: CUERPOS_SAN_CARLOS.prolongacion.map(rect), suprime: [solar] },
  ],
  suprimePorEpoca: RESERVAS, sinArbolesPorEpoca: RESERVAS, solarCompleto: true,
  // Es una envolvente: sin arcos, garitas ni ventanas, que ninguna fuente con licencia dibuja.
  partes: [
    ...CUERPOS_SAN_CARLOS.cuadro.map((c) => parteDe(c, { nace: 3, muere: 0 })),
    // la entrada, en el medio del frente sur
    { tipo: 'ventanas', a: 0, b: 0, mira: [-1, 0], largo: PUERTA.ancho, n: 1, y: 0, ...PUERTA, arco: false, nace: 3, muere: 0 },
    ...CUERPOS_SAN_CARLOS.prolongacion.map((c) => parteDe(c, { nace: 4, muere: 0 })),
  ],
  fuente: `${FLORES} (obras de 1785 a 1790; en ruinas tras el terremoto de 1812; reparaciones desde 1839 y restauración completa en 1884, según Liendo, 2001, citado por Flores; tras el terremoto de 1900, prolongación de las naves este y oeste, enfermería y cuatro garitas, y Comandancia en el patio en 1946, según Avendaño, 1999, citado por Flores); ${GUIA} (cuadro original de 75 por 75 m, plaza de armas con corredores de arcos); contorno del plano DCN de 1936, contrastado con el de 1946`,
  verificar: [
    'Alturas sin fuente: ninguna está medida ni publicada. El muro de 6,5 m y la cubierta de teja de un solo piso se estiman sobre dos fotos de 2008 (Commons: Antonio Gagliardi, CC BY-SA 4.0; Márcio Cabral de Moura, CC BY 2.0), que no prueban el aspecto antiguo. La guía CCS dice «dos pisos»: contradicción sin resolver.',
    'Planta de 72,4 × 98,3 m: lados del contorno del plano de 1936 (0,5 m por píxel), no mensura. La esquina noreste cae bajo la costura de las hojas y se cierra con el plano de 1946 (difiere 3,5 m).',
    'En 1843 el hito no existe: el cuartel estaba en ruinas desde 1812 y en reparación desde 1839, y no se sabe qué quedaba en pie. El mapa de 1843 conserva ahí la manzana genérica que sale del cuadro «s» de Jesurún (unos 45 m al este por el calce de ese plano): no es evidencia del edificio.',
    'En 1889 va el cuadro de 72,4 × 77 m: la guía CCS da un cuadro original de 75 por 75 m y Flores (por Avendaño) pone la prolongación de las naves después de 1900; que el cuadro termine en la crujía norte del patio es una inferencia sobre el plano de 1936. El plano de Mestre de 1889 lo dibuja de unos 91 × 70 m con un patio centrado, 21 m al oeste.',
    'El reparto interior del cuadro (nave oeste doble, patio corrido hacia el este) es el del plano de 1936: no hay planta fechada anterior con licencia. El plano de González Dávila de 1785 que reproduce Flores (tomado de Liendo) no se calcó: derechos sin verificar.',
    'No se modelan los corredores de arcos del patio, las cuatro garitas de las esquinas (posteriores a 1900), la enfermería ni la Comandancia de 1946: sin vista ni planta con licencia que dé su forma o su lugar. El plano de 1946 no dibuja nada dentro del patio.',
    'Entrada al sur: por la foto de 2008 de la «entrada» y los jardines que el plano de 1936 dibuja de ese lado. Ventanas no se dibujan.',
  ],
})
