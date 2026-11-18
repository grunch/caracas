# 02 · Arquitectura, carga y formatos

## Stack

| Pieza | Elección | Nota |
|---|---|---|
| Build | **Vite** multipágina (`index.html`, `edificios.html`), `base: './'` (rutas relativas) | Chunks con hash; `three.core` va separado |
| 3D | **three.js** (versión reciente, con el split `three.core`) | Sin OrbitControls ni EffectComposer: cámara y controles propios |
| UI | DOM + CSS vanilla | CSS crítico inline en `index.html`; cada módulo inyecta su CSS desde JS con un `<style>` propio |
| Lenguaje | JS (ES modules), `await` de nivel superior | Identificadores y comentarios en español |
| Datos | Scripts Node `tools/*.mjs` (offline) | Salida a `public/datos/` y `public/plano/` |
| Hosting | Estático, Cloudflare (Pages, *inferido*) | `cache-control: public, max-age=0, must-revalidate` + `?v=<hash>` en los datos |

## Mapa de módulos (nombres reales vistos en comentarios y chunks)

```
index.html               CSS crítico, precarga inline (window.__pre), DOM de paneles
src/main.js  (index-*.js) arranque, renderer, escena, cámara, bucle bajo demanda, window.lab
src/material.js (*)      material compartido: uniforms U + make() con onBeforeCompile
src/plano.js (*)         hoja del plano: LOD de texturas + teselas finas
src/ciudad.js            manzanas, casas (estilos), techos, muros → geometría
src/patios.js            árboles y aljibes de patios (solo en color) ← datos/patios.pak
src/relieve.js           terreno (barranca, lomas) ← datos/relieve.bin
src/hitos.js             edificios con nombre, modelados a mano (plantas, partes, tono)
src/epocas.js            línea de tiempo ← datos/crece.pak + plano/crece.webp + despeje.webp
src/calles.js (*)        nombres de calles de hoy en canvas 2D ← calles.bin/json
marcas.js   (chunk)      lista de marcas por época: [nombre, x, y, radio, nivel, nota, {desde,hasta,ficha,radio}]
fichas.js   (chunk)      textos de fichas + catálogo de fotos (w,h,título,autor,fecha,licencia,fuente)
ficha.js    (lazy)       panel de ficha y visor de fotos
buscar.js   (lazy)       buscador de direcciones (USIG + Nominatim)
modos.js    (lazy)       caminar / volar / manejar (+ joystick táctil)
autos.js    (lazy)       coches por época, sonido sintetizado con WebAudio, minimapa
vitrina.js  (lazy)       modo vitrina/embebido controlado por postMessage (para edificios.html)
edificios.js             página scrollytelling
tools/crece.mjs          genera lo de las épocas (y otros tools/* para ciudad, patios, relieve, calles)
```
(*) nombre inferido.

## Arranque (orden)

1. El script inline dispara los `fetch` de `laminas.json`, `ciudad.json`, `primero.webp` y `ciudad.pak` (con `?v=hash`).
2. El bundle lee los query params, crea la intro (salvo con `sinintro|limpio|lugar|capture`) y arranca en paralelo los imports dinámicos de `ficha`, `buscar` y `modos`.
3. `WebGLRenderer({antialias:false, powerPreference:'high-performance'})`, `pixelRatio = min(dpr, 2)`, `shadowMap` PCF, `toneMapping = None`. Si se restaura el contexto WebGL, hace `location.reload()`.
4. Decide el **nivel liviano**: `?liviano`, o bien (sin `?pesado`) `maxTextureSize < 8192`, **o** el lado corto de la pantalla < 600px, **o** `navigator.deviceMemory < 4`.
5. Pone `primero.webp` (1024 px) como textura del plano: primer cuadro inmediato.
6. Sube la resolución: `chico.webp` (2048) → `medio-4k.webp` (4096) o `medio.webp` (8192, ~9 MB) según la GPU.
7. De cerca carga **teselas finas** `plano/f/{i}-{j}.webp` de 3072 px (grilla `cols×rows` de `laminas.json`). Mantiene **4** cargadas (las que rodean el centro de la vista) y descarta por LRU.
8. Construye la ciudad desde `ciudad.pak` + `relieve.bin`; al terminar, agrega `listo` al `body` y lanza la ola.
9. Carga diferida: las épocas al tocar un año, los patios al prender el color, "hoy" al tocar H, las calles al acercarse con "hoy" activo.
10. `window.lab = {renderer, scene, camera, cam, epocas, ciudad, crece, patios, hitos, …, ready}`: gancho de depuración, también útil para tests y capturas automáticas.

## Render bajo demanda

Un contador `pedirCuadro(n)` asegura al menos n cuadros pendientes. Cualquier `pointerdown/up`, `click`, tecla, `wheel`, `focus` o `visibilitychange` pide 3 cuadros. Las animaciones (ola, cámara en vuelo, modos) siguen pidiendo cuadros mientras duran. Si no hay nada pendiente, **no se renderiza**, así que la batería y el ventilador quedan tranquilos.

## Sistema de coordenadas

- **Unidad del dato**: el píxel del escaneo base (`plano.ancho × plano.alto`, p. ej. 18919×13272).
- `metro`: metros por píxel (p. ej. 0.675).
- `plaza`: el píxel que hace de origen del mundo (la plaza fundacional).
- Mundo three.js: `x = (px − plaza.x)·metro`, `z = (py − plaza.y)·metro`, `y` = altura en metros. La hoja es un `PlaneGeometry` de `ancho·metro × alto·metro`, subdividido en 384×269 para poder hincharse con el relieve.
- `marco` = rectángulo de la guarda del plano (fuera de ahí no hay color, sigue el papel); `interior` = área útil.

## Formatos de datos

### `plano/laminas.json`
```json
{"ancho":18919,"alto":13272,"tesela":3072,"cols":7,"rows":5}
```

### `datos/ciudad.json` (metadatos)
```json
{"plano":{"ancho":18919,"alto":13272,"metro":0.675,"plaza":[10335,9485],
          "marco":[x0,y0,x1,y1],"interior":[x0,y0,x1,y1]},
 "manzanas":3633,"techos":52521,"muros":145567,"arboles":35658,"lotes":17143,
 "iglesias":[{"x":…,"y":…,"ux":…,"uy":…,"largo":106.5,"ancho":22.5,"frente":±1}]}
```
`ux,uy` = eje de la nave (vector unitario); `frente` = hacia qué punta mira la fachada.

### `.pak` (contenedor binario propio)
```
gzip(
  u32 LE  n                       // largo de la cabecera
  n bytes UTF-8 JSON {"partes":[{"nombre":"manzanas","bytes":145320,"registro":40}, …]}
  por cada parte: `bytes` bytes, con BYTE SHUFFLE por registro
)
```
- **Byte shuffle**: dentro de cada parte van primero los bytes 0 de todos los registros, después todos los bytes 1, y así (como Blosc/HDF5). Para decodificar: `out[k*registro + b] = in[b*(bytes/registro) + k]`. Mejora mucho la compresión gzip de floats.
- Se descomprime en el navegador con `DecompressionStream('gzip')`; si no existe, se cae a archivos sueltos sin comprimir.
- Tipo de cada parte (fijo en el cliente):

| parte | tipo | registro (bytes) | contenido *(inferido)* |
|---|---|---|---|
| `manzanas` | Float32 | 40 (10 floats) | polígonos/atributos de manzana |
| `techos` | Uint16 | 16 (8 u16) | una casa/techo: posición en píxeles, medidas, pisos, estilo, semilla |
| `muros` | Uint16 | 16 | tramo de fachada o medianera |
| `arboles` | Float32 | 12 (x, y, r) | árboles del plano |
| `mueT`, `mueM` (solo `crece.pak`) | Uint32 | 4 | "mudanzas": en qué etapa nace y muere cada techo/muro (`nace + 8·muere`) |

`crece.pak` (épocas) trae `manzanas, techos, muros, mueT, mueM`. `patios.pak`: `u32 n` + 2 arrays u16 en disposición *planar* (primero el byte bajo de todos, después el alto) → celdas de una grilla de 8 m con máscara de bits (árbol, aljibe…).

**Caracas: `datos/ciudad.pak`** (lo escribe `tools/empacar-ciudad.mjs` desde el JSON del vectorizador):

| parte | tipo | registro (bytes) | contenido |
|---|---|---|---|
| `vertices` | Float32 | 8 (px, py) | vértices de las huellas, en píxeles del mosaico de 1936 |
| `techos` | Uint32 | 16 (4 u32) | `[primer vértice, cuántos, empacarTecho({pisos, estilo}), semilla]` (`src/ciudad.js`) |
| `vida` *(opcional)* | Uint32 | 4 | una por techo, en el mismo orden: `nace + 8·muere` |

`vida` sale de `tools/geo/epocas.py` (`"vida": [[nace, muere], …]` en el JSON). Épocas: 0 = 1578 (Pimentel), 1 = 1772 (*Exato mapa*), 2 = 1843 (Jesurún), 3 = 1889 (Mestre), 4 = 1911 (Razetti), 5 = 1936 (DCN). `nace` = primera época en que el techo existe; `muere` = primera época en que ya no está, 0 = no muere. Un techo se ve en la época `e` si `nace ≤ e` y (`muere = 0` o `e < muere`). Los techos de 1936 tienen `muere = 0`; al final van las casas de 1578 que no llegan a 1936, con `nace = 0`. Si el JSON no trae `vida`, el `.pak` no lleva esa parte. El lector (`src/pak.js`) rechaza las partes sin tipo, así que el visor tiene que declarar `vida: Uint32Array` antes de cargar un `.pak` que la traiga.

### `datos/arboles.bin` *(Caracas, implementado)*
Los árboles 3D (`src/arboles.js`), sin cabecera: registros de **4 × Uint16 little‑endian (8 bytes)**, n = `byteLength / 8`. Archivo suelto y no una parte de `ciudad.pak`: llega después de la ciudad y, si falta, el visor sigue sin árboles.

| u16 | campo | codificación |
|---|---|---|
| 0 | `x` | centro de la copa en **píxeles del mosaico de 1936**, redondeado (0 … 18599; 1 px = 0,5 m) |
| 1 | `y` | ídem (0 … 14799, crece hacia el sur) |
| 2 | `radio` | radio de la copa en **decímetros** |
| 3 | `vida` | `nace + 8·muere + 64·silvestre`: `nace` y `muere` son épocas (0 = 1578 … 5 = 1936), como la `vida` de `ciudad.pak` (`muere` = primera época en que ya no está; 0 = no muere); `silvestre` = 1 en los árboles del monte |

Lo escribe `tools/arboles.mjs` (paso `arboles` de `npm run datos`) desde `arboles.json` (los símbolos de árbol que detecta `segmentar_arboles.py`) más `jardines.json` (`tools/geo/jardines.py`: los canteros de plazas y patios, que el plano pinta como manchas verdes sin símbolo, con un árbol cada ~13 m). La semilla de cada árbol (forma, giro, tono) sale de `x`, `y` en el visor.

`nace`: un árbol del plano fuera de lo edificado (quebradas, haciendas, cerros: `crece.png` dice "nunca") existió siempre (0); en la ciudad, nace con su celda de `crece.png`. Un árbol de jardín nace con lo último que se edificó a 24 m o menos (el patio aparece con su casa). Y su tronco (el centro de la copa) nunca queda dentro de una casa en pie; la copa sí puede asomar sobre el techo del vecino, como un árbol de patio o de calle: si su copa (medio radio de margen) pisa un techo de `ciudad.pak` que después desaparece (`muere > 0`, las casas de 1578), espera a que muera; si el centro de la copa cae bajo un techo que no muere (`muere = 0`, nazca cuando nazca), el árbol se descarta (19 de 6.361). Sin `crece.png` ni `ciudad.pak`, todos nacen en 0 y no se descarta ninguno.

Hasta Guzmán Blanco las plazas eran de tierra (la Plaza Mayor fue mercado hasta 1874) y las calles no tenían árboles: un árbol del plano que está en lo urbanizado antes de 1889 (`crece.png` G < 3) y en una plaza o una calle (desde su centro, en 8 rumbos, lo primero de ciudad que se encuentra en la segmentación de 1936 es calle en 6 o más) no nace antes de la época 3 (1889). Los de los patios no cambian.

**Árboles silvestres** (`silvestre = 1`, `tools/silvestres-lib.mjs`): el monte del valle antes de la ciudad. Nacen en 0 y mueren cuando su lugar se urbaniza (`muere` = la etapa de `crece.png` G); fuera de la ciudad de 1936 no mueren (`muere = 0`), salvo donde el plano de 1936 dibuja un sembradío, un camino o una casa suelta (clases cultivo, calle, patio, edificado: mueren en 5). No hay en lo ya urbanizado en 1578, en el agua ni fuera del marco. Se plantan con una grilla de 19,5 m con un candidato sacudido por celda (azar reproducible, semilla 1578, propio de cada celda), que queda con probabilidad `monte × ralo`: `monte` es `crece.png` B y `ralo` baja de 1 a 0,2 entre 2 y 3,8 km de la plaza (de cerca no se ve el valle entero y de lejos un árbol es menos que un píxel); no se plantan a menos de 6 m de un árbol del plano. Radio de 1,6 a 6,5 m, mayor en el monte cerrado. El visor solo los muestra en color (en tinta el plano queda como está). Hoy: 6.342 del plano + 25.934 silvestres = 32.276 (258 KB). Un visor anterior a este formato leería `vida` como `nace`: los silvestres le quedarían sin nacer.

### `datos/relieve.bin`
`Uint16[ w, h, alturas… ]`, con las alturas en **decímetros**. Se sube como textura half‑float (canal R) y el vertex shader la muestrea.

*Caracas (implementado):* little‑endian, alturas sobre el nivel del mar (EGM2008); fila 0 = borde norte de la hoja, columna 0 = borde oeste; la grilla cubre la hoja entera y la celda (i, j) es el centro del píxel ((j+½)·ancho/w, (i+½)·alto/h) del plano. 930×740 celdas de 10 m (`tools/geo/relieve.py`, desde Copernicus GLO‑30). En la GPU va **relativa a la Plaza Bolívar** (y = 0 en la plaza), para que el half‑float sea fino en el valle. `src/relieve.js` expone `alturaEn(x, z)` (bilineal) para la cámara y los modos.

### `datos/calles.bin` + `calles.json`
`calles.json` = array ordenado de nombres de calles actuales. `calles.bin` = `Uint16`, **6 por registro**: posición, dirección, índice de nombre, largo y tipo *(inferido)*. Se indexa en una grilla de 300 m para buscar "calles cerca de (x,z)".

*Caracas (implementado, `tools/planos-epocas.mjs`, paso `planos-epocas` de `npm run datos`):* de cada plano
calzado sobre 1936 (`fuentes/derivados/<año>/calzado.tif`, de `tools/geo/calce.py`) salen `plano/<año>/*.webp`
**RGBA**: alfa 0 fuera del plano (ahí se ve el de 1936) y, debajo del alfa 0, papel claro para que el filtrado no
oscurezca el borde. Cada textura cubre **solo el recorte** del calzado (`recorte` = [x0, y0, x1, y1] en píxeles
del mosaico de 1936), no la hoja entera. Niveles: `chico` siempre; `medio` y `grande` si el recorte no es más
chico que ellos (sin agrandar): 1772 y 1843 llegan a 4096, 1889 y 1911 a 8192. No hay teselas finas: los planos
viejos son más gruesos que el de 1936 y 8192 ya está cerca de su resolución propia. `plano/epocas.json`:
`{"planos":[{"año":1843,"plano":"<carpeta>","recorte":[…],"niveles":[{"url":"plano/1843/chico.webp","lado":2048},…]}]}`.
El visor (`src/planos.js`) baja el plano de una época la primera vez que se elige (chico, y en equipos que no son
livianos el mayor que admite la GPU), guarda solo los dos de la ola en curso y uno precargado (chico), y el shader
(`src/shader/plano.js`) funde el de la época "de" con el de la "a" con el frente de la ola, como las casas.
1578 no tiene plano calzable (Pimentel es un esquema): usa el de 1772, el más cercano en el tiempo. 1936 usa el suyo.

*Caracas (implementado, `tools/geo/hoy.py`):* `calles.json` = array JSON de los nombres únicos (tag `name` de OSM, sin
corregir), ordenados por código de carácter (`sorted` de Python). `calles.bin` = registros de **6 × Uint16
little‑endian (12 bytes)**, sin cabecera (n = `byteLength / 12`). Cada registro es un **tramo** de una calle con
nombre: las polilíneas de OSM se cortan donde giran más de 35° y cada pieza se parte en partes iguales de
hasta 200 m; se descartan los tramos de menos de 20 m y los que tienen el punto medio fuera del mosaico.

| u16 | campo | codificación |
|---|---|---|
| 0 | `x` | punto medio del tramo (a lo largo de la línea), en **píxeles del mosaico de 1936** redondeados (0 … 18599; 1 px = 0,5 m) |
| 1 | `y` | ídem (0 … 14799, crece hacia el sur) |
| 2 | `dx` | dirección unitaria de punta a punta del tramo: `dx = (u − 32768) / 32767` |
| 3 | `dy` | ídem; orientada para leer: `dx > 0`, y si es vertical `dy = −1` (de abajo hacia arriba) |
| 4 | `nombre` | índice en `calles.json` |
| 5 | `largo` | largo del tramo en metros, redondeado (máx. 65535) |

Los registros van ordenados por `largo` descendente (después por nombre, `x`, `y`): el visor puede priorizar
las etiquetas tomando los primeros. No lleva tipo de vía. Datos © colaboradores de OpenStreetMap (ODbL),
ficha en `fuentes/datos/osm-hoy/ficha.json`.

### `datos/hoy.json`
Marcas de la ciudad actual: `[{nombre, x, y, nivel, rio:bool, nota}]` (x,y en píxeles del plano base). `rio:true` agrega "En 1867, esto era río."

### `datos/crece.json`
```json
{"epocas":[{"año":1888,"plano":1888,"titulo":"…","autor":"…","fuente":"…","licencia":"Dominio público",
            "corto":"plano de Latzina (1888)","obras":"Se abrió la Avenida de Mayo…",
            "casas":21220,"renovadas":593}, …]}
```
Caracas (`tools/geo/epocas.py`): `plano` es la carpeta de `fuentes/mapas/`; `titulo`, `autor`, `fuente` (institución · URL) y `licencia` vienen de su `ficha.json`; `obras` aparece solo si el plano lo muestra; `casas` = techos visibles en esa época según `vida`. No hay `renovadas`. `celda_m` (8) es el lado de cada píxel de `plano/crece.png` en metros. Ese PNG
se apoya en la esquina noroeste del mosaico de 1936: el píxel (fila i, columna j) cubre
[j·8, (j+1)·8) m al este y [i·8, (i+1)·8) m al sur. Tiene ⌈ancho/8⌉ × ⌈alto/8⌉ píxeles; si el
mosaico no mide un múltiplo de 8 m, la última columna y la última fila son parciales (se calculan con
los puntos que caen dentro) y el PNG sobra unos metros al este y al sur, así que se coloca con
`celda_m` y no estirándolo al mosaico. En R, desde qué época está edificado cada punto en esa época y en todas las siguientes, con la codificación "desde cuándo" de abajo (E = 6).

En **G**, desde qué época está **urbanizado** (misma codificación; `tools/geo/valle.py`): no solo las casas sino las manzanas con sus calles, plazas y solares. Lo urbanizado de cada época es su máscara de lo edificado con un cierre de 25 m (une las manzanas a través de las calles), los huecos de hasta 4 ha rellenos (plazas, corazones de manzana) y 10 m de holgura (la calle del borde); en 1578, la envolvente convexa de los 100 solares de Pimentel (las 25 manzanas, con calles y plaza) más la holgura; en 1936, lo mismo sobre las clases edificado, edificio público y patio. Es monótono (la etapa de un punto es la primera época en que es ciudad: una vez ciudad, siempre ciudad), la referencia es 1936 (lo que ahí no es ciudad no lo fue nunca: los marcos y cartelas de los planos viejos no urbanizan el campo) y nunca es posterior a R. Parámetros en `tools/geo/epocas/epocas.json` (`urbanizado`). El visor lo usa en color para pintar como campo, sin el dibujo del plano, lo que la época todavía no urbanizó (`src/shader/valle.js`).

En **B**, el **monte**: cuánta vegetación silvestre le toca a cada punto (0–255, no depende de la época). El valle es una sabana abierta (0,10) con manchones de monte (ruido reproducible, semilla en `epocas.json`), monte tupido junto al agua (0,92 en la ribera; cae con la distancia, a razón de 1/e cada 45 m), ralo en las cuestas (pendiente de 0,18 a 0,55, con `datos/relieve.bin` si está) y algo más cerrado en lo alto del Ávila (desde 1.400 m s. n. m.); 0 en el agua y fuera del plano. Lo leen el visor (el tono del campo) y `tools/arboles.mjs` (dónde van los árboles silvestres).

El visor carga `crece.png` **sin mipmaps** (son etapas codificadas: promediadas, el borde de la ciudad cambiaría de época a lo lejos).

### Texturas (`plano/*.webp`)
| archivo | uso |
|---|---|
| `primero.webp` 1024, `chico.webp` 2048, `medio-4k.webp`, `medio.webp` 8192, `f/{i}-{j}.webp` 3072 | el escaneo, en LOD |
| `<año>/chico.webp` 2048, `<año>/medio.webp` 4096, `<año>/grande.webp` 8192 + `epocas.json` | el plano calzado de cada época, con alfa (ver abajo) |
| `suelo.webp` / `suelo-2k.webp` | máscara RGB: **R río · G patio · B edificado** (del plano base) |
| `rotulos.webp` 4096 / `rotulos-2k.webp` | *Caracas:* un canal, sin pérdida: **cuánto del texel es rótulo** del plano de 1936 (nombres, cotas, letras de parroquia, punteado del tranvía). En color, ahí el dibujo del plano no se marca (`tools/geo/rotulos.py` → `tools/rotulos-lib.mjs`) |
| `calles.webp` / `-2k` | R desde cuándo hay piedra, G desde cuándo es lisa (madera/asfalto), B cuánto del punto es calle |
| `crece.webp` / `-2k` | por punto, "desde qué etapa": R urbanizado/ganado al río, G fondos, B edificado |
| `despeje.webp` / `-2k` | R demolido (avenida/plaza abierta), G verde nuevo, B calzada de avenidas nuevas |
| `hoy-lejos.webp` (2048), `hoy-cerca.webp` (8192) | calles, vías y costa de OSM rasterizadas y alineadas al plano |
| `fotos/{id}.webp`, `fotos/m/{id}.webp` | fotos de las fichas (grande y miniatura), máx. ~720 px |
| `autor.webp` | avatar |

*Caracas (implementado, `tools/geo/hoy.py`):* `hoy-lejos.webp` (2048×1630) y `hoy-cerca.webp` (8192×6518) cubren
el mosaico entero de 1936 (esquina (0,0) = píxel (0,0) del mosaico; escala por eje = lado de la textura / lado
del mosaico). **RGB sin pérdida, sin alfa**: **R calles · G vías férreas · B agua**; cada canal es la
**cobertura** (0–255, antialias por sobremuestreo 4×) de esa capa, así que el shader estampa rojo con
`max(r, g, b)` o pesa cada capa por separado. Ancho dibujado en metros según el tipo de OSM (avenidas 11–22 m,
calles 6–8 m, rieles 4–5 m, ríos 15 m, quebradas 4 m), nunca menos de 1 px de la textura. De lejos: autopistas,
troncales, primarias, secundarias y terciarias (con sus enlaces), rieles, ríos, canales y lagunas; de cerca
además las calles residenciales, sin clasificar, de convivencia y peatonales y las quebradas. No entran los
túneles ni lo entubado, ni el metro bajo tierra (`tunnel`, `location=underground`, `layer < 0` en rieles).

Codificación "desde cuándo" en un canal: con `E` etapas, la etapa `e` (contando desde 1) vale aprox. `(E+1−e)/E` (1 = primera, 1/E = última, 0 = nunca). Así, un solo `step` en el shader decide si algo existe en el año que se mira.

## Deploy

- `vite build` → `dist/` (HTML + `assets/` con hash + `public/` copiado tal cual).
- Datos con cache‑busting por query (`?v=<hash del build>`), servidos con `must-revalidate`.
- Assets estáticos en Cloudflare Pages/Workers, sin servidor. Dominio propio.

## Pruebas sugeridas (para el nuevo proyecto)

- **Unit** (Vitest): decodificador `.pak` (ida y vuelta con el encoder de `tools/`), conversión píxel↔mundo, codificación de etapas, parseo de direcciones del buscador.
- **Integración**: correr `tools/*` sobre un recorte chico del plano → snapshot de conteos y bounding boxes.
- **E2E** (Playwright): abrir `?sinintro`, esperar `window.lab.ready` y sacar capturas con `?limpio&lugar=Plaza Bolívar` en tinta, color y "hoy" para cada época (regresión visual).
