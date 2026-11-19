# 04 · Render y shaders

El corazón del sitio es **un material compartido** que hace casi todo en la GPU. Los comentarios GLSL del original (en español) describen cada efecto; acá se resumen como requisitos.

## Material único

- Base: `MeshLambertMaterial` de three.js con `onBeforeCompile`, que inyecta *varyings* (`vInfo, vWorld, vWall, vRise, vAncla…`) y código propio en el vertex y el fragment shader.
- Uniforms globales en un objeto `U` compartido por todas las mallas: `uHoja` (tamaño del plano en px), `uPlaza`, `uMetro`, `uMarco`, texturas (`tMedio`, `tFino[4]`, `tSuelo`, `tCalles`, `tCrece`, `tDespeje`, `tHoyLejos/Cerca`, relieve), `uEpocaK`, `uEtapas`, `uColor` (0 tinta → 1 color), `uSobre`/`uSobreQue` (velo de hover), `uMatas`, resoluciones (`uMedioRes`, `uHoyRes`), `uManto`…
- `make(opts)` crea variantes (con `polygonOffset`, `SIN_RELIEVE` para lo que vuela, etc.). El `customDepthMaterial` está parcheado igual para que las sombras sigan la ola.
- Las mallas usan **atributos por vértice** en lugar de muchos objetos: `aInfo` (vec4: distancia a la plaza / tipo / semilla / estilo) y `aWall` (vec4 con datos del muro: largo, desde dónde se ve, tono, etc.). Casas y muros son unas pocas `BufferGeometry` enormes, no miles de meshes.

## La ola (levantar la ciudad)

- "Cuánto se levantó lo que está a `dist` metros de la plaza: la ciudad sube como una ola que sale del centro."
- Un uniform de tiempo/progreso; cada vértice calcula `rise = smoothstep(…, frente − dist)` con un pequeño desfase por semilla ("cada una a su tiempo"). `transformed.y *= rise`.
- **Acostado** (plano): todo tiene altura 0 y se ve solo el dibujo. **Levantar** (`Espacio` o el botón) anima en los dos sentidos.
- Las épocas usan la misma idea: "el año que *ya llegó* a esa distancia de la plaza: cada etapa avanza como una ola que sale del centro". `aInfo` codifica `distancia + 20000·etapa`; lo que nace o muere aparece o desaparece con su propia ola.
- Una distancia negativa marca cosas que solo existen en color (árboles y aljibes de los patios): crecen al prender el color.

## Relieve

- El vertex shader muestrea la textura half‑float y suma la altura a todo ("todo se apoya en el terreno, salvo lo que vuela: `SIN_RELIEVE`").
- El terreno "se hincha con la misma ola que levanta la ciudad" (acostado, es una hoja lisa).
- Hitos: suben **enteros, a la altura de su ancla** (si no, en la cuesta el techo quedaría inclinado), y su pie baja hasta el suelo para que no floten.
- Sombreado de cuesta: el suelo que mira al sol se aclara y el que le da la espalda se apaga (si no, desde arriba la barranca no se lee).

## El plano como textura

- "El plano en un punto del mundo: 0 tinta, 1 papel. De cerca, los bordes de la tinta se afilan en vez de borronearse" (umbral adaptativo según `cuántos píxeles del escaneo entran en un píxel de pantalla`).
- Mezcla `tMedio` con la tesela fina que corresponda (`tFino[0..3]`, las cuatro alrededor de lo que se mira).
- Fuera de `uMarco`: papel sin color.

## Tinta ⇄ color (`uColor` 0→1)

**Tinta** (grabado):
- Techos y suelos = el propio plano, con la sombra encima. *Caracas:* el suelo es el plano; las casas son papel, con sus fachadas y sus tejados dibujados a pluma (rayas en el sentido de la pendiente, más cargadas en el faldón a la sombra, y la cumbrera y el alero marcados, como en el grabado de 1812): con tejados de verdad, pegarles el plano encima lo deformaba.
- Lo que creció en épocas posteriores: el dibujo de 1867 **se borra** donde ahora hay ciudad; los fondos nuevos van con el gris del rayado simple y lo edificado nuevo con el del cruzado; lo demolido queda en papel blanco.
- Muy de cerca, el rayado del escaneo se vuelve una mancha: en las azoteas se reemplaza por un **rayado cruzado procedural de líneas limpias**.
- Sombra propia **rayada**, como en un grabado. Fachadas en tinta: pizarra en gris, vanos llenos, juntas y hierro como trazos.
- **Contorno por profundidad**: segunda diferencia de la profundidad cruda (da cero en planos y salta en bordes y aristas), normalizada por lo que mide un píxel a esa distancia. Lejos se afloja para que el fondo no sea una mancha negra.
- **Grano de papel** al final.

**Color**:
- Luz tibia al sol y azulada a la sombra: `mix(vec3(.5,.53,.64), vec3(1.07,1.01,.9), smoothstep(.3,.95,luz))`.
- Suelo desde `tSuelo` (R río · G patio · B edificado) + `tCrece` + `tDespeje` + `tCalles`:
  - ciudad: tierra apisonada; afueras: pasto.
  - calles: en 1867, el empedrado bruto del centro con barro en las juntas → adoquín de granito → madera (hasta el Centenario) o asfalto; lo no pavimentado sigue de tierra. Veredas de ladrillo y piedra, después de baldosa clara; veredas anchas en las avenidas nuevas.
  - patios y fondos: tierra oscura con pasto ralo; matas pintadas lejos de la cámara (`uMatas`) y árboles 3D reales cerca.
  - río: marrón grisáceo con oleaje suave y playa mojada en la costa natural; **murallón** de piedra donde se le ganó tierra.
  - plazas y parques nuevos: césped.

*Caracas (implementado, `src/shader/suelo.js`):* el plano queda bajo el color como un dibujo tenue (el suelo se oscurece hasta un 40 % donde hay tinta), pero **sin sus rótulos**: donde `uRotulos` (`plano/rotulos.webp`) marca letra, cifra o símbolo, la tinta no oscurece. Quedan los bordes de manzana y de calle, los contornos, las curvas de nivel y los senderos; se van los nombres de edificios y esquinas, las cotas, las letras de las parroquias y el punteado del tranvía. Solo vale para el plano de 1936: donde la hoja muestra el plano calzado de otra época, la máscara no se aplica. En tinta el plano se ve entero.
- En color, el contorno casi desaparece y a lo lejos todo se aclara con **bruma**.

*Caracas (implementado, `src/shader/valle.js` + `src/shader/suelo.js`): **el valle antes de la ciudad**.* En color, donde la época que rige en ese punto (`epocaAqui`, así que cambia con la ola) todavía no urbanizó (`crece.png` G, ver specs/02), el suelo no es el plano pintado sino campo, y **el dibujo del plano no se ve** (ni manzanas, ni calles, ni rótulos de lo que vendrá). En tinta no cambia nada.
- Tonos de la vista de Caracas de John Thomas (1839, `fuentes/imagenes/1839-commons-vista-de-caracas`): sabana seca y pajiza en el llano, con manchas grandes (ruido por posición del mundo); lomas de un verde oliva (pendiente del terreno); el Ávila ocre pálido, malva arriba (altura); verde solo en el monte (`crece.png` B, con el borde movido) y en el bosque de galería de las quebradas (el agua de `uSuelo` desenfocada); el Guaire y las quebradas en un verde agua, con su playa.
- La altura y la pendiente llegan del vértice del suelo (`vTerreno`, de `terrenoEn` en `src/relieve.js`: el relieve tal cual, sin la ola ni la exageración).
- El borde de la ciudad es neto, sin arrabal ni huertas (como en la litografía): el promedio del punto y de ocho vecinos a 10 m, para que no se vea el serrucho de las celdas de 8 m.
- Los sembradíos que dibuja el plano de 1936 (`uSuelo` G fuera de manzana) aparecen recién en 1936: ningún plano anterior calzado dice qué se sembraba ahí. En 1936, fuera de la ciudad, el dibujo del plano vuelve tenue (0,45: es el plano de ese campo: caminos, curvas de nivel, haciendas).
- En la ciudad, el verde de plazas y jardines (`uSuelo` G) no se pinta antes de 1889: hasta Guzmán Blanco la Plaza Mayor era un mercado de tierra (foto de 1852 en `fuentes/imagenes/1852-facebook-mercado-plaza-mayor`). Vale para todo el verde de la ciudad, también el de los patios (su suelo queda de tierra; sus árboles siguen).
- Sin `crece.png` (la demo de CI) todo cuenta como urbanizado: se ve como antes.

## Luz y acabado

*Caracas (implementado, T35: `src/luz.js`, `src/acabado.js`, `src/shader/sombra.js`, `src/shader/acabado.js`).* Lo que le da al original su profundidad: cada casa tira su sombra, cada silueta y cada arista llevan su línea de tinta, y todo queda sobre papel.

**El sol** es uno solo (`SOL` en `src/luz.js`): fijo, de una tarde, desde el oestesuroeste (azimut 233°) y bajo (38°), en diagonal a la cuadrícula: hay sombra en las calles de norte a sur y en las de este a oeste, y la cara sur del Ávila queda al sol. Llega a todos los shaders como el uniform `uSol` (la luz direccional de la escena toma la misma dirección). Los tonos de los faldones del tejado (`vLuz`) se habían ajustado con un sol más alto: el coseno se lleva a esa escala (`0,30 + 0,76 · cos`).

**Sombras arrojadas** (un solo mapa de 4096; 2048 en modo liviano):
- Una cámara ortográfica en la dirección del sol, **ajustada en cada cuadro a lo que la vista corta en el suelo** (`huellaDeVista` + `ajustarSombra`): los cuatro rayos de las esquinas de la pantalla cortados con el suelo de lo que se mira y con un plano sobre los techos, y a lo sumo a `alcanceDeSombras(dist)` metros (8 × la distancia de la cámara, entre 500 m y 14 km); la caja no se sale de la hoja. Es cuadrada, su lado sale de una escala fija (pasos de ×2^¼) y su centro cae en un múltiplo del texel: al mover la cámara la sombra no titila. Texel: ~0,1–0,3 m de cerca, ~0,5 m sobre el centro, ~2,8 m con todo el valle a la vista (ahí un píxel de pantalla ya mide más).
- **Tiran sombra** las mallas con `castShadow` y `customDepthMaterial`: las casas (`crearMaterialSombraCiudad`: el mismo vértice que el material, con la ola, las épocas, el pretil y el relieve), los hitos y los árboles (su mismo vértice, sin color). **No tiran**: lo que todavía no se levantó, lo que no existe en la época que rige, el alero que la fachada de pretil no lleva (se van de la vista en el vértice), las rejas de los hitos y el suelo (que solo recibe: el Ávila no se hace sombra a sí mismo más que por darle la espalda al sol). Con la ciudad acostada en la hoja no hay mapa ni lectura.
- **La reciben** todos (`solEn(mundo, N)` en `src/shader/sombra.js`, con los uniforms `tSombra`, `uSombraMat`, `uSombra`, `uVista` del `U` compartido): una cara de espaldas al sol está a la sombra sin mirar el mapa; las demás corren el punto hacia afuera de su cara (más cuanto más rasante llega la luz, en texeles) y leen el mapa cuatro veces con comparación y filtro bilineal (`sampler2DShadow`). Fuera del mapa, o hacia el final del alcance, hay sol.
- El mapa no se rehace si nada cambió desde el cuadro anterior (la caja, la ola, las épocas, el color).

**Con esa sombra, cada modo hace lo suyo:**
- **Color**: a la sombra no llega el sol directo (queda la luz del cielo) y lo que queda es más frío; al sol, apenas más tibio: `luzDeColor(sol) = mix(vec3(.70,.77,.98), vec3(1.03,1,.95), smoothstep(.3,.95,sol))`. (La fórmula del original, `mix(vec3(.5,.53,.64), vec3(1.07,1.01,.9), …)`, multiplica toda la luz; acá la parte del sol ya la quita el modelo de luz.)
- **Tinta**: el papel casi no cambia con la cara (65 % de luz pareja): el volumen lo dan el rayado y el contorno. La sombra arrojada es un **rayado a pluma en la pantalla** (`rayadoSombra`: diagonal, cada 6 píxeles de CSS, de un 80 % de tinta), cuyo grosor sigue a la sombra: en el borde las líneas se afinan en vez de cortarse. La **sombra propia** (la cara de espaldas al sol) lleva el mismo rayado, más liviano (42 %). De lejos (más de ~0,6 m por píxel), cuando una raya ya es más ancha que la sombra de una casa, queda su tono medio: sin moiré.

**El acabado** es la última pasada, a pantalla completa (`src/shader/acabado.js`): la escena se dibuja en una textura del tamaño de la pantalla (sRGB de 8 bits, con su profundidad) y de ahí pasa a la pantalla píxel a píxel, sin filtro (no desenfoca la letra chica del plano: solo agrega tinta, bruma y grano).
- **Contorno por profundidad**: la segunda diferencia de la profundidad cruda entre cada píxel y sus vecinos opuestos, en cuatro direcciones (ocho lecturas), llevada a metros y dividida por lo que mide un píxel a esa distancia (`saltoDeProfundidad` en `src/luz.js` es su espejo, con tests). Sobre un plano da cero por más rasante que se lo mire; una arista (cumbrera, esquina, alero) da ~1–2 y una silueta, decenas. Hay línea desde 0,35 (entera en 1,1). En una silueta la línea va **del lado de adelante**, de un píxel; del lado de atrás solo se marcan las aristas entrantes (la pared contra el suelo): un salto hacia atrás de más de 3,5–7 es el eco de la silueta y no se dibuja. Lejos (600 m a 5 km) el umbral sube hasta ×4 y la línea se aclara hasta un 25 %. Fuerza: 0,88 en tinta, 0,3 en color. En pantallas densas los vecinos se leen a un píxel de CSS.
- **Bruma**, solo en color y solo sobre lo dibujado: hasta un 50 % de gris claro, con `1 − exp(−z / 9 km)`.
- **Grano de papel**, fijo en la pantalla (en píxeles de CSS): fibra fina (±3,7 % en tinta, ±2 % en color) y aguas (manchas de 3 px, ±1,7 %).

**Qué se prende** (`ajustesDeAcabado`): por omisión todo; en modo liviano el mapa de sombras es de 2048; **si dibuja la CPU (SwiftShader: CI y los E2E) no hay sombras** (los shaders son los mismos, con el mapa apagado por uniform). Parámetros de la página: `?sombras=0` las apaga y `?sombras=N` fija el lado del mapa (también por software: así las prueba CI), `?contorno=0`, `?grano=0`; con los tres apagados no hay textura intermedia: es el render de antes. `window.lab.acabado` expone `dibujar()` (un cuadro entero: lo usa el render bajo demanda en lugar de `renderer.render`), `estado`, `ajustes`, `mapaDeSombras` y `destino`.

**Límites**: un solo mapa: a nivel de calle y mirando al horizonte, el borde de la sombra cercana queda blando (~0,3 m por texel; pediría cascadas); más allá del alcance no hay sombras (se desvanecen en el último cuarto); el rayado está en la pantalla, así que se queda quieto mientras la ciudad se mueve debajo; el contorno sale solo de la profundidad (sin normales): dos caras que se encuentran casi en el mismo plano no se marcan, y de muy lejos se pierde.

## Fachadas procedurales (por estilo)

No hay texturas de fachada: todo es función de las coordenadas de la pared (`vWall`), el estilo y la semilla. Cada estilo define sus medidas: pretil, ancho de paño, medio ancho del vano, alféizar, dintel, y cuántos paños de la planta baja son puerta y cuántos quedan ciegos.
- **Colonial**: cal, zócalo salpicado de barro, cornisa, puertas y postigos de madera oscura o verde.
- **Italianizante / francesa**: pilastras entre paños, marco del vano con guardapolvo, cornisa con dentículos, almohadillado en planta baja (siempre en las francesas), balcones de hierro (corrido en el primer piso en las francesas) y balaustres en el pretil; las francesas llevan mansarda de pizarra.
- **De comercio**: vidrieras de lado a lado, toldo de lona a rayas, letrero, cornisa simple.
- **Racionalista**: vidrio, local o garaje abajo, caja de escalera vertical, balcones macizos alternados, losas marcadas, basamento oscuro.
- **Galpón / orillas**: ladrillo a la vista con sus hiladas, contrafuertes.
- **Casilla de chapa**: chapa acanalada, sobre pilotes.
- **Avisos pintados en las medianeras** que asoman sobre las vecinas: un paño de color con filete y 2‑3 renglones de "letras", gastado por la lluvia.
- De lejos, los detalles se apagan (LOD en el shader, por derivadas).

*Caracas (implementado, `src/shader/fachada.js` y `src/shader/vanos.js`):* cada vértice de pared lleva `aPared` = (metros desde la esquina de arranque, largo de la pared); con eso, la altura sobre la base de la casa, los pisos (con el alto de piso de esa pared, `aPared.z`: ver Techos), el estilo y la semilla, el fragment parte la pared en paños y pisos y dibuja en cada paño su vano. Las medidas de cada estilo (paño, medio ancho del vano, alféizar, dintel, puerta, cuántos paños bajos quedan ciegos, alto del remate) están en `medidas()`. Colonial (como en la vista de 1812 y la litografía de la calle de Caracas de 1843, `fuentes/imagenes/`): cal lisa, zócalo salpicado, una ventana alta y angosta cada 3,5 m o más, casi de piso a techo, con reja de balaustres de madera volada (repisa moldurada, sombrerete y su sombra), puerta grande enmarcada con el zaguán y el patio al fondo, cornisa corrida y alero corto con canecillos. Republicano: igual de liso, ventanas altas más seguidas con reja de hierro volada sobre repisa y bajo sombrerete de mampostería, cornisa. Guzmancista: pilastras, guardapolvo de frontón, cornisa con dentículos, balaustrada en el pretil y puertas de balcón en el primer piso. Ecléctico: almohadillado en la planta baja, balcones arriba, dintel con clave, cornisa con dentículos y friso con tarjas. Moderno: losas marcadas, ventanas corridas con montantes, vidrieras de local con letrero, pretil liso. Quinta: corredor entre columnas con baranda blanca, alero o cornisa. Rancho: chapa acanalada con óxido o bahareque con la caña a la vista, una puerta de tablas. Orillas: puerta y una o dos ventanas, cal gastada. Público: paños grandes y regulares, pilastras, frontones, almohadillado, cornisa. Galpón (8, de las estaciones): sus medidas, el muro de revoque o ladrillo y el techo de zinc a dos aguas. El estilo y los pisos que ve el fragment (`vInfo.zw`) son los de la época que rige en esa casa (`aHistoria`, `specs/02`). Los vanos van oscuros o con postigos (persianas o tableros) de madera marrón, verde o azul gris según la semilla. En tinta, la pared es papel: contornos y molduras a pluma, hierros como trazos, y los tonos (el adentro de los vanos, la sombra del alero y del corredor) con un rayado en la pantalla, como el de los árboles. Todo lo fino (barras, tablillas, dentículos, juntas) se vuelve su tono medio cuando un píxel ya no lo resuelve, y de lejos la pared entera queda en su tono medio con sus vanos (sin cálculo de detalle: no cuesta nada en la vista de toda la ciudad). Lo que es igual en toda la casa o la pared (aInfo, el largo) va como `flat varying`: interpolado, tiembla en la última cifra y `azar()` lo vuelve ruido de píxel a píxel.
- Los hitos traen su tono en la parte entera de la semilla (blanco, crema, rosa, cemento, terracota, piedra) y tienen materiales especiales: césped, agua de fuente, baldosa, granza, adoquín, madera barnizada, bronce…

## Techos

Azotea de baldosa colorada (gastada; algunas, blanqueadas a la cal) con pretil, cada una un poco distinta; dos aguas con cumbrera y faldas de distinto tono (geometría real); mansarda (faldón de pizarra real + zinc arriba); terraza de los años 30 con casilla de tanque y ascensor (real en edificios de 5 pisos o más); chapa de zinc nueva u oxidada, teja francesa, paja.

*Caracas (implementado, T33): techos de verdad, como en las referencias (`fuentes/imagenes/README.md`).*

**La geometría** (`src/ciudad.js`, `src/techos.js`, `src/alzado.js`, `src/poligono.js`; todo puro y determinista por la semilla de la casa):

- Las casas que traen **marco** en el dato (`specs/02`) no buscan su frente: el rectángulo, el frente y los lados que dan a una calle vienen del vectorizador, alineados con su cuadra. Para las demás (las de adentro de la manzana, los datos sin marcos):
- A cada huella se le quitan los dientes del trazado a píxeles (Douglas–Peucker, 0,6 m) y se le busca su rectángulo mínimo. **El frente** es el lado del rectángulo que da a la calle: se sondea a 2 y 4 m de cada lado si hay otra casa (índice en grilla); si hay varios lados libres (esquinas, casas sueltas) gana el más largo, y si no hay ninguno, el más despejado. Las casas de la fundación, que mueren, no cuentan como vecinas.
- En el marco del lote (u a lo largo del frente, v hacia el fondo) el techo es un **plan de faldones**: regiones convexas que cubren el lote, cada una con su plano. `src/alzado.js` recorta cada faldón con la huella, sube las paredes hasta su faldón (hastiales incluidos), pone una pared donde un faldón queda más alto que su vecino y, donde el faldón cae hacia la calle, el **alero** (0,5–0,8 m, con su cara de abajo).
- **Casa de patio** (T33b; teja y fachada colonial, republicana, guzmancista o de orillas, con alas en el dato: `marcos` y `alas`, `specs/02`): como en la vista aérea del pueblo colonial (`fuentes/imagenes/README.md`), la manzana es un gofre de teja. `src/alas.js` arma el plan en el marco que trae el dato: la **crujía del frente** a dos aguas con la **cumbrera paralela a la calle** (25°–30°, hasta 2,8 m de subida), sobre la línea de fachada de la cuadra y con el mismo fondo en toda la manzana, así la cumbrera y el alero corren seguidos de casa en casa; las **alas cruzadas** a dos aguas, también paralelas a la calle, de un piso y medio metro más bajas (se meten bajo el alero de la crujía); las **alas laterales** a media agua, con lo alto en la medianera y cayendo al patio (nunca a menos de 2,3 m: debajo hay un corredor); el ala del fondo, si es angosta, a media agua. En una **esquina**, la crujía y el ala de la otra calle se unen **a inglete**: limatesa por fuera, limahoya por dentro, sin escalón. **Patios y solar** son huecos con su piso (apoyado en el terreno de cada punto: en la cuesta no lo tapa), paredes con vanos hacia el patio y tapia de 2,6 m donde tocan la medianera. La huella se lleva a la línea de fachada (los vértices a menos de 1,5 m de ella), para que el frente quede derecho; lo que la huella sobresale del rectángulo del lote lo cubren las alas del borde, estiradas. Si la casa cambia a ecléctica o moderna, esa etapa se techa entera, sin patios.
- **Casa de teja simple** (las chicas, angostas o irregulares; las que no dan a la calle; quintas; mitad de las eclécticas): una **crujía al frente** de 6 a 7,5 m (o la de su manzana, si trae marco) con la **cumbrera paralela a la calle**, a cuatro aguas en el extremo que da a otra calle; detrás, si el lote es profundo, **crujías bajas paralelas a la calle** (o un cuerpo con la cumbrera hacia el fondo en los lotes de menos de 7,5 m de ancho). No se inventan patios en el visor. Las huellas que llenan menos del 60 % de su rectángulo (irregulares) llevan crujías paralelas bajas, y **lo público de teja** (iglesias, conventos y cuarteles hasta 1843), naves de 13 m a lo largo.
- **Azotea** (modernas, lo público desde 1889, la otra mitad de las eclécticas): losa 0,7 m bajo el pretil, con cara de adentro, y en algunas la caseta de la escalera. **Zinc** a dos aguas de 14° con la cumbrera a lo largo: ranchos y galpones de estación (estilo 8).
- **Alturas**: cada estilo tiene su alto de piso (colonial 4,6 m, republicana 4,8, guzmancista 5,0, ecléctica 4,2, moderna 3,5, quinta 3,6, rancho 2,5, orillas 3,2, galpón 5,5, público 5,0) y cada casa lo varía ±15 % con su semilla: la línea de aleros sube y baja (La Pastora, 1892). La fachada recibe el alto de piso de **cada pared** (`aPared.z`) y ajusta sus vanos: se achican para caber en una casa baja y se estiran en una alta.
- **Las épocas** (`aHistoria`, `specs/02`): si con las épocas cambia la forma del techo (otra cubierta, otros pisos), la casa va en la geometría **una vez por etapa**, cada una con su vida y hecha con sus pisos (el shader no la estira). Si solo cambia la fachada (de colonial a republicana), es la misma geometría: cuando la fachada de la época lleva pretil (estilos 1 a 3), el vértice **sube 0,75 m las paredes que dan a la calle** (y la cara de adentro del pretil, que nace sin altura) y el fragment **descarta el alero**.

**Atributos** nuevos por vértice: `aTecho` = (s a lo largo del alero, t bajando por la pendiente desde la cumbrera, largo del faldón, cubierta: 0 pared · 1 teja · 2 azotea · 3 zinc · 4 alero por debajo · 5 piso de patio · 6 tierra de solar · +8 cara de arriba de un alero); en las paredes, `aTecho.xy` = (lo que sube ese vértice con el pretil, lo que sube su pared). `aPared` pasa a tres números (el tercero, el alto de piso de esa pared).

**El shader** (`src/shader/techo.js`): teja criolla con hileras de canal y cobija que bajan por la pendiente, hiladas casi parejas, cada teja con su tono; el tejado de cada casa tiene su tono, del marrón grisáceo de la teja vieja al terroso claro, y una de cada ocho el naranja vivo de la teja nueva (vista aérea del pueblo colonial; litografía de 1839: no rojo), con chorreaduras de moho hacia el alero, parches de teja nueva, vetas entre hileras, el caballete claro de la cumbrera y la sombra del alero; el faldón que no mira al sol va más oscuro (`vLuz`), para que se lean los volúmenes. Azotea de cemento manchado; zinc acanalado con óxido (el de las fachadas); el alero por debajo, caña sobre canes; el piso del patio, tierra apisonada más oscura que la calle, con alguna mata; el del solar, tierra con pasto ralo. De lejos cada escala se apaga a su tono medio con `detalle()` (derivadas tomadas en el `main`, fuera de toda rama), y la cumbrera y el alero nunca bajan de un píxel de ancho: son los que dibujan el mar de tejados. En tinta, rayas a pluma cuyo paso se duplica con la distancia. Cada fragmento calcula el techo o la fachada, no los dos. Acostada en la hoja (antes de la ola), la casa sigue siendo el plano en tinta y un tono liso en color.

**Límites**: los patios se abren por regla (el plano de 1936 pinta macizas casi todas las manzanas; solo se conservan los que dibuja como huecos de una casa); los aleros no vuelan sobre los patios (solo sobre la calle) y los de dos casas vecinas no se cortan a inglete entre sí; las medianeras se dibujan aunque queden tapadas; la línea de aleros sube y baja de casa en casa (alto de piso ±15 %) aunque la cumbrera corra seguida en planta; las casas que no dan a la calle y las irregulares van con crujías paralelas, sin patio; las casas de la fundación se enciman con las que vienen después hasta que mueren; en el suelo, el borde de lo edificado (`uSuelo`, 2,3 m por texel) asoma como un filo de color teja al pie de algunas fachadas.

## Árboles

Follaje en tres tonos (sombra, media tinta, luz) con el borde movido "como a mano"; en tinta, sombra rayada. Instancias baratas (billboard o low‑poly) para ~36k árboles.

*Caracas (implementado, `src/arboles.js`):* ~6.400 árboles en una sola `InstancedMesh` (un draw call): copa de icosaedro (80 triángulos) abollada en el vertex shader según la semilla de cada árbol, con giro y alto propios, y un tronco de 5 caras. `ShaderMaterial` propio que comparte con la ciudad los objetos uniform de `uColor`, la ola, las épocas y el relieve: se apoyan en `sueloEn` del centro, suben con la ola y crecen cuando su época (`nace`) llega a su lugar. Tres tonos por la luz del sol cuantizada, con manchas para que el corte no sea limpio; el borde, donde la copa se da vuelta, con el grosor movido al azar. En tinta: papel, sombra rayada en diagonal (más tupida en la sombra, en espacio de pantalla) y el contorno y el tronco a pluma. Por ahora están en tinta y en color (no solo en color). Desde T38 la malla lleva además el **monte** (~26 mil árboles silvestres, specs/02): `aArbol` = (nace, muere, semilla, silvestre); mueren con `vivoEn` cuando la ola de la época urbaniza su lugar, solo se ven en color y tiran a un verde más seco. De lejos (1,2 a 4,5 km de la cámara) todos los árboles pasan a un verde medio liso: un árbol de un píxel con su sombra y su contorno sería pimienta sobre el campo. Sigue siendo un draw call (~32 mil instancias, 2,9 M de triángulos).

## Velo (hover)

"Lo que se puede tocar se aclara al pasarle el mouse, como con un resaltador." Se aclara solo el edificio (por su ancla), o lo que esté dentro del radio de la marca. El suelo entra solo cuando la marca es una plaza, un dique o una avenida.

## Cámara y controles (propios)

- Estado `cam = {now, goal}` con `x, z, dist, yaw, pitch`; amortiguación exponencial hacia `goal`; `jump()` para los saltos y `auto` para los vuelos.
- Paneo con arrastre (proyectado al plano del suelo), zoom hacia el cursor con la rueda, giro e inclinación con el botón derecho o dos dedos.
- Límites: no salir del `interior`; pitch mínimo y máximo según la distancia.

## Rendimiento

- `antialias:false` (el contorno y el grano lo disimulan), `pixelRatio ≤ 2`.
- Modo liviano: texturas `-2k`, sin teselas de 8192, menos sombras.
- Pocos draw calls (geometrías fusionadas) y `frustumCulled` desactivado donde la malla abarca toda la ciudad.
- Render bajo demanda.
- *Caracas, luz y acabado (T35):* tiempo por cuadro en una RTX 2060 a 1600 × 1000, 1936, con la cámara moviéndose (el mapa de sombras se rehace en cada cuadro; `tests/e2e/capturas-acabado.mjs … medir`): valle 6,0 → 6,9 ms (ahí la caja es la hoja entera y el mapa no cambia al mover la cámara), centro 6,6 → 10,3, de cerca 7,1 → 10,7, a nivel de calle 9,4 → 13,1 (×1,15 a ×1,55). El mapa de sombras cuesta ~3,3 ms (los ~5 M de triángulos de casas y árboles, solo vértice; con 2048 cuesta casi lo mismo) y la pasada de acabado, menos de 1 ms; con la cámara quieta (una animación de color o de "hoy") el mapa no se rehace.
- *Caracas, techos de verdad (T33):* la ciudad sigue siendo una geometría y una llamada. Con los datos reales (33.986 casas, 35.197 etapas): 2,27 M de triángulos de casas (antes, con tapas planas, 2,09 M) y 4,4 M de vértices; armar la geometría lleva ~4–5 s (antes ~3 s). Tiempo por cuadro en una RTX 2060 a 1600 × 1000 (`tests/e2e/capturas-techos.mjs … medir`): valle 6,2 ms (antes 5,0), centro 6,6 (5,3), de cerca 7,3 (5,7), a nivel de calle 9,7 (7,4). Acostada en la hoja, el techo va en su tono medio y el suelo no calcula techo ni fachada (ramas con `if`, que el render por software salta).
