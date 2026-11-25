"""Recorte de una región del TIFF sin comprimir del facsímil de 1843 sin cargarlo entero (Pillow entero gastó hasta 14 GB).

    python3 -I recorte-tiff.py <original.tiff> <salida.png> x0 y0 x1 y1 escala

Supone RGB de 8 bits en tiras contiguas desde el byte 8, con 7216 px de ancho (el facsímil de la NYPL): para otro
plano, leer el ancho y el desplazamiento de los datos de su cabecera TIFF y cambiar W y OFF. Lo escribió un agente de
la auditoría de 1843 (specs/12 § 6); es una herramienta de lectura, no del pipeline.
"""
import sys
from PIL import Image
src,out,x0,y0,x1,y1,esc=sys.argv[1],sys.argv[2],*map(int,sys.argv[3:7]),float(sys.argv[7])
W=7216; OFF=8
rows=[]
with open(src,'rb') as f:
    for y in range(y0,y1):
        f.seek(OFF+(y*W+x0)*3); rows.append(f.read((x1-x0)*3))
im=Image.frombytes('RGB',(x1-x0,y1-y0),b''.join(rows))
if esc!=1: im=im.resize((int(im.width*esc),int(im.height*esc)),Image.LANCZOS)
im.save(out)
