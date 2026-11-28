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

## Contrato: la ficha de evidencias de cada etapa

`version: 2`, `sistema: mosaico-1936-px` (`tools/red-vial-lib.mjs`). Cada tramo tiene un
`id` estable y **etapas**, una por corte del sitio. Cada etapa es una ficha de evidencias:

| Campo | Qué dice | Si no se sabe |
|---|---|---|
| `anio` | El corte del sitio en el que rige (1772 … 1946) | No hay etapa: el tramo queda **pendiente** en ese corte |
| `estado` | `existente`, `obra`, `proyecto`, `ausente` o `desconocido` | `desconocido`, que no es `ausente` |
| `documento` | La fuente que acredita la etapa: un documento histórico de ese corte | Sin documento no hay etapa |
| fecha del documento | `fuentes[documento].fecha_documento`: cuándo se hizo o publicó, `{desde, hasta}` | `null`, escrito |
| `fecha_hecho` | Cuándo pasó lo que la etapa afirma, y qué fue: `levantamiento`, `proyecto`, `obra`, `apertura`, `reforma`, `nombre` o `demolicion` | `null`, escrito |
| `certeza` | `documentada` (leída sobre el documento de la época), `inferida` (deducida de otro dato) o `dudosa` (las fuentes no cierran) | No se admite vacía |
| `nombre` | El rótulo del documento de **esa** época | `null`: el documento no lo rotula o nadie lo transcribió |
| `contradicciones` | Afirmaciones enfrentadas, cada una con su fuente, y si siguen `pendiente` o están `resuelta` (con su `resolucion`) | Lista vacía |
| `puntos`, `ancho_m`, `error_m` | El eje en píxeles del mosaico, el ancho que da el documento y el error del calce | `ancho_m` y `error_m` admiten `null`; sin eje, `medible: false` |
| `recorte` | La caja del documento donde se lee, `{caja: [x0, y0, x1, y1]}` | `null` |

La fecha del documento y la del hecho son cosas distintas y el validador las cruza: **un
documento no acredita un hecho posterior a él**. El caso que lo motiva es el plano de
1946: las fotografías son de 1946 y la hoja está catalogada «[1950?]», así que su fuente
lleva `fecha_documento: 1946–1950` y `fecha_representada: 1946`. Las dos fechas salen de
la ficha de cada mapa (`año` y `año_representado` en `fuentes/mapas/*/ficha.json`), no se
escriben a mano. El facsímil de Jesurún no tiene fecha de impresión: su documento queda
en `null` y representa 1843.

Cada fuente identifica URL, tipo, años que acredita y fecha del documento. Una fuente
actual sola no acredita una calle histórica.

Un tramo puede llevar además su propia ficha: `tipo` (calle, avenida, autopista,
carretera, puente, túnel, viaducto, distribuidor), `nombres` con sus fechas, `encuadre`
(cuánto cae en la hoja del sitio), `cronologia` —una lista de afirmaciones fechadas, cada
una con su fuente y su certeza—, `contradicciones` y `desconocido` (lo que se buscó y no
se pudo documentar). Con `desde`, el tramo no existe antes de esa apertura; y solo puede
estar en `obra` o en `proyecto` en un corte anterior si su cronología lo dice para ese año.

### Qué sale en cada corte

| Lista | Qué contiene |
|---|---|
| `tramos` | Existentes, de certeza `documentada` y medibles. **Lo único utilizable como red** |
| `inferidos` | Existentes de certeza `inferida` o `dudosa`, con su geometría, aparte |
| `sinMedir` | El documento los acredita, pero no deja medir un eje (un sector sin calce, un puente sin cabezas) |
| `pendientes` | Sin evidencia para ese corte. **No son calles ausentes** |
| `ausentes` | El documento los niega, o su apertura es posterior |
| `proyectos`, `obras` | Lo que el documento dibuja sin estar abierto |
| `contradicciones` | Las pendientes de las etapas de ese corte |

No se interpola una fecha ni se copia una red entre mapas. Las salidas clonan coordenadas
y procedencia; no mutan los datos de entrada.

## Importación y cobertura

Se leen las referencias ya curadas del repo:

- `tools/geo/referencias/1772-calles-1936.json`: red de **1772 calzada al mosaico
  de 1936**, no prueba de que todas esas calles existieran en 1936. Se conservan
  puntos, banda, sector e identificadores de evidencia.
- `tools/geo/calles-historicas.json`: once trazados verificados en los planos de 1772 y
  de 1936. Se conservan anclajes, píxeles originales y notas; IDs con prefijo `recuperado:`.
- `docs/puentes-guaire-calce.json`: los seis cruces del Guaire calzados para #272, con lo
  que **cada plano** dibuja (`tools/red-vial-puentes.mjs`). IDs con prefijo `puente:`.
- `tools/geo/referencias/vialidad-posterior-1946.json`: fases modernas con fuente,
  sin inventar ejes ni copiar OSM. Incluye predecesores como dato separado.

Salida de `node tools/red-vial.mjs auditar`:

| Año | Tramos | Inferidos | Sin medir | Pendientes | Ausentes | Contradicciones |
|---|---:|---:|---:|---:|---:|---:|
| 1772 | 449 | 0 | 29 | 6 | 6 | 0 |
| 1843 | 0 | 0 | 0 | 484 | 6 | 0 |
| 1889 | 2 | 0 | 0 | 482 | 6 | 0 |
| 1911 | 2 | 3 | 0 | 478 | 7 | 3 |
| 1936 | 12 | 0 | 5 | 467 | 6 | 0 |
| 1946 | 0 | 0 | 4 | 480 | 6 | 0 |

Son conteos de registros, no calles únicas ni kilómetros: los once trazados
recuperados pueden coincidir espacialmente con partes de la referencia extensa.
No se concatenan en producción sin resolver identidad, nudos y duplicados espaciales.
Las seis fases modernas salen como ausentes en los seis cortes.

### Qué acredita cada plano en los cruces del Guaire

| Cruce | 1889 (Mestre) | 1911 (Razetti) | 1936 (DCN) | 1946 (DCN, fotos) |
|---|---|---|---|---|
| Sur 5 | Tramo; sin rótulo (n.º 14) | Tramo; «de Hierro» (n.º II) | Sin medir; «Puente de Hierro», 8 m | Sin lectura |
| Sur 7 | Tramo; sin rótulo (n.º 15) | Tramo; «Sucre» (n.º I) | Sin medir; «Puente Sucre», 9,8 m | Sin lectura |
| Sur 4 | Sin lectura | Dudoso; «Dolores» (n.º IV) | Tramo; «Puente Dolores» | Sin medir; «Puente Soublette», 19,5 m |
| Avenida Sur | Sin lectura | Dudoso; «Restaurador» (n.º III) | Sin medir; «Puente Restaurador», 7 m | Sin medir; «Puente Restaurador», 19,6 m |
| Av. 19 de Diciembre | Sin lectura | Dudoso; «19 de Diciembre» (n.º VI) | Sin medir; «Puente 9 de Diciembre», 11 m | Sin medir; «Puente 9 de Diciembre», 12,5 m |
| Sur 14 | Sin lectura | **Ausente**: el plano no dibuja puente | Sin medir; «Puente Ayacucho», 11,5 m | Sin medir; «Puente Ayacucho», 12 m |

«Tramo»: el plano deja leer las dos cabezas. «Sin medir»: dibuja una calzada continua con
su rótulo, sin cabezas; queda un punto del eje para ubicarlo. «Dudoso»: el plano de 1911
dibuja el cruce más lejos del de 1936 que el error máximo de su propio calce (19,84 m), y
la etapa guarda esa contradicción como pendiente en vez de elegir una de las dos posiciones.
«Sin lectura»: el calce de #272 no leyó ese plano para ese cruce; no es una ausencia.
Los anchos son los de la calzada que dibuja cada plano; el error de cada etapa es el p90
del calce de su plano (12,93 m en 1889, 12,04 m en 1911, 3,53 m en 1946) o la lectura a
ojo sobre el plano base (±1 m en 1936). El nombre de 1889 queda en `null`: la leyenda
numerada de Mestre no está transcrita en el calce.

No se usan las posiciones «adoptadas» con las que se instalaron los modelos de los
puentes: son una decisión de montaje, no la lectura de un plano.

### Lo que sigue sin cobertura

- **1843 no tiene ningún tramo.** Nadie ha digitalizado ejes sobre el plano de Jesurún.
  Una prueba exploratoria de esta tarea, sin código versionado, comparó los 438 ejes
  medibles de 1772 con las 361 unidades aprobadas de `tools/geo/referencias/1843-manzanas.json`:
  148 ejes entran más de 5 m en alguna unidad y solo 78 corren libres entre dos de ellas.
  Los dos calces discrepan más que el ancho de una calle, así que esa comparación **no
  sirve para inferir** la red de 1843 y no se registró ninguna etapa con ella.
- **1889, 1911 y 1946** solo tienen los cruces del Guaire. Sus calles siguen pendientes.
- **1936** tiene los once trazados recuperados y un cruce medible. El resto de la red del
  plano base no está en el registro: el sitio la dibuja con el propio plano.
- **Ningún tramo importado de calle lleva nombre de época ni ancho**: las referencias de
  1772 no transcriben rótulos, y ningún plano da un ancho de calle que se haya medido.
- Las manzanas de 1911 del sitio se agrupan por las caras de la red clasificada de 1936
  (`docs/retiro-epocas.md` § 1911): no son una prueba independiente de las calles de 1911.

## Completar una época e integrar

1. Leer la ficha del plano y sus restricciones. Digitalizar ejes sobre el documento
   de la época, conservando coordenadas originales, transformación y error.
2. Añadir la etapa con su ficha de evidencias completa. Distinguir trazado abierto,
   proyecto, obras y fecha de ensanche; no usar la inauguración de una avenida
   como fecha de inexistencia de la calle que la precedió.
3. Revisar topología, duplicados, conexión de extremos y anchos documentados.
   El validador de esquema no sustituye esta inspección cartográfica.
4. Comparar en las seis épocas, con las reglas de construcción y los corredores
   libres. Incorporar por separado la lectura al pipeline/runtime con tests y
   capturas. Mantener las redes actuales mientras la cobertura esté incompleta.
5. Regenerar datos y publicar por el flujo de releases solo tras esa integración.

## Fuentes

| Corte | Documento | Fecha del documento | Representa | Licencia en su ficha |
|---|---|---|---|---|
| 1772 | [«Exato mapa de la ciudad de Caracas», AGI vía PARES](https://pares.cultura.gob.es/ParesBusquedas20/catalogo/description/26112) | 1772 | 1772 | Dominio público por antigüedad; imagen de PARES |
| 1843 | [Jesurún, facsímil de Müller i Stapler, NYPL vía Commons](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas_(NYPL_b13925947-5382478).tiff) | Desconocida | 1843 | Dominio público (Commons) |
| 1889 | [Mestre, BnF vía Commons](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas,_levantado_en_1889_vajo_la_direccion_-_del_general_don_Vicente_S._Mestre_-_btv1b53027837n.jpg) | 1889 | 1889 | Dominio público (Commons) |
| 1911 | [Razetti, Princeton](https://maps.princeton.edu/catalog/princeton-05741v14j) | 1911 | 1911 | Sin derechos conocidos |
| 1936 | [DCN, Internet Archive](https://archive.org/details/WCWdb_18053) | 1936 | 1936 (fotografiado en marzo) | Sin establecer |
| 1946 | [DCN, Internet Archive](https://archive.org/details/WCWdb_18051) | 1946–1950 («[1950?]») | 1946 (fotografías) | Sin establecer |

Las licencias se conservan en `fuentes/mapas/`; no se incorpora ni redistribuye ningún
escaneo nuevo. Las medidas y los nombres de los cruces vienen de
[`puentes-guaire-calce.md`](puentes-guaire-calce.md) y
[`puentes-guaire-calce-cruces.md`](puentes-guaire-calce-cruces.md). Las fuentes de fechas
modernas están enlazadas una por una en el JSON; su contenido e imágenes se consultan, no
se redistribuyen.
