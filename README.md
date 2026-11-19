# Caracas, de 1772 a 1936

**https://grunch.github.io/caracas/**

La Caracas del plano de 1936 de la Dirección de Cartografía Nacional, tendida como una hoja de papel sobre el
relieve del valle y levantada en 3D manzana por manzana. Una línea de tiempo la lleva hacia atrás con los
planos de 1772, 1843, 1889 y 1911, calzados sobre el de 1936: en cada año queda en pie solo lo que ese plano
ya dibujaba.

Además puedes:
- pasar del grabado en tinta al color;
- superponer la ciudad de hoy (OpenStreetMap);
- buscar «de esquina a esquina» (por ejemplo, *de La Torre a Veroes*);
- abrir la ficha de cada lugar con fotos de época.

Está inspirado en [baires.mormon.garden](https://baires.mormon.garden), de @mormonnegro, que hizo lo mismo con
el Buenos Aires de 1867. Este sitio no copia su código: los [`specs/`](specs/README.md) describen la técnica
vista desde afuera y aquí se reimplementó para Caracas. Hecho por [@negrunch](https://x.com/negrunch), con Claude.

## Cómo levantarlo en tu máquina

Necesitas Node 24 y GNU tar como `tar`: viene en Linux; en macOS, instala `gnu-tar` (Homebrew) y pon su
`gnubin` en el `PATH`.

```sh
git clone https://github.com/grunch/caracas.git
cd caracas
npm install
npm run datos:bajar   # los datos del sitio (~90 MB), del release datos-* más nuevo
npm run dev
```

Los datos generados (`public/datos`, `public/plano`, `public/fotos`) **no van a git**. Sin
`npm run datos:bajar`, el sitio arranca pero no encuentra el plano. El script revisa el paquete antes de
extraerlo y comprueba cada archivo contra el sha256 de `public/datos/manifiesto.json`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Sitio estático en `dist/` |
| `npm test` | Tests unitarios (Vitest) |
| `npm run coverage` | Tests unitarios con cobertura |
| `npm run e2e` | Tests de punta a punta (Playwright) |
| `npm run datos:bajar` | Baja los datos del sitio del release más nuevo |
| `npm run datos` | Regenera los datos desde los escaneos originales (ver abajo) |
| `npm run datos:publicar` | Sube los datos regenerados como release nuevo (necesita `gh`) |
| `npm run catalogo` | Rehace el catálogo de mapas (`fuentes/catalogo.json`, `fuentes/CATALOGO.md`) |

## Cómo está hecho

- **`src/`**: la app. Vite y three.js puro, sin frameworks. Un solo material hace casi todo en el shader: la
  ola que levanta la ciudad, el relieve, la tinta y el color, las fachadas y los techos. Solo dibuja cuando
  algo cambia.
- **`tools/`**: el pipeline offline en Node. Empaqueta la ciudad (`.pak`), arma las teselas del plano, las
  fotos y los créditos.
- **`tools/geo/`**: el pipeline en Python. Cose las dos hojas de 1936, segmenta lo edificado, vectoriza las
  casas, calza los planos viejos y georreferencia (UTM 19N / WGS84). Detalles en
  [`tools/geo/README.md`](tools/geo/README.md).
- **`fuentes/`**: un mapa o una imagen por carpeta, con su `ficha.json` (autor, institución, enlace y
  licencia). Los originales no van a git.
- **`specs/`**: qué se construye y cómo. El plan de tareas, con su estado, está en
  [`specs/07-plan-de-implementacion.md`](specs/07-plan-de-implementacion.md).

Para regenerar los datos desde cero necesitas los escaneos originales en `fuentes/` (cada `ficha.json` dice de
dónde bajarlos), Python 3.12 con `tools/geo/requirements.txt` en `.venv` y tiempo: los primeros pasos tardan
minutos.

## Lo que es dato y lo que es reconstrucción

Las manzanas, lo edificado, los patios y los árboles salen de los planos. Las alturas, las fachadas y los techos
no salen de ningún plano: son una reconstrucción hecha con las costumbres y las imágenes de cada época. El
«Acerca» del sitio lo explica, y lista cada fuente con su licencia.

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md).

## Licencia

El código es software libre bajo la [GNU Affero General Public License, versión 3 o posterior](LICENSE)
(`AGPL-3.0-or-later`). Si publicas una versión modificada del sitio, tienes que ofrecer su código fuente a
quienes la usen.

La licencia cubre el código, no las fuentes. Los mapas, las fotos y los datos conservan la licencia de su
origen, que está en su ficha (`fuentes/mapas/*/ficha.json`, `fuentes/imagenes/*/ficha.json`,
`fuentes/datos/*/ficha.json`):
- los planos viejos y las fotos son de dominio público o de licencia libre;
- las calles de hoy son © colaboradores de OpenStreetMap (ODbL);
- el relieve sale del Copernicus DEM (© DLR e.V. / Airbus, provisto bajo COPERNICUS por la Unión Europea y la ESA).

La fuente no declara la licencia del plano de 1936; su ficha lo marca como derechos por verificar.
