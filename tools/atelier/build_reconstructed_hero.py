"""Original Celestia reconstruction -> canonical named skeleton handoff.
The source stays in A-pose. Runtime binds it against that pose on the existing
rig, then the existing animation player supplies the performance. UVs, source
paint coordinates, expression shapes and four-influence weights survive export.
"""
import bpy,sys,os,json,math,numpy as np
from pathlib import Path
from mathutils import Vector,Quaternion
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from atelier_mesh import mat,OUT
source=Path(os.environ.get('ASTRAL_HERO_SCULPT_SOURCE',str(Path(__file__).resolve().parents[2]/'art/atelier/sculpts/celestia')))
if (source/'CelestiaFitted.blend').exists() and os.environ.get('ASTRAL_REBUILD_HERO_BINDINGS')!='1':
 raise RuntimeError('Reviewed source exists. Use export_authored_hero.py to preserve artist weights; ASTRAL_REBUILD_HERO_BINDINGS=1 explicitly bootstraps new bindings.')
d=np.load(source/'uv-sculpt.npz');raw=d['vertices'];faces=d['faces'];uvs=d['uv'];normals=d['normals'];camera=json.loads((source/'paint-provenance.json').read_text())['camera']
distance,fov,elev,az,tx,ty=camera;elev,az=np.deg2rad([elev,az]);eye=np.array([math.cos(elev)*math.cos(az),math.cos(elev)*math.sin(az),math.sin(elev)]);right=np.array([-math.sin(az),math.cos(az),0]);up=np.cross(eye,right)
# Recover the exact conditioning crop/padding transform for authored landmarks.
image=bpy.data.images.load(str(Path('art/atelier/references/celestia-apose.png').resolve()));iw,ih=image.size;pixels=np.empty(iw*ih*4,np.float32);image.pixels.foreach_get(pixels);rgba=pixels.reshape(ih,iw,4)[::-1];yy,xx=np.where(rgba[:,:,3]>0);x0,x1,y0,y1=xx.min(),xx.max(),yy.min(),yy.max();square=max(y1-y0,x1-x0);pad=int(square/.85)-square;left=(square-(x1-x0))//2+pad//2;top=(square-(y1-y0))//2+pad//2;condition=square+pad
tri=raw[faces];e1=tri[:,1]-tri[:,0];e2=tri[:,2]-tri[:,0];origin=eye*distance
scale=2.0/(raw[:,2].max()-raw[:,2].min());floor=raw[:,2].min();flat_front=np.array([math.cos(az),math.sin(az),0])
def transform(v):return np.stack([v@right,(v[:,2]-floor),v@flat_front],axis=-1)*scale
points=transform(raw)
def hit(pixel,inset):
 u=(pixel[0]-x0+left)/condition;v=(pixel[1]-y0+top)/condition;direction=-eye+right*((u-.5-tx)*2*math.tan(math.radians(fov)/2))+up*((.5+ty-v)*2*math.tan(math.radians(fov)/2));direction/=np.linalg.norm(direction)
 pv=np.cross(direction,e2);det=np.sum(e1*pv,axis=1);valid=np.abs(det)>1e-8;inv=np.zeros_like(det);inv[valid]=1/det[valid];tv=origin-tri[:,0];bu=np.sum(tv*pv,axis=1)*inv;qv=np.cross(tv,e1);bv=np.sum(direction*qv,axis=1)*inv;t=np.sum(e2*qv,axis=1)*inv;valid&=(bu>=0)&(bv>=0)&(bu+bv<=1)&(t>0)
 if np.any(valid):p=origin+direction*np.min(t[valid])-eye*(inset/scale)
 else:
  z=distance-raw@eye;pu=.5+(raw@right)/(z*2*math.tan(math.radians(fov)/2))+tx;py=.5-(raw@up)/(z*2*math.tan(math.radians(fov)/2))+ty;idx=np.argsort((pu-u)**2+(py-v)**2)[:12];p=raw[idx].mean(axis=0)-eye*(inset/scale)
 return transform(p[None,:])[0]
landmarks={'hip':((512,690),.085),'head':((512,176),.075),'neck':((512,282),.045),
 'shoulderL':((390,326),.045),'shoulderR':((635,326),.045),'elbowL':((280,475),.035),'elbowR':((744,475),.035),'wristL':((171,621),.022),'wristR':((853,621),.022),
 'thighL':((453,727),.065),'thighR':((575,727),.065),'kneeL':((420,1152),.045),'kneeR':((604,1152),.045),'ankleL':((420,1435),.035),'ankleR':((604,1435),.035),
 'eyeL':((475,158),0),'eyeR':((550,158),0),'mouth':((512,204),0)}
marks={k:hit(*value) for k,value in landmarks.items()};center=marks['hip'].copy();center[1]=0;points-=center
for k in marks:marks[k]-=center
hip=float(marks['hip'][1]);head=marks['head'];shoulder_y=float((marks['shoulderL'][1]+marks['shoulderR'][1])*.5);shoulder_x=float((abs(marks['shoulderL'][0])+abs(marks['shoulderR'][0]))*.5)
upper=float(np.mean([np.linalg.norm(marks['elbow'+s]-marks['shoulder'+s]) for s in ['L','R']]));fore=float(np.mean([np.linalg.norm(marks['wrist'+s]-marks['elbow'+s]) for s in ['L','R']]))
thigh_y=float(np.mean([marks['thigh'+s][1] for s in ['L','R']]));leg_x=float(np.mean([abs(marks['thigh'+s][0]) for s in ['L','R']]));upper_leg=float(np.mean([abs(marks['thigh'+s][1]-marks['knee'+s][1]) for s in ['L','R']]));lower_leg=float(np.mean([abs(marks['knee'+s][1]-marks['ankle'+s][1]) for s in ['L','R']]))
rest={'Hips':[0,hip,0],'Head':[0,float(head[1]-hip),float(np.clip(head[2],-.03,.05))],'Hair':[0,.09,-.108],'Coat':[0,.13,-.07],'Coat.Hem':[0,-.40,0]};bind={};parents={'Hips':None,'Head':'Hips','Hair':'Head','Coat':'Hips','Coat.Hem':'Coat'}
for side,sign in [('L',-1),('R',1)]:
 for prefix in ['UpperArm','ShoulderPlate']:rest[prefix+'.'+side]=[sign*shoulder_x,shoulder_y-hip,0];parents[prefix+'.'+side]='Hips'
 for prefix in ['Forearm','Elbow']:rest[prefix+'.'+side]=[0,-upper,0];parents[prefix+'.'+side]='UpperArm.'+side
 for prefix in ['Weapon']:rest[prefix+('.L' if side=='L' else '')]=[0,-fore,.018]
 rest['Thigh.'+side]=[sign*leg_x,thigh_y-hip,0];parents['Thigh.'+side]='Hips'
 for prefix in ['Shin','Knee']:rest[prefix+'.'+side]=[0,-upper_leg,0];parents[prefix+'.'+side]='Thigh.'+side
 rest['Foot.'+side]=[0,-lower_leg,0];parents['Foot.'+side]='Shin.'+side
 uq=Vector((0,-1,0)).rotation_difference(Vector(marks['elbow'+side]-marks['shoulder'+side]).normalized());fq=Vector((0,-1,0)).rotation_difference(Vector(marks['wrist'+side]-marks['elbow'+side]).normalized());local=uq.inverted()@fq
 for name,q in [('UpperArm.'+side,uq),('Forearm.'+side,local),('Elbow.'+side,Quaternion().slerp(local,.5))]:bind[name]=[q.x,q.y,q.z,q.w]
names=[n for n in parents if not n.startswith('ShoulderPlate')];heads={};rotations={}
for name in names:
 parent=parents[name];q=Quaternion((bind[name][3],*bind[name][:3])) if name in bind else Quaternion()
 if parent:heads[name]=heads[parent]+rotations[parent]@Vector(rest[name]);rotations[name]=rotations[parent]@q
 else:heads[name]=Vector(rest[name]);rotations[name]=q
# Sample the original UV paint to distinguish hair from the pearl mantle/skin.
albedo=bpy.data.images.load(str(source/'albedo.png'));aw,ah=albedo.size;paint=np.empty(aw*ah*4,np.float32);albedo.pixels.foreach_get(paint);paint=paint.reshape(ah,aw,4);sample=paint[np.clip((uvs[:,1]*(ah-1)).astype(int),0,ah-1),np.clip((uvs[:,0]*(aw-1)).astype(int),0,aw-1),:3]
indices=np.zeros((len(points),4),np.int32);weights=np.zeros((len(points),4),np.float32);hand=np.zeros(len(points),bool)
def assign(i,pairs):
 for j,(name,w) in enumerate(pairs):indices[i,j]=names.index(name);weights[i,j]=w
def smooth(x,a,b):t=np.clip((x-a)/(b-a),0,1);return float(t*t*(3-2*t))
def limb(i,travel,pivot,total,upper_name,fold_name,lower_name,foot_name=None):
 width=.055
 if travel<pivot-width:assign(i,[(upper_name,1)])
 elif travel<pivot:
  w=smooth(travel,pivot-width,pivot);assign(i,[(upper_name,1-w),(fold_name,w)])
 elif travel<pivot+width:
  w=smooth(travel,pivot,pivot+width);assign(i,[(fold_name,1-w),(lower_name,w)])
 elif foot_name and travel>total-.07:
  w=smooth(travel,total-.07,total-.015);assign(i,[(lower_name,1-w),(foot_name,w)])
 else:assign(i,[(lower_name,1)])
def segment(p,a,b):v=b-a;t=float(np.dot(p-a,v)/np.dot(v,v));return np.linalg.norm(p-(a+np.clip(t,0,1)*v)),t
for i,p in enumerate(points):
 x,y,z=p;r,g,b=sample[i];hair=b>r*.98 and b>g*.98 and max(r,g,b)>.36 and hip+.16<y<head[1]-.06 and z<-.025 and abs(x)<.24
 if hair:
  w=1-smooth(y,float(head[1]-.16),float(head[1]+.10));assign(i,[('Head',1-w),('Hair',w)]);continue
 if y>marks['neck'][1]+.025:assign(i,[('Head',1)]);continue
 arm=None
 if y>hip-.03 and abs(x)>shoulder_x*.75:
  side='L' if x<0 else 'R';a=np.array(heads['UpperArm.'+side]);b0=np.array(heads['Forearm.'+side]);c=b0+rotations['Forearm.'+side]@Vector((0,-fore,0));c=np.array(c);du,tu=segment(p,a,b0);df,tf=segment(p,b0,c)
  if min(du,df)<.17:
   travel=tu*upper if du<df else upper+tf*fore;arm=side;hand[i]=travel>upper+fore-.005;limb(i,travel,upper,upper+fore,'UpperArm.'+side,'Elbow.'+side,'Forearm.'+side)
 if arm:continue
 if y<hip+.06:
  coat=abs(x)>max(.18,leg_x+.075) or z<-.15
  if coat:
   w=1-smooth(y,.20,hip-.08);assign(i,[('Coat',1-w),('Coat.Hem',w)]);continue
  side='L' if x<0 else 'R';travel=thigh_y-y;limb(i,travel,upper_leg,upper_leg+lower_leg,'Thigh.'+side,'Knee.'+side,'Shin.'+side,'Foot.'+side);continue
 assign(i,[('Hips',1)])
# Smooth a continuous skin field on welded geometry, across UV chart seams.
# This prevents palette/region boundaries from becoming alternating rigid strips.
_,weld=np.unique(np.round(points,6),axis=0,return_inverse=True);count=int(weld.max()+1)
dense=np.zeros((len(points),len(names)),np.float32)
for col in range(4):np.add.at(dense,(np.arange(len(points)),indices[:,col]),weights[:,col])
field=np.zeros((count,len(names)),np.float32);np.add.at(field,weld,dense);field/=np.maximum(1,np.bincount(weld))[:,None]
f=weld[faces];edges=np.unique(np.sort(np.concatenate([f[:,[0,1]],f[:,[1,2]],f[:,[2,0]]]),axis=1),axis=0);degree=np.bincount(edges.reshape(-1),minlength=count)
for iteration in range(12):
 neighbor=np.zeros_like(field);np.add.at(neighbor,edges[:,0],field[edges[:,1]]);np.add.at(neighbor,edges[:,1],field[edges[:,0]])
 field=field*.58+neighbor/np.maximum(1,degree)[:,None]*.42
field=field[weld];indices=np.argsort(field,axis=1)[:,-4:];weights=np.take_along_axis(field,indices,axis=1);weights/=np.maximum(1e-8,weights.sum(axis=1,keepdims=True))
# Drop neural fingers beyond the cuff: the canonical animated casting hand and
# closed weapon grip remain the hand art/animation owners.
keep=~np.all(hand[faces],axis=1);faces=faces[keep]
# Blender armature is an export carrier for canonical names/weights. Runtime
# calculates bind inverses on its own canonical joint objects in this A-pose.
arm=bpy.data.armatures.new('Celestia visual handoff');rig=bpy.data.objects.new('Celestia visual handoff',arm);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def xyz(p):return(float(p[0]),-float(p[2]),float(p[1]))
for name in names:
 bone=arm.edit_bones.new(name);bone.head=xyz(heads[name]);bone.tail=xyz(heads[name]+rotations[name]@Vector((0,.12,0)))
for name in names:
 if parents[name]:arm.edit_bones[name].parent=arm.edit_bones[parents[name]]
bpy.ops.object.mode_set(mode='OBJECT');me=bpy.data.meshes.new('Original Celestia A-pose sculpt');me.from_pydata([xyz(p) for p in points],[],faces.tolist());me.update();actor=bpy.data.objects.new('Original Celestia • fitted sculpt',me);bpy.context.collection.objects.link(actor);actor.parent=rig
for poly in me.polygons:poly.use_smooth=True
me.normals_split_custom_set_from_vertices([xyz([np.dot(n,right),n[2],np.dot(n,flat_front)]) for n in normals])
layer=me.uv_layers.new(name='Sculpt paint UV');source_layer=me.uv_layers.new(name='Source projection UV');zproj=distance-raw@eye;pu=.5+(raw@right)/(zproj*2*math.tan(math.radians(fov)/2))+tx;pv=.5-(raw@up)/(zproj*2*math.tan(math.radians(fov)/2))+ty
for poly in me.polygons:
 for li in poly.loop_indices:
  vi=me.loops[li].vertex_index;layer.data[li].uv=uvs[vi];source_layer.data[li].uv=(float(pu[vi]),float(1-pv[vi]))
for j,name in enumerate(names):
 group=actor.vertex_groups.new(name=name)
 for col in range(4):
  for i in np.where((indices[:,col]==j)&(weights[:,col]>1e-6))[0]:group.add([int(i)],float(weights[i,col]),'ADD')
mod=actor.modifiers.new('Canonical joint handoff','ARMATURE');mod.object=rig
m=mat('Original reconstructed • Celestia couture','ffffff',.78);nodes=m.node_tree.nodes;links=m.node_tree.links;bsdf=nodes.get('Principled BSDF')
uv_node=nodes.new('ShaderNodeUVMap');uv_node.uv_map='Sculpt paint UV'
def texture(name,space='sRGB'):
 node=nodes.new('ShaderNodeTexImage');node.image=bpy.data.images.load(str(source/name),check_existing=True);node.image.colorspace_settings.name=space;links.new(uv_node.outputs['UV'],node.inputs['Vector']);return node
links.new(texture('albedo.png').outputs['Color'],bsdf.inputs['Base Color']);orm=texture('orm.png','Non-Color');sep=nodes.new('ShaderNodeSeparateColor');links.new(orm.outputs['Color'],sep.inputs[0]);links.new(sep.outputs['Green'],bsdf.inputs['Roughness']);links.new(sep.outputs['Blue'],bsdf.inputs['Metallic']);links.new(texture('emission.png').outputs['Color'],bsdf.inputs['Emission Color']);bsdf.inputs['Emission Strength'].default_value=.5;me.materials.append(m)
# Seven named facial performance channels remain compatible with HeroFace.
actor.shape_key_add(name='Basis')
for shape in ['Blink','Focus','Concern','Gaze','SpeakOpen','SpeakWide','SpeakRound']:
 key=actor.shape_key_add(name=shape)
 for i,p in enumerate(points):
  x,y,z=p;delta=np.zeros(3);face=abs(x)<.115 and y>head[1]-.17 and z>head[2]+.015
  if face:
   for side in ['L','R']:
    ex,ey,ez=marks['eye'+side];region=math.exp(-((x-ex)/.041)**4-((y-ey)/.018)**4)
    if shape=='Blink':delta[1]+=(ey-y)*region*.88
    if shape=='Focus':delta[1]-=.004*region
    if shape=='Concern':delta[1]+=.003*region
   mouth=math.exp(-((x-marks['mouth'][0])/.065)**4-((y-marks['mouth'][1]+.025)/.055)**4)
   if shape=='SpeakOpen':delta[1]-=.013*mouth
   if shape=='SpeakWide':delta[0]+=x*.06*mouth
   if shape=='SpeakRound':delta[0]-=x*.10*mouth;delta[2]+=.003*mouth
  key.data[i].co=xyz(p+delta)
# Rational projection from game A-pose positions to the original paint UV.
rotation=np.stack([right,np.array([0,0,1]),flat_front],axis=0);A=rotation.T/scale;B=rotation.T@np.array([center[0]/scale,floor,center[2]/scale]);rw=-eye@A;ow=distance-eye@B;den=2*math.tan(math.radians(fov)/2)
ru=(.5+tx)*rw+right@A/den;ou=(.5+tx)*ow+right@B/den;rv=(.5+ty)*rw-up@A/den;ov=(.5+ty)*ow-up@B/den
projection=np.array([[*ru,ou],[*rv,ov],[0,0,0,0],[*rw,ow]]).T.reshape(-1).tolist()
fit={'schemaVersion':1,'source':'Original image reconstruction + calibrated paint bake','restOffsets':rest,'sourceProjection':projection,'bindQuaternions':bind,'face':{k:marks[k].tolist() for k in ['head','neck','eyeL','eyeR','mouth']},'statistics':{'vertices':len(points),'triangles':len(faces),'removedHandTriangles':int(np.count_nonzero(~keep))},'dimensions':{'hipHeight':hip,'shoulderWidth':shoulder_x*2,'upperArm':upper,'forearm':fore,'thigh':upper_leg,'shin':lower_leg}}
Path(OUT+'/celestia-sculpt-fit.json').write_text(json.dumps(fit,indent=2)+'\n');bpy.ops.export_scene.gltf(filepath=OUT+'/celestia-sculpt.glb',export_format='GLB',export_yup=True,export_all_influences=False)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(source/'CelestiaFitted.blend'),compress=True);print('ATELIER: fitted original Celestia',json.dumps(fit['dimensions']),flush=True)
