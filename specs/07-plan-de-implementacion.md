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
| T12 | **Muestra de datos chica** para E2E y CI: un recorte de 1 km² alrededor de la plaza (plano, `.pak`, suelo) generado por el pipeline | T11 | los E2E corren en CI sin los datos pesados | ✅ #60: la muestra (`tools/muestra.mjs`) viaja como `muestra.tar.gz` en el release `datos-*` y el CI la baja con `npm run datos:bajar -- --muestra` |

## Fase 2 · Terminar lo que está en curso

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T20 | Relieve, datos: transformación cuadrícula 1936 ⇄ WGS84 (`geo1936.py`), DEM Copernicus → `relieve.bin`, validado con las cotas de las esquinas | — | residuos de la transformación < 10 m; sesgo del DEM contra las cotas corregido | ✅ #8 |
| T21 | Relieve, visor: terreno bajo el plano y la ciudad, casas apoyadas en su ancla, la ola hincha el terreno | T20 | el Ávila y El Calvario se ven; ninguna casa flota | ✅ #8 |
| T22 | Calce de los planos de 1919, 1889, 1843 y 1772 sobre el de 1936 (GCPs + TPS) | — | residuos < 15 m en el centro; superposiciones de QA revisadas | ✅ #7 |
| T23 | Época 1578: el plano de Pimentel codificado (25 manzanas, solares "casa") y casas coloniales generadas | — | 25 manzanas alrededor de la plaza, solo con casa donde Pimentel la dibuja | ✅ #9 |
| T23b | **1578 sale de la línea de tiempo**: el sitio arranca en 1772. El esquema de Pimentel solo dice qué solares tenían casa y no hay imágenes hasta 1812; lo mostrado era más invento que reconstrucción. Los datos de la época 0 siguen en `ciudad.pak`; `PRIMERA_EPOCA` en `src/epocas.js` la oculta | T25 | la botonera empieza en 1772 | ✅ #34 |
| T24 | Datos de épocas: máscaras por época, `nace`/`muere` por casa, `crece.json`, parte `vida` en `ciudad.pak` | T22, T23 | cada casa tiene su vida; conteos por época plausibles | ✅ #11 |
| T25 | **Interfaz de la línea de tiempo**: botonera 1578 · 1772 · 1843 · 1889 · 1911 · 1936, la ola por época, ▶ que las recorre, pie con la fuente del plano | T24 | la ciudad crece hacia adelante como en BA | ✅ #13 |
| T25b | **El papel antes de la ciudad** (rehecho; el primer intento, #23, pegaba el plano viejo sobre el de 1936 y quedó apagado detrás de `?planos`). En tinta, antes de 1936: donde la época ya es ciudad, el plano de 1936 sin sus rótulos; donde todavía no, papel en blanco con el valle a pluma (laderas en normales, el Guaire y las quebradas, matas, pajonal); sigue la ola, con el borde a pulso. Y **el plano de cada época, aparte**: «Ver el plano de {año}» (P) lo abre en un visor 2D con su crédito | T25, T36, T38 | en 1772 las casas no pisan «UNIVERSIDAD CENTRAL» ni hay manzanas de 1936 en el valle vacío; en 1936 la hoja es la de siempre; el Exato mapa se mira aparte, entero | ✅ #42 |

## Fase 3 · Calidad del render

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T30 | Teselas finas de 3072 px en el material (las 4 que rodean la vista), para nitidez de cerca | — | de cerca se leen los nombres de las esquinas | ✅ #10 |
| T31 | Estilos y alturas por época: colonial, republicano, guzmancista (neoclásico), ecléctico, casa de las afueras, rancho; pisos según época y zona | T24 | el índice de estilo de cada casa sale de su época y su lugar | ✅ #20 |
| T31b | **Referencias visuales por época**: pinturas, grabados y fotos en `fuentes/imagenes/` (con ficha y observaciones en su README) que calibran estilos, pisos, techos y lotes de cada época. Tarea continua: cada imagen nueva se anota y, si contradice el modelo, se ajusta | — | cada época tiene al menos una referencia y sus reglas la citan | 🔄 (anotadas: 1812, San Pablo ~1860, calle de 1843, mercado de 1852, vista de J. Thomas de 1839 en dos copias, foto panorámica ~1903, Plaza Bolívar 1910, Catedral 1867, Gradillas 1950, años 30 sobre los techos, La Pastora 1892 y 1930, calle con tranvía ~1930, cuatro fotos de 1880, Casa Amarilla ~1875, Plaza Bolívar 1866–1900, esquina de la plaza ~1930; y cuatro posteriores a 1936 para épocas futuras) |
| T31c | **Calibración de estilos con las referencias**: cada casa tiene un estilo y unos pisos por época (`historia` en `ciudad.pak`): el pretil llega antes al centro que a los barrios, los altos van en las esquinas, 3–4 pisos solo en el núcleo comercial, barrios republicanos de un piso, galpones junto a las estaciones | T31, T31b | el perfil desde El Calvario y las calles de La Pastora se parecen a las fotos de cada época; histograma estilo × pisos por época en `tools/geo/README.md` | ✅ #30 |
| T32 | Fachadas procedurales por estilo: puertas, ventanas con rejas, aleros, zócalo, cornisas; LOD por distancia | T31 | a nivel de calle se distinguen los estilos | ✅ #24 |
| T33 | Techos de teja de verdad: crujía al frente con la cumbrera paralela a la calle, alas y patio, alero o pretil según la época, teja criolla dibujada en el shader; azoteas en los públicos y los modernos; zinc en ranchos y galpones; alto de piso por estilo y por casa | T31, T31c | el perfil de tejados se ve de costado; las vistas de control (vuelo de pájaro, El Calvario, calle) se parecen al grabado de 1812, la litografía de 1839 y la foto de 1903 | ✅ #35 |
| T33b | **Casas de patio**: cada casa de teja que da a la calle trae del vectorizador su marco (frente sobre la línea de fachada de la cuadra) y sus alas —crujía corrida sobre la calle, patios con alas laterales, alas cruzadas, solar—, y el visor las techa ala por ala, con inglete en las esquinas; patios del plano conservados, suelo de patio, árboles de patio, un tono de teja por casa. Referencia: vista aérea de un pueblo colonial (`fuentes/imagenes/0000-usuario-aerea-pueblo-colonial`) | T33, T37 | desde arriba, una manzana de 1772 es un gofre de teja: bandas con cumbrera sobre las calles, peine de alas y patios chicos; montaje lado a lado con la referencia | ✅ #37 |
| T33c | **La cuadra modelo**: las manzanas de casas se rehacen como la cuadra colonial estándar vista desde arriba (referencia del usuario): todas las casas dan a la calle, crujía corrida en todo el perímetro, detrás un ala en L, un patio cerrado por un ala cruzada o solo la crujía, y el centro abierto en solares con cerca baja; los lotes que no dan a la calle son solar. Cada cuadra nace entera (cuando ya está la mitad de sus casas) y queda cerrada; los edificios públicos del plano de 1936 nacen en 1889 y antes su lugar es de casas | T33b | en 1772 ninguna casa mira al centro de la cuadra, no hay entradas a los fondos desde la calle ni edificios grandes de varios pisos; iglesias y hitos intactos | ✅ #47, #48 |
| T33d | **Cuadras alineadas**: en la cuadra modelo, la manzana se simplifica a sus lados rectos (cada uno, la recta ajustada a su borde) y cada punto va al lado más cercano; cada lado se reparte en frentes de 9 a 14 m con el marco sobre la línea del lado, y las esquinas se unen a inglete por la diagonal. Las «manzanas» de 1936 que son varias cuadras pegadas por un puente fino se separan y cada una va por sus lados | T33c | en 1772 las casas de una calle comparten la línea de fachada, no hay casas encimadas en las esquinas ni frentes torcidos | ✅ #53 |
| T33e | **Calles nuevas**: lo abierto en 1936 (calles, pasajes, plazas) que el plano de 1772 tiene edificado, tras corregir el resto del calce con un corrimiento local (malla de correlación de las redes de calles); las cuadras que une van dos veces: enteras, como eran antes, hasta la época en que el plano ya muestra la calle, y partidas desde entonces. Las manzanas de 1936 se arman cuadra por cuadra (las pegadas, separadas). Solo se usan los grupos cuya cuadra de antes se deja repartir por lados | T33d | en 1772 no se ven cuadras partidas por las calles detectadas; en 1936, como siempre | ✅ #55 |
| T33f | **Cuadras de OSM**: armar las cuadras con la red de calles de OpenStreetMap (polígonos cerrados), filtrando las calles abiertas después de 1936, y usar el plano de 1936 solo para lo edificado; destraba las calles nuevas que hoy se descartan (26 de 30 grupos: manzanas de 1936 pegadas a sus vecinas, como en San Jacinto) | T33e | en 1772 ninguna cuadra partida por una calle detectada; San Jacinto, una cuadra cerrada | 🔄 #68 |
| T33g | **Calles y cuadras verificadas en 1772**: recuperar once tramos del centro y diez cuadras cerradas documentadas en el original; impedir que el calce borre esas cuadras o que los frentes opuestos ocupen la calzada | T33f | San Jacinto separado por su calle; las cuadras verificadas existen en 1772; plazas y pasajes históricos se conservan | 🔄 #69 |
| T33h | **Frentes y medianeras exactos**: repartir las cuadras convexas por sus lados sin rasterizar y dilatar cada lote | T33g | casas contiguas sobre una misma recta, esquinas sin dientes ni solapes; excepciones cóncavas conservadas | 🔄 #70 |
| T33i | **Frentes junto a monumentos**: comprobar las alas construidas antes de suprimir una casa cuyo solar toca un hito | T33h | la Catedral no borra la fachada opuesta por tocar su solar; se conserva la supresión de cubiertas que sí se superponen | 🔄 #71 |
| T33j | **Auditoría integral y corrección de 1772**: [plan detallado](08-auditoria-y-correccion-1772.md); primero censar todo el original y contrastar cada calle, manzana y frente; después corregir por capas en PRs apilados | T33i | fases 1–8 verificadas; cobertura completa, defectos confirmados resueltos, excepciones históricas conservadas y código/datos publicados comprobados | 🔄 Plan #74 integrado; auditoría en curso |
| T33j.1a | **Base de auditoría 1772 y primer lote**: [inventario](auditoria-1772/README.md), hashes, evidencia reproducible y controles de calce | T33j (plan #74) | código/datos fijados; controles independientes y residuos por sector documentados; primer lote trazable | 🔄 #75; base fijada, calce pendiente |
| T33j.1b | **Censo completo sobre el original de 1772**: completar los 16 sectores, calles, manzanas y frentes, incluidas excepciones | T33j.1a | 100 % del área censada, todas las unidades clasificadas y defectos con evidencia; incertidumbres explícitas | 🔄 #76: barrido 16/16; 271 unidades provisionales localizadas; calles y censo detallado pendientes |
| T33j.1c | **Contrastar calce y censar calles**: reconciliar referencias y completar tramos/frentes | T33j.1b | Cruces con procedencia y discrepancias medidas; calles del original enlazadas al censo; límites explícitos | 🔄 #77: 23 cruces y 32 tramos del núcleo; discrepancia máxima 96,162 m; 292 registros clasificados (1 descartado, 1 parte de otro); calles restantes y accesos pendientes |
| T33j.1d | **Trazar la red del original**: [ejes y división entre cruces](auditoria-1772/trazado-red.md), conservar excepciones y preparar enlace de frentes | T33j.1c | trazado contrastado por sectores, tramos referenciados y controles reproducibles; incertidumbres explícitas | 🔄 #78: 84 líneas, 455 tramos candidatos; frentes y accesos pendientes |
| T33j.1e | **Diagnosticar geometría generada**: medir huellas por época y rastrear defectos hasta la etapa de origen | T33j.1d | detector probado, entrada identificada y causas/localizaciones reproducibles sin confundir huella con cubierta | 🔄 #79 integrado: 1811 huellas medidas; I001/I003 localizadas antes del visor; frentes y accesos aún pendientes |
| T33j.1f | **Enlazar frentes del original**: caras candidatas, IDs persistentes y cobertura explícita | T33j.1e | relaciones trazables calle–frente–unidad; excepciones y pendientes conservados | 🔄 #80 integrado: 147 caras únicas, 590 bordes; 145 registros sin asignación única; ocupación por frente y accesos pendientes |
| T33j.1g | **Contrastar unidades y rastrear ausencias**: barrido de huellas en los 16 sectores y decisión temporal en seis unidades | T33j.1f | 292 registros trazables, calce e hitos diferenciados, causa temporal reproducible y pendientes explícitos | 🔄 #80 integrado: 94 cajas con intersección, 198 sin ella; 138 registros temporales medidos; no equivale a 198 omisiones |
| T33j.1h | **Leer ocupación por borde**: distinguir frentes, cuerpos retirados y vacíos del original | T33j.1f | Lecturas por ID contrastadas visualmente, límites y casos pendientes explícitos | 🔄 #81 integrado: 590 bordes de 147 unidades leídos; 574 clasificados por rojo, 6 con contorno por revisar, 6 con símbolos pendientes y 4 de plaza; sin cambios en el generador |
| T33j.1i | **Inspeccionar unidades edificadas sin cara única**: bordes de ribera, caminos oblicuos y conjuntos especiales | T33j.1h | Cada registro revisado tiene observación de contorno y decisión explícita, sin generar por caja | 🔄 #82 integrado: 78 unidades inspeccionadas; geometría y correspondencia pendientes |
| T33j.1j | **Contrato auditable de referencia histórica**: IDs de cruces compartidos y exclusión de candidatos | T33j.1i | Validador rechaza contradicciones y no habilita ninguna unidad pendiente | 🔄 #83 integrado: 23 nodos, 10 unidades pendientes; sin integración al generador |
| T33j.1k | **Completar lectura individual del censo original**: terrenos libres, cuerpos aislados y descartes | T33j.1j | 292 registros cubiertos sin duplicados por las tres lecturas; límites de cobertura explícitos | 🔄 #84 integrado: 67 registros adicionales; fase 1 aún abierta |
| T33j.1l | **Medir cruces 3D de cubiertas**: separar corte estricto de solape proyectado y rastrear origen | T33j.1k | Resultados reproducibles con altura histórica y relieve; límites y evidencia visual explícitos | 🔄 #85 integrado: 271 pares medidos; cuatro rastreados, dos vistas oblicuas inspeccionadas |
| T33j.1m | **Contrastar continuidad y colisiones de calles**: núcleo curado y red candidata separados | T33j.1l | 32 ejes, 64 recorridos y 470 tramos registrados con límites de evidencia y casos de colisión | 🔄 #86 integrado: C0031 requiere revisión geométrica, I010 sigue abierto |
| T33j.1n | **I006: separar conteos del paquete y del origen**: corregir trazabilidad del manifiesto sin cambiar geometría | T33j.1m | Conteos publicados medidos en binarios; controles de 1936 conservados; regresión y verificación de baseline | 🔄 #88 integrado; pendiente publicación de datos |
| T33j.1o | **Validación visual sin carrera de carga**: esperar casas antes de medir el alfa de cubiertas | T33j.1n | La prueba retiene el pak, espera su malla y conserva las aserciones de techo | 🔄 #104; validado, pendiente revisión |
| T33j.1p | **Resolver bordes especiales del original**: pentágono U0013, recodo U0069 y seis símbolos religiosos | T33j.1h | Doce lecturas revisadas con evidencia; contornos observados separados de candidatos y sin habilitar generación | 🔄 #105; doce bordes revisados, pendiente revisión |
| T34 | Árboles 3D desde `arboles.json` (5.926) y los patios con vegetación, en color | — | árboles en plazas, patios y quebradas | ✅ #19 |
| T35 | Luz y acabado: sombras, luz tibia y sombra azulada, bruma, contorno por profundidad y grano de papel en tinta | — | el look de grabado de `specs/04` | ✅ #38 |
| T35b | **Tinta afinada** contra el original: la sombra en el piso es un rayado grueso y casi negro (en paredes y techos, más liviano); el contorno no marca las aristas entre las alas de un mismo tejado (id del techo en el alfa del cuadro, sin otra pasada) y se afloja antes con la distancia | T35 | montajes «baires · #38 · ahora» (cenital, oblicua, cerca, barrio): el centro de 1936 se lee por casas, no por alas; tiempo por cuadro como en T35 | ✅ #40 |
| T36 | **Color sin rótulos**: máscara de la tinta del plano que es letra, cifra o símbolo (`tools/geo/rotulos.py` → `plano/rotulos.webp`); en color, ahí el plano no se marca | T07 | en color no se leen "PALACIO FEDERAL", las cotas ni las letras de parroquia; los bordes de manzana siguen | ✅ #28 |
| T37 | Lotes rectos: cada manzana se parte en solares rectangulares perpendiculares a su calle (antes, cuñas que se juntaban en el centro) | T04 | en el centro los techos son tiras rectas, sin abanicos | ✅ #26 |
| T38 | **El valle antes de la ciudad**: lo urbanizado por época (`crece.png` G) y el monte (B); en color, lo que la época todavía no urbanizó es campo sin el dibujo del plano; árboles silvestres que mueren al urbanizarse su lugar; plazas sin jardín ni árboles antes de 1889 | T24, T34 | en 1578 se ve una aldea de 25 manzanas en un valle de sabana, con sus quebradas, el Guaire y el Ávila, sin manzanas ni calles fantasma | ✅ #27 |

## Fase 4 · Contenido

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T40 | Hitos modelados I: el marco de los hitos (`src/hitos.js`) y la **Plaza Bolívar** por épocas (mercado → plaza ajardinada con la estatua); después Catedral, Capitolio, Panteón, Santa Capilla, San Francisco, Teatro Municipal (plantas desde el plano de 1936, alturas desde fotos) | T24 | la plaza y 6 edificios con nombre, cada uno en sus años | ✅ #31 (marco y plaza) · #32 (Catedral, San Francisco, Santa Capilla, Panteón) · #33 (Capitolio) · ⏳ falta el Teatro Municipal |
| T40a | Trinidad / Panteón: ruinas en 1843, fachada neogótica en 1889 y reformas de 1911 y 1936 | T40 | cuatro variantes excluyentes en el lienzo común, relieve, tinta/color y supresión desde 1843 | En revisión #87 |
| T41 | Hitos modelados II: Miraflores, Universidad, El Calvario, Caño Amarillo, Mercado Principal, Santa Teresa, Candelaria, Altagracia… | T40 | 8 edificios más | ✅ #32 (Santa Teresa, Altagracia, La Pastora) · #33 (Casa Amarilla, Universidad, Miraflores) · ⏳ faltan El Calvario, Caño Amarillo, Mercado Principal, Candelaria, Hotel Majestic |
| T41a | Sustituir Miraflores genérico por el modelo aprobado con cuatro accesos desde 1911, integrado al lienzo común | T41 | épocas, ubicación, relieve y tinta/color conservados; límites documentados | ✅ #46 |
| T41b | **El piso de los hitos sobre el relieve**: hoy queda plano a la altura de sus anclas (`src/hitos/material.js`), y donde el terreno sube, el relieve lo tapa: en 1772 el norte del piso de tierra del mercado de la Plaza Bolívar no se ve. Lo encontró la muestra de datos (T12), que trae el relieve real | T41a, T12 | con el relieve, el mercado se ve entero; `hitos.spec.js` deja de marcarlo como falla conocida | ⏳ |
| T42 | Marcas (etiquetas 3D por época, niveles, declutter, velo al pasar el mouse) | T25 | las marcas cambian con el año | ✅ #39 |
| T43 | Fichas con fotos de época (Commons, autor, fecha, licencia) y visor de fotos | T42 | cada marca abre su ficha con fotos acreditadas | ✅ #43 |
| T44 | Intro y "Acerca": qué estás viendo, la Caracas de cada época, fuentes y créditos (incluida la inspiración de @mormonnegro) | T25 | intro con todas las fuentes y licencias | ✅ #44 |

## Fase 5 · Lo de hoy y el buscador

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T50a | "Lo de hoy", datos: calles, vías y agua de OSM rasterizadas sobre el plano (usa `geo1936.py`) → `hoy-lejos/cerca.webp`, `calles.bin/json` | T20 | desfase con las calles de 1936 < 10 m en el centro (QA) | ✅ #16 |
| T50b | "Lo de hoy", visor: estampa en rojo con H, leyenda © OpenStreetMap | T50a | con H se estampa en rojo la Caracas actual | ✅ #18 |
| T51 | Nombres de las calles de hoy en un canvas 2D sobre la vista | T50a, T50b | etiquetas alineadas, sin choques | ✅ #22 |
| T52 | **Esquinas**: leer del plano de 1936 los nombres en rojo de cada cruce (OCR asistido + curado) → diccionario esquina → píxel | — | ≥ 90 % de las esquinas del centro con nombre verificado | ✅ #14 |
| T53 | Buscador: "de esquina a esquina" con el diccionario + Nominatim para direcciones modernas, con respuesta en prosa | T51, T52 | "De La Torre a Veroes" ubica en el plano | ✅ #41 |

## Fase 6 · Recorridos

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T60 | A pie: primera persona, colisiones con las casas, sobre el relieve | T21 | se camina por el centro sin atravesar paredes | ✅ #61 |
| T61 | En avión: vuelo sobre el valle, Q/E cambian de época | T25 | se sobrevuela el Ávila | ✅ #62 |
| T62 | Manejar: vehículos de cada época (carreta, coche de caballos, tranvía, Ford T) con sonido por WebAudio | T60 | se maneja el vehículo del año elegido | ✅ #63 (sin tranvía: va por rieles) |
| T62b | El **tranvía** de manejar: va por rieles (el trazado de las líneas, de las fuentes) en vez de andar libre por las calles | T62 | el tranvía sigue su línea en su época | ⏳ |
| T60b | A pie, el **camino entero**: como en manejar (#63), revisar los choques a lo largo del paso y no solo en el destino (con cuadros lentos, corriendo se puede atravesar una casa delgada) | T60 | test del paso largo que no atraviesa una casa | ⏳ |

## Fase 7 · Cierre

| ID | Tarea | Depende de | Listo cuando | Estado |
|---|---|---|---|---|
| T70 | Responsive y modo liviano: paneles en el teléfono, gestos, rendimiento en gama media | T25 | 30 fps o más en un teléfono de gama media | ✅ #58 |
| T71 | `edificios.html`: la ciudad edificio por edificio (scrollytelling) | T43 | recorre todos los hitos | ✅ #64 |
| T72 | Accesibilidad (WCAG 2.2 AA en la interfaz) y SEO básico | T44 | auditoría sin errores graves | ✅ #59 |
| T73 | **Publicación** en GitHub Pages (grunch.github.io/caracas): build en cada push a `main`, con los datos bajados del release `datos-*` (`npm run datos:bajar`) | la decisión de derechos (tomada por el responsable) | el sitio está en línea | ✅ #50 (caracas.city) |
| T74 | **Entrada** como la de baires: la hoja desde arriba se pone en color, la ciudad se levanta en una ola que se apura y la cámara baja volando al centro (`src/arranque.js`) | T25 | al abrir el sitio, sin tocar nada, se llega a la ciudad en pie | 🔄 #67 |
| T80 | **Épocas posteriores a 1936** (años 40–50): calzar el plano de 1950, extender el área si hace falta y usar las referencias con `epocas_futuras` de `fuentes/imagenes/` | T25 | una época más en la línea de tiempo | ⏳ (idea; no priorizada) |

## Riesgos que el plan vigila

- **Derechos**: nada se publica (T73) sin la revisión del responsable; cada fuente conserva su licencia en `ficha.json`.
- **Datos fuera de git**: sin T11 y T12, un cambio en el pipeline puede romper el sitio sin que ningún test lo vea.
- **Conflictos en `src/material.js` y `src/main.js`**: varias tareas los tocan; conviene separar el shader en módulos (vértice, suelo, fachadas) dentro de T35 o antes, si los conflictos se repiten.
- **Rendimiento**: 34 mil casas con fachadas procedurales; medir en cada tarea de la fase 3.
