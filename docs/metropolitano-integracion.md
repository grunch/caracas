# Circo Metropolitano: integración del estudio de Miraflores

Avance de #257. El Nuevo Circo ya está integrado por #283; son dos edificios distintos.

## Evidencia y localización

El [plano DCN de 1936](https://archive.org/details/WCWdb_18053) rotula el Circo
Metropolitano al sur de la calle entre Puerto Escondido y Miranda, al oeste de la
quebrada Caroata. Lectura del mosaico del repositorio (0,5 m/px), recorte
7500,7500–8350,8350: centro del ruedo **7909,7895**, radio exterior nominal 29 m,
eje horizontal **[-.98,-.2]**; el frente mira hacia la calle al norte.
Error visual estimado ±3 m; no es un deslinde catastral. La marca previa (7905,7905)
queda cerca del centro y no se usa como perímetro.

La [Fundación Arquitectura y Ciudad](https://fundaayc.com/category/crono-arquitectura-venezuela/1940-1949/1945/)
reproduce fotografías de fachada y documenta un ruedo de 36 m, apertura el
2 de febrero de 1896 y demolición en 1945. La ficha conserva la referencia
alternativa de 1942 sin resolver artificialmente la discrepancia.

| Época | Representación |
|---|---|
| 1772, 1843, 1889 | Sin circo ni reserva |
| 1911, 1936 | Mismo modelo; no se inventan reformas intermedias |
| 1946 | Sin circo; no se reconstruye el teatro posterior sin documentarlo |

La planta y la orientación se contrastaron con 1936. El calce independiente de
1911 sigue pendiente; el edificio compartido constituye una hipótesis explícita
de continuidad. Alturas, graderío y colores son interpretativos.

## Instalación

El estudio previo está en `../miraflores/src/patrimonio-prioritario.js`, función
`metropolitano`, con guía `../miraflores/docs/prioridades/metropolitano.md`.
Se extrajo a `src/hitos/metropolitano-modelo.js`: metros, +Y arriba, +Z frente.
Comparte las primitivas del Nuevo Circo sin copiar los otros estudios ni cargar GLB.
El adaptador entrega geometría y colores lineales al lienzo existente.

Registro al final de HITOS para no cambiar las semillas de los edificios existentes.
Vida [4,6), reserva circular más portada, colisiones anulares dejando libre el ruedo.
Terraza y pavimento 58 × 66 m. La reserva no es toda la manzana ni la terraza:
no alcanza la quebrada ni borra solares vecinos por pertenecer a la misma cuadra.
Una casa genérica anterior se corta en 1911; no se le inventa una reaparición en
1946. Las casas cuya vida empieza en 1946 conservan esa vida.

Las fotografías y el escaneo se consultan, no se redistribuyen como texturas:
no se ha establecido aquí licencia libre. Las capturas de validación son renders propios.

## Verificación

Tres regresiones: presencia y vida de todos los vértices, ruedo transitable con
colisión positiva en gradas en 1911/1936, y reserva temporal sin borrar vecinos.
El modelo suma **13.146 triángulos**. El límite de todas las fases pasa de 1.000.000
a 1.020.000, con total 1.012.735; el subconjunto anterior a 1946 pasa de 530.000
a 540.000, con total 537.694. Es un incremento explícito, no una optimización.
Medición de navegador y capturas antes/después pendientes de adjuntar al PR.

Build medido: 336,1 kB iniciales y 157,2 kB de workers; el límite inicial
pasa de 336 a 337 kB para el modelo y su ficha. No se elevan los presupuestos
de tiempo, memoria ni workers.
