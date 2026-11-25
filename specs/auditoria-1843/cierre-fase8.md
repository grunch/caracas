# Fase 8 de 1843: verificación integral y entrega (T81)

Fecha: 25-11-2026. Sitio publicado: `main` 09ba9f7 con `datos-2026-11-25-09ba9f7`. El manifiesto que sirve https://caracas.city/datos/manifiesto.json es byte a byte el que regenera `main` (SHA-256 `bc9d834da5ede864…`; conteos: 44505 techos, 37380 árboles).

## Qué cambió en 1843

| Medida | Antes de T81 (`datos-2026-11-24-9465608`) | Después |
|---|---|---|
| Calce: desvío mediano a las esquinas identificadas | 115,4 m | 4,4 m (LOO 12,5 m) |
| Casas a la vista en 1843 | 3252 | 10284 |
| Manzanas rayadas del original sin casas | 150 de 282 | 3 (pendientes de lectura) |
| Lotes especiales, plazas y terrenos libres aprobados con casas | 10 | 0 |
| Casas fuera de toda unidad del original | 230 | 22 (vivas desde 1772: límite) |

## Puertas, sobre los datos publicados

- **Fase 1** cerrable 7/7 ([cierre-fase1.json](cierre-fase1.json)), con la evidencia medida con el censo y el calce actuales.
- **Fase 2** cerrable 3/3 ([cierre-fase2.json](cierre-fase2.json)).
- **Fases 3 y 4** cerrables ([cierre-fases-3-4.json](cierre-fases-3-4.json)).
- **Fases 5 a 7** cerrables con límites ([cierre-fases-5-7.json](cierre-fases-5-7.json), [limites-fases-5-7.json](limites-fases-5-7.json)): 11 casas heredadas de 1936 y una manzana con el 74,7 % de frente continuo.
- **1772** da lo mismo que antes de T81: fases 3, 5 y 7 cerrables; la 4 (`hitos_sin_vacios_artificiales`) y la 6 (`mismo_trazado_que_la_fase_5`) no cierran, igual que en `main` antes de esta auditoría. Es una regresión previa, ajena a T81, que queda como tarea aparte.

Incidencias ([incidencias.json](incidencias.json)): I1843-001 a 004 corregidas y publicadas.

## Revisión visual

Hecha por Claude con capturas de Chromium headless (SwiftShader), no por una persona:

- **1843 en el sitio publicado** (sur, este y centro, cenital, en color): casco colonial con los frentes de manzana continuos y los patios adentro; plazas, huertas y lotes blancos libres; marcas en su lugar.
- **Hitos en pie en 1843** (`pisaLaZona`): Catedral, San Francisco, Altagracia, La Pastora, Casa Amarilla, convento de las Concepciones, Palacio Arzobispal y La Trinidad, en vista cenital y oblicua. Ninguna casa genérica dentro de un hito; con el relleno de frentes, la manzana de Altagracia ya no queda vacía.

## Lo que queda

- **Revisión de una persona sobre el sitio** (vista de calle, modos a pie, en avión y en coche en 1843). Los techos de 1843 no tienen puerta de triángulos: `tools/cubiertas.mjs` solo genera los de 1772.
- **Las 4 lecturas que siguen dudosas** del censo (U1843-0021, -0161, -0165 y la plaza U1843-0232). Están pendientes en la referencia y no entran al generador.
- **Rendimiento**: con las 5579 casas propias, la memoria sube de 391 a 441 MB (+13 %) y el tiempo de las casas un 9 %. El presupuesto de triángulos ya estaba al ras antes de T81.
- **Las puertas 4 y 6 de 1772** en `main`.

Este documento no certifica la fidelidad del mapa: cuenta lo medido y lo mirado.
