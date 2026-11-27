# La Rotunda / La Concordia: mediciones de integración

Base: main `3d0b58a`, medida usando el checkout `5166c22`, cuyo árbol es idéntico al de ese merge. Rama inicial: `d6b63ea`. La medición final distingue el ajuste que elimina el pavimento duplicado de los patios y conserva el suelo verde del visor.

Comando: `node tests/e2e/medir-rendimiento.mjs http://127.0.0.1:PUERTO/ --epoca 1946 --salida ARCHIVO`. Builds de producción servidos con Vite preview, direcciones IPv4 explícitas, misma copia de datos. Las mediciones se ejecutan secuencialmente, sin pruebas ni capturas en paralelo. SwiftShader: no se mide GPU física, FPS ni tiempo por cuadro.

`base.json` conserva la salida completa. La base registra 12.745 ms hasta casas listas, tarea máxima de 948 ms, descarga inicial de 17.961.677 bytes, heap de 215 MB y 169,9 MB de geometría en JS. La vista central registra 3.831.203 triángulos y 90 llamadas. Supera los presupuestos generales de carga, tarea máxima, descarga y triángulos; esos límites no se elevan.


## Comparación final

Rama final: código de `2f68b19`, medido después de retirar los discos duplicados del patio.

| Medida | Base | Rama final | Diferencia |
|---|---:|---:|---:|
| Casas listas (ms) | 12745 | 13787 | +1042 |
| Tarea máxima (ms) | 948 | 693 | -255 |
| Descarga inicial (bytes) | 17961677 | 17964475 | +2798 |
| Heap observado (MB) | 215 | 228 | +13 |
| Geometría JS (MB) | 169.9 | 177 | +7.1 |
| Triángulos, centro | 3831203 | 3858375 | +27172 |
| Llamadas, centro | 90 | 90 | +0 |

Las casas tardan 1.042 ms más (+8,2 %) en esta muestra. No se atribuye automáticamente al ruido ni se presenta como mejora: el cambio añade geometría y cinco terrazas al shader frente a cuatro de la base. La tarea máxima baja de 948 a 693 ms, mientras la primera medición de rama (`rama.json`, antes de retirar los pavimentos) registró 1.135 ms. Esta dispersión impide atribuir causalmente la diferencia de tiempos a una operación concreta sin perfilado adicional. Se conservan las tres salidas, sin seleccionar solo la favorable.

La descarga inicial aumenta 2.798 bytes; el heap observado aumenta 13 MB. Las diferencias de heap dependen de GC y no prueban por sí solas una fuga. No se modifican los límites generales de ejecución: ambas variantes superan los de carga, tarea máxima, descarga y triángulos. No hay medición de GPU física ni FPS.

El build final mide **339,2 kB gzip de JS inicial**, frente al límite anterior de 337. La incorporación de ambos modelos se registra explícitamente con un nuevo límite de **340 kB**. Los workers miden **159,5 kB**, dentro de su límite de160; servicio1,3 kB, dentro de3. No se elevan esos otros límites.

Geometría aislada: Rotunda23.860, solar12, Concordia4.332 triángulos. Total de hitos1.041.289 (+28.204 sobre1.013.085); etapas anteriores a1946:561.916. La diferencia de triángulos de escena incluye también casas suprimidas y visibilidad. Los modelos usan la malla compartida, pero no se presupone que eso mantenga las llamadas de toda la escena constantes.
