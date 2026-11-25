// Comparación fija de las cinco épocas disponibles en la interfaz, datos locales completos.
import {chromium} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
const [url,carpeta]=process.argv.slice(2);await mkdir(carpeta,{recursive:true})
const b=await chromium.launch({args:process.argv.includes('--gpu')?['--use-angle=gl','--enable-gpu','--ignore-gpu-blocklist']:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});const errores=[]
try{const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errores.push(e.message));await p.goto(`${url}?sinintro&sinsw&capture`);await p.waitForFunction(()=>window.lab?.ready&&window.lab.casasListas&&window.lab.arboles,null,{timeout:240000});await p.evaluate(()=>{window.lab.levantar(true);window.lab.alternarColor();});
for(const e of [1,2,3,4,5]){await p.evaluate(e=>window.lab.lineaDeTiempo.elegir(e),e);await p.waitForTimeout(5000);await p.evaluate(()=>{window.lab.ciudad.U.uOla.value=1e5;window.lab.ciudad.U.uOlaEpoca.value=8999;});for(const [nombre,cam] of Object.entries({centro:{x:0,z:0,dist:650,yaw:.3,pitch:1.15},afueras:{x:500,z:650,dist:850,yaw:.3,pitch:1.15}})){await p.evaluate(v=>{window.lab.cam.jump(v);window.lab.pedirCuadro(4)},cam);await p.waitForTimeout(2000);await p.screenshot({path:`${carpeta}/${e}-${nombre}.png`,timeout:120000});}console.log('época',e)}
await writeFile(`${carpeta}/errores.json`,JSON.stringify(errores));if(errores.length)throw new Error(errores.join(';'))
}finally{await b.close()}
