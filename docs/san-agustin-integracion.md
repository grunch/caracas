# San Agustín: integración del estudio de Miraflores

Subtarea de #259. No resuelve los otros tres templos del issue. La Trinidad/Panteón ya está implementada y no forma parte de este cambio.

## Estado comprobado antes de trabajar

En `main` 3d0b58a había marca `san-agustin` desde 1936, sin constructor propio en HITOS. El estudio previo de Miraflores existía, pero omitía la cúpula y tenía una envolvente genérica. Se revisó allí antes de copiarlo a Caracas. No se confunde una marca con un modelo instalado.

## Fuentes y fases

El [catálogo primario del IPC, Lo construido, tomo 2](https://albaciudad.org/wp-content/uploads/2017/01/Libertador-Construido2.pdf), pp. impresas216–217 (PDF110), describe construcción1924–1930 por Alejandro Chataing, torre32m y cúpula24m. Tres naves, central al doble de altura de las laterales, crucero, cúpula rebajada con tambor y óculos, y campanario octagonal. El colegio está al norte y la casa cural al oeste. Consulta del PDF completo27-11-2026.

[FAC](https://fundaayc.com/2015/01/08/1930%E2%80%A2-iglesia-san-agustin-santa-rosalia/) confirma terminación1930. El título fecha el hecho y no certifica la toma de su fotografía. Se consultaron fotos del IPC y FAC, sin redistribuirlas: licencia no establecida. La entrada FAC3-5-2020 mezcla iglesia1930 y colegio1941–42 en texto/pie; no se adopta como fotografía fechada.

| Vista | Estado |
|---|---|
| 1772,1843,1889,1911 | Sin edificio ni reserva |
| 1936 | Iglesia terminada; nace5 |
| 1946 | Continúa el mismo volumen; muere0 |

No se ha probado una reforma entre las dos vistas. Reutilizar el volumen no certifica que cada detalle fuese idéntico. La avenida Fuerzas Armadas posterior no se incorpora.

## Calce y límites

[Lectura del contorno](san-agustin-georreferencia.json) en el mosaico DCN1936 de0.5m/px, contrastado con el plano basado en fotos1946. Promedios de lados32.47×62.73m; decimales para reproducir el cálculo, no precisión catastral. El contorno cartográfico no distingue con certeza cada muro y espacio descubierto. Se adopta una envolvente nominal32×63m, sin ocupar la manzana completa ni los anexos norte/oeste.

Centro leído9756.5,8777; origen del volumen9757.2,8773.1, eje(.983,.182). Reserva desplazada2m hacia el frente para abarcar escalones. Frente sur hacia Este14 inferido de dirección IPC y eje longitudinal. Debe comprobarse visualmente contra calles y casas de ambas épocas. Los puntos de calle al este y sur, colegio al norte y casa cural al oeste quedan fuera en las pruebas de reserva.

Cuerpo30×56m y cubiertas dentro de envolvente32×63m. No se escala verticalmente ni se deforma la cúpula circular. Solo alturas32/24m y relación de naves provienen de la descripción: alturas9/18m, vanos, octavo de óculos, cornisas, materiales, colores y detalles son interpretativos. No se inventan retablos ni se representan espacios residuales como jardines históricos.

## Archivos y procedimiento

- Miraflores: `src/patrimonio-san-agustin.js`; guía `docs/prioridades/san-agustin.md`; renders y GLB propios en `entregables/san-agustin-revisada`.
- Caracas: copia explícita `src/hitos/san-agustin-constructor.js`, factoría `san-agustin-modelo.js`, adaptador `san-agustin.js`, datos `datos/san-agustin.js`.
- Constructor usa el taller existente, agrupa por material y vierte geometría en el lienzo común. No descarga GLB ni agrega renderer/texturas. Libera geometrías y materiales de estudio tras copiar.
- Registro al final de HITOS y plantas para preservar orden/semillas anteriores; enlace de marca y ficha con incertidumbres.
- Reserva temporal nace5, sin supresión en épocas anteriores. No se registra terraza adicional: revisar apoyo sobre el relieve y resolverlo según la evidencia visual.
- Tras fusión: regenerar con `npm run datos`, verificar salida/manifiesto, publicar con `npm run datos:publicar`. Una marca enlazada no prueba que los derivados estén actualizados.

## Verificación

Suite completa final:138 archivos /1843 pruebas pasan (41,71s), incluidos vida, reserva, alturas, enlace de marca y ficha. Python:1034 pruebas (53,20s). El estudio independiente tiene20 pruebas, incluidas alturas, campanario abierto y cierre alto del crucero.

24 comprobaciones urbanas distintas:22 pasaron en la primera tanda; las dos de fotos simuladas fallaron en preview por la interferencia del service worker de producción con `page.route`. Ambas pasaron al bloquearlo en la configuración local de esas pruebas (33,5s); el código de la aplicación no cambió para ocultar el fallo. La CI usa servidor de desarrollo, sin ese service worker.

[Capturas comparables de las seis épocas y estudio](https://gist.github.com/grunch/e717cc8b4e8e4b2e9319c5886a26e136): main0c99f37 y geometría de rama0c1a92e,1440×1000, mismas cámaras, errores[]. Se inspeccionaron ausencia antes de1936 y continuidad1936/1946; ningún anexo ni avenida nueva. La [medición comparada](mediciones/san-agustin/README.md) documenta +971ms de carga en esta pareja (+7,5%), geometríaJS+3,3MB y llamadas90→90, sin prometer impacto nulo. Revisión pendiente. No se da por cerrado #259.
