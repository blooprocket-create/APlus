import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atelier_mesh import *
# Painted topography with a flat gameplay clearing; sculptural banks outside it.
vs=[];fs=[];N=90
for iz in range(N+1):
 z=-28+iz*48/N
 for ix in range(N+1):
  x=-27+ix*54/N; edge=max(0,abs(x)-5)/9;back=max(0,-z-9)/8
  y=-.12+min(5,edge**1.6)*(.6+.3*math.sin(x*.35+z*.22)) + .06*math.sin(x*1.7)*math.sin(z*.9)-max(0,-z-14)*.32
  vs.append((x,y,z))
  if ix and iz:
   a=(iz-1)*(N+1)+ix-1;fs.append((a,a+1,a+N+2,a+N+1))
mesh('Sculpted garden floor',vs,fs,ground)
# The broken observatory: circular frieze, irregular radial paving, remnants.
def clip(poly,nx,nz,c):
 out=[]
 for i,a in enumerate(poly):
  b=poly[(i+1)%len(poly)];da=a[0]*nx+a[1]*nz-c;db=b[0]*nx+b[1]*nz-c
  if da<=0:out.append(a)
  if (da<0)!=(db<0):
   t=da/(da-db);out.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
 return out
sites=[]
court_outline=[(-5.9,1.3),(-4.4,3.8),(-1.9,4.3),(1,3.5),(3.4,3.8),(4.8,1.7),(4.6,-1),(3.4,-3.3),(2.8,-5.0),(1,-5.6),(-1.8,-5.3),(-3.5,-3.2),(-5.6,-1.7)]
def broken_edge(x,z):
 # Two authored collapse scars interrupt the platform edge, exposing earth.
 return (x<-3.2 and z>1.7) or (x>2.7 and -.4<z<.8)
def on_court(x,z):
 inside=False
 for i,a in enumerate(court_outline):
  b=court_outline[(i+1)%len(court_outline)]
  if (a[1]>z)!=(b[1]>z) and x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0]:inside=not inside
 return inside and not broken_edge(x,z)
for iz in range(-5,6):
 for ix in range(-5,6):
  x=ix*.87+random.uniform(-.28,.28);z=iz*.87+random.uniform(-.28,.28)
  if x*x+z*z<28:sites.append((x,z))
for x,z in sites:
 if broken_edge(x,z):continue
 poly=list(court_outline)
 for xx,zz in sites:
  if (x,z)==(xx,zz):continue
  poly=clip(poly,xx-x,zz-z,(xx*xx+zz*zz-x*x-z*z)*.5)
  if not poly:break
 if len(poly)<3:continue
 poly=[(x+(px-x)*.957,z+(pz-z)*.957-1) for px,pz in poly];n=len(poly)
 vs=[(px,y,pz) for y in [-.13,.015+random.uniform(-.003,.003)] for px,pz in poly]
 fs=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
 o=mesh('Fitted worn limestone court',vs,fs,stone if random.random()>.1 else dark);mod=o.modifiers.new('Chisel softened arris','BEVEL');mod.width=.025;mod.segments=3
# An incomplete engraved celestial chart, repaired in brass centuries later.
for radius in [1.7,2.8,4.3]:
 for segment in range(12):
  if segment in [2,7]:continue
  pts=[(math.sin(a)*radius,.032,-1+math.cos(a)*radius) for a in [segment*math.tau/12+t*.46 for t in [i/12 for i in range(13)]]]
  if any(not on_court(p[0],p[2]+1) for p in pts):continue
  sweep('Inlaid stellar cartography',pts,[.009]*13,gold,5,0)
for z in range(-15,-4):
 for x in [-1,0,1]:slab('Pilgrim path',(x*.95+random.uniform(-.08,.08),.018,z),.9,.91,.15,random.uniform(-.12,.12))
# Moon arch consists of hand-shaped wedge stones, never a torus stand-in.
cx,cy,cz=1.2,3.35,-7.8
for i in range(26):
 a=-.22+i*math.tau/28; da=.095;vs=[]
 for z in [cz-.39,cz+.39]:
  for r,ang in [(2.60,a-da),(3.02,a-da),(3.02,a+da),(2.60,a+da)]:vs.append((cx+math.cos(ang)*r,cy+math.sin(ang)*r,z))
 o=mesh('Moon gate • carved voussoir',vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],stone)
 b=o.modifiers.new('Time softened carving','BEVEL');b.width=.06;b.segments=3
 # thin warm inlay follows curvature
 if i%3!=0:
  sweep('Astronomical brass inlay',[(cx+math.cos(a+t)*2.82,cy+math.sin(a+t)*2.82,cz+.414) for t in [-.065,0,.065]],[.016]*3,gold,6,0)
for x,h in [(-3.3,3.2),(5.5,4.4),(8.3,2.1)]:
 slab('Column plinth',(x,.12,-8.1),1.45,1.4,.3)
 sweep('Ruined fluted pier',[(x,.12,-8.1),(x,.22,-8.1),(x,.38,-8.1),(x,h*.45,-8.1),(x+.04,h-.28,-8.08),(x+.04,h-.12,-8.08)],[.48,.48,.36,.33,.29,.37],stone,28,1,.08)
 for side in [-1,1]:
  for offset in [-.23,.1]:
   sweep('Carved acanthus capital',[(x+side*.27,h-.4,-8.1+offset),(x+side*.49,h-.13,-8.12+offset),(x+side*.50,h+.02,-8.08+offset),(x+side*.35,h+.06,-8+offset)],[.10,.08,.055,.008],stone,8,2)
 slab('Fractured capital',(x,h,-8.1),1.26,1.15,.22,.03)
# Central tree. Authored counter-curves and buttressed negative space.
trunk=sweep('Ancient tree • sculpted continuous bole',[(-5,-.6,-6),(-5.3,.2,-6.2),(-5.4,1.5,-6.3),(-5.2,3.4,-6.6),(-5.8,5.4,-6.8),(-6.1,7.5,-6.9),(-5.3,9,-7.1),(-3.4,10.4,-7.2),(-1,10.8,-7.8)],[1.9,1.6,1.04,.92,.86,.64,.43,.27,.025],bark,24,2,.14)
# Root buttresses emerge as long, flattened fins, each sweeping into soil.
for a,length in [(-2.8,4.5),(-1.9,3.9),(-.8,3.7),(.3,4.6),(1.8,4.1),(2.5,3.5)]:
 pts=[(-5+math.sin(a)*r,y,-6+math.cos(a)*r) for r,y in [(0,2.8),(.6,1.2),(1.3,.45),(2.4,.12),(length,-.2)]]
 sweep('Buttress root',pts,[.7,.6,.42,.25,.025],bark,12,2,.09)
branches=[([(-5.5,4.5,-6.8),(-7.7,5.3,-6.5),(-10,6,-5.9),(-11.8,7.9,-5.5)],[.65,.48,.28,.035]),([(-6,7,-7),(-8.1,8.2,-8),(-9.7,9.3,-8.7),(-10.5,10.1,-9)],[.5,.37,.2,.02]),([(-5.5,8.9,-7),(-3.1,9.3,-5.8),(-.6,9.7,-5.9),(2,11,-6.4)],[.44,.33,.20,.02]),([(-5.7,5.4,-6.8),(-4,6.5,-8.9),(-1.7,7.4,-10.3),(.3,8.1,-10.5)],[.55,.4,.23,.02])]
for bi,(pts,rs) in enumerate(branches):
 sweep('Crown • sculpted bough',pts,rs,bark,14,2,.09)
 for j in range(1,4):
  p=pts[j];side=1 if j%2 else -1
  sweep('Crown • branching twig',[p,(p[0]+side*.7,p[1]+.5,p[2]+.5),(p[0]+side*1.1,p[1]+1,p[2]+.8)],[rs[j]*.5,.08,.008],bark,8,2)

# Leaves are curved, veined, lanceolate surfaces, distributed in authored crown volumes.
leafvs=[[] for _ in leaves];leaffs=[[] for _ in leaves];leafuv=[[] for _ in leaves]
def leaf(p,l,w,a,tilt,idx):
 vs=leafvs[idx];fs=leaffs[idx];start=len(vs)
 for j in range(5):
  t=j/4; sw=math.sin(math.pi*t)**.8*w
  for s in [-1,0,1]:
   leafuv[idx].append((.5+s*.48*math.sin(math.pi*t)**.8,t))
   u=s*sw;v=t*l;vs.append((p[0]+u*math.cos(a)+v*math.sin(a),p[1]+math.sin(t*math.pi)*l*.18+v*tilt-abs(s)*w*.24,p[2]-u*math.sin(a)+v*math.cos(a)))
 for j in range(4):
  for s in range(2):q=start+j*3+s;fs.append((q,q+1,q+4,q+3))
# Leaf sprays follow actual woody shoots. Crown shape comes from twelve
# authored growth gestures instead of unconnected ellipsoid distributions.
sprays=[((-11.0,7.8,-5.5),(-11.4,9.0,-5.1),2.5),((-9.7,8.1,-5.7),(-9.1,9.5,-4.9),2.4),
 ((-10.5,9.9,-9),(-11.1,11.2,-8.8),2.4),((-8.5,9.2,-8),(-8.3,11.0,-7.8),2.3),
 ((-6,9.5,-7),(-6.3,11.4,-7.0),2.2),((-3.4,10.4,-7.2),(-3.6,12.3,-7.0),2.7),
 ((-1.2,10.7,-7.8),(-1.1,12.4,-7.5),2.3),((1.4,10.7,-6.4),(1.8,12.0,-6.0),2.0),
 ((-.8,9.7,-5.9),(-.2,11.5,-4.8),2.0),((-.2,7.9,-10.5),(.6,9.4,-10.7),2.6),
 ((-2.0,7.4,-10),(-2.5,9.3,-10.8),2.2),((-7.5,8.2,-8),(-7.5,10.0,-9.7),2.2)]
for cluster,(root,center,spread) in enumerate(sprays):
 for shoot in range(26):
  a=shoot*2.399963+cluster*.71;r=spread*(.32+.68*math.sqrt((shoot+.5)/26))
  end=(center[0]+math.sin(a)*r,center[1]+.7*math.cos(a*1.7+cluster)+.3*(1-r/spread),center[2]+math.cos(a)*r*.7)
  mid=((root[0]+end[0])*.5,(root[1]+end[1])*.5+.25,(root[2]+end[2])*.5)
  sweep('Canopy shoot',[root,mid,end],[.032,.018,.0025],bark,5,1)
  for j in range(3,12):
   t=j/12;px=(1-t)**2*root[0]+2*t*(1-t)*mid[0]+t*t*end[0];py=(1-t)**2*root[1]+2*t*(1-t)*mid[1]+t*t*end[1];pz=(1-t)**2*root[2]+2*t*(1-t)*mid[2]+t*t*end[2]
   for side in [-1,1]:
    leaf((px,py,pz),random.uniform(.35,.62),random.uniform(.12,.21),a+side*.95,random.uniform(-.32,.28),0 if t<.5 else 1 if end[1]>center[1]+.2 else 2 if shoot%3 else 3)
# Understory: fern fronds grow as alternating pointed leaflets.
for i in range(135):
 x=random.uniform(-14,12);z=random.uniform(-16,9)
 if abs(x)<4.8 and z>-5:continue
 if abs(x)<2 and z<-4:continue
 y=.05+max(0,abs(x)-5)**1.6/9**1.6*.7
 for j in range(6):
  a=j*math.tau/6+random.random();L=random.uniform(.55,1.2)
  for k in range(1,8):
   t=k/8;p=(x+math.sin(a)*L*t,y+math.sin(t*2)*L*.55,z+math.cos(a)*L*t)
   for side in [-1,1]:leaf(p,L*.36*(1-t)+.04,.045,a+side*1.15,-.15,random.choice([0,1]))

# Continuous authored outcrops replace the old random sphere/moss assemblies.
from bank_sculpt import build_banks
build_banks(mesh,mat)
# Hanging vines and star-shaped garden flowers.
for i in range(20):
 x=random.uniform(-9,3);z=random.uniform(-8,-5);top=random.uniform(7,10);length=random.uniform(1,3)
 pts=[(x+math.sin(t*3+i)*.15,top-t*length,z+math.cos(t*4)*.15) for t in [j/12 for j in range(13)]]
 sweep('Pendant vine',pts,[.018]*13,moss,5,0)
 for j,p in enumerate(pts[1:]):
  leaf(p,.16,.065,(-1 if j%2 else 1)*1.3,-.3,j%2)
for i in range(180):
 x=random.uniform(-12,11);z=random.uniform(-12,9)
 if abs(x)<4.6 and z>-4:continue
 y=.12+max(0,abs(x)-5)**1.6/9**1.6*.7;h=random.uniform(.16,.38)
 sweep('Iris stem',[(x,y,z),(x+.03,y+h,z)],[.009,.005],moss,4,0)
 vs=[(x,y+h,z)]+[(x+math.sin(a)*r,y+h+.035*math.cos(a*5),z+math.cos(a)*r) for a,r in [(j*math.tau/10,.13 if j%2==0 else .047) for j in range(10)]]
 mesh('Wild star iris',vs,[(0,j+1,(j+1)%10+1) for j in range(10)],flower if i%3 else ivory)
from couture_surfaces import uv_mesh
for idx in range(5):uv_mesh('Sculpted foliage • '+str(idx),leafvs[idx],leaffs[idx],leafuv[idx],leaves[idx],0)
# Lantern shrines tell of a maintained sanctuary inside an abandoned observatory.
for x,z in [(-4,2),(4.8,-2),(-2.8,-6),(5,-10)]:
 slab('Lantern foot',(x,.16,z),.7,.7,.25)
 sweep('Lantern carved pedestal',[(x,.1,z),(x,.45,z),(x,.68,z)],[.24,.15,.23],stone,12,1)
 rock('Lantern amber glass',(x,.84,z),(.16,.23,.16),gold)
 slab('Lantern shelter',(x,1.16,z),.62,.62,.12)
from observatory_relics import build_relics
build_relics(mesh,sweep,slab,mat,stone,dark,gold,moss)
# Original continuous ravine sculpture replaces flat ridge image planes.
from terrain_sculpt import build_ravine
build_ravine(mesh,mat)
# Low stone garden terraces with a natural, broken top edge.
for i in range(20):
 x=-17+i*1.65;z=-18+math.sin(i*.27)*1.5
 if abs(x)<2:continue
 slab('Forgotten terrace',(x,1.2+random.uniform(-.15,.1),z),1.8,1.1,1.6,random.uniform(-.08,.08))
# Fuse intersecting growth volumes offline, then relax the surface. This is
# the sculpt stage: root joins become continuous organic junctions.
wood=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.name.startswith(('Ancient tree','Buttress root','Crown •'))]
bpy.ops.object.select_all(action='DESELECT')
for o in wood:
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.context.view_layer.objects.active=wood[0];bpy.ops.object.join();o=bpy.context.object;o.name='Unified sculpt • elder heartwood'
mod=o.modifiers.new('Voxel union of authored growth','REMESH');mod.mode='VOXEL';mod.voxel_size=.055;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=o.modifiers.new('Organic junction relaxation','SMOOTH');mod.factor=.65;mod.iterations=4;bpy.ops.object.modifier_apply(modifier=mod.name)
mod=o.modifiers.new('Sculpt surface economy','DECIMATE');mod.ratio=.6;bpy.ops.object.modifier_apply(modifier=mod.name)
for p in o.data.polygons:p.use_smooth=True
# Merge by pigment after applying authored surface modifiers. Keeps render batches modest.
# Retain the earlier gateway as an explicit reversible comparison group. Its
# materials stay separate from the court so sculpt replacement needs no runtime
# coordinate-based triangle deletion or changes to gameplay geometry.
gate_prefixes=('Moon gate','Astronomical brass','Column plinth','Ruined fluted pier','Carved acanthus','Fractured capital','Moon window','Botanical astronomical','Moon dial','Carved window','Pilgrim path','Forgotten terrace')
gate_materials={}
for o in list(bpy.context.scene.objects):
 if o.type=='MESH' and o.name.startswith(gate_prefixes):
  old=o.data.materials[0]
  if old.name not in gate_materials:
   copy=old.copy();copy.name=old.name+' • Archived gate';gate_materials[old.name]=copy
  o.data.materials[0]=gate_materials[old.name]
def export(path):
 bpy.ops.object.select_all(action='DESELECT')
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':
   bpy.context.view_layer.objects.active=o;o.select_set(True)
   for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
   o.select_set(False)
 # one object per material, preserve boundaries on later hero export
 groups={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
 for objects in groups.values():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
 from bake_occlusion import bake_occlusion
 bake_occlusion(list(bpy.context.scene.objects))
 bpy.ops.export_scene.gltf(filepath=path,export_format='GLB',export_yup=True)
export(OUT+'/garden.glb')
print('ATELIER: original garden exported')
