"""Compara ciudad y árboles por época; permite cambios solo en el intervalo de 1772."""
import json,collections,struct,sys

def congelar(v):
 if isinstance(v,list):return tuple(congelar(x) for x in v)
 return v
antes,despues,arboles_antes,arboles_despues=sys.argv[1:]
a=json.load(open(antes));b=json.load(open(despues))
def firma(d,e):
 marcos={m[0]:m for m in d['marcos']};r=[]
 for i,t in enumerate(d['techos']):
  n,f=d['vida'][i]
  if n>e or (f and f<=e):continue
  m=marcos.get(i);alas=None
  if m:alas=d['alas'][m[9]:m[9]+m[10]]
  r.append(congelar([d['vertices'][t[0]*2:(t[0]+t[1])*2],t[2:],d['historia'][i],d['paletas'][i],d['vuelos'][i],m[1:9] if m else None,alas]))
 return collections.Counter(r)
for e in range(7):
 x,y=firma(a,e),firma(b,e)
 print('epoca',e,'casas',sum(x.values()),sum(y.values()),'iguales',x==y)
 if e!=1:assert x==y
for e in range(7):
 def arboles(file):
  r=[]
  for x,y,radio,v in struct.iter_unpack('<4H',open(file,'rb').read()):
   n=v&7;f=(v>>3)&7
   if n<=e and (not f or f>e):r.append((x,y,radio,v&64))
  return collections.Counter(r)
 x=arboles(arboles_antes);y=arboles(arboles_despues)
 print('epoca',e,'arboles',sum(x.values()),sum(y.values()),'iguales',x==y)
 if e!=1:assert x==y
