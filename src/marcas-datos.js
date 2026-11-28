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
 * La leyenda del plano de 1772 no se transcribió; cuando hay otra fuente documental, se cita en la marca.
 */
import { MARCAS_PUENTES_CRUCES } from './puentes-cruces-datos.js'
import { MARCAS_CIUDAD_UNIVERSITARIA } from './ucv-1946-datos.js'

const P36 = 'plano DCN de 1936'
const P89 = 'plano de Mestre de 1889'
const P11 = 'plano de Razetti de 1911'
const CG = 'conocimiento general, sin cotejar'
const L43 = (letra, nombre) => `leyenda del plano de Jesurún de 1843 (${letra} «${nombre}»)`
const SIN_LEYENDA = 'Nombre de la época 1772 sin cotejar con la leyenda de ese plano.'

export const MARCAS = Object.freeze([
  {id:'reurbanizacion-el-silencio',fuente:'https://entrerayas.com/a-66-anos-de-la-inauguracion-de-la-reurbanizacion-el-silencio/ · Geografía © OpenStreetMap contributors, ODbL 1.0: https://www.openstreetmap.org/copyright',hito:'silencio-bloque-1',nombre:'Reurbanización El Silencio',nace:6,nivel:1,nota:'Siete bloques y dos plazas, inaugurados en 1945. En la vista del levantamiento de 1946.'},
  // --- el valle: sierra, cerro, río y quebradas ---
  { id: 'avila', nombre: 'El Ávila', x: 9000, y: 2300, nace: 1, nivel: 1, nota: 'La sierra que cierra el valle por el norte.',
    fuente: `${P36} (la sierra, sin rótulo en la hoja); nombre: ${CG}`, dudas: 'El plano de 1936 no rotula la sierra en esta hoja.' },
  { id: 'guaire', nombre: 'Río Guaire', x: 10500, y: 9170, nace: 1, nivel: 1, nota: 'El río del valle; la ciudad lo alcanza recién en el siglo XIX.',
    fuente: `${P36} (rótulo «Río Guaire»); ${P89} («Río Guayre»); ${L43('Y', 'Guaire')}` },
  { id: 'calvario', nombres: [[1, 'El Calvario'], [3, 'Paseo de El Calvario', 'El cerro hecho paseo en tiempos de Guzmán Blanco.'], [5, 'Paseo Independencia', 'El Calvario: así lo rotula el plano de 1936.']],
    x: 7340, y: 6990, nace: 1, nivel: 1,
    fuente: `${P36} (rótulos «Paseo Independencia» y «Capilla del Calvario»); ${P89} (templo XII «el Calvario», paseo dibujado); ${L43('T', 'El Calvario')}, entre las iglesias y capillas; paseo de 1873: https://elarchivo.org/retratos-hitos-y-bastidores-obras-publicas-e-impresiones-viajeras-en-la-caracas-guzmancista-i/`,
    dudas: 'Se conserva un nombre descriptivo para 1889: las fuentes difieren sobre el momento del cambio a Independencia. La fecha 1873 corresponde al paseo, no al cerro ni al arco.' },
  { id: 'arco-federacion', nombre: 'Arco de la Federación', x: 7613, y: 6878, nace: 4, nivel: 3, alto: 9,
    nota: 'El monumento de 1895, en El Calvario.',
    fuente: 'Fundación Arquitectura y Ciudad, postal 279: https://fundaayc.com/2021/10/03/algo-mas-sobre-la-postal-no-279/; posición aproximada: https://es.wikipedia.org/wiki/Arco_de_la_Federación',
    dudas: 'Hito arquitectónico pendiente. Coordenada publicada redondeada al segundo, transformada con geo1936: localización aproximada, no levantamiento del monumento.' },
  { id: 'catuche', nombre: 'Quebrada Catuche', x: 9080, y: 5470, nace: 1, nivel: 2, fuente: `${P36} (quebrada dibujada, junto a la esquina Puente Trinidad); ${P89} (rótulo «Río Catuche»); ${L43('V', 'Catuche')}` },
  { id: 'caroata', nombre: 'Quebrada Caroata', x: 7690, y: 8560, nace: 1, nivel: 2, fuente: `${P36} (quebrada dibujada, bajo los puentes Nuevo, Junín y Arauca); ${P89} (rótulo «Río Caroata»); ${L43('X', 'Caroata')}` },
  { id: 'anauco', nombre: 'Río Anauco', x: 11560, y: 6800, nace: 1, nivel: 2, fuente: `${P36} (rótulo «Río Anauco»); ${P89} (rótulo «Río Anauco»); ${L43('U', 'Anauco')}` },

  // --- la plaza y sus alrededores (edificios modelados: la posición sale del hito) ---
  { id: 'plaza-bolivar', hito: 'plaza-bolivar', nace: 1, nivel: 1,
    nombres: [[1, 'Plaza Mayor', 'La plaza del mercado.'], [2, 'Plaza Bolívar', 'Nombre oficial desde 1842; todavía es la plaza del mercado, sin la estatua de 1874.'], [3, 'Plaza Bolívar', 'Jardín con la estatua ecuestre, de 1874.']],
    fuente: `${P36} y ${P89} («Plaza Bolívar»); mercado y estatua: fuentes/imagenes (1852, 1866–1880); nombre oficial del 10 de diciembre de 1842 e inauguración de la estatua el 7 de noviembre de 1874: Landaeta Rosales, Grandes honores acordados al Libertador (1900), pp. 12 y 13, https://archive.org/details/grandeshonoresac00land`,
    dudas: 'El nombre oficial y el uso como mercado no cambiaron al mismo tiempo. Se mantiene la geometría de mercado en 1843; el jardín y la estatua corresponden a una etapa posterior. El plano de 1772 no rotula la plaza; en 1842 se la llamaba también «de Catedral».' },
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
    nombres: [[1, 'Convento de San Jacinto'], [2, 'San Jacinto'], [3, 'Mercado de San Jacinto', 'El mercado, mudado aquí desde la plaza.'], [5, 'Mercado Principal']],
    fuente: `${P89} (23 «Mercado público»); ${P36} («Mercado Principal»); convento: Mariolly Dávila Cordido, SIGraDi 2013, pp. 177–181, https://pdf.blucher.com.br/designproceedings/sigradi2013/0032.pdf; demolición en 1875: Landaeta Rosales, Los cementerios de Caracas (1906), pp. 7–8, https://studylib.es/doc/5233149/los-cementerios-de-caracas---desde-1567-hasta-1906; nueva sede en 1897: https://fundaayc.com/2017/03/12/algo-mas-sobre-la-postal-no-53/; en 1843: ${L43('M', 'San Jacinto')}`, dudas: 'La visita de Martí respalda su presencia en 1772. La extensión de los daños de 1812 y la forma del mercado por época requieren un cotejo arquitectónico; no se presume que el convento siguiera activo en 1843.' },
  { id: 'plaza-venezolano', nombres: [[1, 'Plaza de San Jacinto'], [3, 'Plaza El Venezolano']], x: 9265, y: 7040, nace: 1, nivel: 3,
    fuente: `${P89} (plaza B «del Venezolano»); ${P36} («Plaza El Venezolano»); nombre anterior: ${CG}`,
    dudas: `${SIN_LEYENDA} La leyenda de 1843 no da letra a las plazas; el texto al pie de ese plano cuenta «San Jacinto» entre las plazas de la ciudad.` },
  { id: 'casa-natal', nombres: [[1, 'Casa de los Bolívar'], [2, 'Casa natal del Libertador']], x: 9195, y: 7085, nace: 1, nivel: 3, alto: 6,
    fuente: `${P89} (24 «Casa donde nació Bolívar»); ${P36} («Casa Natal»); Rafael Fuentes Carvallo, Diccionario de Historia de Venezuela, Fundación Empresas Polar: https://bibliofep.fundacionempresaspolar.org/dhv/entradas/c/casa-natal-del-libertador/`, dudas: 'Casa de los Bolívar es una denominación descriptiva de su propiedad en 1772, no un rótulo transcrito del plano. La fecha exacta de construcción y su forma en 1772 no se fijan aquí.' },
  { id: 'banco-venezuela', nombre: 'Banco de Venezuela', x: 9130, y: 7180, nace: 5, nivel: 3, alto: 12, fuente: `${P36} («Bco. de Venezuela»)` },
  { id: 'teatro-municipal', hito: 'teatro-municipal', x: 8345, y: 7670, nace: 1, nivel: 2, alto: 16,
    nombres: [[1, 'Iglesia y plaza de San Pablo', 'La plaza y la iglesia de San Pablo.'], [3, 'Teatro Municipal', 'Donde estuvo la plaza de San Pablo.']],
    fuente: `${P89} (25 «Teatro Municipal»); ${P36} («Teatro Municipal»); templo colonial y demolición de 1876: Manuel Landaeta Rosales, La antigua Calle del Comercio de Caracas (1907), pp. 13–14, https://upload.wikimedia.org/wikipedia/commons/2/2d/La_antigua_Calle_del_Comercio_de_Caracas_%28IA_laantiguacallede00land%29.pdf; plaza de San Pablo: grabado de ~1860 (fuentes/imagenes); iglesia en 1843: ${L43('P', 'San Pablo')}; inauguración en 1881: Fundarte https://fundarte.gob.ve/web/2017/01/02/teatro-municipal-con-136-anos-de-historia/; pórtico demolido en 1949: Fundación Arquitectura y Ciudad https://fundaayc.com/2026/05/27/` },
  { id: 'santa-teresa', hito: 'santa-teresa', nombre: 'Santa Teresa', nivel: 2, alto: 14, fuente: `${P36} («Iglesia Santa Teresa»); ${P89} (templo III)`,
    dudas: 'El oratorio que hubo antes en el lugar (CG: San Felipe Neri) no se marca: la leyenda de 1843 nombra un «Oratorio de San Felipe» (Q), pero que estuviera aquí falta verlo en la letra del plano.' },
  { id: 'teatro-nacional', nombre: 'Teatro Nacional', x: 8795, y: 7940, nace: 4, nivel: 3, alto: 14, fuente: `${P36} («Teatro Nacional»); fecha: ${CG}`,
    dudas: 'Inaugurado en 1905 (CG): va desde la época de 1911.' },
  { id: 'plaza-henry-clay', nombre: 'Plaza Henry Clay', x: 8795, y: 7860, nace: 5, nivel: 3, fuente: `${P36} («Plaza Henry Clay»)` },
  { id: 'plaza-miranda', nombre: 'Plaza Miranda', x: 8085, y: 7690, nace: 5, nivel: 3, fuente: `${P36} («Plaza Miranda»)` },
  { id: 'circo-metropolitano', hito: 'circo-metropolitano', nombre: 'Circo Metropolitano', x: 7905, y: 7905, nace: 4, muere: 6, nivel: 3, alto: 10, fuente: `${P36} («Circo Metropolitano»); apertura en 1896 y cierre en 1945: https://fundaayc.com/2022/06/29/1945-deja-de-funcionar-y-es-demolido-el-circo-metropolitano-de-caracas/; última corrida el 19-04-1945, Marín (2011) citando a Salas (1978), de segunda mano por el issue #257 y sin leer: https://www.academia.edu/12565798/VALORACI%C3%93N_HIST%C3%93RICA_DEL_PATRIMONIO_ARQUITECT%C3%93NICO_Estudio_de_Casos_en_el_Centro_Hist%C3%B3rico_de_Caracas; fecha alternativa de 1942, Cilento, también sin leer: https://www.academia.edu/39601663/ACS_TESTIGO_PRESENCIAL_CARACAS_1940_1960; solar vacío en el plano de 1946: https://archive.org/details/WCWdb_18051`,
    dudas: 'Las fuentes discrepan entre 1942 y 1945 para su desaparición; ambas lo excluyen de 1946. La última corrida del 19-04-1945 (Marín, citando a Salas) es una cita de segunda mano: no se leyó ni se cotejó con la prensa.' },
  { id: 'rotunda', hito:'rotunda', nombre:'La Rotunda', x:8588,y:8504,nace:3,muere:5,nivel:3,alto:9,
    fuente:'Mestre 1889, cárcel 30; Razetti 1911, cárcel 39; https://bibliofep.fundacionempresaspolar.org/dhv/entradas/l/la-rotunda/',
    dudas:'Dos recintos; ampliación norte proyectada 1881, terminación exacta no verificada. Dimensiones, guardia y continuidad del conjunto en 1889 interpretativas.' },
  { id:'solar-rotunda',hito:'solar-rotunda',nombre:'Solar de La Rotunda',x:8595,y:8478,nace:5,muere:6,nivel:3,alto:0,
    fuente:'DCN 1936, franja occidental libre; https://bibliofep.fundacionempresaspolar.org/_custom/static/cronologia_hv/zoom/s20/1936-15.html',
    dudas:'Estado del plano, sin precisar el día de demolición ni adelantar el templete posterior.' },
  { id:'concordia',hito:'concordia',nombre:'Plaza La Concordia',x:8595,y:8478,nace:6,nivel:3,alto:9,
    fuente:'Plano de fotos 1946: https://archive.org/details/WCWdb_18051; fotos del templete: https://mariafsigillo.blogspot.com/2012/02/la-rotunda-y-plaza-de-la-concordia.html; cronología 1940: https://bibliofep.fundacionempresaspolar.org/media/1280009/200_educadores_vnzlns_lw.pdf',
    dudas:'Plaza de Villanueva anterior a las remodelaciones posteriores. Proporciones, número de soportes y vegetación interpretativos.' },
  { id: 'santa-rosalia', hito: 'santa-rosalia', nombre: 'Santa Rosalía', nace: 2, nivel: 2, alto: 14, fuente: `${P36} («Iglesia Santa Rosalía»); ${P11} (dibuja el templo y su atrio); ${P89} (templo IV); ${L43('R', 'Santa Rosalia')}; IPC, Lo construido: https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf (pp. 33 y 216); parroquia: https://parroquiasantarosalia.wordpress.com/santa-rosa/`,
    dudas: 'El plano de 1772 dibuja una iglesia en el lugar y la parroquia la da por terminada en 1734; sin su leyenda transcrita ni alzado, va desde 1843, cuya leyenda la nombra.' },
  { id: 'san-juan', hito: 'san-juan', nombre: 'San Juan', nace: 3, nivel: 2, alto: 14, nota: 'La iglesia de los capuchinos.', fuente: `${P36} («Iglesia San Juan», «Plaza de Capuchinos»); ${P89} (templo V); H. D. Elschnig, guía histórica-cultural de Caracas, p. 99: https://bibliodor.wordpress.com/wp-content/uploads/2012/03/parroquia-san-juan.pdf`,
    dudas: 'La leyenda de 1843 nombra «Capuchinos» (S) y su letra cae sobre este solar, pero el templo estaba en obra (1841–1868): va desde 1889, con el primer plano que lo dibuja terminado.' },
  { id: 'san-agustin', hito: 'san-agustin', nombre: 'San Agustín', nace: 5, nivel: 3, alto: 32, fuente: `${P36} («Iglesia San Agustín»); IPC, Lo construido, pp.216–217: https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf` },
  { id: 'nuevo-circo', hito: 'nuevo-circo', nombre: 'Nuevo Circo', nace: 5, nivel: 2, alto: 12, nota: 'La plaza de toros.', fuente: `${P36} («Nuevo Circo»); plano DCN de fotografías de 1946 («Nuevo Circo»): https://archive.org/details/WCWdb_18051; inauguración: https://camaradecaracas.com/la-camara-caracas-y-sus-historias/cronicas-de-la-ciudad/el-nuevo-circo-de-caracas/` },
  { id: 'liceo-andres-bello', nombre: 'Liceo Andrés Bello', x: 10310, y: 7860, nace: 5, nivel: 3, alto: 9, fuente: `${P36} («Liceo Andrés Bello»)` },
  { id: 'parque-carabobo', nombres: [[3, 'Plaza de Carabobo'], [5, 'Parque Carabobo']], x: 11085, y: 7830, nace: 3, nivel: 2,
    fuente: `${P89} (plaza E «de Carabobo»); ${P36} («Parque Carabobo»)` },
  { id: 'puente-hierro', hito: 'puente-hierro', nombre: 'Puente de Hierro', nace: 3, nivel: 2, alto: 4, fuente: `${P89} (rótulo «Puente de hierro»); ${P36} («Puente de Hierro»); Silva Contreras (2004), pp. 32–34 y 40: https://www.academia.edu/8853323/tradici%C3%B3n_acad%C3%A9mica_y_la_imagen_del_dise%C3%B1o_estructural` },
  { id: 'puente-sucre', nombres: [[3, 'Puente Constitución', 'Cruce anterior de la calle Sur 7.'], [4, 'Puente Sucre', 'Estructura metálica inaugurada en 1895.'], [5, 'Puente Sucre', 'Sustituto de concreto; no es la armadura de 1895.']], hito: 'puente-sucre', nace: 3, nivel: 3, alto: 4, fuente: `${P36} («Puente Sucre»); Silva Contreras (2004), pp. 34–35 y nota 11: https://www.academia.edu/8853323/tradici%C3%B3n_acad%C3%A9mica_y_la_imagen_del_dise%C3%B1o_estructural`, dudas: 'El lugar del Constitución es interpretativo: va en las cabezas del Sucre (docs/puente-sucre-integracion.md). El puente de concreto de 1936 y 1946 no tiene alzado: no se dibuja.' },

  // --- el norte: Altagracia, La Pastora, el Panteón ---
  { id: 'las-mercedes', nombres: [[1, 'Convento de La Merced'], [2, 'La Merced'], [3, 'Las Mercedes']], x: 8880, y: 5830, nace: 1, nivel: 3, alto: 11,
    fuente: `${P36} («Iglesia Las Mercedes»); ${P89} (templo dibujado en el lugar); ${L43('E', 'La Merced')}; Historia general de la Iglesia en América Latina, tomo VII, pp. 228–229: https://docs.enriquedussel.com/txt/Textos_Libros_Editados_ED/L.Edi.4_Tomo7_Colombia_y_Venezuela.pdf`,
    dudas: 'Presencia documentada por la visita de Martí en 1772; la ubicación exacta en ese plano sigue sin cotejar. La fachada y el estado de reconstrucción en 1843 y 1889 no están verificados. El nombre Las Mercedes procede del plano de 1936.' },
  { id: 'la-pastora', hito: 'la-pastora', nombre: 'La Pastora', nivel: 1, alto: 10, fuente: `${P36} («Iglesia La Pastora»); ${P89} (templo XI); foto de 1892 (fuentes/imagenes); ${L43('B', 'La Pastora')}`,
    dudas: 'La leyenda de 1843 ya la nombra (B). Desde qué época antes, a verificar: va desde 1772, como el hito.' },
  { id: 'panteon', hito: 'panteon', nace: 2, nivel: 2, alto: 13,
    nombres: [[2, 'La Trinidad', 'La iglesia de la Santísima Trinidad.'], [3, 'Panteón Nacional', 'La iglesia de la Trinidad, hecha panteón.']],
    fuente: `${P89} (22 «Panteón nacional»); ${P36} («Panteón Nacional»); Bellermann (1842–1845); Lessmann (ca. 1885), https://elarchivo.org/producto/panteon-nacional/; reformas de 1911 y 1930: https://fundaayc.com/tag/panteon-nacional/; apertura de la iglesia (1781 o 1783): https://iamvenezuela.com/2016/05/panteon-nacional/, https://fundaayc.com/2019/12/15/algo-mas-sobre-la-postal-no-191/ y https://camaradecaracas.com/la-camara-caracas-y-sus-historias/cronicas-de-la-ciudad/biografia-del-panteon-nacional/; nombre en 1843: ${L43('C', 'La Trinidad')}`,
    dudas: 'La iglesia fue inaugurada en 1781 según unas fuentes y bendecida en 1783 según otras; quedó en ruinas tras el terremoto de 1812. Las obras de 1772 no están modeladas: la marca va desde 1843.' },
  { id: 'san-carlos', nombres: [[2, 'Cuartel Veterano'], [3, 'Cuartel San Carlos']], x: 9150, y: 4980, nace: 2, nivel: 3, alto: 9,
    fuente: `${L43('s', 'Cuartel veterano')}; ${P89} (21 «Cuartel San Carlos»); ${P36} (edificio de patio); Mariana Flores, Cuartel San Carlos. Yacimiento veterano (2007): https://dialnet.unirioja.es/descarga/articulo/2321930.pdf`,
    dudas: 'Flores sitúa la construcción entre 1785 y 1790. No se representan obras en 1772. Hito arquitectónico pendiente: se conserva la posición del rótulo existente, no un nuevo levantamiento del edificio.' },
  { id: 'hospital-vargas', hito: 'hospital-vargas', nombres: [[3, 'Hospital Vargas (en construcción)', 'Las obras iniciadas en 1888 figuran en el plano de 1889.'], [4, 'Hospital Vargas', 'Inaugurado y puesto en funcionamiento en 1891.']], nace: 3, nivel: 2, alto: 9,
    fuente: `${P89} (43 «Hospital Vargas»); ${P36} («Hospital Vargas»); Roger Escalona, Sociedad Venezolana de Historia de la Medicina (2006): https://revista.svhm.org.ve/ediciones/2006/1-2/art-3; platabandas desde 1930, Caracas en 450: https://banesco-prod-2019.s3.amazonaws.com/wp-content/uploads/Caracas-en-450.pdf`,
    dudas: 'La planta dibujada en 1889 no demuestra que todas sus alas estuvieran terminadas: el modelo de ese año levanta lo que dibuja el plano, no un avance de obra medido. Las ampliaciones de 1939 no tienen planta que las ubique y no se modelan.' },
  { id: 'hijos-de-dios', nombre: 'Cementerio de los Hijos de Dios', hito: 'hijos-de-dios', alto: 5.5, nace: 3, nivel: 3, nota: 'Recinto clausurado, todavía en pie.', fuente: `${P36} («Cementerio de los Hijos de Dios»); ${P89} (cementerio a, «Concepción»); equivalencia de nombres: https://biblat.unam.mx/hevila/BoletindelaAcademiaNacionaldelaHistoriaCaracas/2009/vol92/no365/5.pdf; cronología: https://fundaayc.com/2018/02/09/1951-desaparece-el-cementerio-de-los-hijos-de-dios/`,
    dudas: 'Abierto en 1856, cerrado al uso en el siglo XIX y demolido después de 1946. Cerrar el cementerio no hizo desaparecer sus muros y nichos. El modelo conserva la misma geometría de 1889 a 1946: ninguna fuente fecha su deterioro.' },
  { id: 'san-jose', hito: 'san-jose', nombre: 'San José', nace: 4, nivel: 3, alto: 18, fuente: `${P36} («Iglesia San José»); ${P11} (dibuja el templo, con planta en cruz); IPC, Lo construido: https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf (pp. 125–126 y 148)`,
    dudas: 'La parroquia es de 1889 y el IPC da el templo por construido ese año, pero el plano de Mestre de 1889 deja la manzana vacía: va desde 1911, con el primer plano que lo dibuja.' },

  // --- el oeste: Miraflores, Caño Amarillo, Palo Grande, El Paraíso ---
  { id: 'miraflores', hito: 'miraflores', nombre: 'Miraflores', nivel: 2, alto: 8, fuente: `${P36} («Palacio Miraflores»); panorámica de ~1903 (fuentes/imagenes)`,
    dudas: 'Como el hito: va desde 1911; si ya estaba en pie en 1889, a verificar.' },
  { id: 'cano-amarillo', nombre: 'Estación de Caño Amarillo', x: 7040, y: 6420, nace: 3, nivel: 2, alto: 7, nota: 'El ferrocarril de La Guaira.',
    fuente: `${P89} («Ferrocarril La Guaira a Caracas», estación); ${P36} («Estación del F.C. de La Guaira»)` },
  { id: 'viaducto-union', nombre: 'Viaducto Unión', x: 7365, y: 6760, nace: 5, nivel: 3, alto: 6, fuente: `${P36} («Viaducto Unión»)` },
  { id: 'el-silencio', muere:6, nombre: 'El Silencio', x: 7850, y: 7180, nace: 5, nivel: 3, nota: 'El barrio, antes de la reurbanización.', fuente: `${P36} (esquina «El Silencio»)` },
  { id: 'hotel-majestic', nombre: 'Hotel Majestic', x: 8260, y: 7520, nace: 5, nivel: 3, alto: 15,
    nota: 'El hotel abierto en 1930, frente al Teatro Municipal. Ubicación aproximada.',
    fuente: 'Fundación Arquitectura y Ciudad: https://fundaayc.com/2013/09/14/1930-inauguracion-del-hotel-majestic/; https://fundaayc.com/2019/11/17/hoteles-nacionales-2/; demolición: https://fundaayc.com/2013/11/04/1949%E2%80%A2-demolicion-del-hotel-majestic/; fotografía de Willem van de Poll, 1948, Nationaal Archief, fuentes/imagenes/1948-commons-hotel-majestic',
    dudas: 'Hito arquitectónico pendiente. Punto aproximado del sector frente al Teatro Municipal; los planos consultados no rotulan el hotel ni permiten aislar inequívocamente su solar entre las construcciones vecinas.' },
  { id: 'palo-grande', nombre: 'Estación Palo Grande', x: 4750, y: 8650, nace: 4, nivel: 2, alto: 7, nota: 'El Gran Ferrocarril de Venezuela.',
    fuente: `${P11} («Estación Palo Grande», «G.F.V.»); ${P36} («Estación Palo Grande»)` },
  { id: 'el-paraiso', nombre: 'El Paraíso', x: 6500, y: 10100, nace: 4, nivel: 1, fuente: `${P11} («El Paraíso»); ${P36} («El Paraíso»)` },
  { id: 'cementerio-sur', hito: 'cementerio-sur', nombre: 'Cementerio General del Sur', nace: 3, nivel: 2,
    nota: 'Abierto en 1876, al sur del Guaire.',
    fuente: `${P36} («Cementerio General del Sur»); plano DCN de fotografías de 1946 («Cementerio General del Sur»): https://archive.org/details/WCWdb_18051; Landaeta Rosales, historia de 1875–1904, reproducida por la Cámara de Caracas: https://camaradecaracas.com/la-camara-caracas-y-sus-historias/ocurrio-aqui/origenes-del-cementero-general-del-sur-en-caracas-1875-1904/`,
    dudas: 'El recinto de 1936 es un calco aproximado del plano; el de 1889 y 1911 es un esquema, porque los planos de esos años no cubren el sitio. Una lectura a ojo del plano de 1946, sobre una copia reducida, coincide con el núcleo y encuentra campos nuevos al norte que no se representan. Las fuentes discrepan en el día de apertura; se usa solo el año 1876.' },
  { id: 'hipodromo', nombres: [[4, 'Hipódromo del Paraíso'], [5, 'Hipódromo Nacional']], x: 5400, y: 9950, nace: 4, nivel: 2,
    fuente: `${P11} («Hipódromo del Paraíso»); ${P36} («Hipódromo Nacional»)` },

  // --- el este: Candelaria y más allá del Anauco ---
  { id: 'candelaria', nombre: 'Candelaria', x: 11230, y: 7000, nace: 1, nivel: 1, alto: 11, nota: 'La iglesia y su plaza.',
    fuente: `${P36} («Iglesia Candelaria», «Plaza de Candelaria»); ${P89} (templo VI, plaza D); ${L43('J', 'La Candelaria')}; Landaeta Rosales, La iglesia y plaza de la Candelaria de Caracas (1908), pp. 5–11 y 17: visita de Martí de 1772, daños de 1812 y plaza colonial (https://archive.org/details/laiglesiayplazad00land)`,
    dudas: 'Existencia documentada en 1772. La posición del rótulo no determina la planta ni las dimensiones del templo colonial.' },
  { id: 'fc-central', nombre: 'Estación del Ferrocarril Central', x: 13380, y: 7640, nace: 3, nivel: 3, alto: 7, fuente: `${P89} (rótulos «Estación» y «Ferrocarril Central»); ${P36} («Estación del F.C. Central»)` },
  { id: 'bellas-artes', nombres: [[5, 'Museo de Bellas Artes (sin inaugurar)', 'La nueva sede que dibuja el plano; inaugurada en 1938.'], [6, 'Museo de Bellas Artes', 'La sede inaugurada en 1938.']], x: 12850, y: 7960, nace: 5, nivel: 3, alto: 10, fuente: `${P36} («Museo de Bellas Artes»); Efraín Subero y Roldán Esteva Grillet, Museos, Fundación Empresas Polar: https://bibliofep.fundacionempresaspolar.org/dhv/entradas/m/museos/`, dudas: 'El plano muestra la sede, no acredita su apertura al público en 1936. Hito arquitectónico pendiente.' },
  { id: 'san-bernardino', nombre: 'Urbanización San Bernardino', x: 12069, y: 5371, nace: 6, nivel: 1,
    nota: 'La urbanización impulsada desde 1939, dibujada en el plano de 1946.',
    fuente: 'Plano DCN basado en fotografías aéreas de 1946, rótulo «San Bernardino»; Fundación Arquitectura y Ciudad: https://fundaayc.com/2016/11/04/1939-constitucion-de-la-empresa-que-construira-san-bernardino/',
    dudas: 'Marca de sector, no de un edificio. La hacienda anterior no se confunde con la urbanización. No se atribuye la misma fecha a todas sus casas.' },
  { id: 'los-caobos', nombre: 'Parque Los Caobos', x: 13400, y: 8450, nace: 5, nivel: 2, fuente: `${P36} («Parque Los Caobos»)` },

  // --- los demás cruces del Guaire (src/puentes-cruces-datos.js) ---
  ...MARCAS_PUENTES_CRUCES,
  // --- la Ciudad Universitaria en obras y la hacienda que ocupó (src/ucv-1946-datos.js) ---
  ...MARCAS_CIUDAD_UNIVERSITARIA,
])
