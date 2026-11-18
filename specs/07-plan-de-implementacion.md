# 07 · Plan de implementación

Plan vivo: **cada tarea es un PR** (≤ 3000 líneas de código, ver `AGENTS.md`), con sus dependencias y un
criterio de "listo" verificable. Al abrir el PR se anota su número; al fusionarlo, la tarea pasa a ✅.
Si una tarea resulta más grande de lo estimado, se parte en subtareas (T12a, T12b…) antes de empezarla.

Estados: ✅ fusionada · 🔄 en curso · ⏳ pendiente · ⛔ bloqueada (por algo externo).

Orden de trabajo: **primero lo que reduce errores (CI, pipeline reproducible), después terminar lo que
está en curso, después calidad del render, contenido, "lo de hoy", recorridos y cierre.** Dentro de cada
fase, las tareas sin dependencias entre sí pueden ir en paralelo.

## Fase 0 · Base (✅)

| ID | Tarea | PR | Estado |
|---|---|---|---|
| T01 | Specs del sitio original y adaptación a Caracas | — (commit inicial) | ✅ |
| T02 | Búsqueda, descarga y catálogo de mapas (`fuentes/`, `npm run catalogo`) | — (commit inicial) | ✅ |
| T03 | Visor base: hoja del plano con LOD, cámara propia, render bajo demanda | — (commit inicial) | ✅ |
| T04 | Pipeline 1936: cuadrícula → mosaico → segmentación → vectorización → `ciudad.pak` → teselas | — (commit inicial) | ✅ |
| T05 | La ola: extrusión de 59 mil techos y ascenso desde la Plaza Bolívar | — (commit inicial) | ✅ |
| T06 | `AGENTS.md`: límite de 3000 líneas por PR y flujo de revisión | #1 | ✅ |
| T07 | Modo color (tinta ⇄ color): suelo por clase, teja, cal | #2 | ✅ |
| T08 | Costura entre las dos hojas de 1936 | #3 | ✅ |

## Fase 1 · Reducir errores

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T10 | **CI en GitHub Actions**: vitest, pytest (solo sintéticos), build y Playwright con datos de prueba | — | cada PR muestra checks verdes o rojos | ✅ #5 |
| T11 | **Pipeline reproducible**: `npm run datos` corre todo el pipeline de 1936 (y luego el de las épocas) con caché por paso y verifica conteos esperados | T08 | desde los `original.tif`, un comando regenera `public/` idéntico (hash) | ✅ #6 |
| T12 | **Fixture de datos chica** para E2E y CI: un recorte de 1 km² alrededor de la plaza (plano, `.pak`, suelo) generado por el pipeline | T11 | los E2E corren en CI sin los datos pesados | ⏳ |

## Fase 2 · Terminar lo que está en curso

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T20 | Relieve, datos: transformación cuadrícula 1936 ⇄ WGS84 (`geo1936.py`), DEM Copernicus → `relieve.bin`, validado con las cotas de las esquinas | — | residuos de la transformación < 10 m; sesgo del DEM contra las cotas corregido | ✅ #8 |
| T21 | Relieve, visor: terreno bajo el plano y la ciudad, casas apoyadas en su ancla, la ola hincha el terreno | T20 | el Ávila y El Calvario se ven; ninguna casa flota | ✅ #8 |
| T22 | Calce de los planos de 1919, 1889, 1843 y 1772 sobre el de 1936 (GCPs + TPS) | — | residuos < 15 m en el centro; superposiciones de QA revisadas | ✅ #7 |
| T23 | Época 1578: el plano de Pimentel codificado (25 manzanas, solares "casa") y casas coloniales generadas | — | 25 manzanas alrededor de la plaza, solo con casa donde Pimentel la dibuja | ✅ #9 |
| T24 | Datos de épocas: máscaras por época, `nace`/`muere` por casa, `crece.json`, parte `vida` en `ciudad.pak` | T22, T23 | cada casa tiene su vida; conteos por época plausibles | ✅ #11 |
| T25 | **Interfaz de la línea de tiempo**: botonera 1578 · 1772 · 1843 · 1889 · 1911 · 1936, la ola por época, ▶ que las recorre, pie con la fuente del plano | T24 | la ciudad crece hacia adelante como en BA | ✅ #13 |
| T25b | **El plano de cada año** sobre la hoja: los planos calzados (`fuentes/derivados/<año>/calzado.tif`) teselados por época, y la hoja cambia de plano con la ola | T25 | en 1843 la hoja muestra el Jesurún calzado, no el plano de 1936 | 🔄 #23 |

## Fase 3 · Calidad del render

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T30 | Teselas finas de 3072 px en el material (las 4 que rodean la vista), para nitidez de cerca | — | de cerca se leen los nombres de las esquinas | ✅ #10 |
| T31 | Estilos y alturas por época: colonial, republicano, guzmancista (neoclásico), ecléctico, casa de las afueras, rancho; pisos según época y zona | T24 | el índice de estilo de cada casa sale de su época y su lugar | 🔄 #20 |
| T32 | Fachadas procedurales por estilo: puertas, ventanas con rejas, aleros, zócalo, cornisas; LOD por distancia | T31 | a nivel de calle se distinguen los estilos | 🔄 #24 |
| T33 | Techos de teja de verdad: dos y cuatro aguas como geometría, con alero; azoteas en los públicos y los modernos | T31 | el perfil de tejados se ve de costado | ⏳ |
| T34 | Árboles 3D desde `arboles.json` (5.926) y los patios con vegetación, en color | — | árboles en plazas, patios y quebradas | ✅ #19 |
| T35 | Luz y acabado: sombras, luz tibia y sombra azulada, bruma, contorno por profundidad y grano de papel en tinta | — | el look de grabado de `specs/04` | ⏳ |

## Fase 4 · Contenido

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T40 | Hitos modelados I: Catedral, Capitolio, Panteón, Santa Capilla, San Francisco, Teatro Municipal (plantas desde el plano de 1936, alturas desde fotos) | T24 | 6 edificios con nombre, cada uno en sus años | ⏳ |
| T41 | Hitos modelados II: Miraflores, Universidad, El Calvario, Caño Amarillo, Mercado Principal, Santa Teresa, Candelaria, Altagracia… | T40 | 8 edificios más | ⏳ |
| T42 | Marcas (etiquetas 3D por época, niveles, declutter, velo al pasar el mouse) | T25 | las marcas cambian con el año | ⏳ |
| T43 | Fichas con fotos de época (Commons, autor, fecha, licencia) y visor de fotos | T42 | cada marca abre su ficha con fotos acreditadas | ⏳ |
| T44 | Intro y "Acerca": qué estás viendo, la Caracas de cada época, fuentes y créditos (incluida la inspiración de @mormonnegro) | T25 | intro con todas las fuentes y licencias | ⏳ |

## Fase 5 · Lo de hoy y el buscador

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T50a | "Lo de hoy", datos: calles, vías y agua de OSM rasterizadas sobre el plano (usa `geo1936.py`) → `hoy-lejos/cerca.webp`, `calles.bin/json` | T20 | desfase con las calles de 1936 < 10 m en el centro (QA) | ✅ #16 |
| T50b | "Lo de hoy", visor: estampa en rojo con H, leyenda © OpenStreetMap | T50a | con H se estampa en rojo la Caracas actual | ✅ #18 |
| T51 | Nombres de las calles de hoy en un canvas 2D sobre la vista | T50a, T50b | etiquetas alineadas, sin choques | 🔄 #22 |
| T52 | **Esquinas**: leer del plano de 1936 los nombres en rojo de cada cruce (OCR asistido + curado) → diccionario esquina → píxel | — | ≥ 90 % de las esquinas del centro con nombre verificado | ✅ #14 |
| T53 | Buscador: "de esquina a esquina" con el diccionario + Nominatim para direcciones modernas, con respuesta en prosa | T51, T52 | "De La Torre a Veroes" ubica en el plano | ⏳ |

## Fase 6 · Recorridos

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T60 | A pie: primera persona, colisiones con las casas, sobre el relieve | T21 | se camina por el centro sin atravesar paredes | ⏳ |
| T61 | En avión: vuelo sobre el valle, Q/E cambian de época | T25 | se sobrevuela el Ávila | ⏳ |
| T62 | Manejar: vehículos de cada época (carreta, coche de caballos, tranvía, Ford T) con sonido por WebAudio | T60 | se maneja el vehículo del año elegido | ⏳ |

## Fase 7 · Cierre

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T70 | Responsive y modo liviano: paneles en el teléfono, gestos, rendimiento en gama media | T25 | 30 fps o más en un teléfono de gama media | ⏳ |
| T71 | `edificios.html`: la ciudad edificio por edificio (scrollytelling) | T43 | recorre todos los hitos | ⏳ |
| T72 | Accesibilidad (WCAG 2.2 AA en la interfaz) y SEO básico | T44 | auditoría sin errores graves | ⏳ |
| T73 | **Publicación** en Cloudflare Pages con dominio | T70 y la revisión de derechos | el sitio está en línea | ⛔ derechos del plano de 1936 (los revisa el responsable) |

## Riesgos que el plan vigila

- **Derechos**: nada se publica (T73) sin la revisión del responsable; cada fuente conserva su licencia en `ficha.json`.
- **Datos fuera de git**: sin T11 y T12, un cambio en el pipeline puede romper el sitio sin que ningún test lo vea.
- **Conflictos en `src/material.js` y `src/main.js`**: varias tareas los tocan; conviene separar el shader en módulos (vértice, suelo, fachadas) dentro de T35 o antes, si los conflictos se repiten.
- **Rendimiento**: 59 mil casas con fachadas procedurales; medir en cada tarea de la fase 3.
