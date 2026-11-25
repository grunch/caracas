"""Contornos inferidos del color del plano de Mestre; conserva calles y huecos grandes."""
import json
from pathlib import Path
import cv2
import numpy as np
from shapely.geometry import Polygon
from manzanas_completas import anillo, partes


def contornos_de_mascara(mascara, origen, escala, metro, simplificar_m=0, hueco_minimo_m2=0):
    contornos, jerarquia = cv2.findContours(mascara.astype('uint8'),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
    if jerarquia is None:
        return []
    def puntos(c):
        c=cv2.approxPolyDP(c,simplificar_m/(metro*escala),True) if simplificar_m else c
        return (c.reshape(-1,2)*escala+origen).tolist()
    exteriores=sorted((i for i,h in enumerate(jerarquia[0]) if h[3]<0),key=lambda i:(cv2.boundingRect(contornos[i])[1],cv2.boundingRect(contornos[i])[0]))
    refs=[]
    for i in exteriores:
        huecos=[puntos(c) for j,c in enumerate(contornos) if jerarquia[0][j][3]==i and cv2.contourArea(c)*(metro*escala)**2>=hueco_minimo_m2]
        p=puntos(contornos[i])
        if len(p)<3:continue
        for q in partes(Polygon(p,[h for h in huecos if len(h)>=3]).buffer(0)):
            refs.append({'id':f'M1889-{len(refs):04d}','poligono':anillo(q),'huecos':[list(map(list,h.coords[:-1])) for h in q.interiors],'estado':'extraida','ocupacion':'edificada','procedencia':'contorno inferido por color del plano de Mestre; no censo manual'})
    return refs


def recortar_a_zona(mascara,origen,escala,cfg):
    puntos=lambda ps:np.round((np.array(ps)-origen)/escala).astype('int32')
    valido=np.zeros_like(mascara);cv2.fillPoly(valido,[puntos(cfg['limite'])],1)
    for e in cfg['exclusiones']:cv2.fillPoly(valido,[puntos(e['poligono'])],0)
    return mascara & valido


def extraer(raiz):
    import tifffile
    from epocas import edificado,reducir_recorte
    raiz=Path(raiz);leer=lambda p:json.loads((raiz/p).read_text())
    cfg=leer('tools/geo/referencias/1889-manzanas-config.json');epoca=leer('tools/geo/epocas/epocas.json')['epocas'][3]
    meta=leer('fuentes/derivados/1889/calzado.json');escala=cfg['escala'];metro=meta['metro'];mp=metro*escala
    rgba,origen=reducir_recorte(tifffile.imread(raiz/'fuentes/derivados/1889/calzado.tif'),*meta['recorte'][:2],escala)
    m=edificado(rgba,epoca['perfil'],epoca['cierre_m']/mp,epoca['area_minima_m2']/mp**2,epoca['apertura_m']/mp,epoca['ancho_minimo_m']/mp).astype('uint8')
    origen=np.array(origen)*escala
    m=recortar_a_zona(m,origen,escala,cfg)
    return contornos_de_mascara(m,origen,escala,metro,cfg['simplificar_m'],cfg['hueco_minimo_m2'])


if __name__=='__main__':
    import sys
    json.dump({'unidades':extraer(Path.cwd())},open(sys.argv[1],'w'),ensure_ascii=False)
