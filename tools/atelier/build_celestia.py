"""Celestia couture, authored against art/atelier/references/celestia-design.png.
Original UV-based surfaces; runtime uses the canonical skeleton and clips.
"""
import sys,os,math
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from atelier_mesh import *
from couture_surfaces import profile,patch,hair_blade,shoe
from portrait_sculpt import build_portrait
navy=mat('Couture • tailored navy','ffffff',.68)
coat=mat('Couture • coat embroidered','ffffff',.68)
pearl=mat('Couture • pearl embroidered','ffffff',.82)
teal=mat('Couture • teal weave','ffffff',.7)
hair=mat('Couture • hair silver','ffffff',.42)
leather=mat('Couture • leather','ffffff',.48)
gold=mat('Metal • aged champagne','bca576',.31,.72)
steel=mat('Metal • moon silver','899da8',.50,.45)
skin=mat('Skin • warm porcelain','f1bfaa',.85)
face_skin=mat('Skin • portrait albedo','ffffff',.82)
opal=mat('Opal • tidal glass','61c4cd',.23,.2)
attachments={}
def attach(name):
 o=bpy.data.objects.new('attach__'+name,None);bpy.context.collection.objects.link(o);attachments[name]=o;return o
def group_new(root,before):
 for o in list(bpy.context.scene.objects):
  if o not in before and o.type=='MESH':o.parent=root

def jewel(name,p,rx,ry,d,material=opal):
 vs=[];fs=[];N=10
 for z,r in [(-d,.42),(0,1),(d*.65,.62),(d,.40)]:
  for j in range(N):a=j*math.tau/N;vs.append((p[0]+math.cos(a)*rx*r,p[1]+math.sin(a)*ry*r,p[2]+z))
 for i in range(3):
  for j in range(N):q=i*N+j;b=i*N+(j+1)%N;fs.append((q,b,b+N,q+N))
 fs.extend([tuple(reversed(range(N))),tuple(3*N+j for j in range(N))]);o=mesh(name,vs,fs,material)
 for poly in o.data.polygons:poly.use_smooth=False
 return o

def piping(name,points,width=.0025,material=gold):return sweep(name,points,[width]*len(points),material,8,1)
# Tailored torso: open lapels, waistcoat, leather belts, asymmetric pearl mantle.
r=attach('Hips');before=set(bpy.context.scene.objects)
profile('Tailored coat • open V bodice',[(-.115,.195,.127,0),(-.08,.199,.131,0),(.03,.178,.119,0),(.14,.142,.106,0),(.23,.167,.128,0),(.32,.210,.140,0),(.40,.235,.133,-.004),(.46,.209,.113,-.008),(.49,.115,.079,-.012)],navy,48,1,.0025,True)
profile('Neck and exposed throat',[(.44,.050,.044,-.018),(.49,.045,.041,-.020),(.60,.041,.040,-.022),(.67,.044,.041,-.024)],skin,36,1)
def vest(u,t):
 x=(u*2-1)*(.105+.025*abs(t-.55)*2);y=-.115+t*.48;z=.140+.012*math.sin(t*math.pi)-.035*(u*2-1)**2
 return(x,y,z)
patch('Fitted teal waistcoat',vest,teal,24,28,1,.004)
for y in [-.065,.015,.095,.175,.255]:jewel('Waistcoat engraved button',(0,y,.158),.006,.006,.004,gold)
# Lapels are folded panels with a cut edge, not padded tubes.
for side in [-1,1]:
 def lapel(u,t,side=side):
  center=.025+.17*t;x=side*(center+(u-.5)*(.022+.028*t));y=.15+.31*t-.016*(u-.5);z=.15-.052*t+.014*math.sin(u*math.pi)
  return(x,y,z)
 patch('Notched folded lapel',lapel,navy,8,24,1,.007)
 piping('Lapel bound stitch',[lapel(1,j/24) for j in range(25)],.0022)
 def collar(u,t,side=side):
  a=side*(.34+u*2.3);return(math.sin(a)*(.061+t*.006),.465+t*(.055+.025*math.sin(u*math.pi)),math.cos(a)*(.053+t*.005)-.012)
 patch('Split standing collar',collar,navy,18,10,1,.006)
 piping('Collar edge',[collar(u/20,1) for u in range(21)],.002)
# Thin crossed belts follow the actual torso curvature.
for k,(y0,slope) in enumerate([(.008,-.11),(-.045,.065)]):
 def belt(u,t,y0=y0,slope=slope):
  a=u*math.tau;x=math.sin(a)*.201;return(x,y0+x*slope+(t-.5)*.027,math.cos(a)*.143)
 patch('Crossed leather waist belt',belt,leather,64,3,0,.008)
 for edge in [0,1]:piping('Belt topstitch',[belt(j/64,edge) for j in range(65)],.0011,steel)
 # Gold buckle frame, offset to one hip.
 bx=-.075 if k==0 else .095;by=y0+bx*slope
 piping('Belt buckle',[(bx-.022,by-.018,.151),(bx+.022,by-.018,.151),(bx+.022,by+.018,.151),(bx-.022,by+.018,.151),(bx-.022,by-.018,.151)],.0038)
# Original crescent throat clasp.
jewel('Throat opal',(0,.465,.055),.015,.024,.012)
piping('Throat chain',[(-.070,.476,.058),(-.04,.461,.077),(0,.447,.085),(.04,.461,.077),(.070,.476,.058)],.002)
# The ivory mantle lies over the left shoulder/back, not as symmetrical armor.
def mantle(u,t):
 a=-.25-u*2.45;rx=.235+t*.115;rz=.157+t*.055
 return(math.sin(a)*rx,.475-t*(.33+.10*math.sin(u*math.pi))+.018*math.sin(u*math.pi),math.cos(a)*rz-.025+.018*math.sin(u*math.pi*5)*t)
patch('Asymmetric pearl shoulder mantle',mantle,pearl,32,28,1,.006)
piping('Mantle sewn hem',[mantle(j/40,1) for j in range(41)],.0032)
piping('Mantle neck binding',[mantle(j/40,0) for j in range(41)],.0028)
# Crescent shoulder fastening, now a small sharp silhouette element.
pts=[(-.125+math.cos(a)*.035,.447+math.sin(a)*.035,.129) for a in [j*math.pi*1.65/28+.2 for j in range(29)]]
sweep('Crescent mantle brooch',pts,[.004+.002*math.sin(j/28*math.pi) for j in range(29)],gold,8,1)
jewel('Mantle shoulder opal',(-.12,.44,.134),.012,.016,.008)
group_new(r,before)
# Curved split coat: open at the front; longer swept back tails and true pleats.
r=attach('Coat');before=set(bpy.context.scene.objects)
for side in [-1,1]:
 def tail(u,t,side=side):
  a=side*(.50+u*2.55);fold=math.sin(u*math.pi*9+t*2)*.016*math.sin(t*math.pi*.5)
  rx=.201+.22*t**1.2+fold;rz=.148+.19*t+fold*.7
  length=.60+u*.35+.07*math.sin(u*math.pi)+.04*math.exp(-((u-.78)/.09)**2)
  return(math.sin(a)*rx,.10-t*length,math.cos(a)*rz-.025-t*.11)
 patch('Swept embroidered coat tail',tail,coat,32,40,1,.007)
 for edge in [0,1]:piping('Coat tailored edge',[tail(edge,j/40) for j in range(41)],.0024)
 piping('Coat pointed hem',[tail(j/40,1) for j in range(41)],.0027)
group_new(r,before)
# Sleeves are tailored volumes with localized elbow folds, not armor cylinders.
for side in ['L','R']:
 r=attach('UpperArm.'+side);before=set(bpy.context.scene.objects)
 profile('Tailored upper sleeve',[(.01,.069,.069,0),(-.025,.078,.073,0),(-.09,.080,.075,.002),(-.17,.074,.072,.004),(-.23,.064,.064,.004),(-.29,.059,.058,0)],navy,40,1,.004)
 group_new(r,before)
 r=attach('ShoulderPlate.'+side);before=set(bpy.context.scene.objects)
 # Small layered guard; the mantle supplies the asymmetric broad form.
 def guard(u,t):
  a=-1.35+u*2.7;return(math.sin(a)*(.087-.018*t),.035-t*.125,math.cos(a)*(.080-.009*t)-.012)
 patch('Small sculpted shoulder guard',guard,navy,20,12,1,.012)
 piping('Shoulder fine bound edge',[guard(j/24,1) for j in range(25)],.0023)
 group_new(r,before)
 r=attach('Forearm.'+side);before=set(bpy.context.scene.objects)
 profile('Tailored forearm sleeve',[(.025,.061,.062,.003),(-.04,.067,.064,.004),(-.11,.067,.060,0),(-.18,.055,.054,0),(-.245,.047,.048,0),(-.27,.047,.048,0)],navy,36,1,.003)
 # Contoured bracer plates on the outside/front, leaving the wrist mobile.
 def bracer(u,t):
  a=-1.2+u*2.4;return(math.sin(a)*(.057-t*.009),-.065-t*.16,math.cos(a)*(.065-t*.008)+.003)
 patch('Articulated silver wrist guard',bracer,steel,18,18,1,.008)
 for edge in [0,1]:piping('Vambrace etched edge',[bracer(edge,j/20) for j in range(21)],.0018,gold)
 group_new(r,before)
 r=attach('Shin.'+side);before=set(bpy.context.scene.objects)
 profile('Fitted boot shaft',[(.01,.073,.074,0),(-.06,.071,.073,0),(-.18,.059,.062,0),(-.28,.048,.051,0),(-.36,.047,.050,.003)],leather,36,1,.001)
 # Sharp knee and ankle bindings preserve an elegant long leg line.
 def bootguard(u,t):
  a=-.86+u*1.72;return(math.sin(a)*(.075-t*.012),-.005-t*.13,math.cos(a)*(.078-t*.009)+.001)
 patch('Boot silver crest',bootguard,steel,18,12,1,.006)
 piping('Boot crest seam',[bootguard(j/24,0) for j in range(25)],.0022,gold)
 group_new(r,before)
 r=attach('Foot.'+side);before=set(bpy.context.scene.objects)
 shoe('Sculpted fitted boot and sole',leather)
 piping('Boot toe cap seam',[(-.050,-.018,.152),(-.035,.004,.172),(0,.009,.179),(.035,.004,.172),(.050,-.018,.152)],.0018,steel)
 group_new(r,before)
# A delicate face and a layered, side-swept haircut from the reference.
r=attach('Head');before=set(bpy.context.scene.objects)
build_portrait(mesh,face_skin,OUT)
# Auricles have an authored rim, concha and tragus; they are not scaled spheres.
for side in [-1,1]:
 def ear(u,t,side=side):
  a=u*math.tau;rad=.018+.012*t
  return(side*(.143+math.sin(a)*rad*.52),-.012+math.cos(a)*rad*1.38,.002+math.sin(t*math.pi)*.012-.010*t)
 patch('Sculpted ear auricle',ear,skin,32,10,1,.002)
 piping('Ear helix rim',[ear(j/32,1) for j in range(33)],.003,skin)
# Crown cap is one continuous surface, hidden under layered sculpted clumps.
vs=[];fs=[];uv=[];N=64;R=22
for i in range(R+1):
 t=i/R
 for j in range(N+1):
  a=j*math.tau/N;phi=.025+t*(1.92-.64*(math.cos(a)+1)*.5)
  vs.append((math.sin(phi)*math.sin(a)*.160,.052+math.cos(phi)*.185,-.025+math.sin(phi)*math.cos(a)*.144));uv.append((j/N,1-t))
  if i and j:q=(i-1)*(N+1)+j-1;fs.append((q,q+1,q+N+2,q+N+1))
from couture_surfaces import uv_mesh
uv_mesh('Continuous hair crown',vs,fs,uv,hair,1)
fringes=[([(-.08,.236,.025),(-.075,.21,.11),(-.035,.16,.151),(.025,.10,.16),(.075,.025,.143)],.045),
([(-.04,.245,-.02),(.025,.215,.102),(.085,.165,.145),(.137,.075,.120),(.150,-.035,.07)],.047),
([(-.115,.215,.04),(-.135,.15,.106),(-.155,.06,.122),(-.145,-.055,.117),(-.111,-.17,.079)],.034),
([(-.10,.235,-.01),(-.12,.19,.10),(-.125,.13,.147),(-.104,.075,.159),(-.08,.028,.143)],.024),
([(.02,.238,-.04),(.11,.20,.025),(.157,.11,.064),(.172,-.04,.047),(.124,-.20,.04)],.038)]
for i,(pts,w) in enumerate(fringes):hair_blade('Layered side-swept fringe',pts,w,hair,i%3*.2)
# Curved side locks sit clear of the jaw and frame the face without a helmet edge.
for side in [-1,1]:
 for i in range(3):
  x=side*(.14+i*.009)
  hair_blade('Fine temple lock',[(x,.13,.03),(x*1.13,.02,.06),(x*1.1,-.13,.09),(side*.15,-.27,.06),(side*.12,-.40,-.015)],.020-i*.003,hair,i*.15)
# Original crescent diadem, fine head chains and articulated-looking drop earrings.
for side in [-1,1]:
 piping('Diadem fine chain',[(side*(.10+.06*math.sin(t*math.pi)),.13+t*.095,.103-t*.10) for t in [i/24 for i in range(25)]],.0032,gold)
 jewel('Cut earring opal',(side*.165,-.11,.026),.009,.027,.007)
 piping('Fine earring chain',[(side*.16,-.033,.017),(side*.169,-.067,.023),(side*.165,-.09,.026)],.0016,gold)
# A crescent rising over the right temple is an original silhouette signature.
vs=[];fs=[]
for i in range(33):
 t=i/32;a=-.25+t*math.pi*1.65
 for inner in [0,1]:
  rr=.10-inner*.026*math.sin(t*math.pi)
  vs.append((.115+math.cos(a)*rr*.58,.177+math.sin(a)*rr,.015+math.cos(a)*.025+inner*.004))
 if i:q=(i-1)*2;fs.append((q,q+1,q+3,q+2))
o=mesh('Crescent temple diadem',vs,fs,gold,1);m=o.modifiers.new('Forged metal thickness','SOLIDIFY');m.thickness=.008
jewel('Diadem opal',(.164,.155,.042),.018,.022,.01)
group_new(r,before)
# Long layered S-curves; UV strand paint follows each clump's length.
r=attach('Hair');before=set(bpy.context.scene.objects)
for i in range(15):
 x=(i-7)*.018;phase=i*.55;w=.024+(i%3)*.004
 pts=[(x,.045,-.035),(x*1.4,-.13,-.09),(x*1.5+.025*math.sin(phase),-.36,-.145),
      (x*1.3+.06*math.sin(phase+.7),-.60,-.19),(x*.8+.07*math.sin(phase+1.3),-.79,-.16),
      (x*.45+.08*math.sin(phase+2),-.94+abs(i-7)*.018,-.22)]
 hair_blade('Layered flowing silver hair',pts,w,hair,(i%4)*.15)
group_new(r,before)
# Crescent instrument: curved forged frame, suspended faceted heart and fittings.
r=attach('Weapon');before=set(bpy.context.scene.objects)
sweep('Lunar staff • lacquered haft',[(0,0,-.55),(0,0,-.30),(0,0,0),(.005,0,.56),(.01,0,.97)],[.013,.016,.018,.018,.028],leather,18,1)
for z in [-.42,-.27,.30,.60,.84,.94]:
 piping('Staff engraved ferrule',[(math.cos(a)*.022,math.sin(a)*.022,z) for a in [j*math.tau/24 for j in range(25)]],.004,gold)
# Asymmetric crescent, thick at the bowl and blade-thin at both points.
for sign in [-1,1]:
 pts=[(.01,0,.91),(sign*.14,0,1.03),(sign*.24,0,1.24),(sign*.19,0,1.47),(sign*.03,0,1.59)]
 sweep('Forged celestial crescent',pts,[.022,.027,.023,.013,.001],gold,14,2)
 jewel('Suspended cut astral heart',(.015,0,1.29),.047,.025,.11)
 piping('Suspended heart chain',[(.015,0,1.51),(.015,0,1.41)],.0022,gold)
# Anatomical closed leather grip; the other hand keeps its canonical finger joints.
rock('Leather palm',(-.033,-.008,.014),(.025,.027,.052),leather)
for i in range(4):
 z=.044-i*.022;pts=[(math.cos(a)*.032,math.sin(a)*.032,z) for a in [math.pi-.13-t*2.4 for t in [0,.25,.5,.75,1]]]
 sweep('Leather wrapped finger',pts,[.010,.010,.009,.008,.004],leather,10,1)
group_new(r,before)
# Finish source surfaces, then batch each joint/material without dropping UVs.
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':
  bpy.context.view_layer.objects.active=o
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
for anchor in attachments.values():
 groups={}
 for o in list(anchor.children):
  if o.type=='MESH' and not o.data.shape_keys:groups.setdefault(o.data.materials[0].name,[]).append(o)
 for objects in groups.values():
  if len(objects)<2:continue
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=OUT+'/celestia.glb',export_format='GLB',export_yup=True)
print('ATELIER: reference-led UV couture exported')
