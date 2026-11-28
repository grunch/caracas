# Vialidad: hechos comprobados, cobertura y trabajo pendiente

Seguimiento de #269, #272, #277 y #278. Revisión del 26-11-2026, main bc51344; vías posteriores
a 1946 y ficha de evidencias, del 28-11-2026.
No es un inventario de geometrías ya implementadas: las tablas separan historia de código.

## Estado real del sistema

- `src/main.js` carga el campo de calles de **1772**. No hay seis redes temporales completas.
- `tools/geo/calles-historicas.json` conserva **11 trazados recuperados** que OSM no basta para reconstruir.
- `tools/geo/calles_nuevas.py` compara 1772/1936; no establece por sí solo las fechas de 1843, 1889, 1911 y 1946.
- Los rótulos actuales de `src/calles.js` se dibujan con opacidad `uHoy.value`. Esa separación **ya existía**.
- La separación de rótulos no prueba que ninguna geometría moderna haya influido en vectorizaciones antiguas.

## Avenidas y autopistas posteriores a 1946 (#277, #278)

El catálogo por segmento y etapa, con una cita y una fuente por afirmación, está en
[`vialidad-posterior-1946.md`](../vialidad-posterior-1946.md) (datos en
`tools/geo/referencias/vialidad-posterior-1946.json`): 31 segmentos en 8 sistemas, con
sus contradicciones sin resolver y lo que no se pudo documentar. Resumen:

| Sistema | Etapas documentadas | Antes de 1946 |
|---|---|---|
| Urdaneta | Plan de 1951; inaugurada el 29-11-1953, 26 m de ancho, 250 demoliciones | Calle Este–Oeste 1 y sus solares; Majestic en #103 |
| Fuerzas Armadas | Inaugurada el 2-12-1956, 2.770 m; recorta 300 fachadas | Calle Norte–Sur 7, sin el ancho moderno |
| Libertador | Obra desde 1957; inaugurada el 13-12-1965 | Ninguna calle documentada sobre su eje |
| Norte–Sur 6 / Baralt | Obra 1951–1953; nombre en 1961; distribuidor sur en 1968 o 1971; prolongación y distribuidor norte en 1973 | La calle existe y remata en Quinta Crespo |
| Andrés Bello | Apertura «definitiva» en 1952; conexión con la Libertador en 1957 | En planes desde 1936; sin fecha por tramo |
| Lecuna | Inaugurada en 1970 | Avenida Este–Oeste 10 |
| Universidad | Obras hacia 1957; **sin año de apertura** | Calles Oeste 4 y Este 4 |
| México | **No es posterior a 1946**: años cuarenta, sin fecha de apertura | — |
| Sucre, San Martín, Nueva Granada, Cota 905, Francisco de Miranda | 1952, 1954, 1950, 1953 y 1954 | San Martín lleva el nombre desde 1922 |
| Autopista del Este | 1953 (primer tramo, extremos en disputa), 1954, 1955, 1956 o 1958 hacia el oeste, 1961 El Pulpo, 1966 o 1968 La Araña, 1970, 1972, 1973 | Nada: vega del Guaire |
| Valle–Coche | 1955; La Bandera el 4-12-1956 | Nada documentado |
| Cota Mil / Boyacá | 1956 (1.300 m), 1962, 1971 (con el nombre Boyacá), 1973 | Nada: ladera del Ávila |
| Caracas–La Guaira | Estudios 1945; inaugurada el 2-12-1953; viaducto nuevo en 2007 | La carretera vieja (1845) es **otra vía** |

No se añadieron épocas posteriores ni un sistema vial actual tridimensional.

### Qué hay implementado y qué lo impide proyectarse

- **Nombres.** Los nombres de las vías de hoy viven solo en la capa Hoy: `datos/calles.bin` no se
  baja hasta prender «lo de hoy» y se dibuja con la opacidad `uHoy` (`src/main.js`, `src/calles.js`).
  Lo prueba `tests/e2e/vialidad-hoy.spec.js`.
- **Marcas y fichas.** Ninguna marca lleva el nombre de una vía del catálogo antes del año en
  que lo recibe (`tests/unit/red-vial-garantia.test.js`, sobre `src/marcas-datos.js` y los hitos).
- **Registro vial.** Las vías posteriores a 1946 salen como ausentes en los seis cortes; el
  registro rechaza una etapa existente, en obra o en proyecto anterior a lo que su cronología
  acredita, y la herramienta se niega a exportar si alguna se cuela.
- **Manzanas.** Las manzanas de 1911, 1936 y 1946 se cortan con la red de calles de hoy, pero un
  tramo solo corta si su eje cae sobre una calle del plano de 1936 (`tools/geo/calles_nuevas.py`).
  Eso se midió, abajo.

### Medición: el eje de hoy contra las manzanas de cada época

`node tools/red-vial-corredor.mjs <public>` toma el eje de cada vía en la capa Hoy y lo mide
cada 10 m contra las manzanas que el sitio dibuja en cada época. En cada muestra el eje cae
**dentro** de una manzana (la vía de hoy no se proyectó: la manzana sigue ahí), en **abierto**
(sin manzana a 40 m de algún lado: campo, plaza o cruce) o en un **corredor**, cuyo ancho libre
se mide de fachada a fachada. Informe completo, con las seis épocas y los sha256 de los datos
medidos, en
[`mediciones/vialidad/secciones-modernas.json`](../mediciones/vialidad/secciones-modernas.json).

Cada celda: dentro · abierto · corredor · ancho mediano del corredor.

| Vía (capa Hoy) | Abre | Tramos de hoy | 1936 | 1946 | Sospechosos 1936 / 1946 |
|---|---:|---:|---|---|---:|
| Avenida Urdaneta | 1953 | 49 | 36 % · 29 % · 36 % · 16 m | 36 % · 29 % · 36 % · 16 m | 3 / 3 |
| Avenida Fuerzas Armadas | 1956 | 58 | 30 % · 34 % · 36 % · 17 m | 30 % · 33 % · 37 % · 18 m | 2 / 2 |
| Avenida Libertador | 1965 | 126 | 17 % · 59 % · 24 % · 23 m | 18 % · 57 % · 25 % · 25 m | 6 / 6 |
| Norte–Sur 6, ensanche de 1951–1953 (avenida Baralt desde 1961) | 1953 | 70 | 33 % · 35 % · 32 % · 15 m | 34 % · 37 % · 30 % · 15 m | 4 / 4 |
| Distribuidor Baralt (sur, con la autopista) | 1968 | 28 | 1 % · 99 % · 0 % · — | 2 % · 97 % · 1 % · 30 m | 0 / 0 |
| Distribuidor Baralt de la avenida Boyacá | 1973 | 8 | 0 % · 100 % · 0 % · — | 2 % · 92 % · 6 % · 23 m | 0 / 0 |
| Autopista del Este, primer tramo | 1953 | 160 | 2 % · 96 % · 2 % · 27 m | 3 % · 92 % · 5 % · 28 m | 0 / 0 |
| Autopista Valle–Coche | 1955 | 42 | 0 % · 100 % · 0 % · — | 0 % · 100 % · 0 % · 8 m | 0 / 0 |
| Cota Mil, tramo de Maripérez a La Florida | 1956 | 66 | 0 % · 100 % · 0 % · — | 0 % · 99 % · 1 % · 28 m | 0 / 0 |
| Autopista Caracas–La Guaira | 1953 | 64 | 3 % · 95 % · 3 % · 18 m | 3 % · 93 % · 4 % · 22 m | 0 / 0 |
| Avenida Andrés Bello | 1952 | 47 | 8 % · 84 % · 8 % · 31 m | 9 % · 81 % · 10 % · 35 m | 0 / 0 |
| Avenida Lecuna | 1970 | 22 | 7 % · 29 % · 64 % · 11 m | 3 % · 38 % · 59 % · 11 m | 2 / 2 |
| Avenida Universidad, ampliación de las calles Oeste 4 y Este 4 | ¿? | 13 | 18 % · 25 % · 57 % · 13 m | 18 % · 25 % · 57 % · 13 m | 0 / 0 |
| Avenida Sucre, tercer tramo (Tinajitas–placita Diego de Losada) | 1952 | 60 | 15 % · 43 % · 41 % · 22 m | 15 % · 46 % · 39 % · 22 m | 2 / 2 |
| Avenida San Martín, ampliación de Angelitos a Alcabala | 1954 | 67 | 19 % · 53 % · 28 % · 21 m | 16 % · 58 % · 25 % · 23 m | 2 / 1 |
| Avenida Nueva Granada | 1950 | 29 | 1 % · 93 % · 7 % · 38 m | 5 % · 79 % · 17 % · 32 m | 0 / 0 |

Lectura:

- **Urdaneta, Fuerzas Armadas y Baralt**: un tercio del eje de hoy cae dentro de manzanas de 1936
  y de 1946, y donde hay corredor mide de 15 a 18 m, contra los 26 m que la fuente da a la
  Urdaneta de 1953. La sección moderna no está en esas épocas.
- **Autopistas y Cota Mil**: más del 90 % en abierto y casi nada de corredor. No hay un corredor
  abierto para ellas; pasan por donde el sitio no dibuja manzanas en esas épocas.
- El campo tiene 2 m por texel y la medida anda de metro en metro: cada ancho vale ±4 m. Los
  cruces cuentan como «abierto», no como ancho.

### Correcciones y revisiones pendientes

Tramos de hoy con corredor casi continuo (80 % de sus muestras) de 20 m o más **antes de que su
vía abriera**. No son errores confirmados: son los sitios donde hay que mirar el plano de la
época. En 1936 (21; los de las demás épocas están en el informe):

| Vía de hoy | Centro del tramo (px del mosaico) | Largo | Ancho mediano |
|---|---|---:|---:|
| Avenida Urdaneta | (10932, 6809) | 139 m | 25 m |
| Avenida Urdaneta | (10095, 6676) | 92 m | 26 m |
| Avenida Urdaneta | (7805, 6238) | 91 m | 22 m |
| Avenida Fuerzas Armadas | (10513, 5134) | 156 m | 20 m |
| Avenida Fuerzas Armadas | (10115, 7209) | 21 m | 55 m |
| Avenida Libertador | (17646, 8909) | 184 m | 20 m |
| Avenida Libertador | (13925, 7829) | 182 m | 34 m |
| Avenida Libertador | (13971, 7795) | 119 m | 35 m |
| Avenida Libertador | (13989, 7814) | 78 m | 36 m |
| Avenida Libertador | (16490, 8540) | 37 m | 43 m |
| Avenida Libertador | (17538, 8847) | 27 m | 32 m |
| Avenida Baralt | (7952, 8626) | 152 m | 20 m |
| Avenida Baralt | (8015, 8335) | 145 m | 20 m |
| Avenida Baralt | (8619, 5224) | 52 m | 33 m |
| Avenida Baralt | (8596, 5205) | 49 m | 26 m |
| Avenida Lecuna | (11740, 8645) | 118 m | 22 m |
| Avenida Lecuna | (11267, 8563) | 109 m | 21 m |
| Avenida Sucre | (6974, 5640) | 199 m | 20 m |
| Avenida Sucre | (6840, 5622) | 161 m | 20 m |
| Avenida San Martín | (4120, 9742) | 149 m | 26 m |
| Avenida San Martín | (7528, 7756) | 68 m | 45 m |

Mirados sobre el plano de 1936 en esta tarea (lectura a ojo de un agente, sin revisión de una
persona):

- Urdaneta en (10095, 6676): es la **plaza España / plaza López**, que el plano dibuja. Legítimo.
- Libertador en torno a (13950, 7810): el corredor es el del **ferrocarril**, que el plano dibuja
  con su vía. No es una avenida; el suelo del sitio debería tratarlo como vía férrea, no como calle.
- Urdaneta en (10932, 6809), entre Platanal y Candilito: el plano dibuja una calle corriente y
  la medida da 25 m. **Sin explicar**: revisar las manzanas de esa cuadra.
- El resto no se miró.

Listo para código, en orden:

1. Revisar a ojo los sospechosos que faltan y, donde el plano dibuje una calle angosta, corregir
   la manzana del generador (no el plano).
2. Digitalizar en 1936 y 1946 las predecesoras con nombre (Este–Oeste 1, Norte–Sur 6 y 7,
   Este–Oeste 10, Oeste 4 y Este 4) como tramos del registro, con el ancho que dibuja cada plano.
3. Partir en la capa Hoy la Baralt (1953 / 1973), la autopista del Este y la Boyacá por etapa,
   si alguna vez se muestra su cronología: hoy cada una es un solo nombre.
4. Leer la carretera vieja de La Guaira en el plano de 1908 del catálogo antes de dibujarla.

### Referencias visuales

Ninguna imagen de las páginas consultadas se incorporó al repo ni al paquete de fotos. **Ninguna
página de FAC declara licencia**, y varias dan como procedencia redes sociales sin autor:

| Página | Imágenes | Procedencia y fecha que da la página | Licencia |
|---|---|---|---|
| [FAC, Urdaneta 1953](https://fundaayc.com/2013/09/26/1953-inauguracion-de-la-avenida-urdaneta/) | 1 | No dice | No declara |
| [FAC, Fuerzas Armadas 1956](https://fundaayc.com/2013/11/10/1956%E2%80%A2-avenida-fuerzas-armadas/) | 1 | No dice | No declara |
| [FAC, Libertador 1965](https://fundaayc.com/2026/09/15/1965-inauguracion-de-la-avenida-libertador/) | 3 | No dice | No declara |
| [FAC, Libertador 1964](https://fundaayc.com/2022/06/08/1964-construccion-de-la-avenida-libertador/) | 1 | «Foto tomada desde el Edificio El Castillito», de un grupo de Facebook | No declara |
| [FAC, ¿Sabía usted? 98 (Baralt)](https://fundaayc.com/2023/04/02/sabia-usted-98/) | 13 | Colección Crono Arquitectura Venezuela (obra, c. 1952); planos de 1772, 1875, 1933, 1939, 1948 y 1951 tomados de libros y de guiaccs.com; *Informes de la Construcción* (1972); *Caracas cenital* (2005); una foto de Facebook | No declara |
| [FAC, Baralt 1953](https://fundaayc.com/2026/08/26/1953-avenida-baralt/) | — | «Fotos tomadas de Internet», colección Marga Pestana de Whittembury | No declara |
| [FAC, Caracas–La Guaira 1953](https://fundaayc.com/2013/10/26/1953%E2%80%A2-se-inaugura-la-autopista-caracas-la-guaira/) | 1 | No dice | No declara |
| [FAC, distribuidor Baralt 1973](https://fundaayc.com/2026/08/31/1973-distribuidor-av-baralt-de-la-cota-mil/) | 3 | No dice; otra página atribuye una a la Colección Crono | No declara |
| [FAC, postal n.º 438](https://fundaayc.com/2025/03/02/algo-mas-sobre-la-postal-no-438/) | 15 | *Informes de la Construcción* (1972); Revista Municipal del D. F. (1939); plano Esso (1946) vía guiaccs.com; plano del MOP (1971); Revista Punto n.º 44 (1971) | No declara |
| [FAC, ¿Sabía usted? 88 (Cota Mil)](https://fundaayc.com/2022/08/14/sabia-usted-88/) | 14 | Planes de 1939 y 1951; plano de 1967 vía guiaccs.com; una foto de Flickr; Colección Crono; blogs | No declara |

Con licencia desconocida se conserva el enlace y nada más. Una foto actual no prueba una
fachada ni una sección antiguas.

## Puentes del Guaire

| Cruce | Cronología de referencia | Qué falta antes de modelar |
|---|---|---|
| Hierro / Regeneración | 1875 | Separar estructura original y sustituciones; actual marca `(9430,9440)` no mide el tablero |
| Constitución / Sucre | Constitución hacia 1880–1882, reconstrucción Sucre 1895 | Contrastar continuidad exacta de estribos y nombres en 1889/1911; marca actual `(9710,9430)` nace en 1936 |
| Paraíso | Fuentes secundarias oscilan entre c.1890 y 1895 | Resolver fecha exacta, ubicación y sustituciones; ambas fechas permiten presencia en 1911, no dimensiones |
| Dolores | Montado en 1897; pilas de 1916; el plano de marzo de 1936 aún lo dibuja; «Puente Soublette» en 1946 | Marca, ficha y calce en [`puentes-guaire-cruces.md`](../puentes-guaire-cruces.md). Falta decidir las cabezas y fechar el reemplazo |
| Restaurador | 1905; reparado en 1932; rotulado en 1936 y 1946 | Marca, ficha y calce hechos. Faltan apoyos, cota de tablero y la estructura de 1946 |
| 19 de Diciembre | 1910; «9 de Diciembre» en los planos de 1936 y 1946 | Marca, ficha y eje hechos. Cabezas sin medir |
| Ayacucho | 1924 | Marca, ficha y eje hechos. Cabezas y luces sin medir; separar etapa inicial de reconstrucciones |
| Bolívar / Los Leones | 1933 | Verificar identidad, estructura y accesos históricos |

Fuentes: [síntesis FAC](https://fundaayc.com/2023/04/02/sabia-usted-98/) y
[referencias al estudio de Mónica Silva Contreras, 2004](https://fundaayc.com/tag/las-mercedes/page/2/).
Las discrepancias no se resuelven promediando fechas. No se cambió todavía el ancla de Sucre
ni se copió un puente actual sobre una marca antigua.

## Contrato de #269: qué está hecho y qué falta

El contrato ya es código (`tools/red-vial-lib.mjs`, versión 2; guía y tabla de campos en
[`red-vial-temporal.md`](../red-vial-temporal.md)). Cada segmento tiene identificador
estable, geometría en píxeles del mosaico de 1936, sistema de referencia explícito y
**etapas**; cada etapa lleva su documento, la fecha del documento, la fecha del hecho,
la certeza, el nombre de esa época, el ancho y el error, las contradicciones pendientes y,
si lo hay, el recorte del plano. `desconocido` no equivale a `ausente`; un proyecto no
equivale a obra ejecutada; un documento no acredita un hecho posterior a él.

Cobertura del registro (`node tools/red-vial.mjs auditar`): 449 tramos en 1772; ninguno en
1843; en 1889, 1911, 1936 y 1946 solo los cruces del Guaire ya calzados, más los once
trazados recuperados en 1936. El detalle, por corte y por cruce, está en la guía.

Orden de ejecución pendiente:

1. Digitalizar las redes de 1843, 1889, 1911, 1936 y 1946 desde sus propios planos, con
   revisión a ojo; conservar los 11 trazados curados con su procedencia sin inventar
   fechas intermedias. Los cruces del Guaire ya entraron con lo que dibuja cada plano.
2. Separar en cada cruce las calles, los puentes y sus accesos; medir anchos e incertidumbre.
   Ningún tramo de calle tiene todavía ancho ni nombre de época.
3. Comparar redes y manzanas: ningún eje moderno borra automáticamente lotes antiguos.
4. Generar campos por época y selector temporal, manteniendo el comportamiento si faltan datos.
5. Probar presencia, ausencia y continuidad, transición entre épocas y modo Hoy; publicar datos.

Este documento prepara y corrige el inventario; **no completa** #269 ni los modelos de #272.
Para #277 y #278 quedan el catálogo, la garantía con tests y la medición de arriba; siguen
abiertos los sospechosos sin revisar y la digitalización de las calles predecesoras.
