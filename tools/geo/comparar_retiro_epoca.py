import json,sys,collections,struct
antes,despues,ea,ab,db=sys.argv[1:];ea=int(ea)
def casas(r,e):
 d=json.load(open(r));ms={m[0]:m for m in d['marcos']};out=[]
 def tup(x):return tuple(tup(y) for y in x) if isinstance(x,list) else x
 for i,t in enumerate(d['techos']):
  n,f=d['vida'][i]
  if n>e or f and f<=e:continue
  m=ms.get(i);out.append(tup([d['vertices'][t[0]*2:(t[0]+t[1])*2],t[2:],d['historia'][i],d['paletas'][i],d['vuelos'][i],m[1:9] if m else None,d['alas'][m[9]:m[9]+m[10]] if m else None]))
 return collections.Counter(out)
def arboles(r,e):return collections.Counter((x,y,r,v&64) for x,y,r,v in struct.iter_unpack('<4H',open(r,'rb').read()) if v%8<=e and (not ((v>>3)&7) or ((v>>3)&7)>e))
for e in range(7):
 a,b=casas(antes,e),casas(despues,e);ta,tb=arboles(ab,e),arboles(db,e)
 print(e,sum(a.values()),sum(b.values()),a==b,sum(ta.values()),sum(tb.values()),ta==tb)
 if e!=ea:assert a==b and ta==tb
