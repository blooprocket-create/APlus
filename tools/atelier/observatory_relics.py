"""Authored observatory kit: botanical astronomical tracery, a working desk,
curled chart, worn instrument and stitched silk. Original model surfaces.
"""
import math

def build_relics(mesh,sweep,slab,mat,stone,dark,gold,moss):
 # The moon window is a broken scientific instrument, with botanical tracery.
 cx,cy,cz=1.2,3.35,-7.8
 for sign in [-1,1]:
  pts=[]
  for i in range(65):
   t=i/64;a=(-.38+t*math.pi*1.6)*sign
   pts.append((cx+math.sin(a)*2.32,cy+math.cos(a)*2.32,cz+.02))
  sweep('Moon window • engraved inner orbit',pts,[.021]*len(pts),gold,8,1)
  for start in [0,1,2]:
   a=sign*(.38+start*.63);pts=[]
   for j in range(25):
    t=j/24;r=2.3-t*1.7;ang=a+sign*math.sin(t*math.pi)*.36
    pts.append((cx+math.sin(ang)*r,cy+math.cos(ang)*r,cz+.03+math.sin(t*math.pi)*.08))
   sweep('Botanical astronomical tracery',pts,[.028*(1-j/24)+.006 for j in range(25)],gold,8,1)
  # Engraved tick marks are individually modeled, grouped by pigment at export.
  for i in range(34):
   a=sign*(.1+i*.076);r0=2.3;r1=2.23 if i%4 else 2.17
   sweep('Moon dial • engraved index',[(cx+math.sin(a)*r0,cy+math.cos(a)*r0,cz+.04),(cx+math.sin(a)*r1,cy+math.cos(a)*r1,cz+.04)],[.008,.006],gold,5,0)
 # Raised chisel pattern around the stone frame gives it a designed profile.
 for i in range(12):
  a=i*math.tau/14
  if i in [3,8]:continue
  pts=[(cx+math.sin(a+t)*2.87,cy+math.cos(a+t)*2.87,cz+.42) for t in [-.08,-.04,0,.04,.08]]
  sweep('Carved window leaf crest',pts,[.012,.04,.055,.04,.008],stone,10,1)
 # Curled chart on a carved desk, tucked alongside the established court.
 paper=mat('Paper • vellum star chart','d5c6a3',.95)
 ink=mat('Chart • indigo drawn ink','365269',.94)
 dx,dy,dz=3.7,.90,-3.8
 slab('Cartographer desk • carved worktop',(dx,dy,dz),1.65,1.05,.16,.16)
 for side in [-1,1]:
  sweep('Desk • scroll-cut stone trestle',[(dx+side*.52,.04,dz),(dx+side*.56,.18,dz),(dx+side*.43,.48,dz),(dx+side*.50,.79,dz)],[.22,.17,.11,.19],dark,14,2,.05)
 def sheet(u,v):return (dx+u,dy+.05+.08*(abs(u)/.65)**7+.028*math.sin(v*3),dz+v)
 vs=[];fs=[];N=32;M=20
 for j in range(M+1):
  for i in range(N+1):
   vs.append(sheet(-.66+i*1.32/N,-.40+j*.80/M))
   if j and i:q=(j-1)*(N+1)+i-1;fs.append((q,q+1,q+N+2,q+N+1))
 mesh('Curled vellum • star map',vs,fs,paper,1)
 for r in [.14,.27,.36]:
  pts=[tuple(p+(0.004 if k==1 else 0) for k,p in enumerate(sheet(math.sin(a)*r,math.cos(a)*r))) for a in [j*math.tau/64 for j in range(65)]]
  sweep('Vellum • celestial chart inscription',pts,[.0025]*len(pts),ink,4,0)
 for a in [.2,1.1,2.2,3.4,4.4,5.2]:
  sweep('Vellum • chart meridian',[sheet(math.sin(a)*r,math.cos(a)*r) for r in [.02,.12,.28,.36]],[.002]*4,ink,4,0)
 # Telescope: a tapered, faceted bronze instrument with a real lens cradle.
 blue=mat('Glass • dark celestial lens','315d70',.20,.28)
 pts=[(dx-.25,dy+.25,dz-.1),(dx-.19,dy+.31,dz-.22),(dx-.06,dy+.45,dz-.49),(dx+.12,dy+.63,dz-.8)]
 sweep('Telescope • tapered lacquered barrel',pts,[.056,.062,.085,.11],dark,20,1)
 for center,r in [(pts[0],.061),(pts[-1],.112)]:
  ring=[(center[0]+math.cos(a)*r,center[1]+math.sin(a)*r*.73,center[2]+math.sin(a)*r*.68) for a in [j*math.tau/40 for j in range(41)]]
  sweep('Telescope • engraved bronze ferrule',ring,[.013]*len(ring),gold,8,1)
 # The instrument rests in a real trunnion cradle, rather than hovering.
 for side in [-1,1]:
  sweep('Telescope • trunnion cradle',[(dx+side*.15,dy+.07,dz-.30),(dx+side*.17,dy+.20,dz-.32),(dx+side*.11,dy+.35,dz-.37),(dx-.08,dy+.41,dz-.43)],[.024,.021,.018,.015],gold,8,1)
 # A curved glass surface, modeled rather than represented by an opaque ball.
 x,y,z=pts[-1];vs=[(x,y+.012,z-.013)];fs=[]
 for i in range(32):
  a=i*math.tau/32;vs.append((x+math.cos(a)*.095,y+math.sin(a)*.07,z+math.sin(a)*.065-.012))
 for i in range(32):fs.append((0,i+1,(i+1)%32+1))
 mesh('Telescope • objective lens',vs,fs,blue,1)
 # A kept ceremonial banner, its cloth silhouette cut and sewn on a bowed rail.
 textile=mat('Banner • indigo silk','294b66',.86)
 thread=mat('Banner • old gold thread','c5b986',.8)
 bx,by,bz=-3.1,3.2,-4.8
 sweep('Banner support • bent bronze rail',[(bx,by,bz),(bx+.4,by+.04,bz),(bx+.9,by+.02,bz),(bx+1.35,by-.04,bz)],[.022]*4,gold,8,1)
 sweep('Banner standard',[(bx,.04,bz),(bx,1.7,bz),(bx,3.4,bz)],[.043,.036,.025],dark,12,1)
 def cloth(u,v):return (bx+.1+u*1.1,by-v*1.65+.08*math.cos(u*math.pi*4)*v**5,bz+.08*math.sin(u*math.pi*3)+.11*math.sin(v*math.pi)*u)
 vs=[];fs=[];N=24;M=34
 for j in range(M+1):
  for i in range(N+1):
   vs.append(cloth(i/N,j/M))
   if j and i:q=(j-1)*(N+1)+i-1;fs.append((q,q+1,q+N+2,q+N+1))
 mesh('Ceremonial banner • woven cloth',vs,fs,textile,1)
 for u in [.025,.975]:sweep('Banner • embroidered selvage',[cloth(u,j/30) for j in range(31)],[.006]*31,thread,5,0)
 vs=[];fs=[]
 for i in range(41):
  t=i/40;a=.22+t*math.pi*1.65;thickness=math.sin(t*math.pi)**1.2
  for inner in [0,1]:
   u=.50+math.cos(a)*(.20-inner*.075*thickness)+inner*.035*thickness
   v=.43+math.sin(a)*(.14-inner*.040*thickness)
   p=cloth(u,v);vs.append((p[0],p[1],p[2]+.012))
  if i:q=(i-1)*2;fs.append((q,q+1,q+3,q+2))
 mesh('Banner • woven crescent',vs,fs,thread,1)
