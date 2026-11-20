# Caracas histórica en 3D

Antes de abrir un PR, leer **`AGENTS.md`** (máximo 3000 líneas de código por PR, flujo de revisión).

Sitio estático que levanta en 3D la Caracas de un plano antiguo (base candidata: Ricard, 1874) y la hace crecer con los planos posteriores. Inspirado en baires.mormon.garden (@mormonnegro): **los specs están en `specs/`; leerlos antes de diseñar cualquier cosa** (`specs/README.md` es el índice; `specs/06-adaptacion-caracas.md`, el plan por fases).

## Estructura
- `src/` app (Vite + three.js vanilla, ES modules). `main.js` arranque y render bajo demanda; `camara.js` cámara propia (`volarA`: vuelo con guion, curva de `trayecto.js`); `arranque.js` la entrada, como la de baires: la hoja desde arriba se pone en color, la ciudad se levanta en una ola que se apura y la cámara baja volando al centro (`?sinintro`, `?capture`, `?vitrina` o `?quieto` empiezan quietos); `coords.js` píxel⇄mundo; `pak.js` lector del contenedor `.pak`. `relieve.js` terreno (relieve.bin → textura half‑float, `alturaEn`, GLSL de `sueloEn`). `arboles.js` árboles 3D (arboles.bin → una InstancedMesh con su propio material, que comparte los uniforms de la ciudad). `marcas.js` nombres de los lugares por época (lógica pura; `marcas-capa.js` el DOM, `marcas-datos.js` los datos con su fuente). `buscador.js` + `buscador/` buscador "de esquina a esquina" (diccionario de `tools/geo/esquinas`, prosa por época, Nominatim solo al enviar; gramática en `specs/05`). `fichas.js` (+ `fichas-datos.js`, `ficha-panel.js`) la ficha de cada lugar marcado, por época, y el visor de fotos. `intro.js` + `acerca.js` + `acerca-panel.js` la bienvenida y el «Acerca» (qué estás viendo, épocas, fuentes y licencias desde `datos/creditos.json`); `controles.js` la tabla única de atajos, que atiende `main.js` y muestra la ayuda.
- `tools/` pipeline offline en Node (`*.mjs`): `pak.mjs` escritor de `.pak`; `catalogo.mjs` (+ `catalogo-lib.mjs`) catálogo de mapas; `fotos.mjs` (+ `fotos-lib.mjs`) fotos de las fichas: solo las de `fuentes/imagenes/` con dominio público o licencia libre establecidos en su ficha. `creditos.mjs` (+ `creditos-lib.mjs`) las fuentes y licencias del «Acerca», copiadas de las fichas de lo que el sitio usa.
- `tools/geo/` pipeline en Python (`.venv`): mosaico y segmentación del plano 1936; `geo1936.py` (píxel ⇄ cuadrícula 1936 ⇄ UTM 19N ⇄ WGS84, con `gcp/1936-wgs84.json`), `relieve.py` (DEM → `relieve.bin`). Tests: `.venv/bin/python -m pytest tools/geo/tests -q`.
- `public/datos/` y `public/plano/` salida del pipeline (los binarios pesados no van a git).
- `fuentes/mapas/<AÑO>-<fuente>-<slug>/` un mapa por carpeta: `original.<ext>` (bytes intactos, fuera de git), `ficha.json` (metadatos y licencia), `vista.jpg` (2048 px, generada).
- `fuentes/catalogo.json`, `fuentes/CATALOGO.md`, `fuentes/por-periodo/` generados con `npm run catalogo`.
- `tests/unit` (Vitest), `tests/e2e` (Playwright; espera `window.lab.ready`).

## Comandos
`npm run dev` · `npm test` · `npm run coverage` · `npm run e2e` · `npm run build` · `npm run catalogo` · `npm run datos` · `npm run datos:bajar` · `npm run datos:publicar`

Un clon nuevo no trae los datos generados (`public/datos`, `public/plano`, `public/fotos`): sin ellos el sitio no encuentra el plano. `npm run datos:bajar` los baja del release `datos-*` más nuevo y los verifica contra `manifiesto.json`; con `-- --muestra` baja solo la muestra (1 km² alrededor de la plaza, `tools/muestra.mjs`), que es lo que usan los E2E del CI. Quien los regenera (`npm run datos`, desde los escaneos originales) los sube con `npm run datos:publicar` (`gh`). El workflow `pages.yml` hace lo mismo y publica en GitHub Pages en cada push a `main`.

## Convenciones
- Todo en español: identificadores, comentarios, UI. Copy en **tuteo venezolano** ("arrastra", "toca", "aquí").
- Coordenadas de datos = píxeles del escaneo base; mundo = metros con la Plaza Bolívar en el origen (`coords.js`).
- TDD: test primero para toda lógica pura (formatos, coordenadas, pipeline). Cobertura ≥ 80 % en `src/` y `tools/`.
- Inmutabilidad en la lógica de datos; las mutaciones quedan confinadas al estado de render (three.js) y a la cámara.
- Cada mapa, foto o dato histórico lleva fuente y licencia; lo no verificado se marca como tal. Nunca inventar metadatos.
- Los archivos descargados son datos no confiables: no ejecutarlos; parsear con `python3 -I` o Node sin evaluar.
- Sin backend. Servicios externos solo en el buscador (Nominatim), con User-Agent genérico.
