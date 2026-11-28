# Reglas de construcción del mapa (T82)

Lo que **toda época** del mapa tiene que cumplir, cómo se mide y cómo se trabaja cuando se arregla algo. Rige siempre: para cualquier cambio que genere o toque casas, manzanas, lotes, calles, fachadas, techos, hitos, marcas o suelo, en cualquier época, y para toda auditoría nueva ([12](12-metodologia-auditoria-de-epoca.md)). Un cambio que rompe una regla en cualquier época no se fusiona, salvo que la excepción quede registrada como límite (§ 2.7).

Nació de la revisión visual de 1843 del 25-11-2026: los seis puntos del responsable (R1 a R6) y lo que encontró Claude al mirar el sitio (D1 a D6, § 7). Las cifras de cada época salen de la investigación (§ 3), **nunca se suponen**: hasta que una cifra tiene fuente, la regla se mide pero su umbral queda «pendiente de F0».

## 1. Las reglas

Cada regla dice qué, por qué, cómo se mide y qué umbral cierra. «Frente» es el tramo de borde de una manzana sobre una calle; «línea de fachada», la recta de ese frente (como en la fase 5 de [08](08-auditoria-y-correccion-1772.md)); «calzada», el corredor de la calle entre las líneas de fachada de los dos lados.

| Regla | Qué tiene que pasar | Por qué | Cómo se mide | Cierra con |
|---|---|---|---|---|
| **R1 · Una fila por frente** | Sobre cada frente corre **una sola** fila de casas: la crujía del frente, con la cumbrera paralela a la calle. Detrás de ella, adentro de la manzana, van los patios, corrales y solares de esas mismas casas. No hay segunda ni tercera fila de casas. | La manzana colonial y republicana es un anillo de casas con el corazón libre (`fuentes/imagenes/README.md`: grabado de 1812 y vista aérea del pueblo colonial). Las filas de atrás salen de heredar la subdivisión de 1936. | Por frente: las casas cuyo frente no toca la línea de fachada (retiro mayor que la tolerancia de fachada) y que tienen otra casa entre ellas y la calle. | 0 casas en segunda fila (salvo callejón o calle propia dibujada en el plano de la época, como límite) |
| **R2 · Calles libres** | Ninguna casa, alero, árbol, tapia ni parte de un hito genérico entra en la calzada. Toda calle de la época se recorre de punta a punta. | Una calle tapada es un error visible y rompe los modos a pie y en coche. | Huellas y techos (`tools/cubiertas.mjs --epoca`) contra el núcleo de calzada; continuidad de la red de la época (fases 3 y 6 de 08). | 0 invasiones; red continua |
| **R3 · Casas alineadas** | La fachada de cada casa cae sobre la línea de fachada de su frente y la casa está **paralela** a su calle. En las esquinas, las crujías de las dos calles se unen. | Las casas giradas o corridas son lo que más delata una ciudad generada. | Por casa del frente: distancia de su fachada a la línea y giro respecto de la calle. | Retiro ≤ 0,5 m (la tolerancia de fachada de 08); giro ≤ `GIRO_MAXIMO_GRADOS` de `tools/geo/fachadas.py` |
| **R4 · Calles con su ancho** | Entre las fachadas enfrentadas queda al menos el ancho mínimo de calle de la época. | Las calles de hoy son lo que sobrevive de la traza: las de 1772–1843 no eran pasillos. | Distancia entre las líneas de fachada de los dos lados, muestreada a lo largo de cada calle. | ≥ ancho mínimo de la época (§ 3; pendiente de F0) |
| **R5 · Fachada a la calle** | La fachada (portón, ventanas con reja, zócalo) da **solo** a la calle. Hacia el patio, la casa abre al corredor con una puerta por donde se sale al patio. Las medianeras (paredes entre vecinas) son ciegas. La casa de esquina tiene fachada en sus dos calles. | Una casa con fachada de calle hacia su propio patio no existe. | Test de la geometría y del shader de fachadas: qué cara recibe portón y ventanas según el marco de la casa (`src/alas.js`, `src/shader/fachada.js`), y capturas a pie. | Fachada solo en caras sobre la línea de fachada; 0 portones de calle hacia adentro |
| **R6 · Casas por cuadra de su época** | El número de casas por manzana y el frente medio de cada casa están en el rango histórico de la época. En el centro, casas grandes de las familias acomodadas (lotes anchos, varios patios). Hacia las orillas, casas más chicas y solares. El total de casas de la época está cerca del que dan las fuentes. | Hoy cada época hereda los lotes de 1936: 1843 tiene 10.287 casas a la vista, posiblemente el doble o más de lo que la ciudad tenía (a verificar en F0). | Por manzana: casas, frente medio, fondo medio y patios; total de la época. | Rango de casas por manzana y frente medio de la época; total ± 15 % del de las fuentes (§ 3) |
| **R7 · Lo edificado sigue al plano** | Las manzanas que el plano de la época dibuja edificadas tienen casas; los lotes especiales, plazas, huertas y terrenos libres no las tienen. | Una manzana céntrica vacía (D1) o una plaza con casas es un error de lectura o de generación. | La referencia de la época (censo revisado) contra las casas a la vista, como la fase 4 de 08 y las fases 3–4 de 11. | 0 manzanas edificadas vacías; 0 casas en lugares libres |
| **R8 · Suelo coherente** | El suelo urbano (calles y patios de tierra) va solo donde hay ciudad de esa época. Los patios y solares se dibujan solo dentro de casas de la época. El borde con el campo sigue la ciudad sin escalones ni halos. | Las manchas de patio sin casa (D2) y el suelo liso sin manzanas (D3) se ven como errores. | Píxeles de patio o solar fuera de casas de la época; área de suelo urbano sin manzana a menos de media cuadra; capturas del borde. | 0 patios sin casa; suelo urbano sin manzana ≤ umbral a fijar en F1 |
| **R9 · Cada nombre en su lugar** | Toda marca de un edificio en pie en la época cae sobre su hito o sobre un edificio que lo representa, no en la calle ni sobre casas genéricas. Una plaza nombrada está libre. | Un rótulo de iglesia sobre un llano o sobre casas (D4) desinforma. | Punto de cada marca contra hitos, casas y calzada de la época. | 0 marcas de edificio en la calle o sobre casas genéricas (o límite «hito pendiente») |
| **R10 · Agua continua** | Ríos y quebradas corren continuos de punta a punta, sin casas encima; los puentes, en su lugar y su época. | El Caroata cortado en el campo (D5) no tiene sentido. | Continuidad de cada cauce y casas sobre su corredor. | Cauces continuos; 0 casas sobre el cauce |
| **R11 · Sin anacronismos** | Nada aparece antes de existir ni sigue después de desaparecer: edificios, puentes, plazas, ferrocarril, avenidas, estilos y pisos. | Es la promesa del mapa por épocas. | Vida de hitos y marcas contra sus fechas con fuente; estilos y pisos por época (`tools/geo/estilos.py`). | 0 elementos fuera de su vida |
| **R12 · Las otras épocas intactas** | Arreglar una época no cambia las demás, salvo cuando la regla se aplica también a ellas y se miden todas. | 1772 ya está auditada; 1843 también. | Las puertas de todas las épocas antes y después del cambio, comparadas: `tools/geo/reglas_mapa.py --todas` y las de las auditorías cerradas (08, 11). Que no cambie cuándo nace cada casa (`epocas.nace_sin_tocar_las_anteriores`, la herramienta del generador) no prueba que las puertas sigan igual. | Ninguna puerta de ninguna época empeora sin límite registrado |
| **R13 · Ningún hito sobre una manzana** | Ningún hito (edificio, recinto, plaza o cementerio modelado a mano) va **sobre** una manzana. Si es chico y cabe dentro, la manzana se conserva y el hito va dentro de ella, sin casas ni árboles encima. Si es grande (ocupa buena parte de la manzana, o es mayor que ella y la pisa), la manzana se **retira entera** en las épocas en que el hito está en pie: casas, árboles y suelo de manzana. No se recorta a medias. | Regla del responsable (27-11-2026), por el Hospital Vargas: los pabellones quedaban sobre suelo de manzana, con casas asomando alrededor. | `tools/geo/hitos_manzanas.py` (lo corre cada paso `retiro-<año>`): por hito, época y manzana, el área común y las fracciones en los dos sentidos; `node tools/hitos-manzanas-tabla.mjs` escribe la tabla (`docs/manzanas-hitos.json`). | 0 manzanas con ocupación ≥ 50 % de recintos de hitos; 0 manzanas pisadas (≥ 10 %) por un hito mayor que ella. Los hitos chicos a caballo del borde de una manzana (ni caben ni mandan) quedan como límite (`docs/manzanas-hitos.md`) |

**1936 es el dato**: sus casas son las del plano. En 1936 se aplican R2 a R5 y R7 a R13 (el ancho de calle de R4, contra el que dibuja el plano), pero no R1 ni R6: la densidad y las filas de 1936 son las del plano.

## 2. Cómo se trabaja (siempre)

1. **Investigar antes de hacer.** Toda tarea que necesita información externa (cuántas casas, qué ancho, cómo era la casa, qué edificio estaba en pie) empieza investigando en la web y en las fuentes del repo, con el workflow de investigación (§ 5). Cada cifra entra a la tabla de § 3 con su fuente (título, autor, año, enlace, cita) y su confianza. Nunca se inventa una cifra; lo que no tiene fuente se marca como inferido, con el razonamiento.
2. **Medir antes y después, en todas las épocas.** `tools/geo/reglas_mapa.py --epoca <año>` (F1) mide R1 a R12 sobre los datos generados y escribe `specs/reglas/medicion-<año>.json`. Un PR que cambia el generador pega en su descripción la tabla de antes (`main`) y después (su rama) **de todas las épocas**.
3. **Mirar con las mismas cámaras.** Las capturas fijas de cada época (`specs/reglas/workflows/capturas.mjs`) se sacan antes y después; la revisión visual compara con el plano original y con las épocas vecinas. Lo que se ve mal y no mide ninguna puerta se convierte en regla o en puerta nueva.
4. **Arreglar en el generador, no a mano.** La corrección va donde nace el defecto (`tools/geo/epocas.py`, `tools/geo/epocas_<año>.py`, `src/alas.js`…), con test primero (TDD). Las ediciones a mano de datos solo como límite registrado.
5. **PRs como siempre** (AGENTS.md):
   - ≤ 3000 líneas de código, la plantilla completa y la tarea `T82.x` en la fila T82 de `specs/07` con el número de PR.
   - **Apilados** cuando uno depende del otro: cada rama sale de la anterior. Tras fusionar la de abajo: `git rebase --onto origin/main HEAD~k`, `push --force-with-lease` y la base a `main` con `gh api -X PATCH repos/<repo>/pulls/N -f base=main` (`gh pr edit` falla por Projects classic).
   - **Revisiones**: esperar a Codex y a CodeRabbit; responder **cada** hilo, aplicar lo que corresponde (con test si es lógica), decir por qué no lo que no corresponde y resolver el hilo. Si un bot no revisó, pedírselo.
   - Fusionar con CI verde y bots resueltos (squash, sin borrar ramas).
6. **Prueba a mano de una persona.** Los PRs que cambian lo que se ve quedan abiertos hasta que el responsable haga la prueba a mano (AGENTS.md). Claude corre los pasos, los deja escritos con su «Se ve:» y sus capturas, y avisa.
7. **Límites registrados** en `specs/reglas/limites-<año>.json`: regla, elemento (centro de casa, id de manzana o de marca), evidencia, motivo, fecha y «decisión de Claude por delegación del responsable» cuando corresponde. Ampliar una tolerancia no es un límite.
8. **Datos.** Regenerar (`npm run datos`, revisar **siempre** su código de salida) y publicar (`npm run datos:publicar`) al cerrar cada época con todo verde (autorizado). Verificar que el manifiesto que sirve caracas.city es el publicado.
9. **Checklist con hook** (`.claude/tarea.md`, [12](12-metodologia-auditoria-de-epoca.md) § 0): una casilla por fase y por época, marcada solo con evidencia.

## 3. Valores por época

Se llenan en F0 con fuente por celda. Hasta entonces, la puerta mide y reporta, pero no cierra.

| Valor | 1578 | 1772 | 1843 | 1889 | 1911 | 1936 |
|---|---|---|---|---|---|---|
| Casas en la ciudad (fuentes) | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | el plano |
| Casas a la vista hoy (25-11-2026, `cubiertas --todas`) | 65 | 6.294 | 10.287 | 11.809 | 14.233 | 35.487 |
| Habitantes (fuentes) | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 |
| Solares por manzana / casas por manzana | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | el plano |
| Frente de casa (centro / orillas) | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | el plano |
| Ancho mínimo de calle | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | pendiente F0 | el plano |

Punto de partida (no es fuente histórica): la vista aérea del pueblo colonial que aportó el responsable (`fuentes/imagenes/README.md`) muestra manzanas de unos 100 m, lotes de 10 a 15 m de frente y 25 a 50 m de fondo, y crujías de 5 a 8 m. Eso da del orden de 7 a 10 casas por frente; hay que contrastarlo con las fuentes de Caracas.

## 4. Plan de ejecución (T82)

| Fase | Qué | Entrega | Estado |
|---|---|---|---|
| **F0 · Investigación** | Workflow de investigación (§ 5) sobre siete temas: (1) solares por manzana y su subdivisión; (2) casas y habitantes por época; (3) ancho de las calles; (4) tipología de la casa colonial y republicana, qué abre a la calle y qué al patio; (5) pueblos comparables conservados; (6) edificios en pie por época; (7) ríos, quebradas y puentes. Cada afirmación, verificada por un agente que intenta refutarla. | La tabla de § 3 llena con fuentes; `specs/reglas/investigacion.json` con cada afirmación, fuente, cita y veredicto | pendiente |
| **F1 · Las reglas como puertas** | `tools/geo/reglas_mapa.py`: R1 a R12 sobre cualquier época, con tests; capturas fijas versionadas; medición de base de las seis épocas. | `specs/reglas/medicion-<año>.json` de las seis épocas | pendiente |
| **F2 · Diseño de la corrección de fondo** | Solares por época: los lotes de 1936 se agrupan en solares del tamaño de la época, con una casa de patio por solar sobre la línea de fachada y el corazón de la manzana libre; calzada con su ancho mínimo. Spike en un sector, con capturas y medición. **Se muestra al responsable antes de aplicarlo a todo.** | Diseño escrito aquí (§ 6) y spike medido | pendiente |
| **F3 · Fachadas (R5)** | Fachada solo a la calle; corredor y puerta hacia el patio; medianeras ciegas. Cambia el visor en todas las épocas. | PR con tests y capturas a pie | pendiente |
| **F4 · Época por época** | En orden 1772 → 1843 → 1889 → 1911 (y lo que aplique de 1578 y 1936): aplicar F2 con los valores de la época, corregir lo que mida mal, puertas de todas las épocas y de las auditorías ya cerradas (08 y 11), revisión visual, PR, publicación. | Una época cerrada por fila de la tabla de § 8 | pendiente |
| **F5 · Discrepancias puntuales** | D1 a D6 (§ 7), en la época donde aparecen y en las demás si se repiten. | PRs chicos, uno por defecto | pendiente |
| **F6 · Mantenimiento** | Las puertas de R1 a R12 corren con `npm run datos` y fallan si una época las rompe; `specs/12` arranca toda auditoría nueva por estas reglas. | Paso de datos y `specs/12` actualizados | pendiente |

## 5. Workflows

Versionados en [`specs/reglas/workflows/`](reglas/workflows/README.md), con el mismo criterio que los de 1843: el script tal como se corre, sus argumentos y qué devuelve.

- **Capturas** (`capturas.mjs`): de 1772 a 1936. 1578 queda fuera de la línea de tiempo y el sitio no la muestra, así que se revisa contra su plano y su medición.
- **`investigacion.js` (F0)**: un agente por tema busca en la web y en `fuentes/` y devuelve afirmaciones con fuente y cita. Por cada tema, un verificador abre las fuentes e intenta refutar cada afirmación. Al final, un agente arma la tabla de § 3 solo con lo que sobrevive, con rangos cuando las fuentes difieren.
- **`diagnostico-epocas.js` (F1, F4 y cierre)**: por época, en paralelo:
  1. un agente corre `reglas_mapa.py` y resume las puertas;
  2. un revisor mira las capturas fijas y el plano original y lista lo que se ve mal, por regla;
  3. un verificador intenta refutar cada hallazgo mirando de nuevo;
  4. un planificador convierte lo confirmado en tareas `T82.x` con la regla, la causa probable, dónde se arregla y cómo se mide.

  Con `modo: 'cierre'` devuelve por época si cada regla cierra.
- **El ciclo por época.** Los arreglos de código los hace Claude en la sesión principal, PR por PR. Los workflows no pueden esperar una revisión ni regenerar los datos: `fuentes/` no está en los worktrees. El ciclo es:
  1. `diagnostico-epocas.js` para la época;
  2. PRs de las tareas, con sus revisiones;
  3. regenerar los datos;
  4. `diagnostico-epocas.js` con `modo: 'cierre'`;
  5. publicar;
  6. siguiente época.

  El checklist lleva una casilla por paso y por época.

## 6. Diseño de la corrección de fondo (F2)

Pendiente: se escribe con los valores de F0 y la medición de F1, y se muestra al responsable antes de aplicarlo.

## 7. Hallazgos de la revisión visual de 1843 (25-11-2026)

Capturas de caracas.city (`datos-2026-11-25-09ba9f7`) con Chromium headless, comparadas con el plano de Jesurún y con 1772 y 1889 desde las mismas cámaras.

| Id | Regla | Qué se ve |
|---|---|---|
| D1 | R7 | La manzana de la Casa de Gobierno, junto a la Plaza Mayor, está casi vacía (solo el edificio, en una esquina). En el plano de 1843 está toda edificada; en 1772 y 1889 tiene casas. |
| D2 | R8 | Manchas de patio y solar (oliva, con las rayas de los lotes de 1936) donde no hay casas alrededor; en todas las épocas, peor en 1843 (este y sur). |
| D3 | R8 | Grandes extensiones de suelo urbano liso sin manzanas al norte y al este, donde el original dibuja campo; el borde con el verde va en escalera y con halos redondos alrededor de las casas sueltas. |
| D4 | R9, R11 | «Seminario y Universidad» cae en la calle; Santa Rosalía, Candelaria, La Merced, San Mauricio y San Pablo, en pie en 1843, no tienen edificio; «Plaza de San Jacinto» cae sobre casas. |
| D5 | R10 | El río Caroata termina en una V en medio del campo, al oeste, sin llegar a la ciudad. |
| D6 | R2, R8 | Una línea diagonal en el suelo que atraviesa casas cerca de la plaza (vista baja) y una línea vertical blanca. A confirmar. |

Además, en las mismas capturas se ven R1 (dobles filas en las manzanas al norte y al este de la plaza), R3 (casas giradas dentro de las manzanas), R4 y R6 en toda la ciudad.

## 8. Estado por época

| Época | Diagnóstico | Correcciones | Cierre | Publicado |
|---|---|---|---|---|
| 1578 | — | — | — | — |
| 1772 | — | — | — | — |
| 1843 | revisión visual (§ 7) | — | — | — |
| 1889 | — | — | — | — |
| 1911 | — | — | — | — |
| 1936 | — | — | — | — |
