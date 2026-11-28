# T40a · Santísima Trinidad / Panteón Nacional

El hito genérico empezaba en 1889 y conservaba dos torres en 1936. Se sustituye por cuatro variantes
procedurales originales desarrolladas en el estudio independiente de Miraflores:

| Época del mapa | Representación | Referencia |
|---|---|---|
| 1843 (2) | Iglesia en ruinas tras el terremoto de 1812, fachada colonial con volutas y arcadas sin techo | Bellermann, circa 1842–1845; ficha ya existente en fuentes/imagenes |
| 1889 (3) | Panteón neogótico, dos agujas y rosetón central | Federico Lessmann, ca. 1885, [El Archivo](https://elarchivo.org/producto/panteon-nacional/) |
| 1911 (4) | Reforma de Chataing, ventana ojival, crestería y nuevos remates | Alzado del concurso de 1910 y fotografía de la obra terminada, [Fundación Arquitectura y Ciudad](https://fundaayc.com/tag/panteon-nacional/) |
| 1936 (5) | Reforma de Mujica Millán, torre central elevada y dos laterales con cúpulas | Collage y fotografías de la reforma terminada en 1930, misma fuente |

La iglesia se inauguró en 1781 (consagración en 1783 según FAC). El decreto de conversión es de 1874,
y la inauguración del Panteón de 1875. Las obras de 1772 no se modelan; en 1843 se representa una ruina,
no una iglesia intacta ni la fachada neogótica posterior. No se agregan el Foro Libertador ni el
Mausoleo moderno. Las imágenes nuevas son referencias internas con licencia de reproducción sin
verificar: **no se publican archivos de imagen, GLB ni texturas**. El código genera las mallas originales.

## Adaptación al mapa

- `datos/panteon.js` conserva el ancla (9395, 5305) y el eje del hito existente. Las cuatro partes tienen
  vidas excluyentes: [2,3), [3,4), [4,5), [5,∞). La transición la resuelve el shader común de épocas.
- `panteon-modelo.js` produce las piezas en metros aproximados, centro de la nave en el origen y frente +Z.
- `panteon.js` transforma `(x,y,z)` a `(27-z,y,x)` en el marco del hito. La nave entra hacia el norte,
  desde el pie de fachada; la escalera queda delante. Las normales se transforman con las piezas.
- Cada geometría pasa al lienzo común con su color lineal. No se añaden mallas ni materiales de render
  independientes: se mantienen tinta/color, ola, relieve, sombras y el único draw call de los hitos.
  Se usa `MAT.LISO`: tejas y desgaste no tienen todavía tratamiento procedural específico.
- La zona de supresión incluye base y escalinata: rectángulo de 62 × 26 m, desde a=-5 hasta a=57,
  activo desde época 2. Las casas genéricas anteriores conservan su vida hasta 1843.
- Los materiales y geometrías temporales se liberan después de copiarlos al lienzo. La optimización por
  grupos del estudio independiente no se importa: el lienzo ya agrupa todos los hitos en una malla.

## Límites

Planta, dimensiones, laterales, cubiertas, daños y ornamentos son interpretativos, no un levantamiento.
Se mantiene la posición del plano de 1936 sin afirmar precisión georreferenciada. El modelo es detallado
con teselación reducida para ciudad (curvas de 5 segmentos y molduras triangulares); las cuatro etapas conviven en el buffer (el shader oculta las que no viven): una futura pasada de LOD
puede reducir vértices para móviles. Solo se integra este edificio; Miraflores no cambia.

## Validación

Unitarias: cuatro vidas excluyentes, alturas por etapa, orientación de la nave, inclusión de base y
escalera en la zona de supresión, ancla compartida, coordenadas finitas y conservación de casas antes
de 1843. E2E: renderiza el rango real del Panteón con el material de la ciudad, compara las cuatro
fachadas y el modo tinta, y verifica que comparte el relieve. Las comprobaciones generales y el build
se ejecutan antes del PR; resultados en su descripción.


Presupuesto medido: 51.258 triángulos para las cuatro variantes, frente a 139.536 del estudio detallado.
Los demás hitos suman 118.323: el total queda en 169.581, con límite de regresión de 180.000 y límite
específico del Panteón de 55.000. El límite anterior de 120.000 cubría el hito genérico de una sola
fachada; se amplía explícitamente para estas cuatro etapas, sin añadir draw calls.
