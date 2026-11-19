# 01 · Producto y experiencia

## Propuesta

"Un plano de hace más de siglo y medio, levantado manzana por manzana, y la ciudad que creció encima."

El usuario abre una página que parece **un plano grabado sobre una mesa oscura**. Tras una intro breve, el plano se despliega y la ciudad **se levanta desde la plaza principal hacia afuera** como una ola. Todo lo que aparece en 3D está donde el plano lo dibuja. Lo que el plano no dice (alturas, fachadas, división de lotes) se completa "con las costumbres de la época" y con fotos.

Público: curiosos, gente de la ciudad, docentes. Sin login ni backend; carga en segundos y funciona en celular.

## Pantallas y elementos

### 1. Carga
- Fondo `#1d1a17` (marrón casi negro) y texto itálico centrado: **"Desplegando el plano…"**.
- Un script inline en `<head>`, que corre antes del bundle, precarga en paralelo `plano/laminas.json`, `datos/ciudad.json`, `plano/primero.webp` y, con `priority:'low'`, `datos/ciudad.pak`. Las promesas quedan en `window.__pre` para que el bundle las reutilice.

### 2. Intro ("hoja")
Un panel tipo hoja de papel con:
- Título (`Buenos Aires, de 1867 a 1940`), bajada y firma con avatar ("Hecho por @autor").
- Columnas: **Qué estás viendo** · **Y los años que siguen** · **La ciudad en 1867** (contexto histórico: habitantes, presidente, guerra, cómo era el puerto, qué no existía todavía) · **Y la ciudad de hoy** · **De dónde salen los datos** (cada fuente con autor, institución y licencia).
- Pie con la ayuda de controles y el botón **"Ver la ciudad"**. Enter, Espacio y Esc la cierran. En pantallas táctiles, el texto de controles se reemplaza por los gestos con los dedos.
- Se saltea con `?sinintro`, `?limpio` o `?lugar=…`.

*Caracas (implementado, T44):* la referencia junta todo en una hoja; acá son dos, porque la lista de fuentes es larga:
- **Bienvenida** (`#intro`, `src/intro.js` + `src/acerca-panel.js`): una hoja corta sobre la vista, la primera vez —
  título, bajada, dos párrafos (qué es, y qué es reconstrucción), una línea de cómo moverse (otra en pantallas
  táctiles) y los botones **«Ver crecer la ciudad»** (levanta la ciudad y echa a andar el ▶) y **«Entrar»**, más el
  enlace «Qué estoy viendo y de dónde salen los datos», que abre el Acerca. Esc, «Entrar» o un click afuera la
  cierran. Queda anotada en `localStorage` (`caracas:intro-vista`, con try/catch: si el almacenamiento falla, se
  muestra y no se recuerda); `?intro` la fuerza, `?sinintro` y `?capture` la saltean. No espera a nada ni frena
  la carga: aparece mientras se despliega el plano.
- **Acerca** (`#acerca`, botón «?» entre los botones de abajo, teclas `?` o `F1`): diálogo modal con índice y cinco
  secciones — *Qué estás viendo* (qué sale del plano y qué es reconstrucción, y con qué error), *Cómo moverte*
  (de la tabla de `src/controles.js`, la misma que atiende el teclado), *Las épocas* (un párrafo por año, con el
  texto de la línea de tiempo de `crece.json`), *Fuentes y licencias* (de `datos/creditos.json`, ver `02`: cada
  plano, dato, foto y biblioteca con la licencia que declara su ficha; lo pendiente, marcado «por verificar») y
  *Créditos* (la inspiración de @mormonnegro, Claude, el repositorio). Foco atrapado, Esc, el foco vuelve a donde
  estaba; en el teléfono ocupa la pantalla y el índice es una fila que se desliza. Sin `crece.json` o sin
  `creditos.json` (la demo de CI) lo dice en su sección. Capturas: `ANGLE=gl node tests/e2e/capturas-intro.mjs`.

### 3. Visor principal
Capas DOM sobre el `<canvas>` a pantalla completa:

| Elemento | Posición | Función |
|---|---|---|
| `#titulo` | abajo a la izquierda | Botón "?" de 44px. Al tocarlo se expande con título, subtítulo, línea de atajos y el link "¿Qué estoy viendo?", que reabre la intro |
| `#epocas` | arriba al centro | Botonera de años (1867, 1888, 1895, 1905, 1910, 1921, 1940) + botón ▶ "andar" que los recorre solo; abajo, la fuente del plano de ese año |
| `#buscar` | arriba a la izquierda | "Buscá una dirección de hoy: Corrientes 1234". *Caracas:* "Busca: de La Torre a Veroes" (esquinas, cuadras y direcciones de hoy; gramática en `05`); en pantallas de menos de 1120 px va arriba a lo ancho y los años, debajo |
| `#firma` | arriba a la derecha | Avatar + "Hecho por @autor" → X/Twitter. *Caracas:* «Hecho por @negrunch» → x.com/negrunch, sin avatar (sería una imagen de afuera); hasta 1120 px la esquina es del buscador y la firma queda en la bienvenida y en los créditos del Acerca (`AUTOR` en `src/acerca.js`) |
| `#botones` | abajo a la derecha | Más rápido · Caminar · Volar · Manejar · Color · **Ver lo de hoy** (rojo) · **Levantar la ciudad** · Volver al mapa |
| `#leyenda` | sobre los botones | Solo con "lo de hoy": líneas rojas = calles actuales, rayado = tierra ganada al río, © OSM |
| `#marcas` | sobre todo el canvas | Etiquetas 3D proyectadas a pantalla: punto + hilo + cartel |

### 4. Marcas (etiquetas)
- Cada marca tiene un punto de 6px, un hilo vertical de 23px y un cartel con el nombre en **versalitas**. Hay tres niveles (`n1` grande, `n2` normal, `n3` itálica chica) que aparecen según la distancia de cámara.
- Hover/foco: el cartel se aclara y el edificio se **"vela"** (se ilumina en el shader, como con resaltador).
- Click: la cámara vuela al lugar, el cartel se abre con la nota corta y se abre la **ficha**.
- Al cambiar de época, las marcas nuevas aparecen con una animación de "onda" (dos anillos) y un filete que parpadea. Se respeta `prefers-reduced-motion`.
- Las marcas de "lo de hoy" van en rojo `#a03220`.

### 5. Ficha
Panel lateral con título, "era" (rango de años en que existió), foto principal grande, texto y más fotos en una tira horizontal. Cada foto lleva pie: qué es, autor, fecha, licencia y fuente. Hay visor de fotos a pantalla completa con flechas y swipe. Si no hay foto confiable: "Sin imagen de época confiable de este lugar."

### 6. Página "edificio por edificio" (`edificios.html`)
Scrollytelling: a la izquierda, una lista larga de edificios por año; a la derecha, la ciudad 3D en miniatura, que **vuela hasta cada edificio y le da la vuelta** mientras se scrollea. CTA "Abrir el visor entero". Reutiliza los mismos módulos (`marcas`, `fichas`).

## Controles

**Escritorio**: arrastrar = mover · rueda = acercar · botón derecho = girar/inclinar · click en un nombre = ir · `Espacio` = plano ⇄ ciudad (acostar/levantar) · `H` = lo de hoy · `C` = color ⇄ tinta. *Caracas:* `M` = mostrar/ocultar los nombres de los lugares; `/` = ir al buscador; `?` o `F1` = el Acerca. Todos los atajos salen de una sola tabla (`src/controles.js`), que también arma la ayuda.
**Táctil**: un dedo mueve; dos dedos acercan, giran e inclinan; tocar un nombre lleva al lugar. *Caracas (T70):* un dedo mueve; separar o juntar dos dedos acerca o aleja hacia ellos, girarlos gira y lo que estaba entre los dedos sigue entre ellos; deslizarlos juntos hacia arriba o abajo inclina. El modo (pellizcar o inclinar) se decide una vez, cuando los dedos se movieron 12 px (`src/gestos.js`), porque el navegador avisa un dedo por vez.
**Modos** (ver `05`): WASD/flechas para moverse, Shift corre, Esc vuelve; en auto, V cambia la vista, B toca la bocina, M el sonido, N otro coche, y Q/E cambian de año.

Parámetros URL útiles: `?limpio` (sin UI, para capturas), `?capture`, `?sinintro`, `?lugar=<nombre>`, `?hoy`, `?liviano` / `?pesado` (forzar calidad), `?chico`. *Caracas:* `?sombras=0` / `?sombras=N` (lado del mapa de sombras), `?contorno=0`, `?grano=0` (specs/04, Luz y acabado).

## Estética (sistema visual)

- **Paleta**: fondo `#1d1a17`; papel `#f1e6cd`; tinta `#2a221b`; hover `#fff6e2`; texto claro `#efe4cd`/`#f7eedb`; acento "hoy" `#a03220`.
- **Tipografía**: serif del sistema, sin webfonts: `Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif`, 15px/1.4. Itálicas para notas, versalitas para nombres y números `lining-nums`.
- **Paneles**: rectángulos sin radio, borde de 1px color tinta + `outline` de 1px a 2px de distancia (doble filete de grabado) y sombra `0 5px 24px #0007`. Aparecen con un fade de 1.2s cuando el `body` recibe `listo`.
- **Estado por clases en `<body>`**: `listo`, `info`, `ficha`, `hoy`, `modo`, `modo-caminar|volar|manejar`, `limpio`. El CSS decide la visibilidad; el JS solo cambia clases.
- Sin selección de texto, sin zoom del navegador, `overscroll-behavior:none`, `touch-action:none` en el canvas; respeta `safe-area-inset-*`.

## Tono y copy

- Español rioplatense con voseo ("arrastrá", "tocá", "podés"). **Para Caracas: español venezolano con tuteo** ("arrastra", "toca", "puedes").
- Frases cortas y concretas, de cronista: "Acá estaba la iglesia de San Nicolás." "En 1867, esto era río." Cada dato es verificable; cuando algo no está confirmado, la ficha lo dice.
- Mensajes de error humanos: "No se pudo cargar. Tocá el año otra vez para reintentar."

## Responsive

Breakpoints cuidados a mano: ≤350, ≤370, ≤640 (teléfono), 641–860, 641–1080, ≤1100, 1101–1440 y **teléfono acostado** (`height ≤ 500`). Objetivos táctiles de al menos 44px (`@media (pointer:coarse)`). En teléfono, la firma pasa a ser un avatar redondo de 46px y los paneles se reubican para no tapar el centro.

*Caracas (T70):* de pie (≤ 640 px), el texto de cada año va en dos líneas a lo más. Acostado (`max-height:500px`, hasta 1120 px de ancho), el buscador y los años van lado a lado en la fila de arriba, el texto del año se calla (queda «Ver el plano de…») y los botones se aprietan contra el borde. La firma no tiene avatar (sería una imagen de X): en el teléfono está en la bienvenida y en el Acerca. Modo liviano (`src/calidad.js`): además de texturas de 4096 y sombras de 2048, dibuja a 1,5 píxeles por punto como mucho (2 en equipos completos).

## Accesibilidad

`role="button"`, `aria-expanded`, `aria-pressed` en los toggles, `aria-label` en los botones de ícono, `aria-live="polite"` en buscador y ficha, foco visible con outline, teclado completo y `prefers-reduced-motion`.

## Criterios de aceptación (para el nuevo sitio)

- [ ] Primer cuadro útil (plano visible) en menos de 2 s en 4G; ciudad levantada en menos de 6 s.
- [ ] 60 fps en una laptop media; usable en un celular de gama media (modo liviano).
- [ ] Toda la geometría de la primera época cae, de forma verificable, sobre el plano (superponer y comparar).
- [ ] Cada foto lleva autor, fecha, licencia y link a la fuente.
- [ ] Funciona sin los servicios externos (salvo el buscador).
