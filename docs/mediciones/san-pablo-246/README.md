# Medición de la iglesia de San Pablo (#246)

28-11-2026. `main` `27abd10` (`/disco/dev/caracas-p2-base`) frente a la rama, que lleva también La Candelaria
(#314) y Las Mercedes (#316), sobre las que está apilada. Los dos sirven los mismos datos completos
(`/disco/dev/caracas-datos-sur/public`) con el servidor de desarrollo de Vite (puertos 5244 y 5243), no con el
sitio construido.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, en serie,
dos pasadas por lado. Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800, con otros agentes trabajando en la máquina.

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia (tres templos) |
|---|---:|---:|---:|---:|---|
| casasMs | 4.877 | 4.945 | 4.946 | 4.763 | ruido |
| tareaMasLargaMs | 393 | 373 | 387 | 379 | ruido |
| bytesAlAbrir | 29.052.770 | 29.052.770 | 29.147.631 | 29.147.631 | +94.861 (módulos sin empaquetar ni comprimir; +32.214 sobre #316) |
| heapMB | 347 | 347 | 326 | 347 | ruido |
| Geometría en JS (MB) | 203,9 | 203,9 | 204,5 | 204,5 | +0,6 (+0,1 sobre #316) |
| Vértices | 5.216.364 | 5.216.364 | 5.223.651 | 5.223.651 | +7.287 (+1.420 sobre #316) |
| triangulosCentro | 8.609.375 | 8.609.375 | 8.616.610 | 8.616.610 | +7.235 (+1.976 sobre #316) |
| Llamadas en la vista centro | 236 | 236 | 236 | 236 | 0 |
| ms por cuadro, centro (mediana / p90) | 11,5 / 26,5 | 11,9 / 25,9 | 11,9 / 12,5 | 11,6 / 27,5 | ruido (el p90 salta en los dos lados) |
| ms por cuadro, valle | 13,1 / 15,2 | 14,0 / 14,8 | 13,8 / 15,6 | 14,2 / 14,8 | ruido |
| ms por cuadro, cerca | 10,5 / 11,4 | 10,9 / 11,5 | 11,3 / 11,9 | 10,8 / 11,3 | ruido |

La medición es de 1946, cuando la iglesia ya no existe: sus triángulos cuentan igual, porque la malla de los hitos
se dibuja entera y el shader esconde lo que no está en pie. Las cifras «sobre #316» salen de restar la medición
de Las Mercedes ([`../la-merced-244`](../la-merced-244/README.md)), del mismo día y con el mismo método.

Los topes de carga, tarea larga, bytes, memoria y triángulos del presupuesto ya no pasan en `main` con los datos
completos y siguen sin pasar en la rama: **no se tocaron**. Tampoco los topes unitarios de triángulos de los hitos
que dejó #316 (646.315 de 647.000 antes de 1946; 1.125.688 de 1.127.000 en total) ni el de workers del build
(175,3 de 176 kB).
