# I006: contar el paquete publicado sin perder los controles del origen

T33j.1n. La discrepancia se debía a `tools/datos.mjs`: `verificar` leía
`ciudad-1936.json` para llenar `conteos` del manifiesto, aunque el paquete se arma
después del procesamiento de épocas. El conteo de árboles también procedía de la
segmentación inicial y no del binario que consume el visor.
`tools/arboles.mjs` añade árboles de jardines, patios y monte, además de descartar
algunos bajo techos: por eso el conteo final tampoco coincide con esa entrada.

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
completo: 556 aprobados. Playwright completo: 71 aprobados y uno omitido
(21,5 minutos, salida 0), sobre una muestra generada desde el manifiesto
corregido y con puerto exclusivo 5228.


Tras integrar el Panteón (#87), se repitió la validación con el mismo código
de producción que `main` en `311fcc7`: Vitest 73 archivos/1296 casos y Python
556 casos aprobados. La prueba de identificadores de cubierta mostró una
carrera: `lab.ready` anuncia el visor antes de que llegue `ciudad.pak`. La primera
corrección esperaba `#alzar`, pero la revisión detectó que también lo muestra
el relieve. Ahora la prueba retiene la descarga del pak hasta que aparece
el botón, comprueba que aún no hay casas, libera la descarga y espera una
malla de la escena con el material de la ciudad y atributo `aTecho` (ausente
en el suelo). Se conserva la exigencia de píxeles de techo y de IDs distintos.
La suite completa anterior al refuerzo de esta espera aprobó 72 casos de
navegador y omitió uno (12,8 minutos, salida 0). La regresión con descarga
retenida aprobó después del refuerzo (12,5 segundos, salida 0). No cambió
la geometría ni se publicó un release.
El archivo completo de acabado aprobó sus cuatro casos después del refuerzo
(43,9 segundos, salida 0).

## Publicación comprobada (T33j.8a, 23-11-2026)

Release `datos-2026-11-23-82cd470`: los datos de `main` en 82cd470 (las fases 1 a 8 hasta #159, con #158 y #160),
regenerados desde los escaneos con `npm run datos` y publicados con `npm run datos:publicar`. Pages lo desplegó (el
sitio baja el release con `published_at` más nuevo). En un worktree limpio de `main`, `npm run datos:bajar` bajó el
paquete y verificó sus 118 archivos contra el sha256 del manifiesto. El `.pak` publicado, leído con el lector del visor
(`src/pak.js`, después de `gunzip`), da:

| Etapa | Techos | Árboles | Manzanas |
|---|---:|---:|---:|
| Paquete publicado (registros del `.pak` y de `arboles.bin`) | 38.921 | 37.407 | No serializadas |
| `conteos` del manifiesto publicado | 38.921 | 37.407 | — |
| Derivado de origen (`conteos_origen`) | 39.549 | 5.926 | 8.023 |

Los conteos del manifiesto coinciden con los registros del paquete. `node tools/datos.mjs --verificar` termina con
código 0 sobre el mismo `public/`, que es idéntico archivo por archivo al publicado. SHA-256 de `ciudad.pak`:
`5a2e3ed2b424e843f2fe911ac2768c3cfc2de33b244deaf88402c1ba9f78050f`; de `arboles.bin`:
`891548c348f25eaad02b81bfff38dc30433cf591891a4ae6112b53423b5ac115`. I006 queda corregido y publicado.
