# Trinidad en 1772 y Plaza Bolívar en 1843 — matriz documental del issue #268

**Estado:** documento de auditoría (issue [#268](https://github.com/grunch/caracas/issues/268), índice #242).
No cambia código, geometría ni datos generados. Fuentes abiertas y leídas el **28-11-2026**; la sección
[Qué se verificó y qué no](#qué-se-verificó-y-qué-no) dice cómo se leyó cada una.

**Alcance decidido por el responsable** ([comentario del 27-11-2026](https://github.com/grunch/caracas/issues/268#issuecomment-7228894901)
en el issue): la fase «en obras» de la Trinidad en 1772 **no se modela**; el hito `panteon` sigue naciendo en 1843.
El nombre de la plaza quedó corregido en el [PR #280](https://github.com/grunch/caracas/pull/280). De este issue
quedaba la matriz, que es este documento.

## Cómo leer las matrices

Cada afirmación lleva su fuente (`F1`…`F14`, detalladas [abajo](#fuentes-por-afirmación)) y el tipo de evidencia:

| Sigla | Tipo de evidencia |
|---|---|
| **M** | Material: se ve en un plano o en una imagen de época, mirada para esta auditoría |
| **D** | Documental de época o casi (impreso de 1900 con actos fechados, texto del plano de 1843) |
| **S** | Secundaria: artículo o página que resume o transcribe; no se vio el documento original |
| **I** | Interpretación de este proyecto (medidas nominales, forma, elección de fecha) |

«Sin fuente» y «desconocido» son respuestas válidas: no se rellena ninguna casilla por cercanía.

## Ubicación y cobertura

Anclas en **píxeles del mosaico de 1936** (0,5 m/px), no latitud/longitud ni perímetros medidos.

| Hito | Ancla (x, y) | Recinto usado | De dónde sale | Épocas con geometría |
|---|---|---|---|---|
| `panteon` | (9395, 5305), eje (0,118; −0,993) | 62 × 26 m (base y escalera incluidas); nave nominal 23 × 55 m | Rótulo del plano de 1936; medidas **I** (`src/hitos/datos/panteon.js`: «aproximadas», «sin levantamiento») | 1843, 1889, 1911, 1936 y 1946 (la de 1936 sigue) |
| `plaza-bolivar` | (8964,25; 6834,5) | 86 × 82 m | Centro de las cuatro esquinas del plano de 1936 (Principal, La Torre, Las Monjas, Las Gradillas); medidas **I** | 1772 y 1843 (mercado); 1889 a 1946 (jardín y estatua) |

Cobertura de los planos por época, para estos dos lugares:

| Época | Plano | Trinidad / Panteón | Plaza |
|---|---|---|---|
| 1772 | «Exato mapa», AGI (F1) | **M**: cuerpo rojo (construido) con un recuadro blanco y el signo de iglesia; sin rótulo | **M**: manzana gris sin edificar, con el borde de trazos; sin rótulo (ver [Plaza, punto 6](#plaza)) |
| 1843 | Jesurún, facsímil NYPL (F10) | Leyenda «C La Trinidad» (transcripción del repo); el texto al pie cuenta «la Trinidad» entre las plazas | Texto al pie: «la plaza Bolívar, Catedral, …» |
| 1889 | Mestre, BnF (F11) | «22 Panteón nacional» (cita del repo, no releída aquí) | «Plaza Bolívar» (cita del repo, no releída aquí) |
| 1911, 1936, 1946 | Razetti; DCN | Rótulos citados en `src/marcas-datos.js`; fuera de las épocas del issue | Ídem |

## Matriz A — Santísima Trinidad / Panteón Nacional

| Elemento o fase | Proyecto | Obra | Apertura | Reforma o fin | Evidencia | En el sitio |
|---|---|---|---|---|---|---|
| **A1 · Templo colonial** | Idea llevada al prelado en 1740; licencia el 23-7-1744 (F3, F8 · S) | Empieza el 15-8-1744 (F3, F8 · S); el 5-8-1744 según F4 (S). Infante muere en 1780 (F3 · S) | Inaugurada en 1781 (F6 · S); «inaugurada en 1781 y consagrada en 1783» (F5 · S); bendecida el 15-7-1783, «inaugurada en 1783» (F8 · S) | Destruida parcialmente por el terremoto de 1812 (F5, F6, F8 · S; F10 · D solo para el terremoto) | Sin imagen del templo entero. Ver A2 | No modelado como templo entero en ninguna época |
| **A2 · Estado el 2-8-1772** | — | «Toda de calicanto y mampostería, cubierta de bóveda», tres naves, quince altares previstos, tres puertas «hacia el mediodía», «dos torres campanarios a los lados, todavía sin concluir», sacristía abovedada y un corredor «de tabla y teja» (F3, F4 · **S**: transcripción editorial atribuida a la visita de Mariano Martí; el manuscrito no se vio) | — | — | Plano de 1772 (F1, F2 · **M**): cuerpo rojo de unos 75 × 75 m con el signo de iglesia en el borde sur, a unos 35 m del ancla del hito | **No modelado** (decisión del responsable). Marca y ficha lo declaran |
| **A3 · Ruinas (1812–1874)** | Proyecto de fachadas de José Gregorio Solano, 1853–1858 (F5 · S) | Reconstrucción lenta «con las limosnas de los fieles» (F5, F6 · S). Capilla modesta junto a las ruinas, donde pasaron la noche del 16-12-1842 los restos de Bolívar (F8 · S; F6 dice «en esta iglesia») | — | — | Bellermann, hacia 1842–1845 (F14 · **M**): fachada en pie, frontón de volutas, naves sin techo, escalinata | Época 1843: ruinas según Bellermann. La capilla contigua no se representa |
| **A4 · Panteón neogótico** | Decreto del 27-3-1874 (F5, F6, F8 · S) | Obras de Churión, Hurtado Manrique, Soriano y García (F5 · S) | Inaugurado el 28-10-1875 (F4, F5, F6 · S). Restos de Bolívar trasladados el 28-10-1876 (F9, p. 10 · **D**; F5 · S). F8 da 1876 como inauguración | — | Lessmann, «ca. 1885» (F12 · M) | Época 1889: dos agujas y rosetón |
| **A5 · Reforma de Chataing** | Concurso de 1910 (F5, F7 · S) | — | Concluida en 1911 (F5, F7 · S) | — | Alzado del concurso y foto de la obra (F5, F7 · M, vistas en el estudio previo) | Época 1911 |
| **A6 · Reforma de Mujica Millán** | Ordenada en 1927 (F5 · S) | Dirigida con Pardo Stolk, Ayala y Salas (F5 · S) | Inaugurada en 1930 (F5 · S); reinaugurado el 17-12-1930 (F8 · S) | — | Collage de la reforma (F5 · M, visto en el estudio previo) | Épocas 1936 y 1946 |

Hecho vecino, fuera del alcance del issue pero útil para 1772: el **puente de la Trinidad** sobre el Catuche tuvo
plano en 1770 (aprobado el 27-8-1770 según F8) y se terminó en 1776 (F3, F8 · S). En 1772 estaría en obra; el sitio
solo lo menciona en 1843, por la pintura de Bellermann.

## Matriz B — Plaza Mayor / Plaza Bolívar

| Elemento | Proyecto o decisión | Obra | Apertura o vigencia | Reforma o fin | Evidencia | En el sitio |
|---|---|---|---|---|---|---|
| **B1 · Nombre** | Acuerdo de la Diputación Provincial de Caracas del 10-12-1842: «dio el nombre de Plaza Bolívar, á la de Catedral» (F9, p. 12 · **D**) | — | 1843: el texto al pie del plano la cuenta como «la plaza Bolívar, Catedral» (F10 · **D**). Decretos del 3 y 4-3-1869: «la plaza que lleva su nombre», «la hoy plaza Bolívar» (F9, p. 13 · D) | — | El plano de 1772 **no rotula** la plaza (F1 · M) | 1772 «Plaza Mayor»; desde 1843 «Plaza Bolívar» (PR #280) |
| **B2 · Mercado** | Desconocido | Desconocido | Grabado con el pie «El Mercado de Caracas en 1852» y Pissarro, 1852–1854 (F14 · M) | Ya no se ve en la foto de «1866» (procedencia débil) ni en la de Lessmann de hacia 1870 (F14 · M). **Fecha de retiro: desconocida** | Indicio indirecto: Lessmann fotografió el «Mercado de San Jacinto» en 1865 (F13 · M, solo el registro del archivo) | Mercado en 1772 y 1843 (`MERCADO = {nace: 1, muere: 3}`) |
| **B3 · Estatua ecuestre** | Ordenada el 10-12-1842, «no se llevó á cabo»; decretos del 3 y 4-3-1869, tampoco; decreto de Guzmán Blanco del 18-11-1872 (F9, pp. 12–13 · **D**) | Modelada sobre la de Lima (F9, p. 13 · D) | **Inaugurada el 7-11-1874** (F9, p. 13 · **D**) | — | Foto «1874» con la estatua y verja baja (F14 · M, procedencia débil) | Desde 1889 (`JARDIN = {nace: 3}`) |
| **B4 · Jardín, verja y faroles** | Desconocido | Hacia 1870, plaza en obra con arbolitos cercados (Lessmann); febrero de 1872, canteros cercados (Spence) (F14 · M) | Hacia 1880 ya es jardín arbolado (F14 · M, procedencia débil) | — | Fotos de la serie 1866–1900 | Desde 1889 |
| **B5 · Piso en damero** | Desconocido | Desconocido | Se ve en la foto de «~1900» (F14 · M, procedencia débil) | — | — | 1911, 1936 y 1946 |

## Fuentes por afirmación

| N.º | Fuente | Qué sostiene | Cómo se leyó |
|---|---|---|---|
| F1 | «Exato mapa de la ciudad de Caracas», AGI, MP-VENEZUELA,174. [PARES](https://pares.cultura.gob.es/ParesBusquedas20/catalogo/description/26112); ficha `fuentes/mapas/1772-pares-agi-exato-mapa/` | Fecha de creación 1772-07-09; remitido por Juan Vicente de Bolívar al gobernador Agüero como justificante de una propuesta sobre alcabalas; «Signos convencionales»; hoja de 37,5 × 41 cm | Registro de PARES abierto; original local mirado entero y en el recorte calzado |
| F2 | Calce del plano de 1772 sobre 1936: `tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json` | 170 puntos; residuo «dejando uno fuera» RMS 18,73 m, p90 21,66 m, máximo 145,22 m | Archivo del repo y derivado local `fuentes/derivados/1772/calzado.tif` (no versionado) |
| F3 | Carlos Alfredo Marín, [«La arquitectura de un pardo en la Caracas colonial»](https://memoriasdevenezuela.wordpress.com/2018/07/27/la-arquitectura-de-un-pardo-en-la-caracas-colonial/), *Memorias de Venezuela*, 27-7-2018; recuadro «El visto bueno de un visitante ilustre» ([imagen](https://memoriasdevenezuela.wordpress.com/wp-content/uploads/2018/07/ccs10.jpg)) | Idea en 1740, licencia del 23-7-1744, inicio el 15-8-1744, muerte de Infante en 1780; puente: plano de 1770, concluido en 1776; cita atribuida a Martí, 2-8-1772 | Artículo y recuadro leídos completos |
| F4 | Omar Pérez, [«El obrero que echó las bases del Panteón Nacional»](https://lainventadera.com/2026/09/19/el-obrero-que-echo-las-bases-del-panteon-nacional/), *La Inventadera*, 19-9-2026 | La misma cita de la visita de 1772, con remisión a Edgar Pardo Stolk, *El Panteón Nacional* (Ediciones del Ejecutivo, 1973), pp. 26–27; inicio el 5-8-1744; fachada neogótica inaugurada el 28-10-1875 | Artículo leído; **el libro de Pardo Stolk no se vio** |
| F5 | Fundación Arquitectura y Ciudad, [«Algo más sobre la Postal n.º 191»](https://fundaayc.com/2019/12/15/algo-mas-sobre-la-postal-no-191/), 15-12-2019 | 1744–1783, 1781/1783, 1812, 1842, Solano 1853–1858, decreto del 27-3-1874, 28-10-1875, 28-10-1876, concurso de 1910, 1911, 1927, 1930 | Leída; cita a F6 y a venezuelatuya.com (esta última no abierta) |
| F6 | IAM Venezuela, [«Panteón Nacional»](https://iamvenezuela.com/2016/05/panteon-nacional/), mayo de 2016 | «Construida entre 1744 y 1783»; «inaugurada finalmente en 1781»; 1812; 1842; decreto de 1874; 28-10-1875 | Leída |
| F7 | Fundación Arquitectura y Ciudad, [«1910 • Remodelación integral del Panteón Nacional»](https://fundaayc.com/2019/01/01/1910-remodelacion-integral-del-panteon-nacional/) | Concurso de 1910, proyecto de Chataing, trabajos concluidos en 1911 | Leída |
| F8 | Cámara de Caracas, [«Biografía del Panteón Nacional»](https://camaradecaracas.com/la-camara-caracas-y-sus-historias/cronicas-de-la-ciudad/biografia-del-panteon-nacional/) | 1740; 23-7-1744; 15-8-1744; puente aprobado el 27-8-1770; bendición el 15-7-1783; capilla junto a las ruinas; 16-12-1842; decreto del 27-3-1874; 28-10-1876; 17-12-1930 | Leída. Sin autor; declara dos fuentes: Pardo Stolk, «El Panteón Nacional», en *Centenario del Panteón Nacional* (OCI, 1975), pp. 167–204, y Lucas Manzano, «La Capilla de la Trinidad», *Elite*, 2-4-1937. **Ninguna de las dos se vio** |
| F9 | Manuel Landaeta Rosales, *Grandes honores acordados al Libertador Simón Bolívar*, Caracas, Imprenta Bolívar, 1900. [Internet Archive](https://archive.org/details/grandeshonoresac00land) ([p. 12](https://archive.org/details/grandeshonoresac00land/page/12/mode/2up)) | p. 10: traslado de los restos al Panteón, 28-10-1876. p. 12: acuerdo del 10-12-1842 (nombre y estatua no ejecutada). p. 13: decretos de 1869; decreto del 18-11-1872; inauguración del 7-11-1874 | Texto OCR del ejemplar leído en esas páginas. Es una **lista cronológica** de actos, no el texto de cada acto |
| F10 | «Plano topográfico de la Ciudad de Carácas», Jesurún, 1843; facsímil de Müller i Stapler. [Commons / NYPL](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas_(NYPL_b13925947-5382478).tiff); transcripción en `specs/auditoria-1843/leyenda.json` | Leyenda «C La Trinidad»; texto al pie: terremoto de 1812, restos trasladados el 17-12-1842, «8 plazas que son la plaza Bolívar, Catedral, Candelaria, Sn Pablo, la Trinidad, San Jacinto, San Lázaro, la Pastora i la de San Juan» | Licencia comprobada en Commons; el texto se leyó en la **transcripción del repo** (T81), no otra vez sobre la lámina |
| F11 | Plano de Mestre, 1889. [Commons / BnF](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas,_levantado_en_1889_vajo_la_direccion_-_del_general_don_Vicente_S._Mestre_-_btv1b53027837n.jpg) | «22 Panteón nacional», «Plaza Bolívar» | Licencia comprobada en Commons; rótulos según `src/marcas-datos.js`, **no releídos** |
| F12 | El Archivo, [«Panteón Nacional»](https://elarchivo.org/producto/panteon-nacional/), Federico Lessmann, registro 27613 | Fotografía del Panteón neogótico; la página dice «Año: ca. 1885» | Registro leído; la imagen no se descargó |
| F13 | El Archivo, [«Mercado de San Jacinto»](https://elarchivo.org/producto/mercado-de-san-jacinto/), Federico Lessmann | Fotografía estereoscópica fechada en 1865 | Solo el registro |
| F14 | Fichas de `fuentes/imagenes/` (inventario [abajo](#referencias-visuales)) | Lo que muestra cada imagen de la plaza y de la Trinidad | Fichas del repo; licencias de las de Commons vueltas a comprobar por su API |

## Contradicciones y datos desconocidos

### Trinidad

1. **«Iniciado» no es «terminado», pero tampoco «solo cimientos».** El issue advierte que el templo no debe darse
   por terminado en 1772. La cita atribuida a Martí (F3, F4) añade que tampoco era una obra rasa: templo
   abovedado, de tres naves, con fachada y dos torres sin concluir. Es
   evidencia **secundaria**: dos publicaciones la reproducen (una remite a Pardo Stolk, 1973); nadie en este proyecto
   vio el libro ni el manuscrito de la visita. Las dos transcripciones difieren en detalles («campanarios» /
   «campanarias»; la de F4 corta antes del corredor de tabla y teja). Tampoco coincide la edición de Pardo Stolk:
   F4 cita un libro de 1973 (Ediciones del Ejecutivo); F8, un capítulo de 1975 (OCI, pp. 167–204).
2. **Julio contra agosto.** El plano (F1) es del 9-7-1772; la visita, del 2-8-1772. No son el mismo testimonio y el
   plano no dice nada del avance: marca la Trinidad con el **mismo signo** que las demás iglesias. Además el plano
   acompañaba una propuesta sobre alcabalas: no es un levantamiento de edificios.
3. **Ubicación.** En el plano calzado, el signo queda a unos 35 m del ancla del hito (unos 20 m al este y 29 m al
   sur; medido a ojo sobre un recorte). Es del orden del error del calce (F2: RMS 18,73 m; p90 21,66 m), así que
   **no prueba** que el ancla esté mal ni bien. El cuerpo rojo (unos 75 × 75 m) es una mancha convencional, no una
   huella: no da la planta de 23 × 55 m, que sigue siendo **I**.
4. **Fecha de apertura.** 1781 (F6), 1781 y consagración en 1783 (F5), o bendición el 15-7-1783 (F8). El sitio dice
   «inaugurada en 1781» sin mencionar la discrepancia. Ninguna de las tres fuentes cita un documento.
5. **Inicio de la obra.** 15-8-1744 (F3, F8) contra 5-8-1744 (F4).
6. **Infante.** Nacido hacia 1700 según F3 (40 años en 1740, muere a los 80 en 1780); «(1710-1780)» según F6.
7. **Inauguración del Panteón.** 28-10-1875 (F4, F5, F6) contra 28-10-1876 (F8). F9 (p. 10), de 1900, fecha en
   1876 el **traslado de los restos**, no la inauguración: F8 parece juntar los dos actos. El sitio usa 1875.
8. **Fecha de la foto de Lessmann.** El sitio la cita como «circa 1885–1900»; el registro de El Archivo (F12) dice
   hoy «ca. 1885» y no muestra ese rango.
9. **1843: ¿ruina sola o ruina con capilla?** F8 habla de una capilla modesta junto a las ruinas en 1842; F6 dice
   que los restos pernoctaron «en esta iglesia». Bellermann dibuja ruinas; a la izquierda de su dibujo hay un arco
   que el estudio previo tomó por el arco efímero de 1842 (**I**). La capilla no tiene imagen identificada.
10. **Desconocido:** alturas, grado de avance de cada torre, ventanas, colores y distribución de la sacristía en
    1772; la forma del templo terminado (1781–1812); qué significa exactamente el recuadro blanco del plano.

### Plaza

1. **Nombre en 1772.** El sitio la llama «Plaza Mayor». El plano de 1772 no rotula la plaza (ni ningún templo:
   solo las alcabalas, el Calvario, «Blanco» y los rumbos). F9 dice que en 1842 era «la de Catedral». El nombre «Plaza Mayor»
   en 1772 queda **sin fuente de época en el repo**; no se propone cambiarlo sin una.
2. **«La plaza Bolívar, Catedral» en 1843.** El texto del plano anuncia ocho plazas y, contando cada nombre por
   separado, salen nueve. Leyéndolo como una sola plaza con dos nombres salen ocho, y coincide con F9. Es una
   **interpretación** de una transcripción que el propio repo marca como texto corrido, sin lectura por entrada.
3. **Texto del acuerdo de 1842.** F9 es una lista de honores publicada en 1900 que resume el acto y da su fecha;
   **el texto literal del acuerdo de la Diputación Provincial no se obtuvo**. El issue hablaba de un «decreto»; la
   fuente dice que fue la Diputación Provincial y no nombra el tipo de acto: el sitio lo llama «acuerdo».
4. **Nombre y estatua son hechos distintos, y hay 32 años entre ellos.** La estatua se ordenó tres veces (1842,
   1869, 1872) antes de inaugurarse el 7-11-1874 (F9). El sitio ya los separa (PR #280).
5. **Retiro del mercado: desconocido.** El sitio dice «hacia 1865» por la fecha de fotos de procedencia débil. Lo
   único firme es el intervalo: mercado en 1852–1854 (Pissarro), plaza sin mercado hacia 1870 (Lessmann).
6. **La plaza en 1772: no hay vista, pero el plano dibuja algo.** El mercado de esa época se modela con el grabado
   de 1852, ochenta años posterior: es una **extrapolación declarada** en `plaza-bolivar.js`. En el original del
   plano (F1 · **M**) la plaza es una manzana gris, sin el rojo de lo construido, con trazos gruesos discontinuos en
   tres de sus lados (oeste, sur y norte; el plano tiene el norte a la derecha), una línea fina de puntos en el lado
   este, el de la Catedral, cuadritos rojos en tres esquinas y una figura roja semicircular a mitad del lado norte.
   Que eso sean el cerco o las galerías del mercado es **interpretación**: el plano no trae leyenda de signos y
   `plaza-bolivar.js` dice «no hay imagen de 1772» sin mencionar este dibujo.
7. **Fechas de las fotos de monedasdevenezuela.com y runrun.es** (1866, 1874, ~1880, ~1900): las dio quien las
   aportó; sin autor ni archivo de origen.

## Lo implementado frente a la evidencia

| Asunto | Qué hace hoy `main` | Qué dice la evidencia | Veredicto |
|---|---|---|---|
| Trinidad en 1772 | Sin hito ni marca: `panteon` nace en la época 2 (`src/hitos/datos/panteon.js`); la marca y la ficha dicen que las obras de 1772 no se modelan | Templo avanzado pero sin terminar (S); forma sin fuente | **Coherente y declarado.** No se modela por decisión del responsable: sin alzado ni alturas documentadas, cualquier volumen sería inventado |
| Trinidad en 1843 | Ruinas según Bellermann | Bellermann (M) | Coherente. La capilla contigua (S, una sola fuente) no se representa |
| Panteón en 1889, 1911 y 1936 | Tres fachadas distintas, con vidas excluyentes | F5, F7, F12 | Coherente. Fechas de las fuentes: 1875, 1911, 1930 |
| Nombre de la plaza | «Plaza Mayor» en 1772; «Plaza Bolívar» desde 1843 (`src/marcas-datos.js`, `src/fichas-datos.js`) | F9, p. 12; F10 | **Corregido en #280.** Prueba: `tests/unit/prioridades-cronologia.test.js`, `tests/unit/marcas.test.js` |
| Apariencia de la plaza en 1843 | Mercado y suelo de tierra; sin jardín ni estatua | Pissarro, grabado de 1852 | Coherente. Prueba: `tests/unit/hitos.test.js` («mercado en 1772 y 1843, jardín con estatua desde 1889») |
| Estatua | Desde 1889 | Inaugurada el 7-11-1874 (F9, p. 13) | Coherente; la fuente citada en el código es más débil que la disponible |

### Correcciones listas para código

Son cambios de **texto y de cita**; ninguno toca geometría, vidas de hitos ni datos generados, y ninguno crea una
época. No se aplicaron en el PR de esta matriz porque esos archivos estaban en uso por otros PRs abiertos; se
aplicaron después, en un PR aparte (rama `fix/citas-268`), con `tests/unit/citas-268.test.js`.

1. `src/hitos/datos/plaza-bolivar.js`, `verificar`: cambiar «la estatua se puso en 1874 (fechas de las fotos, a
   verificar)» por la fecha documentada: decreto del 18-11-1872, inauguración el 7-11-1874 (F9, p. 13). El retiro del
   mercado «hacia 1865» sigue «a verificar».
2. `src/fichas-datos.js`, `plaza-bolivar`, texto de 1889: «que las fotos fechan en 1874» → «inaugurada el 7 de
   noviembre de 1874». En `src/marcas-datos.js`, sumar la p. 13 de F9 a la `fuente` de la marca.
3. `src/marcas-datos.js` (`panteon.dudas`) y `src/hitos/datos/panteon.js` (`verificar`): «inaugurada en 1781» →
   «inaugurada en 1781 según unas fuentes y bendecida en 1783 según otras», con F5, F6 y F8 en la `fuente`.
4. Fecha de la foto de Lessmann del Panteón: «circa 1885–1900» → «ca. 1885», como la da hoy F12. Aparece en
   `src/hitos/datos/panteon.js`, `src/marcas-datos.js`, `specs/08-panteon-por-epocas.md` y
   `fuentes/imagenes/README.md`. Sigue sirviendo para 1889.
5. `src/marcas-datos.js`, `plaza-bolivar`: añadir `dudas` para 1772 («el plano de 1772 no rotula la plaza; en 1842
   se la llamaba también "de Catedral"»), como ya se hace con otras marcas de esa época.
6. `src/hitos/datos/plaza-bolivar.js`, `verificar`: «no hay imagen de 1772» → «no hay vista de 1772; el plano de
   ese año dibuja la plaza sin edificar y con el borde de trazos, sin leyenda que los explique».

Pruebas que acompañarían a 1–6: las existentes siguen valiendo (nombres por época, mercado y jardín, vidas del
Panteón); 2 y 3 piden ajustar las expresiones de `tests/unit/prioridades-cronologia.test.js` si cambian las frases.

**No queda lista para código** ninguna variante de la Trinidad en 1772, ni la capilla de 1842, ni un cambio de ancla.

## Referencias visuales

Ninguna imagen se añade en este PR. «Publicada» = ya está en el paquete de fotos del sitio, con dominio público
establecido en su ficha.

| Imagen (`fuentes/imagenes/…` o enlace) | Qué muestra | Fecha | Autor y procedencia | Licencia | Uso |
|---|---|---|---|---|---|
| `1843-commons-ruinas-de-la-trinidad-bellermann` | Ruinas de la Trinidad | Hacia 1842–1845 | Ferdinand Bellermann; Galería de Arte Nacional, vía [Commons](https://commons.wikimedia.org/wiki/File:Ruinas_de_la_iglesia_de_la_Sant%C3%ADsima_Trinidad_en_Caracas_-_Ferdinand_Bellermann.JPG) | Dominio público | Publicada |
| [Recuadro `ccs10.jpg`](https://memoriasdevenezuela.wordpress.com/wp-content/uploads/2018/07/ccs10.jpg) (F3) | Cita atribuida a Martí sobre una reproducción del dibujo de Bellermann | Publicación de 2018; el dibujo es de 1842–1845, **no** una vista de 1772 | *Memorias de Venezuela* | **No establecida** | Solo enlace; no se incorpora |
| [Lessmann, «Panteón Nacional»](https://elarchivo.org/producto/panteon-nacional/) (F12) | Panteón neogótico | «ca. 1885» | Federico Lessmann; El Archivo, reg. 27613 | **No establecida** (el archivo ofrece adquirir derechos de uso) | Solo enlace |
| Imágenes de [F5](https://fundaayc.com/2019/12/15/algo-mas-sobre-la-postal-no-191/) y [F7](https://fundaayc.com/2019/01/01/1910-remodelacion-integral-del-panteon-nacional/) | Alzado de Chataing, obra de 1911, reforma de 1930 | 1910–1930 | Fundación Arquitectura y Ciudad, con procedencias varias | **No establecida** | Solo enlace |
| `1852-facebook-mercado-plaza-mayor` | El mercado en la plaza | Pie impreso «1852» | Autor y obra sin identificar | **Desconocida**; sin fuente estable | Referencia interna; no se publica |
| `1853-commons-plaza-mayor-pissarro` | El mercado, con la Catedral | 1852–1854 | Camille Pissarro; [Commons](https://commons.wikimedia.org/wiki/File:Plaza_Mayor,_Caracas_-_Camille_Pissarro.jpg) | Dominio público | Publicada |
| `1866-monedas-plaza-bolivar` | Plaza de tierra, sin estatua | «1866», a verificar | Sin autor; monedasdevenezuela.com | **Desconocida** | Referencia interna |
| `1867-commons-catedral` | Plaza de tierra y Catedral | 1867 según Commons | Autor desconocido; [Commons](https://commons.wikimedia.org/wiki/File:Catedral_de_Caracas_1867.jpg), crédito a un foro | Dominio público; procedencia débil | Publicada |
| `1870-commons-plaza-mayor-y-catedral-lessmann` | Plaza en obra, sin mercado ni estatua | Hacia 1870 | Federico Carlos Lessmann; Zeno.org, vía [Commons](https://commons.wikimedia.org/wiki/File:Lessman,_Federico_Carlos_-_Plaza_Major_mit_Kathedrale_(Zeno_Fotografie).jpg) | Dominio público | Publicada |
| `1872-commons-fiesta-en-la-plaza-bolivar-spence` | Fiesta nocturna; canteros cercados, sin estatua | Febrero de 1872; impreso en 1878 | James Mudie Spence, *The Land of Bolivar*; [Commons](https://commons.wikimedia.org/wiki/File:Spence,_Land_of_Bolivar,_grabado_p.314.jpg) | Dominio público | Publicada |
| `1874-monedas-plaza-bolivar` | Estatua con verja baja | «1874», a verificar | Sin autor; monedasdevenezuela.com | **Desconocida** | Referencia interna |
| `1880-monedas-plaza-bolivar`, `1880-runrun-plaza-bolivar-a` y `-b` | Jardín arbolado, faroles | «~1880», a verificar | Sin autor; monedasdevenezuela.com, runrun.es | **Desconocida** | Referencia interna |
| `1900-monedas-plaza-bolivar` | Piso en damero | «~1900», a verificar | Sin autor; monedasdevenezuela.com | **Desconocida** | Referencia interna |
| `1910-commons-plaza-bolivar` | Estatua, faroles, árboles crecidos | 1910 | Autor desconocido; Archivo Fundación Fotografía Urbana, vía [Commons](https://commons.wikimedia.org/wiki/File:Plaza_Bol%C3%ADvar_de_Caracas,_1910_Autor_desconocido_Archivo_Fotograf%C3%ADa_Urbana.jpg) | Dominio público | Publicada |

Los planos: 1772, dominio público por antigüedad; PARES pide mencionar al Ministerio de Cultura y citar archivo,
signatura y URL (F1). 1843 y 1889, dominio público según Commons (F10, F11).

## Qué se verificó y qué no

**Verificado el 28-11-2026**

- Abiertas y leídas F1, F3 a F9, F12 y F13. De F9 se leyó el texto OCR de las pp. 10 a 13 del ejemplar de Internet
  Archive (Universidad de Carolina del Norte); la cita de la p. 12 que usa el sitio es correcta.
- El recuadro de F3 se leyó completo: confirma la cita y su atribución al 2-8-1772. Su ilustración es el dibujo de
  Bellermann (comparado con la copia de `fuentes/imagenes`).
- El original local del plano de 1772 se miró entero (no hay rótulos de plazas ni de templos), ampliado sobre la
  plaza, y en un recorte del raster calzado de 300 × 300 m alrededor del ancla del hito.
- Licencia, autor y fecha de las seis imágenes de Commons y de los planos de 1843 y 1889, por la API de Commons.
- El estado del código se leyó en `main` (`bbf7d94`).

**No verificado**

- El manuscrito o la edición de la visita pastoral de Martí, y el libro de Pardo Stolk (1973).
- El texto literal del acuerdo de la Diputación Provincial del 10-12-1842.
- Los PDF de *Memorias de Venezuela* n.º 56 (culturavenezuela.com, error 525) y de la compilación de CLACSO
  (403): siguen sin poder abrirse.
- Los rótulos de los planos de 1843 y 1889 no se releyeron sobre las láminas: se usan las transcripciones del repo.
- Las medidas tomadas sobre el recorte del plano de 1772 son a ojo, sobre un calce con 18,73 m de error RMS.
- Las fuentes que F5 y F6 citan a su vez (venezuelatuya.com y otras) no se abrieron.
- Ninguna fecha de las fotos de procedencia débil.
