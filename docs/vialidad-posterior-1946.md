# Vías posteriores a 1946: catálogo por segmento y etapa

Seguimiento de #277 (avenidas) y #278 (autopistas y Cota Mil). Es documentación: **ninguna
de estas vías se dibuja en las seis épocas del sitio**, y este catálogo no agrega épocas ni
geometría. Sirve para dos cosas: saber qué no puede aparecer antes de 1946 y dejar escrito,
afirmación por afirmación, de dónde sale cada fecha.

Cómo leerlo:

- Los datos viven en `tools/geo/referencias/vialidad-posterior-1946.json`; las tablas de
  abajo se generan desde ahí y un test comprueba que no se desfasen.
- Cada fila es **una afirmación con su cita textual y su fuente**. La columna «Certeza» dice
  `dudosa` cuando otra fuente la contradice o cuando solo la da una fuente terciaria.
- Las contradicciones **no se resuelven**: quedan las dos lecturas, cada una con su fuente.
- «No se pudo documentar» es lo que se buscó y ninguna fuente leída dice. No es una ausencia.
- No se consultó ninguna fuente primaria. Casi todo viene de la Fundación Arquitectura y
  Ciudad (FAC): sus artículos «¿Sabía usted…?» citan planes, memorias y prensa (clase
  «secundaria con referencias»); sus entradas de cronología no citan nada («secundaria sin
  referencias»). Wikipedia se usa solo donde no hay otra. El artículo «Autopistas y
  distribuidores de Venezuela» (*Informes de la Construcción* 25, n.º 246, 1972), que FAC
  cita, no se pudo abrir: se conoce solo a través de FAC.
- Las fotografías de esas páginas **no se incorporan**: ver «Referencias visuales» en
  [`prioridades/vialidad.md`](prioridades/vialidad.md).
- La avenida Bolívar va aparte, en #276.

<!-- catálogo: lo que sigue se genera con `node tools/red-vial.mjs catalogo`; no editar a mano -->

## Avenidas del centro

### Avenida Urdaneta

`moderno:urdaneta-1953` · avenida · ausente en los cortes anteriores a **1953**.

**Antes:** Calle Este–Oeste 1: existía antes del ensanche y debe digitalizarse por separado.

**Nombres:** «Avenida Urdaneta» (1953–hoy) [2].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1951 | Proyecto | Obra imprescindible del Plan Municipal de Vialidad | «a 9 de ellas como imprescindibles y urgentes: la avenida Urdaneta, el tercer tramo de la avenida Sucre, la avenida Fuerzas Armadas» | documentada | [1] |
| 1953 | Obra | El MOP la construye en 120 días | «construidos por el Ministerio de Obras Públicas (MOP) en 120 días» | documentada | [2] |
| 1953 | Apertura | Se inaugura el 29 de noviembre de 1953: dos kilómetros entre la avenida Sucre y la Andrés Bello | «El domingo 29 de noviembre se inaugura y pone en servicio los dos kilómetros de la Avenida Urdaneta» | documentada | [2] |
| 1953 | Reforma | Sección de 26 m, tres canales por sentido | «La nueva vía de 26 metros de ancho (tres canales de circulación en cada sentido)» | documentada | [2] |
| 1953 | Demolición | 250 demoliciones; entre ellas la casa de Vegas y Bertodano (Colegio Chaves) y la casa de Llaguno (Museo de Arte Colonial) | «fue necesario expropiar, realizar 250 demoliciones y reubicar todas las instalaciones existentes» | documentada | [2] [3] |
| 1953 | Reforma | La esquina de Llaguno pasa a ser un puente sobre la Norte–Sur 6 | «hacer desaparecer prácticamente la esquina de Llaguno que, convertida en un puente, dejaría pasar a la Baralt por debajo» | documentada | [4] |

**No se pudo documentar:**

- Decreto e inicio de las obras.
- Apertura por tramos.
- Esquinas de sus dos extremos.
- Fecha del elevado en el empalme con la Andrés Bello.
- Las otras 248 demoliciones: las fuentes solo nombran dos casas; ninguna nombra el Hotel Majestic.

### Avenida Fuerzas Armadas

`moderno:fuerzas-armadas-1956` · avenida · ausente en los cortes anteriores a **1956**.

**Antes:** Calle Norte–Sur 7: existía; la avenida recortó sus fachadas.

**Nombres:** «Avenida Fuerzas Armadas» (1956–hoy) [5].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1951 | Proyecto | Obra imprescindible del Plan Municipal de Vialidad | «la avenida Urdaneta, el tercer tramo de la avenida Sucre, la avenida Fuerzas Armadas» | documentada | [1] |
| Sin fecha | Proyecto | Decreto del gobernador Pacanins, un 3 de noviembre; la fuente no escribe el año | «por decreto del gobernador de Caracas Guillermo Pacanins, promulgado el 3 de noviembre del año anterior» | dudosa | [5] |
| 1956 | Obra | Colapsa el encofrado del Puente Sucre la noche del 13 de noviembre | «La noche del 13 de noviembre colapsa el encofrado del canal en sentido a la Roca Tarpeya del Puente Sucre» | documentada | [6] |
| 1956 | Apertura | Se inaugura el 2 de diciembre de 1956, con 2.770 m | «Se concluyen los 2.770 metros de la Avenida Fuerzas Armadas» | documentada | [5] [6] |
| 1956 | Obra | Pasos a desnivel: puente en la Urdaneta, paso bajo la avenida Universidad y Puente Sucre de 270 m | «la construcción de puente sobre la Avenida Urdaneta, el paso por debajo de la Avenida Universidad y el Puente Sucre» | documentada | [5] |
| 1956 | Demolición | La iglesia Corazón de Jesús pierde 8 m de sus naves; fachada nueva consagrada en 1963 | «Perdió un total de 8 metros de longitud en sus tres naves» | documentada | [7] |

**Contradicción pendiente — alcance de las demoliciones:**

- «exigió el recorte de las fachadas de las 300 edificaciones que tenían frente sobre la Avenida Norte-Sur 7» [5]
- «fue necesario demoler 300 edificaciones y fachadas, entre ellas la de la Iglesia Corazón de Jesús» [7]

**No se pudo documentar:**

- Año del decreto.
- Inicio de las obras.
- Ancho de la sección.
- Esquinas de sus dos extremos.
- Apertura por tramos.
- Cuál de las dos vías pasa arriba en el cruce con la Urdaneta: la redacción no lo deja claro.

### Norte–Sur 6, ensanche de 1951–1953 (avenida Baralt desde 1961)

`moderno:norte-sur6-ensanche` · avenida · ausente en los cortes anteriores a **1953**.

**Antes:** Calle Norte–Sur 6: existía y remataba en Quinta Crespo; no se declara ausente antes del ensanche.

La capa Hoy no separa el ensanche de 1953 de la prolongación de 1973: los dos llevan el nombre «Avenida Baralt».

**Nombres:** «Avenida Norte–Sur 6» (¿?–1961) [4]; «Avenida Baralt» (1961–hoy) [4] [11].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1939 | Proyecto | El Plan Rotival la toma como eje entre El Paraíso y la perimetral | «considerada dentro del Plan Rotival (1939) como el eje de mayor importancia en la conectividad entre El Paraíso y la perimetral» | documentada | [4] |
| 1948 | Proyecto | Moses la llama «Vía Expresa Capitolio» | «llamándola en su Arterial Plan for Caracas (1948) “Vía Expresa Capitolio”» | documentada | [4] |
| 1951 | Proyecto | Alta prioridad en el Plan Municipal de Vialidad | «fuera incorporada como de alta prioridad dentro del Plan Municipal de Vialidad de 1951» | documentada | [4] |
| 1951 | Obra | La obra empieza en 1951: unos dos kilómetros entre Quinta Crespo y Dos Pilitas | «La intervención iniciada en 1951 abarcaría un trecho de aproximadamente dos kilómetros entre las esquinas de Quinta Crespo al sur y Dos Pilitas al norte» | documentada | [4] |
| 1951–1953 | Demolición | Más de un centenar de demoliciones | «numerosas expropiaciones, más de un centenar de demoliciones, la pérdida de buena parte de su memoria construida» | documentada | [4] |
| 1953 | Apertura | Se concluye en 1953, poco después de la Urdaneta; pasa bajo ella en Puente Llaguno | «Al concluirse en 1953 poco después de que ocurriera lo mismo con la avenida Urdaneta» | documentada | [4] [11] |
| 1961 | Nombre | Recibe el nombre de Baralt en 1961 | «El cambio de denominación de la avenida no se dará sino hasta 1961 cuando el gobierno de Rómulo Betancourt decide nombrarla» | documentada | [4] [11] |

**No se pudo documentar:**

- Día de la apertura de 1953.
- Ancho en metros: la fuente solo dice «seis canales».
- Nombres de los edificios demolidos.

### Avenida Baralt, prolongación de Dos Pilitas a la Cota Mil

`moderno:baralt-prolongacion-1973` · avenida · ausente en los cortes anteriores a **1973**.

**Antes:** No documentada.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1973 | Apertura | En 1973 se prolonga de Dos Pilitas a la Cota Mil | «se prolongue en 1973 su trazado desde la esquina Dos Pilitas hasta la Cota Mil» | documentada | [4] |

**No se pudo documentar:**

- Inicio de las obras.
- Qué se demolió.

### Avenida Lecuna

`moderno:lecuna-1970` · avenida · ausente en los cortes anteriores a **1970**.

**Antes:** Avenida Este–Oeste 10: existía y en 1940 terminaba en una rotonda junto al Puente Mohedano.

**Nombres:** «Avenida Este–Oeste 10» (¿?–1970) [37]; «Avenida Lecuna» (1970–hoy) [37].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1970 | Apertura | Se inaugura en 1970, de Angelitos a Parque Central | «Se inaugura la Avenida Lecuna, obra vial que transformó la Avenida Este – Oeste 10 de Caracas.» | documentada | [37] [19] |

**No se pudo documentar:**

- Día y mes de 1970.
- Inicio de las obras, longitud y ancho.
- Demoliciones, salvo el Puente Mohedano y el edificio de A. Planchart y Cía..

### Avenida Universidad, ampliación de las calles Oeste 4 y Este 4

`moderno:universidad-ampliacion` · avenida · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Antes:** Calles Oeste 4 y Este 4: existían.

**Nombres:** «Avenida Universidad» (¿?–¿?) [38].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1957 | Obra | Obras hacia 1957 | «Obras de construcción de la avenida Universidad sobre el trazado de las calles Oeste y Este 4 (c.1957).» | dudosa | [38] |
| Sin fecha | Nombre | Toma el nombre a finales de los años cincuenta, tras la ampliación | «adoptando el nombre de avenida Universidad a finales de los años 1950 (tras ser ampliada)» | dudosa | [38] |

**No se pudo documentar:**

- Año de la apertura: por eso no lleva «desde» y queda pendiente, no ausente, en los cortes del sitio.

## Avenidas del este

### Avenida Libertador

`moderno:libertador-1965` · avenida · ausente en los cortes anteriores a **1965**.

**Antes:** Ninguna documentada: las fuentes no nombran una calle anterior sobre su eje.

**Nombres:** «Avenida Libertador» (¿?–¿?) [8].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1951 | Proyecto | En el Plan Municipal de Vialidad, con sus conexiones a la Andrés Bello y a la Francisco de Miranda | «la avenida Libertador (incluyendo sus conexiones con la Andrés Bello y la Francisco de Miranda)» | documentada | [1] |
| 1957 | Obra | Se inicia en 1957 | «fue iniciada durante el régimen de Marcos Pérez Jiménez en 1957» | documentada | [8] |
| 1964 | Obra | En 1964 se levantan los muros de la trinchera en El Bosque; el paso del Country Club ya está construido | «Movimiento de tierra y construcción de los muros de concreto armado de soporte lateral de la Avenida Libertador» | documentada | [9] |
| 1965 | Apertura | Leoni la inaugura el 13 de diciembre de 1965; 7 km en dos niveles | «El 13 de diciembre el Presidente Raúl Leoni inaugura la recién concluida Avenida Libertador» | documentada | [8] |

**Contradicción pendiente — qué había abierto en 1957:**

- «fue iniciada durante el régimen de Marcos Pérez Jiménez en 1957» [8]
- «se vio afectado por la conexión abierta hacia la avenida Libertador en 1957» [10]

**No se pudo documentar:**

- Decreto.
- Extremos con nombre.
- Ancho.
- Apertura por tramos.
- Edificios demolidos.

### Avenida Andrés Bello

`moderno:andres-bello-1952` · avenida · ausente en los cortes anteriores a **1952**.

**Antes:** No documentada. La fuente pone «definitiva» y «oficial» entre comillas: pudo usarse antes, sin fecha.

**Nombres:** «Avenida Andrés Bello» (¿?–¿?) [10].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1936–1939 | Proyecto | Figura en el plano de 1936 anexo al Plan Monumental de 1939 | «“Plano general de la distribución de las nuevas avenidas, calles y carreteras” de 1936 (anexo al Plan Monumental de Caracas de 1939)» | documentada | [10] |
| 1951 | Proyecto | Obra imprescindible del Plan Municipal de Vialidad | «incorporada por el Plan Municipal de Vialidad de 1951 como una de las 9 obras imprescindibles dentro de las 19» | documentada | [10] |
| 1952 | Apertura | Apertura «definitiva» en 1952, de la redoma de la Vollmer a Los Jabillos | «La apertura definitiva de la avenida Andrés Bello en 1952 colaboró de manera importante al descongestionamiento del centro» | documentada | [10] |
| 1952 | Demolición | Corta el terreno del colegio y el oratorio de los Salesianos | «además de cortar el terreno de la escuela y del oratorio del Colegio de los Salesianos» | documentada | [10] |
| 1957 | Reforma | En 1957 se abre la conexión con la Libertador, que afecta al Mercado Guaicaipuro | «El Mercado, que junto al colegio de los salesianos se vio afectado por la conexión abierta hacia la avenida Libertador en 1957» | documentada | [10] |

**No se pudo documentar:**

- Fechas por tramo: la fuente da 1952 para el conjunto.
- Inicio de las obras, longitud y ancho.
- Si algún tramo estaba en uso antes de 1952.

### Avenida Francisco de Miranda

`moderno:francisco-de-miranda-1954` · avenida · ausente en los cortes anteriores a **1954**.

**Antes:** La Carretera del Este, que la fuente da por inaugurada a partir de 1947.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1954 | Apertura | En 1954 se concluyen sus 8,2 km | «concluye la construcción de los 8,2 kilómetros de longitud de la Avenida Francisco de Miranda» | documentada | [45] |

**No se pudo documentar:**

- Cuánto cae dentro de la hoja del sitio.

## Autopista del Este

### Distribuidor Baralt (sur, con la autopista)

`moderno:distribuidor-baralt-sur` · distribuidor · ausente en los cortes anteriores a **1968**.

**Antes:** No aplica.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1968 | Apertura | Se construye en 1968 | «cuando se construya al sur, en 1968, el Distribuido Baralt» | dudosa | [4] |

**Contradicción pendiente — año del distribuidor:**

- «9. Distribuidor Av. Baralt-Autopista Francisco Fajardo (1968).» [4]
- «el Distribuidor «Baralt-Sur» (1971)» [12]

**No se pudo documentar:**

- Cuál de las dos fechas es la de la puesta en servicio.

### Autopista del Este, primer tramo

`moderno:autopista-del-este-1953` · autopista · ausente en los cortes anteriores a **1953**.

**Antes:** Ninguna: corre por la vega del Guaire.

La capa Hoy la trae entera con su nombre actual: no separa las etapas de 1953, 1955, 1956 y 1970.

**Nombres:** «Autopista del Este» (1953–hoy) [16]; «Autopista Francisco Fajardo» (¿?–2020) [19] [18]; «Autopista Gran Cacique Guaicaipuro» (2020–hoy) [18].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1948 | Proyecto | Sale de la «Vía expresa Río Guaire» del plan de Moses | «lo que en el Plan de Moses se denominó “Vía expresa Río Guaire” daría pie al desarrollo de la […] “Autopista del Este”» | documentada | [15] |
| 1953 | Apertura | Se inaugura en 1953 | «Se termina la construcción e inaugura la Autopista del Este» | documentada | [16] |
| 1954 | Obra | Distribuidor Plaza Venezuela | «los distribuidores Plaza Venezuela (1954), Altamira (1955) y La Carlota (1956) sobre la autopista del Este» | documentada | [12] |
| 1955 | Reforma | Ampliación hasta el distribuidor Altamira | «Se concluye la ampliación de la Autopista del Este hasta llegar al distribuidor Altamira» | documentada | [17] |
| 2020 | Nombre | En octubre de 2020 pasa a llamarse «Gran Cacique Guaicaipuro Jefe de Jefes» | «En octubre de 2020, el presidente Nicolás Maduro aceptó la propuesta […] llamar a partir de ahora “Gran Cacique Guaicaipuro Jefe de Jefes”» | dudosa | [18] |

**Contradicción pendiente — extremos del tramo de 1953:**

- «del primer tramo de la Autopista del Este hasta Chacao (1953)» [12]
- «en 1953 se inaugura la Autopista del Este que iría justamente desde Puente Mohedano hasta La Carlota» [19]

**No se pudo documentar:**

- Día y mes de la inauguración de 1953.
- Fecha del nombre «Francisco Fajardo»: hacia 1970 ya lo llevaba.
- Acto oficial del cambio de nombre de 2020: solo lo da una fuente terciaria.

### Enlace de la avenida Bolívar con la Autopista del Este

`moderno:autopista-del-este-enlace-bolivar` · distribuidor · ausente en los cortes anteriores a **1954**.

**Antes:** No aplica.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1954 | Apertura | Se pone en servicio en 1954 | «concluye la construcción y pone en servicio el enlace de la avenida Bolívar con la Autopista del Este» | documentada | [20] [12] |

### Autopista del Este, prolongación de La Carlota a Petare

`moderno:autopista-del-este-1955` · autopista · ausente en los cortes anteriores a **1955**.

**Antes:** Ninguna documentada.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1955 | Apertura | Se inaugura en diciembre de 1955, tras cinco meses de obra | «En el mes de diciembre, luego de 5 meses de trabajo, se inaugura la prolongación […] entre La Carlota y Petare (Calle San Francisco)» | documentada | [21] |
| 1956 | Obra | En agosto de 1956 se completan el distribuidor La Carlota y el enlace con la Francisco de Miranda | «En agoste de 1956 se completó el Distribuidor La Carlota y el enlace La Carlota-Avenida Francisco de Miranda» | documentada | [21] |
| 1963 | Obra | En 1963 se concluye el distribuidor Los Ruices | «concluye la construcción del distribuidor de tránsito Los Ruices» | documentada | [22] |

**Contradicción pendiente — extremo este de 1955:**

- «entre La Carlota y Petare (Calle San Francisco)» [21]
- «en 1955 se prolongará hasta Petare-La California, canalizándose a la vez buena parte del río Guaire» [19]

### Autopista del Este, de Puente Mohedano a El Paraíso

`moderno:autopista-del-este-oeste` · autopista · ausente en los cortes anteriores a **1956**.

**Antes:** Ninguna documentada.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1956 | Apertura | En 1956 llega a El Paraíso | «y en 1956 desde Puente Mohedano a El Paraíso en sentido oeste» | dudosa | [12] |
| 1970 | Demolición | En 1970 desaparecen el Puente Mohedano y el edificio de A. Planchart y Cía. | «Será el momento en que desaparece el puente Mohedano y […] la demolición del edificio de A. Planchart y Cia.» | documentada | [19] |

**Contradicción pendiente — cuándo avanza hacia el oeste:**

- «y en 1956 desde Puente Mohedano a El Paraíso en sentido oeste» [12]
- «a partir de 1958 se adelanta firmemente la prolongación de la autopista hacia el oeste» [19]

**No se pudo documentar:**

- Ninguna fuente leída nombra una «autopista del Oeste» ni un tramo a Antímano.

### Distribuidor El Pulpo

`moderno:distribuidor-el-pulpo` · distribuidor · ausente en los cortes anteriores a **1961**.

**Antes:** No aplica.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1958 | Obra | La obra empieza en septiembre de 1958 | «La obra había sido iniciada en septiembre de 1958 por una sola empresa: VOLCA, C.A.» | documentada | [23] |
| 1961 | Apertura | Entra en servicio por etapas y se termina en 1961: une la autopista del Este con la Valle–Coche | «Se puso en servicio por etapas terminándose completamente en 1961.» | documentada | [23] [12] |

**No se pudo documentar:**

- Fechas de cada etapa.

### Distribuidor La Araña

`moderno:distribuidor-la-arana` · distribuidor · ausente en los cortes anteriores a **1966**.

**Antes:** No aplica.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1966 | Apertura | Leoni lo inaugura; construido entre 1959 y 1966 | «Raúl Leoni inaugurará “La Araña”, construido entre 1959 y 1966» | dudosa | [15] |

**Contradicción pendiente — años de la obra:**

- «Raúl Leoni inaugurará “La Araña”, construido entre 1959 y 1966» [15]
- «“La Araña” (1962-1968) que resolvería la conexión desde la autopista Francisco Fajardo con la Caracas-La Guaira» [12]

### Autopista La Araña–Caricuao

`moderno:autopista-la-arana-caricuao` · autopista · ausente en los cortes anteriores a **1970**.

**Antes:** Ninguna documentada.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1970 | Apertura | Diez kilómetros de La Araña a Caricuao, hechos en nueve meses | «El tramo propiamente dicho (de 10 kms) comienza en el núcleo central del Dispositivo La Araña […] y finaliza en Caricuao» | documentada | [12] |

### Distribuidor El Ciempiés

`moderno:distribuidor-el-ciempies` · distribuidor · ausente en los cortes anteriores a **1972**.

**Antes:** No aplica.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1972 | Apertura | Caldera lo inaugura en 1972 | «Rafael Caldera hará otro tanto con “El Ciempiés” en 1972 con José Curiel como su Ministro» | documentada | [15] |
| 1972 | Apertura | El 23 de julio, según una fuente terciaria | «distribuidor vial inaugurado el 23 de julio de 1972» | dudosa | [24] |
| 1972 | Obra | Incluye una rampa elevada y el Puente Veracruz II | «incluyó una rampa elevada y el Puente Veracruz II, que descongestionaba el antiguo Puente Veracruz» | documentada | [12] |

### Autopista del Este, «segundo piso»

`moderno:autopista-del-este-segundo-piso` · viaducto · ausente en los cortes anteriores a **1973**.

**Antes:** No aplica.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1973 | Apertura | Se abre en abril de 1973: 1.185 m de largo y 27 m de ancho | «En el mes de abril el Ministerio de Obras Públicas […] concluye y abre al tránsito el «segundo piso»» | documentada | [25] |

## Avenida Boyacá (Cota Mil)

### Distribuidor Baralt de la avenida Boyacá

`moderno:distribuidor-baralt-boyaca` · distribuidor · ausente en los cortes anteriores a **1973**.

**Antes:** No aplica. No fecha toda la avenida Boyacá.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1973 | Apertura | Caldera lo inaugura el 18 de agosto de 1973 | «El 18 de agosto, el presidente de la República Rafael Caldera […] inaugura y pone en funcionamiento el Distribuidor Av. Baralt» | documentada | [13] |

**Contradicción pendiente — qué se inauguró el 18 de agosto de 1973:**

- Solo el distribuidor: «inaugura y pone en funcionamiento el Distribuidor Av. Baralt» [13]
- Toda la avenida: «inauguración = 18 de agosto de 1973» [14]

### Cota Mil, tramo de Maripérez a La Florida

`moderno:boyaca-mariperez-la-florida` · avenida · ausente en los cortes anteriores a **1956**.

**Antes:** Ninguna: ladera del Ávila.

La capa Hoy trae la avenida entera: no separa las etapas de 1956, 1962, 1971 y 1973.

**Nombres:** «Cota Mil» (¿?–¿?) [28]; «Avenida Boyacá» (1971–hoy) [29].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1939 | Proyecto | Perimetral norte del Plan Rotival | «proyectada en la década de los años cuarenta del siglo XX, e incluida en el Plan Rotival» | dudosa | [13] |
| 1952 | Proyecto | En 1952 se intensifican los estudios | «En 1952 se intensificaron los estudios y levantamientos» | documentada | [28] |
| 1956 | Apertura | En 1956 se abren los primeros 1.300 m, de Maripérez a La Florida | «se abran los primeros mil trescientos metros de la Cota Mil, que unirían Maripérez (avenida Principal) con La Florida (avenida Los Pinos)» | documentada | [28] [12] |
| 1962 | Reforma | Rectificado en 1962 | «Cota Mil. Tramo Maripérez-La Florida abierto en 1956 y rectificado en 1962.» | documentada | [28] |

**No se pudo documentar:**

- Inicio de las obras de cada tramo.
- Acto que le da el nombre oficial.

### Cota Mil, de Maripérez a San Bernardino

`moderno:boyaca-san-bernardino-1962` · avenida · ausente en los cortes anteriores a **1962**.

**Antes:** Ninguna documentada.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1962 | Apertura | En 1962 se extiende hasta San Bernardino | «en 1962 se amplía su recorrido hasta San Bernardino y se rectifica en primer tramo entre Maripérez y La Florida» | documentada | [28] [12] |

### Avenida Boyacá, tramo de La Castellana a El Marqués

`moderno:boyaca-1971` · avenida · ausente en los cortes anteriores a **1971**.

**Antes:** Ninguna documentada.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1971 | Apertura | En 1971 se abren 6 km y la Cota Mil pasa a llamarse avenida Boyacá | «El tramo construido, que tiene 6 km de longitud, une las urbanizaciones La Castellana con El Marqués» | documentada | [29] [28] [12] |
| 1971 | Obra | Distribuidores La Castellana, Altamira, Sebucán, Boleíta y El Marqués; viaductos Adolfo Ernst y Altamira | «dos estructuras elevadas: el Viaducto Adolfo Ernst (que pasa por Los Chorros) y el Viaducto Altamira» | documentada | [29] |

**Contradicción pendiente — año del tramo La Castellana–El Marqués:**

- «El tramo construido, que tiene 6 km de longitud, une las urbanizaciones La Castellana con El Marqués» (entrada de 1971) [29]
- Lo da por inaugurado en agosto de 1962 [30]

**Contradicción pendiente — extremo oeste del tramo de 1971:**

- «une las urbanizaciones La Castellana con El Marqués» [29]
- «en 1971 recibirá un sostenido impulso que le permitirá extenderse de La Florida a El Marqués» [12]

**No se pudo documentar:**

- Día de la apertura de 1971.
- Cuándo se abrió entre La Florida y La Castellana.

### Avenida Boyacá, de San Bernardino a la avenida Baralt

`moderno:boyaca-1973` · avenida · ausente en los cortes anteriores a **1973**.

**Antes:** Ninguna documentada.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1973 | Apertura | El último tramo se concluye en 1973, con su distribuidor | «concluido en 1973 correspondió al segmento entre San Bernardino y la Avenida Baralt que incluyó el distribuidor con ese nombre» | documentada | [28] |

**Contradicción pendiente — longitud de la avenida:**

- «Alcanzaría entonces la avenida Boyacá alrededor de 14 kilómetros de longitud» [28]
- «tiene un recorrido de 14,5 kilómetros provista de diez distribuidores» [13]
- «teniendo una longitud aproximada de 13 km» [14]

## Autopista Valle–Coche

### Autopista Valle–Coche

`moderno:autopista-valle-coche` · autopista · ausente en los cortes anteriores a **1955**.

**Antes:** Ninguna documentada.

**Nombres:** «Autopista Valle–Coche» (¿?–¿?) [12]; «Autopista El Valle» (¿?–¿?) [27].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1951 | Proyecto | Sale de la «Acometida del Sur» del Plan Municipal de Vialidad | «“Acometida del Sur” germen de lo que sería la Autopista Valle-Coche» | documentada | [15] |
| 1955 | Apertura | Construida en 1955 | «sin dejar de nombrar la construcción de la autopista Valle-Coche (1955)» | documentada | [12] [26] |
| 1956 | Obra | El distribuidor La Bandera se inaugura el 4 de diciembre de 1956 | «El día martes 4 de diciembre el General Marcos Pérez Jiménez […] inauguraron el Distribuidor de Tránsito La Bandera» | documentada | [27] |

**No se pudo documentar:**

- Día y mes de la apertura de 1955.
- Extremos en 1955: El Pulpo, su extremo norte de hoy, es de 1958–1961.
- Longitud, ente y empresa.

## Autopista Caracas–La Guaira

### Autopista Caracas–La Guaira

`moderno:autopista-la-guaira` · autopista · ausente en los cortes anteriores a **1953**.

**Antes:** Ninguna. La carretera vieja de 1845 es otra vía y corre aparte.

**Nombres:** «Autopista Caracas–La Guaira» (1953–hoy) [31].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1945 | Proyecto | Estudios preliminares desde 1945 | «Desde que se comenzaron los estudios preliminares (1945) hasta que se inaiguró (1953) transcurrieron 8 años.» | documentada | [31] |
| 1950 | Obra | Las obras empiezan en enero de 1950, según una fuente terciaria | «se iniciaron los trabajos de construcción en enero de 1950» | dudosa | [32] |
| 1953 | Apertura | Pérez Jiménez la inaugura el 2 de diciembre de 1953 | «El 2 de diciembre el presidente Marcos Pérez Jiménez inaugura la Autopista Caracas-La Guaira.» | documentada | [31] |
| 1953 | Obra | Túneles Boquerón 1 y Boquerón 2 | «los túneles Boquerón 1 de 1.800 metros de longitud y Boquerón 2 de 500 metros» | documentada | [33] |
| 1953 | Obra | Tres viaductos sobre la quebrada de Tacagua, de Freyssinet y Campenon Bernard | «los viaductos diseñados por Eugène Freyssinet y construidos por la empresa francesa Campenon Bernard para la autopista Caracas-La Guaira» | documentada | [34] [32] |
| 2007 | Reforma | El viaducto 1 colapsa en 2006; el nuevo, de 803 m, se inaugura en junio de 2007 | «El 21 de junio se inaugura el nuevo Viaducto Caracas – La Guaira […] Tiene una longitud de 803 metros» | documentada | [35] |

**Contradicción pendiente — largo del túnel Boquerón 1:**

- «los túneles Boquerón 1 de 1.800 metros de longitud y Boquerón 2 de 500 metros» [33]
- «Túnel Boquerón 1 […] 1910 m […] Túnel Boquerón 2 […] 497 m» [32]

**Contradicción pendiente — día de la inauguración del viaducto nuevo:**

- «El 21 de junio se inaugura el nuevo Viaducto Caracas – La Guaira» [35]
- «El 22 de junio de 2007, fue inaugurado el Nuevo Viaducto N.º 1» [32]

**No se pudo documentar:**

- Longitud total y extremos exactos.
- Nombres y medidas de los viaductos 2 y 3.
- El inicio de las obras en 1950 solo lo da una fuente terciaria.

### Carretera vieja Caracas–La Guaira

`moderno:carretera-vieja-la-guaira` · carretera · ausente en los cortes anteriores a **1845**.

**Antes:** El camino colonial, que tampoco es esta carretera.

No es posterior a 1946: está aquí para que nadie la confunda con la autopista de 1953. Su única fuente es terciaria.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1845 | Apertura | Soublette la inaugura el 14 de enero de 1845: 37 km y unos 6 m de ancho | «la inauguró el presidente Carlos Soublette en enero de 1845 de 37 kilómetros de longitud y aproximadamente 6 metros de ancho» | dudosa | [36] |
| Sin fecha | Reforma | Mejoras en 1871, 1883, 1911–1912 y 1925 | «con diferentes adaptaciones y mejoras que se realizaron en 1871, 1883, 1911-1912 y 1925» | dudosa | [36] |

**No se pudo documentar:**

- Su trazado dentro de la hoja del sitio: nadie lo leyó en el plano de 1908 del catálogo (fuentes/mapas/1908-archiveorg-laguaira-caracas-vicinity-wardept).
- Una fuente que no sea terciaria.

## Avenidas del oeste

### Avenida Sucre, tercer tramo (Tinajitas–placita Diego de Losada)

`moderno:sucre-tercer-tramo-1952` · avenida · ausente en los cortes anteriores a **1952**.

**Antes:** No documentada para este tramo.

La capa Hoy trae la avenida entera; los tramos primero, segundo y cuarto no tienen fecha en las fuentes leídas.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1952 | Apertura | El tercer tramo se inaugura el 23 de noviembre de 1952; la avenida queda de Catia a El Silencio | «se concluye la construcción del tercer tramo de la avenida Sucre […] comprendido entre Tinajitas y la antigua placita Diego de Losada» | documentada | [34] [39] |
| 1954 | Reforma | El puente Nueva República (antes Pagüita) la une con la plaza O’Leary en 1954 | «se inaugura y pone en servicio el Puente Nueva República (antes Pagüita), que une la Av. Sucre con la Plaza O’Leary» | documentada | [40] [34] |

**Contradicción pendiente — año:**

- «Se concluye la construcción de la Av. Sucre desde Catia hasta El Silencio.» (entrada de 1952) [39]
- «así como la ampliación de la Av. Urdaneta y la Av. Sucre» (entre lo inaugurado en 1953) [16]

**No se pudo documentar:**

- Fechas de los tramos primero, segundo y cuarto.

### Avenida San Martín, ampliación de Angelitos a Alcabala

`moderno:san-martin-ampliacion-1954` · avenida · ausente en los cortes anteriores a **1954**.

**Antes:** La propia avenida San Martín, que lleva ese nombre desde 1922: existía, más angosta.

**Nombres:** «Avenida San Martín» (1922–hoy) [41].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1922 | Nombre | Lleva el nombre desde 1922 | «así denominada desde 1922 en honor al general y prócer argentino José de San Martín» | documentada | [41] |
| 1954 | Apertura | En 1954 se termina la ampliación: 1.232 m, 30 m de fachada a fachada y 18 m de calzada | «30 metros de fachada a fachada, la calzada de 18 metros de ancho y el ancho de las aceras 5,90 metros» | documentada | [42] [41] |
| 1954 | Demolición | Reduce las plazas Capuchinos e Italia | «redujo considerablemente las dimensiones de las plazas Capuchinos e Italia» | documentada | [41] |

**Contradicción pendiente — extremos de la ampliación de 1954:**

- «el tramo de la Avenida San Martín comprendido entre las esquinas Angelitos a Alcabala, unos 1.232 metros de longitud» [42]
- «se termina su última ampliación en 1954 entre El Silencio y Palo Grande» [41]

## Avenidas del sur

### Avenida Nueva Granada

`moderno:nueva-granada-1950` · avenida · ausente en los cortes anteriores a **1950**.

**Antes:** El camino de El Valle, colonial, sobre cuyo trazado se hizo.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1950 | Apertura | El MOP la inaugura en 1950, de El Portachuelo a La Bandera | «concluye la construcción e inaugura en Caracas, la Avenida Nueva Granada, la cual une El Portachuelo con La Bandera» | documentada | [43] |

**No se pudo documentar:**

- Día y mes.
- Ancho.

### Avenida Guzmán Blanco (Cota 905)

`moderno:cota-905-1953` · avenida · ausente en los cortes anteriores a **1953**.

**Antes:** No documentada.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1953 | Apertura | Entra en servicio en noviembre de 1953: 6 km y 11 m de ancho, de la redoma de La Paz a El Peaje | «La Gobernación del Distrito Federal construye y pone en servicio en el mes de noviembre la Av. Guzmán Blanco o Cota 905» | documentada | [44] |

## No son posteriores a 1946

Aparecen en la capa Hoy con nombre de avenida, pero las fuentes las dan por abiertas en 1946 o antes: no entran en el control de ausencia.

- **Avenida México.** Se desarrolla desde los años cuarenta como prolongación de Este 4 y toma el nombre antes de 1945. No tiene fecha de apertura en las fuentes leídas. «se desarrollará a partir de los años 1940 como prolongación de la avenida Este 4 y adoptará muy pronto el nombre de avenida México» [38]
- **Avenida Victoria (Presidente Medina desde 1958).** Inaugurada en 1945. «Se concluye e inaugura la Avenida Victoria» [46]
- **Avenida Roosevelt.** Puesta en servicio el 14 de septiembre de 1946. «los 2,99 kilómetros de la Avenida Roosevelt, la cual es puesta en servicio el 14 de septiembre» [47]

## Fuentes

| N.º | Clase | Documento | Enlace |
|---:|---|---|---|
| 1 | secundaria con referencias | 2024 | <https://fundaayc.com/2024/07/07/sabia-usted-119/> |
| 2 | secundaria sin referencias | 2013 | <https://fundaayc.com/2013/09/26/1953-inauguracion-de-la-avenida-urdaneta/> |
| 3 | secundaria sin referencias | 2013 | <https://fundaayc.com/2013/11/04/1953-efectos-urbanos-asociados-a-la-inauguracion-de-la-avenida-urdaneta/> |
| 4 | secundaria con referencias | 2023 | <https://fundaayc.com/2023/04/02/sabia-usted-98/> |
| 5 | secundaria sin referencias | 2013 | <https://fundaayc.com/2013/11/10/1956%E2%80%A2-avenida-fuerzas-armadas/> |
| 6 | secundaria sin referencias | 2014 | <https://fundaayc.com/2014/06/15/1956-colapsa-el-encofrado-del-canal-en-sentido-a-la-roca-tarpeya-del-puente-sucre/> |
| 7 | secundaria sin referencias | 2026 | <https://fundaayc.com/2026/10/19/1956-nueva-fachada-de-la-iglesia-corazon-de-jesus/> |
| 8 | secundaria sin referencias | 2026 | <https://fundaayc.com/2026/09/15/1965-inauguracion-de-la-avenida-libertador/> |
| 9 | secundaria sin referencias | 2022 | <https://fundaayc.com/2022/06/08/1964-construccion-de-la-avenida-libertador/> |
| 10 | secundaria con referencias | 2022 | <https://fundaayc.com/2022/05/01/sabia-usted-82/> |
| 11 | secundaria sin referencias | 2026 | <https://fundaayc.com/2026/08/26/1953-avenida-baralt/> |
| 12 | secundaria con referencias | 2025 | <https://fundaayc.com/2025/03/02/algo-mas-sobre-la-postal-no-438/> |
| 13 | secundaria sin referencias | 2026 | <https://fundaayc.com/2026/08/31/1973-distribuidor-av-baralt-de-la-cota-mil/> |
| 14 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Avenida_Boyac%C3%A1_(Caracas)> |
| 15 | secundaria con referencias | 2021 | <https://fundaayc.com/2021/08/15/sabia-usted-70/> |
| 16 | secundaria sin referencias | 2013 | <https://fundaayc.com/2013/10/22/1953%e2%80%a2-se-inaugura-la-autopista-del-este/> |
| 17 | secundaria sin referencias | 2014 | <https://fundaayc.com/2014/06/23/1955%e2%80%a2-se-amplia-la-autopista-del-este/> |
| 18 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Autopista_Francisco_Fajardo> |
| 19 | secundaria con referencias | 2024 | <https://fundaayc.com/2024/08/04/sabia-usted-120/> |
| 20 | secundaria sin referencias | 2014 | <https://fundaayc.com/2014/12/21/1954%e2%80%a2-enlace-avenida-bolivar-autopista-del-este/> |
| 21 | secundaria sin referencias | 2017 | <https://fundaayc.com/2017/04/30/1955-se-inaugura-la-prolongacion-de-la-autopista-del-este-entre-la-carlota-y-petare/> |
| 22 | secundaria sin referencias | 2014 | <https://fundaayc.com/2014/08/23/1963%e2%80%a2-distribuidor-los-ruices/> |
| 23 | secundaria sin referencias | 2017 | <https://fundaayc.com/2017/03/23/1961-distribuidor-el-pulpo/> |
| 24 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Distribuidor_El_Ciempi%C3%A9s> |
| 25 | secundaria sin referencias | 2026 | <https://fundaayc.com/2026/05/26/1973-segundo-piso-de-la-autopista-de-este-hoy-francisco-fajardo/> |
| 26 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Autopista_Valle-Coche> |
| 27 | secundaria sin referencias | 2014 | <https://fundaayc.com/2014/08/12/1956%e2%80%a2-se-inaugura-el-distribuidor-de-transito-la-bandera/> |
| 28 | secundaria con referencias | 2022 | <https://fundaayc.com/2022/08/14/sabia-usted-88/> |
| 29 | secundaria sin referencias | 2013 | <https://fundaayc.com/2013/11/15/1971-nueva-etapa-de-la-la-cota-mil-la-cual-se-renombra-como-avenida-boyaca/> |
| 30 | secundaria con referencias | 2016 | <https://mariafsigillo.blogspot.com/2016/04/breve-recuento-de-la-cota-mil.html> |
| 31 | secundaria sin referencias | 2013 | <https://fundaayc.com/2013/10/26/1953%E2%80%A2-se-inaugura-la-autopista-caracas-la-guaira/> |
| 32 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Autopista_Caracas-La_Guaira> |
| 33 | secundaria sin referencias | 2013 | <https://fundaayc.com/2013/10/08/1953%e2%80%a2-tuneles-boqueron-1-y-boqueron-2/> |
| 34 | secundaria con referencias | 2025 | <https://fundaayc.com/2025/01/19/sabia-usted-128/> |
| 35 | secundaria sin referencias | 2013 | <https://fundaayc.com/2013/09/15/2007-se-inaugura-el-nuevo-viaducto-caracas-la-guaira/> |
| 36 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Carretera_Vieja_Caracas-La_Guaira> |
| 37 | secundaria sin referencias | 2014 | <https://fundaayc.com/2014/12/01/1970-se-inaugura-la-avenida-lecuna/> |
| 38 | secundaria con referencias | 2025 | <https://fundaayc.com/2025/11/16/sabia-usted-133/> |
| 39 | secundaria sin referencias | 2014 | <https://fundaayc.com/2014/05/22/1952%e2%80%a2-se-concluye-la-construccion-de-la-av-sucre/> |
| 40 | secundaria sin referencias | 2016 | <https://fundaayc.com/2016/03/03/1954/> |
| 41 | secundaria con referencias | 2022 | <https://fundaayc.com/2022/10/23/sabia-usted-93/> |
| 42 | secundaria sin referencias | 2019 | <https://fundaayc.com/2019/10/01/1954-avenida-san-martin/> |
| 43 | secundaria sin referencias | 2019 | <https://fundaayc.com/2019/09/09/1950%e2%80%a2-se-inaugura-la-avenida-nueva-granada/> |
| 44 | secundaria sin referencias | 2019 | <https://fundaayc.com/2019/12/05/1953-avenida-guzman-blanco-o-cota-905/> |
| 45 | secundaria sin referencias | 2015 | <https://fundaayc.com/2015/12/09/1954%e2%80%a2-avenida-francisco-de-miranda/> |
| 46 | secundaria sin referencias | 2017 | <https://fundaayc.com/2017/11/18/1945%e2%80%a2-avenida-victoria/> |
| 47 | secundaria sin referencias | 2015 | <https://fundaayc.com/2015/10/15/1946-avenida-roosevelt/> |
