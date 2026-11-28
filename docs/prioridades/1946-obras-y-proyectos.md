# 1946: Ciudad Universitaria y avenida Bolívar

Seguimiento de #264 y #276. Revisión del 26-11-2026 contra main bc51344.

## Evidencia cartográfica y límites

Se cotejó el TIFF de 14954 × 9952 píxeles conservado en
`fuentes/mapas/1950-archiveorg-plano-de-caracas-dcn/original.tif`.
[Registro del plano DCN](https://archive.org/details/WCWdb_18051).
El proyecto emplea la base fotográfica de 1946; la catalogación posterior del plano
impide atribuir automáticamente a 1946 cada edificio dibujado. Las coordenadas siguientes
son píxeles **del original**, no del mosaico de la aplicación.

La revisión consulta el escaneo local; no publica copias ni presume licencia de las fotografías.

## Ciudad Universitaria

Recorte reproducible: caja `(9500,6250,12000,7850)` del TIFF. Se lee explícitamente
«Ciudad Universitaria (en construcción)». Hay plantas dibujadas y otras líneas discontinuas;
no se deduce de ese grafismo una altura o un porcentaje de avance.

| Elemento | Evidencia | Decisión para 1946 |
|---|---|---|
| Conjunto | Rótulo de construcción; reserva ya existente en `tools/geo/referencias/1946-reservas.json` | Conservar reserva sin casas coloniales. No sustituir por campus terminado |
| Hospital Clínico | Planta rotulada en el plano; apertura en 1956 [historia médica](https://www.revistacentromedico.org/storage/numbers/20/RCM_file.pdf) | No mostrar hospital operativo; faltan fotografía de obra y altura fechadas |
| Instituto de Higiene | Planta rotulada | Fecha de ocupación y estado estructural de 1946 no establecidos; no modelar fachada final |
| Instituto Anatómico | Planta rotulada | Proyecto/planta no prueba terminación; falta expediente por edificio |
| Instituto Anatomopatológico | Planta rotulada | Igual límite; no equiparar al Instituto de Medicina Experimental |
| Cirugía Experimental | Planta rotulada | No afirmar identidad con otro instituto ni apertura sin fuente específica |
| Lavandería | Planta rotulada | Falta prueba de ejecución y alzado |
| Instituto de Medicina Experimental | Su director fecha el traslado desde San Lázaro a la nueva sede en **1950** [testimonio institucional](https://www.tribunadelinvestigador.com/ediciones/2016/1/art-3/) | No trasladar sus actividades a la UCV en 1946; apertura posterior no demuestra ausencia de obras |
| Aula Magna y conjunto monumental final | UNESCO describe una realización durante varias décadas [ficha](https://whc.unesco.org/en/list/986/) | No incorporar iconos terminados por pertenecer hoy al campus |

**Implementado antes de esta revisión:** exclusión residencial mediante la reserva UCV.
**Entregado ahora:** lectura reproducible y separación edificio/proyecto/apertura.
**Pendiente de #264:** tabla de inicios y avance físico de cada bloque con partes de obra;
levantamiento de los volúmenes realmente existentes. El issue permanece abierto.

## Avenida Bolívar

Recorte para repetir la inspección: en una miniatura de ancho 1800 px, caja
`(687,570,1043,708)`; multiplicar las cuatro coordenadas por `14954/1800` para el TIFF.
Entre El Silencio y Parque Carabobo se ven las manzanas de Este 6/Este 8 y sus calles.
El plano consultado no acredita una avenida ancha terminada en toda esa franja.

La primera etapa abrió en 1949 según [FAC](https://fundaayc.com/2013/11/04/1949%E2%80%A2-se-inaugura-la-primera-etapa-de-la-avenida-bolivar/).
La entrada atribuye incorrectamente la presidencia de 1949 a Pérez Jiménez: no se adopta
esa atribución. El dato de inauguración no permite fechar cada demolición de 1945–1949.

**Decisión:** conservar El Silencio y el tejido que muestra el plano; no borrar una franja
con el eje de OSM actual. No hay reserva de avenida Bolívar en el archivo de 1946 y no se
agrega una sin polígonos de demolición fechados. Tampoco se añaden las torres del Centro
Simón Bolívar como consecuencia automática de tener El Silencio.

**Revisión del 28-11-2026:** la ficha de evidencias por etapa, las demoliciones por tramo y la lectura
manzana por manzana están en [`docs/issue-276-avenida-bolivar.md`](../issue-276-avenida-bolivar.md). El plano
deja en blanco una franja de unos 30 m en la primera manzana al este de El Silencio; el resto del corredor,
hasta la calle Sur 11, sigue edificado. Ninguna fuente fecha esa franja en 1946: la primera evidencia fechada
de terreno despejado es de 1948. El mapa de 1946 no cambia.

**Pendiente de #276:** fechar las demoliciones de la primera manzana (entre 1945 y 1948) y las del resto del
tramo, con fotografías aéreas o partes de obra. No se declara resuelta la obra de 1946 por conocer la
inauguración de 1949.
