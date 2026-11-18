# Referencias visuales

Pinturas, grabados y fotos de época que guían cómo se reconstruyen las casas de cada época
(estilos, techos, alturas, patios). Una carpeta por imagen: `<AÑO>-<fuente>-<slug>/` con
`original.<ext>` (fuera de git) y `ficha.json` (fuente, licencia, `epocas` a las que aplica: índices
0 = 1578 · 1 = 1772 · 2 = 1843 · 3 = 1889 · 4 = 1911 · 5 = 1936). Las observaciones de cada imagen
van acá, para que quien toque estilos (`tools/geo/estilos.py`), fachadas (`src/shader/fachada.js`),
techos o lotes las tenga a mano.

## 1812 · Vista de Caracas (`1812-commons-vista-de-caracas`) → épocas 1772 y 1843

Grabado a vuelo de pájaro del centro antes del terremoto, mirando al norte, con el Ávila al fondo.

- **Casas de un piso casi todas**; alguna de dos (alto con balcón) en esquinas y cerca de la plaza.
- **Techos de teja a dos aguas**, con la cumbrera **paralela a la calle**: una crujía al frente y
  otras alrededor del patio, cada una con su tejado. No hay azoteas.
- **Manzanas de corona cerrada**: las casas forman un frente continuo sobre la calle y dejan
  **patios y corrales al centro**; las de las orillas tienen solares vacíos cercados con tapia.
- **Fachadas lisas de cal**, con pocas ventanas, chicas y altas, y portones; aleros cortos.
- **Calles rectas y angostas**, de tierra, sin árboles; gente a pie.
- **Lo único alto son las torres de las iglesias** (la Catedral, de varios cuerpos con chapitel),
  que sobresalen dos o tres veces sobre los tejados.
- Hacia las orillas, **solares grandes y baldíos** con cercas, y casas sueltas.

Qué implica para el modelo: en 1772–1843, 1 piso (2 solo cerca de la plaza), tejado a dos aguas
con cumbrera paralela al frente (T33), lotes en tira con patio al fondo (lotes rectos), iglesias
con torre como hitos (T40) y calles de tierra sin arbolado.

## ~1860 (antes de 1876) · Plaza de San Pablo, grabado de C. Aagaard (`1860-blog-plaza-san-pablo-aagaard`) → época 1843

Vista a nivel de calle de la plaza donde después se hizo el Teatro Municipal. **Fecha a verificar**: llegó
como "siglo XVIII", pero el pie la atribuye a Cornelio Aagaard, que sería del XIX.

- **Plaza de tierra, sin árboles**, con una **fuente de pila al centro** rodeada de una verja baja, y
  **postes con cadena** bordeando la calle.
- **Casas de un piso con frente continuo**: paños lisos de cal, **ventanas altas y verticales con reja
  volada** que casi llegan al piso, portones, **alero** y tejado de teja con la cumbrera paralela a la calle.
- **Casas de dos pisos en las esquinas** (izquierda y derecha), con **balcón** corrido en el alto.
- Al fondo, un edificio largo de **un piso con arcada o vanos en arco** (convento u hospital) y una
  **espadaña o torre chica** de iglesia; detrás, las lomas.
- Gente a pie y a caballo; calle de tierra.

Qué implica: las plazas de 1772–1843 van de tierra con fuente y sin arbolado (los árboles de plaza llegan
con Guzmán Blanco); las ventanas coloniales son pocas pero **altas, con reja volada**; los altos con balcón
van en las esquinas; hace falta el tipo "edificio de arcada" para conventos y hospitales (T40).

## 1843 (a verificar) · Calle del centro con torre al fondo (`1843-banesco-calle-de-caracas`) → épocas 1843 y 1889

Litografía a nivel de calle, la mejor referencia de fachadas hasta ahora. **Calle, autor y fecha sin
confirmar**; la torre del fondo parece la de la Catedral.

- **Frente continuo** a los dos lados, todas las casas alineadas, **acera angosta** de losa y calzada de
  tierra o empedrado; sin árboles en la calle.
- **Casas de un piso muy altas** (5–6 m de fachada): **ventanas verticales casi de piso a techo**, con
  **reja volada sobre repisa moldurada** y guardapolvo arriba; una ventana cada 3–4 m, portón con marco.
- **Cornisa moldurada continua y alero corto** de teja; **zócalo** marcado. Algunas con **pretil y
  remates** (lado derecho): el paso de lo colonial a lo republicano.
- **Casa de dos pisos en la esquina** (izquierda): **balcón volado de madera o hierro** en el alto, alero
  ancho, ventana con reja de barrotes abajo y un adorno tallado sobre el portón.
- La **torre de iglesia** domina la calle: tres o cuatro veces la altura de las casas.
- Coche de caballos, gente a pie, un asta o poste alto.

Qué implica: subir la altura de piso de las casas del centro (≈ 5 m de fachada, no 4,2), ventanas
altas con reja volada y repisa como rasgo principal de colonial y republicano, cornisa continua, aceras
desde mediados del XIX, y dos pisos con balcón en las esquinas (no repartidos al azar).

## 1852 · El mercado en la Plaza Mayor, hoy Plaza Bolívar (`1852-facebook-mercado-plaza-mayor`) → época 1843

La plaza principal **era el mercado**: lo más importante que el modelo tiene que cambiar en el centro.
Autor y obra de origen sin identificar.

- **La plaza entera cubierta de puestos**: hileras de **toldos y tenderetes de lona a dos aguas** sobre
  postes, sombrillas, cestas en el piso, burros con carga y una multitud. **Piso de tierra, sin árboles
  ni jardines.**
- **Arquerías de un piso rodeando la plaza** (las galerías o "canastillas" del mercado), con **portadas
  monumentales de arco y frontón** en el medio de cada lado y en las esquinas.
- A la derecha, un **edificio de dos pisos** con ventanas arriba y arcos abajo, tejado a cuatro aguas.
- A la izquierda, casas de un piso con tejado y la **fachada barroca de una iglesia o capilla con
  espadaña** asomando detrás; al fondo, las lomas.

Qué implica: en las épocas 1772 y 1843 la Plaza Mayor va **sin jardines ni árboles**, de tierra, con
las **arquerías perimetrales** y los puestos del mercado (hito nuevo para T40: "Mercado de la Plaza
Mayor", con `muere` en 1889: Guzmán Blanco lo quita y hace la Plaza Bolívar ajardinada con la estatua,
hacia 1874). Los jardines en X y los árboles de la plaza que hoy salen del plano de 1936 no deben verse
antes de 1889.

## 1839 · Vista de Caracas, de John Thomas (`1839-commons-vista-de-caracas` y `1840-camaradecaracas-vista-desde-el-calvario`) → época 1843 (y guía para 1772)

Litografía **en color**, tomada desde una loma al suroeste (El Calvario, probablemente) mirando al
noreste. Hay dos reproducciones de la misma litografía: la de Commons (recortada a lo alto, colores
claros y más fieles; da autor y año) y la de la Cámara de Caracas (más ancha, color saturado; llegó
como ilustración de la época del obispo Diez Madroñero, 1757–1769, pero es esta misma de 1839). Es la
**referencia de color y del conjunto**. Para los tonos, guiarse por la de Commons: **teja anaranjada
clara y terrosa, no roja; el Ávila ocre y malva pálido, con bruma; el campo, sabana seca amarillenta**
más que verde.

Una tercera copia, `1830-ciudadccs-caracas` (640 px, la hoja entera con márgenes), llegó fechada en
1830: parece la misma litografía, a verificar. No agrega detalle; deja abierta la duda de la fecha
(1830 o 1839).

- **Un mar de tejados rojos**, bajo y parejo: casi todo de un piso, con algunos altos sueltos. Tejas de
  rojo anaranjado a marrón, gastadas de forma despareja.
- **Paredes blancas y crema**; no se ven colores fuertes.
- **Tejados a dos y a cuatro aguas**, con las crujías formando patios: se ven los huecos de los patios
  entre los techos, con **árboles asomando** (los patios tienen vegetación).
- **Dos torres** sobresalen, y nada más: la de la Catedral (centro derecha) y otra a la izquierda.
- **Palmas** sueltas y matas en el borde de la ciudad; al norte, entre la ciudad y el cerro, **sabana
  abierta sin casas**.
- **El Ávila**: enorme, verde grisáceo, con pliegues claros y la falda limpia; la ciudad llega solo hasta
  el pie. En primer plano, loma con pasto verde oscuro, vacas y una cruz.
- El borde de la ciudad es **neto**: se pasa de casas a campo sin suburbio.

Qué implica: confirma teja + cal como paleta de 1772–1843 y la variación de tono de los techos; los
patios llevan árboles (ya en `arboles.bin`, falta darles `nace` temprano); el campo es sabana verde con
palmas (para "el valle antes de la ciudad"); el relieve del Ávila debe leerse grande y plegado desde el
suroeste: buena vista de control para comparar con el visor.

## ~1903 (1900–1906) · Panorámica desde El Calvario, foto (`1903-commons-panoramica-de-caracas`) → épocas 1889 y 1911

**Fotografía** de 6477 px (Library of Congress), desde El Calvario hacia el noreste: la referencia más
confiable para fin de siglo, y la misma vista que la litografía de 1839 (sirve para comparar 60 años).
La identificación de edificios es a ojo, a verificar.

- **La ciudad sigue siendo baja**: un mar de tejados de teja de un piso, con muy pocos altos. Sesenta
  años después de 1839, el perfil casi no cambió; cambian los hitos.
- **Tejados a dos y cuatro aguas con crujías alrededor de patios**; se ven claros los **patios con
  árboles** y los corredores con techo propio.
- **Zinc**: en primer plano (zona de la estación, Caño Amarillo) hay **galpones y depósitos con techo de
  chapa**, a dos aguas, largos; también casas con corredor de zinc. El zinc ya existe en 1900 para
  galpones, no solo para ranchos.
- **Hitos que sobresalen** (de izquierda a derecha): una iglesia de dos torres en lo alto (¿La
  Pastora?); un **palacio con mansardas** sobre un basamento con muro de contención (Miraflores); una
  iglesia de **dos torres con cúpulas** (¿el Panteón?); una **fachada barroca ancha con torre**; una
  **aguja neogótica** (¿Santa Capilla?); y a la derecha la **torre de la Catedral**. En primer plano, el
  **monumento con estatua sobre pedestal** de El Calvario.
- **Arbolado**: una arboleda densa en el centro (¿la Plaza Bolívar ya ajardinada u otra plaza?),
  **chaguaramos** (palmas reales) muy altos sueltos, y los cerros con monte bajo y agaves.
- **Al norte y al este, campo abierto**: entre la ciudad y el Ávila todavía hay potreros y cultivos sin
  casas. El Ávila, pelado y plegado.
- **Postes** de telégrafo o luz, y muros de contención y terrazas en la ladera del oeste.

Qué implica: en 1889–1911 la mayoría de las casas sigue siendo de un piso con teja (bajar la proporción
de dos y tres pisos del estilo ecléctico: hoy da 2–3 pisos); agregar un tipo "galpón" (zinc a dos aguas,
largo) cerca de las estaciones; los hitos de la lista son los que hacen el perfil (T40/T41); chaguaramos
como árbol alto suelto; y esta vista sirve de **vista de control** en el visor (cámara en El Calvario).

## 1910 · Plaza Bolívar, foto (`1910-commons-plaza-bolivar`) → épocas 1889 y 1911

La misma plaza del mercado de 1852, ya convertida en paseo. Foto a nivel de peatón.

- **Estatua ecuestre de Bolívar** en bronce, con el caballo encabritado, sobre un **pedestal alto de
  piedra oscura** con gradas: el centro de la plaza. Con el pedestal, unas tres veces la altura de una
  persona hasta la base de la estatua.
- **Arbolado denso y alto** alrededor (copas anchas, sombra): la plaza ya es un jardín con árboles
  grandes; el piso de los caminos es **liso y claro** (losa o cemento), no tierra.
- **Faroles de hierro ornamentados de varios brazos**, sobre pedestal, muy altos.
- **La torre de la Catedral** asoma detrás, al este: cuerpos cuadrados blancos, **reloj**, remate
  ochavado con cupulín. Confirma que la torre de la litografía de la calle de 1843 es la de la Catedral.
- Gente de paseo, de traje y sombrero: es el lugar social de la ciudad.

Qué implica: hito "Plaza Bolívar" con dos estados: **mercado** (1772–1843, ver 1852) y **plaza
ajardinada con la estatua ecuestre, faroles y árboles grandes** (desde 1889); la estatua y la torre de
la Catedral van como hitos modelados (T40), y los árboles de la plaza nacen en la época de 1889.

## 1867 · La Catedral desde la Plaza Mayor (`1867-commons-catedral`) → épocas 1843 y 1889 (hito: Catedral)

La Catedral vista desde la plaza, con el Ávila detrás. Referencia directa para modelarla (T40).

- **Torre a la izquierda (esquina de la fachada)**: tres cuerpos cuadrados blancos con vanos de arco
  (campanas) y **reloj**, balconcillo con baranda entre cuerpos, y **remate ochavado con cupulín
  oscuro**. Unas 3 veces la altura del muro de la nave.
- **Fachada principal barroca** al pie de la torre: dos o tres cuerpos con **columnas pareadas, nichos
  y un frontón curvo de volutas** con remates; portón de arco. Queda de perfil en esta vista (mira al
  oeste, hacia la calle; la plaza está al sur… a verificar la orientación con el plano).
- **Costado largo hacia la plaza**: un **muro blanco, alto y casi ciego**, de una sola altura, con una
  **portada lateral de frontón** y columnas, **dos o tres ventanas con balcón y tejadillo** arriba, y
  otra portada menor al fondo con remate.
- **Tejado de teja a dos aguas, alto y oscuro**, sobre toda la nave, con una linterna o lucernario
  pequeño asomando a media nave.
- **La plaza delante es de tierra**, abierta, con poca gente: en 1867 todavía no hay jardines ni
  estatua (coincide con el mercado de 1852 y confirma que la plaza ajardinada es posterior).
- A la izquierda, una casa de dos pisos con balcón, pegada a la torre.

Qué implica: la Catedral se modela como **nave larga de muro ciego con tejado a dos aguas + torre de
tres cuerpos con remate ochavado en una esquina + fachada barroca en el frente corto**; la plaza sigue
de tierra en 1867, así que el paso a plaza ajardinada va entre 1867 y 1889.

## 1950 · De Gradillas a Sociedad, foto (`1950-commons-gradillas-a-sociedad`) → época 1936 (con cuidado)

Calle comercial a una cuadra de la Plaza Bolívar (Gradillas es su esquina sureste), mirando al sur.
**Es de 1950, catorce años después de la última época**: marca hacia dónde iba el centro, no cómo era
exactamente en 1936 (los carros, el autobús y parte de los avisos son posteriores).

- **Calle angosta** (la del damero colonial, sin ensanchar), **asfaltada**, con **aceras con brocal**
  angostas y llenas de gente.
- **Edificios de dos a cuatro pisos** a los dos lados, de frente continuo: plantas bajas **todas de
  comercio**, con vidrieras, **toldos y marquesinas** y santamarías; arriba, ventanas y balcones.
- **Avisos por todas partes**: letreros en bandera, perpendiculares a la fachada y luminosos, uno
  detrás de otro (peletería, almacenes, relojes con reloj de calle), y **cables y pasacalles** de lado
  a lado. El rasgo más fuerte de la calle.
- Al fondo, la calle baja hacia el sur y se ven los cerros.
- Carros y autobús de fines de los 40.

Qué implica: en 1936 las cuadras comerciales del centro (alrededor de la plaza y hacia el sur) llevan
el estilo **de comercio**: vidriera, toldo y letrero en la planta baja de los estilos ecléctico y
moderno, y avisos en bandera (sirve para T32); las calles del centro ya van asfaltadas con acera. Los
pisos de 2 a 4 solo aquí, en el núcleo comercial: fuera de él, la ciudad de 1936 sigue baja.
