# Ferrocarriles y tranvías: ficha de evidencias

Avance de [#273](https://github.com/grunch/caracas/issues/273) (ferrocarriles: estaciones, patios y trazados) y de
[#274](https://github.com/grunch/caracas/issues/274) (tranvías). Es documentación: **no se agrega ningún riel,
estación, marca ni geometría**, y los datos publicados no cambian.

Los datos viven en [`evidencias/rieles.json`](evidencias/rieles.json), con la ficha de evidencias del registro vial
([`red-vial-temporal.md`](red-vial-temporal.md)): una fuente por afirmación, fecha del documento aparte de la del
hecho, certeza, contradicciones sin resolver y lo que no se pudo documentar. Las tablas que siguen a la marca de
abajo se generan desde ahí; `tests/unit/rieles.test.js` comprueba que no se desfasen.

## Qué se hizo y cómo

- **Planos.** Se leyeron recortes con rejilla de los planos de 1889 (Mestre), 1911 (Razetti), 1936 (DCN) y 1946
  (DCN, reducido a 2 m por píxel) en las tres estaciones, en Catia y en Sabana Grande, y una vista de conjunto del
  plano de 1911 para los tranvías. **No se recorrió ningún plano entero ni se digitalizó ninguna vía.**
- **Fuentes escritas.** Allen Morrison (tranvías de Caracas y ferrocarril La Guaira–Caracas), el *Diccionario de
  Historia de Venezuela* de la Fundación Empresas Polar, Cilento y dos entradas de la Fundación Arquitectura y
  Ciudad; Wikipedia solo para la fecha de 1894, marcada como dudosa. Las leyó un subagente, que devolvió citas
  textuales. El enlace del issue a `tramz.com/ve/cs/css.html` no es una página de ferrocarriles: es la versión en
  español de la de tranvías; la del ferrocarril de La Guaira es `ve/lc/lcs.html`.
- Las posiciones entre paréntesis son píxeles del mosaico de 1936, leídos a ojo. Para 1889 y 1911 llevan además el
  error de su calce (p90 de 12,93 m y 12,04 m). **No son un calce de las vías** y no alcanzan para una huella.

## Hallazgos

1. **Tres estaciones distintas, con rótulo propio en cada plano.** La del ferrocarril de La Guaira es «Estación»
   en 1889, «Estación Caracas» en 1911 y «Estación del F.C. de La Guaira» en 1936. La del Central es «Estación» en
   1889, «Estación del F.C.» en 1911 y «Estación del F.C. Central» en 1936. Palo Grande aparece en 1911 («G.F.V.»,
   «Estación Palo Grande»). Ningún plano escribe «Caño Amarillo» sobre la estación.
2. **El Gran Ferrocarril no existe en 1889.** Su primer tramo abre en 1890. La marca `palo-grande` ya nace en 1911,
   que es correcto. El comentario de `tools/geo/estilos.py` lo fecha en 1894: esa es la línea completa a Valencia
   (30-12-1893 según Cilento, febrero de 1894 según Wikipedia).
3. **En 1889 el tranvía es de caballos.** El plano de Mestre dibuja una línea de trazos desde la estación del
   ferrocarril de La Guaira hacia el este, por el Viaducto Unión: coincide con el Tranvía Bolívar de 1885. No
   corresponde catenaria.
4. **En 1911 el tranvía eléctrico llega a las tres estaciones.** Razetti dibuja las líneas en rojo; Morrison
   fecha la electrificación de «todas las líneas hasta las estaciones» en febrero de 1908.
5. **En 1936 el plano base dibuja los tranvías con puntos rojos, y el pipeline los borra como rótulo.** Esos puntos
   son la fuente para los rieles de 1936; hoy se descartan en `tools/geo/rotulos.py`.
6. **La red de 1946 no se borra.** El sistema cierra el 13 de agosto de 1947; para 1946 ya no corrían las líneas
   de Catia (trolebuses desde 1938) ni de El Paraíso (1941). El plano reducido no deja ver la red.
7. **El Ferrocarril Central en 1946 queda sin resolver.** Sobre su traza de 1936 en Sabana Grande, el plano de 1946
   rotula «Calle La Línea» y todavía dibuja una línea. Morrison dice que levantó los rieles en 1953; FAC, que dejó
   de funcionar hacia 1947. Contradicción pendiente.
8. **El «inicio 1881/1882» del issue se resuelve con Morrison**: 1881 es la formación de la compañía Tranvía
   Caracas y 1882 el inicio del servicio, y él mismo advierte que la fecha es incierta.

## Qué hay implementado

- Tres marcas con ficha: `cano-amarillo` (desde 1889), `palo-grande` (desde 1911) y `fc-central` (desde 1889), sin
  `muere`. Las tres caen dentro de la zona leída en este catálogo y sus épocas coinciden con él.
- Galpones genéricos junto a los patios de Caño Amarillo y Palo Grande (`tools/geo/estilos.py`); el patio del
  Ferrocarril Central no tiene zona.
- Ningún hito de estación, ninguna vía, ningún riel de tranvía. `src/manejar.js` excluye el tranvía a propósito.

## Correcciones listas para código

1. `tools/geo/estilos.py`: el rótulo «Gran Ferrocarril de Venezuela, 1894» pasa a 1890 (primer tramo) y se agrega la
   zona de patio del Ferrocarril Central, que el plano de 1936 dibuja entre (13150, 7580) y (13900, 7800). Cambia
   datos generados: pide regenerar y publicar.
2. Marcas: la de Caño Amarillo puede llevar por época el rótulo del plano («Estación Caracas» en 1911), y las tres,
   un campo `dudas` con lo que este documento deja abierto.
3. Rieles de tranvía de 1936: digitalizar las líneas de puntos del plano base antes de que `rotulos.py` las borre.
4. Vías de 1889, 1911 y 1936: digitalizar los trazos ajedrezados y de trazos de cada plano como una capa propia.

Ninguna se hace en este PR: las cuatro tocan el pipeline o el visor y piden capturas, medición y, la primera,
regenerar datos.

## Lo que no se modela

Los tres edificios de estación quedan sin modelo: **no hay estudio en Miraflores** ni fuente para sus volúmenes
(los planos dan galpones en planta, sin alturas ni fachadas). Tampoco postes ni catenaria: ninguna fuente dice en
qué calles los había.

## Estado de los criterios

| Criterio | #273 | #274 |
|---|---|---|
| Ficha de evidencias por etapa | Hecha para las tres líneas en 1889, 1911, 1936 y 1946; El Valle, solo fuentes escritas | Hecha: animal en 1889, eléctrico en 1911, 1936 y 1946 |
| Huella georreferenciada | No: cajas de lectura, sin vías ni solares | No: ninguna línea digitalizada |
| Variantes por época | Presencia y nombre por plano, en el catálogo; el visor no cambia | Animal y eléctrico separados, en el catálogo; el visor no cambia |
| Referencias visuales | Ninguna imagen con licencia: las de Morrison son «all rights reserved» | Igual; la de `fuentes/imagenes` sigue «a verificar» |
| Pruebas y capturas | Tests del catálogo; nada que capturar | Igual |
| Reglas de construcción y rendimiento | No aplica: sin geometría | No aplica |
| Dudas abiertas | Escritas por línea, abajo | Escritas por sistema, abajo |

## Referencias visuales

No se incorpora ninguna imagen. Las páginas de Allen Morrison dicen «Copyright © 2007-2107 Allen Morrison ALL RIGHTS
RESERVED» y anotan la procedencia de cada foto (su colección, postales, Revista Técnica del MOP de 1911, folletos
del ferrocarril de 1932 y 1933); las de FAC dan la colección y no la licencia. Quedan como enlaces de consulta.

<!-- catálogo: lo que sigue se genera con `node tools/catalogo-evidencias.mjs`; no editar a mano -->

## Lo que deja leer el plano de cada corte

«Sin lectura» es que nadie leyó ese plano para ese elemento: no es una ausencia. La certeza va entre paréntesis.

| Elemento | 1772 | 1843 | 1889 | 1911 | 1936 | 1946 |
|---|---|---|---|---|---|---|
| Ferrocarril La Guaira–Caracas y su estación (Caño Amarillo) | Sin lectura | Sin lectura | **Existe** (documentada). «Ferrocarril La Guaira a Caracas». Rótulo de la línea y «Estación». Vía en trazo ajedrezado que sube desde el sur por (6800, 6900) y entra entre dos galpones largos (6880–7000, 6200–6540), con edificio de cabecera hacia la plaza de «Santa Inez». | **Existe** (documentada). «Estación Caracas». Dos galpones largos en rojo (7000–7150, 6150–6600) con la vía entre ellos; «Sta. Inés» al sur. Una línea roja de tranvía llega a la estación desde el este. | **Existe** (documentada). «Estación del F.C. de La Guaira». Haz de vías entre galpones (6900–7100, 6000–6550), «Plaza Sta. Inez» al sur y un segundo haz de vías al este (7180, 6000–6500). En Catia la vía baja junto al rótulo «Carretera Caracas–La Guaira», por (2450, 4000), (3000, 5100) y (4000, 5580). | **Existe** (dudosa). «Estaciones». El rótulo parece decir «ESTACIONES», en plural, sobre el mismo patio; las vías siguen dibujadas ahí y en Catia. Leído sobre el plano reducido a 2 m por píxel. La lectura del rótulo es dudosa. |
| Ferrocarril Central y su estación (Santa Rosa) | Sin lectura | Sin lectura | **Existe** (documentada). «Estación». Rótulo «Estación» en (13450, 7630), un edificio en rosa (13500–13650, 7700–7820) y la vía en trazo ajedrezado que sale hacia el este desde (13660, 7760). Alrededor, calles en línea de puntos, sin abrir. | **Existe** (documentada). «Estación del F.C.». Dos edificios en rojo (13380–13480, 7700–7740 y 13530–13680, 7750–7800) sobre la calle que el plano llama «Santa Rosa». Una línea roja de tranvía llega desde el oeste hasta la estación. | **Existe** (documentada). «Estación del F.C. Central». Abanico de vías entre (13150, 7580) y (13900, 7800), que sale hacia el este; esquina «Sta. Rosa» en (13720, 7880). En Sabana Grande la vía cruza la hoja como línea de trazos, de (16400, 8560) al borde del dibujo en (18280, 9080). | **No se sabe** (dudosa). En la estación se ven trazos de vía y un rótulo que no se lee. En Sabana Grande, sobre la traza de 1936, el plano rotula «Calle La Línea» y sigue dibujando una línea de trazos. Leído sobre el plano reducido a 2 m por píxel. No alcanza para decir si había servicio. |
| Gran Ferrocarril de Venezuela y la estación Palo Grande | Sin lectura | Sin lectura | **No está** (inferida). Junto a la estación del ferrocarril de La Guaira el plano no dibuja una segunda vía ni otra estación. Palo Grande queda fuera de la hoja de Mestre. Que no existía sale de la fecha de apertura (1890). | **Existe** (documentada). «Estación Palo Grande». Rótulos «G.F.V.» y «ESTACION PALO GRANDE»; edificios en rojo entre (4500, 8480) y (4800, 8700) y la vía en trazo ajedrezado de oeste a este por (5200, 8540). El tranvía llega en rojo hasta «Est. Palo Gr.» en (5450, 8540). | **Existe** (documentada). «Estación Palo Grande». Patio con haz de vías entre (4400, 8550) y (5000, 8800). La vía sigue al este y dobla al norte por la calle que el plano rotula «Calle Sucre» (6100–6500, 8200–8650), junto a la esquina «Paradero». | **Existe** (documentada). «Est. Palo Grande». El mismo patio, con el rótulo abreviado y el «Deportivo Loyola» al sur. Leído sobre el plano reducido a 2 m por píxel. |
| Ferrocarril del Sur o de El Valle | Sin lectura | Sin lectura | Sin lectura | Sin lectura | Sin lectura | Sin lectura |
| Tranvías de caballos (Tranvía Caracas y Tranvía Bolívar) | Sin lectura | Sin lectura | **Existe** (inferida). Una línea de trazos, roja y negra, sale de la «Estación» del ferrocarril de La Guaira en (6960, 6560) y va al este por el «Viaducto Unión». Coincide con la línea del Tranvía Bolívar de 1885; que ese trazo sea el tranvía es una inferencia: la leyenda del plano no está transcrita. | Sin lectura | Sin lectura | Sin lectura |
| Tranvías eléctricos | Sin lectura | Sin lectura | **No está** (inferida). El plano no puede dibujar tranvías eléctricos: el primer servicio es de 1907. La línea que dibuja junto a la estación es de caballos. | **Existe** (documentada). Líneas rojas continuas sobre las calles. En una vista de conjunto se siguen: el eje «Avenida Oeste»–«Avenida Este» desde la Estación Caracas; una calle norte–sur que cruza el Guaire por el puente de la calle Sur 5 y sigue a El Portachuelo; la «Avenida del Paraíso»; el camino a la «Est. Palo Gr.»; y la llegada a la «Estación del F.C.». No se digitalizó ninguna. | **Existe** (documentada). Líneas de puntos rojos sobre algunas calles: se vieron en Pagüita (7350, 6050–6200) y junto al Museo de Bellas Artes (13100–13250, 7900–8100). El pipeline del sitio las trata como rótulo y las borra (`tools/geo/rotulos.py`). No se recorrió el plano entero. | **Existe** (inferida). En el plano reducido a 2 m por píxel no se distingue la red. Que seguía en servicio sale de la fecha del cierre, el 13 de agosto de 1947; para entonces ya no corrían las líneas de Catia (1938) ni de El Paraíso (1941). |

## Ferrocarriles

### Ferrocarril La Guaira–Caracas y su estación (Caño Amarillo)

`riel:fc-la-guaira` · ferrocarril · ausente en los cortes anteriores a **1883**.

**Nombres:** «Estación Caracas» (¿?–¿?) [5] [3]; «Estación del F.C. de La Guaira» (¿?–¿?) [6] [4].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1883 | Apertura | Abre en 1883, con vía de 914 mm | «que usaba una trocha de 914 mm (36”) y que llegó a la capital en junio de 1883» | documentada | [1] |
| 1883 | Apertura | Inaugurado el 25 de julio de 1883 | «inaugurada por el presidente Guzmán Blanco el 25 de julio de 1883» | documentada | [2] |
| 1883 | Levantamiento | La estación de Caracas estaba en Santa Inés (Caño Amarillo); 36 km de recorrido | «entró finalmente en servicio de carga y pasajeros, el 27 de septiembre de 1883, con un recorrido de 36 Km. desde la estación Caracas en Santa Inés (Caño Amarillo)» (p. 12) | documentada | [3] |
| 1928 | Reforma | Electrificado en 1928 | «El servicio eléctrico en la línea comenzó a operar el 9 abril 1928 y fue oficialmente inaugurado el 1 de mayo.» | documentada | [4] |
| 1951 | Demolición | El gobierno lo compra en 1950; tras las tormentas de 1951 no vuelve a operar | «finalmente comprado por el gobierno de Venezuela en 1950. Varias tormentas causaron daños a la línea en 1951 y el gobierno [...] no reparó la línea. El ferrocarril nunca volvió a operar.» | dudosa | [4] |

**Contradicción pendiente — Fecha de la apertura de 1883:**

- Llega a la capital en junio de 1883 [1]
- Lleva pasajeros desde julio de 1883 [4]
- Guzmán Blanco lo inaugura el 25 de julio de 1883 [2]
- Entra en servicio de carga y pasajeros el 27 de septiembre de 1883 [3]

**Contradicción pendiente — Cuándo deja de funcionar:**

- Tormentas de 1951 dañan la línea y no vuelve a operar [4]
- «La misma suerte correría el Ferrocarril Caracas-La Guaira en 1952» [7]

**No se pudo documentar:**

- Planta de la estación, andenes y talleres: los planos dibujan galpones, no su distribución.
- Cuándo se levantan los rieles.
- El nombre «Caño Amarillo» para la estación: Morrison no lo usa; Cilento dice «estación Caracas en Santa Inés (Caño Amarillo)».
- Cruces a nivel en Catia.

### Ferrocarril Central y su estación (Santa Rosa)

`riel:fc-central` · ferrocarril · ausente en los cortes anteriores a **1886**.

**Nombres:** «Estación del F.C. Central» (¿?–¿?) [6].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1886 | Apertura | Abre en septiembre de 1886 de la estación Santa Rosa a Petare: 10 km, a vapor | «El Ferrocarril Central inauguró una línea a vapor de 10 km de longitud entre la estación Santa Rosa y Petare en septiembre de 1886» | documentada | [1] |
| 1886 | Apertura | El primer tramo se inaugura el 4 de septiembre de 1886 | «El primer tramo, de Caracas a Petare, fue inaugurado… el 4 de septiembre de 1886» (p. 14) | documentada | [3] |
| 1907 | Reforma | Servicio de tranvías eléctricos entre Santa Rosa y Petare desde el 16 de enero de 1907 | «El Ferrocarril Central inauguró el servicio de tranvías eléctricos entre Santa Rosa y Petare el día siguiente, el 16 de enero de 1907» | documentada | [1] |
| 1933 | Reforma | En 1933 se quita la electrificación más allá de Sabana Grande y se abandona el ramal a Los Chorros | «la línea fue des-electrificada más allá de Sabana Grande en 1933. El ramal a Los Chorros fue abandonado completamente» | documentada | [1] |
| 1937 | Reforma | El gobierno lo expropia en 1937 | «en 1937, el Gobierno nacional procedió a la expropiación del Ferrocarril Central de Venezuela (Caracas-Santa Lucía)» | documentada | [2] |
| 1953 | Demolición | Levanta sus rieles en 1953 | «El Ferrocarril Central levantó sus rieles en 1953» | dudosa | [1] |

**Contradicción pendiente — Cuándo deja de funcionar:**

- Levanta sus rieles en 1953 [1]
- Dejó de funcionar hacia 1947, con los tranvías [7]

**No se pudo documentar:**

- Fechas de los tramos más allá de Petare.
- Planta de la estación y de su patio.
- Si en 1946 corrían trenes por Sabana Grande: el plano de 1946 rotula «Calle La Línea» sobre la traza y todavía dibuja una línea.
- Si la estación se llamó alguna vez «Quebrada Honda»: solo lo dice una fuente divulgativa que no se usa acá.
- Cómo rotula la estación el plano de 1946: no se lee en el plano reducido.

### Gran Ferrocarril de Venezuela y la estación Palo Grande

`riel:gran-ferrocarril` · ferrocarril · ausente en los cortes anteriores a **1890**.

No existe en 1889: su primer tramo abre en 1890. `tools/geo/estilos.py` lo fecha en 1894, que es la línea completa a Valencia.

**Nombres:** «Estación Palo Grande» (¿?–¿?) [5] [6].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1890 | Apertura | El primer tramo abre en 1890 | «el Gran Ferrocarril de Venezuela abrió el primer segmento de su ferrocarril a Valencia en 1890» | documentada | [1] |
| 1890 | Apertura | Llega a Las Adjuntas en febrero de 1890 y a Valencia el 30 de diciembre de 1893 | «a la estación de Las Adjuntas en febrero de 1890… y el 30 de diciembre del mismo año [1893] a la estación de San Blas en Valencia» (p. 15) | documentada | [3] |
| Sin fecha | Levantamiento | Salía de la estación Caracas en Caño Amarillo, pasaba el túnel de El Calvario y seguía a Palo Grande y Antímano | «partía de la estación Caracas en Caño Amarillo, pasaba por el túnel de El Calvario… hasta la estación Palo Grande y de allí hacia Antímano» (p. 15) | documentada | [3] |
| 1894 | Apertura | Línea completa en febrero de 1894 | «The railway was completed in February 1894.» | dudosa | [8] |
| 1943 | Reforma | El gobierno lo expropia en 1943 | «en 1943, a la del Gran Ferrocarril de Venezuela (Caracas-Valencia)» | documentada | [2] |
| 1966 | Demolición | Deja de correr trenes a Valencia en 1966 | «el Gran Ferrocarril de Venezuela dejó de correr trenes a Valencia en 1966» | documentada | [1] |

**Contradicción pendiente — Cuándo queda completa la línea a Valencia:**

- Llega a Valencia el 30 de diciembre de 1893 [3]
- Se completa en febrero de 1894 [8]
- Inauguración el 1 de febrero de 1894 [9]

**No se pudo documentar:**

- Desde cuándo es Palo Grande su estación de Caracas.
- Planta de la estación, talleres y patio de maniobras: los planos dibujan galpones y el haz de vías, no su distribución.
- El túnel de El Calvario y la vía entre Caño Amarillo y Palo Grande: no se digitalizó.
- Estado en 1946 más allá del rótulo: el servicio a Valencia sigue hasta 1966.

### Ferrocarril del Sur o de El Valle

`riel:fc-el-valle` · ferrocarril · ausente en los cortes anteriores a **1883**.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1883 | Apertura | Abre en 1883 entre Las Flores y El Valle: 5 km a vapor, vía de 680 mm | «Tres meses después, el Ferrocarril del Sur (también conocido como Ferrocarril del Valle) abrió una línea a vapor de 5 km de longitud, de trocha 680 mm (26,8”), entre Las Flores y El Valle» | documentada | [1] |
| 1883 | Levantamiento | Las Flores es la de Puente Hierro | «El Ferrocarril del Sur… abrió, en 1883 una línea a vapor de 5 km… entre Los Flores de Puente Hierro y El Valle» (p. 62) | documentada | [3] |
| 1907 | Reforma | En 1907 pasa a ser la primera línea de tranvía eléctrico; un tercer riel deja seguir el vapor durante la obra | «agregó un tercer riel a la línea de El Valle, de modo que la operación a vapor pudiera continuar durante la reconstrucción» | documentada | [1] |

**No se pudo documentar:**

- Su traza y su estación de Las Flores: ningún plano se leyó para esta línea.
- Cuándo deja de correr a vapor.

## Tranvías

### Tranvías de caballos (Tranvía Caracas y Tranvía Bolívar)

`riel:tranvia-animal` · tranvía de tracción animal · ausente en los cortes anteriores a **1882**.

Sin catenaria ni postes: en 1889 no hay electricidad en la red.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1881 | Proyecto | La compañía Tranvía Caracas se forma en 1881 | «La fecha de su inauguración es incierta, pero la mayoría de los historiadores concuerdan en que el Tranvía Caracas fue formado como una compañía en 1881 y que comenzó a transportar pasajeros entre la Plaza Bolívar y Palo Grande en 1882» | documentada | [1] |
| 1882 | Apertura | El servicio empieza en 1882, de la Plaza Bolívar a Palo Grande; después llega al Puente de Hierro | «El TC extendió su línea hasta el Puente de Hierro un poco después.» | documentada | [1] |
| 1885 | Apertura | El Tranvía Bolívar une en 1885 la Plaza Bolívar con la estación del ferrocarril de La Guaira, y en 1886 llega a la del Ferrocarril Central | «comenzó a operar entre la Plaza Bolívar y la estación del Ferrocarril La Guaira y Caracas en 1885. El TB extendió sus vías hacia el oriente, hasta la estación del Ferrocarril Central, en 1886.» | documentada | [1] |
| 1891 | Levantamiento | Vía de 750 mm; 31 tranvías en 1891 | «Treinta y un tranvías corrían sobre las calles de Caracas en 1891.» | documentada | [1] |

**No se pudo documentar:**

- Las calles de cada línea: la fuente da solo los extremos.
- Cocheras y establos.
- Cómo dibuja el plano de 1889 el resto de la red: solo se leyó el tramo de la estación.

### Tranvías eléctricos

`riel:tranvia-electrico` · tranvía eléctrico · ausente en los cortes anteriores a **1907**.

No existe en 1889. En 1911 la red eléctrica ya llega a las tres estaciones. La red de 1946 sigue en servicio, sin las líneas de Catia y El Paraíso.

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1906 | Proyecto | Pruebas en octubre de 1906 | «comenzó a probar sus carros Stephenson en el mes de octubre de 1906 e inauguró el primer sistema de tranvías eléctricos de la ciudad, entre Las Flores y El Valle, el 15 de enero de 1907» | documentada | [1] |
| 1907 | Apertura | Primer servicio eléctrico el 15 de enero de 1907, de Las Flores a El Valle | «inauguró el primer sistema de tranvías eléctricos de la ciudad, entre Las Flores y El Valle, el 15 de enero de 1907» | documentada | [1] |
| 1908 | Reforma | En febrero de 1908 la línea de El Valle llega a la Plaza Bolívar por el Puente de Hierro y están electrificadas las líneas a las estaciones | «Hacia febrero de 1908, TEC había extendido la línea El Valle a través del Puente de Hierro hasta la Plaza Bolívar y había electrificado todas las líneas hasta las estaciones ferroviarias» | documentada | [1] [10] |
| Sin fecha | Levantamiento | Oficinas y cobertizos en el costado norte de la avenida Este, esquina con la avenida Vollmer | «TEC construyó su edificio de oficinas y los cobertizos para los carros en el costado norte de la Av. Este esquina Av. Vollmer» | documentada | [1] |
| 1917 | Obra | Túnel de vía simple bajo la Roca Tarpeya en 1917, para El Valle y Cementerio | «También en 1917 [...] construyó un túnel de vía simple bajo el cerro llamado Roca Tarpeya para sus líneas El Valle y Cementerio» | documentada | [1] |
| 1923 | Apertura | Línea a Catia en 1923 | «En 1923, TEC construyó una nueva línea [...] llamado Catia» | documentada | [1] |
| 1938 | Reforma | En 1938 los trolebuses reemplazan a los tranvías de Catia; después hay trolebuses a San Juan y San Agustín | «TEC construyó un trolebús experimental en 1937 [...] diez más en 1938 [...] reemplazaron a los tranvías de la línea Catia, y TEC después construyó dos líneas de trolebuses más, a San Juan y a San Agustín.» | documentada | [1] |
| 1941 | Demolición | Último viaje a El Paraíso el 2 de septiembre de 1941 | «hizo su último viaje a El Paraíso el 2 de septiembre de 1941» | documentada | [1] |
| 1947 | Demolición | El sistema cierra el 13 de agosto de 1947 | «El sistema de tranvías cerró completamente el miércoles 13 de agosto de 1947.» | documentada | [1] |

**Contradicción pendiente — Desde cuándo hay tranvías:**

- Tracción animal desde 1882 y eléctrica desde el 15 de enero de 1907 [1]
- «los tranvías de la capital operativos desde 1908» [7]

**No se pudo documentar:**

- La lista de líneas con sus calles: la fuente nombra destinos (El Valle, Cementerio, El Paraíso, Catia, Parque Carabobo, Sabana Grande, Petare, Los Chorros) y dice que la guía de 1933 muestra once líneas.
- Qué líneas quedaban en 1946 y en el cierre.
- Dónde había catenaria y postes, calle por calle.
- La cochera de la avenida Este con la avenida Vollmer: no se ubicó en ningún plano.
- El plano de Razetti de 1929, que según Morrison dibuja las líneas y el túnel de Roca Tarpeya: no está en el catálogo.

## Fuentes

| N.º | Clase | Documento | Enlace |
|---:|---|---|---|
| 1 | secundaria con referencias | sin fecha; consultada el 2026-11-28 | <https://web.archive.org/web/2025/http://www.tramz.com/ve/cs/css.html> |
| 2 | secundaria con referencias | sin fecha; consultada el 2026-11-28 | <https://bibliofep.fundacionempresaspolar.org/dhv/entradas/f/ferrocarriles/> |
| 3 | secundaria con referencias | sin fecha; consultada el 2026-11-28 | <https://acading.org.ve/wp-content/uploads/2023/02/LIBRO_INFRAESTRUCTURA_PET_Y_COMUNICACIONES_SIGLO_XIX_y_XX_ALFREDO_CILENTO.pdf> |
| 4 | secundaria con referencias | sin fecha; consultada el 2026-11-28 | <https://web.archive.org/web/2025/http://www.tramz.com/ve/lc/lcs.html> |
| 5 | plano de época | 1911 | <https://maps.princeton.edu/catalog/princeton-05741v14j> |
| 6 | plano de época | 1936 | <https://archive.org/details/WCWdb_18053> |
| 7 | secundaria con referencias | 2020 | <https://fundaayc.com/2020/10/page/5/> |
| 8 | terciaria | sin fecha; consultada el 2026-11-28 | <https://en.wikipedia.org/wiki/Great_Venezuela_Railway> |
| 9 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Gran_Ferrocarril_de_Venezuela> |
| 10 | secundaria sin referencias | 2014 | <https://fundaayc.com/2014/11/18/1908-electrificacion-de-la-linea-el-valle-plaza-bolivar/> |
