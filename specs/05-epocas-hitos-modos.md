# 05 · Épocas, hitos y fichas, "lo de hoy", buscador, modos

## Línea de tiempo (`src/epocas.js`)

- Botonera de años: el primero es el plano base y los demás salen de `crece.json`. El `año` que se muestra puede no coincidir con el `plano` usado: 1910 usa el de 1909, y 1940 usa el de 1936 más las obras hechas hasta 1940.
- La primera vez que se elige un año se cargan `crece.pak`, `crece.webp` y `despeje.webp` (carga diferida) mientras se muestra "Cargando la ciudad de {año}…". Si falla: "No se pudo cargar. Tocá el año otra vez para reintentar."
- `uEpocaK` se anima de la etapa actual a la nueva; la transición es la misma ola que sale de la plaza.
- Pie del panel: "La ciudad hacia {año}", la fuente corta del plano y las `obras` ("Se abrió la Avenida de Mayo y el puerto le ganó tierra al río.").
- Botón ▶: "Ver cambiar la ciudad, de 1867 a {último}" recorre los años solo.
- Las marcas, las fichas y el coche de los modos dependen de la etapa (`desde`/`hasta`).

*Caracas (implementado, T25b): **el plano de cada época, aparte**.* El plano viejo no se pega sobre la hoja 3D (eso quedó detrás de
`?planos`): se mira en un visor propio. En el panel de la línea de tiempo, **«Ver el plano de {año}»** (o la tecla **P**) abre un
`<dialog>` modal (`src/visor-plano-panel.js`; la lógica pura, con tests, en `src/visor-plano.js`) con el plano de la época elegida en 2D:
- La imagen es la del plano calzado (`plano/<año>/chico.webp` y después el nivel mejor de `plano/epocas.json`; en equipos livianos,
  hasta 4096 px); en 1936, la hoja base. Un año sin plano no muestra el de otro. El pie lo dice: el plano viejo está estirado para
  coincidir con la hoja, y el original está en la fuente.
- Se arrastra, se acerca con la rueda, con dos dedos, con doble click o con + y − (hasta 8×), se mueve con las flechas y vuelve entero con 0.
- **Crédito**: título, autor, año, fuente (con enlace si la ficha trae la dirección) y licencia, de `datos/crece.json`, que los copia de
  `fuentes/mapas/<plano>/ficha.json`. Lo que falta se dice («autor sin identificar»), no se inventa.
- Escape, × o un click en el telón lo cierran y el foco vuelve al botón. Mientras está abierto, las teclas de la ciudad (C, H, M, Espacio) no actúan.
- `window.lab.visorPlano` expone `abrir()`, `cerrar()`, `abierto` y `estado`.

## Marcas (`marcas.js`)

Formato compacto, una fila por marca:
```js
[nombre, x, y, radio, nivel, nota, {desde, hasta, ficha, radio}?]
// ['Cabildo', 10294, 9378, 32, 2, 'Con sus once arcos y la torre vieja, de 1765.', {hasta:1}]
```
- `x,y` en píxeles del plano base; `radio` en m (zona del velo); `nivel` de 1 a 3; `desde/hasta` = índices de etapa; `ficha` = id de la ficha si difiere del nombre.
- Un mismo lugar puede tener varias filas, una por época: el Cabildo tiene 4 (1867, la reforma de Benoit, la demolición de los arcos en 1889 y la restauración de 1940).
- Proyección a pantalla en cada cuadro (`will-change: transform`), oclusión simple y *declutter* por nivel y distancia; en táctil, "tocar cerca" con un radio de 9 px.

*Caracas (implementado, T42):* tres módulos. `src/marcas.js` es la lógica pura (con tests); `src/marcas-capa.js`,
la capa de DOM (`#marcas`: un `<button>` por lugar, con cartel, hilo y punto, como en la referencia);
`src/marcas-datos.js`, los datos; `src/marcas.css`, los estilos.

Una fila por lugar, como objeto (los píxeles son los del mosaico de 1936; las épocas, los índices de
`src/epocas.js`: 1 = 1772 … 5 = 1936):
```js
{ id: 'capitolio', hito: 'capitolio',            // o x, y: la posición sale del hito modelado o va escrita
  nace: 1, muere: 0,                             // como las casas: se ve si nace ≤ época < muere (0 = sigue)
  nombres: [[1, 'Convento de las Concepciones'], [3, 'Capitolio', 'nota corta']],   // o nombre: '…' (y nota)
  nivel: 2, alto: 14, radio: 30,                 // nivel 1–3; alto del edificio en m (el punto va arriba)
  fuente: 'plano de Mestre de 1889 (1 «Capitolio») …', dudas: 'lo que falta cotejar' }
```
- **El nombre cambia con la época** dentro de la misma fila (`nombres`, ordenados por `desde`): Plaza Mayor →
  Plaza Bolívar, Convento de San Francisco → Universidad, Plaza de San Pablo → Teatro Municipal. Cuando el
  lugar pasa a ser otra cosa con años de por medio, van dos filas (Seminario → Concejo Municipal → Palacio de Justicia).
- **Fuentes**: cada fila dice de qué plano sale su nombre (el rótulo de 1936, la leyenda numerada del plano de
  1889, un rótulo del de 1911). Lo que es solo conocimiento general lleva `dudas` y aparece en la época cuyo
  plano ya lo muestra, no antes. `validarMarcas` (un test la corre sobre los datos) exige id único, fuente,
  nivel, vida y nombres coherentes y posición dentro de la hoja.
- **Con la ola**: la época que rige en cada marca es la de su lugar (`epocaAqui` con los mismos uniforms que el
  shader), así que las marcas cambian cuando el frente de la ola pasa por ellas; la opacidad es `vivo()` y el
  nombre cambia a mitad de camino. La que llega a medio aparecer se anuncia con la onda y el filete (`.nueva`).
- **Niveles**: el 1 se ve siempre; el 2, con la cámara a menos de 4200 m; el 3, a menos de 1500 m, con 8 % de
  histéresis en cada umbral.
- **Despeje** (`despejar`): voraz, por nivel; a igual nivel entran primero las que ya estaban en el cuadro
  anterior (nada parpadea al mover la cámara) y después el orden de los datos. Dos marcas chocan si sus
  carteles se tocan (5 px de aire) o si un cartel tapa el punto de otra. Los carteles se miden en el DOM, una
  vez por nombre.
- **Altura**: el punto va en el suelo tal como se dibuja (`sueloEn`) más el alto del edificio por lo que la
  ola lo levantó. **Con la ciudad acostada las marcas se siguen viendo** (como en la referencia), apoyadas en el papel.
- **Velo**: con el mouse o el foco sobre un cartel, ese se aclara y los demás bajan a un tercio de opacidad
  (`#marcas.velo`). El velo sobre el edificio en el shader queda pendiente.
- **Click / Enter**: la cámara vuela al lugar (`cam.volar`; con `prefers-reduced-motion`, `cam.jump`), el cartel
  se abre con su nota y se avisa a quien escuche: `lab.marcas.alAbrirMarca = (marca) => …` o el evento
  `abrirmarca` en `window` (`detail` = la marca). Ahí se engancha la ficha (T43).
- **Convivencia con los nombres de calles**: las cajas de los carteles se reservan en la grilla de
  `src/calles.js` antes de ubicar las calles (`ocupados`): una calle nunca se escribe sobre una marca.
- **M** o el botón «Nombres» las muestran y ocultan; `?sinmarcas` arranca sin ellas. `window.lab.marcas`
  expone `visibles`, `nivel`, `sobre`, `abierta`, `abrir(id)` y `mostrar(bool)`.
- Capturas de control: `ANGLE=gl node tests/e2e/capturas-marcas.mjs [url] [carpeta]`.

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

*Caracas (implementado, T43):* cuatro módulos y un paso del pipeline. `src/fichas.js` es la lógica pura (con
tests); `src/ficha-panel.js`, el panel y el visor de fotos (DOM); `src/fichas-datos.js`, los textos;
`src/fichas.css`, los estilos; `tools/fotos.mjs` (+ `tools/fotos-lib.mjs`) arma las fotos.

- **Una ficha por marca**, todas: la clave es el id de la marca. Se abre con el evento `abrirmarca` (el click o
  Enter en un cartel) y se cierra con Escape, la × o tocando de nuevo el cartel abierto; al cerrarse cierra
  también el cartel y devuelve el foco a la marca.
- **Qué muestra** (`contenidoDeFicha`): el nombre que rige en la época elegida; «Hacia 1889» (o «Todavía no
  figura en 1772: aparece en 1936» / «Ya no figura en 1936: estuvo hasta 1911»); la lista de los nombres que
  tuvo, con los años de la línea de tiempo en que rigió cada uno (`1772–1843 Plaza Mayor · desde 1889 Plaza
  Bolívar`); los párrafos, cada uno con el año desde el que vale: primero y a plena tinta el que rige, después
  los demás, en orden y atenuados; «Hoy» y «Por verificar»; las fotos; y la fuente del nombre (el campo
  `fuente` de la marca).
- **Textos** (`src/fichas-datos.js`):
  ```js
  'plaza-bolivar': { textos: [[1, 'La plaza mayor era el mercado…'], [3, 'Sin el mercado, la plaza se hizo jardín…']],
                     hoy: 'la Plaza Bolívar, con la misma estatua.', dudas: 'El nombre es anterior a la estatua…' }
  ```
  `textos` va en orden por época de inicio (1 = 1772 … 5 = 1936) y dentro de la vida de la marca
  (`validarFichas`, que un test corre sobre los datos). Cada frase sale de los planos del catálogo (la leyenda
  de 1889, los rótulos de 1911 y 1936), de las imágenes de `fuentes/imagenes` o de las notas de marcas e hitos.
  **Lo que es conocimiento general sin cotejar no va en el texto: va en `dudas`**, que la ficha muestra como
  «Por verificar». Un lugar sin entrada muestra las notas de su marca.
- **Con la ola**: la época de la ficha es la que rige en el lugar (`epocaAqui`, redondeada: `epocaDeFicha`), así
  que la ficha cambia en el mismo cuadro en que cambia el cartel de su marca.
- **Fotos**: solo las de `datos/fotos.json` (abajo). Las «de esta época» (las que traen la época elegida en
  `epocas`) van primero y marcadas; si ninguna lo es, la ficha lo avisa («No hay imagen de esta época: las que
  siguen son de otros años»). Sin fotos: «Sin imagen de época confiable de este lugar.» Cada foto lleva título,
  autor, fecha, licencia y enlace a la fuente, en el panel y en el visor; `validarFotos` descarta en el visor
  cualquier fila del manifiesto a la que le falte uno de esos datos. Miniaturas con `loading="lazy"`, `width` y
  `height`.
- **Visor de fotos**: diálogo modal a pantalla completa con la imagen grande, «2 de 5», el pie completo
  (título, autor y fecha, licencia, institución, «Ver en Wikimedia Commons ↗»), ‹ ›, flechas del teclado,
  deslizar con el dedo, Escape o un toque afuera; el foco queda atrapado adentro y al cerrar vuelve a la miniatura.
- **Accesibilidad**: el panel es un `role="dialog"` **no modal** (`aria-labelledby` = el título, que recibe el
  foco al abrir; el encabezado es `aria-live`), al costado en escritorio (debajo de la línea de tiempo; arriba
  del todo desde 1480 px de ancho) y **hoja desde abajo** hasta 640 px (ahí oculta los botones y el pie de la
  línea de tiempo mientras está abierta). Con `prefers-reduced-motion` no hay transiciones.
- `window.lab.fichas` expone `abierta`, `epoca`, `contenido`, `fotos`, `visor`, `abrir(id)`, `cerrar()`,
  `verFoto(i)`, `pasarFoto(±1)` y `cerrarFoto()`.
- Capturas de control: `ANGLE=gl node tests/e2e/capturas-fichas.mjs [url] [carpeta]`.

**Las fotos y sus derechos** (`tools/fotos.mjs`, `node tools/fotos.mjs [--descargar] [--solo-informe]`): lee
`fuentes/imagenes/*/ficha.json` y publica **solo** las imágenes cuya ficha:
1. establece el dominio público (`dominio_publico: true`) o una licencia libre (`licencia` empieza con `CC0`,
   `CC BY` o `CC BY-SA`), y no dice «derechos reservados» ni `publicar: false`;
2. trae la página de la fuente (`url_fuente`), el autor (`autor`; vale «Autor desconocido» cuando así lo
   declara la fuente, no vale «A verificar…») y la fecha (`fecha`, `año` o `año_aproximado`);
3. nombra al menos una marca en `marcas` (ids de `src/marcas-datos.js`; uno inexistente es un error) y tiene
   su `original.*`.

Lo dudoso, lo que tiene derechos reservados y las referencias internas no salen nunca de `fuentes/imagenes/`:
el paso borra `public/fotos/` y lo rehace, así que una imagen que deja de ser publicable deja de estar servida.
Nada se completa ni se supone: si la ficha no lo dice, la foto no entra, y el informe del paso dice por qué.
Con `--descargar` baja de `upload.wikimedia.org` los originales publicables que falten (`url_descarga`); los
originales son datos no confiables y solo se decodifican como imagen (sharp). La relación foto → marca va en
la ficha de la imagen (`marcas`), junto a sus créditos, y no en el código del sitio: quien verifica los
derechos de una imagen decide ahí mismo dónde se muestra. Campos nuevos, opcionales, de `ficha.json`:
`marcas`, `pie` (el título en español que se muestra; si falta, `titulo`), `fecha` (la fecha como texto, cuando
no es un año), `verificacion_dp` (por qué es de dominio público, con las plantillas de Commons) y `publicar`.

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

### Caracas: de esquina a esquina (implementado, `src/buscador.js` + `src/buscador/`)

En la Caracas vieja las direcciones no llevan calle y número sino **esquinas**: "De La Torre a Veroes" es la
cuadra entre esas dos esquinas. El buscador entiende eso primero, con el diccionario leído del plano de 1936
(`tools/geo/esquinas/1936-esquinas.json`, 325 esquinas con nombre; va en un trozo aparte del bundle), y solo lo
que no reconoce lo consulta como dirección de hoy.

**Gramática** (sin distinguir mayúsculas, tildes, eñes ni signos; el artículo inicial es opcional: "Torre" =
"La Torre"; se abren "esq.", "Sta.", "Sto.", "Dr.", "Pte.", "Av."):

| Se escribe | Es | Ejemplos |
|---|---|---|
| `[de] X a Y` · `entre X y Y` · `X con Y` · `X - Y` | la **cuadra** entre dos esquinas | "De La Torre a Veroes", "torre a veroes", "entre Sociedad y Traposos", "Gradillas con Sociedad" |
| `… n.º 12` · `nro 12` · `#12` · `, 12` | una casa de esa cuadra (el número se conserva; el plano no dice la puerta) | "Sociedad a Traposos n.º 12" |
| `[esquina de] X` · `esq. X` · `X` | una **esquina** | "Esquina de Gradillas", "esq. El Conde", "Pele el Ojo" |
| el nombre o un alias de un hito | un **lugar** | "Catedral", "Capitolio", "Plaza Bolívar" |
| cualquier otra cosa | una **dirección de hoy** (Nominatim) | "Avenida Urdaneta", "Parque Carabobo" |

- **Erratas**: se perdona una letra cambiada, de más, de menos o cruzada en nombres de 4 a 7 letras y dos en los
  más largos ("Beroes", "Gradiyas"); en los de menos de 4, ninguna. Si la errata puede ser dos esquinas
  ("Tore": ¿Torre o Toro?) no se adivina, salvo que con una de ellas salga una cuadra de verdad ("de la Tore a
  Veroes").
- **Nombres repetidos** (18 nombres están en dos o tres esquinas): para una cuadra se elige el par que sí es
  vecino; para una esquina sola, la más cercana a la Plaza Bolívar, y la respuesta avisa que hay otras.
- **¿Son los extremos de una cuadra?** Dos esquinas son vecinas si están a entre 15 y 250 m y no hay una
  tercera más cerca de las dos que el 90 % de lo que las separa (`ADYACENCIA`). Eso descarta la diagonal de la
  manzana y la esquina a dos cuadras sin suponer hacia dónde corren las calles (fuera del centro el damero
  gira). Salen 576 cuadras; si las dos esquinas no son vecinas se dice ("no son esquinas vecinas en el plano de
  1936: las separan unos 240 m") y se marca el punto medio.
- **Sugerencias** mientras se escribe (sin red): primero los nombres que empiezan así, después los que tienen
  una palabra que empieza así y al final los parecidos; entre iguales, los más cercanos a la plaza. Con una
  esquina completa ("La Torre", "la torre a ") se ofrecen las cuadras que salen de ella. Combobox de ARIA: ↑ ↓,
  Enter, Escape; `/` enfoca la caja.
- **Direcciones de hoy**: solo al mandar a buscar (Enter o el botón), nunca por tecla; a lo sumo un pedido por
  segundo, con las respuestas guardadas; `format=jsonv2`, `viewbox` del valle con `bounded=1`,
  `countrycodes=ve`, `accept-language=es`, `limit=5`. Se manda la consulta y nada más. lat/lon → píxel con
  `src/buscador/geo.js` (lo mínimo de `tools/geo/geo1936.py`, probado contra sus resultados). La respuesta es un
  dato no confiable: se validan los números y los textos se escriben con `textContent`. Se muestra con
  "© OpenStreetMap", en rojo (el color de "lo de hoy").
- **Respuesta en prosa** (`src/buscador/prosa.js`), atada a la época elegida y sin inventar: dónde queda
  respecto del hito a menos de 150 m ("la cuadra al norte de la Catedral"; si el hito todavía no existe en esa
  época, "de donde esta reconstrucción pone después el Capitolio": `nace` es desde cuándo está modelado, no cuándo se construyó) o de la Plaza Bolívar ("a 5 cuadras al noreste"); hacia
  dónde va y cuánto mide; qué cuadras salen de una esquina; si la lectura del nombre en el plano es dudosa
  (`verificado: false`); y qué había: "En 1772 ya estaba edificada" (al menos el 20 % de un redondel de 32 m
  está edificado en `crece.png` R), "ya era parte de la ciudad" o "todavía era campo: la ciudad llega aquí en
  el plano de 1889" (`crece.png` G), con "Es ciudad desde el plano de …" cuando viene de antes. Una dirección
  de hoy que cae sobre una cuadra o junto a una esquina del diccionario lo dice ("Hoy queda en la cuadra de La
  Torre a Veroes"). Fuera de la hoja: "Queda fuera del plano de 1936: a 12,1 km al este de la Plaza Bolívar".
  Sin `crece.json` (la ciudad de demostración) la respuesta no habla de años.
- **En pantalla**: la cámara vuela al lugar (salta con `?capture` o `prefers-reduced-motion`) y queda un
  alfiler que sigue al terreno (punto, hilo y cartel; en una cuadra, también el tramo entre las dos esquinas).
  Lo quitan Escape, la × o una búsqueda nueva. `window.lab.buscador` = `{ buscar(texto), sugerir(texto),
  limpiar(), resultado, indice, listo }`. Capturas de control: `node tests/e2e/capturas-buscador.mjs [url]
  [carpeta]` (Nominatim simulado).
- Límites: el número de casa no se ubica dentro de la cuadra; las esquinas son las de 1936 (un nombre que
  cambió antes o después no está); la vecindad sale de la geometría del diccionario, no de las calles (una
  esquina mal ubicada o sin nombre en el medio puede dar una "cuadra" larga o en diagonal); no hay todavía
  nombres de calles de hoy en las sugerencias.

## Modos de recorrido (`modos.js`, `autos.js`)

Botones Caminar / Volar / Manejar (+ "Más rápido"). Se entra desde la vista actual (o desde la plaza, si la cámara está muy lejos). Esc vuelve al mapa con la cámara donde estaba. Un cartel muestra el modo ("A pie", "En avión", "En coche/En auto"), la altura o la velocidad ("300 m de altura", "40 km/h") y la calle más cercana.

- **A pie**: primera persona a la altura de los ojos, WASD/flechas, arrastrar para mirar, Shift para correr; choca con las casas usando las máscaras y la grilla de patios.
  *Caracas (T60, `src/a-pie.js` + `src/a-pie-modo.js`):*
  - **Choques**: con las huellas de las casas en pie en la época elegida, sacadas de `ciudad.pak` (con la vida que dejan los hitos), en una rejilla de 20 m. Las casas de patio se chocan enteras.
  - **Caminante**: es un círculo de 0,4 m que se desliza por las paredes; ojos a 1,6 m sobre el relieve; 2,5 m/s al paso y 7 m/s corriendo.
  - **Entrada**: donde mira la vista o, a más de 1500 m, en la plaza, buscando el lugar libre más cercano.
  - **Táctil**: joystick con el dedo de la mitad izquierda y mirar con el de la derecha.
  - **Mientras dura**: la cámara del mapa queda en pausa (`cam.pausar`) y conserva su vista; las flechas y Espacio son del modo.
  - **Cartel** «A pie»: va en el lugar del buscador y su ayuda se calla a los 12 s.
  - **Límites**: los hitos (iglesias, Miraflores…) todavía no chocan, y no hay «Más rápido» ni la calle más cercana en el cartel.
- **Volar**: avión low‑poly visible (con sombra); flechas/WASD giran, suben y bajan; Shift acelera; **Q/E cambian el año y la ciudad cambia abajo**.
  *Caracas (T61, `src/volar.js` + `src/volar-modo.js`):*
  - **Avioneta**: de papel con timón y hélice en tinta, de 12 m de envergadura, con sombra.
  - **Vuelo**: 60 m/s de crucero y 160 con Mayús. Despega a 300 m sobre donde mira la vista (sobre la plaza, si está a más de 3 km), nunca baja de 40 m sobre el suelo ni sube de 2500, y no sale de la hoja. Se inclina al girar.
  - **Cámara**: 70 m detrás y 22 m arriba.
  - **Q y E**: cambian el año con la línea de tiempo, y la ciudad cambia abajo con su ola.
  - **Táctil**: un dedo es un joystick (gira, y sube o baja).
  - **Cartel**: «En avión · N m sobre el suelo», de a 10 m.
  - **Mientras dura**: la cámara del mapa queda en pausa; Esc aterriza en la vista de antes.
- **Manejar**: coche **de la época** con física simple sobre las calles; tercera persona o cabina (V), bocina (B), sonido (M), otro coche (N); Q/E cambian el año y, con él, el coche. Flota de ejemplo: volanta y coche de plaza (1867, con relincho), voiturette (corneta), doble faetón (1909: "como casi todos los 2.287 automóviles de fines de 1909"), Ford T (klaxon) y Ford V8 (de 1932 en adelante). Cada coche tiene geometría procedural, una ficha corta y sonido **sintetizado con WebAudio** (osciladores sawtooth/square + filtros lowpass/bandpass), sin archivos de audio.
  *Caracas (T62, `src/manejar.js` + `src/manejar-modo.js`):*
  - **Flota**, según `specs/06` y las fotos de `fuentes/imagenes/`: carreta de bueyes (1772), coche de caballos (desde 1843), Ford T (1911) y Ford V8 (1936). Los nombres son genéricos, sin afirmar el modelo exacto que circulaba. El tranvía no está: va por sus rieles, y no los tenemos.
  - **Geometría**: procedural, con sombra; los de tiro llevan su animal.
  - **Física**: acelera y frena, va marcha atrás más despacio, gira en proporción a lo que avanza y se detiene contra las casas (las mismas huellas que a pie).
  - **Vistas**: de afuera, 12 m detrás, o desde el pescante (V).
  - **Sonido** (WebAudio, sin archivos): motor sawtooth con lowpass que sube con la velocidad; cascos de ruido filtrado al ritmo del paso; bocina de cuatro tonos del Ford T (square), de dos del V8 (sawtooth) o un relincho. M prende o apaga el sonido.
  - **Otras teclas**: N cambia a otro vehículo de la época; Q y E cambian el año y, con él, el vehículo.
  - **Cartel**: «Ford T · 25 km/h».
- Minimapa en canvas con `suelo/crece/despeje` en baja resolución.
- **Táctil**: joystick virtual en la mitad izquierda (radio de 52 px) + un segundo dedo para mirar; textos de ayuda propios de cada modo, que se ocultan a los 12 s.
- Tranvías y trenes animados por las vías según la época (*se ve en `trenes`*).

## Vitrina (`vitrina.js`)

El visor puede embeberse en un `<iframe>` y controlarse por `postMessage({vitrina: …})`: ir a un hito, elegir época, levantar, soltar. Lo usa `edificios.html` para el scrollytelling.

*Caracas (T71, `src/vitrina.js`):*
- **Activación**: con `?vitrina` el visor oculta su interfaz y avisa al padre `{ vitrina: 'lista' }`.
- **Órdenes**: acepta solo mensajes del mismo origen, con un id válido: `{ ir: 'id' }`, `{ epoca: n }`, `{ levantar: true }` y `{ girar: bool }`.
- **Movimiento reducido**: con `prefers-reduced-motion`, salta al edificio sin volar ni girar.
