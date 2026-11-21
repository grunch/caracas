# Auditoría y corrección integral de Caracas en 1772

Estado: plan integrado en #74 el 20 de noviembre de 2026. **Fase 1 abierta**: entrega 1D del 20-11-2026 ([cierre-fase1.md](auditoria-1772/cierre-fase1.md), 4/6 criterios): inventario completo, 292 correspondencias clasificadas y controles de calce en todos los sectores con unidades ([controles-damero.md](auditoria-1772/controles-damero.md)). Pendientes para cerrarla: la correspondencia por unidad (U1772-0055 contradice su clase; las 42 uno a uno son provisionales) y el recorrido a nivel de calle de Catedral F1772-0003-3 y Seminario F1772-0010-3. Hallazgo que ordena la fase 2: el TPS por correlación se desplaza por cuadras enteras fuera del núcleo. **T33j.2a es el puente entre las dos fases:** empieza con la entrega 1D, sin esperar el cierre de la fase 1, y su reclasificación por identidad con una muestra visual nueva es la que completa el criterio de correspondencia de 1D. El resto de la fase 2 espera a que la fase 1 cierre. Este documento no certifica la fidelidad del mapa ni habilita a cerrar incidencias por tener tests verdes.

## Objetivo y autoridad de las fuentes

Reproducir la red de calles, las manzanas y la distribución de lo edificado del [original de 1772](../fuentes/mapas/1772-pares-agi-exato-mapa/), conservando sus excepciones. Las casas de cada frente regular deben compartir una recta y estar contiguas. Cuatro lados rectos no implican forzar todas las manzanas a cuadrados perfectos: se conservan proporciones, entrantes, plazas y bordes irregulares documentados.

El original manda para trazado y ocupación. El plano de 1936 y OSM sirven de apoyo al calce, no para imponer calles o edificios posteriores. [Las referencias visuales](../fuentes/imagenes/README.md) orientan fachadas, crujías, cubiertas y cerramientos que el plano no detalla. Una mancha roja no demuestra una cubierta maciza; un terreno verde no demuestra una omisión. Diferenciar siempre observación, reconstrucción e incertidumbre.

## Comparación preliminar y límites

Se volvió a observar el original completo y se generaron una vista general y nueve sectores del sistema local, seleccionando 1772. El original tiene Poniente arriba; no se debe comparar directamente con una captura con norte arriba sin registrar la transformación.

En la vista central persisten encuentros de cubiertas en cuña, frentes interrumpidos y áreas extensas sin edificios junto a conjuntos religiosos. Son candidatos de auditoría: falta establecer para cada uno su correspondencia exacta con el original y su causa. En la vista general la ciudad representada se concentra en el núcleo; debe comprobarse también la ocupación periférica y los caminos del original, fuera del límite de las casas actualmente generadas. No basta recorrer los objetos que ya existen en el sistema.

Las mejoras #69–#71 son antecedentes y casos de regresión, no evidencia de que toda Caracas esté corregida. Una comprobación geométrica puede pasar aunque una calle histórica falte o una manzana esté asignada al lugar equivocado.

Evidencia exploratoria local, no publicada ni incorporada a git:

- Original: `fuentes/mapas/1772-pares-agi-exato-mapa/original.jpg`, 1925 × 1734; SHA-256 `4696d038a55b8088302a496b6eb4678b11173d98d3a15c589530cf78ee7bb62b`.
- Capturas: `.cache/qa/auditoria-1772/{general,noroeste,norte,noreste,oeste,centro,este,suroeste,sur,sureste}.png`.
- Entorno: servidor local `localhost:5199`, época 1772, viewport 1400 × 1400; cámara cenital aproximada, pitch 1.56, yaw 0. General: x=-140, z=70, distancia=2700; sectores: x=-600/-80/440, z=-420/80/580, distancia=1150.
- SHA-256 del manifiesto local observado: `0b7921b5ca0651e11137bab3312c80721597a16a9b93d4336c6bbb1212205a2e`.
- Durante la captura el checkout compartido pasó de `361aa0d` a `8a5e25f` por trabajo independiente. Estas imágenes son exploratorias: la fase 1 repetirá la captura desde un checkout aislado y registrará commit, hashes de los archivos de datos y versión visible en el navegador. No se presupone que el sitio publicado use los mismos datos.
- La nueva imagen anunciada por el usuario aún no fue incorporada. Sus marcas se añadirán al inventario, sin limitar la revisión a esas zonas.

## Fase 1 — Inventario completo antes de corregir

### 1A. Baseline reproducible y registro

Crear un checkout aislado con código y datos fijados. Registrar commit, release de datos o procedencia local, hashes del manifiesto y archivos consumidos, parámetros del generador, navegador, calidad, época y cámaras. Verificar versión del sitio publicado por separado. Evitar que un cambio de rama, caché o release haga comparar versiones distintas.

Registrar puntos de control reconocibles en ambos mapas, transformación, residuos e incertidumbre por sector. Revisar orientación, escala y desplazamientos locales antes de diagnosticar geometría. No prometer exactitud métrica a partir de un plano esquemático. Las tolerancias se acuerdan y documentan antes de evaluar, no se amplían para ocultar errores.

### 1B. Censo sobre el original, no sobre la geometría generada

Dividir toda el área dibujada en sectores con solape. Incluir núcleo, periferias, riberas, caminos y asentamientos aislados. Dar IDs estables a cada manzana (`M1772-…`), tramo de calle (`C1772-…`) y frente (`F1772-…`), independientes del orden del generador. Enumerar primero las unidades del original y después sus contrapartes en el sistema: correspondencia uno a uno, ausente, adicional, fusionada o dividida.

Para cada manzana comprobar todos sus lados, esquinas e interior. Revisar cada calle entre sus dos cruces, incluyendo ambos frentes, continuidad y conexión. Clasificar la ocupación: continua, parcial, aislada, terreno libre, plaza o conjunto especial. Mantener un registro de excepciones históricas con recorte y justificación.

### 1C. Inspección y ficha por problema

Comparar original y sistema con orientación equivalente, primero en planta y luego en vista oblicua; recorrer a nivel de calle los problemas de acceso o solape. Usar detectores automáticos para encontrar candidatos, nunca como sustituto del recorrido completo.

Cada incidencia tendrá:

| Campo | Contenido obligatorio |
|---|---|
| Identificación | ID estable, sector, IDs de manzana/calle/frente; no solo nombre de una etiqueta |
| Localización | Caja en píxeles del original, coordenadas del mundo y cámara reproducible |
| Evidencia | Recorte original, captura actual, versiones y hashes; marcar lo observado y lo inferido |
| Diferencia | Qué muestra el original, qué muestra el sistema, categoría y alcance |
| Diagnóstico | Causa confirmada o hipótesis; etapa del pipeline y rama geométrica usada |
| Prioridad | P0: topología/acceso bloqueado; P1: ocupación, alineación, cierres o cubiertas; P2: detalle visual |
| Resolución | Fase/subtarea, dependencias, prueba que falla antes, criterio visual y PR |
| Estado | Por inspeccionar / confirmado / excepción histórica / incierto / corregido pendiente de verificar / verificado |

Categorías mínimas: calle ausente o espuria; manzanas unidas o partidas; contorno incorrecto; casas faltantes o sobrantes; fachadas desalineadas; casas solapadas; acceso a patios por huecos indebidos; cubiertas degeneradas; conflicto con hitos; error de época; error de calce o datos publicados. Una incidencia puede tener varias consecuencias, pero una causa y un PR responsable claramente identificados.

### 1D. Entrega y puerta de salida

Entregar inventario versionado, índice de evidencias reproducibles, mapa de cobertura y resumen por categoría/sector. Publicar número total de unidades censadas, inspeccionadas y pendientes; no inventar hoy el total. El 100 % del área original debe estar recorrido y cada unidad clasificada, incluidas las que están bien. Los casos inciertos permanecen visibles con una decisión pendiente: no se arreglan por intuición ni cuentan como verificados.

Antes de comenzar correcciones, convertir los hallazgos confirmados en subtareas con archivos afectados, causa, dependencia y criterio de aceptación. Esta fase puede tener PRs de documentación/instrumentación, pero no cambios correctivos en la geometría. El presente PR de planificación no completa la fase 1.

## Fases de corrección

La numeración siguiente es el orden previsto; el inventario determina la cantidad real de PRs. Cada fila se divide en subtareas con valor propio y un máximo de 3000 líneas de código por PR, excluyendo tests y documentación.

| Fase | Trabajo y límites | Listo cuando | Depende de |
|---|---|---|---|
| 2. Referencia histórica verificable | Consolidar geometría curada de calles, manzanas, plazas y ocupación con IDs y procedencia. Registrar las excepciones. Separar datos históricos de heurísticas heredadas de 1936/OSM. No cambiar todavía techos. | Cada entidad corregible tiene referencia y correspondencia; validadores detectan duplicados, cruces imposibles y geometría inválida; incertidumbres explícitas. | 1 |
| 3. Calles y límites de manzana | Recuperar calles ausentes, quitar conexiones falsas, separar manzanas pegadas y corregir contornos. Revisar también periferias. Anchos inferidos identificados como tales. | Red conectada como el original; ningún frente ocupa una calle; San Jacinto y todos los casos inventariados tienen separación correcta; no se crean calles en plazas o patios. | 2 |
| 4. Ocupación de 1772 y conjuntos especiales | Corregir máscaras y fechas que omiten o agregan casas. Resolver reservas de iglesias/conventos sobre su geometría construida, sin borrar vecindarios por el solar entero. | Cada frente edificado, parcial o vacío concuerda con su clasificación; plazas, huertas y excepciones conservadas; hitos sin dobles edificios ni vacíos artificiales. | 3 |
| 5. Alineación y reparto de casas | Una línea de fachada por frente recto; medianeras compartidas; esquinas resueltas sin superposición. Auditar tanto reparto analítico como rutas alternativas para contornos cóncavos o con huecos. | Todas las casas del frente comparten su recta dentro de tolerancia numérica declarada; lotes sin solapes; ninguna casa enfrenta una medianera sin acceso; no se altera la calle aprobada. | 4 |
| 6. Cubiertas | Generar cubiertas a partir de crujías válidas, no de cualquier polígono residual. Corregir cuñas, autointersecciones, ingletes, cumbreras y aleros. Conservar patios. | Sin triángulos degenerados ni techos cruzados; cumbreras coherentes con el frente; aleros sin bloquear calles; mismo trazado y ocupación que en fase 5. | 5 |
| 7. Cierres y accesos | Cerrar discontinuidades indebidas mediante fachada, medianera o tapia según la referencia. Definir puertas/portones y límites de patios. Revisar colisiones junto con la forma visible. | No se entra a patios privados por huecos accidentales; cada casa tiene acceso a calle o acceso documentado; no se sellan pasajes públicos ni se llena con casas un terreno libre. | 6 |
| 8. Verificación integral y entrega | Repetir el censo completo contra el original; revisar vistas cenitales, oblicuas y de calle; comprobar otras épocas y todas las rutas del generador. Preparar código y datos compatibles para publicar. | Todos los defectos confirmados resueltos y verificados; dudas históricas declaradas; suites verdes y revisión visual completa; sitio publicado comprobado con commit y datos esperados. | 7 |

## Cómo evitar que una fase deshaga otra

1. Cada PR indica los IDs que resuelve, la capa que puede cambiar y los invariantes heredados. Un PR de techos no modifica calles ni máscaras de ocupación para hacer desaparecer un fallo de cubierta.
2. Guardar fixtures pequeños por causa y por excepción, además de las once calles y diez cuadras verificadas en #69 y los casos de #70/#71. Añadir test que reproduzca cada causa antes de corregirla; conservar comparación visual original/antes/después con la misma cámara.
3. Si aparece una causa anterior, abrir una subtarea de esa fase, corregirla allí y actualizar las ramas dependientes. No esconderla con otra dilatación, recorte o umbral local en una fase posterior.
4. Regenerar desde entradas fijadas y semilla estable. Revisar el diff de entidades por ID: toda modificación fuera del alcance requiere explicación y evidencia. Los conteos globales de casas o tests aprobados no certifican fidelidad histórica.
5. Tras cada cambio ejecutar los tests específicos, las suites exigidas por el repo (`npx vitest run`, `npx playwright test`, `.venv/bin/python -m pytest tools/geo/tests -q`) y la revisión visual del área afectada y sus vecinos. Verificar épocas anteriores/posteriores cuando cambie código compartido.
6. No cerrar incidencias solo porque el algoritmo ya no falla: volver a contrastar la salida con el original. Repetir el barrido completo al final para detectar efectos acumulados.

## PRs apilados y seguimiento

- Plan: PR de documentación, enlazado como T33j en el plan principal. No cuenta como auditoría terminada.
- Fase 1: crear filas T33j.1a, T33j.1b… según sectores o instrumentación, con entregables verificables. Al finalizar, crear las subtareas concretas de fases 2–8; no fingir estimaciones precisas antes del censo.
- Abrir la rama de cada subtarea dependiente desde la anterior y apuntar su PR a esa rama. Medir el límite de líneas contra su base real. Si una tarea es independiente, sale de main y declara esa independencia.
- Publicar cada PR con resumen, funcionamiento, IDs, evidencia comparativa, checklist de pruebas y límites conocidos. Actualizar su fila con número y estado.
- Esperar CodeRabbit y Codex, resolver comentarios aplicables y responder cada hilo. Se puede avanzar en la siguiente rama mientras revisan, propagando después cualquier corrección de la base y repitiendo sus controles. No mergear sin revisión.
- Tras integrar una base, actualizar el PR dependiente sin arrastrar cambios ya integrados. Verificar diff, datos y tests nuevamente; resolver conflictos por significado, no eligiendo un archivo entero por conveniencia.
- No subir escaneos, capturas ni binarios generados al repositorio. Publicar datos mediante el flujo `datos-*` con la decisión del responsable y verificar que el despliegue consuma ese release. Mantener identificada la pareja código/datos usada para aceptar el resultado.

## Criterio final de aceptación

La ciudad completa de 1772 debe corresponder al original en topología, ocupación y excepciones documentadas. Las reconstrucciones de casas deben tener frentes alineados, cubiertas válidas, patios cerrados cuando corresponda y accesos practicables. No debe quedar ningún defecto confirmado del inventario sin resolver ni sector sin inspeccionar. Las limitaciones de la fuente se publican como tales: no se sustituyen por una falsa precisión histórica.

## Subtareas correctivas identificadas por la auditoría

Estas subtareas concretan las causas ya localizadas; **no cierran la fase 1 ni autorizan a omitir sus pendientes**. Cada una se publica por separado cuando tenga entradas y criterios comprobados. Las referencias de fase 2 deben distinguir entidades aprobadas y pendientes; un candidato por proximidad no puede entrar automáticamente al generador.

| Subtarea | Incidencias / alcance | Archivos o capa previstos | Prueba y aceptación | Dependencia |
|---|---|---|---|---|
| T33j.2a | I010: rehacer el calce de 1772 con anclas por identidad (los 168 cruces de damero y los hitos de [controles-damero.md](auditoria-1772/controles-damero.md)), no con más correlación; reconciliar las referencias del núcleo | `tools/geo/gcp/`, `tools/geo/calce.py` (anclas), `cuadras-1772.json`, registro histórico | Candelaria y La Pastora a menos de una media calle; desvío mediano por sector bajo 15 m; cruces compartidos únicos; orden de calles igual al original; las 42 uno a uno, hoy provisionales, conservadas solo con evidencia de identidad por pareja (las que no la tengan se reclasifican); U1772-0055 reclasificada; las 168 ausentes relocalizadas, no inventadas | Entrega 1D (#107); no espera el cierre de la fase 1, lo completa |
| T33j.2b | Red, contornos y ocupación periférica | Referencia histórica con IDs U/C/F y procedencia; validadores en `tools/geo/` | Ninguna entidad pendiente se incorpora por caja o cercanía; preservar U0036/U0151, plazas y riberas; validar lados compartidos y cruces | 2a |
| T33j.3a | I001/I003: cara histórica contaminada por 1936 | `vectorizar._cuadras_de_antes`, `caras.py`, `cuadras_historicas.py` | Fixture de Norte de Plaza con clase cerro interior y Seminario con entrante moderno: la cara aprobada de 1772 determina su contorno; plazas y otras épocas conservadas | 2a |
| T33j.3b | I007/I010: calles y límites fuera del núcleo | Construcción de caras históricas a partir de 2b, independiente de la red OSM posterior | Calles separan todas las unidades correspondientes; sin cruces por quebradas ni división de manzanas alargadas; comparar los 16 sectores | 2b, 3a |
| T33j.4a | I007: persistencia temporal elimina ocupación temprana | `epocas.py`, reconstrucción propia de 1772 y serialización de vidas | Caso de fracciones `[1,0,1,1]`: conservar ocupación 1772 y ausencia intermedia sin adelantar el edificio moderno; cotejar U0182 y cuadra 3324 completa | 3 |
| T33j.4b | I004/I009: conjuntos religiosos y reservas | `src/hitos/`, datos de marcas, reservas de ocupación | Candelaria distingue cuerpos aislados y plaza; Catedral/San Jacinto no borran vecindarios por el solar completo; sin edificios duplicados | 4a |
| T33j.5a | I001/I002/I003/I011: reparto y contacto entre casas | `huellas.py`, reparto raster/vectorial de `vectorizar.py` | Frentes sobre su recta; lotes sin intersección positiva; resolver rutas cóncavas/huecos sin simplificación independiente que superponga medianeras | 4 |
| T33j.6a | I005/I011/I012: forma y encuentros de cubiertas | `src/ciudad.js` y módulos de cubiertas | Comprobar superficies 3D y alturas; distinguir aleros de techos cruzados; no modificar calle, lote ni ocupación para ocultar defectos | 5 |
| T33j.7a | I001/I002/I003: cierre visible y paso peatonal | Cerramientos de crujías y `src/a-pie.js` / `a-pie-modo.js` | Repetir recorridos de calle a interior; lo visible coincide con colisión, preservar puertas/pasajes; no bloquear un patio completo con una huella invisible | 6 |
| T33j.8a | I006/I008 y entrega integral | Manifiesto, pareja código/datos, fondo de época y verificación visual | Conteos coinciden con `.pak`; fondo no induce calles/edificios falsos; 16 sectores comparados, suites completas, revisiones atendidas y publicación comprobada | 7 |

La medición de huellas (T33j.1e), el enlace de frentes (1f) y el contraste temporal (1g) aportan fixtures y localizaciones para estas tareas. No permiten reducir el alcance final a diez manzanas o a seis unidades: esas son pruebas de causas, mientras que la aceptación sigue siendo la ciudad completa.
