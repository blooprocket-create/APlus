"""Art-directed ravine surfaces, authored as erosion cuts through ridge profiles.
No primitive rocks, downloaded meshes or landscape image planes. The knots and
watercourse are composition controls; seeded weathering only breaks the surface.
"""
import math,bmesh

def build_ravine(mesh,mat):
 cliff=mat('Cliff • weathered celadon','748879',.94)
 far=mat('Cliff • distant blue shale','739293',.95)
 # A continuous vertical escarpment. The central notch receives the waterfall.
 knots=[(-260,5),(-200,14),(-150,25),(-120,20),(-70,18),(-48,28),(-32,24),(-20,31),(-9,19),(3,24),(12,26),(22,17),(36,28),(52,22),(70,32),(120,20),(180,25),(260,8)]
 def ridge(x):
  for i in range(len(knots)-1):
   a,b=knots[i],knots[i+1]
   if a[0]<=x<=b[0]:
    t=(x-a[0])/(b[0]-a[0]);t=t*t*(3-2*t);return a[1]*(1-t)+b[1]*t
  return 20
 for layer,(depth,shift) in enumerate([(-62,0),(-100,14)]):
  vs=[];fs=[];NX=320;NY=70
  for j in range(NY+1):
   t=j/NY
   for i in range(NX+1):
    x=-260+i*520/NX
    notch=math.exp(-((x-8-shift)/2.2)**2)*2.5
    height=ridge(x-shift)*.45+layer*5-notch
    # Shelves accumulate below the ridge; vertical channels widen at the foot.
    drainage=(math.sin(x*.69+math.sin(x*.17)*2)**6)*(.7+2*(1-t))
    strata=math.sin(t*math.pi*11+x*.018)*.28+math.sin(t*29+x*.04)*.16
    buttress=math.sin(x*.11+.6)**2*5*(1-t)**1.4
    z=depth+buttress-drainage+strata+math.sin(x*.071)*5
    y=-12+t*(height+12)
    vs.append((x,y,z))
    if i and j:
     q=(j-1)*(NX+1)+i-1;fs.append((q,q+1,q+NX+2,q+NX+1))
  # Extend the actual crest into receding uplands; no open wall-like top.
  for k in range(1,17):
   for i in range(NX+1):
    x=-260+i*520/NX;notch=math.exp(-((x-8-shift)/2.2)**2)*2.5
    height=ridge(x-shift)*.45+layer*5-notch
    z=depth+math.sin(x*.071)*5-k*1.6
    y=height+.4*math.sin(x*.13+k*.16)-.025*k*k
    vs.append((x,y,z))
    if i:
     row=NY+k;q=(row-1)*(NX+1)+i-1;fs.append((q,q+1,q+NX+2,q+NX+1))
  o=mesh('Eroded ravine • '+str(layer),vs,fs,cliff if layer==0 else far)
  # Open patches have no closed-volume outward direction. The art stage
  # is viewed from game +Z (Blender -Y); orient that side explicitly.
  if sum(p.normal.y for p in o.data.polygons)>0:
   bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.reverse_faces(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
 return {'waterfall':(8,8,-60)}
