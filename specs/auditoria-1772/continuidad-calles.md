# Continuidad de calles: núcleo curado y red candidata

T33j.1m. Se midieron por separado las dos referencias, sin mezclarlas:

| Referencia | Medición | Resultado | Interpretación |
|---|---|---|---|
| 32 ejes curados del núcleo | Intersección lineal con las huellas visibles | 0 sobre 0,01 m | El eje no atraviesa una huella; no certifica ancho ni hitos. |
| Esos 32 ejes, ambos sentidos | 64 recorridos con el controlador real del navegador | 62 sin pérdida medible; 2 con deslizamiento en C0031 | Hay proximidad a pared, no un bloqueo completo. |
| 470 tramos candidatos del original | Intersección con huellas proyectadas por el TPS actual | 122 con cruces; 348 sin cruces | Candidatos de calce/ocupación, no 122 calles históricas bloqueadas. |

Los resultados completos están en [continuidad-calles-nucleo.json](continuidad-calles-nucleo.json)
y [contraste-tramos-sistema.json](contraste-tramos-sistema.json).

## C0031: distinguir eje libre de paso holgado

El tramo C1772-0031 corresponde al frente F1772-0010-2 del Seminario. En el recorrido
inverso, de 105,5 m esperados se avanzan 104,084 m con desvío lateral de 0,345 m. En
el otro sentido la pérdida es 0,084 m, con el mismo desvío opuesto. El controlador
usa un radio de 0,4 m; las huellas 33085 y 33058 quedan a aproximadamente 0,099 y
0,103 m del eje curado cerca de su extremo occidental. Por ello una línea sin
intersecciones no garantiza que el círculo del caminante pase por ella.

Se inspeccionó la oblicua de esa esquina: hay cuerpos separados y frentes escalonados
junto a San Francisco. La observación amplía I003; no demuestra que el eje curado
sea la posición exacta que deba tener la calle. Resolver límites y frentes antes
de cambiar el radio del caminante. No se propone achicar la colisión para ocultar
una casa mal colocada.

## Procedimiento y límites

B1772-001, época 1, Chromium 159.0.8154.6. En cada sentido se comienza 3 m después
del cruce, se apunta al cruce opuesto y se avanza con KeyW en pasos de 0,1 s a
2,5 m/s, hasta la parte entera de `(longitud - 6) / 0,25`. No hubo reubicación de
entrada. Se registran posiciones antes/después, avance, lateral y cantidad de pasos.
Esto ejercita colisiones con huellas ordinarias; el controlador actual no incluye
hitos. No es una inspección visual individual de los 64 trayectos.

En los 470 tramos se conserva cada ID R y línea L del inventario. Las huellas del
sistema se proyectan al original con el TPS actual, cuya discrepancia I010 sigue
abierta. El umbral de 0,01 píxeles solo excluye contactos numéricos; no es una
tolerancia histórica. No se convierten estos candidatos en correcciones automáticas.
No se certifican pasos sobre el agua ni accesos a patios por no encontrar una huella.

## Reproducción

Para generar el archivo intermedio `huellas-original-tps.json`, usar el método
publicado en [contraste-unidades.md](contraste-unidades.md): leer los polígonos de
época 1 de `ciudad-estilos.json` y transformar cada vértice con `Calce.al_viejo`
usando los GCP y suavizado actuales. El archivo contiene registros
`{techo, original_tps:[[x,y],…]}`. Su hash exacto queda registrado; otro orden de
serialización puede cambiar el hash sin cambiar las coordenadas.

Los scripts de esta medición están abajo. Las rutas absolutas señalan esta sesión;
reemplazarlas por el checkout que contenga B1772-001 y los derivados fijados.
El navegador usa el servidor de esa baseline en el puerto exclusivo 5205.
No se sobrescribe ni publica ningún dato de la ciudad.

### `.cache/medir-calles.py`

```python
import json,hashlib
from pathlib import Path
import numpy as np
from shapely.geometry import Polygon,LineString
from shapely.strtree import STRtree
p=Path('specs/auditoria-1772');root=Path('/disco/dev/caracas');entrada=root/'fuentes/derivados/epocas/ciudad-estilos.json';c=json.loads(entrada.read_text());vs=np.asarray(c['vertices']).reshape(-1,2);ids=[i for i,(n,m) in enumerate(c['vida']) if n<=1 and (not m or m>1)];polys=[]
for i in ids:
 a,n=c['techos'][i][:2];pts=(vs[a:a+n]-[8968.2,6839])*.5;polys.append(Polygon(pts))
tree=STRtree(polys);ns={n['id']:n['mosaico_referencia'] for n in json.loads((p/'controles-calce-centro.json').read_text())['nodos']};rows=[]
for calle in json.loads((p/'calles.json').read_text())['calles']:
 points=[((np.asarray(ns[n])-[8968.2,6839])*.5).tolist() for n in calle['nodos']];line=LineString(points);hits=[]
 for j in tree.query(line,predicate='intersects'):
  length=line.intersection(polys[j]).length
  if length>.01:hits.append({'techo':ids[j],'longitud_en_huella_m':float(length)})
 rows.append({'calle':calle['id'],'mundo':points,'longitud_m':line.length,'intersecciones':hits})
Path('.cache/calles-medicion.json').write_text(json.dumps({'baseline':'B1772-001','entrada_sha256':hashlib.sha256(entrada.read_bytes()).hexdigest(),'calles':rows},indent=2)+'\n',encoding='utf-8');print('Calles',len(rows),'con huellas en eje',sum(bool(r['intersecciones']) for r in rows));print([(r['calle'],r['intersecciones']) for r in rows if r['intersecciones']])
from shapely.ops import nearest_points
c31=next(r for r in rows if r['calle']=='C1772-0031');line=LineString(c31['mundo']);near=[]
for j in tree.query(line.buffer(.4),predicate='intersects'):
 a,b=nearest_points(line,polys[j]);near.append({'techo':ids[j],'distancia_eje_m':line.distance(polys[j]),'punto_eje':[a.x,a.y],'punto_huella':[b.x,b.y]})
Path('.cache/C0031-cercanias.json').write_text(json.dumps(near,indent=2)+'\n',encoding='utf-8');print(near)
```

### `.cache/contrastar-tramos.py`

```python
import json,hashlib
from pathlib import Path
from shapely.geometry import Polygon,LineString
from shapely.strtree import STRtree
p=Path('specs/auditoria-1772');h=Path('/disco/dev/caracas/.cache/contraste-1772/.cache/huellas-original-tps.json');raw=json.loads(h.read_text());polys=[Polygon(r['original_tps']) for r in raw];tree=STRtree(polys);rows=[]
for tramo in json.loads((p/'tramos-candidatos-original.json').read_text())['tramos']:
 line=LineString(tramo['original']);hits=[]
 for j in tree.query(line,predicate='intersects'):
  largo=line.intersection(polys[j]).length
  if largo>0.01:hits.append({'techo':raw[j]['techo'],'longitud_original_px':largo})
 rows.append({'tramo':tramo['id'],'linea':tramo['linea'],'original':tramo['original'],'longitud_original_px':line.length,'intersecciones':hits,'decision':'candidato_calce_o_ocupacion; no_declarar_calle_bloqueada_sin_reconciliar_I010' if hits else 'sin_interseccion_con_huellas_bajo_TPS; no_certifica_acceso_ni_ancho'})
Path('.cache/contraste-tramos.json').write_text(json.dumps({'baseline':'B1772-001','metodo':'Cruce de ejes candidatos con huellas trasladadas al original por TPS actual; umbral lineal 0,01 px, no tolerancia histórica. No incluye hitos ni relieve.','huellas_sha256':hashlib.sha256(h.read_bytes()).hexdigest(),'tramos':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(len(rows),'tramos;',sum(bool(r['intersecciones']) for r in rows),'con intersecciones candidatas')
```

### `.cache/recorrer-calles.mjs`

```js
import {chromium} from '@playwright/test';
import {readFileSync,writeFileSync} from 'node:fs';
const source='/disco/dev/caracas/.cache/continuidad-calles-1772/.cache/calles-medicion.json';
const calles=JSON.parse(readFileSync(source)).calles;
const browser=await chromium.launch({args:['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']});const page=await browser.newPage({viewport:{width:1200,height:900}});
await page.goto('http://127.0.0.1:5205/?capture&sinintro');await page.waitForFunction(()=>window.lab?.ready&&window.lab.lineaDeTiempo,null,{timeout:120000});
await page.evaluate(()=>{const l=window.lab;l.levantar(true);l.alternarColor(true);l.lineaDeTiempo.elegir(1)});await page.waitForTimeout(3000);
const rows=await page.evaluate(calles=>{
 const l=window.lab;l.ciudad.U.uOla.value=1e5;l.ciudad.U.uOlaEpoca.value=8999;
 const rows=[];
 for(const c of calles)for(const sentido of [0,1]){
 const [a,b]=sentido?[...c.mundo].reverse():c.mundo;const length=Math.hypot(b[0]-a[0],b[1]-a[1]);const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;const inicio={x:a[0]+3*dx,z:a[1]+3*dz},rumbo=Math.atan2(dx,-dz);
 l.aPie.salir();l.cam.jump({...inicio,dist:100,yaw:-rumbo,pitch:.8});if(!l.aPie.entrar())throw Error('No entró');const antes=l.aPie.estado;
 window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));const pasos=Math.floor((length-6)/.25);for(let i=0;i<pasos;i++)l.aPie.update(.1);window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW',bubbles:true}));const despues=l.aPie.estado;
 const avance=(despues.x-antes.x)*dx+(despues.z-antes.z)*dz,desvio=-(despues.x-antes.x)*dz+(despues.z-antes.z)*dx;
 rows.push({calle:c.calle,sentido,inicio_solicitado:inicio,antes,despues,pasos,avance_esperado_m:pasos*.25,avance_m:avance,desvio_lateral_m:desvio,entrada_reubicada_m:Math.hypot(antes.x-inicio.x,antes.z-inicio.z)});
 }
 l.aPie.salir();return rows;
},calles);
writeFileSync('/disco/dev/caracas/.cache/continuidad-calles-1772/.cache/recorridos-calles.json',JSON.stringify({baseline:'B1772-001',browser:browser.version(),epoca:await page.evaluate(()=>window.lab.lineaDeTiempo.actual),recorridos:rows},null,2)+'\n');
console.log('recorridos',rows.length,'con retraso >1m',rows.filter(r=>r.avance_esperado_m-r.avance_m>1),'reubicados',rows.filter(r=>r.entrada_reubicada_m>.01));await browser.close();
```
