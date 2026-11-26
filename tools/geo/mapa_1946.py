"""Plano DCN: fotos1946, edición catalogada [1950?]. Calce, manzanas y ampliación.
No cambia ninguna geometría ni visibilidad de las épocas0..5. Casas nuevas inferidas;
la hoja documenta manzanas, no los solares individuales. Coordenadas de trabajo en m.
"""
import argparse, json, math, hashlib, sys, subprocess, struct
from pathlib import Path
import cv2
import numpy as np
from shapely.geometry import Polygon, Point, box
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely.geometry.polygon import orient
sys.path.insert(0,str(Path(__file__).resolve().parent))
from calce import Calce, remuestrear
RAIZ=Path(__file__).resolve().parents[2]
FUENTE='1950-archiveorg-plano-de-caracas-dcn'

def leer(p): return json.loads(Path(p).read_text(encoding='utf-8'))
def escribir(p,d):
    Path(p).parent.mkdir(parents=True,exist_ok=True)
    Path(p).write_text(json.dumps(d,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
def partes(g):
    if g.is_empty:return []
    if g.geom_type=='Polygon':return [g]
    return [p for q in getattr(g,'geoms',[]) for p in partes(q)]
def mascara_edificado(rgb):
    r,g,b=np.moveaxis(rgb.astype(np.int16),-1,0)
    return (((r-g)>=0)&((r-g)<.75*(g-b))&((g-b)>20)&((r-b)>35)&(r>160)&(g>150)).astype(np.uint8)*255

def casas_de_contorno(p,frente=14,fondo=8):
    """Crujías sencillas, contenidas y sin solaparse. Medidas inferidas, no censo."""
    p=orient(p,1);ocupado=Polygon();salida=[]
    pts=list(p.exterior.coords)
    for a,b in zip(pts,pts[1:]):
        dx,dy=b[0]-a[0],b[1]-a[1];l=math.hypot(dx,dy)
        if l<5:continue
        ux,uy=dx/l,dy/l;nx,ny=-uy,ux
        n=max(1,round(l/frente))
        for k in range(n):
            u0,u1=k*l/n,(k+1)*l/n
            q=Polygon([(a[0]+ux*u+nx*v,a[1]+uy*u+ny*v) for u,v in [(u0,0),(u1,0),(u1,fondo),(u0,fondo)]])
            for h in partes(q.intersection(p).difference(ocupado)):
                if h.area>=24 and h.minimum_clearance>.01:
                    h=h.simplify(.12,preserve_topology=True).intersection(p).difference(ocupado)
                    for z in partes(h):
                        if z.area>=24 and not z.interiors:salida.append(z);ocupado=unary_union([ocupado,z])
    return salida

def conservar_y_ampliar(bloques,anteriores,reservas):
    arbol=STRtree(anteriores);reserva=unary_union(reservas)
    nuevas=[];ms=[];existentes=0;omitidas=0
    for p in bloques:
        if not reserva.is_empty and p.intersection(reserva).area>0:omitidas+=1;continue
        # Un edificio anterior basta para conservar la manzana. No inventar reemplazos
        # ni densificación donde esta fuente no dibuja solares.
        if len(arbol.query(p.buffer(4),predicate='intersects')):existentes+=1;continue
        cs=casas_de_contorno(p)
        if cs:nuevas.extend(cs);ms.append({'poligono':list(p.exterior.coords)[:-1],'casas':len(cs)})
    return nuevas,{'conservadas':existentes,'reservadas':omitidas,'nuevasManzanas':ms}

def calibrar():
    cfg=leer(RAIZ/'tools/geo/gcp/1946-cuadricula.json')
    gcps=[dict(px=g['px'],py=g['py'],x36=(g['x_m']+2900)*2,y36=(3700-g['y_m'])*2) for g in cfg['puntos']]
    return Calce.ajustar(gcps,.5,.001)

def preparar_plano(out):
    c=calibrar();print('Calce',c.residuos_m(),flush=True)
    im=cv2.imread(str(RAIZ/f'fuentes/mapas/{FUENTE}/original.tif'))
    if im is None:raise ValueError('Falta el TIFF original del plano1946')
    # Imagen a1m/px del marco1936:0..9300,0..7400. No cambia el marco compartido.
    reducido=cv2.resize(im,None,fx=.5,fy=.5,interpolation=cv2.INTER_AREA)
    mapa,dentro=remuestrear(reducido,c,(0,0,9300,7400),factor_base=2,factor_viejo=2)
    del im,reducido
    # Recortar al interior cartográfico: sin cajetín, marco ni anotaciones marginales.
    xx,yy=np.meshgrid(np.arange(9300),np.arange(7400))
    px,py=c.al_viejo(xx[::16,::16]*2,yy[::16,::16]*2)
    px=cv2.resize(px.astype(np.float32),(9300,7400));py=cv2.resize(py.astype(np.float32),(9300,7400))
    dentro &= (px>440)&(px<14600)&(py>565)&(py<9530)&~((px>10680)&(py<1740))
    rgba=cv2.cvtColor(mapa,cv2.COLOR_BGR2BGRA);rgba[:,:,3]=dentro*255
    pub=RAIZ/'public/plano/1946';pub.mkdir(parents=True,exist_ok=True)
    for lado,nombre in [(2048,'chico'),(4096,'medio'),(8192,'grande')]:
        cv2.imwrite(str(pub/f'{nombre}.webp'),cv2.resize(rgba,(lado,round(7400*lado/9300)),interpolation=cv2.INTER_AREA),[cv2.IMWRITE_WEBP_QUALITY,85])
    mask=mascara_edificado(cv2.cvtColor(mapa,cv2.COLOR_BGR2RGB));mask[~dentro]=0
    mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    contornos,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    bloques=[]
    for t in contornos:
        area=cv2.contourArea(t)
        if not 180<area<45000:continue
        p=Polygon(cv2.approxPolyDP(t,1.2,True)[:,0,:]).buffer(0)
        for q in partes(p):
            if q.area>180 and q.area/q.convex_hull.area>.5 and not q.buffer(-3).is_empty:bloques.append(q)
    escribir(out/'bloques.json',[list(p.exterior.coords)[:-1] for p in bloques])
    cv2.imwrite(str(out/'edificado.png'),mask)
    cv2.imwrite(str(out/'plano.jpg'),cv2.resize(mapa,(2325,1850)))
    escribir(out/'calzado.json',{'año':1946,'plano':FUENTE,'recorte':[0,0,18600,14800],'residuos':c.residuos_m(),'nivelesGenerados':True})
    # planos-epocas arma después el índice desde calzado.json; no exige salidas previas.
    return bloques

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--solo-calce',action='store_true');ap.add_argument('--reusar-calce',action='store_true');a=ap.parse_args()
    out=RAIZ/'fuentes/derivados/1946';out.mkdir(parents=True,exist_ok=True)
    bloques=[Polygon(p) for p in leer(out/'bloques.json')] if a.reusar_calce else preparar_plano(out)
    bloques=[q for p in bloques if p.area/p.convex_hull.area>.5 and not p.buffer(-3).is_empty for q in partes(p.simplify(1.5,preserve_topology=True).intersection(p)) if q.area>180]
    if a.solo_calce:return
    print(len(bloques),'manzanas candidatas',flush=True)
    original=RAIZ/'fuentes/derivados/epocas/ciudad-manzanas-1889.json'
    datos=leer(original);antes=len(datos['techos']);vertices=datos['vertices']
    anteriores=[]
    for (inicio,n,*_), (nace,muere) in zip(datos['techos'],datos['vida']):
        if nace<=5 and (not muere or muere>5):
            p=Polygon([(vertices[2*k]/2,vertices[2*k+1]/2) for k in range(inicio,inicio+n)]).buffer(0)
            anteriores.extend(partes(p))
    codigo="import {HITOS} from './src/hitos.js';console.log(JSON.stringify(HITOS.filter(h=>h.nace<=6).flatMap(h=>h.suprime??h.planta??[])))"
    reservas=[Polygon(np.asarray(p)/2).buffer(0) for p in json.loads(subprocess.check_output(['node','--input-type=module','-e',codigo],cwd=RAIZ,text=True)) if len(p)>=3]
    # Recintos especiales visibles en la hoja: hipódromo, estadios, hospitales,
    # cementerio y Ciudad Universitaria en construcción. No son manzanas residenciales.
    cfg=leer(RAIZ/'tools/geo/referencias/1946-reservas.json')
    c=calibrar()
    for r in cfg['reservas']:
        a=np.asarray(r['poligono_original'],float);x,y=c.a_1936(a[:,0],a[:,1]);reservas.append(Polygon(np.c_[x/2,y/2]).buffer(0))
    nuevas,info=conservar_y_ampliar(bloques,anteriores,reservas)
    for i,p in enumerate(nuevas):
        ps=list(orient(p,1).exterior.coords)[:-1];inicio=len(vertices)//2
        vertices.extend(round(v*2,3) for pt in ps for v in pt)
        seed=int(hashlib.sha256(p.wkb).hexdigest()[:8],16)%65536
        # La fuente no da alturas: vivienda baja de1–2 pisos, repertorio1936.
        pisos=2 if seed%5==0 else 1;estilo=2 if seed%3==0 else 0
        datos['techos'].append([inicio,len(ps),pisos,estilo,seed]);datos['vida'].append([6,0])
        datos['historia'].append([16*pisos+estilo]*6)
        datos['vuelos'].append(0);datos['paletas'].append(seed%36+1)
    info.update({'año':1946,'fuente':FUENTE,'techosAnteriores':antes,'casasNuevas':len(nuevas),'geometriaAnteriorIntacta':True,'limite':'Manzanas con alguna casa anterior se conservan enteras. No se infieren demoliciones ni densificación del relleno amarillo del mapa. Viviendas nuevas, altura y reparto son interpretativos.'})
    escribir(out/'ciudad-1946.json',datos);escribir(out/'informe.json',info)
    # Una máscara sólo de expansión: no reescribe crece.png ni el suelo histórico.
    expansion=np.zeros((1850,2325,3),np.uint8)
    urbanizado=np.zeros((1850,2325),np.uint8);ocupado=urbanizado.copy();jardin=urbanizado.copy();arboles=[]
    for p in nuevas:cv2.fillPoly(ocupado,[np.round(np.asarray(p.exterior.coords)/4).astype(np.int32)],255)
    for m in info['nuevasManzanas']:
        p=Polygon(m['poligono']);ps=np.round(np.array(m['poligono'])/4).astype(np.int32)
        cv2.fillPoly(urbanizado,[ps],255)
        dentro=p.buffer(-12)
        for q in partes(dentro):
            cv2.fillPoly(jardin,[np.round(np.asarray(q.exterior.coords)/4).astype(np.int32)],255)
            for y in np.arange(q.bounds[1]+3,q.bounds[3],18):
                for x in np.arange(q.bounds[0]+3,q.bounds[2],18):
                    if q.contains(Point(x,y)):arboles.append(struct.pack('<4H',round(x*2),round(y*2),22,6))
    expansion[:,:,2]=cv2.dilate(urbanizado,np.ones((7,7),np.uint8))
    expansion[:,:,1]=cv2.dilate(ocupado,np.ones((2,2),np.uint8))
    expansion[:,:,0]=jardin
    cv2.imwrite(str(RAIZ/'public/plano/1946/expansion.png'),expansion)
    crece=cv2.imread(str(RAIZ/'public/plano/crece.png'),cv2.IMREAD_UNCHANGED)
    if crece.shape[2]==3:crece=cv2.cvtColor(crece,cv2.COLOR_BGR2BGRA)
    campo=cv2.resize(expansion,(crece.shape[1],crece.shape[0]),interpolation=cv2.INTER_NEAREST)
    crece[:,:,3]=255
    crece[campo[:,:,2]>0,3]=192;crece[campo[:,:,1]>0,3]=128;crece[campo[:,:,0]>0,3]=64
    cv2.imwrite(str(RAIZ/'public/plano/1946/crece.png'),crece)
    (RAIZ/'public/datos/arboles-1946.bin').write_bytes(b''.join(arboles))
    info['arbolesNuevos']=len(arboles)
    escribir(out/'informe.json',info)
    escribir(RAIZ/'public/datos/1946.json',{k:v for k,v in info.items() if k!='nuevasManzanas'})
    qa=cv2.imread(str(out/'plano.jpg'))
    for m in info['nuevasManzanas']:
        cv2.polylines(qa,[np.round(np.array(m['poligono'])/4).astype(np.int32)],True,(0,0,230),1)
    cv2.imwrite(str(out/'qa-ampliacion.jpg'),qa)
    print({k:v for k,v in info.items() if k!='nuevasManzanas'},flush=True)

if __name__=='__main__':main()
