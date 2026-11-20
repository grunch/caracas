# Cruces del núcleo: discrepancia entre calce y referencia curada

T33j.1c, 20-11-2026. Este lote continúa la fase 1; no cambia datos del generador ni certifica el calce de toda la ciudad.

## Resultado

Se contrastaron los lados de las diez manzanas de #69 con el original de 1772 y la continuidad del damero en el mosaico de 1936. Quedan registrados **23 cruces únicos, 32 tramos de calle y 40 referencias de frente**. Los cruces compartidos se cuentan una vez. La lectura confirma el orden topológico de estas cuadras: no autoriza a trasladar a 1772 los edificios, nombres de calles ni remodelaciones de 1936.

La transformación TPS utilizada para las máscaras y cámaras difiere de los cruces curados: mediana **13,313 m**, RMS **35,224 m**, máximo **96,162 m**; cinco cruces superan 25 m. Es una discrepancia entre referencias, no una medida de exactitud geográfica. Los 25 m se muestran porque son el umbral de depuración de GCP existente, no como tolerancia aceptable para fachadas.

| Cuadra | Desvío de sus cuatro esquinas, metros (NO, NE, SE, SO en mosaico) |
|---|---|
| norte-plaza | 11,0 · 5,3 · 13,3 · 18,4 |
| norte-catedral | 5,3 · 3,6 · 9,7 · 13,3 |
| catedral | 13,3 · 9,7 · 0,9 · 4,8 |
| sociedad-camejo | 6,7 · 10,6 · 20,8 · 20,7 |
| camejo-cruz-verde | 20,7 · 20,8 · 50,2 · 48,9 |
| cruz-verde-velasquez | 48,9 · 50,2 · 93,2 · 96,2 |
| sur-convento | 10,6 · 13,6 · 21,2 · 20,8 |
| doctor-diaz-zamuro | 20,8 · 21,2 · 49,6 · 50,2 |
| noreste-catedral | 3,6 · 21,2 · 12,9 · 9,7 |
| seminario | 9,6 · 4,8 · 6,7 · 8,4 |

[controles-calce-centro.json](controles-calce-centro.json) conserva coordenadas, deltas, hash del config y estadísticas sin duplicar cruces. [calles.json](calles.json) asigna IDs `C1772-…` a los tramos observados, enlazados a los frentes `F1772-…`. Son ejes aproximados: no incluyen un ancho inventado, y el segundo frente queda pendiente cuando no pertenece a las diez manzanas del lote. La continuidad y accesibilidad de estos tramos en el sistema aún debe medirse.

## Qué prueba y qué no prueba

La referencia de #69 y el TPS **no son intercambiables**. La discrepancia aumenta hacia las cuadras del sur y supera el ancho de las calles representadas. Los 242 GCP actuales incluyen solo cuatro anclas manuales, todas alrededor de Plaza Mayor; los otros 238 son enlaces automáticos. El residuo LOO de esos enlaces no valida la correspondencia histórica del damero repetitivo.

La lectura de ambos planos confirma el orden de los cruces, pero no certifica precisión submétrica de sus coordenadas. El original tiene trazos gruesos y es esquemático. Además, los controles proceden de #69: son externos al listado de GCP, pero **no constituyen una nueva campaña independiente de medición**. No se usaron símbolos de iglesias periféricas sin nombre para crear anclas por suposición.

El problema se registra como **I1772-010**, previo a corregir ocupación o alineación. La ruta de máscaras está confirmada en `epocas.construido_de_epoca`: lee el plano calzado, segmenta y aplica holgura. La ruta curada está en `vectorizar._cuadras_de_antes`, que recibe `completas72`. Todavía falta aislar cuánto contribuye cada ruta al hueco particular de cada frente. No se concluye que todos los vacíos tengan esta causa.

## Evidencia y reproducción

Fuentes locales intactas:

- Original 1772: `fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg`, hash fijado en B1772-001. Lectura ampliada del rectángulo `[680,770,1120,1010]`, con Poniente arriba.
- Mosaico 1936: `fuentes/derivados/1936/mosaico.tif`, recorte `[8650,6350,9800,8200]`, norte arriba. La costura blanca del mosaico impide leer parte del centro del recorte; no se la toma por calle histórica. Los cruces usados no se colocan en esa banda.
- Coordenadas de correspondencia: `tools/geo/cuadras-1772.json`, sin cambios desde #69.
- Cálculo: `Calce.ajustar(config['gcps'], 0.5, config['suavizado'])`. Para cada caja `[x0,y0,x1,y1]`, comparar `a_1936` de `[(x1,y0),(x1,y1),(x0,y1),(x0,y0)]` con las cuatro coordenadas `mosaico`. Delta en metros = `(proyección - referencia) * 0.5`; desvío = norma euclídea. Agrupar las esquinas por coordenada original antes de calcular estadísticas. No se reajusta el TPS con los controles.

Los recortes de inspección quedan fuera de git en `.cache/censo-1772/.cache/cruces-{1772,1936}.png`. Los datos numéricos permiten reproducir la discrepancia sin depender de esos recortes.

## Trabajo que habilita

1. Fase 1: completar el censo de calles fuera de este núcleo y comprobar correspondencias periféricas con referencias identificables. No extrapolar estos resultados a toda la ciudad.
2. Fase 2: reconciliar la referencia curada y el registro del original; guardar controles reservados para validación. Separar los hechos topológicos de la precisión métrica inferida.
3. Fases 3–4: hacer que calles, límites y ocupación compartan esa referencia. Mantener casos de regresión para Cruz Verde–Velásquez y Doctor Díaz–Zamuro; no compensar desplazamientos aumentando la dilatación de máscaras.
4. Fases 5–7: corregir casas, cubiertas y cierres sobre los límites ya aceptados.

La fase 1 permanece abierta: hay 32 tramos documentados, no un censo completo de calles; 40 frentes enlazados, no 40 accesos verificados.

La [comprobación periférica de Candelaria y La Pastora](periferia-candelaria-pastora.md) añade identificación cruzada con la leyenda de 1775 y 18 clasificaciones de ocupación original. Las separaciones entre símbolos y modelos no se confunden con residuos de puntos homólogos.
