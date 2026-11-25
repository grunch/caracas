import {Color,ShaderChunk} from 'three'
import {PERFIL_COLONIAL} from './plan.js'
// 0 conserva el material histórico. 1…36 identifica el par exacto muro/teja del estudio.
export function codificarPaleta(muro,teja){
 const m=PERFIL_COLONIAL.muros.indexOf(muro),t=PERFIL_COLONIAL.tejas.indexOf(teja)
 if(m<0||t<0)throw new Error('Color fuera de la paleta colonial')
 return 1+m*6+t
}
const vec=c=>`vec3(${new Color(c).toArray().map(v=>v.toFixed(7)).join(',')})`
const tabla=(nombre,colores)=>`vec3 ${nombre}(float i){${colores.slice(0,-1).map((c,i)=>`if(i<${i+.5})return ${vec(c)};`).join('')}return ${vec(colores.at(-1))};}`
// Los hex del prototipo son sRGB; Three los convierte a lineal antes de iluminar.
export const GLSL_PALETA_MANZANA = `
${tabla('muroDeManzana',PERFIL_COLONIAL.muros)}
${tabla('tejaDeManzana',PERFIL_COLONIAL.tejas)}
${ShaderChunk.tonemapping_pars_fragment.replace('uniform float toneMappingExposure;', 'const float toneMappingExposure = 1.05;')}
vec3 iluminarManzana(vec3 base,vec3 normal,float sombra){
 vec3 cielo=${vec(0xfff2d8)},tierra=${vec(0x6c7055)},sol=${vec(0xffefce)};
 vec3 hemisferio=mix(tierra,cielo,normal.y*.5+.5)*2.5;
 float directa=max(dot(normal,normalize(vec3(-65.0,100.0,45.0))),0.0);
 return ACESFilmicToneMapping(base*(hemisferio+sol*3.3*directa*sombra)/3.14159265);
}`
