# Calce de 1843 por identidad (T81, fase 1A)

Fecha: 24-11-2026. Base: [B1843-001](B1843-001.json) (`main` f00b74d, `datos-2026-11-24-9465608`).

## Qué se hizo

1. **Esquinas del original.** Cuatro lectores independientes, uno por cuadrante con solape, ubicaron cada número de esquina impreso en el facsímil y su cruce de calles ([esquinas-original.json](esquinas-original.json)): 235 lecturas, 144 puntos, 138 números distintos (faltan el 23 y el 48), 128 seguros. Dos lecturas del mismo número a menos de 8 px son la misma; seis números aparecen en dos lugares (9, 25, 27, 40, 56, 57) y no anclan.
2. **Leyenda.** Transcrita entera ([leyenda.json](leyenda.json)): 140 esquinas (no 136), iglesias A–T, ríos, puentes, puntos notables, calles y parroquias, con los recortes y sus SHA-256.
3. **Emparejado por nombre** (`tools/geo/esquinas_1843.py`): una esquina ancla solo con número, cruce y nombre seguros y un nombre único en el diccionario de 1936. 64 anclan; 74 quedan omitidas con motivo (50 sin pareja en 1936, 12 cruces dudosos, 6 números repetidos, 3 ambiguas, 3 nombres dudosos).
4. **Depuración por consistencia.** Se quita de a una el ancla cuyo error dejando uno fuera supera media cuadra (55 m). Salen 8: tres homónimos de 1936 a más de 1,4 km (La Soledad, Santa Ana, San Felipe) y cinco a entre 66 y 318 m (La Hoyada, Manduca, El Silencio, Mercaderes, Traposos). No se corrigen: quedan listadas en `contradicen_a_sus_vecinas` para revisarlas a ojo.
5. **Calce nuevo** sin correlación (`etapas: []`): 4 semillas de la plaza + 53 anclas (3 de las 56 caen sobre semillas). `calce.py` declara LOO RMS 12,4 m, p90 18,3 m, máximo 30,2 m. Sin pliegues: 0 celdas de 10 px con el jacobiano invertido en todo el marco del mapa (`anclas_identidad.celdas_plegadas`).

## Resultado

| Medida | Calce publicado (correlación) | Calce por identidad |
|---|---|---|
| Desvío mediano a las 64 anclas | **115,4 m** | 4,4 m (residuo) |
| Error dejando uno fuera (RMS) | 13,3 m declarado sobre sus propios GCP | 12,5 m en las anclas: cada una se quita del calce desplegado (o la semilla sobre la que cae) y se mide en su propio destino |

El calce publicado se aparta por cuadras fuera del núcleo: en S1843-33, alrededor de la plaza, 16 m; en el sur (S1843-52/53/54), 205–282 m, casi siempre hacia el norte. Es el defecto de 1772 (I1772-010): **I1843-001** ([incidencias.json](incidencias.json)). Su residuo LOO declarado (13,3 m) no lo detectaba porque mide la coherencia de los puntos de la correlación entre sí, no su identidad.

Por sector ([calce-identidad.json](calce-identidad.json)): 11 sectores tienen anclas, todos con al menos dos. 10 cumplen la mediana bajo 15 m. **S1843-42** (3 anclas, 16,9 m de mediana LOO en el calce desplegado) queda como límite documentado, y los 14 sectores sin anclas (cerros, campo, bordes) quedan como no controlados ([limites-calce.json](limites-calce.json)). La medición del calce publicado se conserva en [controles-calce-correlacion.json](controles-calce-correlacion.json).

## Límites

- El diccionario de 1936 da la posición de cada nombre en 1936; una esquina que cambió de lugar o de nombre entre 1843 y 1936 se detecta solo si contradice a sus vecinas.
- La lectura del cruce es a ojo, con un error de 2–3 px (≈1–2 m sobre 1936).
- La superposición de QA (`fuentes/derivados/1843/qa-calce.jpg`, fuera de git) muestra las calles de 1843 sobre las de 1936 en el centro sin cuadrícula doble; la verificación por unidad es la del censo (1B).
