# Medición de San Jacinto (#245)

28-11-2026. `main` `fab5b25` (con La Candelaria, #314) en `/disco/dev/caracas-san-jacinto-base` frente a la rama
`feat/san-jacinto-245`. Los dos sirven los mismos datos completos (`/disco/dev/caracas-datos-sur/public`) con el
servidor de desarrollo de Vite (puertos 5346 y 5345), no con el sitio construido.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, en serie
(main, rama, main, rama). Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800, **con otros agentes trabajando en la
máquina**.

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia |
|---|---:|---:|---:|---:|---|
| casasMs | 4.999 | 5.108 | 4.984 | 7.691 | ruido: la segunda pasada de la rama tardó 2,7 s más en cargar y la primera no |
| tareaMasLargaMs | 411 | 420 | 372 | 391 | ruido |
| bytesAlAbrir | 29.109.398 | 29.109.398 | 29.200.432 | 29.200.432 | +91.034 (módulos sin empaquetar ni comprimir) |
| heapMB | 347 | 326 | 347 | 273 | ruido |
| Geometría en JS (MB) | 204,2 | 204,2 | 204,5 | 204,5 | +0,3 |
| Vértices | 5.220.029 | 5.220.029 | 5.223.463 | 5.223.463 | +3.434 |
| triangulosCentro | 8.613.162 | 8.613.162 | 8.617.506 | 8.617.506 | +4.344 |
| Llamadas en la vista centro | 236 | 236 | 238 | 238 | **+2, sin explicar** |
| ms por cuadro, centro (mediana / p90) | 11,6 / 17,4 | 11,5 / 12,2 | 11,9 / 26,4 | 12,3 / 13,4 | +0,3 a +0,8 de mediana; el p90 salta en los dos lados |
| ms por cuadro, valle | 14,7 / 15,3 | 14,3 / 14,8 | 15,0 / 15,9 | 14,4 / 15,6 | dentro del ruido |
| ms por cuadro, cerca | 11,2 / 12,5 | 10,6 / 14,1 | 10,9 / 11,6 | 11,3 / 12,2 | dentro del ruido |

- La medición es de 1946, cuando el convento y el solar de 1889 ya no existen: sus triángulos cuentan igual, porque
  la malla de los hitos se dibuja entera y el shader esconde lo que no está en pie.
- **Las dos llamadas de más no las expliqué.** Los hitos son una sola malla y este PR no agrega materiales ni
  texturas. Se repiten en las dos pasadas, así que no son ruido.
- La mediana del cuadro en el centro sube entre 0,3 y 0,8 ms en estas cuatro pasadas. Con la máquina compartida
  no alcanza para decir si es del cambio; no lo descarto.
- Los topes de tarea larga, bytes, memoria y triángulos del presupuesto de ejecución ya no pasan en `main` con los
  datos completos y siguen sin pasar en la rama: **no se tocaron**.

Triángulos de los hitos (tests unitarios): convento 1.400, solar de 1889 590 y mercado 593; 2.583 en total.
Con `main`: 646.757 antes de 1946 y 1.126.130 en total.

Build (`npx vite build` y `node tools/rendimiento/presupuesto-build.mjs`): entrada 310,6 kB (306,3 en `main`) y
workers 176,9 kB (173,6 en `main`; tope de 174). Los textos de `fuente` y `verificar` viajan en los dos workers.

**No se midió**: el sitio construido, una máquina en reposo, un teléfono, ni el render por software.
