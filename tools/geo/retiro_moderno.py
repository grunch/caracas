"""Retiro por manzana del tejido vectorizado: escala uniforme, sin deformar fachadas."""
import json, math, struct, sys
from copy import deepcopy
from pathlib import Path
import numpy as np
import cv2
from shapely.geometry import Polygon, Point
from shapely.affinity import scale
from shapely.strtree import STRtree
from shapely.ops import unary_union


def transformar_ciudad(datos, epoca, buscar, matrices):
    """Aísla una época; copia antes/después y escala huella, marco y alas juntos."""
    salida={**datos,'vertices':list(datos['vertices']),'techos':[],'vida':[],'historia':[],'paletas':[],'vuelos':[],'marcos':[],'alas':deepcopy(datos['alas'])}
    marcos={m[0]:m for m in datos['marcos']};cambiadas=0
    def copiar(i,vida,mov=None):
        t=list(datos['techos'][i]);m=deepcopy(marcos.get(i));nuevo=len(salida['techos'])
        if mov:
            cx,cy,s=mov;p=datos['vertices'][t[0]*2:(t[0]+t[1])*2];t[0]=len(salida['vertices'])//2
            salida['vertices'].extend((cx if k%2==0 else cy)+(v-(cx if k%2==0 else cy))*s for k,v in enumerate(p))
            if m:
                m[1]=cx+(m[1]-cx)*s;m[2]=cy+(m[2]-cy)*s
                for k in (5,6,8):m[k]*=s
                alas=datos['alas'][m[9]:m[9]+m[10]];m[9]=len(salida['alas'])
                salida['alas'].extend([[a[0],*[v*s for v in a[1:]]] for a in alas])
        for nombre,valor in [('techos',t),('vida',vida),('historia',list(datos['historia'][i])),('paletas',datos['paletas'][i]),('vuelos',datos['vuelos'][i])]:salida[nombre].append(valor)
        if m:m[0]=nuevo;salida['marcos'].append(m)
    for i,t in enumerate(datos['techos']):
        n,f=datos['vida'][i]
        if n>epoca or f and f<=epoca:copiar(i,[n,f]);continue
        p=Polygon(np.array(datos['vertices'][t[0]*2:(t[0]+t[1])*2]).reshape(-1,2));mov=matrices.get(buscar(p))
        if mov is None:copiar(i,[n,f]);continue
        if n<epoca:copiar(i,[n,epoca])
        copiar(i,[epoca,0 if epoca==6 else epoca+1],mov);cambiadas+=1
        if epoca<6 and (not f or f>epoca+1):copiar(i,[epoca+1,f])
    return salida,cambiadas


def transformar_arboles(datos, epoca, buscar, matrices):
    salida=[]
    for x,y,r,v in struct.iter_unpack('<4H',datos):
        n=v&7;f=(v>>3)&7;sil=v&64;mov=matrices.get(buscar(Point(x,y))) if n<=epoca and (not f or f>epoca) else None
        if mov is None:salida.append((x,y,r,v));continue
        if n<epoca:salida.append((x,y,r,n+8*epoca+sil))
        cx,cy,s=mov;salida.append((round(cx+(x-cx)*s),round(cy+(y-cy)*s),max(1,round(r*s)),epoca+(0 if epoca==6 else 8*(epoca+1))+sil))
        if epoca<6 and (not f or f>epoca+1):salida.append((x,y,r,epoca+1+8*f+sil))
    return b''.join(struct.pack('<4H',*a) for a in salida)


def generar_matrices(base,clases,ampliacion,obstaculos,metro,caras=()):
    # Los mismos contornos base para 1911/1936/1946: una casa no vuelve a encogerse al cambiar de fecha.
    mascara=np.isin(clases,[2,3,4,5]).astype(np.uint8)
    _,etiquetas,stats,_=cv2.connectedComponentsWithStats(mascara,connectivity=4)
    del mascara
    # El informe 1946 usa coordenadas a 1 m/px; la ciudad, píxeles del mosaico.
    extras=[Polygon(np.asarray(m['poligono'])/metro).buffer(0) for m in ampliacion['nuevasManzanas']]
    indice=STRtree(extras);alto,ancho=clases.shape
    asignaciones={};indice_caras=STRtree(caras)
    def buscar(p):
        if p.geom_type!='Point':return asignaciones.get(p.wkb)
        for k in indice_caras.query(p):
            if caras[k].covers(p):return ('cara',int(k))
        x,y=round(p.x),round(p.y)
        if 0<=x<ancho and 0<=y<alto:
            etiqueta=int(etiquetas[y,x])
            if etiqueta:return ('base',etiqueta)
        for k in indice.query(p):
            if extras[k].covers(p):return ('1946',int(k))
        return None
    grupos={}
    for t,vida in zip(base['techos'],base['vida']):
        if vida[1] and vida[1]<=4:continue
        original=Polygon(np.array(base['vertices'][t[0]*2:(t[0]+t[1])*2]).reshape(-1,2));p=original.buffer(0)
        if p.is_empty:continue
        k=buscar(p.representative_point())
        if k is not None:
            grupos.setdefault(k,[]).append(p);asignaciones[original.wkb]=k
    hitos=unary_union([Polygon(p) for p in obstaculos]);matrices={};limites=[]
    for k,casas in grupos.items():
        if k[0]=='cara':p=caras[k[1]]
        elif k[0]=='1946':p=extras[k[1]]
        else:
            x,y,w,h,area=stats[k[1]]
            contornos,_=cv2.findContours((etiquetas[y:y+h,x:x+w]==k[1]).astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
            c=max(contornos,key=cv2.contourArea).reshape(-1,2)
            if len(c)<3:limites.append([list(k),'contorno degenerado']);continue
            p=Polygon(c+np.array([x,y])).buffer(.5)
        # El vectorizador puede extender un solar respecto a la mancha raster. La envolvente
        # original incluye sus huellas, sin unir unidades a través de las calles del mapa.
        if k[0]!='cara':
            p=unary_union([p,*casas]).buffer(0)
            if p.geom_type=='Polygon':p=Polygon(p.exterior)
        motivo=None
        if not p.is_valid or p.geom_type!='Polygon' or p.area*metro**2<25:motivo='solar pequeño o irregular'
        elif p.intersects(hitos):motivo='contiene un hito fijo'
        if motivo:limites.append([list(k),motivo]);continue
        r=list(p.minimum_rotated_rectangle.exterior.coords);lado=min(math.dist(r[i],r[i+1]) for i in range(4))
        s=1-2/metro/lado
        if s<.5:limites.append([list(k),'manzana demasiado estrecha']);continue
        centro=None;envolvente=p.buffer(.35/metro) # tolerancia de vectorización existente: 0,35 m
        for candidato in [p.minimum_rotated_rectangle.centroid,p.centroid,p.representative_point()]:
            if all(scale(c,xfact=s,yfact=s,origin=candidato).difference(envolvente).area<=c.difference(envolvente).area+.01 for c in casas):centro=candidato;break
        if centro is None:limites.append([list(k),'retiro invadiría una concavidad']);continue
        matrices[k]=(centro.x,centro.y,s)
    return buscar,matrices,limites


def compactar(datos):
    """Elimina vértices/alas sin uso y une versiones idénticas en intervalos contiguos."""
    salida={**datos,'vertices':[],'techos':[],'vida':[],'historia':[],'paletas':[],'vuelos':[],'marcos':[],'alas':[]}
    marcos={m[0]:m for m in datos['marcos']};vistas={};vertices={}
    def congelar(v):return tuple(congelar(x) for x in v) if isinstance(v,list) else v
    for i,t in enumerate(datos['techos']):
        p=datos['vertices'][t[0]*2:(t[0]+t[1])*2];m=marcos.get(i);alas=datos['alas'][m[9]:m[9]+m[10]] if m else []
        clave=congelar([p,t[2:],datos['historia'][i],datos['paletas'][i],datos['vuelos'][i],m[1:9] if m else None,alas])
        n,f=datos['vida'][i];unida=False
        for j in vistas.get(clave,[]):
            an,af=salida['vida'][j]
            if af==n:salida['vida'][j]=[an,f];unida=True;break
            if f==an:salida['vida'][j]=[n,af];unida=True;break
        if unida:continue
        nuevo=len(salida['techos']);vistas.setdefault(clave,[]).append(nuevo)
        pv=tuple(p)
        if pv not in vertices:vertices[pv]=len(salida['vertices'])//2;salida['vertices'].extend(p)
        salida['techos'].append([vertices[pv],*t[1:]])
        for nombre in ['vida','historia','paletas','vuelos']:salida[nombre].append(deepcopy(datos[nombre][i]))
        if m:
            salida['marcos'].append([nuevo,*m[1:9],len(salida['alas']),m[10]]);salida['alas'].extend(deepcopy(alas))
    return salida


def main():
    año,entrada,salida,protecciones=sys.argv[1:];epoca={1911:4,1936:5,1946:6}[int(año)]
    leer=lambda p:json.loads(Path(p).read_text())
    sys.path.insert(0,str(Path(__file__).resolve().parent))
    from caras import Red
    base=leer('fuentes/derivados/1946/ciudad-1946.json')
    buscar,matrices,limites=generar_matrices(base,cv2.imread('fuentes/derivados/1936/segmentacion/mosaico/clases-costura.png',cv2.IMREAD_GRAYSCALE),leer('fuentes/derivados/1946/informe.json'),leer(protecciones),.5,Red(leer('fuentes/derivados/1936/tramos.json')['tramos']).caras36)
    d,n=transformar_ciudad(leer(f'{entrada}/ciudad.json'),epoca,buscar,matrices)
    Path(salida).mkdir(parents=True,exist_ok=True)
    Path(f'{salida}/ciudad.json').write_text(json.dumps(compactar(d),separators=(',',':')))
    Path(f'{salida}/arboles.bin').write_bytes(transformar_arboles(Path(f'{entrada}/arboles.bin').read_bytes(),epoca,buscar,matrices))
    if epoca==6:
        Path(f'{salida}/arboles-1946.bin').write_bytes(transformar_arboles(Path('fuentes/derivados/1946/arboles-base.bin').read_bytes(),epoca,buscar,matrices))
    resumen={'año':int(año),'casasAjustadas':n,'manzanasAjustables':len(matrices),'excepciones':limites,'metodo':'Escala uniforme desde contornos fijos; retiro nominal de 1 m sobre la caja orientada. No es medida histórica.'}
    Path(f'{salida}/resumen.json').write_text(json.dumps(resumen));print(json.dumps({k:v for k,v in resumen.items() if k!='excepciones'}),flush=True)

if __name__=='__main__':main()
