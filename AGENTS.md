# Reglas para agentes (y personas) que trabajan en este repo

Leer también `CLAUDE.md` (convenciones del proyecto) y `specs/` (qué se construye y cómo).

## Tamaño de los PRs

- **Cada PR tiene como máximo 3000 líneas de código cambiadas**, sin contar tests ni documentación
  (`tests/**`, `tools/geo/tests/**`, `**/*.md`, `specs/**`).
- Si una tarea es más grande, se divide en tareas más chicas, **un PR por tarea**, cada una con valor
  propio y tests verdes. Cuando una depende de otra, se apilan (la rama de la segunda sale de la primera).
- Para medir, siempre contra la **rama base del PR** (en un PR apilado, la rama de la que sale; si no,
  `main`), así no se cuentan las líneas del PR anterior:
  ```
  BASE=$(gh pr view --json baseRefName -q .baseRefName 2>/dev/null || echo main)   # o la rama base, si el PR aún no existe
  git diff --stat "origin/$BASE...HEAD" -- . ':(exclude)tests' ':(exclude)tools/geo/tests' ':(exclude)*.md' ':(exclude)specs' | tail -1
  ```

## Plan

Las tareas, su orden y su estado están en `specs/07-plan-de-implementacion.md`. Cada PR corresponde a una
tarea (o subtarea) del plan y actualiza su fila (número de PR, estado).

## Flujo de PRs

1. Rama nueva desde `main` (o desde la rama de la que depende): `feat/…`, `fix/…`, `refactor/…`, `chore/…`.
2. TDD: test primero, después la implementación. Todo verde antes de subir:
   `npx vitest run`, `npx playwright test`, `.venv/bin/python -m pytest tools/geo/tests -q`.
3. Commits convencionales (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`…), en español.
4. `git push -u origin <rama>` y `gh pr create` con título y cuerpo en español, con **cada sección de
   `.github/pull_request_template.md`** llena (ver abajo).
5. Se espera la revisión de **CodeRabbit** y **Codex**; se corrigen los comentarios que apliquen en la
   misma rama y se responde cada hilo. No se mergea sin revisión.

## Antes de abrir un PR

Si eres un agente de IA preparando un PR, sigue `CONTRIBUTING.md § El estándar de calidad`. En corto:

- Si no mantienes el repo: enlaza un issue con la etiqueta `estado: aceptado` (`Closes #N`). Si no hay
  issue aceptado, no abras el PR: comenta en el issue.
- Llena cada sección de `.github/pull_request_template.md`, aunque el PR sea para quien mantiene el repo.
  La **Prueba a mano** son pasos que alguien hizo de verdad en el sitio corriendo (`npm run dev`), cada uno
  con su `Se ve:`, uno de regresión y, en un fix, uno marcado `(falla en main)`. Correrlos tú con Playwright
  o capturas ayuda, pero **no reemplaza la prueba de una persona**: dilo así, y que quien abre el PR los haga
  a mano antes de pedir revisión. No presentes como hechos pasos que nadie corrió.
- Si el cambio se ve (fix o mejora), pon captura de antes (`main`) y de después (esta rama), misma vista, época y modo.
- En un fix, el primer commit es `test:` y solo agrega el test de regresión, que falla en `main`.
- Si el PR toca la carga, los workers, la geometría, los hitos, los shaders o las texturas, la sección
  **Rendimiento** trae la salida de `tests/e2e/medir-rendimiento.mjs` en `main` y en la rama, y lo que no se
  midió (sin GPU no hay tiempo por cuadro). Nada empeora más que el ruido sin decir por qué (`CONTRIBUTING.md § Rendimiento`).
  No presentes una medición que no corriste.
- Cada dato histórico nuevo lleva su fuente con enlace en la sección **Fuentes**. Nunca inventes una fecha,
  un nombre, una forma o una fuente; lo no verificado se marca como tal.
- Si no pudiste correr el sitio o los tests, dilo en el PR en vez de presentar resultados.

Un PR que solo cambia Markdown está exento de los puntos de la plantilla, la prueba y el test (salvo las
fuentes de un Markdown en `fuentes/`).

## Referencias visuales

Antes de tocar estilos, fachadas, techos o lotes, leer `fuentes/imagenes/README.md`: las observaciones de
las pinturas y fotos de época mandan sobre las reglas inventadas.

## Datos

- Nunca se suben escaneos, mosaicos, `.pak`, `.bin`, `.webp` del plano ni otros binarios generados
  (ver `.gitignore`); se regeneran con los comandos de `tools/geo/README.md`. Viajan en un release
  `datos-*` de GitHub: `npm run datos:bajar` los trae a un clon nuevo (y al build de Pages) y
  `npm run datos:publicar` sube los regenerados, junto con la muestra de 1 km² que usan los E2E del CI
  (`npm run datos:bajar -- --muestra`). El sitio publicado usa siempre el release más nuevo.
- Cada fuente conserva su licencia en su ficha: `fuentes/mapas/*/ficha.json` para los mapas y
  `fuentes/datos/*/ficha.json` para los demás datos (modelos de elevación, OpenStreetMap…). La decisión de publicar la toma el
  responsable del proyecto.
