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

### 3. Visor principal
Capas DOM sobre el `<canvas>` a pantalla completa:

| Elemento | Posición | Función |
|---|---|---|
| `#titulo` | abajo a la izquierda | Botón "?" de 44px. Al tocarlo se expande con título, subtítulo, línea de atajos y el link "¿Qué estoy viendo?", que reabre la intro |
| `#epocas` | arriba al centro | Botonera de años (1867, 1888, 1895, 1905, 1910, 1921, 1940) + botón ▶ "andar" que los recorre solo; abajo, la fuente del plano de ese año |
| `#buscar` | arriba a la izquierda | "Buscá una dirección de hoy: Corrientes 1234" |
| `#firma` | arriba a la derecha | Avatar + "Hecho por @autor" → X/Twitter |
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

**Escritorio**: arrastrar = mover · rueda = acercar · botón derecho = girar/inclinar · click en un nombre = ir · `Espacio` = plano ⇄ ciudad (acostar/levantar) · `H` = lo de hoy · `C` = color ⇄ tinta.
**Táctil**: un dedo mueve; dos dedos acercan, giran e inclinan; tocar un nombre lleva al lugar.
**Modos** (ver `05`): WASD/flechas para moverse, Shift corre, Esc vuelve; en auto, V cambia la vista, B toca la bocina, M el sonido, N otro coche, y Q/E cambian de año.

Parámetros URL útiles: `?limpio` (sin UI, para capturas), `?capture`, `?sinintro`, `?lugar=<nombre>`, `?hoy`, `?liviano` / `?pesado` (forzar calidad), `?chico`.

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

## Accesibilidad

`role="button"`, `aria-expanded`, `aria-pressed` en los toggles, `aria-label` en los botones de ícono, `aria-live="polite"` en buscador y ficha, foco visible con outline, teclado completo y `prefers-reduced-motion`.

## Criterios de aceptación (para el nuevo sitio)

- [ ] Primer cuadro útil (plano visible) en menos de 2 s en 4G; ciudad levantada en menos de 6 s.
- [ ] 60 fps en una laptop media; usable en un celular de gama media (modo liviano).
- [ ] Toda la geometría de la primera época cae, de forma verificable, sobre el plano (superponer y comparar).
- [ ] Cada foto lleva autor, fecha, licencia y link a la fuente.
- [ ] Funciona sin los servicios externos (salvo el buscador).
