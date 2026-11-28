# Puentes sobre Catuche, Caroata y Anauco: ficha de evidencias

Avance de [#271](https://github.com/grunch/caracas/issues/271). Es documentación: **no se agrega ninguna marca,
ficha, modelo ni geometría**, y los datos publicados no cambian. Sigue el criterio de los puentes del Guaire
([`puentes-guaire-cruces.md`](puentes-guaire-cruces.md), [`puente-hierro-integracion.md`](puente-hierro-integracion.md)):
marca y ficha, solo con las cabezas leídas del plano; modelo, solo con estudio en Miraflores. Acá no hay ninguna de
las dos cosas todavía.

Los datos viven en [`evidencias/puentes-quebradas.json`](evidencias/puentes-quebradas.json), con la ficha de
evidencias del registro vial ([`red-vial-temporal.md`](red-vial-temporal.md)). Las tablas que siguen a la marca de
abajo se generan desde ahí; `tests/unit/puentes-quebradas.test.js` comprueba que no se desfasen.

## Qué se hizo y cómo

- **Se ubicaron sobre el plano de 1843 siete de las ocho letras de puentes de la leyenda** (b a h), en recortes del
  plano ya calzado sobre el mosaico de 1936. El cotejo de la leyenda (`specs/auditoria-1843/cotejo-leyenda.md`) las
  había dejado «sin posición que tomar». La letra a (Pastora) queda dudosa.
- Para cada cruce se miró el mismo lugar en los planos de 1889 (Mestre) y 1936 (DCN). **Los de 1911 y 1946 no se
  leyeron**, y el de 1772 tampoco se volvió a mirar: se cita lo que ya está en
  `specs/auditoria-1772/trazado-calles-original.json` (tres pasos de agua, sin calzar).
- Las posiciones son píxeles del mosaico de 1936, leídos a ojo sobre una rejilla de 100 px, sin ampliar. Llevan el
  error de su plano: p90 de 18,27 m en 1843 y de 12,93 m en 1889. **Son el cruce de la calle con el cauce, no las
  cabezas del puente.** Ningún plano dibuja estribos; el de 1889 dibuja un símbolo de puente solo en la Pastora.
- **Fuentes escritas.** Un artículo académico con documentos de archivo (Blondet, *Revista de Indias*, 2008) y una
  tesis de la UCV; lo demás son Wikipedia y crónicas sin referencias, y todo lo que solo ellas afirman va como
  dudoso. Las leyó un subagente, que devolvió citas textuales.

## Hallazgos

1. **Pastora y Trinidad son dos puentes.** El Cabildo, el 9 de febrero de 1784, habla del «puente nuevo del Barrio
   de la Divina Pastora» y del «de la Trinidad» como cosas distintas (Blondet). El que hoy se llama Carlos III es
   el de la Pastora: el objeto de OpenStreetMap cae a unos 30 m del símbolo de puente del plano de 1889. El issue
   los trataba juntos («Carlos III/Trinidad»).
2. **Para 1772 no hay nada firme.** Que el Carlos III estuviera «iniciado» ese año solo lo dice Wikipedia, sin
   referencia; los documentos de archivo lo llaman «nuevo» en 1784. Del puente de la Trinidad hay dos fechas
   (mediados del siglo XVIII; 1770–1776), las dos de fuentes sin referencias. **No se modela ninguno en 1772.**
3. **El Anauco no corresponde a 1772.** Se ordena en 1786 y se termina en 1790 según Wikipedia y crónicas; no se
   encontró fuente primaria. En 1843 la leyenda lo trae (letra f) y a unos 65 m está la letra x, la Alcabala de
   Candelaria.
4. **Los nombres cambian, el cruce no.** «De Punceles» (1843) es la esquina «Punceles» (1889) y «Punceres» (1936);
   «de Candelaria» es «Ña Romualda»; «de la Unión» es «Puente Nuevo», como dice una crónica. Las dos últimas
   identidades son inferencias por posición.
5. **Monroy sigue sin fuente.** La leyenda se lee «Mouroy»; el cruce que marca la letra e cae a unos 30 m del que en 1889
   queda junto a la esquina «Monroy». No se encontró nada escrito sobre el puente.
6. **El cauce se va tapando.** En 1889 el Caroata ya no se dibuja al sur del puente de San Pablo. En 1936 no hay
   cauce dibujado en Punceres, Ña Romualda ni San Pablo; sigue abierto en la Pastora, al noroeste de la Trinidad,
   en Monroy, en el Puente Nuevo y en el Anauco. Ninguna fuente leída fecha esos embovedados. En esos tres cruces
   el estado de 1936 queda «no se sabe»: el nombre de la esquina no prueba que el puente siguiera a la vista.
7. **El cruce de la Trinidad de 1843 queda unos 60 m al norte del de 1889.** Es más que el error máximo del calce
   de 1843 (30 m). Queda escrito como duda; no se elige una de las dos posiciones.

## Otros puentes que nombran los planos

No están en la leyenda de 1843 y no se estudiaron. Posiciones del diccionario de esquinas de 1936
(`tools/geo/esquinas/1936-esquinas.json`), que son cruces de calles:

| Nombre en 1936 | Posición | Nota |
|---|---|---|
| Puente Monagas | (7765, 4837) | |
| Puente Yanes | (10368, 7257) | El plano de 1889 rotula «Pte. Guzmán B.» una cuadra al norte de Monroy, cerca de ahí |
| Puente Victoria | (10572, 7842) | Sobre el Catuche, al sur de Monroy |
| Puente Junín | (7699, 8391) | Sobre el Caroata |
| Puente Arauca | (7607, 8650) | Sin verificar en el diccionario |
| Puente Casacoima | (7621, 8952) | |
| Puente Brión | (11761, 7765) | Sin verificar en el diccionario |

## Estado de los criterios de #271

| Criterio | Estado |
|---|---|
| Ficha de evidencias por puente y etapa | Hecha para los ocho de la leyenda en 1843, 1889 y 1936; 1772, 1911 y 1946 sin leer |
| Huella georreferenciada | No: hay cruces con su error, no cabezas ni estribos |
| Variantes por época | Presencia y nombre por plano, en el catálogo; el visor no cambia |
| Referencias visuales | Una sola con licencia: la pintura de Bellermann de 1844–1845 (dominio público), ya en el repo |
| Pruebas y capturas | Tests del catálogo; nada que capturar |
| Reglas de construcción y rendimiento | No aplica: sin geometría |
| Dudas abiertas | Escritas por puente, abajo |

## Qué sigue

- **Cabezas.** Releer cada cruce ampliado ×4 con rejilla de 20 px, como en `puentes-guaire-calce.md`, en 1843, 1889
  y 1911. Con cabezas se pueden instalar marcas y fichas (el formato de `src/puentes-cruces-datos.js`).
- **Modelos.** Solo dos tienen de dónde salir: el de la Pastora (Carlos III), que sigue en pie, y el de la
  Trinidad, con la pintura de Bellermann. Los dos piden primero su estudio en Miraflores: **hoy no existe**
  (Miraflores solo estudió los puentes del Guaire). Los demás no tienen ninguna vista ni medida.
- **1772.** Calzar los tres pasos de agua del original y decidir, con el plano delante, cuáles son puentes.
- **Embovedados.** Buscar fechas: la investigación encontró una pista sin verificar (un libro sobre el acueducto,
  con una bóveda desde el puente de San Pablo en 1876) que no se pudo abrir y no se usa.

## Referencias visuales

La única imagen del repo es `fuentes/imagenes/1844-commons-puente-de-la-trinidad-bellermann` (Ferdinand
Bellermann, 1844–1845, dominio público según Commons), asociada a la marca `catuche`. No se incorpora ninguna otra:
las fotos de las crónicas no declaran autor ni licencia. Una fotografía actual del Carlos III no prueba su forma
de 1843.

<!-- catálogo: lo que sigue se genera con `node tools/catalogo-evidencias.mjs`; no editar a mano -->

## Lo que deja leer el plano de cada corte

«Sin lectura» es que nadie leyó ese plano para ese elemento: no es una ausencia. La certeza va entre paréntesis.

| Elemento | 1772 | 1843 | 1889 | 1911 | 1936 | 1946 |
|---|---|---|---|---|---|---|
| Puente de la Pastora (hoy Puente Carlos III) | **No se sabe** (dudosa). Nadie leyó este cruce en el original de 1772. El sector es de calce débil (S1772-24). Las fuentes de archivo lo llaman «nuevo» en 1784. | **Existe** (dudosa). «de la Pastora». Letra a de la leyenda. Sobre el dibujo, una calle cruza la quebrada cerca de (8390, 4660) con un signo al lado; que ese signo sea la letra a es una lectura dudosa. | **Existe** (documentada). Símbolo de puente (dos trazos paralelos) sobre la calle que cruza el Catuche, en (8350, 4670). Sin rótulo. | Sin lectura | **Existe** (documentada). La calle cruza la quebrada entre (8300, 4600) y (8350, 4700); el cauce se dibuja abierto, en raya y punto azul, al norte y al sur. Sin rótulo de puente. | Sin lectura |
| Puente de la Trinidad | **No se sabe** (dudosa). Nadie leyó este cruce en el original de 1772. La marca de la iglesia de la Trinidad tiene su propia matriz en `docs/issue-268-trinidad-plaza.md`. | **Existe** (documentada). «de la Trinidad». Letra b de la leyenda, dibujada en (9335, 5475) junto al cruce de la calle con la quebrada en (9360, 5500). El plano no dibuja la estructura: solo la calle que pasa sobre el cauce. | **Existe** (documentada). «Pte. de la Trinidad». Rótulo a lo largo de la calle; el Catuche, en azul, pasa bajo ella en (9335, 5620), junto al n.º 3. | Sin lectura | **Existe** (documentada). «Puente Trinidad». Nombre de la esquina en (9318, 5637). La quebrada se dibuja abierta al noroeste, hasta (9470, 5600), y no sigue al sureste. | Sin lectura |
| Puente de Punceles (Punceres) | **No se sabe** (dudosa). Nadie leyó este cruce en el original de 1772. | **Existe** (documentada). «de Punceles». Letra c de la leyenda, dibujada en (10040, 6520) junto al cruce de la calle con la quebrada en (10020, 6540). El plano no dibuja la estructura: solo la calle que pasa sobre el cauce. | **Existe** (documentada). «Punceles». El nombre ya es el de la esquina, en (9850, 6640). En este tramo el plano no dibuja el cauce. | Sin lectura | **No se sabe** (documentada). «Punceres». Nombre de esquina en (9973, 6646), junto a la «Plaza España». No hay cauce dibujado: no se sabe si el puente seguía a la vista. | Sin lectura |
| Puente de Candelaria (Catuche o Ña Romualda) | **No se sabe** (dudosa). Nadie leyó este cruce en el original de 1772. | **Existe** (documentada). «de Candelaria». Letra d de la leyenda, dibujada en (10230, 6960) junto al cruce de la calle con la quebrada en (10250, 6990). El plano no dibuja la estructura: solo la calle que pasa sobre el cauce. | **Existe** (documentada). «Ña Romualda». Esquina «Ña Romualda» en (10100, 6990); el Catuche aparece en azul justo al sureste, desde (10110, 7010). La calle lleva una línea de trazos de tranvía. | Sin lectura | **No se sabe** (documentada). «Ña Romualda». Nombre de esquina en (10171, 6945), con la «Plaza López» al norte. No hay cauce dibujado. | Sin lectura |
| Puente de Monroy | **No se sabe** (dudosa). Nadie leyó este cruce en el original de 1772. | **Existe** (dudosa). «de Monroy». Letra e de la leyenda, dibujada en (10440, 7510) junto al cruce de la calle con la quebrada en (10480, 7540). El plano no dibuja la estructura: solo la calle que pasa sobre el cauce. El nombre se lee «Mouroy». | **Existe** (documentada). «Monroy». El Catuche, en azul, cruza la calle entre las esquinas «Perico» y «Monroy», en (10530, 7565). | Sin lectura | **Existe** (documentada). «Monroy». El cauce se dibuja abierto y encajonado, de doble línea, y pasa bajo la calle en (10590, 7570), junto a la esquina «Monroy» (10624, 7579). | Sin lectura |
| Puente Anauco | **No está** (inferida). No se leyó el plano en este punto. Que no existía sale de la fecha de la obra (1786–1790), que solo dan fuentes terciarias. | **Existe** (documentada). «de Anauco». Letra f de la leyenda, dibujada en (11510, 7250) junto al cruce de la calle con la quebrada en (11560, 7230). El plano no dibuja la estructura: solo la calle que pasa sobre el cauce. Unos 65 m al noroeste está la letra x, la Alcabala de Candelaria, en (11420, 7160). | **Existe** (documentada). La calle, con su línea de trazos de tranvía, cruza el Anauco en (11490, 7190); al lado, el n.º 7 de la leyenda, que no está transcrita. | Sin lectura | **Existe** (documentada). «Puente Anauco». Rótulo en (11650, 7150); la calle es continua y el río, de doble línea azul clara, pasa bajo ella en (11520, 7200). | Sin lectura |
| Puente de San Pablo | **No se sabe** (dudosa). El original dibuja un rectángulo rojo que interrumpe la franja de agua (P1772-001), en la misma calle que el cruce que el calce lleva a la esquina «Puente San Pablo». Está sin calzar y con la nota «confirmar geometría del puente». | **Existe** (documentada). «de San Pablo». Letra g de la leyenda, dibujada en (8130, 7640) junto al cruce de la calle con la quebrada en (8110, 7590). El plano no dibuja la estructura: solo la calle que pasa sobre el cauce. | **Existe** (documentada). «Puente Sn. Pablo». Rótulo sobre la calle. El Caroata, en azul, llega desde el norte hasta la calle en (8110, 7560) y no sigue al sur; una línea de trazos de tranvía baja junto a él. | Sin lectura | **No se sabe** (documentada). «Puente San Pablo». Nombre de esquina en (8162, 7587), frente al Teatro Municipal y la «Plaza Miranda». No hay cauce dibujado: no se sabe si el puente seguía a la vista. | Sin lectura |
| Puente de la Unión (Puente Nuevo) | **No está** (inferida). No se leyó el plano en este punto. Que no existía sale de la fecha de hacia 1835, que solo da una crónica. | **Existe** (documentada). «de la Unión». Letra h de la leyenda, dibujada en (7790, 8190) junto al cruce de la calle con la quebrada en (7770, 8150). El plano no dibuja la estructura: solo la calle que pasa sobre el cauce. | **Existe** (documentada). «Puente Nuevo». Rótulo sobre la calle; el Caroata, en azul, pasa bajo ella en (7775, 8115), junto al n.º 12. | Sin lectura | **Existe** (documentada). «Puente Nuevo». Nombre de esquina en (7763, 8088); el Caroata se dibuja abierto, en raya y punto azul, al noreste y al sur del cruce. | Sin lectura |

## Quebrada Catuche

### Puente de la Pastora (hoy Puente Carlos III)

`puente:pastora` · puente · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

No es el puente de la Trinidad: las fuentes de archivo los nombran como dos puentes. El objeto «Puente de Carlos III» de OpenStreetMap (`way/987814944`) cae en (8295, 4647), a unos 30 m del cruce leído en 1889.

**Nombres:** «Puente de la Pastora» (¿?–¿?) [4] [1]; «Puente Carlos III» (¿?–¿?) [2].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1784 | Obra | El 9 de febrero de 1784 el Cabildo lo llama «puente nuevo del Barrio de la Divina Pastora» | «del puente nuevo del Barrio de la Divina Pastora a incorporarse con el de la Trinidad» (p. 70) | documentada | [1] |
| 1787 | Obra | El juicio de residencia de 1787 dice que el gobernador González construyó el puente que va de la Trinidad a la Pastora | «construyó el Puente que ba del Barrio de la Sanctisima Trinidad al de la Pastora» (p. 75) | documentada | [1] |
| 1772 | Obra | Las obras se inician hacia 1772 | «Las obras… se inician cerca del año 1772, por disposición del entonces gobernador José Carlos de Agüero, con fondos del Cabildo» | dudosa | [2] |
| Sin fecha | Levantamiento | Un arco de ladrillo y piedra, de unos 30 m de largo y 6 m de calzada; sigue en pie | «todo el ancho de la calzada, unos 6 m; un arco único cuya luz es equivalente a su altura… sus 30 m… pieza clave del camino que conducía de Caracas al puerto de La Guaira» | dudosa | [3] |

**Contradicción pendiente — Fecha y promotor:**

- Obras iniciadas hacia 1772 por disposición del gobernador Agüero y terminadas en 1784 [2]
- Construido en 1784 por el gobernador Manuel González [3]
- En febrero de 1784 el Cabildo lo llama «puente nuevo»; el juicio de residencia de 1787 atribuye a González la obra [1]
- Construido «entre 1784 y 1786» [5]

**Contradicción pendiente — Autor:**

- Obra de Juan Domingo del Sacramento Infante [2]
- Infante murió el 12 de diciembre de 1780, antes de la conclusión que la misma fuente le atribuye [6]

**No se pudo documentar:**

- Si en 1772 había obra iniciada: solo lo afirma Wikipedia, sin referencia.
- Su luz en metros: una crónica dice «unos 30 m» de largo y 6 m de calzada, sin fuente.
- La letra a de la leyenda de 1843 no se pudo leer con seguridad sobre el dibujo.
- Luz, ancho, estribos y material medidos: los planos dan el cruce, no la obra.
- Cómo lo dibujan los planos de 1911 y 1946: no se leyeron.

### Puente de la Trinidad

`puente:trinidad` · puente · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «Puente de la Trinidad» (¿?–¿?) [4] [9]; «Puente Trinidad» (¿?–¿?) [10].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1784 | Levantamiento | En febrero de 1784 ya existe: la alameda nueva debía unirse con él | «del puente nuevo del Barrio de la Divina Pastora a incorporarse con el de la Trinidad» (p. 70) | documentada | [1] |
| 1770–1776 | Obra | Proyecto de 1770, concluido en 1776 | «el puente de La Trinidad… El primer plano se levantó en el año 1770 a cargo del ingeniero Manuel de Clemente y Francia, y se concluyó en 1776» | dudosa | [7] |
| 1844–1845 | Levantamiento | Bellermann pinta un puente de arcos de mampostería sobre una quebrada honda | «Paisaje de Caracas con viaducto y puente de la Trinidad (1844-45)» (título de la obra en Commons) | documentada | [8] |

**Contradicción pendiente — Fecha:**

- Construido a mediados del siglo XVIII [6]
- Plano de 1770 de Manuel de Clemente y Francia; concluido en 1776 [7]

**Contradicción pendiente — Sobre qué quebrada:**

- Sobre el Catuche [6]
- Otros artículos de Wikipedia lo ponen sobre el Caroata; los planos de 1843, 1889 y 1936 lo dibujan sobre el Catuche [11]

**No se pudo documentar:**

- Si en 1772 estaba en obra o concluido: las dos fechas que hay son de fuentes sin referencias.
- Cuándo se cubre la quebrada al sureste de la esquina.
- Por qué el cruce de 1843 queda unos 60 m al norte del de 1889: es más que el error de su calce.
- Luz, ancho, estribos y material medidos: los planos dan el cruce, no la obra.
- Cómo lo dibujan los planos de 1911 y 1946: no se leyeron.

### Puente de Punceles (Punceres)

`puente:punceres` · puente · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «Puente de Punceles» (¿?–¿?) [4]; «Punceres» (¿?–¿?) [10].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1676 | Obra | Lo fabrica Nicolás Puncel hacia 1676, de mampostería | «lo fabricó a sus expensas el Sargento Nicolás Puncel, por el año 1676… obra de mampostería, ladrillos y cal» | dudosa | [12] |
| Sin fecha | Levantamiento | Sigue existiendo, embutido en la canalización del Catuche | «Punceres y Romualda no fueron demolidos y… existen… embutidos dentro de la canalización del río Catuche» | dudosa | [12] |

**Contradicción pendiente — Fecha:**

- Lo fabricó a sus expensas el sargento Nicolás Puncel hacia 1676 [12]
- Construido en 1775, en tiempos del gobernador Agüero [13]

**No se pudo documentar:**

- Toda fecha: las dos que hay son de crónicas sin referencias.
- Cuándo se cubre el Catuche en este cruce: el plano de 1936 ya no dibuja el cauce.
- Luz, ancho, estribos y material medidos: los planos dan el cruce, no la obra.
- Cómo lo dibujan los planos de 1911 y 1946: no se leyeron.

### Puente de Candelaria (Catuche o Ña Romualda)

`puente:candelaria` · puente · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «Puente de Candelaria» (¿?–¿?) [4]; «Ña Romualda» (¿?–¿?) [9] [10].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1736 | Apertura | Entra en servicio en 1736; una crecida lo destruye en enero de 1742 | «comenzó a prestar servicio en 1736… mampostería con bien trazado arco ojival… la descomunal crecida… de enero de 1742, destruyó la estructura» | dudosa | [12] |
| 1843 | Levantamiento | En 1843 una calle lleva su nombre | Calle 42, «del Puente Candelarª» | documentada | [4] |

**Contradicción pendiente — Año en que entra en servicio:**

- 1736 [12]
- «Fue preciso esperar hasta 1735», citando a Enrique Bernardo Núñez [14]

**No se pudo documentar:**

- Qué se reconstruyó tras la crecida de 1742.
- Que el puente de Candelaria de 1843 sea el de la esquina «Ña Romualda» es una inferencia por posición y por una crónica.
- Luz, ancho, estribos y material medidos: los planos dan el cruce, no la obra.
- Cómo lo dibujan los planos de 1911 y 1946: no se leyeron.

### Puente de Monroy

`puente:monroy` · puente · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «Puente de Monroy» (¿?–¿?) [4]; «Monroy» (¿?–¿?) [9] [10].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1843 | Levantamiento | La leyenda de 1843 lo enumera, con lectura dudosa | «de Mouroy» (letra e) | dudosa | [4] |

**No se pudo documentar:**

- Toda su historia: no se encontró ninguna fuente escrita.
- La leyenda de 1843 se lee «de Mouroy»: la identificación con Monroy sale de la posición y del nombre de la esquina.
- Luz, ancho, estribos y material medidos: los planos dan el cruce, no la obra.
- Cómo lo dibujan los planos de 1911 y 1946: no se leyeron.

## Quebrada Anauco

### Puente Anauco

`puente:anauco` · puente · ausente en los cortes anteriores a **1790**.

No corresponde a 1772: se ordena en 1786 y se termina en 1790. La apertura va como dudosa porque solo la dan Wikipedia y crónicas; aun así, es lo que hay.

**Nombres:** «Puente Anauco» (¿?–¿?) [4] [10].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1786 | Obra | Lo ordena el gobernador Guillelmi en 1786 | «Su construcción fue ordenada por… don Julián Guillelmi en 1786, pero no sería terminado sino hasta 1790… vinculaba la antigua calle de La Candelaria con la antigua vía del Este» | dudosa | [15] |
| 1790 | Apertura | Terminado en 1790 | «no sería terminado sino hasta 1790» | dudosa | [15] |
| Sin fecha | Levantamiento | Tres arcos rebajados de ladrillo | «tres arcos elípticos rebajados, construido en ladrillo… Actualmente funciona como Paseo Anauco tras el embaulamiento de la quebrada» | dudosa | [16] |
| 1983 | Reforma | El Paseo Anauco se inaugura el 22 de noviembre de 1983 | «inaugurado el 22 de noviembre de 1983» | dudosa | [17] |

**Contradicción pendiente — Material:**

- Estructura de ladrillos, con tres arcos [15]
- La ficha del mismo artículo dice «Concreto, ladrillos» [15]

**No se pudo documentar:**

- Sus medidas.
- Una fuente primaria para 1786–1790: el artículo remite al catálogo del IPC, que no se pudo consultar.
- La esquina «Puente Anauco» de 1936 está sin verificar en el diccionario de esquinas.
- Luz, ancho, estribos y material medidos: los planos dan el cruce, no la obra.
- Cómo lo dibujan los planos de 1911 y 1946: no se leyeron.

## Quebrada Caroata

### Puente de San Pablo

`puente:san-pablo` · puente · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «Puente de San Pablo» (¿?–¿?) [4] [9]; «Puente San Pablo» (¿?–¿?) [10].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1737 | Obra | Primer puente de mampostería sobre el Caroata, de 1737 | «el primer puente de mampostería sobre el río Caroata construido en 1737» (p. 25) | documentada | [18] |
| 1814 | Reforma | Averiado en 1812 y reparado en 1814 | Reparos de 1814 por «87 pesos» (p. 25) | documentada | [18] |
| 1843 | Levantamiento | En 1843 una calle lleva su nombre | Calle 79, «del Puente de Sⁿ Pablo» | documentada | [4] |

**Contradicción pendiente — Año:**

- Primer puente de mampostería sobre el Caroata, de 1737 [18]
- «es de 1728» [12]

**No se pudo documentar:**

- Cuándo se cubre el Caroata al sur del puente: en 1889 el cauce ya termina en la calle.
- Si el paso de agua P1772-001 del original de 1772 es este puente: es un indicio, no una lectura.
- Luz, ancho, estribos y material medidos: los planos dan el cruce, no la obra.
- Cómo lo dibujan los planos de 1911 y 1946: no se leyeron.

### Puente de la Unión (Puente Nuevo)

`puente:union` · puente · sin fecha de apertura: **pendiente**, no ausente, en los cortes del sitio.

**Nombres:** «Puente de la Unión» (¿?–¿?) [4]; «Puente Nuevo» (¿?–¿?) [9] [10].

| Fecha | Qué | Afirmación | Cita | Certeza | Fuente |
|---|---|---|---|---|---|
| 1835 | Obra | Segundo puente sobre el Caroata, de hacia 1835; el pueblo lo llamaba Puente Nuevo | «el segundo puente que se construyó sobre el Caroata, aproximadamente en el año de 1835… lo bautizaron con el nombre de Puente de la Unión… el pueblo… lo había llamado Puente Nuevo» | dudosa | [19] |

**No se pudo documentar:**

- Una fuente con referencias para la fecha de hacia 1835.
- Que el «de la Unión» de 1843 sea el «Puente Nuevo» de 1889 y 1936 sale de la posición y de una crónica.
- Luz, ancho, estribos y material medidos: los planos dan el cruce, no la obra.
- Cómo lo dibujan los planos de 1911 y 1946: no se leyeron.

## Fuentes

| N.º | Clase | Documento | Enlace |
|---:|---|---|---|
| 1 | secundaria con referencias | 2008 | <https://revistadeindias.revistas.csic.es/index.php/revistadeindias/article/download/657/728> |
| 2 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Puente_de_Carlos_III_(Caracas)> |
| 3 | crónica sin referencias | sin fecha; consultada el 2026-11-28 | <https://web.archive.org/web/20160514075227/http://www.abrebrecha.com/articulos.php?id=64627> |
| 4 | plano de época | sin fecha; consultada el ¿? | <https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas_(NYPL_b13925947-5382478).tiff> |
| 5 | crónica sin referencias | sin fecha; consultada el 2026-11-28 | <https://www.eluniversal.com/caracas/53014/puentes-mas-antiguos-de-caracas-sobreviven-al-olvido> |
| 6 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Juan_Domingo_del_Sacramento_Infante> |
| 7 | crónica sin referencias | sin fecha; consultada el 2026-11-28 | <https://haimaneltroudi.com/antiguos-puentes-de-caracas-referencias-de-su-historia/> |
| 8 | pintura de época | 1845 | <https://commons.wikimedia.org/wiki/File:Paisaje_de_Caracas_con_viaducto_y_puente_de_la_Trinidad_(1844-45)_Ferdinand_Bellerman.JPG> |
| 9 | plano de época | 1889 | <https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas,_levantado_en_1889_vajo_la_direccion_-_del_general_don_Vicente_S._Mestre_-_btv1b53027837n.jpg> |
| 10 | plano de época | 1936 | <https://archive.org/details/WCWdb_18053> |
| 11 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Quebrada_Caroata> |
| 12 | crónica sin referencias | 2011 | <https://mariafsigillo.blogspot.com/2011/06/los-puentes-punceres-san-pablo-y.html> |
| 13 | crónica sin referencias | 2011 | <https://mariafsigillo.blogspot.com/2011/04/esquina-de-punceres.html> |
| 14 | crónica sin referencias | 2009 | <https://venelib-antao.blogspot.com/2009/11/historia-de-la-parroquia-la-candelaria.html> |
| 15 | terciaria | sin fecha; consultada el 2026-11-28 | <https://es.wikipedia.org/wiki/Puente_Anauco> |
| 16 | crónica sin referencias | sin fecha; consultada el 2026-11-28 | <https://web.archive.org/web/20160514114329/http://www.abrebrecha.com/articulos.php?id=240132> |
| 17 | crónica sin referencias | sin fecha; consultada el 2026-11-28 | <https://web.archive.org/web/20230225035401/https://laguiadecaracas.net/51710/el-historico-puente-anauco/> |
| 18 | secundaria con referencias | sin fecha; consultada el 2026-11-28 | <https://saber.ucv.ve/jspui/bitstream/10872/1862/1/tesis%20San%20Pablo.pdf> |
| 19 | crónica sin referencias | 2011 | <https://venelib-antao.blogspot.com/2011/05/esquina-el-quebradoesquina-de-puente.html> |
