# El estándar de calidad de las contribuciones

**Estado:** fase 2 (el bot de triaje, en modo sombra: solo etiqueta y comenta). La fase 1 son las reglas de
`CONTRIBUTING.md § El estándar de calidad`, la sección de `AGENTS.md`, la plantilla del PR y el mensaje de cierre.
**Origen:** adaptado del *Contribution Quality Bar* de Mostro (`MostroP2P/mostro`, `docs/CONTRIBUTION_QUALITY_SPEC.md`).

## 1. Para qué

Cada vez más PRs se escriben con herramientas de IA, también los de este proyecto. Lo que cuesta caro no es eso,
sino el PR que le hace perder a quien revisa más tiempo del que vale: arregla un error que no existe, arregla una
época y rompe otra, trae una descripción que no coincide con el diff o, en un proyecto de historia, **afirma algo
del pasado de Caracas sin fuente** (una fecha, una fachada, un nombre de calle inventados con aplomo).

El principio:

> Un PR prueba por sí mismo que el problema existe, que el cambio no rompe nada y que lo que dice de la historia
> tiene fuente. Si no, se cierra sin revisión técnica, lo haya escrito quien lo haya escrito.

Todo lo de abajo es sobre la **evidencia** que trae el PR (un issue aceptado, un test que falla en `main`, una
prueba a mano que se puede repetir, una captura, un enlace a la fuente), nunca sobre cómo se produjo.

El segundo fin es **guiar a los agentes de IA**: `AGENTS.md` les dice en pocas líneas qué tiene que traer el PR, y
la plantilla y el bot les devuelven qué les faltó, de modo que el primer intento salga bien.

### Lo que no busca

- **Detectar código escrito por IA.** Los detectores fallan y castigarían a quien la usa bien. Se puede usar; el
  autor responde por cada línea.
- **Cerrar PRs con un modelo.** Ningún LLM cierra, bloquea ni suma para cerrar.
- **Reemplazar la revisión.** Un PR que cumple el estándar igual pasa por CodeRabbit, Codex y una persona. El
  estándar decide si la revisión empieza.
- **Reemplazar el CI.** Si los tests pasan lo dice `ci.yml`.

## 2. Capas

De la más barata a la más cara; cada una saca PRs antes de la siguiente.

| # | Capa | Qué ataja | Dónde |
|---|---|---|---|
| 1 | Reglas escritas | Da un motivo para cerrar sin discutir | `CONTRIBUTING.md § El estándar de calidad` |
| 2 | Issue antes del PR | Arreglos de errores que no existen; ideas fuera del proyecto | `estado: aceptado` |
| 3 | Plantilla con **Prueba a mano**, **Capturas** y **Fuentes** | Quien no sabe qué época o vista cambió, no lo corrió o no tiene fuente | `.github/pull_request_template.md` |
| 4 | Bot de triaje | Lo anterior faltante; PRs demasiado grandes | `tools/triaje/`, `.github/workflows/calidad.yml` |
| 5 | Test en rojo en CI (futuro) | Fixes cuyo test también pasa sin el arreglo | § 6 |

## 3. Reglas

Están en `CONTRIBUTING.md § El estándar de calidad`, la única fuente; `AGENTS.md` las resume para los agentes y
apunta allí (no a esta spec, que explica cómo se revisan, cosa que un agente no necesita para cumplirlas). El
mensaje de cierre, el mismo para personas y para un bot futuro, está en `.github/mensaje-de-cierre.md`.

Diferencias con Mostro, por lo que es este proyecto:

- **En español**, como todo el repo (Mostro exige inglés).
- **Fuentes**: una sección y una revisión que Mostro no tiene. Los datos históricos son la materia del proyecto.
- **Capturas**: el resultado de casi todo PR es algo que se ve; si el diff lo cambia, la Prueba a mano pide la
  captura de antes (`main`) y la de después, misma vista, época y modo, sea fix o mejora (un cambio de tono o de
  forma solo se juzga comparando). Es lo que una persona compara en dos segundos.
- **Quien mantiene el repo también llena la plantilla.** En Mostro sus PRs se saltan el contenido; aquí la mayoría
  de los PRs los abren agentes de IA para quien mantiene el repo, y son justamente los que la plantilla guía. Solo
  se salta el issue aceptado.
- **Sin firmas obligatorias**: el repo no firma commits hoy.
- **El plan**: si el PR nombra una tarea (`T64`), tiene que actualizar su fila en `specs/07-plan-de-implementacion.md`.
- **El tamaño** es el de `AGENTS.md` (3000 líneas de código sin tests ni documentación) para todos, y 400 en un primer PR.

## 4. La plantilla

`.github/pull_request_template.md`, con estas secciones `##`: Issue o tarea · Tipo · Qué cambia y por qué · Qué
toca · Qué más podría romperse · Fuentes · Prueba a mano (con `###` Preparación, Pasos, Capturas, No cubierto) ·
Tests automáticos · Checklist · Asistencia de IA. El bot lee la plantilla de `main` para saber qué secciones pedir:
cambiar la plantilla cambia lo que se revisa, sin tocar código.

## 5. El bot de triaje

`.github/workflows/calidad.yml`, en `pull_request_target` (`opened`, `edited`, `reopened`, `synchronize`,
`ready_for_review`, y `labeled`/`unlabeled` solo para `calidad:exento`). Las revisiones son funciones puras en
`tools/triaje/triaje-lib.mjs` (con tests en `tests/unit/triaje.test.js`), las llamadas a la API y las etiquetas en
`tools/triaje/triaje.mjs` (`tests/unit/triaje-gh.test.js`) y los umbrales y las rutas en `tools/triaje/config.json`.
Un borrador no se revisa; la primera vuelta es al pasar a listo.

### 5.1 Revisiones

| Revisión | Pasa cuando | Motivo si no |
|---|---|---|
| `issue` | Una palabra de cierre enlaza un issue de este repo con `estado: aceptado` | «No hay un issue aceptado enlazado» |
| `plantilla` | Están todas las secciones `##` de la plantilla y ninguna está vacía ni tiene solo su relleno | «Falta la sección `…` o está vacía» |
| `prueba-a-mano` | **Pasos** tiene 2 o más pasos numerados, cada uno con `Se ve:`, uno de regresión y, en un fix, uno marcado `(falla en main)` | «Prueba a mano: …» |
| `capturas` | Si el diff toca una ruta visual (`rutas.visuales`: shaders, hitos, techos, `.css`, las páginas, el pipeline…; menos los scripts de auditoría de `rutas.no_visuales`, que solo escriben informes), **Capturas** trae dos imágenes: antes y después | «Capturas: …» |
| `fuentes` | Si el diff toca una ruta histórica (`fuentes/`, `src/marcas-datos.js`, `src/fichas-datos.js`, `src/hitos/`), **Fuentes** trae un enlace | «Fuentes: el PR toca datos históricos y no enlaza ninguna fuente» |
| `fix-con-test` | En un fix (sección Tipo o prefijo `fix` del título), el diff agrega un `it(`/`test(` en `tests/` o un `def test_` en `tools/geo/tests/` | «Un fix necesita un test de regresión…» |
| `plan` | Si **Issue o tarea** nombra una tarea `T…`, el diff toca `specs/07-plan-de-implementacion.md` | «Plan: …» |
| `tamano` | Hasta 3000 líneas de código cambiadas (sin `tests/`, `tools/geo/tests/`, `specs/`, `*.md` ni el lockfile); 400 en un primer PR | «Un PR tiene hasta …» |
| `prs-abiertos` | Quien llega por primera vez tiene a lo sumo otro PR abierto | «Espera a que se revise tu otro PR abierto» |

Primera vez: `author_association` `FIRST_TIME_CONTRIBUTOR`, `FIRST_TIMER` o `NONE`.

### 5.2 Resultado

- Todo pasa: etiqueta `calidad:ok`.
- Algo falla: etiqueta `calidad:falta-info` y **un** comentario con todos los motivos, que se edita en cada vuelta
  (nunca se duplica) y se borra cuando todo pasa.
- Un check «Estándar de calidad» en el último commit: `success` o `neutral`, **nunca** `failure`, así no bloquea el
  merge. La protección de la rama no es parte de esto.

### 5.3 Exenciones

- **Bots** (`config.autores.bots` o tipo `Bot`): se saltan todo.
- **Solo Markdown** (todos los archivos, con su nombre anterior si es un renombre, terminan en `.md`) o la etiqueta
  **`calidad:exento`**: se saltan las revisiones de contenido (`issue`, `plantilla`, `prueba-a-mano`, `capturas`,
  `fix-con-test`, `plan`, y `fuentes` con la etiqueta). Un PR solo de Markdown **sí** pasa por `fuentes`: las
  observaciones de `fuentes/imagenes/README.md` son datos históricos.
- **Quien mantiene el repo** (`OWNER`, `MEMBER`, `COLLABORATOR`): se salta solo `issue`.
- `tamano` y `prs-abiertos` valen para todos menos los bots.

### 5.4 Seguridad

`pull_request_target` corre con un token que escribe (`issues`, `pull-requests`, `checks`; `contents: read`). Es
seguro porque el workflow y el script salen de `main` y **nunca** se baja ni se corre código del PR: el checkout es
de la rama por defecto, sin credenciales guardadas, y el título y la descripción llegan al script por el payload
del evento, como datos (nunca interpolados en una shell). La descripción se lee hasta 64 KiB. El texto ajeno que
el comentario repite va como código (`codigo()`), sin comillas invertidas ni saltos, para que un `@nombre` no avise
a nadie. Sin `npm ci`: solo la biblioteca estándar de Node, así una dependencia del PR no puede entrar.

## 6. Lo que sigue

1. **Test en rojo en CI**, como la fase 3 de Mostro: en un fix, aplicar el commit `test:` sobre la base actual y
   correr esos tests (deben fallar), y después el PR entero (deben pasar). Aquí es más fácil que en Rust, porque los
   tests viven en `tests/` y Vitest corre un archivo suelto. Corre código del PR, así que va en `pull_request` sin
   secretos, con un segundo workflow (`workflow_run`) que lee su resultado como dato no confiable y etiqueta.
2. **Cerrar**: un job diario que cierre los PRs con `calidad:falta-info` sin cambios por 7 días, con el mensaje de
   siempre. Solo después de varias semanas de etiquetas en sombra revisadas por quien mantiene el repo, y con una
   decisión aparte.

## 7. Huecos conocidos

- **El tipo lo declara el autor.** Un fix presentado como `feat` se salta `(falla en main)` y `fix-con-test`; quien
  revisa ve el diff, y un tipo equivocado es motivo de cierre (regla 3).
- **Una descripción se puede inventar.** Unos pasos verosímiles se escriben sin correr nada, y una captura puede ser
  de otra rama. El bot cuenta dos imágenes; que sean el antes y el después de la misma vista lo ve quien revisa. La defensa es que alguien siga los pasos, y que unos pasos que no funcionan son motivo de cierre.
- **Un enlace no es una fuente.** La revisión `fuentes` solo ve que hay un enlace, no que diga lo que el PR le
  atribuye. Eso lo revisa una persona.
- **Las rutas visuales e históricas son una lista a mano** (`config.json`): un archivo nuevo que se ve y no está en
  la lista no pide capturas hasta que se agregue. Al revés, un script de auditoría nuevo en `tools/geo/` pide capturas hasta que se
  agrega a `rutas.no_visuales`, y solo va ahí si ningún módulo del pipeline lo importa (`epocas.py` importa varios
  `cierre_fase*`).
- **`fix-con-test` pasa con diffs enormes**: GitHub omite el parche de un archivo muy grande y el bot no puede
  descartar que haya un test ahí.
- **La carga se mueve, no desaparece**: aceptar issues es trabajo nuevo para quien mantiene el repo. Es más barato
  que revisar diffs, pero no es gratis.
