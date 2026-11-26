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
const SIN_LEYENDA = 'el nombre de 1772 no se cotejó con la leyenda de ese plano'

export const FICHAS = Object.freeze({
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
      [3, 'El plano de 1889 dibuja el paseo en la cima y cuenta su capilla entre los templos (XII, «el Calvario»). Desde aquí se tomaron las fotos panorámicas de comienzos del siglo XX, y aquí está el arco de la Federación.'],
      [5, 'El plano de 1936 lo rotula «Paseo Independencia» y marca la «Capilla del Calvario».'],
    ],
    dudas: 'En 1889 el paseo llevaba el nombre de Guzmán Blanco (dato general, sin cotejar); cuándo pasó a llamarse Independencia, tampoco se cotejó.',
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
      [3, 'Hacia 1870 el mercado ya no está: la foto de Lessmann y la acuarela de Bolet muestran la plaza en obra, con los árboles recién plantados. Después llega el jardín, con canteros, faroles, una reja alrededor y, en el centro, la estatua ecuestre de Bolívar, que las fotos fechan en 1874. El plano de 1889 ya la llama Plaza Bolívar.'],
      [4, 'Las fotos de 1910 a 1920 la muestran con el piso de mosaico en damero, los faroles de varios brazos y los árboles ya crecidos.'],
    ],
    hoy: 'la Plaza Bolívar, con la misma estatua.',
    dudas: 'El nombre «Plaza Bolívar» es anterior a la estatua (dato general: un decreto de 1842); aquí cambia junto con el jardín, en 1889.',
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
      [1, 'En esta esquina, que el plano de 1889 todavía llama «San Mauricio», estuvo la iglesia de ese nombre.'],
      [2, 'La leyenda del plano de 1843 nombra la iglesia de San Mauricio (I).'],
      [3, 'La Santa Capilla es el templo VIII del plano de 1889: una iglesia neogótica, con aguja.'],
    ],
    dudas: 'Que la iglesia de San Mauricio ocupara este mismo solar en 1772 y en 1843 es un dato general: la leyenda del plano de 1843 la nombra, pero falta ver dónde cae su letra.',
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
      [1, 'El convento de San Jacinto, con su plaza al frente.'],
      [2, 'La leyenda del plano de 1843 nombra San Jacinto (M) entre las iglesias, capillas y conventos.'],
      [3, 'Cuando la plaza mayor se hizo jardín, el mercado vino aquí: el plano de 1889 numera 23 el «Mercado público».'],
      [5, 'El plano de 1936 lo rotula «Mercado Principal».'],
    ],
    dudas: `El convento, en 1772, es un dato general: ${SIN_LEYENDA}. La leyenda del plano de 1843 ya lo nombra.`,
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
      [2, 'La casa donde nació Simón Bolívar, a una cuadra de la plaza mayor. El plano de 1889 la numera 24, «Casa donde nació Bolívar»; el de 1936 la rotula «Casa Natal».'],
      [5, 'Una revista de 1930 muestra su patio cuadrado, con corredores de pilares de madera y una pila de piedra al centro.'],
    ],
    dudas: 'La casa es anterior (Bolívar nació en 1783): aquí se marca desde 1843.',
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
    textos: [[3, 'La cárcel de la ciudad: el plano de 1889 la numera 30, «Cárcel». En el de 1936 la esquina se sigue llamando «La Cárcel», pero el solar ya está vacío.']],
    dudas: 'El nombre «La Rotunda» y su demolición en 1936 son datos generales; el plano de 1889 solo dice «Cárcel».',
  },
  'santa-rosalia': {
    textos: [
      [2, 'La leyenda del plano de 1843 nombra la iglesia de Santa Rosalía (R).'],
      [3, 'Templo IV del plano de 1889; «Iglesia Santa Rosalía» en el de 1936.'],
    ],
    dudas: 'La iglesia es anterior (dato general): aquí aparece desde 1843, cuya leyenda la nombra.',
  },
  'san-juan': {
    textos: [[3, 'La iglesia de los capuchinos: templo V del plano de 1889. El de 1936 rotula «Iglesia San Juan» y, al frente, la «Plaza de Capuchinos».']],
    dudas: 'La iglesia es anterior. La leyenda del plano de 1843 nombra «Capuchinos» (S), no San Juan: si es este templo, falta verlo en la letra del plano; mientras, aparece desde 1889.',
  },
  'nuevo-circo': {
    textos: [[5, 'La plaza de toros: «Nuevo Circo» en el plano de 1936.']],
  },
  'parque-carabobo': {
    textos: [
      [3, 'El plano de 1889 la llama plaza «de Carabobo» (E).'],
      [5, 'En el de 1936 ya es el «Parque Carabobo».'],
    ],
  },
  'puente-hierro': {
    textos: [[3, 'El puente sobre el Guaire, al sur de la ciudad. Una foto publicada en 1876 lo muestra recién hecho, con su hilera de chaguaramos; el plano de 1889 lo rotula «Puente de hierro».']],
  },

  // --- el norte ---
  'las-mercedes': {
    textos: [
      [2, 'La leyenda del plano de 1843 la nombra «La Merced» (E), entre las iglesias, capillas y conventos.'],
      [3, 'El plano de 1889 dibuja un templo en el lugar; el de 1936 lo rotula «Iglesia Las Mercedes».'],
    ],
    dudas: 'El convento de la Merced es colonial (dato general); con el plano de 1772, sin cotejar. Aquí aparece desde 1843, cuya leyenda la nombra.',
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
    textos: [[3, 'El plano de 1889 numera 21 el «Cuartel San Carlos»; el de 1936 dibuja el edificio, de patio, sin rótulo.']],
    dudas: 'El cuartel es de fines del siglo XVIII (dato general); sin cotejar con el plano de 1843, aparece desde 1889.',
  },
  'hospital-vargas': {
    textos: [[3, 'El plano de 1889 ya lo dibuja y lo numera 43, cuando todavía estaba en obra.']],
    dudas: 'El año de inauguración (1891) es un dato general.',
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
  'el-paraiso': {
    textos: [[4, 'La ciudad cruza el Guaire: el plano de 1911 ya rotula «El Paraíso», al suroeste, con su hipódromo.']],
  },
  hipodromo: {
    textos: [
      [4, '«Hipódromo del Paraíso» en el plano de 1911.'],
      [5, '«Hipódromo Nacional» en el de 1936.'],
    ],
  },

  // --- el este ---
  candelaria: {
    textos: [
      [1, 'El 17 de mayo de 1772, el obispo Mariano Martí visitó la iglesia, fundada en 1708 y parroquia independiente desde 1750. Describió tres naves, tres puertas hacia el oeste, una torre de tres cuerpos y un cementerio cercado anexo. La plaza se delimitó al comenzar el templo; a mediados del siglo XVIII tenía pilastras de ladrillo en sus cuatro costados.'],
      [2, 'La leyenda del plano de 1843 nombra la iglesia de La Candelaria (J). El terremoto de 1812 había derribado parte del templo, su fachada y el tercer cuerpo de la torre; la reconstrucción se emprendió después de la guerra de Independencia.'],
      [3, 'La iglesia y su plaza, al este del casco: templo VI y plaza D del plano de 1889.'],
    ],
    dudas: 'La planta, las dimensiones y el aspecto preciso del templo colonial requieren un estudio específico.',
  },
  'fc-central': {
    textos: [[3, 'El plano de 1889 rotula aquí «Estación» y «Ferrocarril Central», al este de la ciudad.']],
  },
})
