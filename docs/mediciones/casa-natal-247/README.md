# Medición de la Casa Natal (#247)

28-11-2026. `main` `b482621` (`/disco/dev/caracas-p2c-base`, puerto 5340) frente a la rama con la casa instalada
(puerto 5247). Los dos sirven los mismos datos completos (`/disco/dev/caracas-datos-sur/public`) con el servidor
de desarrollo de Vite, no con el sitio construido: los tiempos de carga incluyen los módulos sin empaquetar.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, en serie, dos
pasadas por lado. Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800. **Carga media de la máquina: de 15 a 37** (otros
agentes midiendo y capturando a la vez).

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia |
|---|---:|---:|---:|---:|---|
| casasMs | 7.845 | 12.276 | 5.202 | 6.466 | no comparable (carga) |
| tareaMasLargaMs | 779 | 734 | 391 | 508 | no comparable (carga) |
| bytesAlAbrir | 29.071.831 | 29.071.831 | 29.140.797 | 29.140.797 | +68.966 (módulos sin empaquetar ni comprimir) |
| heapMB | 273 | 273 | 326 | 273 | igual; el 326 no se repitió |
| Geometría en JS (MB) | 203,9 | 203,9 | 204,0 | 204,0 | +0,1 |
| Vértices | 5.216.364 | 5.216.364 | 5.217.050 | 5.217.050 | +686 |
| triangulosCentro | 8.609.375 | 8.609.375 | 8.609.167 | 8.609.167 | −208 |
| Llamadas en la vista centro | 236 | 236 | 236 | 236 | 0 |
| ms por cuadro, centro (mediana / p90) | 29,0 / 34,1 | 23,1 / 48,8 | 21,6 / 48,7 | 14,8 / 20,2 | no comparable (carga) |
| ms por cuadro, valle (mediana) | 33,2 | 28,6 | 21,5 | 18,4 | no comparable (carga) |
| ms por cuadro, cerca (mediana) | 17,3 | 12,0 | 16,3 | 24,3 | no comparable (carga) |

**Los tiempos no sirven para comparar**: con la máquina así, dos pasadas del mismo lado difieren más entre sí
(7,8 y 12,3 s de carga en `main`) que un lado del otro. Que la rama salga más rápida es la carga bajando, no la casa.

Lo que no depende de la carga se repite exacto en las dos pasadas: 686 vértices y 0,1 MB más de geometría, y las
mismas 236 llamadas de dibujo (la casa va en la malla única de los hitos). En la vista del centro en 1946 entran
208 triángulos **menos**: la casa suma 310 (con sus cuatro fachadas, porque la malla se dibuja entera y el shader
esconde lo que no está en pie) y deja de dibujarse la casa genérica que ocupaba el solar.

Los topes de ejecución del presupuesto (carga, tarea larga, bytes, memoria, triángulos, ms por cuadro) ya no pasan
en `main` con los datos completos y siguen sin pasar en la rama: **no se tocaron**.

Después de medir se fusionó `main` con La Candelaria (#314, `fab5b25`); lo que sigue está contado sobre esa
fusión y **no se volvió a medir en el navegador** (la casa no cambió).

Topes unitarios de triángulos de los hitos, sin tocar: 644.484 de 645.000 antes de 1946 (644.174 sin la casa) y
1.123.857 de 1.125.000 en total. La casa son 310 triángulos.

Build (`npx vite build` y `node tools/rendimiento/presupuesto-build.mjs`): entrada 309,1 kB (tope 346), workers
**175,7 kB** contra 173,5 de `main`: pasa del tope de 174 y se sube a **176**. Los 2,2 kB son el módulo de datos
de la casa (sobre todo los textos de `fuente` y `verificar`), que el worker de los hitos carga entero.

**No se midió**: una máquina en reposo, un teléfono, ni el modo liviano.
