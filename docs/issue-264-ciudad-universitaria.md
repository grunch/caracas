# Ciudad Universitaria en 1946: qué estaba construido (#264)

Revisión del 28-11-2026 sobre `main` 3163e0d. Los datos de esta página están en
`tools/geo/referencias/1946-ciudad-universitaria.json`; `tests/unit/ciudad-universitaria-1946.test.js` comprueba
su forma.

## Resultado

- En 1946 lo único documentado en obra es la **zona médica**: el Hospital Clínico y los institutos Anatómico,
  de Medicina Experimental y Anatomopatológico, con obra desde 1945, más el movimiento de tierras de 1944.
- **Ningún edificio consta como terminado en 1946.** De la Lavandería y de «Cirugía Experimental» no hay
  ninguna fecha, así que de esos dos no se puede afirmar nada. Los primeros que constan se completan en 1949; el hospital se inaugura en
  1954 y abre en 1956.
- **Ninguna fuente consultada describe el avance de cada edificio en 1946** (cimientos, estructura, pisos). Hay
  rangos de obra, gasto y cronogramas.
- El plano de 1946 no sirve para suplirlo: dibuja con el mismo relleno la Escuela Técnica Industrial, cuya obra
  es de 1949 a 1952.
- El mapa de 1946 muestra el recinto **en construcción, sin edificios**: una marca y una ficha nuevas. La
  reserva sin casas se amplía para cubrir todo lo que el plano dibuja, pero **eso no se ve hasta regenerar y
  publicar los datos**: el paquete actual todavía trae casas genéricas sobre la Escuela Técnica Industrial y la pista.

## Matriz por edificio

Ubicación: caja en píxeles de `fuentes/mapas/1950-archiveorg-plano-de-caracas-dcn/original.tif`
(x0, y0, x1, y1). El contorno de cada planta de trazo lleno y su centro en el mosaico están en el JSON.
**Estado en 1946:** *en obra* (una fuente da un rango de obra que incluye 1946; ninguna describe el avance),
*no construido* (las fuentes fechan la obra después), *anterior* (ya estaba en 1936) o *desconocido*.

| Elemento (rótulo del plano) | Caja en el plano | Trazo y planta | Proyecto | Obra | Estado en 1946 | Terminación u ocupación |
|---|---|---|---|---|---|---|
| Hospital Clínico | 10247, 7011, 10461, 7222 | Lleno, 13.130 m² | Licitación de estudios en 1942 y anteproyecto de Edgar Martin el 1-9-1943 [T]; «Project 1945–1947» [U p. 328] | «Construction 1945–1954» [U]. Contrato del 5-8-1944 y trabajos desde el 31-10-1944 [R p. 70]; enero de 1945 [S] | **En obra**, atrasada: el contrato se rescinde en marzo de 1946, con «el 20% de lo estipulado» ejecutado [T nota 163] | Inaugurado el 4-12-1954 [U, S]; abre el 16-5-1956 [RCM] |
| Inst. Anatómico | 10597, 6932, 10780, 7055 | Lleno, tres cuerpos, 3.780 m² | «Project 1945–1949» [U p. 352] | «Construction 1945–1952» [U]; banqueo en 1944 [R p. 70] | **En obra**; avance desconocido | El instituto se traslada en 1950 [RCM] |
| Inst. de Cirugía Experimental | 10615, 7130, 10796, 7258 | Lleno, tres cuerpos, 2.700 m² | Desconocido | Desconocida | **Desconocido** | Desconocida |
| Instituto Anatomopatológico | 10327, 6821, 10635, 6955 | Lleno, 5.580 m² | «Project 1945–1956» [U p. 388] | «Construction 1945–S/F» [U]; banqueo en 1944 [R p. 70] | **En obra**; avance desconocido | Completado en 1949 y ocupado en parte en 1950 [TX]; inauguración oficial el 4-12-1954 [U] |
| Instituto de Higiene | 9902, 6976, 10136, 7153 | Lleno, siete cuerpos, 4.490 m² | «Project 1939–1960» [U p. 397] | «Construction 1945–S/F» [U] | **En obra**; avance desconocido | Se concluye en 1951 [FAC] |
| Lavandería | 9706, 7004, 9815, 7102 | Lleno, dos cuerpos, 1.600 m² | Desconocido | Desconocida | **Desconocido** | Desconocida |
| Escuela Técnica Industrial | 10153, 7623, 10549, 7862 | Lleno, 9.500 m², con alas de trazo discontinuo | Maqueta en enero de 1944; plano de 1946 y perspectiva del 31-1-1947 [T pp. 199 y 206]; aulas, «Project 1948» [U p. 627] | «Construction 1949–1952» [U]; la evaluación de ICOMOS, en el mismo expediente, dice que empezó en 1947 | **No construida** | Aulas inauguradas en 1955 [U] |
| Pista ovalada, sin rótulo | 11699, 6814, 11921, 7143 | Lleno (anillo) | El Estadio Olímpico está en la maqueta de diciembre de 1944 [T p. 213]; proyecto de 1949–1950 [FAC] | Banqueo en 1944 [R p. 70]; estadio de 1950–1951 [FAC] | **No construido** el estadio; qué había en la pista, desconocido | Inaugurado el 5-12-1951 [FAC] |
| Casa de dos patios, sin rótulo | 11650, 6460, 11716, 6542 | Lleno | — | — | **Anterior**: es una de las casas de la «Hda. Ybarra» del plano de 1936 | El Instituto instaló sus oficinas «en una de las casas de dicho fundo» [S]; cuál, no consta |
| Barra al norte del hospital y barra al noreste, sin rótulo | 10324, 6944, 10431, 6972 · 11617, 6792, 11691, 6865 | Lleno, 890 m² cada una | Desconocido | Desconocida | **Desconocido** | — |
| Siete bloques radiales y un bloque curvo al noreste, sin rótulo | 11400, 6590, 11780, 6760 · 11480, 6740, 11640, 6810 | Discontinuo | Desconocido | Desconocida | **Desconocido** | — |
| Plantas al sur del hospital, sin rótulo | 10220, 7300, 10680, 7640 | Discontinuo | Desconocido | Desconocida | **Desconocido** | — |

Fuera del plano, y posteriores: el **Aula Magna y la Plaza Cubierta** (proyecto de 1950–1952, contrato del
28-11-1952, inauguración en marzo de 1954 [FAC, RCM]), la **Biblioteca Central** (inaugurada con el Aula Magna
[RCM]) y el **Jardín Botánico** (propuesto en 1944, inaugurado en 1958 [G]).

### Fuentes

| Sigla | Fuente |
|---|---|
| U | [Expediente de nominación UNESCO n.º 986](https://whc.unesco.org/uploads/nominations/986.pdf), fichas «Chronological data» por edificio. Son páginas escaneadas; se cita la página del PDF. El mismo PDF trae la evaluación de ICOMOS (*Advisory Body Evaluation*), que es texto |
| T | Roger Corbacho Moreno, *La Plaza Cubierta de la Ciudad Universitaria de Caracas (1953)*, tesis doctoral, UPC, 2001, [capítulo 5](https://www.tdx.cat/bitstream/handle/10803/6074/05CAPITOL5.pdf?sequence=6&isAllowed=y). Es la tesis que cita el issue; el enlace de tesisenred.net ya no resuelve |
| S | Ariadna Santacruz, [«Hitos en la gestación del proyecto de construcción de la CUC»](https://trienal.fau.ucv.ve/2008/documentos/cs/CS-8.pdf), Trienal FAU-UCV 2008. Cita las Memorias del MOP |
| R | Alejandro Rivas Correa, [tesis de grado sobre el Hospital Universitario, 1943–1956](https://saber.ucv.ve/jspui/bitstream/10872/24363/1/TESIS%20HISTORIA%20--%20RIVAS.pdf), UCV, 2024 |
| RCM | Leopoldo Moreno Brandt, [*Revista Centro Médico* 140(1)](https://www.revistacentromedico.org/storage/numbers/20/RCM_file.pdf), 2014 |
| TI | Marcelo Alfonzo Rosas, [*Tribuna del Investigador* 17(1)](https://www.tribunadelinvestigador.com/ediciones/2016/1/art-3/), 2016 |
| TX | Yolanda Texera Arnal, [«Anatomía y patología de la investigación en un instituto universitario»](https://revistaredes.unq.edu.ar/index.php/redes/article/download/778/817/2810), *Redes*. Cita actas del Consejo Universitario |
| G | María Isabel Giacopini, [*Tribuna del Investigador* 21(1)](https://saber.ucv.ve/ojs/index.php/rev_ti/article/download/19847/144814486175), 2020 |
| FAC | Fundación Arquitectura y Ciudad: [Instituto Nacional de Higiene](https://fundaayc.com/2017/04/30/1951%e2%80%a2-edificio-sede-del-instituto-nacional-de-higiene/), [Estadio Olímpico](https://fundaayc.com/2024/12/05/1951-se-inaugura-el-estadio-olimpico-de-la-ciudad-universitaria-de-caracas/), [Aula Magna](https://fundaayc.com/2020/03/01/tal-dia-como-hoy-24/) |

Leídas en línea el 28-11-2026. La página de la UNESCO que enlaza el issue (`whc.unesco.org/en/list/986/`)
responde 403 a la consulta automática; se usó el expediente.

## Cronología general

- **2-10-1943:** el Decreto 196 crea el Instituto de la Ciudad Universitaria [T, R, S].
- **9-12-1943:** el Estado compra la hacienda Ibarra [G]. La tesis habla de «terrenos expropiados» [T].
- **Enero de 1944:** la prensa publica el primer plano de conjunto, fechado 1943 [T p. 199].
- **1944:** «Las únicas obras acometidas fueron movimientos de tierra y drenajes del terreno» [T nota 163]:
  180.000 m³, calles, drenajes y un puente sobre el Guaire [R, de la Memoria del MOP de 1945].
- **Diciembre de 1944:** segunda versión del conjunto, en maqueta, ya con el Estadio Olímpico [T].
- **1945:** empieza la obra de la zona médica [U, S].
- **1946:** tercera versión del plano de conjunto [T p. 216]. En marzo se rescinde el contrato del hospital.
- **1949:** se completa el Anatomopatológico [TX]. **1954:** se inauguran el hospital y el Aula Magna.

## Lo que dibuja el plano de 1946

Recorte para repetir la lectura: caja `(9500,6250,12000,8250)`. Se lee «Ciudad Universitaria (en
construcción)», con centro en `(11230,7030)`, y siete rótulos de edificio. Las plantas de trazo lleno se
sacaron por color (el relleno de edificación) y se simplificaron a 3 px, unos 2 m. Las de trazo discontinuo y
las cajas se leyeron a ojo. Las áreas usan el calce de `tools/geo/gcp/1946-cuadricula.json` (RMS 2,07 m).

**Evidencia material:** las plantas, los rótulos y el trazo. **Interpretación:** todo lo demás. La hoja no trae
leyenda de signos, de modo que el trazo discontinuo no tiene significado declarado. Tampoco da alturas.

En el plano de 1936 el lugar es la **«Hda. Ybarra»**: unas casas sobre una loma al noreste y tablones de cultivo.
La casa de dos patios de 1936 sigue dibujada en 1946, a unos 8 m de su posición de 1936 (dentro del error de
los dos calces).

## Contradicciones y datos desconocidos

1. **El plano frente a la cronología.** La Escuela Técnica Industrial está dibujada con relleno y rótulo, pero
   su obra es de 1949–1952 [U], o empieza en 1947 según la evaluación de ICOMOS [U]. O el ejemplar, catalogado [1950?], se
   actualizó después de las fotografías, o el plano dibuja proyectos como si fueran edificios. En los dos casos,
   **el relleno de esta hoja no prueba que un edificio existiera en 1946**.
2. **Inicio de la obra del hospital:** 1943 [RCM], 31-10-1944 [R], enero de 1945 [S, T], 1945 [U].
3. **Apertura del hospital:** inaugurado el 4-12-1954 [U, S]; abierto el 16-5-1956 [RCM].
4. **Compra o expropiación** de la hacienda: las dos versiones aparecen [G, T].
5. **Anatomopatológico:** completado en 1949 [TX], inaugurado en 1954 [U].
6. **«Inst. de Cirugía Experimental».** Ninguna fuente fecha un edificio con ese nombre. El expediente de la
   UNESCO da para el Instituto de Medicina Experimental, en esa zona, «Construction 1945–1952» [U p. 346], y su
   director fecha el traslado en 1950 [TI]. Que sean el mismo edificio **no está verificado**.
7. **Desconocido:** el avance de cada edificio en 1946; las fechas de la Lavandería; la identidad de las barras,
   los bloques radiales y las plantas de trazo discontinuo; qué había en la pista ovalada; cuál era la casa
   principal de la hacienda; la primera piedra.

Lo que resolvería el punto 7: la Memoria del MOP de 1947–1948 y Silvia Hernández de Lasala, *En busca de lo
sublime* (1999), que no están en línea, o una fotografía aérea fechada. Una tesis reproduce aerofotografías de
1944 y 1949 del lugar (ver abajo); no hay ninguna de 1946.

## Comparación con lo implementado

Medido sobre los derivados regenerados tras #291 (`ciudad.pak` y `fuentes/derivados/1946/`), por el centro de cada techo.

| | En `main` | En este cambio |
|---|---|---|
| Hitos del campus | Ninguno | Ninguno |
| Marca y ficha | Ninguna. La nota de la época dice «La Ciudad Universitaria figura en construcción» | Marca «Ciudad Universitaria (en construcción)» en 1946, con ficha. Marca «Hacienda Ibarra» en 1936 |
| Reserva sin casas | Un polígono. Dentro quedan 18 techos, todos de 1936 (las casas de la hacienda) y ninguno nuevo | El mismo, más dos reservas |
| Escuela Técnica Industrial | Fuera de la reserva: `mapa_1946.py` levanta **28 casas nuevas** en los 5 bloques de su planta | Dentro de una reserva |
| Pista y bloques del noreste | Fuera en parte: **31 casas nuevas** en 6 bloques | Dentro de una reserva |

### Correcciones

1. **Hecha:** marca y ficha de la Ciudad Universitaria en construcción (1946) y de la hacienda Ibarra (1936).
2. **Hecha en la referencia, falta regenerar:** dos reservas en `tools/geo/referencias/1946-reservas.json`
   para que `mapa_1946.py` no levante casas sobre la Escuela Técnica Industrial ni sobre la pista. Los datos
   publicados no cambian hasta correr `npm run datos` (paso `mapa-1946` y los que dependen de él) y publicar.
   En seco, sobre los bloques ya derivados, las reservas nuevas excluyen 11 bloques y dejan de generarse 59 casas
   nuevas. Ninguna casa anterior cambia: una reserva solo impide casas nuevas.
3. **Bloqueada:** los volúmenes de la zona médica. Faltan el avance de cada edificio en 1946, las alturas y un
   estudio en Miraflores. Sin eso no se instala ningún modelo.
4. **No procede:** Aula Magna, Biblioteca, estadios y Jardín Botánico. Son posteriores.

## Referencias visuales

Ninguna se incorpora a `fuentes/imagenes/` ni al paquete de fotos: ninguna de las fechadas entre 1943 y 1950
tiene licencia establecida.

| Imagen | Fecha | Procedencia | Licencia |
|---|---|---|---|
| Plano DCN | Fotografías de 1946; edición [1950?] | Cartografía Nacional, vía Internet Archive | No declarada. Consulta local; no se publican recortes |
| Plano de conjunto de 1946 y esquemas de 1943, 1944, 1946 y 1949 | 1943–1949 | Tesis de Corbacho, pp. 200 y 216–217 | No declarada. Solo enlace |
| Maqueta de diciembre de 1944 | 1944 | Tesis de Corbacho, pp. 212–213, de la prensa | No declarada. Solo enlace |
| «Hacienda "Ibarra". Fotografía de 1944» | 1944 | Tesis de Corbacho, pp. 204–205 | No declarada. Solo enlace |
| Planos de conjunto de 1943, 1944 y 1947, y gráfico de avance del hospital en 1947 | 1943–1947 | Santacruz, figs. 5–8, de la Memoria del MOP | No declarada. Solo enlace |
| Aerofotografías de 1944 (misión B8) y 1949 (misión 1B8) | 1944 y 1949 | [Susan Valdivia, trabajo de grado, Universidad de Zaragoza, 2020](https://zaguan.unizar.es/record/96590/files/TAZ-TFG-2020-2034.pdf), fig. 27 | No declarada. Solo enlace |
| Planos por edificio | Dibujos posteriores | Expediente de la UNESCO | No declarada. Solo enlace |
| [Estadio Olímpico, 1951](https://commons.wikimedia.org/wiki/File:Estadio-olc3admpico-ciudad-unversitaria-1951.jpg) | 1951 | Commons, «un periódico caraqueño» | Commons la marca en dominio público; la base no está verificada. Es posterior a 1946 |

## Capturas

`docs/capturas/ucv-1946/`: el recinto desde arriba en las seis épocas, con los nombres a la vista, antes (`main`)
y después (`node tests/e2e/capturas-obras-1946.mjs`, `OBRA=ucv`). Cambian 1936 y 1946, por las marcas.
