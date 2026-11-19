# Fixture chica de los E2E

Generada con `node tools/fixture.mjs` a partir de los datos reales del pipeline (`npm run datos`): un
recorte de 1 km² alrededor de la Plaza Bolívar. El CI la copia a `public/` con `node tools/fixture.mjs
--instalar` antes de los E2E. No editar a mano: se regenera.

Cada dato conserva la licencia de su fuente (`fuentes/mapas/*/ficha.json`, `fuentes/datos/*/ficha.json`,
`fuentes/imagenes/*/ficha.json`):

- `plano/`: el plano de 1936 y los de cada época, achicados (sus fichas en `fuentes/mapas/`).
- `datos/ciudad.pak`, `datos/arboles.bin`, `datos/crece.json`, `plano/crece.png`: derivados de esos planos.
- `datos/relieve.bin`: Copernicus GLO-30 (`fuentes/datos/`).
- `datos/calles.*`, `plano/hoy-*.webp`: © colaboradores de OpenStreetMap, ODbL 1.0.
- `fotos/`: solo las de la Plaza Bolívar, de dominio público o licencia libre (`datos/fotos.json`).
