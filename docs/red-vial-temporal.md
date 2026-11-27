# Registro vial temporal — T82.P1.RED

Herramienta offline para #269, #277 y #278. No sustituye todavía la red dibujada,
las reservas de casas ni los datos publicados. Un resultado vacío significa
**cobertura pendiente**, no una ciudad sin calles.

```sh
node tools/red-vial.mjs auditar
node tools/red-vial.mjs exportar .cache/red-vial
```

Se escriben seis JSON para 1772, 1843, 1889, 1911, 1936 y 1946. La herramienta
rechaza escribir directamente en `public/`. Revisar el resultado antes de conectarlo
al pipeline; no publicar estos archivos como reemplazo de las redes existentes.

## Contrato y evidencias

`version: 1`, `sistema: mosaico-1936-px`. Cada tramo tiene un `id` estable y etapas
explícitas con `anio`, `estado`, `puntos`, `ancho_m`, `error_m`, `fuentes` y opcional
`medible`. Estados: existente, obra, proyecto, ausente y desconocido. El ancho y
el error pueden ser `null`: no se deduce un ancho histórico del error de calce.
La salida conserva este último como `banda_m`, para el contrato de referencias.

Cada fuente identifica URL, tipo y años que acredita. Una fuente actual sola no
acredita una calle histórica. Una fase moderna con `desde` necesita fuentes de
cronología; su ausencia anterior no significa que no hubiera un camino predecesor.
El registro contiene seis fases concretas posteriores a 1946, no una cronología
exhaustiva de toda la vialidad moderna.

Solo `existente` medible llega a `tramos`. El resto queda en listas separadas.
No se interpola una fecha ni se copia automáticamente una red entre mapas.
IDs, años, referencias, coordenadas, anchos y aperturas se validan antes de exportar.
Las salidas clonan coordenadas y procedencia; no mutan los datos de entrada.

## Importación inicial y cobertura

Se leen las referencias ya curadas del repo:

- `tools/geo/referencias/1772-calles-1936.json`: red de **1772 calzada al mosaico
  de 1936**, no prueba de que todas esas calles existieran en 1936. Se conservan
  puntos, banda, sector e identificadores de evidencia.
- `tools/geo/calles-historicas.json`: once trazados verificados en ambos planos.
  Se conservan anclajes, píxeles originales y notas; IDs con prefijo `recuperado:`.
- `tools/geo/referencias/vialidad-posterior-1946.json`: fases modernas con fuente,
  sin inventar ejes ni copiar OSM. Incluye predecesores como dato separado.

| Año | Registros utilizables | Pendientes | Fases modernas aún ausentes |
|---|---:|---:|---:|
| 1772 | 449 | 29 | 6 |
| 1843 | 0 | 478 | 6 |
| 1889 | 0 | 478 | 6 |
| 1911 | 0 | 478 | 6 |
| 1936 | 11 | 467 | 6 |
| 1946 | 0 | 478 | 6 |

Estos son conteos de registros, no calles únicas ni kilómetros: los once trazados
recuperados pueden coincidir espacialmente con partes de la referencia extensa.
No se concatenan en producción sin resolver identidad, nudos y duplicados espaciales.

## Completar una época e integrar

1. Leer la ficha del plano y sus restricciones. Digitalizar ejes sobre el documento
   de la época, conservando coordenadas originales, transformación y error.
2. Añadir etapa explícita y fuente con ese año. Distinguir trazado abierto,
   proyecto, obras y fecha de ensanche; no usar la inauguración de una avenida
   como fecha de inexistencia de la calle que la precedió.
3. Revisar topología, duplicados, conexión de extremos y anchos documentados.
   El validador de esquema no sustituye esta inspección cartográfica.
4. Comparar en las seis épocas, con las reglas de construcción y los corredores
   libres. Incorporar por separado la lectura al pipeline/runtime con tests y
   capturas. Mantener las redes actuales mientras la cobertura esté incompleta.
5. Regenerar datos y publicar por el flujo de releases solo tras esa integración.

Fuentes de mapas: [PARES, plano de 1772](https://pares.cultura.gob.es/ParesBusquedas20/catalogo/description/26112)
y [plano de 1936](https://archive.org/details/WCWdb_18053). Licencias: conservar
las fichas en `fuentes/mapas/`; no se incorpora ni redistribuye ningún escaneo nuevo.
Las fuentes de fechas modernas están enlazadas individualmente en el JSON.
Su contenido e imágenes se consultan, no se redistribuyen.
