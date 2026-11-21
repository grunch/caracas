# Auditoría 1772 · entrega 1A y primer lote de observaciones

Fecha: 20-11-2026. T33j.1a.

Continuación: [barrido de los 16 sectores y censo extenso](censo-extenso.md). Entrega 1D: [cierre de la fase 1](cierre-fase1.md), con los [controles de damero y correspondencias](controles-damero.md); la fase sigue abierta (4/6 criterios: faltan la correspondencia por unidad y, desde el calce por identidad, los controles por sector, que pasan al LOO). Los conteos de este README describen la primera entrega; las incidencias y sectores se amplían en la continuación. **Auditoría en curso, sin correcciones de geometría.**

Se fijó una copia independiente del código y de los datos, se verificaron sus hashes y se inspeccionaron diez manzanas en vista alta, más dos vistas oblicuas. No se ha terminado el censo del original ni el diagnóstico de causas. Ninguna manzana se declara completamente verificada.

## Evidencia y resultados

- [B1772-001.json](B1772-001.json): commit, hashes de 118 archivos locales, comparación con el sitio publicado, navegador y hashes de 13 capturas.
- [sectores.json](sectores.json): 16 sectores sobre el original, con solape de lectura; todos pendientes de censo completo. Cubren también periferias, cauces y caminos, no solo la extensión de las casas generadas. Cartela y rótulos se clasificarán como no urbanos, sin tratarlos como ausencia de casas.
- [manzanas.json](manzanas.json): primer lote de 10 manzanas y 40 frentes identificados. Correspondencias heredadas de #69, no un nuevo calce aprobado; inspección visual parcial. El total de unidades del original todavía es desconocido.
- [incidencias.json](incidencias.json): 6 registros iniciales; 3 defectos visuales confirmados, 1 defecto de metadatos confirmado, 1 candidato de cubierta y 1 duda sobre el cierre de un conjunto religioso. No son seis causas ya demostradas ni el total de fallas de Caracas.

| ID | Hallazgo | Qué falta determinar |
|---|---|---|
| I1772-001 | Frente oeste interrumpido en la manzana al norte de Plaza Mayor, aunque la referencia la documenta cerrada | Casa suprimida, lote ausente o ala recortada; probar acceso a pie |
| I1772-002 | Esquina suroeste abierta en Camejo–Cruz Verde, con frentes que no enlazan | Registro descartado y motivo; probar acceso a pie |
| I1772-003 | Quiebre del frente oeste y cubiertas diagonales en Seminario, sobre un lado histórico recto | Separar error de lote de error de cubierta |
| I1772-004 | Separación entre Catedral y casas del frente norte | Si falta cierre del conjunto o corresponde una excepción; no cerrar por intuición |
| I1772-005 | Encuentro de cubierta de esquina en Cruz Verde–Velásquez | Medir caras y revisar oblicua; un inglete triangular no es por sí mismo un error |
| I1772-006 | El manifiesto declara 35.089 techos, pero el `.pak` tiene 33.853 registros | Causa del conteo desactualizado; no equivale a 1.236 casas faltantes en 1772 |

Las vistas oblicuas confirman la discontinuidad visible de I1772-001/002; no prueban todavía las colisiones. Los demás frentes aparentemente continuos siguen pendientes de medición, inspección de accesos y validación histórica independiente. El suelo mantiene trazas del plano base en interiores: no se usaron esas trazas como prueba del trazado de 1772.

## Base reproducible

Código capturado: `af0c664cf773e773f568cf56860696803880158d` (#74 integrado). Se trabajó en `.cache/auditoria-1772-base`, sin cambiar la rama del checkout principal. `public/` es una copia independiente, no un enlace al directorio mutable de otra sesión. Ninguna entrada se regeneró.

El manifiesto local coincide con todos sus archivos declarados. Se descargaron también el manifiesto y `ciudad.pak` de `https://caracas.city/`: sus hashes coinciden con los locales. El bundle publicado declara `3ed220ed503bac89dc8e164565021995b099140c`; no hay diferencias en `src/`, `vite.config.js` ni `package-lock.json` respecto de la base local. El commit adicional corresponde a publicación/CI. No se descargaron todos los demás assets publicados y no se presume igualdad de sus bytes.

La procedencia exacta del release y del commit generador de los datos locales no está acreditada; se fija su contenido por hash. La discrepancia del conteo no invalida la igualdad de los bytes. Son controles distintos.

Capturas originales locales: `.cache/auditoria-1772-base/.cache/evidencias/`, desde la raíz del checkout principal. Se conservan fuera de git. Los nombres y hashes están en la baseline; cada manzana tiene su cámara y cada incidencia su caja de interés dentro de la captura. Se pueden revisar directamente con un visor de imágenes. No se han publicado escaneos ni capturas como assets del sitio.

Para repetir la observación:

1. Crear un checkout del commit base, instalar las dependencias del lockfile y usar datos cuyos hashes coincidan con B1772-001. Un release más reciente no es automáticamente esta baseline.
2. Ejecutar Vite desde ese checkout en un puerto exclusivo (se usó `5204`), viewport 1400 × 1400, Chromium `159.0.8154.6`, DPR 1. Argumentos usados: `--use-angle=gl --enable-gpu --ignore-gpu-blocklist`.
3. Abrir `/?capture&sinintro`, esperar `window.lab.ready`, `relieve`, `arboles` y `lineaDeTiempo`. Levantar la ciudad, activar color y elegir índice 1. Verificar `lineaDeTiempo.actual === 1`, `uEpocaDe === 1` y `uEpocaA === 1` antes de interpretar la imagen.
4. Posicionar con `window.lab.cam.jump({x,z,dist,yaw,pitch})` usando `manzanas.json`; solicitar cuadros con `window.lab.pedirCuadro(4)`. El pitch solicitado de 1.56 se limita a **1.5** en la cámara: son vistas altas con perspectiva, no ortofotos métricas. Para las dos oblicuas usar el mismo centro, distancia 380, yaw 1.57 y pitch 0.85.
5. Dejar terminar las transiciones. En la captura se fijaron `uOla=1e5`, `uColor=1`, `uOlaEpoca=8999`; se ocultaron con CSS `#epocas,#botones,#leyenda,#buscador,#firma`. El buscador permanece visible y no tapa las manzanas examinadas. La vista general usa x=-140, z=70, distancia=3300, yaw=0 y pitch solicitado=1.56.
6. Volver a comprobar hashes al terminar. Diferencias de GPU pueden alterar píxeles; los hashes de capturas identifican la evidencia, no son una prueba automática de igualdad geométrica.

Para comprobar I1772-006: descomprimir `ciudad.pak` con gzip, leer el primer uint32 little-endian como longitud de la cabecera JSON y buscar la parte `techos`. Sus 541.648 bytes / 16 bytes por registro dan 33.853 registros. No contar etapas visuales ni inferir población histórica de esta diferencia.

## Calce: límite encontrado antes de medir fachadas

En la baseline, `tools/geo/gcp/calce-1772-pares-agi-exato-mapa.json` declaraba residuos por dejar un punto fuera: RMS 12,92 m, p90 19,16 m, máximo 24,78 m. Ese era el calce anterior, por correlación; el vigente, por identidad, declara RMS 21,8 m y p90 30,0 m ([calce-identidad.md](calce-identidad.md)). Son métricas declaradas del ajuste, no una medición independiente realizada en esta entrega ni un límite de error garantizado en toda la periferia.

En ese calce anterior, las cuatro semillas manuales correspondían a esquinas de Plaza Mayor y numerosos puntos restantes procedían de correlación automática. No se puede usar el umbral de 25 m como tolerancia de alineación de una fachada. La continuidad histórica debe comprobarse por correspondencia topológica; la rectitud del modelo tiene su propia tolerancia numérica.

Pendiente de 1A: revisar controles independientes distribuidos en periferias y medir residuos por sector. **La base está fijada, pero la validación del calce no está terminada.**

## Continuación inmediata (T33j.1b)

Censar sobre el original, sector por sector, todas las unidades que faltan. Empezar por los sectores centrales S1772-22/23/32/33, enlazar el primer lote sin duplicarlo y continuar hasta los 16 sectores. Asignar calles entre cruces y sus dos frentes; registrar correspondencias ausentes, adicionales, fusionadas y partidas. Los IDs ya asignados no se renumeran al ampliar el censo.

Registrar expresamente las excepciones que el original muestra: plazas con entrantes, bordes de quebrada, manzanas parcialmente ocupadas y edificios aislados. Los sectores no pasan a completos por tener una captura general. A continuación localizar cada defecto en los registros del `.pak` y su etapa de generación, con evidencia de origen; solo entonces abrir las subtareas correctivas de fases 2–7.

Comprobaciones de esta entrega: integridad de JSON, IDs únicos, referencias internas, cajas dentro del original, existencia y hash de las capturas, todos los hashes locales declarados, conteo de registros del `.pak` y diff documental limpio. No se cambiaron aplicación ni generador; las suites de aplicación no sustituyen estos controles y no se repitieron para este inventario documental.

El [contraste de cruces y calles](calce-y-calles.md) añade 23 cruces únicos, 32 tramos y el diagnóstico I1772-010: discrepancia del TPS respecto de las referencias curadas. No cierra el censo ni la validación del calce.

El [trazado de la red original](trazado-red.md) amplía la lectura a 84 líneas y 455 tramos candidatos, conserva las excepciones y propone correspondencias con los 32 tramos previos. No cierra la fase 1 ni modifica el generador.

El [diagnóstico geométrico](diagnostico-huellas.md) mide las 1.811 huellas visibles y rastrea I001/I003 antes del visor. Introduce I011 (solapes de huellas) sin confundirla con una certificación de cubiertas o accesos.

El [enlace de frentes candidatos](frentes-candidatos.md) amplía la red a 85 líneas y 470 tramos y enlaza 147 caras con 590 bordes; quedan 145 registros sin asignación única.

El [contraste de las 292 unidades](contraste-unidades.md) registra candidatos y ausencias bajo el TPS y rastrea la regla temporal en seis unidades; la correspondencia geométrica y la revisión de accesos siguen pendientes.

El [sondeo de accesos](accesos-primer-lote.md) evalúa los 40 frentes iniciales y reproduce dos recorridos en el navegador; confirma penetración en Camejo–Cruz Verde y Seminario sin certificar todos los patios.

## Lectura de ocupación por borde

[Lectura visual de caras candidatas](lectura-bordes-original.md): 590 bordes de 147 unidades, con IDs conservados y diez falsos positivos de proximidad descartados. No cierra la fase 1 ni autoriza generar casas sobre las caras candidatas.

[Unidades edificadas sin cara única](contornos-sin-cara.md): 78 recortes inspeccionados, con decisiones para preservar riberas, pasos, manzanas alargadas y cuerpos aislados.

[Contrato de referencia histórica](contrato-referencia.md): 23 cruces compartidos y diez unidades pendientes, con validación de identidad/topología y selección explícita. Todavía no habilita generación.

[Lectura de los 67 registros restantes](lectura-restantes-original.md): completa la lectura individual de los 292 registros censados, conservando terrenos libres, cuerpos aislados y descartes. La correspondencia y los accesos siguen pendientes.

[Medición de cruces de cubierta en 3D](cruces-cubiertas-3d.md): 271 pares candidatos con superficies que se cortan, diferenciados de solapes de proyección; dos vistas oblicuas inspeccionadas y cuatro pares rastreados al origen.

[Continuidad de calles](continuidad-calles.md): medición de 32 ejes curados, 64 recorridos del controlador y contraste separado de los 470 tramos candidatos; C0031 se desliza junto a dos huellas.

[Conteos del paquete y del origen](conteos-publicados.md): corrige I006 en la generación del manifiesto; conserva controles de 1936 y no modifica geometría. Publicación pendiente.

- [Revisión de bordes especiales](bordes-especiales-original.md): doce bordes de siete unidades; dos contornos observados y seis símbolos religiosos.

## Cierre de la fase 1

[Entrega 1D](cierre-fase1.md): 292 unidades clasificadas y leídas, 16 sectores recorridos, 13 incidencias con subtarea. [Controles por identidad de damero](controles-damero.md): 168 cruces y 3 hitos muestran que el TPS se desplaza por cuadras enteras fuera del núcleo (Candelaria a 303 m); 292 correspondencias clasificadas bajo un calce de control (42 uno a uno provisionales, 168 ausentes). Fase 1 abierta: U1772-0055 contradice su clase. Los recorridos de calle de Catedral y Seminario ya están hechos (I1772-003 e I1772-013 → T33j.7a); no certifica fidelidad ni cierra incidencias.

[Calce por identidad](calce-identidad.md) (T33j.2a, primera parte): el calce de 1772 deja la correlación y se ajusta con 164 cruces de damero, 4 semillas y 2 hitos validados (cruces únicos, orden de calles, sin pliegues). Candelaria queda a 34 m sin su ancla (antes 303 m); S1772-24 y S1772-31 siguen sobre 15 m de mediana dejando uno fuera. Falta revisar esos nodos, reclasificar las correspondencias y regenerar los datos.
