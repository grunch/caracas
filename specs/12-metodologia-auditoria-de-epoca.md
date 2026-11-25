# Metodología: auditar y corregir una época

Cómo se hizo la auditoría de 1843 (T81, [11](11-auditoria-y-correccion-1843.md)), escrito para repetirla con la época siguiente (1889, 1911…). Las fases y criterios son los de 1772 ([08](08-auditoria-y-correccion-1772.md)); este documento dice **cómo trabajar**: el orden, las herramientas, los prompts de los agentes, el flujo de PRs y revisiones y las trampas que ya costaron tiempo. Donde dice «1843», poner el año de la época; donde dice `E` (índice de época), su índice en `tools/geo/epocas/epocas.json`.

## 0. Antes de empezar

1. **Leer** `CLAUDE.md`, `AGENTS.md`, `specs/08`, `specs/11` y este documento. Mirar el plano base entero (su `vista.jpg`) y su leyenda.
2. **Decisiones del responsable por adelantado** (en 1843 se pidieron todas juntas y se escribieron en el spec): criterios heredados de 1772 (LOO con ≥ 2 anclas cuenta como control; 15 m por sector; 0,5 m de fachada), quién registra los límites documentados, cuándo se publican datos, cuál es el escaneo base, si se usan workflows multiagente y que las dudas las decide quien ejecuta («decisión por delegación del responsable», con fecha). Sin esto, la auditoría se frena en cada fase.
3. **Checklist con hook**: `.claude/tarea.md` con una casilla por fase y por pista independiente; el hook `Stop` (`~/.claude/hooks/checklist-stop.sh`) no deja cerrar el turno con casillas abiertas. Una sección «Notas de trabajo» en el mismo archivo guarda el estado para retomar tras compactar el contexto (ramas, PRs, mediciones, qué falta).
4. **Spec de la época** `specs/NN-auditoria-y-correccion-AAAA.md`: solo lo que cambia respecto de 08 (orientación, cómo dibuja lo edificado el plano, qué identifica las esquinas, leyenda), las decisiones y una tabla de fases con su estado. Fila `TNN` en `specs/07`. Primer PR, solo docs.

## 1. Fase 1: inventario

### 1A. Baseline y calce por identidad

- **Baseline** `B<año>-001.json`: commit, release de datos (comprobar que el manifiesto local es el del release y que `npm run datos:al-dia` dice al día), SHA-256 del original y del calce vigente.
- **El calce vigente por correlación se mide, no se supone bueno.** En un damero la correlación se engancha a la calle vecina: en 1772 y en 1843 el calce publicado se apartaba 100–300 m fuera del núcleo aunque su LOO declarado era de 13 m (el LOO mide la coherencia de sus propios puntos, no su identidad).
- **Anclas por identidad**: lo que el plano identifica sin ambigüedad. En 1843, las esquinas numeradas de la leyenda emparejadas por nombre único con `tools/geo/esquinas/1936-esquinas.json` (`tools/geo/esquinas_1843.py`). Si el plano no numera esquinas, como en 1772: cruces contados en el damero desde una esquina conocida e hitos (`tools/geo/anclas_identidad.py`).
- **Depuración por consistencia**: quitar de a una el ancla cuyo error dejando uno fuera supera media cuadra (55 m). Así salen los homónimos de 1936 en otro barrio. No se corrigen: se listan para revisarlas a ojo.
- **Calce nuevo** con `etapas: []` (sin correlación), las semillas de la plaza y las anclas (`controles_1843.py --escribir-config`, luego `tools/geo/calce.py <carpeta>`). Comprobar que no tenga pliegues (`anclas_identidad.celdas_plegadas` en todo el marco) y mirar la lámina `fuentes/derivados/<año>/qa-calce.jpg`.
- **LOO por sector del calce desplegado**: cada ancla se quita del calce por su `id` (o se quita la semilla sobre la que cae) y se mide en el destino del ancla. Con menos de 4 anclas no hay LOO (no NaN). Un sector sin anclas o sobre 15 m va a `limites-calce.json`.
- **Leyenda transcrita** a JSON (`specs/auditoria-<año>/leyenda.json`), con `lectura: segura|dudosa|ilegible` y los recortes con su SHA-256. Sirve para el calce y para cotejar marcas y fichas (pista independiente).

### 1B. Censo sobre el original

- **Sectores**: rejilla regular sobre el marco del mapa (5 × 5 en 1843) con 60 px de solape de lectura (`sectores.json`). Una unidad es del sector que contiene su centro.
- **Borrador automático** para ayudar a los lectores (`tools/geo/manzanas_<año>.py`: lo rayado sin las calles detectadas), con una lámina por sector. Une y parte manzanas: no es el censo.
- **Lectura por sector con agentes** (workflow, uno por sector; prompt en § 6). Cada lector escribe su JSON (`censo-sectores/S<año>-FC.json`): unidades con caja, polígono, ocupación, letras, esquinas, relación con el borrador, lectura y recortes con SHA-256.
- **Juntar** (`tools/geo/censo_<año>.py`): IDs estables `U<año>-NNNN`, problemas (ocupación inválida, centro fuera del sector, duplicada entre sectores, manzana dentro de manzana, comparando polígonos y no cajas) y **correcciones versionadas con motivo** (`censo-correcciones.json`: quitar, mover, reclasificar). No se editan las lecturas.

### 1C. Contraste con el sitio

`tools/geo/contraste_<año>.py`: cada unidad proyectada con el calce contra las casas **a la vista** en la época (sin las que esconde un hito en pie: `cierre_fase4.se_suprime` con `node tools/hitos-planta.mjs`). Una casa cuenta en la unidad **más chica** que la contiene (un lote dentro de su manzana, una manzana dentro de una huerta), por un punto **dentro de la casa** (`representative_point`, no el promedio de vértices: una casa en L puede tenerlo afuera). Resultado: manzanas sin casas, lotes con casas indebidas y casas sobrantes. Cada hallazgo es una incidencia `I<año>-NNN` con ficha (08 § 1C).

### 1D. Puerta de salida

`tools/geo/cierre_fase1_<año>.py`, calculada desde los JSON versionados: área recorrida, unidades clasificadas (las dudosas a la vista), censo sin problemas, correspondencia por unidad, control de calce por sector o límite, incidencias con subtarea y **evidencia vigente** (los SHA-256 del censo y del calce que declaran el contraste y el informe del calce son los actuales). Al cerrar, escribir las subtareas de las fases 2–8 en el spec.

## 2. Fase 2: referencia

- **Revisión independiente de las lecturas dudosas** con un segundo lector (workflow por sector; prompt en § 6) que no ve la lectura anterior: aprobada, corregida (ocupación, polígono o letras) o rechazada, con motivo y recorte. Lo que sigue dudoso queda **pendiente** y no entra al generador.
- `tools/geo/referencia_<año>.py` → `tools/geo/referencias/<año>-manzanas.json`: la unidad aprobada proyectada al mosaico de 1936. Las revisiones se aplican en orden de nombre de archivo (un `ajustes.json` final gana). Las letras de la revisión mandan aunque sean `[]`. Los validadores miran el polígono **tal como está guardado** (sin `buffer(0)`), porque es el que se rasteriza. Puerta de la fase 2: cada unidad con referencia o rechazada, validadores limpios, pendientes explícitas.

## 3. Fases 3 y 4: calles y ocupación (las que cambian el sitio)

Todo en `tools/geo/epocas.py` + `tools/geo/epocas_<año>.py`, con `referencia` en la entrada de la época de `epocas.json` y la referencia y el módulo en el paso `epocas` de `tools/datos-pasos.mjs` (y clasificada en `specs/auditoria-1772/procedencia-generador.json`, que tiene un test):

1. **Lo edificado de la época sale de la referencia, no del color** (`construido_de_epoca` con `referencia`): la máscara pinta las unidades aprobadas de la más grande a la más chica, edificables en 1 y lotes, plazas y huertas en 0.
2. **Corregir una época no cambia las anteriores**: una casa nace en una época si está edificada en esa y en todas las siguientes, así que una máscara nueva haría nacer antes casas que la auditoría anterior no midió. `nace_sin_tocar_las_anteriores` conserva lo que nacía antes de la época con referencia.
3. **Fuera de la referencia** (`fuera_de_la_referencia`): lo que nace en la época con su punto a más de media calle de toda unidad pasa a la época siguiente. **En lotes libres** (`en_lotes_libres`): lo mismo dentro de un lote especial, plaza o terreno libre (la unidad más chica). Si al correrla la casa no vive en ninguna época, **se quita** (`quitar_techos`, que corre vértices, marcos, vida y vuelos): el empaquetador rechaza una vida `[n, n]`.
4. **Casas propias** (`agregar_casas`): en cada manzana rayada aprobada, la crujía de casas de un piso sobre sus frentes (10 m × 8 m, patio libre: specs/06 § 4), conservando los tramos que no pisan una casa viva (a 0,5 m), la planta de un hito en pie ni un lote de la manzana; cada tramo vive hasta que nace una casa que lo pisa. Filtros: área ≥ 12 m², ancho medio ≥ 2 m, sin huecos interiores, huella válida en una grilla de 1 cm (encogida 1 cm para que el ajuste no la solape) y **≥ 3 m de fachada** a 0,5 m del borde de su manzana.
5. **Puerta de las fases 3 y 4** (`contraste_<año>.puerta_fases_3_4`): ninguna casa nacida en la época fuera de las unidades (las de antes son límite), cada rayada aprobada con casas salvo la que cubre un hito, ningún lote libre aprobado con casas (las pendientes, aparte).

## 4. Fases 5 a 7: casas, cubiertas, accesos

Cuando el plano no dibuja frentes ni patios, se mide lo equivalente sobre las casas a la vista (`tools/geo/cierre_casas_<año>.py`): frente de manzana continuo (≥ 75 % del borde con casa, hito o lote propio a 2 m: es la medida de «calles posteriores sin cortar manzanas» de la fase 3), lotes sin solapes (0,01 m²), frente de las casas propias como tramo de fachada (≥ 3 m), huellas que el visor puede techar, acceso de las casas propias (las interiores heredadas de 1936 se cuentan aparte) y nada en lotes libres. Los límites, por centro de casa o por id de manzana, en `limites-fases-5-7.json` (`con_limites`). **Lo que no se mide se dice**: en 1843 no hay puerta de triángulos de cubierta (`tools/cubiertas.mjs` solo genera los de 1772).

## 5. Fase 8: entrega

1. Fusionar la pila (§ 7), `git pull` en `main` y `npm run datos` **completo** (revisar que salga con código 0).
2. Puertas sobre esos datos: las de la época y **las de 1772** (`tools/geo/cierre_fase3…7.py` sobre una copia de `specs/auditoria-1772` fuera del repo, después de `node tools/cubiertas.mjs`), comparadas con las mismas puertas sobre `main` antes de la auditoría (guardar esa medición como evidencia: en 1843, las fases 4 y 6 de 1772 ya fallaban antes).
3. `npm run datos:publicar` (release `datos-*` y despliegue de Pages); esperar el workflow `pages.yml` y comprobar que `https://caracas.city/datos/manifiesto.json` tiene el mismo SHA-256 que el local.
4. Revisión visual con capturas del sitio publicado (vistas cenitales de las zonas corregidas) y de cada hito en pie en la época (cenital y oblicua: sin casas genéricas adentro ni vacíos artificiales). `cierre-fase8.md` con el antes y después, las puertas, la revisión y lo que queda (la revisión de una persona siempre queda).

## 6. Agentes y workflows

- **Leer el original**: nunca abrirlo entero con Pillow (un TIFF de 7216 px llegó a 14 GB entre varios agentes). Recortar leyendo los bytes de la región ([auditoria-1843/workflows/recorte-tiff.py](auditoria-1843/workflows/recorte-tiff.py): TIFF sin comprimir; ajustar ancho y desplazamiento al plano nuevo) y abrir con `python3 -I`. Vigilar la memoria con un `Monitor` mientras corren.
- **Darles copias fijas**: si se cambia de rama en el checkout compartido mientras leen, les desaparecen archivos. Copiar al scratchpad lo que necesitan y pasarles esas rutas.
- **Workflows usados en 1843** (paralelo puro, un agente por unidad de trabajo; cada uno escribe su propio JSON). Los scripts, tal cual, en [auditoria-1843/workflows/](auditoria-1843/workflows/):
  - *Esquinas*: 4 lectores por cuadrante con solape. Ubicar cada número impreso y su cruce en píxeles del original, con `lectura` segura|dudosa, alternativas y recortes de verificación con SHA-256. Se juntan: dos lecturas del mismo número a menos de 8 px son una (segura si dos coinciden); un número en dos lugares no ancla.
  - *Leyenda*: 1 agente. Cada grupo de la leyenda con `texto_literal` y `lectura`, y las parejas en 1936 solo por variante obvia.
  - *Censo*: 25 lectores, uno por sector, con la lámina del borrador. Prompt: qué es cada ocupación, que el rayado es la parroquia, qué se confunde con qué (cuadrícula punteada, letras, números de esquina), registrar solo lo que se centra en su caja, verificar cada unidad con un recorte y anotar observaciones de trazado.
  - *Dudosas*: 17 revisores, uno por sector con dudosas, sin ver la lectura anterior como verdad: aprobada / corregida / rechazada, seguridad y motivo.
- **Costo**: el censo (25 agentes) y la revisión (17) son lo caro; lo demás conviene hacerlo directo. La sesión de 1843 costó del orden de 900 USD en total (auditoría, revisiones y fusiones): conviene presupuestarlo y dejar los fan-outs para la lectura del original.

## 7. PRs apilados y revisiones

- **Un PR por subtarea**, ≤ 3000 líneas de código, apilados (cada rama sale de la anterior); cada uno anota su número en la fila de la tarea en `specs/07` (el triaje lo exige) y llena la plantilla (Rendimiento medido con `tests/e2e/medir-rendimiento.mjs` en `main` y en la rama cuando cambian los datos; capturas de antes y después en un gist; prueba a mano declarada como hecha con Playwright y pendiente de una persona).
- **Revisiones**: después de cada push, mirar los hilos de Codex y CodeRabbit (`gh api graphql` → `reviewThreads` sin resolver), **corregir los que aplican** con un test, responder cada hilo con qué se hizo y resolverlo. Pedir `@codex review` o `@coderabbitai review` si no revisaron el último commit (CodeRabbit tiene cuota: puede tardar o no llegar). CodeRabbit revisa los PRs que apuntan a `main`: en una pila suele aparecer recién al cambiarles la base.
- **Fusionar** (autorizado con CI verde y hilos resueltos, squash, sin borrar ramas): de abajo hacia arriba. Tras fusionar uno, el siguiente se rebasa con `git rebase --onto origin/main HEAD~<sus commits propios>` (con squash, el ancestro común trae los commits viejos), se resuelve el conflicto de la fila en `specs/07` conservando las anotaciones de los dos lados, se sube con `--force-with-lease` y se cambia su base a `main` (`gh api -X PATCH repos/<repo>/pulls/N -f base=main`; `gh pr edit` falla por Projects classic). Esperar el CI con un script (`gh pr checks` hasta que no quede `pending`).

## 8. Trampas

- **`npm run datos` puede fallar a mitad** (el empaquetador valida la vida, los techos y los marcos) y dejar el `.pak` viejo: revisar siempre el código de salida antes de medir. Una puerta de 1772 que dice «las cubiertas no salieron de las huellas de la ciudad que se mide» es la señal de un `.pak` viejo.
- **No cambiar de rama mientras corre `npm run datos`** (lee el árbol en cada paso). Para esperar: `ps -p <pid>`; `pgrep -f patrón` se encuentra a sí mismo y el bucle no termina. No cortar su salida con `head` (la tubería lo mata).
- Las mediciones escriben en `specs/`: antes de cambiar de rama o rebasar, commitear o apartar esas salidas.
- El hook de seguridad del entorno pide hechos antes de crear archivos o borrar: con `rm -rf` frena siempre; conviene usar carpetas nuevas en el scratchpad.
- Medir lo que cambia en otras épocas en cada paso (puertas de 1772): una corrección de una época posterior cambió casas de 1772 dos veces (calce nuevo: +17 casas; máscara nueva: +60 casas y cuatro puertas rotas) hasta que se agregó `nace_sin_tocar_las_anteriores`.
- Un criterio débil esconde defectos: «manzana con casas» se cumplía con una sola; la medida útil fue la continuidad del frente.
