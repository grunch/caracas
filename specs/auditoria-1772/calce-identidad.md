# Calce de 1772 por identidad · T33j.2a

Fecha: 21-11-2026; esquinas que son rótulos y cruces por topología, 21-11-2026. Resuelve la causa de I010 en el calce. Generado por `tools/geo/anclas_identidad.py`; datos en [calce-identidad.json](calce-identidad.json). **Mide el calce contra sus propias anclas; no certifica la exactitud geográfica ni cierra la correspondencia por unidad.**

## Qué cambia

El calce anterior arrancaba en las 4 esquinas de la Plaza Mayor y agregaba enlaces por correlación de la red de calles: 238 enlaces automáticos. Fuera del núcleo esa correlación enganchaba la calle equivocada y desplazaba manzanas enteras: Candelaria a 303 m ([controles-damero.md](controles-damero.md)).

El calce nuevo (`tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json`, `etapas: []`) **no usa correlación**. Sus 170 puntos son todos parejas por identidad:

- **4 semillas:** las esquinas de la plaza, leídas a mano, como antes.
- **155 cruces de damero:** cada cruce del original va a la esquina de 1936 con el mismo índice de calles contado desde Las Monjas (`controles-calce-sectores.json`). Los 4 cruces que coinciden con una semilla se omiten (X1772-0060, -0061, -0077, -0078; están a menos de 3 px y 5 m), así cada esquina tiene una sola ancla. Otros 9 se excluyen porque su esquina de 1936 es un rótulo, no un cruce (abajo).
- **9 cruces por topología:** cruces de 1772 sin esquina con nombre en 1936, con la pareja que da el corte de su fila y su columna en el damero de 1936, revisados a ojo (abajo).
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

## Cruces sin esquina con nombre: pareja por topología

33 de los 201 cruces del trazado de 1772 no tienen esquina con nombre en 1936 en su índice. `cruce_por_topologia` les busca pareja solo con el plano de 1936: el corte de su fila (los cruces conocidos con el mismo `j`) con su columna (los del mismo `i`), con la dirección local de la retícula. No usa el calce, así que la pareja no se confirma a sí misma.

Solo entra al calce el corte que se ve en un cruce de calles del mosaico. La revisión a ojo está en [anclas-topologia.json](anclas-topologia.json): 9 aceptados, 6 de ellos junto a una cota impresa, y 11 rechazados (cinco caen en una cuadra o una quebrada, uno en la costura del mosaico, cinco dudosos). Otros 13 cruces de los bordes no tienen cruces conocidos en su fila o su columna. En los rechazados la calle de 1772 suele no existir en 1936: por eso no tenían esquina con nombre.

## Resultado

El **error dejando uno fuera (LOO)** es la distancia entre cada ancla y el TPS ajustado sin ella. Es la medida honesta: el residuo de un ancla en su propio ajuste es casi cero por construcción.

| Sector | Anclas | Mediana LOO (m) | Máx LOO (m) | Mediana residuo (m) | < 15 m |
|---|---|---|---|---|---|
| S1772-11 | 2 | 3,7 | 4,8 | 1,1 | sí |
| S1772-12 | 3 | 1,9 | 12,0 | 0,9 | sí |
| S1772-13 | 8 | 11,7 | 31,2 | 5,2 | sí |
| S1772-14 | 1 | 145,2 | 145,2 | 12,7 | no (una sola ancla: La Pastora) |
| S1772-21 | 9 | 5,3 | 49,2 | 2,6 | sí |
| S1772-22 | 25 | 11,2 | 23,8 | 5,2 | sí |
| S1772-23 | 29 | 8,0 | 34,2 | 3,7 | sí |
| S1772-24 | 5 | 30,8 | 61,9 | 8,9 | **no** |
| S1772-31 | 7 | 12,7 | 22,5 | 5,3 | sí |
| S1772-32 | 24 | 8,7 | 21,4 | 3,7 | sí |
| S1772-33 | 23 | 7,0 | 21,6 | 3,3 | sí |
| S1772-34 | 10 | 14,7 | 36,4 | 6,0 | sí |
| S1772-42 | 5 | 9,0 | 23,5 | 3,9 | sí |
| S1772-43 | 14 | 7,6 | 31,7 | 3,7 | sí |
| S1772-44 | 1 | 61,6 | 61,6 | 22,5 | no (una sola ancla) |

S1772-41 es rural y no tiene anclas. LOO de todo el calce: rms 18,9 m, p90 22,1 m (antes de excluir los rótulos: 21,8 y 30,0 m).

- **Candelaria:** queda a **34 m** con su ancla fuera del ajuste. Está dentro del casco de las demás anclas, así que es una validación real: antes estaba a 303 m. Con la cuadra de 1772 en torno a 120 m, cumple «a menos de media calle».
- **La Pastora:** el TPS sin su ancla extrapola 170 px fuera del casco, y por eso su LOO de 142 m no mide nada. La cumple por construcción: queda a 12 m de su ancla. No hay otra pareja independiente en S1772-14 para comprobarla.
- **S1772-24:** 5 anclas, mediana 30,8 m. Todas se apartan entre 20 y 60 m, media cuadra y no una calle entera: es una deformación del dibujo de 1772 en el borde este, no un error de conteo. Sus otros 5 cruces no tienen pareja segura en 1936 (la calle no existe o cae en la costura).
- **S1772-14 y S1772-44:** una sola ancla cada uno. Se revisaron los recortes del original: en S1772-14 hay la iglesia de La Pastora (ya es ancla), la alcabala del camino de La Guaira y cauces; en S1772-44, cauce, campo y la cartela del título. Ninguno tiene pareja segura en 1936, y un cauce de 1772 no se identifica sin duda en 1936.

## Qué falta en T33j.2a

1. **Hecho: S1772-14, -24 y -44 como límite documentado.** No cumplen el criterio con los puntos que hay y la tolerancia no se amplía (specs/08 1A). Por decisión del responsable (21-11-2026) quedan como límite documentado del calce en [limites-calce.json](limites-calce.json), atado a esta `huella_calce`; siguen visibles en la puerta y el defecto de S1772-24 es I1772-014 → T33j.2b.
2. **Controles por sector.** Por decisión del responsable (21-11-2026), el LOO de un sector con al menos 2 anclas cuenta como control independiente: cada ancla se mide con un calce que no la usa. La puerta exige además la mediana bajo 15 m. Cumplen 12 de los 15 sectores con unidades; los otros 3 son límite documentado.
3. **Hecho:** reclasificación de las 292 correspondencias sobre el calce nuevo, en [correspondencias-identidad.md](correspondencias-identidad.md).
4. **Regenerar los datos** (`npm run datos`) y publicarlos con la decisión del responsable. El calce alimenta `calzado.tif`, las calles nuevas, el edificado de 1772 y `vectorizar`; hasta entonces `datos:al-dia` avisa que los datos publicados quedaron viejos.

## Reproducir

```
.venv/bin/python tools/geo/anclas_identidad.py --controles specs/auditoria-1772/controles-calce-sectores.json \
  --gcp tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json --informe specs/auditoria-1772/calce-identidad.json
  # --datos <checkout con fuentes/derivados/1936> si la segmentación no está en este checkout
.venv/bin/python tools/geo/calce.py 1772-pares-agi-exato-mapa   # GCP, residuos y fuentes/derivados/1772/calzado.tif
```

## Corrección de la esquina Pajaritos (T33j.8d, 23-11-2026)

La esquina 1936 n.º 185 (Pajaritos), de la que sale el ancla X1772-0058, estaba en (8732,4, 7393,6): sobre el pliegue de
la hoja de 1936 y dentro de la calle Sur, 27 m al norte del cruce. El cruce real, al pie de la cota ▲906.940, es el de los
ejes de Sur (San Francisco–La Palma) y Este (Mercaderes–Camejo): (8744,8, 7446,6). El ancla torcía el calce: las calles
alrededor de San Francisco salían en diagonal y sus manzanas, trapezoidales; con la esquina corregida, el original calzado
muestra el damero recto. El LOO de X1772-0058 baja de 23,84 a 11,04 m; el del sector S1772-22, de 23,84 a 16,53 m como
máximo; el rms global, de 18,86 a 18,73 m. Solo se mueve ese nodo de la red. Los sectores límite del calce tienen las
mismas anclas y el mismo error ([limites-calce.json](limites-calce.json), revisión del 23-11-2026). El calce, al moverse,
cambia el reparto de algunas casas lejos de San Francisco: los casos nuevos de las fases 5 a 7 son de las clases que ya eran
límite y se registraron en ellas ([limites-fase5.json](limites-fase5.json), [6](limites-fase6.json), [7](limites-fase7.json)).

