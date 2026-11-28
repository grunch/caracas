# Medición del convento de San Francisco (#254)

28-11-2026. `main` `fab5b25` (con La Candelaria, #314) frente a la rama con `main` ya fusionado y el convento
instalado. Los dos sirven los mismos datos completos (`/disco/dev/caracas-datos-sur/public`) con el servidor de
desarrollo de Vite (puertos 5355 y 5354), no con el sitio construido: los tiempos de carga incluyen los módulos
sin empaquetar.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, dos pasadas
por lado: primero las dos de la rama y después las dos de `main`. Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800.
Carga media de la máquina durante estas pasadas: de 4 a 15 (otros agentes trabajando). Una primera tanda de `main`,
con la carga en 21 a 32, dio el doble de tiempo de carga y se descartó: los archivos `base*.json` son de la segunda.

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia |
|---|---:|---:|---:|---:|---|
| casasMs | 4.822 | 4.883 | 4.918 | 4.593 | ruido |
| tareaMasLargaMs | 386 | 385 | 379 | 391 | ruido |
| bytesAlAbrir | 29.120.491 | 29.120.491 | 29.175.414 | 29.175.414 | +54.923 (módulos sin empaquetar ni comprimir: el hito, la ficha y la marca) |
| heapMB | 347 | 326 | 347 | 347 | igual |
| Geometría en JS (MB) | 204,2 | 204,2 | 204,3 | 204,3 | +0,1 |
| Vértices | 5.220.029 | 5.220.029 | 5.220.433 | 5.220.433 | +404 |
| triangulosCentro | 8.613.162 | 8.613.162 | 8.613.522 | 8.613.522 | +360 |
| Llamadas en la vista centro | 236 | 236 | 236 | 236 | 0 |
| ms por cuadro, centro (mediana / p90) | 11,8 / 12,6 | 11,6 / 17,1 | 11,8 / 12,9 | 11,7 / 12,2 | ruido |
| ms por cuadro, valle (mediana / p90) | 13,8 / 15,5 | 14,3 / 14,8 | 14,4 / 15,6 | 14,4 / 15,2 | ruido (+0,1 a +0,6 en la mediana, dentro de lo que varía `main` entre pasadas) |
| ms por cuadro, cerca (mediana / p90) | 10,9 / 11,7 | 11,0 / 11,6 | 11,5 / 12,3 | 11,2 / 12,2 | +0,2 a +0,6 en la mediana; no se repitió para separarlo del ruido |

Lo que no depende de la carga se repite exacto: 404 vértices y 0,1 MB más de geometría, y las mismas 236 llamadas
de dibujo (el convento va en la malla única de los hitos). El convento suma 180 triángulos; en la vista del centro
entran 360 más, también en 1946, cuando ya no existe: la malla se dibuja entera y el shader esconde lo que no está
en pie.

La vista «cerca» sale de 0,2 a 0,6 ms más lenta en la mediana de la rama. Con 180 triángulos más sobre 8 millones
no hay una causa en el cambio que lo explique, pero **no se midió otra vez** para descartarlo.

Los topes de tarea larga, bytes, memoria y triángulos del presupuesto ya no pasan en `main` con los datos completos
y siguen sin pasar en la rama: **no se tocaron**. Tampoco los topes unitarios de triángulos de los hitos (644.354
de 645.000 antes de 1946; 1.123.727 de 1.125.000 en total).

**Sí se subió** el tope de workers del build, de 174 a 176 kB: el build mide 309,1 kB de entrada y 175,4 kB de
workers, contra 306,3 y 173,6 de `main`. Los 1,8 kB son el módulo del hito, que los workers cargan con sus textos
de fuente y de pendientes.

**No se midió**: el sitio construido, una máquina en reposo, un teléfono, ni la época de 1772 o 1843 (la medición
es en 1946, como las anteriores).
