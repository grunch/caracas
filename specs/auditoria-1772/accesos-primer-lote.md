# Sondeo de accesos del primer lote

Se ejecutaron `rejillaDeCasas`, `choca` y `pasoAPie` reales sobre B1772-001, época 1, en los 40 frentes curados de las diez manzanas. Se muestreó cada 2 m, desde 4 m fuera de la referencia hacia su interior, con 136 pasos de 0,1 segundos. Se descartaron inicios bloqueados y se separaron los recorridos que solo se deslizan por una esquina. La profundidad final se mide contra la referencia curada, no contra un patio histórico aprobado.

[El registro](accesos-primer-lote.json) contiene conteos, candidatos, posiciones, navegador, época y hashes de cuatro capturas. Sondeos con destino a más de 10 m dentro de la referencia y desvío lateral menor de 2 m aparecen en tres frentes. Son umbrales de selección para inspección, no reglas de aceptación.

Se reprodujeron dos recorridos en Chromium 159.0.8154.6, viewport 1200 × 900, servidor del checkout aislado con datos completos, época 1772. Se entró al modo a pie en la posición registrada, se mantuvo W mediante el controlador y se observaron antes/después:

- Camejo–Cruz Verde, F1772-0005-3: avance normal de 23,178 m; destino 18,493 m dentro de la referencia. Se llega frente a una pared desde el retranqueo. Confirma que el hueco permite penetración; no demuestra acceso a todo un patio.
- Seminario, F1772-0010-3: avance normal de 18,559 m, desvío lateral 0,292 m; destino 14,559 m dentro de la referencia. La vista inicial tiene una fachada en el rumbo y la final muestra el interior abierto. Debe comprobarse la discordancia entre pared renderizada y huella de colisión, además del contorno quebrado ya localizado en I003.
- Catedral, F1772-0003-3: candidato del sondeo pendiente de recorrido visual. No se incorpora como nuevo defecto confirmado: la rejilla actual usa huellas del paquete y no las mallas de hitos.

Un control geométrico adicional del recorrido de Seminario intersecta una pared del registro 33084 a 18,52695 m del inicio. `choca` devuelve falso en ese punto. El destino queda apenas unos 3,4 cm después de esa pared, lo que explica que la cámara vea el interior: **no prueba que pueda recorrerlo libremente**. Este rayo usa y=1,6 y omite el desplazamiento del relieve y los descartes del shader; es diagnóstico complementario a las capturas, no una solución de colisión 3D. Camejo no tiene intersecciones con paredes en este control.

Las capturas están fuera de git, en `.cache/censo-1772/.cache/accesos/` del checkout principal. La simulación no garantiza continuidad del movimiento con cualquier velocidad: reproduce el paso de 0,25 m usado aquí. El resultado no cierra la fase 7 ni verifica los otros 38 frentes en el navegador.

## Reproducción

Guardar como `.cache/sondear-accesos.mjs` y ejecutar con Node desde un checkout con el paquete fijado por hash. El resultado detallado queda en `.cache/accesos-sondeos.json`.

```javascript
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {decodificarPak} from '../src/pak.js';
import {crearCoords} from '../src/coords.js';
import {rejillaDeCasas,choca,pasoAPie} from '../src/a-pie.js';
const pak=readFileSync('public/datos/ciudad.pak');const raw=gunzipSync(pak);
const d=decodificarPak(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),{vertices:Float32Array,techos:Uint32Array,vida:Uint32Array});
const coords=crearCoords({ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]});const grid=rejillaDeCasas(d,1,coords.aMundo);const blocks=JSON.parse(readFileSync('specs/auditoria-1772/manzanas.json')).manzanas;const rows=[];
for(const b of blocks){
 const v=b.mosaico.map(([x,y])=>coords.aMundo(x,y));const center=v.reduce((s,p)=>({x:s.x+p.x/v.length,z:s.z+p.z/v.length}),{x:0,z:0});
 for(const f of b.frentes){const [a,bb]=f.lado_mosaico.map(i=>v[i]);const dx=bb.x-a.x,dz=bb.z-a.z,len=Math.hypot(dx,dz);let nx=-dz/len,nz=dx/len;if(nx*(center.x-a.x)+nz*(center.z-a.z)<0){nx=-nx;nz=-nz;}
 const probes=[];
 for(let s=2;s<len-2;s+=2){const origin={x:a.x+dx*s/len-4*nx,z:a.z+dz*s/len-4*nz};let state={...origin,rumbo:Math.atan2(nx,-nz)};const blocked=choca(grid,state.x,state.z);if(!blocked)for(let step=0;step<136;step++)state=pasoAPie(state,{adelante:1},.1,{choca:(x,z)=>choca(grid,x,z)});
 const forward=(state.x-origin.x)*nx+(state.z-origin.z)*nz;const lateral=(state.x-origin.x)*(-nz)+(state.z-origin.z)*nx;
 probes.push({desde_inicio_frente_m:s,inicio:origin,final:{x:state.x,z:state.z},inicio_bloqueado:blocked,avance_normal_m:Math.round(forward*1000)/1000,desvio_lateral_m:Math.round(lateral*1000)/1000});}
 rows.push({manzana:b.id,frente:f.id,sondeos:probes});
 }
}
writeFileSync('.cache/accesos-sondeos.json',JSON.stringify({baseline:'B1772-001',pak_sha256:createHash('sha256').update(pak).digest('hex'),metodo:'Sondeos cada 2 m sobre los 40 lados curados, desde 4 m afuera hacia 30 m adentro, 136 pasos de 0.1 s con pasoAPie y rejillaDeCasas reales. El controlador puede deslizar lateralmente; no prueba que el destino sea patio. Referencia curada, no TPS. Los hitos y descartes del shader no intervienen en la rejilla actual.',frentes:rows},null,2)+'\n');
for(const r of rows){const good=r.sondeos.filter(x=>!x.inicio_bloqueado);console.log(r.frente,'inicio libre',good.length,'máx avance',Math.max(0,...good.map(x=>x.avance_normal_m)));}
```

Para cada destino, comprobar que está dentro del polígono `mosaico` convertido con `crearCoords`; seleccionar profundidad >10 m y |desvío lateral| <2 m. Los candidatos seleccionados están preservados en el registro versionado. En el visor completo, situar `lab.cam.jump` en `inicio`, dist=100, pitch=0,8 y yaw=-rumbo, entrar con `lab.aPie.entrar()`, registrar el estado, enviar KeyW, ejecutar 136 veces `lab.aPie.update(0.1)`, soltar KeyW y capturar. Seleccionar y terminar previamente la transición a época 1 como describe la baseline. No teletransportar al destino para validar un acceso.

### Control geométrico complementario

Después de registrar los recorridos del navegador en `.cache/accesos/registro.json`, ejecutar este bloque como `.cache/rastrear-pared-acceso.mjs` con Node.

```javascript
import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {Ray,Vector3} from 'three';
import {decodificarPak} from '../src/pak.js';import {extruirTechos} from '../src/ciudad.js';import {crearCoords} from '../src/coords.js';import {rejillaDeCasas,choca} from '../src/a-pie.js';
const raw=gunzipSync(readFileSync('public/datos/ciudad.pak'));const d=decodificarPak(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),{vertices:Float32Array,techos:Uint32Array,vida:Uint32Array,historia:Uint8Array,marcos:Float32Array,alas:Float32Array});const c=crearCoords({ancho:18600,alto:14800,metro:.5,plaza:[8968.2,6839]});const grid=rejillaDeCasas(d,1,c.aMundo),g=extruirTechos(d,c);const key=(x,z)=>`${Math.fround(x)},${Math.fround(z)}`;const ids=new Map();
for(let k=0;k<d.techos.length;k+=4){let x=0,z=0;const a=d.techos[k],n=d.techos[k+1];for(let j=a;j<a+n;j++){const p=c.aMundo(d.vertices[2*j],d.vertices[2*j+1]);x+=p.x/n;z+=p.z/n;}ids.set(key(x,z),k/4);}
const walks=JSON.parse(readFileSync('.cache/accesos/registro.json')).registros;const rows=[];
for(const walk of walks){const a=new Vector3(walk.antes.x,1.6,walk.antes.z),b=new Vector3(walk.despues.x,1.6,walk.despues.z),length=a.distanceTo(b),ray=new Ray(a,b.clone().sub(a).normalize());const hits=[];const ps=[new Vector3(),new Vector3(),new Vector3()],hit=new Vector3();
for(let j=0;j<g.indices.length;j+=3){const idx=g.indices[j];const n=g.vidas[idx*2],m=g.vidas[idx*2+1];if(n>1||(m&&m<=1)||g.cubiertas[idx*4+3]!==0)continue;for(let k=0;k<3;k++)ps[k].fromArray(g.posiciones,g.indices[j+k]*3);if(!ray.intersectTriangle(...ps,false,hit)||a.distanceTo(hit)>length)continue;hits.push({techo:ids.get(key(g.anclas[idx*2],g.anclas[idx*2+1])),punto:hit.toArray(),distancia:a.distanceTo(hit),choca_huella:choca(grid,hit.x,hit.z)});}
rows.push({frente:walk.frente,intersecciones: hits.sort((a,b)=>a.distancia-b.distancia)});}
writeFileSync('.cache/accesos/paredes.json',JSON.stringify({limite:'Intersección geométrica a y=1.6 sin desplazamiento del relieve ni descartes del shader; complemento del recorrido visual, no colisión 3D final.',recorridos:rows},null,2)+'\n');console.log(JSON.stringify(rows));
```
