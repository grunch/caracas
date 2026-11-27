# Metropolitano: comparación de rendimiento en 1936

Build de main **ffaec48** frente a la rama **0f8188b**, mismos datos y equipo.
Ejecuciones secuenciales con `vite preview`, URLs explícitas 127.0.0.1:5233 y
127.0.0.1:5234. Script `tests/e2e/medir-rendimiento.mjs --epoca 1936 --salida …`,
copia instrumental con timeout de navegación 180 s y ruta de importación
adaptada a `.cache/`; no cambia métricas ni presupuestos.

Una primera ejecución en `localhost:5231` encontró otro servidor de desarrollo
por IPv6: se descartó completa junto con sus capturas. Los JSON aquí conservados
son de los builds: pedidos a `/assets/`, no a `/node_modules/`.

| Medida | main | Rama | Diferencia |
|---|---:|---:|---:|
| Casas listas (ms) | 14406 | 13262 | -1144 |
| Mayor tarea principal (ms) | 752 | 751 | -1 |
| Descarga inicial (bytes) | 17960213 | 17961358 | +1145 |
| Heap observado (MB) | 326 | 326 | 0 |
| Geometría JS (MB) | 93,5 | 96,8 | +3,3 |
| Triángulos, vista centro | 3195047 | 3206996 | +11949 |
| Llamadas, vista centro | 98 | 100 | +2 |

Salidas completas: [main](main.json), [rama](rama.json).

El hito añade 13.662 triángulos; la diferencia de la vista incluye casas
suprimidas, visibilidad y demás geometría de escena. El adaptador usa la malla
compartida de hitos, pero eso no implica que las llamadas de toda la escena
permanezcan constantes: la medición central aumenta dos.

No se declara una mejora de carga a partir de una muestra por variante. Ambas
superan los presupuestos generales de carga, tarea larga, bytes, heap y
triángulos; no se elevan esos límites. El heap depende de la recolección de
basura. SwiftShader, sin GPU: no se miden FPS ni tiempo por cuadro.

Build: 336,1 kB iniciales, máximo explícito 337; workers 157,2 kB, máximo160.
El aumento de geometría tiene límites explícitos en los tests: 538.210 triángulos
para fases anteriores a 1946 (<540.000), 1.013.251 total (<1.020.000).
