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
npm run datos:bajar        # los datos del sitio, que no van a git
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
6. **El PR**, con título y cuerpo en español: un resumen, cómo funciona, el plan de pruebas como checklist y los
   límites conocidos. Si corresponde a una tarea del plan, actualiza su fila.
7. **Revisión**: CodeRabbit y Codex revisan cada PR. Corrige en la misma rama los comentarios que apliquen y
   responde cada hilo, también cuando no aplica (di por qué). No se fusiona sin revisión.

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
