# Cotejo de las marcas y fichas con la leyenda de 1843 (T81)

Pista independiente de `specs/11-auditoria-y-correccion-1843.md`: transcribir la leyenda del plano de 1843 y
cotejarla con las marcas (`src/marcas-datos.js`) y las fichas (`src/fichas-datos.js`) de la época 2, que hasta
ahora decían «sin cotejar con la leyenda».

## Fuente

- Plano: «Plano topográfico de la Ciudad de Carácas», Ángel Jacob Jesurún, 1843; facsímil litográfico de Müller
  i Stapler (NYPL b13925947, image ID 5382478; copia en Wikimedia Commons, dominio público).
  Carpeta: `fuentes/mapas/1843-nypl-jesurun-facsimil-muller-stapler/` (ficha y licencia en su `ficha.json`).
- Transcripción: [`leyenda.json`](leyenda.json), hecha sobre `original.tiff`
  (sha256 `f010aea6…5b172fbc`). Trae las iglesias, capillas y conventos (A–T), los ríos (U–Y), los puentes
  (a–h), los puntos notables (a–z y signos), las calles (16 de norte a sur, 17 de este a oeste), las 140
  esquinas con nombre, las parroquias y el texto al pie. Cada entrada lleva `lectura`: `segura`, `dudosa` o
  `ilegible`.

## Criterios

- Se coteja **por nombre**, no por posición: las letras están impresas en el plano junto a cada edificio, pero
  aquí no se miran. Por eso, cuando el nombre coincide pero lo que dice la marca depende de dónde cae la letra
  (el mismo solar, la misma cuadra), eso queda como duda.
- **coincide**: la leyenda nombra el lugar igual o con una variante obvia (artículo, abreviatura, «La Merced» /
  «Las Mercedes»).
- **nombre distinto**: la leyenda tiene una entrada que parece ser el lugar, con otro nombre; se anota cómo.
- **no figura**: la leyenda no lo nombra.
- Los datos cambian **solo** con lectura `segura`: la fuente de la marca cita `leyenda del plano de Jesurún de
  1843 (letra «nombre»)` y las dudas dejan de decir «sin cotejar» para 1843. Lo de 1772 sigue sin cotejar.
- Las marcas que nacían en 1889 con la duda «sin cotejar con el plano de 1843» pasan a nacer en 1843 solo si
  la leyenda las nombra con lectura segura y sin depender de la posición.
- No se agregan marcas con posición nueva. Ningún lugar de la leyenda con lectura segura y marca en otra época
  quedó sin marca en 1843 sin un motivo anotado abajo.

## Resultado

Marcas vivas en 1843 antes del cotejo: 23. Más cinco que nacían en 1889 con la duda de 1843.

| Resultado | Marcas |
|---|---|
| coincide | 16 de las 23, más 3 que pasan a nacer en 1843 (19) |
| nombre distinto | 2 de las 23, más 1 que sigue desde 1889 (3) |
| no figura | 5 de las 23, más 1 que sigue desde 1889 (6) |

### Marcas vivas en 1843

| Marca | Letra | Nombre en 1843 (leyenda) | Resultado | Cambio hecho |
|---|---|---|---|---|
| `avila` | — | — | no figura | ninguno |
| `guaire` | Y (ríos) | Guaire | coincide | fuente cita Y |
| `calvario` | T | El Calvario | coincide (la leyenda nombra la capilla; la marca es el cerro) | fuente cita T |
| `catuche` | V (ríos) | Catuche | coincide | fuente cita V |
| `caroata` | X (ríos) | Caroata | coincide | fuente cita X |
| `anauco` | U (ríos) | Anauco | coincide | fuente cita U |
| `plaza-bolivar` | — | — | no figura en la leyenda (las plazas no llevan letra). El texto al pie cuenta «la plaza Bolívar» entre las plazas, pero es un texto corrido sin lectura por entrada | ninguno; queda para revisar si en 1843 se llama «Plaza Bolívar» |
| `catedral` | A | Catedral | coincide | fuente cita A; ficha: párrafo de 1843 |
| `palacio-arzobispal` | j (puntos notables) | Palacio Arzobispal | coincide | fuente cita j; dudas solo de 1772; ficha: frase en 1843 |
| `casa-amarilla` | i (puntos notables) | Palacio del Gobierno | nombre distinto (la marca: «Casa de Gobierno»). Que la i sea este edificio depende de la posición | dudas de marca y ficha lo anotan; el nombre no cambia |
| `capitolio` | K | Conv. de Concepciones | coincide | fuente cita K; dudas solo de 1772; ficha: frase en 1843 |
| `universidad` | — | — | no figura: la leyenda no nombra el convento de San Francisco aparte, solo la iglesia (N, marca `san-francisco`) | dudas de marca y ficha lo dicen; sigue «sin cotejar» solo para 1772 |
| `san-francisco` | N | San Francisco | coincide | fuente cita N; ficha: frase en 1843 |
| `santa-capilla` | I | San Mauricio | coincide (el nombre). Que esté en el mismo solar depende de la posición y sigue como duda | fuente cita I; ficha: párrafo de 1843 |
| `altagracia` | G | Altagracia | coincide | fuente cita G; dudas: ya nombrada en 1843; ficha |
| `palacio-municipal` (antes `seminario`) | k, L (puntos notables, iglesias) | Universidad; Cap. de la Universidad | coincide, con linderos de certeza baja (desde #252): las dos letras caen en esta cuadra (L en el solar de la esquina de Las Monjas, k en el del medio; la j del Palacio Arzobispal, en el de la esquina de Las Gradillas), vistas en el plano calzado ([lectura](../../docs/palacio-municipal-georreferencia.json)). La marca dice «Universidad y su capilla» en 1843 | fuente cita k y L; ficha: párrafo de 1843 |
| `carmelitas` | H | Conv. de Carmelitas | coincide | fuente cita H; dudas solo de 1772; ficha: párrafo de 1843 |
| `san-jacinto` | M | San Jacinto | coincide (la leyenda la pone entre «Yglesias, Capillas i Conventos») | fuente cita M; dudas solo de 1772; ficha: párrafo de 1843 |
| `plaza-venezolano` | — | — | no figura (las plazas no llevan letra; el texto al pie cuenta «San Jacinto» entre las plazas) | dudas de marca y ficha lo anotan; el nombre de 1843 sigue siendo CG |
| `casa-natal` | — | — | no figura | ninguno |
| `teatro-municipal` | P | San Pablo | coincide (la leyenda nombra la iglesia; la marca, «Plaza de San Pablo», es la plaza y la iglesia) | fuente cita P; ficha: párrafo de 1843 |
| `la-pastora` | B | La Pastora | coincide | fuente cita B; dudas: ya nombrada en 1843; ficha |
| `panteon` | C | La Trinidad | coincide | fuente cita C; ficha: frase en 1843 |

### Marcas que nacían en 1889 «sin cotejar con el plano de 1843»

| Marca | Letra | Nombre en 1843 (leyenda) | Resultado | Cambio hecho |
|---|---|---|---|---|
| `santa-rosalia` | R | Santa Rosalia | coincide | **nace en 1843**; fuente cita R; dudas y ficha al día |
| `candelaria` | J | La Candelaria | coincide | **nace en 1843**; fuente cita J; dudas y ficha al día |
| `las-mercedes` | E | La Merced | coincide (variante) | **nace en 1843 como «La Merced»** y desde 1889 sigue «Las Mercedes» (nombre del plano de 1936, como antes); fuente cita E; ficha al día |
| `san-juan` | S | Capuchinos | nombre distinto. La marca dice «la iglesia de los capuchinos», pero que la S sea este templo depende de la posición | no nace antes; dudas de marca y ficha lo anotan |
| `san-carlos` | — | — | no figura por nombre (la leyenda trae un «Cuartel veterano», s, que no se identifica por el nombre) | ninguno |

### Otros nombres de la leyenda

- **Q, «Oratorio de San Felipe»** (segura): la marca `santa-teresa` (nace en 1889) dice que antes hubo ahí un
  oratorio de San Felipe Neri (CG). Que sea el mismo lugar depende de la posición: no se agrega una marca de 1843.
  Las dudas de marca y ficha lo anotan.
- Sin marca en ninguna época, así que no se agregan (no hay posición que tomar): D Convento de Dominicas,
  F San Antonio, O San Lazaro, los puentes a–h (e «de Monroy», dudoso), los puntos notables l–z (Colejio de la
  Yndependencia, Parque, Hospital de Lazarinos, cementerios, Almacén de Pólvora, Matanza, alcabalas, caminos…),
  Ñarauli, Cantón del Teque y Campo de Marte.
- **m, «Teatro»** (segura): no se identifica por el nombre con los teatros que tienen marca desde 1889 (Teatro
  Caracas, Teatro Municipal); no se agrega.
- Las calles y las 140 esquinas no se cotejan aquí: son materia del calce por identidad de la auditoría de 1843
  (fase 1A de `specs/11`).

## Pendiente para quien revise con el plano

Las cuatro dudas (la de k y L se resolvió en #252) que dependen de la posición se resuelven mirando dónde cae cada letra en el plano calzado:
i (`casa-amarilla`), I (`santa-capilla`, el solar), S (`san-juan`) y Q (`santa-teresa`).
También, si el texto al pie («la plaza Bolívar») basta para que la plaza cambie de nombre en 1843.
