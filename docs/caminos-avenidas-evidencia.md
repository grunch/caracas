# Caminos de salida, alcabalas y avenidas del oeste: ficha de evidencias

Avance de [#270](https://github.com/grunch/caracas/issues/270) (caminos históricos y alcabalas) y de
[#275](https://github.com/grunch/caracas/issues/275) (avenidas Sucre y San Martín). Es documentación: **no se
agrega ningún eje, marca, ficha ni geometría**, y los datos publicados no cambian.

Los datos viven en [`evidencias/caminos-avenidas.json`](evidencias/caminos-avenidas.json), con la ficha de
evidencias del registro vial ([`red-vial-temporal.md`](red-vial-temporal.md)): una fuente por afirmación, fecha del
documento aparte de la del hecho, certeza, contradicciones sin resolver y lo que no se pudo documentar. Las tablas
que siguen a la marca de abajo se generan desde ahí; `tests/unit/caminos-avenidas.test.js` comprueba que no se
desfasen.

## Qué se hizo y cómo

- **Planos.** Se leyeron recortes del mosaico de 1936 (0,5 m por píxel) y del plano de 1946 ya reducido a 2 m por
  píxel, en Catia, Palo Grande y Sabana Grande. Para 1772 y 1843 no se volvió a mirar el plano: se usa lo que ya
  está transcrito en `specs/auditoria-1772/trazado-calles-original.json`, `tools/geo/referencias/1772-calles-1936.json`
  y `specs/auditoria-1843/leyenda.json`, salvo la letra x (Alcabala de Candelaria), que se ubicó sobre el plano de
  1843 al leer los puentes de #271. **Los planos de 1889 y 1911 no se leyeron** para estos elementos (el de 1911,
  solo en Palo Grande): en la tabla salen «Sin lectura», que no es una ausencia.
- **Fuentes escritas.** Cilento (Academia Nacional de la Ingeniería y el Hábitat), el capítulo de Vargas de
  *GeoVenezuela* (Fundación Empresas Polar), Altez (Boletín de la Academia Nacional de la Historia, 2008) y cinco
  entradas de la Fundación Arquitectura y Ciudad. Todas secundarias. Las leyeron dos subagentes, que devolvieron
  citas textuales con página; nadie las cotejó contra un archivo.
- Las posiciones entre paréntesis son píxeles del mosaico de 1936, leídos a ojo sobre una rejilla. Sirven para
  encontrar el rótulo. **No son un calce** y no alcanzan para una huella.

## Hallazgos

1. **Tres infraestructuras distintas hacia La Guaira**, que no se sustituyen: el camino de recuas colonial, la
   carretera de carruajes de 1837–1845 y la autopista de 1953. En 1843 la carretera estaba en obra (se inaugura el
   14 de enero de 1845); **qué tramo estaba abierto en 1843 no lo dice ninguna fuente leída**. El plano de 1936 la
   rotula «Carretera Caracas–La Guaira» en Catia.
2. **El camino de La Vega de 1772 es la «Sur Ocho» de 1936.** El eje L1772-0083, ya calzado, cae sobre la calle que
   el plano de 1936 rotula «Sur Ocho» entre Capuchinos y la Plaza Italia, y pasa a unos 6 m de la esquina que ese
   plano llama «Cruz de la Vega». Es la coincidencia mejor sustentada entre un camino de 1772 y una calle de 1936.
3. **En 1936 «Avenida San Martín» empieza en la esquina de Alcabala.** El rótulo va de ahí hacia el suroeste; el
   tramo de Capuchinos a la Plaza Italia se sigue llamando «Sur Ocho». FAC da el nombre San Martín desde 1922, sin
   decir en qué tramo.
4. **Tres topónimos de alcabala en 1936**, ninguno con solar: «Alcabala» en Candelaria, «Alcabala Vieja» al sur y
   «Alcabala» en el camino de La Vega, que el plano de 1911 ya llama «Alcabala Palo Grande». La leyenda de 1843
   solo enumera dos alcabalas (Valle y Candelaria) y la Puerta de La Guaira. La de Candelaria es la única ubicada:
   su letra x está sobre la calle del este, unos 55 m al este de la esquina «Alcabala» de 1936 y unos 65 m antes
   del puente de Anauco. Que una esquina de 1936 sea el lugar de una alcabala de 1843 sigue siendo una inferencia.
5. **La plaza de Catia se llama «Plaza La Libertad» en el plano de 1936**, mientras FAC dice que de 1935 a 1941 se
   llamó «Agustín Codazzi». Contradicción pendiente.
6. **La estatua de Sucre no está en Catia en 1936 ni en 1946.** Según FAC, la plaza la recibe «después de 1951»; la
   ecuestre de Lorenzo González de 1922 estaba en el cruce de la avenida San Martín con la 19 de Diciembre (foto
   de hacia 1945). El issue pedía cotejar esto antes de modelar el monumento: no se modela.
7. **El «ensanche de 1924» de la avenida Sucre no aparece en la fuente.** La entrada de FAC solo cita, para enero
   de 1924, mejoras y veintidós focos de alumbrado. Queda como dato sin documentar.
8. **Nueva Caracas ya tiene toda su retícula en 1936**, con la avenida España y la Plaza Pérez Bonalde, pero casi
   vacía; en 1946 las manzanas del norte están edificadas.

## Anchos: lo que no se sabe

Ningún documento leído da el ancho de un camino, ni el de las avenidas Sucre o San Martín antes de sus ensanches de
1952 y 1954. Los 26 m y los 30 m de esas obras **no valen para 1936 ni 1946**. La única medida disponible es la de
[`mediciones/vialidad/secciones-modernas.json`](mediciones/vialidad/secciones-modernas.json) (#303), que mide el eje
de *hoy* contra las manzanas que el sitio dibuja: donde hay corredor, su ancho mediano es de 22 m para la avenida
Sucre en 1936 y 1946, y de 21 y 23 m para la San Martín; el 15 % y el 19 % de esos ejes cae dentro de una manzana
de 1936. Es una medida de las manzanas del sitio sobre un eje moderno, no el ancho histórico de la calle.

## Estado de los criterios

| Criterio | #270 | #275 |
|---|---|---|
| Ficha de evidencias por etapa | Hecha para 1772, 1843 y 1936; 1889 y 1946 sin leer, 1911 solo en Palo Grande | Hecha para 1936 y 1946; antes de 1936, solo fuentes escritas |
| Huella georreferenciada | No: los cuatro ejes de 1772 siguen sin aprobar y sin ancho; las alcabalas no tienen solar | No: solo cajas de lectura; no se digitalizaron ejes |
| Variantes por época | No hay marca ni ficha | No hay marca ni ficha |
| Referencias visuales | Ninguna imagen con licencia; las de las fuentes no se incorporan | Igual |
| Pruebas y capturas | Tests del catálogo; nada que capturar | Igual |
| Reglas de construcción y rendimiento | No aplica: sin geometría | No aplica |
| Dudas abiertas | Escritas por elemento, abajo | Escritas por elemento, abajo |

## Qué sigue

- Leer los planos de 1889 y 1911 para los mismos elementos y ubicar las letras v, w, y, z y los dos signos de la
  leyenda de 1843 (la x ya está).
- Digitalizar como tramos del registro vial la «Sur Ocho»/San Martín y la avenida Sucre de 1936 y 1946, y medir su
  ancho sobre el mosaico.
- Marcas: solo cuando haya posición leída. Hoy la tendrían la Plaza La Libertad y la Plaza Pérez Bonalde (son
  puntos de control en `tools/geo/gcp/1936-wgs84.json`); las alcabalas, no.
- El monumento de la plaza de Catia y el de la avenida San Martín quedan sin modelar: no hay estudio en Miraflores.

## Referencias visuales

No se incorpora ninguna imagen. Las entradas de FAC anotan la procedencia («Colección Crono Arquitectura
Venezuela», «Colección Fundación Arquitectura y Ciudad», redes) sin licencia; quedan como enlaces de consulta. El
único mapa del catálogo con licencia establecida que cubre los caminos fuera del casco es
`fuentes/mapas/1908-archiveorg-laguaira-caracas-vicinity-wardept` (dominio público, 1:62.500): no se leyó acá.

<!-- catálogo: lo que sigue se genera con `node tools/catalogo-evidencias.mjs`; no editar a mano -->

## Lo que deja leer el plano de cada corte

«Sin lectura» es que nadie leyó ese plano para ese elemento: no es una ausencia. La certeza va entre paréntesis.

| Elemento | 1772 | 1843 | 1889 | 1911 | 1936 | 1946 |
|---|---|---|---|---|---|---|
| Camino de La Guaira (Camino Real, «de los Españoles») | **Existe** (documentada). Trazo L1772-0077, de (8304, 4713) a (7976, 3719), hacia el norte de La Pastora. Eje aproximado leído sobre el original, inspeccionado y no aprobado para generar; el doble trazo no se midió, así que no hay ancho. Sector de calce débil (banda de 30 m): no medible. | **Existe** (documentada). «Camino de La Guaira». Letra z de la leyenda («id. de La Guaira»); la letra v es la «Puerta de La Guaira». La leyenda lo enumera; nadie ubicó su signo sobre el dibujo, así que no tiene posición. | Sin lectura | Sin lectura | Sin lectura | Sin lectura |
| Carretera de La Guaira (carretera de Catia o Camino del Norte) | Sin lectura | **En obra** (inferida). El plano no la rotula como carretera. La leyenda trae un «Camino de Catia» de signo dudoso. Que en 1843 estaba en obra sale de las fechas de la obra (1837–1845), no del plano. | Sin lectura | Sin lectura | **Existe** (documentada). «Carretera Caracas–La Guaira». Rótulo al norte de la Plaza La Libertad de Catia, entre (2400, 4000) y (2750, 4250), junto a la vía del ferrocarril. | Sin lectura |
| Camino de Catia («Viejo Camino del Oeste») | **Existe** (documentada). Trazo L1772-0076, de (6585, 5696) a (7002, 5874), al oeste de Pagüita. Eje aproximado leído sobre el original, inspeccionado y no aprobado para generar; el doble trazo no se midió, así que no hay ancho. | **Existe** (dudosa). «Camino de Catia». «id. de Catia», con un signo de lectura dudosa. La leyenda lo enumera; nadie ubicó su signo sobre el dibujo, así que no tiene posición. | Sin lectura | Sin lectura | Sin lectura | Sin lectura |
| Camino de La Vega (camino de Antímano, Carretera de Occidente) | **Existe** (documentada). Trazo L1772-0083, de (5923, 8653) a (6332, 8753): doble trazo hasta la orilla. Eje aproximado leído sobre el original, inspeccionado y no aprobado para generar; el doble trazo no se midió, así que no hay ancho. Cae sobre la calle que el plano de 1936 rotula «Sur Ocho», a unos 6 m de la esquina «Cruz de la Vega». | **Existe** (documentada). «Camino de la Vega». «id. de la Vega», con una cruz por signo. La leyenda lo enumera; nadie ubicó su signo sobre el dibujo, así que no tiene posición. | Sin lectura | Sin lectura | **Existe** (documentada). «Sur Ocho». La calle sigue ahí: «Sur Ocho» entre la Plaza de Capuchinos (6800, 8330) y la Plaza Italia (5760, 8830), con la esquina «Cruz de la Vega» en (6230, 8700). | Sin lectura |
| Camino de El Valle | **Existe** (documentada). Trazo L1772-0084, de (9603, 10378) a (9817, 9443). Eje aproximado leído sobre el original, inspeccionado y no aprobado para generar; el doble trazo no se midió, así que no hay ancho. La conexión con la trama urbana está sin resolver. | **Existe** (inferida). La leyenda no enumera un camino del Valle, pero sí su alcabala (letra w) y la calle «de la alcabala del Valle» (n.º 136). | Sin lectura | Sin lectura | Sin lectura | Sin lectura |
| Camino de Sabana Grande (Camino Real de Petare, Carretera del Este) | Sin lectura | **Existe** (documentada). «Camino de Sabana Grande». Letra y de la leyenda. La leyenda lo enumera; nadie ubicó su signo sobre el dibujo, así que no tiene posición. | Sin lectura | Sin lectura | **Existe** (documentada). «Calle Real de Sabana Grande». Calle edificada desde (16500, 9180) hasta el borde del dibujo en (18280, 9950). | Sin lectura |
| Alcabala de Candelaria | Sin lectura | **Existe** (documentada). «Alcabala de Candelaria». Letra x de la leyenda, dibujada en (11420, 7160) sobre la calle que sale al este, unos 65 m antes de la letra f (el puente de Anauco). El plano no dibuja un edificio propio. | Sin lectura | Sin lectura | **No se sabe** (documentada). «Alcabala». Queda el nombre en una esquina, (11310, 7151), a unos 140 m al oeste del rótulo «Puente Anauco». Es un topónimo: no prueba que hubiera alcabala en 1936. | Sin lectura |
| Alcabala del Valle | Sin lectura | **Existe** (documentada). «Alcabala del Valle». Letra w de la leyenda. La leyenda lo enumera; nadie ubicó su signo sobre el dibujo, así que no tiene posición. | Sin lectura | Sin lectura | **No se sabe** (documentada). «Alcabala Vieja». Queda el nombre en una esquina, (9745, 9120), con la cota 879,29. Es un topónimo: «vieja» dice que ya no lo era. | Sin lectura |
| Esquina de Alcabala (camino de La Vega) | Sin lectura | Sin lectura | Sin lectura | **No se sabe** (documentada). «Alcabala Palo Grande». Rótulo «ALCABALA PALO GRANDE» sobre una manzana, hacia (5500, 8850), al sur de la «Est. Palo Gr.»; el tranvía pasa en rojo por su borde. Es un nombre de lugar: el plano no dibuja un edificio de alcabala. | **No se sabe** (documentada). «Alcabala». Nombre de esquina en (5480, 8980), al suroeste de la Plaza Italia. Es un topónimo. | Sin lectura |
| Puerta de La Guaira | **No se sabe** (dudosa). El original dibuja una alcabala en el camino de La Guaira (`EX1772-012`), sin pareja segura en 1936; nadie transcribió su rótulo. | **Existe** (documentada). «Puerta de La Guaira». Letra v de la leyenda. La leyenda lo enumera; nadie ubicó su signo sobre el dibujo, así que no tiene posición. | Sin lectura | Sin lectura | Sin lectura | Sin lectura |
| Avenida Sucre (Catia) | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **Existe** (documentada). «Avenida Sucre». Rótulo «AVENIDA SUCRE» desde la Plaza La Libertad (2180, 4450) hacia el este, hasta pasar (4000, 5000); edificada a trechos, con la Capilla de Catia y el depósito del MOP sobre ella. | **Existe** (documentada). «Avenida Sucre». El mismo rótulo, de la plaza a Agua Salud (4900, 4900), y la avenida sigue al sureste. Leído sobre el plano reducido a 2 m por píxel. |
| Avenida San Martín | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **Existe** (documentada). «Avenida San Martín». Rótulo «AVENIDA SAN MARTIN» al suroeste de la esquina Alcabala, de (5400, 9000) a (4700, 9500), frente a la Casa de Maternidad. Al noreste, de la Plaza Italia a Capuchinos, la misma vía se rotula «Sur Ocho». | **Existe** (documentada). «Avenida San Martín». Rótulo «AVENIDA SAN MARTIN» en el mismo tramo, de (5400, 9050) a (4300, 9600). Leído sobre el plano reducido a 2 m por píxel. |
| Nueva Caracas, avenida España y Plaza Pérez Bonalde | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **Existe** (documentada). «Nueva Caracas». Retícula completa entre x 1500 y 2700, y 4700 y 6600, con la «Avenida España» de norte a sur y la «Plaza Pérez Bonalde» en (1770, 6090); calles Colombia, México, Argentina, Brasil, Bolívar y Ecuador. La mayoría de las manzanas tiene pocas casas sueltas. | **Existe** (documentada). «Nueva Caracas». La misma retícula, ahora con las manzanas del norte rellenas de edificación; rótulos «Nueva Caracas», «Avenida España» y avenidas numeradas. Leído sobre el plano reducido a 2 m por píxel. |
| Plaza de Catia (hoy Plaza Sucre) | Sin lectura | Sin lectura | Sin lectura | Sin lectura | **Existe** (documentada). «Plaza La Libertad». Plaza ajardinada en (2180, 4450), con ese rótulo, donde empieza la avenida Sucre. | **Existe** (documentada). La plaza sigue en el mismo sitio; su rótulo, de dos líneas, no se lee en el plano reducido. |

## Caminos de salida

### Camino de La Guaira (Camino Real, «de los Españoles»)

`camino:la-guaira-colonial` · camino de recuas · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

No es la carretera de 1845 ni la autopista de 1953.

**Nombres:** «Camino de La Guaira» (¿?–¿?) [3].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1597 | Obra | Osorio ordena en 1597 el «Camino de la Montaña» sobre una pica indígena | «en 1597, ordenó la construcción de un camino, el “Camino de la Montaña”, siguiendo una pica indígena llamada “La Culebrilla”» (p. 175) | documentada | [1] |
| 1762 | Reforma | Empedrado en 1762 | «El hoy llamado “Camino de los Españoles” que data de inicios del siglo XVIII, se empedró en 1762 y, durante tres siglos, fue el único camino transitable entre Caracas y La Guaira» (p. 175) | dudosa | [1] |
| Sin fecha | Levantamiento | Camino de recuas y de gente a pie, no de carruajes | «Se trataba de un camino usado por recuas de mulas y gente a pie, de acuerdo a lo señalado por Cruxent, y no por carruajes o carretas» (p. 47) | documentada | [2] |
| Sin fecha | Nombre | Su nombre formal era Camino Real | «conocido históricamente como "el camino de los españoles", a pesar de que su nombre formal fuese el de Camino Real» (p. 47) | documentada | [2] |

**Contradicción pendiente — Desde cuándo es el único camino a La Guaira:**

- Data de inicios del siglo XVIII y se empedró en 1762 [1]
- Era el único camino desde principios del siglo XVII [2]

**No se pudo documentar:**

- Su ancho.
- Dónde estaba la puerta o alcabala en Caracas: el plano de 1772 dibuja una en este camino y no tiene pareja segura en 1936 (`EX1772-012`).
- La posición de la «Puerta de La Guaira» de la leyenda de 1843.
- Fortines del tramo de Caracas, con fechas.
- Cómo lo dibujan los planos de 1889 y 1911: no se leyeron.

### Carretera de La Guaira (carretera de Catia o Camino del Norte)

`camino:carretera-la-guaira` · carretera de carruajes · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

El catálogo de vías posteriores a 1946 la trae como `moderno:carretera-vieja-la-guaira` para separarla de la autopista; acá va su obra y lo que dibujan los planos.

**Nombres:** «Carretera Caracas–La Guaira» (¿?–¿?) [5].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1837 | Proyecto | En 1837 la Diputación Provincial autoriza contratar la apertura del camino nuevo por la pica de Amado Pérez | «En 1837 la Diputación Provincial de Caracas había autorizado a la Junta Superior de Caminos para contratar “la apertura del nuevo camino… por la pica de Amado Pérez, hasta perfeccionarlo carretero”» (p. 175) | documentada | [1] |
| 1837–1845 | Obra | Se construye entre 1837 y 1845 | «carretera de Catia o Camino del Norte, que une Caracas con La Guaira, construido entre los años 1837 y 1845» (p. 344) | documentada | [4] |
| Sin fecha | Obra | Dirección técnica de Juan José Aguerrevere; no más de 5 % de pendiente y ocho varas de piso firme | «el menor declive posible (no más del 5%)… “ocho varas de piso firme en las partes rectas, y de doce por lo menos en las oblicuas o recodos”» (p. 11) | documentada | [1] |
| 1845 | Apertura | Inaugurada el 14 de enero de 1845 | «inaugurada el 14 de enero de 1845» (p. 11) | documentada | [1] |
| Sin fecha | Levantamiento | Sube por el cañón del Tacagua | «aprovechando la suavidad ofrecida por el cañón del Tacagua» (p. 51) | documentada | [2] |

**No se pudo documentar:**

- Qué tramo estaba abierto en 1843: ninguna fuente leída lo dice, solo que las «primeras ruedas» corrieron en enero de 1845.
- Contratista.
- Por dónde salía exactamente de Caracas.
- Si el «Camino de Catia» de la leyenda de 1843 es esta obra o el camino anterior.

### Camino de Catia («Viejo Camino del Oeste»)

`camino:catia` · camino · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

Lo continúa la avenida Sucre, más abajo.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1845 | Apertura | La fuente fecha el «Camino de Catia» en 1845 | «la construcción primero del llamado Camino de Catia (1845) y más tarde (1883) del Ferrocarril Caracas-La Guaira» | dudosa | [6] |
| Sin fecha | Levantamiento | La primera conexión a Catia salía de la esquina noroeste de Santa Capilla hasta la quebrada Agua Salud | «la primera conexión hacia Catia se inicia en la esquina noroeste de Santa Capilla, hasta llegar a la quebrada Agua Salud» | documentada | [6] |

**No se pudo documentar:**

- Si el «Camino de Catia» de 1845 y el «Viejo Camino del Oeste» son la misma vía: la fuente usa los dos nombres sin aclararlo.
- Su ancho.
- Cómo lo dibujan los planos de 1889 y 1911: no se leyeron.

### Camino de La Vega (camino de Antímano, Carretera de Occidente)

`camino:la-vega` · camino · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

Lo continúa la avenida San Martín, más abajo.

**Nombres:** «Camino de la Vega» (¿?–¿?) [3] [7].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1810 | Levantamiento | Antiguo «Camino de Antímano», que el plano de 1810 llama «Camino de la Vega» | «Realizada sobre parte del trazado de lo que fue el antiguo “Camino de Antímano” (señalado también como “Camino de la Vega” en el plano de 1810, una de las puertas de entrada a Caracas)» | documentada | [7] |
| 1863 | Apertura | En 1863 ya funcionaba el tramo de Caracas a Los Teques de la Carretera de Occidente | «En 1863 ya estaba en funcionamiento el tramo de Caracas a Los Teques, de la que fuera llamada “Carretera de Occidente”, construida por Augusto Pecherman» (p. 15) | documentada | [1] |

**No se pudo documentar:**

- Fecha de la carretera de carruajes en el tramo urbano: la fuente solo fecha el tramo a Los Teques.
- Su ancho.
- Cómo lo dibujan los planos de 1889 y 1911: no se leyeron.

### Camino de El Valle

`camino:el-valle` · camino · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1772 | Levantamiento | El plano de 1772 lo dibuja con doble trazo hacia la ribera del Guaire | Trazo L1772-0084 del original | documentada | [8] |
| 1843 | Levantamiento | En 1843 había una alcabala del Valle y una calle que llevaba su nombre | «Alcabala del Valle» (letra w); calle 136, «de la alcabª del Valle» | documentada | [3] |

**No se pudo documentar:**

- Ninguna fuente escrita leída lo describe.
- Fecha de una carretera de carruajes a El Valle.
- Por dónde cruzaba el Guaire en 1772: el eje llega a la ribera y el plano no define un puente.
- Cómo lo dibujan los planos de 1889 y 1911: no se leyeron.

### Camino de Sabana Grande (Camino Real de Petare, Carretera del Este)

`camino:sabana-grande` · camino · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

El tramo de la hoja y lo que queda fuera de ella están en el diagnóstico de #279.

**Nombres:** «Camino de Sabana Grande» (¿?–¿?) [3].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1875 | Apertura | La Carretera del Este, de Caracas a Petare, se inaugura en mayo de 1875 | «La llamada “Carretera del Este”, que partía de Caracas a Petare… fue inaugurada también por Guzmán Blanco en mayo de 1875» (p. 16) | documentada | [1] |

**Contradicción pendiente — Fecha de la Carretera del Este:**

- Guzmán Blanco la inaugura en mayo de 1875 [1]
- Ya llevaba del centro a Petare en el plano de Röhl de 1934 [9]
- El gobernador Gonzalo Barrios la inaugura oficialmente el 12 de marzo de 1947 [10]

**No se pudo documentar:**

- No figura en el plano de 1772.
- Su ancho.
- Cómo lo dibujan los planos de 1889 y 1911: no se leyeron.

## Alcabalas y puertas

### Alcabala de Candelaria

`alcabala:candelaria` · alcabala · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1843 | Levantamiento | La leyenda de 1843 la enumera, y una calle lleva su nombre | «id. de Candelaria» (letra x); calle 45, «de alcabala de la Candelarª» | documentada | [3] |
| Sin fecha | Levantamiento | Una crónica la llama también Alcabala del Este | «Históricamente se le conoció como la Alcabala de La Candaria [sic] o Alcabala del Este» | dudosa | [11] |

**No se pudo documentar:**

- Fecha de instalación y de cierre.
- El solar: ningún plano leído dibuja el edificio.
- Si la esquina «Alcabala» de 1936 es el mismo lugar que la alcabala de 1843: la letra x cae unos 55 m al este de esa esquina, con un calce de 18 m de error; es una inferencia por nombre y cercanía.

### Alcabala del Valle

`alcabala:el-valle` · alcabala · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1843 | Levantamiento | La leyenda de 1843 la enumera, y una calle lleva su nombre | «Alcabala del Valle» (letra w); calle 136, «de la alcabª del Valle» | documentada | [3] |

**No se pudo documentar:**

- Fecha de instalación y de cierre.
- El solar.
- Si la esquina «Alcabala Vieja» de 1936 es el mismo lugar: el extremo norte del camino del Valle de 1772 queda unos 165 m al sur de esa esquina.

### Esquina de Alcabala (camino de La Vega)

`alcabala:la-vega` · alcabala · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1911 | Levantamiento | El plano de 1911 rotula «Alcabala Palo Grande» la manzana vecina | «ALCABALA PALO GRANDE» | documentada | [12] |
| 1936 | Levantamiento | El plano de 1936 rotula «Alcabala» la esquina donde empieza el rótulo «Avenida San Martín» | «Alcabala», con la cota 885,739 | documentada | [5] |
| 1954 | Reforma | La ampliación de 1954 de la avenida San Martín va «de Angelitos a Alcabala» | «concluye la construcción del tramo de la Avenida San Martín comprendido entre las esquinas Angelitos a Alcabala, unos 1.232 metros de longitud» | documentada | [13] |

**No se pudo documentar:**

- Toda su historia: ninguna fuente leída dice cuándo hubo ahí una alcabala; la leyenda de 1843 no la enumera.
- El plano de 1911 se leyó solo en este punto.
- El solar.

### Puerta de La Guaira

`alcabala:puerta-la-guaira` · puerta · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1843 | Levantamiento | La leyenda de 1843 la enumera | «Puerta de La Guaira» (letra v) | documentada | [3] |

**No se pudo documentar:**

- Su posición.
- Si es la alcabala que el plano de 1772 dibuja en el camino de La Guaira.
- Fechas.

## Avenidas del oeste

### Avenida Sucre (Catia)

`avenida:sucre` · avenida · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

El tercer tramo, de 1952, está en el catálogo de vías posteriores a 1946 (`moderno:sucre-tercer-tramo-1952`): su ancho de 26 m y sus 314 demoliciones no valen para 1936 ni 1946.

**Nombres:** «Avenida Sucre» (1922–hoy) [6].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1922 | Nombre | El «Viejo Camino del Oeste» se llama avenida Sucre desde 1922 | «ya el “Viejo Camino del Oeste” era conocido como avenida Sucre desde 1922» | documentada | [6] |
| 1924 | Reforma | En enero de 1924 el gobernador da cuenta de mejoras y de 22 focos más de alumbrado, no de un ensanche | «ordené a la compañía respectiva que se hicieran instalaciones para veintidós focos más, los cuales fueron distribuidos del puente de Catia a las jabonerías» | documentada | [6] |
| 1952 | Reforma | El tercer tramo se inaugura el 23 de noviembre de 1952: 26 m de ancho y 314 casas demolidas en todo o en parte | «Tiene 3.234 metros de longitud y está comprendida entre la Plaza de Catia y la Plazoleta de las Tinajitas con un ancho de 26 Ms.» | documentada | [6] |
| 1954 | Reforma | Se cierra en 1954 con el viaducto Nueva República, que sustituye al puente de Pagüita | «concluyéndose el tercero en 1952 y cerrándose finalmente con la construcción en 1954 del viaducto Nueva República que sustituyó al antiguo puente de Pagüita» | documentada | [6] [14] |

**No se pudo documentar:**

- El ensanche de 1924 que nombra el issue: la fuente leída solo habla de alumbrado y mejoras ese año.
- Fechas de los tramos primero y segundo.
- El ancho anterior a 1952: ningún documento lo da.
- El nombre anterior a 1922 por tramo.

### Avenida San Martín

`avenida:san-martin` · avenida · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

La ampliación de 1954 está en el catálogo de vías posteriores a 1946 (`moderno:san-martin-ampliacion-1954`): 30 m de fachada a fachada. Antes de eso la avenida existía, más angosta.

**Nombres:** «Sur 8» (1897–hoy) [7]; «Avenida San Martín» (1922–hoy) [7].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1897 | Nombre | Desde el plano de 1897 la vía figura como «Sur 8» | «desde el plano de 1897 se detecta el término “Sur 8” como denominación de la vía» | documentada | [7] |
| 1922 | Nombre | Se llama San Martín desde 1922 | «así denominada desde 1922 en honor al general y prócer argentino José de San Martín» | documentada | [7] |
| Sin fecha | Levantamiento | El tramo antiguo iba de la esquina de Angelitos a Palo Grande, donde remataba en la Plaza Italia | «desde la esquina de Angelitos en la parroquia San Juan hasta el sector Palo Grande donde remataba en una plaza (la plaza de Italia que toma ese nombre en 1911…)» | documentada | [7] |
| 1922 | Levantamiento | Desde 1922 la estatua ecuestre de Sucre está en el cruce con la avenida 19 de Diciembre | «el cruce con la 19 de diciembre (donde se ubica desde 1922 la estatua ecuestre de Antonio José de Sucre realizada por el escultor venezolano Lorenzo González)» | documentada | [7] |
| 1924 | Levantamiento | La estatua de San Martín estuvo desde 1924 en el eje de la avenida | «inicialmente estuvo ubicada desde 1924 en el eje de la avenida. La plaza, realizada en 1955 al concluirse la ampliación de la vía» | documentada | [7] |
| 1954 | Reforma | En 1954 se amplía a 30 m de fachada a fachada y se reducen las plazas Capuchinos e Italia | «El ancho de la nueva vía tiene 30 metros de fachada a fachada, la calzada de 18 metros de ancho y el ancho de las aceras 5,90 metros.» | documentada | [13] [7] |

**Contradicción pendiente — Extensión de la obra de 1954:**

- De la esquina de Angelitos a la de Alcabala, 1.232 m [13]
- Entre El Silencio y Palo Grande [7]

**No se pudo documentar:**

- El ancho anterior a 1954: ningún documento lo da y no se midió sobre el plano.
- Cuántas casas se demolieron en 1954 y cuáles.
- Hasta dónde llegaba el nombre «Avenida San Martín» hacia el este en 1936: el plano rotula «Sur Ocho» el tramo de Capuchinos a la Plaza Italia.
- Cómo rotula el plano de 1946 ese mismo tramo: no se lee en el plano reducido.

### Nueva Caracas, avenida España y Plaza Pérez Bonalde

`avenida:nueva-caracas` · urbanización · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «Nueva Caracas» (1928–hoy) [6].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1928 | Obra | El Banco Obrero la construye en 1928: unas 58 manzanas trazadas por Oscar Ochoa, con la avenida España como eje norte–sur entre las dos plazas | «la construcción en 1928 como parte del plan de viviendas del recién creado Banco Obrero de una nueva urbanización que se denominó “Nueva Caracas”, organizada con base a una retícula de aproximadamente 58 manzanas rectangulares y cuadradas diseñada por el ingeniero Oscar Ochoa, que contaba con la avenida España (hoy Bulevar de Catia) como eje principal norte-sur que uniría la plaza Sucre con la Pérez Bonalde» | documentada | [6] |

**No se pudo documentar:**

- Fecha de la Plaza Pérez Bonalde.
- Avance de la construcción manzana por manzana entre 1928 y 1946.
- Ancho de la avenida España.

### Plaza de Catia (hoy Plaza Sucre)

`avenida:plaza-catia` · plaza · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «General Juan Crisóstomo Gómez» (1928–1935) [6]; «Agustín Codazzi» (1935–1941) [6]; «Plaza La Libertad» (¿?–¿?) [5]; «Plaza Sucre» (1941–hoy) [6].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1928 | Apertura | Se crea en noviembre de 1928 con el nombre de Juan Crisóstomo Gómez | «plaza “General Juan Crisóstomo Gómez” bautizada así en noviembre 1928 cuando fue creada, pasando luego a llamarse “Agustín Codazzi” a la muerte de Juan Vicente Gómez en 1935, para finalmente denominarse plaza “Sucre” en 1941» | documentada | [6] |
| 1936 | Nombre | El plano de 1936 la rotula «Plaza La Libertad» | «Plaza La Libertad» | documentada | [5] |
| 1941 | Nombre | Se llama Plaza Sucre desde 1941 | «para finalmente denominarse plaza “Sucre” en 1941» | documentada | [6] |
| 1951 | Reforma | La estatua ecuestre de Sucre la preside después de 1951 | «pasando después de 1951 a ser presidida por una estatua ecuestre del Mariscal de Ayacucho realizada por el escultor Lorenzo González en 1922» | documentada | [6] |

**Contradicción pendiente — Nombre de la plaza en 1936:**

- Se llama «Agustín Codazzi» desde la muerte de Gómez, en 1935, hasta 1941 [6]
- El plano fotografiado en marzo de 1936 la rotula «Plaza La Libertad» [5]

**No se pudo documentar:**

- Fecha exacta en que la estatua de Sucre llega a la plaza: la fuente dice «después de 1951».
- Si la estatua vino de la avenida San Martín: las dos fuentes hablan de una ecuestre de Lorenzo González de 1922, y que sea un traslado es una inferencia.
- Cómo rotula la plaza el plano de 1946: no se lee en el plano reducido.
- Qué había en el centro de la plaza en 1936 y 1946.

## Fuentes

| N.º | Clase | Documento | Enlace |
|---:|---|---|---|
| 1 | secundaria con referencias | sin fecha; consultada el 2026-11-28 | <https://acading.org.ve/wp-content/uploads/2023/02/LIBRO_INFRAESTRUCTURA_PET_Y_COMUNICACIONES_SIGLO_XIX_y_XX_ALFREDO_CILENTO.pdf> |
| 2 | secundaria con referencias | 2008 | <https://biblat.unam.mx/hevila/BoletindelaAcademiaNacionaldelaHistoriaCaracas/2008/vol91/no363/3.pdf> |
| 3 | plano de época | sin fecha; consultada el ¿? | <https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas_(NYPL_b13925947-5382478).tiff> |
| 4 | secundaria con referencias | sin fecha; consultada el 2026-11-28 | <https://bibliofep.fundacionempresaspolar.org/media/1056/gv_t7_c57_p302_415_vargas_lres_single_preview.pdf> |
| 5 | plano de época | 1936 | <https://archive.org/details/WCWdb_18053> |
| 6 | secundaria con referencias | 2020 | <https://fundaayc.com/2020/07/26/sabia-usted-46/> |
| 7 | secundaria con referencias | 2022 | <https://fundaayc.com/2022/10/23/sabia-usted-93/> |
| 8 | plano de época | 1772 | <https://pares.cultura.gob.es/ParesBusquedas20/catalogo/description/26112> |
| 9 | secundaria con referencias | 2020 | <https://fundaayc.com/2020/09/20/sabia-usted-50/> |
| 10 | secundaria con referencias | 2020 | <https://fundaayc.com/2020/11/15/sabia-usted-54/> |
| 11 | crónica sin referencias | sin fecha; consultada el 2026-11-28 | <https://www.soydonrefran.com/esquina-de-alcabala/> |
| 12 | plano de época | 1911 | <https://maps.princeton.edu/catalog/princeton-05741v14j> |
| 13 | secundaria sin referencias | 2019 | <https://fundaayc.com/2019/10/01/1954-avenida-san-martin/> |
| 14 | secundaria con referencias | 2025 | <https://fundaayc.com/2025/01/19/sabia-usted-128/> |
