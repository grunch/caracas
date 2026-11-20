# Barrido de los 16 sectores y localización de unidades del original

T33j.1b, 20-11-2026. Se recorrieron visualmente los 16 sectores del sistema y el original completo. **Barrido general realizado; censo detallado y diagnóstico todavía abiertos.** No cambia geometría ni habilita a usar los candidatos como datos del generador.

## Entrega

[unidades-original.json](unidades-original.json) localiza 271 unidades provisionales mediante cajas en el escaneo: manzanas candidatas, plazas, extremos de trama abierta y edificaciones aisladas. Incluye 55 localizaciones manuales y 216 candidatos de contorno. No son 271 manzanas confirmadas. Se conserva una advertencia explícita: las cajas no son polígonos de construcción y los contornos de color pueden delimitar una parcela, no una manzana completa.

Los IDs `U1772-…` identifican estas unidades de trabajo; no reemplazan ni renumeran los diez `M1772-…` del primer lote. Los enlaces `id_manzana_previo` / `id_fuente` permiten revisar su correspondencia. Antes de promover una unidad al censo definitivo se debe confirmar qué calles la delimitan, si incluye una plaza, si está duplicada o si contiene varias unidades.

[correspondencias-candidatas.json](correspondencias-candidatas.json) cruza las cajas con el paquete fijado B1772-001. Hay **1.811 registros de techo visibles en época 1**, sin contar los hitos que el visor modela aparte. En 184 cajas no cae ningún centro de huella; 40 de ellas tienen una fracción roja candidata ≥ 0,85. Estos son disparadores de inspección, **no 184 manzanas faltantes ni 40 omisiones demostradas**: hay terrenos vacíos reales, límites aún sin validar, errores posibles del calce y edificios modelados aparte.

[sectores.json](sectores.json) registra para cada sector cámara, hash de captura, observación del barrido y cantidad de unidades provisionales. Se mantiene pendiente el censo de calles entre cruces y los frentes asociados. Una observación general no marca todas las unidades del sector como verificadas.

## Hallazgos que cambian el alcance del diagnóstico

1. **Ocupación periférica omitida (I1772-007).** Las vistas del Calvario y del área de Candelaria muestran grandes áreas sin casas donde el original dibuja ocupación. Debe revisarse la generación histórica, no únicamente alinear los edificios que ya existen. La hipótesis a seguir es `tools/geo/epocas.py:nace`: deriva muchas casas de las huellas de 1936 y exige existencia continua en las épocas posteriores. El código confirma esa regla; todavía no prueba que sea la única causa de cada omisión.
2. **Fondo de otra época (I1772-008).** `src/main.js` deja `indicePlanos` vacío salvo con `?planos`, por una decisión previa documentada como T25b. Así aparecen trazas de 1936 bajo la ciudad de 1772. No deben contarse como calles históricas ni usarse para justificar ocupación. Su corrección necesita conservar el motivo original de T25b: evitar una textura vieja pegada como parche. Se asigna a la verificación/entrega visual, sin modificar ahora el fondo.
3. **Candelaria (I1772-009).** El original muestra un conjunto religioso en ese sector; la etiqueta actual nace en época 3. Hay que verificar la correspondencia y la forma histórica antes de adelantar su nacimiento. No trasladar automáticamente el edificio actual al siglo XVIII.
4. **Excepciones necesarias.** Los sectores de río/campo y los extremos abiertos del damero no deben llenarse con casas ni cerrarse como bloques cuadrados. Se incorporaron unidades de terreno libre y trama abierta para que los controles no premien una reconstrucción artificialmente uniforme.

## Método reproducible y límites

Código de captura: `c13a3e0` (#75 integrado); sin cambios en `src/` respecto de `af0c664` de B1772-001. `public/` se copió desde la baseline aislada; se verifican nuevamente sus 118 hashes. Servidor exclusivo en 5205, URL `/?capture&sinintro`, Chromium 159.0.8154.6, viewport 1400 × 1400, DPR 1. Selección y finalización de la ola de época como en [README](README.md). Cámaras con yaw π/2 y pitch 1,5: Poniente arriba, como en el original. Las capturas quedan en `.cache/censo-1772/.cache/sectores/` del checkout principal, fuera de git.

Para las cámaras sectoriales se transformaron las cuatro esquinas de `bbox_lectura` con `Calce.ajustar(gcps, 0.5, suavizado)`; el centro es la media de esas esquinas proyectadas, llevada al mundo con plaza `[8968.2,6839]` y 0,5 m/px. La distancia es 2,2 veces la mayor extensión proyectada en metros. Esta transformación es orientativa, no un calce validado por controles independientes.

Localización inicial de contornos: OpenCV sobre el original intacto, gris < 100, `RETR_TREE`, `CHAIN_APPROX_SIMPLE`. Filtro: área entre 650 y 14000 px², ancho/alto entre 25 y 240 px, caja interior a x=200…1700 e y=250…1520. Se descartan contornos anidados bajo otro candidato. Segunda pasada con cierre 3 × 3: solo se incorporan cajas que no solapan más de la mitad de la menor con las anteriores. Se excluyeron dos sombras del Calvario y dos fragmentos de ribera vistos en la inspección; se añadieron las 55 cajas manuales. Las localizaciones fuera de ese filtro, incluidas alcabalas y casas aisladas, se revisaron visualmente y se registraron manualmente. La detección no garantiza exhaustividad: se requiere la pasada de censo por calles.

`rojo` es la fracción de píxeles del **contorno candidato** con R > 1,22·G y R > 1,18·B. No mide la ocupación de toda la caja ni determina por sí sola la clasificación histórica. En las localizaciones manuales queda `null`.

Cruce con el paquete: descomprimir el `.pak`, deshacer byte-shuffle de `vertices`, `techos` y `vida`; tomar la media de los vértices de cada huella cuyo `nace <= 1` y `muere == 0 || muere > 1`. Proyectar esos centros con `Calce.al_viejo` y contar los que caen en cada caja, bordes incluidos. Las cajas pueden solaparse: no sumar sus conteos como población de la ciudad. Tampoco incluir hitos ausentes del `.pak` como omisiones automáticas.

## Próximo paso de la fase 1

Validar el contorno y la identidad de las unidades usando **la red de calles del original**, empezando por las centrales enlazadas al primer lote y extendiendo hacia las cuatro periferias. Eliminar duplicados de parcela/manzana sin reutilizar sus IDs; conservar decisiones y reemplazos. Censar calles y frentes, verificar controles de calce independientes y convertir cada omisión observada en una incidencia localizada con causa rastreada. Solo después se cierra la fase 1 y se aplican correcciones.

Actualización posterior a esta primera entrega: la [revisión detallada por sectores](revision-original-por-sectores.md) amplía a 292 registros clasificados, corrige cajas y conserva un descarte y una relación de parte; los conteos anteriores describen la entrega inicial de #76.
