# Medición del Cuartel San Carlos (#248)

28-11-2026. `main` `b482621` (`/disco/dev/caracas-p2c-base`, puerto 5340) frente a la rama (puerto 5248). Los dos
sirven los mismos datos completos (`/disco/dev/caracas-datos-sur/public`) con el servidor de desarrollo de Vite, no
con el sitio construido: los tiempos de carga incluyen los módulos sin empaquetar.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, dos pasadas
por lado. Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800. **Carga media de la máquina: 32 a 39** (otros agentes
midiendo y capturando a la vez).

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia |
|---|---:|---:|---:|---:|---|
| casasMs | 13.251 | 9.899 | 14.390 | 7.407 | ruido (la carga manda) |
| tareaMasLargaMs | 739 | 694 | 800 | 636 | ruido |
| bytesAlAbrir | 29.071.831 | 29.071.831 | 29.117.867 | 29.117.867 | +46.036 (módulos sin empaquetar ni comprimir; el texto de la ficha y del hito) |
| heapMB | 273 | 273 | 273 | 273 | igual |
| Geometría en JS (MB) | 203,9 | 203,9 | 203,9 | 203,9 | igual |
| Vértices | 5.216.364 | 5.216.364 | 5.217.206 | 5.217.206 | +842 |
| triangulosCentro | 8.609.375 | 8.609.375 | 8.604.361 | 8.604.361 | −5.014 |
| Llamadas en la vista centro | 236 | 236 | 236 | 236 | 0 |
| ms por cuadro, centro (mediana / p90) | 21,1 / 38,7 | 17,3 / 29,6 | 21,4 / 39,3 | 21,0 / 29,9 | ruido |
| ms por cuadro, valle | 21,4 / 25,0 | 15,8 / 20,1 | 18,0 / 21,8 | 21,9 / 26,5 | ruido |
| ms por cuadro, cerca | 15,1 / 17,4 | 12,5 / 14,9 | 14,9 / 18,1 | 17,3 / 20,6 | ruido |

**Los tiempos no sirven para comparar**: con esa carga, dos pasadas del mismo lado difieren más (hasta 7 s en
`casasMs` y 4 ms por cuadro) que un lado del otro. Lo que no depende de la carga se repite exacto:

- +842 vértices: el cuartel (164 triángulos, en la malla única de los hitos; mismas 236 llamadas);
- −5.014 triángulos en la vista del centro: la reserva del cuartel esconde las casas y los árboles genéricos que
  pisan su solar, que pesan más que el edificio.

Los topes de carga, tarea larga, bytes, memoria y triángulos del presupuesto ya no pasan en `main` con los datos
completos y siguen sin pasar en la rama: **no se tocaron**. Topes unitarios de triángulos de los hitos: 641.783 de
645.000 antes de 1946 y 1.121.156 de 1.125.000 en total (+164). Build: entrada 306,9 kB (tope 346) y workers
173,8 kB (tope 174); sin tocar.

**No medí**: una máquina en reposo, el sitio construido, un teléfono.
