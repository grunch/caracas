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

1. **Esquinas vivas** (`_sin_chaflanes`). Un lado de menos de 6 m entre dos lados más largos se cambia por la esquina donde se cruzan sus vecinos, si queda a menos de 4 m y si esa esquina suma área: así solo cambia un chaflán de una esquina exterior. La esquina interior de un entrante no se toca, porque su esquina viva le quitaría área a la cuadra. Es una heurística sobre el polígono simplificado. La cuadra de la mancha incluye la esquina nueva, sin entrar a la calle.
2. **Manchas que no se pisan** (`_sin_pisarse`). Dos manchas que el calce lleva una sobre otra, o una esquina viva sobre la vecina, no arman dos casas en el mismo lugar: la segunda cede lo común en su máscara y en su polígono. El reparto exacto por lados tolera 2 m de diferencia con la máscara, y con el polígono entero le devolvería la franja común.
3. **Cuadras de OSM con margen.** No llegan a menos de un píxel de lo que ocupa la reconstrucción, con sus esquinas vivas. Sus casas salen de la máscara con medio píxel de buffer.
4. **Casas de 1936 tapadas desde 0,01 m².** Una casa de 1936 que pisa una de la reconstrucción no vive en 1772. Antes se toleraba hasta 1 m².
5. **Casas de 1578 que ceden en 1772** (`epocas.ceder_a_1772`). Una casa de 1578 que sigue en pie en 1772 y tiene **más de 0,01 m²** en común con una casa de 1772, entre huellas válidas, muere en 1772: en 1772 manda su plano. Con 0,01 m² justos no cede. La casa de 1936 tapada cuenta desde 0,01 m² inclusive (`marcar_tapadas`).

| Criterio | Después de T33j.5b | Después de T33j.5c |
|---|---|---|
| Lotes sin solapes | 22 pares | **0** (cumple) |
| Frentes alineados | 528 casas desalineadas | **472** |
| Casas con acceso | 10 sin acceso | **3** |
| Calle aprobada | fase 3 en 5/5 | 5/5 |

- La fase 4 sigue en 6/6.
- La ciudad de 1772 tiene 6320 casas visibles.
- Los techos del pipeline quedan en 39.305, dentro de la tolerancia de 39.395.

## Después de T33j.5d: una línea de fachada por frente

Lo rojo y las cuadras de 1772 llegan a 1936 por el calce, con el error de su sector. Su borde no cae sobre una recta: las fachadas de un frente quedan en escalera, en rampa o corridas unas de otras. Casi todas las desalineadas eran casas de la reconstrucción (449 de 472).

El generador mide cada frente como la puerta, antes de repartir las casas (`tools/geo/fachadas.py`, llamado desde `vectorizar`):

- **Los mismos rayos.** Rayos cada 1 m sobre los tramos rectos medibles de `1772-calles-1936.json`, lejos de las esquinas. Cada rayo busca la primera cuadra de la reconstrucción y por esos puntos se ajusta la recta de la mayoría. Las estaciones y la recta son las mismas funciones que usa la puerta.
- **Fachada sobre la recta.** Lo que queda detrás de la recta, hasta **8 m** (el tope, inferido del error del calce en los sectores medibles), se rellena hasta ella. Lo que sale hacia la calle se corta. Entra toda la fachada, también la que ya estaba dentro de la tolerancia: si no, sus escalones de un píxel quedaban entre las franjas corregidas.
- **Dónde no se rellena.** Nunca en lo vedado (los núcleos de calzada de las calles de 1772 y las plantas de los hitos) ni en lo que ya es de otro grupo. Un retiro de más de 8 m no se toca: no es el calce corrido.
- **El polígono del grupo.** Se corrige junto con la máscara, así el reparto por lados sigue la fachada nueva. Las migas sueltas y las rendijas de las franjas se descartan. Si con 1 m de simplificación el polígono no vuelve a sus pocos lados, el grupo se reparte por su máscara.
- **Casas de 1936 en la calle de 1772.** Lo que queda entre el eje y la fachada alineada es calle de 1772 (`calles_delante`). Una casa de 1936 que pisa ahí 0,01 m² o más no vive en 1772 (`marcar_tapadas`). Antes, esas hileras dejaban la fachada a menos de 2 m de ellas y le quitaban el acceso.

Va también el caso que CodeRabbit dejó abierto en #128. Una mancha que cede y se queda sin polígono se reparte por su máscara, sin el reparto exacto: ese reparto le infería un polígono con 2 m de tolerancia y le devolvía lo cedido. Sus huellas se recortan por el contorno exacto de la máscara.

| Criterio | Después de T33j.5c | Después de T33j.5d |
|---|---|---|
| Frentes alineados | 472 casas desalineadas | **222** (en 149 frentes; mediana del desvío 5,8 m) |
| Lotes sin solapes | 0 pares | 0 (cumple) |
| Casas con acceso | 3 sin acceso | **4** |
| Calle aprobada | fase 3 en 5/5 | 5/5 |

- La fase 4 sigue en 6/6.
- La ciudad de 1772 tiene 6319 casas visibles.
- Los techos del pipeline quedan en 39.608, dentro de la tolerancia de 39.395.

De las 222 que quedan:

| Origen | Hasta 1 m | 1–3 m | 3–8 m | Más de 8 m |
|---|---|---|---|---|
| Reconstrucción de 1772 | 44 | 19 | 61 | 87 |
| 1936 | 1 | — | 3 | 5 |
| 1578 | — | — | 1 | 1 |

A ojo se ven cuatro causas:

1. **Retiros de más de 8 m.** Son manchas rojas que el calce deja muy adentro, más allá del tope. Correrlas más es mover la reconstrucción sin evidencia.
2. **Ejes metidos en las casas.** En 14 frentes el eje llevado a 1936 corre pegado a una fachada, o por dentro de ella: los rayos del otro lado arrancan tocando casas del frente opuesto.
3. **Frentes mixtos.** La recta del generador sale solo de la reconstrucción; la de la puerta también cuenta las casas de 1936 que siguen en pie en 1772.
4. **Casas que no llenan su cuadra.** Un lote de la cuadra modelo que no da a la calle queda de solar, y el rayo entra por ese hueco hasta una casa del fondo.

Las 4 sin acceso son cuñas de esquina o lotes de fondo junto a casas de 1936, en la esquina que el frente no mide.

Medido otra vez con el código fusionado de #129 (609685f, con los arreglos de la revisión): 231 casas desalineadas en 148 frentes, 0 pares y 4 sin acceso.

## Después de T33j.5e: una figura por tramo de fachada y la recta de la mayoría girada

Dos cambios:

1. **Una figura por tramo seguido de fachada.**
   - Antes había una franja suelta por estación. Sus escalones y migas llenaban de vértices el polígono del grupo, y en la ciudad real 204 de 236 grupos alineados lo perdían: se repartían por su máscara, con la fachada otra vez dentada.
   - Ahora, por cada tramo de estaciones seguidas de un mismo grupo, hay una sola figura entre su fachada y la recta, y una sola banda quita lo que sale a la calle.
   - Los píxeles cuentan por su centro. Con `fillPoly`, el borde se llevaba la fila que apenas toca.
2. **La recta de la mayoría prueba direcciones giradas** hasta 20° respecto del eje, de a 0,25°.
   - Con una fachada apenas girada y casas del fondo que tuercen el ajuste de todos los puntos, ninguna de las dos direcciones candidatas la seguía. En L1772-0085, la puerta tomaba una recta con 20 de 100 puntos, mientras 90 estaban en recta. Pasaba en 9 frentes.
   - **Es un cambio de la medida, no de la tolerancia (0,5 m).** La función es la misma para la puerta y para el generador.
   - Sobre una misma ciudad (la de 2b31cda), solo este cambio baja las desalineadas de 189 a 178.

Se probó y se descartó contar para la recta lo edificado de las cuadras de 1936 que siguen en pie: su máscara no es la de sus casas, y las desalineadas subían de 231 a 243.

| Criterio | Después de T33j.5d (609685f) | Con la figura por tramo (2b31cda) | Con la recta girada (1869cbc) |
|---|---|---|---|
| Frentes alineados | 231 casas desalineadas | 189 | **171** (en 121 frentes) |
| Lotes sin solapes | 0 pares | 0 | 0 (cumple) |
| Casas con acceso | 4 sin acceso | 2 | 4 |
| Calle aprobada | fase 3 en 5/5 | 5/5 | 5/5 |

- La fase 4 sigue en 6/6.
- La ciudad de 1772 tiene 6325 casas visibles.
- Los techos del pipeline quedan en 39.556, dentro de la tolerancia de 39.395.

De las 171 que quedan, por frente:

| Causa | Frentes | Casas |
|---|---|---|
| Retiro de lo rojo de más de 8 m (más allá del tope) | 53 | 80 |
| Reconstrucción a no más de 8 m: cuñas de esquina y huecos de solar del reparto | 52 | 61 |
| Frente mixto: la reconstrucción frente a una cuadra de 1936 en pie | 8 | 14 |
| Eje llevado a 1936 metido en las casas | 6 | 15 |
| Solo casas de 1936 | 2 | 2 |

## Después de T33j.5f: las casas a la vista sobre la recta de su frente

El reparto de cada cuadra deja casas que no llenan su lote hasta la fachada: cuñas de esquina, lotes de solar, quiebres del polígono. La alineación de las cuadras no las alcanza.

El último paso del generador (`epocas.alinear_1772` → `fachadas.alinear_casas`) mide cada frente sobre la ciudad final, como la puerta. Toma las casas en pie y a la vista en 1772, con las plantas de los hitos cortando el rayo, y lleva a la recta las casas de la reconstrucción que salen de la tolerancia, hasta 8 m:

- Lo que suman no pisa a otra casa, ni los corredores de calle de la fase 3: las calles de 1772 y las verificadas, con su núcleo de 4 m.
- Una huella que queda con un hueco, o que pierde más de media casa, no se toca.
- Las huellas salen en la grilla de la ciudad (milésimas de píxel) y válidas.
- El visor techa igual: las alas que tocan el borde del lote se estiran hacia afuera y se recortan por la huella (`src/alas.js`).

| Criterio | Después de T33j.5e | Después de T33j.5f |
|---|---|---|
| Frentes alineados | 171 casas desalineadas | **115** (en 85 frentes; 143 casas ajustadas: no se vuelven a medir una por una, la puerta mide el resultado) |
| Lotes sin solapes | 0 pares | 0 (cumple) |
| Casas con acceso | 4 sin acceso | 4 |
| Calle aprobada | fase 3 en 5/5 | 5/5 |

- La fase 4 sigue en 6/6.
- La ciudad de 1772 tiene 6325 casas visibles.

Medido otra vez sobre los datos publicados (`datos-2026-11-22-3e45a28`, con la Plaza Mayor centrada en #132): 115 casas desalineadas en 85 frentes, 0 pares y 4 sin acceso.

## Después de T33j.5g: una casa es fachada del frente si es de su manzana

De las 115 desalineadas, unas 80 eran casas que el rayo toca sin que sean de ese frente:

- casas de la esquina de enfrente, pasada la bocacalle, cuando la cuadra es más corta que el tramo (62 observaciones en las puntas del tramo);
- casas aisladas de la periferia, sobre tramos casi vacíos;
- casas del fondo vistas por una abertura del frente.

**Cambio de la medida**, por decisión del responsable del 22-11-2026, sin tocar la tolerancia (0,5 m):

- Una casa cuenta como fachada de un frente si es de la manzana edificada que lo arma. Es la de la mayoría de los golpes de ese lado, con las casas juntadas cerrando los huecos de menos de 2 m, como en la puerta de acceso.
- Lo de otras manzanas no se mide en ese frente. Se mide en el suyo.
- Una casa corrida dentro de su manzana sigue desalineada.
- El generador (`alinear_casas`) usa la misma regla.

Se probó además exigir que el punto de fachada cayera sobre el contorno exterior de la manzana, para descartar las casas del fondo vistas por una abertura. No cambió nada: las aberturas de la ciudad tienen más de 2 m, y el contorno entra por ellas. Se descartó.

| Criterio | Datos publicados | Solo la medida nueva | Medida y generador (6f4bf90) |
|---|---|---|---|
| Frentes alineados | 115 casas desalineadas | 84 | **83** (en 64 frentes) |
| Frentes medidos | 567 | 568 | 568 |
| Casas medidas | ≈ 4600 | 4509 | 4508 |
| Lotes sin solapes | 0 pares | 0 | 0 (cumple) |
| Casas con acceso | 4 sin acceso | 4 | 4 |
| Calle aprobada | fase 3 en 5/5 | 5/5 | 5/5 |

Las fases 3 y 4 siguen cerrables.

De las 83 que quedan:

- 46 son casas que el rayo ve por una abertura de más de 2 m, dentro de su manzana. Son aberturas del frente, que se cierran en la fase 7.
- 16 son de la reconstrucción a no más de 8 m: cuñas de esquina y huecos de solar.
- 6 tienen que ver con casas de 1578.
- 5 son manzanas retiradas enteras.
- 4 están en frentes con el eje metido en las casas.
- El resto son casas sueltas de 1936 o de frentes mixtos.

## Lo que sigue

- **Aberturas del frente.** La fase 7 cierra las aberturas indebidas. Decidir si se adelanta para estos frentes o si quedan como límite de la fase 5 hasta la 7.
- **Cuñas de esquina y huecos de solar**, y las casas de 1578 delante de la reconstrucción.
- **Las 4 casas sin acceso.**

## Reproducir

```
npm run datos -- --desde vectorizar
.venv/bin/python tools/geo/cierre_fase5.py specs/auditoria-1772 fuentes/derivados/epocas/ciudad-epocas.json --datos <release o commit>
```
