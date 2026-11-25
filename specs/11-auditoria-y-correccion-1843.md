# Auditoría y corrección integral de Caracas en 1843

Estado: plan del 24 de noviembre de 2026 (T81). Sin fases cerradas.

Este documento repite para 1843 la auditoría de 1772 ([08](08-auditoria-y-correccion-1772.md)). **Valen las fases, los criterios de salida, las fichas de incidencia, las reglas para que una fase no deshaga otra y el flujo de PRs apilados de 08**; aquí se escribe solo lo que cambia en 1843 y el estado de cada fase. Donde este documento calla, manda 08 con «1843» en lugar de «1772».

## Objetivo y autoridad de las fuentes

Reproducir la red de calles, las manzanas, los lotes especiales (iglesias, conventos, plazas, edificios públicos) y la extensión de lo urbanizado del [plano de Jesurún de 1843](../fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler/), conservando sus excepciones. El original manda para el trazado y la extensión; el plano de 1936 y OSM solo apoyan el calce. Las demás copias del mismo plano ([Commons](../fuentes/mapas/1843-commons-jesurun/), [guiaccs con sello](../fuentes/mapas/1843-guiaccs-jesurun-con-sello/)) sirven para leer lo que el facsímil no deja leer, sin reemplazarlo.

Escaneo base: el facsímil litográfico de la NYPL (Lit. de Müller & Stapler, lámina No. 16), 7216 × 5412 px, RGB. Es el que calza hoy la época 2 (`tools/geo/gcp/calce-1843-nypl-jesurun-facsimil-muller-stapler.json`).

## Qué cambia respecto de 1772

| Tema | 1772 (*Exato mapa*) | 1843 (Jesurún) |
|---|---|---|
| Orientación | Poniente arriba | Norte arriba (rosa de los vientos en el plano) |
| Ocupación | Rojo = edificado, amarillo = solar, por sectores de manzana | **Manzana entera rayada**: el plano no dibuja patios ni solares. El tipo de rayado identifica la **parroquia** (leyenda PARROQUIAS: Catedral, San Pablo, Altagracia, Candelaria, Santa Rosalía, San Juan), no la ocupación. Lotes en blanco con letra: iglesias y puntos notables; plazas en blanco; huertas y estancias punteadas o con árboles |
| Identidad de los cruces | Contada a mano desde Las Monjas (damero) | **Esquinas numeradas 1–136 con su nombre** en la leyenda «Nombres de las Esquinas»; el número va impreso dentro de la manzana, junto a su esquina. Calles con nombre: 16 de norte a sur, 17 de este a oeste |
| Cuadrícula de referencia | Ninguna | Cuadrícula impresa de columnas 1–16 y filas 1–17 sobre todo el plano |
| Leyenda | Sin transcribir | Iglesias A–T, puntos notables a–z, puentes a–h, ríos U–Y, parroquias |
| Casas en el sitio | Reconstrucción propia de 1772 (referencia curada) | Las casas de 1936 cuya huella cae en lo rayado de 1843 calzado (`tools/geo/epocas.py`); las de la reconstrucción de 1772 ceden a 1936 desde 1843 |

Consecuencias:

1. **Calce por identidad desde el primer día.** Cada esquina numerada del original se empareja por su nombre con el diccionario de esquinas de 1936 (`tools/geo/esquinas/1936-esquinas.json`); solo los nombres que se conservan y no son ambiguos sirven de ancla. El calce vigente es por correlación (56 GCP, LOO RMS 13,3 m): en un damero periódico ese método se engancha a la calle vecina (hallazgo de [controles-damero.md](auditoria-1772/controles-damero.md)); se mide antes de usarlo.
2. **La unidad del censo es la manzana** (U1843) con su contorno, sus cuatro frentes y sus lotes especiales. La ocupación se clasifica como `rayada` (urbanizada), `lote_especial` (blanco con letra), `plaza`, `huerta` o `terreno_libre`, más `parte_de_otra_unidad` y `descartada_no_edificacion` como en 1772. «Rayada» no dice qué parte de la manzana está edificada: el sitio la llena con las casas de 1936 que caben en ella y eso se audita como reconstrucción, no como dato.
3. **Los sectores son una rejilla regular de 5 × 5 sobre el marco del mapa** (S1843-‹fila›‹columna›, fila 1 al norte), con 60 px de solape de lectura (`auditoria-1843/sectores.json`). La cuadrícula impresa del plano no se usa para los sectores mientras sus líneas no estén medidas (decisión por delegación del responsable, 24-11-2026).
4. **Las diferencias con 1936 son la materia de la corrección**: calles abiertas después de 1843 que hoy cortan una manzana de 1843, manzanas que 1843 no tiene, lotes especiales ocupados por casas genéricas, ensanches y quebradas. Donde la ciudad de 1936 no puede representar 1843, hace falta referencia propia (como la de 1772 en sus fases 2 y 3).

## Decisiones del responsable (24-11-2026)

1. Se heredan los criterios de 1772: el LOO de un sector con al menos 2 anclas cuenta como control independiente; tolerancias de 15 m (desvío mediano del calce por sector) y 0,5 m (fachada sobre su recta); el vuelo del alero se topa junto a la calzada; como fachada de un frente cuentan solo las casas de la manzana que lo arma.
2. Los **límites documentados** (lo que no cumple sin ampliar la tolerancia) los registra quien ejecuta la auditoría, con fecha, motivo, evidencia y la huella de lo medido, en el JSON de límites de la fase; el límite sigue visible en su puerta.
3. Los datos se publican (`npm run datos:publicar`) al cerrar cada fase con las suites verdes.
4. El escaneo base es el facsímil de la NYPL.
5. Las decisiones que en 1772 esperaban al responsable las toma quien ejecuta, eligiendo la que recomendaría, y quedan escritas aquí o en el JSON de la fase como «decisión por delegación del responsable», con fecha.

## Fases

Mismo orden y mismos criterios de salida que 08. Evidencia en `auditoria-1843/`. IDs: `S1843-…` sectores, `U1843-…` manzanas, `C1843-…` tramos de calle, `F1843-…` frentes, `E1843-…` esquinas numeradas del original (`E1843-034` es la esquina 34 de la leyenda), `I1843-…` incidencias, `B1843-…` baselines.

| Fase | Trabajo propio de 1843 | Estado |
|---|---|---|
| 0. Preparación | Este plan; herramientas de 1772 que se reutilizan, parametrizadas por época solo cuando una fase las necesita, con la prueba de que los JSON de 1772 se regeneran idénticos | En curso |
| 1. Inventario | 1A baseline y calce por identidad con las esquinas numeradas; 1B censo por sectores de manzanas, tramos y frentes; 1C incidencias; 1D puerta de salida y subtareas | Pendiente |
| 2. Referencia | Red y manzanas de 1843 con procedencia; lotes especiales con su letra de la leyenda | Pendiente |
| 3. Calles y manzanas | Ninguna casa sobre una calle de 1843; calles de 1843 presentes; calles posteriores sin cortar manzanas de 1843 | Pendiente |
| 4. Ocupación | Cada manzana rayada con casas; lotes especiales, plazas y huertas sin casas genéricas; hitos sin dobles edificios | Pendiente |
| 5. Alineación | Como 08 sobre lo que se ve en 1843 | Pendiente |
| 6. Cubiertas | Como 08 | Pendiente |
| 7. Cierres y accesos | Como 08 | Pendiente |
| 8. Verificación | Censo final contra el original, revisión visual, sitio publicado con su pareja código/datos | Pendiente |

## Trabajo en paralelo

Las fases son secuenciales (PRs apilados), pero el trabajo de lectura dentro de una fase se reparte por sectores: cada lector escribe su propio archivo de sector y una puerta calculada los junta. La lectura de un sector no se da por buena sin su recorte con SHA-256. Son independientes de las fases y salen de `main`:

- **Leyenda de 1843**: transcribir iglesias, puntos notables, puentes, ríos, esquinas y calles, y cotejar con las marcas y fichas de la época 2 (hoy «sin cotejar con la leyenda»).
- **Supresión de los hitos** (`pisaLaZona`): revisarla a ojo en 1843, pendiente desde la fase 4 de 1772.

## Subtareas

Se crean al cerrar la entrega 1D, como en 08, con su incidencia, archivos, prueba y dependencia.
