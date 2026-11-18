# 05 · Épocas, hitos y fichas, "lo de hoy", buscador, modos

## Línea de tiempo (`src/epocas.js`)

- Botonera de años: el primero es el plano base y los demás salen de `crece.json`. El `año` que se muestra puede no coincidir con el `plano` usado: 1910 usa el de 1909, y 1940 usa el de 1936 más las obras hechas hasta 1940.
- La primera vez que se elige un año se cargan `crece.pak`, `crece.webp` y `despeje.webp` (carga diferida) mientras se muestra "Cargando la ciudad de {año}…". Si falla: "No se pudo cargar. Tocá el año otra vez para reintentar."
- `uEpocaK` se anima de la etapa actual a la nueva; la transición es la misma ola que sale de la plaza.
- Pie del panel: "La ciudad hacia {año}", la fuente corta del plano y las `obras` ("Se abrió la Avenida de Mayo y el puerto le ganó tierra al río.").
- Botón ▶: "Ver cambiar la ciudad, de 1867 a {último}" recorre los años solo.
- Las marcas, las fichas y el coche de los modos dependen de la etapa (`desde`/`hasta`).

## Marcas (`marcas.js`)

Formato compacto, una fila por marca:
```js
[nombre, x, y, radio, nivel, nota, {desde, hasta, ficha, radio}?]
// ['Cabildo', 10294, 9378, 32, 2, 'Con sus once arcos y la torre vieja, de 1765.', {hasta:1}]
```
- `x,y` en píxeles del plano base; `radio` en m (zona del velo); `nivel` de 1 a 3; `desde/hasta` = índices de etapa; `ficha` = id de la ficha si difiere del nombre.
- Un mismo lugar puede tener varias filas, una por época: el Cabildo tiene 4 (1867, la reforma de Benoit, la demolición de los arcos en 1889 y la restauración de 1940).
- Proyección a pantalla en cada cuadro (`will-change: transform`), oclusión simple y *declutter* por nivel y distancia; en táctil, "tocar cerca" con un radio de 9 px.

## Hitos (`src/hitos.js`)

*Referencia (baires):* un objeto por edificio, con `planta` (multipolígono en píxeles del plano) y `partes`
(cuerpos con altura y techo propios); constructores paramétricos para iglesias, columnatas, arcos, cúpulas;
las plazas de cada época; cada hito con su ancla en el relieve.

*Caracas (implementado, T40):* cada hito es una definición declarativa en `src/hitos/datos/*.js`:
```js
{ id: 'plaza-bolivar', nombre: 'Plaza Bolívar', x: 8976, y: 6844, eje: [0.9861, 0.1659],   // píxeles del plano de 1936
  nace: 1, muere: 0,                    // épocas (0 = 1578 … 5 = 1936); muere = 0: no muere
  planta: [[[x, y], …]], suprime: [[[x, y], …]],   // polígonos en píxeles
  fuente: '…', verificar: ['…'],        // de dónde sale y qué no está probado: nunca se inventa
  partes: [{ tipo: 'terraza', nace: 3, muere: 4, ancho: 86, fondo: 82, piso: 'jardin' }, …] }
```
- **Marco**: `x, y` en píxeles del mosaico (0,5 m/px) y `eje` (la dirección del damero, de Principal a La
  Torre). Las medidas de las partes van en metros en ese marco: `a` a lo largo del eje, `b` a su derecha.
- **Partes** (`src/hitos/partes.js`): cada `tipo` tiene su constructor; una parte puede tener su propia vida
  (`nace`, `muere`), y así un mismo hito cambia con las épocas. Hoy: `terraza`, `verjaPerimetral`,
  `escalinatas`, `faroles`, `estatuaEcuestre`, `galeriasDeMercado`, `puestos`; `cuerpo`, `torre`,
  `fachadaBarroca`, `portadaLateral`, `ventanas`, `cupula`, `iglesia`; `palacio`, `portico`,
  `remateConEscudo`, `frenteNeogotico`.
- **Piezas** (`src/hitos/piezas.js`) y **objetos** (`src/hitos/objetos.js`): caja, tronco (cilindro, ochavo,
  cono), cúpula, barra, bulto, tejado (una, dos o cuatro aguas), cuerpo con tejado, arquería calada, vano y
  disco pintados, frontón triangular y de volutas, columna, cornisa, escalinata, verja, losa y zócalo; con
  ellas, el farol (de pie o de varios brazos), la estatua ecuestre, el puesto de mercado, el tramo de
  galería y la portada.
- **Una sola malla** (`lienzo.js` junta todo; un draw call): por vértice, posición, normal, `aColor`,
  `aHito` = (distancia del hito a la plaza, semilla, material, pie), `aVida` = (nace, muere), `aAncla` =
  (ancla x, z · apoyo x, z) y `aUv`.
- **Material propio** (`src/hitos/material.js`) con los uniforms de la ciudad, como los árboles: la misma
  ola, las mismas épocas (`vivoEn`), el relieve y tinta ⇄ color. El detalle lo pone el shader según el
  material del vértice: tejas, sillares, barrotes de reja (con descarte), los canteros en X y el damero de
  la plaza, la tierra del mercado, la lona, el reloj. En tinta: papel, con lo oscuro rayado a pluma.
- **Relieve**: el piso de cada objeto es el más alto entre el terreno en el **ancla** del hito y en su
  **apoyo** (el punto bajo el objeto). Así una terraza es plana donde el terreno baja (con su zócalo y sus
  escalinatas) y lo sigue donde sube. Los "pies" (vértices en y = 0) bajan hasta el terreno.
- **Las casas genéricas** que pisan la zona `suprime` de un hito no se borran: al cargar la ciudad se les
  quitan de la vida las épocas en que el hito está en pie (`src/hitos/suprimir.js`, prueba de solape de
  polígonos; función pura).
- `validarHitos` revisa ids únicos, que todo caiga dentro de la hoja, épocas válidas, tipos de parte
  conocidos y que cada hito traiga `fuente` y `verificar`.

**La Plaza Bolívar** (`plaza-bolivar`), según las imágenes de `fuentes/imagenes`:
| Época | Qué se ve | De dónde sale |
|---|---|---|
| 1578 | la plaza vacía | — |
| 1772, 1843 | **el mercado**: explanada de tierra, galerías de arcos de un piso alrededor con portadas de arco y frontón al medio de cada lado y en las esquinas, hileras de puestos con toldo de lona | grabado de 1852 |
| 1889 | **la plaza ajardinada**: piso liso y claro, canteros en X, estatua ecuestre de Bolívar (caballo encabritado) sobre pedestal alto de piedra oscura con gradas y bolardos, faroles de varios brazos en las entradas y de pie en los caminos, reja perimetral, terraza con escalinatas del lado bajo | fotos de 1874, ~1880 y ~1930 |
| 1911, 1936 | lo mismo, con el piso de mosaico en damero | foto de ~1900 |

**La Catedral** (`catedral`, desde 1772), en la esquina de La Torre, con la planta del recuadro del plano de
1936 y el alzado de la foto de 1866, el grabado de 1867 y las fotos de 1874 y 1910: la **fachada barroca mira
al oeste, a la plaza** (tres calles, dos cuerpos de columnas pareadas, frontón de volutas con pináculos y
cruz), con la **torre a su izquierda** (al norte): tres cuerpos blancos (vanos apilados · reloj y balconcillo ·
campanas), tambor ochavado y cupulín oscuro con una figura. Detrás, la nave larga de tejado alto con su
lucernario; al sur, el cuerpo bajo de muro casi ciego con portada de frontón y ventanas de balcón con
tejadillo. La torre mide unas tres veces el muro de la nave.

**Las iglesias del perfil** (`src/hitos/datos/iglesias.js`): una iglesia paramétrica (`src/hitos/iglesias.js`:
nave + fachada `clasica`, `neogotica` o `barroca` + torres con remate de `cupulin`, `aguja`, `chapitel` o
`cupula` + cúpula sobre tambor), ubicada por el rótulo del plano de 1936:
| Hito | Desde | Rasgos | Qué es incierto |
|---|---|---|---|
| San Francisco | 1772 | nave larga, fachada al norte, un campanario | lado del campanario; ya existía en 1578 |
| Altagracia | 1772 | nave, una torre con cúpula | orientación y fecha |
| La Pastora | 1772 | dos torres con cúpula hacia su plaza | fecha |
| Santa Capilla | 1889 | neogótica, torre central con aguja | fecha exacta |
| Santa Teresa | 1889 | dos fachadas y cúpula al centro | sin imagen de frente |
| Panteón Nacional | 1889 | neogótico de dos torres con aguja | la reforma de ~1930 (el plano de 1936 dibuja tres torres) |

La Candelaria no se ubicó con confianza en el plano: queda pendiente.

**Los edificios civiles** (`src/hitos/datos/civiles.js`, con `src/hitos/palacios.js`: palacio de crujías
alrededor de un patio con cubierta de `azotea`, `teja` o `mansarda`, pórtico de columnas, remate con escudo y
frente neogótico):
| Hito | Desde | Rasgos | Qué es incierto |
|---|---|---|---|
| Casa Amarilla | 1889 | palacio de esquina de dos pisos, balcones, cornisa y remate central con escudo y asta, frente al lado oeste de la plaza | el grabado de ~1875 no tiene fecha firme ni color |
| Capitolio | 1889 | cuatro alas alrededor del jardín, pabellones de esquina, pórticos al norte y al sur, cúpula dorada en el ala norte (donde el plano dibuja el óvalo) | sin imagen de referencia: alzado genérico |
| Universidad | 1889 | frente neogótico hacia el Capitolio: ventanas ojivales, contrafuertes con pináculo, crestería y gablete central con aguja | que la fachada de la foto de 1880 sea esta |
| Miraflores | 1911 | palacio de mansardas de pizarra con pabellones | planta simplificada; si ya estaba en 1889 |

Pendientes, por no ubicarlos con confianza en el plano de 1936 o por falta de referencia: Teatro Municipal
(el plano rotula el Teatro Nacional en Los Cipreses, que es otro), Hotel Majestic, el monumento de El
Calvario, Caño Amarillo y el Mercado Principal.

Lo que falta verificar va en `verificar` de cada definición (fechas, orientación de la estatua, galerías
con arcos a los dos lados…). Límite conocido: la plaza real es una explanada a nivel, hundida respecto de
la calle al norte; acá no se puede cavar la hoja, así que es plana solo en la mitad baja.

Capturas para comparar con las referencias: con el visor servido (`npx vite --port 5199 --strictPort` en otra
terminal, o la URL de uno que ya esté andando como primer argumento),
`ANGLE=gl node tests/e2e/capturas-hitos.mjs [url] [carpeta] [vistas-json]`.

## Fichas (`fichas.js` + `ficha.js`)

- Textos por lugar: `titulo`, `era` o `eras[etapa]`, cuerpo (HTML corto), `hoyEs` ("Hoy es…") y `fotos: [id…]`.
- Catálogo de fotos: `{id: {w, h, titulo, autor, fecha, licencia, fuente}}` → `fotos/{id}.webp` y `fotos/m/{id}.webp`. Todas de Wikimedia Commons, en dominio público, con link al archivo.
- Al abrir una ficha, la cámara vuela, el edificio se vela y se abre el panel. Esc, × o un click afuera la cierran; las flechas recorren las fotos.

## "Ver lo de hoy" (H)

- Estampa en **rojo** sobre el plano las calles, vías y costa actuales (OSM). De lejos, solo avenidas, vías y costa; de cerca, todas las calles con borde afilado; muy de cerca, solo el contorno de la calle, a dos trazos. La **tierra ganada al río** va rayada (patrón estable en pantalla; cada nivel dobla el anterior).
- Los nombres de calles van en un `<canvas>` 2D superpuesto, alineados con cada calle. La medición de texto se cachea, hay un máximo de ~90 etiquetas y una grilla anticolisión de 13 px, y solo se muestran con la cámara entre 1500 y 3600 m de distancia. *Caracas (implementado, `src/calles.js`):* entre 300 y 3600 m (con rampas en los bordes), porque los tramos de `calles.bin` son de hasta 200 m y de lejos casi ningún nombre entra en su tramo; italic serif de 14 px en rojo `#8f2a1a` con halo de papel, sin repetir el mismo nombre a menos de 280 px.
- Marcas rojas desde `hoy.json`.
- Leyenda con © OpenStreetMap (ODbL).

## Buscador (`buscar.js`)

- Campo de texto: "Buscá una dirección de hoy: Corrientes 1234".
- Consulta **USIG** (el normalizador de direcciones de CABA) y **Nominatim** (con `viewbox`, `bounded=1`, `countrycodes` y `accept-language=es`); normaliza tildes y abreviaturas ("Av.", "Pje.").
- Convierte lat/lon a píxel del plano (con la transformación de calce inversa) y responde en prosa: "En 1867: a dos cuadras al noreste de la Plaza de la Victoria. Según el plano, ya era ciudad, con las manzanas edificadas" / "eran las afueras: quintas y construcciones sueltas" / "era campo" / "era río". Si cae fuera del plano: "Queda fuera del plano de 1867: …".
- Errores amables: "No encontré «…». Probá con calle y altura, una esquina o el nombre de un lugar."

## Modos de recorrido (`modos.js`, `autos.js`)

Botones Caminar / Volar / Manejar (+ "Más rápido"). Se entra desde la vista actual (o desde la plaza, si la cámara está muy lejos). Esc vuelve al mapa con la cámara donde estaba. Un cartel muestra el modo ("A pie", "En avión", "En coche/En auto"), la altura o la velocidad ("300 m de altura", "40 km/h") y la calle más cercana.

- **A pie**: primera persona a la altura de los ojos, WASD/flechas, arrastrar para mirar, Shift para correr; choca con las casas usando las máscaras y la grilla de patios.
- **Volar**: avión low‑poly visible (con sombra); flechas/WASD giran, suben y bajan; Shift acelera; **Q/E cambian el año y la ciudad cambia abajo**.
- **Manejar**: coche **de la época** con física simple sobre las calles; tercera persona o cabina (V), bocina (B), sonido (M), otro coche (N); Q/E cambian el año y, con él, el coche. Flota de ejemplo: volanta y coche de plaza (1867, con relincho), voiturette (corneta), doble faetón (1909: "como casi todos los 2.287 automóviles de fines de 1909"), Ford T (klaxon) y Ford V8 (de 1932 en adelante). Cada coche tiene geometría procedural, una ficha corta y sonido **sintetizado con WebAudio** (osciladores sawtooth/square + filtros lowpass/bandpass), sin archivos de audio.
- Minimapa en canvas con `suelo/crece/despeje` en baja resolución.
- **Táctil**: joystick virtual en la mitad izquierda (radio de 52 px) + un segundo dedo para mirar; textos de ayuda propios de cada modo, que se ocultan a los 12 s.
- Tranvías y trenes animados por las vías según la época (*se ve en `trenes`*).

## Vitrina (`vitrina.js`)

El visor puede embeberse en un `<iframe>` y controlarse por `postMessage({vitrina: …})`: ir a un hito, elegir época, levantar, soltar. Lo usa `edificios.html` para el scrollytelling.
