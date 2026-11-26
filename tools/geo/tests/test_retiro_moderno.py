import struct
import pytest
from tools.geo.retiro_moderno import transformar_ciudad,transformar_arboles

def ciudad():
 return dict(vertices=[0,0,20,0,20,20,0,20],techos=[[0,4,2,3,123]],vida=[[4,0]],historia=[[32]*6],paletas=[8],vuelos=[0],marcos=[[0,0,0,1,0,20,20,7,4,0,1]],alas=[[0,0,0,20,4]])

def test_retiro_conserva_forma_estilo_y_epocas_ajenas():
 d=ciudad();r,n=transformar_ciudad(d,5,lambda p:'A',{'A':(10,10,.9)})
 assert n==1 and d['vida']==[[4,0]]
 assert r['vida']==[[4,5],[5,6],[6,0]]
 assert r['techos'][1][2:]==[2,3,123]
 assert r['vertices'][-8:]==[1,1,19,1,19,19,1,19]
 assert r['marcos'][1][1:3]==[1,1]
 assert r['marcos'][1][5:7]==[18,18]
 assert r['alas'][-1]==[0,0,0,18,3.6]
 assert r['techos'][0]==d['techos'][0]==r['techos'][2]

def test_no_retrae_dos_veces_la_misma_casa_entre_epocas():
 r,_=transformar_ciudad(ciudad(),4,lambda p:'A',{'A':(10,10,.9)})
 r,_=transformar_ciudad(r,5,lambda p:'A',{'A':(10,10,.9)})
 visibles=[]
 for e in [4,5]:
  t=next(t for t,(n,f) in zip(r['techos'],r['vida']) if n<=e and (not f or f>e));visibles.append(r['vertices'][t[0]*2:(t[0]+t[1])*2])
 assert visibles[0]==visibles[1]

def test_arboles_solo_cambian_en_el_intervalo_elegido():
 b=struct.pack('<4H',0,0,20,4)
 r=transformar_arboles(b,5,lambda p:'A',{'A':(10,10,.9)})
 assert list(struct.iter_unpack('<4H',r))==[(0,0,20,44),(1,1,18,53),(0,0,20,6)]

def test_1946_no_cambia_intervalos_pasados_ni_crea_epoca_siete():
 r,_=transformar_ciudad(ciudad(),6,lambda p:'A',{'A':(10,10,.9)})
 assert r['vida']==[[4,6],[6,0]]

def test_compactacion_conserva_continuidad_sin_duplicar_geometria():
 from tools.geo.retiro_moderno import compactar
 r,_=transformar_ciudad(ciudad(),4,lambda p:'A',{'A':(10,10,.9)})
 r,_=transformar_ciudad(r,5,lambda p:'A',{'A':(10,10,.9)})
 c=compactar(r)
 assert c['vida']==[[4,6],[6,0]]
 assert len(c['vertices'])==16
 assert len(c['alas'])==2
