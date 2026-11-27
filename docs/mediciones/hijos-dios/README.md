# Hijos de Dios: comparación de rendimiento

Comparación de `main` en `d99e17d` (incluye San Agustín) con la rama de esta tarea (`81a17ae` y ajuste de topes). Mismos datos, build de producción, Playwright, Chromium con SwiftShader, viewport 1280×800 y época 1946. Se alternó el orden: rama→base y base→rama. El instrumento local cambió solo la segunda navegación a `waitUntil: 'commit'` y mantuvo el timeout de espera del hito; el archivo del instrumento no forma parte del cambio de producto. Las mediciones no se ejecutaron a la vez que pruebas ni capturas.

| Métrica | base 1 | rama 1 | base 2 | rama 2 | Media base | Media rama | Diferencia media |
|---|---:|---:|---:|---:|---:|---:|---:|
| Casas listas (ms) | 13.283 | 14.226 | 13.210 | 13.865 | 13.247 | 14.046 | +799 ms (+6,0 %) |
| Tarea principal más larga (ms) | 892 | 790 | 706 | 897 | 799 | 844 | +45 ms |
| Descarga inicial (bytes) | 17.966.289 | 17.968.507 | 17.966.289 | 17.968.507 | 17.966.289 | 17.968.507 | +2.218 |
| Heap observado (MB) | 228 | 228 | 228 | 228 | 228 | 228 | 0 |
| Geometría JS (MB) | 180,3 | 184,6 | 180,3 | 184,6 | 180,3 | 184,6 | +4,3 |
| Triángulos, centro | 3.870.942 | 3.886.606 | 3.870.942 | 3.886.606 | 3.870.942 | 3.886.606 | +15.664 (+0,4 %) |
| Llamadas, centro | 90 | 90 | 90 | 90 | 90 | 90 | 0 |

Las salidas completas están en `base-1.json`, `rama-1.json`, `base-2.json` y `rama-2.json`. La carga de casas varió 73 ms entre muestras de base y 361 ms entre muestras de rama; la tarea máxima varió 186 ms y 107 ms, respectivamente. La comparación atribuye al conjunto del cambio la diferencia observada, sin afirmar causalidad de cada milisegundo. En SwiftShader no se mide FPS ni tiempo por cuadro en GPU física. El proyecto ya excede los presupuestos generales de carga, tareas, transferencia y triángulos en la base; estos límites de ejecución se mantienen intactos.

El hito aislado aporta 17.284 triángulos; el conjunto de hitos pasa a 592.022 triángulos históricos y 1.071.395 totales. El build combinado (San Agustín + Hijos de Dios) mide 343,2 kB gzip de JS inicial y 162,7 kB de workers. Se elevan explícitamente solo los topes de build a 344/163 kB; servicio (1,3 kB) y todos los presupuestos de ejecución quedan sin cambios.
