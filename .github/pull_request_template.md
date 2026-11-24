## Issue o tarea

<!-- `Closes #N` con un issue que tenga la etiqueta `estado: aceptado`, y la tarea del plan si la hay
(`Tarea: T64`; specs/07-plan-de-implementacion.md). -->

Closes #

## Tipo

<!-- Uno de: fix, feat, refactor, docs, test, chore, perf, ci -->

## Qué cambia y por qué

<!-- De dos a cinco frases: qué cambia para quien mira el mapa (o para quien trabaja en el repo) y por qué. -->

## Qué toca

<!-- Las épocas (1772, 1874…), los modos (tinta, color, hoy), las vistas o recorridos (mapa, a pie, en avión,
manejando, fichas, buscador) y los archivos donde vive ese comportamiento. -->

## Qué más podría romperse

<!-- Qué más lee o escribe lo que cambiaste (uniforms y shaders compartidos, datos generados, el pipeline,
otras épocas) y por qué no se rompe. Si cambia algo que genera los datos, dilo: hay que regenerarlos. -->

## Fuentes

<!-- Cada dato histórico nuevo o corregido (fechas, nombres, formas, colores) con su fuente y licencia, con
enlace. Si el PR no toca datos históricos: «No aplica» y por qué. -->

## Rendimiento

<!-- Si tocas la carga, los workers, la geometría, los shaders, las texturas o los datos que se bajan, pega la
salida de `node tests/e2e/medir-rendimiento.mjs` en `main` y en esta rama (CONTRIBUTING.md § Rendimiento), y di
qué no mediste (sin `--gpu` no hay tiempo por cuadro). Si no: «No aplica» y por qué. -->

## Prueba a mano

<!-- Obligatoria. Ver CONTRIBUTING.md § Prueba a mano: pasos numerados que alguien hizo a mano en el sitio,
cada uno con una línea «Se ve:». En un fix, un paso marcado «(falla en main)»; y un paso de regresión. -->

### Preparación

### Pasos

1.

### Capturas

<!-- Si el cambio se ve (fix o mejora): captura de antes (main) y de después (esta rama), misma vista, época y modo. Si no se ve: «No aplica». -->

### No cubierto

## Tests automáticos

<!-- Los tests que agregaste y qué prueba cada uno. En un fix: el test que falla en main (CONTRIBUTING.md § Test en rojo). -->

## Checklist

- [ ] `npx vitest run` pasa (y `npx playwright test` o `pytest tools/geo/tests` si toqué lo que prueban); pegué la línea de resumen en Tests automáticos
- [ ] El código cambiado no pasa de 3000 líneas sin contar tests ni documentación
- [ ] Si corresponde a una tarea del plan, actualicé su fila en `specs/07-plan-de-implementacion.md`
- [ ] Ningún dato histórico sin fuente; ningún binario generado en el diff
- [ ] Hice yo los pasos de la Prueba a mano y puedo explicar cada línea del diff

## Asistencia de IA

<!-- ¿Usaste herramientas de IA? ¿Para qué partes? No es motivo de cierre: le dice a quien revisa dónde mirar con más cuidado. -->
