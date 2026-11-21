# Calce de 1772 por identidad · T33j.2a (primera parte)

Fecha: 21-11-2026. Resuelve la causa de I010 en el calce. Generado por `tools/geo/anclas_identidad.py`; datos en [calce-identidad.json](calce-identidad.json). **Mide el calce contra sus propias anclas; no certifica la exactitud geográfica ni cierra la correspondencia por unidad.**

## Qué cambia

El calce anterior arrancaba en las 4 esquinas de la Plaza Mayor y agregaba enlaces por correlación de la red de calles: 238 enlaces automáticos. Fuera del núcleo esa correlación enganchaba la calle equivocada y desplazaba manzanas enteras: Candelaria a 303 m ([controles-damero.md](controles-damero.md)).

El calce nuevo (`tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json`, `etapas: []`) **no usa correlación**. Sus 170 puntos son todos parejas por identidad:

- **4 semillas:** las esquinas de la plaza, leídas a mano, como antes.
- **164 cruces de damero:** cada cruce del original va a la esquina de 1936 con el mismo índice de calles contado desde Las Monjas (`controles-calce-sectores.json`). Los 4 cruces que coinciden con una semilla se omiten (X1772-0060, -0061, -0077, -0078; están a menos de 3 px y 5 m), así cada esquina tiene una sola ancla.
- **2 hitos:** Candelaria y La Pastora, del centro de su unidad en el original al hito de 1936. La Plaza Mayor ya está cubierta por las semillas.

Antes de ajustar se validan las parejas, y el programa se detiene si alguna falla:
- **Cruces compartidos únicos:** ninguna esquina de 1936 ni ningún índice se usa dos veces.
- **Orden de calles igual al original:** cada triángulo de cruces vecinos gira hacia el mismo lado en el original y en 1936. El plano está girado, no espejado.

Los 168 nodos pasan las dos comprobaciones. Además, el TPS resultante no se pliega en ninguna celda de 10 px del marco.

`suavizado` = 0,005. Con 0,05, el valor anterior, el ajuste se alejaba de las anclas aisladas: La Pastora quedaba a 54 m de su ancla. Con 0,005 el residuo mediano es 4,5 m, del orden del error de lectura de un cruce, y el error dejando uno fuera casi no cambia: rms 21,8 m frente a 21,7 m.

## Resultado

El **error dejando uno fuera (LOO)** es la distancia entre cada ancla y el TPS ajustado sin ella. Es la medida honesta: el residuo de un ancla en su propio ajuste es casi cero por construcción.

| Sector | Anclas | Mediana LOO (m) | Máx LOO (m) | Mediana residuo (m) | < 15 m |
|---|---|---|---|---|---|
| S1772-11 | 2 | 5,2 | 7,9 | 1,2 | sí |
| S1772-12 | 2 | 7,9 | 13,4 | 2,0 | sí |
| S1772-13 | 8 | 11,8 | 31,4 | 5,3 | sí |
| S1772-14 | 1 | 141,8 | 141,8 | 12,3 | no (solo La Pastora) |
| S1772-21 | 9 | 4,0 | 48,9 | 2,0 | sí |
| S1772-22 | 25 | 11,2 | 23,8 | 5,4 | sí |
| S1772-23 | 29 | 8,9 | 34,2 | 4,3 | sí |
| S1772-24 | 5 | 27,0 | 53,0 | 8,2 | **no** |
| S1772-31 | 7 | 16,8 | 54,3 | 5,3 | **no** |
| S1772-32 | 25 | 10,6 | 69,2 | 5,2 | sí |
| S1772-33 | 23 | 7,0 | 25,1 | 3,2 | sí |
| S1772-34 | 11 | 14,9 | 57,8 | 6,4 | sí |
| S1772-42 | 6 | 9,0 | 49,1 | 4,2 | sí |
| S1772-43 | 12 | 10,2 | 34,1 | 4,1 | sí |
| S1772-44 | 1 | 56,9 | 56,9 | 19,0 | no (una sola ancla) |

S1772-41 es rural y no tiene anclas.

- **Candelaria:** queda a **34 m** con su ancla fuera del ajuste. Está dentro del casco de las demás anclas, así que es una validación real: antes estaba a 303 m. Con la cuadra de 1772 en torno a 120 m, cumple «a menos de media calle».
- **La Pastora:** el TPS sin su ancla extrapola 170 px fuera del casco, y por eso su LOO de 142 m no mide nada. La cumple por construcción: queda a 12 m de su ancla. No hay otra pareja independiente en S1772-14 para comprobarla.
- **Nodos con LOO mayor que 50 m:** X1772-0188, -0104 (S1772-32), -0116, -0100 (S1772-34), -0119 (S1772-31), -0033 (S1772-24) y -0165 (S1772-44). Son candidatos a una lectura del cruce corrida o a una deformación real del dibujo de 1772. Se revisan con sus recortes antes de dar por cumplido el criterio en S1772-24 y S1772-31.

## Qué falta en T33j.2a

1. **Revisar los nodos de LOO alto.** Recortes en `.cache/damero-1772/controles/` y criterio por sector, que hoy no se cumple en S1772-24, S1772-31 ni en los dos sectores con una sola ancla.
2. **Regenerar `controles_damero.py` sobre el calce nuevo.** Los 168 cruces dejan de ser controles independientes: ahora son las anclas. El criterio de controles por sector de [cierre-fase1.md](cierre-fase1.md) pasa a medirse con el LOO, y el cierre tiene que dejar de leer el desvío del TPS anterior.
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
.venv/bin/python tools/geo/calce.py 1772-pares-agi-exato-mapa   # GCP, residuos y fuentes/derivados/1772/calzado.tif
```
