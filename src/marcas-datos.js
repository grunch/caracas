/**
 * Las marcas de Caracas: los lugares con nombre, por época (formato en src/marcas.js y specs/05).
 *
 * Posiciones en píxeles del mosaico de 1936 (0,5 m/px), leídas del propio plano (el rótulo o el símbolo del
 * lugar); las de los edificios modelados salen de su hito (src/hitos/datos). Épocas: 1 = 1772 · 2 = 1843 ·
 * 3 = 1889 · 4 = 1911 · 5 = 1936.
 *
 * De dónde sale cada nombre y cada época (campo `fuente`):
 *  - P36: rótulo del plano de la Dirección de Cartografía Nacional de 1936 (el plano base).
 *  - P89: «Plano topográfico de la ciudad de Caracas» de 1889 (Vicente S. Mestre, BnF): su leyenda numerada
 *    («Explicaciones») o un rótulo del dibujo.
 *  - P11: plano de Caracas de 1911 (Razetti, Princeton): rótulo del dibujo.
 *  - CG: dato de conocimiento general de la historia de la ciudad, SIN cotejar todavía contra una fuente del
 *    catálogo. Todo lo que es solo CG lleva además `dudas`, y su época se eligió con cautela: ante la duda, la
 *    marca aparece en la época cuyo plano ya la muestra, no antes.
 *  - L43: leyenda del «Plano topográfico de la Ciudad de Carácas» de 1843 (Ángel Jacob Jesurún; facsímil
 *    litográfico de Müller i Stapler, NYPL, dominio público: fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler),
 *    transcrita en specs/auditoria-1843/leyenda.json. Se cita la letra y el nombre, solo con lectura segura; el
 *    cotejo, marca por marca, está en specs/auditoria-1843/cotejo-leyenda.md (T81).
 * La leyenda del plano de 1772 no se transcribió: los nombres de la época 1 son CG.
 */
const P36 = 'plano DCN de 1936'
const P89 = 'plano de Mestre de 1889'
const P11 = 'plano de Razetti de 1911'
const CG = 'conocimiento general, sin cotejar'
const L43 = (letra, nombre) => `leyenda del plano de Jesurún de 1843 (${letra} «${nombre}»)`
const SIN_LEYENDA = 'Nombre de la época 1772 sin cotejar con la leyenda de ese plano.'

export const MARCAS = Object.freeze([
  // --- el valle: sierra, cerro, río y quebradas ---
  { id: 'avila', nombre: 'El Ávila', x: 9000, y: 2300, nace: 1, nivel: 1, nota: 'La sierra que cierra el valle por el norte.',
    fuente: `${P36} (la sierra, sin rótulo en la hoja); nombre: ${CG}`, dudas: 'El plano de 1936 no rotula la sierra en esta hoja.' },
  { id: 'guaire', nombre: 'Río Guaire', x: 10500, y: 9170, nace: 1, nivel: 1, nota: 'El río del valle; la ciudad lo alcanza recién en el siglo XIX.',
    fuente: `${P36} (rótulo «Río Guaire»); ${P89} («Río Guayre»); ${L43('Y', 'Guaire')}` },
  { id: 'calvario', nombres: [[1, 'El Calvario'], [3, 'Paseo de El Calvario', 'El cerro hecho paseo en tiempos de Guzmán Blanco.'], [5, 'Paseo Independencia', 'El Calvario: así lo rotula el plano de 1936.']],
    x: 7340, y: 6990, nace: 1, nivel: 1,
    fuente: `${P36} (rótulos «Paseo Independencia» y «Capilla del Calvario»); ${P89} (templo XII «el Calvario», paseo dibujado); ${L43('T', 'El Calvario')}, entre las iglesias y capillas`,
    dudas: 'En 1889 el paseo llevaba el nombre de Guzmán Blanco (CG); aquí va con un nombre descriptivo. Cuándo pasó a llamarse Independencia, sin cotejar.' },
  { id: 'catuche', nombre: 'Quebrada Catuche', x: 9080, y: 5470, nace: 1, nivel: 2, fuente: `${P36} (quebrada dibujada, junto a la esquina Puente Trinidad); ${P89} (rótulo «Río Catuche»); ${L43('V', 'Catuche')}` },
  { id: 'caroata', nombre: 'Quebrada Caroata', x: 7690, y: 8560, nace: 1, nivel: 2, fuente: `${P36} (quebrada dibujada, bajo los puentes Nuevo, Junín y Arauca); ${P89} (rótulo «Río Caroata»); ${L43('X', 'Caroata')}` },
  { id: 'anauco', nombre: 'Río Anauco', x: 11560, y: 6800, nace: 1, nivel: 2, fuente: `${P36} (rótulo «Río Anauco»); ${P89} (rótulo «Río Anauco»); ${L43('U', 'Anauco')}` },

  // --- la plaza y sus alrededores (edificios modelados: la posición sale del hito) ---
  { id: 'plaza-bolivar', hito: 'plaza-bolivar', nace: 1, nivel: 1,
    nombres: [[1, 'Plaza Mayor', 'La plaza del mercado.'], [3, 'Plaza Bolívar', 'Jardín con la estatua ecuestre, de 1874.']],
    fuente: `${P36} y ${P89} («Plaza Bolívar»); mercado y estatua: fuentes/imagenes (1852, 1866–1880)`,
    dudas: 'El nombre «Plaza Bolívar» es anterior a la estatua (CG: decreto de 1842); aquí cambia con el jardín, en la época de 1889.' },
  // el punto va en el medio de la nave (39 m al este de la fachada, que es el marco del hito): más lejos del cartel de la plaza
  { id: 'catedral', hito: 'catedral', x: 9156, y: 6816, nombre: 'Catedral', nivel: 2, alto: 16, fuente: `${P36} («Iglesia Catedral»); ${P89} (templo I); ${L43('A', 'Catedral')}` },
  { id: 'palacio-arzobispal', hito: 'palacio-arzobispal', nace: 1, nivel: 3, alto: 13,
    nombres: [[1, 'Palacio Episcopal'], [2, 'Palacio Arzobispal', 'La residencia del arzobispo, junto a la Catedral (arquidiócesis desde 1803).']],
    fuente: `${P36} (manzana de la «Iglesia Catedral», esquina de Las Gradillas; sin rótulo propio); historia, vanos y reformas: https://iamvenezuela.org/2016/06/palacio-arzobispal/; arquidiócesis en 1803: https://arquidiocesiscaracas.com/fundacion/; nombre en 1843: ${L43('j', 'Palacio Arzobispal')}`,
    dudas: `${SIN_LEYENDA} Huella, patios, fachada lateral y alzado colonial: hipótesis del modelo, sin levantamiento.` },
  { id: 'casa-amarilla', hito: 'casa-amarilla', nace: 1, nivel: 3, alto: 14,
    nombres: [[1, 'Ayuntamiento y Real Cárcel'], [2, 'Casa de Gobierno'], [3, 'Casa Amarilla']],
    fuente: `${P89} (5 «Casa amarilla»); ${P36} («Min. del Exterior»); cronología: https://es.wikipedia.org/wiki/Casa_Amarilla_de_Caracas; https://bibliofep.fundacionempresaspolar.org/dhv/entradas/c/casa-amarilla/; arquitectura: https://iamvenezuela.org/2016/07/casa-amarilla/`,
    dudas: 'Reconstrucción interpretativa: dimensiones, patios coloniales y localización de las cubiertas reformadas por verificar. La leyenda de 1843 trae un «Palacio del Gobierno» (i): que sea esta Casa de Gobierno, falta verlo en la letra del plano.' },
  { id: 'capitolio', hito: 'capitolio', nace: 1, nivel: 2, alto: 18,
    nombres: [[1, 'Convento de las Concepciones'], [3, 'Capitolio', 'Capitolio y Palacio Federal, donde estuvo el convento de las Concepciones.']],
    fuente: `${P89} (1 «Capitolio», 2 «Palacio Federal»); ${P36} («Palacio Federal»); convento y reformas de 1873, 1877 y 1890–1891: https://es.wikipedia.org/wiki/Palacio_Federal_Legislativo; https://bibliofep.fundacionempresaspolar.org/; convento en 1843: ${L43('K', 'Conv. de Concepciones')}`,
    dudas: `${SIN_LEYENDA} Alzados del convento y de sus reparaciones posteriores a 1812: reconstrucción interpretativa.` },
  { id: 'universidad', hito: 'universidad', nace: 1, nivel: 2, alto: 9,
    nombres: [[1, 'Convento de San Francisco'], [3, 'Universidad', 'La Universidad Central, en el antiguo convento, con fachada neogótica.']],
    fuente: `${P89} (3 «Universidad»); ${P36} («Universidad Central»); foto de 1880 (fuentes/imagenes); convento: ${CG}`,
    dudas: `${SIN_LEYENDA} La leyenda de 1843 no nombra el convento aparte: solo la iglesia, «San Francisco» (N).` },
  { id: 'san-francisco', hito: 'san-francisco', nombre: 'San Francisco', nivel: 3, alto: 15,
    fuente: `${P36} («Iglesia San Francisco»); ${P89} (templo VII); https://es.wikipedia.org/wiki/Iglesia_de_San_Francisco_(Caracas); ${L43('N', 'San Francisco')}` },
  { id: 'santa-capilla', hito: 'santa-capilla', nace: 1, nivel: 3, alto: 20,
    nombres: [[1, 'San Mauricio'], [3, 'Santa Capilla']],
    fuente: `${P36} («Iglesia Santa Capilla»); ${P89} (templo VIII, en la esquina que el plano todavía llama «San Mauricio»); ${L43('I', 'San Mauricio')}`,
    dudas: 'Que la iglesia de San Mauricio estuviera en este mismo solar en 1772 y 1843 es CG.' },
  { id: 'altagracia', hito: 'altagracia', nombre: 'Altagracia', nivel: 2, alto: 11, fuente: `${P36} («Iglesia de Altagracia»); ${P89} (templo II); ${L43('G', 'Altagracia')}`,
    dudas: 'La leyenda de 1843 ya la nombra (G). Desde qué época antes, a verificar: va desde 1772, como el hito.' },
  { id: 'seminario', nombre: 'Seminario y Universidad', x: 8950, y: 6975, nace: 1, muere: 3, nivel: 3, alto: 8,
    nota: 'El seminario de Santa Rosa, primera sede de la universidad.', fuente: CG,
    dudas: 'Ubicación por la cuadra (el lado sur de la plaza), no por un rótulo; hasta cuándo, sin cotejar: el plano de 1889 ya pone ahí el Concejo Municipal. La leyenda de 1843 nombra una «Universidad» (k) y la «Capilla de la Universidad» (L); falta ver en el plano si sus letras caen en esta cuadra.' },
  { id: 'concejo', nombre: 'Concejo Municipal', x: 8870, y: 6990, nace: 3, muere: 5, nivel: 3, alto: 9, fuente: `${P89} (7 «Consejo municipal», lado sur de la plaza)` },
  { id: 'justicia', nombre: 'Palacio de Justicia', x: 8880, y: 6990, nace: 5, nivel: 3, alto: 10, fuente: `${P36} («Palacio de Justicia»)` },
  { id: 'gobernacion', nombre: 'Palacio de la Gobernación', x: 8960, y: 6705, nace: 5, nivel: 3, alto: 12, fuente: `${P36} («Palacio de la Gobernación»)` },
  { id: 'carmelitas', nombres: [[1, 'Convento de las Carmelitas'], [3, 'Ministerio de Hacienda']], x: 8730, y: 6300, nace: 1, nivel: 3, alto: 9,
    fuente: `${P89} (18 «Mº de Hacienda», esquina «Carmelitas»); ${P36} («Minist. de Hacienda»); convento: ${CG}; en 1843: ${L43('H', 'Conv. de Carmelitas')}`, dudas: SIN_LEYENDA },
  { id: 'correos', nombre: 'Correos', x: 8600, y: 6440, nace: 5, nivel: 3, alto: 10, nota: 'La oficina principal de correos, en la esquina de Carmelitas.',
    fuente: `${P36} («Ofic. Principal de Correos»)`, dudas: 'En 1889 el correo estaba al norte de la plaza (plano de Mestre, 10): desde cuándo está aquí, sin cotejar.' },
  { id: 'teatro-caracas', nombre: 'Teatro Caracas', x: 9270, y: 6470, nace: 3, muere: 5, nivel: 3, alto: 10, fuente: `${P89} (35 «Teatro Caracas», esquina de Veroes)`,
    dudas: 'Hasta cuándo, sin cotejar: va en 1889 y 1911, y el plano de 1936 ya no lo rotula.' },
  { id: 'escuela-musica', nombre: 'Escuela de Música', x: 9040, y: 6480, nace: 5, nivel: 3, alto: 8, fuente: `${P36} («Escuela de Música»)` },

  // --- San Jacinto y el sur del centro ---
  { id: 'san-jacinto', x: 9400, y: 7100, nace: 1, nivel: 2, alto: 9,
    nombres: [[1, 'Convento de San Jacinto'], [3, 'Mercado de San Jacinto', 'El mercado, mudado aquí desde la plaza.'], [5, 'Mercado Principal']],
    fuente: `${P89} (23 «Mercado público»); ${P36} («Mercado Principal»); convento: ${CG}; en 1843: ${L43('M', 'San Jacinto')}`, dudas: SIN_LEYENDA },
  { id: 'plaza-venezolano', nombres: [[1, 'Plaza de San Jacinto'], [3, 'Plaza El Venezolano']], x: 9265, y: 7040, nace: 1, nivel: 3,
    fuente: `${P89} (plaza B «del Venezolano»); ${P36} («Plaza El Venezolano»); nombre anterior: ${CG}`,
    dudas: `${SIN_LEYENDA} La leyenda de 1843 no da letra a las plazas; el texto al pie de ese plano cuenta «San Jacinto» entre las plazas de la ciudad.` },
  { id: 'casa-natal', nombre: 'Casa natal del Libertador', x: 9195, y: 7085, nace: 2, nivel: 3, alto: 6,
    fuente: `${P89} (24 «Casa donde nació Bolívar»); ${P36} («Casa Natal»)`, dudas: 'La casa es anterior (Bolívar nació en 1783); la marca va desde 1843, ya muerto el Libertador.' },
  { id: 'banco-venezuela', nombre: 'Banco de Venezuela', x: 9130, y: 7180, nace: 5, nivel: 3, alto: 12, fuente: `${P36} («Bco. de Venezuela»)` },
  { id: 'teatro-municipal', x: 8345, y: 7670, nace: 1, nivel: 2, alto: 16,
    nombres: [[1, 'Plaza de San Pablo', 'La plaza y la iglesia de San Pablo.'], [3, 'Teatro Municipal', 'Donde estuvo la plaza de San Pablo.']],
    fuente: `${P89} (25 «Teatro Municipal»); ${P36} («Teatro Municipal»); plaza de San Pablo: grabado de ~1860 (fuentes/imagenes); iglesia en 1843: ${L43('P', 'San Pablo')}` },
  { id: 'santa-teresa', hito: 'santa-teresa', nombre: 'Santa Teresa', nivel: 2, alto: 14, fuente: `${P36} («Iglesia Santa Teresa»); ${P89} (templo III)`,
    dudas: 'El oratorio que hubo antes en el lugar (CG: San Felipe Neri) no se marca: la leyenda de 1843 nombra un «Oratorio de San Felipe» (Q), pero que estuviera aquí falta verlo en la letra del plano.' },
  { id: 'teatro-nacional', nombre: 'Teatro Nacional', x: 8795, y: 7940, nace: 4, nivel: 3, alto: 14, fuente: `${P36} («Teatro Nacional»); fecha: ${CG}`,
    dudas: 'Inaugurado en 1905 (CG): va desde la época de 1911.' },
  { id: 'plaza-henry-clay', nombre: 'Plaza Henry Clay', x: 8795, y: 7860, nace: 5, nivel: 3, fuente: `${P36} («Plaza Henry Clay»)` },
  { id: 'plaza-miranda', nombre: 'Plaza Miranda', x: 8085, y: 7690, nace: 5, nivel: 3, fuente: `${P36} («Plaza Miranda»)` },
  { id: 'circo-metropolitano', nombre: 'Circo Metropolitano', x: 7905, y: 7905, nace: 5, nivel: 3, alto: 10, fuente: `${P36} («Circo Metropolitano»)`,
    dudas: 'Es anterior a 1936 (CG: fines del siglo XIX); sin cotejar, va solo en 1936.' },
  { id: 'rotunda', nombre: 'La Rotunda', x: 8660, y: 8560, nace: 3, muere: 5, nivel: 3, alto: 9, nota: 'La cárcel.',
    fuente: `${P89} (30 «Cárcel»); ${P36} (esquina «La Cárcel», el solar ya vacío); nombre: ${CG}`,
    dudas: 'El nombre «La Rotunda» y su demolición en 1936 son CG; el plano de 1889 solo dice «Cárcel».' },
  { id: 'santa-rosalia', nombre: 'Santa Rosalía', x: 9080, y: 8545, nace: 2, nivel: 2, alto: 11, fuente: `${P36} («Iglesia Santa Rosalía»); ${P89} (templo IV); ${L43('R', 'Santa Rosalia')}`,
    dudas: 'Es anterior (CG: parroquia de fines del siglo XVIII); con el plano de 1772, sin cotejar. Va desde 1843, cuya leyenda la nombra.' },
  { id: 'san-juan', nombre: 'San Juan', x: 6935, y: 8335, nace: 3, nivel: 2, alto: 11, nota: 'La iglesia de los capuchinos.', fuente: `${P36} («Iglesia San Juan», «Plaza de Capuchinos»); ${P89} (templo V)`,
    dudas: 'Es anterior (CG). La leyenda de 1843 nombra «Capuchinos» (S), no San Juan: si es este templo, falta verlo en la letra del plano; mientras, va desde 1889.' },
  { id: 'san-agustin', nombre: 'San Agustín', x: 9775, y: 8790, nace: 5, nivel: 3, alto: 11, fuente: `${P36} («Iglesia San Agustín»)` },
  { id: 'nuevo-circo', nombre: 'Nuevo Circo', x: 10330, y: 8230, nace: 5, nivel: 2, alto: 12, nota: 'La plaza de toros.', fuente: `${P36} («Nuevo Circo»)` },
  { id: 'liceo-andres-bello', nombre: 'Liceo Andrés Bello', x: 10310, y: 7860, nace: 5, nivel: 3, alto: 9, fuente: `${P36} («Liceo Andrés Bello»)` },
  { id: 'parque-carabobo', nombres: [[3, 'Plaza de Carabobo'], [5, 'Parque Carabobo']], x: 11085, y: 7830, nace: 3, nivel: 2,
    fuente: `${P89} (plaza E «de Carabobo»); ${P36} («Parque Carabobo»)` },
  { id: 'puente-hierro', nombre: 'Puente de Hierro', x: 9430, y: 9440, nace: 3, nivel: 2, alto: 4, fuente: `${P89} (rótulo «Puente de hierro»); ${P36} («Puente de Hierro»)` },
  { id: 'puente-sucre', nombre: 'Puente Sucre', x: 9710, y: 9430, nace: 5, nivel: 3, alto: 4, fuente: `${P36} («Puente Sucre»)` },

  // --- el norte: Altagracia, La Pastora, el Panteón ---
  { id: 'las-mercedes', nombres: [[2, 'La Merced'], [3, 'Las Mercedes']], x: 8880, y: 5830, nace: 2, nivel: 3, alto: 11,
    fuente: `${P36} («Iglesia Las Mercedes»); ${P89} (templo dibujado en el lugar); ${L43('E', 'La Merced')}`,
    dudas: 'El convento de la Merced es colonial (CG); con el plano de 1772, sin cotejar. Va desde 1843, cuya leyenda la nombra «La Merced»; en 1889 y 1911 lleva el nombre del plano de 1936.' },
  { id: 'la-pastora', hito: 'la-pastora', nombre: 'La Pastora', nivel: 1, alto: 10, fuente: `${P36} («Iglesia La Pastora»); ${P89} (templo XI); foto de 1892 (fuentes/imagenes); ${L43('B', 'La Pastora')}`,
    dudas: 'La leyenda de 1843 ya la nombra (B). Desde qué época antes, a verificar: va desde 1772, como el hito.' },
  { id: 'panteon', hito: 'panteon', nace: 2, nivel: 2, alto: 13,
    nombres: [[2, 'La Trinidad', 'La iglesia de la Santísima Trinidad.'], [3, 'Panteón Nacional', 'La iglesia de la Trinidad, hecha panteón.']],
    fuente: `${P89} (22 «Panteón nacional»); ${P36} («Panteón Nacional»); Bellermann (1842–1845); Lessmann (1885–1900), https://elarchivo.org/producto/panteon-nacional/; reformas de 1911 y 1930: https://fundaayc.com/tag/panteon-nacional/; nombre en 1843: ${L43('C', 'La Trinidad')}`,
    dudas: 'La iglesia fue inaugurada en 1781 y quedó en ruinas tras el terremoto de 1812. Las obras de 1772 no están modeladas: la marca va desde 1843.' },
  { id: 'san-carlos', nombre: 'Cuartel San Carlos', x: 9150, y: 4980, nace: 3, nivel: 3, alto: 9, fuente: `${P89} (21 «Cuartel San Carlos»); ${P36} (edificio de patio, sin rótulo)`,
    dudas: 'Es de fines del siglo XVIII (CG); sin cotejar con el plano de 1843, va desde 1889.' },
  { id: 'hospital-vargas', nombre: 'Hospital Vargas', x: 9660, y: 4640, nace: 3, nivel: 2, alto: 9, nota: 'Inaugurado en 1891; el plano de 1889 ya lo dibuja.',
    fuente: `${P89} (43 «Hospital Vargas»); ${P36} («Hospital Vargas»)`, dudas: 'En 1889 estaba en obra: el año de inauguración es CG.' },
  { id: 'hijos-de-dios', nombre: 'Cementerio de los Hijos de Dios', x: 8700, y: 3690, nace: 5, nivel: 3, fuente: `${P36} («Cementerio de los Hijos de Dios»)`,
    dudas: 'Es del siglo XIX (CG) y en 1936 ya estaba clausurado; sin cotejar, va solo en 1936.' },
  { id: 'san-jose', nombre: 'San José', x: 10635, y: 5370, nace: 5, nivel: 3, alto: 11, fuente: `${P36} («Iglesia San José»)` },

  // --- el oeste: Miraflores, Caño Amarillo, Palo Grande, El Paraíso ---
  { id: 'miraflores', hito: 'miraflores', nombre: 'Miraflores', nivel: 2, alto: 8, fuente: `${P36} («Palacio Miraflores»); panorámica de ~1903 (fuentes/imagenes)`,
    dudas: 'Como el hito: va desde 1911; si ya estaba en pie en 1889, a verificar.' },
  { id: 'cano-amarillo', nombre: 'Estación de Caño Amarillo', x: 7040, y: 6420, nace: 3, nivel: 2, alto: 7, nota: 'El ferrocarril de La Guaira.',
    fuente: `${P89} («Ferrocarril La Guaira a Caracas», estación); ${P36} («Estación del F.C. de La Guaira»)` },
  { id: 'viaducto-union', nombre: 'Viaducto Unión', x: 7365, y: 6760, nace: 5, nivel: 3, alto: 6, fuente: `${P36} («Viaducto Unión»)` },
  { id: 'el-silencio', nombre: 'El Silencio', x: 7850, y: 7180, nace: 5, nivel: 3, nota: 'El barrio, antes de la reurbanización.', fuente: `${P36} (esquina «El Silencio»)` },
  { id: 'palo-grande', nombre: 'Estación Palo Grande', x: 4750, y: 8650, nace: 4, nivel: 2, alto: 7, nota: 'El Gran Ferrocarril de Venezuela.',
    fuente: `${P11} («Estación Palo Grande», «G.F.V.»); ${P36} («Estación Palo Grande»)` },
  { id: 'el-paraiso', nombre: 'El Paraíso', x: 6500, y: 10100, nace: 4, nivel: 1, fuente: `${P11} («El Paraíso»); ${P36} («El Paraíso»)` },
  { id: 'hipodromo', nombres: [[4, 'Hipódromo del Paraíso'], [5, 'Hipódromo Nacional']], x: 5400, y: 9950, nace: 4, nivel: 2,
    fuente: `${P11} («Hipódromo del Paraíso»); ${P36} («Hipódromo Nacional»)` },

  // --- el este: Candelaria y más allá del Anauco ---
  { id: 'candelaria', nombre: 'Candelaria', x: 11230, y: 7000, nace: 2, nivel: 1, alto: 11, nota: 'La iglesia y su plaza.',
    fuente: `${P36} («Iglesia Candelaria», «Plaza de Candelaria»); ${P89} (templo VI, plaza D); ${L43('J', 'La Candelaria')}`,
    dudas: 'La iglesia es colonial (CG); con el plano de 1772, sin cotejar. Va desde 1843, cuya leyenda la nombra «La Candelaria».' },
  { id: 'fc-central', nombre: 'Estación del Ferrocarril Central', x: 13380, y: 7640, nace: 3, nivel: 3, alto: 7, fuente: `${P89} (rótulos «Estación» y «Ferrocarril Central»); ${P36} («Estación del F.C. Central»)` },
  { id: 'bellas-artes', nombre: 'Museo de Bellas Artes', x: 12850, y: 7960, nace: 5, nivel: 3, alto: 10, fuente: `${P36} («Museo de Bellas Artes»)` },
  { id: 'los-caobos', nombre: 'Parque Los Caobos', x: 13400, y: 8450, nace: 5, nivel: 2, fuente: `${P36} («Parque Los Caobos»)` },
])
