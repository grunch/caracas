# Rendimiento: Cementerio General del Sur

Mediciones locales de `main` (`7cd0f51`) y de la rama del PR en el mismo equipo, con datos completos. Cada rama se compiló con `npm run build`, se sirvió con `vite preview` y se midió con `node tests/e2e/medir-rendimiento.mjs URL --salida archivo.json`, sin `--gpu`. Chromium usó SwiftShader. Los JSON incluidos conservan las corridas para que se puedan revisar.

| Medida (época inicial 1772) | main | Rama | Cambio |
|---|---:|---:|---:|
| Llegada de casas (corrida inicial) | 12.433 ms | 13.047 ms | +4,94 % |
| Llegada de casas (corrida repetida) | 13.711 ms | 13.052 ms | −4,81 % |
| Tarea más larga, corrida repetida | 759 ms | 924 ms | +21,74 % |
| Suma de tareas largas, corrida repetida | 4.204 ms | 3.806 ms | −9,47 % |
| Bytes descargados al abrir | 17.968.426 | 17.971.355 | +0,16 % |
| Heap JS | 326 MB | 326 MB | 0 % |
| Triángulos en la cámara centro | 2.326.895 | 2.336.073 | +0,39 % |

En 1936, la corrida repetida de la rama registró 13.192 ms hasta casas, una tarea máxima de 1.079 ms, 17.971.355 bytes y 3.268.394 triángulos centrales (`rama-1936-repeat.json`). La comparación inicial de 1936 con `main` dio 12.684 ms en `main` y 14.060 ms en la rama; esas corridas separadas muestran variabilidad y no son una comparación pareada.

Los límites absolutos de carga, memoria y triángulos ya fallan en `main`; esta comparación no los eleva. Las repeticiones varían: en 1772 el tiempo de llegada de casas pasó de rama +4,94 % a −4,81 % al repetir la corrida base. Tómese como medición aproximada, no como una regresión precisa. El hito se muestra desde 1889, por lo que la medición de carga visible en 1772 no cuantifica el coste de renderizado cuando el cementerio aparece.

No se midieron tiempos por cuadro: el script corrió con SwiftShader, sin `--gpu`; esos valores aparecen como «sin medir» y no se interpretan como FPS. Las capturas históricas están en `docs/capturas/cementerio-general-sur-*.webp`.
