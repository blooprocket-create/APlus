"""Original sparring construct: carved lunar corolla, fitted to the live sentinel.
Not a new enemy simulation: runtime retains sentinel AI/telegraphs/projectiles.
"""
import sys,os
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from atelier_mesh import *
obsidian=mat('Carved recess • keeper slate','2c505b',.5,.1)
bronze=mat('Old brass • keeper filigree','c4a76d',.3,.65)
opal=mat('Opal • keeper heart','7ccfd1',.22,.2)
# Continuous carved seed form; geometry has an authored pinched silhouette.
sweep('Keeper lower carapace',[(0,.48,0),(0,.6,0),(0,.9,0),(0,1.18,0),(0,1.4,0)],[.025,.15,.26,.23,.08],obsidian,24,2,.07)
# Crescent wings built as swept, hollow-looking shell patches with engraved ribs.
for side in [-1,1]:
 vs=[];fs=[];N=32;M=10
 for j in range(N+1):
  t=j/N;cx=side*(.18+.52*math.sin(t*math.pi*.86));cy=.75+t*1.05;cz=-.025+math.sin(t*math.pi)*.12
  width=math.sin(t*math.pi)**.7*.23
  for k in range(M+1):
   u=k/M*2-1;vs.append((cx+side*u*width,cy+.1*u,cz+math.cos(u*math.pi*.5)*.065))
   if j and k:q=(j-1)*(M+1)+k-1;fs.append((q,q+1,q+M+2,q+M+1))
 o=mesh('Crescent wing shell',vs,fs,stone,1);mod=o.modifiers.new('Sculpted stone shell','SOLIDIFY');mod.thickness=.06
 pts=[(side*(.18+.52*math.sin(t*math.pi*.86)),.75+t*1.05,.05+math.sin(t*math.pi)*.12) for t in [j/24 for j in range(25)]]
 sweep('Engraved wing keel',pts,[.012]*25,bronze,8,1)
 for t in [.3,.5,.7]:
  p=(side*(.18+.52*math.sin(t*math.pi*.86)),.75+t*1.05,.06+math.sin(t*math.pi)*.12)
  sweep('Corolla branch inlay',[p,(p[0]+side*.1,p[1]+.05,p[2]-.02),(p[0]+side*.13,p[1]+.1,p[2]-.04)],[.007,.006,.002],bronze,6,1)
# Faceted heart: explicit gemstone cut planes, not an ico-sphere stand-in.
vs=[(0,1.67,.04),(0,.91,.04)];N=8
for y,r,z in [(1.4,.16,.04),(1.24,.17,.04)]:
 for j in range(N):a=j*math.tau/N;vs.append((math.cos(a)*r,y,z+math.sin(a)*r*.65))
fs=[]
for j in range(N):k=(j+1)%N;fs.extend([(0,2+j,2+k),(2+j,10+j,10+k,2+k),(1,10+k,10+j)])
o=mesh('Cut opal heart',vs,fs,opal)
for p in o.data.polygons:p.use_smooth=False
# Orbital collar is an interrupted ellipse with tapered, chiseled ends.
for side in [-1,1]:
 pts=[(side*.36*math.sin(t*math.pi),1.33+.42*math.cos(t*math.pi),-.09) for t in [j/32 for j in range(33)]]
 sweep('Keeper orbit',pts,[.007+.012*math.sin(j/32*math.pi) for j in range(33)],bronze,8,1)
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
# Batch each pigment, with origin at the sentinel's ground contact.
groups={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
for objects in groups.values():
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0]
 if len(objects)>1:bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=OUT+'/keeper.glb',export_format='GLB',export_yup=True)
