# La iglesia de San Pablo, anterior al Teatro Municipal: etapas, huella e instalación (#246)

El templo del [issue #246](https://github.com/grunch/caracas/issues/246), con el patrón de los templos de
[#259](templos-259-integracion.md), [La Candelaria](candelaria-integracion.md) y
[Las Mercedes](la-merced-integracion.md). Tarea T82.SP del plan.

## Qué había y de dónde sale el modelo

En `main` (`27abd10`) el lugar tenía, antes de 1889, solo la marca «Iglesia y plaza de San Pablo» (la misma del
Teatro Municipal, con otro nombre: [PR #232](https://github.com/grunch/caracas/pull/232),
[nota](issue-97-1772.md)) sobre casas genéricas. El hito del teatro nace en 1889 y no se toca.

**No hay estudio en Miraflores**: `docs/integracion-caracas-teatro-municipal.md` solo dice que antes del teatro el
sitio era San Pablo. El modelo se hizo acá. A diferencia de los otros templos, **este no tiene contorno en el
plano de 1936** (se demolió en 1876), así que:

- el **lugar** sale del recuadro en blanco del plano de 1843 ([lectura](san-pablo-georreferencia.json));
- la **composición** sale de dos descripciones y de un plano de 1757, las tres reproducidas en la tesis de
  Tarím S. Gois C. (UCV, 2007);
- las **medidas** son una proporción puesta a escala, no una mensura: es el punto más débil y va dicho en todas
  partes. **El error puede llegar al 39 %** (ver «El largo y la escala»).

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = fuente secundaria que cita la primaria, o dos
que coinciden; **baja** = interpretación. «Gois» es Tarím S. Gois C., *Aproximación histórica al patrimonio
pictórico y escultórico colonial de la iglesia de San Pablo, primer ermitaño*, trabajo de grado, Escuela de Artes,
Universidad Central de Venezuela, enero de 2007 ([Saber UCV](https://saber.ucv.ve/jspui/handle/10872/1862)), con
la página impresa. «Landaeta» es *La antigua Calle del Comercio de Caracas* (1907),
[pp. 13–14](https://upload.wikimedia.org/wikipedia/commons/2/2d/La_antigua_Calle_del_Comercio_de_Caracas_%28IA_laantiguacallede00land%29.pdf).

| Etapa (hecho) | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1580 | La ciudad levanta el templo por el voto a san Pablo ermitaño en la epidemia de viruela; «databa desde 1580» | Oviedo y Baños en Gois, p. 2; Landaeta, p. 14 | media | — |
| 1590–1604 | Al lado funciona el Hospital Real (o de San Pablo), terminado en 1604 | Gois, pp. 3–4 | media | — |
| 1641 | El terremoto arruina la torre; se reedifica el templo «dándole mayor capacidad» | Gois, p. 2 (Manzano, Otaduy) | media | — |
| 1674, 1750 | Viceparroquia de la Catedral (4-7-1674); parroquia por la Real Cédula del 25-8-1750 | Gois, p. 3 (Terrero) | media | — |
| 1685–1693 | Hospicio de Nuestra Señora de la Caridad, «en edificio contiguo, pero independiente» | Gois, p. 5 (Marco Dorta) | media | — |
| 1757 | Plano de la iglesia, el Hospital Real y el Hospicio: plazuela al frente; cañón de la iglesia y capilla mayor; a su lado torre, capillas, baptisterio, antesala y sacristía; bodegones, cementerio y pasadizo al hospital | Plano de 1757 reproducido en Gois, pp. 4 y 9 (ilust. 1 y 5) | alta para la distribución; **sin escala legible** | de aquí salen las proporciones |
| 1771 | Fuente de piedra en el centro de la plaza (hasta 1845) | Landaeta, p. 13 | alta | **sin geometría** |
| 1772 | «Es de una nave, con una capilla al lado de la epístola, casi tan larga como la nave central… La puerta principal mira al norte, y está adornada con una media fachada de ladrillo. Al lado de esta fachada hay una torre o campanario de tres cuerpos. La referida nave menos principal, es más corta que la otra, por estar incluidos en los extremos de ella, la sacristía y la torre»; paredes de cal y canto, ladrillo y tapia; techo de tablas y tirantes cubierto de tejas | Visita de Martí según Ernesto Otaduy, *Las iglesias de la antigua Caracas*, p. 38, en Gois, p. 8 | media: Gois advierte que el texto publicado de Martí (t. 6, p. 14) solo dice «dos naves: una grande y otra pequeña» | nave de 41 × 10 m con la fachada al norte, nave menor de 6,5 m al oeste y **torre de tres cuerpos** junto a la fachada |
| 1772 | Símbolo de iglesia en la esquina sureste de la plaza | Plano de 1772, calce 18,7 m RMS | alta para la presencia | — |
| 1812 | «Cayó la torre sobre el coro y lo reventó… Todas las paredes desplomadas. Capilla mayor cuarteada… Sacristía arruinada» | Carta de Domingo Herrera al obispo Coll y Prat, en Gois, p. 24 | alta | — |
| 1838–1847 | Alameda en la plaza (1838), destrozada ese año; pila de mármol de 1847 a 1876 | Landaeta, p. 13 | alta | **sin geometría** |
| 1843 | Letra P «San Pablo»; recuadro en blanco de 23 × 27,5 m al sur de la plazuela | Plano de Jesurún de 1843 (`specs/auditoria-1843/leyenda.json`), calce 12,4 m RMS | alta para la presencia y el lugar | el mismo templo con la **torre de dos cuerpos** |
| s. XIX (sin fecha) | «De una sola nave con una modesta fachada de dos cuerpos. Dos medias columnas a cada lado, encuadraban el vano con arco de medio punto… El segundo cuerpo remataba en un frontispicio de forma triangular decorado con pináculos piramidales. En línea con la fachada, una maciza torre de dos cuerpos separaba la iglesia del hospital real» | Graziano Gasparini, *Templos coloniales de Venezuela*, p. 14, en Gois, p. 11 | media: Gois supone que describe las fotos y grabados del siglo XIX | la fachada clásica y la torre de dos cuerpos de 1843 |
| 1876 | Demolición del templo y del Cuartel de Artillería contiguo (el antiguo hospital): resolución del 24-3-1876 y Memoria del MOP del 6-4-1876 | Gois, pp. 30–31; Landaeta, p. 14 | alta | muere antes de 1889 |
| 1877–1881 | Se empieza una capilla en el lugar (1877); el teatro se inaugura el 1-1-1881 | Landaeta, p. 14 | alta | el teatro, desde 1889 (sin cambios) |

### Contradicciones y dudas

- **Dos naves o una.** Otaduy (por Martí) y Gasparini dicen «una nave»; el texto publicado de Martí, «dos naves:
  una grande y otra pequeña». Describen lo mismo: un cañón y una nave menor de capillas. Va así.
- **Torre de tres cuerpos o de dos.** Gois lo explica por el terremoto de 1812; se sigue esa lectura: tres en 1772,
  dos en 1843. No hay prueba de la fecha de la reparación.
- **El estado en 1843.** Tras «todas las paredes desplomadas» no se halló cuándo se rehízo. Va reparada porque el
  plano de 1843 la nombra y la foto atribuida a Lessmann (sin fecha) la muestra entera.
- **El largo y la escala.** La escala sale de igualar los 23 m de ancho del recuadro de 1843 con los 125 px que
  ocupa en el plano de 1757 el templo **con** sus bodegones y el pasadizo: 0,184 m por píxel, nave de 10 m y
  41 m de largo. Si esos 23 m fueran solo la nave y la nave menor (90 px), la escala sube un 39 %: nave de 14 m y
  unos 57 m de largo. No hay cómo decidir entre las dos lecturas; va la primera porque da una nave de luz
  corriente para una armadura de madera, lo que es un argumento y no una prueba.
- **El modelo se sale del recuadro de 1843.** El recuadro mide 27,5 m de fondo y el modelo, 41: sobresale unos
  13 m hacia el sur. Se siguió la proporción del plano de 1757, que es un levantamiento del edificio, y no el
  recuadro, esquemático a la escala de un plano de ciudad. Ninguna de las dos fuentes confirma a la otra en el
  largo.
- **Citas de segunda mano.** Lo de Martí (por Otaduy), lo de Gasparini y la carta de 1812 se conocen por la tesis
  de Gois; ninguna se cotejó. Gasparini no fecha su descripción: que sea el templo posterior a 1812 es la lectura
  de Gois. La ficha lo atribuye así en sus textos de 1772 y 1843.
- **El lugar** tiene el error del calce de 1843 (12 m). La calle del este no coincide entre el plano de 1843, el
  de 1936 y el tejido del mapa (hasta 10 m): el muro este se puso sobre el borde de la manzana `U1772-0051`.

## Entorno: plaza, hospital y hospicio

- **La plaza no existe en el tejido del mapa en 1772 ni en 1843.** La reconstrucción de 1772 hace de todo el lugar
  una manzana con casas (`U1772-0051`), y delante de la fachada quedan casas genéricas donde los dos planos dibujan
  la plazuela. Abrirla pide tocar el generador de manzanas y regenerar los datos: **no se hizo**. Tampoco se
  dibujan la fuente de piedra (1771–1845) ni la pila de mármol (1847–1876).
- **Hospital Real y Hospicio de la Caridad**: pegados a la torre por el oeste (el orden, de este a oeste, es templo,
  hospital, hospicio en el plano de 1757); después Cuartel de Artillería. **No se modelan**: el plano de 1757 da
  la distribución (patios con fuente, salas, capilla del hospicio), pero no su escala, y no hay alzado. La
  evidencia del templo y la del hospital quedan separadas en la tabla de arriba, como pide el issue.
- **Cementerio**: detrás del templo (n.º 15 del plano de 1757). Sin geometría.

## Referencias visuales

Ninguna se incorpora al sitio ni al paquete de fotos.

| Imagen | Fecha | Autor y procedencia | Licencia | Para qué se usó |
|---|---|---|---|---|
| «Plano de la iglesia de San Pablo, Hospital Real y Hospicio de la Caridad» | 1757 | Reproducido en Gois, ilust. 1 y 5; la tesis no dice dónde se guarda el original | no establecida para la reproducción | Proporciones de la nave, la nave menor y la torre, y de qué lado quedan |
| «Iglesia de San Pablo, primer ermitaño» | siglo XIX, sin fecha | Foto atribuida a F. Lessmann, en Gois, ilust. 7 | no establecida | Confirmar la fachada con frontispicio y la torre a la derecha de quien la mira (al oeste) |
| «Plazuela de San Pablo en la segunda mitad del siglo XIX» | sin fecha | Anónimo, en Gois, ilust. 2 | no establecida | Confirmar la torre junto a la fachada y el edificio contiguo; la fuente de la plaza |
| Grabado de la plaza (`fuentes/imagenes/1860-blog-plaza-san-pablo-aagaard`) | «a verificar» | Atribuido a C. Aagaard; licencia `null`, dominio público «dudoso» en su ficha | no establecida | No se usó para el modelo. Su fecha y su licencia siguen sin verificar |

No se halló una vista de frente con fecha cierta anterior a 1876.

## Huella, reserva y R13

| | Medida |
|---|---|
| Planta (colisión) | nave de 41 × 10 m y nave menor (con la torre) de 41 × 6,5 m |
| Reserva (sin casas ni árboles), solo de 1772 a 1889 | 41 × 16,5 m: 676 m² |
| Reserva del teatro (desde 1889, sin cambios) | 44 × 72 m: 3.168 m² |

La huella de la iglesia **no es la del teatro**: es la quinta parte y queda sobre su borde este.

Medido con `medirHitos` (`tools/hitos-manzanas.mjs`) sobre los informes `retiro-<año>` de los datos completos
(`/disco/dev/caracas-datos-sur`), fuera del repo:

| Épocas | Manzana | Manzana bajo el recinto | Recinto en la manzana | Clase | Decisión |
|---|---|---|---|---|---|
| 1772, 1843 | `U1772-0051` (15.581 m²) | 4,3 % | 100 % | chico | se conserva |

Es **chico**: va dentro de su manzana, sin casas ni árboles encima. No retira nada ni cambia la decisión de otro
hito. Con la primera ubicación (10 px más al este, siguiendo la calle del plano de 1936) quedaba a caballo, con la
nave metida en la calle del mapa: por eso el ajuste.

## Datos generados

Este PR **no regenera ni publica datos**. Con los datos publicados, la reserva actúa al cargar en 1772 y 1843:
esconde las casas de `U1772-0051` que pisan el solar. Desde 1889 no cambia nada: las capturas de `main` y de la
rama son idénticas píxel por píxel en 1889, 1911, 1936 y 1946.

Al regenerar (`npm run datos`), los pasos de manzanas y de retiro de 1772 y 1843 reparten las casas de
`U1772-0051` sin pisar la reserva. `npm run datos:al-dia` avisa por `src/hitos/`.

## La marca

Sigue siendo una sola, compartida con el teatro (`teatro-municipal`: «Iglesia y plaza de San Pablo» hasta 1843,
«Teatro Municipal» desde 1889), en (8345, 7670): a 19,5 m del pie de la fachada del templo, sobre la plazuela.
**No se separó en dos marcas**: los tests de #97, del teatro, de las fichas, de la vitrina y de la leyenda de 1843
fijan esa marca con sus dos nombres. Queda pendiente, con esa lista, para un PR propio. Se le agregaron las
fuentes del templo, y a la ficha, la descripción de 1772 y de 1843.

## Qué es interpretativo

- **Todas las medidas** (con un error posible del 39 %; ver arriba) y **todas las alturas**: nave de 8 m, nave menor de 6 m, cuerpos de la torre
  de 7, 5 y 4 m.
- La fachada (la «clásica» de la iglesia paramétrica, sin los pináculos de Gasparini) y que sea la misma en 1772.
- El remate de la torre (chapitel bajo de teja), los vanos y el color.
- Que la nave menor sea un solo cuerpo corrido de la torre a la sacristía.

## Rendimiento

988 triángulos más: 646.513 antes de 1946 y 1.125.886 en total (con La Candelaria y Las Mercedes), dentro de los
topes que dejó #316 (647.000 y 1.127.000). Build: entrada 307,2 kB y workers 175,3 kB (tope 176, sin tocar). La
medición de carga y de cuadro, en [`mediciones/san-pablo-246`](mediciones/san-pablo-246/README.md).

## Capturas

`docs/capturas/san-pablo-246/san-pablo-<antes|despues>-<año>-<arriba|costado>.webp`: `main` (`27abd10`) y esta
rama, misma cámara, en las seis épocas, con los datos completos
(`TEMPLO=san-pablo TEMPLO_GPU=1 node tests/e2e/capturas-templos.mjs`).

## Pendiente

- Una medida del templo: la escala del plano de 1757 (el original; la tesis no dice dónde está) o una mensura.
- Abrir la plaza de San Pablo en el tejido de 1772 y 1843, con su fuente; hoy tiene casas delante de la fachada.
- Hospital Real, Hospicio de la Caridad (después Cuartel de Artillería) y cementerio.
- Separar la marca del templo de la del teatro.
- Fecha y licencia del grabado de Aagaard y de la foto atribuida a Lessmann; una vista fechada anterior a 1876.
- Cotejar a Otaduy, a Gasparini y los *Documentos* de Martí en sus ediciones: acá se citan por la tesis de Gois.
- Regenerar y publicar los datos; la prueba a mano de una persona.
