/**
 * El papel antes de la ciudad (solo en tinta, T25b): la hoja de 1936 se dibuja hasta donde llega la
 * ciudad de la época que rige. Más allá el papel queda en blanco, con lo que ya estaba ahí grabado a
 * pluma: las laderas en normales (trazos cuesta abajo, más gruesos cuanto más empinada, cortados en
 * hileras por la altura), el Guaire y las quebradas con su orilla y sus aguas, y las matas del monte.
 * Es la versión en tinta del valle del modo color (src/shader/valle.js) y usa sus mismos datos:
 * crece.png (G urbanizado desde · B monte), uSuelo (R agua) y el terreno del vértice.
 *
 * Dentro de la ciudad, antes de 1936, la hoja va sin sus letras, cifras y cotas (uRotulos): «Universidad
 * Central» o «903.780» son de 1936; los nombres de cada época los ponen las marcas (src/marcas.js). Cada
 * rótulo se rellena con el papel de alrededor (lo que no es rótulo, a pocos metros), así que las líneas
 * de manzanas y calles quedan. En 1936 la hoja se ve tal cual es, con todo lo que trae.
 *
 * El borde entre la ciudad y el papel en blanco no es una línea de máscara: tiembla con un ruido de
 * pocos metros y el dibujo se va en dos tiempos, primero el tinte y después las líneas negras, como un
 * plano que el dibujante dejó sin terminar.
 *
 * Necesita GLSL_PLANO (uMapa, uHoja, uPlaza, uMetro, planoViejo), GLSL_CRECE, GLSL_VALLE (ruidoValle,
 * azar2, creceEn), GLSL_SOMBRA (uSol), uSuelo y uRotulos (GLSL_SUELO) y los varyings vMundo, vTerreno y
 * vPendiente. No agrega muestreadores.
 */

const lineal = (r, g, b) => `vec3(${[r, g, b].map((v) => ((v / 255) ** 2.2).toFixed(3)).join(', ')})` // de sRGB 0–255

/** Las normales: de trazo a trazo y de hilera a hilera (metros de altura) cuando un píxel mide `px` m. */
export const NORMALES = Object.freeze({ paso: 7, banda: 7, px: 0.7 })
/** A qué distancias se toma el papel que rellena un rótulo (m): lo que no es rótulo, alrededor. */
export const RELLENO_M = Object.freeze([3, 8, 17])
/** Lado de la celda en que cabe una mata del monte (m). */
export const CELDA_MATA_M = 26
/** Lado de la celda en que cabe una mata de pasto del llano (m). */
export const CELDA_PASTO_M = 30

export const GLSL_PAPEL = /* glsl */ `
  const vec3 PAPEL_EN_BLANCO = ${lineal(250, 246, 230)}; // el papel de la hoja de 1936 donde no hay nada dibujado
  const vec3 TINTA_PLUMA = ${lineal(62, 48, 38)};

  /**
   * Un juego de normales en la dirección k (de 0 a 7, de a 22,5°): trazos cuesta abajo cada "paso" metros,
   * cortados en hileras cada "banda" metros de altura (cada trazo corta a su altura: no hay renglones
   * rectos), más gruesos arriba y cuanto más empinada es la ladera. Devuelve cuánta tinta lleva el punto.
   */
  float normalesEn(vec2 m, float k, float paso, float banda, float altura, float cuesta, float px) {
    float a = k * 0.3927;
    float u = dot(m, vec2(-sin(a), cos(a))) / paso;
    float trazo = floor(u);
    float lado = abs(fract(u) - 0.5) * 2.0; // 0 en el eje del trazo, 1 entre dos trazos
    float fila = fract(altura / banda + 0.3 * azar2(vec2(trazo, k)));
    float cuerpo = smoothstep(0.0, 0.1, fila) * (1.0 - smoothstep(0.72, 0.9, fila));
    float grueso = clamp(0.04 + 0.42 * cuesta, 0.0, 0.26) * mix(0.45, 1.0, fila);
    float filo = px / paso;
    return cuerpo * (1.0 - smoothstep(grueso - filo, grueso + filo, lado));
  }

  /** Las laderas a pluma. De lejos los trazos se espacian (cada escala dobla la anterior). */
  float laderasEn(vec2 m, float altura, vec2 pendiente, float px) {
    float cuesta = length(pendiente);
    float hay = smoothstep(0.07, 0.18, cuesta);
    if (hay <= 0.0) return 0.0;
    // la dirección de la cuesta, de a 22,5°; el corte entre dos direcciones tiembla: manchones de trazos
    float k = atan(pendiente.y, pendiente.x) / 0.3927 + 0.6 * (ruidoValle(m / 70.0) - 0.5);
    k = floor(k + 0.5);
    float e = log2(max(px / ${NORMALES.px.toFixed(2)}, 1.0));
    float escala = exp2(floor(e));
    float cerca = normalesEn(m, k, ${NORMALES.paso.toFixed(1)} * escala, ${NORMALES.banda.toFixed(1)} * escala, altura, cuesta, px);
    float lejos = normalesEn(m, k, ${(2 * NORMALES.paso).toFixed(1)} * escala, ${(2 * NORMALES.banda).toFixed(1)} * escala, altura, cuesta, px);
    return hay * mix(cerca, lejos, smoothstep(0.35, 0.95, fract(e)));
  }

  /** El Guaire y las quebradas: la orilla y, adentro, las aguas que la siguen. r = agua, ribera = agua desenfocada. */
  float aguasEn(float r, float ribera, float wRibera) {
    float orilla = smoothstep(0.12, 0.42, r) * (1.0 - smoothstep(0.58, 0.88, r));
    float onda = abs(fract(ribera * 3.5 + 0.2) - 0.5) * 2.0;
    float filo = clamp(3.5 * 2.0 * wRibera, 0.02, 0.6);
    float aguas = step(0.6, r) * (1.0 - smoothstep(0.5 * filo, 1.5 * filo, onda)) * (1.0 - smoothstep(0.25, 0.6, filo));
    return max(orilla, 0.6 * aguas);
  }

  /** Las matas del monte y del bosque de galería: una copa por celda donde crece.png (B) dice monte. */
  float matasEn(vec2 m, float galeria, float px) {
    const float G = ${CELDA_MATA_M.toFixed(1)};
    float deCerca = 1.0 - smoothstep(0.8, 1.7, px);
    if (deCerca <= 0.0) return 0.0; // de lejos las matas no se dibujan: serían un punteado parejo
    vec2 celda = floor(m / G);
    vec2 centro = (celda + 0.22 + 0.56 * vec2(azar2(celda), azar2(celda + 31.7))) * G;
    float monte = creceEn((centro / uMetro + uPlaza) / uHoja).b;
    float hay = step(azar2(celda + 7.1), 0.55 * smoothstep(0.2, 0.7, monte) + 0.3 * galeria);
    float r = G * (0.09 + 0.05 * azar2(celda + 3.3));
    vec2 d = m - centro;
    float dist = length(d);
    // la copa: un contorno de lóbulos, más cargado del lado que no mira al sol
    float a = atan(d.y, d.x);
    float borde = r * (1.0 + 0.16 * sin(5.0 * a + 6.28 * azar2(celda + 1.7)));
    float sombra = 0.5 + 0.5 * dot(d / max(dist, 1e-3), -normalize(uSol.xz));
    float grosor = 0.4 * px + r * mix(0.03, 0.22, sombra * sombra);
    float copa = 1.0 - smoothstep(grosor - px, grosor + px, abs(dist - borde));
    // y su sombra en el suelo: un trazo corto, del lado contrario al sol
    vec2 q = d + normalize(uSol.xz) * r * 1.7;
    float pie = (1.0 - smoothstep(0.1 * r, 0.1 * r + px, abs(q.y - 0.4 * q.x))) * (1.0 - smoothstep(0.6 * r, 0.6 * r + px, length(q))) * step(borde, dist);
    return 0.75 * hay * deCerca * max(copa, 0.7 * pie);
  }

  /** Cuánto falta para llegar al segmento a–b, en metros. */
  float alTrazo(vec2 p, vec2 a, vec2 b) {
    vec2 ab = b - a;
    return length(p - a - ab * clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0));
  }

  /** El pajonal del llano: matas de pasto sueltas (tres trazos en abanico), como en los planos viejos. */
  float pajonalEn(vec2 m, float cuesta, float px) {
    const float G = ${CELDA_PASTO_M.toFixed(1)};
    float deCerca = (1.0 - smoothstep(0.7, 1.5, px)) * (1.0 - smoothstep(0.1, 0.2, cuesta));
    if (deCerca <= 0.0) return 0.0;
    vec2 celda = floor(m / G);
    if (azar2(celda + 11.3) > 0.42 * smoothstep(0.35, 0.6, ruidoValle(celda / 9.0) + 0.25)) return 0.0;
    vec2 d = m - (celda + 0.25 + 0.5 * vec2(azar2(celda + 5.1), azar2(celda + 23.9))) * G;
    float t = min(alTrazo(d, vec2(0.0), vec2(0.0, -2.6)), min(alTrazo(d, vec2(-0.5, 0.0), vec2(-1.7, -2.0)), alTrazo(d, vec2(0.5, 0.0), vec2(1.7, -2.0))));
    float grosor = 0.22 + 0.4 * px;
    return 0.55 * deCerca * (1.0 - smoothstep(grosor - 0.6 * px, grosor + 0.6 * px, t));
  }

  /**
   * La hoja sin su rótulo: donde hay tinta de rótulo va el papel de alrededor: lo que no es rótulo ni
   * línea, a pocos metros y del mismo lado del borde de la manzana (uSuelo A: la calle es clara y la
   * manzana lleva tinte). Lo que ya era papel dentro de la máscara no se toca: no se desenfoca nada.
   * manzana = uSuelo A en el punto.
   */
  vec3 sinRotulos(vec2 hoja, vec3 papel, float rotulo, float manzana, float px) {
    if (rotulo < 0.02) return papel;
    const vec3 LUMA = vec3(0.299, 0.587, 0.114);
    float texel = uMetro * uHoja.x / float(textureSize(uMapa, 0).x); // metros por texel del plano general
    float lod = 0.5 + log2(max(px / texel, 1.0));
    vec3 suma = vec3(0.0);
    float peso = 0.0;
    for (int k = 0; k < ${RELLENO_M.length * 4}; k++) {
      float a = 1.5708 * float(k) + 0.55 * float(k / 4) + 0.3;
      float radio = k < 4 ? ${RELLENO_M[0].toFixed(1)} : k < 8 ? ${RELLENO_M[1].toFixed(1)} : ${RELLENO_M[2].toFixed(1)};
      vec2 h = hoja + radio * vec2(cos(a), sin(a)) / (uHoja * uMetro);
      vec2 uvh = vec2(h.x, 1.0 - h.y);
      vec3 c = textureLod(uMapa, uvh, lod).rgb;
      float w = (1.0 - min(1.0, 2.0 * textureLod(uRotulos, uvh, 0.0).r)) * pow(dot(c, LUMA), 10.0)
        * (1.0 - 0.95 * abs(textureLod(uSuelo, uvh, 1.0).a - manzana)) / radio;
      suma += w * c;
      peso += w;
    }
    // un rótulo tan grande que no deja papel cerca: el plano muy desenfocado
    vec3 relleno = peso > 1e-5 ? suma / peso : textureLod(uMapa, vec2(hoja.x, 1.0 - hoja.y), lod + 4.0).rgb;
    // cuánta tinta de rótulo hay en el punto: lo que se aparta del papel de alrededor
    float tinta = smoothstep(0.012, 0.05, distance(papel, relleno));
    return mix(papel, relleno, rotulo * tinta);
  }

  /**
   * La hoja en tinta en la época que rige. papel = planoEn(hoja); urbano = urbanoEn(hoja, epoca), 0 campo
   * … 1 ciudad; s = uSuelo en el punto; ribera = su agua desenfocada (wRibera, su derivada); rotulo =
   * cuánto del punto es letra del plano; px = metros por píxel. Las lecturas con mipmap y las derivadas
   * llegan hechas: esto se llama dentro de una rama.
   */
  vec3 papelDeEpoca(vec2 hoja, vec3 papel, float epoca, float urbano, vec4 s, float ribera, float wRibera, float rotulo, float px) {
    // en 1936 (y sin línea de tiempo) es el plano tal cual; con ?planos, donde está el plano de la época, también
    float talCual = max(smoothstep(4.5, 5.0, epoca), planoViejo);
    if (talCual >= 1.0) return papel;
    vec2 m = vMundo.xz;
    // el borde de la ciudad, a pulso (el temblor solo se calcula cerca del borde)
    float c = urbano;
    if (urbano > 0.02 && urbano < 0.98) c += 0.3 * (0.6 * ruidoValle(m / 34.0) + 0.4 * ruidoValle(m / 8.0) - 0.5);
    float tinte = smoothstep(0.42, 0.62, c), lineas = smoothstep(0.22, 0.42, c);
    // la ciudad: el plano sin sus rótulos (fuera de ella no se rellena nada)
    vec3 ciudad = lineas > 0.0 ? sinRotulos(hoja, papel, rotulo, s.a, px) : papel;
    if (tinte >= 1.0) return mix(ciudad, papel, talCual);
    // el papel en blanco, apenas manchado, con el valle a pluma
    vec3 blanco = PAPEL_EN_BLANCO * (0.975 + 0.05 * ruidoValle(m / 240.0));
    float galeria = smoothstep(0.03, 0.3, ribera) * (1.0 - smoothstep(0.3, 0.6, s.r));
    float seco = 1.0 - smoothstep(0.1, 0.4, max(s.r, ribera));
    float pluma = max(max(0.8 * aguasEn(s.r, ribera, wRibera), matasEn(m, galeria, px)), seco * max(0.8 * laderasEn(m, vTerreno.x, vPendiente, px), pajonalEn(m, vTerreno.y, px)));
    blanco = mix(blanco, TINTA_PLUMA, pluma * (1.0 - lineas));
    vec3 c3 = mix(blanco, ciudad, tinte);
    // entre el tinte y el blanco quedan solo las líneas negras del plano
    float trazo = 1.0 - smoothstep(0.12, 0.4, dot(ciudad, vec3(0.299, 0.587, 0.114)));
    c3 = mix(c3, TINTA_PLUMA, (lineas - tinte) * trazo);
    return mix(c3, papel, talCual);
  }`
