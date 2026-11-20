# Candelaria y La Pastora: identidad, ocupación y calce

Continuación de T33j.1c. Se amplía el diagnóstico del calce fuera del núcleo. Las coordenadas siguientes son localizadores, **no GCP nuevos** ni mediciones de precisión histórica.

## Identificación cruzada

El original de 1772 no nombra todos los símbolos religiosos. El [plano de barrios de Agüero de 1775](../../fuentes/mapas/1775-pares-agi-aguero-barrios/ficha.json), conservado en el repositorio, sí tiene una leyenda: nº 4, parroquia de Candelaria; nº 14, templo de La Pastora. Se inspeccionaron leyenda, posición respecto de ríos/plazas y damero, y los rótulos de ambas iglesias en el mosaico de 1936.

El plano de 1775 solo se usa aquí para identificar los conjuntos, no para sustituir calles u ocupación de 1772. Original de 1775: 1700 × 2437 px, SHA-256 `a6b6946e8ac20ac34c0c378de34425cca81b682ee34da73340062f5a60b5e94f`. Leyenda en `[140,470,1565,740]`; nº 4 en torno a `[1380,1440]` y nº 14 en torno a `[410,985]`.

| Conjunto | Localizador del símbolo en 1772 | Localizador actual en mosaico | Proyección TPS del símbolo | Separación orientativa |
|---|---|---|---|---|
| Candelaria | [1066,1355] | [11230,7000], marca actual | [10634,7059] | ≈299 m |
| La Pastora | [1456,476] | [8113,4866], origen del hito | [8150,5086] | ≈111 m |

No son puntos homólogos exactos: un símbolo religioso, una etiqueta y el origen de un modelo pueden representar lugares diferentes del mismo conjunto. Por ello estas separaciones **no se agregan a las estadísticas de los 23 cruces**, ni se convierten en anclas. Sí obligan a revisar la correspondencia periférica antes de interpretar cajas proyectadas como ubicaciones exactas. Para un ajuste posterior habrá que medir cruces/plazas homólogos y reservar controles independientes.

## Comparación con el sistema

Se repitieron dos capturas dirigidas a las referencias actuales, para evitar que una cámara calculada con el propio TPS ocultara la discrepancia. Código `57b1d38` (solo documentación sobre B1772-001); mismos 118 archivos de datos, viewport 1400 × 1400, Chromium 159.0.8154.6, servidor 5205, `?capture&sinintro`, época comprobada con `lineaDeTiempo.actual == 1`, ola finalizada. Poniente arriba: yaw π/2, pitch 1,5.

| Captura | Cámara x, z, distancia | SHA-256 |
|---|---|---|
| candelaria-referencia.png | 1130,9; 80,5; 1000 | `4374c24e75c107761ac5545629fa0581d6992482ab3dbc0a90e1cae8cb0cc9f4` |
| pastora-referencia.png | −427,6; −986,5; 850 | `e126e09c72792c7920df0045aef5e4934aaac8883bbed6fddd05605667b7e230` |

Archivos locales: `.cache/censo-1772/.cache/sectores/`. En Candelaria no aparecen el conjunto ni las casas próximas: se ve terreno con árboles y tinta de 1936. En La Pastora aparece el hito aislado, sin el tejido parcial vecino dibujado en 1772. Esto confirma la observación general de omisión; no permite asignar todavía cada vivienda ausente a una huella métrica.

I1772-009 queda con identidad confirmada y forma histórica pendiente. El código de la marca declara explícitamente que empieza en 1889 por falta de cotejo; esta nueva lectura da una referencia para corregir esa fecha en fase 4. No habilita a copiar el edificio de 1936 ni la forma posterior de sus torres.

## Lectura detallada del sector S1772-43

Se inspeccionó el recorte original `[945,1200,1395,1555]` ampliado 3× y se clasificaron las **18 unidades provisionales** cuyo centro cae en S1772-43. Las observaciones por ID están en `unidades-original.json`, campo `revision_original`. No son todavía polígonos de construcción ni correspondencias métricas verificadas.

- Continuas: U1772-0174, 0175, 0182 (3).
- Parciales: U1772-0176, 0177, 0181, 0183, 0184, 0187, 0188, 0216 (8).
- Terreno libre: U1772-0178, 0243, 0245, 0246, 0247, 0248 (6).
- Conjunto especial: U1772-0214, plaza de Candelaria y cuerpos construidos (1).

Dos excepciones que deben conservarse: U1772-0187/0188 son franjas estrechas **separadas por una calle**; no fusionarlas para formar una manzana cuadrada. Las unidades de ribera tienen contornos truncados o abiertos: sus cajas nunca deben convertirse automáticamente en rectángulos edificados.

U1772-0214 demuestra por qué no se usa la fracción roja del detector como clasificación: el candidato declara 0,882, pero el original contiene una plaza extensa con solo tres cuerpos rojos. U1772-0183 tampoco es completamente maciza: conserva una franja libre oriental. Estos casos deben ser controles negativos de cualquier corrección que rellene huecos.

Queda pendiente trazar los límites y tramos de este sector, reconciliar el calce y enlazar cada frente con su contraparte. La clasificación original de 18 unidades no equivale a cerrar la inspección de sus casas o accesos.
