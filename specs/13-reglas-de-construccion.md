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

**1936 es el dato**: sus casas son las del plano. En 1936 se aplican R2 a R5 y R7 a R12 (el ancho de calle de R4, contra el que dibuja el plano), pero no R1 ni R6: la densidad y las filas de 1936 son las del plano.

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

De la investigación F0 (25-11-2026, [`reglas/investigacion.json`](reglas/investigacion.json): 239 afirmaciones con fuente y cita, cada una con un verificador que intentó refutarla). La tabla usa solo las confirmadas o corregidas. *Inferido* significa sin fuente directa, interpolado entre épocas que la tienen, con el razonamiento en el JSON. Una vara castellana son 0,836 m.

| Valor | 1578 | 1772 | 1843 | 1889 | 1911 | 1936 |
|---|---|---|---|---|---|---|
| Casas en la ciudad (fuentes) | 60–65: los solares con «casa» del plano (Salazar Bravo, 2018) | **2.809**, en las cuatro parroquias (visita de Martí) | 4.000–5.400 *inferido* (habitantes ÷ habitantes por casa) | ~9.900 *interpolado*: 8.194 en 1881 y 10.379 en 1891 (censos, parroquias urbanas) | 11.300–13.000 *inferido* | el plano |
| Casas a la vista hoy (`reglas_mapa.py`) | 65 | 6.292 (**2,2 ×**) | 10.284 (**1,9–2,6 ×**) | 11.798 (1,1–1,4 ×) | 14.195 (1,1–1,3 ×) | 35.440 |
| Habitantes | ~60 vecinos (Relación de 1578) | 18.669 (Martí) | 30.000–40.000 *inferido* (Codazzi ilegible: 35.000 o 55.000) | 55.638 (1881) – 72.429 (1891) | ~86.000 *interpolado* | 203.342 (censo, ciudad) |
| Habitantes por casa | — | 6,65 (de 6,0 a 7,5 según la parroquia) | 6,6–7,6 *inferido* | 6,8–7,0 | — | — |
| Solares por manzana | 4 (en 23 de 25 manzanas: 92 solares; la de la plaza y la de San Francisco, sin solares) | partidos en medios y cuartos | — | — | — | — |
| Casas por manzana | 0–4 (una por solar; 5 o 6 manzanas vacías) | **~20 de media, de 2 a 43** (parroquia Catedral; en el centro, casas grandes y no lo más denso) | sin muestra: la de 1772 *inferido* | — | — | el plano |
| Frente de casa | sin fuente: la casa no ocupa todo el frente del solar (70 varas, 58,5 m) | **9–11 m de media**, de 3,5 a 33 m (las casas grandes del centro, 23–33 m) | la de 1772 *inferido* | — | — | el plano |
| Fondo de lote | el solar: 58,5 m | 43–63 m (fondos de 75 varas comunes) | la de 1772 *inferido* | — | — | el plano |
| Ancho de calle entre fachadas | 6,7 m *inferido* | 6,7–8,4 m *inferido* (de 1843) | **8–10 varas: 6,7–8,4 m** | 6,7 m en el damero viejo; 12 varas (10 m) en las calles abiertas desde 1871 | 6,7 m en el damero viejo; 14,6–17,4 m en las nuevas (Ordenanza de 1910) | el plano |
| Pisos | 1 (tapia y techo de cogollo; 3 o 4 casas de alto) | 1 la mayoría; alto en algunas casas de la élite | 1 casi todas | casa de patio colonial todavía | — | el del plano |

**Qué dicen las cifras del mapa de hoy.** 1772 tiene 2,2 veces las casas de la visita de Martí y unas 39 casas por cuadra del damero, contra unas 20. 1843 tiene de 1,9 a 2,6 veces las casas estimadas. 1889 y 1911 están más cerca (de 1,1 a 1,4 veces). En 1843, el p10 de la calle (4,1 m) queda por debajo de las 8 varas (6,7 m). Es el desvío más grande y está en las épocas que más importan: las coloniales y la republicana temprana.

Lo que sigue sin fuente está en `vacios` del JSON. Entre otros: los habitantes y las casas de 1843 (falta una edición legible de Codazzi o la matrícula de hacia 1840), las casas por manzana después de 1792, Gasparini y Duarte de primera mano, y el porcentaje de casas de dos pisos.

**Medición de base** (`tools/geo/reglas_mapa.py --todas`, datos `datos-2026-11-25-09ba9f7`, `specs/reglas/medicion-<año>.json`). Las casas son las que se empaquetan, con la vida que les deja el visor bajo los hitos (`tools/vidas-visibles.mjs`). La manzana es lo que forman las casas pegadas; en las manzanas «unidas» (más que una cuadra: casas que cruzan una calle) las casas sobre la calle tapada cuentan como segunda fila.

| Época | Casas a la vista | R1 segunda fila | R3 giradas > 5° (de las del frente, en manzanas de 3 casas o más) | R4 calle mediana / p10 | R4 metros de borde con calle < 4 m | Manzanas unidas | Cuadras del damero | Casas por cuadra (mediana) | Frente medio (mediana) |
|---|---|---|---|---|---|---|---|---|---|
| 1578 | 65 | 0 (0,0 %) | 0 de 0 | 9,8 m / 9,71 m | 0 m | 0 | 0 | — | — |
| 1772 | 6.292 | 0 (0,0 %) | 364 de 6.212 | 11,81 m / 6,16 m | 152 m | 29 | 77 | 39,0 | 12,15 m |
| 1843 | 10.284 | 2.312 (22,5 %) | 412 de 7.932 | 7,31 m / 4,14 m | 4.228 m | 52 | 25 | 46,0 | 11,25 m |
| 1889 | 11.798 | 2.262 (19,2 %) | 573 de 9.471 | 8,01 m / 4,26 m | 4.848 m | 59 | 59 | 36,0 | 15,08 m |
| 1911 | 14.195 | 2.004 (14,1 %) | 1.422 de 11.683 | 8,74 m / 4,43 m | 6.274 m | 64 | 82 | 36,0 | 16,73 m |
| 1936 | 35.440 | 1.991 (5,6 %) | 6.332 de 25.273 | 10,63 m / 4,55 m | 20.314 m | 69 | 128 | 37,0 | 17,38 m |

Lectura: 1843, 1889 y 1911 tienen entre el 14 y el 22 % de sus casas en segunda fila (1772, ninguna: su auditoría alineó los frentes) y calles más angostas que 1772 (mediana de 7 a 8,4 m contra 11,3 m). Las casas por cuadra del damero (36 a 46) y el frente medio (11 a 17 m) se comparan con las fuentes cuando estén (F0).

La vista aérea del pueblo colonial que aportó el responsable (`fuentes/imagenes/README.md`) muestra lotes de 10 a 15 m de frente y 25 a 50 m de fondo y crujías de 5 a 8 m. Concuerda con las fuentes de 1772 (frente de 9 a 11 m, fondo de 43 a 63 m). Las manzanas no son de 100 m exactos: Salazar Bravo llama mito a las «cuadras de 100 metros». Se miden en el plano de cada época.

## 4. Plan de ejecución (T82)

| Fase | Qué | Entrega | Estado |
|---|---|---|---|
| **F0 · Investigación** | Workflow de investigación (§ 5) sobre siete temas: (1) solares por manzana y su subdivisión; (2) casas y habitantes por época; (3) ancho de las calles; (4) tipología de la casa colonial y republicana, qué abre a la calle y qué al patio; (5) pueblos comparables conservados; (6) edificios en pie por época; (7) ríos, quebradas y puentes. Cada afirmación, verificada por un agente que intenta refutarla. | La tabla de § 3 llena con fuentes; `specs/reglas/investigacion.json` con cada afirmación, fuente, cita y veredicto | hecha (T82.3 #203): 239 afirmaciones, 16 vacíos listados |
| **F1 · Las reglas como puertas** | `tools/geo/reglas_mapa.py`: R1 a R12 sobre cualquier época, con tests; capturas fijas versionadas; medición de base de las seis épocas. | `specs/reglas/medicion-<año>.json` de las seis épocas | R1, R3, R4 y R6 medidas en las seis épocas (T82.1 #202); R2, R5 y R7 a R12, pendientes (T82.2) |
| **F2 · Diseño de la corrección de fondo** | Solares por época: los lotes de 1936 se agrupan en solares del tamaño de la época, con una casa de patio por solar sobre la línea de fachada y el corazón de la manzana libre; calzada con su ancho mínimo. Spike en un sector, con capturas y medición. **Se muestra al responsable antes de aplicarlo a todo.** | Diseño escrito aquí (§ 6) y spike medido | pendiente |
| **F3 · Fachadas (R5)** | Fachada solo a la calle; corredor y puerta hacia el patio; medianeras ciegas. Cambia el visor en todas las épocas. | PR con tests y capturas a pie | pendiente |
| **F4 · Época por época** | En orden 1772 → 1843 → 1889 → 1911 (y lo que aplique de 1578 y 1936): aplicar F2 con los valores de la época, corregir lo que mida mal, puertas de todas las épocas y de las auditorías ya cerradas (08 y 11), revisión visual, PR, publicación. | Una época cerrada por fila de la tabla de § 8 | pendiente |
| **F5 · Discrepancias puntuales** | D1 a D11 (§ 7), en la época donde aparecen y en las demás si se repiten. | PRs chicos, uno por defecto | pendiente |
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

De la investigación F0 (fuentes en `reglas/investigacion.json`, temas `edificios` y `agua`):

| Id | Regla | Qué falta o sobra |
|---|---|---|
| D7 | R11 | En 1843 la plaza ya se llamaba **Plaza Bolívar** (desde 1842, con la llegada de los restos del Libertador; edificios-16). El sitio la rotula «Plaza Mayor». |
| D8 | R11 | **Altagracia** (destruida en 1812, rehecha en 1857), **La Merced** (fachada en ruinas en 1842, capilla provisional; templo nuevo hacia 1857) y **la Trinidad** (abandonada tras 1812, fachada nueva en 1853) estaban en ruina o en obra en 1843. Hay que revisar cómo las muestra el sitio (edificios-33, 36, 40). |
| D9 | R9 | **San Pablo** (1580–1876), **Santa Rosalía** (1730) y **la Candelaria** (1708) están en pie en 1772 y 1843 sin edificio. La leyenda de 1843 nombra cinco lugares sin marca en el sitio: Dominicas, San Antonio, San Lázaro, Oratorio de San Felipe y Capuchinos (edificios-07, 38, 39, 48). |
| D10 | R10 | El **Caroata** corre continuo de norte a sur por el oeste del casco y desemboca en el Guaire frente a El Paraíso; se embauló bajo El Silencio en 1942–1945. Confirma D5. |
| D11 | R11 | En 1578 hay **92 solares** (23 manzanas de 4), no los 100 que dice `specs/02` sobre `valle.py`. Revisar si eso cambia lo urbanizado de 1578. |

Además, en las mismas capturas se ven R1 (dobles filas en las manzanas al norte y al este de la plaza), R3 (casas giradas dentro de las manzanas), R4 y R6 en toda la ciudad.

## 8. Estado por época

Diagnóstico del 25-11-2026 (`reglas/diagnostico-<año>.json`, workflow `diagnostico-epocas.js`, run `wf_501830e2-601`): revisor, verificador adversarial y planificador por época sobre las doce capturas fijas, el plano original y la medición.

| Época | Diagnóstico (hallazgos / confirmados) | Correcciones | Cierre | Publicado |
|---|---|---|---|---|
| 1578 | sin capturas (fuera de la línea de tiempo); medición de base | — | — | — |
| 1772 | 18 / 17 | — | — | — |
| 1843 | 18 / 16 (y § 7) | — | — | — |
| 1889 | 22 / 21 | — | — | — |
| 1911 | 18 / 15 | — | — | — |
| 1936 | 12 / 9 | — | — | — |

Lo que se repite en todas las épocas:
- los cauces cortados (R10);
- los nombres de iglesias, conventos y edificios civiles sin edificio (R9);
- las manchas de patio sin casa y el suelo urbano sin manzanas (R8);
- la línea vertical clara frente a la plaza (D6).

En 1843, 1889 y 1911 se suman la segunda fila (R1), las calles angostas (R4) y el exceso de casas (R6). En 1772 faltan calles del damero al norte y al noreste (R2).

## 9. Tareas (T82.N)

Consolidadas por el diagnóstico (`reglas/tareas.json`, con la causa probable, dónde se arregla y cómo se mide cada una). Un arreglo que sirve a varias épocas es una sola tarea. El orden sigue las dependencias: investigación, puertas, generador y lo puntual. T82.0, T82.1 y T82.3 son las de este spec, de las puertas de base y de la investigación (#201, #202 y #203).

| Tarea | Qué | Reglas | Épocas | Depende de | Estado |
|---|---|---|---|---|---|
| T82.4 | Investigación F0 ampliada: ríos, quebradas y puentes por época (tema agua) | R10, R11 | 1578, 1772, 1843, 1889, 1911, 1936 | T82.3 | pendiente |
| T82.5 | Investigación F0 ampliada: edificios en pie por época, con planta, vida y forma (tema edificios) | R9, R11 | 1772, 1843, 1889, 1911, 1936 | T82.3 | pendiente |
| T82.6 | Investigación F0 ampliada: casas por manzana, frente y fondo de 1889 y 1911, y calles nuevas (1871–1910) | R4, R6 | 1843, 1889, 1911 | T82.3 | pendiente |
| T82.2 | Puertas R2, R5, R7, R8, R9 y R11 (y el retiro por casa de R3) en reglas_mapa.py, con medición de base de las seis épocas | R2, R3, R5, R7, R8, R9, R11 | 1578, 1772, 1843, 1889, 1911, 1936 | T82.1 | pendiente |
| T82.7 | La medida del giro de R3: por el lado de fachada y contra el tramo de delante, no por el rectángulo mínimo ni el chaflán | R3 | 1578, 1772, 1843, 1889, 1911, 1936 | T82.1 | PR abierto |
| T82.8 | Diagnóstico y cierre de la línea vertical clara frente a la Plaza Bolívar (D6), igual en todas las épocas | R2, R8 | 1772, 1843, 1889, 1911, 1936 | T82.2 | pendiente |
| T82.9 | F2: diseño de la corrección de fondo (solares por época y calzada con su ancho mínimo), spike en un sector y aprobación del responsable | R1, R3, R4, R6, R8 | 1772, 1843, 1889, 1911 | T82.2, T82.6, T82.7 | pendiente |
| T82.10 | Cauces por época: referencia, puerta R10, agua continua en el suelo y en el campo, corredor sin casas y puentes | R10, R9, R11, R2, R12 | 1578, 1772, 1843, 1889, 1911, 1936 | T82.4, T82.2 | pendiente |
| T82.11 | Referencia de 1889: manzanas, lotes especiales, plazas, terreno libre y red de calles leídos de Mestre | R7, R8, R4, R9 | 1889 | T82.2, T82.6 | pendiente |
| T82.12 | Referencia de 1911: manzanas de Razetti revisadas, plazas y red, en vez del perfil de color | R7, R8 | 1911 | T82.11, T82.2 | pendiente |
| T82.13 | Dibujar todas las calles del damero de 1772, también las del norte y el noreste (sectores límite del calce) | R2 | 1772 | T82.2 | pendiente |
| T82.14 | Lo urbanizado de cada época sale de sus manzanas y calles, no de discos alrededor de lo edificado (sin halos, lóbulos, escalones ni llanos sin ciudad) | R8, R2, R12 | 1772, 1843, 1889, 1911, 1936 | T82.2, T82.11, T82.12, T82.13 | pendiente |
| T82.15 | Casas fuera de la referencia o sin calle de su época pasan a la época siguiente (también las que nacieron antes) | R7, R3, R8 | 1772, 1843, 1889, 1911 | T82.13, T82.11, T82.12, T82.2 | pendiente |
| T82.16 | Abrir las calles de cada época con su ancho mínimo entre fachadas (abrir_calles_de_epoca) | R4, R2, R12 | 1772, 1843, 1889, 1911 | T82.9, T82.7, T82.11, T82.12 | pendiente |
| T82.17 | Solares de la época: una casa de patio por solar sobre la línea de fachada y el corazón de la manzana libre (F2 aplicado) | R1, R3, R6, R12 | 1843, 1889, 1911, 1772 (solo si F2 lo aplica) | T82.9, T82.16, T82.11, T82.12, T82.2 | pendiente |
| T82.18 | Casas alineadas y paralelas a su calle en cada época, también sobre la calle diagonal (alinear_epoca y marco con la red de la época) | R3 | 1772, 1843, 1889, 1911, 1936 (marco_de_casa es común: verificar sin cambios) | T82.7, T82.16, T82.17 | pendiente |
| T82.19 | Manzanas de la referencia sin casas o con frentes vacíos | R7, R12 | 1843, 1889, 1911 | T82.17, T82.2 | pendiente |
| T82.20 | Patios y solares solo dentro de casas de la época y nunca hasta la calle | R8, R1, R5 | 1772, 1843, 1889, 1911, 1936 (verificar que el solar no llegue a la calle) | T82.2, T82.17, T82.8 | pendiente |
| T82.21 | Edificios públicos de 1936 solo en su época: sin bloques modernos ni losas grises en 1889 y 1911 | R11, R7, R3 | 1772, 1843, 1889, 1911 | T82.5, T82.11, T82.12, T82.2 | pendiente |
| T82.22 | Edificios públicos con contorno recto sobre la línea de fachada (sin escaleras de píxel ni lenguas) | R3, R2, R12 | 1889, 1911, 1936 | T82.7, T82.21 | pendiente |
| T82.23 | F3: fachada solo a la calle; hacia el patio corredor y puerta; medianeras ciegas (visor, todas las épocas) | R5 | 1772, 1843, 1889, 1911, 1936 | T82.2 (para medir) | #204 abierto: espera la prueba a mano |
| T82.24 | Hitos de las iglesias y conventos marcados sin edificio (San Jacinto, Carmelitas, San Mauricio, San Pablo, Candelaria, Santa Rosalía, Las Mercedes, San Juan, El Calvario) | R9, R7, R11 | 1772, 1843, 1889, 1911, 1936 | T82.5, T82.2 | pendiente |
| T82.25 | Hitos civiles marcados sin edificio: Seminario de Santa Rosa y Universidad, Teatro Municipal, casa natal, La Rotunda y los públicos de 1889 (Concejo, Hacienda) | R9, R11, R7 | 1772, 1843, 1889, 1911 | T82.5, T82.2, T82.21 | pendiente |
| T82.26 | Plazas libres por época y sus marcas en su lugar: San Jacinto / El Venezolano, Candelaria y Teatro (despejar_plazas generalizado) | R9, R7 | 1772, 1843, 1889, 1911 | T82.24, T82.11, T82.12, T82.2 | pendiente |
| T82.27 | Anacronismos de 1843: «Plaza Bolívar» desde 1842 y Altagracia, La Merced y la Trinidad en ruina | R11, R9 | 1772 (verificar Altagracia entera), 1843, 1889 | T82.5, T82.2 | pendiente |
| T82.28 | Plazas de toros con volumen: Nuevo Circo y Circo Metropolitano | R7, R9, R11 | 1911 (si la fuente lo da), 1936 | T82.5, T82.2 | pendiente |
| T82.29 | Plaza Bolívar de 1889 y 1911 entera ajardinada (mancha beige en la mitad norte) | R8, R7 | 1889, 1911 | T82.2 | pendiente |
