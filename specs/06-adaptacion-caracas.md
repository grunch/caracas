# 06 · Adaptación a Caracas

> Todo lo histórico de este documento es **un punto de partida a verificar** con fuentes primarias antes de llevarlo al sitio. Los planos se encontraron en una búsqueda rápida; de cada uno falta confirmar resolución, institución y licencia.

## 1. Lo que decide el proyecto: el plano base

Hace falta **un** plano antiguo en dominio público, escaneado en muy alta resolución, que dibuje **el interior de las manzanas** (edificado vs. patio o solar). Estos son los candidatos que aparecieron:

| Año | Plano | Por qué interesa | Dónde buscar |
|---|---|---|---|
| 1843 | Plano topográfico de Caracas, de Jesurún (lit. Müller & Stupler) | La ciudad colonial antes de Guzmán Blanco | guiaccs.com, bibliotecas |
| **1874** | **Plano topográfico de Estevan Ricard**, encargado por Guzmán Blanco | Se describe con **bordes de propiedad catastrales**, lo más cercano a "manzana por manzana". Es el **mejor candidato a plano base** | guiaccs.com; el original, en Biblioteca Nacional de Venezuela, Archivo General de la Nación, LoC, BnF Gallica |
| 1897 | Primer plano de Ricardo Razetti | Primera época posterior | guiaccs.com, U. Minnesota (umedia) |
| 1906 | Plano según el original de Razetti | Época intermedia | guiaccs.com |
| 1919 | "Plano de Caracas" | Época intermedia | UC Berkeley Earth Sciences & Map Library |
| 1929 | Último plano de Razetti (Lit. del Comercio) | Época tardía, con las parroquias foráneas | guiaccs.com |
| ~1936–1940 | Plan Monumental / Rotival (1939) | Cierre del período: la Caracas que está por cambiar | archivos municipales |

**Primera tarea concreta**: conseguir el plano de Ricard (1874) en el mayor tamaño posible y comprobar (a) la resolución (10.000 px o más), (b) la licencia y (c) si distingue edificado de patio. Si no lo distingue, el pipeline cambia a "lotes catastrales + reglas" (ver §4).

Línea de tiempo posible: **1874 · 1897 · 1906 · 1919 · 1929 · 1940**.

## 2. Qué cambia respecto de Buenos Aires

| Tema | Buenos Aires | Caracas |
|---|---|---|
| Origen (`plaza`) | Plaza de la Victoria / de Mayo | **Plaza Bolívar** (antigua Plaza Mayor) |
| Relieve | Secundario (la barranca) | **Protagonista**: valle, el Ávila al norte, colinas (El Calvario, El Paraíso) y quebradas. Hace falta un DEM bueno y la montaña de fondo |
| Agua | Río de la Plata, rellenos del puerto | **Río Guaire** y las quebradas (Catuche, Caroata, Anauco), que después se **embaulan**: es el equivalente del "río que retrocede" |
| Trama | Damero, cuadras de ~130 varas | Damero colonial; las esquinas tienen **nombre propio** |
| Direcciones | Calle y altura | **"De esquina a esquina"** (de La Torre a Veroes): la función estrella del buscador |
| Buscador | USIG + Nominatim | Nominatim + **un diccionario propio de esquinas** (nombre → píxel del plano) |
| Ferrocarril | Estaciones del Parque, Retiro… | Ferrocarril La Guaira–Caracas (Caño Amarillo), Gran Ferrocarril de Venezuela, tranvías |
| Grandes obras | Av. de Mayo, diagonales, 9 de Julio | Las obras de Guzmán Blanco (Capitolio, Teatro Municipal, Panteón, El Calvario), Miraflores; la reurbanización de El Silencio (posterior a 1940) |
| Terremotos | — | 1812 (antes del período) y **1900 (San Narciso)**: sus daños pueden aparecer en la línea de tiempo |
| Tono del copy | Voseo | **Tuteo venezolano** ("arrastra", "toca", "puedes"; "aquí" en lugar de "acá") |
| Coches | Volanta → Ford V8 | Burro y carreta, coche de caballos, tranvía de mulas y eléctrico, Ford T, Ford V8 (verificar la flota real con fotos) |

## 3. Contenido para curar (borrador a verificar)

**Marcas y fichas iniciales** (con su `desde/hasta`): Plaza Bolívar (sus reformas), Catedral, Palacio Arzobispal, Capitolio Federal (sobre el convento de las Concepciones), Teatro Municipal, Panteón Nacional (antes iglesia de la Santísima Trinidad), Santa Capilla, San Francisco, Santa Teresa, La Candelaria, Altagracia, El Calvario, Palacio de Miraflores, Estación Caño Amarillo, la Universidad, Mercado de San Jacinto, Puente de Hierro, Hotel Majestic, el Guaire y las quebradas.

**`hoy.json`** (la Caracas actual sobre el plano): Parque Central, Centro Simón Bolívar / torres de El Silencio, Av. Bolívar, Av. Urdaneta, la autopista sobre el Guaire, el metro (líneas 1 y 2), el teleférico del Ávila. Notas del tipo: "Aquí corría la quebrada de Catuche, hoy embaulada."

**Fotos**: Wikimedia Commons (categorías de Caracas por siglo), fotos de época en dominio público, Biblioteca Nacional de Venezuela. Cada foto con autor, fecha, licencia y URL, como en el original.

## 4. Si el plano base no trae edificado/patio

1. Vectorizar las manzanas y los **lotes catastrales** (según la fuente, Ricard dibuja bordes de propiedad).
2. Generar el edificado de cada lote: casa colonial de patio (cuerpo a la calle + alas alrededor del patio + solar al fondo). La proporción ocupada se calibra con las primeras fotos aéreas (años 30) y con descripciones de época.
3. Estilos caraqueños: colonial de un piso con **tejado de teja criolla a dos aguas** (en Caracas dominan los tejados, no las azoteas de BA, así que hay que cambiar el techo por defecto), neoclásico guzmancista, republicano/ecléctico, casilla, y rancho en las orillas y las quebradas.

## 5. Plan por fases

| Fase | Entrega | Criterio de "listo" |
|---|---|---|
| 0. Fuentes | Plano base + 3‑5 planos posteriores, con licencia | Escaneos en disco y tabla de fuentes |
| 1. Visor del plano | Vite + three.js, hoja con LOD y teselas, cámara propia, intro | Se navega el plano a 60 fps; primer cuadro en < 2 s |
| 2. Calce | `plaza`, `metro`, GCPs contra OSM, DEM reproyectado | Error < 10 m en el centro |
| 3. Ciudad de 1874 | Segmentación → manzanas, lotes, techos, muros, árboles → `ciudad.pak` | La ciudad se levanta con la ola, en tinta |
| 4. Shader de color | Suelo, calles, fachadas y techos caraqueños, relieve con el Ávila | Tinta⇄color con la tecla C |
| 5. Hitos y fichas | 15‑20 edificios modelados, con sus fichas y fotos | Un click abre la ficha con fotos acreditadas |
| 6. Épocas | `crece` por plano, quebradas embauladas, obras | ▶ recorre de 1874 a 1940 |
| 7. Hoy y buscador | Capa de OSM, nombres de calles, buscador por esquinas | "De La Torre a Veroes" se ubica en el plano |
| 8. Modos | Caminar, volar, manejar (coches y tranvía de cada época) | Se puede usar en celular |
| 9. Edificios | `edificios.html` con scrollytelling | — |

Disciplina de desarrollo (según tus reglas globales): TDD en los tools y en los decodificadores (Vitest), E2E y regresión visual con Playwright usando `window.lab.ready` y `?limpio`, y revisión de código antes de cada commit.

## 6. Riesgos

- **Licencias**: que un plano sea antiguo no garantiza un escaneo libre; algunas bibliotecas restringen la reproducción. Hay que confirmarlo antes de invertir en el pipeline.
- **Resolución**: con un escaneo de menos de ~8.000 px no alcanza el detalle de manzana.
- **Relieve fuerte**: con calles en pendiente, casas e hitos tienen que apoyarse en el terreno (el ancla y el "pie que baja" del original), y los modos caminar y manejar necesitan la altura del suelo en cada punto.
- **Calce**: los planos venezolanos del siglo XIX pueden tener errores locales grandes; hace falta TPS con muchos GCPs.
- **Esquinas**: el diccionario esquina→coordenada se arma a mano (hay listas publicadas; verificar).

## Fuentes de la búsqueda inicial

- [guiaccs.com: La ciudad de Razetti (1897)](https://guiaccs.com/en/planos/razettis-city/)
- [guiaccs.com: El último plano de Razetti (1929)](https://guiaccs.com/en/planos/razettis-last-plan/)
- [guiaccs.com: La ciudad de los caballos](https://guiaccs.com/en/planos/the-horses-city/)
- [guiaccs.com: Plano de Ricard (1874) y otros](https://guiaccs.com/?p=4577) · [p=4567](https://guiaccs.com/?p=4567) · [p=4593](https://guiaccs.com/?p=4593) · [p=4555](https://guiaccs.com/?p=4555) · [p=4601](https://guiaccs.com/?p=4601) · [p=870](https://guiaccs.com/?p=870)
- [guiaccs.com: El Paraíso (plano de 1906)](https://guiaccs.com/en/planos/search-paradise-el-paraiso/)
- [UC Berkeley: Plano de Caracas (1919)](https://geodata.lib.berkeley.edu/catalog/p16022coll205:239/citation)
- [U. Toronto: Plano y guía de Caracas](https://collections.library.utoronto.ca/view/mdl:2487)
- [Princeton Maps](https://maps.princeton.edu/catalog/princeton-4j03d351f) · [MIT GeoData (UMN)](https://geodata.libraries.mit.edu/record/gisogm:edu.umn:0d24690aa3bb) · [MIT GeoData (Princeton)](https://geodata.libraries.mit.edu/record/gisogm:edu.princeton.arks:867e77326fbf)
- [Geographicus: Mendoza Solar, Caracas en 1810 (publicado en 1910)](https://geographicus.com/P/AntiqueMap/caracas-mendozasolar-1910)
- [Posen Library: Topographic Map of the city of Caracas](https://posenlibrary.com/node/2538)
- [Geohistoria de la Caracas insurgente (PDF)](https://museosbolivarianos.mincyt.gob.ve/libros/PDF%2000048-GEOHISTORIA%20DE%20LA%20CARACAS%20INSURGENTE.pdf)
- [Timeline of Caracas](https://wikipedia.com/wiki/Timeline_of_Caracas)

## 7. Hallazgos de la búsqueda de mapas (18‑11‑2026)

Catálogo completo en `fuentes/CATALOGO.md` (32 mapas; 26 descargados y 6 solo con ficha por derechos).

- **El Ricard de 1874 no existe en alta resolución en línea.** Lo único disponible es un redibujo de 1950 (Simón Arias M.) de 1600 px. El original (tinta, 180×167 cm, 1:4.000) está en el Concejo Municipal de Caracas: pedir un escaneo allí o en la Biblioteca Nacional.
- **El mejor plano técnico es el DCN de 1936 a 1:5.000** (dos hojas de ~14.800×23.700 px, restitución de fotos aéreas). **Dibuja edificado vs. patio en cada manzana**, como el Glade de BA. Problema: **derechos no claros** (obra del Estado venezolano de 1936, sin licencia declarada). Hay que verificarlo antes de publicar nada derivado.
- Otros útiles: Mestre 1889 (11457×8218, 1:5.000, dominio público, manzanas lisas), Razetti 1911 y 1919 (dominio público), Jesurún 1843 (facsímil de 7216 px), *Exato mapa* de 1772 (AGI: rojo = edificado, amarillo = solares), Pimentel 1578 (esquema de 25 manzanas con sus solares "casa"), Caracas Monumental de Sosa 1935 (vista de pájaro: referencia de fachadas, CC BY‑NC‑SA).

### Enfoque decidido: se construye hacia atrás, se muestra hacia adelante

En BA el plano base es el más antiguo y los demás lo hacen crecer. En Caracas conviene **lo contrario**: la geometría precisa sale del plano de 1936 (o de Mestre 1889 si los derechos de 1936 no lo permiten), y la línea de tiempo **desmonta** la ciudad hacia el pasado:

**Pipeline: 1936 → 1919 → 1889 → 1843 → 1772 → 1578** · **Sitio: 1578 → 1772 → 1843 → 1889 → 1919 → 1936** (la ola levanta la ciudad hacia adelante, como en BA).

Decisión del 18‑11‑2026: se usan todos los mapas, incluido el DCN de 1936. Los derechos los verifica el responsable del proyecto antes de publicar; cada `ficha.json` conserva su licencia.

El damero colonial sobrevivió, así que las manzanas de 1578 y 1772 se pueden ubicar sobre las reales alrededor de la Plaza Bolívar:
- **1578**: las 25 manzanas de Pimentel, 4 solares cada una; se levantan casas solo donde el dibujo dice "casa", más la plaza, la iglesia, el cabildo y San Francisco. Casas de bahareque y tapia con techo de paja o teja; calles de 32 pies; las quebradas Caroata, Catuche y Anauco y el Guaire.
- **1772**: el *Exato mapa* da la ocupación manzana por manzana (rojo/amarillo), lista para el pipeline de "suelo".
