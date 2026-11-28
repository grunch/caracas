# Hallazgos prioritarios: implementación y límites

Trabajo iniciado desde los once hallazgos P1 del índice #242. Las correcciones de etiquetas
no se confunden con hitos tridimensionales terminados.

| Issue | Entregado en esta etapa | Pendiente |
|---|---|---|
| #250 | Hijos de Dios visible desde 1889 aunque clausurado; ficha con fuentes. Los dos cementerios instalados desde Miraflores (#287, #288), marcas enlazadas y [cotejo del Sur con el plano de 1946](../cementerio-sur-integracion.md#cotejo-con-el-plano-de-1946) | Huella medida del Sur en 1889 y 1911 (los planos no cubren el sitio), su ampliación de 1946, portada, y estado de abandono de Hijos de Dios por fecha: [qué falta](../cementerio-sur-integracion.md#qué-falta) |
| #257 | Metropolitano presente en 1911/1936 y ausente en 1946; ficha. Los dos circos instalados desde Miraflores con su solar medido (#283, #284) | Año exacto de demolición del Metropolitano (1942 o 1945) con fuente primaria; alturas, colores y reformas interiores con evidencia medible |
| #258 | La Rotunda (1889, 1911), su solar (1936) y La Concordia (1946) instalados desde Miraflores (#285) | Cuándo terminó la ampliación de 1881 y cuándo terminó el derribo de 1936 |
| #259 | Cuatro estudios separados y guías en Miraflores | Documentar las fachadas por fecha, fases tempranas e instalación |
| #264 | [Dossier de obras de 1946](1946-obras-y-proyectos.md), verificación de reserva UCV | Fechas y avance físico por bloque; no se inventan edificios completos |
| #268 | Plaza Bolívar desde 1843; continuidad del nombre sin adelantar jardín/estatua. [Matriz documental](../issue-268-trinidad-plaza.md) de la Trinidad y la plaza | Trinidad en obras en 1772: no se modela (decisión del responsable, 27-11-2026). Sin consultar: manuscrito de Martí y texto del acuerdo de 1842 |
| #269 | [Diagnóstico y contrato de red temporal](vialidad.md) | Digitalización y carga de seis redes; todavía no implementada |
| #272 | [Inventario de puentes y discrepancias](vialidad.md#puentes-del-guaire) | Anclajes históricos, estructuras, sustituciones y modelos |
| #276 | [Lectura del corredor Bolívar en el plano](1946-obras-y-proyectos.md#avenida-bolívar) | Lotes demolidos por fase, contraste aéreo |
| #277 | [Avenidas posteriores y predecesoras](vialidad.md#avenidas-posteriores) | Segmentos georreferenciados y control geométrico |
| #278 | [Etapas de autopistas](vialidad.md#autopistas-y-conexiones) | Segmentos, distribuidores y control geométrico |

## Miraflores, primero

El directorio hermano `../miraflores` contiene `prioridades.html`, nueve modelos,
exportador GLB, pruebas y `docs/integracion-caracas-prioridades.md`, más una guía por
modelo en `docs/prioridades/`. Ejecutar allí `npm run dev -- --port 5182` y abrir
`http://localhost:5182/prioridades.html`.

No se copian esos edificios al arranque de Caracas en este PR. La precisión de la
cronología y la precisión del alzado se registran por separado; `presente: null`
significa fase sin resolver, no desaparición del edificio. Los estudios con fachadas
modernas de referencia lo advierten expresamente.

## Qué cambió en Caracas

Se modifican marcas/fichas y se fusionan períodos contiguos del mismo nombre en la ficha.
El test A → A → B → A garantiza que no se borre un cambio real de denominación.
No cambian geometría, shaders ni datos generados; no requiere publicar un paquete `datos-*`.
La plaza de 1843 conserva el mercado y su suelo, sin estatua de 1874.

La fecha de desaparición del Metropolitano tiene referencias 1942/1945: ambas permiten
la corrección de presencia entre las seis épocas sin resolver artificialmente el año.
El cementerio Concepción del plano de 1889 se identifica como Hijos de Dios mediante
la fuente académica enlazada en su ficha, no solo por proximidad de la marca.

## Trinidad: límite explícito

Se conserva el alcance de #268 para 1772: haber iniciado el templo no permite dibujar
la fachada posterior. La geometría actual del Panteón empieza en 1843. Es necesario
cotejar recinto y obra en el [original PARES de 1772](https://pares.cultura.gob.es/ParesBusquedas20/catalogo/description/26112)
y obtener evidencia de alturas/fases antes de generar una variante constructiva.

Ese cotejo está en la [matriz documental de #268](../issue-268-trinidad-plaza.md): el plano marca la Trinidad
con el signo de las demás iglesias y una transcripción atribuida a la visita de Martí (2-8-1772) describe un
templo abovedado con las torres sin concluir, pero no hay alzado ni alturas. El responsable decidió el
27-11-2026 no modelar esa fase: el hito sigue naciendo en 1843.

Todos los issues siguen abiertos si sus criterios incluyen geometría o investigación pendiente.
Las filas de #250, #257 y #258 se pusieron al día el 28-11-2026 con lo ya fusionado; el detalle de cada una
está en su guía (`docs/cementerio-sur-integracion.md`, `docs/hijos-dios-integracion.md`,
`docs/metropolitano-integracion.md`, `docs/nuevo-circo-integracion.md`, `docs/rotunda-concordia-integracion.md`).

## Coste y dependencias comprobados

Build gzip: main **330,0 kB** iniciales, rama **331,3 kB**. Se amplía explícitamente
el límite de 330 a **332 kB** por los textos/fuentes y el agrupador; workers 153,4 kB
y service worker 1,3 kB no cambian. No es una mejora de rendimiento ni una medición de FPS.

El aviso `datos:al-dia` detecta `marcas-datos.js` por archivo completo. Se compararon
los IDs consumidos por `tools/fotos.mjs` y las salidas de `plazasDeEpoca` consumidas
por ambos generadores de suelo entre main y rama: idénticos en las seis épocas.
Por eso no hace falta publicar un paquete distinto de suelo/fotos para este cambio.
