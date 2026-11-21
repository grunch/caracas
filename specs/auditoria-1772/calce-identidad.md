# Calce de 1772 por identidad · T33j.2a

Fecha: 21-11-2026; esquinas que son rótulos, 21-11-2026. Resuelve la causa de I010 en el calce. Generado por `tools/geo/anclas_identidad.py`; datos en [calce-identidad.json](calce-identidad.json). **Mide el calce contra sus propias anclas; no certifica la exactitud geográfica ni cierra la correspondencia por unidad.**

## Qué cambia

El calce anterior arrancaba en las 4 esquinas de la Plaza Mayor y agregaba enlaces por correlación de la red de calles: 238 enlaces automáticos. Fuera del núcleo esa correlación enganchaba la calle equivocada y desplazaba manzanas enteras: Candelaria a 303 m ([controles-damero.md](controles-damero.md)).

El calce nuevo (`tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json`, `etapas: []`) **no usa correlación**. Sus 161 puntos son todos parejas por identidad:

- **4 semillas:** las esquinas de la plaza, leídas a mano, como antes.
- **155 cruces de damero:** cada cruce del original va a la esquina de 1936 con el mismo índice de calles contado desde Las Monjas (`controles-calce-sectores.json`). Los 4 cruces que coinciden con una semilla se omiten (X1772-0060, -0061, -0077, -0078; están a menos de 3 px y 5 m), así cada esquina tiene una sola ancla. Otros 9 se excluyen porque su esquina de 1936 es un rótulo, no un cruce (abajo).
- **2 hitos:** Candelaria y La Pastora, del centro de su unidad en el original al hito de 1936. La Plaza Mayor ya está cubierta por las semillas.

Antes de ajustar se validan las parejas, y el programa se detiene si alguna falla:
- **Cruces compartidos únicos:** ninguna esquina de 1936 ni ningún índice se usa dos veces.
- **Orden de calles igual al original:** cada triángulo de cruces vecinos gira hacia el mismo lado en el original y en 1936. El plano está girado, no espejado.

Los 168 nodos pasan las dos comprobaciones (se validan todos, también los excluidos). Además, el TPS resultante no se pliega en ninguna celda de 10 px del marco.

`suavizado` = 0,005. Con 0,05, el valor anterior, el ajuste se alejaba de las anclas aisladas: La Pastora quedaba a 54 m de su ancla. Con 0,005 el residuo mediano es 4,5 m, del orden del error de lectura de un cruce, y el error dejando uno fuera casi no cambia.

## Esquinas de 1936 que son rótulos, no cruces

El archivo de esquinas de 1936 (`tools/geo/esquinas/1936-esquinas.json`) es el diccionario del buscador: en 135 de sus 329 esquinas el punto es el rótulo con el nombre, no el cruce. Son las que no tienen cota; las que la tienen se leyeron en la cota impresa del cruce. Para el buscador basta el rótulo; para un ancla del calce hace falta el cruce. El archivo no se toca.

La revisión de los 7 nodos de LOO mayor que 50 m lo mostró: en 6 la esquina asignada no está en un cruce. San Martín cae en el jardín de una plaza, La Caridad y La Eternidad en la quebrada, «…ernador» a media cuadra junto a la costura del mosaico, Regeneración y Palo Blanco sobre su rótulo. Solo Dos Pilitas (X1772-0033) está en el cruce: su error es del borde del damero.

**Regla** (`excluir_rotulos`): una esquina **sin cota** cuyo punto queda a más de 4 m del nudo de calles más cercano (esqueleto de la clase calle de la segmentación de 1936, `distancia_a_nudo_px`) no es un cruce y no entra al calce. Las esquinas con cota se conservan; en el centro, las calles anchas y las plazas corren los nudos del esqueleto y la prueba no sirve para ellas. No se lleva ninguna esquina al cruce «más cercano a la predicción»: eso haría que el ancla se confirmara a sí misma (en Palo Negro, X1772-0156, la esquina guardada ya está en un cruce y la predicción prefería el vecino).

| Nodo | Sector | Esquina 1936 | Distancia al nudo (m) |
|---|---|---|---|
| X1772-0032 | S1772-24 | 9 de Febrero | 17,3 |
| X1772-0084 | S1772-24 | Macuro | 23,8 |
| X1772-0100 | S1772-34 | La Eternidad | 18,2 |
| X1772-0104 | S1772-32 | «…ernador», cortado por la costura | sin nudo cerca |
| X1772-0116 | S1772-34 | La Caridad | 11,4 |
| X1772-0119 | S1772-31 | Regeneración | 29,0 |
| X1772-0132 | S1772-33 | El Aguacatico | 11,1 |
| X1772-0167 | S1772-42 | Monagas | 6,7 |
| X1772-0188 | S1772-32 | San Martín | 20,7 |

Las 9 se revisaron a ojo con recortes del mosaico. El Aguacatico (X1772-0132) es la dudosa: el punto está sobre la calle junto al puente, sin calle que la cruce, aunque coincide con la predicción; sale igual, porque la identidad tiene que venir del plano de 1936. Las excluidas tampoco cuentan como controles en el cierre.

## Resultado

El **error dejando uno fuera (LOO)** es la distancia entre cada ancla y el TPS ajustado sin ella. Es la medida honesta: el residuo de un ancla en su propio ajuste es casi cero por construcción.

| Sector | Anclas | Mediana LOO (m) | Máx LOO (m) | Mediana residuo (m) | < 15 m |
|---|---|---|---|---|---|
| S1772-11 | 2 | 5,2 | 8,0 | 1,2 | sí |
| S1772-12 | 2 | 7,9 | 13,5 | 2,0 | sí |
| S1772-13 | 8 | 11,8 | 31,3 | 5,3 | sí |
| S1772-14 | 1 | 141,6 | 141,6 | 12,2 | no (una sola ancla: La Pastora) |
| S1772-21 | 9 | 5,4 | 49,4 | 2,6 | sí |
| S1772-22 | 25 | 11,2 | 23,8 | 5,2 | sí |
| S1772-23 | 29 | 8,8 | 34,2 | 3,9 | sí |
| S1772-24 | 3 | 36,3 | 77,1 | 7,3 | **no** |
| S1772-31 | 6 | 16,2 | 24,1 | 6,5 | **no** |
| S1772-32 | 23 | 8,1 | 25,6 | 3,6 | sí |
| S1772-33 | 22 | 7,0 | 21,7 | 3,3 | sí |
| S1772-34 | 9 | 10,6 | 47,5 | 4,1 | sí |
| S1772-42 | 5 | 9,3 | 23,4 | 3,9 | sí |
| S1772-43 | 12 | 10,2 | 34,2 | 4,1 | sí |
| S1772-44 | 1 | 56,9 | 56,9 | 19,0 | no (una sola ancla) |

S1772-41 es rural y no tiene anclas. LOO de todo el calce: rms 19,3 m, p90 21,7 m (antes de excluir los rótulos: 21,8 y 30,0 m).

- **Candelaria:** queda a **34 m** con su ancla fuera del ajuste. Está dentro del casco de las demás anclas, así que es una validación real: antes estaba a 303 m. Con la cuadra de 1772 en torno a 120 m, cumple «a menos de media calle».
- **La Pastora:** el TPS sin su ancla extrapola 170 px fuera del casco, y por eso su LOO de 142 m no mide nada. La cumple por construcción: queda a 12 m de su ancla. No hay otra pareja independiente en S1772-14 para comprobarla.
- **Nodos con LOO mayor que 45 m:** X1772-0033 (S1772-24, 77 m: en el cruce, pero en el borde con un solo vecino), X1772-0165 (S1772-44, 57 m: la única ancla del sector), X1772-0182 (S1772-21, 49 m) y X1772-0156 (S1772-34, 47 m). Los cuatro están en un cruce de 1936; su error es del dibujo de 1772 o de la extrapolación en el borde.

## Qué falta en T33j.2a

1. **Anclas nuevas en los sectores que no cumplen.** S1772-24 (3 anclas, mediana 36 m) y S1772-31 (6, mediana 16,2 m) no bajan de 15 m; S1772-14 y S1772-44 tienen una sola ancla. Hace falta leer otros cruces o hitos con identidad clara en esos bordes.
2. **Regenerar `controles_damero.py` sobre el calce nuevo.** Los 168 cruces dejan de ser controles independientes: ahora son las anclas. El cierre ([cierre-fase1.md](cierre-fase1.md)) ya no cuenta como control independiente nada que caiga a menos de 6 px de un punto del ajuste, ni un desvío medido sobre otro calce, y exige el LOO por sector bajo 15 m: el criterio de controles por sector queda pendiente. De los 23 nodos curados de `controles-calce-centro.json`, 22 coinciden con anclas; hacen falta controles nuevos, fuera de las anclas, en cada sector.
3. **Reclasificar las 292 correspondencias sobre el calce nuevo.**
   - Las 42 uno a uno se conservan solo con evidencia de identidad por pareja.
   - U1772-0055 se reclasifica.
   - Las 168 ausentes se relocalizan, sin inventar ninguna.
   - Para esto hace falta una muestra visual nueva, ligada a la clasificación vigente.
4. **Regenerar los datos** (`npm run datos`) y publicarlos con la decisión del responsable. El calce alimenta `calzado.tif`, las calles nuevas, el edificado de 1772 y `vectorizar`; hasta entonces `datos:al-dia` avisa que los datos publicados quedaron viejos.

## Reproducir

```
.venv/bin/python tools/geo/anclas_identidad.py --controles specs/auditoria-1772/controles-calce-sectores.json \
  --gcp tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json --informe specs/auditoria-1772/calce-identidad.json
  # --datos <checkout con fuentes/derivados/1936> si la segmentación no está en este checkout
.venv/bin/python tools/geo/calce.py 1772-pares-agi-exato-mapa   # GCP, residuos y fuentes/derivados/1772/calzado.tif
```
