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

Aplicado en `tools/geo/estilos.py` (T31c): en 1772 todo es colonial de un piso, con altos solo en casas de
esquina cerca de la plaza (35 % de las esquinas del centro).

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

Aplicado en (T31c): `tools/geo/vectorizar.py` marca las casas de esquina (`esquinas`) y `estilos.py` pone ahí
los dos pisos de 1772–1889; a media cuadra, un piso.

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

Aplicado en `tools/geo/estilos.py` (T31c): dos pisos en las esquinas (50 % de las del centro en 1843) y 15 % de
fachadas de pretil en el centro en 1843. La altura de piso y las ventanas quedan para las fachadas.

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

Aplicado en (T31c): vista de control `calvario` de `tests/e2e/capturas-estilos.mjs`; en 1843, 97 % de las casas
son de un piso y ninguna pasa de dos.

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

Aplicado en `tools/geo/estilos.py` (T31c): en 1889 y 1911, 97 % y 93 % de un piso; lo ecléctico de 1911 ya no es
de 2–3 pisos (19 casas de tres en toda la ciudad, en el núcleo); estilo 8 **galpón** (zinc) para las huellas
largas de los patios de Caño Amarillo (desde 1889) y Palo Grande (desde 1911).

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
  oeste). *Orientación resuelta al modelarla (T40) con el plano de 1936 y las fotos de 1866 y 1874: la
  fachada y la torre dan al oeste, sobre la plaza, con la torre al norte; el terreno baja hacia el sur.*
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

Aplicado en `tools/geo/estilos.py` (T31c): los 3–4 pisos solo en el núcleo comercial (el eje de la plaza al
Teatro Municipal, hasta 240 m): 70 casas en 1936.

## Años 30 (a verificar) · Sobre los techos, hacia los cerros (`1935-pinterest-vista-hacia-los-cerros`) → época 1936

Foto sin pie ni fuente. Si es Caracas, mira al sur (cerros bajos, no el Ávila). Lugar y fecha a verificar.

- **La ciudad de los años 30 sigue baja**: techos de teja de un piso hasta donde alcanza la vista, con
  **algunos edificios de dos pisos y azotea** intercalados (frente con pretil y ventanas en hilera).
- **Aparecen cubiertas nuevas**: un **edificio grande de planta ancha con techo a cuatro aguas de poca
  pendiente** (mercado, estación o teatro) y, cerca, **una o dos cúpulas** de iglesia.
- **Postes y cables** en casi todas las calles; **chimeneas y tanques** en algunos techos.
- **Árboles altos sueltos** saliendo de patios y plazas.
- Al fondo, **cerros bajos con monte**, sin casas en las laderas.

Qué implica: confirma lo de la panorámica de 1903 para la época de 1936: mayoría de un piso con teja, y
los edificios de varios pisos concentrados en pocas cuadras. Reducir la proporción de "moderno" y
"ecléctico" altos fuera del núcleo comercial.

Aplicado en `tools/geo/estilos.py` (T31c): en 1936, 92 % de las casas de un piso; fuera del núcleo no hay nada de
tres pisos y lo moderno casi no existe.

## 1930 · Calle Real de La Pastora, foto (`1930-facebook-calle-real-la-pastora`) → épocas 1911 y 1936 (barrios)

Calle de barrio a nivel de peatón, en el borde norte de la ciudad, mirando al norte: la referencia de
cómo era la ciudad **fuera del centro** en la última época.

- **Casas de un piso en hilera continua**, a los dos lados, de frente angosto (5–8 m): **pretil o
  cornisa recta con molduras** tapando el tejado (fachada republicana sobre casa de teja), **una puerta
  y una o dos ventanas altas con reja** por casa, zócalo de otro color. Algunas con frontón o remate
  curvo sobre la puerta.
- **Aceras altas con escalones** para salvar la pendiente: la calle sube, y cada casa entra a su nivel.
- **Calle ancha empedrada**, sin asfaltar en 1930, sin árboles; un solo carro estacionado, gente a pie
  y niños en la calle.
- **Postes de madera con muchos cables** a los dos lados.
- **El Ávila empieza donde termina la calle**: ladera empinada con monte bajo, caminos en zigzag, unas
  pocas casas sueltas y sin ranchos. El borde de la ciudad es neto también en 1930.

Qué implica: fuera del núcleo comercial, la época de 1936 es de **casas de un piso con fachada
republicana de pretil** (no ranchos ni quintas: mi regla manda demasiadas casas de barrio a "rancho" y
"orillas"); calles **empedradas** en los barrios y asfalto solo en el centro; aceras escalonadas en las
calles en pendiente; postes y cables como rasgo del siglo XX. Vista de control para el relieve: desde
La Pastora, el Ávila llena el fondo de la calle.

Aplicado en `tools/geo/estilos.py` (T31c): en los barrios de 1936, 78 % de fachadas de pretil de un piso; rancho
solo lo de menos de 45 m² a más de 2,5 km. Vista de control `pastora-norte`.

## 1892 (a verificar) · Calle de La Pastora con la iglesia, foto (`1892-pinterest-la-pastora`) → época 1889 (barrios)

Calle de barrio a nivel de peatón, 38 años antes que la de la calle Real (1930): el mismo barrio, antes
de las fachadas de pretil.

- **Lado izquierdo, casas coloniales pobres**: de un piso, **bajas** (alero a unos 3 m), **tejado de teja
  muy gastado y combado, con alero volado sobre la acera**, paredes de cal **desconchadas**, puertas y
  ventanas chicas de madera, alguna con reja. Frente continuo pero cada casa a su altura: la línea de
  aleros sube y baja.
- **Lado derecho, casas mejores**: más altas, con **aleros de canes de madera muy volados**, ventanas
  altas con reja y repisa, cornisa.
- **Calle empedrada de piedra bruta**, con cuneta al centro; **acera de lajas**, alta de un lado.
- **Iglesia de dos torres con cúpulas** al fondo, blanca, con su tejado a dos aguas: lo único alto.
- **Un poste de telégrafo o teléfono** de crucetas: en 1892 ya hay cables.
- Al fondo, el valle abierto.

Qué implica: en 1889 los barrios son de **casa colonial baja de alero** (estilo 0 o 7, sin pretil); el
pretil republicano llega a La Pastora después (foto de 1930): la misma casa cambia de fachada entre
1889 y 1936, así que el estilo de una casa vieja no debería quedar fijo en "colonial" para siempre.
Alturas desparejas entre casas vecinas (variar la altura de piso por semilla ±15 %). Hito: iglesia de
La Pastora, dos torres con cúpulas (T41).

Aplicado en `tools/geo/estilos.py` (T31c): cada casa tiene un estilo **por época** (`historia`): en los barrios
de 1889 solo 8 % tiene pretil (el resto, colonial o casa de las orillas) y en 1936, 78 %. Vista de control
`pastora-sur`.

## ~1930 (lugar a verificar) · Calle comercial con tranvía junto a una plaza (`1930-pinterest-calle-comercial-con-tranvia`) → época 1936

Foto nítida a nivel de peatón: la mejor referencia del **centro comercial** en la última época (la de
Gradillas es de 1950). Podría ser un costado de la Plaza Bolívar; sin confirmar.

- **Calzada lisa (asfalto o macadam) con rieles de tranvía** en curva: dos vías. **Cables aéreos** del
  tranvía y de luz, y **postes altos** con farol de brazo.
- **Edificios de dos pisos** en hilera: planta baja de **comercio con toldos de lona inclinados** sobre
  toda la acera, uno junto a otro, y **letreros** sobre las puertas y en bandera; arriba, **balcón
  corrido con baranda** y ventanas con postigos; cornisa y pretil. Detrás asoma uno de tres pisos.
- **Acera con brocal**, ancha, llena de gente de sombrero y traje claro.
- **Árboles muy grandes** del lado de la plaza, con el tronco pintado de cal en la base y alcorque
  redondo: dan sombra a media calle.
- **Carros** de fines de los 20 estacionados junto a la plaza.

Qué implica: en 1936 los costados de las plazas del centro llevan **dos pisos con comercio abajo, toldo
y balcón corrido arriba** (el estilo ecléctico de comercio, para T32); **rieles y cables de tranvía**
en las calles principales (dato para T62 y para el suelo de las calles); árboles de plaza de copa
grande, mayores que los de patio.

Aplicado en `tools/geo/estilos.py` (T31c): en el núcleo de 1936 la mitad de las casas tiene dos pisos o más y 70 %
es ecléctica o moderna.

## 1880 · Cuatro fotos de la Caracas de Guzmán Blanco (`1880-runrun-*`) → época 1889

Fotos de 1880 (fotógrafo y archivo sin identificar): cubren el hueco entre 1867 y 1892.

**Desde El Calvario** (`1880-runrun-vista-desde-el-calvario`): la ciudad hacia el sureste, con los cerros
bajos del sur al fondo.
- **Mar de tejados de un piso**, con crujías alrededor de patios; **calles rectas** que se pierden hacia
  el valle; al fondo, **campo abierto** hasta los cerros: la ciudad termina a pocas cuadras.
- **Dos edificios nuevos sobresalen juntos**: uno **grande, de planta ancha y cubierta clara curva o de
  metal** (¿el Teatro Guzmán Blanco, hoy Municipal?) y una **iglesia blanca de cúpula** a su lado (según
  el título, la Asunción; ¿la basílica de Santa Teresa?). A verificar.
- En primer plano, **casas pobres de ladera**: bajas, de teja, escalonadas en la falda de El Calvario.
- Árboles sueltos en patios; una arboleda donde estaría una plaza.

**Plaza Bolívar** (`…-plaza-bolivar-a` y `-b`): **en 1880 la plaza ya es jardín**.
- **Árboles ya crecidos** (copas de 6–8 m) en canteros, **caminos anchos de piso liso y claro**.
- **Faroles de hierro fundido** muy ornamentados: de pie, de un farol, a lo largo de los caminos, y
  grandes de varios brazos en las entradas.
- El **pedestal de piedra con placas** de la estatua ecuestre, sobre gradas, rodeado de bolardos.
- **La torre de la Catedral** detrás, con reloj y remate ochavado.
- Con la vista de 1867 (plaza de tierra) acota el cambio: **la plaza ajardinada se hizo entre 1867 y
  1880**. En la línea de tiempo, jardines, árboles y estatua van desde la época de 1889.

**Estatua de Guzmán Blanco** (`…-estatua-guzman-blanco`): estatua **ecuestre** de bronce, saludando con
el sombrero, sobre pedestal alto, delante de una **fachada neogótica** blanca de un piso alto: ventanas
ojivales, **pináculos**, crestería calada y un **gablete central con aguja** (¿la Universidad, frente al
Capitolio?). Farol de varios brazos al lado.
- Hito efímero: por lo que se recuerda, las estatuas de Guzmán se derribaron en 1889; **a verificar**. Si
  es así, en la línea de tiempo solo cabría entre 1843 y 1889 y no aparece en ninguna época: sirve como
  ficha/anécdota, no como modelo.
- La **fachada neogótica** sí es un hito a modelar (T40): está en la época de 1889 y siguientes.

Qué implica: confirma la ciudad baja de teja en 1880; fija la fecha de la Plaza Bolívar ajardinada;
agrega tres hitos guzmancistas (teatro, iglesia de cúpula, fachada neogótica) y los faroles de plaza.

## ~1875 (a verificar; llegó como 1806) · La Casa Amarilla (`1875-camaradecaracas-casa-amarilla`) → época 1889 (hito)

Grabado del Palacio de Gobierno, en una esquina frente a la Plaza Bolívar. **No es de 1806**: la ropa
(sombrero de copa, crinolina) y los coches son de mediados o fines del XIX, y la fachada es la
neoclásica. Referencia directa para modelarla (T40).

- **Edificio de esquina, de dos pisos**, de planta rectangular larga; **cornisa volada con canes** y
  pretil bajo; **pilastras o cadenas en las esquinas**; faja entre pisos.
- **Planta baja**: ventanas altas en hilera con **guardapolvo curvo adornado**, portón central alto.
- **Piso alto**: ventanas rectangulares con marco y **balcón individual de hierro** cada una; sobre el
  portón, un **balcón mayor** y un **remate central alto con escudo y venera**, con **asta de bandera**.
- En el extremo izquierdo, un cuerpo con **galería de tres arcos** en el alto.
- **Acera con brocal** en la esquina; calle de tierra o empedrado; coches de caballos.
- Al lado (izquierda), una casa de un piso con tejado: el palacio dobla la altura de sus vecinas.

Qué implica: es el patrón del **edificio público guzmancista** (estilo 9 en la época de 1889): dos
pisos, balcones individuales, cornisa fuerte y remate central con escudo. Los coches sirven para T62
(victoria o calesa de dos caballos hacia 1875).

## 1866 → 1900 · La Plaza Bolívar, cuatro momentos (`1866-`, `1874-`, `1880-` y `1900-monedas-plaza-bolivar`) → épocas 1843, 1889 y 1911

Serie de monedasdevenezuela.com (con marcas de agua; fechas según quien las aportó, a verificar). Con el
mercado de 1852, la vista de 1867, las fotos de 1880 y la de 1910, la plaza queda documentada de punta a
punta.

- **1866, sin estatua**: plaza **de tierra, vacía**, con un **muro bajo o pretil de mampostería** y un
  desnivel con escalones (la plaza no es plana: baja hacia el sur); farol de pie suelto. La **torre de la
  Catedral** completa y nítida: **tres cuerpos, reloj en el segundo, remate ochavado con una figura
  encima**; al lado, el **costado de la nave, blanco, con ventanas de balcón** y tejado de teja. Al
  fondo, casas de un piso con tejado y el Ávila. Coincide con el grabado de 1867.
- **1874, estatua recién puesta**: la **estatua ecuestre** sobre pedestal oscuro con **verja de hierro
  baja** alrededor; faroles de pie; árboles jóvenes y una palma; detrás, la **fachada barroca de la
  Catedral** entera (tres calles, frontón con volutas) y su torre.
- **~1880 (el archivo dice 1890)**: plaza **pavimentada**, con **árboles ya altos**, un **chaguaramo**,
  **faroles grandes de varios brazos sobre pedestal** y verja; gente posando al pie del pedestal.
- **~1900**: lo mismo con árboles más grandes y piso de **mosaico o baldosa en damero**; señoras de falda
  larga y sombrero. La torre de la Catedral detrás.

Qué implica: fija la secuencia de la plaza para el hito (T40): **mercado (hasta ~1865) → plaza de tierra
con pretil (1866–1873) → estatua con verja y árboles jóvenes (1874) → jardín arbolado con faroles
(1880 en adelante)**. En nuestras épocas: 1843 = mercado; 1889 y 1911 = jardín con estatua. Y da la
mejor imagen de la **torre y la fachada de la Catedral** para modelarlas.

## ~1930 · Una esquina de la Plaza Bolívar (`1930-eltroudi-esquina-plaza-bolivar`) → época 1936

Vista desde dentro de la plaza hacia una esquina (cuál, a verificar).

- **Edificio de esquina de cuatro pisos, con el ángulo curvo** (chaflán redondeado), balcones corridos
  con baranda en cada piso, cornisas marcadas y **comercio abajo** (pastelería, letreros); a su lado,
  otro de tres o cuatro pisos con miradores.
- A la derecha, un **muro alto y liso con ventanas angostas de arco** (¿el costado de la Catedral?).
- **La plaza está elevada sobre la calle**: escalinata ancha de ocho o nueve gradas, **baranda de
  hierro** y **faroles de cuatro brazos** sobre columnas en las esquinas.
- **Cables de tranvía y de luz** cruzando la esquina; mucha gente de traje claro.

Qué implica: en 1936 las **esquinas de la Plaza Bolívar tienen edificios de 3–4 pisos de ángulo curvo**
(el "moderno/ecléctico alto" va aquí, no repartido por la ciudad); la plaza se modela **en terraza, con
escalinatas y baranda** (el relieve ya da el desnivel).

Aplicado en `tools/geo/estilos.py` (T31c): los 3–4 pisos salen por probabilidad dentro del núcleo (14 % y 5 %),
no puestos a mano en las esquinas de la plaza: eso queda para los hitos (T41).

## Hoy · Vista aérea de un pueblo colonial conservado (`0000-usuario-aerea-pueblo-colonial`) → épocas 1772 y 1843 (patrón de las manzanas)

Imagen satelital actual de un pueblo hispano-colonial que conserva su tejido (lugar sin identificar; no
es Caracas). La aportó el responsable del proyecto como **la referencia de cómo se veían desde arriba
las casas de Caracas en 1772**: lo que importa es el patrón, no el lugar. Las manzanas miden unos
100 m, como las del damero de Caracas. Licencia dudosa (captura de un proveedor comercial): **no se
publica**.

- **Cada manzana es un anillo cerrado de casas**: sobre cada una de sus cuatro calles corre una
  **banda continua de tejado** (la crujía del frente, de 5 a 8 m de fondo) con la **cumbrera paralela
  a la calle**, un faldón hacia la calle y otro hacia adentro. La banda no se corta de casa en casa:
  cambia el tono de la teja, no la línea.
- **Detrás de la crujía, cada casa** (lote de 10 a 15 m de frente y 25 a 50 de fondo) tiene **alas
  laterales y alas cruzadas alrededor de uno, dos o tres patios** rectangulares: los tejados forman un
  **peine o una grilla de alas angostas** (4 a 6 m cada una, a una o a dos aguas, que desaguan al
  patio) alrededor de esos huecos. Desde arriba la manzana parece un gofre de teja: cumbreras largas
  sobre las calles, alas cortas perpendiculares y muchos patios chicos y oscuros. **No** hay tapas
  grandes que cubran un lote entero, ni abanicos.
- **Los patios** son chicos (4 a 8 m), de tierra o de laja, casi siempre a la sombra de sus paredes;
  alguno tiene un árbol.
- **Solares y corrales en el corazón de la manzana** en las menos densas: tierra pelada, algún árbol,
  tapias bajas entre lote y lote.
- **En las esquinas**, las crujías de las dos calles se unen con una **limatesa** (a cuatro aguas).
- **La teja**: cada casa de un tono algo distinto, del marrón grisáceo de la teja vieja al **naranja
  vivo** de los tejados rehechos; las cumbreras y las uniones de las alas se leen como líneas.
- **Calles** angostas, rectas, de tierra o de piedra, **sin árboles**: los árboles están en los patios,
  en los solares y en la plaza.
- **La plaza**: una manzana abierta, con un rectángulo empedrado y unos pocos árboles.

Coincide con las otras referencias: «una crujía al frente y otras alrededor del patio» (1812), «una
crujía al frente y alas más bajas alrededor del patio» (1839), el mar de tejados de la foto de ~1903 y
las «crujías alrededor de patios» de la vista de 1880 desde El Calvario.

Qué implica para el modelo (T33b): las casas de teja de fachada colonial, republicana, guzmancista o
de orillas son **casas de patio**. El plano de 1936 pinta macizas casi todas las manzanas del centro,
así que los patios se abren por regla (y los que el plano sí dibuja se conservan):

- `tools/geo/alas.py` (en el vectorizador) le da a cada casa que da a la calle su **marco**: el
  rectángulo del lote con el frente sobre la **línea de fachada de su cuadra** (una recta ajustada al
  borde de la manzana, la misma para todas las casas de ese lado), y la corta en **alas**: la crujía
  del frente (7 a 8,5 m, la misma en toda la manzana, para que la cumbrera corra seguida), y hacia el
  fondo, patios de 4 a 6 m con una o dos alas laterales, alas cruzadas de 5,5 a 7 m y el solar. Tres o
  cuatro patios en el centro, dos o tres en los barrios, uno o dos en las orillas.
- `src/alas.js` las techa: crujía y alas cruzadas a dos aguas con la cumbrera paralela a la calle,
  alas laterales a media agua hacia el patio, inglete (limatesa y limahoya) en las esquinas; patios y
  solar con su piso, sus paredes y su tapia.
- `src/shader/techo.js`: un tono de teja por casa, del marrón grisáceo al naranja de teja nueva (una
  de cada ocho); piso de patio más oscuro que la calle.
- `tools/arboles-lib.mjs`: un árbol en algunos patios (15 %) y en buena parte de los solares (40 %).

## Después de 1936 (guardadas para épocas futuras)

El sitio termina hoy en 1936. Estas imágenes se guardan con `epocas: []` y `epocas_futuras` para cuando
se agregue una época de los años 40–50 (haría falta también el plano de 1950 ya descargado).

- **Hotel Majestic, 1948** (`1948-commons-hotel-majestic`, Nationaal Archief, 2640 px): el hotel de
  **cinco pisos con torre de cúpula en la esquina**, toldos en cada ventana y comercio abajo, visto
  desde el **pórtico de columnas del Teatro Municipal**; plazoleta con estatua, carros y autobuses de
  los 40, un edificio racionalista bajo al lado. **El Majestic es de 1930**: sirve desde ya como hito de
  la época 1936 (T41).
- **Plaza Altamira, años 50** (`1955-pinterest-plaza-altamira`): vista aérea con el obelisco, el espejo
  de agua, edificios de 8–10 pisos y el Ávila. Fuera del área del plano de 1936.
- **Plaza Miranda y av. Baralt, fines de los 50** (`1955-pinterest-plaza-miranda-av-baralt` y su versión
  restaurada `1955-usuario-plaza-miranda-restaurada`): avenida ancha asfaltada, edificios modernos con
  parasoles, plaza de losas, mucho tráfico. **Derechos reservados de El Nacional: no publicar.**
