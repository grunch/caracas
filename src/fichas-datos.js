/**
 * Los textos de las fichas: lo que el proyecto puede decir de cada lugar marcado, por época (formato en
 * src/fichas.js y specs/05). La clave es el id de la marca (src/marcas-datos.js).
 *
 *   id: { textos: [[desde, 'párrafo'], …],   // desde = índice de época (1 = 1772 … 5 = 1936), en orden
 *         hoy: 'qué es hoy', dudas: 'lo que falta verificar' }
 *
 * De dónde sale cada frase: de lo que dibujan y rotulan los planos del catálogo (la leyenda numerada del de
 * 1889, los rótulos de los de 1911 y 1936), de las imágenes de fuentes/imagenes (sus fichas y el README) y de
 * las notas de las marcas y de los hitos. Lo que es conocimiento general de la historia de la ciudad, sin
 * cotejar todavía con una fuente del catálogo, no va en el texto como un hecho más: va en `dudas`, que la
 * ficha muestra como «Por verificar». `hoy` nombra lo que hay en el lugar en la ciudad actual.
 * La leyenda del plano de 1843 (Jesurún) está transcrita y cotejada en specs/auditoria-1843 (T81): se cita con su
 * letra. La del plano de 1772, no.
 * Un lugar sin entrada muestra la nota de su marca y la fuente de su nombre.
 */
import { FICHAS_PUENTES_CRUCES } from './puentes-cruces-datos.js'
import { FICHAS_CIUDAD_UNIVERSITARIA } from './ucv-1946-datos.js'

const SIN_LEYENDA = 'el nombre de 1772 no se cotejó con la leyenda de ese plano'

export const FICHAS = Object.freeze({
  'san-agustin': {
    textos: [[5, 'El templo de Alejandro Chataing se construyó entre 1924 y 1930. Tiene tres naves y un crucero con cúpula rebajada. El catálogo del IPC documenta una torre de 32 m y una cúpula de 24 m; la dirección histórica es Este 14, esquina de Isleños.']],
    dudas: 'Planta aproximada del contorno de los planos de 1936 y de fotos de 1946, sin mensura catastral. Pigmentos, vanos y otras alturas son interpretativos. Se conserva el mismo volumen en ambas épocas; no se ha documentado una reforma entre ellas. La fecha 1930 de la referencia FAC no fecha la toma de su fotografía.',
  },
  'puente-sucre': {
    textos: [[3, 'El puente Constitución cruza el Guaire al término de la calle Sur 7. Fue destruido por la crecida de 1892.'], [4, 'En el mismo cruce funciona el Puente Sucre de 1895, con una armadura metálica superior de 60 m y sin apoyos intermedios.'], [5, 'El cruce ya dispone de un puente de concreto. La armadura metálica anterior fue desmontada y trasladada; no debe representarse como la estructura de esta época.']],
    dudas: 'Silva Contreras documenta la sustitución en 1925 (Memoria MOP 1926, pp. 339–353); FAC 2022 cita 1930. Ambas fechas preceden a 1936. No se fija aquí el año exacto sin cotejar los expedientes. https://fundaayc.com/2022/09/08/1924-inauguracion-del-puente-ayacucho/',
  },
  'circo-metropolitano': {
    textos: [[4, 'Abrió el 2 de febrero de 1896, entre Miranda y Puerto Escondido. El Circo Metropolitano y el Nuevo Circo fueron edificios diferentes y coexistieron. Su estructura permanecía en la época de 1936 y ya había desaparecido en 1946.']],
    dudas: 'Las referencias difieren entre 1942 y 1945 para la demolición. La cronología de FAC, que sí se leyó, fecha en 1945 el cierre. El issue #257 recoge, de segunda mano, que Marín (2011) registra la última corrida el 19-04-1945 citando a Salas (1978), y que 1942 viene de una memoria posterior de Cilento: ni Marín, ni Salas, ni Cilento se leyeron para esta ficha, y nada está cotejado con la prensa de la época. 1945 tiene más apoyos, pero no es una fecha comprobada. Ambas justifican su ausencia en 1946; leído a ojo, el plano de 1946 dibuja vacío el solar. Modelo de Miraflores calzado al ruedo del plano de 1936. Alturas, pigmentos y graderío interpretativos; no es un levantamiento.',
  },
  'hijos-de-dios': {
    textos: [[3, 'Abierto en 1856 en Sabana del Blanco. En esta época está cerrado al uso funerario, pero sus muros, nichos y sepulturas siguen formando parte de la ciudad. El plano de 1889 lo identifica como cementerio de la Concepción.'], [5, 'El cementerio clausurado conserva estructuras documentadas en fotografías de los años treinta. El cierre no equivale a su demolición, que ocurrió después de 1946.']],
    dudas: 'Tres recintos y contorno aproximado del plano1936, cotejados con1946. El plano1889 conserva la organización, pero difiere en proporciones; no se supone una reforma. Cuatro hileras de nichos observadas en fotografías. Alturas, espesores, sepulturas y árboles interpretativos; sin capilla independiente documentada.',
  },

  'reurbanizacion-el-silencio': {textos:[[6,'Carlos Raúl Villanueva proyectó siete bloques de viviendas y comercios con patios y soportales. El bloque 7 abrió el 5 de julio de 1944; el conjunto se inauguró el 26 de agosto de 1945. La plaza central se llamó General Rafael Urdaneta, hoy O’Leary. La vista de 1946 usa el levantamiento aerofotogramétrico de ese año y conserva las casas anteriores donde el plano no documenta una sustitución.']],dudas:'Emplazamiento ajustado a huellas OSM mediante la georreferenciación del mapa (RMS 5,09 m). Dimensiones interiores, colores y esculturas interpretativos.'},
  // --- el valle ---
  avila: {
    textos: [[1, 'La sierra que cierra el valle por el norte. En las vistas del siglo XIX y en las fotos de comienzos del XX es el fondo de la ciudad: se levanta detrás de los tejados, de un extremo al otro.']],
    dudas: 'El plano de 1936 no rotula la sierra en esta hoja; el nombre es el de uso general.',
  },
  guaire: {
    textos: [
      [1, 'El río del valle corre al sur, lejos de la ciudad colonial: en los planos de 1772 y de 1843, entre las últimas casas y el río todavía hay campo.'],
      [3, 'El plano de 1889 lo escribe «Río Guayre» y ya dibuja un puente de hierro para cruzarlo.'],
      [4, 'La ciudad pasa a la otra orilla: el plano de 1911 rotula El Paraíso, al suroeste, y el de 1936 suma el Puente Sucre.'],
    ],
  },
  calvario: {
    textos: [
      [1, 'El cerro al oeste de la ciudad. Desde este lado se dibujó la vista de 1839: la ciudad baja, la torre de la Catedral y el Ávila al fondo.'],
      [3, 'El paseo de El Calvario fue inaugurado en 1873. El plano de 1889 dibuja sus caminos en la cima y cuenta su capilla entre los templos (XII, «el Calvario»).'],
      [4, 'El Arco de la Federación, construido en 1895 por Juan Hurtado Manrique con Alejandro Chataing, forma parte de los accesos al paseo.'],
      [5, 'El plano de 1936 lo rotula «Paseo Independencia» y marca la «Capilla del Calvario».'],
    ],
    dudas: 'Las fuentes consultadas difieren sobre el año del cambio de nombre a Independencia; se mantiene la denominación descriptiva del paseo en 1889.',
  },
  'arco-federacion': {
    textos: [[4, 'El Arco de la Federación se construyó en 1895 en El Calvario, con proyecto de Juan Hurtado Manrique y colaboración de Alejandro Chataing. Es posterior al paseo de 1873 y no corresponde a la vista de 1889.']],
    dudas: 'La ubicación de la marca es aproximada; el monumento todavía no tiene un modelo arquitectónico propio.',
  },
  catuche: {
    textos: [
      [1, 'Una de las quebradas que bajan del Ávila y cruzan la ciudad. El plano de 1889 la rotula «Río Catuche»; el de 1936 la dibuja junto a la esquina de Puente Trinidad.'],
      [2, 'Ferdinand Bellermann pintó en 1844–1845 el puente de la Trinidad, de arcos de mampostería sobre la quebrada honda, en el borde norte de la ciudad.'],
    ],
  },
  caroata: {
    textos: [[1, 'La quebrada del oeste del casco. El plano de 1889 la rotula «Río Caroata»; el de 1936 la dibuja bajo los puentes Nuevo, Junín y Arauca.']],
  },
  anauco: {
    textos: [[1, 'Baja del Ávila por el este de la ciudad. Los planos de 1889 y de 1936 lo rotulan «Río Anauco».']],
  },

  // --- la plaza y sus alrededores ---
  'plaza-bolivar': {
    textos: [
      [1, 'La plaza mayor era el mercado de la ciudad: una explanada de tierra rodeada de galerías de arcos, con hileras de puestos bajo toldos. Así la muestran un grabado fechado en 1852 y la pintura que Camille Pissarro hizo de ella por esos años.'],
      [2, 'Desde el acuerdo de la Diputación Provincial del 10 de diciembre de 1842 su nombre oficial es Plaza Bolívar. Todavía funciona como mercado: el nombre no anticipa el jardín ni la estatua ecuestre inaugurada en 1874.'],
      [3, 'Hacia 1870 el mercado ya no está: la foto de Lessmann y la acuarela de Bolet muestran la plaza en obra, con los árboles recién plantados. Después llega el jardín, con canteros, faroles, una reja alrededor y, en el centro, la estatua ecuestre de Bolívar, inaugurada el 7 de noviembre de 1874. El plano de 1889 ya la llama Plaza Bolívar.'],
      [4, 'Las fotos de 1910 a 1920 la muestran con el piso de mosaico en damero, los faroles de varios brazos y los árboles ya crecidos.'],
    ],
    hoy: 'la Plaza Bolívar, con la misma estatua.',
    dudas: 'El nombre oficial aparece desde 1843 por el acuerdo de 1842; la plaza conserva el mercado. El jardín y la estatua de 1874 pertenecen a una etapa posterior.',
  },
  catedral: {
    textos: [
      [1, 'En la esquina de La Torre, con la fachada hacia la plaza y la torre a su izquierda, al norte. La torre es lo más alto de la ciudad colonial: en las vistas sobresale dos o tres veces sobre los tejados.'],
      [2, 'La leyenda del plano de 1843 la nombra primera entre las iglesias, capillas y conventos (A).'],
      [3, 'El plano de 1889 la cuenta primera entre los templos (I). Las imágenes de 1867 a 1920 muestran la fachada barroca de dos cuerpos y la torre de tres, con reloj y cupulín.'],
    ],
    dudas: 'No tenemos imagen de la Catedral anterior a la década de 1860: en 1772 y 1843 aparece con el aspecto de esas fotos.',
  },
  'palacio-arzobispal': {
    textos: [
      [1, 'Al sur de la Catedral, frente a la plaza y en la esquina de Las Gradillas, la residencia y el despacho del obispo. El conjunto ya existía en el siglo XVIII; se representa como hipótesis una casa de dos plantas con vanos adintelados, balcones, alero de tejas y dos patios con galerías.'],
      [2, 'Desde la erección de la arquidiócesis en 1803 (ejecutada en 1804) es el Palacio Arzobispal. Sin un alzado fiable posterior al terremoto de 1812, el modelo conserva la misma hipótesis colonial y no inventa una reforma. La leyenda del plano de 1843 lo nombra «Palacio Arzobispal» (j).'],
      [3, 'La reforma de la fachada de 1876–1877, en tiempos de Guzmán Blanco, le dio vanos de arco rebajado, balcones de hierro, bandas horizontales, cornisa y un pretil de recuadros, como los muestra una postal de Bernardo Roswaag de hacia 1920. Su aplicación a 1889 es una retroproyección.'],
      [5, 'La misma envolvente se mantiene en 1911 y 1936, sin cambios documentados entre ambas fechas. El plano de 1936 dibuja la manzana junto a la Catedral sin rotular el palacio.'],
    ],
    hoy: 'el Palacio Arzobispal de Caracas, sede de la arquidiócesis; su fachada se restauró en 1979–1980 y hoy muestra alero de tejas sin el pretil de la postal.',
    dudas: 'Modelo interpretativo, no un levantamiento: la huella de 34 × 36 m, la fachada lateral, los patios y las cubiertas son hipótesis; el alzado colonial se proyecta hacia atrás desde los seis ejes de la fachada actual, y la postal que orienta la reforma está fechada solo de forma aproximada. Colores no verificados.',
  },
  'casa-amarilla': {
    textos: [
      [1, 'En el lado oeste de la Plaza Mayor, la sede del Ayuntamiento, terminada en 1750, era contigua a la cárcel. El cuarto de manzana describe el solar original, no una medida comprobada del edificio actual. Aquí ocurrió la escena del Cabildo del 19 de abril de 1810. Se representan dos inmuebles con patios y un solar posterior; sus formas son hipótesis.'],
      [2, 'Los inmuebles dañados en el terremoto de 1812 fueron reunidos y abiertos como Casa de Gobierno en 1842. El modelo de 1843 conserva tejados y una fachada sobria; la pintura de Bolet de 1870 sirve como referencia retrospectiva, no como testimonio directo de ese año.'],
      [3, 'La reforma de Juan Hurtado Manrique de 1874 dio al conjunto su fachada neoclásica y el pabellón sur. El amarillo y la residencia presidencial se asocian con 1877. El modelo incluye una puerta en ese extremo, tres vanos arqueados sobre un balcón común y el asta con bandera. El plano de 1889 la numera 5, «Casa amarilla».'],
      [4, 'La postal de hacia 1904 muestra cornisa, balcones de hierro y remate central. Se conserva esa envolvente en 1911. La asignación de todo el inmueble a Relaciones Exteriores ocurrió en 1912; no se anticipa en esta fecha.'],
      [5, 'El plano de 1936 la rotula «Min. del Exterior». Se representa una cubierta mixta por la reforma parcial de hacia 1930; la ubicación de la platabanda es hipotética. No se añade la ampliación de 1938 ni se anticipa la sustitución completa de los tejados de 1957.'],
    ],
    hoy: 'la Casa Amarilla Antonio José de Sucre, sede histórica de la Cancillería.',
    dudas: 'Modelo interpretativo aprobado visualmente, no un levantamiento: medidas, linderos, alzados coloniales, patios y casamata son hipótesis. La pintura de 1870 orienta 1843; las fotos modernas afinan los ornamentos sin demostrar su fecha. Relieves y escudos simplificados. La localización de las cubiertas reformadas en 1930 queda por verificar. La leyenda del plano de 1843 trae un «Palacio del Gobierno» (i): que sea esta casa, falta verlo en la letra del plano.',
  },
  capitolio: {
    textos: [
      [1, 'Toda esta manzana pertenecía al convento de las Concepciones (fundado en 1636–1637), que dio nombre a la esquina de Las Monjas. La reconstrucción sitúa la iglesia al norte, orientada hacia el este, un claustro principal de dos plantas, dependencias al oeste y una amplia huerta amurallada al sur.'],
      [2, 'El terremoto de 1812 dañó la iglesia, los claustros y las tapias del convento, aunque la comunidad permaneció aquí hasta 1874. Mientras tanto, el Congreso sesionaba en el vecino convento de San Francisco, cruzando la calle hacia el sur. La leyenda del plano de 1843 lo nombra «Convento de Concepciones» (K).'],
      [3, 'Tras expropiar la huerta sur en 1872 y clausurar el convento en 1874, se levantó el conjunto neoclásico de Luciano Urdaneta: el Palacio Legislativo al sur (1873) y el Palacio Federal al norte, con el Salón Elíptico y las cariátides (1876–1877), en torno al patio con la fuente de hierro de 1875. El plano de 1889 numera 1, «Capitolio», y 2, «Palacio Federal»; el salón aún conservaba su bóveda elíptica achatada original.'],
      [4, 'Entre 1890 y 1891 se montó la sobrecúpula metálica belga de hierro y zinc con linterna calada, proyectada por Antonio Malaussena para proteger de filtraciones la Batalla de Carabobo, pintada por Martín Tovar y Tovar en 1888. Una foto de entre 1915 y 1920 muestra el salón ovalado por dentro.'],
      [5, 'El plano de 1936 rotula «Palacio Federal» y dibuja las cuatro alas en torno al jardín y el óvalo del Salón Elíptico al norte, todavía coronado por la sobrecúpula de zinc y la linterna calada de Malaussena.'],
    ],
    hoy: 'el Palacio Federal Legislativo (sede de la Asamblea Nacional), coronado desde 1958 por su sobrecúpula elíptica dorada de aluminio anodizado.',
    dudas: `Modelo interpretativo aprobado visualmente, no un levantamiento: los alzados del convento y sus reparaciones posteriores a 1812 no tienen testimonio de época, y la bóveda de 1877 y la altura de los chaguaramos son aproximadas; ${SIN_LEYENDA}.`,
  },
  universidad: {
    textos: [
      [1, 'El convento de San Francisco, junto a su iglesia.'],
      [3, 'El plano de 1889 pone aquí la Universidad (3), frente al Capitolio; el de 1936, la «Universidad Central». Las fotos muestran una fachada neogótica, con ventanas ojivales, pináculos y una torre de aguja.'],
    ],
    hoy: 'el Palacio de las Academias.',
    dudas: `Que antes fue el convento de San Francisco es un dato general: ${SIN_LEYENDA}. La leyenda del plano de 1843 no nombra el convento aparte: solo la iglesia, «San Francisco» (N).`,
  },
  'san-francisco': {
    textos: [
      [1, 'La iglesia de la Inmaculada Concepción, del convento franciscano (el primer esquema de la ciudad, de 1578, ya nombra San Francisco). Reconstruida tras el terremoto de 1641 y reformada en 1745, luce una portada barroca de un solo portal con las tres esculturas genovesas de mármol de 1655 y un campanario de tres arcos en su costado oeste.'],
      [2, 'Resistió en pie el terremoto de 1812. Aquí Bolívar recibió el título de Libertador en 1813 y se celebraron sus exequias en 1842. Una litografía de hacia 1845 muestra su portada barroca, el campanario oeste con chapitel de teja y, al lado, el frente bajo del convento. La leyenda del plano de 1843 la nombra «San Francisco» (N).'],
      [3, 'Templo VII en el plano de 1889. Entre 1887 y 1889 Juan Hurtado Manrique rehízo la fachada por encargo de Guzmán Blanco: sin campanario, con tres puertas, las estatuas de 1655 bajo un gran óculo y un remate de volutas y frontón curvo partido.'],
      [5, 'En el plano de 1936, «Iglesia San Francisco», a cargo de los jesuitas desde 1922, junto a la Universidad Central.'],
    ],
    hoy: 'la Iglesia de San Francisco (Monumento Histórico Nacional desde 1956), junto al Palacio de las Academias y la Ceiba de San Francisco.',
    dudas: 'Los alzados laterales de 1772, los contrafuertes posteriores a 1812 y los colores de 1889 a 1936 son interpretativos; la portada de 1745 se lee en la litografía de hacia 1845. La restauración de Luis Malaussena (1953) es posterior al último mapa.',
  },
  'santa-capilla': {
    textos: [
      [1, 'En esta esquina estaba la iglesia de San Mauricio, que el plano de 1772 marca con el símbolo de iglesia. El obispo Martí la describió ese año, según Otaduy, citado por Pérez Gallego: «tres puertas principales hacia el occidente», tres naves, la capilla mayor de bóveda, «un hermoso frontispicio de ladrillo» y, a un lado, una torre «que se fabricó estos últimos años». Las medidas y las alturas del dibujo son una reconstrucción, no una mensura.'],
      [2, 'La leyenda del plano de 1843 nombra la iglesia de San Mauricio (I) y el plano deja su solar en blanco en esta esquina. El terremoto de 1812 le tumbó la torre, de la que quedó el primer cuerpo (Arístides Rojas, citado por Pérez Gallego), y parte de las cubiertas. Siguió en uso, a medio reparar, hasta 1883, y no se sabe qué techos seguían caídos en 1843: acá va techada.'],
      [3, 'La Santa Capilla es el templo VIII del plano de 1889. Guzmán Blanco la decretó el 26 de marzo de 1883 sobre «el deteriorado templo de San Mauricio» y Juan Hurtado Manrique la levantó en menos de cuatro meses: una capilla neogótica de una sola nave, con dos oratorios a los lados de la cabecera y un atrio alrededor. El ensanche se decretó a fines de 1889, después de este plano.'],
      [4, 'El ensanche de 1889 a 1891, también de Hurtado Manrique, le sumó la nave sur, un pasadizo entre las dos naves y, en el medio del frente, una torre con aguja. El terremoto del 29 de octubre de 1900 tumbó la torre; una foto de 1919 la muestra rehecha, sin que se sepa la fecha de esa obra. En 1910 se le cambiaron los techos.'],
      [5, 'Entre 1917 y 1924 se le hizo la nave central, donde estaban el pasadizo y los patios, con proyecto de Luis B. Castillo, que murió en 1921 con la obra en marcha; la torre quedó con un gran arco sobre la puerta. Es basílica menor desde 1926.'],
    ],
    hoy: 'La basílica menor de Santa Capilla, en la esquina de su nombre, sobre la avenida Urdaneta.',
    dudas: 'Las plantas de cada etapa son las hipótesis gráficas de Francisco Pérez Gallego (UCV, 2011 y 2017) puestas a escala sobre el solar del plano de 1936; las alturas no están medidas, salvo una cornisa «a 11 metros» en un recibo de obra de 1890. La torre de San Mauricio va más baja que los 43 m de esa hipótesis. La torre de la Santa Capilla tenía los cuerpos altos de planta octogonal; acá es cuadrada. En 1889 la mitad sur del solar eran todavía dos casas, que no se dibujan. La avenida Urdaneta le quitó en 1952 el frente norte: es posterior al último mapa. IAM Venezuela da la inauguración en diciembre de 1883; Pérez Gallego, con los documentos de la obra, en agosto.',
  },
  altagracia: {
    textos: [[1, 'La iglesia del noroeste del casco. Letra G de la leyenda del plano de 1843; templo II en el de 1889; «Iglesia de Altagracia» en el de 1936.']],
    dudas: 'La leyenda del plano de 1843 ya la nombra. Desde cuándo está en pie antes, sin verificar: aquí aparece desde 1772.',
  },
  seminario: {
    textos: [[1, 'Del lado sur de la plaza, el seminario de Santa Rosa, donde empezó la universidad.']],
    dudas: 'Dato general, ubicado por la cuadra y no por un rótulo. El plano de 1889 ya pone aquí el Concejo Municipal. La leyenda del plano de 1843 nombra una «Universidad» (k) y la «Capilla de la Universidad» (L); falta ver en el plano si sus letras caen en esta cuadra.',
  },
  concejo: {
    textos: [[3, 'Del lado sur de la plaza, el plano de 1889 numera 7 el «Consejo municipal».']],
  },
  justicia: {
    textos: [[5, 'El plano de 1936 rotula «Palacio de Justicia» el edificio del lado sur de la plaza, donde el de 1889 ponía el Concejo Municipal.']],
  },
  carmelitas: {
    textos: [
      [1, 'El convento de las Carmelitas, que dio nombre a la esquina.'],
      [2, 'La leyenda del plano de 1843 nombra el «Convento de Carmelitas» (H).'],
      [3, 'En la esquina de Carmelitas el plano de 1889 pone el Ministerio de Hacienda (18), y el de 1936 lo mantiene.'],
    ],
    dudas: `El convento, en 1772, es un dato general: ${SIN_LEYENDA}. La leyenda del plano de 1843 ya lo nombra.`,
  },
  correos: {
    textos: [[5, 'El plano de 1936 rotula aquí la «Ofic. Principal de Correos», en la esquina de Carmelitas. En 1889 el correo estaba al norte de la plaza (número 10 del plano de ese año).']],
  },
  'teatro-caracas': {
    textos: [[3, 'El plano de 1889 lo numera 35, en la esquina de Veroes. El de 1936 ya no lo rotula.']],
  },

  // --- San Jacinto y el sur ---
  'san-jacinto': {
    textos: [
      [1, 'El convento de San Jacinto, con su plaza al frente, fue visitado por el obispo Mariano Martí en 1772. Su descripción del templo se recoge en el estudio de Mariolly Dávila Cordido (SIGraDi 2013).'],
      [2, 'El conjunto sufrió daños en 1812 y la supresión definitiva del convento fue ordenada en 1837 (Dávila Cordido). La leyenda del plano de 1843 conserva «San Jacinto» (M); ese rótulo no demuestra que continuara la comunidad conventual.'],
      [3, 'La iglesia fue demolida en 1875 para ampliar el mercado (Landaeta Rosales). El plano de 1889 identifica aquí el «Mercado público» (23), anterior a la nueva sede de 1897.'],
      [4, 'La nueva sede del mercado se inauguró en septiembre de 1897, según la investigación de Mariana Iribarren reseñada por Fundación Arquitectura y Ciudad.'],
      [5, 'El plano de 1936 lo rotula «Mercado Principal».'],
    ],
    dudas: `La presencia en 1772 está documentada por la visita de Martí. El mercado consta en el plano de 1889; su rótulo no demuestra que ya tuviera una cubierta de hierro.`,
  },
  'plaza-venezolano': {
    textos: [
      [1, 'La plaza frente al convento de San Jacinto.'],
      [3, 'El plano de 1889 la llama plaza «del Venezolano» (B); el de 1936, «Plaza El Venezolano».'],
    ],
    dudas: `El nombre anterior es un dato general: ${SIN_LEYENDA}. La leyenda del plano de 1843 no da letra a las plazas; el texto al pie de ese plano cuenta «San Jacinto» entre las plazas de la ciudad.`,
  },
  'casa-natal': {
    textos: [
      [1, 'A mediados del siglo XVIII la casa pertenecía a Juan Vicente Bolívar y Ponte, según el Diccionario de Historia de Venezuela de Fundación Empresas Polar. En 1772 se identifica como casa de los Bolívar; Simón nació allí en 1783.'],
      [2, 'La casa sufrió daños en 1812, fue reparada y perdió su piso alto. Es la casa donde nació Simón Bolívar, a una cuadra de la plaza mayor. El plano de 1889 la numera 24, «Casa donde nació Bolívar»; el de 1936 la rotula «Casa Natal».'],
      [5, 'Una revista de 1930 muestra su patio cuadrado, con corredores de pilares de madera y una pila de piedra al centro.'],
    ],
    dudas: 'El rótulo de 1772 describe la propiedad familiar. No se equipara aquella vivienda con la restauración museística inaugurada en 1921 ni se da una fecha exacta de construcción.',
  },
  'teatro-municipal': {
    textos: [
      [1, 'Aquí estaban la iglesia colonial y la plaza de San Pablo. Landaeta Rosales documenta una fuente en la plaza desde 1771; el teatro todavía no existía.'],
      [2, 'La leyenda del plano de 1843 nombra la iglesia de San Pablo (P).'],
      [3, 'La iglesia fue demolida en 1876 (Landaeta Rosales). El teatro se levantó en ese lugar: el plano de 1889 lo numera 25, «Teatro Municipal». Fue inaugurado en 1881 como Teatro Guzmán Blanco (Fundarte). Se representa con su pórtico semicircular original, columnas, óculos y linterna, visibles en la fotografía de los años 1880. Ese frente se demolió en 1949 (Fundación Arquitectura y Ciudad), después de las épocas del mapa.'],
    ],
    dudas: 'La envolvente exterior se conserva entre 1889, 1911 y 1936 como hipótesis de continuidad. Dimensiones, pintura, caja escénica y ornamentos pequeños aproximados; sin levantamiento arquitectónico. No se modela la reforma interior de 1930.',
  },
  'santa-teresa': {
    textos: [
      [3, 'Templo III del plano de 1889; «Iglesia Santa Teresa» en el de 1936.'],
      [4, 'Una postal de 1912 muestra una de sus fachadas, de columnas pareadas y frontón, con las cúpulas detrás.'],
    ],
    dudas: 'Antes hubo en el lugar un oratorio (dato general: San Felipe Neri), que no se marca. La leyenda del plano de 1843 nombra un «Oratorio de San Felipe» (Q): que estuviera aquí, falta verlo en la letra del plano.',
  },
  'teatro-nacional': {
    textos: [[4, 'El plano de 1936 lo rotula «Teatro Nacional».']],
    dudas: 'Inaugurado en 1905 (dato general): por eso aparece desde 1911.',
  },
  rotunda: {
    textos:[[3,'La cárcel de La Rotunda, al sur del Cuartel del Hoyo. Construida entre 1844 y 1854, tenía celdas en dos niveles alrededor de un patio circular; en 1881 se proyectó un segundo recinto al norte. El modelo representa los dos recintos, con fecha de conclusión de la ampliación no comprobada.'],[4,'El plano de Razetti de 1911 la identifica con el 39; el 40 contiguo es el Cuartel del Hoyo, fuera de la reserva de la cárcel.']],
    dudas:'Alturas, guardia, colores y distribución interior simplificados. No se presenta el estudio como levantamiento métrico. La cárcel siguió en pie hasta abril de 1936; la época de 1936 del visor muestra ya el solar libre, como el plano.'
  },
  'solar-rotunda':{
    textos:[[5,'El plano de 1936 muestra libre el solar occidental donde estuvo La Rotunda. La demolición comenzó el 11 de abril de 1936, según la prensa del día siguiente. Se conserva el estado del plano, sin inventar escombros ni adelantar la plaza terminada.']],
    dudas:'El plano dice que se fotografió en marzo de 1936, antes de que empezara la demolición, y aun así dibuja el solar libre: esa contradicción está sin resolver. No consta cuándo terminó el derribo. Una transcripción atribuye el decreto al 2 de enero de 1936 y Polar registra una resolución del MOP en abril: son actos administrativos, no la obra. El verde es la convención de suelo libre del visor.'
  },
  concordia:{
    textos:[[6,'La plaza La Concordia, diseñada por Carlos Raúl Villanueva y fechada en 1940 por Polar. El plano basado en fotos de 1946 muestra jardines y un elemento circular central. El templete se aproxima con fotografías históricas: pilares rectangulares exteriores, columnas interiores y cubierta de teja.']],
    dudas:'Medidas, número de soportes, bancos y árboles interpretativos. No se copia la plaza actual ni las remodelaciones posteriores.'
  },
  'santa-rosalia': {
    textos: [
      [2, 'El templo neoclásico que la parroquia levantó desde 1817, después de que el terremoto de 1812 destruyera el anterior. La leyenda del plano de 1843 lo nombra (R) y el de 1889 lo dibuja con su atrio sobre la calle (templo IV). De cómo era entonces no hay vista fechada: va solo su volumen.'],
      [4, 'El terremoto de 1900 lo dañó y las obras duraron de 1904 a 1908. El catálogo del IPC describe el templo que quedó: tres naves, la central más alta, fachada neoclásica, una cúpula con linterna sobre el presbiterio, dos menores a los lados y una torre. «Iglesia Santa Rosalía» en el plano de 1936.'],
    ],
    hoy: 'la iglesia de Santa Rosalía de Palermo, Monumento Histórico Nacional desde 1960.',
    dudas: 'La planta sale del contorno del plano de 1936; ninguna altura está medida. No se sabe qué partes del templo actual vienen de 1817 y cuáles de 1904–1908: hasta 1889 va sin torre ni cúpulas, sin prueba de que no las tuviera. El plano de 1772 dibuja una iglesia aquí (la parroquia la da por terminada en 1734): no se modela.',
  },
  'san-jose': {
    textos: [[4, 'El templo de la parroquia San José, creada en 1889. El plano de 1911 ya lo dibuja con planta en cruz; el de 1936 rotula «Iglesia San José». El catálogo del IPC lo describe neoclásico, de tres naves con la central más alta, tres puertas, frontón y dos torres gemelas de tres cuerpos a los lados de la fachada.']],
    hoy: 'la iglesia parroquial de San José, frente a su plazuela.',
    dudas: 'El IPC lo da por construido en 1889, pero el plano de 1889 deja la manzana vacía: aquí aparece desde 1911. La planta sale del contorno del plano de 1936; ninguna altura está medida. No se hallaron las reparaciones posteriores al terremoto de 1900. El reloj de una torre no se dibuja: no se sabe desde cuándo está.',
  },
  'san-juan': {
    textos: [[3, 'La iglesia de los capuchinos: los monjes tuvieron aquí hospicio y capilla desde 1788–1791, que el terremoto de 1812 destruyó. El templo parroquial se empezó en 1841 y se concluyó en 1868. Es el templo V del plano de 1889; el de 1936 rotula «Iglesia San Juan» y, al frente, la «Plaza de Capuchinos».']],
    hoy: 'la iglesia de San Juan Bautista, frente a la plaza Capuchinos.',
    dudas: 'Va solo el volumen de la nave que dibuja el plano de 1936: no se halló descripción ni vista fechada de la fachada, la torre o la cubierta, y ninguna altura está medida. La leyenda de 1843 nombra «Capuchinos» (S) sobre este solar, pero el templo estaba en obra: aparece desde 1889.',
  },
  'nuevo-circo': {
    textos: [[5, 'Inaugurado el 26 de enero de 1919, el Nuevo Circo aparece como plaza de toros en el plano de 1936. Su ruedo permanece abierto: la cubierta total proyectada no llegó a ejecutarse.'],
      [6, 'Leído a ojo, el plano DCN de fotografías de 1946 dibuja el anillo del Nuevo Circo en el mismo sitio que el de 1936 y con la portada al noroeste. No dibuja el cuerpo en cuña del sureste que sí está en 1936, y dibuja un elemento rectangular chico en ese lado: el modelo no representa ese cambio. Es el mismo modelo de 1936; ninguna fuente fecha las reformas de sus tendidos.']],
    dudas: 'Modelo interpretativo contrastado con el plano de 1936, con una lectura a ojo del de 1946 y con una fotografía histórica de la portada; alturas, pigmentos y reformas interiores sin datación precisa. La Cámara de Caracas da la inauguración el 26 de enero de 1919; la cronología de FAC, el 25. Fuente: https://camaradecaracas.com/la-camara-caracas-y-sus-historias/cronicas-de-la-ciudad/el-nuevo-circo-de-caracas/',
  },
  'parque-carabobo': {
    textos: [
      [3, 'El plano de 1889 la llama plaza «de Carabobo» (E).'],
      [5, 'En el de 1936 ya es el «Parque Carabobo».'],
    ],
  },
  'puente-hierro': {
    textos: [[3, 'Puente de la Regeneración, conocido como Puente de Hierro. Su estructura de 1875 empleaba vigas inferiores y columnas de hierro.'], [6, 'El puente original fue demolido y sustituido en 1937.']],
    dudas: 'Dimensiones y detalles de la estructura posterior por verificar.',
  },

  // --- el norte ---
  'las-mercedes': {
    textos: [
      [1, 'El convento de La Merced ocupaba este sector desde el siglo XVII. En 1772 recibió la visita del obispo Mariano Martí.'],
      [2, 'El terremoto de 1812 dañó gravemente el conjunto. Los últimos religiosos se retiraron en 1839; la leyenda del plano de 1843 conserva el nombre «La Merced» (E).'],
      [3, 'El plano de 1889 dibuja un templo en el lugar; el de 1936 lo rotula «Iglesia Las Mercedes».'],
    ],
    dudas: 'La visita de 1772 está documentada en Historia general de la Iglesia en América Latina, tomo VII, pp. 228–229. Falta cotejar el solar en el plano de 1772 y la arquitectura de cada etapa; la marca no presupone una fachada colonial intacta en 1843 o 1889.',
  },
  'la-pastora': {
    textos: [
      [1, 'La iglesia del barrio del norte, con dos torres hacia su plaza: así la dibuja el plano de 1936.'],
      [2, 'La leyenda del plano de 1843 nombra la iglesia de La Pastora (B).'],
      [3, 'Templo XI del plano de 1889.'],
    ],
    dudas: 'La leyenda del plano de 1843 ya la nombra. Desde cuándo está en pie antes, sin verificar: aquí aparece desde 1772.',
  },
  panteon: {
    textos: [
      [2, 'La iglesia de la Santísima Trinidad, al norte de la ciudad. Ferdinand Bellermann la dibujó en ruinas hacia 1842–1845. La leyenda del plano de 1843 la nombra «La Trinidad» (C).'],
      [3, 'Inaugurado como Panteón Nacional en 1875. En 1889 tiene dos torres con agujas y un rosetón central, como en la fotografía de Lessmann de fines del siglo XIX.'],
      [4, 'La reforma de Alejandro Chataing, terminada en 1911, cambia la ornamentación y sustituye el rosetón central por una ventana ojival.'],
      [5, 'La reforma de Manuel Mujica Millán, terminada en 1930, incorpora una torre central alta y dos torres laterales menores con cúpulas. Es la fachada representada en 1936.'],
    ],
    hoy: 'el Panteón Nacional.',
    dudas: 'Fachadas cotejadas con Bellermann, Lessmann y las imágenes de Fundación Arquitectura y Ciudad. Planta, dimensiones, laterales y daños son aproximaciones; no se representan las obras de 1772.',
  },
  'san-carlos': {
    textos: [
      [2, 'La leyenda del plano de Jesurún de 1843 identifica el «Cuartel Veterano» (s), al norte de la ciudad. El estudio arqueológico de Mariana Flores sitúa su construcción entre 1785 y 1790 y documenta los daños del terremoto de 1812.'],
      [3, 'El plano de 1889 numera 21 el «Cuartel San Carlos»; el de 1936 dibuja su edificio de patio.'],
    ],
    dudas: 'El rótulo documenta la presencia del cuartel; su arquitectura y las reparaciones posteriores a 1812 requieren un modelo específico.',
  },
  'hospital-vargas': {
    textos: [
      [3, 'Las obras del Hospital Vargas comenzaron en 1888. El plano de Mestre de 1889 ya dibuja su planta y lo identifica con el número 43, pero el hospital aún no estaba inaugurado.'],
      [4, 'El Hospital Vargas fue inaugurado el 1 de enero de 1891 y comenzó a atender pacientes el 5 de julio de ese año, según la investigación de Roger Escalona publicada por la Sociedad Venezolana de Historia de la Medicina.'],
      [5, 'El Hospital Vargas, en servicio desde 1891, cambió de techos después de 1930: según Caracas en 450, las cubiertas ojivales de madera se sustituyeron por platabandas, sin fecha para cada pabellón. Aquí llevan cubierta plana desde 1936.'],
    ],
    dudas: 'El plano de 1889 permite localizar el proyecto, no determinar el avance exacto de sus obras: el modelo de ese año levanta la planta que el plano dibuja. No consta en qué año se cambió la cubierta de cada pabellón: que en 1936 ya fueran planas es una interpretación. Una fuente médica de 1953 fecha en 1939 tres pabellones nuevos (Carlos J. Bello, Ángel Larralde y de lactantes), pero no hay planta que los ubique: no se modelan.',
  },

  // --- el oeste ---
  miraflores: {
    textos: [[4, 'Al noroeste del centro, sobre una terraza: un palacio de un piso alto con pabellones de mansarda, que ya se ve en las fotos tomadas desde El Calvario hacia 1900. El álbum del Centenario, de hacia 1911, lo llama «Residencia Presidencial»; el plano de 1936 lo rotula «Palacio Miraflores».']],
    hoy: 'el Palacio de Miraflores.',
    dudas: 'Si ya estaba en pie en 1889, por verificar: aquí aparece desde 1911.',
  },
  'cano-amarillo': {
    textos: [[3, 'La estación del ferrocarril de La Guaira, al noroeste de El Calvario. El plano de 1889 dibuja la vía y la rotula «Ferrocarril La Guaira a Caracas»; el de 1936, «Estación del F.C. de La Guaira».']],
  },
  'el-silencio': {
    textos: [[5, 'El plano de 1936 llama «El Silencio» a la esquina: es el barrio de antes de la reurbanización.']],
    dudas: 'La reurbanización de El Silencio es posterior a 1936 (dato general).',
  },
  'palo-grande': {
    textos: [[4, 'La estación del Gran Ferrocarril de Venezuela, al oeste: el plano de 1911 la rotula «Estación Palo Grande» y «G.F.V.».']],
  },
  'hotel-majestic': {
    textos: [[5, 'El Hotel Majestic fue inaugurado el 30 de diciembre de 1930 frente al Teatro Municipal y la antigua plaza de San Pablo. Por ello corresponde a la Caracas de 1936.'],
      [6, 'El Majestic seguía abierto en 1946. La fotografía de Willem van de Poll de 1948 permite reconocer sus balcones, toldos y torre de esquina. Fue demolido en 1949 para las obras del Centro Simón Bolívar.']],
    dudas: 'La marca ubica aproximadamente el sector. La identificación precisa del solar y el modelo arquitectónico siguen pendientes; no se representan las casas genéricas como si fueran el hotel.',
  },
  'san-bernardino': {
    textos: [[6, 'En 1939 se constituyó la empresa para transformar la hacienda San Bernardino en urbanización, con proyecto de Maurice Rotival. El plano basado en fotos aéreas de 1946 ya nombra San Bernardino y dibuja sus avenidas y viviendas.']],
    dudas: 'El conjunto no corresponde a la época de 1936. La fecha de formación de la empresa no fecha cada edificio del barrio.',
  },
  'el-paraiso': {
    textos: [[4, 'La ciudad cruza el Guaire: el plano de 1911 ya rotula «El Paraíso», al suroeste, con su hipódromo.'], [5, 'El Paraíso continúa en el plano DCN de 1936. Sus calles y edificaciones forman parte del tejido del plano; la marca de sector no equivale a una reconstrucción individual de sus quintas.']],
  },
  'cementerio-sur': {
    textos: [[3, 'Abierto en 1876 al sur del Guaire. El plano urbano de 1889 no cubre el cementerio con detalle utilizable; el reglamento de 1876 menciona cuatro cuarteles y dos avenidas de 4 m, descritas como norte/sur. Para sugerir los cuarteles, esta vista dibuja un cruce de ejes interpretativo; la orientación y la ubicación reales no están documentadas. El perímetro y las parcelas también son interpretativos.'],
      [4, 'En 1911 se conserva la representación esquemática de cuatro cuarteles. La compra de un segundo lote en 1889 y las obras documentadas desde 1890 no bastan para reconstruir con precisión cuánto del terreno se había urbanizado.'],
      [5, 'El plano DCN de 1936 rotula el Cementerio General del Sur y dibuja una huella irregular, sus calles interiores y arbolado. El modelo calca ese contorno de forma aproximada, no como deslinde catastral.'],
      [6, 'Leído a ojo sobre una copia reducida del plano DCN de fotografías de 1946, el núcleo y las calles interiores principales coinciden con los de 1936; por eso esta vista conserva ese trazado. El plano añade campos al norte, con caminos a trazos, que el modelo todavía no representa.']],
    dudas: 'La propiedad inicial y el lote comprado en 1889 no equivalen a superficie urbanizada. Los planos urbanos de 1889 y 1911 no permiten medir el recinto; el plano original del cementerio se reporta extraviado. Sepulturas, panteones y árboles son tipológicos, sin posiciones o propietarios asignados.',
  },
  hipodromo: {
    textos: [
      [4, '«Hipódromo del Paraíso» en el plano de 1911.'],
      [5, '«Hipódromo Nacional» en el de 1936.'],
    ],
  },

  'bellas-artes': {
    textos: [
      [5, 'El plano DCN de 1936 dibuja y rotula la nueva sede del Museo de Bellas Artes junto a Los Caobos. La institución existía desde 1917 en otra sede. Según el Diccionario de Historia de Venezuela, el edificio de Villanueva se terminó en 1936, pero su inauguración oficial esperó hasta 1938.'],
      [6, 'Esta sede del Museo de Bellas Artes fue inaugurada el 20 de febrero de 1938. En la vista de 1946 ya corresponde a un museo abierto al público.'],
    ],
    dudas: 'No se deduce el estado exacto de la obra en cada mes de 1936 a partir del plano anual. La marca distingue la sede física de la inauguración del museo.',
  },

  // --- el este ---
  candelaria: {
    textos: [
      [1, 'El 17 de mayo de 1772, el obispo Mariano Martí visitó la iglesia, fundada en 1708 y parroquia independiente desde 1750. Describió tres naves, tres puertas hacia el oeste, una torre de tres cuerpos junto a la fachada, del lado de la Epístola, y un cementerio cercado al otro lado. La plaza se delimitó al comenzar el templo; a mediados del siglo XVIII tenía pilastras de ladrillo en sus cuatro costados.'],
      [2, 'La leyenda del plano de 1843 nombra la iglesia de La Candelaria (J). El terremoto de 1812 había derribado parte del templo, su fachada y el tercer cuerpo de la torre; después de la guerra de Independencia se empezó a reedificar «sobre el mismo plan». La fachada nueva no se comenzó hasta 1860: aquí va sin fachada, con un muro de cierre, y con la torre de dos cuerpos; no se sabe cuánto estaba reedificado ese año.'],
      [3, 'Templo VI y plaza D del plano de 1889. La fachada se levantó entre 1860 y 1872 bajo la dirección de Juan Hurtado Manrique: Landaeta Rosales la cuenta entre las más altas de Caracas. En 1880 se le pusieron las tres puertas y el balcón central. La plaza se llamó Carabobo desde 1877 y tuvo la estatua de José Gregorio Monagas desde 1881.'],
      [4, 'El terremoto del 29 de octubre de 1900 dañó la iglesia. Desde 1901 se reconstruyó empezando por el presbiterio, con los techos más altos «para que tengan luz y concuerden con la fachada» (ingeniero Jesús Muñoz Tébar). Entre 1889 y 1900 se había subido y techado de nuevo el campanario. En noviembre de 1908 la obra seguía: estaba casi terminado el techo de la nave central. Aquí se muestra terminada desde 1911: es una interpretación, porque no se sabe cuándo terminó la obra.'],
    ],
    dudas: 'Ninguna altura está medida: salen de la proporción con la planta, que es el contorno del plano de 1936. No se sabe cuánto de la reedificación estaba hecho en 1843 ni cuándo terminó la obra empezada en 1901; el cementerio y la sacristía no se dibujan.',
  },
  'fc-central': {
    textos: [[3, 'El plano de 1889 rotula aquí «Estación» y «Ferrocarril Central», al este de la ciudad.']],
  },

  // --- los demás cruces del Guaire (src/puentes-cruces-datos.js) ---
  ...FICHAS_PUENTES_CRUCES,
  // --- la Ciudad Universitaria en obras y la hacienda que ocupó (src/ucv-1946-datos.js) ---
  ...FICHAS_CIUDAD_UNIVERSITARIA,
})
