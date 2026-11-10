"""Original UV-authored garment/hair surfaces. Game Y-up coordinates.
Subdivision is a finishing operation; profile, seams, grain and silhouette are
explicit controls. UVs survive the GLB joint handoff and runtime skin fitting.
"""
import bpy,math
from mathutils import Vector
from atelier_mesh import mesh

def uv_mesh(name,vs,faces,uvs,material,sub=1,thickness=0):
 o=mesh(name,vs,faces,material,sub)
 layer=o.data.uv_layers.new(name='Artist UV')
 for poly in o.data.polygons:
  for li in poly.loop_indices:layer.data[li].uv=uvs[o.data.loops[li].vertex_index]
 if thickness:
  m=o.modifiers.new('Sewn surface thickness','SOLIDIFY');m.thickness=thickness;m.offset=0
 return o

def profile(name,rows,material,sides=40,sub=1,fold=0,front_open=False):
 vs=[];uv=[];faces=[]
 for i,row in enumerate(rows):
  y,w,d,z=row;t=i/(len(rows)-1)
  for j in range(sides+1):
   a=j*math.tau/sides;wrinkle=fold*math.sin(a*6+y*32)*math.sin(t*math.pi)**2
   vs.append((math.sin(a)*(w+wrinkle),y,z+math.cos(a)*(d+wrinkle*.5)));uv.append((j/sides,t))
   if i and j:
    q=(i-1)*(sides+1)+j-1;mid=(rows[i-1][0]+y)*.5;ang=(j-.5)*math.tau/sides
    opening=front_open and mid>.24 and math.cos(ang)>.2 and abs(math.sin(ang)*w)<(.02+(mid-.24)*.40)
    if not opening:faces.append((q,q+1,q+sides+2,q+sides+1))
 # End caps for continuous volume. Open throat stays truly open.
 faces.append(tuple(reversed(range(sides))))
 if not front_open:faces.append(tuple((len(rows)-1)*(sides+1)+j for j in range(sides)))
 return uv_mesh(name,vs,faces,uv,material,sub)

def patch(name,fn,material,nu=24,nv=32,sub=1,thickness=.005):
 vs=[];uv=[];faces=[]
 for j in range(nv+1):
  t=j/nv
  for i in range(nu+1):
   u=i/nu;vs.append(fn(u,t));uv.append((u,1-t))
   if j and i:q=(j-1)*(nu+1)+i-1;faces.append((q,q+1,q+nu+2,q+nu+1))
 return uv_mesh(name,vs,faces,uv,material,sub,thickness)

def catmull(points,t):
 x=t*(len(points)-1);i=min(len(points)-2,int(x));u=x-i
 p0=Vector(points[max(0,i-1)]);p1=Vector(points[i]);p2=Vector(points[i+1]);p3=Vector(points[min(len(points)-1,i+2)])
 return .5*((2*p1)+(-p0+p2)*u+(2*p0-5*p1+4*p2-p3)*u*u+(-p0+3*p1-3*p2+p3)*u*u*u)

def hair_blade(name,points,width,material,bias=0):
 vs=[];uv=[];faces=[];N=32;S=12
 for i in range(N+1):
  t=i/N;p=catmull(points,t);a=catmull(points,max(0,t-.002));b=catmull(points,min(1,t+.002));tangent=(b-a).normalized()
  axis=Vector((0,0,1));side=tangent.cross(axis)
  if side.length<.01:side=tangent.cross(Vector((1,0,0)))
  side.normalize();depth=tangent.cross(side).normalized()
  taper=(.70+.30*math.sin(t*math.pi))*max(.012,(1-t**2.3))
  for j in range(S+1):
   ang=j*math.tau/S
   # Carved lens cross section, with a soft central crest and pointed edges.
   px=math.cos(ang)*width*taper;pz=math.sin(ang)*width*.25*taper
   v=p+side*px+depth*pz;vs.append(tuple(v));uv.append((j/S,(1-t)*.93+bias*.04))
   if i and j:q=(i-1)*(S+1)+j-1;faces.append((q,q+1,q+S+2,q+S+1))
 faces.extend([tuple(reversed(range(S))),tuple(N*(S+1)+j for j in range(S))])
 return uv_mesh(name,vs,faces,uv,material,0)

def shoe(name,material):
 rows=[(-.075,.040,.042,-.008),(-.055,.053,.050,-.009),(.005,.060,.046,-.012),(.075,.064,.038,-.019),(.15,.057,.030,-.025),(.205,.035,.018,-.027),(.220,.010,.007,-.03)]
 vs=[];uv=[];faces=[];S=28
 for i,(z,w,h,y) in enumerate(rows):
  for j in range(S+1):
   a=j*math.tau/S;vs.append((math.sin(a)*w,max(-.060,y+math.cos(a)*h),z));uv.append((j/S,i/(len(rows)-1)))
   if i and j:q=(i-1)*(S+1)+j-1;faces.append((q,q+1,q+S+2,q+S+1))
 faces.extend([tuple(reversed(range(S))),tuple((len(rows)-1)*(S+1)+j for j in range(S))])
 return uv_mesh(name,vs,faces,uv,material,1)
