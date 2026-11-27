# Comparación del Nuevo Circo (1936)

Mismo equipo y datos, build servido con `vite preview`. Base `d9d8de9`, rama
con el modelo y plataforma de `1e6f749`. Script del repo
`tests/e2e/medir-rendimiento.mjs --epoca 1936 --salida …`, copia local con un único
ajuste instrumental: timeout de navegación de Playwright a 180 s para permitir
la segunda visita en SwiftShader. No cambia lo que se mide ni los presupuestos.
El primer intento con 30 s agotó ese timeout; se conservaron las ejecuciones completas.

| Medida | main | Rama |
|---|---:|---:|
| Casas listas (ms) | 12466 | 12470 |
| Mayor tarea del hilo principal (ms) | 826 | 949 |
| Descarga inicial (bytes) | 17957098 | 17960210 |
| Heap observado (MB) | 307 | 133 |
| Triángulos en vista centro | 3170015 | 3195047 |

Salidas íntegras: [main](main.json), [rama](rama.json). El incremento de descarga
es 3112 bytes y la vista central suma 25032 triángulos efectivos (incluye la
supresión de casas del solar, no es el recuento aislado del modelo).

**No es una certificación de rendimiento.** Las dos ejecuciones superan los
límites de carga, tarea larga, descarga y triángulos del presupuesto general.
La mayor tarea aumenta 123 ms; no se descarta como ruido ni se eleva su límite.
Puede requerir perfilado adicional. El heap depende del momento de recolección:
la diferencia no demuestra una optimización. Una ejecución por variante no mide
la dispersión. Sin GPU no se mide tiempo por cuadro ni FPS.

El ajuste de presupuesto del PR afecta solo al tamaño del build: 335,1 kB de
entrada, máximo 336; worker 156,1 bajo 160. No cambia límites de tiempo o memoria.
