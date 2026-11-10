"""Continuous outcrop sculptures replace scattered deformed sphere rocks.
The outline, receding ledges and fracture cuts are editable art controls. Each
bank is one closed surface; moss is authored by slope on that actual surface.
"""
import math
from mathutils import Vector

def outcrop(mesh,material,name,center,scale,angle=0,variant=0):
 outline=[(3.2,.1),(2.8,1.5),(1.5,2.4),(-.6,2.6),(-2.7,1.7),(-3.4,.2),(-2.5,-1.6),(-.7,-2.1),(1.8,-1.8)]
 def contour(t):
  f=t*len(outline);i=int(f)%len(outline);u=f-int(f)
  p0=Vector(outline[(i-1)%len(outline)]);p1=Vector(outline[i]);p2=Vector(outline[(i+1)%len(outline)]);p3=Vector(outline[(i+2)%len(outline)])
  return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)
 vs=[];fs=[];N=96;R=32
 for j in range(R+1):
  t=j/R
  for i in range(N):
   a=i*math.tau/N;p=contour(i/N)
   # Three broad, individually placed erosion ledges, rather than a noise ball.
   ledges=sum(depth/(1+math.exp(-(t-height)*95)) for height,depth in [(.25,.045),(.49,.055),(.73,.065)])
   radius=(1-.78*t**1.7-ledges)
   fracture=sum(math.exp(-((math.sin((a-phase)*.5))/.055)**2)*.065 for phase in [.43+variant*.31,2.48,4.7-variant*.1])
   radius-=fracture*math.sin(t*math.pi)
   x=p.x*radius+.22*math.sin(t*2.4+variant)*t;z=p.y*radius+.25*t
   height=-.16+t*(1.65+.12*math.sin(a*2+variant))+.035*math.sin(a*9+t*5)*math.sin(t*math.pi)
   xx=x*math.cos(angle)-z*math.sin(angle);zz=x*math.sin(angle)+z*math.cos(angle)
   vs.append((center[0]+xx*scale[0],center[1]+height*scale[1],center[2]+zz*scale[2]))
   if j:
    q=(j-1)*N+i;b=(j-1)*N+(i+1)%N;fs.append((q,b,b+N,q+N))
 fs.extend([tuple(reversed(range(N))),tuple(R*N+i for i in range(N))])
 return mesh(name,vs,fs,material)

def build_banks(mesh,mat):
 material=mat('Limestone • moss-carved bank','7d9485',.92)
 for i,(p,s,a) in enumerate([
  ((-9.6,0,-.8),(1.0,.85,1),.3),
  ((-10.6,.1,-11),(1.4,1.45,1.15),-.25),
  ((9.6,.05,-9.7),(1.1,1.15,.92),.65),
  ((13,.1,5),(1.3,.9,1.0),-.4),
  ((-2.6,.1,-16),(1.2,1.35,.8),.1),
 ]):outcrop(mesh,material,'Sculpted stratified garden bank '+str(i),p,s,a,i)
