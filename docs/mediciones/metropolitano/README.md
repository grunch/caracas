# Metropolitano: comparación de rendimiento en 1936

Build de main **ffaec48** frente a la rama **d1bf74f**, mismos datos y equipo.
Ejecuciones secuenciales con `vite preview`, URLs explícitas 127.0.0.1:5233 y
127.0.0.1:5234. Script `tests/e2e/medir-rendimiento.mjs --epoca 1936 --salida …`,
copia instrumental con timeout de navegación 180 s y ruta de importación
adaptada a `.cache/`; no cambia métricas ni presupuestos.

Una primera ejecución en `localhost:5231` encontró otro servidor de desarrollo
por IPv6: se descartó completa junto con sus capturas. Los JSON aquí conservados
son de los builds: pedidos a `/assets/`, no a `/node_modules/`.

| Medida | main | Rama | Diferencia |
|---|---:|---:|---:|
| Casas listas (ms) | 14406 | 12424 | -1982 |
| Mayor tarea principal (ms) | 752 | 944 | +192 |
| Descarga inicial (bytes) | 17960213 | 17961455 | +1242 |
| Heap observado (MB) | 326 | 307 | -19 |
| Geometría JS (MB) | 93,5 | 96,9 | +3,4 |
| Triángulos, vista centro | 3195047 | 3207512 | +12465 |
| Llamadas, vista centro | 98 | 100 | +2 |

Salidas completas: [main](main.json), [rama](rama.json).

El hito añade 13.662 triángulos; la diferencia de la vista incluye casas
suprimidas, visibilidad y demás geometría de escena. El adaptador usa la malla
compartida de hitos, pero eso no implica que las llamadas de toda la escena
permanezcan constantes: la medición central aumenta dos.

No se declara una mejora de carga a partir de una muestra por variante. Ambas
superan los presupuestos generales de carga, tarea larga, bytes, heap y
triángulos; no se elevan esos límites. La mayor tarea empeora 192 ms; no se descarta como ruido ni se eleva su
límite. Hace falta perfilado adicional para atribuir el tiempo a una operación
concreta. El heap depende de la recolección de basura; su reducción no demuestra
una optimización. SwiftShader, sin GPU: no se miden FPS ni tiempo por cuadro.

Build: 336,3 kB iniciales, máximo explícito 337; workers 157,4 kB, máximo160.
El aumento de geometría tiene límites explícitos en los tests: 538.210 triángulos
para fases anteriores a 1946 (<540.000), 1.013.251 total (<1.020.000).

## Repetición con orden inverso, tras la corrección del acceso

El 27-11-2026 se repitió secuencialmente **rama 37621f0 → main ffaec48**, sin
pruebas ni otro benchmark concurrente. Se conservan los primeros JSON y se
agregan `rama-inversa.json` y `main-inversa.json`; la primera pareja corresponde
al modelo previo al paso abierto, por lo que no constituye una repetición exacta
del mismo commit. La segunda pareja compara el modelo final con la misma base.

| Medida | main inversa | Rama inversa | Diferencia |
|---|---:|---:|---:|
| Casas listas (ms) | 12686 | 12535 | -151 |
| Mayor tarea principal (ms) | 933 | 972 | +39 |
| Descarga inicial (bytes) | 17960213 | 17961676 | +1463 |
| Heap observado (MB) | 326 | 141 | -185 |
| Geometría JS (MB) | 93,5 | 96,8 | +3,3 |
| Triángulos, vista centro | 3195047 | 3207346 | +12299 |

En ambas parejas la rama tiene una tarea máxima mayor. La base varía de752 a933ms
y la rama de944 a972ms; con dos parejas no se separa causalmente el efecto del
orden, del cambio de geometría o del entorno. No se declara que el aumento sea
solo ruido. La segunda comparación acota la diferencia observada a39ms, pero no
sustituye un perfilado ni una muestra estadística amplia. El heap es especialmente
variable por GC y no se anuncia como mejora. Se mantienen los límites existentes.

Modelo final: **13.496 triángulos**, total **1.013.085**, fases anteriores a1946
**538.044**. La apertura reduce166 triángulos respecto de la versión anterior.
