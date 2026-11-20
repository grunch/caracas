# Lectura visual de bordes del original: primer lote

La lectura de `lectura-bordes-original.json` registra 524 frentes de 131 unidades,
conservando los IDs de `frentes-caras-candidatas.json`. Es una clasificación visual
del rojo en el borde de cada unidad, no una geometría aprobada para generar casas.
La fase 1 sigue abierta: quedan 66 bordes de las caras candidatas y las unidades
sin cara única, además de las comprobaciones métricas y de acceso pendientes.

Se inspeccionaron los 16 paneles del original, con cada borde candidato desplazado
3 píxeles hacia su unidad para que no ocultara el borde vecino. Las lecturas del
JSON son explícitas por frente; no se asigna una lectura a las unidades omitidas.
Se excluyen de este lote los símbolos religiosos y los casos cuya relación entre
plaza, edificio y calle necesita un recorte específico. El norte está a la derecha
del escaneo: los índices de borde no son orientaciones cardinales.

## Qué cambia respecto de un sondeo de color

El sondeo exploratorio buscó rojo en LAB (`a > 150`) entre 5 y 18 píxeles hacia el
interior de cada cara; una muestra contaba con al menos 25 % de rojo en esa tira.
Clasificó la proporción de muestras como continua desde 85 %, vacía hasta 10 % y
parcial entre ambos umbrales. Estos umbrales solo sirven para localizar candidatos.

La lectura visual rechaza diez propuestas de ocupación parcial: bordes izquierdo
e inferior de U0005; izquierdo de U0047; superior de U0088; inferior de U0102;
izquierdo de U0114; superiores de U0116, U0145 y U0176; e inferior de U0190. El rojo pertenece a cuerpos retirados
del borde. Usar directamente el sondeo adelantaría edificios hacia la calle.

Otros controles concretos:

- U0055, U0104 y U0210 conservan sus entrantes; no son coronas completas.
- U0087 y U0088 tienen edificación interior sin rojo sobre los cuatro bordes.
- U0182 tiene los cuatro bordes rojos; su ausencia temporal está rastreada en
  `ausencias-rastreadas.json`.
- U0183 conserva la franja libre inferior, aunque buena parte de la unidad sea roja.
- U0113 y U0158 mantienen la abertura de sus cuerpos en C/L, respectivamente.

**Sin rojo en el borde no significa que se pueda entrar caminando.** El plano no
resuelve por sí solo tapias, puertas ni derechos de paso. Tampoco el rojo continuo
identifica casas individuales o la profundidad de sus crujías. Esas decisiones
requieren las referencias de época y las fases correspondientes.

## Comprobaciones

Los 524 IDs existen en las caras candidatas, sin duplicados, y pertenecen a la
unidad indicada. Cada unidad de este lote tiene cuatro bordes. La fuente conserva
el SHA-256 declarado. Los datos del sistema y el generador no cambian en este lote.
