# Medición de La Candelaria (#243)

28-11-2026. `main` `27abd10` (`/disco/dev/caracas-p2-base`) frente a la rama con el templo instalado. Los dos
sirven los mismos datos completos (`/disco/dev/caracas-datos-sur/public`) con el servidor de desarrollo de Vite
(puertos 5244 y 5243), no con el sitio construido: los tiempos de carga incluyen los módulos sin empaquetar.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, en serie,
dos pasadas por lado. Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800. Carga media de la máquina: 7 a 9 (otros
agentes trabajando).

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia |
|---|---:|---:|---:|---:|---|
| casasMs | 5.228 | 4.977 | 4.930 | 4.935 | ruido |
| tareaMasLargaMs | 376 | 382 | 390 | 389 | +10 ms, del orden del ruido entre pasadas (6 ms) |
| bytesAlAbrir | 29.052.770 | 29.052.770 | 29.088.009 | 29.088.009 | +35.239 (módulos sin empaquetar ni comprimir) |
| heapMB | 347 | 326 | 347 | 347 | igual |
| Geometría en JS (MB) | 203,9 | 203,9 | 204,2 | 204,2 | +0,3 |
| Vértices | 5.216.364 | 5.216.364 | 5.219.783 | 5.219.783 | +3.419 |
| triangulosCentro | 8.609.375 | 8.609.375 | 8.612.766 | 8.612.766 | +3.391 |
| Llamadas en la vista centro | 236 | 236 | 236 | 236 | 0 |
| ms por cuadro, centro (mediana / p90) | 11,7 / 12,4 | 11,8 / 12,3 | 11,0 / 26,3 | 11,5 / 26,0 | mediana igual; el p90 salta en los dos lados (ver abajo) |
| ms por cuadro, valle | 13,4 / 14,7 | 14,0 / 14,7 | 14,2 / 14,9 | 14,1 / 14,9 | ruido |
| ms por cuadro, cerca | 10,8 / 16,6 | 10,9 / 11,8 | 10,7 / 11,8 | 10,9 / 12,0 | ruido |

El p90 de la vista del centro dio 26 ms en las dos pasadas de la rama. Se repitió alternando los servidores
(archivos no guardados): rama 28,2 y 36,6; `main` 25,9 y 28,0. El salto aparece también en `main`: es la carga de
la máquina, no el templo. La mediana no se mueve.

Lo que no depende de la carga se repite exacto: 3.419 vértices y 0,3 MB más de geometría, y las mismas 236
llamadas de dibujo (el templo va en la malla única de los hitos). En la vista del centro en 1946 entran 3.391
triángulos más: los 2.357 del templo cuentan todas sus fases, porque la malla se dibuja entera y el shader esconde
lo que no está en pie.

Los topes de carga, tarea larga, bytes, memoria y triángulos del presupuesto ya no pasan en `main` con los datos
completos y siguen sin pasar en la rama: **no se tocaron**. Tampoco los topes unitarios de triángulos de los hitos
(643.976 de 645.000 antes de 1946; 1.123.349 de 1.125.000 en total) ni el de workers del build (173,5 de 174 kB).

Después de esta medición, la etapa de 1843 pasó a ser una pieza aparte (sin fachada): el templo suma 2.555
triángulos en vez de 2.357 (644.174 antes de 1946 y 1.123.547 en total, todavía dentro de los topes). **No se
volvió a medir**; son 198 triángulos más en la misma malla.
