# Reglas para agentes (y personas) que trabajan en este repo

Leer también `CLAUDE.md` (convenciones del proyecto) y `specs/` (qué se construye y cómo).

## Varios agentes a la vez

Este repo puede tener **varios agentes trabajando a la vez** (Claude, Codex, Gemini u otros) en el mismo
directorio o en worktrees del mismo repositorio. Antes de modificar cualquier archivo, sigue este protocolo.
No es opcional.

La coordinación se hace con `node tools/agentes.mjs` (o `npm run agentes -- <comando>`). **No edites a mano
los archivos de coordinación.** Es un protocolo cooperativo: nada impide físicamente editar un archivo sin
reclamarlo; los reclamos solo protegen a quienes lo siguen. El script sí garantiza que los propios archivos
de coordinación nunca tengan dos escritores:

- cada sesión escribe solo su propio archivo;
- cada reclamo se publica completo, de forma atómica y exclusiva: si dos agentes reclaman lo mismo a la vez,
  el sistema de archivos decide quién gana;
- la bitácora solo admite añadir entradas, nunca editarlas.

Por eso no hay que esperar ni reintentar escrituras: si un reclamo falla, es que otro agente tiene el recurso.
Los datos viven en `.git/agentes/`, compartido por todos los worktrees y nunca versionado.

### 1. Al empezar

```sh
node tools/agentes.mjs estado        # quién trabaja, qué tiene reclamado y notas recientes
node tools/agentes.mjs iniciar --agente "<modelo y herramienta>" --tarea "<qué vas a hacer>" [--rama <rama>]
```

`iniciar` imprime tu **ID de sesión**: úsalo en todos los comandos siguientes. Lee la bitácora: otros agentes
pueden haber dejado hallazgos que te afectan.

### 2. Antes de tocar archivos

```sh
node tools/agentes.mjs reclamar --id <ID> src/hitos/hospital-vargas.js tests/unit/hospital-vargas.test.js puerto:5199
```

- Reclama **todo** lo que vayas a modificar, incluidos los archivos que crees y los puertos de los servidores
  que levantes (`puerto:NNNN`). Los E2E y los scripts de capturas usan el **5199**
  (`playwright.config.js`): con `reuseExistingServer`, si otro checkout ya lo ocupa, probarías su código.
  Reclámalo, o usa otro con `PUERTO_E2E` y reclama ese. También puedes reclamar otros recursos con nombre,
  como `datos:release` antes de `npm run datos:publicar`.
- Reclamar un directorio (`src/hitos`) bloquea todo lo que contiene. Reclama lo más concreto posible.
- Es todo o nada: si sale el código 2 (`CONFLICTO`), no obtuviste ninguno. **No toques ese recurso.** Elige
  otra tarea, pide coordinación con `nota` o vuelve a intentarlo más tarde.
- Si en mitad del trabajo necesitas otro archivo, reclámalo antes de editarlo. Leer no requiere reclamo.

### 3. Mientras trabajas

```sh
node tools/agentes.mjs latido --id <ID> [--tarea "<tarea actualizada>"]   # cada 10 minutos como máximo
node tools/agentes.mjs nota --id <ID> "<hallazgo útil para otros agentes>"
```

- Una sesión sin latido durante **30 minutos** se considera abandonada y cualquier agente puede tomar sus
  reclamos. **No puede revivir:** `latido` y `reclamar` fallan con «caducada». Entonces ejecuta `terminar`,
  revisa con `estado` qué tomaron otros, inicia una sesión nueva y vuelve a reclamar antes de seguir.
- **Comandos largos** (`npm run datos`, `npx playwright test`, capturas, `npm run build`): lánzalos con
  `node tools/agentes.mjs ejecutar --id <ID> -- <comando>`. Late cada 10 minutos mientras corren y devuelve el
  código de salida del comando. Si la sesión caduca mientras corre (por ejemplo, la máquina se suspendió),
  `ejecutar` detiene el comando y falla: inicia otra sesión y vuelve a reclamar.
- Usa `nota` para lo que otros deberían saber: un dato compartido roto, un cambio de API, un test roto que no
  es tuyo, una decisión tomada. Una línea por nota; nada de secretos.
- `liberar --id <ID> <rutas>` suelta lo que ya no necesitas.

### 4. Al terminar (también si abandonas la tarea)

```sh
node tools/agentes.mjs terminar --id <ID> --resumen "<qué cambió, qué quedó pendiente>"
```

Libera tus reclamos, borra tu sesión y deja el resumen en la bitácora. Si ves sesiones `[INACTIVA]`,
`node tools/agentes.mjs limpiar` las retira.

### Git con varios agentes

- **Preferible:** trabaja en tu propio worktree y rama (`git worktree add ../caracas-<tarea> -b <rama> origin/main`).
  La coordinación sigue funcionando porque `.git/agentes` es común. Aun así, reclama los archivos: dos ramas
  que tocan lo mismo acaban en conflicto de fusión.
- En un directorio compartido, haz stage **solo de tus archivos reclamados** (`git add <rutas>`). Nunca uses
  `git add -A`, `git add .`, `git commit -a`, `git stash`, `git checkout -- .`, `git reset --hard` ni
  `git clean`: arrastran o destruyen el trabajo de otros agentes.
- Si git informa de `index.lock`, otro agente está ejecutando git. Espera unos segundos y reintenta; no borres
  el lock.
- **Operaciones que cambian el árbol de trabajo** (`git pull`, `rebase`, `merge`, `checkout`/`switch` de rama,
  `restore`): **prohibidas en el directorio compartido**. Pueden cambiar archivos que otro agente ya leyó y
  que luego sobrescribiría con su copia vieja. Hazlas solo en tu propio worktree. `estado` muestra el
  directorio de cada sesión.
- No reescribas historia publicada.

Límites: coordina agentes de una misma máquina; agentes en máquinas distintas solo se coordinan por ramas y PRs.

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
