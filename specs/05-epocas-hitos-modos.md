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

Un objeto por edificio:
```js
granRex: { nombre:'Cine Gran Rex', año:1937, x:11250, y:8732, ux:.9994, uy:.0354,
           largo:44.8, ancho:36.7, planta:[[[x,y],…]], partes:[{x,y,ux,uy,largo,ancho},…] }
```
- `planta` = multipolígono en píxeles del plano (para que encaje en la manzana); `partes` = cuerpos con altura y techo propios.
- Constructores paramétricos *(inferido)*: nave + torres + cúpula para las iglesias (usa `ciudad.json.iglesias`), columnatas y pórticos (Catedral), arcos (Cabildo, Recova), cúpulas (Congreso), torres (Obelisco), muelles, barcos en los diques y trenes animados en las vías (`trenes`, con línea y posición).
- Las plazas de cada época (la Plaza de Mayo cambia varias veces): fuentes, caminos de granza, césped, monumentos.
- Cada hito tiene un ancla para apoyarlo en el relieve y su tono codificado en la semilla.

## Fichas (`fichas.js` + `ficha.js`)

- Textos por lugar: `titulo`, `era` o `eras[etapa]`, cuerpo (HTML corto), `hoyEs` ("Hoy es…") y `fotos: [id…]`.
- Catálogo de fotos: `{id: {w, h, titulo, autor, fecha, licencia, fuente}}` → `fotos/{id}.webp` y `fotos/m/{id}.webp`. Todas de Wikimedia Commons, en dominio público, con link al archivo.
- Al abrir una ficha, la cámara vuela, el edificio se vela y se abre el panel. Esc, × o un click afuera la cierran; las flechas recorren las fotos.

## "Ver lo de hoy" (H)

- Estampa en **rojo** sobre el plano las calles, vías y costa actuales (OSM). De lejos, solo avenidas, vías y costa; de cerca, todas las calles con borde afilado; muy de cerca, solo el contorno de la calle, a dos trazos. La **tierra ganada al río** va rayada (patrón estable en pantalla; cada nivel dobla el anterior).
- Los nombres de calles van en un `<canvas>` 2D superpuesto, alineados con cada calle. La medición de texto se cachea, hay un máximo de ~90 etiquetas y una grilla anticolisión de 13 px, y solo se muestran con la cámara entre 1500 y 3600 m de distancia.
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
