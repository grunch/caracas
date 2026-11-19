# T41a · Miraflores desde 1911

Sustituye el hito genérico por el modelo procedural aprobado en el estudio vecino `miraflores/`. No incluye fotografías, capturas de terceros ni binarios GLB. El código crea geometría propia.

## Implantación y épocas

Conserva el centro del hito existente del plano de 1936: píxel (7958, 6360), eje EJE_DAMERO. Frente del modelo hacia +b del marco (aproximadamente sur). Dimensiones del cuerpo 52 × 44 metros aproximados; supresión de casas y planta 64 × 56 m para incluir explanada y escaleras. No se escala anisotrópicamente para llenar el antiguo rectángulo genérico de 56 × 72 m. La posición fina y orientación requieren cotejo con levantamiento; no se presenta como nueva georreferenciación exacta.

Nace en índice 4 (1911), no aparece en 1889 y continúa en 1936. Esto selecciona la primera época disponible posterior a su construcción, no afirma que se construyera en 1911.

## Integración

`miraflores-modelo.js` conserva el constructor aprobado y sus cuatro accesos. `miraflores.js` aplica las matrices de cada pieza, convierte su color lineal y vuelca la geometría al lienzo de hitos. Las geometrías y materiales temporales se liberan. El resultado usa una sola malla junto con los demás hitos, el ancla del relieve y sus shaders de vida, ola, sombras y tinta/color. No agrega miles de draw calls ni un segundo cargador de assets.

## Fuentes y límites

Referencias internas aportadas por el usuario: 29 imágenes de `miraflores/recursos/`. Capturas de reconstrucción de terceros (marca visible Arqui Cultura), autoría y licencia exactas sin verificar; no se redistribuyen. Fotografías históricas 1911.jpg, Miraflores_1930.jpg, palacio-de-miraflores-1910.jpg, palacio_de_miraflores_1930.jpg; sus nombres no se consideran fechas certificadas. El catálogo del proyecto conserva además las fichas `1900-commons-palacio-de-miraflores-detroit` y `1911-commons-palacio-de-miraflores-baralt`.

Entradas: dos frontales (capturas 09-30-24 y 09-30-39), lateral posterior (09-31-00) y Puerta Dorada en lateral opuesto (09-31-33 y detalle 09-31-46). Las capturas de 1897/1901 muestran etapas anteriores sin marquesinas; se usa el estado posterior aprobado.

Medidas interpretativas, ornamentación simplificada. Pendientes buhardillas, terrazas y escaleras interiores, bloque posterior asimétrico, anexos y decoración del patio. No es un levantamiento exacto ni un modelo de interiores transitables. El usuario aprobó integrar esta versión, no se declara completa la reconstrucción histórica.
