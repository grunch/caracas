# La Candelaria: etapas, huella e instalación (#243)

El templo del [issue #243](https://github.com/grunch/caracas/issues/243), con el patrón de los templos de
[#259](templos-259-integracion.md). Tarea T82.CA del plan.

## Qué había y de dónde sale el modelo

En `main` (`27abd10`) la Candelaria era una marca sin hito, puesta a mano en (11230, 7000) sobre un grupo de casas
genéricas (D4 de `specs/13`). La marca y la ficha venían del [PR #228](https://github.com/grunch/caracas/pull/228).

**No hay estudio en Miraflores**: ningún archivo de `grunch/miraflores` (`origin/main`) nombra la Candelaria. El
modelo se hizo acá con la misma regla que en #259:

- la **planta** es el contorno del templo en el plano de 1936 ([lectura](candelaria-georreferencia.json));
- el **volumen** de cada etapa sale de lo que cuenta Manuel Landaeta Rosales en
  [*La iglesia y plaza de la Candelaria de Caracas*](https://archive.org/details/laiglesiayplazad00land) (1908),
  que transcribe el acta de la visita del obispo Martí del 17 de mayo de 1772;
- lo que ninguna fuente fechada respalda **no se dibuja** y queda dicho abajo.

## Ficha de evidencias por etapa

Certeza: **alta** = el documento lo dice o lo dibuja; **media** = se infiere de dos fuentes que coinciden;
**baja** = interpretación. «Landaeta» es el folleto de 1908, con la página impresa.

| Etapa (hecho) | Qué dice la fuente | Fuente (fecha del documento) | Certeza | En el mapa |
|---|---|---|---|---|
| 1708 | Fundada por vecinos canarios; la imagen se coloca el 14-12-1708 «desde luego que se concluyó una parte de la fábrica» | Acta de Martí (1772) en Landaeta, pp. 5–6 | alta | — |
| 1716, 1750 | Viceparroquia de la Catedral (auto del 3-1-1716); parroquia por Real Cédula del 25-8-1750 | Acta de Martí en Landaeta, p. 6 | alta | — |
| 1766 | El terremoto de Santa Úrsula: «parece que esta Iglesia sufrió poco» | Landaeta, p. 7 (1908) | media: lo deduce el autor | — |
| 1772 | «Tres naves, dividida entre sí, con dos órdenes de columnas y arcos de ladrillos»; fachada de ladrillo con «tres puertas mirando al ocaso»; tres capillas en la cabecera y detrás la sacristía «con algunas piezas altas»; «á un lado de la nave de la Epístola y contigua á la fachada, hay una torre ó campanario de tres cuerpos», con el baptisterio en el primero; al lado del Evangelio, afuera, «un cementerio todo cercado de tapias con su osario en medio» | Acta de Martí del 17-5-1772 en Landaeta, p. 8 | alta para la composición; **baja para la planta** (ver abajo) | cuerpo de 51 × 25 m bajo un tejado, fachada lisa de tres puertas al oeste, **torre de tres cuerpos al sur de la fachada** |
| 1772 | Símbolo de iglesia en el lugar, con la plaza abierta al oeste | Plano de 1772 (`fuentes/mapas/1772-pares-agi-exato-mapa`), calce 18,7 m RMS | alta para la presencia | — |
| mediados del s. XVIII | La plaza, demarcada al empezar la iglesia, tiene «grandes pilastras de ladrillo por los cuatro costados» | Landaeta, p. 17 | media | **sin geometría** (no se sabe cuántas ni dónde) |
| 1812 | «Parte de la Iglesia, la fachada y el cuerpo tercero de la torre vinieron á tierra»; capilla provisional en el ángulo sureste de la plaza | Landaeta, pp. 10 y 17 | alta | — |
| después de la guerra (sin año) | «Se principió á reedificar de nuevo esta Iglesia, pero siempre sobre el mismo plan de cuando se construyó»; la capilla de la plaza se demuele «al ponerse la Iglesia en estado de servicio» | Landaeta, pp. 10 y 17 | media: sin fechas | — |
| 1825 | El cementerio anexo deja de usarse (se abre el del Este) | Landaeta, pp. 10–11 | alta | — |
| 1843 | Letra J «La Candelaria»; un bloque en el lugar del templo | Plano de Jesurún de 1843 (`specs/auditoria-1843/leyenda.json`), calce 12,4 m RMS | alta para la presencia | el mismo cuerpo, fachada lisa, **torre de dos cuerpos** |
| 1860–1872 | El cura Torres «levantó la fachada del templo hasta una altura considerable» (1860–1867); se termina de 1868 a 1872, con Vicente Flores y otros maestros, «bajo la dirección de Don Juan Hurtado Manrique» | Landaeta, p. 11 | alta | — |
| 1880–1881 | Arco y pilares del coro central; «las tres puertas y el balcón central»; los tres coros; «la fachada del Sur» | Landaeta, p. 12 | alta | — |
| 1889 | Templo VI y plaza D | Plano de Mestre de 1889 | alta | el cuerpo de antes con la **fachada alta de 1872** (clásica, tres puertas) y la torre de dos cuerpos |
| 1889–1900 | «Se aumentó la altura del campanario y se techó de nuevo»; altozano y aceras | Landaeta, p. 13 | alta, sin año | — |
| 1900–1908 | El terremoto del 29-10-1900 «causó estragos»; desde 1901 se reconstruye empezando por el presbiterio, «levantando los techos, para que tengan luz y concuerden con la fachada, que es una de las más altas de los templos de Caracas» (ingeniero Jesús Muñoz Tébar). En noviembre de 1908 la iglesia «se encuentra en ruinas», con el techo de la nave central casi terminado y las otras dos naves por hacer | Landaeta, pp. 14–15 y 22–23 | alta | — |
| 1911 | Bloque del templo con un saliente al sur, junto a la fachada | Plano de Razetti de 1911 | alta para la presencia; **baja para el estado de la obra** | **tres naves con la central más alta**, fachada de pantalla, torre de tres cuerpos |
| 1936, 1946 | «Iglesia Candelaria», «Plaza de Candelaria»; contorno de unos 60 × 25 m con la torre al suroeste | Planos DCN de 1936 y de 1946 | alta | igual que en 1911 |

### Contradicciones y dudas

- **La planta de 1772 y de 1843 es la de 1936.** Se apoya en una frase de Landaeta («sobre el mismo plan de cuando
  se construyó») y en que la torre del contorno de 1936 está donde Martí la pone: al sur (lado de la Epístola de un
  templo que mira al oeste), pegada a la fachada. El plano de 1772 solo trae el símbolo y el de 1843 un bloque
  más corto (unos 30 m): ninguno de los dos da la planta.
- **El estado en 1843 no se conoce.** Entre el terremoto y 1860 no hay fechas: ni cuándo volvió al servicio ni
  cuánto se había reedificado. Va el cuerpo entero con la torre sin su tercer cuerpo y la fachada lisa.
- **La torre en 1889**: se subió «de 1889 a 1900». Con el plano de 1889 va todavía de dos cuerpos; pudo estar ya
  en obra.
- **1911**: Landaeta deja la obra a medias en noviembre de 1908. No se halló cuándo terminó. Desde 1911 va
  terminada porque el plano de Razetti dibuja el bloque completo; el plano no distingue un templo sin techo.
- **«Tres naves»** no dice si la central era más alta. Antes de 1901 van bajo un solo tejado: la reconstrucción
  levanta los techos «para que tengan luz», de donde se infiere que antes no la tenían por arriba.
- El terremoto de Cúa (12-4-1878) tumbó la imagen de la fachada (p. 15): la imagen no se dibuja en ninguna etapa.
- El [estudio de parroquias de la Academia Nacional de la Historia](https://biblat.unam.mx/hevila/BoletindelaAcademiaNacionaldelaHistoriaCaracas/1997/vol81/no318/4.pdf)
  que cita el issue no se pudo leer en esta tarea: queda sin cotejar.

## Entorno

- **Plaza**: está al oeste del templo en los seis planos. En las capturas queda como terreno libre en todas las épocas;
  sus pilastras de ladrillo (hasta 1877), la pila y las barandas de 1877, la estatua de José
  Gregorio Monagas (1881) y el pavimento de 1906 (Landaeta, pp. 17–19) **no se modelan**: no hay medidas ni vista.
- **Cementerio**: al norte de las naves (lado del Evangelio), cercado, en uso hasta 1825. No se conoce su tamaño:
  no se dibuja ni se reserva.
- **Sacristía**: el cuerpo de 9 m detrás de la cabecera que dibuja el plano de 1936 se reserva y no se modela.

## Referencias visuales

**No se usó ninguna imagen**: en `fuentes/imagenes/` no hay vistas de la Candelaria y no se buscó ninguna foto
actual para la fachada (una foto de hoy no prueba la fachada de 1872 ni la de antes). Por eso el adorno de
las fachadas es el genérico de la iglesia paramétrica y no pretende ser el de Hurtado Manrique.

## Huella, reserva y R13

Planta, eje y contorno leído: [`candelaria-georreferencia.json`](candelaria-georreferencia.json).

| | Medida |
|---|---|
| Planta (colisión) | naves de 51 × 25 m y torre de 7 × 7 m al sur de la fachada |
| Reserva (sin casas ni árboles) | 60 × 25 m (naves y sacristía) y el saliente de la torre, 13,5 × 5,7 m: 1.577 m² |

Medido con `medirHitos` (`tools/hitos-manzanas.mjs`, la medida de `tools/hitos-manzanas-tabla.mjs`) sobre los
informes `retiro-<año>` de los datos completos (`/disco/dev/caracas-datos-sur`, los de #291), fuera del repo. No
cambia la decisión de ninguna manzana de otro hito; se agregan estas filas, iguales en las épocas en que la
manzana existe:

| Épocas | Manzana | Manzana bajo el recinto | Recinto en la manzana | Clase | Decisión |
|---|---|---|---|---|---|
| 1772–1946 | `V1772-38446-0-0` (1.056 m²) | 56,2 % | 37,6 % | grande | **se retira entera** |
| 1843–1946 | `U1843-0177-A2` (85 m²) | 100 % | 5,4 % | grande | **se retira entera** |
| 1843–1946 | `U1843-0177-A0` (1.836 m²) | 5,3 % | 6,2 % | roce | se conserva |

`V1772-38446-0-0` es la manzana que la reconstrucción de 1772 levantó justo donde ese plano dibuja la iglesia: no
es una cuadra de casas sino el solar del templo. Con la R13 se va entera (casas, árboles y suelo de manzana), y la
astilla `U1843-0177-A2` con ella. **Eso ocurre al regenerar los datos**; ver abajo.

## Datos generados

Este PR **no regenera ni publica datos**. Con los datos publicados, la reserva actúa al cargar (`suprime` y
`sinArboles`): las casas en U de `V1772-38446-0-0`, que estaban donde va el templo, dejan de verse en las seis
épocas (capturas). El **suelo de manzana** de `V1772-38446-0-0` sigue pintado bajo el templo hasta que se
regenere: se ve como una franja verde a los lados de las naves.

Al regenerar (`npm run datos`), los pasos `retiro-<año>` leen `hitosConPlanta()` y retiran las dos manzanas en
todas las épocas; cambian sus casas, techos, árboles y los conteos. `npm run datos:al-dia` avisa por `src/hitos/`.
`docs/manzanas-hitos.json` no se toca acá: lo vuelve a escribir la herramienta con los datos regenerados.

## Qué es interpretativo

- **Todas las alturas**: muros de 10 m, nave central de 15 m desde 1911, fachada de 15 m en 1889, cuerpos de la
  torre de 8, 5 y 4,5 m. Ninguna está medida ni publicada.
- El remate de la torre (chapitel de teja), sus vanos y los de las naves.
- El adorno de las fachadas; la fachada lisa de 1772 y de 1843 es la manera de no inventar uno.
- El ancho de la nave central desde 1911 (44 % del total) y que la cubierta siga siendo de teja.
- Que la torre tuviera dos cuerpos de 1843 a 1889 sin cambios y tres desde 1911.

## Código nuevo

- `src/hitos/datos/candelaria.js`: la definición, con su fuente y su lista `verificar`.
- `src/hitos/iglesias.js`: la iglesia paramétrica admite fachada `lisa`, `puertas: 3` y `altoFachada` (una fachada
  más alta que la nave). Sin esos parámetros sale igual que antes (test).
- `src/hitos/templo-naves.js`: detrás de una fachada de pantalla los tejados arrancan 1,2 m después del muro; el
  alero la atravesaba. Santa Rosalía (cubierta plana) y San José (sin pantalla) no cambian: mismos triángulos.

## Rendimiento

2.357 triángulos más en las seis fases: 643.976 antes de 1946 y 1.123.349 en total, **dentro de los topes** de los
tests (645.000 y 1.125.000), que no se tocan. Build: entrada 304,7 kB y workers 173,5 kB contra 303,4 y 172,4 de
`main`; el tope de workers (174) tampoco se toca. La medición de carga y de cuadro, en
[`mediciones/candelaria-243`](mediciones/candelaria-243/README.md).

## Capturas

`docs/capturas/candelaria-243/candelaria-<antes|despues>-<año>-<arriba|costado>.webp`: `main` (`27abd10`) y esta
rama, misma cámara, en las seis épocas, con los datos completos
(`TEMPLO=candelaria TEMPLO_GPU=1 node tests/e2e/capturas-templos.mjs`).

## Pendiente

- Regenerar y publicar los datos (retira `V1772-38446-0-0` y `U1843-0177-A2`); revisar `docs/manzanas-hitos.json`.
- Una vista fechada del templo en cualquier época (sobre todo antes de 1860 y entre 1872 y 1900) y cualquier medida.
- La fecha en que terminó la reconstrucción empezada en 1901 y el estado del templo en 1843.
- La plaza con su mobiliario por época, el cementerio (1750–1825) y la sacristía.
- Cotejar el estudio de parroquias de la Academia Nacional de la Historia.
- La prueba a mano de una persona.
