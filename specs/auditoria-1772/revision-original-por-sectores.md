# Revisión de las unidades localizadas sobre el original

T33j.1c, en curso. La revisión de ocupación original es una etapa del censo; no certifica correspondencias métricas, geometría de casas ni accesibilidad del sistema.

## Estado del registro

El primer barrido de #76 localizó 271 candidatos. La lectura detallada añade U1772-0272: **272 localizaciones vigentes**, una de ellas marcada como parte de otra. No se presenta este número como total de manzanas históricas.

Hay **59 unidades con clasificación original** en S1772-11, 12, 13, 14 y 43. Las otras 213 siguen pendientes de esta clasificación detallada. `revision_original` en `unidades-original.json` conserva categoría, observación, fecha, evidencia y pendientes por unidad. Los 10 controles centrales de `manzanas.json` tienen su revisión topológica separada; no se suman como si fueran 10 nuevas unidades.

| Sector | Localizaciones clasificadas | Alcance |
|---|---:|---|
| S1772-11 | 14 | Ribera, solares y ocupación dispersa al sur del Calvario; alcabala de La Vega |
| S1772-12 | 9 | Calvario y frente diagonal; incluye nueva U1772-0272 |
| S1772-13 | 12 | Damero parcial/libre, casa Blanco y alcabala de Catia |
| S1772-14 | 6 | La Pastora, edificios aislados y alcabala del camino de La Guayra |
| S1772-43 | 18 | [Plaza y periferia de Candelaria](periferia-candelaria-pastora.md) |

Las categorías `continua`, `parcial`, `terreno_libre`, `aislada`, `conjunto_especial` y `parte_de_otra_unidad` describen lo observado, no reglas automáticas de construcción. Una franja roja puede tener una caja grande con terreno libre; una iglesia no ocupa toda la plaza que comparte.

## Correcciones del propio censo

- **U1772-0265:** la caja manual anterior `[1453,434,1496,455]` caía sobre una quebrada, no sobre el cuerpo rojo. Se conserva en `bbox_anterior` y se corrige a `[1407,435,1440,456]`, al poniente de La Pastora. Se recalcula su localización candidata en el sistema.
- **U1772-0257:** cuerpo rojo en el borde de U1772-0004. Se registra como parte de esa unidad para evitar contarlo como manzana adicional. Se mantiene el ID y la relación; el trazado posterior precisará el límite de parcela/frente.
- **U1772-0272:** franja larga diagonal al pie del Calvario, caja `[637,433,717,506]`, omitida por el filtro automático. La calle la separa de la unidad triangular U1772-0013. La caja sirve para localizarla y no representa su huella edificada.
- **U1772-0187 y 0188:** se mantienen separadas: el original dibuja una calle entre estas dos franjas estrechas. No forzar una manzana cuadrada.

Estas correcciones explican por qué no se importan las cajas al generador. En el cruce actualizado hay 272 localizaciones y 185 sin centro de techo visible; siguen siendo alertas dependientes de un calce discutido, no 185 omisiones confirmadas.

## Cómo repetir la lectura

Usar el original cuyo hash fija B1772-001. Para cada sector, recortar `bbox_lectura` de `sectores.json`, ampliar 3× y localizar las cajas por `id_fuente`. Los paneles de inspección locales están en `.cache/censo-1772/.cache/paneles/`; sus marcas se superponen a una copia del original, no lo alteran. Los cambios de U1772-0265 y U1772-0272 se revisan además directamente en el original porque los paneles de la primera pasada muestran las cajas anteriores.

Contrastar cualquier unión dudosa con el trazo negro y el espacio blanco de calle; no deducirla de la fracción roja. Conservar la diferencia entre terreno libre, plaza, camino, ribera y edificio. Después se trazan nodos/calles y se contrasta cada frente con el sistema. La fase 1 no está cerrada.
