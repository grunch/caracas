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
- Techos y suelos = el propio plano, con la sombra encima.
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

*Caracas (implementado, `src/shader/fachada.js` y `src/shader/vanos.js`):* cada vértice de pared lleva `aPared` = (metros desde la esquina de arranque, largo de la pared); con eso, la altura sobre la base de la casa, los pisos (4,2 m cada uno), el estilo y la semilla, el fragment parte la pared en paños y pisos y dibuja en cada paño su vano. Las medidas de cada estilo (paño, medio ancho del vano, alféizar, dintel, puerta, cuántos paños bajos quedan ciegos, alto del remate) están en `medidas()`. Colonial (como en la vista de 1812 y la litografía de la calle de Caracas de 1843, `fuentes/imagenes/`): cal lisa, zócalo salpicado, una ventana alta y angosta cada 3,5 m o más, casi de piso a techo, con reja de balaustres de madera volada (repisa moldurada, sombrerete y su sombra), puerta grande enmarcada con el zaguán y el patio al fondo, cornisa corrida y alero corto con canecillos. Republicano: igual de liso, ventanas altas más seguidas con reja de hierro volada sobre repisa y bajo sombrerete de mampostería, cornisa. Guzmancista: pilastras, guardapolvo de frontón, cornisa con dentículos, balaustrada en el pretil y puertas de balcón en el primer piso. Ecléctico: almohadillado en la planta baja, balcones arriba, dintel con clave, cornisa con dentículos y friso con tarjas. Moderno: losas marcadas, ventanas corridas con montantes, vidrieras de local con letrero, pretil liso. Quinta: corredor entre columnas con baranda blanca, alero o cornisa. Rancho: chapa acanalada con óxido o bahareque con la caña a la vista, una puerta de tablas. Orillas: puerta y una o dos ventanas, cal gastada. Público: paños grandes y regulares, pilastras, frontones, almohadillado, cornisa. Los vanos van oscuros o con postigos (persianas o tableros) de madera marrón, verde o azul gris según la semilla. En tinta, la pared es papel: contornos y molduras a pluma, hierros como trazos, y los tonos (el adentro de los vanos, la sombra del alero y del corredor) con un rayado en la pantalla, como el de los árboles. Todo lo fino (barras, tablillas, dentículos, juntas) se vuelve su tono medio cuando un píxel ya no lo resuelve, y de lejos la pared entera queda en su tono medio con sus vanos (sin cálculo de detalle: no cuesta nada en la vista de toda la ciudad). Lo que es igual en toda la casa o la pared (aInfo, el largo) va como `flat varying`: interpolado, tiembla en la última cifra y `azar()` lo vuelve ruido de píxel a píxel.
- Los hitos traen su tono en la parte entera de la semilla (blanco, crema, rosa, cemento, terracota, piedra) y tienen materiales especiales: césped, agua de fuente, baldosa, granza, adoquín, madera barnizada, bronce…

## Techos

Azotea de baldosa colorada (gastada; algunas, blanqueadas a la cal) con pretil, cada una un poco distinta; dos aguas con cumbrera y faldas de distinto tono (geometría real); mansarda (faldón de pizarra real + zinc arriba); terraza de los años 30 con casilla de tanque y ascensor (real en edificios de 5 pisos o más); chapa de zinc nueva u oxidada, teja francesa, paja.

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
