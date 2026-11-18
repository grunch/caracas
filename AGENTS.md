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

## Flujo de PRs

1. Rama nueva desde `main` (o desde la rama de la que depende): `feat/…`, `fix/…`, `refactor/…`, `chore/…`.
2. TDD: test primero, después la implementación. Todo verde antes de subir:
   `npx vitest run`, `npx playwright test`, `.venv/bin/python -m pytest tools/geo/tests -q`.
3. Commits convencionales (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`…), en español.
4. `git push -u origin <rama>` y `gh pr create` con título y cuerpo en español: resumen, cómo funciona,
   plan de pruebas como checklist y límites conocidos.
5. Se espera la revisión de **CodeRabbit** y **Codex**; se corrigen los comentarios que apliquen en la
   misma rama y se responde cada hilo. No se mergea sin revisión.

## Datos

- Nunca se suben escaneos, mosaicos, `.pak`, `.bin`, `.webp` del plano ni otros binarios generados
  (ver `.gitignore`); se regeneran con los comandos de `tools/geo/README.md`.
- Cada fuente conserva su licencia en `fuentes/mapas/*/ficha.json`. La decisión de publicar la toma el
  responsable del proyecto.
