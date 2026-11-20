# I006: contar el paquete publicado sin perder los controles del origen

T33j.1n. La discrepancia se debía a `tools/datos.mjs`: `verificar` leía
`ciudad-1936.json` para llenar `conteos` del manifiesto, aunque el paquete se arma
después del procesamiento de épocas. El conteo de árboles también procedía de la
segmentación inicial y no del binario que consume el visor.

Se conservan las comprobaciones de `tools/datos-esperados.json` sobre el origen,
con sus tolerancias actuales. El manifiesto separa ahora:

- `conteos`: registros reales de `ciudad.pak` y `arboles.bin` publicados.
- `conteos_origen`: techos, manzanas y árboles del derivado de 1936 usado por esos
  controles. El paquete no serializa identidades de manzana; no se inventa un
  conteo publicado de manzanas.

El lector del `.pak` es el mismo que usa el visor. Cada techo ocupa cuatro uint32
y cada árbol ocho bytes. Se rechazan registros parciales y la ausencia de techos.
Los conteos cero son válidos; no se sustituyen por cantidades de una etapa anterior.
No cambian los umbrales esperados ni se interpreta la diferencia como casas faltantes.

## Comprobación sobre B1772-001

En un checkout aislado, con copia independiente de `public/` y los derivados de
origen de la baseline, se ejecutó `node tools/datos.mjs --verificar`. Terminó con
código 0 y produjo:

| Etapa | Techos | Árboles | Manzanas |
|---|---:|---:|---:|
| Paquete publicado | 33.853 | 36.319 | No serializadas |
| Derivado de origen | 35.089 | 5.926 | 8.023 |

El SHA-256 de `ciudad.pak` sigue siendo
`c27f09ea3ef25d3ea20b980067c913c5d80b78ddf184c43768bb448c985b24e4`.
Solo cambia el manifiesto local; no se publicó un release ni se modificó la
baseline de auditoría. I006 queda corregido en el generador del manifiesto,
pendiente de revisión y publicación de datos. No resuelve la geometría ni el
resto de T33j.8a.

## Validación

Tres regresiones verifican separación de etapas, independencia del objeto de
origen, conteos cero y rechazo de registros parciales. Fallaron antes de añadir
la implementación. Vitest completo: 72 archivos, 1.293 casos aprobados. Python
completo: 556 aprobados. La suite E2E se repite sobre una muestra generada desde
el manifiesto corregido, con puerto exclusivo 5228.
