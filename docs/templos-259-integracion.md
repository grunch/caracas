# Santa Rosalía, San Juan y San José: fases, huella e instalación (#259)

Los tres templos del [issue #259](https://github.com/grunch/caracas/issues/259) que faltaban (San Agustín entró con
el [PR #286](https://github.com/grunch/caracas/pull/286), [nota](san-agustin-integracion.md)). Tarea T82.TP del plan.

## Qué había y qué se hizo distinto del estudio de Miraflores

En `main` (`09730ac`) los tres eran marcas sin hito: un nombre sobre casas genéricas (D4 de `specs/13`). San José
no tenía ficha.

El estudio de Miraflores (`src/patrimonio-templos.js`, guías `docs/prioridades/santa-rosalia.md`, `san-juan.md` y
`san-jose.md`) dibuja los tres con **una misma plantilla de 25 × 44 × 10 m** y cambia el remate de la fachada. No
cita ninguna medida, toma los adornos de fotos actuales y le pone a San José una sola torre. El issue pide lo
contrario («no reutilizar una iglesia genérica»). De ese estudio se usa la **matriz de épocas** y sus fuentes; la
geometría se hizo acá:

- la **planta** de cada templo es su contorno en el plano de 1936 ([lectura](templos-259-georreferencia.json));
- el **volumen** sale de la descripción del catálogo del IPC cuando existe (Santa Rosalía, San José) y, cuando no
  (San Juan), queda en la envolvente de la nave que dibuja el plano;
- lo que ninguna fuente fechada respalda **no se dibuja**.

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = se infiere de dos fuentes que coinciden;
**baja** = interpretación.

### Santa Rosalía

| Etapa | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1697–1734 | Ermita en 1697; se manda ampliar en 1730 y la iglesia se termina en 1734, entre Santa Rosalía y Candilito | [Parroquia Santa Rosalía](https://parroquiasantarosalia.wordpress.com/santa-rosa/) (página actual, sin fecha) | media: fuente secundaria sin cita | — |
| 1772 | Símbolo de iglesia en un solar chico junto a una plazuela | Plano de 1772 (`fuentes/mapas/1772-pares-agi-exato-mapa`), calce 18,7 m RMS: el símbolo cae unos 40 m al sur | alta para la presencia, baja para el lugar | **sin geometría**: no hay alzado ni leyenda transcrita |
| 1795 | Parroquia, separada de San Pablo | [IPC, Lo construido](https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf), p. 33 (2004–2007) | alta | — |
| 1812–1817 | El terremoto de 1812 la destruye; en 1817 se levanta en el mismo terreno un templo neoclásico | Parroquia; IPC p. 33 («Santa Rosalía -1817 y 1908-») | media | — |
| 1843 | Letra R «Santa Rosalia» en la leyenda; dos recuadros en blanco en el lugar | Plano de Jesurún de 1843 (`specs/auditoria-1843/leyenda.json`) | alta | envolvente de la nave (41 × 25,8 m), fachada clásica, **sin torre ni cúpulas** |
| 1889 | Templo IV, con atrio al oeste | Plano de Mestre de 1889 | alta | igual que en 1843 |
| 1900–1908 | El terremoto de 1900 lo daña; obras de 1904 a 1908 | Parroquia; IPC p. 33 | media | — |
| 1911 | Bloque del templo con su atrio | Plano de Razetti de 1911 | alta | tres naves con la central más alta, cubierta plana, torre al norte y tres cúpulas |
| 1936, 1946 | «Iglesia Santa Rosalía»; contorno de unos 41 × 28 m y atrio | Planos DCN de 1936 y de 1946 | alta | igual que en 1911 |
| hoy | Tres naves, fachada neoclásica, nave central más alta con platabanda, cúpula con linterna sobre tambor en el presbiterio, dos cúpulas menores, torre; frente a la «antigua plazoleta de Santa Rosalía»; Monumento Histórico Nacional (1960) | IPC, p. 216 | alta para el templo actual | de aquí sale el volumen desde 1911 |

Contradicciones y dudas: la parroquia dice ermita en **1697**; el issue, 1696. No se sabe qué partes del templo
actual son de 1817 y cuáles de 1904–1908: por eso la torre y las cúpulas aparecen en 1911 y no antes, sin prueba
de que no existieran. La platabanda de concreto que describe el IPC no puede ser de 1817.

### San Juan (Capuchinos)

| Etapa | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1772 | Campo | Plano de 1772 | alta | no existe |
| 1788–1791 | Hospicio y capilla de los capuchinos | H. D. Elschnig, [«Santiago de León de Caracas: una guía práctica histórica-cultural»](https://bibliodor.wordpress.com/wp-content/uploads/2012/03/parroquia-san-juan.pdf), p. 99 (guía moderna, sin año en el extracto) | media: fuente secundaria | — |
| 1795 | Parroquia, separada de San Pablo | IPC, p. 33 | alta | — |
| 1812 | El terremoto destruye hospicio y capilla | Elschnig, p. 99 | media | — |
| 1841–1868 | El templo parroquial se empieza en 1841 y se concluye en 1868 | Elschnig, p. 99 | media | — |
| 1843 | Letra S «Capuchinos» sobre el solar y un recuadro chico al borde de la plaza | Plano de Jesurún de 1843; calce 12,4 m RMS | alta para el nombre del lugar | **sin geometría**: el templo estaba en obra y no se conoce el avance |
| 1889 | Templo V | Plano de Mestre de 1889 (lo dibuja unos 37 m al suroeste: sirve de presencia, no de lugar) | alta | envolvente de la nave (41 × 22 m), fachada clásica |
| 1911 | Bloque al sur de la plaza | Plano de Razetti de 1911 | alta | igual |
| 1936, 1946 | «Iglesia San Juan», «Plaza de Capuchinos»; contorno de 21 a 23,5 m por 41 m | Planos DCN de 1936 y de 1946 | alta | igual |

Contradicciones y dudas: el directorio de la Arquidiócesis dice «fundada en 1852»
([página](https://arquidiocesis-caracas-directorio.webnode.es/arciprestazgo-de-san-juan-bautista/san-juan-bautista/)),
sin decir de qué; Elschnig da 1841–1868 para la obra y 1795 para la parroquia. **No se halló ninguna descripción ni
vista fechada del alzado**: el tomo del catálogo del IPC consultado no trae la iglesia, y las fotos del directorio
parroquial no tienen autor, fecha ni licencia. Por eso va sin torre, sin cúpula y sin los adornos del estudio de
Miraflores. Lo que el issue llama «artículo secundario» (Wikipedia) no se usó.

### San José

| Etapa | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1772, 1843 | Campo | Planos de 1772 y de 1843 | alta | no existe |
| 1889 | «Año de fundación: 1889» de la parroquia; «la iglesia parroquial de San José, construida en 1889» | [Arquidiócesis de Caracas](https://arquidiocesiscaracas.com/parroquia-san-jose-de-narauli/); IPC, p. 148 | media | — |
| 1889 | La manzana está vacía: no dibuja templo | Plano de Mestre de 1889 | alta | **sin geometría** |
| 1911 | Bloque con planta en cruz, en el lugar del templo | Plano de Razetti de 1911 | alta | tres naves con la central más alta, brazos, dos torres gemelas |
| 1936, 1946 | «Iglesia San José»; planta en cruz de 50 m, torres a los lados del frente, jardines al sur | Planos DCN de 1936 y de 1946 | alta | igual |
| hoy | Neoclásico; tres naves separadas por dos filas de cinco arcos, la central más alta con techo a dos aguas; dos torres gemelas de planta cuadrada y tres cuerpos que sobresalen de las naves; tres puertas y frontón sobre el cuerpo central; frente a la plazuela de la jabonería | IPC, pp. 125–126 | alta para el templo actual | de aquí sale el volumen |

Contradicciones y dudas: el IPC da el templo por construido en 1889 y el plano de ese año no lo dibuja; nace en
1911, con el primer plano que lo muestra. El IPC dice «planta rectangular»; los planos de 1911, 1936 y 1946 la
dibujan en cruz: va la del plano. No se hallaron los daños de 1900 ni su reparación. El reloj de la torre derecha
(que el IPC presume de la Catedral) no se dibuja.

## Referencias visuales

Ninguna foto se incorpora al sitio ni al paquete de fotos.

| Imagen | Fecha | Autor y procedencia | Licencia | Para qué se usó |
|---|---|---|---|---|
| [Iglesia Santa Rosalía.jpg](https://commons.wikimedia.org/wiki/File:Iglesia_Santa_Rosal%C3%ADa.jpg) | 20-3-2008 | Jesús Rincón, Wikimedia Commons | CC BY-SA 4.0 | De qué lado está la torre (norte) y qué remate tiene. Es una foto actual: no prueba la fachada de 1843 ni la de 1889 |
| [Templo Parroquial de San José en Caracas.JPG](https://commons.wikimedia.org/wiki/File:Templo_Parroquial_de_San_Jos%C3%A9_en_Caracas.JPG) | 20-4-2011 | FELiendo16, Wikimedia Commons | CC BY 3.0 | Confirma las dos torres de tres cuerpos del IPC y da el remate. Foto actual |
| Fotos del directorio parroquial de San Juan | sin fecha | sin autor | no establecida | No se usaron |
| Foto atribuida a El Nacional (guía de Miraflores) | sin fecha | sin verificar | no establecida | No se usó |

No se halló ninguna vista de época de los tres templos en `fuentes/imagenes/`.

## Huella, reserva y R13

Planta, eje y contorno leído: [`templos-259-georreferencia.json`](templos-259-georreferencia.json). La reserva de
cada uno es su solar, no la cuadra:

| Templo | Planta (colisión) | Reserva (sin casas ni árboles) |
|---|---|---|
| Santa Rosalía | naves 41 × 25,8 m; la torre, desde 1911 | 60 × 29,9 m: el atrio hasta la calle (19 m), las naves y la franja norte de la torre |
| San Juan | nave 41 × 22 m | la nave y el cuerpo trasero de 6 × 30,4 m que dibuja el plano |
| San José | naves 50 × 20,4 m, brazos 11 × 30,6 m y dos torres de 6,2 m | 59 × 33 m: el templo y 8 m delante de la fachada |

Medido con `tools/hitos-manzanas-tabla.mjs` sobre los informes `retiro-<año>` regenerados con `09730ac` (los de
#291, sin publicar), corrido fuera del repo. Las filas de los demás hitos y las manzanas retiradas salen idénticas
a `docs/manzanas-hitos.json`; solo se agregan estas:

| Templo | Épocas | Manzana | Manzana bajo el recinto | Recinto en la manzana | Huella en la manzana | Clase | Decisión |
|---|---|---|---|---|---|---|---|
| Santa Rosalía | 1843–1946 | `V1772-37022-0-0` (6.149 m²) | 11,7 % | 40,1 % | 29,4 % (31,0 % con la torre) | a caballo | se conserva |
| San Juan | 1889–1946 | `U1843-0319-A0` (16.344 m²) | 4,8 % | 82,1 % | 81,1 % | chico | se conserva |
| San José | 1911–1946 | `M1889-0034-A0` (8.942 m²) | 21,3 % | 97,8 % | 100 % | chico | se conserva |

Ninguno retira una manzana. **San Juan y San José son chicos**: van dentro de su manzana. **Santa Rosalía queda a
caballo** (límite, como el Panteón y San Agustín en `docs/manzanas-hitos.md`): el 60 % de su recinto no cae en
ninguna manzana sino en la plazuela que la reconstrucción de 1772 deja abierta donde ese plano dibuja la iglesia y
su plaza. No es mayor que la manzana ni la ocupa; el templo queda entre la plazuela y el borde de `V1772-37022`.
`docs/manzanas-hitos.json` no se toca en este PR: lo vuelve a escribir la herramienta cuando se regeneren los datos.

## Datos generados

Este PR **no regenera ni publica datos**. Con los datos publicados (`datos-2026-11-28-c5b8180`), la reserva actúa al
cargar (`suprime` y `sinArboles`, como San Agustín): esconde las casas y los árboles que pisan el solar mientras el
templo está en pie.

| Templo | Casas escondidas al cargar | Árboles escondidos |
|---|---|---|
| Santa Rosalía | 5 (de 1843 a 1936) | 2 |
| San Juan | 3 (de 1889 a 1936) | 3 |
| San José | 5 (en 1911 y 1936) | 13 |

Las cinco de Santa Rosalía son la mitad oeste de la fila que da a la calle del norte: en el mapa, la manzana
`V1772-37022-0-0` baja hasta donde el plano de 1936 pone el templo. Las de San José son las casas de su manzana que
tocan el solar de la iglesia, que el plano de 1936 dibuja cercado y sin edificar.

Al regenerar (`npm run datos`) **sí cambian**: los pasos de manzanas y de retiro leen `hitosConPlanta()` y
reparten las casas de esas manzanas sin pisar las reservas, así que cambian casas, techos y árboles de
`V1772-37022-0-0`, `U1843-0319-A0` y `M1889-0034-A0` y sus conteos. `npm run datos:al-dia` avisa por `src/hitos/`.

## Qué es interpretativo

- **Todas las alturas.** Ninguna está medida ni publicada. Salen de la proporción con el ancho leído del plano
  (naves laterales de 9 m; nave central de 13 m en Santa Rosalía y 14 m en San José; envolventes de 10 m).
- El ancho de la nave central (44 % del total), los vanos, las pilastras, el color y el material de las cubiertas.
- El remate de las torres (cupulín) y la altura de sus cuerpos.
- En San José, el fondo de los brazos y que sean tan bajos como las naves laterales.
- En San Juan, todo el alzado.

## Rendimiento

4.747 triángulos más (Santa Rosalía 2.871 en dos fases, San Juan 470, San José 1.406): 625.293 antes de 1946 y
1.104.666 en total; el tope de los tests sube de 625.000 a 630.000. Build: entrada 298,2 kB y workers 170,8 kB
contra 295,6 y 168,3 de `main`; el tope de workers sube de 170 a 172. La medición de carga, en
[`mediciones/templos-259`](mediciones/templos-259/README.md).

## Capturas

`docs/capturas/templos-259/<templo>-<antes|despues>-<año>-<arriba|costado>.webp`: `main` (`09730ac`) y esta rama,
misma cámara, en las seis épocas (`node tests/e2e/capturas-templos.mjs`).

## Pendiente

- Vistas fechadas de los tres templos (sobre todo Santa Rosalía antes de 1904 y San Juan en cualquier época) y
  cualquier medida de altura.
- La ficha del IPC de San Juan Bautista (otro tomo del catálogo) y la leyenda del plano de 1772.
- El estado de San Juan en 1843 y el de San José en 1889.
- Regenerar y publicar los datos; revisar `docs/manzanas-hitos.json` después.
- La prueba a mano de una persona.
