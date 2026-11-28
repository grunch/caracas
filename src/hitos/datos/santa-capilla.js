/**
 * La esquina de San Mauricio (#253): la iglesia colonial de San Mauricio (1772 y 1843) y la Santa Capilla que la
 * reemplazó en 1883, con su ensanche de 1889–1891 y la nave central de 1917–1924. Son dos hitos en el mismo solar.
 *
 * El solar es el recuadro en blanco «Iglesia Santa Capilla» del plano de 1936. La composición de cada etapa sale
 * de los dos estudios de Francisco Pérez Gallego (UCV, 2011 y 2017), que citan los documentos; sus plantas y
 * alzados son «hipótesis gráficas» suyas, no levantamientos de época (docs/santa-capilla-integracion.md).
 * El origen es el pie de la fachada de la nave norte, sobre la calle del oeste; el eje entra en la nave (al este)
 * y b crece hacia el sur.
 */
import { EJE_DAMERO, rectanguloPx } from './marco.js'

const TEJA = 0xa9614a // la media naranja «de ladrillos»: va del color de la teja, sin fuente para el acabado
const marco = { x: 8949, y: 6487, eje: EJE_DAMERO }
const rect = (a0, a1, b0, b1) => rectanguloPx(marco, a1 - a0, b1 - b0, (a0 + a1) / 2, (b0 + b1) / 2)

// --- el solar, del plano de 1936: 28,7 m sobre la calle del norte y 43,4 m de fondo ---
const FRENTE = 28.7 // de la calle del oeste al lindero con la Academia de Bellas Artes
const NORTE = -10.85 // la calle del norte, medida desde el eje de la nave norte
const SUR = 32.55
/** El recuadro en blanco del plano de 1936, en píxeles: esquinas noroeste, noreste, sureste y suroeste. */
export const SOLAR_SANTA_CAPILLA = rect(0, FRENTE, NORTE, SUR)

const ASCENSO = 'Francisco Pérez Gallego, «De la ermita de San Sebastián a la Santa Capilla, Caracas: la vocación religiosa de un lugar. 1567-1900», trabajo de ascenso, Facultad de Arquitectura y Urbanismo, Universidad Central de Venezuela, 2017: https://saber.ucv.ve/jspui/handle/10872/21681'
const MAESTRIA = 'Francisco Pérez Gallego, «Santuario Eucarístico Santa Capilla: estudio y proyecto para su restauración y puesta en valor», trabajo final de maestría, Universidad Central de Venezuela, 2011, vol. I: https://saber.ucv.ve/jspui/handle/10872/24360'
const HIPOTESIS = 'Las medidas de la planta salen de poner a escala, sobre el solar del plano de 1936, la «hipótesis gráfica» de Pérez Gallego para la etapa: una reconstrucción suya, no un levantamiento de época. El solar del plano y su dibujo coinciden en la proporción con un 2 % de diferencia.'

// ============================ San Mauricio (1772 y 1843) ============================

const VARA = 0.8359 // la vara castellana que usa Pérez Gallego
// «25 varas de largo y nueve de ancho» (1737): la nave única a la que se le añadieron las otras dos
const NAVE_MAYOR = { ancho: 9 * VARA }
const NAVES_MAURICIO = { a: 2.7, largo: 26, ancho: 21.4 } // el atrio delante; tres naves de pared a pared
const TORRE_MAURICIO = { lado: 5.5, a: NAVES_MAURICIO.a + 2.75, b: NAVES_MAURICIO.ancho / 2 + 2.75 }
const CUERPOS_MAURICIO = [{ alto: 9.5, vanos: 'ventana' }, { alto: 6.5, vanos: 'arco' }, { alto: 5, lado: 4.6, vanos: 'arco' }]
const SACRISTIA_MAURICIO = { a: 26, b: NAVES_MAURICIO.ancho / 2 + 2.7, largo: 5.4, ancho: 5.4 }
const cuadro = ({ a, b, lado, largo = lado, ancho = lado }) => rect(a - largo / 2, a + largo / 2, b - ancho / 2, b + ancho / 2)
// el templo con su atrio, la torre, el corredor del sur y la sacristía; las casas de las cofradías, al sur, quedan fuera
const recintoMauricio = [rect(0, FRENTE, NORTE, NAVES_MAURICIO.ancho / 2 + 6.9)]

export const sanMauricio = Object.freeze({
  id: 'san-mauricio', nombre: 'Iglesia de San Mauricio', ...marco, nace: 1, muere: 3,
  planta: [
    rect(NAVES_MAURICIO.a, NAVES_MAURICIO.a + NAVES_MAURICIO.largo, -NAVES_MAURICIO.ancho / 2, NAVES_MAURICIO.ancho / 2),
    cuadro(TORRE_MAURICIO), cuadro(SACRISTIA_MAURICIO),
  ],
  suprime: recintoMauricio, sinArboles: recintoMauricio, solarCompleto: true,
  partes: [
    // «tres puertas principales hacia el occidente… tres naves que dividen dos órdenes de columnas y arcos de
    // ladrillos… el techo, en lo que corresponde a la capilla mayor, es de bóveda, y en lo demás de tablas y
    // tirantes, cubiertos de teja. Tiene al frente un hermoso frontispicio de ladrillo» (Martí, 1772); la bóveda
    // es una «media naranja de ladrillos» en el inventario de 1794
    {
      tipo: 'temploDeNaves', ...NAVES_MAURICIO, anchoCentral: NAVE_MAYOR.ancho, altoLateral: 7, altoCentral: 9, cubierta: 'teja', pantalla: true,
      cupulas: [{ a: 22, radio: 2.8, altoTambor: 1.2, alto: 2.6, lados: 8, cubierta: TEJA }],
    },
    // «a un lado de él, una torre para las campanas con proporcionada elevación», «que se fabricó estos últimos
    // años» (Martí, 1772); de tres cuerpos según Pérez Gallego, que la pone al suroeste y la fecha en 1770
    { tipo: 'torre', ...TORRE_MAURICIO, cuerpos: CUERPOS_MAURICIO, remate: { tipo: 'cupula', alto: 3.5, cubierta: TEJA }, nace: 1, muere: 2 },
    // 1812: de las torres de Caracas, la de San Mauricio «conservó su primer cuerpo», sobre el que «crecieron
    // yerbas y arbustos» (Arístides Rojas): el muñón, sin remate
    { tipo: 'cuerpo', a: TORRE_MAURICIO.a, b: TORRE_MAURICIO.b, largo: TORRE_MAURICIO.lado, ancho: TORRE_MAURICIO.lado, alto: CUERPOS_MAURICIO[0].alto, techo: 'plano', nace: 2, muere: 3 },
    // «al costado, que mira al sur, tiene un corredor, y por cabeza de él, la sacristía, que es muy pequeña»
    { tipo: 'cuerpo', ...SACRISTIA_MAURICIO, alto: 4.2, altoTecho: 1.4 },
  ],
  fuente: `${ASCENSO} (pp. 94–117: documento de 1737 con las medidas de la nave, AGI, Santo Domingo, 728-A, citado por Rosario Salazar y este por Pérez Gallego; visita del obispo Mariano Martí de 1772 según Ernesto Otaduy, Iglesias de la antigua Caracas, 1974, pp. 20–21, citado por Pérez Gallego; inventario de la cofradía de Nuestra Señora de Guía de 1794; Arístides Rojas, Crónica de Caracas, sobre la torre después de 1812, citado por Pérez Gallego; dibujo de Carl Geldner de la década de 1860); lugar: símbolo de iglesia del plano de 1772 y recuadro en blanco del plano de Jesurún de 1843 (I «San Mauricio») en la esquina sureste del cruce, y solar del plano de 1936`,
  verificar: [
    'Alturas sin fuente: ninguna está medida. Las naves van de 7 y 9 m al borde de los muros y la torre, de 21 m hasta el arranque del remate, por proporción. La hipótesis gráfica de Pérez Gallego dibuja la torre de 43,2 m (21,60 + 10,14 + 5,73 + 3,54 + 2,19) porque, dice, «competía en altura con la torre de la Catedral»; Martí solo escribe «con proporcionada elevación». No se siguió: acá va más baja que la torre de la Catedral del mapa.',
    HIPOTESIS,
    'Lo que sí tiene medida de época es la nave del medio: «25 varas de largo y nueve de ancho» (20,9 × 7,5 m) en el documento de 1737, citado de segunda mano. El ancho de las naves laterales, el largo total de 26 m, el atrio de 2,7 m y el lugar de la torre y de la sacristía son de la hipótesis gráfica.',
    'La nave central va más alta que las laterales porque así es la pieza del mapa; ninguna fuente lo dice. La fachada es la de pilastras y frontón de esa pieza, encalada: Martí dice «frontispicio de ladrillo» y Pérez Gallego lo lee, por un lienzo, de líneas cóncavas y convexas y de ladrillo a la vista.',
    'En 1843 va con el primer cuerpo de la torre y con todas las cubiertas puestas. El terremoto de 1812 tumbó la torre «y parte de las cubiertas»; la iglesia siguió en uso «entre ruinas parciales y espacios provisionales» hasta 1883. No se sabe qué cubiertas seguían caídas en 1843 ni cuándo se rehicieron: el dibujo no lo muestra.',
    'Tres cuerpos de la torre en 1772: Pérez Gallego. Él mismo escribe en otro lugar que en 1812 se derrumbaron «tres cuerpos» y cita a Rojas, para quien quedó «su primer cuerpo»: su alzado tiene cuatro niveles bajo la cupulita. Va de tres, y en 1843 queda uno.',
    'La media naranja del presbiterio sigue en 1843: Pérez Gallego la reconoce en el dibujo de la Plaza Bolívar de Carl Geldner, que fecha una vez en 1863 y otra en 1866. El tambor con ventanas y linterna es el de la pieza del mapa.',
    'No se modelan el corredor del sur ni las casas de las cofradías, al sur del templo. El lugar tiene el error de los calces de 1772 (18,7 m) y 1843 (12,4 m): los dos planos ponen la iglesia en esta esquina, no su contorno.',
  ],
})

// ============================ Santa Capilla (desde 1889) ============================

const NAVE = { ancho: 8.4, alto: 11, altoTecho: 3.5, fachada: 'neogotica' } // 7 m de luz (Zawisza) y los muros
const NAVE_SUR_B = 21.25
const MEDIO = { b: NAVE_SUR_B / 2, desde: NAVE.ancho / 2, hasta: NAVE_SUR_B - NAVE.ancho / 2 } // entre las dos naves
const anchoMedio = MEDIO.hasta - MEDIO.desde
const CAPILLA_1883 = { a: 6.3, largo: 22.4 } // 20,8 m de luz hasta el arco del nártex (Pérez Gallego) y los muros; «24 metros de longitud total» en Zawisza
const ORATORIOS = { a: 25, largo: 7.4, ancho: 6.6, b: 7.5 }
const CAPILLAS_NORTE = { largo: 7.7, ancho: 6.6, b: -7.5 }
const CASA_SUR = { desde: NAVE_SUR_B + NAVE.ancho / 2, hasta: SUR }
const FRENTE_MEDIO = { a: 4.3, largo: 6.6 }
const PASADIZO = { a: 14.5, ancho: 4.5 }
const SACRISTIA = { a: 24.9, largo: 7.6 }
const NAVE_CENTRAL = { desde: 2.3, alto: 12 }
const TORRE = { a: 3.3, b: MEDIO.b }

const naveNorte = { tipo: 'iglesia', a: 0, b: 0, largo: FRENTE, ...NAVE }
const cuerpoEn = (a0, a1, b0, b1, resto) => ({ tipo: 'cuerpo', a: (a0 + a1) / 2, b: (b0 + b1) / 2, largo: a1 - a0, ancho: b1 - b0, ...resto })
const desdeElEnsanche = [
  naveNorte, // la capilla de 1883 con el nártex que le añadió el ensanche, hasta la calle
  { ...naveNorte, b: NAVE_SUR_B }, // «le añadió otra»: la nave sur, de 1889–1891
  // las capillas alineadas con la calle del norte: la del noroeste (del Santo Cristo desde 1927) y la de San Antonio
  ...[CAPILLAS_NORTE.largo / 2, FRENTE - CAPILLAS_NORTE.largo / 2].map((a) => ({ tipo: 'cuerpo', a, ...CAPILLAS_NORTE, alto: 7, altoTecho: 2 })),
  // la casa de la congregación (después rectoral), al sur: sin concluir en la inauguración de 1891
  cuerpoEn(0, FRENTE, CASA_SUR.desde, CASA_SUR.hasta, { alto: 5.5, altoTecho: 2 }),
].map((p) => ({ ...p, nace: 4, muere: 0 }))

const plantaDe = (p) => (p.tipo === 'iglesia'
  ? rect(p.a, p.a + p.largo, p.b - p.ancho / 2, p.b + p.ancho / 2)
  : rect(p.a - p.largo / 2, p.a + p.largo / 2, p.b - p.ancho / 2, p.b + p.ancho / 2))

const capillaDe1883 = [
  // «una sola nave de 7 metros de ancho, formada por tres tramos… y un presbiterio cuadrado»; fachada con
  // «cuádruple juego de contrafuertes y pináculos» y frontón sobre el portal (Zawisza, citado por Pérez Gallego)
  { tipo: 'iglesia', ...CAPILLA_1883, b: 0, ...NAVE },
  // los dos oratorios a los lados de la cabecera (San Antonio de Padua y San Francisco de Paula): la planta en T
  ...[-1, 1].map((s) => ({ tipo: 'cuerpo', a: ORATORIOS.a, b: s * ORATORIOS.b, largo: ORATORIOS.largo, ancho: ORATORIOS.ancho, alto: 7, altoTecho: 2 })),
].map((p) => ({ ...p, nace: 3, muere: 4 }))

const ensancheDe1891 = [
  // entre las dos naves: el frente del medio, retirado, con la torre; el «amplio pasadizo» abovedado que las unía,
  // entre dos patios, y la sacristía mayor a la cabeza
  cuerpoEn(FRENTE_MEDIO.a - FRENTE_MEDIO.largo / 2, FRENTE_MEDIO.a + FRENTE_MEDIO.largo / 2, MEDIO.desde, MEDIO.hasta, { alto: 7, techo: 'plano' }),
  { tipo: 'cuerpo', a: PASADIZO.a, b: MEDIO.b, giro: Math.PI / 2, largo: anchoMedio, ancho: PASADIZO.ancho, alto: 6.5, altoTecho: 1.5 },
  cuerpoEn(SACRISTIA.a - SACRISTIA.largo / 2, SACRISTIA.a + SACRISTIA.largo / 2, MEDIO.desde, MEDIO.hasta, { alto: 7, techo: 'plano' }),
  // la torre de Hurtado Manrique (1890), rehecha después del terremoto de 1900: basamento cuadrado retirado de
  // la línea de las naves, campanario, linterna con balaustrada y aguja de ocho lados
  {
    tipo: 'torre', ...TORRE, lado: 4.6,
    cuerpos: [{ alto: 13, vanos: 'ventana' }, { alto: 6, lado: 3.8, vanos: 'arco' }, { alto: 3, lado: 2.8, vanos: 'arco' }],
    remate: { tipo: 'aguja', alto: 12 },
  },
].map((p) => ({ ...p, nace: 4, muere: 5 }))

const reformaDeCastillo = [
  // la nave central (1917–1924) «sobre los otrora espacios destinados a sacristía, pasaje central y patios»,
  // con «cubierta horizontal»
  cuerpoEn(NAVE_CENTRAL.desde, FRENTE, MEDIO.desde, MEDIO.hasta, { alto: NAVE_CENTRAL.alto, techo: 'plano' }),
  // la torre con «el solo arco, abierto bajo la torre, para enmarcar la puerta principal», sin la balaustrada
  {
    tipo: 'torre', ...TORRE, lado: 5,
    cuerpos: [{ alto: 14, vanos: 'arco' }, { alto: 6, lado: 4, vanos: 'arco' }, { alto: 3.5, lado: 3, vanos: 'arco' }],
    remate: { tipo: 'aguja', alto: 12 },
  },
].map((p) => ({ ...p, nace: 5, muere: 0 }))

const plantasDe = (partes) => partes.filter((p) => p.tipo !== 'torre' && !p.giro).map(plantaDe)

export const santaCapilla = Object.freeze({
  id: 'santa-capilla', nombre: 'Santa Capilla', ...marco, nace: 3, muere: 0,
  planta: [],
  plantaPorEpoca: [
    { nace: 3, muere: 4, poligonos: plantasDe(capillaDe1883) },
    { nace: 4, muere: 0, poligonos: plantasDe(desdeElEnsanche) },
    { nace: 4, muere: 5, poligonos: [...plantasDe(ensancheDe1891), rect(PASADIZO.a - PASADIZO.ancho / 2, PASADIZO.a + PASADIZO.ancho / 2, MEDIO.desde, MEDIO.hasta)] },
    { nace: 5, muere: 0, poligonos: [...plantasDe(reformaDeCastillo), rect(TORRE.a - 2.5, NAVE_CENTRAL.desde, TORRE.b - 2.5, TORRE.b + 2.5)] },
  ],
  suprime: [SOLAR_SANTA_CAPILLA], sinArboles: [SOLAR_SANTA_CAPILLA], solarCompleto: true,
  partes: [...capillaDe1883, ...desdeElEnsanche, ...ensancheDe1891, ...reformaDeCastillo],
  fuente: `Plano de Caracas de 1936 (rótulo «Iglesia Santa Capilla»: el solar); ${ASCENSO} (pp. 195 y 212–214: la capilla de 1883, con la descripción de Leszek Zawisza citada por Pérez Gallego; pp. 277–305: el ensanche de 1889–1891 y los recibos de obra de 1890 del Ministerio de Obras Públicas, citados por Pérez Gallego); ${MAESTRIA} (pp. 226 y 266–284: la torre, el terremoto del 29-10-1900, los techos de 1910 y la nave central de Luis B. Castillo, de 1917 a 1924, con el testimonio de monseñor Manuel A. Pacheco citado por Pérez Gallego)`,
  verificar: [
    'Alturas: solo dos tienen documento, y de segunda mano: los recibos de obra de 1890 que cita Pérez Gallego hablan de una «cornisa a 11 metros de altura» y de un «muro de mampostería de ladrillo a 18 metros de altura». De ahí los 11 m de las naves; qué muro llegaba a 18 m no lo dicen. La torre va de unos 35 m con la aguja, tomados de la proporción de la hipótesis gráfica de Pérez Gallego; la de 1936, igual, sin fuente propia.',
    HIPOTESIS,
    'La torre es de planta cuadrada en todos sus cuerpos porque así es la pieza del mapa: la de 1890 tenía el basamento cuadrado y, encima, un campanario y una linterna de planta octogonal con balaustrada (Pérez Gallego). Tampoco se dibujan los contrafuertes, la crestería ni la aguja menor que la foto de 1883 muestra sobre la fachada.',
    'En 1889 va la capilla de 1883 sola, con su atrio: el ensanche se decretó a fines de 1889 y se inauguró el 28-5-1891, después del plano de ese año. En 1911 va el ensanche con la torre rehecha: el terremoto del 29-10-1900 la tumbó «en tres trozos» y una foto de 1919 la muestra otra vez en pie, con su aguja; no se halló la fecha de esa reconstrucción (la capilla reabrió antes de septiembre de 1902).',
    'En 1936 y 1946 va con la nave central y la torre de Castillo (obras de 1917 a 1924). De la torre de Castillo solo se sabe que abrió el gran arco de la puerta, cambió la linterna y quitó la balaustrada: las medidas son las de la torre anterior, apenas más ancha.',
    'La reserva es todo el solar del plano de 1936 desde 1889. En 1889 la mitad sur todavía eran dos casas (la del capellán y otra, según la hipótesis gráfica): no se modelan y ese suelo queda vacío.',
    'Colores: va encalada y con teja en las naves (en 1910 se cambiaron «las cubiertas de madera, caña amarga y tejas»). Pérez Gallego habla de un paso de amarillo a gris en 1937: no se siguió por época.',
    'La avenida Urdaneta le quitó en 1952 la capilla del noroeste y el frente norte: es posterior al último mapa y no se dibuja.',
    'La casa del sur va como un cuerpo bajo corrido; en 1891 no estaba concluida y el terremoto de 1900 la dejó «inservible»: su forma en 1911 y después no tiene fuente.',
  ],
})
