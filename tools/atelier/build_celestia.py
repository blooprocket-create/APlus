"""Celestia / lunar cartographer. Original couture surfaces fitted to existing
animation joints. Open GLB in Blender for hand editing; rebuild is optional.
No changes to animation semantics, hit timing, or character class identity.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from atelier_mesh import *
navy=mat('Silk • midnight ink','18283d',.62);blue=mat('Silk • peacock satin','367f88',.5);white=mat('Porcelain • moon ivory','e0ded1',.55);silver=mat('Silver • brushed champagne','c4b48b',.3,.65);hair=mat('Hair • lunar silver','cbdce1',.44);hairshade=mat('Hair • indigo undersides','667fa0',.55);skin=mat('Skin • warm porcelain','efbda5',.9);gem=mat('Opal • tidal heart','73e5dd',.22,.25)
def cut_jewel(name,p,rx,ry,depth):
 vs=[];fs=[];N=10
 for z,r in [(-depth,.45),(0,1),(depth*.65,.62),(depth,.42)]:
  for j in range(N):
   a=j*math.tau/N;vs.append((p[0]+math.cos(a)*rx*r,p[1]+math.sin(a)*ry*r,p[2]+z))
 for i in range(3):
  for j in range(N):a=i*N+j;b=i*N+(j+1)%N;fs.append((a,b,b+N,a+N))
 fs.extend([tuple(reversed(range(N))),tuple(3*N+j for j in range(N))])
 o=mesh(name,vs,fs,gem)
 for poly in o.data.polygons:poly.use_smooth=False
 return o
attachments={}
def attach(joint):
 o=bpy.data.objects.new('attach__'+joint,None);bpy.context.collection.objects.link(o);attachments[joint]=o;return o
def parent_new(before,root):
 for o in list(bpy.context.scene.objects):
  if o not in before and o!=root and o.type=='MESH':o.parent=root

def surface(name,rows,m,n=40,sub=1):
 # y, width, depth, centerZ. Sculpted ellipses with sewn longitudinal folds.
 vs=[];fs=[]
 for i,(y,w,d,z) in enumerate(rows):
  for j in range(n):
   a=j*math.tau/n;fold=1+.018*math.cos(a*8)*math.sin(i/(len(rows)-1)*math.pi);vs.append((math.sin(a)*w*fold,y,z+math.cos(a)*d*fold))
  if i:
   for j in range(n):q=(i-1)*n+j;b=(i-1)*n+(j+1)%n;fs.append((q,b,b+n,q+n))
 fs.extend([tuple(reversed(range(n))),tuple((len(rows)-1)*n+j for j in range(n))]);return mesh(name,vs,fs,m,sub)
# Corset silhouette: high collar, tapered waist, continuous shoulder transition.
r=attach('Hips');before=set(bpy.context.scene.objects)
surface('Tailored lunar cuirass',[(-.10,.185,.125,0),(-.07,.205,.133,0),(.04,.186,.127,0),(.15,.145,.109,0),(.23,.17,.128,.006),(.33,.237,.145,0),(.40,.25,.139,-.002),(.45,.22,.124,0),(.49,.098,.077,0),(.57,.095,.076,0),(.58,.093,.075,0)],navy)
surface('Porcelain neck',[(.54,.065,.062,0),(.57,.068,.064,0),(.66,.067,.062,0),(.67,.064,.06,0)],skin,28,1)
# Cross-over ivory lapels, seam borders are actual modeled piping.
for side in [-1,1]:
 pts=[(side*.21,.425,.076),(side*.145,.35,.128),(side*.08,.24,.137),(side*.015,.14,.119)]
 sweep('Moon-thread lapel',pts,[.027,.024,.019,.008],white,8,1)
 sweep('Gold lapel seam',[(x+side*.025,y,z+.004) for x,y,z in pts],[.004]*4,silver,6,1)
for y,w,d in [(-.012,.203,.138),(.021,.2,.135)]:
 sweep('Waist woven binding',[(math.sin(a)*w,y,math.cos(a)*d) for a in [j*math.tau/48 for j in range(49)]],[.009]*49,silver,6,0)
cut_jewel('Cut moonstone clasp',(0,.02,.151),.035,.047,.018)
# Fitted silk chest panel with sculpted drape and a filigree constellation.
vs=[];fs=[]
for j in range(17):
 t=j/16;y=.10+t*.32;w=.07+.055*t
 for k in range(13):
  u=k/12*2-1;x=u*w;z=.12+math.sin(t*math.pi)*.025+.012*(1-u*u)
  vs.append((x,y,z))
  if j and k:q=(j-1)*13+k-1;fs.append((q,q+1,q+14,q+13))
mesh('Peacock silk plastron',vs,fs,navy,1)
for side in [-1,1]:
 pts=[(side*.02,.15,.146),(side*.065,.22,.157),(side*.10,.30,.161),(side*.06,.37,.143)]
 sweep('Embroidered chest constellation',pts,[.003]*4,silver,6,1)
 for x,y,z in pts[1:]:rock('Constellation pearl',(x,y,z+.003),(.006,.008,.005),white)
# Broad crescent clasp, a recognizable chest motif rather than a generic jewel.
sweep('Lunar clasp',[(math.cos(a)*.046,.335+math.sin(a)*.046,.163) for a in [math.pi*.2+i*math.pi*1.6/24 for i in range(25)]],[.006]*25,silver,8,0)
cut_jewel('Cut heart opal',(0,.33,.164),.017,.024,.012)
parent_new(before,r)
# Mantle: open front, sculpted pleat field, scalloped tails, interior lining.
r=attach('Coat');before=set(bpy.context.scene.objects)
for side in [-1,1]:
 vs=[];fs=[];nu=22;nv=30
 for j in range(nv+1):
  t=j/nv
  for k in range(nu+1):
   u=k/nu;a=side*(.4+u*2.22);radius=.235+.23*t+.055*math.sin(t*math.pi);fold=math.sin(u*math.pi*9)*.016*t
   y=.11-t*(.64+.17*math.sin(u*math.pi))+.025*math.cos(u*math.pi*4)*t**5
   vs.append((math.sin(a)*(radius+fold),y,.10+math.cos(a)*(.19+.18*t)+.09*t*t))
   if j and k:q=(j-1)*(nu+1)+k-1;fs.append((q,q+1,q+nu+2,q+nu+1))
 o=mesh('Split star mantle',vs,fs,navy,1);solid=o.modifiers.new('Sewn cloth thickness','SOLIDIFY');solid.thickness=.009
 # trim follows cut edges and scalloped lower hem
 for edge in [0,nu]:
  pts=[vs[j*(nu+1)+edge] for j in range(nv+1)];sweep('Mantle bound seam',pts,[.005]*(nv+1),silver,6,0)
 pts=vs[nv*(nu+1):];sweep('Embroidered scalloped hem',pts,[.006]*(nu+1),silver,6,1)
 for offset in [2]:
  pts=[vs[j*(nu+1)+offset] for j in range(nv+1)]
  sweep('Ivory woven coat border',pts,[.006]*(nv+1),white,6,1)
 # constellations embroidered in mantle, restrained rather than noisy
 for j in [9,17,24]:
  k=8;q=vs[j*(nu+1)+k];rock('Pearl stitch',q,(.009,.009,.009),silver)
parent_new(before,r)
# Joint-fitted arm armor and textile, visible elbows remain original weighted underlayer.
for side in ['L','R']:
 for joint,rows,m in [('UpperArm.'+side,[(.01,.07,.075,0),(-.04,.092,.08,0),(-.13,.087,.079,0),(-.23,.064,.062,0),(-.28,.061,.06,0)],blue),('ShoulderPlate.'+side,[(.035,.08,.09,0),(.015,.135,.12,0),(-.035,.15,.125,0),(-.09,.13,.11,0),(-.14,.09,.09,0)],white),('Forearm.'+side,[(.02,.079,.073,0),(-.05,.084,.077,0),(-.14,.07,.064,0),(-.245,.049,.052,0),(-.26,.052,.053,0)],navy),('Shin.'+side,[(.02,.073,.075,0),(-.07,.081,.079,0),(-.18,.062,.065,0),(-.30,.048,.05,0),(-.36,.048,.05,0)],navy)]:
  r=attach(joint);before=set(bpy.context.scene.objects);surface('Fitted '+joint,rows,m,28,1)
  y=rows[-2][0];w=rows[-2][1];d=rows[-2][2]
  sweep('Tailored silver binding',[(math.sin(a)*w,y,math.cos(a)*d) for a in [j*math.tau/32 for j in range(33)]],[.005]*33,silver,6,0)
  if joint.startswith('Shoulder'):
   sweep('Pauldron lunar relief',[(math.cos(a)*.055,-.055+math.sin(a)*.055,.124) for a in [math.pi*.15+j*math.pi*1.65/20 for j in range(21)]],[.004]*21,silver,6,0)
   rock('Shoulder opal',(0,-.055,.13),(.012,.018,.008),gem)
  parent_new(before,r)
# Sculpted head surface, same feature landmarks as existing expressive face.
r=attach('Head');before=set(bpy.context.scene.objects)
from portrait_sculpt import build_portrait
build_portrait(mesh,skin,OUT)
# Scalp excluding face with widow peak at temples.
vs=[];fs=[];N=64;R=20
for i in range(R+1):
 t=i/R
 for j in range(N):
  a=j*math.tau/N;front=(math.cos(a)+1)/2;phi=.04+t*(1.85-.65*front)
  vs.append((math.sin(phi)*math.sin(a)*.165,.047+math.cos(phi)*.19,-.025+math.sin(phi)*math.cos(a)*.15))
  if i:
   q=(i-1)*N+j;b=(i-1)*N+(j+1)%N;fs.append((q,b,b+N,q+N))
mesh('Continuous swept scalp',vs,fs,hair,1)
# Blade-shaped hair patches: elliptical ribbon cross sections, soft carved ridges.
def lock(name,pts,w,m):
 # side-by-side narrow swept solids read as broad flowing clumps, not tubes
 o=sweep(name,pts,[w,w*.88,w*.66,w*.31,.001],m,10,1,.06)
 for i,p in enumerate(pts):
  for v in list(o.data.vertices)[i*10:(i+1)*10]:v.co.y=-p[2]+(v.co.y+p[2])*.32
 return o
for i,(pts,w) in enumerate([
 ([(-.11,.19,.07),(-.065,.175,.13),(.00,.13,.16),(.066,.045,.154),(.112,-.005,.121)],.042),
 ([(-.07,.215,.06),(.01,.19,.13),(.08,.14,.15),(.134,.06,.124),(.149,-.07,.09)],.038),
 ([(-.12,.18,.05),(-.14,.11,.11),(-.157,.035,.12),(-.151,-.06,.111),(-.11,-.15,.106)],.045),
 ([(.06,.2,-.02),(.135,.15,.01),(.166,.04,.04),(.17,-.09,.01),(.12,-.22,-.015)],.046),
 ([(-.06,.19,-.1),(-.14,.08,-.12),(-.174,-.06,-.13),(-.16,-.19,-.1),(-.10,-.27,-.04)],.06),
 ]):lock('Sculpted sweep • '+str(i),pts,w,hair if i%2==0 else hairshade)
# Crescent filigree ear ornaments and asymmetric temporal arc.
for side in [-1,1]:
 sweep('Temporal crown',[(side*(.10+.05*math.sin(t*math.pi)),.10+t*.12,.113-t*.07) for t in [i/16 for i in range(17)]],[.006]*17,silver,8,0)
 rock('Tidal ear opal',(side*.166,-.045,.018),(.014,.025,.013),gem)
 sweep('Pendulum earring',[(side*.165,-.055,.018),(side*.169,-.11,.018),(side*.166,-.14,.02)],[.003]*3,silver,6,0)
parent_new(before,r)
# Long dynamic hair attached to existing Hair follower, not rigid to the torso.
r=attach('Hair');before=set(bpy.context.scene.objects)
for i in range(7):
 x=(i-3)*.025
 lock('Flowing lunar hair',[(x,.04,-.015),(x*1.3,-.13,-.10),(x*1.5+.025,-.34,-.17),(x*.8+.08,-.60,-.22),(x*.4+.13,-.75+abs(i-3)*.035,-.16)],.034,hair if i%3 else hairshade)
parent_new(before,r)
# The star instrument: hand-carved curved stem and asymmetrical crescent crown.
r=attach('Weapon');before=set(bpy.context.scene.objects)
sweep('Lunar instrument • carved stem',[(0,0,-.52),(.015,0,-.3),(0,0,0),(-.02,0,.5),(0,0,.91),(.025,0,1.05)],[.015,.019,.021,.023,.036,.02],navy,16,2,.06)
for side in [-1,1]:
 pts=[(.025,0,.88),(side*.13,0,.99),(side*.22,0,1.18),(side*.16,0,1.37),(side*.04,0,1.46)]
 sweep('Sculpted crescent prong',pts,[.025,.026,.021,.014,.001],silver,10,2)
cut_jewel('Cut astral opal',(.025,0,1.24),.060,.034,.12)
for z in [-.3,.23,.62,.84]:
 sweep('Engraved ferrule',[(math.cos(a)*.026,math.sin(a)*.026,z) for a in [i*math.tau/24 for i in range(25)]],[.004]*25,silver,6,0)
# Wrapped gloved hand, fitted to the existing weapon joint.
rock('Glove palm',(-.039,-.008,.013),(.03,.029,.054),navy)
for i in range(4):
 z=.04-i*.023;pts=[(math.cos(a)*.036,math.sin(a)*.036,z) for a in [math.pi-.13-t*2.4 for t in [0,.25,.5,.75,1]]]
 sweep('Wrapped glove finger',pts,[.011,.011,.01,.009,.005],blue,8,2)
parent_new(before,r)
# Export retains local joint anchors; runtime re-parents their children exactly once.
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
for anchor in attachments.values():
 groups={}
 for o in list(anchor.children):
  if o.type=='MESH':groups.setdefault(o.data.materials[0].name,[]).append(o)
 for objects in groups.values():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=OUT+'/celestia.glb',export_format='GLB',export_yup=True)
print('ATELIER: original Celestia couture exported')
