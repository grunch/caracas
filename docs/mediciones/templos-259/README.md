# Medición de Santa Rosalía, San Juan y San José (#259)

28-11-2026. Build de `main` `09730ac` (`/disco/dev/caracas-templos-base`) frente al de la rama en `220804c` (la
geometría y los datos de los hitos no cambian después: los commits siguientes son tests, documentación y el merge
de `main`). Los dos sirven los mismos datos completos (`datos-2026-11-28-c5b8180`).

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --epoca 1946 --salida ARCHIVO` sobre `vite preview`
(puertos 5334 y 5333), en serie, dos pasadas por lado. SwiftShader, 1280 × 800: **no se midió el tiempo por
cuadro** (sin `--gpu` no dice nada).

**La máquina estaba cargada** (carga media de 45 a 51, por una regeneración de datos y otros agentes): los tiempos
no sirven más que para ver que no hay un salto. Con esa carga, la primera navegación no llegaba al evento `load`
en los 30 s por omisión de Playwright; se corrió una copia del script, fuera del repo, con una sola línea más
(`pagina.setDefaultNavigationTimeout(300000)`). Lo demás es el script sin cambios.

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia |
|---|---:|---:|---:|---:|---|
| casasMs | 30.456 | 27.073 | 30.645 | 32.991 | dentro del ruido de las dos pasadas (27–33 s con la máquina cargada) |
| tareaMasLargaMs | 4.442 | 4.589 | 2.148 | 3.320 | ruido |
| bytesAlAbrir | 17.918.728 | 17.918.728 | 17.921.355 | 17.921.355 | +2.627 |
| heapMB | 242 | 242 | 326 | 242 | la pasada de 326 no se repitió |
| Geometría en JS (MB) | 190,9 | 190,9 | 191,4 | 191,4 | +0,5 |
| Vértices | 5.064.316 | 5.064.316 | 5.071.276 | 5.071.276 | +6.960 |
| triangulosCentro | 3.909.074 | 3.909.074 | 3.911.627 | 3.911.627 | +2.553 |
| Llamadas en la vista centro | 90 | 90 | 90 | 90 | 0 |

Lo que no depende de la carga se repite exacto en las dos pasadas: 2.627 bytes más al abrir, 0,5 MB más de
geometría, 2.553 triángulos más en la vista del centro en 1946 (de los 4.747 de la malla, los que están en pie y
a la vista) y las mismas 90 llamadas de dibujo: los templos van en la malla única de los hitos.

Los topes de carga, tarea larga, bytes y triángulos del presupuesto ya no pasan en `main` con los datos completos
y siguen sin pasar en la rama: **no se tocaron**. Sí suben, medidos, el tope unitario de triángulos de los hitos
anteriores a 1946 (625.000 → 630.000, medido 625.293) y el de workers del build (170 → 172 kB, medido 170,8 contra
168,3 de `main`).

No se midió: tiempo por cuadro, GPU real, teléfono, ni una máquina en reposo.

Informes sin modificar: [base.json](base.json), [base-2.json](base-2.json), [rama.json](rama.json),
[rama-2.json](rama-2.json).
