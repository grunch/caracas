# Manzanas completas de 1843: continuidad del tejido de 1772 (T82.5)

Esta tarea sustituye el alcance equivocado del PR #213. Sale de `main`, sin sus commits:
se implementan las manzanas completas, no un piloto de fachadas sobre las casas antiguas de 1843.

## Resultado y continuidad

Se conservan **las 253 unidades de generación de 1772**, con sus mismos perímetros, parcelas, marcos,
alas, pisos, semillas, colores, tejados y árboles. Las 3.169 casas del paquete de partida prolongan su
vida de `[1772,1843)` a `[1772,1889)`; no se vuelve a sortear su distribución. Esto implementa la
continuidad visual solicitada, no afirma que cada vivienda histórica sobreviviera sin cambios.

El censo revisado aporta **132 áreas de ampliación**, divididas en **146 unidades** cuando la geometría
restante tiene varios componentes. Se añaden **1.041 casas** con el mismo planificador de Miraflores
que usa 1772. Hay **399 unidades en total**, con **6.597 árboles**: los 5.082 de las manzanas heredadas
conservan posición, radio y semilla; las nuevas reciben 1.515, con cantidades variables y al menos uno
por unidad. Las casas de las manzanas de 1772 no se densifican: el aumento corresponde a las zonas nuevas.

En los datos hay 4.210 casas en 1843; el visor muestra **4.208**. Dos casas heredadas junto a la Trinidad
quedan ocultas por la supresión del modelo histórico ya existente, activo desde 1843 (`panteon`). Sus
parcelas y registros se conservan, y 1772 permanece intacto. No se desactiva esa protección para dibujar
casas encima del monumento. La continuidad visible es de 3.167 de las 3.169 casas anteriores; la continuidad
exacta de los registros, de 3.169. El informe de épocas distingue ambos valores.

## Referencia y selección

Se utiliza `tools/geo/referencias/1843-manzanas.json`, procedente del censo revisado y del calce de Jesurún.
La fuente y su licencia están en `fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler/ficha.json`:
[Plano topográfico de Caracas, Jesurún 1843, facsímil Müller & Stapler, copia NYPL](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas_(NYPL_b13925947-5382478).tiff), dominio público según la ficha.
El plano no describe el interior de las manzanas: la parcelación, densidad y arbolado siguen siendo
reconstrucciones del generador aprobado, no mediciones históricas.

- De las referencias, 149 corresponden al tejido heredado y 132 a la ampliación. Si al menos la mitad de
  una unidad coincide con 1772, prevalece la manzana ya construida: no se generan franjas duplicadas por
  pequeñas diferencias de calce.
- En las ampliaciones se recortan los límites anteriores y se reserva una separación de 6 m respecto al
  tejido conservado, usando el mismo ancho de calle inferido de 1772. No se altera ningún lindero anterior.
- Los espacios abiertos, huertas y lotes especiales no se rellenan con viviendas. Un edificio identificado
  explícitamente dentro de una huerta grande es un enclave edificado; una huerta pequeña dentro de una
  manzana, en cambio, queda libre. Esto incluye las áreas revisadas U1843-0087 y U1843-0300. Las plazas,
  los terrenos libres y los lotes especiales no tienen enclaves (R7 de `specs/13`): U1843-0343, rayada dentro
  del lote especial «q» (U1843-0348), queda sin área nueva útil y sin casas genéricas (2026-11-25, revisión
  de #214; decisión de Claude por delegación del responsable).
- 79 referencias son espacios no residenciales o descartados; otras cuatro siguen pendientes en el censo
  (tres candidatas rayadas y una huerta). No se convierten sus dudas en nuevas construcciones confirmadas.
- Se respetan las reservas y los tejados de los edificios históricos activos en 1843. Cada ampliación
  mantiene patios y árboles fuera de los tejados.

## Pipeline y uso

El nuevo paso `manzanas-1843` se ejecuta después de `manzanas-1772`. El empaquetador consume
`ciudad-manzanas-1843.json`, y los árboles consumen ambos informes de manzanas. `npm run datos` incluye
las dependencias necesarias para que un cambio en el generador o en el censo vuelva a generar la salida.

Para regenerar solo estos derivados en un checkout que ya tenga las entradas:

```sh
node tools/manzanas-1843.mjs fuentes/derivados/epocas/ciudad-manzanas.json fuentes/derivados/epocas/ciudad-manzanas-1843.json
node tools/empacar-ciudad.mjs fuentes/derivados/epocas/ciudad-manzanas-1843.json
node tools/arboles.mjs fuentes/derivados/1936/segmentacion/mosaico/arboles.json fuentes/derivados/1936/mosaico.json fuentes/derivados/1936/segmentacion/mosaico/jardines.json fuentes/derivados/1936/segmentacion/mosaico/clases-costura.png --manzanas-1843
npm run datos -- --verificar
```

La bandera de árboles implica también la integración previa de 1772. El paquete público, árboles y
manifiesto se regeneraron localmente; no se incluyen binarios ni se publica un release en este PR.
Para llevar el resultado al sitio publicado, después de revisar/fusionar el código hay que publicar el
release de datos correspondiente. No basta con desplegar JavaScript sobre el paquete viejo.

La vista normal de 1843 recibe las manzanas completas, **sin parámetros experimentales**. El piloto
opcional `?detallecasas=1` reutiliza sus mismas tres mallas por nivel sobre las casas conservadas durante
1772–1843 y se apaga desde 1889; no usa las fachadas nativas diferentes del PR #213.

## Verificación

`reglas/manzanas-1843/comparacion-epocas.json` compara los paquetes del visor: **1578, 1772, 1889, 1911 y
1936 conservan sus firmas exactas de casas y árboles**. En 1843 se sustituye el tejido anterior de 10.284
casas visibles por las 4.210 del generador: son más que las 3.169 de 1772, con el mismo criterio de lotes
amplios aprobado por el responsable, no una reproducción de la densidad nativa antigua de 1843.

`reglas/manzanas-1843/auditoria-espacial.json` verifica todos los perímetros y semillas heredados, todos
los árboles heredados, cero solares nuevos sobre 1772, cero solares fuera de su unidad, cero solape entre
solares nuevos y cero copas nuevas sobre tejados. No sustituye los umbrales históricos aún pendientes
de las reglas generales R1–R12. Reproducción:

```sh
node tools/auditar-manzanas-1772.mjs /ruta/datos-antes public/datos /tmp/epocas.json 1843
.venv/bin/python tools/geo/auditar_continuidad_manzanas.py /ruta/manzanas-1772-informe.json fuentes/derivados/epocas/manzanas-1843-informe.json fuentes/derivados/epocas/ciudad-manzanas-1843.json /tmp/espacial.json
```

Capturas locales: `../miraflores/entregables/manzanas-1843/`, antes/después, cinco épocas, cámara y modo
idénticos. El centro de 1772, 1889, 1911 y 1936 resulta idéntico píxel por píxel; las vistas generales
presentan diferencias mínimas de rasterización (como máximo 0,013 % de canales, diferencia media menor
que 0,00014/255). En 1843 cambia el tejido completo y se revisaron además el norte y el oeste. El informe
visual registra las cámaras y la repetición aislada de las últimas capturas, con contexto WebGL válido.
La revisión humana sigue pendiente.

## Tests y rendimiento

- Vitest: **108 archivos, 1.724 tests correctos** (`--maxWorkers=2 --testTimeout=20000`).
- Python: **1.004 tests correctos** en la suite completa; después, **9 correctos** en los módulos de ampliación y recorte tras añadir el caso de referencia pendiente.
- E2E con datos completos/GPU: **88 correctos, 1 omitido, 2 fallidos**. La nueva prueba `manzanas-1843.spec.js` pasó; valida continuidad, crecimiento, paleta y reutilización del piloto. Los dos fallos son `hitos.spec.js:96` (expected-failure que pasa) y `:117` (color de la hoja acostada). Ambos se reprodujeron sobre el build limpio de `main` (`69ef647`), con exactamente los mismos resultados.
- Build, presupuesto del build, `npm run datos -- --verificar`, comparación de seis épocas y auditoría espacial: correctos.
- Las pruebas nuevas cubren intervalos sin alterar otras épocas, huertas/enclaves, reservas del tejido anterior y referencias aún pendientes.

Medido en builds de producción, datos completos de cada versión, NVIDIA RTX 2060, 1280×800, `--gpu --epoca 1843`, esperando a que termine la transición. Informes completos: `specs/reglas/manzanas-1843/rendimiento-base.json` y `rendimiento-1843.json`.

| Medida | main | rama | Tope |
|---|---:|---:|---:|
| casasMs | 6083 | 5922 | 5000 |
| tareaMasLargaMs | 809 | 477 | 200 |
| bytesAlAbrir | 9993538 | 10147162 | 8000000 |
| heapMB | 125 | 125 | 250 |
| triangulosCentro | 4659055 | 5144965 | 2000000 |
| msPorCuadroCentro | 8.3 | 8.1 | 16.6 |

Los triángulos del centro suben 10,4 % por las alas/patios de las manzanas completas y el arbolado adicional; los bytes al abrir suben 153.624 (+1,54 %) por los datos nuevos. Las llamadas de dibujo del centro bajan de 222 a 196. Mediana por cuadro: centro 8,3→8,1 ms, valle 7,8→7,4 ms, cerca 8,7→8,8 ms (variación menor al 5 %). No se midieron teléfonos. Los topes de carga, tarea larga, transferencia y triángulos ya se exceden en main y siguen excedidos; no se cambiaron. Build: 309,7/330 KB iniciales, 139,7/150 KB workers y 1,3/3 KB service worker, todos dentro del presupuesto.
