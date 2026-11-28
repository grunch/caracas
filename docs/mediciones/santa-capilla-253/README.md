# Medición de San Mauricio y la Santa Capilla (#253)

28-11-2026. `main` `fab5b25` (con La Candelaria, #314) frente a la rama. Los dos sirven los mismos datos completos
(`/disco/dev/caracas-datos-sur/public`) con el servidor de desarrollo de Vite (puertos 5363 y 5353), no con el
sitio construido: los tiempos de carga incluyen los módulos sin empaquetar.

`node tests/e2e/medir-rendimiento.mjs http://localhost:PUERTO/ --gpu --epoca 1946 --salida ARCHIVO`, en serie y
alternando (main, rama, main, rama). Con GPU (RTX 2060, ANGLE OpenGL), 1280 × 800. **La máquina estaba muy
cargada**: carga media de 22 a 30, con otros siete agentes corriendo tests, builds y capturas.

| Métrica | main (1) | main (2) | rama (1) | rama (2) | Diferencia |
|---|---:|---:|---:|---:|---|
| casasMs | 12.293 | 5.314 | 7.307 | 12.204 | no se puede leer: cada lado da 5 y 12 s según la carga de la máquina |
| tareaMasLargaMs | 757 | 398 | 429 | 760 | ídem |
| bytesAlAbrir | 29.109.903 | 29.109.903 | 22.962.967 | 29.206.884 | +96.981 en la segunda pasada (módulos sin empaquetar ni comprimir); la primera de la rama no sirve (ver abajo) |
| heapMB | 273 | 326 | 273 | 273 | ruido |
| Geometría en JS (MB) | 204,2 | 204,2 | 204,6 | 204,6 | +0,4 |
| Vértices | 5.220.029 | 5.220.029 | 5.224.037 | 5.224.037 | +4.008 |
| triangulosCentro | 8.613.162 | 8.613.162 | 8.617.626 | 8.617.626 | +4.464 |
| Llamadas en la vista centro | 236 | 236 | 236 | 236 | 0 |
| ms por cuadro, centro (mediana / p90) | 22,1 / 27,4 | 17,0 / 41,9 | 21,8 / 24,7 | 22,6 / 38,4 | ruido: `main` varía más entre sus dos pasadas que entre lados |
| ms por cuadro, valle | 27,5 / 29,6 | 16,5 / 19,9 | 27,6 / 28,6 | 18,9 / 22,6 | ídem |
| ms por cuadro, cerca | 20,9 / 22,0 | 12,9 / 15,8 | 17,0 / 22,0 | 16,0 / 22,2 | ídem |

Lo que no depende de la carga se repite exacto en las dos pasadas: 4.008 vértices y 0,4 MB más de geometría, y
las mismas 236 llamadas de dibujo (los dos hitos van en la malla única). En la vista del centro en 1946 entran
4.464 triángulos más: cuentan todas las etapas, también San Mauricio, que en 1946 ya no existe, porque la malla
se dibuja entera y el shader esconde lo que no está en pie.

**Los tiempos no sirven para comparar.** Con la máquina así, `main` da 5,3 y 12,3 s de carga y 17 y 22 ms por
cuadro en sus dos pasadas; la rama cae dentro de esa misma franja. No hay nada en el cambio que deba mover el
tiempo por cuadro (0,05 % más de triángulos en la misma llamada), pero **esta medición no lo demuestra**: habría
que repetirla con la máquina en reposo.

En la primera pasada de la rama se pidieron 239 archivos y 23,0 MB en vez de 164 y 29,2 MB: Vite estaba
reoptimizando sus dependencias (acababa de correr un `vite build` en el mismo directorio). Esa pasada no vale para
`bytesAlAbrir`.

Los topes de carga, tarea larga, bytes, memoria y triángulos del presupuesto de ejecución ya no pasan en `main`
con los datos completos y siguen sin pasar en la rama: **no se tocaron**.

Lo que sí se tocó, y por qué:

- **Topes unitarios de triángulos de los hitos** (`tests/unit/hitos.test.js`, `hitos-palacios.test.js`): 650.000
  antes de 1946 y 1.130.000 en total (en `main`, con Las Mercedes, 647.000 y 1.127.000). San Mauricio (1.322) y la
  Santa Capilla por etapas (de 756 a 1.846) suman 2.412: con La Candelaria eran 646.586 y 1.125.959; **después de
  fusionar Las Mercedes (#316), 647.937 y 1.127.310**. El margen deja lugar a San Pablo (#317), que suma unos 1.200.
- **Tope de workers del build** (`tools/rendimiento/presupuesto.json`): 178 kB (en `main`, 176). `npx vite build` y
  `node tools/rendimiento/presupuesto-build.mjs`: antes de Las Mercedes, `main` 306,3 kB de entrada y 173,6 kB de
  workers y la rama 310,2 y 176,3 (los textos de fuente y de dudas de los dos hitos viajan en el módulo de datos
  que carga el worker; se abreviaron una vez, de 177,1). **Con Las Mercedes fusionada, la rama mide 311,2 y 177,0.**

La medición de carga y de cuadro de la tabla es anterior a la fusión de Las Mercedes (#316) y **no se repitió**:
#316 suma 1.351 triángulos a los dos lados por igual.

**No se midió**: el sitio construido, una máquina en reposo ni un teléfono.
