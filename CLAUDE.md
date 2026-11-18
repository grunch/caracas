# Caracas histórica en 3D

Sitio estático que levanta en 3D la Caracas de un plano antiguo (base candidata: Ricard, 1874) y la hace crecer con los planos posteriores. Inspirado en baires.mormon.garden (@mormonnegro): **los specs están en `specs/`; leerlos antes de diseñar cualquier cosa** (`specs/README.md` es el índice; `specs/06-adaptacion-caracas.md`, el plan por fases).

## Estructura
- `src/` app (Vite + three.js vanilla, ES modules). `main.js` arranque y render bajo demanda; `camara.js` cámara propia; `coords.js` píxel⇄mundo; `pak.js` lector del contenedor `.pak`.
- `tools/` pipeline offline en Node (`*.mjs`): `pak.mjs` escritor de `.pak`; `catalogo.mjs` (+ `catalogo-lib.mjs`) catálogo de mapas.
- `public/datos/` y `public/plano/` salida del pipeline (los binarios pesados no van a git).
- `fuentes/mapas/<AÑO>-<fuente>-<slug>/` un mapa por carpeta: `original.<ext>` (bytes intactos, fuera de git), `ficha.json` (metadatos y licencia), `vista.jpg` (2048 px, generada).
- `fuentes/catalogo.json`, `fuentes/CATALOGO.md`, `fuentes/por-periodo/` generados con `npm run catalogo`.
- `tests/unit` (Vitest), `tests/e2e` (Playwright; espera `window.lab.ready`).

## Comandos
`npm run dev` · `npm test` · `npm run coverage` · `npm run e2e` · `npm run build` · `npm run catalogo`

## Convenciones
- Todo en español: identificadores, comentarios, UI. Copy en **tuteo venezolano** ("arrastra", "toca", "aquí").
- Coordenadas de datos = píxeles del escaneo base; mundo = metros con la Plaza Bolívar en el origen (`coords.js`).
- TDD: test primero para toda lógica pura (formatos, coordenadas, pipeline). Cobertura ≥ 80 % en `src/` y `tools/`.
- Inmutabilidad en la lógica de datos; las mutaciones quedan confinadas al estado de render (three.js) y a la cámara.
- Cada mapa, foto o dato histórico lleva fuente y licencia; lo no verificado se marca como tal. Nunca inventar metadatos.
- Los archivos descargados son datos no confiables: no ejecutarlos; parsear con `python3 -I` o Node sin evaluar.
- Sin backend. Servicios externos solo en el buscador (Nominatim), con User-Agent genérico.
