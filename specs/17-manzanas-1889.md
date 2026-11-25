# Manzanas completas de 1889: continuidad de 1843 (T82.6)

La rama parte de `main` después de fusionar #214. Prolonga la vida de las casas generadas de 1772 y 1843
hasta 1911, copiando su historia de 1843 a 1889. Conserva huellas, parcelas, marcos, alas, pisos, semillas,
colores, tejados y árboles. El crecimiento residencial ocurre en las ampliaciones; no se vuelve a sortear
ni a densificar el tejido heredado. Es la continuidad visual solicitada por el responsable, no una
afirmación sobre la supervivencia histórica de cada vivienda.

## Resultado

Se conservan **399 unidades, 4.210 registros de casas y 6.597 árboles** de 1843. Las ampliaciones
aportan **87 unidades, 686 casas y 1.132 árboles**: 486 unidades y 7.729 árboles de manzana en total.
Los 231 contornos extraídos se distribuyen en 152 referencias heredadas y 79 de ampliación; estas
últimas dan 87 componentes después del recorte. Todas las nuevas unidades tienen árboles.

El paquete contiene 4.896 casas en 1889; el visor muestra 4.879. De los 4.208 registros visibles en 1843,
4.193 siguen visibles: las supresiones existentes de Santa Capilla (2), Santa Teresa (4) y Universidad (9)
ocultan 15 desde 1889. Además, las dos del Panteón ya estaban ocultas en 1843. Se conservan los 4.210
registros exactos y no se toca la lógica ni las zonas de supresión de esos modelos.

## Referencia de Mestre

Se usa el [plano de Vicente S. Mestre de 1889, BnF/Gallica, copia Commons](https://commons.wikimedia.org/wiki/File:Plano_topografico_de_la_ciudad_de_Caracas,_levantado_en_1889_vajo_la_direccion_-_del_general_don_Vicente_S._Mestre_-_btv1b53027837n.jpg).
Su ficha en `fuentes/mapas/1889-bnf-mestre/ficha.json` declara dominio público. El calce existente está en
`fuentes/derivados/1889/calzado.json` (RMS 7,64 m; máximo 19,16 m). El mapa dibuja manzanas con color liso,
sin patios privados: los linderos extraídos, las parcelas y los árboles del generador son inferencias.

1889 no tiene un censo manual equivalente al revisado de 1843. `tools/geo/manzanas_1889.py` reutiliza el
perfil de color y los umbrales del pipeline de épocas, **sin la dilatación de 5 m** destinada al calce de
casas. Conserva los componentes separados por calles y huecos de al menos 100 m²; simplifica a 2 m.
El recorte y las exclusiones de `tools/geo/referencias/1889-manzanas-config.json` evitan el marco, la
leyenda, el cementerio de la Concepción, el hipódromo y la estación del Ferrocarril Central. Se revisaron
las superposiciones sobre el plano calzado; esto no se presenta como un nuevo censo aprobado.

Las referencias se identifican como `extraida`. El selector solo admite ese estado en el paso de 1889;
1843 sigue exigiendo `aprobada`. Si al menos la mitad de un contorno coincide con el tejido heredado,
prevalece la unidad anterior, evitando duplicaciones por errores de calce. En los otros contornos se
restan las unidades previas con una separación de 6 m y se generan los componentes restantes. Los
espacios internos y las reservas de hitos activos en 1889 se respetan en las casas nuevas.

El modelo histórico y su supresión siguen teniendo prioridad al dibujar: una casa heredada puede quedar
oculta si un edificio histórico la reemplaza en 1889. Sus datos originales se conservan y no se cambian
las épocas anteriores. El informe distingue continuidad de registros y continuidad visible.

## Regeneración

El pipeline incorpora `referencia-1889` y `manzanas-1889`; el empaquetador consume la ciudad resultante.
El arbolado aplica las tres generaciones en orden. Con las entradas ya presentes:

```sh
.venv/bin/python tools/geo/manzanas_1889.py fuentes/derivados/epocas/referencia-1889.json
node tools/manzanas-1889.mjs fuentes/derivados/epocas/ciudad-manzanas-1843.json fuentes/derivados/epocas/ciudad-manzanas-1889.json
node tools/empacar-ciudad.mjs fuentes/derivados/epocas/ciudad-manzanas-1889.json
node tools/arboles.mjs fuentes/derivados/1936/segmentacion/mosaico/arboles.json fuentes/derivados/1936/mosaico.json fuentes/derivados/1936/segmentacion/mosaico/jardines.json fuentes/derivados/1936/segmentacion/mosaico/clases-costura.png --manzanas-1889
npm run datos -- --verificar
```

`npm run datos` incluye todas las dependencias. No se versionan binarios ni se publica un release en
este PR. El sitio publicado requiere el nuevo release de datos tras la revisión/fusión; desplegar solo
JavaScript sobre el paquete viejo no cambia las manzanas.

El piloto opcional de balcones conserva sus mismas casas y buffers también en 1889, y se apaga desde
1911. No se amplía a otras unidades ni se activa por defecto.

## Verificación

Los informes en `specs/reglas/manzanas-1889/` comparan casas y árboles en las seis épocas, continuidad,
solapes y rendimiento. Las capturas locales están en `../miraflores/entregables/manzanas-1889/`.
La revisión visual del agente no sustituye la revisión humana ni las puertas históricas R1–R12 pendientes.

La auditoría compartida conserva los nombres de campos `1772` por compatibilidad, pero aquí recibe el
informe de 1843 como tejido anterior. Comprueba solapes y copas entre todas las unidades nuevas, como
exige la corrección de #215. El filtro de árboles descarta primero por caja y después usa el mismo
polígono y sus huecos, evitando repetir recorridos costosos al integrar una tercera época.

## Tests y rendimiento

- Vitest final, después de incorporar #215: **109 archivos, 1.726 tests correctos**.
- Python final: **1.012 tests correctos**.
- E2E completo antes de incorporar #215: **89 correctos, 1 omitido y 2 fallos previos** (`hitos.spec.js:96`, expected-failure que pasa, y `:117`, color de la hoja acostada). Ambos fallos se reprodujeron después sobre main actualizado.
- Después del rebase y de regenerar los datos corregidos: **3 E2E correctos**, continuidad 1843, continuidad 1889 y piloto de balcones.
- Build, presupuesto del build, verificación de datos, firmas de seis épocas y auditoría espacial global: correctos.
- Nuevas pruebas: continuidad de las dos generaciones anteriores, calles/huecos de contornos, coordenadas del mosaico, exclusiones del marco/estación y reservas de la época. La auditoría heredada de #215 comprueba también solapes y copas entre unidades diferentes.

Medido con datos completos de cada versión, builds de producción, NVIDIA RTX 2060, 1280×800 y `--gpu --epoca 1889`, usando la medición de arranque corregida en #215. Informes completos: `specs/reglas/manzanas-1889/rendimiento-base.json` y `rendimiento-1889.json`.

| Medida | main | rama | Tope |
|---|---:|---:|---:|
| casasMs | 7361 | 6408 | 5000 |
| tareaMasLargaMs | 701 | 368 | 200 |
| bytesAlAbrir | 10147075 | 10276276 | 8000000 |
| heapMB | 242 | 228 | 250 |
| triangulosCentro | 4901841 | 5328395 | 2000000 |
| msPorCuadroCentro | 8.1 | 8 | 16.6 |

Los triángulos del centro suben 8,7 % por las alas, patios y árboles del tejido completo; los bytes al abrir suben 129.201 (+1,27 %). Las llamadas del centro bajan de 229 a 206. Medianas: centro 8,1→8,0 ms, valle 7,4→7,7 ms, cerca 8,1→8,1 ms. El p90 central sí sube 9,2→10,8 ms; no se afirma una mejora uniforme de todos los cuadros. Los topes de carga, tarea larga, transferencia y triángulos ya estaban excedidos en main y siguen excedidos. No se midieron teléfonos ni se cambiaron presupuestos. Build: 309,7/330 KB iniciales, 139,7/150 KB workers y 1,3/3 KB service worker, todos dentro del presupuesto.

La comparación visual no registra errores del navegador. En las épocas ajenas a 1889 las diferencias
son pequeñas variaciones de rasterización/sombras (máximo 0,052 % de canales y diferencia media
0,0073/255); sus firmas geométricas y de árboles son idénticas.
