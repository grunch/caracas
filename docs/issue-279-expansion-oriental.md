# Expansión oriental de 1946: Altamira y la Carretera del Este (#279)

Diagnóstico de cobertura para [#279](https://github.com/grunch/caracas/issues/279). Es documentación: **no se
agrega ninguna marca, ficha, hito ni época**. La conclusión es corta: Altamira queda fuera de la hoja del sitio y
fuera del plano de 1946 del catálogo, así que no hay nada que levantar ahí sin otra base cartográfica.

Los datos viven en [`evidencias/expansion-oriental-1946.json`](evidencias/expansion-oriental-1946.json); las tablas
que siguen a la marca de abajo se generan desde ahí y `tests/unit/expansion-oriental-279.test.js` comprueba que no
se desfasen.

## Cobertura: dónde termina la hoja

La hoja del sitio es el marco del mosaico de 1936 (`tools/geo/mosaico-1936.json`): llega hasta **x = 6.400 m** de la
cuadrícula del plano, con la Plaza Bolívar en x = 1.584 m. O sea, **4,8 km al este de la plaza**; en longitud,
−66,8706°. Dos planos llenan esa hoja:

- **1936 (DCN).** El dibujo termina antes que el marco: su recuadro interior queda en x ≈ 6.240 m (píxel 18.280 del
  mosaico, leído en un recorte). Lo último que dibuja al este es la redoma de Las Delicias y el final de la «Calle
  Real de Sabana Grande».
- **1946 (DCN, fotos de 1946).** El interior cartográfico que usa el sitio (`tools/geo/mapa_1946.py`, píxeles 440 a
  14.600 del escaneo) llega a x ≈ 6.516 m según un ajuste lineal de los 40 cruces de `tools/geo/gcp/1946-cuadricula.json`,
  cuya cuadrícula impresa termina en x = 6.000 m. El plano de 1946 se remuestrea al marco de 1936 y se corta en
  6.400 m: sobran unos 116 m de dibujo, no más.

Posición de cada lugar en esa cuadrícula (`tools/geo/tests/test_cobertura_oriental.py` rehace la cuenta):

| Lugar (OpenStreetMap) | Al este de la Plaza Bolívar | Respecto del borde de la hoja | Respecto del plano de 1946 |
|---|---:|---:|---:|
| Plaza Venezuela (`relation/3815752`) | 3.165 m | 1.651 m adentro | Adentro |
| Sabana Grande, bulevar (`node/3646915549`) | 4.208 m | 608 m adentro | Adentro |
| Redoma de Las Delicias, Chacaíto (`way/235877853`) | 4.637 m | 179 m adentro | Adentro |
| Plaza Bolívar de Chacao (`way/222691098`) | 6.721 m | **1.905 m afuera** | 1.789 m afuera |
| Obelisco de la Plaza Francia (`way/294440204`) | 7.195 m | **2.379 m afuera** | 2.263 m afuera |
| Plaza Francia, Altamira (`relation/3913460`) | 7.198 m | **2.382 m afuera** | 2.266 m afuera |

Las coordenadas son de © colaboradores de OpenStreetMap (ODbL), consultadas el 28-11-2026, y se llevan a la
cuadrícula con `tools/geo/geo1936.py`. Los seis puntos caen fuera del polígono de los trece controles de
`tools/geo/gcp/1936-wgs84.json` (el más oriental es la Quinta de Anauco): son una **extrapolación**. Sirve para
decir de qué lado del borde cae cada lugar, con kilómetros de margen; no sirve para colocar nada.

**Altamira no está en la hoja ni en el plano de 1946 del catálogo.** Tampoco Chacao. Lo único del camino al este
que entra es la Calle Real de Sabana Grande hasta Chacaíto.

## Qué hay implementado

- Ninguna marca, ficha ni hito nombra Altamira, la Plaza Francia, Chacao, Sabana Grande ni la Carretera del Este
  (`src/marcas-datos.js`, `src/fichas-datos.js`, `src/hitos.js`). El bloque del este de las marcas es `fc-central`,
  `bellas-artes`, `san-bernardino` y `los-caobos`. **Es correcto**: no hay error del modelo, hay un sector fuera del encuadre.
- La foto `fuentes/imagenes/1955-pinterest-plaza-altamira` ya está fuera de las seis épocas (`epocas: []`, sin
  licencia). Su ficha dice «casi seguro fuera del área del plano de 1936»: ahora está medido, 2,4 km afuera.
- La avenida Francisco de Miranda (1954) ya figura en `tools/geo/referencias/vialidad-posterior-1946.json`
  (`moderno:francisco-de-miranda-1954`) como ausente en los seis cortes.
- `tests/unit/expansion-oriental-279.test.js` deja un candado: si alguien agrega una marca o un hito con esos
  nombres mientras el sector siga fuera de la hoja, el test falla.

## Correcciones listas para código

1. **Ninguna en el visor.** No colocar plaza, obelisco ni edificio «a ojo» dentro del área actual.
2. Calle Real de Sabana Grande: está dentro de la hoja y los dos planos la rotulan distinto («Calle Real de Sabana
   Grande» en 1936, «Avenida Abraham Lincoln» en 1946). Su eje se puede digitalizar como tramo del registro vial
   (`tools/red-vial-lib.mjs`) con las dos etapas de abajo; es trabajo de #270, no de este issue.
3. Nota de la ficha de la foto de 1955: cambiar «casi seguro fuera» por la medida. No se toca acá porque
   `fuentes/` tiene su propio flujo (`npm run catalogo`).

## Qué haría falta para incluir Altamira

- **Una base cartográfica que llegue a x ≈ 9.500 m** (unos 3 km más al este), con Chacao, Altamira y Los Palos
  Grandes. Ninguno de los planos descargados la da. Candidatos del catálogo, ninguno utilizable hoy:
  la «Carta topográfica del Distrito Federal» de 1947 (`fuentes/mapas/1947-csic-carta-topografica-distrito-federal`,
  recuadro a 1:25.000, CC BY-NC-SA, no descargada) y el «Plano y guía de Caracas» de 1960
  (`fuentes/mapas/1960-utoronto-plano-y-guia-de-caracas`, 1:36.000, con derechos, fuera del período). Una [entrada de FAC](https://fundaayc.com/2020/10/page/5/) describe otro candidato, el plano «Caracas y sus
  alrededores» de 1946 (General Drafting Co. para Esso y Creole); no está en el catálogo ni se consultó su licencia.
- **Ampliar el marco** (`extension_m` en `tools/geo/mosaico-1936.json`) cambia el tamaño del mundo, el relieve, los
  niveles del plano y todos los datos publicados: es una tarea del plan, no un arreglo.
- **Controles al este** para que la posición no sea una extrapolación.
- **Estado de la urbanización en 1946**: qué parcelas tenían casa. Ninguna fuente leída lo dice; saldría de la
  fotografía aérea de 1946 o de un plano que la dibuje.
- No crear una época nueva para alojar lo de 1947 en adelante (edificio Altamira, Francisco de Miranda).

## Fuentes y referencias visuales

Todo lo fechado viene de la Fundación Arquitectura y Ciudad (FAC), que cita sus fuentes en las entradas «¿Sabía
usted…?»; no se consultó ninguna fuente primaria. Las contradicciones **no se resuelven**: quedan las dos lecturas.

Las fotografías de esas entradas no se incorporan. Ninguna declara licencia: FAC anota la procedencia («Colección
Crono Arquitectura Venezuela», «Colección Fundación Arquitectura y Ciudad», enlaces a redes) y casi nunca el
fotógrafo ni la fecha. Quedan como enlaces de consulta. La única imagen del sector en el repo es la de 1955 ya
citada, sin fuente ni licencia y sin época.

Los rótulos de 1936 se leyeron en el mosaico a 0,5 m por píxel; los de 1946, en el plano ya reducido a 2 m por
píxel (`fuentes/derivados/1946/plano.jpg`), no en el escaneo original.

<!-- catálogo: lo que sigue se genera con `node tools/catalogo-evidencias.mjs`; no editar a mano -->

## Lo que deja leer el plano de cada corte

«Sin lectura» es que nadie leyó ese plano para ese elemento: no es una ausencia. La certeza va entre paréntesis.

| Elemento | 1772 | 1843 | 1889 | 1911 | 1936 | 1946 |
|---|---|---|---|---|---|---|
| Calle Real de Sabana Grande | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **Existe** (documentada). «Calle Real de Sabana Grande». Calle continua y edificada desde (16500, 9180) hasta el borde del dibujo en (18280, 9950). | **Existe** (documentada). «Avenida Abraham Lincoln». La misma calle, con el rótulo nuevo; sigue hacia el este hasta salir de la hoja cerca de (18600, 10030). Leído sobre el plano reducido a 2 m por píxel. |
| Carretera del Este (Sabana Grande–Petare) | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **No se sabe** (inferida). Fuera de la hoja: el plano no llega al sector. | **No se sabe** (inferida). Fuera de la hoja: el plano no llega al sector. |
| Urbanización Altamira | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **No se sabe** (inferida). Fuera de la hoja: el plano no llega al sector. | **No se sabe** (inferida). Fuera de la hoja: el plano no llega al sector. |
| Plaza Altamira (hoy Plaza Francia), con su obelisco y su espejo de agua | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **No se sabe** (inferida). Fuera de la hoja: el plano no llega al sector. | **No se sabe** (inferida). Fuera de la hoja: el plano no llega al sector. |
| Edificio Altamira | Sin lectura | Sin lectura | Sin lectura | Sin lectura | Sin lectura | Sin lectura |

## Dentro de la hoja

### Calle Real de Sabana Grande

`este:calle-real-sabana-grande` · calle · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

El último tramo del camino del este que la hoja alcanza a dibujar. Su digitalización como tramo del registro vial es de #270.

**Nombres:** «Calle Real de Sabana Grande» (¿?–¿?) [1]; «Avenida Abraham Lincoln» (¿?–¿?) [2].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1936 | Levantamiento | El plano de 1936 la rotula «Calle Real de Sabana Grande» y la dibuja edificada por los dos lados hasta el borde del dibujo | «CALLE REAL DE SABANA GRANDE» | documentada | [1] |
| 1946 | Nombre | El plano de 1946 rotula la misma calle «Avenida Abraham Lincoln» y el sector «Sabana Grande» | «AVENIDA ABRAHAM LINCOLN» | documentada | [2] |
| Sin fecha | Levantamiento | Era el arranque de la Carretera del Este hacia las urbanizaciones del este | «conectaba la Calle Real de Sabana Grande con las urbanizaciones Chacaíto, Country Club, Altamira y Los Palos Grandes» | documentada | [3] |

**No se pudo documentar:**

- Fecha del nombre «Avenida Abraham Lincoln».
- Ancho de la calle en 1936 y en 1946: no se midió.

## Fuera de la hoja

### Carretera del Este (Sabana Grande–Petare)

`este:carretera-del-este` · carretera · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

Empieza donde termina la Calle Real de Sabana Grande, es decir, donde termina la hoja. La avenida Francisco de Miranda (1954) ya está en el catálogo de vías posteriores a 1946 (`moderno:francisco-de-miranda-1954`) y no se repite acá.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| Sin fecha | Levantamiento | Sigue el trazado del antiguo Camino Real de Petare | «tiene su origen en el trazado del antiguo Camino Real de Petare que unía las haciendas» | documentada | [3] |
| 1934 | Levantamiento | En 1934 llevaba del centro a Petare y conectaba las urbanizaciones del este | «conectados por la Carretera del Este que llevaba del centro hasta Petare» | dudosa | [4] |
| 1947 | Apertura | Inaugurada oficialmente el 12 de marzo de 1947 | «el 12 de marzo de 1947 […] el entonces Gobernador de Caracas, Gonzalo Barrios, inaugurara oficialmente la que se conoció como “Carretera del Este”» | dudosa | [3] |
| 1954 | Reforma | En 1954 se termina su ampliación y el tramo de Los Palos Grandes a Petare, y cambia de nombre | «Es la ampliación de la Carretera junto a la construcción del tramo entre Los Palos Grandes y Petare lo que se termina en 1954» | documentada | [3] |
| 1954 | Reforma | La avenida nueva tiene calzadas de más de 30 m, seis vías y aceras de cuatro metros | «con sus calzadas de más de 30 metros de anchura (en total seis vías, tres en un sentido y otras tres en el otro […]), islas verdes en ciertos tramos y aceras de cuatro metros cada una» | documentada | [3] |

**Contradicción pendiente — Desde cuándo existe la Carretera del Este:**

- Ya conectaba las urbanizaciones del este en el plano de Röhl de 1934 [4]
- El gobernador Gonzalo Barrios la inaugura oficialmente el 12 de marzo de 1947 [3]

**No se pudo documentar:**

- Ancho de la carretera antes de 1954.
- Su trazado tramo por tramo por Chacao y Los Dos Caminos.
- Qué se inauguró en 1947 si la carretera ya figuraba en 1934: pavimento, rectificación o nombre.
- Cómo la rotula el plano de 1946 al este de Las Delicias: el original no se releyó para este tramo.

### Urbanización Altamira

`este:urbanizacion-altamira` · urbanización · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1943 | Proyecto | Luis Roche compra la hacienda El Paraíso, de 110 hectáreas | «Roche […] compra la hacienda en 1943» | documentada | [4] |
| 1944 | Proyecto | Crea Altamira, C.A. y pide al Concejo Municipal autorización para parcelar | «crea en 1944 la empresa Altamira, C.A. con el objeto de desarrollar la urbanización y solicita autorización al Concejo Municipal para realizar el parcelamiento» | documentada | [4] |
| 1950 | Apertura | Ya parcelada, entrega formalmente los espacios públicos en 1950 | «En 1950, ya parcelada, se procedió hacer entrega formal de los espacios públicos» | documentada | [4] |
| Sin fecha | Levantamiento | Dos avenidas principales de 24 m, El Ávila al este y El Parque al oeste | «de 24 metros de ancho denominadas entonces como El Ávila -al este- y El Parque -al oeste- (hoy Luis Roche y San Juan Bosco…)» | documentada | [4] |

**No se pudo documentar:**

- Fecha de inicio de las obras de urbanismo.
- Estado en 1946: cuántas parcelas estaban construidas y cuáles vacantes.
- Fechas de las urbanizaciones vecinas (Country Club, Campo Alegre, La Castellana, Los Palos Grandes): la fuente las nombra sin fecharlas.

### Plaza Altamira (hoy Plaza Francia), con su obelisco y su espejo de agua

`este:plaza-altamira` · plaza · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «Plaza Altamira» (¿?–¿?) [4]; «Plaza Francia» (¿?–¿?) [4] [5].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1945 | Apertura | Inaugurada el 11 de agosto de 1945 | «el 11 de agosto de 1945 es inaugurada la que se conoce actualmente como la Plaza Francia de Altamira» | dudosa | [4] |
| 1944 | Apertura | Inauguración formal el 5 de julio de 1944 | «Su inauguración formal data del 5 de julio de 1944.» | dudosa | [4] |
| 1945 | Apertura | Otra entrada la fecha en 1945 y la atribuye a Martín Hermanos | «Plaza Altamira (Martín Hermanos,1945)» | documentada | [3] |
| Sin fecha | Levantamiento | Obelisco de 24 m en piedra artificial | «el propio obelisco de 24 metros de altura erigido en piedra artificial» | dudosa | [4] |
| Sin fecha | Levantamiento | Fuente con espejo de agua | «la fuente conformada por un espejo de agua con boquillas o chorros» | documentada | [4] |
| 1967 | Nombre | Rebautizada Plaza Francia en 1967 | «es rebautizado en 1967 como “Plaza Francia”» | dudosa | [4] |
| 1989 | Nombre | Reinaugurada y rebautizada Plaza Francia en 1989 | «reinauguran la Plaza Altamira rebautizándola como Plaza Francia» | dudosa | [5] |

**Contradicción pendiente — Fecha de inauguración de la plaza:**

- Inaugurada el 11 de agosto de 1945 [4]
- «Su inauguración formal data del 5 de julio de 1944», en la misma entrada [4]

**Contradicción pendiente — Altura del obelisco:**

- 24 metros, en piedra artificial [4]
- 45 metros [6]

**Contradicción pendiente — Autor de la plaza:**

- Martín Hermanos (Luis Martín); Henry Vicente niega que la proyectara Arthur Kahn [4]
- Proyectada con la participación de Arthur Kahn [6]

**Contradicción pendiente — Cuándo pasa a llamarse Plaza Francia:**

- Rebautizada en 1967 [4]
- Reinaugurada y rebautizada en 1989 [5]

**No se pudo documentar:**

- Fecha propia del obelisco.
- Fecha propia del espejo de agua y de la fuente.
- Autor del obelisco: la fuente deja abierta la atribución a Mujica Millán.

### Edificio Altamira

`este:edificio-altamira` · edificio · ausente en los cortes anteriores a **1947**.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1947 | Apertura | Terminado en 1947; de Arthur Kahn | «Arthur Kahn como autor del […] edificio que cierra el extremo norte de la plaza: el edificio Altamira, finalizado en 1947» | documentada | [4] |

**No se pudo documentar:**

- Fecha de inicio de la obra: no se sabe si en 1946 ya se veía en construcción.

## Fuentes

| N.º | Clase | Documento | Enlace |
|---:|---|---|---|
| 1 | plano de época | 1936 | <https://archive.org/details/WCWdb_18053> |
| 2 | plano de época | 1946–1950 | <https://archive.org/details/WCWdb_18051> |
| 3 | secundaria con referencias | 2020 | <https://fundaayc.com/2020/11/15/sabia-usted-54/> |
| 4 | secundaria con referencias | 2020 | <https://fundaayc.com/2020/09/20/sabia-usted-50/> |
| 5 | secundaria sin referencias | 2026 | <https://fundaayc.com/2026/05/19/1989-reinauguracion-de-la-plaza-altamira-rebautizada-como-plaza-francia/> |
| 6 | secundaria con referencias | 2024 | <https://fundaayc.com/2024/07/14/algo-mas-sobre-la-postal-no-411/> |
