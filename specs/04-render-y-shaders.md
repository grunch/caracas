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
- En color, el contorno casi desaparece y a lo lejos todo se aclara con **bruma**.

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
- Los hitos traen su tono en la parte entera de la semilla (blanco, crema, rosa, cemento, terracota, piedra) y tienen materiales especiales: césped, agua de fuente, baldosa, granza, adoquín, madera barnizada, bronce…

## Techos

Azotea de baldosa colorada (gastada; algunas, blanqueadas a la cal) con pretil, cada una un poco distinta; dos aguas con cumbrera y faldas de distinto tono (geometría real); mansarda (faldón de pizarra real + zinc arriba); terraza de los años 30 con casilla de tanque y ascensor (real en edificios de 5 pisos o más); chapa de zinc nueva u oxidada, teja francesa, paja.

## Árboles

Follaje en tres tonos (sombra, media tinta, luz) con el borde movido "como a mano"; en tinta, sombra rayada. Instancias baratas (billboard o low‑poly) para ~36k árboles.

*Caracas (implementado, `src/arboles.js`):* ~6.400 árboles en una sola `InstancedMesh` (un draw call): copa de icosaedro (80 triángulos) abollada en el vertex shader según la semilla de cada árbol, con giro y alto propios, y un tronco de 5 caras. `ShaderMaterial` propio que comparte con la ciudad los objetos uniform de `uColor`, la ola, las épocas y el relieve: se apoyan en `sueloEn` del centro, suben con la ola y crecen cuando su época (`nace`) llega a su lugar. Tres tonos por la luz del sol cuantizada, con manchas para que el corte no sea limpio; el borde, donde la copa se da vuelta, con el grosor movido al azar. En tinta: papel, sombra rayada en diagonal (más tupida en la sombra, en espacio de pantalla) y el contorno y el tronco a pluma. Por ahora están en tinta y en color (no solo en color).

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
