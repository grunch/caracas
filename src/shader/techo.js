import { CUBIERTA } from '../techos.js'

/**
 * Los techos, por dentro del faldón: aTecho (src/ciudad.js) trae s (metros a lo largo del alero), t
 * (metros bajando por la pendiente desde la cumbrera), el largo del faldón y qué lo cubre.
 *
 * - Teja criolla: hileras de canal y cobija que bajan por la pendiente, cada teja con su tono; cada casa,
 *   el suyo, de marrón grisáceo a naranja de teja nueva, gastado de forma despareja (litografía de 1839), con
 *   chorreaduras de moho, parches de teja nueva, el caballete de la cumbrera y la sombra del alero.
 * - Azotea de cemento con sus manchas; zinc acanalado con óxido; el alero por debajo, de caña y madera.
 * - En tinta, como el grabado de 1812: papel rayado a pluma en el sentido de la pendiente, con la
 *   cumbrera y el alero marcados.
 *
 * De lejos todo se apaga a su tono medio (detalle(), por derivadas): sin moiré. Va después de
 * GLSL_FACHADA, que trae azar(), las herramientas de dibujo y la chapa acanalada.
 */
export const GLSL_TECHO = /* glsl */ `
  const float CUB_TEJA = ${CUBIERTA.TEJA}.0, CUB_AZOTEA = ${CUBIERTA.AZOTEA}.0, CUB_ZINC = ${CUBIERTA.ZINC}.0, CUB_ALERO = ${CUBIERTA.ALERO}.0, CUB_PATIO = ${CUBIERTA.PATIO}.0, CUB_SOLAR = ${CUBIERTA.SOLAR}.0,
    CUB_VOLADA = ${CUBIERTA.VOLADA}.0; // lo que se le suma a la cubierta en la cara de arriba de un alero
  const float TEJA_ANCHO = 0.24, TEJA_LARGO = 0.38; // de eje a eje de las cobijas; lo que asoma cada teja

  /**
   * El tono del tejado de la casa, uno por casa (vista aérea del pueblo colonial, fuentes/imagenes): casi
   * todos gastados, de marrón grisáceo a terroso claro; una de cada ocho, de teja nueva, naranja vivo.
   */
  vec3 teja(float semilla) {
    if(vPaleta>0.5)return tejaDeManzana(mod(vPaleta-1.0,6.0));
    vec3 gris = vec3(0.47, 0.35, 0.29), marron = vec3(0.59, 0.37, 0.25), clara = vec3(0.73, 0.47, 0.30), nueva = vec3(0.86, 0.45, 0.23);
    float k = azar(semilla * 1.7);
    vec3 c = k < 0.5 ? mix(gris, marron, k * 2.0) : mix(marron, clara, k * 2.0 - 1.0);
    c = mix(c, nueva, step(0.875, azar(semilla * 5.3)));
    return c * (0.9 + 0.18 * azar(semilla * 3.1));
  }
  /** Azotea de cemento o de baldosa clara. */
  vec3 azotea(float semilla) { return vec3(0.66, 0.63, 0.57) * (0.92 + 0.12 * azar(semilla * 2.3)); }
  /** Zinc: gris azulado, con óxido en las más viejas. */
  vec3 zinc(float semilla) { return mix(vec3(0.60, 0.62, 0.63), vec3(0.50, 0.36, 0.27), azar(semilla * 4.7) * 0.7); }

  /** Rayas a pluma cada 'paso' metros que nunca se juntan a menos de unos píxeles: de lejos, el paso se duplica. */
  float rayasDePluma(float x, float paso, float w) {
    float nivel = max(0.0, log2(max(w, 1e-5) * 5.0 / paso));
    float p0 = paso * exp2(floor(nivel)), f = fract(nivel);
    float a = trazo((fract(x / p0 + 0.5) - 0.5) * p0, 0.75 * w, w);
    float b = trazo((fract(x / (2.0 * p0) + 0.5) - 0.5) * 2.0 * p0, 0.75 * w, w);
    return mix(a, b, f); // las rayas que sobran se van aclarando hasta el nivel siguiente
  }

  /** El tejado de teja criolla. s, t en metros; largo = de la cumbrera al alero; sombra = 1 en el faldón que no ve el sol. */
  void tejado(inout vec3 c, inout float k, float semilla, float s, float t, float largo, float sombra, vec2 w2) {
    float w = max(w2.x, w2.y);
    float sem = fract(semilla * 0.0137) * 61.0;
    float hilera = floor(s / TEJA_ANCHO), x = fract(s / TEJA_ANCHO);
    float corrida = 0.22 * azar(hilera * 3.7 + sem); // las hiladas van casi parejas de una hilera a la otra
    float f = t / TEJA_LARGO + corrida, fila = floor(f), y = fract(f);

    // lo grande: chorreaduras de moho que bajan por la pendiente (más hacia el alero) y parches de teja nueva
    float lejos = detalle(4.0, w);
    float bajada = clamp(t / max(largo, 1.0), 0.0, 1.0);
    float moho = smoothstep(0.5, 0.85, manchas(vec2(s * 0.9, t * 0.11) + sem)) * (0.35 + 0.65 * bajada);
    float parche = step(0.82, azar(floor(s / 1.9 + sem) * 5.3 + floor(t / 1.5 + corrida) * 9.1 + sem));
    vec3 base = c;
    c = mix(c, c * vec3(0.62, 0.66, 0.60), 0.6 * moho * lejos);
    c = mix(c, base * 1.14 + 0.02, 0.55 * parche * (1.0 - moho) * lejos);

    // las hileras, de a varias: vetas de tono que se ven aunque ya no se distinga cada teja
    float veta = ruido(vec2(s / 0.8, sem)) - 0.5;
    c *= 1.0 + 0.16 * veta * detalle(1.6, w2.x);

    // cada teja: su tono, el lomo de la cobija a la luz, la canal en sombra y el borde de la que la monta
    float cerca = detalle(TEJA_ANCHO, w);
    float canal = smoothstep(0.27, 0.42, abs(x - 0.5));
    float lomo = max(cos((x - 0.5) * 5.2), 0.0);
    float tono = azar(hilera * 7.13 + fila * 13.7 + sem);
    float labio = (1.0 - smoothstep(0.0, 0.13, y)) * (1.0 - canal);
    float detalleTeja = mix(0.84 + 0.3 * lomo, 0.42, canal) * (0.9 + 0.2 * tono) * (1.0 - 0.22 * labio);
    c *= mix(0.84, detalleTeja, cerca);
    c = mix(c, c * vec3(1.08, 0.97, 0.9), (tono - 0.5) * 0.5 * cerca);

    // el caballete de la cumbrera: una hilera de tejas atravesadas, asentadas en mezcla clara; de lejos
    // queda como una línea clara que nunca baja de un píxel: es lo que dibuja el mar de tejados
    float linea = detalle(3.5, w2.y);
    float anchoCaballete = max(0.2, 1.2 * w2.y);
    float caballete = banda(t, -0.05, anchoCaballete, w2.y);
    c = mix(c, base * (0.9 + 0.22 * barras(s, 0.42, 0.34, w2.x)) + 0.06, 0.8 * caballete * linea);
    c *= 1.0 - 0.4 * banda(t, anchoCaballete, anchoCaballete + max(0.07, 0.6 * w2.y), w2.y) * linea;
    // el alero: la última hilada, doble y en sombra
    c *= 1.0 - 0.32 * banda(largo - t, -0.05, max(0.14, 1.1 * w2.y), w2.y) * linea;
    // el faldón que no mira al sol, más oscuro: así se leen los volúmenes, como en la litografía de 1839
    c *= 1.05 - 0.24 * sombra;

    // en tinta: rayas en el sentido de la pendiente (más cargadas a la sombra), la cumbrera y el alero a pluma
    float salteada = 0.55 + 0.45 * step(0.35, azar(floor(t / 0.9 + corrida) + hilera));
    k = max(k, (0.4 + 0.45 * sombra) * rayasDePluma(s, 0.42, w2.x) * mix(salteada, 1.0, sombra));
    k = max(k, max(trazo(t - 0.03, 0.03, w2.y), trazo(largo - t - 0.03, 0.03, w2.y)));
  }

  /** La azotea: cemento con manchas de agua y juntas de baldosa. */
  void losa(inout vec3 c, inout float k, float semilla, float s, float t, vec2 w2) {
    float w = max(w2.x, w2.y), sem = fract(semilla * 0.0137) * 61.0;
    c *= 1.0 - 0.16 * smoothstep(0.4, 0.8, manchas(vec2(s, t) * 0.4 + sem)) * detalle(3.0, w);
    float juntas = max(barras(s, 0.6, 0.02, w2.x), barras(t, 0.6, 0.02, w2.y));
    c *= 1.0 - 0.12 * juntas;
    k = max(k, 0.25 * rayadoPantalla(0.12));
  }

  /**
   * El piso del patio: tierra apisonada o laja, más oscura que la calle (entre paredes, casi siempre a
   * la sombra), con alguna mata en los rincones. El solar del fondo (solar = 1): tierra con pasto ralo.
   */
  void pisoDePatio(inout vec3 c, inout float k, float semilla, float s, float t, float solar, vec2 w2) {
    float w = max(w2.x, w2.y), sem = fract(semilla * 0.0137) * 61.0;
    float cerca = detalle(2.0, w);
    vec3 clara = mix(vec3(0.43, 0.39, 0.31), vec3(0.60, 0.54, 0.41), solar), oscura = mix(vec3(0.35, 0.32, 0.26), vec3(0.52, 0.47, 0.35), solar);
    c = mix(clara, oscura, manchas(vec2(s, t) * 0.5 + sem) * cerca + 0.5 * (1.0 - cerca));
    float matas = smoothstep(mix(0.68, 0.58, solar), mix(0.78, 0.72, solar), manchas(vec2(s, t) * 0.33 + sem * 1.7));
    c = mix(c, vec3(0.38, 0.43, 0.26), (0.7 * cerca + mix(0.05, 0.15, solar) * (1.0 - cerca)) * mix(matas, 1.0, 1.0 - cerca));
    k = max(k, 0.5 * matas * rayadoPantalla(0.35) * cerca);
  }

  /** El alero visto de abajo: las cañas sobre los canes de madera. */
  void bajoAlero(inout vec3 c, inout float k, float s, float t, vec2 w2) {
    c = vec3(0.60, 0.47, 0.33) * (0.75 + 0.35 * barras(s, 0.5, 0.12, w2.x)) * (1.0 - 0.25 * barras(t, 0.06, 0.02, w2.y));
    k = max(k, 0.5 + 0.4 * rayadoPantalla(0.6));
  }

  /** El tono medio de un techo, sin dibujo: lo que se ve de la casa acostada en la hoja, antes de la ola. */
  vec4 techoLlano(float cubierta, float semilla) {
    if (cubierta > CUB_VOLADA - 0.5) cubierta -= CUB_VOLADA;
    if (es(cubierta, CUB_AZOTEA)) return vec4(azotea(semilla), 0.0);
    if (es(cubierta, CUB_ZINC)) return vec4(zinc(semilla), 0.0);
    if (es(cubierta, CUB_PATIO) || es(cubierta, CUB_SOLAR)) return vec4(0.42, 0.38, 0.30, 0.0);
    return vec4(teja(semilla) * 0.84, 0.0);
  }

  /**
   * El techo en un punto: rgb, su color; a, su tinta en el grabado. faldon = (s, t, largo); luz = cuánto
   * mira la cara al sol (coseno); w2 = metros por píxel a lo largo y a lo alto del faldón (las derivadas, tomadas
   * en el main fuera de toda rama).
   */
  vec4 techoEn(vec3 faldon, float cubierta, float semilla, float luz, vec2 w2) {
    if (cubierta > CUB_VOLADA - 0.5) cubierta -= CUB_VOLADA;
    float s = faldon.x, t = faldon.y, largo = faldon.z;
    float sombra = 1.0 - smoothstep(0.5, 0.92, luz);
    vec3 c = teja(semilla);
    float k = 0.0;
    if (es(cubierta, CUB_AZOTEA)) { c = azotea(semilla); losa(c, k, semilla, s, t, w2); }
    else if (es(cubierta, CUB_ZINC)) {
      c = zinc(semilla);
      chapaAcanalada(c, k, fract(semilla * 0.0137) * 97.0, s, t, w2);
      k = max(0.6 * k, max(trazo(t - 0.03, 0.03, w2.y), trazo(largo - t - 0.03, 0.03, w2.y)));
    }
    else if (es(cubierta, CUB_ALERO)) bajoAlero(c, k, s, t, w2);
    else if (es(cubierta, CUB_PATIO)) pisoDePatio(c, k, semilla, s, t, 0.0, w2);
    else if (es(cubierta, CUB_SOLAR)) pisoDePatio(c, k, semilla, s, t, 1.0, w2);
    else {
      tejado(c, k, semilla, s, t, largo, sombra, w2);
      // El estudio conserva la terracota con variación leve, sin la pátina gris del mapa.
      if(vPaleta>0.5)c=mix(teja(semilla),c,0.18);
    }
    return vec4(c, clamp(k, 0.0, 1.0));
  }`
