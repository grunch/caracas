# Cómo contribuir

Gracias por querer ayudar a levantar la Caracas de antes. Esta guía resume cómo se trabaja en el repo. Las
reglas completas están en [`AGENTS.md`](AGENTS.md) (para personas y para agentes) y las convenciones, en
[`CLAUDE.md`](CLAUDE.md).

## Qué puedes aportar

- **Fuentes**: planos, fotos o grabados de Caracas que sean de dominio público o tengan licencia libre, con
  autor, fecha, institución y enlace. Cada uno va en su carpeta de `fuentes/` con su `ficha.json`.
- **Historia**: correcciones o datos nuevos para las fichas de los lugares (`src/fichas-datos.js`) o los
  nombres de cada época (`src/marcas-datos.js`), siempre con su fuente.
- **Código**: una tarea del plan ([`specs/07-plan-de-implementacion.md`](specs/07-plan-de-implementacion.md)),
  un bug o una mejora. Antes de diseñar algo, lee los [`specs/`](specs/README.md).
- **Errores**: abre un issue que diga qué viste, dónde (año, lugar, pantalla) y qué esperabas.

## Antes de empezar

```sh
git clone https://github.com/grunch/caracas.git && cd caracas
npm install
npm run datos:bajar        # los datos del sitio, que no van a git (con -- --muestra, solo 1 km²: lo que usa el CI)
npx playwright install --with-deps chromium   # una vez: el navegador de los tests E2E (el mismo del CI)
npm run dev
```

Para tocar el pipeline en Python (`tools/geo/`):

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r tools/geo/requirements.txt
```

## El flujo

1. **Una rama por tarea**, desde `main`: `feat/…`, `fix/…`, `refactor/…`, `docs/…`, `chore/…`.
2. **Primero el test**. Toda lógica pura (formatos, coordenadas, pipeline, textos que salen de datos) se escribe
   con el test antes, en rojo, y después la implementación. Cobertura de 80 % o más en `src/` y `tools/`.
3. **Todo verde** antes de subir:
   ```sh
   npx vitest run
   npx playwright test
   .venv/bin/python -m pytest tools/geo/tests -q   # si tocaste tools/geo
   ```
4. **Commits convencionales, en español**: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `ci:`.
5. **PRs chicos**: hasta 3000 líneas de código cambiadas, sin contar tests ni documentación. Una tarea más
   grande se parte en varias, un PR cada una. Para medir:
   ```sh
   git diff --stat origin/main...HEAD -- . ':(exclude)tests' ':(exclude)tools/geo/tests' ':(exclude)*.md' ':(exclude)specs' | tail -1
   ```
6. **El PR**, con título y cuerpo en español, llena **cada sección de la
   [plantilla](.github/pull_request_template.md)** (ver [El estándar de calidad](#el-estándar-de-calidad)). Si
   corresponde a una tarea del plan, actualiza su fila.
7. **Revisión**: CodeRabbit y Codex revisan cada PR. Corrige en la misma rama los comentarios que apliquen y
   responde cada hilo, también cuando no aplica (di por qué). No se fusiona sin revisión.

## El estándar de calidad

Antes de que alguien lea el diff, un PR tiene que probar dos cosas: que el problema que resuelve existe, y que el
cambio no rompe nada más. Y en este proyecto, una tercera: que lo que dice de la historia de Caracas tiene fuente.
Las reglas son sobre la evidencia que trae el PR, no sobre cómo se escribió.

1. **Se pueden usar herramientas de IA.** Respondes por cada línea y tienes que poder explicar cualquiera cuando
   te lo pregunten. «Lo escribió la herramienta» no es una respuesta.
2. Un PR que no sigue la [plantilla](#la-plantilla), no enlaza un [issue aceptado](#issue-antes-del-pr) cuando hace
   falta, o no cumple la [Prueba a mano](#prueba-a-mano), el [Test en rojo](#test-en-rojo) o las
   [Fuentes](#fuentes) **se cierra sin revisión técnica**, con el [mensaje de siempre](.github/mensaje-de-cierre.md).
   Lo puedes reabrir cuando lo cumpla.
3. Un PR cuya descripción no coincide con su diff, o cuyos pasos de la Prueba a mano no funcionan cuando alguien
   los sigue, se cierra igual. Lo mismo un dato histórico inventado o con una fuente que no dice lo que el PR dice.
4. Una cuenta que abre una y otra vez PRs cerrados por esto puede quedar bloqueada.

**Exentos** del issue, la plantilla, la Prueba a mano y el Test en rojo: los PRs que solo cambian archivos Markdown
(pero un Markdown en `fuentes/` igual lleva sus fuentes), los de bots y los que quien mantiene el repo etiqueta
`calidad:exento`. Quien mantiene el repo no necesita issue aceptado, pero sus PRs (y los que abren sus agentes de IA)
también llenan la plantilla. El tamaño (3000 líneas de código; 400 en un primer PR) vale para todos menos los bots.

Un bot ([`tools/triaje/`](tools/triaje/triaje-lib.mjs)) revisa cada PR y le pone `calidad:ok` o
`calidad:falta-info`, con un comentario que dice qué falta. Por ahora **solo etiqueta**: no cierra nada; eso lo
decide una persona. El diseño está en [`specs/09-estandar-de-calidad.md`](specs/09-estandar-de-calidad.md).

### Issue antes del PR

Cada PR de alguien de afuera enlaza un issue que quien mantiene el repo etiquetó `estado: aceptado`. El error o la
idea se discute primero en el issue: ahí, «esto no es un error» o «eso no pasó así» cuesta un comentario y no la
revisión de un diff entero.

- Se enlaza con una palabra de cierre en la descripción (`Closes #123`, `Fixes #123`). Mencionarlo no basta.
- Solo quien mantiene el repo pone `estado: aceptado`, cuando está de acuerdo en que el problema es real y entra en
  el proyecto. Si todavía no hay issue aceptado, comenta en el issue en vez de abrir el PR.

### La plantilla

Llena cada sección de [`.github/pull_request_template.md`](.github/pull_request_template.md). Una sección que
falta, vacía o con solo su comentario cuenta como no llenada.

- **Qué toca** nombra las épocas (1772, 1874…), los modos (tinta, color, hoy), las vistas o recorridos (mapa, a pie,
  en avión, manejando, fichas, buscador) y los archivos donde vive ese comportamiento.
- **Qué más podría romperse** nombra lo que también lee o escribe lo que cambiaste (los uniforms y shaders que
  comparten casas, hitos y árboles; los datos que genera el pipeline; las otras épocas) y dice por qué no se rompe.
  Una respuesta genérica o equivocada en cualquiera de las dos es motivo de cierre.

### Prueba a mano

La sección **Prueba a mano** es un procedimiento paso a paso que prueba este PR en el sitio corriendo. **Una persona
lo hace a mano** y anota lo que vio; quien revisa tiene que poder seguir los mismos pasos y ver lo mismo.

- **Preparación** dice cómo corriste el sitio: `npm run dev` con los datos completos (`npm run datos:bajar`) o con la
  muestra (`-- --muestra`), el navegador, y los parámetros de la URL si usaste alguno (`?sinintro`, `?capture`).
- **Pasos** van numerados. Cada uno dice una acción (elegir una época, pasar a color, acercarse a un lugar, caminar
  hasta una esquina, buscar una dirección) y una línea `Se ve:` con algo observable: lo que aparece en pantalla en
  esa época y vista, el texto de una ficha o de una marca, un valor de `window.lab`, un error en la consola.
- **En un fix**, un paso va marcado **(falla en main)** y dice qué hace `main` en su lugar. Si ningún paso falla en
  `main`, el PR no mostró que el error existe.
- **Regresión**: al menos un paso prueba algo vecino nombrado en **Qué más podría romperse** (otra época, el otro
  modo, otro recorrido) y muestra que sigue igual.
- **Capturas**: si el cambio se ve, sea un fix o una mejora, una captura de **antes** (`main`) y una de **después**
  (esta rama), con la misma vista, época y modo, para compararlas lado a lado. `node tests/e2e/capturas-valle.mjs` saca las mismas vistas en las dos ramas. Si no se ve: «No aplica».
- **No cubierto** dice qué no prueban los pasos y por qué.
- Un paso que no se puede observar («el código ahora es más robusto») no es un paso.

Ejemplo, para un fix en que el alero de una casa de 1772 entraba en la calzada:

```markdown
### Preparación

`npm run dev` con los datos completos, Chrome 131, `?sinintro`.

### Pasos

1. Elige 1772, pasa a color y acércate a la esquina de Gradillas desde la calle.
   Se ve: el alero de la casa de la esquina termina en la línea de la fachada. **(falla en main)**
   En main: el alero sobresale medio metro sobre la calzada.
2. Regresión: el mismo lugar en 1874.
   Se ve: igual que en main (las casas de 1874 no tienen alero sobre la calle).
3. Regresión: en 1772, toca «Caminar» y anda por la calle hasta la esquina.
   Se ve: no chocas con el alero; igual que en main.

### Capturas

![antes, main](…) ![después, esta rama](…)

### No cubierto

Los aleros de los hitos (iglesias, Capitolio): tienen su propio modelo.
```

Si no pudiste correr el sitio, dilo en el PR en vez de presentar resultados.

### Test en rojo

El test de regresión de un fix tiene que **fallar sin el arreglo y pasar con él**:

- Un PR de fix **empieza con un commit cuyo asunto empieza con `test:`** y que solo agrega el test de regresión
  (en `tests/` o `tools/geo/tests/`, sin código de producción).
- El arreglo va en uno o más commits después. El commit `test:` no se aplasta con el arreglo: queda separado hasta
  el merge.
- Compruébalo antes de abrir el PR: con solo el commit `test:` sobre `main`, el test nuevo falla; con el PR entero,
  pasa. Pega en **Tests automáticos** el nombre del test y lo que dice al fallar en `main`.

### Fuentes

Todo dato histórico nuevo o corregido (una fecha, un nombre, la forma de un edificio, un color, una foto) lleva su
fuente, con enlace, en la sección **Fuentes**, además de en su ficha (`fuentes/*/ficha.json`) o junto al dato
(`src/marcas-datos.js`, `src/fichas-datos.js`). Lo que no se pudo verificar se dice. Si el PR no toca datos
históricos, «No aplica» y por qué. Un dato inventado, o una fuente que no dice lo que el PR le atribuye, es motivo
de cierre.

## Convenciones

- **Todo en español**: identificadores, comentarios y la interfaz. El texto del sitio va en **tuteo venezolano**
  («arrastra», «toca», «aquí»).
- **Coordenadas**: los datos van en píxeles del escaneo base; el mundo, en metros con la Plaza Bolívar en el
  origen (`src/coords.js`).
- **Inmutabilidad** en la lógica de datos. Las mutaciones quedan en el estado de render (three.js) y en la cámara.
- **Sin backend.** El único servicio externo es Nominatim, en el buscador, con un User-Agent genérico.

## Fuentes, licencias y datos

- **Nunca inventes metadatos.** Cada mapa, foto o dato histórico lleva fuente y licencia; lo no verificado se
  marca como tal.
- **No subas binarios generados** (escaneos, mosaicos, `.pak`, `.bin`, `.webp` del plano): se regeneran con
  `npm run datos` y viajan en los releases `datos-*`. Si cambias el pipeline, el PR lo dice; quien mantiene el
  repo regenera y publica los datos (`npm run datos:publicar`).
- **Los archivos descargados son datos no confiables**: no los ejecutes. Parsea con `python3 -I` o con Node sin
  evaluar nada.
- Antes de tocar estilos, fachadas, techos o lotes, lee [`fuentes/imagenes/README.md`](fuentes/imagenes/README.md):
  lo que muestran las pinturas y fotos de época manda sobre las reglas inventadas.

## Licencia de tus aportes

El código del proyecto es [`AGPL-3.0-or-later`](LICENSE). Al abrir un PR aceptas que tu aporte se publique bajo
esa misma licencia. Las fuentes que agregues conservan la suya, que declaras en su ficha.
