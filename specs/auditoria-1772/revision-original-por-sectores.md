# Revisión de las unidades localizadas sobre el original

T33j.1c, en curso. La revisión de ocupación original es una etapa del censo; no certifica correspondencias métricas, geometría de casas ni accesibilidad del sistema.

## Estado del registro

El primer barrido de #76 localizó 271 candidatos. La lectura detallada de los 16 paneles del original añade 21 localizaciones: **292 registros históricos**, uno descartado por no ser edificación y otro relacionado como parte de una unidad existente. Son 290 registros restantes de unidades candidatas, no un total definitivo de manzanas históricas.

Los 292 registros tienen clasificación de lo observado en el original. Todavía faltan polígonos, calles fuera del primer lote, correspondencias métricas reconciliadas y revisión de frentes/accesos: **esta clasificación no cierra la fase 1**. `revision_original` conserva categoría, observación, fecha, evidencia y pendientes por unidad. Los 10 controles centrales de `manzanas.json` son unidades ya enlazadas: no se suman de nuevo.

| Sector | Localizaciones clasificadas |
|---|---:|
| S1772-11 | 14 |
| S1772-12 | 9 |
| S1772-13 | 12 |
| S1772-14 | 6 |
| S1772-21 | 19 |
| S1772-22 | 35 |
| S1772-23 | 35 |
| S1772-24 | 17 |
| S1772-31 | 18 |
| S1772-32 | 32 |
| S1772-33 | 42 |
| S1772-34 | 22 |
| S1772-41 | 0 |
| S1772-42 | 11 |
| S1772-43 | 18 |
| S1772-44 | 2 |

Distribución: 20 aislada, 20 conjunto_especial, 89 continua, 1 descartada_no_edificacion, 87 parcial, 1 parte_de_otra_unidad, 1 plaza, 73 terreno_libre.

Las categorías `continua`, `parcial`, `terreno_libre`, `aislada`, `conjunto_especial` y `parte_de_otra_unidad` describen lo observado, no reglas automáticas de construcción. Una franja roja puede tener una caja grande con terreno libre; una iglesia no ocupa toda la plaza que comparte.

## Correcciones del propio censo

- **U1772-0265:** la caja manual anterior `[1453,434,1496,455]` caía sobre una quebrada, no sobre el cuerpo rojo. Se conserva en `bbox_anterior` y se corrige a `[1407,435,1440,456]`, al poniente de La Pastora. Se recalcula su localización candidata en el sistema.
- **U1772-0257:** cuerpo rojo en el borde de U1772-0004. Se registra como parte de esa unidad para evitar contarlo como manzana adicional. Se mantiene el ID y la relación; el trazado posterior precisará el límite de parcela/frente.
- **U1772-0272:** franja larga diagonal al pie del Calvario, caja `[637,433,717,506]`, omitida por el filtro automático. La calle la separa de la unidad triangular U1772-0013. La caja sirve para localizarla y no representa su huella edificada.
- **U1772-0187 y 0188:** se mantienen separadas: el original dibuja una calle entre estas dos franjas estrechas. No forzar una manzana cuadrada.

- **U1772-0269:** segunda caja manual sobre vegetación; corregida al cuerpo rojo visible del extremo norte, conservando la caja anterior.
- **U1772-0271:** descartada: la caja señala vegetación y no existe un cuerpo rojo que justifique ese candidato. No participa como omisión pendiente.
- **U1772-0273…0276 y 0278:** cuerpos aislados omitidos por el filtro de tamaño o por caer dentro de cajas que atraviesan un río.
- **U1772-0277, 0279, 0285…0292:** unidades pequeñas de ribera, rojas, parciales o libres. Se mantienen separadas cuando hay calle o río; sus cajas son localizadores aproximados.
- **U1772-0280…0284:** cinco extremos libres y abiertos del damero norte, que el detector de contornos cerrados no podía localizar como bloques completos.
- **U1772-0036, 0151, 0185 y 0186:** unidades alargadas; no inventar una calle pasante para convertirlas en cuadrados. En U1772-0151 el acceso blanco termina contra un frente rojo continuo.
- **U1772-0058/0059:** límites aún inciertos entre masas rojas y espacio blanco con cuerpos aislados; se deben decidir al trazar la conexión pública, no mediante las cajas.

Estas correcciones explican por qué no se importan las cajas al generador. En el cruce actualizado hay 292 registros y 204 cajas sin centro de techo visible, incluido el falso candidato descartado. Son alertas dependientes de un calce discutido; no representan 204 omisiones confirmadas.

## Cómo repetir la lectura

Usar el original cuyo hash fija B1772-001. Para cada sector, recortar `bbox_lectura` de `sectores.json`, ampliar 3× y localizar las cajas por `id_fuente`. Los paneles de inspección locales están en `.cache/censo-1772/.cache/paneles/`; sus marcas se superponen a una copia del original, no lo alteran. Los cambios de U1772-0265 y U1772-0272 se revisan además directamente en el original porque los paneles de la primera pasada muestran las cajas anteriores.

Contrastar cualquier unión dudosa con el trazo negro y el espacio blanco de calle; no deducirla de la fracción roja. Conservar la diferencia entre terreno libre, plaza, camino, ribera y edificio. Después se trazan nodos/calles y se contrasta cada frente con el sistema. La fase 1 no está cerrada.
