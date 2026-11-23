# Specs: "una ciudad histórica en 3D levantada desde un plano antiguo"

Ingeniería inversa de **https://baires.mormon.garden** ("Buenos Aires, de 1867 a 1940", hecho por @mormonnegro con Claude), escrita para poder construir **un sitio equivalente para otra ciudad** (empezando por Caracas).

> Estos documentos describen *qué hace* el sitio y *cómo está armado* según lo que se ve desde afuera: el HTML, los bundles JS minificados (que conservan comentarios GLSL en español y nombres de archivos fuente como `src/hitos.js` o `tools/crece.mjs`) y los archivos de datos públicos. Lo que es **deducción** y no observación directa está marcado como *(inferido)*. No se copia código del original: la idea es reimplementar la técnica.

## La idea en una frase

Se toma **un plano topográfico antiguo escaneado en altísima resolución** (dominio público) y se lo tiende como una hoja de papel sobre una mesa en WebGL. Con una animación de "ola" que sale de la plaza principal, **la ciudad se levanta en 3D desde el propio dibujo**: manzanas, casas, patios, árboles, iglesias. Después, una **línea de tiempo** monta encima los planos de años posteriores (calzados sobre el primero) y la ciudad crece, el río retrocede y se abren avenidas. Se puede pasar de "tinta" (grabado) a "color", superponer la ciudad de hoy (OpenStreetMap), buscar una dirección actual, abrir fichas con fotos de época y recorrerla a pie, en avión o manejando el coche de cada año.

## Índice

| Archivo | Contenido |
|---|---|
| [01-producto-y-ux.md](01-producto-y-ux.md) | Experiencia, pantallas, controles, textos, tono, estética, accesibilidad, responsive |
| [02-arquitectura-y-formatos.md](02-arquitectura-y-formatos.md) | Stack, módulos, carga progresiva, niveles de calidad, formatos binarios exactos, deploy |
| [03-pipeline-de-datos.md](03-pipeline-de-datos.md) | Cómo pasar de un escaneo a `ciudad.pak`: georreferenciar, vectorizar, inventar lo que el plano no dice |
| [04-render-y-shaders.md](04-render-y-shaders.md) | El material único, la ola, tinta⇄color, fachadas y techos procedurales, relieve, contorno |
| [05-epocas-hitos-modos.md](05-epocas-hitos-modos.md) | Línea de tiempo, edificios con nombre y fichas, "lo de hoy", buscador, caminar/volar/manejar |
| [06-adaptacion-caracas.md](06-adaptacion-caracas.md) | Qué cambia para Caracas, fuentes a buscar, plan por fases, riesgos |
| [07-plan-de-implementacion.md](07-plan-de-implementacion.md) | **Plan vivo**: tareas (un PR cada una), dependencias, criterios y estado |

Plan de corrección de la reconstrucción: [auditoría integral de 1772](08-auditoria-y-correccion-1772.md).
| [08-panteon-por-epocas.md](08-panteon-por-epocas.md) | Trinidad y Panteón: variantes históricas, adaptación al mapa, fuentes y límites (T40a) |

## Resumen técnico

- **Frontend**: Vite (build multipágina: `index.html` + `edificios.html`) y **three.js** puro, sin React, sin post‑procesado y sin controles de librería. JS vanilla en ES modules, todo en español (identificadores, comentarios, UI).
- **Render**: un `WebGLRenderer` con sombras y render **bajo demanda** (solo dibuja cuando algo cambia). **Un material compartido** (MeshLambert parcheado con `onBeforeCompile`) hace casi todo en el shader: la ola que levanta la ciudad, el relieve, tinta⇄color, fachadas por estilo, techos, árboles, rayado de grabado, contorno por profundidad y grano de papel.
- **Datos**: los generan offline unos scripts Node (`tools/*.mjs`) a partir de los escaneos. Formato propio `.pak` = gzip + cabecera JSON + arrays tipados con *byte shuffle*. Texturas del plano en WebP con LOD: 1024 → 2048 → 4096/8192 → teselas de 3072 px.
- **Coordenadas**: todo vive en **píxeles del escaneo base**; `metro` (m/píxel) y `plaza` (píxel origen) los pasan a metros del mundo.
- **Contenido curado a mano**: ~100 marcas por época, decenas de edificios "hito" modelados con plantas poligonales y partes, y fichas con fotos de Wikimedia Commons con autor, fecha y licencia.
- **Hosting**: estático en Cloudflare (Pages, *inferido*). Sin backend. Solo el buscador usa servicios externos (USIG + Nominatim).

## Cómo usar estos specs

1. Leé `01` para fijar la experiencia objetivo.
2. Seguí `06` para elegir los planos de tu ciudad: **es el paso que decide todo**.
3. Implementá en este orden: visor del plano (2D dentro de la escena 3D) → pipeline de manzanas/edificado → ola + extrusión → tinta/color → hitos y marcas → épocas → modos → hoy/buscador.
4. Créditos: el original es de @mormonnegro; si el nuevo sitio se inspira en él, conviene decirlo en el "Acerca".

- [Casa Amarilla por épocas](08-casa-amarilla-por-epocas.md): T41c, modelo aprobado desde 1772, fuentes, límites y adaptación al mapa.
- [Capitolio por épocas](08-capitolio-por-epocas.md): T41d, convento de las Concepciones desde 1772 y Palacio Federal Legislativo hasta 1936, fuentes, límites y presupuesto.
- [Palacio Arzobispal por épocas](08-palacio-arzobispal-por-epocas.md): T41e, hipótesis colonial desde 1772 y reforma de 1876–1877 hasta 1936, implantación junto a la Catedral, fuentes, límites y presupuesto.
