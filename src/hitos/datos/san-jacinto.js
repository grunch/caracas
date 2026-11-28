/**
 * San Jacinto (#245): el conjunto dominico (iglesia y convento, 1772 y 1843) y el mercado que lo reemplazó (solar
 * sin edificio conocido en 1889; el Mercado Principal de 1897 desde 1911). Son tres hitos en el mismo solar, uno
 * por etapa: cada uno muere cuando nace el siguiente. El lugar de la iglesia y del convento sale de la superposición de planos de Virginia
 * Vivas (1997) que reproduce Mariolly Dávila Cordido (SIGraDi 2013, fig. 2); el del mercado, de su contorno en el
 * plano de 1936. Ninguna altura está medida. Ver docs/san-jacinto-integracion.md.
 *
 * Los tres comparten un marco: `a` corre hacia el sur (entra en el solar desde la calle del norte) y `b`, a la
 * derecha de quien entra: al oeste, hacia la plaza.
 */
import { rectanguloPx } from './marco.js'

const DAVILA = 'Mariolly Dávila Cordido, «Estudio para la valoración y recuperación del patrimonio arquitectónico religioso venezolano a través de técnicas digitales: iglesia de San Jacinto, caso de estudio», SIGraDi 2013, pp. 177–181: https://pdf.blucher.com.br/designproceedings/sigradi2013/0032.pdf'
const PEREZ = 'Francisco Pérez Gallego, «Juan Hurtado Manrique: ingeniero de formación, arquitecto de profesión», Trienal de Investigación FAU UCV 2017, p. 10: https://trienal.fau.ucv.ve/2017/publicacion/articulos/HP/extenso/TIFAU2017_Extenso_HP-10_FPerezG.pdf'
const ZINC = 0x9aa3a6 // TONO.ZINC (src/hitos/piezas.js): los datos no cargan las piezas

// La manzana del mapa (V1772-37095-0-0, la misma en las seis épocas) mide 108 × 110 m y está girada 12,6°: 16 m más
// angosta que la cuadra del plano de 1936 y unos 12 m más al sur. Los hitos van dentro de ella, medidos desde su
// esquina noreste (Doctor Paúl), a lo largo de sus dos lados.
const ESQUINA_PX = [9533, 7103]
const OESTE = [-0.976, -0.2177]
const SUR = [OESTE[1], -OESTE[0]]
const BORDE = 0.5 // m que se dejan entre el hito y la línea de fachada de la manzana
/** El punto a `oeste` metros de la esquina por la calle del norte y `sur` metros hacia adentro, en píxeles del plano. */
const enSolar = (oeste, sur) => [
  ESQUINA_PX[0] + 2 * (oeste * OESTE[0] + sur * SUR[0]),
  ESQUINA_PX[1] + 2 * (oeste * OESTE[1] + sur * SUR[1]),
]

// --- El conjunto dominico: iglesia con la fachada al norte, torre al oeste y claustro al este ---
const RETIRO_ATRIO = 13 // m entre la calle y la fachada: el espacio en blanco delante de la «IGLESIA» en Vivas
const NAVES = { largo: 39, ancho: 18.5 } // tres naves: la central de 7,5 m (el ancho del retablo mayor) y dos de 5,5
const TERCEROS = { largo: 39, ancho: 6.5 } // «la nueva nave de la Orden de los Terceros», del lado opuesto a la torre
const TORRE = { lado: 7, a: 3.5, b: 7.5 } // en el ángulo noroeste, montada sobre el muro de la nave
const CLAUSTRO = { ancho: 52, fondo: 40.5, crujia: 9 } // «Edificio del Convento»: llega a la calle del norte y a la del este
const bTerceros = -(NAVES.ancho + TERCEROS.ancho) / 2
const bClaustro = -(NAVES.ancho / 2 + TERCEROS.ancho + 2.75 + CLAUSTRO.fondo / 2)
const aClaustro = CLAUSTRO.ancho / 2 - RETIRO_ATRIO
// el claustro llega a la esquina; el eje de las tres naves queda a 60 m de ella
const [xConvento, yConvento] = enSolar(BORDE + 1 + CLAUSTRO.fondo / 2 - bClaustro, BORDE + RETIRO_ATRIO)
const convento = { x: xConvento, y: yConvento, eje: SUR }

const plantaConvento = [
  rectanguloPx(convento, NAVES.largo, NAVES.ancho + TERCEROS.ancho, NAVES.largo / 2, -TERCEROS.ancho / 2),
  rectanguloPx(convento, TORRE.lado, TORRE.lado, TORRE.a, TORRE.b),
  rectanguloPx(convento, CLAUSTRO.ancho, CLAUSTRO.fondo, aClaustro, bClaustro),
]
// la reserva suma el atrio de delante de la fachada: sin casas entre la calle y la puerta
const recintoConvento = [
  rectanguloPx(convento, NAVES.largo + RETIRO_ATRIO, NAVES.ancho + TERCEROS.ancho + 2, (NAVES.largo - RETIRO_ATRIO) / 2, -TERCEROS.ancho / 2 + 1),
  plantaConvento[2],
]

export const sanJacinto = Object.freeze({
  id: 'san-jacinto', nombre: 'Iglesia y convento de San Jacinto', ...convento, nace: 1, muere: 3,
  planta: plantaConvento, suprime: recintoConvento, sinArboles: recintoConvento, solarCompleto: true,
  partes: [
    // «de tres naves separadas por pilares que sujetaban arcos de medio punto con techos de pares y nudillos»,
    // con «una sola puerta de entrada»: las tres naves bajo un tejado y una fachada de una puerta
    { tipo: 'iglesia', ...NAVES, alto: 9, altoTecho: 3.5, fachada: 'clasica' },
    { tipo: 'cuerpo', a: TERCEROS.largo / 2, b: bTerceros, largo: TERCEROS.largo, ancho: TERCEROS.ancho, alto: 6, altoTecho: 1.8 },
    { tipo: 'torre', ...TORRE, cuerpos: [{ alto: 9, vanos: 'ventana' }, { alto: 5, vanos: 'arco' }], remate: { tipo: 'chapitel', alto: 2.5 } },
    // el claustro: crujías de un piso alrededor de un patio. Después de 1828, cárcel y cuartel
    { tipo: 'palacio', a: aClaustro, b: bClaustro, ancho: CLAUSTRO.ancho, fondo: CLAUSTRO.fondo, crujia: CLAUSTRO.crujia, pisos: 1, altoPiso: 5, cubierta: 'teja' },
  ],
  fuente: `${DAVILA} (citas de segunda mano, no cotejadas: la visita del obispo Martí de 1772 según Virginia Vivas, Fundamentos para la declaratoria de patrimonio histórico-cultural del conjunto urbano de la manzana 04.01.25, Fundapatrimonio, 1997, p. 110; fray Antonio Bueno, Retablos del templo de San Jacinto de Caracas, Archivo Dominicano XXV, 2004, pp. 150–155; superposición de planos de Vivas con el del ingeniero Lutowsky de 1852); símbolo de iglesia del plano de 1772 y letra M «San Jacinto» del plano de Jesurún de 1843; demolición desde 1874: ${PEREZ}`,
  verificar: [
    'Alturas sin fuente: ninguna está medida. Lo único escrito es el retablo mayor, de 9 × 14,9 varas (7,50 × 12,45 m) según Bueno, citado por Dávila: la cumbrera va a 12,5 m para que quepa. La torre, el claustro y la nave de los Terceros van a ojo.',
    'Lugar y tamaño (iglesia de 39 × 25 m con la fachada 13 m adentro de la calle del norte; claustro de 40 × 52 m al este): leídos de la figura 2 de Dávila, que reproduce a 748 píxeles de ancho la superposición de Vivas, puesta a escala con el ancho de la cuadra (124 m). Un píxel de esa figura son 0,26 m y los trazos se empastan: el error puede ser de 5 m en el tamaño. El lugar tiene además el corrimiento de la manzana del mapa, que es la del plano de 1772 calzado (18,7 m RMS) y queda 16 m más angosta y unos 12 m más al sur que la cuadra del plano de 1936: el conjunto se midió desde su esquina noreste, y puede estar a 15 o 20 m de su sitio.',
    'La fachada al norte sale de la misma figura (el espacio libre queda delante, hacia la calle) y de que Dávila redibuja los alzados «norte y oeste». Dávila dice que la puerta «daba a la plaza»: el plano de 1772 deja en blanco, como plaza, también la calle del norte. No se cotejó con el estudio de Vivas ni con la foto de Lessmann de 1874.',
    'Dávila pone la nave de los Terceros y la torre en lados opuestos; que la torre sea la del oeste sale de la figura 2 y del símbolo de 1772. De la torre no se conoce el número de cuerpos ni el remate.',
    'El claustro va de un piso: la reconstrucción de Dávila al estado de 1865 dibuja un ala de dos pisos al este de la fachada, sin fecha de cuándo se levantó. De sus patios, celdas y capítulo no hay planta legible.',
    'En 1843 va igual que en 1772: el terremoto de 1812 arruinó la iglesia y el convento (Dávila, por fray Felipe Espinosa) y los frailes hicieron una capilla provisional en la plaza; el inventario de la entrega del templo (convento suprimido en 1837) describe una iglesia en pie y Lessmann la fotografió en 1874. No se halló cuándo se reparó ni qué cambió. El plano de 1843 dibuja un recuadro suelto en el ángulo sureste de la plaza: no se sabe si es esa capilla, y no se modela.',
    'Después de 1812 parte del convento pasó al Ayuntamiento y en 1828 a cárcel pública (guiaccs.com, sin fuente citada); la figura de Vivas rotula «Cárcel Municipal» y «Cuartel de Milicias». El claustro sigue dibujado como tal en 1843.',
    'La fachada es la «clásica» de la iglesia paramétrica, con una puerta; la de Dávila para el siglo XVIII tiene una puerta y un frontón curvo, y la del XIX, tres puertas.',
  ],
})

// --- El mercado: el solar desde 1889 y el edificio de 1897 desde 1911 ---
const CUERPO_NORTE = { ancho: 83, fondo: 44 } // el cuerpo norte del contorno de 1936, de la calle al pasaje
const FRENTE_FONDO = 8 // el «volumen de dos pisos de mampostería» que antecede a las naves
// los «tres cuerpos autónomos adosados», de oeste a este: anchos leídos del plano de Manrique que reproduce Dávila
const NAVES_MERCADO = [{ ancho: 27, alto: 7.5 }, { ancho: 34, alto: 10 }, { ancho: 22, alto: 7.5 }]
const [xMercado, yMercado] = enSolar(BORDE + CUERPO_NORTE.ancho / 2, BORDE + CUERPO_NORTE.fondo / 2)
const mercado = { x: xMercado, y: yMercado, eje: SUR }
const recintoMercado = [rectanguloPx(mercado, CUERPO_NORTE.fondo, CUERPO_NORTE.ancho)]
const largoNaves = CUERPO_NORTE.fondo - FRENTE_FONDO

const navesDelMercado = NAVES_MERCADO.map(({ ancho, alto }, i) => {
  const desdeElOeste = NAVES_MERCADO.slice(0, i).reduce((s, n) => s + n.ancho, 0) + ancho / 2
  return {
    tipo: 'cuerpo', a: FRENTE_FONDO / 2, b: CUERPO_NORTE.ancho / 2 - desdeElOeste, largo: largoNaves, ancho, alto,
    // «bóvedas rebajadas de metal galvanizado»: un techo bajo de zinc, no una bóveda
    altoTecho: ancho * 0.12, teja: ZINC,
  }
})
const frenteDelMercado = { a: -(CUERPO_NORTE.fondo - FRENTE_FONDO) / 2, largo: CUERPO_NORTE.ancho, pisos: 2, altoPiso: 4.5 }

const FUENTE_SOLAR = `«Mercado público» (23) del plano de Mestre de 1889; ${PEREZ}; ampliación de 1891: Manuel Landaeta Rosales, Estatuas y pilas antiguas de Caracas: https://archive.org/details/estatuasypilasan00land`

/** 1889: el solar del mercado, con la iglesia ya demolida y el edificio de 1897 sin hacer. Sin volumen. */
export const solarDelMercado = Object.freeze({
  id: 'solar-mercado-san-jacinto', nombre: 'Mercado de San Jacinto (solar)', ...mercado, nace: 3, muere: 4,
  planta: recintoMercado, transitable: true, // se camina: no hay nada que chocar
  suprime: recintoMercado, sinArboles: recintoMercado, solarCompleto: true,
  partes: [{ tipo: 'terraza', ancho: CUERPO_NORTE.fondo, fondo: CUERPO_NORTE.ancho, piso: 'tierra' }],
  fuente: FUENTE_SOLAR,
  verificar: [
    'No se dibuja ningún edificio, solo el piso de tierra del solar: la iglesia se empezó a demoler en 1874 y las obras del mercado «se extendieron hasta 1895» (Pérez Gallego). No se halló descripción ni vista fechada de lo que había construido en 1889; Landaeta dice que en 1891 el mercado se amplió sobre un pasaje del lado de la plaza.',
    'El plano de Mestre pinta un cuadro de unos 60 m de lado (23, «Mercado público»), con una franja libre hacia la plaza y corrido al este respecto del contorno de 1936: acá va la misma reserva que la del mercado de 1897 (83 × 44 m), no ese cuadro.',
  ],
})

export const mercadoSanJacinto = Object.freeze({
  id: 'mercado-san-jacinto', nombre: 'Mercado de San Jacinto', ...mercado, nace: 4, muere: 0,
  planta: recintoMercado, suprime: recintoMercado, sinArboles: recintoMercado, solarCompleto: true,
  partes: [
    ...navesDelMercado,
    { tipo: 'cuerpo', a: frenteDelMercado.a, b: 0, giro: Math.PI / 2, largo: frenteDelMercado.largo, ancho: FRENTE_FONDO, alto: frenteDelMercado.pisos * frenteDelMercado.altoPiso, techo: 'plano' },
    ...[0, 1].map((piso) => ({
      tipo: 'ventanas', a: -CUERPO_NORTE.fondo / 2, b: 0, mira: [-1, 0], largo: frenteDelMercado.largo * 0.94, n: 17,
      y: piso * frenteDelMercado.altoPiso + (piso ? 1 : 0), ancho: 2.2, alto: frenteDelMercado.altoPiso * (piso ? 0.6 : 0.8),
    })),
  ],
  fuente: `${PEREZ} (el proyecto de 1895 y su estructura metálica, por Silva, 2010, p. 213, de segunda mano; fotos de El Cojo Ilustrado del 1-11-1897); contorno «Mercado Principal» del plano DCN de 1936, contrastado con el «43» del plano de Razetti de 1911 y con el plano de 1946; el mercado sobre los cimientos de la iglesia: ${DAVILA}`,
  verificar: [
    'Alturas sin fuente: ninguna está medida. Pérez Gallego solo dice que el cuerpo central era «de mayor altura y ancho que los laterales» y que el volumen de delante tenía dos pisos.',
    'El lugar: el contorno del plano de 1936 llevado a la manzana del mapa, que es la del plano de 1772 y queda unos 12 m al sur y 7 m al oeste de la cuadra de 1936; el mercado se puso contra su esquina noreste. El tercio oeste cae donde el mapa conserva la plaza de 1772 (R13: a caballo, 69 % del recinto en la manzana).',
    'Solo se modela el cuerpo norte (83 × 44 m). El contorno de 1936 y de 1946 sigue hacia el sur, hasta 100 m de la calle: en el plano de Manrique que reproduce Dávila ahí hay hileras de puestos y un ala al suroeste, sin descripción escrita. Esa parte queda con las casas genéricas del mapa.',
    'Los anchos de los tres cuerpos (27, 34 y 22 m) salen del plano de Manrique de 1896 en la figura 2 de Dávila (0,25 m por píxel), ajustados a los 83 m del contorno de 1936. Que las cumbreras corran de norte a sur y el frente de mampostería dé a la calle del norte sale de esa figura y de la foto de 1897 con los rieles del tranvía.',
    'Los techos van a dos aguas, bajos y de color zinc: las «bóvedas rebajadas de metal galvanizado» no se modelan como bóvedas. El frente lleva dos hileras de vanos de arco sin el orden «neoclásico» que dice la fuente.',
    'Las refacciones de 1928 (fundaayc.com) no se distinguen: 1911, 1936 y 1946 van iguales.',
    'El final del mercado: «desaparición en 1942» según fundaayc.com; dejó de funcionar en 1947 según guiaccs.com; el plano levantado con fotos de 1946 todavía rotula «Mercado Principal». Va en pie en 1946, con la contradicción sin resolver.',
  ],
})

export const sanJacintoYMercado = Object.freeze([sanJacinto, solarDelMercado, mercadoSanJacinto])
