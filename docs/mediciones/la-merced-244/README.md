# Medición de Las Mercedes (#244)

28-11-2026. `main` `27abd10` (`/disco/dev/caracas-p2-base`) frente a la rama, que lleva también La Candelaria
(#314, sobre la que está apilada). Los dos sirven los mismos datos completos (`/disco/dev/caracas-datos-sur/public`)
con el servidor de desarrollo de Vite (puertos 5244 y 5243), no con el sitio construido.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, en serie,
dos pasadas por lado. Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800, con otros agentes trabajando en la máquina.

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia (dos templos) |
|---|---:|---:|---:|---:|---|
| casasMs | 4.826 | 4.786 | 4.803 | 4.808 | ruido |
| tareaMasLargaMs | 417 | 389 | 391 | 383 | ruido |
| bytesAlAbrir | 29.052.770 | 29.052.770 | 29.115.417 | 29.115.417 | +62.647 (módulos sin empaquetar ni comprimir; +27.408 sobre #314) |
| heapMB | 347 | 347 | 347 | 347 | igual |
| Geometría en JS (MB) | 203,9 | 203,9 | 204,4 | 204,4 | +0,5 (+0,2 sobre #314) |
| Vértices | 5.216.364 | 5.216.364 | 5.222.231 | 5.222.231 | +5.867 (+2.448 sobre #314) |
| triangulosCentro | 8.609.375 | 8.609.375 | 8.614.634 | 8.614.634 | +5.259 (+1.868 sobre #314) |
| Llamadas en la vista centro | 236 | 236 | 236 | 236 | 0 |
| ms por cuadro, centro (mediana / p90) | 11,5 / 22,1 | 11,8 / 13,0 | 11,2 / 12,2 | 11,8 / 12,2 | ruido (el p90 salta en una pasada de `main`) |
| ms por cuadro, valle | 14,3 / 14,8 | 14,2 / 14,7 | 14,0 / 15,3 | 14,2 / 17,3 | ruido |
| ms por cuadro, cerca | 11,1 / 11,6 | 11,0 / 11,7 | 10,9 / 11,8 | 10,8 / 11,5 | ruido |

Las cifras «sobre #314» salen de restar la medición de La Candelaria
([`../candelaria-243`](../candelaria-243/README.md)), hecha el mismo día con el mismo método.

Los topes de carga, tarea larga, bytes, memoria y triángulos del presupuesto ya no pasan en `main` con los datos
completos y siguen sin pasar en la rama: **no se tocaron**. Sí suben, medidos: los topes unitarios de triángulos
de los hitos (645.000 → 647.000 antes de 1946, medido 645.327; 1.125.000 → 1.127.000 en total, medido 1.124.700)
y el de workers del build (174 → 176 kB, medido 174,2).
