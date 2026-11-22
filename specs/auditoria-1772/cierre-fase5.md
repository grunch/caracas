# Cierre de la fase 5 · alineación y reparto de casas de 1772

Fecha: 22-11-2026. T33j.5a (I1772-001, -002, -003 y -011). Generado por `tools/geo/cierre_fase5.py` sobre la salida del generador: [cierre-fase5.json](cierre-fase5.json). Se miden las casas que el visor deja a la vista en 1772, sin las que suprime un hito en pie, como en la fase 4. **Cuenta lo medido; no certifica fidelidad.**

## Qué mide la puerta (specs/08, fase 5)

| Criterio de specs/08 | Medida |
|---|---|
| Todas las casas del frente comparten su recta dentro de una tolerancia numérica declarada | **Frentes alineados:** cada tramo recto medible de la red llevada a 1936 (`1772-calles-1936.json`) se mide de cada lado. Se lanza un rayo perpendicular cada 1 m, desde 8 m de cada esquina, hasta la primera casa a no más de 20 m del eje. La planta de un hito corta el rayo. Por los puntos de fachada se ajusta la recta de la mayoría: en la dirección del eje o en la del ajuste de todos los puntos, se elige la posición que deja más puntos a menos de la tolerancia y se afina por mínimos cuadrados totales. Una casa está desalineada si su desvío mediano a esa recta pasa **0,5 m**, un píxel del mosaico. La recta no tiene que ser paralela al eje, porque la fachada de 1936 puede ir oblicua a él. |
| Lotes sin solapes | **Lotes sin solapes:** ningún par de casas con área común mayor que 0,01 m² y ninguna huella inválida. Es el umbral de detección de T33j.1e; una medianera compartida tiene área común cero. |
| Ninguna casa enfrenta una medianera sin acceso | **Casas con acceso:** las casas se juntan en manzanas edificadas, cerrando los huecos de menos de 2 m. Cada casa tiene que tener al menos 2 m de borde, el ancho de una puerta, sobre el contorno exterior de su manzana. Se mide solo el borde que coincide con ese contorno, con una tolerancia numérica de 2,5 cm, así las medianeras laterales no suman. No tiene acceso una casa que solo da a un patio o a una huerta interior, ni una manzana que cae dentro del hueco de otra. |
| No se altera la calle aprobada | **Calle aprobada:** la puerta de la fase 3 sigue cerrable sobre la misma ciudad. |

Los umbrales son inferidos y van declarados en el JSON. Se fijaron antes de medir y no se cambian para que algo pase (1A). Los 29 tramos de los sectores límite del calce no se miden, como en la fase 3.

## Línea base (después de la fase 4)

Ciudad de `main` 32e6a88 (#125), con 6289 casas visibles de 1772.

| Criterio | Resultado | Cumplido |
|---|---|---|
| Frentes alineados | 569 frentes medidos con 4600 casas; **522 casas desalineadas** (566 observaciones casa–frente en 266 frentes; mediana 3,24 m; 94 hasta 1 m, 169 entre 1 y 3 m, 303 a más de 3 m) | **no** |
| Lotes sin solapes | **7195 pares** con área común (el mayor de 160,9 m²) y 1 huella inválida | **no** |
| Casas con acceso | **10 casas** sin acceso, todas de la reconstrucción de 1772 | **no** |
| Calle aprobada | la fase 3 sigue en 5/5 | sí |

`fase_5_cerrable: false`.

### De dónde salen los solapes

| Pares | Cuántos | Área común |
|---|---|---|
| Dos casas de la misma junta de la reconstrucción de 1772 | 7120 | 8825 m² |
| Dos casas de una misma cuadra de 1936 | 50 | 55 m² |
| Casa de la reconstrucción con casa de 1936 | 8 | 4 m² |
| Casa de 1578 con casa de la reconstrucción o de 1936 | 11 | 95 m² |
| Dos juntas distintas de lo edificado | 6 | 452 m² |

- **Misma junta (I011).** Es lo que T33j.1e encontró en 2350 pares sobre la ciudad de B1772-001. Ahora la reconstrucción de 1772 tiene muchas más casas: la periferia y las parciales de la fase 4. La hipótesis de T33j.1e se mantiene: el reparto raster aplica un buffer a cada lote y simplifica cada contorno por separado, y así las medianeras de dos vecinas no coinciden.
- **Dos juntas distintas.** Son las juntas 201/204 y 202/205 de lo edificado: dos manchas rojas que, llevadas a 1936, caen una sobre otra. Producen los tres solapes mayores (161, 155 y 135 m²).
- **1578.** Son casas de la ciudad de 1578 que siguen en pie en 1772 y pisan casas de la reconstrucción o de 1936.

### Lo desalineado, a ojo

Se revisó una muestra de frentes marcados sobre la planta, con las casas desalineadas en rojo.
- La mayoría son **cuñas de esquina**: casas triangulares con la fachada en diagonal, como las alas diagonales de I1772-003.
- El resto son casas corridas delante o detrás de la línea de su frente. Un rayo que entra por una abertura del frente llega a una casa del fondo, y esa casa también queda marcada; esas aberturas (I1772-001, -002) se cierran en la fase 7.

## Después de T33j.5b: medianeras sin solapes (I1772-011)

Hubo dos causas, las dos dentro de una misma cuadra:

1. **Reparto raster.** `poligono_de` vectoriza cada lote por separado, con medio píxel de buffer y su propia simplificación. En los bordes oblicuos, dos vecinas se pisaban en una franja fina. Ahora `huellas_de_casas` vectoriza las casas de la cuadra juntas: recorta todas por la cara de la cuadra y a cada casa le resta lo que ya ocupan las anteriores. Así su medianera queda exactamente sobre el borde de la vecina. Las restas y recortes redondean a la grilla de las coordenadas (`grid_size`).
2. **Uniones en T del reparto vectorial.** Un lote que termina sobre la medianera larga de su vecino tiene ahí un vértice que el vecino no tiene. Al redondear las coordenadas a centésimas de píxel, ese vértice se salía de la recta y dejaba una astilla de hasta 0,07 m². Las coordenadas pasan a milésimas, que es lo que el float32 del `.pak` guarda a 10.000 px. La astilla de una medianera de 50 m queda bajo 0,01 m².

Se probaron y descartaron dos caminos:
- La simplificación de cobertura (`shapely.coverage_simplify`) sobre los bordes de píxel exactos: deja escalones de píxel en las fachadas oblicuas, que cambian la cara de las cuñas de esquina.
- Insertar los vértices de las uniones en T: agrega vértices colineales a los techos que el visor arma desde el polígono, que es materia de la fase 6.

| Criterio | Línea base | Después de T33j.5b |
|---|---|---|
| Lotes sin solapes | 7195 pares, 1 huella inválida | **22 pares**, ninguna inválida |
| Dentro de una misma junta o cuadra | 7170 pares | **0** |
| Frentes alineados | 522 casas desalineadas | 528 |
| Casas con acceso | 10 sin acceso | 10 |
| Calle aprobada | fase 3 en 5/5 | 5/5 |

- La fase 4 sigue en 6/6.
- La ciudad de 1772 tiene 6283 casas visibles.
- Los techos del pipeline quedan en 39.414, dentro de la tolerancia de 39.395.

Los 22 pares que quedan son **entre grupos distintos**:
- 4 de dos juntas de lo edificado que se pisan (450 m²);
- 10 de casas de 1578 que siguen en pie en 1772 (92 m²);
- 8 de una casa de la reconstrucción con una de 1936 (4 m²).

No los produce el reparto: van en la subtarea siguiente.

## Después de T33j.5c: esquinas vivas y solapes entre grupos

Se revisaron a ojo, sobre las clases de 1936, los frentes marcados de lo rojo, que es la mayoría de las casas desalineadas. Lo que se ve son **cuñas de esquina**. El dibujo de 1772 y el calce redondean las esquinas de las manchas rojas, y al simplificar su polígono quedan chaflanes de 3 a 6 m. Cada lado recibe sus lotes, así que las casas de un chaflán miran en diagonal.

Se probó y descartó estirar las manchas hasta la calle: las desalineadas subían de 528 a 571, porque la mancha no estaba corta de la calle.

Cambios:

1. **Esquinas vivas** (`_sin_chaflanes`). Un lado de menos de 6 m entre dos lados más largos se cambia por la esquina donde se cruzan sus vecinos, si queda a menos de 4 m. La cuadra de la mancha incluye esa esquina, sin entrar a la calle. Una L o un entrante de verdad no se tocan.
2. **Manchas que no se pisan** (`_sin_pisarse`). Dos manchas que el calce lleva una sobre otra, o una esquina viva sobre la vecina, no arman dos casas en el mismo lugar: la segunda cede lo común.
3. **Cuadras de OSM con margen.** No llegan a menos de un píxel de lo que ocupa la reconstrucción, con sus esquinas vivas. Sus casas salen de la máscara con medio píxel de buffer.
4. **Casas de 1936 tapadas desde 0,01 m².** Una casa de 1936 que pisa una de la reconstrucción no vive en 1772. Antes se toleraba hasta 1 m².
5. **Casas de 1578 que ceden en 1772** (`epocas.ceder_a_1772`). Una casa de 1578 que sigue en pie en 1772 y pisa una casa de 1772 muere en 1772: en 1772 manda su plano.

| Criterio | Después de T33j.5b | Después de T33j.5c |
|---|---|---|
| Lotes sin solapes | 22 pares | **0** (cumple) |
| Frentes alineados | 528 casas desalineadas | **472** |
| Casas con acceso | 10 sin acceso | **3** |
| Calle aprobada | fase 3 en 5/5 | 5/5 |

- La fase 4 sigue en 6/6.
- La ciudad de 1772 tiene 6320 casas visibles.
- Los techos del pipeline quedan en 39.305, dentro de la tolerancia de 39.395.

## Lo que sigue

- **Frentes (T33j.5d):** las 472 casas desalineadas, sobre todo de las manchas rojas y de los anillos de las continuas.
- **Las 3 casas sin acceso.**

En cada paso la puerta de la fase 3 tiene que seguir en 5/5 y la de la fase 4 en 6/6.

## Reproducir

```
npm run datos -- --desde vectorizar
.venv/bin/python tools/geo/cierre_fase5.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release o commit>
```
